from typing import List
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Loan, LoanGuarantor
from app.schemas.loans import LoanOut
from app.services.guarantor_rules import require_clan_member


def get_loans_for_borrower(borrower_user_id: int) -> List[LoanOut]:
    # Replace with real DB query later
    return [
        LoanOut(id=1, borrower_user_id=borrower_user_id, amount=50000, status="pending"),
        LoanOut(id=2, borrower_user_id=borrower_user_id, amount=120000, status="approved"),
    ]


def add_loan_guarantor(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    guarantor_user_id: int,
    pledge_amount: float = 0,
) -> LoanGuarantor:
    # ✅ Enforce: only clan members can be guarantors
    require_clan_member(db, clan_id=clan_id, user_id=guarantor_user_id)

    guarantor = LoanGuarantor(
        loan_id=loan_id,
        clan_id=clan_id,
        guarantor_user_id=guarantor_user_id,
        pledge_amount=pledge_amount,
        status="pending",
    )

    db.add(guarantor)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Guarantor already added for this loan")

    db.refresh(guarantor)
    return guarantor


def list_loan_guarantors(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
) -> List[LoanGuarantor]:
    return (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan_id)
        .filter(LoanGuarantor.clan_id == clan_id)
        .order_by(LoanGuarantor.id.desc())
        .all()
    )


def count_approved_guarantors(db: Session, *, loan_id: int) -> int:
    return (
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == loan_id)
        .filter(LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )


from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "declined"}

ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "rejected"}  # match tests


def update_loan_guarantor_status(
    db: Session,
    *,
    guarantor_id: int,
    clan_id: int,
    status: str,
    decided_by_user_id: int,
) -> LoanGuarantor:
    if status not in ALLOWED_GUARANTOR_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    guarantor = db.get(LoanGuarantor, guarantor_id)
    if not guarantor:
        raise HTTPException(status_code=404, detail="Guarantor not found")

    if guarantor.clan_id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    guarantor.status = status

    if status in ("approved", "rejected"):
        guarantor.responded_at = datetime.now(timezone.utc)

    # Auto-approve loan when enough guarantors are approved
    if status == "approved":
        loan = db.execute(
            select(Loan).where(Loan.id == guarantor.loan_id).with_for_update()
        ).scalar_one_or_none()

        if loan and loan.status == "pending":
            approved_count = count_approved_guarantors(db, loan_id=loan.id)
            required = loan.guarantors_required or 0

            if approved_count >= required:
                loan.status = "approved"
                loan.decision_by_user_id = decided_by_user_id
                loan.decision_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(guarantor)
    return guarantor
