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
from app.services.loan_approval import approve_loan  # ✅ strict finalization (fees, remaining_amount, etc.)

ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "declined", "no_response", "expired"}

# ✅ New: loans may remain "incomplete" while borrower decides next step (add guarantor or cancel)
ACTIVE_LOAN_STATUSES_FOR_GUARANTORS = {"pending", "incomplete"}


def _to_decimal(x) -> Decimal:
    return Decimal(str(x))


def _loan_required_gap(loan: Loan) -> Decimal:
    """
    The amount guarantors must cover.
    Prefer Loan.guarantee_gap if present (recommended column).
    Fallback: full loan amount (safe but less GMFN-correct).
    """
    gg = getattr(loan, "guarantee_gap", None)
    if gg is not None:
        return _to_decimal(gg)
    return _to_decimal(getattr(loan, "amount", 0) or 0)


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

    # ✅ NEW: allow adding guarantors while loan is pending OR incomplete (decision window)
    if (loan.status or "").lower() not in ACTIVE_LOAN_STATUSES_FOR_GUARANTORS:
        raise HTTPException(status_code=400, detail=f"Cannot add guarantors when loan status is '{loan.status}'")

    if int(loan.borrower_user_id) == int(guarantor_user_id):
        raise HTTPException(status_code=400, detail="Borrower cannot be a guarantor on their own loan")

    try:
        pledge = _to_decimal(pledge_amount)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid pledge_amount")

    # ✅ Freeze-grade rule: require real pledges (prevents 0-pledge approvals)
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

    # ✅ NEW: allow decisions while loan is pending OR incomplete
    if (loan.status or "").lower() not in ACTIVE_LOAN_STATUSES_FOR_GUARANTORS:
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
def evaluate_loan_after_guarantor_change(db: Session, *, loan_id: int) -> Loan:
    """
    GMFN decision policy (Chuma):
    - Must meet BOTH:
        (1) quorum: approved_count >= guarantors_required
        (2) coverage: sum(locked_amount of approved guarantors) >= guarantee_gap
    - If not complete:
        -> status becomes "incomplete" (NOT declined)
        -> app should prompt: "Continue? Add another guarantor (suggestions) or cancel."
        -> later: auto-cancel after 2 minutes (handled elsewhere / endpoint)
    """
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    # Only act on loans that are still in-progress
    if (loan.status or "").lower() not in ACTIVE_LOAN_STATUSES_FOR_GUARANTORS:
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

    # ✅ COMPLETE → approve strictly via approve_loan()
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

    # ✅ NOT COMPLETE YET → mark incomplete IF there is any activity (any guarantors exist)
    # This ensures the borrower sees the "continue or cancel" prompt.
    if (loan.status or "").lower() != "incomplete":
        loan.status = "incomplete"
        loan.decision_at = datetime.now(timezone.utc)  # used as "incomplete_since" marker for MVP

        log_trust_event(
            db,
            event_type=TrustEventType.LOAN_INCOMPLETE,
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
                "reason": "incomplete_quorum_or_coverage",
                "prompt": "Continue? Add another guarantor (see suggestions) or cancel.",
                "auto_cancel_seconds": 120,
            },
        )

        db.commit()
        db.refresh(loan)

    return loan
# =========================
# CANCEL + UNLOCK
# =========================
def cancel_loan(db: Session, *, loan_id: int, clan_id: int, actor_user_id: int) -> Loan:
    """
    Cancels a pending/incomplete loan and releases locked guarantor funds.
    Matches Chuma's policy:
      - borrower can cancel politely
      - system can auto-cancel after ~2 minutes
      - cancellation releases locks (no permanent punishment for incompleteness)
    """
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(loan.clan_id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if (loan.status or "").lower() not in {"pending", "incomplete"}:
        raise HTTPException(status_code=400, detail=f"Cannot cancel loan when status is '{loan.status}'")

    guarantors = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan_id, LoanGuarantor.clan_id == clan_id)
        .all()
    )

    for g in guarantors:
        if bool(getattr(g, "is_locked", False)):
            locked = _to_decimal(getattr(g, "locked_amount", 0) or 0)
            if locked > 0:
                g.released_amount = _to_decimal(getattr(g, "released_amount", 0) or 0) + locked
                g.locked_amount = Decimal("0")
            g.is_locked = False

        # Optional: close pending guarantors as expired
        if g.status == "pending":
            g.status = "expired"
            g.responded_at = datetime.now(timezone.utc)

    loan.status = "cancelled"
    loan.decision_at = datetime.now(timezone.utc)

    cancelled_event_type = getattr(TrustEventType, "LOAN_CANCELLED", TrustEventType.LOAN_AUTO_REJECTED)

    log_trust_event(
        db,
        event_type=cancelled_event_type,
        clan_id=int(loan.clan_id),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(loan.borrower_user_id),
        meta={
            "system": False,
            "reason": "cancelled",
        },
    )

    db.commit()
    db.refresh(loan)
    return loan 
