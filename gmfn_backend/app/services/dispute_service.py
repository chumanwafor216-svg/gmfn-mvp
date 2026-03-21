# app/services/dispute_service.py
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.core.constants import PROTOCOL_VERSION
from app.services.trust_events_services import log_trust_event

EV_DISPUTE_FILED = "dispute.filed"
EV_DISPUTE_UNDER_REVIEW = "dispute.under_review"
EV_DISPUTE_RESOLVED = "dispute.resolved"


def _clean_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _required_text(value: str, field_name: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"{field_name} is required")
    return text


def _meta(*, reason: str, note: Optional[str]) -> dict:
    return {
        "policy": PROTOCOL_VERSION,
        "trust_delta": "0.00",
        "reason": reason,
        "note": _clean_text(note),
    }


def file_dispute(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    actor_user_id: int,
    subject_user_id: int,
    reason: str,
    note: Optional[str],
):
    clean_reason = _required_text(reason, "reason")

    return log_trust_event(
        db,
        event_type=EV_DISPUTE_FILED,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(subject_user_id),
        meta=_meta(
            reason=clean_reason,
            note=note,
        ),
    )


def mark_under_review(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    admin_user_id: int,
    subject_user_id: int,
    note: Optional[str],
):
    return log_trust_event(
        db,
        event_type=EV_DISPUTE_UNDER_REVIEW,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(admin_user_id),
        subject_user_id=int(subject_user_id),
        meta=_meta(
            reason="admin_review_started",
            note=note,
        ),
    )


def resolve_dispute(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    admin_user_id: int,
    subject_user_id: int,
    outcome: str,
    note: Optional[str],
):
    clean_outcome = _required_text(outcome, "outcome").lower().replace(" ", "_")

    return log_trust_event(
        db,
        event_type=EV_DISPUTE_RESOLVED,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(admin_user_id),
        subject_user_id=int(subject_user_id),
        meta=_meta(
            reason=f"dispute_resolved:{clean_outcome}",
            note=note,
        ),
    )