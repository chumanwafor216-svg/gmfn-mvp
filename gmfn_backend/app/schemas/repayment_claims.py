# app/schemas/repayment_claims.py
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class RepaymentClaimCreate(BaseModel):
    """
    Borrower says: "I have paid" (manual transfer MVP).
    No money moves here. No custody.
    """
    payment_reference: str = Field(..., min_length=3)
    note: Optional[str] = None