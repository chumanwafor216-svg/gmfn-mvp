from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.db.models import Loan, LoanGuarantor
from app.schemas.loan_guarantors import LoanGuarantorCreate, LoanGuarantorOut
from app.core.auth import get_current_user
from app.core.clan_auth import require_clan_admin

router = APIRouter()


@router.post(
    "/loans/{loan_id}/guarantors",
    response_model=LoanGuarantorOut,
    status_code=status.HTTP_201_CREATED,
)
def invite_loan_guarantor(
    loan_id: int,
    payload: LoanGuarantorCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    # ✅ DB-based admin check (no ambiguity)
    require_clan_admin(clan_id=loan.clan_id, db=db, current_user=current_user)

    # ✅ Duplicate guard
    exists = (
        db.query(LoanGuarantor)
        .filter(
            LoanGuarantor.loan_id == loan_id,
            LoanGuarantor.guarantor_user_id == payload.guarantor_user_id,
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="Guarantor already invited")

    row = LoanGuarantor(
        loan_id=loan_id,
        clan_id=loan.clan_id,
        guarantor_user_id=payload.guarantor_user_id,
        pledge_amount=payload.pledge_amount or 0,
        status="pending",
    )

    db.add(row)

    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        msg = str(e.orig).lower() if getattr(e, "orig", None) else str(e).lower()

        if "unique constraint" in msg:
            raise HTTPException(status_code=409, detail="Guarantor already invited")

        if "foreign key constraint" in msg:
            raise HTTPException(status_code=400, detail="Guarantor must be a clan member")

        raise HTTPException(status_code=400, detail="Could not invite guarantor")

    db.refresh(row)
    return row 
