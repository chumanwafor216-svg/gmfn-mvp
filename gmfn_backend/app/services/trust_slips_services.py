from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment
from app.db.models import Clan, ClanMembership, EntryPhoneVerification, TrustEvent, TrustSlip, User
from app.services.liquidity_engine_service import build_user_liquidity_profile
from app.services.loan_readiness_service import build_loan_readiness_plan
from app.services.trust_score_service import compute_trust_breakdown

try:
    from app.services.trust_graph_service import build_trust_graph  # type: ignore
except Exception:
    build_trust_graph = None  # type: ignore


SNAPSHOT_VERSION = "trustslip-snapshot/v2"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now_utc().isoformat()


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _safe_decimal_str(value: Any, default: str = "0.00") -> str:
    if value is None:
        return default
    if isinstance(value, Decimal):
        return str(value)
    try:
        return str(Decimal(str(value)))
    except Exception:
        return default


def _safe_decimal(value: Any, default: str = "0.00") -> Decimal:
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _mask_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    e = email.strip()
    if "@" not in e:
        return None
    user, domain = e.split("@", 1)
    if len(user) <= 2:
        user_mask = user[0] + "*"
    else:
        user_mask = user[:2] + "*" * (len(user) - 2)
    return f"{user_mask}@{domain}"


def _expected_payment_discipline(db: Session, *, user_id: int) -> Dict[str, Any]:
    rows = (
        db.query(ExpectedPayment)
        .filter(ExpectedPayment.user_id == int(user_id))
        .order_by(ExpectedPayment.id.desc())
        .limit(250)
        .all()
    )

    def empty_bucket(label: str) -> Dict[str, Any]:
        return {
            "label": label,
            "expected_count": 0,
            "confirmed_count": 0,
            "partial_count": 0,
            "outstanding_count": 0,
            "expired_or_defaulted_count": 0,
            "cancelled_count": 0,
            "total_expected_amount": "0.00",
            "total_paid_amount": "0.00",
            "total_remaining_amount": "0.00",
            "latest_due_at": None,
            "latest_created_at": None,
            "latest_status": None,
        }

    buckets: Dict[str, Dict[str, Any]] = {
        "contribution": empty_bucket("Contribution discipline"),
        "repayment": empty_bucket("Repayment discipline"),
        "other": empty_bucket("Other expected payments"),
    }

    for row in rows:
        raw_type = _safe_str(getattr(row, "expected_type", "")).lower()
        key = raw_type if raw_type in {"contribution", "repayment"} else "other"
        bucket = buckets[key]
        status = _safe_str(getattr(row, "status", "")).lower()
        amount = _safe_decimal(getattr(row, "amount", None))
        paid = _safe_decimal(getattr(row, "paid_amount", None))
        remaining = _safe_decimal(getattr(row, "remaining_amount", None))

        bucket["expected_count"] += 1
        bucket["total_expected_amount"] = _safe_decimal_str(
            _safe_decimal(bucket["total_expected_amount"]) + amount
        )
        bucket["total_paid_amount"] = _safe_decimal_str(
            _safe_decimal(bucket["total_paid_amount"]) + paid
        )
        bucket["total_remaining_amount"] = _safe_decimal_str(
            _safe_decimal(bucket["total_remaining_amount"]) + remaining
        )

        if status == "confirmed":
            bucket["confirmed_count"] += 1
        elif status == "partial":
            bucket["partial_count"] += 1
        elif status in {"expired", "defaulted"}:
            bucket["expired_or_defaulted_count"] += 1
        elif status == "cancelled":
            bucket["cancelled_count"] += 1
        else:
            bucket["outstanding_count"] += 1

        due_at = getattr(row, "due_at", None)
        created_at = getattr(row, "created_at", None)
        if due_at and not bucket["latest_due_at"]:
            bucket["latest_due_at"] = due_at.isoformat()
        if created_at and not bucket["latest_created_at"]:
            bucket["latest_created_at"] = created_at.isoformat()
        if not bucket["latest_status"]:
            bucket["latest_status"] = status or "not stated"

    total_expected = sum(int(item["expected_count"]) for item in buckets.values())
    total_confirmed = sum(int(item["confirmed_count"]) for item in buckets.values())
    total_partial = sum(int(item["partial_count"]) for item in buckets.values())
    total_outstanding = sum(int(item["outstanding_count"]) for item in buckets.values())
    total_negative = sum(int(item["expired_or_defaulted_count"]) for item in buckets.values())

    if total_expected <= 0:
        plain = (
            "This TrustSlip does not yet show recorded contribution or repayment expectations. "
            "For a higher-risk decision, ask the holder for a fuller Trust Passport or community evidence."
        )
    elif total_negative > 0:
        plain = (
            "Some expected payments have expired or defaulted. Treat this as a caution signal "
            "and ask for more evidence before accepting risk."
        )
    elif total_outstanding > 0 or total_partial > 0:
        plain = (
            "Some expected payments are still open or partly paid. This does not automatically mean the person is unsafe, "
            "but you should check what is still unfinished before relying on the TrustSlip."
        )
    elif total_confirmed == total_expected:
        plain = (
            "Recorded expected payments shown here have been completed. This supports follow-through, "
            "but it is still evidence for your decision, not a guarantee."
        )
    else:
        plain = (
            "The expected-payment record is mixed or incomplete. Use this as one signal and ask for more context if the decision carries risk."
        )

    return {
        "source": "expected_payments",
        "source_note": (
            "Counts come from backend ExpectedPayment records. Personal focus commitments are reported separately as Trust Events."
        ),
        "total_expected_count": total_expected,
        "total_confirmed_count": total_confirmed,
        "total_partial_count": total_partial,
        "total_outstanding_count": total_outstanding,
        "total_expired_or_defaulted_count": total_negative,
        "contribution": buckets["contribution"],
        "repayment": buckets["repayment"],
        "other": buckets["other"],
        "plain_language": plain,
    }


