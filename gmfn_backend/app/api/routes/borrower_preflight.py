from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.borrower_preflight_service import build_borrower_preflight

router = APIRouter(prefix="/loans", tags=["borrower-preflight"])


@router.get("/borrower/preflight")
def get_borrower_preflight(
    clan_id: int = Query(..., ge=1),
    requested_amount: str = Query(...),
    borrower_user_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    current_user_id = int(getattr(current_user, "id", 0) or 0)
    role = str(getattr(current_user, "role", "") or "").strip().lower()

    resolved_borrower_user_id = int(borrower_user_id) if borrower_user_id is not None else current_user_id

    if role != "admin" and resolved_borrower_user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not allowed to inspect another borrower preflight")

    try:
        result = build_borrower_preflight(
            db,
            clan_id=int(clan_id),
            borrower_user_id=resolved_borrower_user_id,
            requested_amount=requested_amount,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result["viewer_user_id"] = current_user_id
    result["viewer_role"] = role
    return result