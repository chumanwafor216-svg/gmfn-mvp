# app/services/loans_service.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_CEILING
from typing import Any, List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import ClanMembership, Loan, LoanGuarantor
from app.services.guarantor_rules import require_clan_member
from app.services.loan_approval import approve_loan
from app.services.trust_events_services import (
    log_guarantee_released,
    log_loan_defaulted,
    log_trust_event,
)

# =========================
# CONFIG / CONSTANTS
# =========================

ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "declined", "no_response", "expired"}
ACTIVE_LOAN_STATUSES_FOR_GUARANTORS = {"pending", "incomplete"}


# =========================
# HELPERS
# =========================

def _to_decimal(x: Any) -> Decimal:
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_status(status: str) -> str:
    value = str(status or "").strip().lower()
    if not value:
        raise HTTPException(status_code=400, detail="status is required")
    return value


def _count_clan_members(db: Session, *, clan_id: int) -> int:
    return int(
        db.query(func.count(ClanMembership.id))
        .filter(ClanMembership.clan_id == int(clan_id))
        .scalar()
        or 0
    )


def _loan_required_gap(loan: Loan) -> Decimal:
    gg = getattr(loan, "guarantee_gap", None)
    if gg is not None:
        return _to_decimal(gg)
    return _to_decimal(getattr(loan, "amount", 0) or 0)


def _sum_approved_locked(db: Session, *, loan_id: int) -> Decimal:
    raw = (
        db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0))
        .filter(LoanGuarantor.loan_id == int(loan_id))
        .filter(LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )
    return _to_decimal(raw)


def _count_by_status(db: Session, *, loan_id: int, status: str) -> int:
    return int(
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == int(loan_id))
        .filter(LoanGuarantor.status == status)
        .scalar()
        or 0
    )


def _list_loan_guarantors_for_clan(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
) -> List[LoanGuarantor]:
    return (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == int(loan_id))
        .filter(LoanGuarantor.clan_id == int(clan_id))
        .all()
    )


