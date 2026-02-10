from datetime import datetime
from typing import List, Literal, Optional
from typing import Optional
from pydantic import BaseModel

from pydantic import BaseModel, Field

LoanStatus = Literal["pending", "approved", "rejected"]
GuarantorStatus = Literal["pending", "approved", "declined"]


# -------------------------
# Loans
# -------------------------
class LoanCreate(BaseModel):
    amount: float = Field(..., gt=0)


class LoanUpdate(BaseModel):
    status: LoanStatus


class LoanOut(BaseModel):
    id: int
    borrower_user_id: int
    clan_id: int
    amount: float
    currency: str
    status: LoanStatus

    decision_by_user_id: Optional[int] = None
    decision_at: Optional[datetime] = None

    service_fee: float = 0
    net_disbursed_amount: float = 0
    guarantor_pool: float = 0
    platform_revenue: float = 0

    paid_total: float = 0
    remaining_amount: float = 0
    repaid_at: Optional[datetime] = None
    due_at: Optional[datetime] = None

    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LoansListResponse(BaseModel):
    items: List[LoanOut]
    total: int


# -------------------------
# Guarantors
# -------------------------
class LoanGuarantorCreate(BaseModel):
    guarantor_user_id: int
    pledge_amount: float = 0


class LoanGuarantorUpdate(BaseModel):
    status: str  # "approved" | "declined"
    reason: Optional[str] = None
    note: Optional[str] = None


class LoanGuarantorOut(BaseModel):
    id: int
    loan_id: int
    clan_id: int
    guarantor_user_id: int
    pledge_amount: float
    status: str
    responded_at: Optional[datetime] = None

    # liability lock fields (optional; include if your DB has them)
    is_locked: Optional[bool] = None
    locked_amount: Optional[float] = None
    released_amount: Optional[float] = None

    model_config = {"from_attributes": True}


class LoanGuarantorsListResponse(BaseModel):
    items: List[LoanGuarantorOut]
    total: int


# -------------------------
# Pool balance
# -------------------------
class PoolBalanceUpdate(BaseModel):
    personal_pool_balance: float = Field(..., ge=0)


class PoolBalanceOut(BaseModel):
    clan_id: int
    user_id: int
    personal_pool_balance: float

    model_config = {"from_attributes": True}


# -------------------------
# Loan summary
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

    created_at: datetime
    decision_at: Optional[datetime] = None

    model_config = {"from_attributes": True} 
