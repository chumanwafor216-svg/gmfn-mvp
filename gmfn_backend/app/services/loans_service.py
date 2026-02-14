# app/services/loans_service.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import List

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Loan, LoanGuarantor, ClanMembership
from app.services.guarantor_rules import require_clan_member
from app.services.trust_events_services import log_trust_event
from app.core.trust_event_types import TrustEventType
from app.services.loan_approval import approve_loan  # ✅ important: ensures approved loans are fully initialized

ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "declined", "no_response", "expired"}


def _to_decimal(x) -> Decimal:
    return Decimal(str(x))


def _loan_required_gap(loan: Loan) -> Decimal:
    """
    The amount guarantors must cover.
    Prefer Loan.guarantee_gap if present (recommended future column).
    Fallback: full loan amount (safe but less GMFN-correct).
    """
    gg = getattr(loan, "guarantee_gap", None)
    if gg is not None:
        return _to_decimal(gg)
    return _to_decimal(getattr(loan, "amount", 0) or 0)


def _sum_approved_locked(db: Session, *, loan_id: int) -> Decimal:
    raw = (
        db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0))
        .filter(LoanGuarantor.loan_id == loan_id, LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )
    return _to_decimal(raw)


# =========================
# GUARANTORS
# =========================
def add_loan_guarantor(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    guarantor_user_id: int,
    pledge_amount: Decimal | float | int | str = Decimal("0"),
) -> LoanGuarantor:
    require_clan_member(db, clan_id=clan_id, user_id=guarantor_user_id)

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(loan.clan_id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if (loan.status or "").lower() != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot add guarantors when loan status is '{loan.status}'")

    if int(loan.borrower_user_id) == int(guarantor_user_id):
        raise HTTPException(status_code=400, detail="Borrower cannot be a guarantor on their own loan")

    try:
        pledge = _to_decimal(pledge_amount)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid pledge_amount")

    # ✅ Freeze-grade rule: pending loans require real pledges (prevents 0-pledge approvals)
    if pledge <= 0:
        raise HTTPException(status_code=400, detail="pledge_amount must be > 0")

    # ✅ Availability check using pool - current exposure (only approved guarantors create exposure)
    m = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == guarantor_user_id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=400, detail="Guarantor is not a clan member")

    pool = _to_decimal(m.personal_pool_balance or 0)

    exposure_raw = (
        db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount), 0))
        .filter(
            LoanGuarantor.clan_id == clan_id,
            LoanGuarantor.guarantor_user_id == guarantor_user_id,
            LoanGuarantor.status == "approved",
        )
        .scalar()
        or 0
    )
    exposure = _to_decimal(exposure_raw)

    available = pool - exposure
    if available < 0:
        available = Decimal("0")

    if pledge > available:
        raise HTTPException(
            status_code=400,
            detail=f"Pledge exceeds guarantor available pool. Available={str(available)} Required={str(pledge)}",
        )

    row = LoanGuarantor(
        loan_id=loan_id,
        clan_id=clan_id,
        guarantor_user_id=guarantor_user_id,
        pledge_amount=pledge,
        status="pending",
        is_locked=False,
        locked_amount=Decimal("0"),
        released_amount=Decimal("0"),
    )

    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Guarantor already added for this loan")

    db.refresh(row)
    return row


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


