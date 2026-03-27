from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MarketplaceRequestCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=180)
    description: Optional[str] = Field(default=None, max_length=1500)
    category: Optional[str] = Field(default=None, max_length=80)
    urgency: Optional[str] = Field(default="medium", max_length=20)
    area: Optional[str] = Field(default=None, max_length=120)
    whatsapp_number: Optional[str] = Field(default=None, max_length=40)
    expires_in_hours: Optional[int] = Field(default=48, ge=1, le=168)
    payment_mode: Optional[str] = Field(default=None, max_length=40)
    allow_trust_credit: bool = False


class MarketplaceRequestUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(fulfilled|cancelled)$")


class MarketplaceRequestOut(BaseModel):
    id: int
    user_id: int

    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    urgency: Optional[str] = None
    area: Optional[str] = None
    whatsapp_number: Optional[str] = None
    payment_mode: Optional[str] = None
    allow_trust_credit: bool = False

    status: str
    created_at: datetime
    expires_at: Optional[datetime] = None

    requester_name: Optional[str] = None
    requester_nickname: Optional[str] = None
    requester_gmfn_id: Optional[str] = None
    requester_email: Optional[str] = None
    requester_trust_score: Optional[float] = None
    requester_trust_band: Optional[str] = None

    class Config:
        from_attributes = True