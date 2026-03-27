from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.db.notification_models import Notification


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def create_notification(
    db: Session,
    *,
    user_id: int,
    kind: str,
    title: str,
    message: str,
    action_url: str | None = None,
    action_label: str | None = None,
    commit: bool = True,
    refresh: bool = True,
) -> Notification:
    row = Notification(
        user_id=int(user_id),
        kind=str(kind),
        title=str(title),
        message=str(message),
        action_url=action_url,
        action_label=action_label,
        is_read=False,
        created_at=_now_utc(),
        read_at=None,
    )
    db.add(row)

    if commit:
        db.commit()
        if refresh:
            db.refresh(row)

    return row


def list_my_notifications(
    db: Session,
    *,
    user_id: int,
    limit: int = 50,
    unread_only: bool = False,
) -> Dict[str, Any]:
    q = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .order_by(Notification.id.desc())
    )

    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712

    rows = q.limit(int(max(1, min(limit, 200)))).all()

    return {
        "items": [
            {
                "id": int(r.id),
                "kind": str(r.kind),
                "title": str(r.title),
                "message": str(r.message),
                "action_url": r.action_url,
                "action_label": r.action_label,
                "is_read": bool(r.is_read),
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "read_at": r.read_at.isoformat() if r.read_at else None,
            }
            for r in rows
        ],
        "total": len(rows),
    }


def get_unread_count(
    db: Session,
    *,
    user_id: int,
) -> Dict[str, Any]:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .filter(Notification.is_read == False)  # noqa: E712
        .count()
    )
    return {
        "user_id": int(user_id),
        "unread_count": int(count),
    }


def mark_notification_read(
    db: Session,
    *,
    user_id: int,
    notification_id: int,
) -> Notification:
    row = (
        db.query(Notification)
        .filter(Notification.user_id == int(user_id))
        .filter(Notification.id == int(notification_id))
        .first()
    )
    if not row:
        raise LookupError("Notification not found")

    if not row.is_read:
        row.is_read = True
        row.read_at = _now_utc()
        db.add(row)
        db.commit()
        db.refresh(row)

    return row


def seed_assistance_notifications(
    db: Session,
    *,
    user_id: int,
) -> Dict[str, Any]:
    created_ids: List[int] = []

    samples = [
        {
            "kind": "assistant.nudge",
            "title": "Build your future gradually",
            "message": "You did well showing up today. Would you like to put a little aside for your future?",
            "action_url": "/app/payment/pool?currency=NGN",
            "action_label": "Deposit to Pool",
        },
        {
            "kind": "assistant.reminder",
            "title": "Check pending support actions",
            "message": "If you have a pending request, responding early helps your community move forward.",
            "action_url": "/app/loans",
            "action_label": "Open Finances",
        },
        {
            "kind": "assistant.trust",
            "title": "Consistency strengthens trust",
            "message": "Regular contributions and timely responses can improve how your community sees your reliability.",
            "action_url": "/app/trust",
            "action_label": "View Trust",
        },
    ]

    for item in samples:
        row = create_notification(
            db,
            user_id=int(user_id),
            kind=item["kind"],
            title=item["title"],
            message=item["message"],
            action_url=item["action_url"],
            action_label=item["action_label"],
        )
        created_ids.append(int(row.id))

    return {"ok": True, "created_ids": created_ids}