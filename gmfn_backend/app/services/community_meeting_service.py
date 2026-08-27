from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone
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
COMMUNITY_MEETING_INTEREST_EVENT = "community.meeting.interest_recorded"
COMMUNITY_MEETING_ATTENDANCE_SESSION_EVENT = "community.meeting.attendance_session_opened"
COMMUNITY_MEETING_ATTENDANCE_CHECKIN_EVENT = "community.meeting.attendance_checkin_recorded"
COMMUNITY_MEETING_INTEREST_RESPONSES = {"yes", "no", "maybe"}
COMMUNITY_MEETING_ATTENDANCE_METHODS = {
    "qr",
    "rotating_qr",
    "short_code",
    "bluetooth_proximity",
    "coordinator",
    "member_self_claim",
}
COMMUNITY_MEETING_ATTENDANCE_STRENGTH = {
    "qr": "moderate",
    "rotating_qr": "moderate",
    "short_code": "moderate",
    "bluetooth_proximity": "stronger_when_enabled",
    "coordinator": "stronger",
    "member_self_claim": "provisional",
}


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


def _parse_iso_datetime(value: Any) -> Optional[datetime]:
    raw = _safe_str(value)
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        return None
    return _to_utc(parsed)


def _meeting_token() -> str:
    return f"{_now_utc().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(2).upper()}"


def _meeting_id(*, clan_id: int, token: str) -> str:
    return f"MTG-C{int(clan_id)}-{token}"


def _attendance_token() -> str:
    return secrets.token_urlsafe(18)


def _attendance_session_id(*, clan_id: int, token: str) -> str:
    return f"ATT-C{int(clan_id)}-{_now_utc().strftime('%Y%m%d%H%M%S')}-{token[-6:].upper()}"


def _normalize_attendance_method(value: Any) -> str:
    method = _safe_str(value, "qr").lower()
    return method if method in COMMUNITY_MEETING_ATTENDANCE_METHODS else "qr"


def _attendance_strength(method: str) -> str:
    return COMMUNITY_MEETING_ATTENDANCE_STRENGTH.get(_normalize_attendance_method(method), "moderate")


def _meeting_attendance_checkin_url(*, clan_id: int, meeting_id: str, token: str) -> str:
    return (
        f"/app/shop-control?clan_id={int(clan_id)}"
        f"&meeting_id={quote(str(meeting_id))}"
        f"&attendance_token={quote(str(token))}"
        "#shop-control-community-packages"
    )


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
        "interest_response": _safe_str(meta.get("interest_response")),
        "interest_note": _safe_str(meta.get("interest_note")),
        "responder_user_id": meta.get("responder_user_id"),
        "attendance_session_id": _safe_str(meta.get("attendance_session_id")),
        "attendance_token": _safe_str(meta.get("attendance_token")),
        "attendance_method": _safe_str(meta.get("attendance_method")),
        "attendance_method_label": _safe_str(meta.get("attendance_method_label")),
        "attendance_checkin_url": _safe_str(meta.get("attendance_checkin_url")),
        "attendance_expires_at": meta.get("attendance_expires_at"),
        "attendance_window_minutes": meta.get("attendance_window_minutes"),
        "attendance_session_event_id": meta.get("attendance_session_event_id"),
        "checked_in_at": meta.get("checked_in_at"),
        "checked_in_user_id": meta.get("checked_in_user_id"),
        "arrival_status": _safe_str(meta.get("arrival_status")),
        "minutes_from_start": meta.get("minutes_from_start"),
        "capture_method": _safe_str(meta.get("capture_method")),
        "evidence_strength": _safe_str(meta.get("evidence_strength")),
        "automatic_bluetooth_scan": bool(meta.get("automatic_bluetooth_scan")),
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



