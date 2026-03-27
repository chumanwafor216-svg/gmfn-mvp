from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.trust_graph_service import build_trust_graph

router = APIRouter(prefix="/admin", tags=["trust-graph"])


def _require_admin(current_user: User) -> None:
    role = str(getattr(current_user, "role", "") or "").strip().lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/trust-graph/{user_id}")
def get_trust_graph(
    user_id: int,
    include_clans: bool = Query(True),
    limit_events: int = Query(500, ge=1, le=2000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)

    if int(user_id) <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    try:
        return build_trust_graph(
            db,
            user_id=int(user_id),
            include_clans=bool(include_clans),
            limit_events=int(limit_events),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc