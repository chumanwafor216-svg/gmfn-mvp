import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.models import User, Loan, LoanGuarantor, ClanMembership, TrustEvent
from app.schemas.loans import LoanSummaryOut

router = APIRouter(prefix="/loans", tags=["loans"])


def _loan_purpose_from_events(db: Session, loan_id: int) -> str | None:
    event = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.event_type == "loan.created")
        .order_by(TrustEvent.id.asc())
        .first()
    )
    if not event:
        return None

    meta = getattr(event, "meta", None)
    if not isinstance(meta, dict):
        try:
            meta = json.loads(getattr(event, "meta_json", None) or "{}")
        except Exception:
            meta = {}

    purpose = str((meta or {}).get("purpose") or "").strip()
    return purpose or None


@router.get("/{loan_id}/summary", response_model=LoanSummaryOut)
def get_loan_summary(
    loan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    # must be same clan
    if loan.clan_id != clan.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # borrower OR clan admin can view
    if not (loan.borrower_user_id == current_user.id or membership.role == "admin"):
        raise HTTPException(status_code=403, detail="Not allowed")

    guarantors_total = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan.id)
        .count()
    )

    approved_guarantors = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan.id)
        .filter(LoanGuarantor.status == "approved")
        .count()
    )

    # Build response (convert Decimal to float for JSON)
    return LoanSummaryOut(
        id=loan.id,
        clan_id=loan.clan_id,
        borrower_user_id=loan.borrower_user_id,
        status=loan.status,
        amount=float(loan.amount),
        currency=loan.currency,
        purpose=_loan_purpose_from_events(db, int(loan.id)),

        service_fee=float(getattr(loan, "service_fee", 0) or 0),
        net_disbursed_amount=float(getattr(loan, "net_disbursed_amount", 0) or 0),
        guarantor_pool=float(getattr(loan, "guarantor_pool", 0) or 0),
        platform_revenue=float(getattr(loan, "platform_revenue", 0) or 0),

        paid_total=float(getattr(loan, "paid_total", 0) or 0),
        remaining_amount=float(getattr(loan, "remaining_amount", 0) or 0),
        repaid_at=getattr(loan, "repaid_at", None),
        due_at=getattr(loan, "due_at", None),

        guarantors_required=int(getattr(loan, "guarantors_required", 0) or 0),
        approved_guarantors=approved_guarantors,
        guarantors_total=guarantors_total,

        created_at=loan.created_at,
        decision_at=getattr(loan, "decision_at", None),
    )
