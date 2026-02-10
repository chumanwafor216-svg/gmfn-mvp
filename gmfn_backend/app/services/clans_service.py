# app/services/clans_service.py
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Clan, ClanMembership, User


def create_clan(db: Session, *, creator: User, name: str, description: str | None = None) -> Clan:
    # Prevent duplicate clan names (simple rule; can be relaxed later)
    existing = db.query(Clan).filter(Clan.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Clan name already exists")

    clan = Clan(name=name, description=description)
    db.add(clan)
    db.commit()
    db.refresh(clan)

    # Auto-enroll creator as admin
    membership = ClanMembership(
        clan_id=clan.id,
        user_id=creator.id,
        role="admin",
    )
    db.add(membership)
    db.commit()

    return clan


def list_my_clans(db: Session, *, user: User) -> list[Clan]:
    # Join membership -> clan
    q = (
        db.query(Clan)
        .join(ClanMembership, ClanMembership.clan_id == Clan.id)
        .filter(ClanMembership.user_id == user.id)
        .order_by(Clan.id.desc())
    )
    return q.all()


def join_clan(db: Session, *, user: User, clan_id: int) -> ClanMembership:
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    existing = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this clan")

    membership = ClanMembership(
        clan_id=clan_id,
        user_id=user.id,
        role="member",
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def leave_clan(db: Session, *, user: User, clan_id: int) -> None:
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of this clan")

    # Simple rule: allow leaving even if admin (we can harden later)
    db.delete(membership)
    db.commit()
