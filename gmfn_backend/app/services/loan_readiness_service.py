from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy.orm import Session

import app.db.models as db_models
from app.services.guarantor_selection_service import build_loan_guarantor_suggestions
from app.services.liquidity_engine_service import _q2, _safe_decimal, _safe_int, build_clan_liquidity_snapshot

Loan = getattr(db_models, "Loan", None)


def _clamp(value: Decimal, min_v: Decimal, max_v: Decimal) -> Decimal:
    if value < min_v:
        return min_v
    if value > max_v:
        return max_v
    return value


def _recommendation(
    *,
    total_candidate_capacity: Decimal,
    estimated_guarantee_gap: Decimal,
    clan_exposure_ratio: Decimal,
    high_risk_members: int,
) -> str:
    if total_candidate_capacity <= Decimal("0"):
        return "block"
    if estimated_guarantee_gap > Decimal("0") and total_candidate_capacity < estimated_guarantee_gap:
        return "reduce_amount"
    if clan_exposure_ratio >= Decimal("0.80"):
        return "caution"
    if high_risk_members > 0:
        return "caution"
    return "proceed"


def _reasons(
    *,
    recommendation: str,
    coverable_now: bool,
    total_candidate_capacity: Decimal,
    clan_exposure_ratio: Decimal,
    high_risk_members: int,
) -> List[str]:
    reasons: List[str] = []

    if total_candidate_capacity <= Decimal("0"):
        reasons.append("no_viable_guarantor_capacity")
    elif not coverable_now:
        reasons.append("requested_amount_exceeds_current_coverable_capacity")
    elif recommendation == "proceed":
        reasons.append("requested_amount_appears_coverable")

    if clan_exposure_ratio >= Decimal("0.80"):
        reasons.append("clan_exposure_already_high")

    if high_risk_members > 0:
        reasons.append("high_risk_members_present")

    return reasons


