# app/schemas/pool.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict


PoolEventType = Literal[
    "deposit.requested",
    "deposit.confirmed",
    "withdrawal.requested",
    "withdrawal.confirmed",
]


from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PoolEventOut(BaseModel):
    id: int
    clan_id: int
    user_id: int
    event_type: str
    amount: Decimal
    currency: str
    reference: str | None = None
    note: str | None = None
    created_at: datetime
    confirmed_at: datetime | None = None
    confirmed_by_user_id: int | None = None

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={Decimal: lambda v: str(v)},
    )
class PoolMeOut(BaseModel):
    clan_id: int
    user_id: int
    currency: str
    reserved_pool: str = "0"
    effective_available: str = "0"

    available_balance: str
    pending_deposits: str
    pending_withdrawals: str

    reference: str
    recent_events: List[PoolEventOut]


class PoolRequestIn(BaseModel):
    amount: str = Field(..., description="Decimal string")
    currency: str = Field("NGN")
    note: Optional[str] = None


class AdminPoolPendingOut(BaseModel):
    items: List[PoolEventOut]
    total: int