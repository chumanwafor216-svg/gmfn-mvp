from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.clan_auth import get_current_clan_membership
from app.db.models import Loan, LoanGuarantor
from app.services.loans_service import update_loan_guarantor_status
from app.services.trust_events_services import log_trust_event
from app.core.trust_event_types import TrustEventType


router = APIRouter(prefix="/loans", tags=["loans"])


@router.post("/{loan_id}/guarantors/bulk-approve")
def bulk_approve_pending_guarantors(
    loan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Clan admin only")

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.clan_id != clan.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    pending = (
        db.query(LoanGuarantor)
        .filter(
            LoanGuarantor.loan_id == loan_id,
            LoanGuarantor.clan_id == clan.id,
            LoanGuarantor.status == "pending",
        )
        .all()
    )

    attempted = len(pending)
    ok = 0
    fail = 0
    affected_ids: list[int] = []

    for g in pending:
        try:
            update_loan_guarantor_status(
                db,
                guarantor_id=int(g.id),
                clan_id=int(clan.id),
                status="approved",
                decided_by_user_id=int(current_user.id),
            )
            ok += 1
            affected_ids.append(int(g.id))
        except Exception:
            db.rollback()
            fail += 1

    # ✅ Persist one audit TrustEvent
    log_trust_event(
        db=db,
        event_type=TrustEventType.ADMIN_BULK_GUARANTOR_APPROVED,
        clan_id=int(clan.id),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=int(loan.borrower_user_id),
        meta={
            "attempted": attempted,
            "succeeded": ok,
            "failed": fail,
            "affected_guarantor_ids": affected_ids[:50],
            "note": "Admin bulk-approved pending guarantors",
        },
    )

    return {"attempted": attempted, "succeeded": ok, "failed": fail}


@router.post("/{loan_id}/guarantors/bulk-decline")
def bulk_decline_pending_guarantors(
    loan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Clan admin only")

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.clan_id != clan.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    pending = (
        db.query(LoanGuarantor)
        .filter(
            LoanGuarantor.loan_id == loan_id,
            LoanGuarantor.clan_id == clan.id,
            LoanGuarantor.status == "pending",
        )
        .all()
    )

    attempted = len(pending)
    ok = 0
    fail = 0
    affected_ids: list[int] = []

    for g in pending:
        try:
            update_loan_guarantor_status(
                db,
                guarantor_id=int(g.id),
                clan_id=int(clan.id),
                status="declined",
                decided_by_user_id=int(current_user.id),
            )
            ok += 1
            affected_ids.append(int(g.id))
        except Exception:
            db.rollback()
            fail += 1

    # ✅ Persist one audit TrustEvent
    log_trust_event(
        db=db,
        event_type=TrustEventType.ADMIN_BULK_GUARANTOR_DECLINED,
        clan_id=int(clan.id),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=int(loan.borrower_user_id),
        meta={
            "attempted": attempted,
            "succeeded": ok,
            "failed": fail,
            "affected_guarantor_ids": affected_ids[:50],
            "note": "Admin bulk-declined pending guarantors",
        },
    )

    return {"attempted": attempted, "succeeded": ok, "failed": fail}
