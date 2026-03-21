from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class LoanCoverageCheckIn(BaseModel):
    loan_amount: str = Field(min_length=1)
    personal_pool: str = Field(min_length=1)
    approved_locked_total: str = Field(min_length=1, default="0")
    pledge_amount: Optional[str] = None


class LoanCoverageCheckOut(BaseModel):
    loan_amount: str
    personal_pool: str
    pool_used: str
    guarantee_gap: str
    approved_locked_total: str
    pledge_amount: str
    has_positive_gap: bool
    pledge_required: bool
    pledge_valid: bool
    coverage_ok: bool
    message: str


class LoanTimeoutOut(BaseModel):
    created_at: str
    expires_at: str
    is_expired: bool
    seconds_remaining: int


class TrustEventDedupCheckIn(BaseModel):
    user_id: int
    event_type: str
    loan_id: Optional[int] = None
    guarantor_id: Optional[int] = None
    reason: Optional[str] = None


class TrustEventDedupCheckOut(BaseModel):
    duplicate_found: bool
    message: str