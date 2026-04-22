from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import PoolEvent
from app.services.expected_payments_service import (
    create_expected_payment as create_expected_payment_row,
    ensure_loan_repayment_expected_payment,
    ensure_pool_deposit_expected_payment,
)

PAYMENT_DUE_WINDOW_DAYS = 7
ANNUAL_BILLING_CYCLE = "annual"

FEATURE_VAULT_SLOT = "vault_slot"
FEATURE_MERCHANT_VERIFY = "merchant_verify"
FEATURE_SPOTLIGHT_PRIORITY = "spotlight_priority"

PLAN_VAULT_SLOT_1_YEAR = "vault_slot_1_year"
PLAN_VAULT_SLOT_6_YEAR = "vault_slot_6_year"
PLAN_MERCHANT_VERIFY_YEAR = "merchant_verify_year"
PLAN_SPOTLIGHT_PRIORITY_YEAR = "spotlight_priority_year"
PLAN_SPOTLIGHT_CREDIT_PACK = "spotlight_credit_pack"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _default_due_at(days: int = PAYMENT_DUE_WINDOW_DAYS) -> datetime:
    return _now_utc() + timedelta(days=int(days))


def _d(x: Any) -> Decimal:
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _unique_suffix() -> str:
    """
    Short deterministic-safe random suffix.
    Prevents reference collisions.
    """
    return secrets.token_hex(3)


def _timestamp_code() -> str:
    return _now_utc().strftime("%Y%m%d%H%M%S")


def _positive_int(value: Any, *, name: str) -> int:
    n = int(value or 0)
    if n <= 0:
        raise ValueError(f"{name} must be > 0")
    return n


def calc_vault_subscription_amount(quantity_total: int) -> Decimal:
    """
    Current agreed MVP pricing:
    - 1 Vault slot for one year = 1.00 GBP
    - 6 Vault slots for one year = 5.00 GBP

    We do not guess the intermediate tiers here.
    """
    qty = _positive_int(quantity_total, name="quantity_total")

    if qty == 1:
        return Decimal("1.00")
    if qty == 6:
        return Decimal("5.00")

    raise ValueError(
        "Vault MVP pricing is currently defined for 1 slot or 6-slot annual bundle only."
    )


