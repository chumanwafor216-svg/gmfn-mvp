from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustSlip, TrustSlipDecisionPackAccess


@dataclass(frozen=True)
class DecisionPackDefinition:
    key: str
    label: str
    recipient_question: str
    focus: str


DECISION_PACKS: tuple[DecisionPackDefinition, ...] = (
    DecisionPackDefinition(
        key="community_standing",
        label="Community Standing Decision Pack",
        recipient_question="How is this person known where people actually know them?",
        focus="Community role, activity history, witness currentness, and unresolved public cautions.",
    ),
    DecisionPackDefinition(
        key="referral_decision",
        label="Referral Decision Pack",
        recipient_question="Can this person be referred without damaging my credibility?",
        focus=(
            "Who knows the person, how they are placed in community, and whether live "
            "confirmation is needed before referral."
        ),
    ),
    DecisionPackDefinition(
        key="guarantor_decision",
        label="Guarantor or Support Decision Pack",
        recipient_question="Is there enough evidence to stand for or support this person?",
        focus=(
            "Responsibility signals, reliability evidence, support boundary, and community "
            "confirmation before accepting risk."
        ),
    ),
    DecisionPackDefinition(
        key="employment_decision",
        label="Employment Decision Pack",
        recipient_question="Is there enough evidence to continue an employment conversation?",
        focus="Role, consistency, contribution, leadership or service signals, and the next verification step.",
    ),
    DecisionPackDefinition(
        key="housing_decision",
        label="Housing Decision Pack",
        recipient_question="Is there enough community evidence to continue a housing decision?",
        focus=(
            "Community standing, reliability posture, witness currentness, and the need for "
            "live confirmation before tenancy risk."
        ),
    ),
    DecisionPackDefinition(
        key="trade_check",
        label="Trade or Skilled Work Decision Pack",
        recipient_question="Who has seen this person trade, serve, or complete work?",
        focus=(
            "Observed service activity, community evidence, visible disputes or cautions, "
            "and confirmation before work begins."
        ),
    ),
    DecisionPackDefinition(
        key="supplier_decision",
        label="Supplier Decision Pack",
        recipient_question="Is there enough evidence to continue a supplier or contractor decision?",
        focus=(
            "Business reliability posture, fulfilment evidence where visible, community "
            "standing, and public verification status."
        ),
    ),
    DecisionPackDefinition(
        key="volunteer_decision",
        label="Volunteer Decision Pack",
        recipient_question="Is there enough evidence to accept this person into a volunteer role?",
        focus="Participation, consistency, service posture, witness currentness, and safeguarding caution before placement.",
    ),
    DecisionPackDefinition(
        key="business_partnership",
        label="Business Partnership Decision Pack",
        recipient_question="Is there enough evidence to continue a business partnership discussion?",
        focus=(
            "Community reliability, responsibility signals, public verification status, and "
            "caution before shared commercial risk."
        ),
    ),
    DecisionPackDefinition(
        key="community_membership",
        label="Community Membership Decision Pack",
        recipient_question="Is there enough evidence to admit or connect this person to a community?",
        focus="Identity context, community route, witness currentness, standing, and first live confirmation step.",
    ),
)


def _clean(value: Any, *, limit: int = 360) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = " ".join(text.split())
    return text[:limit]


def _comparable(value: Any) -> str:
    return _clean(value).lower()


def find_decision_pack(value: Any) -> Optional[DecisionPackDefinition]:
    text = _clean(value, limit=160)
    if not text:
        return None
    comparable = _comparable(text)
    for pack in DECISION_PACKS:
        if pack.key == text or _comparable(pack.label) == comparable:
            return pack
    return None


def normalize_decision_pack_context(params: Mapping[str, Any]) -> Optional[dict[str, str]]:
    decision_pack_key = _clean(
        params.get("decision_pack") or params.get("decision_pack_key"),
        limit=64,
    )
    label = _clean(params.get("access_purpose") or params.get("purpose"), limit=160)
    recipient_question = _clean(
        params.get("recipient_question") or params.get("decision_question"),
        limit=280,
    )
    focus = _clean(params.get("decision_focus") or params.get("focus"), limit=360)
    scope = _clean(params.get("access_scope"), limit=64) or "public_decision_pack"

    if not any((decision_pack_key, label, recipient_question, focus)):
        return None

    pack = find_decision_pack(decision_pack_key) or find_decision_pack(label)
    return {
        "decision_pack_key": pack.key if pack else decision_pack_key,
        "access_purpose": pack.label if pack else (label or "General Decision Pack"),
        "recipient_question": (
            pack.recipient_question
            if pack
            else recipient_question or "Can I make a better decision with this evidence?"
        ),
        "decision_focus": (
            pack.focus
            if pack
            else focus
            or "Current public identity, community standing, evidence currentness, and the next verification step."
        ),
        "access_scope": scope,
    }


