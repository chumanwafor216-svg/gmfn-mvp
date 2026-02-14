# app/services/repayments_service.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Tuple, Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Loan, Repayment, LoanGuarantor, ClanMembership, User
from app.services.trust_events_services import log_trust_event
from app.core.trust_event_types import TrustEventType


def _to_decimal(x) -> Decimal:
    return Decimal(str(x))


def _ensure_can_access_loan(db: Session, loan: Loan, user: User) -> ClanMembership:
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == user.id,
            ClanMembership.clan_id == loan.clan_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")
    return m


def _release_guarantor_locks_proportional(
    db: Session,
    *,
    loan_id: int,
    repayment_amount: Decimal,
) -> Dict[int, Dict[str, Any]]:
    """
    Release guarantor locked amounts proportionally as repayments happen.
    Only touches guarantors that are actually locked + approved.

    Returns per-guarantor deltas for useful TrustEvent logging:
      { guarantor_row_id: {guarantor_user_id, released_delta, locked_before, locked_after} }
    """
    if repayment_amount <= 0:
        return {}

    guarantors: List[LoanGuarantor] = (
        db.query(LoanGuarantor)
        .filter(
            LoanGuarantor.loan_id == loan_id,
            LoanGuarantor.status == "approved",
            LoanGuarantor.is_locked == True,  # noqa: E712
        )
        .all()
    )
    if not guarantors:
        return {}

    total_locked = sum((_to_decimal(g.locked_amount or 0) for g in guarantors), Decimal("0"))
    if total_locked <= 0:
        # Nothing to release
        for g in guarantors:
            g.is_locked = False
            g.locked_amount = Decimal("0")
        return {}

    deltas: Dict[int, Dict[str, Any]] = {}

    # Proportional release; rounding may leave tiny remainder, which is cleaned up on final repay.
    for g in guarantors:
        locked = _to_decimal(g.locked_amount or 0)
        released = _to_decimal(g.released_amount or 0)

        if locked <= 0:
            g.is_locked = False
            g.locked_amount = Decimal("0")
            continue

        locked_before = locked

        share = locked / total_locked
        delta = (repayment_amount * share).quantize(Decimal("0.01"))

        # Can't release more than what is locked
        actual_delta = min(delta, locked)

        if actual_delta > 0:
            g.locked_amount = (locked - actual_delta).quantize(Decimal("0.01"))
            g.released_amount = (released + actual_delta).quantize(Decimal("0.01"))

            if g.locked_amount <= 0:
                g.locked_amount = Decimal("0")
                g.is_locked = False

            deltas[int(g.id)] = {
                "guarantor_user_id": int(g.guarantor_user_id),
                "released_delta": str(actual_delta),
                "locked_before": str(locked_before),
                "locked_after": str(g.locked_amount),
            }

    return deltas


def create_repayment(
    db: Session,
    *,
    loan_id: int,
    payer: User,
    amount: Decimal,
) -> Tuple[Repayment, Loan]:
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    membership = _ensure_can_access_loan(db, loan, payer)

    # Only borrower or clan admin can post repayment (simple rule for now)
    is_borrower = int(loan.borrower_user_id) == int(payer.id)
    is_admin = (membership.role or "").lower() == "admin"
    if not (is_borrower or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed")

    if (loan.status or "").lower() != "approved":
        raise HTTPException(status_code=400, detail="Loan must be approved before repayment")

    pay_amount = _to_decimal(amount)
    if pay_amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be > 0")

    # Initialize aggregates if missing
    if loan.paid_total is None:
        loan.paid_total = Decimal("0")

    if loan.remaining_amount is None or _to_decimal(loan.remaining_amount) <= 0:
        loan.remaining_amount = (
            _to_decimal(loan.amount) - _to_decimal(loan.paid_total or 0)
        ).quantize(Decimal("0.01"))

    remaining = _to_decimal(loan.remaining_amount)
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="Loan already fully repaid")

    # Cap payment (no overpay)
    if pay_amount > remaining:
        pay_amount = remaining

    repayment = Repayment(
        loan_id=loan.id,
        payer_user_id=payer.id,
        amount=pay_amount,
    )
    db.add(repayment)

    # Update loan aggregates
    loan.paid_total = (_to_decimal(loan.paid_total) + pay_amount).quantize(Decimal("0.01"))
    loan.remaining_amount = (_to_decimal(loan.amount) - _to_decimal(loan.paid_total)).quantize(Decimal("0.01"))
    if loan.remaining_amount < 0:
        loan.remaining_amount = Decimal("0")

    # Release guarantor lock proportionally and capture deltas for logging
    deltas = _release_guarantor_locks_proportional(db, loan_id=loan.id, repayment_amount=pay_amount)

    # ✅ TrustEvent: repayment made
    log_trust_event(
        db,
        event_type=TrustEventType.REPAYMENT_MADE if hasattr(TrustEventType, "REPAYMENT_MADE") else "repayment.made",
        clan_id=int(loan.clan_id),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(payer.id),
        subject_user_id=int(loan.borrower_user_id),
        meta={
            "amount": str(pay_amount),
            "paid_total": str(loan.paid_total),
            "remaining_amount": str(loan.remaining_amount),
        },
    )

    # ✅ TrustEvent: guarantor locks released (summary)
    if deltas:
        log_trust_event(
            db,
            event_type=TrustEventType.GUARANTOR_LOCK_RELEASED if hasattr(TrustEventType, "GUARANTOR_LOCK_RELEASED") else "guarantor.lock_released",
            clan_id=int(loan.clan_id),
            loan_id=int(loan.id),
            guarantor_id=None,
            actor_user_id=int(payer.id),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "repayment_amount": str(pay_amount),
                "released_count": len(deltas),
                "released_deltas": deltas,
            },
        )

    # If fully repaid -> close loan + fully unlock approved guarantors
    if _to_decimal(loan.remaining_amount) <= 0:
        loan.repaid_at = datetime.now(timezone.utc)
        loan.remaining_amount = Decimal("0")
        loan.status = "repaid"

        guarantors = (
            db.query(LoanGuarantor)
            .filter(
                LoanGuarantor.loan_id == loan.id,
                LoanGuarantor.status == "approved",
            )
            .all()
        )
        for g in guarantors:
            locked = _to_decimal(g.locked_amount or 0)
            released = _to_decimal(g.released_amount or 0)
            g.released_amount = (released + locked).quantize(Decimal("0.01"))
            g.locked_amount = Decimal("0")
            g.is_locked = False

        log_trust_event(
            db,
            event_type=TrustEventType.LOAN_REPAID if hasattr(TrustEventType, "LOAN_REPAID") else "loan.repaid",
            clan_id=int(loan.clan_id),
            loan_id=int(loan.id),
            guarantor_id=None,
            actor_user_id=int(payer.id),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "paid_total": str(loan.paid_total),
                "repaid_at": loan.repaid_at.isoformat(),
            },
        )

    db.commit()
    db.refresh(repayment)
    db.refresh(loan)
    return repayment, loan


def list_repayments(db: Session, *, loan_id: int):
    """
    SAFE list repayments.
    If repayments table/model is missing or query fails, return empty list
    instead of crashing the whole API.
    """
    try:
        items = (
            db.query(Repayment)
            .filter(Repayment.loan_id == loan_id)
            .order_by(Repayment.id.desc())
            .all()
        )
        return items or []
    except Exception:
        return []