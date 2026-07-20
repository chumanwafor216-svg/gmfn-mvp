from __future__ import annotations

import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote, urlparse

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import Clan, ClanInvite, ClanMembership, User
from app.services.global_identity_service import ensure_user_gmfn_id
from app.services.trust_events_services import log_trust_event
from app.services.trust_score_service import recompute_trust_for_user_id
from app.services.trust_service import log_invite_accepted_event

_INVITE_CREATE_BUCKET: dict[tuple[int, int], list[float]] = {}
_JOIN_BUCKET: dict[int, list[float]] = {}
PUBLIC_FRONTEND_ORIGIN = "https://gmfn-frontend.onrender.com"
SUSPENDED_PUBLIC_FRONTEND_HOSTS = {"frontend.onrender.com"}


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


def _minimum_invite_ttl_hours() -> int:
    raw = str(os.getenv("GMFN_JOIN_INVITE_MIN_TTL_HOURS") or "24").strip()
    try:
        hours = int(raw)
    except ValueError:
        hours = 24
    return max(0, min(hours, 24 * 30))


def _effective_invite_expires_at(invite: ClanInvite) -> Optional[datetime]:
    expires_at = _utc_aware(invite.expires_at)
    created_at = _utc_aware(invite.created_at)
    min_hours = _minimum_invite_ttl_hours()

    if expires_at is None or created_at is None or min_hours <= 0:
        return expires_at

    minimum_expires_at = created_at + timedelta(hours=min_hours)
    if expires_at < minimum_expires_at:
        return minimum_expires_at
    return expires_at


def _is_private_frontend_host(hostname: str) -> bool:
    host = str(hostname or "").strip().lower()
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        return True
    if host.startswith("192.168.") or host.startswith("10."):
        return True
    parts = host.split(".")
    if len(parts) >= 2 and parts[0] == "172":
        try:
            second = int(parts[1])
        except ValueError:
            return False
        return 16 <= second <= 31
    return False


def _is_suspended_public_frontend_host(hostname: str) -> bool:
    return str(hostname or "").strip().lower() in SUSPENDED_PUBLIC_FRONTEND_HOSTS


def _public_frontend_base_url() -> str:
    for key in ("FRONTEND_BASE_URL", "GMFN_FRONTEND_BASE_URL", "PUBLIC_FRONTEND_URL"):
        raw = str(os.getenv(key) or "").strip().rstrip("/")
        if not raw:
            continue
        try:
            parsed = urlparse(raw)
        except Exception:
            continue
        if (
            parsed.scheme in {"http", "https"}
            and parsed.hostname
            and not _is_private_frontend_host(parsed.hostname)
            and not _is_suspended_public_frontend_host(parsed.hostname)
        ):
            return raw
    return PUBLIC_FRONTEND_ORIGIN


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
    base = _public_frontend_base_url()
    return f"{base}/start/join/{quote(str(code or '').strip(), safe='')}"


def api_join_link(request: Request, code: str) -> str:
    return str(request.base_url).rstrip("/") + f"/invites/share/{code}"


