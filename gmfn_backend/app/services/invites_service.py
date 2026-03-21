from __future__ import annotations

import os
import secrets
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import Clan, ClanInvite, ClanMembership, User
from app.services.trust_events_services import log_trust_event
from app.services.trust_score_service import recompute_trust_for_user_id
from app.services.trust_service import log_invite_accepted_event

_INVITE_CREATE_BUCKET: dict[tuple[int, int], list[float]] = {}
_JOIN_BUCKET: dict[int, list[float]] = {}


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


def _utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _require_member_or_admin(db: Session, *, clan_id: int, user: User) -> None:
    if (getattr(user, "role", None) or "").lower() == "admin":
        return

    m = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == user.id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")


def frontend_join_link(code: str) -> str:
    base = os.getenv("FRONTEND_BASE_URL", "http://localhost:5174")
    return f"{base.rstrip('/')}/join?code={code}"


def api_join_link(request: Request, code: str) -> str:
    return str(request.base_url).rstrip("/") + f"/invites/share/{code}"


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
    _rate_limit_create_invite(int(created_by_user.id), int(clan_id), limit=20, window_seconds=3600)

    safe_expires_at = _utc_aware(expires_at)

    invite = ClanInvite(
        clan_id=clan_id,
        created_by_user_id=created_by_user.id,
        code=secrets.token_urlsafe(10),
        expires_at=safe_expires_at,
        max_uses=max_uses,
        uses=0,
        is_active=True,
        revoked_at=None,
        created_at=_utcnow(),
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    log_trust_event(
        db,
        event_type=TrustEventType.INVITE_CREATED,
        clan_id=int(clan_id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(created_by_user.id),
        subject_user_id=int(created_by_user.id),
        meta={
            "reason": "invite_created",
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

    _require_member_or_admin(db, clan_id=int(invite.clan_id), user=user)

    invite.is_active = False
    invite.revoked_at = _utcnow()

    db.commit()
    db.refresh(invite)

    log_trust_event(
        db,
        event_type=TrustEventType.INVITE_REVOKED,
        clan_id=int(invite.clan_id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(user.id),
        subject_user_id=int(invite.created_by_user_id),
        meta={
            "reason": "invite_revoked",
            "note": f"Invite {invite.code} was revoked.",
            "invite_code": invite.code,
            "uses": invite.uses,
            "max_uses": invite.max_uses,
        },
    )

    recompute_trust_for_user_id(db, user_id=int(invite.created_by_user_id))
    return invite


def join_clan_by_invite_code(db: Session, *, code: str, user: User):
    _rate_limit_join(int(user.id), limit=10, window_seconds=600)

    invite = db.query(ClanInvite).filter(ClanInvite.code == code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    now = _utcnow()

    if not invite.is_active:
        raise HTTPException(status_code=400, detail="Invite is not active")

    if invite.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Invite revoked")

    expires_at = _utc_aware(invite.expires_at)
    if expires_at is not None and expires_at <= now:
        raise HTTPException(status_code=400, detail="Invite expired")

    if invite.max_uses is not None and (invite.uses or 0) >= invite.max_uses:
        invite.is_active = False
        db.commit()
        raise HTTPException(status_code=409, detail="Invite usage limit reached")

    clan = db.get(Clan, invite.clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    existing = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan.id, ClanMembership.user_id == user.id)
        .first()
    )
    if existing:
        return {
            "clan_id": clan.id,
            "clan_name": clan.name,
            "membership_id": existing.id,
        }

    inviter_id = int(invite.created_by_user_id) if invite.created_by_user_id else None

    membership = ClanMembership(
        clan_id=clan.id,
        user_id=user.id,
        role="user",
        invited_by_user_id=inviter_id,
        invite_id=int(invite.id),
    )
    db.add(membership)

    invite.uses = (invite.uses or 0) + 1
    if invite.max_uses is not None and invite.uses >= invite.max_uses:
        invite.is_active = False

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing2 = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == clan.id, ClanMembership.user_id == user.id)
            .first()
        )
        if existing2:
            return {
                "clan_id": clan.id,
                "clan_name": clan.name,
                "membership_id": existing2.id,
            }
        raise HTTPException(status_code=409, detail="Membership already exists")

    db.refresh(membership)

    log_trust_event(
        db,
        event_type=TrustEventType.CLAN_JOIN_VIA_INVITE,
        clan_id=int(clan.id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(user.id),
        subject_user_id=int(user.id),
        meta={
            "reason": "invite_join_success",
            "note": f"User joined clan #{clan.id} via invite code {invite.code}.",
            "invite_code": invite.code,
            "invited_by_user_id": inviter_id,
            "invite_id": int(invite.id),
            "uses_after": invite.uses,
            "max_uses": invite.max_uses,
        },
    )

    if inviter_id is not None and inviter_id != int(user.id):
        log_trust_event(
            db,
            event_type=TrustEventType.INVITE_SUCCESSFUL_ONBOARDING,
            clan_id=int(clan.id),
            loan_id=None,
            guarantor_id=None,
            actor_user_id=int(user.id),
            subject_user_id=int(inviter_id),
            meta={
                "reason": "invite_onboarding_success",
                "note": (
                    f"Inviter user #{inviter_id} successfully onboarded "
                    f"user #{int(user.id)} into clan #{clan.id}."
                ),
                "invite_code": invite.code,
                "joiner_user_id": int(user.id),
                "clan_id": int(clan.id),
                "invite_id": int(invite.id),
                "uses_after": invite.uses,
                "max_uses": invite.max_uses,
            },
        )

        log_invite_accepted_event(
            db,
            clan_id=int(clan.id),
            inviter_user_id=int(inviter_id),
            joiner_user_id=int(user.id),
            meta={
                "invite_code": invite.code,
                "invite_id": int(invite.id),
                "uses_after": invite.uses,
                "max_uses": invite.max_uses,
                "reason": "invite_accepted",
            },
        )

    recompute_trust_for_user_id(db, user_id=int(user.id))
    if inviter_id is not None and inviter_id != int(user.id):
        recompute_trust_for_user_id(db, user_id=int(inviter_id))

    return {
        "clan_id": clan.id,
        "clan_name": clan.name,
        "membership_id": membership.id,
    }