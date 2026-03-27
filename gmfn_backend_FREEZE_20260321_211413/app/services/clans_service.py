# app/services/clans_service.py
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Clan, ClanMembership, User


def _is_last_admin(db: Session, *, clan_id: int) -> bool:
    admins_count = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.role == "admin",
        )
        .count()
    )
    return admins_count <= 1


def create_clan(
    db: Session,
    *,
    creator: User,
    name: str,
    description: Optional[str] = None,
) -> Clan:
    # Prevent duplicate clan names (simple rule; can be relaxed later)
    existing = db.query(Clan).filter(Clan.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Clan name already exists")

    now = datetime.now(timezone.utc)

    clan = Clan(
        name=name,
        description=description,
        invite_code=secrets.token_urlsafe(16),
        invite_created_at=now,
        invite_expires_at=now + timedelta(days=7),
        invite_max_uses=None,
        invite_uses=0,
    )
    db.add(clan)
    db.commit()
    db.refresh(clan)

    # Auto-enroll creator as admin
    membership = ClanMembership(
        clan_id=clan.id,
        user_id=creator.id,
        role="admin",
        personal_pool_balance=Decimal("0"),
    )
    db.add(membership)
    db.commit()

    return clan


def list_my_clans(db: Session, *, user: User) -> list[Clan]:
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
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already a member of this clan")

    membership = ClanMembership(
        clan_id=clan_id,
        user_id=user.id,
        role="user",
        personal_pool_balance=Decimal("0"),
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership


def leave_clan(db: Session, *, user: User, clan_id: int) -> None:
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="You are not a member of this clan")

    if (membership.role or "").lower() == "admin" and _is_last_admin(db, clan_id=clan_id):
        raise HTTPException(status_code=400, detail="Cannot leave: you are the last admin")

    db.delete(membership)
    db.commit()