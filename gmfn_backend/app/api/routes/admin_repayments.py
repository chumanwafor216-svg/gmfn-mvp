# app/api/routes/admin_repayments.py
from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, Loan

from app.schemas.admin_repayments import AdminRepaymentConfirmIn
from app.services.repayments_service import create_repayment

router = APIRouter(prefix="/admin/repayments", tags=["admin"])


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


def _parse_amount_decimal(amount_str: str) -> Decimal:
    try:
        amt = Decimal(str(amount_str))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid amount format. Use a decimal string like '140.00'.")
    if amt <= Decimal("0"):
        raise HTTPException(status_code=400, detail="Amount must be greater than 0.")
    return amt


@router.post("/loans/{loan_id}/confirm")
def confirm_manual_repayment(
    loan_id: int,
    payload: AdminRepaymentConfirmIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin confirms a manual bank transfer repayment (non-custodial MVP).

    - Creates a Repayment row
    - Updates loan totals / status
    - If fully repaid, logs TrustEvents (borrower + guarantors) with payment_reference in meta
    """
    _require_admin(current_user)

    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    st = str(getattr(loan, "status", "") or "").lower()
    if st in ("cancelled", "canceled", "declined", "rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot confirm repayment for a {st} loan")

    amt = _parse_amount_decimal(payload.amount)

    repayment, updated_loan = create_repayment(
        db,
        loan_id=int(loan_id),
        payer_user_id=int(getattr(loan, "borrower_user_id")),
        amount=amt,
        payment_reference=payload.payment_reference,
    )

    return {
        "ok": True,
        "loan_id": int(loan_id),
        "repayment_id": int(repayment.id),
        "payer_user_id": int(repayment.payer_user_id),
        "amount": str(repayment.amount),
        "loan_status": str(getattr(updated_loan, "status", "")),
        "remaining_amount": str(getattr(updated_loan, "remaining_amount", "")) if hasattr(updated_loan, "remaining_amount") else None,
        "note": payload.note,
        "payment_reference": payload.payment_reference,
        "mode": "admin_manual_confirmation_mvp",
    }