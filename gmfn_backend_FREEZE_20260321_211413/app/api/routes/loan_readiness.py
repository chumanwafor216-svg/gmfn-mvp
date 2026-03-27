from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.loan_readiness_service import build_loan_readiness_plan

router = APIRouter(prefix="/loans", tags=["loan-readiness"])


@router.get("/readiness/plan")
def get_loan_readiness_plan(
    clan_id: int = Query(..., ge=1),
    requested_amount: str = Query(...),
    borrower_user_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return build_loan_readiness_plan(
            db,
            clan_id=int(clan_id),
            requested_amount=requested_amount,
            borrower_user_id=int(borrower_user_id) if borrower_user_id is not None else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc