from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union

from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import TrustEvent
from app.services.trust_events_services import log_trust_event as canonical_log_trust_event


def log_trust_event(
    db: Session,
    *,
    event_type: Union[str, TrustEventType],
    clan_id: int,
    actor_user_id: int,
    subject_user_id: int,
    loan_id: Optional[int] = None,
    guarantor_id: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> TrustEvent:
    return canonical_log_trust_event(
        db,
        event_type=event_type,
        clan_id=int(clan_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(subject_user_id),
        loan_id=loan_id,
        guarantor_id=guarantor_id,
        meta=meta,
        commit=True,
        refresh=True,
    )


def log_loan_repaid_event(
    db: Session,
    *,
    clan_id: int,
    borrower_user_id: int,
    guarantor_user_id: int,
    loan_id: int,
    guarantor_id: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> TrustEvent:
    payload = dict(meta or {})
    payload.setdefault("borrower_user_id", int(borrower_user_id))
    payload.setdefault("guarantor_user_id", int(guarantor_user_id))
    payload.setdefault("reason", "loan_repaid")

    return canonical_log_trust_event(
        db,
        event_type=TrustEventType.LOAN_REPAID,
        clan_id=int(clan_id),
        actor_user_id=int(borrower_user_id),
        subject_user_id=int(guarantor_user_id),
        loan_id=int(loan_id),
        guarantor_id=guarantor_id,
        meta=payload,
        commit=True,
        refresh=True,
    )


def log_loan_defaulted_event(
    db: Session,
    *,
    clan_id: int,
    borrower_user_id: int,
    affected_user_id: int,
    loan_id: int,
    guarantor_id: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> TrustEvent:
    payload = dict(meta or {})
    payload.setdefault("borrower_user_id", int(borrower_user_id))
    payload.setdefault("affected_user_id", int(affected_user_id))
    payload.setdefault("reason", "loan_defaulted")

    return canonical_log_trust_event(
        db,
        event_type=TrustEventType.LOAN_DEFAULTED,
        clan_id=int(clan_id),
        actor_user_id=int(borrower_user_id),
        subject_user_id=int(affected_user_id),
        loan_id=int(loan_id),
        guarantor_id=guarantor_id,
        meta=payload,
        commit=True,
        refresh=True,
    )


def log_invite_accepted_event(
    db: Session,
    *,
    clan_id: int,
    inviter_user_id: int,
    joiner_user_id: int,
    meta: Optional[Dict[str, Any]] = None,
) -> TrustEvent:
    payload = dict(meta or {})
    payload.setdefault("inviter_user_id", int(inviter_user_id))
    payload.setdefault("joiner_user_id", int(joiner_user_id))
    payload.setdefault("reason", "invite_accepted")

    return canonical_log_trust_event(
        db,
        event_type=TrustEventType.INVITE_ACCEPTED,
        clan_id=int(clan_id),
        actor_user_id=int(inviter_user_id),
        subject_user_id=int(joiner_user_id),
        loan_id=None,
        guarantor_id=None,
        meta=payload,
        commit=True,
        refresh=True,
    )


def list_trust_events(
    db: Session,
    *,
    clan_id: int,
    user_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[TrustEvent]:
    q = db.query(TrustEvent).filter(TrustEvent.clan_id == int(clan_id))

    if user_id is not None:
        q = q.filter(
            (TrustEvent.actor_user_id == int(user_id))
            | (TrustEvent.subject_user_id == int(user_id))
        )

    if loan_id is not None:
        q = q.filter(TrustEvent.loan_id == int(loan_id))

    limit = min(max(int(limit), 1), 200)

    return (
        q.order_by(TrustEvent.id.desc())
        .offset(int(offset))
        .limit(limit)
        .all()
    )


@dataclass
class CciScoreBreakdown:
    approved: int
    declined: int
    no_response: int
    repaid: int
    defaulted: int
    invited_successfully: int
    score: int


def compute_cci_score_v1(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
) -> CciScoreBreakdown:
    events = list_trust_events(
        db,
        clan_id=int(clan_id),
        user_id=int(user_id),
        limit=200,
        offset=0,
    )

    approved = 0
    declined = 0
    no_response = 0
    repaid = 0
    defaulted = 0
    invited_successfully = 0
    score = 0

    for ev in events:
        event_type = str(ev.event_type)

        if event_type == str(TrustEventType.GUARANTOR_APPROVED):
            approved += 1
            score += 3

        elif event_type == str(TrustEventType.GUARANTOR_DECLINED):
            declined += 1
            score -= 2

        elif event_type == str(TrustEventType.GUARANTOR_EXPIRED):
            if int(ev.actor_user_id) == int(user_id):
                no_response += 1
                score -= 1

        elif event_type == str(TrustEventType.LOAN_REPAID):
            repaid += 1
            score += 5

        elif event_type == str(TrustEventType.LOAN_DEFAULTED):
            defaulted += 1
            score -= 6

        elif event_type == str(TrustEventType.INVITE_ACCEPTED):
            invited_successfully += 1
            score += 2

    return CciScoreBreakdown(
        approved=approved,
        declined=declined,
        no_response=no_response,
        repaid=repaid,
        defaulted=defaulted,
        invited_successfully=invited_successfully,
        score=score,
    )