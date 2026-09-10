from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import Clan, ClanMembership, TrustEvent, User
from app.db.notification_models import Notification
from app.services.community_meeting_service import list_community_meetings
from app.services.notification_service import (
    ensure_join_review_notifications,
    normalize_notification_action,
)


ATTENTION_SPINE_VERSION = "attention_spine_v1"
ATTENTION_COMMUNITY_NOTICE_EVENT = "community.notice.posted"
ATTENTION_MEETING_EVENT_ROUTE = "#shop-control-community-packages"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    text = str(value or "").replace("\r", " ").replace("\n", " ").strip()
    return text if text else default


def _safe_meta(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if not raw:
        return {}
    try:
        parsed = json.loads(str(raw))
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _to_utc(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = _safe_str(value)
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except Exception:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _iso(value: Any) -> Optional[str]:
    parsed = _to_utc(value)
    return parsed.isoformat() if parsed else None


def attention_urgency_from_datetime(
    value: Any,
    *,
    now: Optional[datetime] = None,
) -> Dict[str, str]:
    due = _to_utc(value)
    if due is None:
        return {"urgency": "green", "label": "No set date"}

    current = now or _now_utc()
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    current = current.astimezone(timezone.utc)
    diff_days = (due.date() - current.date()).days

    if diff_days <= 1:
        return {"urgency": "red", "label": "Due now"}
    if diff_days <= 3:
        return {"urgency": "yellow", "label": "Due within 72 hours"}
    return {"urgency": "green", "label": "Still ahead"}


def _signal_weight(signal: Dict[str, Any]) -> int:
    try:
        weight = int(signal.get("weight") or 1)
    except Exception:
        weight = 1
    return max(1, weight)


def _urgency_rank(value: str) -> int:
    return {"red": 0, "yellow": 1, "green": 2}.get(_safe_str(value), 3)


def _build_summary(signals: List[Dict[str, Any]]) -> Dict[str, Any]:
    clean_signals = [
        signal
        for signal in signals
        if _safe_str(signal.get("id")) and _safe_str(signal.get("summary"))
    ]
    clean_signals.sort(
        key=lambda signal: (
            _urgency_rank(_safe_str(signal.get("urgency"))),
            0 if _safe_str(signal.get("kind")) == "action" else 1,
            -int(signal.get("sortBoost") or 0),
        )
    )

    counts = {"red": 0, "yellow": 0, "green": 0}
    work_count = 0
    for signal in clean_signals:
        urgency = _safe_str(signal.get("urgency"), "green")
        if urgency not in counts:
            urgency = "green"
        if signal.get("countInPulse") is not False:
            counts[urgency] += _signal_weight(signal)
        if _safe_str(signal.get("kind")) == "action":
            work_count += _signal_weight(signal)

    next_signal = None
    for signal in clean_signals:
        if _safe_str(signal.get("actionTo")) and _safe_str(signal.get("urgency")) != "green":
            next_signal = signal
            break
    if next_signal is None:
        for signal in clean_signals:
            if _safe_str(signal.get("actionTo")):
                next_signal = signal
                break

    if counts["red"] > 0:
        headline = f"{counts['red']} urgent"
    elif counts["yellow"] > 0:
        headline = f"{counts['yellow']} due soon"
    elif counts["green"] > 0:
        headline = "Pulse steady"
    else:
        headline = "No live signal"

    detail = (
        _safe_str(next_signal.get("detail"))
        if next_signal
        else "No urgent server-owned follow-up."
    )

    return {
        "signals": clean_signals,
        "counts": counts,
        "headline": headline,
        "detail": detail,
        "workCount": int(work_count),
        "nextSignal": next_signal,
    }


def _active_memberships(
    db: Session,
    *,
    current_user: User,
    clan_id: Optional[int],
) -> List[ClanMembership]:
    is_platform_admin = _safe_str(getattr(current_user, "role", "")).lower() == "admin"
    query = db.query(ClanMembership).filter(
        ClanMembership.user_id == int(current_user.id),
        ClanMembership.left_at.is_(None),
    )
    if clan_id:
        query = query.filter(ClanMembership.clan_id == int(clan_id))
    rows = query.order_by(ClanMembership.clan_id.asc()).limit(100).all()
    if rows or not clan_id or not is_platform_admin:
        return rows
    clan = db.get(Clan, int(clan_id))
    if clan is None:
        return []
    return [
        ClanMembership(
            clan_id=int(clan_id),
            user_id=int(current_user.id),
            role="admin",
        )
    ]


def _notification_urgency(row: Notification) -> str:
    text = " ".join(
        [
            _safe_str(getattr(row, "kind", "")),
            _safe_str(getattr(row, "title", "")),
            _safe_str(getattr(row, "message", "")),
            _safe_str(getattr(row, "action_url", "")),
            _safe_str(getattr(row, "action_label", "")),
        ]
    ).lower()
    if any(
        marker in text
        for marker in (
            "approval",
            "review",
            "join request",
            "urgent",
            "overdue",
            "expired",
            "respond",
        )
    ):
        return "red"
    return "yellow"


def _notification_signals(db: Session, *, user_id: int, limit: int) -> List[Dict[str, Any]]:
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .filter(Notification.is_read == False)  # noqa: E712
        .order_by(Notification.id.desc())
        .limit(max(1, min(int(limit), 50)))
        .all()
    )
    signals: List[Dict[str, Any]] = []
    for row in rows:
        action_url, action_label = normalize_notification_action(
            kind=row.kind,
            title=row.title,
            message=row.message,
            action_url=row.action_url,
            action_label=row.action_label,
        )
        signals.append(
            {
                "id": f"notification:{int(row.id)}",
                "source": "action_inbox",
                "scope": "personal",
                "kind": "action",
                "urgency": _notification_urgency(row),
                "summary": _safe_str(row.title, "Unread Action Inbox item"),
                "detail": _safe_str(row.message, "A GSN item needs your attention."),
                "actionLabel": _safe_str(action_label, "Open Action Inbox"),
                "actionTo": _safe_str(action_url, "/app/notifications"),
                "groupLabel": "Action Inbox item",
                "sortBoost": 20,
                "meta": {
                    "notificationId": int(row.id),
                    "notificationKind": _safe_str(row.kind),
                    "createdAt": _iso(row.created_at),
                },
            }
        )
    return signals


def _notice_due_value(meta: Dict[str, Any], created_at: Any) -> Any:
    return meta.get("scheduled_at") or meta.get("event_at") or meta.get("expires_at") or created_at


def _notice_signals(
    db: Session,
    *,
    clan_ids: List[int],
    now: datetime,
    limit: int,
) -> List[Dict[str, Any]]:
    if not clan_ids:
        return []
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.clan_id.in_(clan_ids))
        .filter(TrustEvent.event_type == ATTENTION_COMMUNITY_NOTICE_EVENT)
        .order_by(TrustEvent.id.desc())
        .limit(max(20, min(int(limit) * 4, 120)))
        .all()
    )
    clan_names = {
        int(clan.id): _safe_str(clan.name, f"Community {int(clan.id)}")
        for clan in db.query(Clan).filter(Clan.id.in_(clan_ids)).all()
    }
    signals: List[Dict[str, Any]] = []
    for row in rows:
        meta = _safe_meta(getattr(row, "meta_json", None))
        expires_at = _to_utc(meta.get("expires_at"))
        if expires_at is not None and expires_at <= now:
            continue
        clan_id = int(getattr(row, "clan_id", 0) or 0)
        due_value = _notice_due_value(meta, getattr(row, "created_at", None))
        due = attention_urgency_from_datetime(due_value, now=now)
        action_to = f"/app/community?clan_id={clan_id}#community-bulletin"
        signals.append(
            {
                "id": f"bulletin:{int(row.id)}",
                "source": "bulletin",
                "scope": "community",
                "kind": "condition",
                "urgency": due["urgency"],
                "summary": _safe_str(meta.get("title") or meta.get("body"), "Community notice"),
                "detail": f"{clan_names.get(clan_id, 'Community')} notice - {due['label']}.",
                "actionLabel": "Open Community Bulletin",
                "actionTo": action_to,
                "groupLabel": "community notice",
                "sortBoost": 6,
                "meta": {
                    "noticeEventId": int(row.id),
                    "clanId": clan_id,
                    "dueAt": _iso(due_value),
                    "createdAt": _iso(getattr(row, "created_at", None)),
                },
            }
        )
    return signals[: max(1, min(int(limit), 50))]


