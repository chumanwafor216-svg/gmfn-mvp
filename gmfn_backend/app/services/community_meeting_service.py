from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import quote

from sqlalchemy.orm import Session

from app.db.models import Clan, ClanMembership, TrustEvent
from app.db.notification_models import Notification
from app.services.feature_entitlements_service import (
    consume_feature_units,
    get_active_feature_quantity,
)
from app.services.notification_service import create_notification
from app.services.payment_instruction_service import FEATURE_COMMUNITY_MEETING_PACK
from app.services.trust_events_services import log_trust_event


COMMUNITY_MEETING_ENGINE_VERSION = "community_meeting_evidence_engine_v1"
COMMUNITY_MEETING_SOURCE = "community.meeting_pack"
COMMUNITY_MEETING_REMINDER_EVENT = "community.meeting.reminder_created"
COMMUNITY_MEETING_SUMMARY_EVENT = "community.meeting.summary_recorded"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text if text else default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _safe_meta(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _to_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _meeting_token() -> str:
    return f"{_now_utc().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(2).upper()}"


def _meeting_id(*, clan_id: int, token: str) -> str:
    return f"MTG-C{int(clan_id)}-{token}"


def _active_member_ids(db: Session, *, clan_id: int) -> List[int]:
    rows = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.id.asc())
        .all()
    )
    return [int(row.user_id) for row in rows]


def _admin_member_ids(db: Session, *, clan_id: int) -> List[int]:
    rows = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.id.asc())
        .all()
    )
    out: List[int] = []
    for row in rows:
        if _safe_str(getattr(row, "role", "")).lower() == "admin":
            out.append(int(row.user_id))
    return list(dict.fromkeys(out))


def _validate_attendees(
    db: Session,
    *,
    clan_id: int,
    attendee_user_ids: Optional[Iterable[int]],
) -> List[int]:
    active = _active_member_ids(db, clan_id=int(clan_id))
    active_set = set(active)
    requested = [
        int(user_id)
        for user_id in (attendee_user_ids or active)
        if _safe_int(user_id, 0) > 0
    ]
    deduped = list(dict.fromkeys(requested))
    missing = [user_id for user_id in deduped if user_id not in active_set]
    if missing:
        raise ValueError("Meeting attendees must already belong to this community")
    return deduped or active


def _meeting_action_url(*, clan_id: int, meeting_id: str) -> str:
    return (
        f"/app/shop-control?clan_id={int(clan_id)}"
        f"&meeting_id={quote(str(meeting_id))}"
        "#shop-control-community-packages"
    )


def _whatsapp_text(
    *,
    clan_name: str,
    title: str,
    scheduled_at: Optional[datetime],
    purpose: str,
    meeting_id: str,
) -> str:
    when = scheduled_at.strftime("%Y-%m-%d %H:%M UTC") if scheduled_at else "time to confirm"
    lines = [
        f"GSN community meeting: {title}",
        f"Community: {clan_name}",
        f"When: {when}",
    ]
    if purpose:
        lines.append(f"Purpose: {purpose}")
    lines.extend(
        [
            f"GSN record: {meeting_id}",
            "Please reply here if you can attend. GSN will keep the reminder and summary evidence.",
        ]
    )
    return "\n".join(lines)


def _whatsapp_share_url(*, text: str, whatsapp_number: Optional[str] = None) -> str:
    cleaned_number = "".join(ch for ch in _safe_str(whatsapp_number) if ch.isdigit())
    encoded = quote(text)
    if cleaned_number:
        return f"https://wa.me/{cleaned_number}?text={encoded}"
    return f"https://api.whatsapp.com/send?text={encoded}"


def _notify_once(
    db: Session,
    *,
    user_id: int,
    kind: str,
    title: str,
    message: str,
    action_url: Optional[str],
    action_label: str,
) -> bool:
    existing = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .filter(Notification.kind == str(kind))
        .filter(Notification.action_url == action_url)
        .first()
    )
    if existing:
        return False
    create_notification(
        db,
        user_id=int(user_id),
        kind=str(kind),
        title=title,
        message=message,
        action_url=action_url,
        action_label=action_label,
        commit=False,
        refresh=False,
    )
    return True


def _event_to_record(event: TrustEvent) -> Dict[str, Any]:
    meta = _safe_meta(getattr(event, "meta_json", None))
    return {
        "event_id": int(event.id),
        "event_type": str(event.event_type),
        "meeting_id": _safe_str(meta.get("meeting_id")),
        "title": _safe_str(meta.get("title"), "Community meeting"),
        "purpose": _safe_str(meta.get("purpose")),
        "scheduled_at": meta.get("scheduled_at"),
        "summary": _safe_str(meta.get("summary")),
        "decisions": _safe_str(meta.get("decisions")),
        "attendance_count": meta.get("attendance_count"),
        "attendee_user_ids": meta.get("attendee_user_ids") or [],
        "whatsapp_share_text": _safe_str(meta.get("whatsapp_share_text")),
        "whatsapp_share_url": _safe_str(meta.get("whatsapp_share_url")),
        "action_url": _safe_str(meta.get("action_url")),
        "package_feature_code": _safe_str(meta.get("package_feature_code")),
        "package_consumed": bool(meta.get("package_consumed")),
        "created_at": _iso(getattr(event, "created_at", None)),
    }


def _find_reminder_event(
    db: Session,
    *,
    clan_id: int,
    meeting_id: str,
) -> Optional[TrustEvent]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_MEETING_REMINDER_EVENT,
        )
        .order_by(TrustEvent.id.desc())
        .all()
    )
    target = _safe_str(meeting_id)
    for row in rows:
        if _safe_str(_safe_meta(row.meta_json).get("meeting_id")) == target:
            return row
    return None


