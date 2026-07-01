# app/schemas/merchant_release.py
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


class MerchantReleaseIn(BaseModel):
    """
    Merchant records a goods-release evidence note after reviewing current GSN evidence.
    This does not approve release, confirm payment, or create escrow authority.
    """
    token: str = Field(..., min_length=20)
    goods_value: str = Field(..., min_length=1)  # decimal string
    currency: str = Field("NGN", min_length=1)
    merchant_note: Optional[str] = None
    trade_context: str = Field("gsn_external", min_length=1, max_length=40)
    item_title: Optional[str] = Field(default=None, max_length=160)
    counterparty_label: Optional[str] = Field(default=None, max_length=160)
    counterparty_whatsapp_label: Optional[str] = Field(default=None, max_length=120)
    product_evidence_note: Optional[str] = Field(default=None, max_length=500)
    invoice_reference: Optional[str] = Field(default=None, max_length=120)
    invoice_evidence_note: Optional[str] = Field(default=None, max_length=500)
    agreement_evidence_note: Optional[str] = Field(default=None, max_length=700)
    courier_name: Optional[str] = Field(default=None, max_length=160)
    courier_contact_label: Optional[str] = Field(default=None, max_length=120)
    tracking_number: Optional[str] = Field(default=None, max_length=120)
    released_to_courier_at: Optional[str] = Field(default=None, max_length=80)
    expected_delivery_date: Optional[str] = Field(default=None, max_length=80)
    payment_schedule_note: Optional[str] = Field(default=None, max_length=700)
    receipt_status: str = Field("awaiting_delivery", min_length=1, max_length=40)

    @field_validator(
        "token",
        "goods_value",
        "currency",
        "merchant_note",
        "trade_context",
        "item_title",
        "counterparty_label",
        "counterparty_whatsapp_label",
        "product_evidence_note",
        "invoice_reference",
        "invoice_evidence_note",
        "agreement_evidence_note",
        "courier_name",
        "courier_contact_label",
        "tracking_number",
        "released_to_courier_at",
        "expected_delivery_date",
        "payment_schedule_note",
        "receipt_status",
        mode="before",
    )
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)