def _find_attendance_session_event(
    db: Session,
    *,
    clan_id: int,
    meeting_id: str,
    attendance_token: Optional[str] = None,
    active_only: bool = True,
) -> Optional[TrustEvent]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_MEETING_ATTENDANCE_SESSION_EVENT,
        )
        .order_by(TrustEvent.id.desc())
        .limit(50)
        .all()
    )
    now = _now_utc()
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        if _safe_str(meta.get("meeting_id")) != _safe_str(meeting_id):
            continue
        if attendance_token and _safe_str(meta.get("attendance_token")) != _safe_str(attendance_token):
            continue
        expires_at = _parse_iso_datetime(meta.get("attendance_expires_at"))
        if active_only and expires_at is not None and expires_at <= now:
            continue
        return row
    return None


def _find_existing_attendance_checkin(
    db: Session,
    *,
    clan_id: int,
    meeting_id: str,
    user_id: int,
) -> Optional[TrustEvent]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type == COMMUNITY_MEETING_ATTENDANCE_CHECKIN_EVENT,
            TrustEvent.subject_user_id == int(user_id),
        )
        .order_by(TrustEvent.id.asc())
        .limit(50)
        .all()
    )
    for row in rows:
        if _safe_str(_safe_meta(row.meta_json).get("meeting_id")) == _safe_str(meeting_id):
            return row
    return None


