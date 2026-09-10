from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.attention_spine_service import get_my_attention_spine


router = APIRouter(prefix="/attention-spine", tags=["attention-spine"])


@router.get("/me")
def my_attention_spine(
    clan_id: Optional[int] = Query(default=None, ge=1),
    limit: int = Query(default=30, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return get_my_attention_spine(
        db,
        current_user=current_user,
        clan_id=clan_id,
        limit=limit,
    )