# =========================
# GUARANTOR REQUIREMENT RULE
# =========================

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
      - loan > pool and <= 1x pool: 4 guarantors
      - loan > 1x pool and <= 2x pool: 8 guarantors
      - loan > 2x pool: 12 guarantors

    Scaling:
      required = ceil(pct * clan_size), clamped to [1, clan_size-1] when loan > pool.
    """
    loan_amount = _to_decimal(loan_amount)
    personal_pool = _to_decimal(personal_pool)

    if loan_amount <= Decimal("0"):
        return 0

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

    clan_size = _count_clan_members(db, clan_id=int(clan_id))
    if clan_size <= 1:
        return 0

    raw = (pct * Decimal(clan_size)).to_integral_value(rounding=ROUND_CEILING)
    required = int(raw)

    if required < 1:
        required = 1
    if required > (clan_size - 1):
        required = clan_size - 1
    return required


# =========================
# LOAN AUTO-DECISION
# =========================

def evaluate_loan_after_guarantor_change(db: Session, *, loan_id: int) -> Loan:
    """
    GMFN decision policy:
    - Must meet BOTH:
        (1) quorum: approved_count >= guarantors_required
        (2) coverage: sum(locked_amount of approved guarantors) >= guarantee_gap
    - If not complete:
        -> status becomes "incomplete" (NOT declined)
        -> borrower may continue by adding another guarantor or cancel.
    """
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if (loan.status or "").lower() not in ACTIVE_LOAN_STATUSES_FOR_GUARANTORS:
        return loan

    required_count = int(getattr(loan, "guarantors_required", 0) or 0)
    if required_count <= 0:
        return loan

    approved = _count_by_status(db, loan_id=int(loan_id), status="approved")
    pending = _count_by_status(db, loan_id=int(loan_id), status="pending")
    declined = _count_by_status(db, loan_id=int(loan_id), status="declined")
    expired = _count_by_status(db, loan_id=int(loan_id), status="expired")

    required_gap = _loan_required_gap(loan)
    coverage = _sum_approved_locked(db, loan_id=int(loan_id))

    if approved >= required_count and coverage >= required_gap:
        approve_loan(
            db=db,
            loan=loan,
            decided_by_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
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
            commit=False,
            refresh=False,
        )

        db.commit()
        db.refresh(loan)
        return loan

    if (loan.status or "").lower() != "incomplete":
        loan.status = "incomplete"
        loan.decision_at = _now_utc()

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
            commit=False,
            refresh=False,
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
    require_clan_member(db, clan_id=int(clan_id), user_id=int(guarantor_user_id))

    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(getattr(loan, "clan_id", 0) or 0) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if (loan.status or "").lower() not in ACTIVE_LOAN_STATUSES_FOR_GUARANTORS:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot add guarantors when loan status is '{loan.status}'",
        )

    if int(getattr(loan, "borrower_user_id", 0) or 0) == int(guarantor_user_id):
        raise HTTPException(
            status_code=400,
            detail="Borrower cannot be a guarantor on their own loan",
        )

    try:
        pledge = _to_decimal(pledge_amount)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid pledge_amount")

    if pledge <= Decimal("0"):
        raise HTTPException(status_code=400, detail="pledge_amount must be > 0")

    row = LoanGuarantor(
        loan_id=int(loan_id),
        clan_id=int(clan_id),
        guarantor_user_id=int(guarantor_user_id),
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
        .filter(LoanGuarantor.loan_id == int(loan_id))
        .filter(LoanGuarantor.clan_id == int(clan_id))
        .order_by(LoanGuarantor.id.desc())
        .all()
    )


def count_approved_guarantors(db: Session, *, loan_id: int) -> int:
    return int(
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == int(loan_id))
        .filter(LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )


def list_guarantor_inbox(
    db: Session,
    *,
    clan_id: int,
    guarantor_user_id: int,
    status: Optional[str] = "pending",
    limit: int = 50,
) -> List[LoanGuarantor]:
    """
    Guarantor-centric inbox list.
    """
    lim = int(limit or 50)
    lim = max(1, min(lim, 200))

    q = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.clan_id == int(clan_id))
        .filter(LoanGuarantor.guarantor_user_id == int(guarantor_user_id))
        .order_by(LoanGuarantor.id.desc())
    )

    if status:
        q = q.filter(LoanGuarantor.status == _normalize_status(status))

    return q.limit(lim).all()


# =========================
# CANCEL + UNLOCK
# =========================

def cancel_loan(db: Session, *, loan_id: int, clan_id: int, actor_user_id: int) -> Loan:
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(getattr(loan, "clan_id", 0) or 0) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if (loan.status or "").lower() not in {"pending", "incomplete"}:
        raise HTTPException(status_code=400, detail="Loan cannot be cancelled")

    guarantors = _list_loan_guarantors_for_clan(db, loan_id=loan_id, clan_id=clan_id)

    for g in guarantors:
        locked_amount = _to_decimal(getattr(g, "locked_amount", 0) or 0)

        if bool(getattr(g, "is_locked", False)) and locked_amount > Decimal("0"):
            g.released_amount = _to_decimal(getattr(g, "released_amount", 0) or 0) + locked_amount
            g.locked_amount = Decimal("0")
            g.is_locked = False

            log_guarantee_released(
                db,
                clan_id=clan_id,
                actor_user_id=actor_user_id,
                borrower_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
                guarantor_user_id=int(getattr(g, "guarantor_user_id", 0) or 0),
                loan_id=int(loan.id),
                guarantor_id=int(g.id),
                released_amount=locked_amount,
                release_reason="loan_cancelled",
                note="Guarantor exposure released after cancellation",
                commit=False,
                refresh=False,
            )

    loan.status = "cancelled"
    loan.decision_at = _now_utc()

    log_trust_event(
        db,
        event_type=TrustEventType.LOAN_CANCELLED,
        clan_id=clan_id,
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=actor_user_id,
        subject_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
        meta={"reason": "cancelled"},
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(loan)
    return loan


# =========================
# DEFAULT
# =========================

def mark_loan_defaulted(
    db: Session,
    *,
    loan_id: int,
    clan_id: int,
    actor_user_id: int,
    reason: Optional[str] = None,
    note: Optional[str] = None,
    days_past_due: Optional[int] = None,
    trigger_mode: Optional[str] = None,
) -> Loan:
    """
    Deterministically mark a loan as defaulted.

    Locked guarantor exposure is intentionally not auto-released here.
    """
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(getattr(loan, "clan_id", 0) or 0) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    status = (getattr(loan, "status", "") or "").lower()
    if status in {"repaid", "cancelled", "defaulted"}:
        raise HTTPException(status_code=400, detail="Loan cannot be defaulted")

    remaining_amount = _to_decimal(getattr(loan, "remaining_amount", 0) or 0)
    if remaining_amount <= Decimal("0"):
        remaining_amount = _to_decimal(getattr(loan, "amount", 0) or 0) - _to_decimal(
            getattr(loan, "paid_total", 0) or 0
        )
        if remaining_amount < Decimal("0"):
            remaining_amount = Decimal("0")

    now = _now_utc()
    loan.status = "defaulted"
    loan.decision_at = now

    if hasattr(loan, "defaulted_at"):
        setattr(loan, "defaulted_at", now)

    log_loan_defaulted(
        db,
        clan_id=int(getattr(loan, "clan_id", 0) or 0),
        actor_user_id=int(actor_user_id),
        borrower_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
        loan_id=int(getattr(loan, "id", 0) or 0),
        default_amount=remaining_amount,
        days_past_due=days_past_due,
        trigger_mode=trigger_mode or "manual",
        reason=reason or "loan_defaulted",
        note=note,
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(loan)
    return loan


# ============================
# COMPAT EXPORT (DO NOT REMOVE)
# ============================

def update_loan_guarantor_status(
    db: Session,
    *,
    guarantor_id: int,
    clan_id: int,
    status: str,
    decided_by_user_id: int,
    reason: Optional[str] = None,
    note: Optional[str] = None,
) -> Any:
    from app.services.guarantor_service import update_loan_guarantor_status as _impl

    normalized_status = _normalize_status(status)
    if normalized_status not in ALLOWED_GUARANTOR_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid guarantor status '{normalized_status}'",
        )

    return _impl(
        db,
        guarantor_id=int(guarantor_id),
        clan_id=int(clan_id),
        status=normalized_status,
        decided_by_user_id=int(decided_by_user_id),
        reason=reason,
        note=note,
    )