from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


def _reject_bool_float_integer(value: Any, field_name: str) -> Any:
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


def _reject_non_decimal_string(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a decimal string.")
    return value


def _reject_non_object_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object.")
    return value


class ProtectedTradeCreateIn(BaseModel):
    clan_id: Optional[int] = None
    participant_role: str = Field("seller", pattern="^(seller|buyer)$")
    seller_user_id: Optional[int] = None
    buyer_user_id: Optional[int] = None
    shop_id: Optional[int] = None
    product_id: Optional[int] = None
    vault_access_link_id: Optional[int] = None
    trust_slip_code: Optional[str] = Field(default=None, max_length=64)
    expected_payment_id: Optional[int] = None
    shipment_pack_id: Optional[str] = Field(default=None, max_length=96)
    evidence_pack_id: Optional[str] = Field(default=None, max_length=96)
    item_title: Optional[str] = Field(default=None, max_length=160)
    terms_summary: Optional[str] = Field(default=None, max_length=4000)
    amount: Optional[Decimal] = None
    currency: str = Field("NGN", min_length=1, max_length=8)
    meta: Optional[Dict[str, Any]] = None

    @field_validator(
        "clan_id",
        "seller_user_id",
        "buyer_user_id",
        "shop_id",
        "product_id",
        "vault_access_link_id",
        "expected_payment_id",
        mode="before",
    )
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_float_integer(value, info.field_name)

    @field_validator(
        "participant_role",
        "trust_slip_code",
        "shipment_pack_id",
        "evidence_pack_id",
        "item_title",
        "terms_summary",
        "currency",
        mode="before",
    )
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("amount", mode="before")
    @classmethod
    def _reject_amount_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_decimal_string(value, info.field_name)

    @field_validator("meta", mode="before")
    @classmethod
    def _reject_meta_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_object_value(value, info.field_name)


class ProtectedTradeEventIn(BaseModel):
    event_type: str = Field(..., min_length=3, max_length=64)
    note: Optional[str] = Field(default=None, max_length=4000)
    expected_payment_id: Optional[int] = None
    shipment_pack_id: Optional[str] = Field(default=None, max_length=96)
    evidence_pack_id: Optional[str] = Field(default=None, max_length=96)
    trust_slip_code: Optional[str] = Field(default=None, max_length=64)
    meta: Optional[Dict[str, Any]] = None

    @field_validator("expected_payment_id", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_float_integer(value, info.field_name)

    @field_validator(
        "event_type",
        "note",
        "shipment_pack_id",
        "evidence_pack_id",
        "trust_slip_code",
        mode="before",
    )
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("meta", mode="before")
    @classmethod
    def _reject_meta_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_object_value(value, info.field_name)


class ProtectedTradeEventOut(BaseModel):
    id: int
    trade_id: int
    event_type: str
    actor_user_id: int
    status_from: Optional[str] = None
    status_to: Optional[str] = None
    trust_event_id: Optional[int] = None
    note: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class ProtectedTradeOut(BaseModel):
    id: int
    trade_code: str
    clan_id: Optional[int] = None
    creator_user_id: int
    seller_user_id: Optional[int] = None
    buyer_user_id: Optional[int] = None
    shop_id: Optional[int] = None
    product_id: Optional[int] = None
    vault_access_link_id: Optional[int] = None
    trust_slip_code: Optional[str] = None
    expected_payment_id: Optional[int] = None
    shipment_pack_id: Optional[str] = None
    evidence_pack_id: Optional[str] = None
    item_title: Optional[str] = None
    terms_summary: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: str
    status: str
    payment_status: str
    release_status: str
    receipt_status: str
    dispute_status: str
    meta: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    events: List[ProtectedTradeEventOut] = Field(default_factory=list)
    boundary_note: str
