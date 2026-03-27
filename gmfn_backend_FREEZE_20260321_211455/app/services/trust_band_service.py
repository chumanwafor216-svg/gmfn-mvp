# app/services/trust_band_service.py
from __future__ import annotations

from decimal import Decimal


def compute_trust_band(score: Decimal) -> str:
    """
    Pure deterministic mapping: trust_score -> trust_band label.
    Tweak thresholds later, but keep deterministic.
    """
    s = Decimal(score)

    if s < Decimal("0.10"):
        return "Bronze"
    if s < Decimal("0.50"):
        return "Silver"
    if s < Decimal("1.00"):
        return "Gold"
    return "Platinum"
    