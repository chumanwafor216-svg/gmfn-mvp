# app/services/loans_service.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from math import ceil
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Loan, LoanGuarantor, ClanMembership
from app.services.guarantor_rules import require_clan_member
from app.services.trust_events_services import log_trust_event
from app.core.trust_event_types import TrustEventType
from app.services.loan_approval import approve_loan  # strict finalization (fees, remaining_amount, etc.)

# =========================
# CONFIG / CONSTANTS
# =========================

ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "declined", "no_response", "expired"}

# loans may remain "incomplete" while borrower decides next step (add guarantor or cancel)
ACTIVE_LOAN_STATUSES_FOR_GUARANTORS = {"pending", "incomplete"}


# =========================
# HELPERS
# =========================

def _to_decimal(x) -> Decimal:
    return Decimal(str(x))


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _count_clan_members(db: Session, *, clan_id: int) -> int:
    return int(
        db.query(func.count(ClanMembership.id))
        .filter(ClanMembership.clan_id == clan_id)
        .scalar()
        or 0
    )


def compute_guarantors_required_for_amount(
    db: Session,
    *,
    clan_id: int,
    loan_amount: Decimal,
    personal_pool: Decimal,
) -> int:
    """
    GMFN social-pressure rule (scaled by clan size).

    Reference (15-member clan baseline):
      - loan <= pool: 0 guarantors
      - loan > pool and <= 1x pool: 4 guarantors  (~26.67%)
      - loan > 1x pool and <= 2x pool: 8 guarantors (~53.33%)
      - loan > 2x pool: 12 guarantors (~80%)

    Scaling:
      required = ceil(pct * clan_size), clamped to [1, clan_size-1] when loan > pool.
    """
    if personal_pool <= Decimal("0"):
        return 0

    if loan_amount <= personal_pool:
        return 0

    ratio = loan_amount / personal_pool

    if ratio <= Decimal("1"):
        pct = Decimal("0.2667")
    elif ratio <= Decimal("2"):
        pct = Decimal("0.5333")
    else:
        pct = Decimal("0.8000")

    clan_size = _count_clan_members(db, clan_id=clan_id)
    if clan_size <= 1:
        return 0

    # ceil(pct * clan_size) – pct is not money; float here is acceptable
    required = int(ceil(float(pct) * float(clan_size)))

    if required < 1:
        required = 1
    if required > (clan_size - 1):
        required = clan_size - 1
    return required


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
        .filter(LoanGuarantor.loan_id == loan_id)
        .filter(LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )
    return _to_decimal(raw)


