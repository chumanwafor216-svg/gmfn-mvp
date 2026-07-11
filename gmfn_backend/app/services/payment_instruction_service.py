from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import Loan, PoolEvent
from app.services.expected_payments_service import (
    create_expected_payment as create_expected_payment_row,
    ensure_loan_repayment_expected_payment,
    ensure_pool_deposit_expected_payment,
)

PAYMENT_DUE_WINDOW_DAYS = 7
ANNUAL_BILLING_CYCLE = "annual"
VAULT_DEFAULT_BILLING_CYCLE = "monthly"
VAULT_SLOT_DURATION_DAYS = 30

FEATURE_VAULT_SLOT = "vault_slot"
FEATURE_MERCHANT_VERIFY = "merchant_verify"
FEATURE_SPOTLIGHT_PRIORITY = "spotlight_priority"
FEATURE_EXTRA_SHOP_BLOCK = "extra_shop_block"
FEATURE_COMMUNITY_MEMBER_CAPACITY = "community_member_capacity"
FEATURE_ROSCA_CYCLE = "rosca_cycle"
FEATURE_COMMUNITY_MEETING_PACK = "community_meeting_pack"
FEATURE_COMMUNITY_DOMAIN = "community_domain"

PLAN_VAULT_SLOT_1_PERIOD = "vault_slot_1_30d"
PLAN_VAULT_SLOT_6_PERIOD = "vault_slot_6_30d"
PLAN_MERCHANT_VERIFY_YEAR = "merchant_verify_year"
PLAN_SPOTLIGHT_PRIORITY_YEAR = "spotlight_priority_year"
PLAN_SPOTLIGHT_CREDIT_PACK = "spotlight_credit_pack"
PLAN_EXTRA_SHOP_BLOCK_PACK = "extra_shop_block_pack"
PLAN_COMMUNITY_MEMBER_CAPACITY_PACK = "community_member_capacity_pack"
PLAN_ROSCA_CYCLE_PACK = "rosca_cycle_pack"
PLAN_COMMUNITY_MEETING_PACK = "community_meeting_pack"
PLAN_COMMUNITY_DOMAIN_STARTER_YEAR = "community_domain_starter_year"

COMMUNITY_PACKAGE_EXPECTED_TYPE = "community_package_subscription"

COMMUNITY_PACKAGE_CATALOG: Dict[str, Dict[str, str]] = {
    "extra_shop_blocks": {
        "feature_code": FEATURE_EXTRA_SHOP_BLOCK,
        "plan_code": PLAN_EXTRA_SHOP_BLOCK_PACK,
        "title": "Extra public shop blocks",
        "unit_label": "public shop block",
        "payment_context": "extra_public_shop_blocks",
    },
    "extra_members": {
        "feature_code": FEATURE_COMMUNITY_MEMBER_CAPACITY,
        "plan_code": PLAN_COMMUNITY_MEMBER_CAPACITY_PACK,
        "title": "Extra community membership strength",
        "unit_label": "extra member place",
        "payment_context": "extra_community_members",
    },
    "rosca_cycle": {
        "feature_code": FEATURE_ROSCA_CYCLE,
        "plan_code": PLAN_ROSCA_CYCLE_PACK,
        "title": "ROSCA yearly service",
        "unit_label": "annual ROSCA service",
        "payment_context": "rosca_contribution_cycle",
        "pricing_model": "annual_service",
        "annual_amount_gbp": "60.00",
        "max_quantity": "1",
    },
    "community_meeting_pack": {
        "feature_code": FEATURE_COMMUNITY_MEETING_PACK,
        "plan_code": PLAN_COMMUNITY_MEETING_PACK,
        "title": "Large community meeting pack",
        "unit_label": "meeting pack unit",
        "payment_context": "large_community_meeting_pack",
    },
}


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


