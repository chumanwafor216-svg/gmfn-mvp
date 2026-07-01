# app/schemas/loans.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


LoanStatus = str


class LoanCreate(BaseModel):
    clan_id: int
    amount: str  # Decimal string at API boundary
    currency: str = "NGN"
    purpose: Optional[str] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=365)
    repayment_cadence: Optional[Literal["weekly", "biweekly", "monthly"]] = None

    @field_validator("clan_id", "duration_days", mode="before")
    @classmethod
    def _reject_bool_integer_controls(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if isinstance(value, bool):
            raise ValueError(f"{info.field_name} must be an integer, not a boolean.")
        if isinstance(value, float):
            raise ValueError(f"{info.field_name} must be an integer, not a float.")
        return value


class LoanUpdate(BaseModel):
    status: Optional[str] = None


class LoanOut(BaseModel):
    id: int
    borrower_user_id: int
    clan_id: int

    amount: Decimal
    currency: str
    purpose: Optional[str] = None

    status: LoanStatus

    decision_by_user_id: Optional[int] = None
    decision_at: Optional[datetime] = None

    service_fee: Decimal = Decimal("0")
    net_disbursed_amount: Decimal = Decimal("0")
    guarantor_pool: Decimal = Decimal("0")
    platform_revenue: Decimal = Decimal("0")

    paid_total: Decimal = Decimal("0")
    remaining_amount: Decimal = Decimal("0")
    repaid_at: Optional[datetime] = None
    due_at: Optional[datetime] = None

    created_at: Optional[datetime] = None

    # B2 pool accounting (Decimal-safe; returned for analytics/UI)
    personal_pool_at_request: Decimal = Decimal("0")
    pool_used: Decimal = Decimal("0")
    guarantee_gap: Decimal = Decimal("0")

    guarantors_required: int = 0

    model_config = ConfigDict(from_attributes=True)


class LoansListResponse(BaseModel):
    items: list[LoanOut]
    total: int


class LoanGuarantorCreate(BaseModel):
    guarantor_user_id: int
    pledge_amount: Decimal = Field(..., gt=Decimal("0"))
    note: Optional[str] = None

    @field_validator("guarantor_user_id", mode="before")
    @classmethod
    def _reject_bool_integer_controls(cls, value: Any) -> Any:
        if isinstance(value, bool):
            raise ValueError("guarantor_user_id must be an integer, not a boolean.")
        if isinstance(value, float):
            raise ValueError("guarantor_user_id must be an integer, not a float.")
        return value


class LoanGuarantorUpdate(BaseModel):
    status: Literal["approved", "declined"]
    reason: Optional[str] = None
    note: Optional[str] = None


class LoanGuarantorOut(BaseModel):
    id: int
    loan_id: int
    clan_id: int
    guarantor_user_id: int

    pledge_amount: Decimal
    status: str

    responded_at: Optional[datetime] = None

    is_locked: bool = False
    locked_amount: Decimal = Decimal("0")
    released_amount: Decimal = Decimal("0")

    model_config = ConfigDict(from_attributes=True)


class LoanGuarantorsListResponse(BaseModel):
    items: list[LoanGuarantorOut]
    total: int


class LoanSummaryOut(BaseModel):
    id: int
    clan_id: int
    borrower_user_id: int

    status: LoanStatus

    amount: Decimal
    currency: str
    purpose: Optional[str] = None

    service_fee: Decimal
    net_disbursed_amount: Decimal
    guarantor_pool: Decimal
    platform_revenue: Decimal

    paid_total: Decimal
    remaining_amount: Decimal

    repaid_at: Optional[datetime] = None
    due_at: Optional[datetime] = None

    guarantors_required: int
    guarantors_total: int
    approved_guarantors: int

    # B2 pool accounting
    personal_pool_at_request: Decimal = Decimal("0")
    pool_used: Decimal = Decimal("0")
    guarantee_gap: Decimal = Decimal("0")

    created_at: Optional[datetime] = None
    decision_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RepaymentCreate(BaseModel):
    amount: str  # Decimal string
    note: Optional[str] = None


class RepaymentOut(BaseModel):
    id: int
    loan_id: int
    payer_user_id: int
    amount: Decimal
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RepaymentsListResponse(BaseModel):
    items: list[Any]
    total: int
