from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


# ✅ Central allowed loan statuses (MVP lifecycle)
LoanStatus = Literal[
    "pending",
    "incomplete",  # needs borrower action: add guarantor or cancel
    "approved",
    "cancelled",   # borrower/system cancelled; locks released
    "rejected",    # admin rejected
    "declined",    # explicit decline (e.g., guarantor/admin rejection), not incompleteness
]


# -------------------------
# Core Loan Schemas
# -------------------------

class LoanCreate(BaseModel):
    clan_id: int
    amount: Decimal
    currency: Optional[str] = "NGN"


class LoanUpdate(BaseModel):
    # ✅ restrict to known statuses to prevent accidental bad states
    status: LoanStatus


class LoanOut(BaseModel):
    id: int
    borrower_user_id: int
    clan_id: int

    amount: Decimal
    currency: str

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

    # ✅ CRITICAL: needed by UI + lifecycle logic
    guarantors_required: int = 0

    model_config = ConfigDict(from_attributes=True)


class LoansListResponse(BaseModel):
    items: list[LoanOut]
    total: int


# -------------------------
# Guarantors
# -------------------------

class LoanGuarantorCreate(BaseModel):
    guarantor_user_id: int
    pledge_amount: Decimal = Field(..., gt=Decimal("0"))


class LoanGuarantorUpdate(BaseModel):
    status: Literal["approved", "declined"]  # ✅ only decisions allowed here
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

    is_locked: bool = True
    locked_amount: Decimal = Decimal("0")
    released_amount: Decimal = Decimal("0")

    model_config = ConfigDict(from_attributes=True)


class LoanGuarantorsListResponse(BaseModel):
    items: list[LoanGuarantorOut]
    total: int


# -------------------------
# Loan Summary
# -------------------------

class LoanSummaryOut(BaseModel):
    id: int
    clan_id: int
    borrower_user_id: int
    status: LoanStatus

    # ✅ Decimal-safe (no float drift)
    amount: Decimal
    currency: str

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

    created_at: Optional[datetime] = None
    decision_at: Optional[datetime] = None


# -------------------------
# Repayments list response
# -------------------------

class RepaymentsListResponse(BaseModel):
    items: list[Any]
    total: int