def _meeting_signals(
    db: Session,
    *,
    memberships: List[ClanMembership],
    user_id: int,
    now: datetime,
    limit: int,
) -> List[Dict[str, Any]]:
    signals: List[Dict[str, Any]] = []
    for membership in memberships[:20]:
        clan_id = int(membership.clan_id)
        meetings = list_community_meetings(
            db,
            clan_id=clan_id,
            limit=8,
            viewer_user_id=int(user_id),
        )
        for meeting in meetings:
            if _safe_str(meeting.get("status")) == "summary_recorded":
                continue
            scheduled_at = _to_utc(meeting.get("scheduled_at"))
            urgency = attention_urgency_from_datetime(scheduled_at, now=now)
            interest = meeting.get("interest_summary")
            own_response = (
                _safe_str(interest.get("own_response"))
                if isinstance(interest, dict)
                else ""
            )
            action_url = _safe_str(
                meeting.get("action_url"),
                f"/app/shop-control?clan_id={clan_id}{ATTENTION_MEETING_EVENT_ROUTE}",
            )
            signals.append(
                {
                    "id": f"meeting:{clan_id}:{_safe_str(meeting.get('meeting_id'))}",
                    "source": "meeting",
                    "scope": "community",
                    "kind": "action" if not own_response else "condition",
                    "urgency": urgency["urgency"],
                    "summary": _safe_str(meeting.get("title"), "Community meeting"),
                    "detail": (
                        "Your meeting response is still needed."
                        if not own_response
                        else f"Meeting response recorded: {own_response}."
                    ),
                    "actionLabel": "Open Meeting Pack",
                    "actionTo": action_url,
                    "groupLabel": "meeting response" if not own_response else "meeting update",
                    "sortBoost": 10 if not own_response else 4,
                    "countInPulse": not bool(own_response),
                    "meta": {
                        "meetingId": _safe_str(meeting.get("meeting_id")),
                        "clanId": clan_id,
                        "scheduledAt": _iso(scheduled_at),
                    },
                }
            )
            if len(signals) >= max(1, min(int(limit), 50)):
                return signals
    return signals


