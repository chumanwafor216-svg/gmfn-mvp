from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


def _reject_bool_float_integer(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer, not a float.")
    return value


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


class LoanCoverageCheckIn(BaseModel):
    loan_amount: str = Field(min_length=1)
    personal_pool: str = Field(min_length=1)
    approved_locked_total: str = Field(min_length=1, default="0")
    pledge_amount: Optional[str] = None

    @field_validator(
        "loan_amount",
        "personal_pool",
        "approved_locked_total",
        "pledge_amount",
        mode="before",
    )
    @classmethod
    def _reject_non_text_amount_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


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

    @field_validator("user_id", "loan_id", "guarantor_id", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_float_integer(value, info.field_name)

    @field_validator("event_type", "reason", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class TrustEventDedupCheckOut(BaseModel):
    duplicate_found: bool
    message: str
