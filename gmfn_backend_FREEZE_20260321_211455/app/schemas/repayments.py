# app/schemas/repayments.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer


class RepaymentCreate(BaseModel):
    # Accept string from frontend; route converts to Decimal anyway.
    amount: str = Field(..., min_length=1)
    currency: Optional[str] = None
    note: Optional[str] = None


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