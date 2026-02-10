from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import ClanMembership, Loan, LoanGuarantor, User
from app.services.trust_events_services import log_trust_event


def D(x) -> Decimal:
    return Decimal("0") if x is None else Decimal(str(x))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_user_exposure(db: Session, *, clan_id: int, user_id: int) -> Decimal:
    """
    Exposure = sum(locked_amount - released_amount) for this guarantor in this clan.
    """
    raw = db.execute(
        select(
            func.coalesce(
                func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount),
                0,
            )
        ).where(
            LoanGuarantor.clan_id == clan_id,
            LoanGuarantor.guarantor_user_id == user_id,
            LoanGuarantor.status == "approved",
        )
    ).scalar_one()
    return D(raw)


def _count_status(db: Session, *, loan_id: int, status: str) -> int:
    return int(
        db.execute(
            select(func.count(LoanGuarantor.id)).where(
                LoanGuarantor.loan_id == loan_id,
                LoanGuarantor.status == status,
            )
        ).scalar_one()
        or 0
    )


def evaluate_loan_after_guarantor_change(db: Session, *, loan_id: int) -> Loan:
    """
    Loan auto-decision rules:
    - if approved >= required -> loan approved
    - if approved + pending < required -> loan rejected (impossible to reach)
    """
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.status != "pending":
        return loan

    required = int(loan.guarantors_required or 0)
    if required <= 0:
        return loan

    approved = _count_status(db, loan_id=loan_id, status="approved")
    pending = _count_status(db, loan_id=loan_id, status="pending")
    declined = _count_status(db, loan_id=loan_id, status="declined")

    # ✅ Auto-approve
    if approved >= required:
        loan.status = "approved"
        loan.decision_at = _now()

        log_trust_event(
            db=db,
            event_type=TrustEventType.LOAN_AUTO_APPROVED_BY_GUARANTORS,
            clan_id=loan.clan_id,
            loan_id=loan.id,
            guarantor_id=None,
            actor_user_id=int(loan.borrower_user_id),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "required": required,
                "approved": approved,
                "pending": pending,
                "declined": declined,
                "system": True,
            },
        )

        db.commit()
        db.refresh(loan)
        return loan

    # ❌ Auto-reject (impossible)
    if approved + pending < required:
        loan.status = "rejected"
        loan.decision_at = _now()

        log_trust_event(
            db=db,
            event_type=TrustEventType.LOAN_AUTO_REJECTED,
            clan_id=loan.clan_id,
            loan_id=loan.id,
            guarantor_id=None,
            actor_user_id=int(loan.borrower_user_id),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "required": required,
                "approved": approved,
                "pending": pending,
                "declined": declined,
                "system": True,
                "reason": "not_enough_possible_approvals",
            },
        )

        db.commit()
        db.refresh(loan)
        return loan

    return loan


def approve_guarantor_and_maybe_approve_loan(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    guarantor_id: int,
    decided_by_user_id: int,
) -> dict:
    """
    Approve + lock pledge.
    """
    REQUIRED_COVERAGE_RATIO = Decimal("1.00")
    MAX_EXPOSURE = Decimal("200000")

    with db.begin():
        loan = db.execute(select(Loan).where(Loan.id == loan_id).with_for_update()).scalar_one_or_none()
        if not loan:
            raise HTTPException(status_code=404, detail="Loan not found")

        if loan.clan_id != clan_id:
            raise HTTPException(status_code=403, detail="Loan does not belong to this clan")

        if loan.status != "pending":
            raise HTTPException(status_code=400, detail=f"Loan is not pending (status={loan.status})")

        required = int(loan.guarantors_required or 0)
        required_collateral = D(loan.amount) * REQUIRED_COVERAGE_RATIO

        g = db.execute(
            select(LoanGuarantor)
            .where(
                LoanGuarantor.id == guarantor_id,
                LoanGuarantor.loan_id == loan_id,
                LoanGuarantor.clan_id == clan_id,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if not g:
            raise HTTPException(status_code=404, detail="Guarantor record not found")

        if g.status in {"declined", "expired"}:
            raise HTTPException(status_code=400, detail=f"Guarantor already {g.status}")

        if g.status == "approved" and bool(g.is_locked) and D(g.locked_amount) > 0:
            return {
                "loan_status": loan.status,
                "guarantor_status": g.status,
                "locked_amount": str(D(g.locked_amount)),
                "loan_guarantor_pool": str(D(loan.guarantor_pool)),
            }

        guarantor_user = db.execute(
            select(User).where(User.id == g.guarantor_user_id).with_for_update()
        ).scalar_one_or_none()
        if not guarantor_user:
            raise HTTPException(status_code=404, detail="Guarantor user not found")

        exposure = get_user_exposure(db, clan_id=clan_id, user_id=g.guarantor_user_id)
        headroom = MAX_EXPOSURE - exposure
        if headroom <= 0:
            raise HTTPException(status_code=400, detail="Exposure cap reached")

        already_locked_raw = db.execute(
            select(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0)).where(
                LoanGuarantor.loan_id == loan_id,
                LoanGuarantor.status == "approved",
            )
        ).scalar_one()
        already_locked = D(already_locked_raw)
        remaining_needed = required_collateral - already_locked

        pledge = D(g.pledge_amount)
        available = D(guarantor_user.personal_pool_balance)

        lock_amount = min(pledge, remaining_needed, available, headroom)
        if lock_amount <= 0:
            raise HTTPException(status_code=400, detail="Insufficient balance/headroom to lock")

        guarantor_user.personal_pool_balance = D(guarantor_user.personal_pool_balance) - lock_amount

        g.status = "approved"
        g.is_locked = True
        g.locked_amount = D(g.locked_amount) + lock_amount
        g.responded_at = _now()

        new_total_locked = already_locked + lock_amount
        loan.guarantor_pool = new_total_locked

        db.flush()

        log_trust_event(
            db=db,
            event_type=TrustEventType.GUARANTOR_APPROVED_LOCKED,
            clan_id=clan_id,
            loan_id=loan_id,
            guarantor_id=g.id,
            actor_user_id=decided_by_user_id,
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "locked_amount": float(lock_amount),
                "guarantor_user_id": int(g.guarantor_user_id),
                "pledge_amount": float(D(g.pledge_amount)),
                "loan_required_collateral": float(required_collateral),
                "loan_total_locked": float(new_total_locked),
            },
        )

        # ✅ Evaluate loan for auto approve / auto reject
        evaluate_loan_after_guarantor_change(db, loan_id=loan_id)

        return {
            "loan_status": loan.status,
            "guarantor_status": g.status,
            "locked_amount": str(D(g.locked_amount)),
            "loan_guarantor_pool": str(D(loan.guarantor_pool)),
            "guarantors_required": required,
        }


