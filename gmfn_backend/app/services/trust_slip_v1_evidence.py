from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import case, func, or_, select, union
from sqlalchemy.orm import Session, aliased

from app.core.evidence_lifecycle import DISPUTED, EXPIRED, REVOKED, SOURCE_TRUST_SLIP, SUPERSEDED
from app.core.trust_evidence_families import (
    PUBLIC_EVIDENCE_FAMILY_LABELS,
    public_trust_event_evidence_family_from_record,
    public_trust_event_evidence_signal_from_record,
)
from app.db.models import (
    ClanMembership,
    CommunityConfirmationRequest,
    CommunityConfirmationResponse,
    CommunityConfirmationReviewCase,
    CommunityMemberVerification,
    EvidenceLifecycleMarker,
    MarketplaceProduct,
    MarketplaceShop,
    ProtectedTradeRecord,
    TrustEvent,
    TrustSlip,
)
from app.services.community_confirmation_service import (
    CAUTION_RESPONSES,
    OBJECTION_RESPONSES,
    POSITIVE_RESPONSES,
)
from app.services.evidence_lifecycle_service import (
    CORRECTION_EVENT_TYPES,
    DISPUTE_EVENT_TYPES,
    REVERSAL_EVENT_TYPES,
)
from app.services.protected_trade_service import (
    RECEIPT_CONFIRMED_VALUES,
    RELEASE_RECORDED_VALUES,
    UNRESOLVED_DISPUTE_VALUES,
)


EVIDENCE_BUNDLE_VERSION = "trustslip-v1-evidence/v1"
SUPPORTED_PURPOSES = frozenset({"general", "shop_review"})
PUBLIC_GROUP_MINIMUM = 3
MAX_EVENT_SAMPLE = 200

_PURPOSE_REASON_TYPES = {
    "general": frozenset({"community_standing", "community_standing_check"}),
    "shop_review": frozenset({"trade_check", "trade_skill_check"}),
}
_OPEN_REVIEW_STATUSES = frozenset({"open", "in_review"})
_CAUTION_REVIEW_IMPACTS = frozenset({"caution", "negative"})
_REVOKED_SLIP_STATUSES = frozenset({"revoked", "cancelled", "canceled"})
_FROZEN_SLIP_STATUSES = frozenset({"frozen", "suspended"})


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _public_group_count(count: int) -> dict[str, Any]:
    if count < PUBLIC_GROUP_MINIMUM:
        return {
            "exact_count": None,
            "count_band": "fewer_than_3",
            "suppressed": True,
        }
    return {
        "exact_count": count,
        "count_band": "3_or_more",
        "suppressed": False,
    }


def _identity_facts(identity_payload: Optional[dict[str, Any]]) -> dict[str, Any]:
    payload = identity_payload if isinstance(identity_payload, dict) else {}
    context = payload.get("identity_context")
    source = context if isinstance(context, dict) else payload

    recorded = {
        "member_name": bool(payload.get("member_name") or payload.get("holder_name") or source.get("member_name_recorded")),
        "gsn_id": bool(payload.get("gmfn_id") or payload.get("gsn_id") or source.get("gsn_id_recorded")),
        "phone": bool(source.get("phone_recorded")),
        "bank_details": bool(source.get("bank_details_recorded")),
        "official_id": bool(source.get("official_id_recorded")),
    }
    verification_records = {
        "phone": bool(source.get("phone_verified")),
        "bank_details": bool(source.get("bank_verified")),
        "official_id": bool(source.get("official_id_verified")),
        "community_identity_confirmation": bool(source.get("community_identity_confirmed")),
    }
    return {
        "recorded": recorded,
        "verification_records": verification_records,
        "independently_verified": False,
        "independent_verification_method": None,
        "limitation": "Recorded and workflow verification facts are not described as independent identity verification.",
    }


def _active_community_ids(holder_user_id: int):
    return select(ClanMembership.clan_id).where(
        ClanMembership.user_id == holder_user_id,
        ClanMembership.left_at.is_(None),
    )


def _event_scope(holder_user_id: int):
    return (
        TrustEvent.subject_user_id == holder_user_id,
        or_(
            TrustEvent.clan_id.is_(None),
            TrustEvent.clan_id.in_(_active_community_ids(holder_user_id)),
        ),
    )