def build_vault_subscription_reference(
    *,
    owner_user_id: int,
    shop_id: int,
    quantity_total: int,
    cycle_code: str = ANNUAL_BILLING_CYCLE,
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


def _feature_subscription_meta(
    *,
    feature_code: str,
    plan_code: str,
    owner_user_id: int,
    shop_id: Optional[int] = None,
    quantity_total: int = 1,
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "feature_code": str(feature_code).strip(),
        "plan_code": str(plan_code).strip(),
        "owner_user_id": int(owner_user_id),
        "quantity_total": int(quantity_total),
        "billing_cycle": str(billing_cycle).strip().lower() or ANNUAL_BILLING_CYCLE,
    }

    if shop_id is not None:
        payload["shop_id"] = int(shop_id)

    if extra:
        payload.update(extra)

    return payload


def create_pool_deposit_instruction(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    amount: Decimal,
    currency: str = "NGN",
) -> Dict[str, Any]:
    amount = _d(amount)
    if amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    ccy = (currency or "NGN").strip().upper() or "NGN"

    reference_display = (
        f"GMFN-POOL-CLAN-{int(clan_id)}-U{int(user_id)}-"
        f"{_timestamp_code()}-{_unique_suffix()}"
    )

    pool_event = PoolEvent(
        clan_id=int(clan_id),
        user_id=int(user_id),
        event_type="deposit.requested",
        amount=amount,
        currency=ccy,
        reference=reference_display,
        note="payment instruction generated",
        created_at=_now_utc(),
        confirmed_at=None,
        confirmed_by_user_id=None,
    )
    db.add(pool_event)
    db.flush()

    exp = ensure_pool_deposit_expected_payment(
        db,
        clan_id=int(clan_id),
        user_id=int(user_id),
        amount=amount,
        currency=ccy,
        reference_display=reference_display,
        due_at=None,
        meta={
            "pool_event_id": int(pool_event.id),
            "source": "payment_instruction.pool",
            "reference": reference_display,
        },
        commit=True,
        refresh=True,
    )

    return {
        "expected_payment_id": int(exp.id),
        "pool_event_id": int(pool_event.id),
        "reference": exp.reference_display,
        "reference_display": exp.reference_display,
        "reference_normalized": exp.reference_normalized,
        "amount": str(amount),
        "currency": ccy,
        "due_at": exp.due_at.isoformat() if exp.due_at else None,
    }


def create_loan_repayment_instruction(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    loan_id: int,
    amount: Decimal,
    currency: str = "NGN",
) -> Dict[str, Any]:
    amount = _d(amount)

    exp = ensure_loan_repayment_expected_payment(
        db,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        borrower_user_id=int(user_id),
        amount=amount,
        currency=currency,
        due_at=None,
        meta=None,
        commit=True,
        refresh=True,
    )

    return {
        "expected_payment_id": int(exp.id),
        "reference": exp.reference_display,
        "reference_display": exp.reference_display,
        "reference_normalized": exp.reference_normalized,
        "loan_id": int(loan_id),
        "amount": str(amount),
        "currency": currency,
        "due_at": exp.due_at.isoformat() if exp.due_at else None,
    }


def create_feature_subscription_instruction(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    expected_type: str,
    amount: Decimal,
    currency: str,
    reference_display: str,
    due_at: Optional[datetime],
    trust_event_id: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    amount = _d(amount)
    if amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    exp = create_expected_payment_row(
        db,
        clan_id=int(clan_id),
        user_id=int(user_id),
        expected_type=str(expected_type).strip().lower(),
        amount=amount,
        currency=(currency or "GBP").strip().upper(),
        reference_display=reference_display,
        due_at=due_at,
        trust_event_id=trust_event_id,
        meta=meta,
        commit=True,
        refresh=True,
    )

    return {
        "expected_payment_id": int(exp.id),
        "reference": exp.reference_display,
        "reference_display": exp.reference_display,
        "reference_normalized": exp.reference_normalized,
        "expected_type": exp.expected_type,
        "amount": str(amount),
        "currency": exp.currency,
        "due_at": exp.due_at.isoformat() if exp.due_at else None,
        "meta": meta or {},
    }


def create_vault_subscription_instruction(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    shop_id: int,
    quantity_total: int,
    currency: str = "GBP",
    amount: Optional[Decimal] = None,
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    qty = _positive_int(quantity_total, name="quantity_total")
    resolved_amount = _d(amount) if amount is not None else calc_vault_subscription_amount(qty)

    plan_code = PLAN_VAULT_SLOT_1_YEAR if qty == 1 else PLAN_VAULT_SLOT_6_YEAR
    reference_display = build_vault_subscription_reference(
        owner_user_id=int(owner_user_id),
        shop_id=int(shop_id),
        quantity_total=qty,
        cycle_code=billing_cycle,
    )

    return create_feature_subscription_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type="vault_subscription",
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at or _default_due_at(),
        meta=_feature_subscription_meta(
          feature_code=FEATURE_VAULT_SLOT,
          plan_code=plan_code,
          owner_user_id=int(owner_user_id),
          shop_id=int(shop_id),
          quantity_total=qty,
          billing_cycle=billing_cycle,
        ),
    )


def create_merchant_verify_instruction(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    shop_id: int,
    amount: Decimal,
    currency: str = "GBP",
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    resolved_amount = _d(amount)
    if resolved_amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    reference_display = build_merchant_verify_reference(
        owner_user_id=int(owner_user_id),
        shop_id=int(shop_id),
        cycle_code=billing_cycle,
    )

    return create_feature_subscription_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type="merchant_verify_subscription",
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at or _default_due_at(),
        meta=_feature_subscription_meta(
            feature_code=FEATURE_MERCHANT_VERIFY,
            plan_code=PLAN_MERCHANT_VERIFY_YEAR,
            owner_user_id=int(owner_user_id),
            shop_id=int(shop_id),
            quantity_total=1,
            billing_cycle=billing_cycle,
        ),
    )


def create_spotlight_subscription_instruction(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    shop_id: int,
    amount: Decimal,
    quantity_total: int = 1,
    currency: str = "GBP",
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
    visibility_scope: str = "direct_communities",
) -> Dict[str, Any]:
    resolved_amount = _d(amount)
    if resolved_amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    qty = _positive_int(quantity_total, name="quantity_total")

    reference_display = build_spotlight_subscription_reference(
        owner_user_id=int(owner_user_id),
        shop_id=int(shop_id),
        quantity_total=qty,
        cycle_code=billing_cycle,
    )

    return create_feature_subscription_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type="spotlight_subscription",
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at or _default_due_at(),
        meta=_feature_subscription_meta(
            feature_code=FEATURE_SPOTLIGHT_PRIORITY,
            plan_code=PLAN_SPOTLIGHT_CREDIT_PACK if qty > 1 else PLAN_SPOTLIGHT_PRIORITY_YEAR,
            owner_user_id=int(owner_user_id),
            shop_id=int(shop_id),
            quantity_total=qty,
            billing_cycle=billing_cycle,
            extra={
                "visibility_scope": str(visibility_scope).strip().lower()
                or "direct_communities",
            },
        ),
    )
