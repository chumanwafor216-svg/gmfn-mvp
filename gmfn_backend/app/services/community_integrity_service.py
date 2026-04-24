from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Clan, ClanInvite, ClanMembership, User


DEFAULT_INVITE_TTL_HOURS = 72


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_future_expiry(
    *,
    created_at: Optional[datetime],
    expires_at: Optional[datetime],
    ttl_hours: int = DEFAULT_INVITE_TTL_HOURS,
) -> tuple[datetime, datetime]:
    now = utc_now()

    created = created_at or now
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    if expires_at is None:
        expires = created + timedelta(hours=ttl_hours)
    else:
        expires = expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)

    if expires <= created:
        expires = created + timedelta(hours=max(1, ttl_hours))

    if expires <= now:
        expires = now + timedelta(hours=max(1, ttl_hours))

    return created, expires


def is_invite_expired(invite: ClanInvite) -> bool:
    expires_at = getattr(invite, "expires_at", None)
    if not isinstance(expires_at, datetime):
        return True
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at <= utc_now()


def seconds_until_expiry(invite: ClanInvite) -> int:
    expires_at = getattr(invite, "expires_at", None)
    if not isinstance(expires_at, datetime):
        return 0
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    diff = int((expires_at - utc_now()).total_seconds())
    return max(0, diff)


def normalize_invite_expiry(
    db: Session,
    invite: ClanInvite,
    *,
    ttl_hours: int = DEFAULT_INVITE_TTL_HOURS,
    commit: bool = False,
) -> ClanInvite:
    created, expires = ensure_future_expiry(
        created_at=getattr(invite, "created_at", None),
        expires_at=getattr(invite, "expires_at", None),
        ttl_hours=ttl_hours,
    )
    invite.created_at = created
    invite.expires_at = expires
    db.add(invite)
    db.flush()
    if commit:
        db.commit()
        db.refresh(invite)
    return invite


def get_membership(
    db: Session,
    *,
    user_id: int,
    clan_id: int,
) -> Optional[ClanMembership]:
    return (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == user_id,
            ClanMembership.clan_id == clan_id,
        )
        .first()
    )


def require_membership(
    db: Session,
    *,
    user_id: int,
    clan_id: int,
) -> ClanMembership:
    membership = get_membership(db, user_id=user_id, clan_id=clan_id)
    if membership is None:
        raise HTTPException(status_code=403, detail="You are not a member of this community")
    return membership


def require_admin_membership(
    db: Session,
    *,
    user_id: int,
    clan_id: int,
) -> ClanMembership:
    membership = require_membership(db, user_id=user_id, clan_id=clan_id)
    role = str(getattr(membership, "role", "") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Community admin role required")
    return membership


def set_active_clan_for_user(
    db: Session,
    *,
    user: User,
    clan_id: int,
) -> dict[str, Any]:
    membership = require_membership(db, user_id=int(user.id), clan_id=clan_id)

    clan = db.query(Clan).filter(Clan.id == clan_id).first()
    if clan is None:
        raise HTTPException(status_code=404, detail="Community not found")

    # support likely attribute names without breaking if one doesn't exist
    if hasattr(user, "selected_clan_id"):
        setattr(user, "selected_clan_id", clan_id)
    elif hasattr(user, "active_clan_id"):
        setattr(user, "active_clan_id", clan_id)
    elif hasattr(user, "current_clan_id"):
        setattr(user, "current_clan_id", clan_id)
    else:
        raise HTTPException(
            status_code=500,
            detail="User model missing active community field",
        )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "ok": True,
        "active_clan_id": int(clan.id),
        "active_clan_name": getattr(clan, "name", None),
        "membership_role": getattr(membership, "role", None),
        "message": "Active community updated",
    }


def get_active_clan_for_user(
    db: Session,
    *,
    user: User,
) -> dict[str, Any]:
    active_clan_id = None
    for attr in ("selected_clan_id", "active_clan_id", "current_clan_id"):
        if hasattr(user, attr):
            active_clan_id = getattr(user, attr)
            break

    if not active_clan_id:
        first_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == int(user.id))
            .order_by(ClanMembership.id.asc())
            .first()
        )
        if first_membership is None:
            return {
                "active_clan_id": None,
                "active_clan_name": None,
                "membership_role": None,
            }
        result = set_active_clan_for_user(
            db,
            user=user,
            clan_id=int(first_membership.clan_id),
        )
        return {
            "active_clan_id": result["active_clan_id"],
            "active_clan_name": result["active_clan_name"],
            "membership_role": result["membership_role"],
        }

    membership = get_membership(db, user_id=int(user.id), clan_id=int(active_clan_id))
    if membership is None:
        first_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == int(user.id))
            .order_by(ClanMembership.id.asc())
            .first()
        )
        if first_membership is None:
            return {
                "active_clan_id": None,
                "active_clan_name": None,
                "membership_role": None,
            }
        result = set_active_clan_for_user(
            db,
            user=user,
            clan_id=int(first_membership.clan_id),
        )
        return {
            "active_clan_id": result["active_clan_id"],
            "active_clan_name": result["active_clan_name"],
            "membership_role": result["membership_role"],
        }

    clan = db.query(Clan).filter(Clan.id == int(active_clan_id)).first()
    return {
        "active_clan_id": int(active_clan_id),
        "active_clan_name": getattr(clan, "name", None) if clan else None,
        "membership_role": getattr(membership, "role", None),
    }


def join_clan_via_invite(
    db: Session,
    *,
    user: User,
    invite_code: str,
) -> dict[str, Any]:
    code = str(invite_code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Invite code is required")

    invite = (
        db.query(ClanInvite)
        .filter(ClanInvite.code == code)
        .first()
    )
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found")

    normalize_invite_expiry(db, invite, commit=False)

    if is_invite_expired(invite):
        raise HTTPException(status_code=410, detail="Invite has expired")

    clan = db.query(Clan).filter(Clan.id == int(invite.clan_id)).first()
    if clan is None:
        raise HTTPException(status_code=404, detail="Invite community not found")

    existing = get_membership(db, user_id=int(user.id), clan_id=int(clan.id))
    if existing is None:
        membership = ClanMembership(
            user_id=int(user.id),
            clan_id=int(clan.id),
            role="member",
        )
        db.add(membership)
        db.flush()

    set_active_clan_for_user(db, user=user, clan_id=int(clan.id))

    return {
        "ok": True,
        "clan_id": int(clan.id),
        "clan_name": getattr(clan, "name", None),
        "joined_user_id": int(user.id),
        "message": "Joined community successfully",
    }


def audit_invite(
    db: Session,
    *,
    invite_id: int,
) -> dict[str, Any]:
    invite = db.query(ClanInvite).filter(ClanInvite.id == invite_id).first()
    if invite is None:
        raise HTTPException(status_code=404, detail="Invite not found")

    normalize_invite_expiry(db, invite, commit=True)

    clan = db.query(Clan).filter(Clan.id == int(invite.clan_id)).first()

    created_at = invite.created_at
    expires_at = invite.expires_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return {
        "id": int(invite.id),
        "clan_id": int(invite.clan_id),
        "clan_name": getattr(clan, "name", None) if clan else None,
        "created_by_user_id": getattr(invite, "created_by_user_id", None),
        "invite_code": str(getattr(invite, "code", "")),
        "created_at": created_at.isoformat(),
        "expires_at": expires_at.isoformat(),
        "is_expired": is_invite_expired(invite),
        "seconds_until_expiry": seconds_until_expiry(invite),
    }
