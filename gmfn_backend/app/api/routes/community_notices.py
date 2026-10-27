from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy import or_
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.rate_limit import client_ip, rate_limiter
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomain,
    CommunityDomainPolicy,
    CommunityNoticePublicPollResponse,
    MarketplaceRequest,
    TrustEvent,
    User,
    UserSettings,
)
from app.db.notification_models import Notification
from app.services.community_integrity_service import _user_settings_table_exists
from app.services.notification_service import create_notification
from app.services.web_push_service import dispatch_web_push_for_notifications
from app.services.community_meeting_service import list_community_meetings
from app.services.trust_events_services import log_trust_event


router = APIRouter(prefix="/community-notices", tags=["community-notices"])

COMMUNITY_NOTICE_EVENT = "community.notice.posted"
COMMUNITY_NOTICE_SUBMISSION_EVENT = "community.notice.submitted"
COMMUNITY_NOTICE_REVIEW_EVENT = "community.notice.review_decided"
COMMUNITY_NOTICE_ACK_EVENT = "community.notice.acknowledged"
COMMUNITY_NOTICE_AVAILABILITY_EVENT = "community.notice.availability_response"
COMMUNITY_NOTICE_POLL_RESPONSE_EVENT = "community.notice.poll_response"
COMMUNITY_GOVERNANCE_PROFILE_SELECTED_EVENT = "community.governance_profile_selected"
COMMUNITY_NOTICE_SOURCE = "community_notice_board"
MAX_NOTICE_WORDS = 50
MAX_NOTICE_FULL_WORDS = 600
MAX_NOTICE_FULL_BODY_LENGTH = 4000
MAX_NOTICE_ATTACHMENT_URL_LENGTH = 1000
MAX_NOTICE_ATTACHMENT_LABEL_LENGTH = 80
MAX_NOTICE_POLL_QUESTION_LENGTH = 180
MAX_NOTICE_POLL_OPTION_LENGTH = 60
MAX_NOTICE_POLL_OPTIONS = 7
NOTICE_POLL_SELECTION_SINGLE = "single"
NOTICE_POLL_SELECTION_MULTIPLE = "multiple"
NOTICE_POLL_SELECTION_MODES = {
    NOTICE_POLL_SELECTION_SINGLE,
    NOTICE_POLL_SELECTION_MULTIPLE,
}
NOTICE_POLL_AUDIENCE_MEMBERS = "members"
NOTICE_POLL_AUDIENCE_PUBLIC_LINK = "public_link"
NOTICE_POLL_AUDIENCES = {
    NOTICE_POLL_AUDIENCE_MEMBERS,
    NOTICE_POLL_AUDIENCE_PUBLIC_LINK,
}
NOTICE_PUBLIC_POLL_TOKEN_MIN_LENGTH = 24
NOTICE_PUBLIC_POLL_TOKEN_MAX_LENGTH = 160
NOTICE_INTERNAL_MEDIA_ATTACHMENT_RE = re.compile(
    r"^/uploads/marketplace/(?:images|videos)/[^?#\s]+(?:[?#][^\s]*)?$",
    re.IGNORECASE,
)
NOTICE_PUBLIC_BOUNDARY = (
    "Public GSN announcement package only. It shows the public-safe notice, any "
    "attachment selected by the poster, and a verified public WhatsApp contact "
    "only when the announcer chose to publish it. Acknowledgement and availability "
    "remain limited to signed-in active members. Poll voting is member-only unless "
    "the creator explicitly opens that poll to anyone with the announcement link. "
    "It does not expose "
    "member lists, acknowledgement roll call, aggregate response records, private "
    "contacts, payments, creation tools, or admin authority."
)
NOTICE_POSTING_POLICY_MEMBERS = "members"
NOTICE_POSTING_POLICY_ADMINS = "admins"
NOTICE_POSTING_POLICIES = {
    NOTICE_POSTING_POLICY_MEMBERS,
    NOTICE_POSTING_POLICY_ADMINS,
}
NOTICE_MODE_NOTICE = "notice"
NOTICE_MODE_MARKET_NEED_PULSE = "market_need_pulse"
NOTICE_MODES = {NOTICE_MODE_NOTICE, NOTICE_MODE_MARKET_NEED_PULSE}
NOTICE_EXPIRY_STANDARD = "standard"
NOTICE_EXPIRY_URGENT = "urgent"
NOTICE_EXPIRY_EVENT = "event"
NOTICE_EXPIRY_PINNED = "pinned"
NOTICE_EXPIRY_POLICIES = {
    NOTICE_EXPIRY_STANDARD,
    NOTICE_EXPIRY_URGENT,
    NOTICE_EXPIRY_EVENT,
    NOTICE_EXPIRY_PINNED,
}
NOTICE_STANDARD_VISIBLE_DAYS = 7
NOTICE_URGENT_VISIBLE_HOURS = 48
NOTICE_PREVIOUS_ANNOUNCEMENT_LIMIT = 10
NOTICE_BOARD_DEMAND_SIGNAL_LIMIT = 3
NOTICE_MONTH_NAMES = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}
NOTICE_EMBEDDED_DATE_RE = re.compile(
    r"\b(?P<day>\d{1,2})(?:st|nd|rd|th)?\s+"
    r"(?P<month>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|"
    r"jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|"
    r"nov(?:ember)?|dec(?:ember)?)\s+"
    r"(?P<year>\d{4})\b",
    re.IGNORECASE,
)
CENTRAL_DOMAIN_NOTICE_EVENT = "community_domain.notice.posted"
CENTRAL_DOMAIN_NOTICE_SOURCE = "community_domain_notice_board"
CENTRAL_DOMAIN_FEATURE_POLICY_KEY = "domain.feature_policy"
CENTRAL_DOMAIN_FEATURE_ANNOUNCEMENT_BOARD = "announcement_board"
CENTRAL_DOMAIN_FEATURE_MODE_OFF = "off"
CENTRAL_DOMAIN_OPERATION_BLOCKED_STATUSES = {"suspended", "closed"}


def _safe_str(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text if text else fallback



def _public_trust_posture(user: User | None) -> tuple[float | None, str | None]:
    if not user or not getattr(user, "trust_score_updated_at", None):
        return None, None

    score = getattr(user, "trust_score", None)
    band = _safe_str(getattr(user, "trust_band", None)) or None
    return (float(score) if score is not None else None), band

def _iso(value: Any) -> Optional[str]:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return None


def _parse_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = _safe_str(value)
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


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


def _community_governance_profile_for_clan(
    db: Session,
    *,
    clan_id: int,
) -> Optional[dict[str, Any]]:
    event = (
        db.query(TrustEvent)
        .filter(TrustEvent.clan_id == int(clan_id))
        .filter(TrustEvent.event_type == COMMUNITY_GOVERNANCE_PROFILE_SELECTED_EVENT)
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .first()
    )
    if event is None:
        return None

    meta = _safe_meta(getattr(event, "meta_json", None))
    profile = {
        key: meta[key]
        for key in (
            "community_type",
            "community_type_label",
            "governance_weight",
            "governance_weight_label",
            "preset_key",
            "preset_label",
            "verification_mode",
            "policies",
            "requirements",
            "truth_boundary",
            "requested_preset_key",
            "preset_correction",
        )
        if key in meta
    }
    if not profile:
        return None

    created_at = getattr(event, "created_at", None)
    profile["source_event_id"] = int(event.id)
    profile["recorded_at"] = created_at.isoformat() if created_at else None
    return profile


def _community_records_policy_for_clan(
    db: Session,
    *,
    clan_id: int,
) -> dict[str, Any]:
    profile = _community_governance_profile_for_clan(db, clan_id=int(clan_id))
    policies = (
        profile.get("policies")
        if isinstance(profile, dict) and isinstance(profile.get("policies"), dict)
        else {}
    )
    profile_key = (
        _safe_str(profile.get("preset_key"))
        if isinstance(profile, dict)
        else ""
    )
    has_profile = profile is not None
    records_enabled = bool(policies.get("enable_community_records", True))
    member_submissions_enabled = bool(
        policies.get("allow_member_record_submissions", not has_profile)
    )
    approval_required = bool(
        policies.get("require_admin_approval_for_records", has_profile)
    )

    return {
        "has_governance_profile": has_profile,
        "governance_profile_key": profile_key or None,
        "community_records_enabled": records_enabled,
        "member_record_submissions_enabled": member_submissions_enabled,
        "admin_approval_required_for_records": approval_required,
        "truth_boundary": (
            "This reflects the recorded community setup. It can block disabled "
            "Community Records, prevent ordinary members from publishing directly "
            "when admin review is required, and route eligible member notices into "
            "the Community Records review queue."
        ),
    }


def _community_record_policy_error(
    *,
    code: str,
    message: str,
    clan_id: int,
    policy: dict[str, Any],
) -> HTTPException:
    return HTTPException(
        status_code=403,
        detail={
            "code": code,
            "message": message,
            "community_id": int(clan_id),
            "governance_profile_key": policy.get("governance_profile_key"),
            "community_records_policy": policy,
        },
    )


def _can_create_notice_record(
    membership: ClanMembership,
    current_user: User,
    *,
    posting_policy: str,
    records_policy: dict[str, Any],
) -> bool:
    if not bool(records_policy.get("community_records_enabled", True)):
        return False
    if _is_notice_officer(membership, current_user):
        return True
    if posting_policy == NOTICE_POSTING_POLICY_ADMINS:
        return False
    if not bool(records_policy.get("member_record_submissions_enabled", False)):
        return False
    if bool(records_policy.get("admin_approval_required_for_records", True)):
        return False
    return True


def _can_submit_notice_for_review(
    membership: ClanMembership,
    current_user: User,
    *,
    posting_policy: str,
    records_policy: dict[str, Any],
) -> bool:
    if not bool(records_policy.get("community_records_enabled", True)):
        return False
    if _is_notice_officer(membership, current_user):
        return False
    if posting_policy == NOTICE_POSTING_POLICY_ADMINS:
        return False
    if not bool(records_policy.get("member_record_submissions_enabled", False)):
        return False
    return bool(records_policy.get("admin_approval_required_for_records", True))


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

def _normalize_notice_mode(value: Any) -> str:
    mode = _safe_str(value, NOTICE_MODE_NOTICE).lower()
    return mode if mode in NOTICE_MODES else NOTICE_MODE_NOTICE

def _normalize_notice_poll_selection_mode(value: Any) -> str:
    mode = _safe_str(value, NOTICE_POLL_SELECTION_SINGLE).lower()
    return mode if mode in NOTICE_POLL_SELECTION_MODES else NOTICE_POLL_SELECTION_SINGLE

def _normalize_notice_poll_audience(value: Any) -> str:
    audience = _safe_str(value, NOTICE_POLL_AUDIENCE_MEMBERS).lower()
    return audience if audience in NOTICE_POLL_AUDIENCES else NOTICE_POLL_AUDIENCE_MEMBERS

def _normalize_notice_expiry_policy(value: Any) -> str:
    policy = _safe_str(value, NOTICE_EXPIRY_STANDARD).lower()
    return policy if policy in NOTICE_EXPIRY_POLICIES else NOTICE_EXPIRY_STANDARD


def _notice_expires_at(policy: str, explicit_expires_at: Any = None) -> Optional[datetime]:
    now = datetime.now(timezone.utc)
    if policy == NOTICE_EXPIRY_PINNED:
        return None
    if policy == NOTICE_EXPIRY_URGENT:
        return now + timedelta(hours=NOTICE_URGENT_VISIBLE_HOURS)
    if policy == NOTICE_EXPIRY_EVENT:
        parsed = _parse_datetime(explicit_expires_at)
        if parsed is None:
            raise ValueError("event notices need an expiry date.")
        if parsed <= now:
            raise ValueError("event notice expiry must be in the future.")
        return parsed
    return now + timedelta(days=NOTICE_STANDARD_VISIBLE_DAYS)


def _notice_embedded_event_expires_at(meta: dict[str, Any]) -> Optional[datetime]:
    text = " ".join(
        _safe_str(meta.get(key))
        for key in ("title", "body", "purpose")
        if _safe_str(meta.get(key))
    )
    if not text:
        return None
    match = NOTICE_EMBEDDED_DATE_RE.search(text[:160])
    if not match:
        return None
    month = NOTICE_MONTH_NAMES.get(match.group("month").lower())
    if month is None:
        return None
    try:
        day = int(match.group("day"))
        year = int(match.group("year"))
        event_day = datetime(year, month, day, tzinfo=timezone.utc)
    except ValueError:
        return None
    return event_day + timedelta(days=1)


def _notice_effective_expires_at(
    meta: dict[str, Any],
    *,
    created_at: Any = None,
) -> Optional[datetime]:
    expires_at = _parse_datetime(meta.get("expires_at"))
    if expires_at is not None:
        return expires_at
    embedded_event_expires_at = _notice_embedded_event_expires_at(meta)
    if embedded_event_expires_at is not None:
        return embedded_event_expires_at
    policy = _normalize_notice_expiry_policy(meta.get("expiry_policy"))
    if policy == NOTICE_EXPIRY_PINNED:
        return None
    created = _parse_datetime(created_at)
    if created is None:
        return None
    if policy == NOTICE_EXPIRY_URGENT:
        return created + timedelta(hours=NOTICE_URGENT_VISIBLE_HOURS)
    return created + timedelta(days=NOTICE_STANDARD_VISIBLE_DAYS)


def _notice_is_expired(
    meta: dict[str, Any],
    *,
    now: Optional[datetime] = None,
    created_at: Any = None,
) -> bool:
    expires_at = _notice_effective_expires_at(meta, created_at=created_at)
    if expires_at is None:
        return False
    current = now or datetime.now(timezone.utc)
    return expires_at <= current


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
    user_role = str(getattr(current_user, "role", "") or "").lower()
    membership_role = str(getattr(membership, "role", "") or "").lower()
    return bool(user_role == "admin" or membership_role in {"admin", "owner"})


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
) -> tuple[ClanMembership, str, dict[str, Any]]:
    membership = _require_clan_member(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    posting_policy = _notice_posting_policy_for_clan(db, clan_id=int(clan_id))
    records_policy = _community_records_policy_for_clan(db, clan_id=int(clan_id))
    is_officer = _is_notice_officer(membership, current_user)
    if not bool(records_policy.get("community_records_enabled", True)):
        raise _community_record_policy_error(
            code="community_records_disabled",
            message=(
                "This community setup has Community Records turned off. Ask an "
                "admin to enable Community Records before posting a notice."
            ),
            clan_id=int(clan_id),
            policy=records_policy,
        )
    if posting_policy == NOTICE_POSTING_POLICY_ADMINS and not is_officer:
        raise HTTPException(
            status_code=403,
            detail="This community notice board is admin-only right now",
        )
    if not is_officer and not bool(
        records_policy.get("member_record_submissions_enabled", False)
    ):
        raise _community_record_policy_error(
            code="community_member_record_submissions_disabled",
            message=(
                "This community setup does not let ordinary members publish "
                "Community Records directly. Ask an admin to post it."
            ),
            clan_id=int(clan_id),
            policy=records_policy,
        )
    return membership, posting_policy, records_policy


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


def _clan_source_payload(db: Session, clan_id: int) -> dict[str, Any]:
    clan = db.get(Clan, int(clan_id)) if clan_id else None
    return {
        "source_community_id": int(clan_id) if clan_id else None,
        "source_community_name": _safe_str(getattr(clan, "name", None), "Selected community"),
        "source_community_code": _safe_str(
            getattr(clan, "community_code", None)
            or getattr(clan, "invite_code", None)
        )
        or None,
    }


def _active_notice_read_clan_ids(
    db: Session,
    *,
    current_user: User,
    selected_clan_id: Optional[int] = None,
) -> list[int]:
    rows = (
        db.query(ClanMembership.clan_id)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.clan_id.asc())
        .limit(100)
        .all()
    )
    ids: list[int] = []
    seen: set[int] = set()
    selected_id = int(selected_clan_id or 0)
    if selected_id and str(getattr(current_user, "role", "") or "").lower() == "admin":
        ids.append(selected_id)
        seen.add(selected_id)
    for row in rows:
        clan_id = int(row[0] or 0)
        if not clan_id or clan_id in seen:
            continue
        ids.append(clan_id)
        seen.add(clan_id)
    return ids


