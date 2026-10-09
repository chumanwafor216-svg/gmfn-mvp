from __future__ import annotations

import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.services.pipeline_credit_spend_gate import debit_provider_spend


PUBLIC_FRONTEND_ORIGIN = "https://gmfn-frontend.onrender.com"


def _safe_text(value: object, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def _frontend_origin() -> str:
    for key in ("FRONTEND_BASE_URL", "GMFN_FRONTEND_BASE_URL", "PUBLIC_FRONTEND_URL"):
        configured = _safe_text(os.getenv(key))
        if configured:
            return configured.rstrip("/")
    return PUBLIC_FRONTEND_ORIGIN


def _result_url(public_token: object) -> str:
    token = _safe_text(public_token)
    path = f"/community-confirmations/public/{token}"
    return f"{_frontend_origin()}{path}" if token else _frontend_origin()


def _delivery_mode() -> str:
    configured = _safe_text(os.getenv("GMFN_CONFIRMATION_CALLBACK_DELIVERY_MODE")).lower()
    webhook_url = _safe_text(os.getenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL"))
    if configured in {"preview", "manual"}:
        return "preview"
    if configured in {"webhook", "provider", "live"}:
        return "webhook"
    if webhook_url:
        return "webhook"
    return "off"


def _webhook_timeout_seconds() -> float:
    configured = _safe_text(os.getenv("GMFN_CONFIRMATION_CALLBACK_TIMEOUT_SECONDS"))
    if not configured:
        return 4.0
    try:
        return min(max(float(configured), 1.0), 15.0)
    except ValueError:
        return 4.0


def _build_message(
    *,
    channel: str,
    result_url: str,
    visible_summary: str,
    event: str,
    confidence: str,
) -> str:
    event_label = "expired" if event.endswith("expired") else "updated"
    channel_label = "WhatsApp" if channel == "whatsapp" else "SMS"
    return (
        f"GSN community confirmation {event_label}. "
        f"Current reading: {confidence or 'pending'}. "
        f"{visible_summary} Open result: {result_url} "
        f"Sent for {channel_label} return. The result link is the source of truth."
    )


def _webhook_spend_idempotency_key(*, event_key: str, channel: str) -> str:
    raw = f"{event_key}:{channel}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
    return f"provider-spend:community.callback_webhook:{digest}"


def _debit_callback_webhook_spend(
    db: Optional[Session],
    *,
    request: Any,
    event_key: str,
    event: str,
    channel: str,
) -> Dict[str, Any]:
    if db is None:
        return {
            "ok": False,
            "status": "blocked_missing_database_session",
            "note": "Callback webhook spend requires a database session so pipeline credits can be debited before delivery.",
        }

    workflow_key = "community.callback_webhook.delivery"
    gate_result = debit_provider_spend(
        db,
        provider_key="community.callback_webhook",
        workflow_key=workflow_key,
        idempotency_key=_webhook_spend_idempotency_key(event_key=event_key, channel=channel),
        reference_type="community_confirmation_callback",
        reference_id=str(getattr(request, "id", 0) or event_key),
        note="Community confirmation callback webhook provider delivery",
        clan_id=int(getattr(request, "community_id", 0) or 0) or None,
        user_id=int(getattr(request, "subject_user_id", 0) or 0) or None,
        meta={
            "event": event,
            "event_key": event_key,
            "channel": channel,
            "request_id": int(getattr(request, "id", 0) or 0),
        },
    )
    if not gate_result.ok:
        return {
            "ok": False,
            "status": gate_result.status,
            "note": gate_result.explanation,
            "pipeline_credit_gate": {
                "ok": False,
                "status": gate_result.status,
                "provider_key": gate_result.provider_key,
                "workflow_key": gate_result.workflow_key,
            },
        }
    return {
        "ok": True,
        "status": "debited",
        "pipeline_credit_gate": {
            "ok": True,
            "status": gate_result.status,
            "provider_key": gate_result.provider_key,
            "workflow_key": gate_result.workflow_key,
            "ledger_entry": gate_result.ledger_entry,
        },
    }

def _post_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    url = _safe_text(os.getenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL"))
    if not url:
        return {
            "ok": False,
            "status": "not_configured",
            "note": "No callback delivery webhook is configured yet.",
        }

    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "GSN-CommunityConfirmationCallback/1.0",
    }
    secret = _safe_text(os.getenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_SECRET"))
    if secret:
        digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
        headers["X-GSN-Signature-SHA256"] = f"sha256={digest}"

    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=_webhook_timeout_seconds()) as response:
            status_code = int(getattr(response, "status", 0) or response.getcode() or 0)
            return {
                "ok": 200 <= status_code < 300,
                "status": "accepted" if 200 <= status_code < 300 else "failed",
                "http_status": status_code,
            }
    except urllib.error.HTTPError as exc:
        return {
            "ok": False,
            "status": "failed",
            "http_status": int(exc.code or 0),
        }
    except Exception as exc:  # pragma: no cover - defensive provider boundary
        return {
            "ok": False,
            "status": "failed",
            "error": exc.__class__.__name__,
        }


def attempt_confirmation_callback_delivery(
    *,
    db: Optional[Session] = None,
    request: Any,
    requester_callback: Dict[str, Any],
    event: str,
    visible_summary: str,
    confidence: str,
    responses_received: int,
) -> Dict[str, Any]:
    callback = dict(requester_callback or {})
    if not bool(callback.get("requested")):
        return callback

    channel = _safe_text(callback.get("channel"), "none")
    contact = _safe_text(callback.get("contact"))
    if channel not in {"sms", "whatsapp"} or not contact:
        return {
            **callback,
            "delivery_status": "not_configured",
            "delivery_note": (
                "Return contact is incomplete. The public result link remains the source of truth."
            ),
        }

    event_key = (
        f"{event}:{int(getattr(request, 'id', 0) or 0)}:"
        f"{responses_received}:{confidence or 'pending'}"
    )
    if callback.get("last_delivery_event_key") == event_key and callback.get(
        "delivery_status"
    ) in {"accepted", "preview_ready"}:
        return callback

    result_url = _result_url(getattr(request, "public_token", ""))
    message = _build_message(
        channel=channel,
        result_url=result_url,
        visible_summary=visible_summary,
        event=event,
        confidence=confidence,
    )
    attempted_at = datetime.now(timezone.utc).isoformat()
    mode = _delivery_mode()
    if mode == "off":
        return {
            **callback,
            "delivery_status": "not_configured",
            "delivery_note": (
                "Return contact captured. The public result link remains the source of truth until SMS or WhatsApp delivery is configured."
            ),
        }

    delivery_snapshot = {
        "event": event,
        "mode": mode,
        "channel": channel,
        "contact_masked": callback.get("contact_masked"),
        "result_url": result_url,
        "attempted_at": attempted_at,
        "event_key": event_key,
    }

    if mode == "preview":
        return {
            **callback,
            "delivery_status": "preview_ready",
            "delivery_note": (
                "Return message prepared in preview mode. No SMS or WhatsApp provider was called."
            ),
            "last_delivery_event_key": event_key,
            "last_delivery_attempt": delivery_snapshot,
        }

    spend_result = _debit_callback_webhook_spend(
        db,
        request=request,
        event_key=event_key,
        event=event,
        channel=channel,
    )
    if not spend_result.get("ok"):
        status = _safe_text(spend_result.get("status"), "blocked_pipeline_credit_gate")
        return {
            **callback,
            "delivery_status": status,
            "delivery_note": (
                "Configured callback delivery was blocked by the Pipeline Credit gate. The public result link remains the source of truth."
            ),
            "last_delivery_event_key": event_key,
            "last_delivery_attempt": {
                **delivery_snapshot,
                "provider": "webhook",
                "provider_status": status,
                "pipeline_credit_gate": spend_result.get("pipeline_credit_gate"),
                "error": spend_result.get("note"),
            },
        }

    provider_result = _post_webhook(
        {
            "event": event,
            "request_id": int(getattr(request, "id", 0) or 0),
            "public_token": _safe_text(getattr(request, "public_token", "")),
            "channel": channel,
            "contact": contact,
            "contact_masked": callback.get("contact_masked"),
            "message": message,
            "result_url": result_url,
            "confidence": confidence,
            "responses_received": int(responses_received or 0),
        }
    )
    status = _safe_text(provider_result.get("status"), "failed")
    public_note = (
        "Return message accepted by the configured callback delivery webhook. The public result link remains the source of truth."
        if status == "accepted"
        else "Configured callback delivery did not accept the return message. The public result link remains the source of truth."
    )
    return {
        **callback,
        "delivery_status": status,
        "delivery_note": public_note,
        "last_delivery_event_key": event_key,
        "last_delivery_attempt": {
            **delivery_snapshot,
            "provider": "webhook",
            "provider_status": status,
            "http_status": provider_result.get("http_status"),
            "error": provider_result.get("error"),
            "pipeline_credit_gate": spend_result.get("pipeline_credit_gate"),
        },
    }
