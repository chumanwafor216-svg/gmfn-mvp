from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment
from app.services.reconciliation_service import normalize_reference

PAYMENT_DUE_WINDOW_DAYS = 7
ANNUAL_BILLING_CYCLE = "annual"
VAULT_DEFAULT_BILLING_CYCLE = "monthly"
VAULT_SLOT_DURATION_DAYS = 30

FEATURE_VAULT_SLOT = "vault_slot"
FEATURE_MERCHANT_VERIFY = "merchant_verify"
FEATURE_SPOTLIGHT_PRIORITY = "spotlight_priority"

PLAN_VAULT_SLOT_1_PERIOD = "vault_slot_1_30d"
PLAN_VAULT_SLOT_6_PERIOD = "vault_slot_6_30d"
PLAN_MERCHANT_VERIFY_YEAR = "merchant_verify_year"
PLAN_SPOTLIGHT_PRIORITY_YEAR = "spotlight_priority_year"
PLAN_SPOTLIGHT_CREDIT_PACK = "spotlight_credit_pack"


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


def _unique_suffix() -> str:
    return secrets.token_hex(3)


def _timestamp_code() -> str:
    return _now_utc().strftime("%Y%m%d%H%M%S")


def _default_due_at(days: int = PAYMENT_DUE_WINDOW_DAYS) -> datetime:
    return _now_utc() + timedelta(days=int(days))


def _positive_int(value: Any, *, name: str) -> int:
    n = int(value or 0)
    if n <= 0:
        raise ValueError(f"{name} must be > 0")
    return n


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
        meta_json=None if not meta else json.dumps(meta, ensure_ascii=False),
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


def calc_vault_subscription_amount(quantity_total: int) -> Decimal:
    """
    Agreed MVP pricing:
    - 1-5 Vault slots for the 30-day MVP cycle = 1.00 GBP per slot
    - 6 Vault slots for the 30-day MVP cycle = 5.00 GBP bundle
    """
    qty = _positive_int(quantity_total, name="quantity_total")

    if 1 <= qty <= 5:
        return Decimal("1.00") * Decimal(qty)
    if qty == 6:
        return Decimal("5.00")

    raise ValueError(
        "Vault MVP pricing currently supports 1 to 6 slots only."
    )


def calc_spotlight_subscription_amount(quantity_total: int) -> Decimal:
    """
    Pilot pricing for Subscription Spotlight:
    - 1-5 paid spotlight credits = 1.00 GBP per credit
    - 6 paid spotlight credits = 5.00 GBP bundle
    """
    qty = _positive_int(quantity_total, name="quantity_total")

    if 1 <= qty <= 5:
        return Decimal("1.00") * Decimal(qty)
    if qty == 6:
        return Decimal("5.00")

    raise ValueError(
        "Subscription Spotlight pricing currently supports 1 to 6 credits only."
    )


def build_vault_subscription_reference(
    *,
    owner_user_id: int,
    shop_id: int,
    quantity_total: int,
    cycle_code: str = VAULT_DEFAULT_BILLING_CYCLE,
) -> str:
    qty = _positive_int(quantity_total, name="quantity_total")
    return (
        f"GMFN-VAULT-U{int(owner_user_id)}-S{int(shop_id)}-Q{qty}-"
        f"{str(cycle_code).strip().upper()}-{_timestamp_code()}-{_unique_suffix()}"
    )


def build_merchant_verify_reference(
    *,
    owner_user_id: int,
    shop_id: int,
    cycle_code: str = ANNUAL_BILLING_CYCLE,
) -> str:
    return (
        f"GMFN-MVERIFY-U{int(owner_user_id)}-S{int(shop_id)}-"
        f"{str(cycle_code).strip().upper()}-{_timestamp_code()}-{_unique_suffix()}"
    )


def ensure_merchant_verify_expected_payment(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    shop_id: int,
    amount: Any,
    currency: str = "GBP",
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
    commit: bool = False,
    refresh: bool = False,
) -> ExpectedPayment:
    resolved_amount = _d(amount)
    if resolved_amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    reference_display = build_merchant_verify_reference(
        owner_user_id=int(owner_user_id),
        shop_id=int(shop_id),
        cycle_code=billing_cycle,
    )

    return create_expected_payment(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type="merchant_verify_subscription",
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at or _default_due_at(),
        trust_event_id=None,
        meta={
            "feature_code": FEATURE_MERCHANT_VERIFY,
            "plan_code": PLAN_MERCHANT_VERIFY_YEAR,
            "owner_user_id": int(owner_user_id),
            "shop_id": int(shop_id),
            "quantity_total": 1,
            "billing_cycle": str(billing_cycle).strip().lower() or ANNUAL_BILLING_CYCLE,
            "payment_reference": normalize_reference(reference_display),
        },
        commit=commit,
        refresh=refresh,
    )


def build_spotlight_subscription_reference(
    *,
    owner_user_id: int,
    shop_id: int,
    quantity_total: int = 1,
    cycle_code: str = ANNUAL_BILLING_CYCLE,
) -> str:
    qty = _positive_int(quantity_total, name="quantity_total")
    return (
        f"GMFN-SPOT-U{int(owner_user_id)}-S{int(shop_id)}-Q{qty}-"
        f"{str(cycle_code).strip().upper()}-{_timestamp_code()}-{_unique_suffix()}"
    )


def ensure_spotlight_subscription_expected_payment(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    shop_id: int,
    amount: Any = None,
    quantity_total: int = 1,
    currency: str = "GBP",
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
    visibility_scope: str = "direct_communities",
    commit: bool = False,
    refresh: bool = False,
) -> ExpectedPayment:
    qty = _positive_int(quantity_total, name="quantity_total")
    if qty > 6:
        raise ValueError(
            "Subscription Spotlight currently supports 1 to 6 credits only."
        )

    resolved_amount = calc_spotlight_subscription_amount(qty)
    if amount is not None and _d(amount) != resolved_amount:
        raise ValueError(
            "amount does not match Subscription Spotlight pricing for this credit count"
        )

    reference_display = build_spotlight_subscription_reference(
        owner_user_id=int(owner_user_id),
        shop_id=int(shop_id),
        quantity_total=qty,
        cycle_code=billing_cycle,
    )

    return create_expected_payment(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type="spotlight_subscription",
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at or _default_due_at(),
        trust_event_id=None,
        meta={
            "feature_code": FEATURE_SPOTLIGHT_PRIORITY,
            "plan_code": PLAN_SPOTLIGHT_CREDIT_PACK if qty > 1 else PLAN_SPOTLIGHT_PRIORITY_YEAR,
            "owner_user_id": int(owner_user_id),
            "shop_id": int(shop_id),
            "quantity_total": qty,
            "billing_cycle": str(billing_cycle).strip().lower() or ANNUAL_BILLING_CYCLE,
            "visibility_scope": str(visibility_scope).strip().lower() or "direct_communities",
            "payment_reference": normalize_reference(reference_display),
        },
        commit=commit,
        refresh=refresh,
    )
