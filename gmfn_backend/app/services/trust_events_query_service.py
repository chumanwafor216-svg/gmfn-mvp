# app/services/trust_events_query_service.py
from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent


def _safe_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        v = json.loads(meta_json)
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}


def list_recent_for_subject(db: Session, *, subject_user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    lim = max(1, min(int(limit or 50), 200))
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(subject_user_id))
        .order_by(TrustEvent.id.desc())
        .limit(lim)
        .all()
    )

    out: list[dict[str, Any]] = []
    for r in rows:
        meta = _safe_meta(getattr(r, "meta_json", None))
        reason = meta.get("reason")
        note = meta.get("note")
        out.append(
            {
                "id": r.id,
                "event_type": r.event_type,
                "clan_id": getattr(r, "clan_id", None),
                "loan_id": getattr(r, "loan_id", None),
                "guarantor_id": getattr(r, "guarantor_id", None),
                "actor_user_id": r.actor_user_id,
                "subject_user_id": r.subject_user_id,
                "created_at": r.created_at,
                "reason": str(reason) if reason is not None else None,
                "note": str(note) if note is not None else None,
                "meta": meta,
            }
        )
    return out


def list_recent_admin(db: Session, *, limit: int = 50) -> list[dict[str, Any]]:
    lim = max(1, min(int(limit or 50), 200))
    rows = db.query(TrustEvent).order_by(TrustEvent.id.desc()).limit(lim).all()

    out: list[dict[str, Any]] = []
    for r in rows:
        meta = _safe_meta(getattr(r, "meta_json", None))
        reason = meta.get("reason")
        note = meta.get("note")
        out.append(
            {
                "id": r.id,
                "event_type": r.event_type,
                "clan_id": getattr(r, "clan_id", None),
                "loan_id": getattr(r, "loan_id", None),
                "guarantor_id": getattr(r, "guarantor_id", None),
                "actor_user_id": r.actor_user_id,
                "subject_user_id": r.subject_user_id,
                "created_at": r.created_at,
                "reason": str(reason) if reason is not None else None,
                "note": str(note) if note is not None else None,
                "meta": meta,
            }
        )
    return out