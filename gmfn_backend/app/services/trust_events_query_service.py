from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent


def _safe_meta(raw: Any) -> Dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            v = json.loads(raw)
            return v if isinstance(v, dict) else {}
        except Exception:
            return {}
    return {}


def _row_out(e: TrustEvent) -> Dict[str, Any]:
    meta = _safe_meta(getattr(e, "meta", None) or getattr(e, "meta_json", None))

    return {
        "id": int(getattr(e, "id", 0) or 0),
        "event_type": getattr(e, "event_type", "") or "",
        "clan_id": getattr(e, "clan_id", None),
        "loan_id": getattr(e, "loan_id", None),
        "guarantor_id": getattr(e, "guarantor_id", None),
        "actor_user_id": int(getattr(e, "actor_user_id", 0) or 0),
        "subject_user_id": int(getattr(e, "subject_user_id", 0) or 0),
        "created_at": getattr(e, "created_at", None),
        "meta": meta,
        "reason": meta.get("reason"),
        "note": meta.get("note"),
    }


def list_recent_for_subject(
    db: Session,
    *,
    subject_user_id: int,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    lim = max(1, min(int(limit or 50), 200))

    rows: List[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(subject_user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(lim)
        .all()
    )

    return [_row_out(e) for e in rows]


def list_recent_admin(
    db: Session,
    *,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    lim = max(1, min(int(limit or 50), 200))

    rows: List[TrustEvent] = (
        db.query(TrustEvent)
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(lim)
        .all()
    )

    return [_row_out(e) for e in rows]