def _notice_sort_time(payload: dict[str, Any]) -> datetime:
    parsed = _parse_datetime(
        payload.get("scheduled_at") or payload.get("created_at") or payload.get("expires_at")
    )
    return parsed or datetime(1970, 1, 1, tzinfo=timezone.utc)


def _community_notice_public_path(public_code: str) -> str:
    return f"/community-notices/{public_code}"


def _community_notice_public_api_path(public_code: str) -> str:
    return f"/community-notices/public/{public_code}"


def _clean_notice_attachment_url(value: Any) -> str:
    raw = _safe_str(value)
    if not raw:
        return ""
    if len(raw) > MAX_NOTICE_ATTACHMENT_URL_LENGTH:
        raise ValueError("Notice attachment links must be 1000 characters or fewer.")
    if NOTICE_INTERNAL_MEDIA_ATTACHMENT_RE.match(raw):
        return raw
    parsed = urlparse(raw)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
        raise ValueError(
            "Notice attachments must use an http or https link or a GSN uploaded media path."
        )
    return raw


def _notice_attachment_payload(meta: dict[str, Any]) -> dict[str, Any]:
    attachment_url = _safe_str(meta.get("attachment_url"))
    attachment_label = _safe_str(meta.get("attachment_label"), "Open attachment")
    attachment_kind = _safe_str(meta.get("attachment_kind"), "link")
    return {
        "attachment_url": attachment_url or None,
        "attachment_label": attachment_label if attachment_url else None,
        "attachment_kind": attachment_kind if attachment_url else None,
    }


def _community_notice_public_meta(enabled: bool) -> dict[str, Any]:
    if not enabled:
        return {
            "public_qr_enabled": False,
            "public_code": None,
            "public_code_hash": None,
            "public_path": None,
            "public_api_path": None,
            "public_boundary": None,
        }
    public_code = secrets.token_urlsafe(12).rstrip("=")
    return {
        "public_qr_enabled": True,
        "public_code": public_code,
        "public_code_hash": hashlib.sha256(public_code.encode("utf-8")).hexdigest(),
        "public_path": _community_notice_public_path(public_code),
        "public_api_path": _community_notice_public_api_path(public_code),
        "public_boundary": NOTICE_PUBLIC_BOUNDARY,
    }


def _central_domain_notice_feature_mode(
    db: Session,
    *,
    community_domain_id: int,
) -> str:
    policy = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(community_domain_id))
        .filter(CommunityDomainPolicy.policy_key == CENTRAL_DOMAIN_FEATURE_POLICY_KEY)
        .filter(CommunityDomainPolicy.status == "active")
        .first()
    )
    if policy is None:
        return "admin_only"
    config = _safe_meta(getattr(policy, "config_json", None))
    features = config.get("features")
    if not isinstance(features, dict):
        return "admin_only"
    return _safe_str(features.get(CENTRAL_DOMAIN_FEATURE_ANNOUNCEMENT_BOARD), "admin_only")


def _central_domain_notice_payload(
    event: TrustEvent,
    domain: CommunityDomain,
    *,
    db: Optional[Session] = None,
    viewer_user_id: Optional[int] = None,
) -> dict[str, Any]:
    meta = _safe_meta(getattr(event, "meta_json", None))
    body = _safe_str(meta.get("body") or meta.get("title"))
    full_body = _safe_str(meta.get("full_body") or meta.get("full_notice_body"))
    expiry_policy = _normalize_notice_expiry_policy(meta.get("expiry_policy"))
    expires_at = _notice_effective_expires_at(
        meta,
        created_at=getattr(event, "created_at", None),
    )
    expired = _notice_is_expired(meta, created_at=getattr(event, "created_at", None))
    clan_id = int(getattr(event, "clan_id", 0) or getattr(domain, "clan_id", 0) or 0)
    public_code = _safe_str(meta.get("public_code"))
    public_qr_enabled = bool(meta.get("public_qr_enabled")) and bool(public_code)
    ack_summary = (
        _notice_ack_summary(
            db,
            clan_id=clan_id,
            notice_event_id=int(event.id),
            viewer_user_id=int(viewer_user_id or 0),
        )
        if db is not None and clan_id and viewer_user_id
        else {"acknowledged": 0, "own_acknowledged": False}
    )
    availability_enabled = _notice_availability_enabled(meta)
    availability_summary = (
        _notice_availability_summary(
            db,
            clan_id=clan_id,
            notice_event_id=int(event.id),
            viewer_user_id=int(viewer_user_id or 0),
        )
        if availability_enabled and db is not None and clan_id and viewer_user_id
        else {"yes": 0, "maybe": 0, "no": 0, "total": 0, "planning_ready": False, "own_response": None}
    )
    return {
        "notice_id": f"TE-{int(event.id)}",
        "event_id": int(event.id),
        "source": CENTRAL_DOMAIN_NOTICE_SOURCE,
        "notice_scope": "community_domain",
        "notice_kind": "official_domain_notice",
        "clan_id": clan_id,
        "source_community_id": int(domain.clan_id) if domain.clan_id is not None else None,
        "source_community_name": _safe_str(getattr(domain, "display_name", None), "Community Domain"),
        "source_community_code": _safe_str(getattr(domain, "domain_name", None)) or None,
        "source_domain_id": int(domain.id),
        "source_domain_name": _safe_str(getattr(domain, "display_name", None), "Community Domain"),
        "source_domain_code": _safe_str(getattr(domain, "domain_name", None)) or None,
        "body": body,
        "title": body,
        "word_count": _word_count(body),
        "full_body": full_body or None,
        "full_word_count": _word_count(full_body) if full_body else 0,
        **_notice_attachment_payload(meta),
        "created_at": _iso(getattr(event, "created_at", None)),
        "expires_at": _iso(expires_at),
        "expiry_policy": expiry_policy,
        "active_board_status": "archived" if expired else "active",
        "is_archived": expired,
        "posted_by_user_id": int(getattr(event, "actor_user_id", 0) or 0),
        "posted_by_role": _safe_str(meta.get("posted_by_role")),
        "posting_policy": "domain_governed",
        "sender_whatsapp_number": None,
        "sender_whatsapp_label": None,
        "sender_contact_ready": False,
        "acknowledgement_enabled": True,
        "acknowledgement_label": "I acknowledge",
        "acknowledgement_summary": ack_summary,
        "availability_enabled": availability_enabled,
        "availability_summary": availability_summary,
        "public_qr_enabled": public_qr_enabled,
        "public_code": public_code if public_qr_enabled else None,
        "public_path": f"/community-notices/{public_code}" if public_qr_enabled else None,
        "board_hint": (
            "Official Community Domain notice. It appears on the shared Bulletin "
            "for the linked community while the domain board feature is enabled."
        ),
    }


def _central_notice_visible_domain_map(
    db: Session,
    *,
    clan_id: int,
) -> dict[int, CommunityDomain]:
    rows = (
        db.query(CommunityDomain)
        .filter(CommunityDomain.clan_id == int(clan_id))
        .filter(~CommunityDomain.status.in_(CENTRAL_DOMAIN_OPERATION_BLOCKED_STATUSES))
        .order_by(CommunityDomain.id.desc())
        .limit(50)
        .all()
    )
    domain_map: dict[int, CommunityDomain] = {}
    for domain in rows:
        if _central_domain_notice_feature_mode(
            db,
            community_domain_id=int(domain.id),
        ) == CENTRAL_DOMAIN_FEATURE_MODE_OFF:
            continue
        domain_map[int(domain.id)] = domain
    return domain_map

def _notice_ack_summary(
    db: Session,
    *,
    clan_id: int,
    notice_event_id: int,
    viewer_user_id: int,
) -> dict[str, Any]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_ACK_EVENT,
            or_(
                TrustEvent.meta_json.like(f'%"notice_event_id": {int(notice_event_id)}%'),
                TrustEvent.meta_json.like(f'%"notice_event_id":{int(notice_event_id)}%'),
            ),
        )
        .order_by(TrustEvent.id.asc())
        .all()
    )
    acknowledged_user_ids: set[int] = set()
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if int(meta.get("notice_event_id") or 0) != int(notice_event_id):
            continue
        acknowledged_user_ids.add(int(getattr(row, "subject_user_id", 0) or 0))
    return {
        "acknowledged": len(acknowledged_user_ids),
        "own_acknowledged": int(viewer_user_id) in acknowledged_user_ids,
    }


def _notice_availability_enabled(meta: dict[str, Any]) -> bool:
    policy = _normalize_notice_expiry_policy(meta.get("expiry_policy"))
    return bool(meta.get("availability_enabled")) or policy == NOTICE_EXPIRY_EVENT


