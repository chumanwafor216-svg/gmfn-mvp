# app/api/routes/trust_timeline.py
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User

from app.services.trust_timeline_service import list_trust_timeline

router = APIRouter(prefix="/trust", tags=["trust"])


def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False) is True:
        return True
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


def _require_admin(user: Any) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/me/timeline")
def my_trust_timeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
) -> Dict[str, Any]:
    items = list_trust_timeline(
        db,
        user_id=int(current_user.id),
        limit=int(limit),
        audience="user",
        hide_zero_deltas_for_user=True,
    )
    return {"user_id": int(current_user.id), "items": items, "total": len(items)}


@router.get("/timeline/{user_id}")
def user_trust_timeline_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
) -> Dict[str, Any]:
    _require_admin(current_user)
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id")
    items = list_trust_timeline(
        db,
        user_id=int(user_id),
        limit=int(limit),
        audience="admin",
        hide_zero_deltas_for_user=False,
    )
    return {"user_id": int(user_id), "items": items, "total": len(items)}