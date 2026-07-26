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