def _notice_availability_summary(
    db: Session,
    *,
    clan_id: int,
    notice_event_id: int,
    viewer_user_id: int,
) -> dict[str, Any]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_AVAILABILITY_EVENT,
            or_(
                TrustEvent.meta_json.like(f'%"notice_event_id": {int(notice_event_id)}%'),
                TrustEvent.meta_json.like(f'%"notice_event_id":{int(notice_event_id)}%'),
            ),
        )
        .order_by(TrustEvent.id.asc())
        .all()
    )
    latest_response_by_user_id: dict[int, str] = {}
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if int(meta.get("notice_event_id") or 0) != int(notice_event_id):
            continue
        response = _safe_str(meta.get("response")).lower()
        if response not in {"yes", "maybe", "no"}:
            continue
        user_id = int(getattr(row, "subject_user_id", 0) or 0)
        if user_id:
            latest_response_by_user_id[user_id] = response

    yes_count = sum(1 for value in latest_response_by_user_id.values() if value == "yes")
    maybe_count = sum(1 for value in latest_response_by_user_id.values() if value == "maybe")
    no_count = sum(1 for value in latest_response_by_user_id.values() if value == "no")
    return {
        "yes": yes_count,
        "maybe": maybe_count,
        "no": no_count,
        "total": yes_count + maybe_count + no_count,
        "planning_ready": bool(yes_count + maybe_count > 0),
        "own_response": latest_response_by_user_id.get(int(viewer_user_id)),
    }


def _notice_poll_options(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    options: list[str] = []
    seen: set[str] = set()
    for item in value:
        option = _safe_str(item)
        key = option.casefold()
        if not option or key in seen:
            continue
        options.append(option[:MAX_NOTICE_POLL_OPTION_LENGTH])
        seen.add(key)
        if len(options) >= MAX_NOTICE_POLL_OPTIONS:
            break
    return options


def _notice_poll_summary(
    db: Session,
    *,
    clan_id: int,
    notice_event_id: int,
    poll_options: list[str],
    viewer_user_id: int,
    public_responder_key_hash: Optional[str] = None,
) -> dict[str, Any]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_POLL_RESPONSE_EVENT,
            or_(
                TrustEvent.meta_json.like(f'%"notice_event_id": {int(notice_event_id)}%'),
                TrustEvent.meta_json.like(f'%"notice_event_id":{int(notice_event_id)}%'),
            ),
        )
        .order_by(TrustEvent.id.asc())
        .all()
    )
    canonical_by_key = {option.casefold(): option for option in poll_options}
    latest_response_by_user_id: dict[int, list[str]] = {}
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if int(meta.get("notice_event_id") or 0) != int(notice_event_id):
            continue
        raw_options = meta.get("options")
        if not isinstance(raw_options, list):
            raw_options = [meta.get("option")]
        selected_options: list[str] = []
        selected_keys: set[str] = set()
        for raw_option in raw_options:
            option = canonical_by_key.get(_safe_str(raw_option).casefold())
            key = _safe_str(option).casefold()
            if not option or key in selected_keys:
                continue
            selected_options.append(option)
            selected_keys.add(key)
        user_id = int(getattr(row, "subject_user_id", 0) or 0)
        if selected_options and user_id:
            latest_response_by_user_id[user_id] = selected_options

    member_counts = {
        option: sum(1 for values in latest_response_by_user_id.values() if option in values)
        for option in poll_options
    }
    public_counts = {option: 0 for option in poll_options}
    public_response_total = 0
    public_own_responses: list[str] = []
    public_rows = (
        db.query(CommunityNoticePublicPollResponse)
        .filter(
            CommunityNoticePublicPollResponse.notice_event_id == int(notice_event_id),
            CommunityNoticePublicPollResponse.clan_id == int(clan_id),
        )
        .order_by(CommunityNoticePublicPollResponse.id.asc())
        .all()
    )
    for public_row in public_rows:
        try:
            raw_public_options = json.loads(
                _safe_str(getattr(public_row, "options_json", None), "[]")
            )
        except (TypeError, ValueError, json.JSONDecodeError):
            raw_public_options = []
        if not isinstance(raw_public_options, list):
            raw_public_options = []
        selected_public_options: list[str] = []
        selected_public_keys: set[str] = set()
        for raw_option in raw_public_options:
            option = canonical_by_key.get(_safe_str(raw_option).casefold())
            key = _safe_str(option).casefold()
            if not option or key in selected_public_keys:
                continue
            selected_public_options.append(option)
            selected_public_keys.add(key)
        if not selected_public_options:
            continue
        public_response_total += 1
        for option in selected_public_options:
            public_counts[option] += 1
        if (
            public_responder_key_hash
            and _safe_str(getattr(public_row, "responder_key_hash", None))
            == public_responder_key_hash
        ):
            public_own_responses = selected_public_options

    counts = {
        option: int(member_counts[option]) + int(public_counts[option])
        for option in poll_options
    }
    own_responses = latest_response_by_user_id.get(int(viewer_user_id), [])
    if not own_responses and public_own_responses:
        own_responses = public_own_responses
    member_response_total = len(latest_response_by_user_id)
    return {
        "counts": counts,
        "member_counts": member_counts,
        "public_counts": public_counts,
        "total": member_response_total + public_response_total,
        "member_response_count": member_response_total,
        "public_response_count": public_response_total,
        "own_response": own_responses[0] if own_responses else None,
        "own_responses": own_responses,
        "respondent_boundary": (
            "Member totals are account-based. Public-link totals are browser-response counts, not verified unique people."
            if public_response_total > 0
            else "Respondent totals currently contain member account responses only."
        ),
    }


def _notice_ack_member_payload(
    *,
    user: User,
    membership: ClanMembership,
    acknowledged_at: Optional[datetime] = None,
) -> dict[str, Any]:
    user_id = int(getattr(user, "id", 0) or getattr(membership, "user_id", 0) or 0)
    display_name = _safe_str(getattr(user, "display_name", None))
    gmfn_id = _safe_str(getattr(user, "gmfn_id", None))
    email = _safe_str(getattr(user, "email", None))
    return {
        "user_id": user_id,
        "display_name": display_name or gmfn_id or (email.split("@", 1)[0] if email else f"Member {user_id}"),
        "gmfn_id": gmfn_id or None,
        "role": _safe_str(getattr(membership, "role", None), "member"),
        "acknowledged_at": _iso(acknowledged_at),
    }


def _get_notice_for_acknowledgement(
    db: Session,
    *,
    clan_id: int,
    notice_event_id: int,
) -> TrustEvent:
    notice_event = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.id == int(notice_event_id),
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type.in_([COMMUNITY_NOTICE_EVENT, CENTRAL_DOMAIN_NOTICE_EVENT]),
        )
        .first()
    )
    if not notice_event:
        raise HTTPException(status_code=404, detail="Community notice not found")

    meta = _safe_meta(getattr(notice_event, "meta_json", None))
    if _safe_str(getattr(notice_event, "event_type", None)) == CENTRAL_DOMAIN_NOTICE_EVENT:
        try:
            notice_domain_id = int(meta.get("community_domain_id") or 0)
        except (TypeError, ValueError):
            notice_domain_id = 0
        visible_domain_map = _central_notice_visible_domain_map(db, clan_id=int(clan_id))
        if not notice_domain_id or notice_domain_id not in visible_domain_map:
            raise HTTPException(status_code=404, detail="Community notice not found")
    return notice_event

def _event_to_notice(
    event: TrustEvent,
    *,
    db: Optional[Session] = None,
    viewer_user_id: Optional[int] = None,
) -> dict[str, Any]:
    meta = _safe_meta(getattr(event, "meta_json", None))
    body = _safe_str(meta.get("body") or meta.get("title"))
    full_body = _safe_str(meta.get("full_body") or meta.get("full_notice_body"))
    sender_contact = _safe_str(meta.get("sender_whatsapp_number"))
    expiry_policy = _normalize_notice_expiry_policy(meta.get("expiry_policy"))
    expires_at = _notice_effective_expires_at(
        meta,
        created_at=getattr(event, "created_at", None),
    )
    expired = _notice_is_expired(meta, created_at=getattr(event, "created_at", None))
    clan_id = int(getattr(event, "clan_id", 0) or 0)
    source_payload = _clan_source_payload(db, clan_id) if db is not None else {}
    ack_summary = (
        _notice_ack_summary(
            db,
            clan_id=clan_id,
            notice_event_id=int(event.id),
            viewer_user_id=int(viewer_user_id or 0),
        )
        if db is not None and clan_id and viewer_user_id
        else {"acknowledged": 0, "own_acknowledged": False}
    )
    availability_enabled = _notice_availability_enabled(meta)
    availability_summary = (
        _notice_availability_summary(
            db,
            clan_id=clan_id,
            notice_event_id=int(event.id),
            viewer_user_id=int(viewer_user_id or 0),
        )
        if availability_enabled and db is not None and clan_id and viewer_user_id
        else {"yes": 0, "maybe": 0, "no": 0, "total": 0, "planning_ready": False, "own_response": None}
    )
    poll_options = _notice_poll_options(meta.get("poll_options"))
    poll_question = _safe_str(meta.get("poll_question"))
    poll_selection_mode = _normalize_notice_poll_selection_mode(meta.get("poll_selection_mode"))
    poll_audience = _normalize_notice_poll_audience(meta.get("poll_audience"))
    poll_enabled = bool(poll_question and len(poll_options) >= 2)
    poll_summary = (
        _notice_poll_summary(
            db,
            clan_id=clan_id,
            notice_event_id=int(event.id),
            poll_options=poll_options,
            viewer_user_id=int(viewer_user_id or 0),
        )
        if poll_enabled and db is not None and clan_id and viewer_user_id
        else {
            "counts": {option: 0 for option in poll_options},
            "member_counts": {option: 0 for option in poll_options},
            "public_counts": {option: 0 for option in poll_options},
            "total": 0,
            "member_response_count": 0,
            "public_response_count": 0,
            "own_response": None,
            "own_responses": [],
            "respondent_boundary": "Respondent totals currently contain member account responses only.",
        }
    )
    return {
        "notice_id": f"TE-{int(event.id)}",
        "event_id": int(event.id),
        "source": _safe_str(meta.get("source"), COMMUNITY_NOTICE_SOURCE),
        "notice_mode": _normalize_notice_mode(meta.get("notice_mode")),
        "notice_kind": _safe_str(meta.get("notice_kind"), "official_notice"),
        "market_need_pulse": bool(meta.get("market_need_pulse")),
        "clan_id": clan_id,
        **source_payload,
        "body": body,
        "title": body,
        "word_count": _word_count(body),
        "full_body": full_body or None,
        "full_word_count": _word_count(full_body) if full_body else 0,
        **_notice_attachment_payload(meta),
        "created_at": _iso(getattr(event, "created_at", None)),
        "expires_at": _iso(expires_at),
        "expiry_policy": expiry_policy,
        "active_board_status": "archived" if expired else "active",
        "is_archived": expired,
        "posted_by_user_id": int(getattr(event, "actor_user_id", 0) or 0),
        "posted_by_role": _safe_str(meta.get("posted_by_role")),
        "posting_policy": _normalize_notice_posting_policy(meta.get("posting_policy")),
        "sender_whatsapp_number": sender_contact or None,
        "sender_whatsapp_label": _safe_str(meta.get("sender_whatsapp_label")) if sender_contact else None,
        "sender_contact_ready": bool(sender_contact),
        "acknowledgement_enabled": True,
        "acknowledgement_label": "I acknowledge",
        "acknowledgement_summary": ack_summary,
        "availability_enabled": availability_enabled,
        "availability_summary": availability_summary,
        "poll_enabled": poll_enabled,
        "poll_question": poll_question or None,
        "poll_options": poll_options,
        "poll_selection_mode": poll_selection_mode,
        "poll_audience": poll_audience,
        "poll_summary": poll_summary,
        "review_status": _safe_str(meta.get("review_status"), "published"),
        "approved_submission_event_id": meta.get("approved_submission_event_id"),
        "public_qr_enabled": bool(meta.get("public_qr_enabled")) and bool(_safe_str(meta.get("public_code"))),
        "public_code": _safe_str(meta.get("public_code")) if bool(meta.get("public_qr_enabled")) else None,
        "public_path": _safe_str(meta.get("public_path")) or (_community_notice_public_path(_safe_str(meta.get("public_code"))) if bool(meta.get("public_qr_enabled")) and _safe_str(meta.get("public_code")) else None),
        "public_api_path": _safe_str(meta.get("public_api_path")) or (_community_notice_public_api_path(_safe_str(meta.get("public_code"))) if bool(meta.get("public_qr_enabled")) and _safe_str(meta.get("public_code")) else None),
        "boundary": _safe_str(meta.get("public_boundary")) or (NOTICE_PUBLIC_BOUNDARY if bool(meta.get("public_qr_enabled")) and _safe_str(meta.get("public_code")) else None),
    }


