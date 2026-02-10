from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class RepaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)


class RepaymentOut(BaseModel):
    id: int
    loan_id: int
    payer_user_id: int
    amount: float
    created_at: datetime

    model_config = {"from_attributes": True}


class RepaymentsListResponse(BaseModel):
    items: List[RepaymentOut]
    total: int