def build_decision_pack_access_payload(
    context: Optional[dict[str, str]],
    *,
    recorded: bool,
) -> dict[str, Any]:
    if not context:
        return {}
    status = "backend_access_recorded" if recorded else "backend_access_context_only"
    return {
        "decision_pack": context["decision_pack_key"],
        "access_purpose": context["access_purpose"],
        "share_purpose": context["access_purpose"],
        "access_scope": context["access_scope"],
        "access_note": context["recipient_question"],
        "decision_pack_focus": context["decision_focus"],
        "share_access_record": {
            "recipient_label": "TrustSlip recipient",
            "purpose": context["access_purpose"],
            "scope": context["access_scope"],
            "note": context["recipient_question"],
            "focus": context["decision_focus"],
            "status": status,
        },
    }

PACK_RELEVANCE_SIGNALS: dict[str, tuple[str, ...]] = {
    "community_standing": (
        "community_identity",
        "membership_currentness",
        "member_witness",
        "community_activity",
        "relationship_evidence",
        "community_confirmation",
    ),
    "referral_decision": (
        "relationship_evidence",
        "member_witness",
        "community_activity",
        "membership_currentness",
        "community_confirmation",
    ),
    "guarantor_decision": (
        "membership_currentness",
        "member_witness",
        "community_activity",
        "relationship_evidence",
        "live_confirmation",
    ),
    "employment_decision": (
        "community_activity",
        "holder_role",
        "membership_currentness",
        "relationship_evidence",
        "live_confirmation",
    ),
    "housing_decision": (
        "membership_currentness",
        "community_activity",
        "community_identity",
        "member_witness",
        "live_confirmation",
    ),
    "trade_check": (
        "community_activity",
        "holder_role",
        "relationship_evidence",
        "merchant_public_status",
        "live_confirmation",
    ),
    "supplier_decision": (
        "merchant_public_status",
        "community_activity",
        "relationship_evidence",
        "membership_currentness",
        "live_confirmation",
    ),
    "volunteer_decision": (
        "community_identity",
        "membership_currentness",
        "community_activity",
        "member_witness",
        "live_confirmation",
    ),
    "business_partnership": (
        "merchant_public_status",
        "community_activity",
        "relationship_evidence",
        "membership_currentness",
        "live_confirmation",
    ),
    "community_membership": (
        "community_identity",
        "membership_currentness",
        "member_witness",
        "community_activity",
        "live_confirmation",
    ),
}


def _profile_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    text = _clean(value, limit=16).lower()
    return text in {"1", "true", "yes", "active", "verified", "current"}


def _profile_int(value: Any) -> int:
    try:
        parsed = int(float(str(value or "0")))
    except Exception:
        return 0
    return parsed if parsed > 0 else 0


def _nested(payload: Mapping[str, Any], *keys: str) -> Any:
    current: Any = payload
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _first_payload_value(payload: Mapping[str, Any], *paths: tuple[str, ...]) -> Any:
    for path in paths:
        value = _nested(payload, *path)
        if value not in (None, "", [], {}):
            return value
    return None


def _relationship_summary_text(value: Any) -> str:
    if not isinstance(value, Mapping):
        return ""
    label = _clean(value.get("summary_label") or value.get("relationship_label"), limit=160)
    count = _profile_int(value.get("evidence_count"))
    if label and count:
        return f"{label}; {count} relationship evidence item{'s' if count != 1 else ''} visible."
    if label:
        return label
    rows = value.get("rows")
    if isinstance(rows, list) and rows:
        first = rows[0] if isinstance(rows[0], Mapping) else {}
        row_label = _clean(first.get("relationship_label"), limit=160)
        if row_label:
            return row_label
    return ""