def _arrival_status(*, scheduled_at: Any, checked_in_at: datetime) -> Dict[str, Any]:
    scheduled = _parse_iso_datetime(scheduled_at)
    if scheduled is None:
        return {"arrival_status": "time_recorded", "minutes_from_start": None}
    minutes = int((checked_in_at - scheduled).total_seconds() // 60)
    if minutes < -30:
        status = "early"
    elif minutes <= 15:
        status = "on_time_window"
    else:
        status = "late"
    return {"arrival_status": status, "minutes_from_start": minutes}


def open_meeting_attendance_session(
    db: Session,
    *,
    clan_id: int,
    meeting_id: str,
    actor_user_id: int,
    method: str = "qr",
    window_minutes: int = 120,
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
    normalized_method = _normalize_attendance_method(method)
    bounded_window = min(720, max(5, _safe_int(window_minutes, 120)))
    token = _attendance_token()
    session_id = _attendance_session_id(clan_id=int(clan_id), token=token)
    opened_at = _now_utc()
    expires_at = opened_at + timedelta(minutes=bounded_window)
    checkin_url = _meeting_attendance_checkin_url(
        clan_id=int(clan_id),
        meeting_id=str(meeting_id),
        token=token,
    )
    method_label = normalized_method.replace("_", " ")
    strength = _attendance_strength(normalized_method)

    event = log_trust_event(
        db,
        event_type=COMMUNITY_MEETING_ATTENDANCE_SESSION_EVENT,
        clan_id=int(clan_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(actor_user_id),
        meta={
            "engine_version": COMMUNITY_MEETING_ENGINE_VERSION,
            "source": COMMUNITY_MEETING_SOURCE,
            "reason": "community_meeting_attendance_session_opened",
            "meeting_id": str(meeting_id),
            "title": reminder_record["title"],
            "purpose": reminder_record["purpose"],
            "scheduled_at": reminder_record["scheduled_at"],
            "attendance_session_id": session_id,
            "attendance_token": token,
            "attendance_method": normalized_method,
            "attendance_method_label": method_label,
            "attendance_checkin_url": checkin_url,
            "attendance_window_minutes": int(bounded_window),
            "attendance_opened_at": _iso(opened_at),
            "attendance_expires_at": _iso(expires_at),
            "capture_method": normalized_method,
            "evidence_strength": strength,
            "presence_evidence": True,
            "attendance_confirmation": False,
            "automatic_bluetooth_scan": False,
            "privacy_boundary": "Presence Evidence only. This is not a trust score, location tracker, or proof of contribution.",
            "trust_delta": "0.00",
            "note": _safe_str(note),
        },
        dedupe_key=f"community-meeting-attendance-session:{meeting_id}:{token}",
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(event)
    record = _event_to_record(event)
    return {
        "attendance_session": {
            "event_id": int(event.id),
            "meeting_id": str(meeting_id),
            "attendance_session_id": record["attendance_session_id"],
            "method": normalized_method,
            "method_label": method_label,
            "evidence_strength": strength,
            "checkin_url": checkin_url,
            "attendance_token": token,
            "expires_at": _iso(expires_at),
            "window_minutes": int(bounded_window),
            "automatic_bluetooth_scan": False,
        },
        "message": "Attendance check-in is open. Members can scan the QR or use the link during the active window.",
    }


def record_meeting_attendance_checkin(
    db: Session,
    *,
    clan_id: int,
    meeting_id: str,
    actor_user_id: int,
    attendance_token: str,
    method: str = "qr",
    note: Optional[str] = None,
) -> Dict[str, Any]:
    reminder = _find_reminder_event(
        db,
        clan_id=int(clan_id),
        meeting_id=str(meeting_id),
    )
    if not reminder:
        raise ValueError("Meeting reminder record was not found")
    if not _safe_str(attendance_token):
        raise ValueError("Attendance token is required")

    session = _find_attendance_session_event(
        db,
        clan_id=int(clan_id),
        meeting_id=str(meeting_id),
        attendance_token=str(attendance_token),
        active_only=True,
    )
    if not session:
        raise ValueError("Attendance check-in is closed or invalid")

    existing = _find_existing_attendance_checkin(
        db,
        clan_id=int(clan_id),
        meeting_id=str(meeting_id),
        user_id=int(actor_user_id),
    )
    if existing:
        return {
            "attendance_checkin": _event_to_record(existing),
            "already_recorded": True,
            "message": "Attendance was already recorded for this meeting.",
        }

    reminder_record = _event_to_record(reminder)
    session_record = _event_to_record(session)
    session_method = _normalize_attendance_method(session_record.get("attendance_method"))
    requested_method = _normalize_attendance_method(method)
    if requested_method == session_method:
        normalized_method = session_method
    elif session_method == "bluetooth_proximity" and requested_method == "qr":
        normalized_method = "qr"
    else:
        raise ValueError("Attendance method does not match the active attendance window")
    checked_in_at = _now_utc()
    arrival = _arrival_status(
        scheduled_at=reminder_record.get("scheduled_at"),
        checked_in_at=checked_in_at,
    )
    strength = _attendance_strength(normalized_method)

    event = log_trust_event(
        db,
        event_type=COMMUNITY_MEETING_ATTENDANCE_CHECKIN_EVENT,
        clan_id=int(clan_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(actor_user_id),
        meta={
            "engine_version": COMMUNITY_MEETING_ENGINE_VERSION,
            "source": COMMUNITY_MEETING_SOURCE,
            "reason": "community_meeting_attendance_checkin_recorded",
            "meeting_id": str(meeting_id),
            "title": reminder_record["title"],
            "purpose": reminder_record["purpose"],
            "scheduled_at": reminder_record["scheduled_at"],
            "attendance_session_event_id": int(session.id),
            "attendance_session_id": session_record.get("attendance_session_id"),
            "attendance_method": normalized_method,
            "attendance_method_label": normalized_method.replace("_", " "),
            "checked_in_at": _iso(checked_in_at),
            "checked_in_user_id": int(actor_user_id),
            "capture_method": normalized_method,
            "evidence_strength": strength,
            "presence_evidence": True,
            "attendance_confirmation": True,
            "automatic_bluetooth_scan": False,
            "privacy_boundary": "Presence Evidence only. This is not a trust score, location tracker, or proof of contribution.",
            "trust_delta": "0.00",
            "note": _safe_str(note),
            **arrival,
        },
        dedupe_key=f"community-meeting-attendance-checkin:{meeting_id}:{int(actor_user_id)}",
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(event)
    return {
        "attendance_checkin": _event_to_record(event),
        "already_recorded": False,
        "message": "Attendance recorded with check-in time. This is Presence Evidence, not a trust score.",
    }


def record_meeting_interest(
    db: Session,
    *,
    clan_id: int,
    meeting_id: str,
    actor_user_id: int,
    response: str,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    reminder = _find_reminder_event(
        db,
        clan_id=int(clan_id),
        meeting_id=str(meeting_id),
    )
    if not reminder:
        raise ValueError("Meeting reminder record was not found")

    normalized_response = _safe_str(response).lower()
    if normalized_response not in COMMUNITY_MEETING_INTEREST_RESPONSES:
        raise ValueError("Meeting interest response must be yes, no, or maybe")

    reminder_record = _event_to_record(reminder)
    action_url = _meeting_action_url(clan_id=int(clan_id), meeting_id=str(meeting_id))
    event = log_trust_event(
        db,
        event_type=COMMUNITY_MEETING_INTEREST_EVENT,
        clan_id=int(clan_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(actor_user_id),
        meta={
            "engine_version": COMMUNITY_MEETING_ENGINE_VERSION,
            "source": COMMUNITY_MEETING_SOURCE,
            "reason": "community_meeting_interest_recorded",
            "meeting_id": str(meeting_id),
            "title": reminder_record["title"],
            "purpose": reminder_record["purpose"],
            "scheduled_at": reminder_record["scheduled_at"],
            "interest_response": normalized_response,
            "interest_note": _safe_str(note),
            "responder_user_id": int(actor_user_id),
            "action_url": action_url,
            "package_feature_code": FEATURE_COMMUNITY_MEETING_PACK,
            "package_consumed": False,
            "planning_signal": True,
            "attendance_confirmation": False,
            "trust_delta": "0.00",
        },
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(event)

    meetings = list_community_meetings(
        db,
        clan_id=int(clan_id),
        limit=20,
        viewer_user_id=int(actor_user_id),
    )
    meeting = next(
        (item for item in meetings if _safe_str(item.get("meeting_id")) == str(meeting_id)),
        {**reminder_record, "meeting_id": str(meeting_id)},
    )
    return {
        "meeting": meeting,
        "message": "Meeting interest recorded. This helps the community plan; it is not final attendance.",
    }

def list_community_meetings(
    db: Session,
    *,
    clan_id: int,
    limit: int = 20,
    viewer_user_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.clan_id == int(clan_id),
            TrustEvent.event_type.in_(
                [
                    COMMUNITY_MEETING_REMINDER_EVENT,
                    COMMUNITY_MEETING_SUMMARY_EVENT,
                    COMMUNITY_MEETING_INTEREST_EVENT,
                    COMMUNITY_MEETING_ATTENDANCE_SESSION_EVENT,
                    COMMUNITY_MEETING_ATTENDANCE_CHECKIN_EVENT,
                ]
            ),
        )
        .order_by(TrustEvent.id.desc())
        .limit(max(1, int(limit or 20)) * 12)
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
        elif row.event_type == COMMUNITY_MEETING_INTEREST_EVENT:
            responder_id = _safe_int(record.get("responder_user_id"), 0)
            response = _safe_str(record.get("interest_response")).lower()
            if responder_id > 0 and response in COMMUNITY_MEETING_INTEREST_RESPONSES:
                latest_by_user = current.setdefault("_interest_latest_by_user", {})
                existing = latest_by_user.get(responder_id)
                existing_id = _safe_int(existing.get("event_id"), 0) if isinstance(existing, dict) else 0
                if int(row.id) >= existing_id:
                    latest_by_user[responder_id] = {
                        "event_id": int(row.id),
                        "response": response,
                        "created_at": record.get("created_at"),
                    }
        elif row.event_type == COMMUNITY_MEETING_ATTENDANCE_SESSION_EVENT:
            sessions = current.setdefault("_attendance_sessions", [])
            sessions.append({**record, "event_id": int(row.id)})
        elif row.event_type == COMMUNITY_MEETING_ATTENDANCE_CHECKIN_EVENT:
            checked_user_id = _safe_int(record.get("checked_in_user_id"), 0)
            if checked_user_id > 0:
                checkins = current.setdefault("_attendance_checkins_by_user", {})
                existing = checkins.get(checked_user_id)
                existing_id = _safe_int(existing.get("event_id"), 0) if isinstance(existing, dict) else 0
                if not existing or int(row.id) <= existing_id:
                    checkins[checked_user_id] = {**record, "event_id": int(row.id)}
        grouped[mid] = current

    meetings = list(grouped.values())
    for item in meetings:
        latest_by_user = item.pop("_interest_latest_by_user", {})
        counts = {"yes": 0, "no": 0, "maybe": 0}
        own_response = None
        if isinstance(latest_by_user, dict):
            for raw_user_id, response_record in latest_by_user.items():
                response = (
                    _safe_str(response_record.get("response")).lower()
                    if isinstance(response_record, dict)
                    else ""
                )
                if response not in counts:
                    continue
                counts[response] += 1
                if viewer_user_id is not None and _safe_int(raw_user_id, 0) == int(viewer_user_id):
                    own_response = response
        item["interest_summary"] = {
            "yes": counts["yes"],
            "no": counts["no"],
            "maybe": counts["maybe"],
            "total": counts["yes"] + counts["no"] + counts["maybe"],
            "own_response": own_response,
            "planning_ready": counts["yes"] + counts["maybe"] > 0,
        }

        attendance_sessions = item.pop("_attendance_sessions", [])
        attendance_checkins = item.pop("_attendance_checkins_by_user", {})
        method_counts: Dict[str, int] = {}
        checked_in_user_ids: List[int] = []
        latest_checkin_at = ""
        checkin_records: List[Dict[str, Any]] = []
        if isinstance(attendance_checkins, dict):
            for raw_user_id, checkin in attendance_checkins.items():
                if not isinstance(checkin, dict):
                    continue
                checked_in_user_ids.append(_safe_int(raw_user_id, 0))
                method = _normalize_attendance_method(checkin.get("attendance_method"))
                method_counts[method] = method_counts.get(method, 0) + 1
                checked_in_at = _safe_str(checkin.get("checked_in_at") or checkin.get("created_at"))
                if checked_in_at and checked_in_at > latest_checkin_at:
                    latest_checkin_at = checked_in_at
                checkin_records.append(
                    {
                        "event_id": checkin.get("event_id"),
                        "user_id": _safe_int(raw_user_id, 0),
                        "checked_in_at": checked_in_at,
                        "method": method,
                        "arrival_status": _safe_str(checkin.get("arrival_status")),
                        "minutes_from_start": checkin.get("minutes_from_start"),
                        "evidence_strength": _safe_str(checkin.get("evidence_strength")),
                    }
                )
        active_session = None
        now = _now_utc()
        if isinstance(attendance_sessions, list):
            ordered_sessions = sorted(
                [session for session in attendance_sessions if isinstance(session, dict)],
                key=lambda session: _safe_int(session.get("event_id"), 0),
                reverse=True,
            )
            for session in ordered_sessions:
                expires_at = _parse_iso_datetime(session.get("attendance_expires_at"))
                if expires_at is not None and expires_at <= now:
                    continue
                active_session = {
                    "event_id": session.get("event_id"),
                    "attendance_session_id": session.get("attendance_session_id"),
                    "method": _normalize_attendance_method(session.get("attendance_method")),
                    "method_label": _safe_str(session.get("attendance_method_label")),
                    "evidence_strength": _safe_str(session.get("evidence_strength")),
                    "checkin_url": _safe_str(session.get("attendance_checkin_url")),
                    "attendance_token": _safe_str(session.get("attendance_token")),
                    "expires_at": session.get("attendance_expires_at"),
                    "window_minutes": session.get("attendance_window_minutes"),
                    "automatic_bluetooth_scan": bool(session.get("automatic_bluetooth_scan")),
                }
                break
        item["attendance_summary"] = {
            "checkin_count": len([user_id for user_id in checked_in_user_ids if user_id > 0]),
            "checked_in_user_ids": [user_id for user_id in checked_in_user_ids if user_id > 0],
            "latest_checkin_at": latest_checkin_at or None,
            "method_counts": method_counts,
            "checkins": sorted(checkin_records, key=lambda row: _safe_str(row.get("checked_in_at"))),
            "active_session": active_session,
            "presence_evidence_boundary": "Attendance is Presence Evidence only. It records showing up, method, and time; it is not a trust score or proof of contribution.",
        }
    meetings.sort(key=lambda item: _safe_int(item.get("summary_event_id") or item.get("reminder_event_id") or item.get("event_id")), reverse=True)
    return meetings[: max(1, int(limit or 20))]