def _payment_status_contract(exp: ExpectedPayment) -> Dict[str, Any]:
    status = str(getattr(exp, "status", "") or "").strip().lower()
    bank_event_id = getattr(exp, "bank_event_id", None)

    if status in {"confirmed", "applied"}:
        stage = "completed"
        label = "Completed"
        guidance = "Payment provider or bank confirmation has been matched by GSN."
    elif status == "partial":
        stage = "authorised_partial"
        label = "Authorised"
        guidance = (
            "GSN has matched part of the payment. Complete any remaining bank "
            "transfer or provider authentication before the payment can be completed."
        )
    elif status in {"cancelled", "canceled"}:
        stage = "cancelled"
        label = "Cancelled"
        guidance = "This payment instruction was cancelled. Do not reuse the old payment code."
    elif status in {"failed", "defaulted", "expired"}:
        stage = "failed"
        label = "Expired" if status == "expired" else "Failed"
        guidance = (
            "This payment is not complete. Generate or use a valid payment "
            "instruction before trying again."
        )
    elif bank_event_id:
        stage = "waiting_for_bank"
        label = "Waiting for Bank"
        guidance = (
            "GSN has seen a bank/provider event and is waiting for final "
            "reconciliation before marking this payment complete."
        )
    else:
        stage = "pending_authentication"
        label = "Pending Authentication"
        guidance = (
            "Your bank may require app approval, SMS OTP, a one-time code, a code "
            "generator, or biometric confirmation before the transfer completes. "
            "Complete that with your banking provider; GSN confirms only after "
            "bank/provider reconciliation succeeds."
        )

    return {
        "id": int(exp.id),
        "status": getattr(exp, "status", None),
        "status_reason": getattr(exp, "status_reason", None),
        "paid_amount": str(getattr(exp, "paid_amount", "0.00")),
        "remaining_amount": str(getattr(exp, "remaining_amount", "0.00")),
        "bank_event_id": bank_event_id,
        "trust_event_id": getattr(exp, "trust_event_id", None),
        "created_at": exp.created_at.isoformat() if getattr(exp, "created_at", None) else None,
        "payment_stage": stage,
        "payment_status_label": label,
        "bank_authentication_guidance": guidance,
    }


def _positive_int(value: Any, *, name: str) -> int:
    n = int(value or 0)
    if n <= 0:
        raise ValueError(f"{name} must be > 0")
    return n


def calc_vault_subscription_amount(quantity_total: int) -> Decimal:
    """
    Current agreed MVP pricing:
    - 1-5 Vault slots = 1.00 GBP per slot
    - 6 Vault slots = 5.00 GBP bundle
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
    Current pilot pricing:
    - 1 paid spotlight credit = 1 day of outside Network Spotlight placement
    - 1-5 paid spotlight credits = 1.00 GBP per credit
    - every full 6-credit bundle = 5.00 GBP
    """
    qty = _positive_int(quantity_total, name="quantity_total")

    bundle_count = qty // 6
    remainder = qty % 6
    return (Decimal("5.00") * Decimal(bundle_count)) + (
        Decimal("1.00") * Decimal(remainder)
    )


def calc_community_package_amount(quantity_total: int) -> Decimal:
    """
    Pilot package pricing follows the paid Spotlight rail:
    - 1 package unit = 1.00 GBP
    - every full 6-unit bundle = 5.00 GBP
    """
    return calc_spotlight_subscription_amount(quantity_total)


def calc_community_package_amount_for_code(
    package_code: str,
    quantity_total: int,
) -> Decimal:
    package_key = str(package_code or "").strip().lower()
    qty = _positive_int(quantity_total, name="quantity_total")
    package = COMMUNITY_PACKAGE_CATALOG.get(package_key)
    if not package:
        raise ValueError("Unsupported community package code")

    if package_key == "rosca_cycle":
        if qty != 1:
            raise ValueError("ROSCA is a £60 yearly service and supports one annual service unit per instruction.")
        return Decimal(str(package.get("annual_amount_gbp") or "60.00"))

    return calc_community_package_amount(qty)


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


def build_community_package_reference(
    *,
    owner_user_id: int,
    clan_id: int,
    package_code: str,
    quantity_total: int = 1,
    shop_id: Optional[int] = None,
    cycle_code: str = ANNUAL_BILLING_CYCLE,
) -> str:
    qty = _positive_int(quantity_total, name="quantity_total")
    package_slug = (
        str(package_code or "")
        .strip()
        .upper()
        .replace("_", "-")
        .replace(" ", "-")
    )
    if not package_slug:
        raise ValueError("package_code is required")

    shop_part = f"-S{int(shop_id)}" if shop_id is not None else ""
    return (
        f"GMFN-PACK-{package_slug}-U{int(owner_user_id)}-C{int(clan_id)}"
        f"{shop_part}-Q{qty}-{str(cycle_code).strip().upper()}-"
        f"{_timestamp_code()}-{_unique_suffix()}"
    )


def build_community_domain_subscription_reference(
    *,
    owner_user_id: int,
    clan_id: int,
    community_domain_id: int,
    cycle_code: str = ANNUAL_BILLING_CYCLE,
) -> str:
    return (
        f"GMFN-CDOM-U{int(owner_user_id)}-C{int(clan_id)}-D{int(community_domain_id)}-"
        f"{str(cycle_code).strip().upper()}-{_timestamp_code()}-{_unique_suffix()}"
    )


