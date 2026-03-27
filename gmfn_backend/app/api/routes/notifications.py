from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.notification_service import (
    get_unread_count,
    list_my_notifications,
    mark_notification_read,
    seed_assistance_notifications,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me")
def my_notifications(
    limit: int = Query(50, ge=1, le=200),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_my_notifications(
        db,
        user_id=int(current_user.id),
        limit=int(limit),
        unread_only=bool(unread_only),
    )


@router.get("/me/unread-count")
def my_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_unread_count(
        db,
        user_id=int(current_user.id),
    )


@router.post("/me/{notification_id}/read")
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        row = mark_notification_read(
            db,
            user_id=int(current_user.id),
            notification_id=int(notification_id),
        )
        return {
            "id": int(row.id),
            "is_read": bool(row.is_read),
            "read_at": row.read_at.isoformat() if row.read_at else None,
        }
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/me/seed-assistant")
def seed_my_assistant_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return seed_assistance_notifications(
        db,
        user_id=int(current_user.id),
    )
def create_notification(
    db,
    *,
    user_id: int,
    kind: str,
    title: str,
    message: str,
    action_url: str | None = None,
    action_label: str | None = None,
):
    from app.db.models import Notification
    from datetime import datetime, timezone

    row = Notification(
        user_id=user_id,
        kind=kind,
        title=title,
        message=message,
        action_url=action_url,
        action_label=action_label,
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )

    db.add(row)
    db.commit()
    db.refresh(row)
    return row    