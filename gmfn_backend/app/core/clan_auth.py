# app/core/clan_auth.py
from __future__ import annotations

from decimal import Decimal
from typing import Optional, Tuple
import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Clan, ClanMembership, User
from app.core.auth import get_current_user


def get_or_create_default_clan(*, db: Session) -> Clan:
    """
    Returns the default clan, creating it if missing.
    """
    clan = db.query(Clan).filter(Clan.name == "Default Clan").first()
    if clan:
        return clan

    # ✅ invite_code is NOT NULL, so always set it
    clan = Clan(name="Default Clan", invite_code=secrets.token_urlsafe(16))
    db.add(clan)
    db.commit()
    db.refresh(clan)
    return clan


def ensure_membership(*, db: Session, clan: Clan, user: User, role: str = "user") -> ClanMembership:
    """
    Ensures user is a member of the clan. If already a member, returns existing row.
    """
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan.id,
            ClanMembership.user_id == user.id,
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


def get_current_clan_membership(
    x_clan_id: Optional[int] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Tuple[Clan, ClanMembership, User]:
    """
    Gets (clan, membership, current_user).
    - If X-Clan-Id header is provided, use that clan (must exist).
    - Else use/create the default clan.
    - Always ensure membership exists.
    """
    if x_clan_id is not None:
        clan = db.get(Clan, x_clan_id)
        if not clan:
            raise HTTPException(status_code=404, detail="Clan not found")
    else:
        clan = get_or_create_default_clan(db=db)

    # If user is admin, make them clan-admin as well
    role = "admin" if (current_user.role or "").lower() == "admin" else "user"
    membership = ensure_membership(db=db, clan=clan, user=current_user, role=role)

    return clan, membership, current_user
