from __future__ import annotations

from decimal import Decimal, InvalidOperation


def _d(x) -> Decimal:
    try:
        if isinstance(x, Decimal):
            return x
        return Decimal(str(x))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def compute_trust_band(score: Decimal) -> str:
    """
    Deterministic mapping: trust_score -> trust_band label.
    Safe against bad inputs.
    """
    s = _d(score)

    if s < Decimal("0.10"):
        return "Bronze"
    if s < Decimal("0.50"):
        return "Silver"
    if s < Decimal("1.00"):
        return "Gold"
    return "Platinum"