from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator


ACTIVITY_TYPES = {
    "work_completed",
    "sale_order",
    "product_update",
    "business_milestone",
    "event_activity",
    "customer_delivery",
    "other_update",
}

EVIDENCE_CLASSES = {
    "owner_update",
    "system_recorded",
    "counterparty_confirmed",
    "gsn_insight",
}


class ShopDiaryEntryCreateIn(BaseModel):
    clan_id: Optional[int] = None
    shop_id: int = Field(gt=0)
    activity_type: str = Field(default="other_update", min_length=3, max_length=40)
    note: str = Field(min_length=2, max_length=4000)
    occurred_at: Optional[datetime] = None
    image_url: Optional[str] = Field(default=None, max_length=4000)
    video_url: Optional[str] = Field(default=None, max_length=4000)
    product_id: Optional[int] = Field(default=None, gt=0)
    protected_trade_id: Optional[int] = Field(default=None, gt=0)
    evidence_class: str = Field(default="owner_update", max_length=40)
    is_public: bool = True

    @field_validator("activity_type", mode="before")
    @classmethod
    def _activity_type_known(cls, value: Any) -> str:
        text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
        if text not in ACTIVITY_TYPES:
            raise ValueError("Choose a supported activity type.")
        return text

    @field_validator("evidence_class", mode="before")
    @classmethod
    def _evidence_class_known(cls, value: Any) -> str:
        text = str(value or "owner_update").strip().lower().replace("-", "_").replace(" ", "_")
        if text not in EVIDENCE_CLASSES:
            raise ValueError("Choose a supported evidence meaning.")
        return text

    @field_validator("clan_id", "product_id", "protected_trade_id", mode="before")
    @classmethod
    def _reject_bool_float_integer(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if isinstance(value, bool):
            raise ValueError(f"{info.field_name} must be an integer, not a boolean.")
        if isinstance(value, float):
            raise ValueError(f"{info.field_name} must be an integer, not a float.")
        return value


class ShopDiaryEntryOut(BaseModel):
    id: int
    clan_id: Optional[int] = None
    shop_id: int
    owner_user_id: int
    activity_type: str
    activity_label: str
    evidence_class: str
    evidence_label: str
    evidence_boundary: str
    note: str
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    occurred_at: Optional[datetime] = None
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    protected_trade_id: Optional[int] = None
    protected_trade_code: Optional[str] = None
    protected_trade_outcome: Optional[Dict[str, Any]] = None
    is_public: bool = True
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ShopDiaryEntryListOut(BaseModel):
    items: list[ShopDiaryEntryOut]