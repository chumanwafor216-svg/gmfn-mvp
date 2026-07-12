# app/core/clan_auth.py
from __future__ import annotations

from decimal import Decimal
from typing import Optional, Tuple

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Clan, ClanMembership, User
from app.core.auth import get_current_user

DEFAULT_CLAN_NAME = "Default Clan"
LEGACY_DEFAULT_CLAN_NAME = "GMFN Default Clan"


def _is_default_clan_name(name: str | None) -> bool:
    normalized = (name or "").strip().lower()
    return normalized in {
        DEFAULT_CLAN_NAME.lower(),
        LEGACY_DEFAULT_CLAN_NAME.lower(),
    }


def list_visible_user_clans(*, db: Session, user: User) -> list[Clan]:
    clans = (
        db.query(Clan)
        .join(ClanMembership, ClanMembership.clan_id == Clan.id)
        .filter(
            ClanMembership.user_id == user.id,
            ClanMembership.left_at.is_(None),
        )
        .order_by(Clan.id.desc())
        .all()
    )
    real_clans = [
        clan for clan in clans if not _is_default_clan_name(getattr(clan, "name", None))
    ]
    return real_clans


def ensure_membership(*, db: Session, clan: Clan, user: User, role: str = "user") -> ClanMembership:
    """
    Ensures user is a member of the clan. If already a member, returns existing row.
    """
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan.id,
            ClanMembership.user_id == user.id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if m:
        # If upgrading role, allow it
        if role == "admin" and (m.role or "").lower() != "admin":
            m.role = "admin"
            db.commit()
            db.refresh(m)
        return m

    archived = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan.id,
            ClanMembership.user_id == user.id,
            ClanMembership.left_at.isnot(None),
        )
        .order_by(ClanMembership.id.desc())
        .first()
    )
    if archived:
        archived.left_at = None
        if role == "admin" or (archived.role or "").lower() != "admin":
            archived.role = role
        db.commit()
        db.refresh(archived)
        return archived

    m = ClanMembership(
        clan_id=clan.id,
        user_id=user.id,
        role=role,
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def require_clan_admin(*, clan_id: int, db: Session, current_user: User) -> ClanMembership:
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=403, detail="Community admin role required")
    if (membership.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Community admin role required")
    return membership


def get_current_clan_membership(
    x_clan_id: Optional[int] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Tuple[Clan, ClanMembership, User]:
    """
    Gets (clan, membership, current_user).
    - If X-Clan-Id header is provided, use that clan only when the user is
      already an active member.
    - Else use the first real active clan the user already belongs to.
    - Do not auto-create or auto-assign a default clan.
    - Only ensure membership for a real chosen clan.
    """
    if x_clan_id is not None:
        clan = db.get(Clan, x_clan_id)
        if not clan or _is_default_clan_name(getattr(clan, "name", None)):
            raise HTTPException(status_code=404, detail="Community not found")
        existing_membership = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == int(clan.id),
                ClanMembership.user_id == int(current_user.id),
                ClanMembership.left_at.is_(None),
            )
            .first()
        )
        if existing_membership is None:
            raise HTTPException(
                status_code=403,
                detail="Join or be approved by this community before selecting it.",
            )
    else:
        visible_clans = list_visible_user_clans(db=db, user=current_user)
        if not visible_clans:
            raise HTTPException(
                status_code=404,
                detail="No community selected. Create or join a community first.",
            )
        clan = visible_clans[0]

    # If user is admin, make them clan-admin as well
    role = "admin" if (current_user.role or "").lower() == "admin" else "user"
    membership = ensure_membership(db=db, clan=clan, user=current_user, role=role)

    return clan, membership, current_user