def create_meeting_reminder(
    db: Session,
    *,
    clan_id: int,
    actor_user_id: int,
    title: str,
    scheduled_at: Optional[datetime] = None,
    purpose: Optional[str] = None,
    attendee_user_ids: Optional[Iterable[int]] = None,
    whatsapp_number: Optional[str] = None,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    clan = db.get(Clan, int(clan_id))
    clan_name = _safe_str(getattr(clan, "name", None), f"Community {int(clan_id)}")
    cleaned_title = _safe_str(title, "Community meeting")
    if len(cleaned_title) < 3:
        raise ValueError("Meeting title is required")

    scheduled_utc = _to_utc(scheduled_at)
    attendee_ids = _validate_attendees(
        db,
        clan_id=int(clan_id),
        attendee_user_ids=attendee_user_ids,
    )
    token = _meeting_token()
    meeting_id = _meeting_id(clan_id=int(clan_id), token=token)
    action_url = _meeting_action_url(clan_id=int(clan_id), meeting_id=meeting_id)
    share_text = _whatsapp_text(
        clan_name=clan_name,
        title=cleaned_title,
        scheduled_at=scheduled_utc,
        purpose=_safe_str(purpose),
        meeting_id=meeting_id,
    )
    share_url = _whatsapp_share_url(text=share_text, whatsapp_number=whatsapp_number)

    consumed = consume_feature_units(
        db,
        owner_user_id=int(actor_user_id),
        feature_code=FEATURE_COMMUNITY_MEETING_PACK,
        units=1,
        shop_id=None,
        clan_id=int(clan_id),
        reference_key=meeting_id,
        note=_safe_str(note, "Community meeting reminder evidence"),
        commit=False,
    )
    if not bool(consumed.get("ok")):
        db.rollback()
        raise ValueError("No active meeting pack credit is available")

    remaining_after = get_active_feature_quantity(
        db,
        owner_user_id=int(actor_user_id),
        feature_code=FEATURE_COMMUNITY_MEETING_PACK,
        shop_id=None,
        clan_id=int(clan_id),
    )

    event = log_trust_event(
        db,
        event_type=COMMUNITY_MEETING_REMINDER_EVENT,
        clan_id=int(clan_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(actor_user_id),
        meta={
            "engine_version": COMMUNITY_MEETING_ENGINE_VERSION,
            "source": COMMUNITY_MEETING_SOURCE,
            "reason": "community_meeting_reminder_created",
            "meeting_id": meeting_id,
            "title": cleaned_title,
            "purpose": _safe_str(purpose),
            "scheduled_at": _iso(scheduled_utc),
            "attendee_user_ids": attendee_ids,
            "whatsapp_share_text": share_text,
            "whatsapp_share_url": share_url,
            "whatsapp_linked_out": True,
            "whatsapp_not_built_in": True,
            "action_url": action_url,
            "package_feature_code": FEATURE_COMMUNITY_MEETING_PACK,
            "package_consumed": True,
            "package_consume_result": consumed,
            "remaining_after": int(remaining_after),
            "trust_delta": "0.00",
            "note": _safe_str(note),
        },
        dedupe_key=f"community-meeting-reminder:{meeting_id}",
        commit=False,
        refresh=False,
    )

    notified = 0
    for user_id in attendee_ids:
        if _notify_once(
            db,
            user_id=int(user_id),
            kind="community.meeting_reminder",
            title="Community meeting reminder",
            message=f"{cleaned_title} has been recorded in GSN. Use WhatsApp for the conversation and GSN for the evidence.",
            action_url=action_url,
            action_label="Open meeting record",
        ):
            notified += 1

    db.commit()
    db.refresh(event)

    return {
        "meeting": _event_to_record(event),
        "remaining_after": int(remaining_after),
        "notifications_created": int(notified),
        "message": "Meeting reminder recorded. WhatsApp share is ready, and GSN kept the TrustEvent evidence.",
    }


def record_meeting_summary(
    db: Session,
    *,
    clan_id: int,
    meeting_id: str,
    actor_user_id: int,
    summary: str,
    decisions: Optional[str] = None,
    attendance_count: Optional[int] = None,
    attendee_user_ids: Optional[Iterable[int]] = None,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    reminder = _find_reminder_event(
        db,
        clan_id=int(clan_id),
        meeting_id=str(meeting_id),
    )
    if not reminder:
        raise ValueError("Meeting reminder record was not found")

    reminder_record = _event_to_record(reminder)
    cleaned_summary = _safe_str(summary)
    if len(cleaned_summary) < 5:
        raise ValueError("Meeting summary is required")

    attendee_ids = _validate_attendees(
        db,
        clan_id=int(clan_id),
        attendee_user_ids=attendee_user_ids,
    )
    count = attendance_count
    if count is None:
        count = len(attendee_ids)
    count = max(0, _safe_int(count, 0))
    action_url = _meeting_action_url(clan_id=int(clan_id), meeting_id=str(meeting_id))

    event = log_trust_event(
        db,
        event_type=COMMUNITY_MEETING_SUMMARY_EVENT,
        clan_id=int(clan_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(actor_user_id),
        meta={
            "engine_version": COMMUNITY_MEETING_ENGINE_VERSION,
            "source": COMMUNITY_MEETING_SOURCE,
            "reason": "community_meeting_summary_recorded",
            "meeting_id": str(meeting_id),
            "title": reminder_record["title"],
            "purpose": reminder_record["purpose"],
            "scheduled_at": reminder_record["scheduled_at"],
            "summary": cleaned_summary,
            "decisions": _safe_str(decisions),
            "attendance_count": int(count),
            "attendee_user_ids": attendee_ids,
            "reminder_event_id": int(reminder.id),
            "whatsapp_linked_out": True,
            "whatsapp_not_built_in": True,
            "action_url": action_url,
            "package_feature_code": FEATURE_COMMUNITY_MEETING_PACK,
            "package_consumed": False,
            "trust_delta": "0.00",
            "note": _safe_str(note),
        },
        dedupe_key=f"community-meeting-summary:{meeting_id}",
        commit=False,
        refresh=False,
    )

    recipient_ids = list(dict.fromkeys(_admin_member_ids(db, clan_id=int(clan_id)) + attendee_ids))
    notified = 0
    for user_id in recipient_ids:
        if _notify_once(
            db,
            user_id=int(user_id),
            kind="community.meeting_summary_recorded",
            title="Community meeting summary recorded",
            message=f"{reminder_record['title']} now has a GSN summary record.",
            action_url=action_url,
            action_label="Open meeting record",
        ):
            notified += 1

    db.commit()
    db.refresh(event)
    summary_record = _event_to_record(event)
    summary_record["status"] = "summary_recorded"

    return {
        "meeting": {
            **reminder_record,
            **summary_record,
            "reminder_event_id": int(reminder.id),
            "summary_event_id": int(event.id),
        },
        "notifications_created": int(notified),
        "message": "Meeting summary recorded as TrustEvent evidence. No extra meeting pack credit was consumed.",
    }


def list_community_meetings(
    db: Session,
    *,
    clan_id: int,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type.in_(
                [COMMUNITY_MEETING_REMINDER_EVENT, COMMUNITY_MEETING_SUMMARY_EVENT]
            ),
        )
        .order_by(TrustEvent.id.desc())
        .limit(max(1, int(limit or 20)) * 2)
        .all()
    )

    grouped: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        record = _event_to_record(row)
        mid = _safe_str(record.get("meeting_id"))
        if not mid:
            continue
        current = grouped.get(mid) or {}
        if row.event_type == COMMUNITY_MEETING_REMINDER_EVENT:
            current.setdefault("reminder_event_id", int(row.id))
            for key, value in record.items():
                if value in ("", None, []):
                    continue
                current.setdefault(key, value)
            current.setdefault("status", "reminder_created")
        elif row.event_type == COMMUNITY_MEETING_SUMMARY_EVENT:
            current.update({k: v for k, v in record.items() if v not in ("", None, [])})
            current["summary_event_id"] = int(row.id)
            current["status"] = "summary_recorded"
        grouped[mid] = current

    meetings = list(grouped.values())
    meetings.sort(key=lambda item: _safe_int(item.get("summary_event_id") or item.get("reminder_event_id")), reverse=True)
    return meetings[: max(1, int(limit or 20))]
