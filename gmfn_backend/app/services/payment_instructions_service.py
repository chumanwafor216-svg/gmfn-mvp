# app/services/payment_instructions_service.py
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict
import uuid

# =============================================================================
# GMFN Payment Instruction Channel (Non-Custodial MVP)
# =============================================================================
# This service DOES NOT move money.
# It only generates repayment instructions + unique references.
# No auto-debit. No custodial wallet. MVP-safe.


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _generate_reference(loan_id: int, user_id: int) -> str:
    suffix = uuid.uuid4().hex[:6].upper()
    return f"GMFN-L{loan_id}-U{user_id}-{suffix}"


@dataclass(frozen=True)
class PaymentInstruction:
    loan_id: int
    user_id: int
    reference: str
    account_name: str
    account_number: str
    sort_code: str
    bank_name: str
    currency: str
    created_at: datetime

    def as_dict(self) -> Dict[str, Any]:
        return {
            "loan_id": self.loan_id,
            "user_id": self.user_id,
            "reference": self.reference,
            "bank_details": {
                "account_name": self.account_name,
                "account_number": self.account_number,
                "sort_code": self.sort_code,
                "bank_name": self.bank_name,
                "currency": self.currency,
            },
            "instructions": (
                "Please transfer your repayment to the bank account above.\n"
                "Use the exact reference shown.\n"
                "This is not an automatic debit.\n"
                "Your Trust grows only after full repayment is confirmed."
            ),
            "disclaimer": (
                "GMFN does not hold your funds. "
                "Repayments are manually confirmed during the MVP phase."
            ),
            "created_at": self.created_at.isoformat(),
            "mode": "manual_bank_transfer_mvp",
        }


def build_payment_instruction(*, loan_id: int, user_id: int, currency: str = "GBP") -> PaymentInstruction:
    """
    MVP: bank details are placeholder/static until you decide the pilot account.
    """
    ref = _generate_reference(int(loan_id), int(user_id))
    return PaymentInstruction(
        loan_id=int(loan_id),
        user_id=int(user_id),
        reference=ref,
        account_name="GMFN Pilot Account",
        account_number="12345678",
        sort_code="00-00-00",
        bank_name="Example Bank (MVP Placeholder)",
        currency=str(currency or "GBP"),
        created_at=_now_utc(),
    )
