# app/api/routes/trust_events.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.trust_events import TrustEventsListOut
from app.services.trust_events_query_service import list_recent_admin, list_recent_for_subject

router = APIRouter(tags=["trust-events"])


@router.get("/trust-events/me", response_model=TrustEventsListOut)
def trust_events_me(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = list_recent_for_subject(db, subject_user_id=int(current_user.id), limit=limit)
    return {"items": items, "total": len(items)}


@router.get("/admin/trust-events/recent", response_model=TrustEventsListOut)
def admin_recent_trust_events(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if (getattr(current_user, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    items = list_recent_admin(db, limit=limit)
    return {"items": items, "total": len(items)}