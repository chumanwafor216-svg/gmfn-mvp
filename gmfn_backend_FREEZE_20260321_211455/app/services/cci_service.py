from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List


def _safe_decimal(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    try:
        return Decimal(str(x))
    except Exception:
        return Decimal("0")


def _clamp(value: Decimal, min_v: Decimal, max_v: Decimal) -> Decimal:
    if value < min_v:
        return min_v
    if value > max_v:
        return max_v
    return value


def compute_cci_from_summary(summary: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic Cross-Clan Integrity (CCI) score derived from TrustGraph summary.
    Pure calculation only. No DB reads/writes.
    """

    breadth = _safe_decimal(summary.get("network_breadth", 0))
    quality = _safe_decimal(summary.get("network_quality", 0))
    guarantees = _safe_decimal(summary.get("guarantee_integrity", 0))
    repayment = _safe_decimal(summary.get("repayment_integrity", 0))
    defaults = _safe_decimal(summary.get("default_pressure", 0))
    volatility = _safe_decimal(summary.get("trust_volatility", 0))

    score = (
        breadth * Decimal("0.10")
        + quality * Decimal("0.20")
        + guarantees * Decimal("0.20")
        + repayment * Decimal("0.35")
        - defaults * Decimal("0.10")
        - volatility * Decimal("0.05")
    )

    score = _clamp(score, Decimal("0"), Decimal("100"))

    if score >= 80:
        band = "A"
    elif score >= 65:
        band = "B"
    elif score >= 50:
        band = "C"
    elif score >= 35:
        band = "D"
    else:
        band = "E"

    risk_flags: List[str] = []

    if defaults > Decimal("0"):
        risk_flags.append("default_history")

    if volatility > Decimal("10"):
        risk_flags.append("high_trust_volatility")

    if breadth < Decimal("3"):
        risk_flags.append("low_network_breadth")

    explain = {
        "strengths": [],
        "pressures": [],
    }

    if repayment >= Decimal("40"):
        explain["strengths"].append("strong_repayment_integrity")
    if quality >= Decimal("40"):
        explain["strengths"].append("healthy_network_quality")
    if guarantees >= Decimal("35"):
        explain["strengths"].append("credible_guarantee_support")
    if breadth >= Decimal("30"):
        explain["strengths"].append("broad_relationship_network")

    if defaults > Decimal("0"):
        explain["pressures"].append("default_pressure_present")
    if volatility > Decimal("10"):
        explain["pressures"].append("trust_is_volatile")
    if breadth < Decimal("3"):
        explain["pressures"].append("network_is_thin")
    if quality < Decimal("20"):
        explain["pressures"].append("weak_network_quality")

    return {
        "network_breadth": str(breadth),
        "network_quality": str(quality),
        "guarantee_integrity": str(guarantees),
        "repayment_integrity": str(repayment),
        "default_pressure": str(defaults),
        "trust_volatility": str(volatility),
        "cci_score": str(score.quantize(Decimal("0.01"))),
        "cci_band": band,
        "risk_flags": risk_flags,
        "explain": explain,
    }