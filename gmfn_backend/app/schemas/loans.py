from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from datetime import datetime

LoanStatus = Literal["pending", "approved", "rejected"]
GuarantorStatus = Literal["pending", "approved", "declined"]


class LoanCreate(BaseModel):
    amount: float = Field(..., gt=0)


class LoanUpdate(BaseModel):
    status: LoanStatus


class LoanOut(BaseModel):
    id: int
    borrower_user_id: int
    amount: float
    status: LoanStatus

    decision_by_user_id: Optional[int] = None
    decision_at: Optional[datetime] = None


class LoansListResponse(BaseModel):
    items: List[LoanOut]
    total: int


class LoanGuarantorCreate(BaseModel):
    guarantor_user_id: int
    pledge_amount: float = 0


class LoanGuarantorOut(BaseModel):
    id: int
    loan_id: int
    clan_id: int
    guarantor_user_id: int
    pledge_amount: float
    status: str
    responded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LoanGuarantorsListResponse(BaseModel):
    items: List[LoanGuarantorOut]
    total: int


class LoanGuarantorUpdate(BaseModel):
    status: GuarantorStatus
from pydantic import BaseModel, Field


class PoolBalanceUpdate(BaseModel):
    personal_pool_balance: float = Field(..., ge=0)


class PoolBalanceOut(BaseModel):
    clan_id: int
    user_id: int
    personal_pool_balance: float
