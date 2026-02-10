from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.db.models import User
from app.schemas.repayments import (
    RepaymentCreate,
    RepaymentOut,
    RepaymentsListResponse,
)
from app.services.repayments_service import (
    create_repayment,
    list_repayments,
)

router = APIRouter(
    prefix="/loans/{loan_id}/repayments",
    tags=["repayments"],
)


@router.post("", response_model=RepaymentOut, status_code=201)
def post_repayment(
    loan_id: int,
    payload: RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repayment, _loan = create_repayment(
        db,
        loan_id=loan_id,
        payer=current_user,
        amount=Decimal(str(payload.amount)),
    )
    return repayment


@router.get("", response_model=RepaymentsListResponse)
def get_repayments(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = list_repayments(db, loan_id=loan_id)
    return {"items": items, "total": len(items)}