def update_loan_guarantor_status(
    db: Session,
    *,
    guarantor_id: int,
    clan_id: int,
    status: str,
    decided_by_user_id: int,
) -> LoanGuarantor:
    if status not in ALLOWED_GUARANTOR_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if status not in {"approved", "declined"}:
        raise HTTPException(status_code=400, detail="Only 'approved' or 'declined' allowed here")

    g = db.get(LoanGuarantor, guarantor_id)
    if not g:
        raise HTTPException(status_code=404, detail="Guarantor not found")

    if int(g.clan_id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if g.status in {"approved", "declined", "expired", "no_response"}:
        raise HTTPException(status_code=400, detail="Guarantor already decided")

    loan = db.get(Loan, g.loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if (loan.status or "").lower() != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot decide guarantor when loan status is '{loan.status}'")

    # Default values for meta (safe for declined)
    pool = Decimal("0")
    exposure = Decimal("0")
    available = Decimal("0")

    # ✅ If approving: enforce availability AND lock the pledge
    if status == "approved":
        m = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == clan_id, ClanMembership.user_id == g.guarantor_user_id)
            .first()
        )
        if not m:
            raise HTTPException(status_code=400, detail="Guarantor is not a clan member")

        pool = _to_decimal(m.personal_pool_balance or 0)

        exposure_raw = (
            db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount), 0))
            .filter(
                LoanGuarantor.clan_id == clan_id,
                LoanGuarantor.guarantor_user_id == g.guarantor_user_id,
                LoanGuarantor.status == "approved",
            )
            .scalar()
            or 0
        )
        exposure = _to_decimal(exposure_raw)

        available = pool - exposure
        if available < 0:
            available = Decimal("0")

        pledge = _to_decimal(getattr(g, "pledge_amount", 0) or 0)
        if pledge <= 0:
            raise HTTPException(status_code=400, detail="pledge_amount must be > 0")

        if pledge > available:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient available pool for this pledge. Available={str(available)} Required={str(pledge)}",
            )

        g.is_locked = True
        g.locked_amount = pledge

    # Apply decision
    g.status = status
    g.responded_at = datetime.now(timezone.utc)

    event_type = (
        TrustEventType.GUARANTOR_APPROVED if status == "approved" else TrustEventType.GUARANTOR_DECLINED
    )

        # ✅ TrustEvent meta: strings only (no float drift)
    log_trust_event(
        db,
        event_type=event_type,
        clan_id=int(g.clan_id),
        loan_id=int(g.loan_id),
        guarantor_id=int(g.id),
        actor_user_id=int(decided_by_user_id),
        subject_user_id=int(loan.borrower_user_id),
        meta={
            "guarantor_user_id": int(g.guarantor_user_id),
            "status": status,
            "pledge_amount": str(getattr(g, "pledge_amount", 0) or 0),
            "loan_amount": str(getattr(loan, "amount", 0) or 0),
            "locked_amount": str(getattr(g, "locked_amount", 0) or 0),
            "pool_balance": str(pool) if status == "approved" else None,
            "exposure_before": str(exposure) if status == "approved" else None,
            "available_before": str(available) if status == "approved" else None,
        },
    )

    db.commit()
    db.refresh(g)

    evaluate_loan_after_guarantor_change(db, loan_id=int(loan.id))

    return g


# =========================
# LOAN AUTO-DECISION
# =========================
def _loan_required_gap(loan: Loan) -> Decimal:
    gap = Decimal(str(getattr(loan, "guarantee_gap", 0) or 0))
    return gap


def _sum_approved_locked(db: Session, *, loan_id: int) -> Decimal:
    raw = (
        db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0))
        .filter(
            LoanGuarantor.loan_id == loan_id,
            LoanGuarantor.status == "approved",
        )
        .scalar()
        or 0
    )
    return Decimal(str(raw))


def evaluate_loan_after_guarantor_change(db: Session, *, loan_id: int) -> Loan:
    """
    Freeze-grade auto-decision:
    - Requires approved guarantor count >= guarantors_required
    - Requires locked coverage (sum locked) >= required gap
    - Uses approve_loan() so approved loans ALWAYS get fees + remaining_amount set correctly
    """
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if (loan.status or "").lower() != "pending":
        return loan

    required_count = int(loan.guarantors_required or 0)
    if required_count <= 0:
        return loan

    approved = (
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == loan_id, LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )
    pending = (
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == loan_id, LoanGuarantor.status == "pending")
        .scalar()
        or 0
    )
    declined = (
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == loan_id, LoanGuarantor.status == "declined")
        .scalar()
        or 0
    )
    expired = (
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == loan_id, LoanGuarantor.status == "expired")
        .scalar()
        or 0
    )

    required_gap = _loan_required_gap(loan)
    coverage = _sum_approved_locked(db, loan_id=loan_id)

    if approved >= required_count and coverage >= required_gap:
        approve_loan(
            db=db,
            loan=loan,
            decided_by_user_id=int(loan.borrower_user_id),  # system-context MVP choice
        )

        log_trust_event(
            db,
            event_type=TrustEventType.LOAN_AUTO_APPROVED,
            clan_id=int(loan.clan_id),
            loan_id=int(loan.id),
            guarantor_id=None,
            actor_user_id=int(loan.borrower_user_id),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "required_count": int(required_count),
                "approved": int(approved),
                "pending": int(pending),
                "declined": int(declined),
                "expired": int(expired),
                "required_gap": str(required_gap),
                "coverage": str(coverage),
                "system": True,
            },
        )
        db.commit()
        db.refresh(loan)
        return loan

    if approved + pending < required_count:
        loan.status = "declined"
        loan.decision_at = datetime.now(timezone.utc)

        log_trust_event(
            db,
            event_type=TrustEventType.LOAN_AUTO_REJECTED,
            clan_id=int(loan.clan_id),
            loan_id=int(loan.id),
            guarantor_id=None,
            actor_user_id=int(loan.borrower_user_id),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "required_count": int(required_count),
                "approved": int(approved),
                "pending": int(pending),
                "declined": int(declined),
                "expired": int(expired),
                "required_gap": str(required_gap),
                "coverage": str(coverage),
                "system": True,
                "reason": "not_enough_possible_approvals",
            },
        )
        db.commit()
        db.refresh(loan)
        return loan

    return loan