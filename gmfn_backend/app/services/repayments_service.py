from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import ClanMembership, Loan, LoanGuarantor, Repayment, User
from app.services.notification_hooks import notify_loan_repaid
from app.services.trust_events_services import (
    log_guarantee_released,
    log_loan_repaid,
    log_trust_event,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _uid(u: User) -> int:
    return int(getattr(u, "id", 0) or 0)


def _d(x) -> Decimal:
    if x is None:
        return Decimal("0")
    try:
        return Decimal(str(x))
    except Exception:
        return Decimal("0")


def _require_clan_member(db: Session, *, clan_id: int, user_id: int) -> ClanMembership:
    m = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(clan_id), ClanMembership.user_id == int(user_id))
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed (not in community)")
    return m


def list_repayments(db: Session, *, loan_id: int) -> List[Repayment]:
    return (
        db.query(Repayment)
        .filter(Repayment.loan_id == int(loan_id))
        .order_by(Repayment.id.asc())
        .all()
    )


def create_repayment(
    *,
    db: Session,
    loan_id: int,
    payer: User,
    amount: Decimal,
    payment_reference: str | None = None,
    confirmed_by_user_id: int | None = None,
) -> Tuple[Repayment, Loan]:
    if _uid(payer) <= 0:
        raise HTTPException(status_code=401, detail="Not authenticated")

    requested = _d(amount)
    if requested <= 0:
        raise HTTPException(status_code=400, detail="amount must be > 0")

    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    clan_id = int(getattr(loan, "clan_id", 0) or 0)
    if clan_id <= 0:
        raise HTTPException(status_code=500, detail="Loan missing clan_id")

    borrower_user_id = int(getattr(loan, "borrower_user_id", 0) or 0)

    m = _require_clan_member(db, clan_id=clan_id, user_id=_uid(payer))
    is_admin = (getattr(m, "role", "") or "").lower() == "admin"
    is_borrower = borrower_user_id == _uid(payer)
    if not (is_admin or is_borrower):
        raise HTTPException(status_code=403, detail="Only borrower or community admin can repay")

    status = (getattr(loan, "status", "") or "").lower().strip()
    if status in {"repaid", "cancelled", "defaulted"}:
        raise HTTPException(status_code=400, detail=f"Loan status '{loan.status}' does not accept repayments")

    loan_amount = _d(getattr(loan, "amount", None))
    paid_total_before = _d(getattr(loan, "paid_total", None))

    remaining_before = _d(getattr(loan, "remaining_amount", None))
    if remaining_before <= 0:
        remaining_before = max(Decimal("0"), loan_amount - paid_total_before)

    applied = requested if requested <= remaining_before else remaining_before
    overpayment = requested - applied

    if applied <= 0:
        raise HTTPException(status_code=400, detail="Nothing remaining to repay")

    new_paid_total = paid_total_before + applied
    remaining_after = loan_amount - new_paid_total
    if remaining_after < 0:
        remaining_after = Decimal("0")

    rep = Repayment(
        loan_id=int(loan.id),
        payer_user_id=_uid(payer),
        amount=applied,
        created_at=_now_utc(),
    )
    db.add(rep)
    db.flush()

    loan.paid_total = new_paid_total
    loan.remaining_amount = remaining_after

    fully_repaid = remaining_after == Decimal("0")
    if fully_repaid:
        loan.status = "repaid"
        loan.repaid_at = _now_utc()

    log_trust_event(
        db,
        event_type="repayment.created",
        clan_id=clan_id,
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=_uid(payer),
        subject_user_id=borrower_user_id,
        meta={
            "reason": "repayment_created",
            "amount": str(applied),
            "requested_amount": str(requested),
            "overpayment": str(overpayment) if overpayment > 0 else "0",
            "loan_amount": str(loan_amount),
            "paid_total_before": str(paid_total_before),
            "paid_total_after": str(new_paid_total),
            "remaining_before": str(remaining_before),
            "remaining_after": str(remaining_after),
            "loan_status_after": str(getattr(loan, "status", None)),
            "payment_reference": payment_reference,
            "confirmed_by_user_id": confirmed_by_user_id,
        },
        commit=False,
        refresh=False,
    )

    if fully_repaid:
        guars = (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.loan_id == int(loan.id))
            .filter(LoanGuarantor.status == "approved")
            .all()
        )

        for g in guars:
            locked = _d(getattr(g, "locked_amount", None))
            already_released = _d(getattr(g, "released_amount", None))

            if locked > Decimal("0"):
                g.released_amount = already_released + locked
                g.locked_amount = Decimal("0")
                g.is_locked = False

                log_guarantee_released(
                    db,
                    clan_id=clan_id,
                    actor_user_id=_uid(payer),
                    borrower_user_id=borrower_user_id,
                    guarantor_user_id=int(getattr(g, "guarantor_user_id", 0) or 0),
                    loan_id=int(loan.id),
                    guarantor_id=int(getattr(g, "id", 0) or 0),
                    released_amount=locked,
                    release_reason="loan_fully_repaid",
                    note="Locked supporter responsibility released because the loan was fully repaid.",
                    commit=False,
                    refresh=False,
                )

        log_loan_repaid(
            db,
            clan_id=clan_id,
            actor_user_id=_uid(payer),
            borrower_user_id=borrower_user_id,
            loan_id=int(loan.id),
            amount=loan_amount,
            confirmed_by_user_id=int(confirmed_by_user_id or _uid(payer)),
            payment_reference=payment_reference,
            reason="loan_fully_repaid",
            note="Loan balance reached zero through confirmed repayment.",
            commit=False,
            refresh=False,
        )

    db.commit()
    db.refresh(rep)
    db.refresh(loan)

    if fully_repaid:
        notify_loan_repaid(
            db,
            borrower_user_id=borrower_user_id,
            loan_id=int(loan.id),
        )

    return rep, loan
