# app/api/routes/repayments.py
from __future__ import annotations

from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.db.models import User
from app.schemas.repayments import RepaymentCreate, RepaymentOut, RepaymentsListResponse
from app.services.repayments_service import create_repayment, list_repayments

router = APIRouter(
    prefix="/loans/{loan_id}/repayments",
    tags=["repayments"],
)


def _parse_amount_decimal(amount_str: str) -> Decimal:
    try:
        amt = Decimal(str(amount_str))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid amount format. Use a decimal string like '140.00'.")
    if amt <= Decimal("0"):
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")
    return amt


@router.post("", response_model=RepaymentOut, status_code=201)
def post_repayment(
    loan_id: int,
    payload: RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    amt = _parse_amount_decimal(payload.amount)

    repayment, _loan = create_repayment(
        db,
        loan_id=int(loan_id),
        payer_user_id=int(current_user.id),
        amount=amt,
        payment_reference=payload.payment_reference,
    )
    return repayment


@router.get("", response_model=RepaymentsListResponse)
def get_repayments(
    loan_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    items = list_repayments(db, loan_id=int(loan_id))
    return {"items": items, "total": len(items)}