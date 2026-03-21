# app/services/cci_engine.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Iterable


def _d(value: Any, default: str = "0.00") -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal(default)
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _clamp(value: Decimal, low: str = "0.00", high: str = "100.00") -> Decimal:
    lo = Decimal(low)
    hi = Decimal(high)
    if value < lo:
        return lo
    if value > hi:
        return hi
    return value


def _count_edges(edges: Iterable[dict], edge_type: str) -> int:
    return sum(1 for e in edges if str(e.get("edge_type") or "").lower() == edge_type.lower())


def _sum_weights(edges: Iterable[dict], edge_type: str | None = None) -> Decimal:
    total = Decimal("0.00")
    for e in edges:
        if edge_type and str(e.get("edge_type") or "").lower() != edge_type.lower():
            continue
        total += _d(e.get("weight"))
    return total


def compute_cci_from_graph(graph: Dict[str, Any]) -> Dict[str, Any]:
    """
    Phase 3 CCI engine.

    This does NOT replace TrustScore.
    It computes a graph-derived Cross-Clan Integrity (CCI) score for internal/admin use.
    """

    summary = graph.get("summary") or {}
    edges = graph.get("edges") or []

    active_clan_count = int(summary.get("active_clan_count") or 0)
    sponsor_count = int(summary.get("sponsor_count") or 0)
    unique_counterparties = int(summary.get("unique_counterparties") or 0)

    repayment_edge_count = int(summary.get("repayment_edge_count") or 0)
    guarantee_edge_count = int(summary.get("guarantee_edge_count") or 0)
    invite_edge_count = int(summary.get("invite_edge_count") or 0)
    merchant_edge_count = int(summary.get("merchant_edge_count") or 0)

    inbound_edges = int(summary.get("inbound_trust_edges") or 0)
    outbound_edges = int(summary.get("outbound_trust_edges") or 0)

    repayment_weight = _sum_weights(edges, "repayment_verified") + _sum_weights(edges, "repaid_self")
    guarantee_weight = _sum_weights(edges, "guaranteed")
    invite_weight = _sum_weights(edges, "invited_by") + _sum_weights(edges, "successfully_onboarded")
    merchant_weight = _sum_weights(edges, "merchant_release_verified")
    co_member_weight = _sum_weights(edges, "co_member")

    # ------------------------------------------
    # Positive factors
    # ------------------------------------------
    identity_continuity_score = min(Decimal("12.00"), Decimal(active_clan_count) * Decimal("3.00"))
    sponsor_credibility_score = min(Decimal("12.00"), Decimal(sponsor_count) * Decimal("4.00"))
    network_diversity_score = min(Decimal("14.00"), Decimal(unique_counterparties) * Decimal("1.75"))

    repayment_integrity_score = min(Decimal("22.00"), repayment_weight * Decimal("1.10"))
    guarantee_reliability_score = min(Decimal("14.00"), guarantee_weight * Decimal("0.85"))
    onboarding_signal_score = min(Decimal("8.00"), invite_weight * Decimal("0.70"))
    merchant_confidence_score = min(Decimal("8.00"), merchant_weight * Decimal("0.90"))
    clan_embeddedness_score = min(Decimal("8.00"), co_member_weight * Decimal("0.20"))

    positive_total = (
        identity_continuity_score
        + sponsor_credibility_score
        + network_diversity_score
        + repayment_integrity_score
        + guarantee_reliability_score
        + onboarding_signal_score
        + merchant_confidence_score
        + clan_embeddedness_score
    )

    # ------------------------------------------
    # Risk penalties
    # ------------------------------------------
    penalties = Decimal("0.00")
    risk_flags: list[str] = []

    if active_clan_count <= 1:
        penalties += Decimal("5.00")
        risk_flags.append("single_clan_concentration")

    if unique_counterparties <= 1:
        penalties += Decimal("4.00")
        risk_flags.append("low_network_diversity")

    if sponsor_count == 0:
        penalties += Decimal("3.00")
        risk_flags.append("no_recorded_sponsor")

    if repayment_edge_count == 0:
        penalties += Decimal("6.00")
        risk_flags.append("no_verified_repayment_history")

    if inbound_edges == 0 and outbound_edges == 0:
        penalties += Decimal("8.00")
        risk_flags.append("graph_isolated")

    if guarantee_edge_count > 0 and repayment_edge_count == 0:
        penalties += Decimal("2.00")
        risk_flags.append("guarantee_without_repayment_confirmation")

    # ------------------------------------------
    # Final CCI
    # ------------------------------------------
    base_score = Decimal("25.00")
    cci_score = _clamp(base_score + positive_total - penalties)

    band = "D"
    if cci_score >= Decimal("80.00"):
        band = "A"
    elif cci_score >= Decimal("65.00"):
        band = "B"
    elif cci_score >= Decimal("50.00"):
        band = "C"

    explainability = {
        "phase": "cci_phase_3",
        "base_score": str(base_score.quantize(Decimal("0.01"))),
        "positive_total": str(positive_total.quantize(Decimal("0.01"))),
        "penalties": str(penalties.quantize(Decimal("0.01"))),
        "identity_continuity_score": str(identity_continuity_score.quantize(Decimal("0.01"))),
        "sponsor_credibility_score": str(sponsor_credibility_score.quantize(Decimal("0.01"))),
        "network_diversity_score": str(network_diversity_score.quantize(Decimal("0.01"))),
        "repayment_integrity_score": str(repayment_integrity_score.quantize(Decimal("0.01"))),
        "guarantee_reliability_score": str(guarantee_reliability_score.quantize(Decimal("0.01"))),
        "onboarding_signal_score": str(onboarding_signal_score.quantize(Decimal("0.01"))),
        "merchant_confidence_score": str(merchant_confidence_score.quantize(Decimal("0.01"))),
        "clan_embeddedness_score": str(clan_embeddedness_score.quantize(Decimal("0.01"))),
        "risk_flags": risk_flags,
        "raw_counts": {
            "active_clan_count": active_clan_count,
            "sponsor_count": sponsor_count,
            "unique_counterparties": unique_counterparties,
            "repayment_edge_count": repayment_edge_count,
            "guarantee_edge_count": guarantee_edge_count,
            "invite_edge_count": invite_edge_count,
            "merchant_edge_count": merchant_edge_count,
            "inbound_edges": inbound_edges,
            "outbound_edges": outbound_edges,
        },
        "note": "CCI is cross-clan graph integrity, not a replacement for TrustScore or TrustSlip.",
    }

    return {
        "cci_score": str(cci_score.quantize(Decimal("0.01"))),
        "cci_band": band,
        "risk_flags": risk_flags,
        "explainability": explainability,
    }