from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from app.db.models import Clan, ClanInvite, ClanMembership, User
from app.services.trust_events_services import log_trust_event
from app.services.trust_score_service import recompute_trust_for_user_id

# -------------------------
# Simple in-memory rate limits (DEV)
# For production: replace with Redis.
# -------------------------
_INVITE_CREATE_BUCKET: dict[tuple[int, int], list[float]] = {}  # (user_id, clan_id) -> timestamps
_JOIN_BUCKET: dict[int, list[float]] = {}  # user_id -> timestamps


def _bucket_prune(ts_list: list[float], window_seconds: int) -> list[float]:
    now = time.time()
    cutoff = now - window_seconds
    return [t for t in ts_list if t >= cutoff]


def _rate_limit_create_invite(user_id: int, clan_id: int, *, limit: int = 20, window_seconds: int = 3600) -> None:
    key = (user_id, clan_id)
    ts_list = _INVITE_CREATE_BUCKET.get(key, [])
    ts_list = _bucket_prune(ts_list, window_seconds)
    if len(ts_list) >= limit:
        raise HTTPException(status_code=429, detail="Too many invites created. Please wait and try again.")
    ts_list.append(time.time())
    _INVITE_CREATE_BUCKET[key] = ts_list


def _rate_limit_join(user_id: int, *, limit: int = 10, window_seconds: int = 600) -> None:
    ts_list = _JOIN_BUCKET.get(user_id, [])
    ts_list = _bucket_prune(ts_list, window_seconds)
    if len(ts_list) >= limit:
        raise HTTPException(status_code=429, detail="Too many join attempts. Please wait and try again.")
    ts_list.append(time.time())
    _JOIN_BUCKET[user_id] = ts_list


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_member_or_admin(db: Session, *, clan_id: int, user: User) -> None:
    if getattr(user, "role", None) == "admin":
        return

    m = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == user.id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")


# -------------------------
# Link helpers
# -------------------------
def frontend_join_link(code: str) -> str:
    base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    return f"{base.rstrip('/')}/join/{code}"


def api_join_link(request: Request, code: str) -> str:
    return str(request.base_url).rstrip("/") + f"/invites/share/{code}"


# -------------------------
# Core invite operations
# -------------------------
def create_clan_invite(
    db: Session,
    *,
    clan_id: int,
    created_by_user: User,
    expires_at: Optional[datetime] = None,
    max_uses: Optional[int] = None,
) -> ClanInvite:
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    _require_member_or_admin(db, clan_id=clan_id, user=created_by_user)

    # ✅ Abuse control: rate-limit invite creation
    _rate_limit_create_invite(int(created_by_user.id), int(clan_id), limit=20, window_seconds=3600)

    invite = ClanInvite(
        clan_id=clan_id,
        created_by_user_id=created_by_user.id,
        expires_at=expires_at,
        max_uses=max_uses,
        uses=0,
        is_active=True,
        revoked_at=None,
        created_at=_utcnow(),
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    # ✅ TrustEvent: invite created
    log_trust_event(
        db,
        event_type="invite_created",
        clan_id=clan_id,
        loan_id=None,
        guarantor_id=None,
        actor_user_id=created_by_user.id,
        subject_user_id=created_by_user.id,
        meta={
            "invite_code": invite.code,
            "max_uses": invite.max_uses,
            "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        },
    )

    return invite


def list_clan_invites(db: Session, *, clan_id: int, user: User) -> list[ClanInvite]:
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    _require_member_or_admin(db, clan_id=clan_id, user=user)

    return (
        db.query(ClanInvite)
        .filter(ClanInvite.clan_id == clan_id)
        .order_by(ClanInvite.created_at.desc())
        .all()
    )


def preview_invite(db: Session, *, code: str) -> dict:
    invite = db.query(ClanInvite).filter(ClanInvite.code == code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    clan = db.get(Clan, invite.clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    return {
        "code": invite.code,
        "clan_id": clan.id,
        "clan_name": clan.name,
        "is_active": invite.is_active,
        "uses": invite.uses or 0,
        "max_uses": invite.max_uses,
        "expires_at": invite.expires_at,
        "revoked_at": invite.revoked_at,
    }


def revoke_invite(db: Session, *, code: str, user: User) -> ClanInvite:
    invite = db.query(ClanInvite).filter(ClanInvite.code == code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    _require_member_or_admin(db, clan_id=invite.clan_id, user=user)

    invite.is_active = False
    invite.revoked_at = _utcnow()

    db.commit()
    db.refresh(invite)

    # ✅ TrustEvent: invite revoked
    log_trust_event(
        db,
        event_type="invite_revoked",
        clan_id=invite.clan_id,
        loan_id=None,
        guarantor_id=None,
        actor_user_id=user.id,
        subject_user_id=invite.created_by_user_id,
        meta={
            "invite_code": invite.code,
            "uses": invite.uses,
            "max_uses": invite.max_uses,
        },
    )

    return invite


def join_clan_by_invite_code(db: Session, *, code: str, user: User) -> tuple[Clan, ClanMembership]:
    # ✅ Abuse control: rate-limit join attempts
    _rate_limit_join(int(user.id), limit=10, window_seconds=600)

    invite = db.query(ClanInvite).filter(ClanInvite.code == code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    now = _utcnow()

    if not invite.is_active:
        raise HTTPException(status_code=400, detail="Invite is not active")

    if invite.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Invite revoked")

    if invite.expires_at is not None and invite.expires_at <= now:
        raise HTTPException(status_code=400, detail="Invite expired")

    if invite.max_uses is not None and (invite.uses or 0) >= invite.max_uses:
        invite.is_active = False
        db.commit()
        raise HTTPException(status_code=400, detail="Invite usage limit reached")

    clan = db.get(Clan, invite.clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    existing = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan.id, ClanMembership.user_id == user.id)
        .first()
    )
    if existing:
        return clan, existing

    max_members = getattr(clan, "max_members", None)
    if max_members is not None:
        member_count = db.query(ClanMembership).filter(ClanMembership.clan_id == clan.id).count()
        if member_count >= int(max_members):
            raise HTTPException(status_code=400, detail="Clan is full")

    membership = ClanMembership(clan_id=clan.id, user_id=user.id, role="member")
    db.add(membership)

    invite.uses = (invite.uses or 0) + 1
    if invite.max_uses is not None and invite.uses >= invite.max_uses:
        invite.is_active = False

    db.commit()
    db.refresh(membership)

    # ✅ TrustEvent: joined via invite
    log_trust_event(
        db,
        event_type="clan_join_via_invite",
        clan_id=clan.id,
        loan_id=None,
        guarantor_id=None,
        actor_user_id=user.id,
        subject_user_id=user.id,
        meta={
            "invite_code": invite.code,
            "invited_by_user_id": invite.created_by_user_id,
            "uses_after": invite.uses,
            "max_uses": invite.max_uses,
        },
    )
    # joiner trust
    # 🔍 Trust source: joined via invite
    recompute_trust_for_user_id(
    db,
    user_id=int(user.id),
    source="invite_join",
)

    # inviter trust (if known)
    # 🔍 Trust source: successful invite onboarding
    recompute_trust_for_user_id(
    db,
    user_id=int(invite.created_by_user_id),
    source="invite_success",
)

    recompute_trust_for_user_id(db, user_id=int(invite.created_by_user_id))

    return clan, membership
