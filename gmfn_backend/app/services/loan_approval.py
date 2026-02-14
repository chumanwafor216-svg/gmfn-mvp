from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Loan, LoanGuarantor
from app.services.fees import calc_loan_financials


def approve_loan(db: Session, *, loan: Loan, decided_by_user_id: int) -> Loan:
    """
    Finalizes loan approval and writes fee/disbursement fields.

    Freeze-grade boundary checks:
      (1) enough approved guarantors (count)
      (2) enough approved locked coverage (>= guarantee_gap)
      (3) approved guarantors must be locked (is_locked + locked_amount > 0)
    """

    amount = Decimal(str(loan.amount))
    guarantors_required = int(loan.guarantors_required or 0)

    if guarantors_required > 0:
        approved_count = (
            db.query(func.count(LoanGuarantor.id))
            .filter(
                LoanGuarantor.loan_id == loan.id,
                LoanGuarantor.status == "approved",
            )
            .scalar()
            or 0
        )
        if approved_count < guarantors_required:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve loan: requires {guarantors_required} approved guarantor(s), but has {approved_count}.",
            )

        required_gap = Decimal(str(getattr(loan, "guarantee_gap", None) or 0))
        if required_gap <= 0:
            raise HTTPException(
                status_code=500,
                detail="Loan guarantee_gap is missing/invalid. Add guarantee_gap to Loan and set it at creation.",
            )

        coverage_raw = (
            db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0))
            .filter(
                LoanGuarantor.loan_id == loan.id,
                LoanGuarantor.status == "approved",
            )
            .scalar()
            or 0
        )
        coverage = Decimal(str(coverage_raw))

        if coverage < required_gap:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot approve loan: approved locked coverage ({coverage}) is below required gap ({required_gap}).",
            )

        # Sanity: approved guarantors must be locked
        guarantors = (
            db.query(LoanGuarantor)
            .filter(
                LoanGuarantor.loan_id == loan.id,
                LoanGuarantor.status == "approved",
            )
            .all()
        )
        for g in guarantors:
            if not bool(getattr(g, "is_locked", False)):
                raise HTTPException(status_code=400, detail="Approved guarantor is not locked; cannot approve loan.")
            if Decimal(str(getattr(g, "locked_amount", 0) or 0)) <= 0:
                raise HTTPException(status_code=400, detail="Approved guarantor has zero locked_amount; cannot approve loan.")

    service_fee, net_disbursed, guarantor_pool, platform_revenue = calc_loan_financials(
        db,
        loan_id=loan.id,
        amount=amount,
        guarantors_required=guarantors_required,
    )

    loan.status = "approved"
    loan.decision_by_user_id = decided_by_user_id
    loan.decision_at = datetime.now(timezone.utc)

    loan.service_fee = service_fee
    loan.net_disbursed_amount = net_disbursed
    loan.guarantor_pool = guarantor_pool
    loan.platform_revenue = platform_revenue

    if loan.paid_total is None:
        loan.paid_total = Decimal("0")

    loan.remaining_amount = amount - Decimal(str(loan.paid_total or 0))
    if loan.remaining_amount < 0:
        loan.remaining_amount = Decimal("0")

    db.commit()
    db.refresh(loan)
    return loan