def decline_guarantor(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    guarantor_id: int,
    decided_by_user_id: int,
) -> dict:
    with db.begin():
        g = db.execute(
            select(LoanGuarantor)
            .where(
                LoanGuarantor.id == guarantor_id,
                LoanGuarantor.loan_id == loan_id,
                LoanGuarantor.clan_id == clan_id,
            )
            .with_for_update()
        ).scalar_one_or_none()
        if not g:
            raise HTTPException(status_code=404, detail="Guarantor record not found")

        if g.status in {"approved"} and bool(g.is_locked) and D(g.locked_amount) > D(g.released_amount):
            raise HTTPException(status_code=400, detail="Cannot decline after lock")

        if g.status in {"declined", "expired"}:
            raise HTTPException(status_code=400, detail=f"Already {g.status}")

        g.status = "declined"
        g.responded_at = _now()

        db.flush()

        log_trust_event(
            db=db,
            event_type=TrustEventType.GUARANTOR_DECLINED,
            clan_id=clan_id,
            loan_id=loan_id,
            guarantor_id=guarantor_id,
            actor_user_id=decided_by_user_id,
            subject_user_id=None,
            meta={},
        )

        evaluate_loan_after_guarantor_change(db, loan_id=loan_id)

        return {"guarantor_id": guarantor_id, "status": g.status}


def release_guarantee_locks_for_loan(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    decided_by_user_id: int,
) -> dict:
    """
    Admin release: returns locked funds to each guarantor's clan_membership.personal_pool_balance.
    """
    with db.begin():
        loan = db.execute(select(Loan).where(Loan.id == loan_id).with_for_update()).scalar_one_or_none()
        if not loan or loan.clan_id != clan_id:
            raise HTTPException(status_code=404, detail="Loan not found")

        guarantors = db.execute(
            select(LoanGuarantor)
            .where(LoanGuarantor.loan_id == loan_id, LoanGuarantor.clan_id == clan_id)
            .with_for_update()
        ).scalars().all()

        released_total = Decimal("0")
        released_count = 0

        for g in guarantors:
            locked = D(g.locked_amount)
            released = D(g.released_amount)
            remaining = locked - released
            if remaining <= 0:
                continue

            m = db.execute(
                select(ClanMembership)
                .where(
                    ClanMembership.clan_id == clan_id,
                    ClanMembership.user_id == g.guarantor_user_id,
                )
                .with_for_update()
            ).scalar_one_or_none()

            if m:
                m.personal_pool_balance = D(m.personal_pool_balance) + remaining

            g.released_amount = released + remaining
            g.is_locked = False
            released_total += remaining
            released_count += 1

        loan.guarantor_pool = D(loan.guarantor_pool) - released_total
        if loan.guarantor_pool < 0:
            loan.guarantor_pool = Decimal("0")

        db.flush()

        log_trust_event(
            db=db,
            event_type=TrustEventType.GUARANTEE_LOCKS_RELEASED,
            clan_id=clan_id,
            loan_id=loan_id,
            guarantor_id=None,
            actor_user_id=decided_by_user_id,
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "released_count": released_count,
                "released_total": float(released_total),
            },
        )

        return {
            "loan_id": loan_id,
            "released_count": released_count,
            "released_total": str(released_total),
        }


def run_guarantor_expiry(
    db: Session,
    *,
    expiry_minutes: int = 60 * 24,  # default 24 hours
) -> int:
    """
    Auto-expire guarantors still 'pending' after expiry_minutes.
    Returns number expired.
    """
    cutoff = _now() - timedelta(minutes=expiry_minutes)

    rows = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.status == "pending")
        .filter(LoanGuarantor.created_at < cutoff)
        .all()
    )

    n = 0
    for g in rows:
        g.status = "expired"
        g.responded_at = _now()
        n += 1

        log_trust_event(
            db=db,
            event_type=TrustEventType.GUARANTOR_EXPIRED,
            clan_id=g.clan_id,
            loan_id=g.loan_id,
            guarantor_id=g.id,
            actor_user_id=int(g.guarantor_user_id),
            subject_user_id=int(g.guarantor_user_id),
            meta={"system": True, "reason": "timeout"},
        )

        # after expiry, loan might become impossible -> auto reject
        try:
            evaluate_loan_after_guarantor_change(db, loan_id=g.loan_id)
        except Exception:
            pass

    db.commit()
    return n
