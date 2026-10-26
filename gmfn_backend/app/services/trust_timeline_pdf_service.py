from __future__ import annotations

import json
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent, User
from app.services.institutional_pdf import utc_generated_label
from app.services.trust_score_service import compute_trust_breakdown
from app.services.trust_slips_services import get_trust_slip_payload
from app.services.trust_timeline_pdf_layout import (
    build_timeline_document,
    event_meta_summary,
    event_type_label,
)


def _timeline_contact_boundary() -> str:
    return "redacted for timeline PDF"


def _audience_label(audience: Any) -> str:
    value = str(audience or "user").strip().lower()
    if value == "admin":
        return "Admin redacted review"
    return "Private holder review"


def _load_events(db: Session, *, user_id: int, limit: int) -> list[TrustEvent]:
    return (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(int(limit))
        .all()
    )


def _event_meta(event: Any) -> Dict[str, Any]:
    meta = getattr(event, "meta", None)
    if isinstance(meta, dict):
        return meta
    meta_json = getattr(event, "meta_json", None)
    if isinstance(meta_json, dict):
        return meta_json
    if isinstance(meta_json, str) and meta_json.strip():
        try:
            parsed = json.loads(meta_json)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _load_timeline_summary(
    db: Session,
    *,
    user_id: int,
) -> Dict[str, Any]:
    try:
        return get_trust_slip_payload(db, user_id=int(user_id))
    except ValueError:
        summary = dict(compute_trust_breakdown(db, user_id=int(user_id)) or {})
        user = db.get(User, int(user_id))
        summary.setdefault("gmfn_id", getattr(user, "gmfn_id", None) if user else None)
        summary.setdefault("status", "not issued")
        summary.setdefault("active", False)
        summary.setdefault("is_current", False)
        return summary


def _prepare_events(
    rows: list[TrustEvent],
    *,
    audience: str,
    redact: bool,
) -> list[Dict[str, Any]]:
    prepared: list[Dict[str, Any]] = []
    for row in rows:
        raw_type = getattr(row, "event_type", None)
        prepared.append(
            {
                "created_at": getattr(row, "created_at", None),
                "label": event_type_label(raw_type, audience=audience),
                "note": event_meta_summary(_event_meta(row), redact=redact),
            }
        )
    return prepared


def build_trust_timeline_pdf(
    db: Session,
    *,
    user_id: int,
    limit: int = 200,
    audience: str = "user",
    pack_id: Optional[str] = None,
    protocol_version: Optional[str] = None,
    footer: Optional[str] = None,
    score: Optional[str] = None,
    last_change: Optional[Dict[str, Any]] = None,
    pack_meta: Optional[Dict[str, Any]] = None,
    redact: bool = True,
) -> bytes:
    meta = pack_meta if isinstance(pack_meta, dict) else {}
    pack_id = pack_id or str(meta.get("pack_id") or "").strip() or None
    protocol_version = (
        protocol_version
        or str(meta.get("protocol_version") or "").strip()
        or None
    )
    generated_at = (
        str(meta.get("generated_at_utc") or "").strip()
        or utc_generated_label()
    )

    safe_limit = max(1, min(int(limit or 200), 300))
    safe_audience = "admin" if str(audience).strip().lower() == "admin" else "user"
    summary = _load_timeline_summary(db, user_id=int(user_id))
    event_rows = _load_events(db, user_id=int(user_id), limit=safe_limit)
    events = _prepare_events(
        event_rows,
        audience=safe_audience,
        redact=bool(redact),
    )

    if last_change and not events and (
        last_change.get("event_type")
        or last_change.get("created_at")
    ):
        events.append(
            {
                "created_at": last_change.get("created_at"),
                "label": event_type_label(
                    last_change.get("event_type"),
                    audience=safe_audience,
                ),
                "note": (
                    "private event details redacted for timeline PDF"
                    if redact
                    else str(
                        last_change.get("reason")
                        or last_change.get("note")
                        or "No additional timeline detail."
                    )
                ),
            }
        )

    return build_timeline_document(
        summary=summary,
        events=events,
        audience=_audience_label(safe_audience),
        generated_at=generated_at,
        reference=pack_id,
        protocol_version=protocol_version,
        footer=footer,
        score=score,
        private_contact=_timeline_contact_boundary(),
    )
