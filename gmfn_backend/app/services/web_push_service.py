from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.notification_models import Notification, WebPushSubscription

try:  # pragma: no cover - exercised through monkeypatchable wrapper in tests
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover - pywebpush is optional until env is configured
    WebPushException = Exception  # type: ignore[assignment]
    webpush = None  # type: ignore[assignment]


WEB_PUSH_NOTIFICATION_KINDS = {
    "community.notice.posted",
    "community_domain.notice.posted",
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any) -> str:
    return str(value or "").strip()


def _env_first(*names: str) -> str:
    for name in names:
        value = _safe_str(os.getenv(name))
        if value:
            return value
    return ""


def web_push_public_key() -> str:
    return _env_first("GSN_WEB_PUSH_PUBLIC_KEY", "VAPID_PUBLIC_KEY")


def web_push_private_key() -> str:
    return _env_first("GSN_WEB_PUSH_PRIVATE_KEY", "VAPID_PRIVATE_KEY")


def web_push_subject() -> str:
    return (
        _env_first("GSN_WEB_PUSH_SUBJECT", "VAPID_SUBJECT")
        or "mailto:support@globalmutualfundsnetwork.com"
    )


def web_push_runtime_status() -> dict[str, Any]:
    public_key = web_push_public_key()
    private_key = web_push_private_key()
    return {
        "supported": True,
        "configured": bool(public_key and private_key and webpush is not None),
        "public_key": public_key or None,
        "sender_available": webpush is not None,
        "allowed_kinds": sorted(WEB_PUSH_NOTIFICATION_KINDS),
        "truth": (
            "Web Push can wake supported installed browsers/PWAs after permission is granted. "
            "It is still controlled by browser, operating-system, and device rules."
        ),
    }


def _endpoint_hash(endpoint: str) -> str:
    return hashlib.sha256(endpoint.encode("utf-8")).hexdigest()


def _subscription_payload(row: WebPushSubscription) -> dict[str, Any]:
    return {
        "endpoint": row.endpoint,
        "keys": {
            "p256dh": row.p256dh,
            "auth": row.auth,
        },
    }


def upsert_web_push_subscription(
    db: Session,
    *,
    user_id: int,
    endpoint: str,
    p256dh: str,
    auth: str,
    user_agent: str | None = None,
    permission_state: str | None = None,
) -> WebPushSubscription:
    endpoint = _safe_str(endpoint)
    p256dh = _safe_str(p256dh)
    auth = _safe_str(auth)
    if not endpoint.startswith(("https://", "http://")):
        raise ValueError("A valid push endpoint is required.")
    if not p256dh or not auth:
        raise ValueError("Push subscription keys are required.")

    endpoint_hash = _endpoint_hash(endpoint)
    row = (
        db.query(WebPushSubscription)
        .filter(WebPushSubscription.endpoint_hash == endpoint_hash)
        .first()
    )
    if row is None:
        row = WebPushSubscription(
            user_id=int(user_id),
            endpoint_hash=endpoint_hash,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            user_agent=_safe_str(user_agent)[:255] or None,
            permission_state=_safe_str(permission_state)[:24] or None,
            is_active=True,
            failure_count=0,
            created_at=_now_utc(),
            updated_at=_now_utc(),
        )
        db.add(row)
    else:
        row.user_id = int(user_id)
        row.endpoint = endpoint
        row.p256dh = p256dh
        row.auth = auth
        row.user_agent = _safe_str(user_agent)[:255] or None
        row.permission_state = _safe_str(permission_state)[:24] or None
        row.is_active = True
        row.updated_at = _now_utc()

    db.commit()
    db.refresh(row)
    return row


def deactivate_web_push_subscription(
    db: Session,
    *,
    user_id: int,
    endpoint: str,
) -> bool:
    endpoint = _safe_str(endpoint)
    if not endpoint:
        return False
    row = (
        db.query(WebPushSubscription)
        .filter(WebPushSubscription.user_id == int(user_id))
        .filter(WebPushSubscription.endpoint_hash == _endpoint_hash(endpoint))
        .first()
    )
    if row is None:
        return False
    row.is_active = False
    row.updated_at = _now_utc()
    db.commit()
    return True


def active_web_push_subscription_count(db: Session, *, user_id: int) -> int:
    return int(
        db.query(WebPushSubscription)
        .filter(WebPushSubscription.user_id == int(user_id))
        .filter(WebPushSubscription.is_active.is_(True))
        .count()
    )


def notification_web_push_payload(notification: Notification) -> dict[str, Any]:
    action_url = _safe_str(notification.action_url) or "/app/notifications"
    return {
        "source": "gsn-web-push",
        "notification_id": int(notification.id or 0),
        "kind": _safe_str(notification.kind),
        "title": _safe_str(notification.title) or "GSN notification",
        "body": _safe_str(notification.message),
        "action_url": action_url,
        "action_label": _safe_str(notification.action_label) or "Open",
    }


def _send_web_push_payload(
    *,
    subscription_info: dict[str, Any],
    payload: dict[str, Any],
) -> None:
    if webpush is None:
        raise RuntimeError("pywebpush is not installed.")
    webpush(
        subscription_info=subscription_info,
        data=json.dumps(payload, separators=(",", ":")),
        vapid_private_key=web_push_private_key(),
        vapid_claims={"sub": web_push_subject()},
    )


def _web_push_exception_status(exc: BaseException) -> int:
    response = getattr(exc, "response", None)
    status_code = getattr(response, "status_code", None)
    try:
        return int(status_code or 0)
    except Exception:
        return 0


def dispatch_web_push_for_notification(
    db: Session,
    notification: Notification,
) -> dict[str, Any]:
    kind = _safe_str(getattr(notification, "kind", ""))
    if kind not in WEB_PUSH_NOTIFICATION_KINDS:
        return {"attempted": 0, "sent": 0, "skipped": "kind_not_allowed"}

    status = web_push_runtime_status()
    if not status["configured"]:
        return {"attempted": 0, "sent": 0, "skipped": "web_push_not_configured"}

    rows = (
        db.query(WebPushSubscription)
        .filter(WebPushSubscription.user_id == int(notification.user_id))
        .filter(WebPushSubscription.is_active.is_(True))
        .order_by(WebPushSubscription.id.asc())
        .all()
    )
    if not rows:
        return {"attempted": 0, "sent": 0, "skipped": "no_active_subscription"}

    payload = notification_web_push_payload(notification)
    attempted = 0
    sent = 0
    deactivated = 0
    for row in rows:
        attempted += 1
        try:
            _send_web_push_payload(
                subscription_info=_subscription_payload(row),
                payload=payload,
            )
            row.last_success_at = _now_utc()
            row.updated_at = _now_utc()
            row.failure_count = 0
            sent += 1
        except Exception as exc:
            row.last_failure_at = _now_utc()
            row.updated_at = _now_utc()
            row.failure_count = int(row.failure_count or 0) + 1
            status_code = _web_push_exception_status(exc)
            if status_code in {404, 410} or row.failure_count >= 5:
                row.is_active = False
                deactivated += 1

    db.commit()
    return {
        "attempted": attempted,
        "sent": sent,
        "deactivated": deactivated,
    }


def dispatch_web_push_for_notifications(
    db: Session,
    notifications: list[Notification],
) -> dict[str, Any]:
    totals = {"attempted": 0, "sent": 0, "deactivated": 0}
    for notification in notifications:
        result = dispatch_web_push_for_notification(db, notification)
        for key in totals:
            totals[key] += int(result.get(key) or 0)
    return totals
