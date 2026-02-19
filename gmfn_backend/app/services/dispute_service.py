# app/services/dispute_service.py
from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session

from app.services.trust_events_services import log_trust_event
from app.core.constants import PROTOCOL_VERSION

EV_DISPUTE_FILED = "dispute.filed"
EV_DISPUTE_UNDER_REVIEW = "dispute.under_review"
EV_DISPUTE_RESOLVED = "dispute.resolved"


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
    log_trust_event(
        db,
        event_type=EV_DISPUTE_FILED,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(subject_user_id),
        meta={
            "policy": PROTOCOL_VERSION,
            "trust_delta": "0.00",
            "reason": reason,
            "note": note,
        },
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
    log_trust_event(
        db,
        event_type=EV_DISPUTE_UNDER_REVIEW,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(admin_user_id),
        subject_user_id=int(subject_user_id),
        meta={
            "policy": PROTOCOL_VERSION,
            "trust_delta": "0.00",
            "reason": "admin_review_started",
            "note": note,
        },
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
    log_trust_event(
        db,
        event_type=EV_DISPUTE_RESOLVED,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(admin_user_id),
        subject_user_id=int(subject_user_id),
        meta={
            "policy": PROTOCOL_VERSION,
            "trust_delta": "0.00",
            "reason": f"dispute_resolved:{outcome}",
            "note": note,
        },
    )