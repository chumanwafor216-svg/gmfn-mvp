# app/api/routes/admin_evidence_trustwhy.py
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import TrustEvent, User

# reuse admin explainability endpoint logic
from app.api.routes.admin_trust_why import admin_trust_why

router = APIRouter(prefix="/admin/evidence", tags=["admin"])


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _latest_event_time(db: Session, user_id: int) -> Optional[datetime]:
    row: Optional[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .first()
    )
    return _to_aware(getattr(row, "created_at", None)) if row else None


def _build_pack_id(*, user_id: int, based_on_event_at: Optional[datetime]) -> str:
    if based_on_event_at is None:
        based_on_event_at = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    ts = based_on_event_at.astimezone(timezone.utc)
    day = ts.strftime("%Y%m%d")

    seed = f"{user_id}|{ts.isoformat()}|{PROTOCOL_VERSION}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest().upper()[:10]
    return f"GSN-WHY-{day}-{digest}"


def _checksum(pack_id: str, latest_event_at: Optional[datetime]) -> str:
    ts = latest_event_at.isoformat() if latest_event_at else "none"
    seed = f"{pack_id}|{PROTOCOL_VERSION}|{ts}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


@router.get("/trust-why/{user_id}.json")
def admin_evidence_trustwhy_json(
    user_id: int,
    limit: int = 10,
    mode: str = "standard",
    event_type: Optional[str] = None,
    clan_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    latest_event_at = _latest_event_time(db, int(user_id))
    pack_id = _build_pack_id(user_id=int(user_id), based_on_event_at=latest_event_at)
    checksum = _checksum(pack_id, latest_event_at)

    why = admin_trust_why(
        user_id=int(user_id),
        limit=limit,
        mode=mode,  # type: ignore[arg-type]
        event_type=event_type,
        clan_id=clan_id,
        loan_id=loan_id,
        db=db,
        current_user=current_user,
    )

    return {
        "pack_id": pack_id,
        "checksum": checksum,
        "protocol_version": PROTOCOL_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "based_on_event_at": latest_event_at.isoformat() if latest_event_at else None,
        "user_id": int(user_id),
        "trust_why": why,
        "links": {
            "admin_trust_why": f"/admin/trust/why/{int(user_id)}",
            "admin_trust_events_recent": "/admin/trust-events/recent",
            "trust_evidence_pack_zip": "/trust/me/evidence-pack.zip",
        },
        "note": "Admin screenshot-ready trust explainability bundle.",
    }