def _notice_review_decisions_by_submission(
    db: Session,
    *,
    clan_id: int,
) -> dict[int, dict[str, Any]]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_REVIEW_EVENT,
        )
        .order_by(TrustEvent.id.asc())
        .all()
    )
    decisions: dict[int, dict[str, Any]] = {}
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        submission_id = int(meta.get("submission_event_id") or 0)
        if submission_id:
            decisions[submission_id] = {
                "event_id": int(row.id),
                "decision": _safe_str(meta.get("decision")),
                "reviewed_at": _iso(getattr(row, "created_at", None)),
                "reviewer_user_id": int(getattr(row, "actor_user_id", 0) or 0),
                "resulting_notice_event_id": meta.get("resulting_notice_event_id"),
                "reviewer_note": _safe_str(meta.get("reviewer_note")) or None,
            }
    return decisions


def _submission_to_review_item(event: TrustEvent) -> dict[str, Any]:
    meta = _safe_meta(getattr(event, "meta_json", None))
    body = _safe_str(meta.get("body") or meta.get("title"))
    full_body = _safe_str(meta.get("full_body") or meta.get("full_notice_body"))
    return {
        "submission_event_id": int(event.id),
        "clan_id": int(getattr(event, "clan_id", 0) or 0),
        "body": body,
        "title": body,
        "word_count": _word_count(body),
        "full_body": full_body or None,
        "full_word_count": _word_count(full_body) if full_body else 0,
        **_notice_attachment_payload(meta),
        "poll_question": _safe_str(meta.get("poll_question")) or None,
        "poll_options": _notice_poll_options(meta.get("poll_options")),
        "poll_selection_mode": _normalize_notice_poll_selection_mode(meta.get("poll_selection_mode")),
        "poll_audience": _normalize_notice_poll_audience(meta.get("poll_audience")),
        "public_qr_requested": bool(meta.get("public_qr_requested") or meta.get("public_qr_enabled")),
        "created_at": _iso(getattr(event, "created_at", None)),
        "submitted_by_user_id": int(getattr(event, "actor_user_id", 0) or 0),
        "submitted_by_role": _safe_str(meta.get("submitted_by_role"), "member"),
        "expiry_policy": _normalize_notice_expiry_policy(meta.get("expiry_policy")),
        "expires_at": _safe_str(meta.get("expires_at")) or None,
        "review_status": "pending",
        "community_records_policy": meta.get("community_records_policy") if isinstance(meta.get("community_records_policy"), dict) else None,
        "sender_contact_ready": bool(meta.get("sender_contact_ready")),
        "sender_whatsapp_number": _safe_str(meta.get("sender_whatsapp_number")) or None,
        "sender_whatsapp_label": _safe_str(meta.get("sender_whatsapp_label")) or None,
    }


def _pending_notice_submission_rows(
    db: Session,
    *,
    clan_id: int,
    limit: int = 20,
) -> list[TrustEvent]:
    decisions = _notice_review_decisions_by_submission(db, clan_id=int(clan_id))
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_SUBMISSION_EVENT,
        )
        .order_by(TrustEvent.id.desc())
        .limit(max(100, int(limit) * 5))
        .all()
    )
    pending: list[TrustEvent] = []
    for row in rows:
        if int(row.id) in decisions:
            continue
        pending.append(row)
        if len(pending) >= int(limit):
            break
    return pending


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


def _notice_review_recipient_ids(
    db: Session,
    *,
    clan_id: int,
    submitter_user_id: int,
) -> list[int]:
    rows = (
        db.query(ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.role == "admin",
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.user_id.asc())
        .all()
    )
    recipient_ids: list[int] = []
    seen: set[int] = set()
    for row in rows:
        user_id = int(row[0])
        if user_id == int(submitter_user_id) or user_id in seen:
            continue
        seen.add(user_id)
        recipient_ids.append(user_id)
    return recipient_ids


