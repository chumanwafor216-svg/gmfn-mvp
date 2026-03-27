# app/schemas/admin_repayments.py
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


class AdminRepaymentConfirmIn(BaseModel):
    """
    Admin confirms a repayment that happened outside the app (manual transfer).
    Decimal-safe: amount is a string e.g. "140.00"
    """
    amount: str = Field(..., min_length=1)
    payment_reference: Optional[str] = None
    note: Optional[str] = None