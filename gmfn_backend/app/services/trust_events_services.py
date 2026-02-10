from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import TrustEvent


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def log_trust_event(
    db: Session,
    *,
    event_type: Union[str, TrustEventType],
    clan_id: int,
    actor_user_id: int,
    subject_user_id: int,
    loan_id: int,  # ✅ required (your TrustEvent.loan_id is nullable=False)
    guarantor_id: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> TrustEvent:
    """
    Append a trust event (append-only ledger).
    """
    ev = TrustEvent(
        event_type=str(event_type),  # ✅ enum stored as string
        clan_id=clan_id,
        loan_id=loan_id,
        guarantor_id=guarantor_id,
        actor_user_id=actor_user_id,
        subject_user_id=subject_user_id,
        meta=meta,  # ✅ stored in meta_json via synonym in model
        created_at=_utcnow(),
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev


def list_trust_events(
    db: Session,
    *,
    clan_id: int,
    user_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[TrustEvent]:
    """
    List trust events for a clan, optionally filtered by user (actor or subject) and/or loan.
    """
    q = db.query(TrustEvent).filter(TrustEvent.clan_id == clan_id)

    # user_id = either actor or subject
    if user_id is not None:
        q = q.filter(
            (TrustEvent.actor_user_id == user_id)
            | (TrustEvent.subject_user_id == user_id)
        )

    if loan_id is not None:
        q = q.filter(TrustEvent.loan_id == loan_id)

    limit = min(max(limit, 1), 200)

    return (
        q.order_by(TrustEvent.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


# ----------------------------
# Simple v1 “CCI score”
# ----------------------------

@dataclass
class CciScoreBreakdown:
    approved: int
    declined: int
    no_response: int
    score: int


def compute_cci_score_v1(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
) -> CciScoreBreakdown:
    """
    MVP scoring (simple, interpretable):

    - GUARANTOR_APPROVED: +3
    - GUARANTOR_DECLINED: -2
    - GUARANTOR_EXPIRED: -1 (actor only)
    """
    events = list_trust_events(
        db,
        clan_id=clan_id,
        user_id=user_id,
        limit=200,
        offset=0,
    )

    approved = 0
    declined = 0
    no_response = 0
    score = 0

    for ev in events:
        if ev.event_type == TrustEventType.GUARANTOR_APPROVED:
            approved += 1
            score += 3

        elif ev.event_type == TrustEventType.GUARANTOR_DECLINED:
            declined += 1
            score -= 2

        elif ev.event_type == TrustEventType.GUARANTOR_EXPIRED:
            # count only if the user was the actor (the guarantor who failed to respond)
            if ev.actor_user_id == user_id:
                no_response += 1
                score -= 1

    return CciScoreBreakdown(
        approved=approved,
        declined=declined,
        no_response=no_response,
        score=score,
    )