def _count_by_status(db: Session, *, loan_id: int, status: str) -> int:
    return int(
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == loan_id)
        .filter(LoanGuarantor.status == status)
        .scalar()
        or 0
    )


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
        -> app should prompt: "Continue? Add another guarantor (see suggestions) or cancel."
        -> later: auto-cancel after 2 minutes (handled elsewhere / endpoint)
    """
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    # Only act on loans that are still in-progress
    if (loan.status or "").lower() not in ACTIVE_LOAN_STATUSES_FOR_GUARANTORS:
        return loan

    required_count = int(getattr(loan, "guarantors_required", 0) or 0)
    if required_count <= 0:
        return loan

    approved = _count_by_status(db, loan_id=loan_id, status="approved")
    pending = _count_by_status(db, loan_id=loan_id, status="pending")
    declined = _count_by_status(db, loan_id=loan_id, status="declined")
    expired = _count_by_status(db, loan_id=loan_id, status="expired")

    required_gap = _loan_required_gap(loan)
    coverage = _sum_approved_locked(db, loan_id=loan_id)

    # COMPLETE -> approve strictly via approve_loan()
    if approved >= required_count and coverage >= required_gap:
        approve_loan(
            db=db,
            loan=loan,
            decided_by_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),  # system-context MVP choice
        )

        log_trust_event(
            db,
            event_type=TrustEventType.LOAN_AUTO_APPROVED,
            clan_id=int(getattr(loan, "clan_id", 0) or 0),
            loan_id=int(getattr(loan, "id", 0) or 0),
            guarantor_id=None,
            actor_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
            subject_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
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

    # NOT COMPLETE YET -> mark incomplete IF there is any activity (any guarantors exist)
    # This ensures the borrower sees the "continue or cancel" prompt.
    if (loan.status or "").lower() != "incomplete":
        loan.status = "incomplete"
        loan.decision_at = _now_utc()  # used as "incomplete_since" marker for MVP

        log_trust_event(
            db,
            event_type=TrustEventType.LOAN_INCOMPLETE,
            clan_id=int(getattr(loan, "clan_id", 0) or 0),
            loan_id=int(getattr(loan, "id", 0) or 0),
            guarantor_id=None,
            actor_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
            subject_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
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

    if int(getattr(loan, "clan_id", 0) or 0) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    # allow adding guarantors while loan is pending OR incomplete
    if (loan.status or "").lower() not in ACTIVE_LOAN_STATUSES_FOR_GUARANTORS:
        raise HTTPException(status_code=400, detail=f"Cannot add guarantors when loan status is '{loan.status}'")

    if int(getattr(loan, "borrower_user_id", 0) or 0) == int(guarantor_user_id):
        raise HTTPException(status_code=400, detail="Borrower cannot be a guarantor on their own loan")

    try:
        pledge = _to_decimal(pledge_amount)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid pledge_amount")

    # freeze-grade rule: require real pledges (prevents 0-pledge approvals)
    if pledge <= Decimal("0"):
        raise HTTPException(status_code=400, detail="pledge_amount must be > 0")

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


def list_loan_guarantors(db: Session, *, loan_id: int, clan_id: int) -> List[LoanGuarantor]:
    return (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan_id)
        .filter(LoanGuarantor.clan_id == clan_id)
        .order_by(LoanGuarantor.id.desc())
        .all()
    )


def count_approved_guarantors(db: Session, *, loan_id: int) -> int:
    return int(
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == loan_id)
        .filter(LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )


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

    if int(getattr(loan, "clan_id", 0) or 0) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if (loan.status or "").lower() not in {"pending", "incomplete"}:
        raise HTTPException(status_code=400, detail=f"Cannot cancel loan when status is '{loan.status}'")

    guarantors = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan_id)
        .filter(LoanGuarantor.clan_id == clan_id)
        .all()
    )

    # Release any locks (actual return-to-balance logic lives in guarantor_service in your build;
    # here we only update the guarantor rows and log evidence).
    for g in guarantors:
        if bool(getattr(g, "is_locked", False)):
            # Mark released (do NOT invent money moves here)
            g.released_amount = _to_decimal(getattr(g, "locked_amount", 0) or 0)
            g.locked_amount = Decimal("0")
            g.is_locked = False

    loan.status = "cancelled"
    loan.decision_at = _now_utc()

    log_trust_event(
        db,
        event_type=TrustEventType.LOAN_CANCELLED,
        clan_id=int(getattr(loan, "clan_id", 0) or 0),
        loan_id=int(getattr(loan, "id", 0) or 0),
        guarantor_id=None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
        meta={
            "system": False,
            "reason": "cancelled",
        },
    )

    db.commit()
    db.refresh(loan)
    return loan
    # ============================
# COMPAT EXPORT (DO NOT REMOVE)
# ============================
# Some routes import update_loan_guarantor_status from this module.
# We keep this as a stable wrapper even if the implementation lives elsewhere.

from typing import Any

def update_loan_guarantor_status(
    db: "Session",
    *,
    guarantor_id: int,
    clan_id: int,
    status: str,
    decided_by_user_id: int,
) -> Any:
    """
    Backward-compatible wrapper.

    Delegates to app.services.guarantor_service.update_loan_guarantor_status
    if present, otherwise raises a clear error.
    """
    try:
        from app.services.guarantor_service import update_loan_guarantor_status as _impl
    except Exception as e:
        raise RuntimeError(
            "update_loan_guarantor_status wrapper exists, but "
            "app.services.guarantor_service.update_loan_guarantor_status is missing."
        ) from e

    return _impl(
        db,
        guarantor_id=guarantor_id,
        clan_id=clan_id,
        status=status,
        decided_by_user_id=decided_by_user_id,
    )
    