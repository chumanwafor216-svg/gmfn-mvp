# app/schemas/merchant_release.py
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class MerchantReleaseIn(BaseModel):
    """
    Merchant records a goods-release evidence note after reviewing current GSN evidence.
    This does not approve release, confirm payment, or create escrow authority.
    """
    token: str = Field(..., min_length=20)
    goods_value: str = Field(..., min_length=1)  # decimal string
    currency: str = Field("NGN", min_length=1)
    merchant_note: Optional[str] = None
