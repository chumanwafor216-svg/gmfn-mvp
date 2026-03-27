from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class LoanGuarantorCreate(BaseModel):
    guarantor_user_id: int
    pledge_amount: Optional[Decimal] = None


class LoanGuarantorOut(BaseModel):
    id: int
    loan_id: int
    clan_id: int
    guarantor_user_id: int
    pledge_amount: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)