def _feature_subscription_meta(
    *,
    feature_code: str,
    plan_code: str,
    owner_user_id: int,
    shop_id: Optional[int] = None,
    quantity_total: int = 1,
    billing_cycle: str = VAULT_DEFAULT_BILLING_CYCLE,
    extra: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    feature = str(feature_code).strip()
    fallback_cycle = VAULT_DEFAULT_BILLING_CYCLE if feature == FEATURE_VAULT_SLOT else ANNUAL_BILLING_CYCLE
    payload: Dict[str, Any] = {
        "feature_code": feature,
        "plan_code": str(plan_code).strip(),
        "owner_user_id": int(owner_user_id),
        "quantity_total": int(quantity_total),
        "billing_cycle": str(billing_cycle).strip().lower() or fallback_cycle,
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
    contribution_reason: Optional[str] = None,
) -> Dict[str, Any]:
    amount = _d(amount)
    if amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    ccy = (currency or "NGN").strip().upper() or "NGN"
    reason = (contribution_reason or "").strip()[:180]

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
        note=reason or "payment instruction generated",
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
            "contribution_reason": reason,
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
        "contribution_reason": reason,
        "due_at": exp.due_at.isoformat() if exp.due_at else None,
        **_payment_status_contract(exp),
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
    requested_amount = _d(amount)
    if requested_amount <= Decimal("0"):
        raise ValueError("amount must be > 0")

    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise ValueError("loan not found")
    if int(getattr(loan, "clan_id", 0) or 0) != int(clan_id):
        raise ValueError("loan does not belong to this community")
    if int(getattr(loan, "borrower_user_id", 0) or 0) != int(user_id):
        raise ValueError("only the borrower can create this repayment instruction")

    loan_amount = _d(getattr(loan, "amount", 0) or 0)
    paid_total = _d(getattr(loan, "paid_total", 0) or 0)
    outstanding_amount = _d(getattr(loan, "remaining_amount", 0) or 0)
    if outstanding_amount <= Decimal("0"):
        outstanding_amount = loan_amount - paid_total
    if outstanding_amount <= Decimal("0"):
        raise ValueError("No outstanding repayment amount")

    instruction_amount = min(requested_amount, outstanding_amount)

    exp = ensure_loan_repayment_expected_payment(
        db,
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        borrower_user_id=int(user_id),
        amount=outstanding_amount,
        currency=currency or getattr(loan, "currency", None) or "NGN",
        due_at=None,
        meta={
            "source": "payment_instruction.loan",
            "requested_instruction_amount": str(instruction_amount),
            "outstanding_amount_at_instruction": str(outstanding_amount),
        },
        commit=True,
        refresh=True,
    )

    return {
        "expected_payment_id": int(exp.id),
        "reference": exp.reference_display,
        "reference_display": exp.reference_display,
        "reference_normalized": exp.reference_normalized,
        "loan_id": int(loan_id),
        "amount": str(instruction_amount),
        "expected_total_amount": str(exp.amount),
        "expected_remaining_amount": str(exp.remaining_amount),
        "currency": exp.currency,
        "due_at": exp.due_at.isoformat() if exp.due_at else None,
        **_payment_status_contract(exp),
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
    commit: bool = True,
    refresh: bool = True,
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
        commit=commit,
        refresh=refresh,
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
        **_payment_status_contract(exp),
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
    billing_cycle: str = VAULT_DEFAULT_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    qty = _positive_int(quantity_total, name="quantity_total")
    resolved_amount = _d(amount) if amount is not None else calc_vault_subscription_amount(qty)

    plan_code = PLAN_VAULT_SLOT_6_PERIOD if qty == 6 else PLAN_VAULT_SLOT_1_PERIOD
    reference_display = build_vault_subscription_reference(
        owner_user_id=int(owner_user_id),
        shop_id=int(shop_id),
        quantity_total=qty,
        cycle_code=billing_cycle,
    )
    instruction_due_at = due_at or _default_due_at()

    out = create_feature_subscription_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type="vault_subscription",
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=instruction_due_at,
        meta=_feature_subscription_meta(
          feature_code=FEATURE_VAULT_SLOT,
          plan_code=plan_code,
          owner_user_id=int(owner_user_id),
          shop_id=int(shop_id),
          quantity_total=qty,
          billing_cycle=billing_cycle,
          extra={
              "payment_context": "vault_slot_purchase",
              "payment_beneficiary_scope": "platform",
              "vault_slot_duration_days": VAULT_SLOT_DURATION_DAYS,
          },
        ),
        commit=False,
        refresh=True,
    )
    try:
        from app.db.bank_models import ExpectedPayment
        from app.services.vault_domain_service import create_vault_order_from_expected_payment

        exp = db.get(ExpectedPayment, int(out["expected_payment_id"]))
        if exp is not None:
            order = create_vault_order_from_expected_payment(
                db,
                expected_payment=exp,
                shop_id=int(shop_id),
                owner_user_id=int(owner_user_id),
                clan_id=int(clan_id),
                slot_count=qty,
                amount_due=resolved_amount,
                currency=currency,
                payment_reference=reference_display,
                instruction_expires_at=instruction_due_at,
            )
            db.commit()
            db.refresh(order)
            out["vault_order_id"] = int(order.id)
            out["vault_order_status"] = str(order.status)
    except Exception:
        db.rollback()
        raise

    return out


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
    amount: Optional[Decimal] = None,
    quantity_total: int = 1,
    currency: str = "GBP",
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
    visibility_scope: str = "direct_communities",
) -> Dict[str, Any]:
    qty = _positive_int(quantity_total, name="quantity_total")
    if qty > 365:
        raise ValueError(
            "Subscription Spotlight currently supports 1 to 365 credits only."
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


def create_community_package_instruction(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    package_code: str,
    quantity_total: int = 1,
    shop_id: Optional[int] = None,
    amount: Optional[Decimal] = None,
    currency: str = "GBP",
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
) -> Dict[str, Any]:
    package_key = str(package_code or "").strip().lower()
    package = COMMUNITY_PACKAGE_CATALOG.get(package_key)
    if not package:
        raise ValueError("Unsupported community package code")

    qty = _positive_int(quantity_total, name="quantity_total")
    max_quantity = int(str(package.get("max_quantity") or "365"))
    if qty > max_quantity:
        raise ValueError(
            f"{package['title']} quantity currently supports 1 to {max_quantity} units only."
        )

    resolved_amount = calc_community_package_amount_for_code(package_key, qty)
    if amount is not None and _d(amount) != resolved_amount:
        raise ValueError("amount does not match community package pricing for this quantity")

    reference_display = build_community_package_reference(
        owner_user_id=int(owner_user_id),
        clan_id=int(clan_id),
        package_code=package_key,
        quantity_total=qty,
        shop_id=int(shop_id) if shop_id is not None else None,
        cycle_code=billing_cycle,
    )

    return create_feature_subscription_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type=COMMUNITY_PACKAGE_EXPECTED_TYPE,
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at or _default_due_at(),
        meta=_feature_subscription_meta(
            feature_code=package["feature_code"],
            plan_code=package["plan_code"],
            owner_user_id=int(owner_user_id),
            shop_id=int(shop_id) if shop_id is not None else None,
            quantity_total=qty,
            billing_cycle=billing_cycle,
            extra={
                "clan_id": int(clan_id),
                "package_code": package_key,
                "package_title": package["title"],
                "unit_label": package["unit_label"],
                "payment_context": package["payment_context"],
                "payment_beneficiary_scope": "platform",
                "pricing_model": package.get("pricing_model") or "spotlight_bundle_rail",
            },
        ),
    )


def create_community_domain_subscription_instruction(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    community_domain_id: int,
    domain_name: str,
    display_name: str,
    amount: Decimal,
    currency: str = "GBP",
    billing_cycle: str = ANNUAL_BILLING_CYCLE,
    due_at: Optional[datetime] = None,
    quote_note: Optional[str] = None,
) -> Dict[str, Any]:
    resolved_amount = _d(amount)
    if resolved_amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    reference_display = build_community_domain_subscription_reference(
        owner_user_id=int(owner_user_id),
        clan_id=int(clan_id),
        community_domain_id=int(community_domain_id),
        cycle_code=billing_cycle,
    )

    return create_feature_subscription_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(owner_user_id),
        expected_type="community_domain_subscription",
        amount=resolved_amount,
        currency=currency,
        reference_display=reference_display,
        due_at=due_at or _default_due_at(),
        meta=_feature_subscription_meta(
            feature_code=FEATURE_COMMUNITY_DOMAIN,
            plan_code=PLAN_COMMUNITY_DOMAIN_STARTER_YEAR,
            owner_user_id=int(owner_user_id),
            quantity_total=1,
            billing_cycle=billing_cycle,
            extra={
                "clan_id": int(clan_id),
                "community_domain_id": int(community_domain_id),
                "domain_name": str(domain_name or "").strip(),
                "display_name": str(display_name or "").strip(),
                "package_code": "community_domain_starter",
                "package_title": "Community Domain Starter",
                "payment_context": "community_domain_starter_activation",
                "payment_beneficiary_scope": "platform",
                "pricing_model": "manual_quote",
                "quote_note": str(quote_note or "").strip()[:300],
            },
        ),
    )
