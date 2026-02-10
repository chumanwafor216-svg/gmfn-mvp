from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import TrustEvent, User
from app.services.guarantor_expiry_service import expire_pending_guarantors

router = APIRouter(prefix="/admin/trust-events", tags=["admin"])


def _is_admin(user: User) -> bool:
    return (getattr(user, "role", None) or "").lower() == "admin"


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Not allowed")


@router.get("/recent")
def admin_recent_trust_events(
    limit: int = 50,
    clan_id: Optional[int] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Admin-only: list most recent TrustEvents for audit / visa screenshots.
    Includes meta_json so you can see meta.reason/meta.note.
    """
    _require_admin(current_user)

    q = db.query(TrustEvent)

    if clan_id is not None:
        q = q.filter(TrustEvent.clan_id == clan_id)

    if event_type is not None:
        q = q.filter(TrustEvent.event_type == event_type)

    rows = q.order_by(TrustEvent.created_at.desc()).limit(int(limit)).all()

    # Return raw meta_json (string). Frontend/admin can parse JSON if needed.
    items = []
    for r in rows:
        items.append(
            {
                "id": r.id,
                "event_type": r.event_type,
                "clan_id": r.clan_id,
                "loan_id": r.loan_id,
                "guarantor_id": r.guarantor_id,
                "actor_user_id": r.actor_user_id,
                "subject_user_id": r.subject_user_id,
                "created_at": r.created_at,
                "meta_json": r.meta_json,
            }
        )

    return {"items": items, "total": len(items)}


@router.post("/expire-guarantors")
def admin_expire_guarantors(
    expiry_hours: int = 48,
    clan_id: Optional[int] = None,
    max_batch: int = 500,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Admin-only: expire pending guarantor requests older than expiry_hours.
    This will:
      - mark LoanGuarantor rows "expired"
      - log TrustEventType.GUARANTOR_EXPIRED (with meta.reason/meta.note)
      - re-evaluate loans (may auto-reject depending on rules)

    Returns:
      { "expired": int, "scanned": int, "expiry_hours": int, "clan_id": int|null }
    """
    _require_admin(current_user)

    expired, scanned = expire_pending_guarantors(
        db,
        clan_id=clan_id,
        expiry_hours=expiry_hours,
        max_batch=max_batch,
    )

    return {
        "expired": expired,
        "scanned": scanned,
        "expiry_hours": expiry_hours,
        "clan_id": clan_id,
        "max_batch": max_batch,
    }