def _sample_activity(db: Session, *, holder_user_id: int) -> dict[str, Any]:
    rows = (
        db.query(TrustEvent)
        .filter(*_event_scope(holder_user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(MAX_EVENT_SAMPLE + 1)
        .all()
    )
    truncated = len(rows) > MAX_EVENT_SAMPLE
    sampled_rows = rows[:MAX_EVENT_SAMPLE]
    family_counts: dict[str, int] = defaultdict(int)
    family_signals: dict[str, set[str]] = defaultdict(set)
    sensitive_caution_present = False

    for row in sampled_rows:
        family = public_trust_event_evidence_family_from_record(row)
        if not family:
            continue
        if family not in PUBLIC_EVIDENCE_FAMILY_LABELS:
            sensitive_caution_present = True
            continue
        family_counts[family] += 1
        signal = public_trust_event_evidence_signal_from_record(row)
        if signal:
            family_signals[family].add(signal)

    families = [
        {
            "family": family,
            "sample_count": family_counts[family],
            "signals": sorted(family_signals[family]),
        }
        for family in sorted(family_counts)
    ]
    return {
        "sample_count": len(sampled_rows),
        "sample_limit": MAX_EVENT_SAMPLE,
        "sample_truncated": truncated,
        "families": families,
        "sensitive_caution_present": sensitive_caution_present,
    }


def _adverse_facts(db: Session, *, holder_user_id: int) -> dict[str, Any]:
    adverse_event_types = DISPUTE_EVENT_TYPES | REVERSAL_EVENT_TYPES
    caution_event_types = adverse_event_types | CORRECTION_EVENT_TYPES
    event_rows = (
        db.query(
            func.count(TrustEvent.id),
            func.coalesce(func.sum(case((TrustEvent.event_type.in_(adverse_event_types), 1), else_=0)), 0),
        )
        .filter(*_event_scope(holder_user_id), TrustEvent.event_type.in_(caution_event_types))
        .one()
    )
    lifecycle_count = (
        db.query(func.count(EvidenceLifecycleMarker.id))
        .join(TrustEvent, TrustEvent.id == EvidenceLifecycleMarker.trust_event_id)
        .filter(
            *_event_scope(holder_user_id),
            EvidenceLifecycleMarker.state.in_({"disputed", "reversed", "corrected", "revoked", "superseded"}),
        )
        .scalar()
        or 0
    )
    review_count = (
        db.query(func.count(CommunityConfirmationReviewCase.id))
        .filter(
            CommunityConfirmationReviewCase.subject_user_id == holder_user_id,
            CommunityConfirmationReviewCase.community_id.in_(_active_community_ids(holder_user_id)),
            or_(
                CommunityConfirmationReviewCase.status.in_(_OPEN_REVIEW_STATUSES),
                CommunityConfirmationReviewCase.trust_impact.in_(_CAUTION_REVIEW_IMPACTS),
            ),
        )
        .scalar()
        or 0
    )
    trade_dispute_count = (
        db.query(func.count(ProtectedTradeRecord.id))
        .filter(
            or_(
                ProtectedTradeRecord.seller_user_id == holder_user_id,
                ProtectedTradeRecord.buyer_user_id == holder_user_id,
            ),
            ProtectedTradeRecord.dispute_status.in_(UNRESOLVED_DISPUTE_VALUES),
        )
        .scalar()
        or 0
    )
    adverse_event_count = int(event_rows[1] or 0)
    caution_event_count = int(event_rows[0] or 0)
    return {
        "adverse_event_present": adverse_event_count > 0,
        "correction_or_adverse_event_present": caution_event_count > 0,
        "non_clean_lifecycle_marker_present": int(lifecycle_count) > 0,
        "community_review_caution_present": int(review_count) > 0,
        "unresolved_trade_dispute_present": int(trade_dispute_count) > 0,
    }


def _slip_lifecycle(db: Session, *, slip: TrustSlip, as_of: datetime) -> dict[str, Any]:
    status = str(getattr(slip, "status", "") or "").strip().lower()
    latest_marker_state = (
        db.query(EvidenceLifecycleMarker.state)
        .filter(
            EvidenceLifecycleMarker.source_type == SOURCE_TRUST_SLIP,
            EvidenceLifecycleMarker.source_id == str(slip.id),
            EvidenceLifecycleMarker.created_at <= as_of,
        )
        .order_by(EvidenceLifecycleMarker.created_at.desc(), EvidenceLifecycleMarker.id.desc())
        .limit(1)
        .scalar()
    )
    expires_at = _aware(getattr(slip, "expires_at", None))
    return {
        "status_recorded": status or None,
        "expired": bool(expires_at and expires_at <= as_of) or latest_marker_state == EXPIRED,
        "revoked": status in _REVOKED_SLIP_STATUSES or latest_marker_state == REVOKED,
        "frozen": status in _FROZEN_SLIP_STATUSES,
        "superseded": bool(
            status == "superseded"
            or not bool(getattr(slip, "is_current", True))
            or getattr(slip, "superseded_by_trust_slip_id", None)
            or latest_marker_state == SUPERSEDED
        ),
        "disputed": status == DISPUTED or latest_marker_state == DISPUTED,
    }


def _witness_facts(
    db: Session,
    *,
    holder_user_id: int,
    purpose: str,
    as_of: datetime,
) -> dict[str, Any]:
    community_ids = _active_community_ids(holder_user_id)
    verifier_membership = aliased(ClanMembership)
    responder_membership = aliased(ClanMembership)
    verifier_ids = (
        select(CommunityMemberVerification.verifier_user_id.label("person_id"))
        .join(
            verifier_membership,
            (verifier_membership.clan_id == CommunityMemberVerification.clan_id)
            & (verifier_membership.user_id == CommunityMemberVerification.verifier_user_id)
            & verifier_membership.left_at.is_(None),
        )
        .where(
            CommunityMemberVerification.subject_user_id == holder_user_id,
            CommunityMemberVerification.clan_id.in_(community_ids),
            CommunityMemberVerification.status == "active",
            CommunityMemberVerification.withdrawn_at.is_(None),
            or_(
                CommunityMemberVerification.valid_until.is_(None),
                CommunityMemberVerification.valid_until > as_of,
            ),
        )
    )
    responder_ids = (
        select(CommunityConfirmationResponse.responder_user_id.label("person_id"))
        .join(
            CommunityConfirmationRequest,
            CommunityConfirmationRequest.id == CommunityConfirmationResponse.request_id,
        )
        .join(
            responder_membership,
            (responder_membership.clan_id == CommunityConfirmationRequest.community_id)
            & (responder_membership.user_id == CommunityConfirmationResponse.responder_user_id)
            & responder_membership.left_at.is_(None),
        )
        .where(
            CommunityConfirmationRequest.subject_user_id == holder_user_id,
            CommunityConfirmationRequest.community_id.in_(community_ids),
            CommunityConfirmationRequest.reason_type.in_(_PURPOSE_REASON_TYPES[purpose]),
            CommunityConfirmationRequest.abuse_flag.is_(False),
            CommunityConfirmationResponse.counted_in_outcome.is_(True),
        )
    )
    people = union(verifier_ids, responder_ids).subquery()
    witness_count = int(db.query(func.count()).select_from(people).scalar() or 0)

    response_types = {
        str(value)
        for (value,) in (
            db.query(CommunityConfirmationResponse.response_type)
            .join(
                CommunityConfirmationRequest,
                CommunityConfirmationRequest.id == CommunityConfirmationResponse.request_id,
            )
            .join(
                responder_membership,
                (responder_membership.clan_id == CommunityConfirmationRequest.community_id)
                & (responder_membership.user_id == CommunityConfirmationResponse.responder_user_id)
                & responder_membership.left_at.is_(None),
            )
            .filter(
                CommunityConfirmationRequest.subject_user_id == holder_user_id,
                CommunityConfirmationRequest.community_id.in_(community_ids),
                CommunityConfirmationRequest.reason_type.in_(_PURPOSE_REASON_TYPES[purpose]),
                CommunityConfirmationRequest.abuse_flag.is_(False),
                CommunityConfirmationResponse.counted_in_outcome.is_(True),
                CommunityConfirmationResponse.response_type.in_(
                    POSITIVE_RESPONSES | CAUTION_RESPONSES | OBJECTION_RESPONSES
                ),
            )
            .distinct()
            .limit(len(POSITIVE_RESPONSES | CAUTION_RESPONSES | OBJECTION_RESPONSES))
            .all()
        )
    }
    response_presence: dict[str, Optional[bool]]
    if witness_count < PUBLIC_GROUP_MINIMUM:
        response_presence = {"favourable": None, "caution": None, "adverse": None}
    else:
        response_presence = {
            "favourable": bool(response_types & POSITIVE_RESPONSES),
            "caution": bool(response_types & CAUTION_RESPONSES),
            "adverse": bool(response_types & OBJECTION_RESPONSES),
        }
    return {
        "public_count": _public_group_count(witness_count),
        "response_presence": response_presence,
        "response_breakdown_suppressed": witness_count < PUBLIC_GROUP_MINIMUM,
    }


def _shop_facts(db: Session, *, holder_user_id: int) -> dict[str, Any]:
    shop_id = (
        db.query(MarketplaceShop.id)
        .filter(MarketplaceShop.owner_user_id == holder_user_id, MarketplaceShop.is_active.is_(True))
        .limit(1)
        .scalar()
    )
    active_offer_count = 0
    if shop_id is not None:
        active_offer_count = int(
            db.query(func.count(MarketplaceProduct.id))
            .filter(
                MarketplaceProduct.shop_id == shop_id,
                MarketplaceProduct.seller_user_id == holder_user_id,
                MarketplaceProduct.is_active.is_(True),
            )
            .scalar()
            or 0
        )

    participant_filter = or_(
        ProtectedTradeRecord.seller_user_id == holder_user_id,
        ProtectedTradeRecord.buyer_user_id == holder_user_id,
    )
    trade_summary = (
        db.query(
            func.count(ProtectedTradeRecord.id),
            func.coalesce(
                func.sum(
                    case(
                        (
                            ProtectedTradeRecord.release_status.in_(RELEASE_RECORDED_VALUES)
                            & ProtectedTradeRecord.receipt_status.in_(RECEIPT_CONFIRMED_VALUES),
                            1,
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
            func.coalesce(
                func.sum(case((ProtectedTradeRecord.dispute_status.in_(UNRESOLVED_DISPUTE_VALUES), 1), else_=0)),
                0,
            ),
        )
        .filter(participant_filter)
        .one()
    )
    counterparty_id = case(
        (ProtectedTradeRecord.seller_user_id == holder_user_id, ProtectedTradeRecord.buyer_user_id),
        else_=ProtectedTradeRecord.seller_user_id,
    )
    counterparty_count = int(
        db.query(func.count(func.distinct(counterparty_id)))
        .filter(participant_filter, counterparty_id.is_not(None))
        .scalar()
        or 0
    )
    return {
        "active_shop_recorded": shop_id is not None,
        "active_offer_count": active_offer_count,
        "trade_record_count": int(trade_summary[0] or 0),
        "completed_trade_record_count": int(trade_summary[1] or 0),
        "unresolved_trade_dispute_count": int(trade_summary[2] or 0),
        "counterparties": _public_group_count(counterparty_count),
    }


def collect_trust_slip_v1_evidence(
    db: Session,
    *,
    slip: TrustSlip,
    holder_user_id: int,
    purpose: str,
    identity_payload: Optional[dict[str, Any]] = None,
    identity_subject_user_id: Optional[int] = None,
    as_of: Optional[datetime] = None,
) -> dict[str, Any]:
    """Collect a bounded, holder-specific, public-safe current-evidence bundle.

    This adapter never reads or rewrites a historical snapshot. Its output may only
    be used for a newly issued or reissued projection after separate Stage B approval.
    """

    if int(getattr(slip, "holder_user_id", 0) or 0) != int(holder_user_id):
        raise ValueError("trust_slip_holder_mismatch")
    normalized_purpose = str(purpose or "").strip().lower()
    if normalized_purpose not in SUPPORTED_PURPOSES:
        raise ValueError("unsupported_trust_slip_v1_purpose")
    if identity_payload and int(identity_subject_user_id or 0) != int(holder_user_id):
        raise ValueError("identity_evidence_subject_unverified")

    collected_at = _aware(as_of) or _utc_now()
    activity = _sample_activity(db, holder_user_id=holder_user_id)
    adverse = _adverse_facts(db, holder_user_id=holder_user_id)
    adverse_present = any(adverse.values()) or activity["sensitive_caution_present"]
    bundle = {
        "bundle_version": EVIDENCE_BUNDLE_VERSION,
        "purpose": normalized_purpose,
        "collected_at": collected_at.isoformat(),
        "historical_snapshot_reconstruction": False,
        "identity": _identity_facts(identity_payload),
        "current_trust_slip_lifecycle": _slip_lifecycle(db, slip=slip, as_of=collected_at),
        "activity": activity,
        "adverse_or_caution": adverse,
        "witnesses": _witness_facts(
            db,
            holder_user_id=holder_user_id,
            purpose=normalized_purpose,
            as_of=collected_at,
        ),
        "shop": _shop_facts(db, holder_user_id=holder_user_id) if normalized_purpose == "shop_review" else None,
        "projection_safety": {
            "favourable_conclusion_allowed": False,
            "sufficiency_evaluated": False,
            "sample_truncated": activity["sample_truncated"],
            "adverse_or_caution_present": adverse_present,
        },
        "limitations": [],
    }
    if activity["sample_truncated"]:
        bundle["limitations"].append("activity_sample_truncated_no_favourable_conclusion")
    return bundle
