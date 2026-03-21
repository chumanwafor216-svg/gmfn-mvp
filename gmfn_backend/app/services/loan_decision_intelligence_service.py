from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy.orm import Session

import app.db.models as db_models
from app.services.guarantor_selection_service import build_loan_guarantor_suggestions
from app.services.loan_readiness_service import build_loan_readiness_plan
from app.services.liquidity_engine_service import _q2, _safe_decimal, _safe_int, build_clan_liquidity_snapshot

Loan = getattr(db_models, "Loan", None)


def _confidence_score(
    *,
    recommendation: str,
    capacity_ratio: Decimal,
    clan_exposure_ratio: Decimal,
    high_risk_members: int,
) -> Decimal:
    score = Decimal("60.00")

    if recommendation == "proceed":
        score += Decimal("18")
    elif recommendation == "caution":
        score += Decimal("8")
    elif recommendation == "reduce_amount":
        score += Decimal("4")
    elif recommendation == "block":
        score += Decimal("12")

    score += min(capacity_ratio * Decimal("10"), Decimal("12"))
    score -= min(clan_exposure_ratio * Decimal("18"), Decimal("18"))
    score -= Decimal(high_risk_members * 4)

    if score < Decimal("0"):
        score = Decimal("0")
    if score > Decimal("100"):
        score = Decimal("100")
    return _q2(score)


def _final_recommendation(readiness_recommendation: str, suggestions_remaining_gap: Decimal) -> str:
    if readiness_recommendation == "block":
        return "block"
    if readiness_recommendation == "reduce_amount":
        return "reduce_amount"
    if suggestions_remaining_gap > Decimal("0"):
        return "caution"
    return readiness_recommendation


def _final_reasons(
    readiness_reasons: List[str],
    suggestions_remaining_gap: Decimal,
) -> List[str]:
    out = list(readiness_reasons)
    if suggestions_remaining_gap > Decimal("0") and "guarantee_gap_not_fully_covered" not in out:
        out.append("guarantee_gap_not_fully_covered")
    return out


def build_loan_decision_intelligence(db: Session, loan_id: int) -> Dict[str, Any]:
    if Loan is None:
        raise ValueError("Loan model not available")

    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise ValueError("Loan not found")

    clan_id = _safe_int(getattr(loan, "clan_id", None), 0)
    borrower_user_id = _safe_int(getattr(loan, "borrower_user_id", None), 0)
    amount = _q2(getattr(loan, "amount", None) or Decimal("0.00"))
    currency = str(getattr(loan, "currency", "NGN") or "NGN")
    status = str(getattr(loan, "status", "") or "")

    readiness = build_loan_readiness_plan(
        db,
        clan_id=int(clan_id),
        requested_amount=amount,
        borrower_user_id=int(borrower_user_id),
    )
    suggestions = build_loan_guarantor_suggestions(db, int(loan_id), limit=5)
    clan = build_clan_liquidity_snapshot(db, int(clan_id))

    readiness_recommendation = str(readiness.get("readiness", {}).get("recommendation", "caution") or "caution")
    readiness_reasons = list(readiness.get("readiness", {}).get("reasons", []) or [])

    suggested_total = _safe_decimal(suggestions.get("suggested_total"), "0")
    remaining_gap_after_suggestions = _safe_decimal(
        suggestions.get("remaining_gap_after_suggestions"), "0"
    )
    clan_exposure_ratio = _safe_decimal(clan.get("clan_exposure_ratio"), "0")
    high_risk_members = _safe_int(clan.get("risk_counts", {}).get("high"), 0)
    capacity_ratio = _safe_decimal(readiness.get("coverage", {}).get("capacity_ratio"), "0")

    recommendation = _final_recommendation(
        readiness_recommendation=readiness_recommendation,
        suggestions_remaining_gap=remaining_gap_after_suggestions,
    )
    reasons = _final_reasons(
        readiness_reasons=readiness_reasons,
        suggestions_remaining_gap=remaining_gap_after_suggestions,
    )
    confidence_score = _confidence_score(
        recommendation=recommendation,
        capacity_ratio=capacity_ratio,
        clan_exposure_ratio=clan_exposure_ratio,
        high_risk_members=high_risk_members,
    )

    return {
        "loan_id": int(loan_id),
        "loan": {
            "clan_id": clan_id,
            "borrower_user_id": borrower_user_id,
            "amount": str(amount),
            "currency": currency,
            "status": status,
        },
        "decision": {
            "recommendation": recommendation,
            "confidence_score": str(confidence_score),
            "reasons": reasons,
        },
        "coverage": {
            "target_guarantee_amount": str(
                suggestions.get("target_guarantee_amount", "0.00")
            ),
            "suggested_total": str(_q2(suggested_total)),
            "remaining_gap_after_suggestions": str(_q2(remaining_gap_after_suggestions)),
            "candidate_count": len(suggestions.get("suggestions", []) or []),
            "capacity_ratio": str(_q2(capacity_ratio)),
        },
        "clan_context": {
            "member_count": _safe_int(clan.get("member_count"), 0),
            "total_available_guarantee_capacity": str(
                clan.get("total_available_guarantee_capacity", "0.00")
            ),
            "clan_exposure_ratio": str(_q2(clan_exposure_ratio)),
            "average_cci_score": str(clan.get("average_cci_score", "0.00")),
            "risk_flags": list(clan.get("risk_flags", []) or []),
            "risk_counts": dict(clan.get("risk_counts", {}) or {}),
        },
        "readiness": readiness,
        "suggestions": suggestions,
    }