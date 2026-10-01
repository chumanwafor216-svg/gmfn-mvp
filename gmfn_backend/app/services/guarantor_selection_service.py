from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy.orm import Session

import app.db.models as db_models
from app.services.liquidity_engine_service import (
    _q2,
    _safe_decimal,
    _safe_int,
    build_user_liquidity_profile,
)

Loan = getattr(db_models, "Loan", None)
ClanMembership = db_models.ClanMembership


def _clamp(value: Decimal, min_v: Decimal, max_v: Decimal) -> Decimal:
    if value < min_v:
        return min_v
    if value > max_v:
        return max_v
    return value


def _target_guarantee_amount(loan: Any) -> Decimal:
    guarantee_gap = _safe_decimal(getattr(loan, "guarantee_gap", None), "0")
    if guarantee_gap > Decimal("0"):
        return _q2(guarantee_gap)

    amount = _safe_decimal(getattr(loan, "amount", None), "0")
    pool_used = _safe_decimal(getattr(loan, "pool_used", None), "0")
    fallback_gap = amount - pool_used
    if fallback_gap < Decimal("0"):
        fallback_gap = Decimal("0")
    return _q2(fallback_gap)


def _capacity_fit_percent(profile: Dict[str, Any], target_amount: Decimal) -> Decimal:
    available = _safe_decimal(profile.get("available_guarantee_capacity"), "0")
    if target_amount <= Decimal("0"):
        return Decimal("0.00")
    return _clamp((available / target_amount) * Decimal("100"), Decimal("0"), Decimal("100"))

def build_loan_guarantor_suggestions(
    db: Session,
    loan_id: int,
    *,
    limit: int = 5,
) -> Dict[str, Any]:
    if Loan is None:
        raise ValueError("Loan model not available")

    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise ValueError("Loan not found")

    clan_id = _safe_int(getattr(loan, "clan_id", None), 0)
    borrower_user_id = _safe_int(getattr(loan, "borrower_user_id", None), 0)
    loan_amount = _safe_decimal(getattr(loan, "amount", None), "0")
    target_amount = _target_guarantee_amount(loan)

    memberships = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .all()
    )

    candidates: List[Dict[str, Any]] = []
    for membership in memberships:
        uid = _safe_int(getattr(membership, "user_id", None), 0)
        if uid <= 0 or uid == borrower_user_id:
            continue

        try:
            profile = build_user_liquidity_profile(db, uid)
        except ValueError:
            continue

        available = _safe_decimal(profile.get("available_guarantee_capacity"), "0")
        if available <= Decimal("0"):
            continue

        capacity_fit = _capacity_fit_percent(profile, target_amount if target_amount > Decimal("0") else loan_amount)
        profile["suitability_score"] = str(_q2(capacity_fit))
        profile["planning_score"] = str(_q2(capacity_fit))
        profile["planning_score_semantics"] = "capacity_fit_percent_only"
        candidates.append(profile)

    candidates.sort(
        key=lambda c: (
            _safe_decimal(c.get("available_guarantee_capacity"), "0"),
            _safe_int((c.get("historical_obligation_evidence") or {}).get("positive_signal_count"), 0),
            -_safe_int(c.get("user_id"), 0),
        ),
        reverse=True,
    )

    selected: List[Dict[str, Any]] = []
    remaining = target_amount

    for candidate in candidates[: max(1, min(int(limit), 20))]:
        if remaining <= Decimal("0"):
            break

        available = _safe_decimal(candidate.get("available_guarantee_capacity"), "0")
        suggested_pledge = available if available < remaining else remaining
        if suggested_pledge <= Decimal("0"):
            continue

        selected.append(
            {
                "user_id": candidate.get("user_id"),
                "email": candidate.get("email"),
                "gmfn_id": candidate.get("gmfn_id"),
                "risk_level": candidate.get("risk_level"),
                "cci_score": candidate.get("cci_score"),
                "cci_band": candidate.get("cci_band"),
                "trust_graph_reliability": candidate.get("trust_graph_reliability"),
                "repayment_velocity": candidate.get("repayment_velocity"),
                "cross_clan_diversity": candidate.get("cross_clan_diversity"),
                "current_locked_guarantees": candidate.get("current_locked_guarantees"),
                "available_guarantee_capacity": candidate.get("available_guarantee_capacity"),
                "suggested_pledge": str(_q2(suggested_pledge)),
                "planning_score": candidate.get("planning_score"),
                "planning_score_semantics": candidate.get("planning_score_semantics"),
                "suitability_score": candidate.get("suitability_score"),
                "evidence_state": candidate.get("evidence_state"),
                "hard_support_facts": candidate.get("hard_support_facts", {}),
                "historical_obligation_evidence": candidate.get("historical_obligation_evidence", {}),
                "current_willingness": "unknown_until_explicit_response",
                "general_evidence_posture": candidate.get("general_evidence_posture", {}),
                "reasons": candidate.get("reasons", []),
            }
        )
        remaining = _q2(remaining - suggested_pledge)

    suggested_total = _q2(sum((_safe_decimal(s.get("suggested_pledge"), "0") for s in selected), Decimal("0.00")))

    return {
        "loan_id": int(loan_id),
        "clan_id": clan_id,
        "borrower_user_id": borrower_user_id,
        "loan_amount": str(_q2(loan_amount)),
        "target_guarantee_amount": str(_q2(target_amount)),
        "suggested_total": str(suggested_total),
        "remaining_gap_after_suggestions": str(_q2(remaining)),
        "suggestions": selected,
        "semantics": {
            "purpose": "support_planning_evidence",
            "not_endorsement": True,
            "hard_support_facts": [
                "available_guarantee_capacity",
                "current_locked_guarantees",
                "active_guarantee_count",
            ],
            "general_evidence_posture": [
                "cci_score",
                "cci_band",
                "trust_graph_reliability",
                "cross_clan_diversity",
            ],
            "boundary": (
                "Suggestions are planning evidence only. They do not approve a loan, "
                "choose a supporter, prove financial reliability, prove willingness, or endorse a person."
            ),
        },
    }