def build_loan_readiness_plan(
    db: Session,
    *,
    clan_id: int,
    requested_amount: Any,
    borrower_user_id: int | None = None,
) -> Dict[str, Any]:
    target_amount = _q2(requested_amount)
    if target_amount <= Decimal("0.00"):
        raise ValueError("Requested amount must be greater than zero")

    clan = build_clan_liquidity_snapshot(db, int(clan_id))
    members: List[Dict[str, Any]] = list(clan.get("members", []) or [])

    filtered_candidates: List[Dict[str, Any]] = []
    total_candidate_capacity = Decimal("0.00")

    for member in members:
        uid = _safe_int(member.get("user_id"), 0)
        if borrower_user_id is not None and uid == int(borrower_user_id):
            continue

        available_capacity = _safe_decimal(member.get("available_guarantee_capacity"), "0")
        cci_score = _safe_decimal(member.get("cci_score"), "0")

        if available_capacity <= Decimal("0"):
            continue
        if cci_score < Decimal("35"):
            continue

        filtered_candidates.append(member)
        total_candidate_capacity += available_capacity

    filtered_candidates.sort(
        key=lambda m: (
            _safe_decimal(m.get("available_guarantee_capacity"), "0"),
            _safe_decimal(m.get("cci_score"), "0"),
            _safe_decimal(m.get("trust_graph_reliability"), "0"),
        ),
        reverse=True,
    )

    estimated_guarantee_gap = target_amount
    coverable_now = total_candidate_capacity >= estimated_guarantee_gap

    capacity_ratio = Decimal("0.00")
    if estimated_guarantee_gap > Decimal("0"):
        capacity_ratio = _q2(total_candidate_capacity / estimated_guarantee_gap)

    suggested_safe_amount = target_amount
    if total_candidate_capacity < target_amount:
        suggested_safe_amount = _q2(total_candidate_capacity)

    clan_exposure_ratio = _safe_decimal(clan.get("clan_exposure_ratio"), "0")
    high_risk_members = _safe_int(clan.get("risk_counts", {}).get("high"), 0)

    recommendation = _recommendation(
        total_candidate_capacity=total_candidate_capacity,
        estimated_guarantee_gap=estimated_guarantee_gap,
        clan_exposure_ratio=clan_exposure_ratio,
        high_risk_members=high_risk_members,
    )
    reasons = _reasons(
        recommendation=recommendation,
        coverable_now=coverable_now,
        total_candidate_capacity=total_candidate_capacity,
        clan_exposure_ratio=clan_exposure_ratio,
        high_risk_members=high_risk_members,
    )

    suggested_top_candidates = []
    remaining = estimated_guarantee_gap
    for member in filtered_candidates[:5]:
        if remaining <= Decimal("0"):
            break
        available_capacity = _safe_decimal(member.get("available_guarantee_capacity"), "0")
        pledge = available_capacity if available_capacity < remaining else remaining
        if pledge <= Decimal("0"):
            continue
        suggested_top_candidates.append(
            {
                "user_id": member.get("user_id"),
                "email": member.get("email"),
                "gmfn_id": member.get("gmfn_id"),
                "cci_score": member.get("cci_score"),
                "cci_band": member.get("cci_band"),
                "risk_level": member.get("risk_level"),
                "available_guarantee_capacity": member.get("available_guarantee_capacity"),
                "suggested_pledge": str(_q2(pledge)),
                "trust_graph_reliability": member.get("trust_graph_reliability"),
                "repayment_velocity": member.get("repayment_velocity"),
            }
        )
        remaining = _q2(remaining - pledge)

    # If borrower exists and there is a live loan in this clan, prefer real guarantee-gap truth.
    # This keeps readiness aligned with actual loan-level GMFN math where possible.
    if Loan is not None and borrower_user_id is not None:
        live_loan = (
            db.query(Loan)
            .filter(Loan.clan_id == int(clan_id))
            .filter(Loan.borrower_user_id == int(borrower_user_id))
            .filter(Loan.status.in_(["pending", "incomplete", "approved"]))
            .order_by(Loan.id.desc())
            .first()
        )
        if live_loan is not None:
            try:
                suggestions = build_loan_guarantor_suggestions(db, int(live_loan.id), limit=5)
                estimated_guarantee_gap = _safe_decimal(suggestions.get("target_guarantee_amount"), "0")
                if estimated_guarantee_gap <= Decimal("0"):
                    estimated_guarantee_gap = target_amount

                coverable_now = total_candidate_capacity >= estimated_guarantee_gap
                capacity_ratio = (
                    _q2(total_candidate_capacity / estimated_guarantee_gap)
                    if estimated_guarantee_gap > Decimal("0")
                    else Decimal("0.00")
                )
                suggested_safe_amount = target_amount if total_candidate_capacity >= target_amount else _q2(total_candidate_capacity)
                remaining = _safe_decimal(suggestions.get("remaining_gap_after_suggestions"), "0")
                suggested_top_candidates = list(suggestions.get("suggestions", []) or [])

                recommendation = _recommendation(
                    total_candidate_capacity=total_candidate_capacity,
                    estimated_guarantee_gap=estimated_guarantee_gap,
                    clan_exposure_ratio=clan_exposure_ratio,
                    high_risk_members=high_risk_members,
                )
                reasons = _reasons(
                    recommendation=recommendation,
                    coverable_now=coverable_now,
                    total_candidate_capacity=total_candidate_capacity,
                    clan_exposure_ratio=clan_exposure_ratio,
                    high_risk_members=high_risk_members,
                )
            except Exception:
                pass

    readiness_score = Decimal("50.00")
    readiness_score += _clamp(capacity_ratio * Decimal("25"), Decimal("0"), Decimal("35"))
    readiness_score -= _clamp(clan_exposure_ratio * Decimal("30"), Decimal("0"), Decimal("30"))
    readiness_score -= Decimal(high_risk_members * 8)
    if recommendation == "proceed":
        readiness_score += Decimal("10")
    elif recommendation == "reduce_amount":
        readiness_score -= Decimal("10")
    elif recommendation == "block":
        readiness_score -= Decimal("25")

    readiness_score = _clamp(readiness_score, Decimal("0"), Decimal("100"))

    return {
        "clan_id": int(clan_id),
        "borrower_user_id": int(borrower_user_id) if borrower_user_id is not None else None,
        "requested_amount": str(target_amount),
        "readiness": {
            "recommendation": recommendation,
            "readiness_score": str(_q2(readiness_score)),
            "reasons": reasons,
        },
        "coverage": {
            "estimated_guarantee_gap": str(_q2(estimated_guarantee_gap)),
            "total_candidate_capacity": str(_q2(total_candidate_capacity)),
            "capacity_ratio": str(_q2(capacity_ratio)),
            "coverable_now": bool(coverable_now),
            "suggested_safe_amount": str(_q2(suggested_safe_amount)),
            "remaining_gap_after_top_candidates": str(_q2(remaining)),
        },
        "clan_context": {
            "member_count": _safe_int(clan.get("member_count"), 0),
            "clan_exposure_ratio": str(clan.get("clan_exposure_ratio", "0.00")),
            "average_cci_score": str(clan.get("average_cci_score", "0.00")),
            "risk_flags": list(clan.get("risk_flags", []) or []),
            "risk_counts": dict(clan.get("risk_counts", {}) or {}),
        },
        "top_candidates": suggested_top_candidates,
    }