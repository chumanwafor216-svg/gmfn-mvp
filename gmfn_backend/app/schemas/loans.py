from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, Field


# -------------------------
# Core Loan Schemas
# -------------------------

class LoanCreate(BaseModel):
    clan_id: int
    amount: Decimal
    currency: Optional[str] = "NGN"


class LoanUpdate(BaseModel):
    status: str


class LoanOut(BaseModel):
    id: int
    borrower_user_id: int
    clan_id: int

    amount: Decimal
    currency: str

    status: str

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

    class Config:
        from_attributes = True


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
    status: str
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

    class Config:
        from_attributes = True


class LoanGuarantorsListResponse(BaseModel):
    items: list[LoanGuarantorOut]
    total: int


# -------------------------
# Loan Summary (already used)
# -------------------------

class LoanSummaryOut(BaseModel):
    id: int
    clan_id: int
    borrower_user_id: int
    status: str
    amount: float
    currency: str

    service_fee: float
    net_disbursed_amount: float
    guarantor_pool: float
    platform_revenue: float

    paid_total: float
    remaining_amount: float
    repaid_at: Optional[datetime] = None
    due_at: Optional[datetime] = None

    guarantors_required: int
    guarantors_total: int
    approved_guarantors: int

    created_at: Optional[datetime] = None
    decision_at: Optional[datetime] = None


# -------------------------
# Repayments list response imports your other module,
# but keep compatibility with your current routers.
# -------------------------

class RepaymentsListResponse(BaseModel):
    items: list[Any]
    total: int