def _decision_signal(payload: Mapping[str, Any], key: str) -> dict[str, str]:
    merchant_view = payload.get("merchant_view") if isinstance(payload.get("merchant_view"), Mapping) else {}
    merchant_summary = (
        merchant_view.get("merchant_summary")
        if isinstance(merchant_view.get("merchant_summary"), Mapping)
        else {}
    )
    community_context = (
        payload.get("community_context")
        if isinstance(payload.get("community_context"), Mapping)
        else {}
    )

    if key == "community_identity":
        label = _clean(payload.get("identity_status_label"), limit=180) or _clean(
            _nested(payload, "identity_context", "identity_status_label"), limit=180
        )
        verified = _profile_bool(payload.get("identity_verified"))
        return {
            "key": key,
            "label": "Identity and community anchor",
            "status": "available" if verified or label else "gap",
            "value": label or "Identity/community anchor is not visible on this public paper.",
            "decision_use": "Check that the public holder and community record match the person in front of you.",
        }

    if key == "membership_currentness":
        label = _clean(
            _first_payload_value(
                payload,
                ("membership_currentness_label",),
                ("merchant_view", "membership_currentness_label"),
                ("merchant_view", "merchant_summary", "membership_currentness_label"),
                ("community_context", "membership_currentness_label"),
            ),
            limit=180,
        )
        scope = _clean(
            _first_payload_value(
                payload,
                ("membership_currentness_scope",),
                ("merchant_view", "membership_currentness_scope"),
                ("merchant_view", "merchant_summary", "membership_currentness_scope"),
                ("community_context", "membership_currentness_scope"),
            ),
            limit=260,
        )
        caution = any(word in label.lower() for word in ("expired", "due", "not started", "not shown"))
        return {
            "key": key,
            "label": "Membership currentness",
            "status": "caution" if caution or not label else "available",
            "value": label or "Membership currentness is not shown.",
            "decision_use": scope or "Use this to decide whether fresh witnesses or live confirmation are needed.",
        }

    if key == "member_witness":
        count = _profile_int(
            _first_payload_value(
                payload,
                ("member_witness_count",),
                ("merchant_view", "member_witness_count"),
                ("merchant_view", "merchant_summary", "member_witness_count"),
                ("community_context", "member_witness_count"),
            )
        )
        return {
            "key": key,
            "label": "Member witness evidence",
            "status": "available" if count else "gap",
            "value": f"{count} member witness record{'s' if count != 1 else ''} visible." if count else "No member witness count is visible on this public paper.",
            "decision_use": "Use witness depth as a prompt for live confirmation, not as automatic approval.",
        }

    if key == "community_activity":
        count = _profile_int(
            _first_payload_value(
                payload,
                ("community_activity_count",),
                ("merchant_view", "community_activity_count"),
                ("merchant_view", "merchant_summary", "community_activity_count"),
                ("community_context", "community_activity_count"),
            )
        )
        categories = _first_payload_value(
            payload,
            ("community_activity_categories",),
            ("merchant_view", "community_activity_categories"),
            ("merchant_view", "merchant_summary", "community_activity_categories"),
            ("community_context", "community_activity_categories"),
        )
        category_text = ""
        if isinstance(categories, list):
            category_text = ", ".join(_clean(item, limit=40) for item in categories[:3] if _clean(item, limit=40))
        label = _clean(
            _first_payload_value(
                payload,
                ("community_activity_label",),
                ("merchant_view", "community_activity_label"),
                ("merchant_view", "merchant_summary", "community_activity_label"),
                ("community_context", "community_activity_label"),
            ),
            limit=180,
        )
        value = label or (f"{count} community activity event{'s' if count != 1 else ''} visible." if count else "No community activity is visible on this public paper.")
        if count and category_text:
            value = f"{value} Categories: {category_text}."
        return {
            "key": key,
            "label": "Observed community activity",
            "status": "available" if count else "gap",
            "value": value,
            "decision_use": "Use activity depth to judge whether the person is known through repeated behaviour, not only a profile claim.",
        }

    if key == "holder_role":
        role = _clean(
            _first_payload_value(
                payload,
                ("holder_role",),
                ("merchant_view", "holder_role"),
                ("merchant_view", "merchant_summary", "holder_role"),
                ("community_context", "holder_role"),
            ),
            limit=100,
        )
        return {
            "key": key,
            "label": "Role or responsibility",
            "status": "available" if role and role.lower() != "member" else "caution",
            "value": role or "Role is not shown beyond ordinary membership.",
            "decision_use": "Use role evidence as context only; ask who observed the responsibility if it matters.",
        }

    if key == "relationship_evidence":
        relationship = _first_payload_value(
            payload,
            ("relationship_evidence_summary",),
            ("merchant_view", "relationship_evidence_summary"),
            ("merchant_view", "merchant_summary", "relationship_evidence_summary"),
        )
        text = _relationship_summary_text(relationship)
        return {
            "key": key,
            "label": "Relationship provenance",
            "status": "available" if text else "gap",
            "value": text or "No public relationship provenance is visible on this paper.",
            "decision_use": "Use this to ask who actually knows the holder and in what capacity.",
        }

    if key == "merchant_public_status":
        active = _profile_bool(payload.get("merchant_verify_active"))
        return {
            "key": key,
            "label": "Public trade status",
            "status": "available" if active else "caution",
            "value": "Merchant/public verification is active." if active else "Merchant/public verification is not active or not shown.",
            "decision_use": "Use this as a public-record status only; it is not escrow, delivery, or payment approval.",
        }

    if key in {"community_confirmation", "live_confirmation"}:
        confirmation = payload.get("community_confirmation") if isinstance(payload.get("community_confirmation"), Mapping) else {}
        relay = _profile_bool(confirmation.get("relay_available")) or _profile_bool(confirmation.get("instant_pulse_available"))
        plain = _clean(confirmation.get("plain_language"), limit=260)
        return {
            "key": key,
            "label": "Live community confirmation",
            "status": "available" if relay else "caution",
            "value": plain or ("Live community confirmation can be requested." if relay else "Live community confirmation is not available on this TrustSlip yet."),
            "decision_use": "For important decisions, request live confirmation before relying on this public paper.",
        }

    return {
        "key": key,
        "label": "Evidence signal",
        "status": "gap",
        "value": "This signal is not available on the public TrustSlip paper.",
        "decision_use": "Ask for the full Trust Passport or direct community confirmation if this evidence matters.",
    }


