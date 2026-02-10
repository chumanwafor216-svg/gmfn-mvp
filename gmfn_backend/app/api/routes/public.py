from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.db.models import User, Clan, ClanMembership
from app.schemas.public import UserPublicOut, ClanOut

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/clans/{clan_id}", response_model=ClanOut)
def get_clan_public(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    # must be member of the clan OR admin user
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == current_user.id,
        )
        .first()
    )
    if not m and getattr(current_user, "role", "") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")

    return clan


@router.get("/users/{user_id}", response_model=UserPublicOut)
def get_user_public(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # allow self
    if user.id == current_user.id:
        return user

    # allow admin
    if getattr(current_user, "role", "") == "admin":
        return user

    # allow only if shares at least one clan
    shared = (
        db.query(ClanMembership)
        .join(
            ClanMembership,
            ClanMembership.user_id == current_user.id,
        )
        .filter(ClanMembership.user_id == user.id)
        .first()
    )

    # The above join is tricky depending on your ORM setup.
    # Safer approach: check any clan_id in common.
    my_clans = (
        db.query(ClanMembership.clan_id)
        .filter(ClanMembership.user_id == current_user.id)
        .all()
    )
    my_clan_ids = {x[0] for x in my_clans}

    their_clans = (
        db.query(ClanMembership.clan_id)
        .filter(ClanMembership.user_id == user.id)
        .all()
    )
    their_clan_ids = {x[0] for x in their_clans}

    if not (my_clan_ids & their_clan_ids):
        raise HTTPException(status_code=403, detail="Not allowed")

    return user
