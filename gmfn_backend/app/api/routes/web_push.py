from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.web_push_service import (
    active_web_push_subscription_count,
    deactivate_web_push_subscription,
    upsert_web_push_subscription,
    web_push_runtime_status,
)

router = APIRouter(prefix="/web-push", tags=["web-push"])


def _safe_str(value: Any) -> str:
    return str(value or "").strip()


class WebPushKeysIn(BaseModel):
    p256dh: str = Field(..., min_length=8)
    auth: str = Field(..., min_length=4)

    @field_validator("p256dh", "auth", mode="before")
    @classmethod
    def _reject_non_text(cls, value: Any, info: Any) -> Any:
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text.")
        return value


class WebPushSubscriptionIn(BaseModel):
    endpoint: str = Field(..., min_length=8)
    keys: WebPushKeysIn
    permission_state: str | None = Field(default=None, max_length=24)

    @field_validator("endpoint", "permission_state", mode="before")
    @classmethod
    def _reject_non_text_optional(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text.")
        return value


class WebPushUnsubscribeIn(BaseModel):
    endpoint: str = Field(..., min_length=8)

    @field_validator("endpoint", mode="before")
    @classmethod
    def _reject_non_text(cls, value: Any) -> Any:
        if not isinstance(value, str):
            raise ValueError("endpoint must be text.")
        return value


@router.get("/status")
def web_push_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    status = web_push_runtime_status()
    return {
        "ok": True,
        **status,
        "active_subscriptions": active_web_push_subscription_count(
            db,
            user_id=int(current_user.id),
        ),
    }


@router.post("/subscriptions")
def register_web_push_subscription(
    payload: WebPushSubscriptionIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        row = upsert_web_push_subscription(
            db,
            user_id=int(current_user.id),
            endpoint=_safe_str(payload.endpoint),
            p256dh=_safe_str(payload.keys.p256dh),
            auth=_safe_str(payload.keys.auth),
            user_agent=request.headers.get("user-agent"),
            permission_state=_safe_str(payload.permission_state) or None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        "ok": True,
        "subscription_id": int(row.id),
        "active_subscriptions": active_web_push_subscription_count(
            db,
            user_id=int(current_user.id),
        ),
        "message": "This device is registered for GSN Web Push delivery.",
    }


@router.delete("/subscriptions")
def unregister_web_push_subscription(
    payload: WebPushUnsubscribeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    removed = deactivate_web_push_subscription(
        db,
        user_id=int(current_user.id),
        endpoint=_safe_str(payload.endpoint),
    )
    return {
        "ok": True,
        "removed": bool(removed),
        "active_subscriptions": active_web_push_subscription_count(
            db,
            user_id=int(current_user.id),
        ),
    }
