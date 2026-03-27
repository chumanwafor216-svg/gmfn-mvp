from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import Loan, User
from app.services.guarantor_selection_service import build_loan_guarantor_suggestions

router = APIRouter(prefix="/loans", tags=["loan-suggestions"])


def _is_admin(user: User) -> bool:
    return str(getattr(user, "role", "") or "").strip().lower() == "admin"


@router.get("/{loan_id}/guarantor-suggestions")
def get_guarantor_suggestions_for_loan(
    loan_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    borrower_user_id = int(getattr(loan, "borrower_user_id", 0) or 0)
    current_user_id = int(getattr(current_user, "id", 0) or 0)

    if not _is_admin(current_user) and borrower_user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Not allowed to inspect suggestions for this loan")

    try:
        result = build_loan_guarantor_suggestions(
            db,
            int(loan_id),
            limit=int(limit),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    result["viewer_user_id"] = current_user_id
    result["viewer_role"] = str(getattr(current_user, "role", "") or "")
    result["borrower_can_view"] = borrower_user_id == current_user_id
    return result