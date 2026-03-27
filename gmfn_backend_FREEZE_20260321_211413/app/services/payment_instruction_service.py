from __future__ import annotations

import secrets
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any

from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment


def _now_utc():
    return datetime.now(timezone.utc)


def _d(x):
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _normalize_reference(ref: str) -> str:
    return ref.upper().replace(" ", "-").strip()


def _unique_suffix() -> str:
    """
    Short deterministic-safe random suffix.
    Prevents reference collisions.
    """
    return secrets.token_hex(3)


# ==========================================================
# POOL DEPOSIT INSTRUCTION
# ==========================================================

def create_pool_deposit_instruction(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    amount: Decimal,
    currency: str = "NGN",
) -> Dict[str, Any]:

    amount = _d(amount)

    reference_display = (
        f"GMFN-POOL-CLAN-{clan_id}-U{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{_unique_suffix()}"
    )

    reference_normalized = _normalize_reference(reference_display)

    exp = ExpectedPayment(
        clan_id=int(clan_id),
        user_id=int(user_id),
        expected_type="contribution",
        amount=amount,
        currency=currency,
        paid_amount=Decimal("0.00"),
        remaining_amount=amount,
        reference_display=reference_display,
        reference_normalized=reference_normalized,
        status="expected",
        created_at=_now_utc(),
    )

    db.add(exp)
    db.commit()
    db.refresh(exp)

    return {
        "expected_payment_id": exp.id,
        "reference": reference_display,
        "amount": str(amount),
        "currency": currency,
    }


# ==========================================================
# LOAN REPAYMENT INSTRUCTION
# ==========================================================

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

    reference_display = (
        f"GMFN-LOAN-CLAN-{clan_id}-L{loan_id}-U{user_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{_unique_suffix()}"
    )

    reference_normalized = _normalize_reference(reference_display)

    exp = ExpectedPayment(
        clan_id=int(clan_id),
        user_id=int(user_id),
        expected_type="repayment",
        amount=amount,
        currency=currency,
        paid_amount=Decimal("0.00"),
        remaining_amount=amount,
        reference_display=reference_display,
        reference_normalized=reference_normalized,
        status="expected",
        created_at=_now_utc(),
    )

    db.add(exp)
    db.commit()
    db.refresh(exp)

    return {
        "expected_payment_id": exp.id,
        "reference": reference_display,
        "loan_id": loan_id,
        "amount": str(amount),
        "currency": currency,
    }