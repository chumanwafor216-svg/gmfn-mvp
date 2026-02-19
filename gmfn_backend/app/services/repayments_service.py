# app/services/repayments_service.py
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Loan, Repayment, LoanGuarantor, TrustEvent
from app.services.trust_events_services import log_trust_event

EV_LOAN_FULLY_REPAID = "loan_fully_repaid"
EV_GUARANTOR_SUCCESS = "guarantor_success"
EV_TRUST_GAIN_SKIPPED = "trust.gain_skipped"

BORROWER_FULL_REPAY_GAIN = Decimal("0.10")
GUARANTOR_SUCCESS_GAIN = Decimal("0.03")

MIN_TRUST_ELIGIBLE_LOAN_AMOUNT = Decimal("50.00")
TRUST_COOLDOWN_HOURS = 24


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    if isinstance(x, (int, str)):
        return Decimal(str(x))
    return Decimal(str(x))


def _get_loan_or_404(db: Session, loan_id: int) -> Loan:
    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan


def create_repayment(
    db: Session,
    *,
    loan_id: int,
    payer_user_id: Optional[int] = None,
    amount: Decimal,
    payment_reference: Optional[str] = None,
    payer: Any = None,
) -> Tuple[Repayment, Loan]:

    if payer_user_id is None and payer is not None:
        payer_user_id = int(getattr(payer, "id"))

    if payer_user_id is None:
        raise HTTPException(status_code=400, detail="Missing payer_user_id")

    amt = _d(amount)
    if amt <= Decimal("0"):
        raise HTTPException(status_code=400, detail="Repayment amount must be greater than 0")

    loan = _get_loan_or_404(db, int(loan_id))

    repayment = Repayment(
        loan_id=int(loan.id),
        payer_user_id=int(payer_user_id),
        amount=amt,
    )
    db.add(repayment)
    db.commit()
    db.refresh(repayment)
    db.refresh(loan)

    return repayment, loan


def list_repayments(db: Session, *, loan_id: int) -> List[Repayment]:
    return (
        db.query(Repayment)
        .filter(Repayment.loan_id == int(loan_id))
        .order_by(Repayment.id.asc())
        .all()
    )


def add_repayment(db: Session, loan_id: int, payer_user_id: int, amount: Decimal) -> Tuple[Repayment, Loan]:
    return create_repayment(db, loan_id=int(loan_id), payer_user_id=int(payer_user_id), amount=amount)
