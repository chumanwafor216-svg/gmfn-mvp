# app/schemas/shipment.py
from __future__ import annotations

from typing import Optional, Literal
from pydantic import BaseModel, Field

ShipmentStage = Literal["dispatched", "in_transit", "delivered", "delivery_issue"]
CourierStage = Literal["received", "in_transit", "delivered"]


class ShipmentUpdateIn(BaseModel):
    stage: ShipmentStage
    carrier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    expected_delivery_date: Optional[str] = None  # ISO date string
    contact_phone: Optional[str] = None
    note: Optional[str] = None


class CourierConfirmIn(BaseModel):
    stage: CourierStage
    carrier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    note: Optional[str] = None


class CourierLinkOut(BaseModel):
    ok: bool = True
    loan_id: int
    borrower_user_id: int
    expires_hours: int
    path: str


class BorrowerDeliveryConfirmIn(BaseModel):
    note: Optional[str] = Field(None, max_length=500)
    