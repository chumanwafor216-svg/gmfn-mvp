from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


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


class ProtectedTradeEventIn(BaseModel):
    event_type: str = Field(..., min_length=3, max_length=64)
    note: Optional[str] = Field(default=None, max_length=4000)
    expected_payment_id: Optional[int] = None
    shipment_pack_id: Optional[str] = Field(default=None, max_length=96)
    evidence_pack_id: Optional[str] = Field(default=None, max_length=96)
    trust_slip_code: Optional[str] = Field(default=None, max_length=64)
    meta: Optional[Dict[str, Any]] = None


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
