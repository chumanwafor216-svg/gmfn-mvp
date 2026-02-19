# app/api/routes/payment_instructions.py
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, Loan
from app.services.payment_instructions_service import build_payment_instruction

router = APIRouter(prefix="/payment", tags=["payment"])


@router.get("/loans/{loan_id}/instructions")
def get_payment_instruction(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(loan.borrower_user_id) != int(current_user.id):
        raise HTTPException(status_code=403, detail="Not your loan")

    instruction = build_payment_instruction(
        loan_id=int(loan_id),
        user_id=int(current_user.id),
        currency=str(getattr(loan, "currency", "GBP") or "GBP"),
    )
    return instruction.as_dict()
