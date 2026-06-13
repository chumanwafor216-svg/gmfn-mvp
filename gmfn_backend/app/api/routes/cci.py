from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.models import User, ClanMembership
from app.services.cci_service import compute_cci_score


router = APIRouter(prefix="/trust-events", tags=["trust-events"])


@router.get("/score")
def get_my_cci_score(
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
    limit: int = Query(500, ge=1, le=2000),
):
    clan, membership, current_user = clan_ctx

    res = compute_cci_score(
        db,
        clan_id=clan.id,
        user_id=int(current_user.id),
        limit=limit,
    )

    return {
        "user_id": res.user_id,
        "clan_id": res.clan_id,
        "cci_score": res.score,
        "events_counted": res.events_counted,
        "breakdown": res.breakdown,
    }


@router.get("/score/users/{user_id}")
def get_user_cci_score_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(500, ge=1, le=2000),
):
    # admin must be in that clan and have admin role
    clan, membership, _ = get_current_clan_membership(db=db, current_user=current_user)
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # Ensure requested user is in same clan (avoid leaking)
    m = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan.id, ClanMembership.user_id == user_id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=400, detail="User is not a member of this community")

    res = compute_cci_score(
        db,
        clan_id=clan.id,
        user_id=int(user_id),
        limit=limit,
    )

    return {
        "user_id": res.user_id,
        "clan_id": res.clan_id,
        "cci_score": res.score,
        "events_counted": res.events_counted,
        "breakdown": res.breakdown,
    }
