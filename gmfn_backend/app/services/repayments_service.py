from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import ClanMembership, Loan, LoanGuarantor, Repayment, User
from app.services.trust_events_services import log_trust_event


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
        raise HTTPException(status_code=403, detail="Not allowed (not in clan)")
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
) -> Tuple[Repayment, Loan]:
    """
    Deterministic repayment application.

    MVP-safe rules:
    - borrower or clan admin can repay
    - Decimal-only math
    - repayment is CLAMPED to remaining balance (prevents paid_total > loan_amount)
    - releases guarantor locks only on full repayment
    - logs TrustEvents
    """
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

    m = _require_clan_member(db, clan_id=clan_id, user_id=_uid(payer))
    is_admin = (getattr(m, "role", "") or "").lower() == "admin"
    is_borrower = int(getattr(loan, "borrower_user_id", 0) or 0) == _uid(payer)
    if not (is_admin or is_borrower):
        raise HTTPException(status_code=403, detail="Only borrower or clan admin can repay")

    status = (getattr(loan, "status", "") or "").lower().strip()
    if status in {"repaid", "cancelled"}:
        raise HTTPException(status_code=400, detail=f"Loan status '{loan.status}' does not accept repayments")

    loan_amount = _d(getattr(loan, "amount", None))
    paid_total_before = _d(getattr(loan, "paid_total", None))

    remaining_before = _d(getattr(loan, "remaining_amount", None))
    if remaining_before <= 0:
        remaining_before = max(Decimal("0"), loan_amount - paid_total_before)

    # ✅ clamp to remaining
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

    loan.paid_total = new_paid_total
    loan.remaining_amount = remaining_after

    if remaining_after == Decimal("0"):
        loan.status = "repaid"
        loan.repaid_at = _now_utc()

    log_trust_event(
        db,
        event_type="repayment.created",
        clan_id=clan_id,
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=_uid(payer),
        subject_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
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
        },
    )

    if remaining_after == Decimal("0"):
        guars = (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.loan_id == int(loan.id))
            .filter(LoanGuarantor.status == "approved")
            .all()
        )
        for g in guars:
            locked = _d(getattr(g, "locked_amount", None))
            released = _d(getattr(g, "released_amount", None))
            if locked > released:
                g.released_amount = locked
            g.is_locked = False

        log_trust_event(
            db,
            event_type="loan.repaid",
            clan_id=clan_id,
            loan_id=int(loan.id),
            guarantor_id=None,
            actor_user_id=_uid(payer),
            subject_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
            meta={
                "reason": "loan_fully_repaid",
                "amount": str(loan_amount),
                "paid_total": str(new_paid_total),
                "released_guarantors": True,
            },
        )

    db.commit()
    db.refresh(rep)
    db.refresh(loan)
    return rep, loan