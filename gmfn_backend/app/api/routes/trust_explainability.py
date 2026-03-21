from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.schemas.trust_explainability import (
    AdminRecentTrustEventOut,
    TrustExplainOut,
)
from app.services.trust_explainability_service import (
    build_recent_trust_events_admin,
    build_trust_explainability,
)

# Keep these two imports aligned with your existing project structure.
# If your current paths differ, keep your project's existing get_db / get_current_user imports.
from app.db.database import get_db
from app.core.auth import get_current_user

router = APIRouter(tags=["trust-explainability"])


@router.get("/trust/explain/me", response_model=TrustExplainOut)
def get_my_trust_explainability(
    recent_limit: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = int(getattr(current_user, "id"))
    return build_trust_explainability(
        db,
        user_id=user_id,
        recent_limit=recent_limit,
    )


@router.get("/admin/trust/events/recent", response_model=list[AdminRecentTrustEventOut])
def get_recent_trust_events_admin(
    limit: int = Query(default=50, ge=1, le=200),
    user_id: Optional[int] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = str(getattr(current_user, "role", "") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return build_recent_trust_events_admin(
        db,
        limit=limit,
        user_id=user_id,
        event_type=event_type,
    )