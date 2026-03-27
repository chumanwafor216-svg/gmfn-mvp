# app/schemas/merchant_release.py
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class MerchantReleaseIn(BaseModel):
    """
    Merchant logs goods release based on verified TrustSlip.
    """
    token: str = Field(..., min_length=20)
    goods_value: str = Field(..., min_length=1)  # decimal string
    currency: str = Field("NGN", min_length=1)
    merchant_note: Optional[str] = None