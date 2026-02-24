# app/services/pool_service.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Loan, PoolEvent


# -------------------------
# Helpers
# -------------------------
def _d(x: object) -> Decimal:
    if isinstance(x, Decimal):
        return x
    if x is None:
        return Decimal("0")
    return Decimal(str(x))


def _ccy(currency: str | None) -> str:
    return (currency or "NGN").strip().upper() or "NGN"


def build_reference(clan_id: int, user_id: int) -> str:
    return f"GMFN-CLAN-{int(clan_id)}-U{int(user_id)}"


# -------------------------
# Core balances (B2 + reservation)
# -------------------------
def compute_pool_balances(db: Session, *, clan_id: int, user_id: int, currency: str) -> Dict[str, Decimal]:
    """
    Non-custodial pool ledger (pilot).

    Confirmed:
      available = sum(deposit.confirmed) - sum(withdrawal.confirmed)

    Pending:
      pending_deposits = sum(deposit.requested)
      pending_withdrawals = sum(withdrawal.requested)

    B2 reservation honesty:
      reserved_pool = sum(Loan.pool_used) for ACTIVE loans (pending/approved)
      effective_available = max(0, available - reserved_pool)
    """
    ccy = _ccy(currency)

    dep_confirmed = (
        db.query(func.coalesce(func.sum(PoolEvent.amount), 0))
        .filter(
            PoolEvent.clan_id == int(clan_id),
            PoolEvent.user_id == int(user_id),
            PoolEvent.currency == ccy,
            PoolEvent.event_type == "deposit.confirmed",
        )
        .scalar()
    )

    wd_confirmed = (
        db.query(func.coalesce(func.sum(PoolEvent.amount), 0))
        .filter(
            PoolEvent.clan_id == int(clan_id),
            PoolEvent.user_id == int(user_id),
            PoolEvent.currency == ccy,
            PoolEvent.event_type == "withdrawal.confirmed",
        )
        .scalar()
    )

    dep_pending = (
        db.query(func.coalesce(func.sum(PoolEvent.amount), 0))
        .filter(
            PoolEvent.clan_id == int(clan_id),
            PoolEvent.user_id == int(user_id),
            PoolEvent.currency == ccy,
            PoolEvent.event_type == "deposit.requested",
        )
        .scalar()
    )

    wd_pending = (
        db.query(func.coalesce(func.sum(PoolEvent.amount), 0))
        .filter(
            PoolEvent.clan_id == int(clan_id),
            PoolEvent.user_id == int(user_id),
            PoolEvent.currency == ccy,
            PoolEvent.event_type == "withdrawal.requested",
        )
        .scalar()
    )

    deposits_confirmed = _d(dep_confirmed)
    withdrawals_confirmed = _d(wd_confirmed)
    pending_deposits = _d(dep_pending)
    pending_withdrawals = _d(wd_pending)

    available = deposits_confirmed - withdrawals_confirmed
    if available < Decimal("0"):
        available = Decimal("0")

    reserved_raw = (
        db.query(func.coalesce(func.sum(Loan.pool_used), 0))
        .filter(
            Loan.clan_id == int(clan_id),
            Loan.borrower_user_id == int(user_id),
            Loan.currency == ccy,
            Loan.status.in_(["pending", "approved"]),
        )
        .scalar()
    )
    reserved_pool = _d(reserved_raw)
    if reserved_pool < Decimal("0"):
        reserved_pool = Decimal("0")

    effective_available = available - reserved_pool
    if effective_available < Decimal("0"):
        effective_available = Decimal("0")

    return {
        "available": available,
        "pending_deposits": pending_deposits,
        "pending_withdrawals": pending_withdrawals,
        "reserved_pool": reserved_pool,
        "effective_available": effective_available,
    }


# -------------------------
# User actions
# -------------------------
def request_deposit(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    amount: str,
    currency: str,
    note: Optional[str] = None,
) -> PoolEvent:
    amt = _d(amount)
    if amt <= Decimal("0"):
        raise ValueError("amount must be > 0")

    ccy = _ccy(currency)
    e = PoolEvent(
        clan_id=int(clan_id),
        user_id=int(user_id),
        event_type="deposit.requested",
        amount=amt,
        currency=ccy,
        reference=build_reference(clan_id=int(clan_id), user_id=int(user_id)),
        note=(note or None),
        created_at=datetime.utcnow(),
        confirmed_at=None,
        confirmed_by_user_id=None,
    )
    db.add(e)
    db.flush()
    return e


def request_withdrawal(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    amount: str,
    currency: str,
    note: Optional[str] = None,
) -> PoolEvent:
    amt = _d(amount)
    if amt <= Decimal("0"):
        raise ValueError("amount must be > 0")

    ccy = _ccy(currency)
    bal = compute_pool_balances(db, clan_id=int(clan_id), user_id=int(user_id), currency=ccy)
    effective = _d(bal.get("effective_available"))

    if amt > effective:
        raise ValueError(f"insufficient effective pool balance. Max={str(effective)}")

    e = PoolEvent(
        clan_id=int(clan_id),
        user_id=int(user_id),
        event_type="withdrawal.requested",
        amount=amt,
        currency=ccy,
        reference=build_reference(clan_id=int(clan_id), user_id=int(user_id)),
        note=(note or None),
        created_at=datetime.utcnow(),
        confirmed_at=None,
        confirmed_by_user_id=None,
    )
    db.add(e)
    db.flush()
    return e


# -------------------------
# Admin actions (expected by admin_pool.py)
# -------------------------
def list_pending_pool_events(
    db: Session,
    *,
    clan_id: int,
    limit: int = 50,
    currency: Optional[str] = None,
) -> List[PoolEvent]:
    q = (
        db.query(PoolEvent)
        .filter(
            PoolEvent.clan_id == int(clan_id),
            PoolEvent.event_type.in_(["deposit.requested", "withdrawal.requested"]),
        )
        .order_by(PoolEvent.id.desc())
        .limit(int(max(1, min(limit, 200))))
    )
    if currency:
        q = q.filter(PoolEvent.currency == _ccy(currency))
    return q.all()


def confirm_pool_event(
    db: Session,
    *,
    clan_id: int,
    event_id: int,
    confirmed_by_user_id: int,
    note: Optional[str] = None,
) -> PoolEvent:
    """
    Confirms a pending pool event by converting:
      deposit.requested     -> deposit.confirmed
      withdrawal.requested  -> withdrawal.confirmed

    Also stamps confirmed_at and confirmed_by_user_id.
    """
    e = db.get(PoolEvent, int(event_id))
    if not e:
        raise ValueError("Pool event not found")
    if int(e.clan_id) != int(clan_id):
        raise ValueError("Pool event clan mismatch")

    if e.event_type == "deposit.requested":
        e.event_type = "deposit.confirmed"
    elif e.event_type == "withdrawal.requested":
        e.event_type = "withdrawal.confirmed"
    else:
        raise ValueError("Pool event is not pending")

    e.confirmed_at = datetime.utcnow()
    e.confirmed_by_user_id = int(confirmed_by_user_id)

    if note:
        # keep original note, append admin note
        if e.note:
            e.note = f"{e.note} | admin: {note}"
        else:
            e.note = f"admin: {note}"

    db.add(e)
    db.flush()
    return e