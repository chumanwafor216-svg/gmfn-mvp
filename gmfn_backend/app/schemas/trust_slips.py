from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class TrustSlipIssueRequest(BaseModel):
    # optional override
    currency: Optional[str] = "NGN"
    expires_days: Optional[int] = 7


class TrustSlipOut(BaseModel):
    id: int
    code: str
    clan_id: int
    holder_user_id: int
    trust_limit: Decimal
    currency: str
    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_verified_at: Optional[datetime] = None
    last_release_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TrustSlipListOut(BaseModel):
    items: List[TrustSlipOut]
    total: int


class TrustSlipVerifyOut(BaseModel):
    code: str
    clan_id: int
    clan_name: str
    holder_user_id: int
    holder_email: Optional[str] = None
    trust_limit: Decimal
    currency: str
    status: str
    expires_at: Optional[datetime] = None
    trust_level_label: str
    trust_recent_line: Optional[str] = None


class TrustSlipReleaseRequest(BaseModel):
    supplier_name: Optional[str] = None
    supplier_phone: Optional[str] = None
    amount_released: Optional[Decimal] = None
    note: Optional[str] = None