def _personal_commitment_discipline(db: Session, *, user_id: int) -> Dict[str, Any]:
    commitment_types = {
        "commitment.created",
        "commitment.checkin",
        "commitment.milestone",
        "commitment.replanned",
        "commitment.completed",
        "commitment.missed_reported",
    }
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .filter(TrustEvent.event_type.in_(commitment_types))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(250)
        .all()
    )

    counts = {
        "created_count": 0,
        "checkin_count": 0,
        "milestone_count": 0,
        "replanned_count": 0,
        "completed_count": 0,
        "missed_reported_count": 0,
    }
    latest_at = None
    active_commitment_ids = set()
    completed_commitment_ids = set()

    for row in rows:
        event_type = _safe_str(getattr(row, "event_type", "")).lower()
        meta = getattr(row, "meta", None) or {}
        local_commitment_id = _safe_str(meta.get("local_commitment_id"))
        if local_commitment_id:
            active_commitment_ids.add(local_commitment_id)
        if event_type == "commitment.created":
            counts["created_count"] += 1
        elif event_type == "commitment.checkin":
            counts["checkin_count"] += 1
        elif event_type == "commitment.milestone":
            counts["milestone_count"] += 1
        elif event_type == "commitment.replanned":
            counts["replanned_count"] += 1
        elif event_type == "commitment.completed":
            counts["completed_count"] += 1
            if local_commitment_id:
                completed_commitment_ids.add(local_commitment_id)
        elif event_type == "commitment.missed_reported":
            counts["missed_reported_count"] += 1
        if latest_at is None and getattr(row, "created_at", None):
            latest_at = getattr(row, "created_at", None)

    total_events = len(rows)
    active_count = max(0, len(active_commitment_ids - completed_commitment_ids))

    if total_events <= 0:
        plain = (
            "This TrustSlip does not yet show personal commitment events from the Dashboard. "
            "The person may still be trustworthy, but this particular follow-through path has not built backend evidence yet."
        )
    elif counts["missed_reported_count"] > 0:
        plain = (
            "This person has recorded personal commitment activity, including at least one missed checkpoint that was reported or replanned. "
            "That is useful evidence, but you should look at whether they repaired it afterward."
        )
    elif counts["completed_count"] > 0:
        plain = (
            "This person has completed at least one personal commitment recorded in the Trust Event ledger. "
            "That supports follow-through outside group contributions."
        )
    else:
        plain = (
            "This person has started or updated personal commitments, but completion evidence is not visible yet. "
            "Use this as early follow-through evidence, not final proof."
        )

    return {
        "source": "trust_events",
        "source_note": (
            "Counts come from Dashboard focus commitment actions recorded as Trust Events. "
            "They are personal discipline evidence, not verified payment evidence."
        ),
        "total_event_count": total_events,
        "active_commitment_count": active_count,
        "distinct_commitment_count": len(active_commitment_ids),
        "latest_event_at": latest_at.isoformat() if latest_at else None,
        **counts,
        "plain_language": plain,
    }


def _ensure_user_gmfn_id_payload(user: Optional[User]) -> Optional[str]:
    if not user:
        return None
    raw = getattr(user, "gmfn_id", None)
    if raw is None:
        return None
    s = str(raw).strip()
    return s or None


def _saved_visibility_level(user: Optional[User]) -> str:
    if not user:
        return "standard"
    level = _safe_str(getattr(user, "merchant_visibility_level", "standard"), "standard").lower()
    if level not in {"minimal", "standard", "detailed"}:
        return "standard"
    return level


def _default_weekly_expiry() -> datetime:
    return _now_utc() + timedelta(days=7)


def _parse_expiry_or_default(raw_value: Any) -> datetime:
    if raw_value:
        try:
            dt = datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            return _default_weekly_expiry()
    return _default_weekly_expiry()


def _effective_slip_status(slip: Optional[TrustSlip]) -> str:
    if not slip:
        return "active"

    raw_status = _safe_str(getattr(slip, "status", "active"), "active").lower()
    expires_at = getattr(slip, "expires_at", None)

    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < _now_utc():
            return "expired"

    if raw_status in {"revoked", "frozen", "expired"}:
        return raw_status

    if raw_status in {"active", "issued"}:
        return "active"

    return raw_status or "active"


def _trust_slip_is_expired(slip: Optional[TrustSlip]) -> bool:
    return _effective_slip_status(slip) == "expired"


def _build_graph_data(db: Session, *, user_id: int) -> Dict[str, Any]:
    if build_trust_graph is None:
        return {
            "cci": {},
            "summary": {},
            "nodes": [],
            "edges": [],
            "root_user_id": int(user_id),
        }
    try:
        graph = build_trust_graph(db, user_id=int(user_id))
        return graph if isinstance(graph, dict) else {}
    except Exception:
        return {
            "cci": {},
            "summary": {},
            "nodes": [],
            "edges": [],
            "root_user_id": int(user_id),
        }


def _node_user_id(node_id: Any) -> int:
    raw = _safe_str(node_id)
    if not raw.startswith("user:"):
        return 0
    try:
        return int(raw.split(":", 1)[1])
    except Exception:
        return 0


