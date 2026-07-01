# app/schemas/repayments.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


def _reject_non_decimal_string(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a decimal string.")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} must be a decimal string.")
    try:
        Decimal(cleaned)
    except (InvalidOperation, ValueError):
        raise ValueError(f"{field_name} must be a decimal string.") from None
    return cleaned


class RepaymentCreate(BaseModel):
    # Accept string from frontend; route converts to Decimal anyway.
    amount: str = Field(..., min_length=1)
    currency: Optional[str] = None
    note: Optional[str] = None

    @field_validator("amount", mode="before")
    @classmethod
    def _reject_malformed_amount(cls, value: Any) -> Any:
        return _reject_non_decimal_string(value, "amount")


class RepaymentOut(BaseModel):
    id: int
    loan_id: int
    payer_user_id: int
    amount: Decimal
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("amount")
    def _ser_amount(self, v: Decimal, _info: Any) -> str:
        # Stable public API: Decimal always serialized as string
        return str(v)


class RepaymentsListResponse(BaseModel):
    items: List[RepaymentOut]
    total: int
