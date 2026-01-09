from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db
from app.core.auth import get_current_user
from app.db.models import User, Clan, ClanMembership

DEFAULT_CLAN_NAME = "GMFN Default Clan"


def get_or_create_default_clan(db: Session) -> Clan:
    clan = db.query(Clan).filter(Clan.name == DEFAULT_CLAN_NAME).first()
    if clan:
        return clan
    clan = Clan(name=DEFAULT_CLAN_NAME)
    db.add(clan)
    db.commit()
    db.refresh(clan)
    return clan


def ensure_membership(db: Session, user: User, clan: Clan) -> ClanMembership:
    m = db.query(ClanMembership).filter(
        ClanMembership.user_id == user.id,
        ClanMembership.clan_id == clan.id,
    ).first()
    if m:
        return m
    m = ClanMembership(user_id=user.id, clan_id=clan.id, role="user")
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def get_current_clan_membership(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> tuple[Clan, ClanMembership, User]:
    clan = get_or_create_default_clan(db)
    membership = ensure_membership(db, current_user, clan)
    return clan, membership, current_user


def require_clan_admin(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    membership = db.query(ClanMembership).filter(
        ClanMembership.user_id == current_user.id,
        ClanMembership.clan_id == clan_id,
    ).first()

    if not membership or membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clan admin privileges required",
        )
    return current_user