def _node_lookup(graph: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
    out: Dict[int, Dict[str, Any]] = {}
    for n in (graph.get("nodes") or []):
        try:
            uid = int(n.get("user_id") or 0)
        except Exception:
            uid = 0
        if uid > 0:
            out[uid] = n
    return out


def _sponsor_rows_from_graph(graph: Dict[str, Any], *, max_items: int = 3) -> list[dict[str, Any]]:
    edges = graph.get("edges") or []
    nodes_by_user = _node_lookup(graph)

    rows: list[dict[str, Any]] = []
    root_user_id = int(graph.get("root_user_id") or 0)

    for edge in edges:
        edge_type = _safe_str(edge.get("edge_type")).lower()
        if edge_type not in {"invited_by", "successfully_onboarded", "guaranteed"}:
            continue

        source_user_id = _node_user_id(edge.get("source_node_id"))
        target_user_id = _node_user_id(edge.get("target_node_id"))
        if source_user_id <= 0 or target_user_id <= 0:
            continue
        if target_user_id != root_user_id:
            continue

        node = nodes_by_user.get(source_user_id, {})
        rows.append(
            {
                "user_id": int(source_user_id),
                "gmfn_id": node.get("gmfn_id"),
                "email": node.get("display_label") if "@" in _safe_str(node.get("display_label")) else node.get("email"),
                "phone_verified": bool(node.get("phone_verified")),
                "edge_type": edge_type,
                "weight": _safe_decimal_str(edge.get("weight"), "0.00"),
                "confidence": _safe_decimal_str(edge.get("confidence"), "0.00"),
            }
        )

    rows.sort(
        key=lambda item: (
            _safe_decimal(item.get("weight"), "0.00"),
            _safe_decimal(item.get("confidence"), "0.00"),
        ),
        reverse=True,
    )

    deduped: list[dict[str, Any]] = []
    seen: set[int] = set()
    for row in rows:
        uid = int(row["user_id"])
        if uid in seen:
            continue
        seen.add(uid)
        deduped.append(row)

    return deduped[:max_items]


def _internal_support_contacts(graph: Dict[str, Any]) -> list[dict[str, Any]]:
    sponsors = _sponsor_rows_from_graph(graph, max_items=3)
    out: list[dict[str, Any]] = []
    for sponsor in sponsors:
        out.append(
            {
                "role": "sponsor",
                "user_id": sponsor.get("user_id"),
                "gmfn_id": sponsor.get("gmfn_id"),
                "email": sponsor.get("email"),
                "phone_verified": sponsor.get("phone_verified"),
                "relationship": sponsor.get("edge_type"),
            }
        )
    return out


CCI_BAND_EXPLANATIONS: Dict[str, str] = {
    "A": "Strong visible community-backed evidence. Still check the details and match the decision to the risk.",
    "B": "Good visible evidence with a useful trust story. It can support a careful decision, but it is not a guarantee.",
    "C": "Moderate or mixed evidence. Ask for more context before money, goods, work, or a serious referral.",
    "D": "Limited or weak evidence. Keep any decision small and ask for stronger community or payment history.",
    "E": "Very limited or concerning evidence. Do not use this TrustSlip alone for a meaningful risk.",
    "F": "Not enough usable evidence, or a negative reading. Do not rely on this TrustSlip for trust decisions.",
}


def _cci_explainer(score: Any, band: Any) -> Dict[str, Any]:
    raw_band = _safe_str(band).upper()[:1]
    safe_band = raw_band if raw_band in CCI_BAND_EXPLANATIONS else ""
    return {
        "score": score,
        "band": safe_band or _safe_str(band, "Not stated"),
        "meaning": CCI_BAND_EXPLANATIONS.get(
            safe_band,
            "CCI is the community confidence reading. The exact band meaning is not available for this record.",
        ),
        "scale": [
            {"band": key, "meaning": value}
            for key, value in CCI_BAND_EXPLANATIONS.items()
        ],
        "plain_language": (
            "CCI helps a reader understand community confidence. It should support a decision, not make the decision alone."
        ),
    }


def _community_context(
    db: Session,
    *,
    user_id: int,
    clan_id: int,
    clan: Optional[Clan],
    community_name: str,
    active_clan_count: Any,
    sponsor_count: Any,
    unique_counterparties: Any,
) -> Dict[str, Any]:
    membership = None
    if clan_id:
        membership = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.user_id == int(user_id),
                ClanMembership.clan_id == int(clan_id),
                ClanMembership.left_at.is_(None),
            )
            .first()
        )

    active_member_count = 0
    total_member_count = 0
    if clan_id:
        active_member_count = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == int(clan_id),
                ClanMembership.left_at.is_(None),
            )
            .count()
        )
        total_member_count = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == int(clan_id))
            .count()
        )

    role = _safe_str(getattr(membership, "role", None), "member")
    community_code = (
        _safe_str(getattr(clan, "community_code", None))
        or (f"GSN-COM-{int(clan_id):04d}" if clan_id else "")
    )
    active_groups = int(active_clan_count or 0) if str(active_clan_count or "").isdigit() else active_clan_count
    human_density = (
        f"{active_member_count} active member"
        f"{'' if active_member_count == 1 else 's'} in this community"
    )
    if active_groups:
        human_density += f"; visible across {active_groups} active community context"
        human_density += "" if str(active_groups) == "1" else "s"

    return {
        "community_name": community_name,
        "community_global_id": community_code,
        "community_code": community_code,
        "holder_role": role,
        "active_member_count": active_member_count,
        "total_member_count": total_member_count,
        "active_community_count": active_clan_count,
        "sponsor_count": sponsor_count,
        "unique_counterparties": unique_counterparties,
        "human_density_label": human_density,
        "plain_language": (
            "This tells you whether the person is standing inside a real community, "
            "what role they hold there, and how much visible community context exists around them."
        ),
    }


def _entry_verification_context(db: Session, *, user: Optional[User]) -> Dict[str, Any]:
    if user is None:
        return {
            "bank_details_recorded": False,
            "bank_verification_label": "Bank check not connected yet",
            "driver_licence_recorded": False,
            "driver_licence_label": "Driving licence not shown",
            "passport_verified": False,
            "passport_verification_label": "Passport check not connected yet",
        }

    query = db.query(EntryPhoneVerification)
    phone = _safe_str(getattr(user, "phone_e164", None))
    email = _safe_str(getattr(user, "email", None)).lower()

    filters = []
    if phone:
        filters.append(EntryPhoneVerification.phone_e164 == phone)
    if email:
        filters.append(EntryPhoneVerification.email == email)

    row = None
    if filters:
        row = (
            query.filter(or_(*filters))
            .order_by(EntryPhoneVerification.id.desc())
            .first()
        )

    bank_recorded = bool(getattr(row, "bank_details_recorded_at", None)) if row else False
    driver_recorded = bool(getattr(row, "driver_licence_recorded_at", None)) if row else False

    return {
        "bank_details_recorded": bank_recorded,
        "bank_verified": bank_recorded,
        "bank_verification_label": (
            "Bank details recorded during entry verification"
            if bank_recorded
            else "Bank check not connected yet"
        ),
        "bank_verified_at": (
            getattr(row, "bank_details_recorded_at", None).isoformat()
            if row and getattr(row, "bank_details_recorded_at", None)
            else None
        ),
        "driver_licence_recorded": driver_recorded,
        "driver_licence_label": (
            "Driving licence details recorded"
            if driver_recorded
            else "Driving licence not shown"
        ),
        "driver_licence_recorded_at": (
            getattr(row, "driver_licence_recorded_at", None).isoformat()
            if row and getattr(row, "driver_licence_recorded_at", None)
            else None
        ),
        "passport_verified": False,
        "passport_verification_label": "Passport check not connected yet",
    }


def _generate_unique_trustslip_code(db: Session) -> str:
    for _ in range(50):
        code = secrets.token_urlsafe(8).replace("-", "").replace("_", "").upper()[:12]
        exists = db.query(TrustSlip).filter(TrustSlip.code == code).first()
        if not exists:
            return code
    raise RuntimeError("Could not generate unique TrustSlip code")


