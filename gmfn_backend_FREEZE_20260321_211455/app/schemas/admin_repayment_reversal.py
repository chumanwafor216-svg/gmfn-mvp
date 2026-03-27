# app/schemas/admin_repayment_reversal.py
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class AdminRepaymentReverseIn(BaseModel):
    """
    Admin reverses a previously confirmed repayment outcome (append-only).
    No rows deleted. We log reversal events.
    """
    note: str = Field(..., min_length=3)
    payment_reference: Optional[str] = None