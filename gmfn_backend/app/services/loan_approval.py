from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session

from app.db.models import Loan, LoanGuarantor
from app.services.fees import calc_loan_financials


def approve_loan(db: Session, *, loan: Loan, decided_by_user_id: int) -> Loan:
    """
    Finalizes loan approval and writes fee/disbursement fields.
    Assumes guarantor rules were already checked before calling this.
    Also initializes repayment tracking and locks guarantor liability.
    """

    amount = Decimal(str(loan.amount))
    guarantors_required = int(loan.guarantors_required or 0)

    service_fee, net_disbursed, guarantor_pool, platform_revenue = calc_loan_financials(
        db,
        loan_id=loan.id,
        amount=amount,
        guarantors_required=guarantors_required,
    )

    # 1) Approve + audit
    loan.status = "approved"
    loan.decision_by_user_id = decided_by_user_id
    loan.decision_at = datetime.now(timezone.utc)

    # 2) Financial fields
    loan.service_fee = service_fee
    loan.net_disbursed_amount = net_disbursed
    loan.guarantor_pool = guarantor_pool
    loan.platform_revenue = platform_revenue

    # 3) Repayment tracking init
    if loan.paid_total is None:
        loan.paid_total = Decimal("0")
    loan.remaining_amount = amount - Decimal(str(loan.paid_total or 0))
    if loan.remaining_amount < 0:
        loan.remaining_amount = Decimal("0")

    # 4) Lock guarantor liability ONLY if guarantors are required
    if guarantors_required > 0:
        guarantors = (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.loan_id == loan.id)
            .all()
        )
        for g in guarantors:
            g.is_locked = True
            g.locked_amount = Decimal(str(g.pledge_amount or 0))
            g.released_amount = Decimal("0")

    db.commit()
    db.refresh(loan)
    return loan
