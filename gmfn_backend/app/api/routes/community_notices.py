from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, TrustEvent, User, UserSettings
from app.services.community_integrity_service import _user_settings_table_exists
from app.services.notification_service import create_notification
from app.services.web_push_service import dispatch_web_push_for_notifications
from app.services.community_meeting_service import list_community_meetings
from app.services.trust_events_services import log_trust_event


router = APIRouter(prefix="/community-notices", tags=["community-notices"])

COMMUNITY_NOTICE_EVENT = "community.notice.posted"
COMMUNITY_NOTICE_SOURCE = "community_notice_board"
MAX_NOTICE_WORDS = 50
NOTICE_POSTING_POLICY_MEMBERS = "members"
NOTICE_POSTING_POLICY_ADMINS = "admins"
NOTICE_POSTING_POLICIES = {
    NOTICE_POSTING_POLICY_MEMBERS,
    NOTICE_POSTING_POLICY_ADMINS,
}


def _safe_str(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def _iso(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return None


def _safe_meta(raw: Any) -> dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(str(raw))
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _word_count(text: str) -> int:
    return len([word for word in _safe_str(text).split() if word])


def _reject_bool_identifier(value: Any, field_name: str) -> Any:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer id, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer id, not a float.")
    return value


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _normalize_notice_posting_policy(value: Any) -> str:
    policy = _safe_str(value, NOTICE_POSTING_POLICY_MEMBERS).lower()
    return policy if policy in NOTICE_POSTING_POLICIES else NOTICE_POSTING_POLICY_MEMBERS


def _notice_posting_policy_for_clan(db: Session, *, clan_id: int) -> str:
    clan = db.get(Clan, int(clan_id))
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")
    return _normalize_notice_posting_policy(
        getattr(clan, "notice_posting_policy", NOTICE_POSTING_POLICY_MEMBERS)
    )


def _set_notice_posting_policy_for_clan(
    db: Session,
    *,
    clan_id: int,
    posting_policy: str,
) -> str:
    clan = db.get(Clan, int(clan_id))
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")
    policy = _normalize_notice_posting_policy(posting_policy)
    clan.notice_posting_policy = policy
    db.commit()
    db.refresh(clan)
    return _normalize_notice_posting_policy(
        getattr(clan, "notice_posting_policy", policy)
    )


def _is_notice_officer(membership: ClanMembership, current_user: User) -> bool:
    is_platform_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    is_clan_admin = str(getattr(membership, "role", "") or "").lower() == "admin"
    return bool(is_platform_admin or is_clan_admin)


def _require_clan_member(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> ClanMembership:
    is_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if membership:
        return membership
    if is_admin:
        return ClanMembership(
            clan_id=int(clan_id),
            user_id=int(current_user.id),
            role="admin",
        )
    raise HTTPException(status_code=403, detail="You are not a member of this community")


def _require_notice_officer(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> ClanMembership:
    membership = _require_clan_member(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    if not _is_notice_officer(membership, current_user):
        raise HTTPException(
            status_code=403,
            detail="Only a community officer can post an official notice",
        )
    return membership


def _require_notice_poster(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> tuple[ClanMembership, str]:
    membership = _require_clan_member(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    posting_policy = _notice_posting_policy_for_clan(db, clan_id=int(clan_id))
    if (
        posting_policy == NOTICE_POSTING_POLICY_ADMINS
        and not _is_notice_officer(membership, current_user)
    ):
        raise HTTPException(
            status_code=403,
            detail="This community notice board is admin-only right now",
        )
    return membership, posting_policy


def _public_whatsapp_contact_for_user(db: Session, user: Optional[User]) -> Optional[str]:
    if not user:
        return None
    phone = _safe_str(getattr(user, "phone_e164", None))
    if not phone or not getattr(user, "phone_verified_at", None):
        return None
    if not _user_settings_table_exists(db):
        return phone
    try:
        settings = (
            db.query(UserSettings)
            .filter(UserSettings.user_id == int(user.id))
            .first()
        )
    except OperationalError:
        db.rollback()
        return phone
    if settings is not None and not bool(getattr(settings, "show_whatsapp_public", False)):
        return None
    return phone


def _member_display(user: Optional[User]) -> str:
    if not user:
        return "GSN member"
    return _safe_str(
        getattr(user, "display_name", None)
        or getattr(user, "email", None)
        or getattr(user, "gmfn_id", None),
        "GSN member",
    )


def _poster_contact_payload(db: Session, current_user: User) -> dict[str, Any]:
    db_user = db.get(User, int(getattr(current_user, "id", 0) or 0)) or current_user
    contact = _public_whatsapp_contact_for_user(db, db_user)
    return {
        "sender_whatsapp_number": contact,
        "sender_whatsapp_label": _member_display(db_user) if contact else None,
        "sender_contact_ready": bool(contact),
    }


def _event_to_notice(event: TrustEvent) -> dict[str, Any]:
    meta = _safe_meta(getattr(event, "meta_json", None))
    body = _safe_str(meta.get("body") or meta.get("title"))
    sender_contact = _safe_str(meta.get("sender_whatsapp_number"))
    return {
        "notice_id": f"TE-{int(event.id)}",
        "event_id": int(event.id),
        "source": _safe_str(meta.get("source"), COMMUNITY_NOTICE_SOURCE),
        "clan_id": int(getattr(event, "clan_id", 0) or 0),
        "body": body,
        "title": body,
        "word_count": _word_count(body),
        "created_at": _iso(getattr(event, "created_at", None)),
        "posted_by_user_id": int(getattr(event, "actor_user_id", 0) or 0),
        "posted_by_role": _safe_str(meta.get("posted_by_role")),
        "posting_policy": _normalize_notice_posting_policy(meta.get("posting_policy")),
        "sender_whatsapp_number": sender_contact or None,
        "sender_whatsapp_label": _safe_str(meta.get("sender_whatsapp_label")) if sender_contact else None,
        "sender_contact_ready": bool(sender_contact),
    }


def _active_notice_recipient_ids(
    db: Session,
    *,
    clan_id: int,
    poster_user_id: int,
) -> list[int]:
    rows = (
        db.query(ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.user_id.asc())
        .all()
    )
    recipient_ids: list[int] = []
    seen: set[int] = set()
    for row in rows:
        user_id = int(row[0])
        if user_id == int(poster_user_id) or user_id in seen:
            continue
        seen.add(user_id)
        recipient_ids.append(user_id)
    return recipient_ids


def _create_notice_notifications(
    db: Session,
    *,
    clan_id: int,
    body: str,
    poster_user_id: int,
) -> int:
    recipient_ids = _active_notice_recipient_ids(
        db,
        clan_id=int(clan_id),
        poster_user_id=int(poster_user_id),
    )
    if not recipient_ids:
        return 0

    notification_rows = []
    for user_id in recipient_ids:
        notification_rows.append(
            create_notification(
                db,
                user_id=int(user_id),
                kind=COMMUNITY_NOTICE_EVENT,
                title="Official community notice",
                message=body,
                action_url=f"/app/marketplace?clan_id={int(clan_id)}#marketplace-official-board",
                action_label="Open Official Board",
                commit=False,
                refresh=False,
            )
        )
    db.commit()
    try:
        dispatch_web_push_for_notifications(db, notification_rows)
    except Exception:
        pass
    return len(recipient_ids)


def _meeting_to_notice(row: dict[str, Any]) -> dict[str, Any]:
    body = _safe_str(row.get("title") or row.get("purpose"), "Community meeting")
    return {
        "notice_id": f"MTG-{_safe_str(row.get('meeting_id') or row.get('event_id'))}",
        "event_id": row.get("summary_event_id") or row.get("reminder_event_id") or row.get("event_id"),
        "source": "community_meeting",
        "clan_id": None,
        "body": body,
        "title": body,
        "word_count": _word_count(body),
        "created_at": row.get("created_at") or row.get("scheduled_at"),
        "posted_by_user_id": None,
        "meeting_id": row.get("meeting_id"),
        "scheduled_at": row.get("scheduled_at"),
        "status": row.get("status"),
    }


class CommunityNoticeIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    body: str = Field(..., min_length=2, max_length=500)

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("body", mode="before")
    @classmethod
    def _reject_non_text_notice_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("body")
    @classmethod
    def _enforce_notice_word_limit(cls, value: str) -> str:
        body = _safe_str(value)
        if _word_count(body) > MAX_NOTICE_WORDS:
            raise ValueError("Official community notices must be 50 words or fewer.")
        return body


class CommunityNoticeSettingsIn(BaseModel):
    posting_policy: Literal["members", "admins"]


@router.get("")
def list_notices(
    clan_id: int = Query(..., ge=1),
    limit: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership = _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    posting_policy = _notice_posting_policy_for_clan(db, clan_id=int(clan_id))
    notice_rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_EVENT,
        )
        .order_by(TrustEvent.id.desc())
        .limit(int(limit))
        .all()
    )
    notices = [_event_to_notice(row) for row in notice_rows]

    if len(notices) < int(limit):
        meetings = list_community_meetings(
            db,
            clan_id=int(clan_id),
            limit=max(1, int(limit) - len(notices)),
        )
        notices.extend(_meeting_to_notice(row) for row in meetings)

    return {
        "ok": True,
        "engine_ready": True,
        "clan_id": int(clan_id),
        "max_words": MAX_NOTICE_WORDS,
        "comments_enabled": False,
        "reactions_enabled": False,
        "thread_enabled": False,
        "posting_policy": posting_policy,
        "can_post_notice": posting_policy == NOTICE_POSTING_POLICY_MEMBERS
        or _is_notice_officer(membership, current_user),
        "notices": notices[: int(limit)],
    }


@router.post("")
def create_notice(
    payload: CommunityNoticeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership, posting_policy = _require_notice_poster(
        db,
        clan_id=int(payload.clan_id),
        current_user=current_user,
    )
    body = _safe_str(payload.body)
    poster_contact = _poster_contact_payload(db, current_user)
    event = log_trust_event(
        db,
        event_type=COMMUNITY_NOTICE_EVENT,
        clan_id=int(payload.clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "source": COMMUNITY_NOTICE_SOURCE,
            "reason": "community_notice_posted",
            "body": body,
            "word_count": _word_count(body),
            "posting_policy": posting_policy,
            "posted_by_role": _safe_str(getattr(membership, "role", None), "member"),
            "comments_enabled": False,
            "reactions_enabled": False,
            "thread_enabled": False,
            "trust_delta": "0.00",
            **poster_contact,
        },
    )
    notifications_created = _create_notice_notifications(
        db,
        clan_id=int(payload.clan_id),
        body=body,
        poster_user_id=int(current_user.id),
    )
    return {
        "ok": True,
        "engine_ready": True,
        "notice": _event_to_notice(event),
        "posting_policy": posting_policy,
        "notification_kind": COMMUNITY_NOTICE_EVENT,
        "notifications_created": int(notifications_created),
        "message": "Community announcement posted to the Community Notice Board.",
        "boundary": (
            "The notice belongs to this selected community or marketplace only. "
            "Notifications are created only for active members of this selected "
            "community; it does not broadcast to other marketplaces, communities, "
            "domains, or public visitors."
        ),
    }


@router.get("/settings")
def get_notice_settings(
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership = _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    posting_policy = _notice_posting_policy_for_clan(db, clan_id=int(clan_id))
    return {
        "ok": True,
        "clan_id": int(clan_id),
        "posting_policy": posting_policy,
        "can_post_notice": posting_policy == NOTICE_POSTING_POLICY_MEMBERS
        or _is_notice_officer(membership, current_user),
        "can_manage_notice_settings": _is_notice_officer(membership, current_user),
        "boundary": (
            "Members mode lets active members post short announcements with any "
            "verified public WhatsApp contact they have chosen to show. Admin-only "
            "mode limits new posts to community officers."
        ),
    }


@router.patch("/settings")
def update_notice_settings(
    payload: CommunityNoticeSettingsIn,
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_notice_officer(db, clan_id=int(clan_id), current_user=current_user)
    posting_policy = _set_notice_posting_policy_for_clan(
        db,
        clan_id=int(clan_id),
        posting_policy=payload.posting_policy,
    )
    return {
        "ok": True,
        "clan_id": int(clan_id),
        "posting_policy": posting_policy,
        "message": (
            "Community Notice Board is open to active members."
            if posting_policy == NOTICE_POSTING_POLICY_MEMBERS
            else "Community Notice Board is admin-only."
        ),
    }