def _find_latest_trust_slip(db: Session, *, user_id: int) -> Optional[TrustSlip]:
    return (
        db.query(TrustSlip)
        .filter(TrustSlip.holder_user_id == int(user_id))
        .order_by(TrustSlip.id.desc())
        .first()
    )


def _resolve_issue_clan_id(db: Session, *, user_id: int) -> int:
    latest = _find_latest_trust_slip(db, user_id=int(user_id))
    if latest and getattr(latest, "clan_id", None):
        return int(latest.clan_id)

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .first()
    )
    if membership and getattr(membership, "clan_id", None):
        return int(membership.clan_id)

    raise ValueError("No active clan membership found for TrustSlip issuance")


def get_current_trust_slip_for_user(db: Session, *, user_id: int) -> Optional[TrustSlip]:
    current = (
        db.query(TrustSlip)
        .filter(
            TrustSlip.holder_user_id == int(user_id),
            TrustSlip.is_current.is_(True),
        )
        .order_by(TrustSlip.id.desc())
        .first()
    )
    if current:
        return current
    return _find_latest_trust_slip(db, user_id=int(user_id))


def build_trust_slip_visibility_view(payload: Dict[str, Any], *, level: Optional[str]) -> Dict[str, Any]:
    safe_level = _safe_str(level or "standard", "standard").lower()
    if safe_level not in {"minimal", "standard", "detailed"}:
        safe_level = "standard"

    merchant_summary = dict(payload.get("merchant_summary") or {})
    sponsors = list(payload.get("sponsors") or [])
    internal_contacts = list(payload.get("internal_contacts") or [])
    identity_context = dict(payload.get("identity_context") or {})
    community_context = dict(payload.get("community_context") or {})
    cci_explainer = dict(payload.get("cci_explainer") or {})

    base: Dict[str, Any] = {
        "visibility_level": safe_level,
        "verified": payload.get("verified", True),
        "active": payload.get("active", True),
        "status": payload.get("status"),
        "code": payload.get("code"),
        "gmfn_id": payload.get("gmfn_id"),
        "display_name": payload.get("display_name"),
        "profile_image_url": payload.get("profile_image_url"),
        "community": payload.get("community"),
        "identity_context": identity_context,
        "community_context": community_context,
        "cci_explainer": cci_explainer,
        "band": payload.get("band"),
        "trust_limit": payload.get("trust_limit") or payload.get("trust_slip_limit"),
        "currency": payload.get("currency"),
        "expires_at": payload.get("expires_at"),
        "expiry_policy": payload.get("expiry_policy", "weekly"),
        "phone_verified": payload.get("phone_verified", False),
        "merchant_summary": merchant_summary,
        "not_a_bank_guarantee": True,
        "no_auto_debit": True,
        "disclaimer": payload.get("disclaimer"),
    }

    if safe_level == "minimal":
        base["merchant_summary"] = {
            "gmfn_id": merchant_summary.get("gmfn_id"),
            "code": merchant_summary.get("code"),
            "trust_limit": merchant_summary.get("trust_limit"),
            "currency": merchant_summary.get("currency"),
            "expires_at": merchant_summary.get("expires_at"),
            "expiry_policy": merchant_summary.get("expiry_policy", "weekly"),
            "phone_verified": merchant_summary.get("phone_verified", False),
        }
        base.pop("profile_image_url", None)
        base.pop("identity_context", None)
        base.pop("community_context", None)
        base.pop("cci_explainer", None)
        return base

    if safe_level == "standard":
        base["cci_score"] = payload.get("cci_score")
        base["cci_band"] = payload.get("cci_band")
        base["sponsor_count"] = payload.get("sponsor_count")
        base["merchant_summary"] = {
            "gmfn_id": merchant_summary.get("gmfn_id"),
            "code": merchant_summary.get("code"),
            "trust_limit": merchant_summary.get("trust_limit"),
            "currency": merchant_summary.get("currency"),
            "cci_score": merchant_summary.get("cci_score"),
            "cci_band": merchant_summary.get("cci_band"),
            "sponsor_count": merchant_summary.get("sponsor_count"),
            "display_name": merchant_summary.get("display_name"),
            "profile_image_url": merchant_summary.get("profile_image_url"),
            "community": merchant_summary.get("community"),
            "community_global_id": merchant_summary.get("community_global_id"),
            "holder_role": merchant_summary.get("holder_role"),
            "active_member_count": merchant_summary.get("active_member_count"),
            "band": merchant_summary.get("band"),
            "cci_explainer": merchant_summary.get("cci_explainer") or cci_explainer,
            "expires_at": merchant_summary.get("expires_at"),
            "expiry_policy": merchant_summary.get("expiry_policy", "weekly"),
            "phone_verified": merchant_summary.get("phone_verified", False),
            "identity_status_label": merchant_summary.get("identity_status_label"),
        }
        base["sponsors"] = [
            {
                "gmfn_id": sponsor.get("gmfn_id"),
                "email_masked": _mask_email(sponsor.get("email")),
                "edge_type": sponsor.get("edge_type"),
            }
            for sponsor in sponsors
        ]
        return base

    base["owner"] = payload.get("owner")
    base["cci_score"] = payload.get("cci_score")
    base["cci_band"] = payload.get("cci_band")
    base["graph_score"] = payload.get("graph_score")
    base["active_clan_count"] = payload.get("active_clan_count")
    base["sponsor_count"] = payload.get("sponsor_count")
    base["unique_counterparties"] = payload.get("unique_counterparties")
    base["risk_flags"] = payload.get("risk_flags", [])
    base["last_full_repayment_at"] = payload.get("last_full_repayment_at")
    base["days_since_last_full_repayment"] = payload.get("days_since_last_full_repayment")
    base["last_release_at"] = payload.get("last_release_at")
    base["evidence_summary"] = payload.get("evidence_summary", {})
    base["sponsors"] = [
        {
            "gmfn_id": sponsor.get("gmfn_id"),
            "email_masked": _mask_email(sponsor.get("email")),
            "phone_verified": sponsor.get("phone_verified"),
            "edge_type": sponsor.get("edge_type"),
            "weight": sponsor.get("weight"),
            "confidence": sponsor.get("confidence"),
        }
        for sponsor in sponsors
    ]
    base["internal_contacts"] = [
        {
            "role": contact.get("role"),
            "gmfn_id": contact.get("gmfn_id"),
            "email_masked": _mask_email(contact.get("email")),
            "phone_verified": contact.get("phone_verified"),
            "relationship": contact.get("relationship"),
        }
        for contact in internal_contacts
    ]
    return base


