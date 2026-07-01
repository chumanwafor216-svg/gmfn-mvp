from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _reject_bool_integer(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer, not a float.")
    return value


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _reject_non_bool_value(value: Any, field_name: str) -> Any:
    if isinstance(value, bool):
        return value
    raise ValueError(f"{field_name} must be a boolean.")


class MarketplaceRequestCreate(BaseModel):
    clan_id: Optional[int] = Field(default=None, ge=1)
    title: str = Field(..., min_length=3, max_length=180)
    description: Optional[str] = Field(default=None, max_length=1500)
    category: Optional[str] = Field(default=None, max_length=80)
    urgency: Optional[str] = Field(default="medium", max_length=20)
    area: Optional[str] = Field(default=None, max_length=120)
    whatsapp_number: Optional[str] = Field(default=None, max_length=40)
    expires_in_hours: Optional[int] = Field(default=48, ge=1, le=168)
    payment_mode: Optional[str] = Field(default=None, max_length=40)
    allow_trust_credit: bool = False

    @field_validator("clan_id", "expires_in_hours", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_integer(value, info.field_name)

    @field_validator(
        "title",
        "description",
        "category",
        "urgency",
        "area",
        "whatsapp_number",
        "payment_mode",
        mode="before",
    )
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("allow_trust_credit", mode="before")
    @classmethod
    def _reject_non_bool_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_bool_value(value, info.field_name)


class MarketplaceRequestUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(fulfilled|cancelled)$")

    @field_validator("status", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class MarketplaceRequestOut(BaseModel):
    id: int
    clan_id: Optional[int] = None
    user_id: int
    community_code: Optional[str] = None
    clan_name: Optional[str] = None
    marketplace_name: Optional[str] = None

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

    model_config = ConfigDict(from_attributes=True)