def _create_notice_review_notifications(
    db: Session,
    *,
    clan_id: int,
    submission_event_id: int,
    body: str,
    submitter_user_id: int,
) -> int:
    recipient_ids = _notice_review_recipient_ids(
        db,
        clan_id=int(clan_id),
        submitter_user_id=int(submitter_user_id),
    )
    if not recipient_ids:
        return 0

    action_url = (
        f"/app/community?clan_id={int(clan_id)}"
        f"&notice_review_submission_id={int(submission_event_id)}"
        "#community-home-notice-settings-panel"
    )
    notification_rows = []
    for user_id in recipient_ids:
        notification_rows.append(
            create_notification(
                db,
                user_id=int(user_id),
                kind=COMMUNITY_NOTICE_SUBMISSION_EVENT,
                title="Community record waiting for review",
                message=body,
                action_url=action_url,
                action_label="Review record",
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


def _retire_notice_review_notifications(
    db: Session,
    *,
    clan_id: int,
    submission_event_id: int,
) -> int:
    action_url = (
        f"/app/community?clan_id={int(clan_id)}"
        f"&notice_review_submission_id={int(submission_event_id)}"
        "#community-home-notice-settings-panel"
    )
    rows = (
        db.query(Notification)
        .filter(
            Notification.kind == COMMUNITY_NOTICE_SUBMISSION_EVENT,
            Notification.action_url == action_url,
            Notification.is_read == False,  # noqa: E712
        )
        .all()
    )
    if not rows:
        return 0

    now = datetime.now(timezone.utc)
    for row in rows:
        row.is_read = True
        row.read_at = now
        db.add(row)
    db.commit()
    return len(rows)


def _create_notice_review_result_notification(
    db: Session,
    *,
    clan_id: int,
    submission_event_id: int,
    submitter_user_id: int,
    decision: str,
    body: str,
) -> int:
    user_id = int(submitter_user_id or 0)
    if user_id <= 0:
        return 0

    approved = decision == "approve"
    notification = create_notification(
        db,
        user_id=user_id,
        kind=COMMUNITY_NOTICE_REVIEW_EVENT,
        title=(
            "Community record approved"
            if approved
            else "Community record was not posted"
        ),
        message=(
            "Your community record was approved and posted on the Official Board."
            if approved
            else "Your community record was reviewed and was not posted on the Official Board."
        ),
        action_url=(
            f"/app/community?clan_id={int(clan_id)}"
            f"&notice_review_submission_id={int(submission_event_id)}"
            "#community-home-notice-settings-panel"
        ),
        action_label="Open Community",
        commit=False,
        refresh=False,
    )
    db.commit()
    try:
        dispatch_web_push_for_notifications(db, [notification])
    except Exception:
        pass
    return 1


def _meeting_to_notice(row: dict[str, Any], *, db: Optional[Session] = None, clan_id: int = 0) -> dict[str, Any]:
    body = _safe_str(row.get("title") or row.get("purpose"), "Community meeting")
    interest_summary = row.get("interest_summary") if isinstance(row.get("interest_summary"), dict) else {}
    yes_count = int(interest_summary.get("yes") or 0)
    maybe_count = int(interest_summary.get("maybe") or 0)
    no_count = int(interest_summary.get("no") or 0)
    interest_total = int(interest_summary.get("total") or (yes_count + maybe_count + no_count))
    planning_status = (
        "Members are already responding"
        if interest_total > 0
        else "Waiting for member responses"
    )
    return {
        "notice_id": f"MTG-{_safe_str(row.get('meeting_id') or row.get('event_id'))}",
        "event_id": row.get("summary_event_id") or row.get("reminder_event_id") or row.get("event_id"),
        "source": "community_meeting",
        "notice_kind": "meeting_planning",
        "clan_id": int(clan_id) if clan_id else None,
        **(_clan_source_payload(db, int(clan_id)) if db is not None and clan_id else {}),
        "body": body,
        "title": body,
        "purpose": _safe_str(row.get("purpose")),
        "word_count": _word_count(body),
        "created_at": row.get("created_at") or row.get("scheduled_at"),
        "posted_by_user_id": None,
        "meeting_id": row.get("meeting_id"),
        "scheduled_at": row.get("scheduled_at"),
        "expires_at": row.get("scheduled_at"),
        "status": row.get("status"),
        "interest_summary": {
            "yes": yes_count,
            "maybe": maybe_count,
            "no": no_count,
            "total": interest_total,
            "planning_ready": bool(interest_summary.get("planning_ready") or yes_count + maybe_count > 0),
            "own_response": interest_summary.get("own_response"),
        },
        "planning_status": planning_status,
        "board_hint": "Meeting interest is a planning signal, not final attendance.",
    }



def _meeting_notice_is_expired(row: dict[str, Any], *, now: Optional[datetime] = None) -> bool:
    scheduled_at = _parse_datetime(row.get("scheduled_at"))
    if scheduled_at is None:
        return False
    current = now or datetime.now(timezone.utc)
    return scheduled_at <= current


def _request_to_demand_signal(db: Session, row: MarketplaceRequest) -> dict[str, Any]:
    requester = row.user or db.get(User, int(row.user_id))
    requester_trust_score, requester_trust_band = _public_trust_posture(requester)
    return {
        "request_id": int(row.id),
        "source": "demand_box",
        "title": _safe_str(getattr(row, "title", None), "Community demand request"),
        "category": _safe_str(getattr(row, "category", None)) or None,
        "urgency": _safe_str(getattr(row, "urgency", None), "medium"),
        "area": _safe_str(getattr(row, "area", None)) or None,
        "status": _safe_str(getattr(row, "status", None), "open"),
        "created_at": _iso(getattr(row, "created_at", None)),
        "expires_at": _iso(getattr(row, "expires_at", None)),
        "requester_gmfn_id": _safe_str(getattr(requester, "gmfn_id", None)) or None,
        "requester_trust_score": requester_trust_score,
        "requester_trust_band": requester_trust_band,
    }


def _notice_board_demand_signals(
    db: Session,
    *,
    clan_id: int,
    limit: int = NOTICE_BOARD_DEMAND_SIGNAL_LIMIT,
) -> tuple[list[dict[str, Any]], int]:
    now = datetime.now(timezone.utc)
    active_query = db.query(MarketplaceRequest).filter(
        MarketplaceRequest.clan_id == int(clan_id),
        MarketplaceRequest.status == "open",
        (
            (MarketplaceRequest.expires_at.is_(None))
            | (MarketplaceRequest.expires_at > now)
        ),
    )
    active_count = active_query.count()
    rows = (
        active_query.order_by(MarketplaceRequest.created_at.desc())
        .limit(max(1, int(limit)))
        .all()
    )
    return [_request_to_demand_signal(db, row) for row in rows], int(active_count)


class CommunityNoticeIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    body: str = Field(..., min_length=2, max_length=500)
    expiry_policy: Literal["standard", "urgent", "event", "pinned"] = NOTICE_EXPIRY_STANDARD
    expires_at: Optional[datetime] = None
    availability_enabled: bool = False
    public_qr_enabled: bool = False
    full_body: Optional[str] = Field(default=None, max_length=MAX_NOTICE_FULL_BODY_LENGTH)
    attachment_url: Optional[str] = Field(default=None, max_length=MAX_NOTICE_ATTACHMENT_URL_LENGTH)
    attachment_label: Optional[str] = Field(default=None, max_length=MAX_NOTICE_ATTACHMENT_LABEL_LENGTH)
    attachment_kind: Optional[Literal["link", "video", "poster", "document"]] = "link"
    poll_question: Optional[str] = Field(default=None, max_length=MAX_NOTICE_POLL_QUESTION_LENGTH)
    poll_options: Optional[list[str]] = None
    poll_selection_mode: Literal["single", "multiple"] = NOTICE_POLL_SELECTION_SINGLE
    poll_audience: Literal["members", "public_link"] = NOTICE_POLL_AUDIENCE_MEMBERS
    notice_mode: Literal["notice", "market_need_pulse"] = NOTICE_MODE_NOTICE

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("body", "full_body", "attachment_url", "attachment_label", "poll_question", mode="before")
    @classmethod
    def _reject_non_text_notice_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("expiry_policy", "notice_mode", "poll_selection_mode", "poll_audience", mode="before")
    @classmethod
    def _reject_non_text_notice_selectors(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("body")
    @classmethod
    def _enforce_notice_word_limit(cls, value: str) -> str:
        body = _safe_str(value)
        if _word_count(body) > MAX_NOTICE_WORDS:
            raise ValueError("Official community notices must be 50 words or fewer.")
        return body

    @field_validator("full_body")
    @classmethod
    def _enforce_notice_full_word_limit(cls, value: Optional[str]) -> Optional[str]:
        full_body = _safe_str(value)
        if not full_body:
            return None
        if _word_count(full_body) > MAX_NOTICE_FULL_WORDS:
            raise ValueError("Attached full notice details must be 600 words or fewer.")
        return full_body

    @field_validator("attachment_url")
    @classmethod
    def _enforce_notice_attachment_url(cls, value: Optional[str]) -> Optional[str]:
        attachment_url = _clean_notice_attachment_url(value)
        return attachment_url or None

    @field_validator("attachment_label")
    @classmethod
    def _enforce_notice_attachment_label(cls, value: Optional[str]) -> Optional[str]:
        attachment_label = _safe_str(value)
        return attachment_label or None

    @field_validator("poll_options", mode="before")
    @classmethod
    def _validate_poll_options_input(cls, value: Any) -> Any:
        if value is None:
            return None
        if not isinstance(value, list):
            raise ValueError("poll_options must be a list of text choices.")
        if len(value) > MAX_NOTICE_POLL_OPTIONS:
            raise ValueError(f"Announcement polls may have at most {MAX_NOTICE_POLL_OPTIONS} choices.")
        cleaned: list[str] = []
        for item in value:
            if not isinstance(item, str):
                raise ValueError("Each poll choice must be text.")
            option = _safe_str(item)
            if not option:
                continue
            if len(option) > MAX_NOTICE_POLL_OPTION_LENGTH:
                raise ValueError(
                    f"Each poll choice must be {MAX_NOTICE_POLL_OPTION_LENGTH} characters or fewer."
                )
            cleaned.append(option)
        return cleaned or None

    @model_validator(mode="after")
    def _validate_poll_contract(self) -> "CommunityNoticeIn":
        question = _safe_str(self.poll_question)
        options = list(self.poll_options or [])
        if not question and not options:
            self.poll_question = None
            self.poll_options = None
            self.poll_selection_mode = NOTICE_POLL_SELECTION_SINGLE
            self.poll_audience = NOTICE_POLL_AUDIENCE_MEMBERS
            return self
        if not question:
            raise ValueError("Add a question for this announcement poll.")
        if len(options) < 2:
            raise ValueError("Announcement polls need at least two choices.")
        keys = [option.casefold() for option in options]
        if len(set(keys)) != len(keys):
            raise ValueError("Announcement poll choices must be different.")
        if self.notice_mode == NOTICE_MODE_MARKET_NEED_PULSE:
            raise ValueError("Ask Community uses its existing yes, maybe, or no response and cannot add a second poll.")
        self.poll_question = question
        self.poll_options = options
        if self.poll_audience == NOTICE_POLL_AUDIENCE_PUBLIC_LINK:
            self.public_qr_enabled = True
        return self

    @field_validator("expires_at")
    @classmethod
    def _enforce_notice_expiry(cls, value: Optional[datetime], info: Any) -> Optional[datetime]:
        policy = _normalize_notice_expiry_policy(info.data.get("expiry_policy"))
        if policy == NOTICE_EXPIRY_EVENT and value is None:
            raise ValueError("Event notices need an expiry date.")
        if value is not None:
            parsed = _parse_datetime(value)
            if parsed is None:
                raise ValueError("expires_at must be a valid date.")
            if parsed <= datetime.now(timezone.utc):
                raise ValueError("Notice expiry must be in the future.")
            return parsed
        return value


class CommunityNoticeSettingsIn(BaseModel):
    posting_policy: Literal["members", "admins"]


class CommunityNoticeAvailabilityIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    response: Literal["yes", "maybe", "no"]

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("response", mode="before")
    @classmethod
    def _reject_non_text_response(cls, value: Any) -> Any:
        return _reject_non_text_value(value, "response")


class CommunityNoticePollResponseIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    option: Optional[str] = Field(default=None, max_length=MAX_NOTICE_POLL_OPTION_LENGTH)
    options: Optional[list[str]] = None

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("option", mode="before")
    @classmethod
    def _reject_non_text_option(cls, value: Any) -> Any:
        return _reject_non_text_value(value, "option")

    @field_validator("options", mode="before")
    @classmethod
    def _validate_options_input(cls, value: Any) -> Any:
        if value is None:
            return None
        if not isinstance(value, list):
            raise ValueError("options must be a list of poll choices.")
        if not value or len(value) > MAX_NOTICE_POLL_OPTIONS:
            raise ValueError(f"Choose between one and {MAX_NOTICE_POLL_OPTIONS} poll options.")
        cleaned: list[str] = []
        for item in value:
            if not isinstance(item, str):
                raise ValueError("Each selected poll option must be text.")
            option = _safe_str(item)
            if not option:
                continue
            if len(option) > MAX_NOTICE_POLL_OPTION_LENGTH:
                raise ValueError(
                    f"Each selected poll option must be {MAX_NOTICE_POLL_OPTION_LENGTH} characters or fewer."
                )
            cleaned.append(option)
        if not cleaned:
            raise ValueError("Choose at least one poll option.")
        return cleaned

    @model_validator(mode="after")
    def _require_one_response_shape(self) -> "CommunityNoticePollResponseIn":
        option = _safe_str(self.option)
        options = list(self.options or [])
        if not option and not options:
            raise ValueError("Choose at least one poll option.")
        if options:
            keys = [item.casefold() for item in options]
            if len(set(keys)) != len(keys):
                raise ValueError("Selected poll options must be different.")
            self.options = options
            self.option = option or None
            return self
        self.option = option
        self.options = None
        return self


class CommunityNoticePublicPollResponseIn(BaseModel):
    response_token: str = Field(
        ...,
        min_length=NOTICE_PUBLIC_POLL_TOKEN_MIN_LENGTH,
        max_length=NOTICE_PUBLIC_POLL_TOKEN_MAX_LENGTH,
        pattern=r"^[A-Za-z0-9._~-]+$",
    )
    option: Optional[str] = Field(default=None, max_length=MAX_NOTICE_POLL_OPTION_LENGTH)
    options: Optional[list[str]] = None

    @field_validator("response_token", "option", mode="before")
    @classmethod
    def _reject_non_text_public_poll_values(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("options", mode="before")
    @classmethod
    def _validate_public_options_input(cls, value: Any) -> Any:
        if value is None:
            return None
        if not isinstance(value, list):
            raise ValueError("options must be a list of poll choices.")
        if not value or len(value) > MAX_NOTICE_POLL_OPTIONS:
            raise ValueError(f"Choose between one and {MAX_NOTICE_POLL_OPTIONS} poll options.")
        cleaned: list[str] = []
        for item in value:
            if not isinstance(item, str):
                raise ValueError("Each selected poll option must be text.")
            option = _safe_str(item)
            if not option:
                continue
            if len(option) > MAX_NOTICE_POLL_OPTION_LENGTH:
                raise ValueError(
                    f"Each selected poll option must be {MAX_NOTICE_POLL_OPTION_LENGTH} characters or fewer."
                )
            cleaned.append(option)
        if not cleaned:
            raise ValueError("Choose at least one poll option.")
        return cleaned

    @model_validator(mode="after")
    def _require_public_response_shape(self) -> "CommunityNoticePublicPollResponseIn":
        self.response_token = _safe_str(self.response_token)
        option = _safe_str(self.option)
        options = list(self.options or [])
        if not option and not options:
            raise ValueError("Choose at least one poll option.")
        if options:
            keys = [item.casefold() for item in options]
            if len(set(keys)) != len(keys):
                raise ValueError("Selected poll options must be different.")
            self.options = options
            self.option = option or None
            return self
        self.option = option
        self.options = None
        return self


class CommunityNoticeAcknowledgementIn(BaseModel):
    clan_id: int = Field(..., ge=1)

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")


class CommunityNoticeReviewDecisionIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    decision: Literal["approve", "reject"]
    reviewer_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("decision", "reviewer_note", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


@router.get("")
def list_notices(
    clan_id: Optional[int] = Query(default=None, ge=1),
    limit: int = Query(default=10, ge=1, le=10),
    scope: Literal["selected", "my_communities"] = Query(default="selected"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    selected_clan_id = int(clan_id or 0)
    selected_membership: Optional[ClanMembership] = None

    if scope == "selected":
        if not selected_clan_id:
            raise HTTPException(status_code=422, detail="clan_id is required for selected community notices")
        selected_membership = _require_clan_member(
            db,
            clan_id=selected_clan_id,
            current_user=current_user,
        )
        read_clan_ids = [selected_clan_id]
    else:
        if selected_clan_id:
            selected_membership = _require_clan_member(
                db,
                clan_id=selected_clan_id,
                current_user=current_user,
            )
        read_clan_ids = _active_notice_read_clan_ids(
            db,
            current_user=current_user,
            selected_clan_id=selected_clan_id or None,
        )
        if selected_clan_id and selected_clan_id not in read_clan_ids:
            read_clan_ids.insert(0, selected_clan_id)

    control_clan_id = selected_clan_id or (read_clan_ids[0] if read_clan_ids else 0)
    if selected_membership is None and control_clan_id:
        selected_membership = _require_clan_member(
            db,
            clan_id=control_clan_id,
            current_user=current_user,
        )

    posting_policy = (
        _notice_posting_policy_for_clan(db, clan_id=control_clan_id)
        if control_clan_id
        else NOTICE_POSTING_POLICY_MEMBERS
    )
    records_policy = (
        _community_records_policy_for_clan(db, clan_id=control_clan_id)
        if control_clan_id
        else {
            "community_records_enabled": False,
            "member_record_submissions_enabled": False,
            "admin_approval_required_for_records": True,
        }
    )

    notice_rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id.in_(read_clan_ids),
            TrustEvent.event_type == COMMUNITY_NOTICE_EVENT,
        )
        .order_by(TrustEvent.id.desc())
        .limit(max(200, int(limit) * 25))
        .all()
        if read_clan_ids
        else []
    )
    visible_domain_maps = {
        clan_id_value: _central_notice_visible_domain_map(
            db,
            clan_id=int(clan_id_value),
        )
        for clan_id_value in read_clan_ids
    }
    has_visible_domain = any(bool(domain_map) for domain_map in visible_domain_maps.values())
    domain_notice_rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id.in_(read_clan_ids),
            TrustEvent.event_type == CENTRAL_DOMAIN_NOTICE_EVENT,
        )
        .order_by(TrustEvent.id.desc())
        .limit(max(200, int(limit) * 25))
        .all()
        if read_clan_ids and has_visible_domain
        else []
    )

    archived_notice_count = 0
    notices: list[dict[str, Any]] = []
    previous_announcements: list[dict[str, Any]] = []

    def add_previous(item: dict[str, Any]) -> None:
        previous_announcements.append(item)

    for row in notice_rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        item = _event_to_notice(row, db=db, viewer_user_id=int(current_user.id))
        if _notice_is_expired(meta, created_at=getattr(row, "created_at", None)):
            archived_notice_count += 1
            add_previous(item)
            continue
        notices.append(item)

    for row in domain_notice_rows:
        row_clan_id = int(getattr(row, "clan_id", 0) or 0)
        meta = _safe_meta(getattr(row, "meta_json", None))
        try:
            row_domain_id = int(meta.get("community_domain_id") or 0)
        except (TypeError, ValueError):
            row_domain_id = 0
        domain = visible_domain_maps.get(row_clan_id, {}).get(row_domain_id)
        if domain is None:
            continue
        item = _central_domain_notice_payload(row, domain, db=db, viewer_user_id=int(current_user.id))
        if _notice_is_expired(meta, created_at=getattr(row, "created_at", None)):
            archived_notice_count += 1
            add_previous(item)
            continue
        notices.append(item)

    notices.sort(key=_notice_sort_time, reverse=True)
    previous_announcements.sort(key=_notice_sort_time, reverse=True)

    if len(notices) < int(limit):
        for read_clan_id in read_clan_ids:
            if len(notices) >= int(limit):
                break
            meeting_rows = list_community_meetings(
                db,
                clan_id=int(read_clan_id),
                limit=max(6, (int(limit) - len(notices)) * 6),
                viewer_user_id=int(current_user.id),
            )
            for row in meeting_rows:
                item = _meeting_to_notice(row, db=db, clan_id=int(read_clan_id))
                if _meeting_notice_is_expired(row):
                    archived_notice_count += 1
                    add_previous(item)
                    continue
                notices.append(item)
                if len(notices) >= int(limit):
                    break
        notices.sort(key=_notice_sort_time, reverse=True)
        previous_announcements.sort(key=_notice_sort_time, reverse=True)

    demand_signals, demand_signal_count = (
        _notice_board_demand_signals(db, clan_id=control_clan_id)
        if control_clan_id
        else ([], 0)
    )
    pending_review_count = (
        len(_pending_notice_submission_rows(db, clan_id=control_clan_id, limit=50))
        if control_clan_id and selected_membership is not None and _is_notice_officer(selected_membership, current_user)
        else 0
    )

    return {
        "ok": True,
        "engine_ready": True,
        "clan_id": control_clan_id or None,
        "scope": scope,
        "read_clan_ids": read_clan_ids,
        "source_community_count": len(read_clan_ids),
        "max_words": MAX_NOTICE_WORDS,
        "comments_enabled": False,
        "reactions_enabled": False,
        "thread_enabled": False,
        "default_expiry_policy": NOTICE_EXPIRY_STANDARD,
        "default_expires_after_days": NOTICE_STANDARD_VISIBLE_DAYS,
        "urgent_expires_after_hours": NOTICE_URGENT_VISIBLE_HOURS,
        "archived_notice_count": archived_notice_count,
        "previous_announcement_limit": NOTICE_PREVIOUS_ANNOUNCEMENT_LIMIT,
        "previous_announcements": previous_announcements[:NOTICE_PREVIOUS_ANNOUNCEMENT_LIMIT],
        "posting_policy": posting_policy,
        "can_post_notice": bool(
            selected_membership is not None
            and _can_create_notice_record(
                selected_membership,
                current_user,
                posting_policy=posting_policy,
                records_policy=records_policy,
            )
        ),
        "can_submit_notice_for_review": bool(
            selected_membership is not None
            and _can_submit_notice_for_review(
                selected_membership,
                current_user,
                posting_policy=posting_policy,
                records_policy=records_policy,
            )
        ),
        "pending_notice_review_count": pending_review_count,
        "community_records_policy": records_policy,
        "notices": notices[: int(limit)],
        "demand_signals_enabled": True,
        "demand_signal_count": int(demand_signal_count),
        "demand_signals": demand_signals,
        "demand_signal_boundary": (
            "Demand signals are read-only pointers from this community's DemandBox. "
            "Responding stays in DemandBox; the Official Board does not create a "
            "second request, response thread, payment approval, or release authority."
        ),
        "boundary": (
            "Posting remains inside the selected community. The all-communities view only "
            "collects notices from communities where this signed-in member already has active membership."
            if scope == "my_communities"
            else "The notice board is scoped to the selected community."
        ),
    }

@router.post("")
def create_notice(
    payload: CommunityNoticeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership, posting_policy, records_policy = _require_notice_poster(
        db,
        clan_id=int(payload.clan_id),
        current_user=current_user,
    )
    body = _safe_str(payload.body)
    full_body = _safe_str(payload.full_body)
    attachment_url = _clean_notice_attachment_url(payload.attachment_url)
    attachment_label = _safe_str(payload.attachment_label, "Open attachment")
    attachment_kind = _safe_str(payload.attachment_kind, "link")
    poll_question = _safe_str(payload.poll_question)
    poll_options = _notice_poll_options(payload.poll_options)
    poll_selection_mode = _normalize_notice_poll_selection_mode(payload.poll_selection_mode)
    poll_audience = _normalize_notice_poll_audience(payload.poll_audience)
    expiry_policy = _normalize_notice_expiry_policy(payload.expiry_policy)
    notice_mode = _normalize_notice_mode(payload.notice_mode)
    is_market_need_pulse = notice_mode == NOTICE_MODE_MARKET_NEED_PULSE
    availability_enabled = bool(payload.availability_enabled) or is_market_need_pulse
    try:
        expires_at = _notice_expires_at(expiry_policy, payload.expires_at)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    poster_contact = _poster_contact_payload(db, current_user)
    is_officer = _is_notice_officer(membership, current_user)
    approval_required = bool(records_policy.get("admin_approval_required_for_records", True))
    if not is_officer and approval_required:
        submission = log_trust_event(
            db,
            event_type=COMMUNITY_NOTICE_SUBMISSION_EVENT,
            clan_id=int(payload.clan_id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            meta={
                "source": COMMUNITY_NOTICE_SOURCE,
                "reason": "community_notice_submitted_for_review",
                "body": body,
                "word_count": _word_count(body),
                "full_body": full_body or None,
                "full_word_count": _word_count(full_body) if full_body else 0,
                "attachment_url": attachment_url or None,
                "attachment_label": attachment_label if attachment_url else None,
                "attachment_kind": attachment_kind if attachment_url else None,
                "poll_question": poll_question or None,
                "poll_options": poll_options,
                "poll_selection_mode": poll_selection_mode,
                "poll_audience": poll_audience,
                "public_qr_requested": bool(payload.public_qr_enabled),
                "posting_policy": posting_policy,
                "expiry_policy": expiry_policy,
                "expires_at": _iso(expires_at),
                "review_status": "pending",
                "submitted_by_role": _safe_str(getattr(membership, "role", None), "member"),
                "comments_enabled": False,
                "reactions_enabled": False,
                "thread_enabled": False,
                "availability_enabled": availability_enabled,
                "notice_mode": notice_mode,
                "notice_kind": "market_need_pulse" if is_market_need_pulse else "official_notice",
                "market_need_pulse": is_market_need_pulse,
                "community_records_policy": records_policy,
                **poster_contact,
            },
        )
        admin_notifications_created = _create_notice_review_notifications(
            db,
            clan_id=int(payload.clan_id),
            submission_event_id=int(submission.id),
            body=body,
            submitter_user_id=int(current_user.id),
        )
        return {
            "ok": True,
            "engine_ready": True,
            "submitted_for_review": True,
            "submission": _submission_to_review_item(submission),
            "posting_policy": posting_policy,
            "community_records_policy": records_policy,
            "notification_kind": COMMUNITY_NOTICE_SUBMISSION_EVENT,
            "notifications_created": int(admin_notifications_created),
            "admin_notifications_created": int(admin_notifications_created),
            "message": "Community record submitted for admin review.",
            "expiry_policy": expiry_policy,
            "expires_at": _iso(expires_at),
            "boundary": (
                "This member record is not visible on the active board yet. "
                "A community officer must approve it before GSN publishes it as "
                "an official community notice."
            ),
        }

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
            "full_body": full_body or None,
            "full_word_count": _word_count(full_body) if full_body else 0,
            "attachment_url": attachment_url or None,
            "attachment_label": attachment_label if attachment_url else None,
            "attachment_kind": attachment_kind if attachment_url else None,
            "poll_question": poll_question or None,
            "poll_options": poll_options,
            "poll_selection_mode": poll_selection_mode,
            "poll_audience": poll_audience,
            "posting_policy": posting_policy,
            "expiry_policy": expiry_policy,
            "expires_at": _iso(expires_at),
            "active_board_status": "active",
            "review_status": "published",
            "posted_by_role": _safe_str(getattr(membership, "role", None), "member"),
            "comments_enabled": False,
            "reactions_enabled": False,
            "thread_enabled": False,
            "availability_enabled": availability_enabled,
            "notice_mode": notice_mode,
            "notice_kind": "market_need_pulse" if is_market_need_pulse else "official_notice",
            "market_need_pulse": is_market_need_pulse,
            "trust_delta": "0.00",
            "community_records_policy": records_policy,
            **_community_notice_public_meta(bool(payload.public_qr_enabled)),
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
        "notice": _event_to_notice(event, db=db, viewer_user_id=int(current_user.id)),
        "posting_policy": posting_policy,
        "community_records_policy": records_policy,
        "notification_kind": COMMUNITY_NOTICE_EVENT,
        "notifications_created": int(notifications_created),
        "message": (
            "Community need question posted to the Community Notice Board."
            if is_market_need_pulse
            else "Community announcement posted to the Community Notice Board."
        ),
        "expiry_policy": expiry_policy,
        "expires_at": _iso(expires_at),
        "boundary": (
            (
                "This market question collects yes, maybe, or no responses as a community demand signal; it is not a buyer list or sales proof. "
                if is_market_need_pulse
                else "The notice belongs to this selected community or marketplace only. "
            )
            + "Notifications are created only for active members of this selected "
            "community; it does not broadcast to other marketplaces, communities, "
            "domains, or public visitors. Expired notices leave the active board "
            "but remain in Community Memory."
        ),
    }


def _community_notice_by_public_code(
    db: Session,
    *,
    public_code: str,
) -> Optional[TrustEvent]:
    code = _safe_str(public_code)
    if not code:
        return None
    code_hash = hashlib.sha256(code.encode("utf-8")).hexdigest()
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.event_type == COMMUNITY_NOTICE_EVENT)
        .order_by(TrustEvent.id.desc())
        .limit(1000)
        .all()
    )
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if meta.get("public_code_hash") == code_hash or meta.get("public_code") == code:
            return row
    return None


@router.get("/public/{public_code}")
def get_public_community_notice(
    public_code: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    event = _community_notice_by_public_code(db, public_code=public_code)
    if event is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "community_notice_not_found",
                "message": "GSN could not find this Community Notice QR link.",
            },
        )
    meta = _safe_meta(getattr(event, "meta_json", None))
    public_code_value = _safe_str(meta.get("public_code"))
    if not bool(meta.get("public_qr_enabled")) or not public_code_value:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "community_notice_not_public",
                "message": "This Community Notice is not public by QR.",
            },
        )
    if _notice_is_expired(meta, created_at=getattr(event, "created_at", None)):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "community_notice_expired",
                "message": "This Community Notice QR has expired.",
            },
        )
    clan_id = int(getattr(event, "clan_id", 0) or 0)
    clan = db.get(Clan, clan_id) if clan_id else None
    if clan_id and clan is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "community_notice_community_missing",
                "message": "GSN could not find the community for this notice.",
            },
        )
    notice = _event_to_notice(event, db=db, viewer_user_id=None)
    for private_key in (
        "posted_by_user_id",
        "acknowledgement_summary",
        "availability_summary",
        "poll_summary",
    ):
        notice.pop(private_key, None)
    poll_options = _notice_poll_options(meta.get("poll_options"))
    if (
        _normalize_notice_poll_audience(meta.get("poll_audience"))
        == NOTICE_POLL_AUDIENCE_PUBLIC_LINK
        and _safe_str(meta.get("poll_question"))
        and len(poll_options) >= 2
        and clan_id
    ):
        aggregate = _notice_poll_summary(
            db,
            clan_id=clan_id,
            notice_event_id=int(event.id),
            poll_options=poll_options,
            viewer_user_id=0,
        )
        notice["poll_summary"] = {
            "counts": aggregate["counts"],
            "total": aggregate["total"],
            "respondent_boundary": (
                "Totals combine member account responses and anonymous browser responses. "
                "Browser responses are not verified unique people."
            ),
        }
    notice["boundary"] = _safe_str(meta.get("public_boundary"), NOTICE_PUBLIC_BOUNDARY)
    notice["community"] = {
        "id": clan_id or None,
        "name": _safe_str(getattr(clan, "name", None), "Community"),
        "code": _safe_str(
            getattr(clan, "community_code", None)
            or getattr(clan, "invite_code", None)
        ) or None,
    }
    return {
        "ok": True,
        "notice": notice,
        "boundary": NOTICE_PUBLIC_BOUNDARY,
    }