def build_decision_pack_profile(
    context: Optional[dict[str, str]],
    *,
    public_payload: Mapping[str, Any],
) -> dict[str, Any]:
    if not context:
        return {}

    pack_key = context.get("decision_pack_key") or "general_decision_pack"
    signal_keys = PACK_RELEVANCE_SIGNALS.get(pack_key) or (
        "community_identity",
        "membership_currentness",
        "community_activity",
        "live_confirmation",
    )
    signals = [_decision_signal(public_payload, key) for key in signal_keys]
    gaps = [signal for signal in signals if signal.get("status") in {"gap", "caution"}]
    checks = [
        "Match the visible holder, GSN ID, community, and expiry with the person presenting the TrustSlip.",
        "Ask for live community confirmation before relying on this paper for important risk.",
    ]
    if gaps:
        checks.append("Treat missing or caution signals as questions to resolve, not as negative proof.")

    return {
        "decision_pack": pack_key,
        "access_purpose": context.get("access_purpose") or "Decision Pack",
        "recipient_question": context.get("recipient_question") or "Can I make a better decision with this evidence?",
        "evidence_filter": list(signal_keys),
        "relevant_signals": signals,
        "gaps_to_check": [
            {
                "key": signal.get("key"),
                "label": signal.get("label"),
                "reason": signal.get("value"),
                "next_step": signal.get("decision_use"),
            }
            for signal in gaps[:4]
        ],
        "recommended_checks": checks,
        "basis_note": "Generated from public TrustSlip signals already visible to the recipient; no private Trust Passport contents are exposed.",
        "boundary_note": "This profile highlights relevant evidence and gaps. It does not score the person, guarantee future behaviour, or make the decision for the recipient.",
    }

def record_decision_pack_access(
    db: Session,
    *,
    slip: TrustSlip,
    context: Optional[dict[str, str]],
    visibility_level: str,
    status: str,
) -> Optional[TrustSlipDecisionPackAccess]:
    if not context:
        return None

    access = TrustSlipDecisionPackAccess(
        trust_slip_id=int(slip.id),
        clan_id=int(slip.clan_id) if getattr(slip, "clan_id", None) else None,
        holder_user_id=int(slip.holder_user_id) if getattr(slip, "holder_user_id", None) else None,
        code=str(slip.code),
        decision_pack_key=context["decision_pack_key"] or None,
        access_purpose=context["access_purpose"],
        recipient_question=context["recipient_question"],
        decision_focus=context["decision_focus"],
        access_scope=context["access_scope"],
        source="public_verify",
        visibility_level=_clean(visibility_level, limit=20) or None,
        status=_clean(status, limit=32) or None,
    )
    db.add(access)
    db.commit()
    db.refresh(access)
    return access


def decision_pack_access_to_public_row(access: TrustSlipDecisionPackAccess) -> dict[str, Any]:
    created_at = getattr(access, "created_at", None)
    return {
        "id": int(access.id),
        "trust_slip_id": int(access.trust_slip_id),
        "code": _clean(access.code, limit=64),
        "decision_pack": _clean(access.decision_pack_key, limit=64),
        "access_purpose": _clean(access.access_purpose, limit=160),
        "recipient_question": _clean(access.recipient_question, limit=280),
        "decision_focus": _clean(access.decision_focus, limit=360),
        "access_scope": _clean(access.access_scope, limit=64),
        "source": _clean(access.source, limit=64),
        "visibility_level": _clean(access.visibility_level, limit=20),
        "status": _clean(access.status, limit=32),
        "created_at": created_at.isoformat() if created_at else None,
    }


def list_decision_pack_accesses_for_holder(
    db: Session,
    *,
    holder_user_id: int,
    limit: int = 12,
) -> list[dict[str, Any]]:
    bounded_limit = max(1, min(int(limit or 12), 50))
    rows = (
        db.query(TrustSlipDecisionPackAccess)
        .filter(TrustSlipDecisionPackAccess.holder_user_id == int(holder_user_id))
        .order_by(TrustSlipDecisionPackAccess.created_at.desc(), TrustSlipDecisionPackAccess.id.desc())
        .limit(bounded_limit)
        .all()
    )
    return [decision_pack_access_to_public_row(row) for row in rows]