def _clean_invite_relationship_evidence(raw: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not isinstance(raw, dict):
        return None

    def clean_text(key: str, *, limit: int) -> Optional[str]:
        value = str(raw.get(key) or "").strip()
        if not value:
            return None
        return value[:limit]

    def clean_count(key: str) -> Optional[int]:
        try:
            value = int(raw.get(key))
        except (TypeError, ValueError):
            return None
        return max(0, min(value, 1000))

    evidence = {
        "evidence_source": clean_text("evidence_source", limit=80),
        "invitation_context": clean_text("invitation_context", limit=80),
        "relationship_type": clean_text("relationship_type", limit=80),
        "known_duration": clean_text("known_duration", limit=80),
        "confidence_level": clean_text("confidence_level", limit=40),
        "relationship_context": clean_text("relationship_context", limit=500),
        "first_circle_role": clean_text("first_circle_role", limit=80),
        "first_circle_ready_count": clean_count("first_circle_ready_count"),
        "first_circle_selected_count": clean_count("first_circle_selected_count"),
    }

    cleaned = {key: value for key, value in evidence.items() if value is not None}
    if not cleaned:
        return None

    cleaned["privacy_note"] = (
        "Relationship evidence records why this invite was issued. "
        "It should not contain private phone numbers, bank details, or exact addresses."
    )
    return cleaned


def create_clan_invite(
    db: Session,
    *,
    clan_id: int,
    created_by_user: User,
    expires_at: Optional[datetime] = None,
    max_uses: Optional[int] = None,
    relationship_evidence: Optional[dict[str, Any]] = None,
) -> ClanInvite:
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")

    _require_member_or_admin(db, clan_id=clan_id, user=created_by_user)
    _rate_limit_create_invite(int(created_by_user.id), int(clan_id), limit=20, window_seconds=3600)

    safe_expires_at = _utc_aware(expires_at)

    invite = ClanInvite(
        clan_id=clan_id,
        created_by_user_id=created_by_user.id,
        code=secrets.token_urlsafe(10),
        expires_at=safe_expires_at,
        max_uses=0,
        uses=0,
        is_active=True,
        revoked_at=None,
        created_at=_utcnow(),
    )

    db.add(invite)
    db.commit()
    db.refresh(invite)

    trust_meta = {
        "reason": "invite_created",
        "invite_code": invite.code,
        "max_uses": None,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
    }
    clean_relationship_evidence = _clean_invite_relationship_evidence(
        relationship_evidence
    )
    if clean_relationship_evidence:
        trust_meta["relationship_evidence"] = clean_relationship_evidence
        trust_meta["trust_record_note"] = (
            "This invite was created with a relationship statement so GSN can "
            "show that access came through a known community connection."
        )

    log_trust_event(
        db,
        event_type=TrustEventType.INVITE_CREATED,
        clan_id=int(clan_id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(created_by_user.id),
        subject_user_id=int(created_by_user.id),
        meta=trust_meta,
    )

    return invite


def list_clan_invites(db: Session, *, clan_id: int, user: User) -> list[ClanInvite]:
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")

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
        raise HTTPException(status_code=404, detail="Community not found")

    return {
        "code": invite.code,
        "clan_id": clan.id,
        "clan_name": clan.name,
        "is_active": invite.is_active,
        "uses": invite.uses or 0,
        "max_uses": None,
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
            "max_uses": None,
        },
    )

    recompute_trust_for_user_id(db, user_id=int(invite.created_by_user_id))
    return invite


def join_clan_by_invite_code(db: Session, *, code: str, user: User):
    user = ensure_user_gmfn_id(db, user)
    _rate_limit_join(int(user.id), limit=10, window_seconds=600)

    invite = db.query(ClanInvite).filter(ClanInvite.code == code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    now = _utcnow()

    if not invite.is_active:
        raise HTTPException(status_code=400, detail="Invite is not active")

    if invite.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Invite revoked")

    expires_at = _effective_invite_expires_at(invite)
    if expires_at is not None and expires_at <= now:
        raise HTTPException(status_code=400, detail="Invite expired")

    clan = db.get(Clan, invite.clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")

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
            "user_id": int(user.id),
            "gmfn_id": getattr(user, "gmfn_id", None),
            "result_status": "already_member",
            "existing_identity": True,
            "identity_reused": True,
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
                "user_id": int(user.id),
                "gmfn_id": getattr(user, "gmfn_id", None),
                "result_status": "already_member",
                "existing_identity": True,
                "identity_reused": True,
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
            "max_uses": None,
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
                "max_uses": None,
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
                "max_uses": None,
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
        "user_id": int(user.id),
        "gmfn_id": getattr(user, "gmfn_id", None),
        "result_status": "joined_successfully",
        "existing_identity": True,
        "identity_reused": True,
    }
