# app/api/routes/clans.py

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.core.clan_auth import get_current_clan_membership
from app.db.models import ClanMembership
from app.schemas.pool import PoolBalanceUpdate, PoolBalanceOut

router = APIRouter(prefix="/clans", tags=["clans"])


@router.patch(
    "/{clan_id}/members/{user_id}/pool",
    response_model=PoolBalanceOut,
)
def set_member_pool_balance(
    clan_id: int,
    user_id: int,
    payload: PoolBalanceUpdate,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    # Must be operating in the current clan context
    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Must be clan admin
    if membership.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Clan admin privileges required",
        )

    # Find the target member
    member = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user_id,
        )
        .first()
    )

    if not member:
        raise HTTPException(status_code=404, detail="Membership not found")

    # Update stored field
    member.personal_pool_balance = Decimal(str(payload.pool_balance))

    db.commit()
    db.refresh(member)

    # ✅ IMPORTANT:
    # Response MUST match PoolBalanceOut exactly
    return {
        "pool_balance": float(member.personal_pool_balance),
    }
