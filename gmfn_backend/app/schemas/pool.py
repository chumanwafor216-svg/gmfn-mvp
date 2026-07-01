# app/schemas/pool.py
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Literal

from pydantic import BaseModel, Field, ConfigDict, field_serializer, field_validator


PoolEventType = Literal[
    "deposit.requested",
    "deposit.confirmed",
    "withdrawal.requested",
    "withdrawal.confirmed",
]


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


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
    )

    @field_serializer("amount", when_used="json")
    def serialize_amount(self, value: Decimal) -> str:
        return str(value)


class PoolMeOut(BaseModel):
    clan_id: int
    user_id: int
    currency: str
    reserved_pool: str = "0"
    effective_available: str = "0"
    withdrawable_now: str = "0"

    available_balance: str
    pending_deposits: str
    pending_withdrawals: str

    reference: str
    recent_events: List[PoolEventOut]


class PoolRequestIn(BaseModel):
    amount: str = Field(..., description="Decimal string")
    currency: str = Field("NGN")
    note: Optional[str] = None

    @field_validator("amount", "currency", "note", mode="before")
    @classmethod
    def reject_non_text_values(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, str(info.field_name))


class AdminPoolPendingOut(BaseModel):
    items: List[PoolEventOut]
    total: int