def _snapshot_checksum(payload: Dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def read_trust_slip_snapshot(slip: TrustSlip) -> Optional[Dict[str, Any]]:
    raw = getattr(slip, "snapshot_json", None)
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def store_trust_slip_snapshot(
    db: Session,
    *,
    slip: TrustSlip,
    full_payload: Dict[str, Any],
    visibility_level: str,
) -> Dict[str, Any]:
    merchant_view = build_trust_slip_visibility_view(full_payload, level=visibility_level)

    snapshot = {
        "snapshot_version": SNAPSHOT_VERSION,
        "snapshot_issued_at": _now_iso(),
        "merchant_visibility_level": visibility_level,
        "merchant_view": merchant_view,
        "full_summary": full_payload,
        "trustslip_code": full_payload.get("code") or getattr(slip, "code", None),
        "gmfn_id": full_payload.get("gmfn_id"),
        "cci_score": full_payload.get("cci_score"),
        "cci_band": full_payload.get("cci_band"),
        "status": full_payload.get("status"),
        "expires_at": full_payload.get("expires_at"),
    }

    checksum = _snapshot_checksum(snapshot)

    slip.snapshot_json = json.dumps(snapshot, ensure_ascii=False)
    slip.snapshot_visibility_level = visibility_level
    slip.snapshot_version = SNAPSHOT_VERSION
    slip.snapshot_checksum = checksum

    db.add(slip)
    db.commit()
    db.refresh(slip)

    snapshot["snapshot_checksum"] = checksum
    return snapshot


def ensure_trust_slip_snapshot(
    db: Session,
    *,
    slip: TrustSlip,
    user: Optional[User],
    full_payload: Dict[str, Any],
) -> Dict[str, Any]:
    existing = read_trust_slip_snapshot(slip)
    if existing:
        if "snapshot_checksum" not in existing and getattr(slip, "snapshot_checksum", None):
            existing["snapshot_checksum"] = getattr(slip, "snapshot_checksum", None)
        if "snapshot_version" not in existing and getattr(slip, "snapshot_version", None):
            existing["snapshot_version"] = getattr(slip, "snapshot_version", None)
        return existing

    visibility_level = _saved_visibility_level(user)
    return store_trust_slip_snapshot(
        db,
        slip=slip,
        full_payload=full_payload,
        visibility_level=visibility_level,
    )


def get_trust_slip_payload(db: Session, *, user_id: int) -> Dict[str, Any]:
    uid = int(user_id)
    user = db.get(User, uid)
    summary = compute_trust_breakdown(db, user_id=uid)
    graph = _build_graph_data(db, user_id=uid)
    slip = get_current_trust_slip_for_user(db, user_id=uid)

    clan_id = _resolve_issue_clan_id(db, user_id=uid)

    trust_limit = _safe_decimal_str(summary.get("trust_slip_limit", Decimal("0.00")))
    standing_score = _safe_decimal_str(summary.get("standing_score", Decimal("0.00")))
    lifetime_trust = _safe_decimal_str(summary.get("lifetime_trust", Decimal("0.00")))

    slip_code = getattr(slip, "code", None) if slip else None
    slip_status = _effective_slip_status(slip)
    slip_currency = getattr(slip, "currency", "NGN") if slip else "NGN"
    slip_expires_at = getattr(slip, "expires_at", None) if slip else None
    slip_created_at = getattr(slip, "created_at", None) if slip else None
    slip_last_release_at = getattr(slip, "last_release_at", None) if slip else None
    slip_limit_value = getattr(slip, "trust_limit", None) if slip else None

    cci = graph.get("cci") or {}
    graph_summary = graph.get("summary") or {}

    sponsors = _sponsor_rows_from_graph(graph, max_items=3)
    internal_contacts = _internal_support_contacts(graph)

    effective_expiry = slip_expires_at.isoformat() if slip_expires_at else _default_weekly_expiry().isoformat()
    saved_level = _saved_visibility_level(user)
    effective_limit = _safe_decimal_str(slip_limit_value, trust_limit)
    gmfn_id = _ensure_user_gmfn_id_payload(user)
    display_name = (
        _safe_str(getattr(user, "display_name", None))
        or gmfn_id
        or _mask_email(getattr(user, "email", None))
        or "Member"
    )
    clan = db.get(Clan, int(clan_id)) if clan_id else None
    community = (
        _safe_str(summary.get("community_name") if isinstance(summary, dict) else None)
        or _safe_str(getattr(clan, "marketplace_name", None))
        or _safe_str(getattr(clan, "name", None))
        or f"Community {clan_id}"
    )
    phone_verified = bool(
        getattr(user, "phone_verified_at", None) and getattr(user, "phone_e164", None)
    ) if user else False
    cci_explainer = _cci_explainer(cci.get("cci_score"), cci.get("cci_band"))
    community_context = _community_context(
        db,
        user_id=uid,
        clan_id=int(clan_id or 0),
        clan=clan,
        community_name=community,
        active_clan_count=graph_summary.get("active_clan_count"),
        sponsor_count=graph_summary.get("sponsor_count"),
        unique_counterparties=graph_summary.get("unique_counterparties"),
    )
    entry_verification_context = _entry_verification_context(db, user=user)
    community_identity_confirmed = bool(clan_id and user)
    identity_context = {
        "profile_image_url": getattr(user, "profile_image_url", None) if user else None,
        "gmfn_id": gmfn_id,
        "display_name": display_name,
        "phone_verified": phone_verified,
        "bank_details_recorded": entry_verification_context["bank_details_recorded"],
        "bank_verified": entry_verification_context["bank_verified"],
        "bank_verification_label": entry_verification_context["bank_verification_label"],
        "bank_verified_at": entry_verification_context["bank_verified_at"],
        "driver_licence_recorded": entry_verification_context["driver_licence_recorded"],
        "driver_licence_label": entry_verification_context["driver_licence_label"],
        "driver_licence_recorded_at": entry_verification_context["driver_licence_recorded_at"],
        "passport_verified": entry_verification_context["passport_verified"],
        "passport_verification_label": entry_verification_context["passport_verification_label"],
        "community_identity_confirmed": community_identity_confirmed,
        "community_identity_label": (
            "Identity confirmed by active community membership"
            if community_identity_confirmed
            else "Community identity confirmation not shown"
        ),
        "identity_verified": phone_verified or entry_verification_context["bank_verified"] or community_identity_confirmed,
        "identity_status_label": (
            "Phone and community membership are verified; bank details are recorded"
            if phone_verified and community_identity_confirmed and entry_verification_context["bank_verified"]
            else "Phone and community membership are verified"
            if phone_verified and community_identity_confirmed
            else "Phone verified; stronger identity checks are still developing"
            if phone_verified
            else "Phone not verified; stronger identity checks are still developing"
        ),
        "plain_language": (
            "Use the photo, name, GSN ID, phone status, bank-record status, and community membership as identity signals. "
            "Passport verification is not connected yet, so do not treat this as a government-document check."
        ),
    }
    owner = {
        "user_id": uid,
        "gmfn_id": _ensure_user_gmfn_id_payload(user),
        "email": getattr(user, "email", None) if user else None,
        "phone_e164": getattr(user, "phone_e164", None) if user else None,
        "phone_verified": phone_verified,
        "profile_image_url": getattr(user, "profile_image_url", None) if user else None,
    }

    evidence_summary: Dict[str, Any] = {}
    try:
        liquidity = build_user_liquidity_profile(db, uid)
        evidence_summary["capacity_context"] = {
            "available_guarantee_capacity": liquidity.get("available_guarantee_capacity"),
            "current_locked_guarantees": liquidity.get("current_locked_guarantees"),
            "overexposure_ratio": liquidity.get("overexposure_ratio"),
            "risk_level": liquidity.get("risk_level"),
            "reasons": liquidity.get("reasons", []),
        }
    except Exception:
        evidence_summary["capacity_context"] = {}

    try:
        readiness = build_loan_readiness_plan(
            db,
            clan_id=int(clan_id),
            requested_amount=effective_limit,
            borrower_user_id=uid,
        )
        evidence_summary["readiness_context"] = {
            "recommendation": ((readiness.get("readiness") or {}).get("recommendation")),
            "readiness_score": ((readiness.get("readiness") or {}).get("readiness_score")),
            "reasons": ((readiness.get("readiness") or {}).get("reasons", [])),
            "estimated_guarantee_gap": ((readiness.get("coverage") or {}).get("estimated_guarantee_gap")),
            "capacity_ratio": ((readiness.get("coverage") or {}).get("capacity_ratio")),
            "coverable_now": ((readiness.get("coverage") or {}).get("coverable_now")),
        }
    except Exception:
        evidence_summary["readiness_context"] = {}

    try:
        evidence_summary["commitment_discipline"] = _expected_payment_discipline(
            db,
            user_id=uid,
        )
    except Exception:
        evidence_summary["commitment_discipline"] = {
            "source": "expected_payments",
            "source_note": "Expected-payment discipline could not be read for this TrustSlip.",
            "plain_language": (
                "This TrustSlip could not load recorded contribution or repayment expectations. "
                "Ask for the fuller Trust Passport if the decision carries risk."
            ),
        }

    try:
        evidence_summary["personal_commitment_discipline"] = _personal_commitment_discipline(
            db,
            user_id=uid,
        )
    except Exception:
        evidence_summary["personal_commitment_discipline"] = {
            "source": "trust_events",
            "source_note": "Personal commitment Trust Events could not be read for this TrustSlip.",
            "plain_language": (
                "This TrustSlip could not load personal commitment events. "
                "Ask for the fuller Trust Passport if the decision depends on personal follow-through."
            ),
        }

    evidence_summary["human_terms"] = {
        "support_finance_trade": (
            "Use the trust band, CCI, trust limit, sponsor signals, and current validity to judge whether this person has enough visible trust evidence for the decision in front of you."
        ),
        "follow_through": (
            "Use contribution records, repayment records, last release, and last full repayment to see whether the person tends to finish what they start."
        ),
        "community_stability": (
            "Use community name, active community count, sponsor signals, and counterparty signals to judge whether the person is stable inside real community relationships."
        ),
        "verified_history": (
            "Use Trust Events, Trust Graph, CCI, snapshot data, and Trust Passport evidence to check whether the story is backed by records instead of only words."
        ),
    }

    payload: Dict[str, Any] = {
        "verified": True,
        "active": slip_status == "active",
        "user_id": uid,
        "clan_id": clan_id,
        "gmfn_id": gmfn_id,
        "display_name": display_name,
        "profile_image_url": getattr(user, "profile_image_url", None) if user else None,
        "community": community,
        "identity_context": identity_context,
        "community_context": community_context,
        "cci_explainer": cci_explainer,
        "owner": owner,
        "phone_e164": getattr(user, "phone_e164", None) if user else None,
        "phone_verified": phone_verified,
        "identity_verified": identity_context["identity_verified"],
        "identity_status_label": identity_context["identity_status_label"],
        "bank_details_recorded": entry_verification_context["bank_details_recorded"],
        "bank_verified": entry_verification_context["bank_verified"],
        "bank_verification_label": entry_verification_context["bank_verification_label"],
        "driver_licence_recorded": entry_verification_context["driver_licence_recorded"],
        "driver_licence_label": entry_verification_context["driver_licence_label"],
        "passport_verified": entry_verification_context["passport_verified"],
        "passport_verification_label": entry_verification_context["passport_verification_label"],
        "community_identity_confirmed": community_identity_confirmed,
        "community_identity_label": identity_context["community_identity_label"],
        "community_global_id": community_context.get("community_global_id"),
        "community_code": community_context.get("community_code"),
        "holder_role": community_context.get("holder_role"),
        "community_member_count": community_context.get("active_member_count"),
        "active_member_count": community_context.get("active_member_count"),
        "total_member_count": community_context.get("total_member_count"),
        "level": summary.get("band"),
        "band": summary.get("band"),
        "level_label": summary.get("level_label"),
        "lifetime_trust": lifetime_trust,
        "standing_score": standing_score,
        "trust_score": standing_score,
        "trust_slip_limit": trust_limit,
        "trust_limit": effective_limit,
        "currency": slip_currency,
        "status": slip_status,
        "code": slip_code,
        "created_at": slip_created_at.isoformat() if slip_created_at else None,
        "issued_at": slip_created_at.isoformat() if slip_created_at else None,
        "expires_at": effective_expiry,
        "expiry_policy": "weekly",
        "last_release_at": slip_last_release_at.isoformat() if slip_last_release_at else None,
        "last_full_repayment_at": summary.get("last_full_repayment_at"),
        "days_since_last_full_repayment": summary.get("days_since_last_full_repayment"),
        "cci_score": cci.get("cci_score"),
        "cci_band": cci.get("cci_band"),
        "graph_score": graph_summary.get("graph_score"),
        "active_clan_count": graph_summary.get("active_clan_count"),
        "sponsor_count": graph_summary.get("sponsor_count"),
        "unique_counterparties": graph_summary.get("unique_counterparties"),
        "risk_flags": cci.get("risk_flags", []),
        "sponsors": sponsors,
        "internal_contacts": internal_contacts,
        "evidence_summary": evidence_summary,
        "merchant_summary": {
            "gmfn_id": gmfn_id,
            "display_name": display_name,
            "profile_image_url": getattr(user, "profile_image_url", None) if user else None,
            "community": community,
            "community_global_id": community_context.get("community_global_id"),
            "holder_role": community_context.get("holder_role"),
            "active_member_count": community_context.get("active_member_count"),
            "band": summary.get("band"),
            "code": slip_code,
            "trust_limit": effective_limit,
            "currency": slip_currency,
            "cci_score": cci.get("cci_score"),
            "cci_band": cci.get("cci_band"),
            "cci_explainer": cci_explainer,
            "sponsor_count": graph_summary.get("sponsor_count"),
            "expiry_policy": "weekly",
            "expires_at": effective_expiry,
            "phone_verified": phone_verified,
            "identity_status_label": identity_context["identity_status_label"],
            "bank_details_recorded": entry_verification_context["bank_details_recorded"],
            "bank_verified": entry_verification_context["bank_verified"],
            "bank_verification_label": entry_verification_context["bank_verification_label"],
            "passport_verified": entry_verification_context["passport_verified"],
            "passport_verification_label": entry_verification_context["passport_verification_label"],
            "community_identity_confirmed": community_identity_confirmed,
            "community_identity_label": identity_context["community_identity_label"],
        },
        "merchant_visibility_level": saved_level,
        "visibility_options": ["minimal", "standard", "detailed"],
        "is_current": bool(getattr(slip, "is_current", True)) if slip else True,
        "issued_reason": getattr(slip, "issued_reason", None) if slip else None,
        "supersedes_trust_slip_id": getattr(slip, "supersedes_trust_slip_id", None) if slip else None,
        "superseded_by_trust_slip_id": getattr(slip, "superseded_by_trust_slip_id", None) if slip else None,
        "not_a_bank_guarantee": True,
        "no_auto_debit": True,
        "disclaimer": (
            "Community-backed integrity limit. "
            "Not a bank guarantee. No auto-debit. "
            "TrustSlip is a portable summary derived from GSN trust history."
        ),
        "generated_at": _now_iso(),
    }

    payload["merchant_view"] = build_trust_slip_visibility_view(payload, level=saved_level)
    return payload


def issue_trust_slip_for_user(db: Session, *, user_id: int) -> Dict[str, Any]:
    uid = int(user_id)
    user = db.get(User, uid)
    if not user:
        raise ValueError("User not found")

    if not getattr(user, "phone_verified_at", None) or not getattr(user, "phone_e164", None):
        raise ValueError("Verify your phone number before issuing TrustSlip")

    current = get_current_trust_slip_for_user(db, user_id=uid)
    if (
        current
        and bool(getattr(current, "is_current", False))
        and not _trust_slip_is_expired(current)
    ):
        current_payload = get_trust_slip_payload(db, user_id=uid)
        snapshot = ensure_trust_slip_snapshot(
            db,
            slip=current,
            user=user,
            full_payload=current_payload,
        )
        return {
            "ok": True,
            "issued": False,
            "reason": "current_slip_exists",
            "trust_slip_id": int(current.id),
            "code": current.code,
            "gmfn_id": getattr(user, "gmfn_id", None),
            "status": current.status,
            "is_current": bool(current.is_current),
            "snapshot_version": snapshot.get("snapshot_version") or getattr(current, "snapshot_version", None),
            "snapshot_checksum": snapshot.get("snapshot_checksum") or getattr(current, "snapshot_checksum", None),
            "expires_at": current.expires_at.isoformat() if current.expires_at else None,
        }

    if current and bool(getattr(current, "is_current", False)):
        return {
            "ok": True,
            "issued": True,
            **reissue_trust_slip(
                db,
                user_id=uid,
                reason="expired_trustslip_auto_refresh",
            ),
        }

    pre_payload = get_trust_slip_payload(db, user_id=uid)
    trust_limit = _safe_decimal(
        pre_payload.get("trust_limit") or pre_payload.get("trust_slip_limit"),
        "0.00",
    )
    currency = _safe_str(pre_payload.get("currency"), "NGN")
    expires_at = _parse_expiry_or_default(pre_payload.get("expires_at"))
    clan_id = int(pre_payload.get("clan_id") or _resolve_issue_clan_id(db, user_id=uid))
    code = _generate_unique_trustslip_code(db)

    slip = TrustSlip(
        code=code,
        clan_id=clan_id,
        holder_user_id=uid,
        trust_limit=trust_limit,
        currency=currency,
        status="active",
        expires_at=expires_at,
        created_at=_now_utc(),
        is_current=True,
        issued_reason="initial_issue",
        supersedes_trust_slip_id=None,
        superseded_by_trust_slip_id=None,
    )
    db.add(slip)
    db.commit()
    db.refresh(slip)

    issued_payload = get_trust_slip_payload(db, user_id=uid)
    snapshot = store_trust_slip_snapshot(
        db,
        slip=slip,
        full_payload=issued_payload,
        visibility_level=_saved_visibility_level(user),
    )

    return {
        "ok": True,
        "issued": True,
        "reason": "issued",
        "trust_slip_id": int(slip.id),
        "code": slip.code,
        "gmfn_id": getattr(user, "gmfn_id", None),
        "status": slip.status,
        "is_current": bool(slip.is_current),
        "snapshot_version": snapshot.get("snapshot_version") or getattr(slip, "snapshot_version", None),
        "snapshot_checksum": snapshot.get("snapshot_checksum") or getattr(slip, "snapshot_checksum", None),
        "expires_at": slip.expires_at.isoformat() if slip.expires_at else None,
    }


def has_material_trustslip_change(
    db: Session,
    *,
    slip: TrustSlip,
    user: Optional[User],
) -> Dict[str, Any]:
    full_payload = get_trust_slip_payload(db, user_id=int(slip.holder_user_id))
    snapshot = ensure_trust_slip_snapshot(
        db,
        slip=slip,
        user=user,
        full_payload=full_payload,
    )

    merchant_view = snapshot.get("merchant_view") or {}
    merchant_summary = merchant_view.get("merchant_summary") or {}
    snapshot_level = _safe_str(snapshot.get("merchant_visibility_level"), "standard")
    current_level = _saved_visibility_level(user)

    current_limit = _safe_decimal(
        full_payload.get("trust_limit") or full_payload.get("trust_slip_limit"),
        "0.00",
    )
    old_limit = _safe_decimal(
        merchant_summary.get("trust_limit") or snapshot.get("trust_limit"),
        "0.00",
    )

    current_status = _safe_str(full_payload.get("status"), "active")
    old_status = _safe_str(snapshot.get("status") or merchant_view.get("status"), "active")

    current_expiry = _safe_str(full_payload.get("expires_at"))
    old_expiry = _safe_str(merchant_summary.get("expires_at") or snapshot.get("expires_at"))

    changes: Dict[str, Any] = {}

    if current_limit != old_limit:
        changes["trust_limit"] = {
            "old": str(old_limit),
            "new": str(current_limit),
        }

    if current_status != old_status:
        changes["status"] = {
            "old": old_status,
            "new": current_status,
        }

    if current_expiry != old_expiry:
        changes["expires_at"] = {
            "old": old_expiry,
            "new": current_expiry,
        }

    if current_level != snapshot_level:
        changes["merchant_visibility_level"] = {
            "old": snapshot_level,
            "new": current_level,
        }

    return {
        "material_change": bool(changes),
        "changes": changes,
        "current_payload": full_payload,
        "snapshot": snapshot,
    }


def reissue_trust_slip(
    db: Session,
    *,
    user_id: int,
    reason: str,
) -> Dict[str, Any]:
    uid = int(user_id)
    current_slip = get_current_trust_slip_for_user(db, user_id=uid)
    user = db.get(User, uid)
    if not user:
        raise ValueError("User not found")

    current_payload = get_trust_slip_payload(db, user_id=uid)

    if current_slip:
        current_status = _safe_str(getattr(current_slip, "status", "active"), "active").lower()
        if current_status in {"frozen", "revoked"}:
            raise ValueError(f"Cannot reissue from {current_status} TrustSlip")
        ensure_trust_slip_snapshot(
            db,
            slip=current_slip,
            user=user,
            full_payload=current_payload,
        )

    code = _generate_unique_trustslip_code(db)
    trust_limit = _safe_decimal(
        current_payload.get("trust_limit") or current_payload.get("trust_slip_limit"),
        "0.00",
    )
    currency = _safe_str(current_payload.get("currency"), "NGN")
    expires_at = _default_weekly_expiry()
    clan_id = int(current_payload.get("clan_id") or _resolve_issue_clan_id(db, user_id=uid))

    new_slip = TrustSlip(
        code=code,
        clan_id=clan_id,
        holder_user_id=uid,
        trust_limit=trust_limit,
        currency=currency,
        status="active",
        expires_at=expires_at,
        created_at=_now_utc(),
        is_current=True,
        issued_reason=_safe_str(reason, "manual_reissue"),
        supersedes_trust_slip_id=int(current_slip.id) if current_slip else None,
    )
    db.add(new_slip)
    db.commit()
    db.refresh(new_slip)

    if current_slip:
        current_slip.is_current = False
        current_slip.superseded_by_trust_slip_id = int(new_slip.id)
        db.add(current_slip)
        db.commit()
        db.refresh(current_slip)

    new_payload = get_trust_slip_payload(db, user_id=uid)
    store_trust_slip_snapshot(
        db,
        slip=new_slip,
        full_payload=new_payload,
        visibility_level=_saved_visibility_level(user),
    )

    return {
        "ok": True,
        "trust_slip_id": int(new_slip.id),
        "old_trust_slip_id": int(current_slip.id) if current_slip else None,
        "new_trust_slip_id": int(new_slip.id),
        "code": new_slip.code,
        "reason": new_slip.issued_reason,
        "created_at": new_slip.created_at.isoformat() if new_slip.created_at else None,
        "issued_at": new_slip.created_at.isoformat() if new_slip.created_at else None,
        "expires_at": new_slip.expires_at.isoformat() if new_slip.expires_at else None,
        "is_current": bool(new_slip.is_current),
    }


def backfill_missing_trustslip_snapshots(
    db: Session,
    *,
    only_current: bool = False,
    limit: int = 500,
) -> Dict[str, Any]:
    q = db.query(TrustSlip).filter(TrustSlip.snapshot_json.is_(None))
    if only_current:
        q = q.filter(TrustSlip.is_current.is_(True))
    slips = q.order_by(TrustSlip.id.asc()).limit(max(1, min(int(limit), 1000))).all()

    scanned = 0
    created = 0
    skipped = 0
    failed: list[dict[str, Any]] = []

    for slip in slips:
        scanned += 1
        try:
            if getattr(slip, "snapshot_json", None):
                skipped += 1
                continue

            user = db.get(User, int(slip.holder_user_id))
            if not user:
                failed.append({"trust_slip_id": int(slip.id), "reason": "holder_not_found"})
                continue

            payload = get_trust_slip_payload(db, user_id=int(user.id))
            store_trust_slip_snapshot(
                db,
                slip=slip,
                full_payload=payload,
                visibility_level=_saved_visibility_level(user),
            )
            created += 1
        except Exception as exc:
            db.rollback()
            failed.append(
                {
                    "trust_slip_id": int(getattr(slip, "id", 0)),
                    "reason": str(exc),
                }
            )

    return {
        "ok": True,
        "scanned": scanned,
        "created": created,
        "skipped": skipped,
        "failed": failed,
    }


def get_trust_slip_for_user(db: Session, *, user_id: int) -> Dict[str, Any]:
    return get_trust_slip_payload(db, user_id=int(user_id))
