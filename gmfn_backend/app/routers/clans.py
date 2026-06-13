from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.db.models import Clan, ClanMembership
from app.core.clan_auth import require_clan_admin
from app.core.auth import get_current_user
from app.schemas.clan_memberships import ClanMemberCreate, ClanMemberOut

router = APIRouter()

@router.get("/clans/{clan_id}/members", response_model=list[ClanMemberOut])
def list_clan_members(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # basic access check: must be a member of the community
    membership = db.query(ClanMembership).filter(
        ClanMembership.clan_id == clan_id,
        ClanMembership.user_id == current_user.id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Community access required")

    return (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id)
        .order_by(ClanMembership.id.asc())
        .all()
    )

@router.post("/clans/{clan_id}/members", response_model=ClanMemberOut, status_code=status.HTTP_201_CREATED)
def add_clan_member(
    clan_id: int,
    payload: ClanMemberCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # admin check (DB-based)
    require_clan_admin(clan_id=clan_id, db=db, current_user=current_user)

    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")

    row = ClanMembership(
        clan_id=clan_id,
        user_id=payload.user_id,
        role=(payload.role if payload.role in ("user", "admin") else "user"),
    )
    db.add(row)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # UniqueConstraint uq_clan_membership likely triggers here
        raise HTTPException(status_code=409, detail="Member already exists")

    db.refresh(row)
    return row

@router.delete("/clans/{clan_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_clan_member(
    clan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_clan_admin(clan_id=clan_id, db=db, current_user=current_user)

    row = db.query(ClanMembership).filter(
        ClanMembership.clan_id == clan_id,
        ClanMembership.user_id == user_id,
    ).first()

    if not row:
        raise HTTPException(status_code=404, detail="Membership not found")

    db.delete(row)
    db.commit()
    return None
