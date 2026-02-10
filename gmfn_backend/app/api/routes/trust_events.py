from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.clan_auth import get_current_clan_membership
from app.core.trust_event_types import TrustEventType
from app.db.models import TrustEvent, User

router = APIRouter(prefix="/trust-events", tags=["trust-events"])


@router.get("")
def list_trust_events(
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    items = (
        db.query(TrustEvent)
        .filter(TrustEvent.clan_id == clan.id)
        .order_by(TrustEvent.id.desc())
        .limit(50)
        .all()
    )
    return {"items": items, "total": len(items)}


def _compute_score(db: Session, *, clan_id: int, user_id: int) -> dict:
    approved = (
        db.query(func.count(TrustEvent.id))
        .filter(TrustEvent.clan_id == clan_id)
        .filter(TrustEvent.event_type == TrustEventType.GUARANTOR_APPROVED.value)
        .filter(TrustEvent.subject_user_id == user_id)
        .scalar()
        or 0
    )

    declined = (
        db.query(func.count(TrustEvent.id))
        .filter(TrustEvent.clan_id == clan_id)
        .filter(TrustEvent.event_type == TrustEventType.GUARANTOR_DECLINED.value)
        .filter(TrustEvent.subject_user_id == user_id)
        .scalar()
        or 0
    )

    expired = (
        db.query(func.count(TrustEvent.id))
        .filter(TrustEvent.clan_id == clan_id)
        .filter(TrustEvent.event_type == TrustEventType.GUARANTOR_EXPIRED.value)
        .filter(TrustEvent.subject_user_id == user_id)
        .scalar()
        or 0
    )

    loan_auto = (
        db.query(func.count(TrustEvent.id))
        .filter(TrustEvent.clan_id == clan_id)
        .filter(
            TrustEvent.event_type.in_(
                [
                    TrustEventType.LOAN_AUTO_APPROVED.value,
                    TrustEventType.LOAN_AUTO_APPROVED_BY_GUARANTORS.value,
                ]
            )
        )
        .filter(TrustEvent.subject_user_id == user_id)
        .scalar()
        or 0
    )

    score = (2 * int(approved)) - (2 * int(declined)) - (1 * int(expired)) + (1 * int(loan_auto))

    return {
        "clan_id": clan_id,
        "user_id": user_id,
        "score": int(score),
        "breakdown": {
            "guarantor_approved": int(approved),
            "guarantor_declined": int(declined),
            "guarantor_expired": int(expired),
            "loan_auto_approved": int(loan_auto),
        },
    }


@router.get("/score")
def get_my_score(
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    return _compute_score(db, clan_id=clan.id, user_id=int(current_user.id))


@router.get("/score/{user_id}")
def get_user_score_admin(
    user_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    return _compute_score(db, clan_id=clan.id, user_id=int(user_id))