def get_my_attention_spine(
    db: Session,
    *,
    current_user: User,
    clan_id: Optional[int] = None,
    limit: int = 30,
) -> Dict[str, Any]:
    ensure_join_review_notifications(db, reviewer_user=current_user)
    now = _now_utc()
    memberships = _active_memberships(db, current_user=current_user, clan_id=clan_id)
    clan_ids = list(dict.fromkeys(int(row.clan_id) for row in memberships if int(row.clan_id or 0) > 0))

    signals = []
    signals.extend(_notification_signals(db, user_id=int(current_user.id), limit=limit))
    signals.extend(_notice_signals(db, clan_ids=clan_ids, now=now, limit=limit))
    signals.extend(
        _meeting_signals(
            db,
            memberships=memberships,
            user_id=int(current_user.id),
            now=now,
            limit=limit,
        )
    )

    summary = _build_summary(signals)
    summary["signals"] = summary["signals"][: max(1, min(int(limit), 50))]
    return {
        "ok": True,
        "engineReady": True,
        "version": ATTENTION_SPINE_VERSION,
        "userId": int(current_user.id),
        "clanId": int(clan_id) if clan_id else None,
        "readClanIds": clan_ids,
        "sourceStatus": {
            "actionInbox": "server",
            "communityBulletin": "server",
            "meetingPack": "server",
            "focusCommitments": "frontend_local_until_persistence_contract",
            "marketWisdom": "frontend_contextual_until_personalization_contract",
        },
        "summary": summary,
        "signals": summary["signals"],
        "boundary": (
            "Attention Spine is a read-only summary of existing GSN records. "
            "It does not create a second inbox, send WhatsApp messages, move money, "
            "or turn local Focus Commitments into server evidence yet."
        ),
    }