@router.post("/public/{public_code}/poll-response")
def record_public_community_notice_poll_response(
    public_code: str,
    payload: CommunityNoticePublicPollResponseIn,
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    event = _community_notice_by_public_code(db, public_code=public_code)
    if event is None:
        raise HTTPException(status_code=404, detail="Community notice not found")

    meta = _safe_meta(getattr(event, "meta_json", None))
    if not bool(meta.get("public_qr_enabled")) or not _safe_str(meta.get("public_code")):
        raise HTTPException(status_code=404, detail="This Community Notice is not public by QR")
    if _notice_is_expired(meta, created_at=getattr(event, "created_at", None)):
        raise HTTPException(status_code=409, detail="This notice has already left the active board")
    if _normalize_notice_poll_audience(meta.get("poll_audience")) != NOTICE_POLL_AUDIENCE_PUBLIC_LINK:
        raise HTTPException(
            status_code=403,
            detail="Only active community members can answer this announcement poll",
        )

    clan_id = int(getattr(event, "clan_id", 0) or 0)
    if not clan_id:
        raise HTTPException(status_code=404, detail="Community notice not found")
    records_policy = _community_records_policy_for_clan(db, clan_id=clan_id)
    if not bool(records_policy.get("community_records_enabled", True)):
        raise _community_record_policy_error(
            code="community_records_disabled",
            message="This community setup has Community Records turned off.",
            clan_id=clan_id,
            policy=records_policy,
        )

    poll_question = _safe_str(meta.get("poll_question"))
    poll_options = _notice_poll_options(meta.get("poll_options"))
    poll_selection_mode = _normalize_notice_poll_selection_mode(meta.get("poll_selection_mode"))
    if not poll_question or len(poll_options) < 2:
        raise HTTPException(status_code=409, detail="This announcement does not have an open poll")

    canonical_by_key = {option.casefold(): option for option in poll_options}
    requested_options = list(payload.options or [])
    if not requested_options and _safe_str(payload.option):
        requested_options = [_safe_str(payload.option)]
    selected_options: list[str] = []
    selected_keys: set[str] = set()
    for requested_option in requested_options:
        selected_option = canonical_by_key.get(_safe_str(requested_option).casefold())
        key = _safe_str(selected_option).casefold()
        if not selected_option or key in selected_keys:
            continue
        selected_options.append(selected_option)
        selected_keys.add(key)
    if len(selected_options) != len(requested_options) or not selected_options:
        raise HTTPException(status_code=422, detail="Choose only the poll options shown on this announcement")
    if poll_selection_mode == NOTICE_POLL_SELECTION_SINGLE and len(selected_options) != 1:
        raise HTTPException(status_code=422, detail="Choose one option for this announcement poll")

    request_ip = client_ip(
        request.headers,
        fallback=_safe_str(getattr(request.client, "host", None), "unknown"),
    )
    ip_limit = rate_limiter.check(
        key=f"community-notice-public-poll:ip:{int(event.id)}:{request_ip}",
        max_requests=20,
        window_seconds=60,
    )
    if not ip_limit.ok:
        raise HTTPException(
            status_code=429,
            detail="Too many poll responses from this connection. Try again shortly.",
            headers={"Retry-After": str(ip_limit.reset_in_seconds)},
        )

    responder_key_hash = hashlib.sha256(
        f"community-notice-public-poll:{int(event.id)}:{payload.response_token}".encode("utf-8")
    ).hexdigest()
    token_limit = rate_limiter.check(
        key=f"community-notice-public-poll:token:{int(event.id)}:{responder_key_hash}",
        max_requests=8,
        window_seconds=60,
    )
    if not token_limit.ok:
        raise HTTPException(
            status_code=429,
            detail="This poll response was updated too many times. Try again shortly.",
            headers={"Retry-After": str(token_limit.reset_in_seconds)},
        )

    response_row = (
        db.query(CommunityNoticePublicPollResponse)
        .filter(
            CommunityNoticePublicPollResponse.notice_event_id == int(event.id),
            CommunityNoticePublicPollResponse.responder_key_hash == responder_key_hash,
        )
        .first()
    )
    if response_row is None:
        response_row = CommunityNoticePublicPollResponse(
            notice_event_id=int(event.id),
            clan_id=clan_id,
            responder_key_hash=responder_key_hash,
            options_json=json.dumps(selected_options),
        )
        db.add(response_row)
    else:
        response_row.options_json = json.dumps(selected_options)
        response_row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(response_row)

    return {
        "ok": True,
        "notice_event_id": int(event.id),
        "poll_summary": _notice_poll_summary(
            db,
            clan_id=clan_id,
            notice_event_id=int(event.id),
            poll_options=poll_options,
            viewer_user_id=0,
            public_responder_key_hash=responder_key_hash,
        ),
        "message": f"Poll response saved: {', '.join(selected_options)}.",
        "boundary": (
            "This public-link response stores a hashed random browser key and selected choices. "
            "GSN does not collect a respondent name or raw IP address for the roll call. "
            "Browser-response totals are not proof of unique people."
        ),
    }


@router.get("/review-queue")
def list_notice_review_queue(
    clan_id: int = Query(..., ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_notice_officer(db, clan_id=int(clan_id), current_user=current_user)
    records_policy = _community_records_policy_for_clan(db, clan_id=int(clan_id))
    if not bool(records_policy.get("community_records_enabled", True)):
        raise _community_record_policy_error(
            code="community_records_disabled",
            message="This community setup has Community Records turned off.",
            clan_id=int(clan_id),
            policy=records_policy,
        )
    rows = _pending_notice_submission_rows(db, clan_id=int(clan_id), limit=int(limit))
    return {
        "ok": True,
        "engine_ready": True,
        "clan_id": int(clan_id),
        "community_records_policy": records_policy,
        "pending_review_count": len(rows),
        "submissions": [_submission_to_review_item(row) for row in rows],
        "boundary": (
            "This queue contains member-submitted Community Records waiting for "
            "a community officer. Approval publishes a new official notice; "
            "rejection records the decision but does not publish the submission."
        ),
    }


@router.post("/review-queue/{submission_event_id}/decision")
def decide_notice_review_submission(
    submission_event_id: int,
    payload: CommunityNoticeReviewDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership = _require_notice_officer(
        db, clan_id=int(payload.clan_id), current_user=current_user
    )
    records_policy = _community_records_policy_for_clan(db, clan_id=int(payload.clan_id))
    if not bool(records_policy.get("community_records_enabled", True)):
        raise _community_record_policy_error(
            code="community_records_disabled",
            message="This community setup has Community Records turned off.",
            clan_id=int(payload.clan_id),
            policy=records_policy,
        )
    submission = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.id == int(submission_event_id),
            TrustEvent.clan_id == int(payload.clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_SUBMISSION_EVENT,
        )
        .first()
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Community record submission not found")

    decisions = _notice_review_decisions_by_submission(db, clan_id=int(payload.clan_id))
    if int(submission_event_id) in decisions:
        raise HTTPException(status_code=409, detail="This community record submission has already been reviewed")

    meta = _safe_meta(getattr(submission, "meta_json", None))
    body = _safe_str(meta.get("body"))
    full_body = _safe_str(meta.get("full_body") or meta.get("full_notice_body"))
    public_qr_requested = bool(meta.get("public_qr_requested") or meta.get("public_qr_enabled"))
    attachment_payload = _notice_attachment_payload(meta)
    expiry_policy = _normalize_notice_expiry_policy(meta.get("expiry_policy"))
    if payload.decision == "approve":
        try:
            expires_at = _notice_expires_at(
                expiry_policy,
                meta.get("expires_at") if expiry_policy == NOTICE_EXPIRY_EVENT else None,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        poster_contact = {
            "sender_whatsapp_number": _safe_str(meta.get("sender_whatsapp_number")) or None,
            "sender_whatsapp_label": _safe_str(meta.get("sender_whatsapp_label")) or None,
            "sender_contact_ready": bool(meta.get("sender_contact_ready")),
        }
        notice_event = log_trust_event(
            db,
            event_type=COMMUNITY_NOTICE_EVENT,
            clan_id=int(payload.clan_id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(getattr(submission, "actor_user_id", 0) or current_user.id),
            meta={
                "source": COMMUNITY_NOTICE_SOURCE,
                "reason": "community_notice_review_approved",
                "body": body,
                "word_count": _word_count(body),
                "full_body": full_body or None,
                "full_word_count": _word_count(full_body) if full_body else 0,
                **attachment_payload,
                "poll_question": _safe_str(meta.get("poll_question")) or None,
                "poll_options": _notice_poll_options(meta.get("poll_options")),
                "poll_selection_mode": _normalize_notice_poll_selection_mode(meta.get("poll_selection_mode")),
                "poll_audience": _normalize_notice_poll_audience(meta.get("poll_audience")),
                "posting_policy": _normalize_notice_posting_policy(meta.get("posting_policy")),
                "expiry_policy": expiry_policy,
                "expires_at": _iso(expires_at),
                "active_board_status": "active",
                "review_status": "approved",
                "approved_submission_event_id": int(submission_event_id),
                "reviewed_by_user_id": int(current_user.id),
                "reviewer_note": _safe_str(payload.reviewer_note) or None,
                "posted_by_role": _safe_str(getattr(membership, "role", None), "admin"),
                "submitted_by_user_id": int(getattr(submission, "actor_user_id", 0) or 0),
                "comments_enabled": False,
                "reactions_enabled": False,
                "thread_enabled": False,
                "availability_enabled": bool(meta.get("availability_enabled")),
                "trust_delta": "0.00",
                "community_records_policy": records_policy,
                **_community_notice_public_meta(public_qr_requested),
                **poster_contact,
            },
        )
        notifications_created = _create_notice_notifications(
            db,
            clan_id=int(payload.clan_id),
            body=body,
            poster_user_id=int(current_user.id),
        )
    else:
        notice_event = None
        notifications_created = 0

    decision_event = log_trust_event(
        db,
        event_type=COMMUNITY_NOTICE_REVIEW_EVENT,
        clan_id=int(payload.clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(submission, "actor_user_id", 0) or current_user.id),
        meta={
            "source": COMMUNITY_NOTICE_SOURCE,
            "reason": "community_notice_review_decided",
            "submission_event_id": int(submission_event_id),
            "decision": payload.decision,
            "resulting_notice_event_id": int(notice_event.id) if notice_event else None,
            "reviewer_note": _safe_str(payload.reviewer_note) or None,
            "community_records_policy": records_policy,
        },
    )
    review_notifications_retired = _retire_notice_review_notifications(
        db,
        clan_id=int(payload.clan_id),
        submission_event_id=int(submission_event_id),
    )
    submitter_notification_created = _create_notice_review_result_notification(
        db,
        clan_id=int(payload.clan_id),
        submission_event_id=int(submission_event_id),
        submitter_user_id=int(getattr(submission, "actor_user_id", 0) or 0),
        decision=payload.decision,
        body=body,
    )
    return {
        "ok": True,
        "engine_ready": True,
        "submission_event_id": int(submission_event_id),
        "decision_event_id": int(decision_event.id),
        "decision": payload.decision,
        "notice": (
            _event_to_notice(notice_event, db=db, viewer_user_id=int(current_user.id))
            if notice_event
            else None
        ),
        "notifications_created": int(notifications_created),
        "review_notifications_retired": int(review_notifications_retired),
        "submitter_notification_created": int(submitter_notification_created),
        "community_records_policy": records_policy,
        "message": (
            "Community record approved and published to the Official Board."
            if payload.decision == "approve"
            else "Community record rejected. The decision was recorded without publishing it."
        ),
    }


@router.get("/{notice_event_id}/acknowledgements")
def list_notice_acknowledgements(
    notice_event_id: int,
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership = _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    if not _is_notice_officer(membership, current_user):
        raise HTTPException(status_code=403, detail="Only a community officer can see acknowledgement roll call")

    notice_event = _get_notice_for_acknowledgement(
        db,
        clan_id=int(clan_id),
        notice_event_id=int(notice_event_id),
    )
    ack_rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_ACK_EVENT,
            or_(
                TrustEvent.meta_json.like(f'%"notice_event_id": {int(notice_event_id)}%'),
                TrustEvent.meta_json.like(f'%"notice_event_id":{int(notice_event_id)}%'),
            ),
        )
        .order_by(TrustEvent.id.asc())
        .all()
    )
    acknowledged_at_by_user_id: dict[int, datetime] = {}
    for row in ack_rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if int(meta.get("notice_event_id") or 0) != int(notice_event_id):
            continue
        user_id = int(getattr(row, "subject_user_id", 0) or 0)
        if user_id and user_id not in acknowledged_at_by_user_id:
            acknowledged_at_by_user_id[user_id] = getattr(row, "created_at", None)

    member_rows = (
        db.query(ClanMembership, User)
        .join(User, User.id == ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.role.desc(), User.display_name.asc(), User.id.asc())
        .all()
    )
    acknowledged: list[dict[str, Any]] = []
    not_acknowledged: list[dict[str, Any]] = []
    for row_membership, user in member_rows:
        user_id = int(getattr(user, "id", 0) or 0)
        acknowledged_at = acknowledged_at_by_user_id.get(user_id)
        payload = _notice_ack_member_payload(
            user=user,
            membership=row_membership,
            acknowledged_at=acknowledged_at,
        )
        if acknowledged_at is not None:
            acknowledged.append(payload)
        else:
            not_acknowledged.append(payload)

    return {
        "ok": True,
        "notice_event_id": int(getattr(notice_event, "id", notice_event_id)),
        "clan_id": int(clan_id),
        "can_view_roll_call": True,
        "summary": {
            "acknowledged": len(acknowledged),
            "not_acknowledged": len(not_acknowledged),
            "total_members": len(acknowledged) + len(not_acknowledged),
        },
        "acknowledged": acknowledged,
        "not_acknowledged": not_acknowledged,
    }

@router.post("/{notice_event_id}/acknowledgements")
def acknowledge_notice(
    notice_event_id: int,
    payload: CommunityNoticeAcknowledgementIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(payload.clan_id), current_user=current_user)
    records_policy = _community_records_policy_for_clan(db, clan_id=int(payload.clan_id))
    if not bool(records_policy.get("community_records_enabled", True)):
        raise _community_record_policy_error(
            code="community_records_disabled",
            message="This community setup has Community Records turned off.",
            clan_id=int(payload.clan_id),
            policy=records_policy,
        )
    notice_event = _get_notice_for_acknowledgement(
        db,
        clan_id=int(payload.clan_id),
        notice_event_id=int(notice_event_id),
    )
    meta = _safe_meta(getattr(notice_event, "meta_json", None))
    notice_source_event_type = _safe_str(getattr(notice_event, "event_type", None))
    notice_source = (
        CENTRAL_DOMAIN_NOTICE_SOURCE
        if notice_source_event_type == CENTRAL_DOMAIN_NOTICE_EVENT
        else COMMUNITY_NOTICE_SOURCE
    )
    if _notice_is_expired(meta, created_at=getattr(notice_event, "created_at", None)):
        raise HTTPException(status_code=409, detail="This notice has already left the active board")

    event = log_trust_event(
        db,
        event_type=COMMUNITY_NOTICE_ACK_EVENT,
        clan_id=int(payload.clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "source": notice_source,
            "reason": "community_notice_acknowledged",
            "notice_source_event_type": notice_source_event_type,
            "notice_event_id": int(notice_event_id),
            "notice_id": f"TE-{int(notice_event_id)}",
            "acknowledgement": "seen",
            "community_records_policy": records_policy,
        },
        dedupe_key=f"community-notice-ack:{int(notice_event_id)}:{int(current_user.id)}",
    )
    summary = _notice_ack_summary(
        db,
        clan_id=int(payload.clan_id),
        notice_event_id=int(notice_event_id),
        viewer_user_id=int(current_user.id),
    )
    return {
        "ok": True,
        "event_id": int(event.id),
        "notice_event_id": int(notice_event_id),
        "acknowledgement_summary": summary,
        "community_records_policy": records_policy,
        "message": "Announcement acknowledged.",
    }


@router.get("/{notice_event_id}/poll-roll-call")
def list_notice_poll_roll_call(
    notice_event_id: int,
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership = _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    if not _is_notice_officer(membership, current_user):
        raise HTTPException(status_code=403, detail="Only a community officer can see poll roll call")

    notice_event = _get_notice_for_acknowledgement(
        db,
        clan_id=int(clan_id),
        notice_event_id=int(notice_event_id),
    )
    notice_meta = _safe_meta(getattr(notice_event, "meta_json", None))
    poll_question = _safe_str(notice_meta.get("poll_question"))
    poll_options = _notice_poll_options(notice_meta.get("poll_options"))
    if not poll_question or len(poll_options) < 2:
        raise HTTPException(status_code=409, detail="This announcement does not have an open poll")

    canonical_by_key = {option.casefold(): option for option in poll_options}
    response_rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_NOTICE_POLL_RESPONSE_EVENT,
            or_(
                TrustEvent.meta_json.like(f'%"notice_event_id": {int(notice_event_id)}%'),
                TrustEvent.meta_json.like(f'%"notice_event_id":{int(notice_event_id)}%'),
            ),
        )
        .order_by(TrustEvent.id.asc())
        .all()
    )
    latest_by_user_id: dict[int, tuple[list[str], Any]] = {}
    for row in response_rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if int(meta.get("notice_event_id") or 0) != int(notice_event_id):
            continue
        raw_options = meta.get("options")
        if not isinstance(raw_options, list):
            raw_options = [meta.get("option")]
        selected: list[str] = []
        seen: set[str] = set()
        for raw_option in raw_options:
            option = canonical_by_key.get(_safe_str(raw_option).casefold())
            key = _safe_str(option).casefold()
            if not option or key in seen:
                continue
            selected.append(option)
            seen.add(key)
        user_id = int(getattr(row, "subject_user_id", 0) or 0)
        if selected and user_id:
            latest_by_user_id[user_id] = (selected, getattr(row, "created_at", None))

    member_rows = (
        db.query(ClanMembership, User)
        .join(User, User.id == ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
            ClanMembership.user_id.in_(list(latest_by_user_id.keys()) or [0]),
        )
        .order_by(User.display_name.asc(), User.id.asc())
        .all()
    )
    responses: list[dict[str, Any]] = []
    by_option: dict[str, list[dict[str, Any]]] = {option: [] for option in poll_options}
    for row_membership, user in member_rows:
        user_id = int(getattr(user, "id", 0) or 0)
        selected, responded_at = latest_by_user_id.get(user_id, ([], None))
        member_payload = {
            "user_id": user_id,
            "display_name": _safe_str(getattr(user, "display_name", None)) or None,
            "gmfn_id": _safe_str(getattr(user, "gmfn_id", None)) or None,
            "role": _safe_str(getattr(row_membership, "role", None), "member"),
            "options": selected,
            "responded_at": _iso(responded_at),
        }
        responses.append(member_payload)
        for option in selected:
            by_option[option].append(member_payload)

    aggregate_summary = _notice_poll_summary(
        db,
        clan_id=int(clan_id),
        notice_event_id=int(notice_event_id),
        poll_options=poll_options,
        viewer_user_id=0,
    )

    return {
        "ok": True,
        "notice_event_id": int(getattr(notice_event, "id", notice_event_id)),
        "clan_id": int(clan_id),
        "can_view_roll_call": True,
        "poll_question": poll_question,
        "poll_selection_mode": _normalize_notice_poll_selection_mode(
            notice_meta.get("poll_selection_mode")
        ),
        "summary": {
            "counts": aggregate_summary["counts"],
            "total_respondents": aggregate_summary["total"],
            "member_response_count": aggregate_summary["member_response_count"],
            "public_response_count": aggregate_summary["public_response_count"],
        },
        "by_option": by_option,
        "public_counts": aggregate_summary["public_counts"],
        "responses": responses,
        "boundary": (
            "Aggregate counts are the normal poll view. Member names are restricted to authorised "
            "community officers for necessary follow-up. Public-link responses remain anonymous "
            "browser-response counts and never enter the member roll call."
        ),
    }


@router.post("/{notice_event_id}/availability")
def record_notice_availability(
    notice_event_id: int,
    payload: CommunityNoticeAvailabilityIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(payload.clan_id), current_user=current_user)
    records_policy = _community_records_policy_for_clan(db, clan_id=int(payload.clan_id))
    if not bool(records_policy.get("community_records_enabled", True)):
        raise _community_record_policy_error(
            code="community_records_disabled",
            message="This community setup has Community Records turned off.",
            clan_id=int(payload.clan_id),
            policy=records_policy,
        )
    notice_event = _get_notice_for_acknowledgement(
        db,
        clan_id=int(payload.clan_id),
        notice_event_id=int(notice_event_id),
    )
    meta = _safe_meta(getattr(notice_event, "meta_json", None))
    if _notice_is_expired(meta, created_at=getattr(notice_event, "created_at", None)):
        raise HTTPException(status_code=409, detail="This notice has already left the active board")
    if not _notice_availability_enabled(meta):
        raise HTTPException(status_code=409, detail="Responses are only open for event-date announcements or community need questions")

    notice_source_event_type = _safe_str(getattr(notice_event, "event_type", None))
    notice_source = (
        CENTRAL_DOMAIN_NOTICE_SOURCE
        if notice_source_event_type == CENTRAL_DOMAIN_NOTICE_EVENT
        else COMMUNITY_NOTICE_SOURCE
    )
    event = log_trust_event(
        db,
        event_type=COMMUNITY_NOTICE_AVAILABILITY_EVENT,
        clan_id=int(payload.clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "source": notice_source,
            "reason": "market_need_pulse_response" if bool(meta.get("market_need_pulse")) else "community_notice_availability_response",
            "notice_source_event_type": notice_source_event_type,
            "notice_event_id": int(notice_event_id),
            "notice_id": f"TE-{int(notice_event_id)}",
            "response": payload.response,
            "community_records_policy": records_policy,
        },
    )
    return {
        "ok": True,
        "event_id": int(event.id),
        "notice_event_id": int(notice_event_id),
        "availability_summary": _notice_availability_summary(
            db,
            clan_id=int(payload.clan_id),
            notice_event_id=int(notice_event_id),
            viewer_user_id=int(current_user.id),
        ),
        "message": (
            "Community need response saved."
            if bool(meta.get("market_need_pulse"))
            else "Availability response saved."
        ),
    }


@router.post("/{notice_event_id}/poll-response")
def record_notice_poll_response(
    notice_event_id: int,
    payload: CommunityNoticePollResponseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(payload.clan_id), current_user=current_user)
    records_policy = _community_records_policy_for_clan(db, clan_id=int(payload.clan_id))
    if not bool(records_policy.get("community_records_enabled", True)):
        raise _community_record_policy_error(
            code="community_records_disabled",
            message="This community setup has Community Records turned off.",
            clan_id=int(payload.clan_id),
            policy=records_policy,
        )
    notice_event = _get_notice_for_acknowledgement(
        db,
        clan_id=int(payload.clan_id),
        notice_event_id=int(notice_event_id),
    )
    meta = _safe_meta(getattr(notice_event, "meta_json", None))
    if _notice_is_expired(meta, created_at=getattr(notice_event, "created_at", None)):
        raise HTTPException(status_code=409, detail="This notice has already left the active board")

    poll_question = _safe_str(meta.get("poll_question"))
    poll_options = _notice_poll_options(meta.get("poll_options"))
    poll_selection_mode = _normalize_notice_poll_selection_mode(meta.get("poll_selection_mode"))
    canonical_by_key = {option.casefold(): option for option in poll_options}
    requested_options = list(payload.options or [])
    if not requested_options and _safe_str(payload.option):
        requested_options = [_safe_str(payload.option)]
    selected_options: list[str] = []
    selected_keys: set[str] = set()
    for requested_option in requested_options:
        selected_option = canonical_by_key.get(_safe_str(requested_option).casefold())
        key = _safe_str(selected_option).casefold()
        if not selected_option or key in selected_keys:
            continue
        selected_options.append(selected_option)
        selected_keys.add(key)
    if not poll_question or len(poll_options) < 2:
        raise HTTPException(status_code=409, detail="This announcement does not have an open poll")
    if len(selected_options) != len(requested_options) or not selected_options:
        raise HTTPException(status_code=422, detail="Choose only the poll options shown on this announcement")
    if poll_selection_mode == NOTICE_POLL_SELECTION_SINGLE and len(selected_options) != 1:
        raise HTTPException(status_code=422, detail="Choose one option for this announcement poll")

    event = log_trust_event(
        db,
        event_type=COMMUNITY_NOTICE_POLL_RESPONSE_EVENT,
        clan_id=int(payload.clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "source": COMMUNITY_NOTICE_SOURCE,
            "reason": "community_notice_poll_response",
            "notice_event_id": int(notice_event_id),
            "notice_id": f"TE-{int(notice_event_id)}",
            "poll_question": poll_question,
            "poll_selection_mode": poll_selection_mode,
            "option": selected_options[0],
            "options": selected_options,
            "community_records_policy": records_policy,
        },
    )
    return {
        "ok": True,
        "event_id": int(event.id),
        "notice_event_id": int(notice_event_id),
        "poll_summary": _notice_poll_summary(
            db,
            clan_id=int(payload.clan_id),
            notice_event_id=int(notice_event_id),
            poll_options=poll_options,
            viewer_user_id=int(current_user.id),
        ),
        "message": f"Poll response saved: {', '.join(selected_options)}.",
    }


@router.get("/settings")
def get_notice_settings(
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    membership = _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    posting_policy = _notice_posting_policy_for_clan(db, clan_id=int(clan_id))
    records_policy = _community_records_policy_for_clan(db, clan_id=int(clan_id))
    return {
        "ok": True,
        "clan_id": int(clan_id),
        "posting_policy": posting_policy,
        "can_post_notice": _can_create_notice_record(
            membership,
            current_user,
            posting_policy=posting_policy,
            records_policy=records_policy,
        ),
        "can_submit_notice_for_review": _can_submit_notice_for_review(
            membership,
            current_user,
            posting_policy=posting_policy,
            records_policy=records_policy,
        ),
        "pending_notice_review_count": (
            len(_pending_notice_submission_rows(db, clan_id=int(clan_id), limit=50))
            if _is_notice_officer(membership, current_user)
            else 0
        ),
        "community_records_policy": records_policy,
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
    records_policy = _community_records_policy_for_clan(db, clan_id=int(clan_id))
    posting_policy = _set_notice_posting_policy_for_clan(
        db,
        clan_id=int(clan_id),
        posting_policy=payload.posting_policy,
    )
    return {
        "ok": True,
        "clan_id": int(clan_id),
        "posting_policy": posting_policy,
        "community_records_policy": records_policy,
        "message": (
            "Community Notice Board is open to active members."
            if posting_policy == NOTICE_POSTING_POLICY_MEMBERS
            else "Community Notice Board is admin-only."
        ),
    }
