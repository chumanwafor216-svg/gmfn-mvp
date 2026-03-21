# app/services/expected_payments_service.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment
from app.services.reconciliation_service import normalize_reference


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0.00")
    if isinstance(x, Decimal):
        return x.quantize(Decimal("0.01"))
    return Decimal(str(x)).quantize(Decimal("0.01"))


def _ccy(currency: Optional[str]) -> str:
    return (currency or "NGN").strip().upper() or "NGN"


def _clean_ref(reference_display: str) -> str:
    raw = (reference_display or "").strip()
    if not raw:
        raise ValueError("reference_display is required")
    return raw


def get_expected_payment_by_id(
    db: Session,
    *,
    expected_payment_id: int,
) -> Optional[ExpectedPayment]:
    return db.get(ExpectedPayment, int(expected_payment_id))


def get_expected_payment_by_reference(
    db: Session,
    *,
    clan_id: int,
    reference_display: str,
    currency: Optional[str] = None,
) -> Optional[ExpectedPayment]:
    ref_display = _clean_ref(reference_display)
    ref_norm = normalize_reference(ref_display)
    q = (
        db.query(ExpectedPayment)
        .filter(ExpectedPayment.clan_id == int(clan_id))
        .filter(ExpectedPayment.reference_normalized == ref_norm)
    )
    if currency:
        q = q.filter(ExpectedPayment.currency == _ccy(currency))
    return q.order_by(ExpectedPayment.id.asc()).first()


def list_expected_payments(
    db: Session,
    *,
    clan_id: int,
    user_id: Optional[int] = None,
    expected_type: Optional[str] = None,
    status: Optional[str] = None,
    currency: Optional[str] = None,
    limit: int = 100,
) -> List[ExpectedPayment]:
    lim = max(1, min(int(limit or 100), 500))

    q = db.query(ExpectedPayment).filter(ExpectedPayment.clan_id == int(clan_id))

    if user_id is not None:
        q = q.filter(ExpectedPayment.user_id == int(user_id))

    if expected_type:
        q = q.filter(ExpectedPayment.expected_type == str(expected_type).strip().lower())

    if status:
        q = q.filter(ExpectedPayment.status == str(status).strip().lower())

    if currency:
        q = q.filter(ExpectedPayment.currency == _ccy(currency))

    return q.order_by(ExpectedPayment.id.desc()).limit(lim).all()


def create_expected_payment(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    expected_type: str,
    amount: Any,
    currency: str,
    reference_display: str,
    due_at: Optional[datetime] = None,
    trust_event_id: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
    commit: bool = True,
    refresh: bool = True,
) -> ExpectedPayment:
    """
    Canonical expected-payment creator.

    Deterministic rules:
    - reference_display must be present
    - reference_normalized must be unique per clan in MVP
    - paid_amount starts at 0.00
    - remaining_amount starts at amount
    - existing live record for same reference is returned instead of duplicated
    """
    amt = _d(amount)
    if amt <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    ref_display = _clean_ref(reference_display)
    ref_norm = normalize_reference(ref_display)
    if not ref_norm:
        raise ValueError("reference_normalized is required")

    exp_type = str(expected_type or "").strip().lower()
    if not exp_type:
        raise ValueError("expected_type is required")

    existing = (
        db.query(ExpectedPayment)
        .filter(ExpectedPayment.clan_id == int(clan_id))
        .filter(ExpectedPayment.reference_normalized == ref_norm)
        .first()
    )
    if existing:
        return existing

    row = ExpectedPayment(
        clan_id=int(clan_id),
        user_id=int(user_id),
        expected_type=exp_type,
        amount=amt,
        currency=_ccy(currency),
        paid_amount=Decimal("0.00"),
        remaining_amount=amt,
        due_at=due_at,
        reference_display=ref_display,
        reference_normalized=ref_norm,
        status="expected",
        status_reason=None,
        bank_event_id=None,
        trust_event_id=int(trust_event_id) if trust_event_id is not None else None,
        created_at=_now_utc(),
        meta_json=None if not meta else str(__import__("json").dumps(meta)),
    )

    db.add(row)
    try:
        if commit:
            db.commit()
            if refresh:
                db.refresh(row)
        else:
            db.flush()
            if refresh:
                db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        existing2 = (
            db.query(ExpectedPayment)
            .filter(ExpectedPayment.clan_id == int(clan_id))
            .filter(ExpectedPayment.reference_normalized == ref_norm)
            .first()
        )
        if existing2:
            return existing2
        raise


def ensure_pool_deposit_expected_payment(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    amount: Any,
    currency: str,
    reference_display: str,
    due_at: Optional[datetime] = None,
    meta: Optional[Dict[str, Any]] = None,
    commit: bool = False,
    refresh: bool = False,
) -> ExpectedPayment:
    return create_expected_payment(
        db,
        clan_id=int(clan_id),
        user_id=int(user_id),
        expected_type="contribution",
        amount=amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at,
        trust_event_id=None,
        meta=meta,
        commit=commit,
        refresh=refresh,
    )


def build_loan_repayment_reference(*, loan_id: int, borrower_user_id: int) -> str:
    return f"GMFN-REPAY-LOAN-{int(loan_id)}-U{int(borrower_user_id)}"


def ensure_loan_repayment_expected_payment(
    db: Session,
    *,
    clan_id: int,
    loan_id: int,
    borrower_user_id: int,
    amount: Any,
    currency: str,
    due_at: Optional[datetime] = None,
    meta: Optional[Dict[str, Any]] = None,
    commit: bool = False,
    refresh: bool = False,
) -> ExpectedPayment:
    reference_display = build_loan_repayment_reference(
        loan_id=int(loan_id),
        borrower_user_id=int(borrower_user_id),
    )

    payload = {
        "loan_id": int(loan_id),
        "borrower_user_id": int(borrower_user_id),
    }
    if meta:
        payload.update(meta)

    return create_expected_payment(
        db,
        clan_id=int(clan_id),
        user_id=int(borrower_user_id),
        expected_type="repayment",
        amount=amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at,
        trust_event_id=None,
        meta=payload,
        commit=commit,
        refresh=refresh,
    )