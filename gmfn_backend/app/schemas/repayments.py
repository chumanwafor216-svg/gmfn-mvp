# app/schemas/repayments.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class RepaymentCreate(BaseModel):
    """
    Decimal-safe input:
    - amount is a string (e.g. "140.00")
    - optional payment_reference (from payment instruction channel)
    """
    amount: str = Field(..., min_length=1)
    payment_reference: Optional[str] = None


class RepaymentOut(BaseModel):
    """
    Decimal-safe output:
    - amount is a string
    """
    id: int
    loan_id: int
    payer_user_id: int
    amount: str
    created_at: datetime

    # We don't store payment_reference on Repayment model yet (no column),
    # but it will be captured in TrustEvent meta on full repayment.
    model_config = {"from_attributes": True}


class RepaymentsListResponse(BaseModel):
    items: List[RepaymentOut]
    total: int