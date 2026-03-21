from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

import app.db.models as db_models
from app.services.trust_graph_service import build_trust_graph

User = db_models.User
ClanMembership = db_models.ClanMembership
Loan = getattr(db_models, "Loan", None)
LoanGuarantor = getattr(db_models, "LoanGuarantor", None)
TrustEvent = db_models.TrustEvent


CANONICAL_REPAYMENT_EVENTS = {"loan_repaid"}
LEGACY_REPAYMENT_EVENTS = {
    "repayment_confirmed",
    "full_repayment",
    "repayment_completed",
    "repayment_verified",
    "loan_repayment_confirmed",
    "full_repayment_confirmed",
    "loan.repaid",
}
ACTIVE_EXPOSURE_STATUSES = {"approved", "locked"}
PENDING_EXPOSURE_STATUSES = {"pending"}


def _safe_decimal(value: Any, default: str = "0") -> Decimal:
    try:
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _q2(value: Any) -> Decimal:
    return _safe_decimal(value).quantize(Decimal("0.01"))


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _clamp_decimal(value: Decimal, min_v: Decimal, max_v: Decimal) -> Decimal:
    if value < min_v:
        return min_v
    if value > max_v:
        return max_v
    return value


def _band_multiplier(band: str) -> Decimal:
    b = str(band or "").strip().upper()
    if b == "A":
        return Decimal("1.00")
    if b == "B":
        return Decimal("0.85")
    if b == "C":
        return Decimal("0.70")
    if b == "D":
        return Decimal("0.55")
    return Decimal("0.35")


def _risk_level(*, available_capacity: Decimal, exposure_ratio: Decimal, cci_score: Decimal) -> str:
    if available_capacity <= Decimal("0") or exposure_ratio >= Decimal("1.00") or cci_score < Decimal("35"):
        return "high"
    if exposure_ratio >= Decimal("0.60") or cci_score < Decimal("55"):
        return "medium"
    return "low"


def _get_active_guarantee_rows_for_user(db: Session, user_id: int) -> List[Any]:
    if LoanGuarantor is None:
        return []

    if not hasattr(LoanGuarantor, "guarantor_user_id"):
        return []

    q = db.query(LoanGuarantor).filter(LoanGuarantor.guarantor_user_id == int(user_id))

    if hasattr(LoanGuarantor, "status"):
        q = q.filter(LoanGuarantor.status.in_(sorted(ACTIVE_EXPOSURE_STATUSES | PENDING_EXPOSURE_STATUSES)))
    return q.all()


def _guarantee_exposure_amount(row: Any) -> Decimal:
    status = str(getattr(row, "status", "") or "").lower()

    if status in ACTIVE_EXPOSURE_STATUSES:
        locked = _safe_decimal(getattr(row, "locked_amount", None), "0")
        if locked > Decimal("0"):
            return _q2(locked)

        pledge = _safe_decimal(getattr(row, "pledge_amount", None), "0")
        if pledge > Decimal("0"):
            return _q2(pledge)

    if status in PENDING_EXPOSURE_STATUSES:
        pledge = _safe_decimal(getattr(row, "pledge_amount", None), "0")
        if pledge > Decimal("0"):
            # Pending guarantees are not full live exposure.
            # Count only lightly for caution pressure, not real locked pressure.
            return _q2(pledge * Decimal("0.25"))

    return Decimal("0.00")


def _estimate_repayment_velocity(db: Session, user_id: int) -> Decimal:
    if TrustEvent is None:
        return Decimal("0.00")

    rows = (
        db.query(TrustEvent)
        .filter(
            (TrustEvent.actor_user_id == int(user_id)) | (TrustEvent.subject_user_id == int(user_id))
        )
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(200)
        .all()
    )

    seen_loans = set()
    canonical_count = 0
    legacy_count = 0
    latest_created = None

    for row in rows:
        event_type = str(getattr(row, "event_type", "") or "").lower()
        loan_id = _safe_int(getattr(row, "loan_id", None), 0)

        if event_type in CANONICAL_REPAYMENT_EVENTS:
            dedupe_key = ("canonical", loan_id or _safe_int(getattr(row, "id", None), 0))
            if dedupe_key in seen_loans:
                continue
            seen_loans.add(dedupe_key)
            canonical_count += 1
            if latest_created is None:
                latest_created = getattr(row, "created_at", None)
            continue

        if event_type in LEGACY_REPAYMENT_EVENTS:
            # Only count legacy repayment evidence when no canonical loan_repaid exists
            # for that loan in the recent sample.
            dedupe_key = ("legacy", loan_id or _safe_int(getattr(row, "id", None), 0))
            canonical_key = ("canonical", loan_id or _safe_int(getattr(row, "id", None), 0))
            if canonical_key in seen_loans or dedupe_key in seen_loans:
                continue
            seen_loans.add(dedupe_key)
            legacy_count += 1
            if latest_created is None:
                latest_created = getattr(row, "created_at", None)

    repayment_signal_count = canonical_count + legacy_count
    if repayment_signal_count <= 0:
        return Decimal("0.00")

    canonical_weighted = Decimal(canonical_count) + (Decimal(legacy_count) * Decimal("0.60"))
    base = Decimal(min(int(canonical_weighted * Decimal("15")), 60))

    recency_bonus = Decimal("0")
    if latest_created is not None:
        try:
            from datetime import datetime, timezone

            dt = latest_created
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).days
            if age_days <= 30:
                recency_bonus = Decimal("40")
            elif age_days <= 90:
                recency_bonus = Decimal("25")
            else:
                recency_bonus = Decimal("10")
        except Exception:
            recency_bonus = Decimal("10")

    return _clamp_decimal(base + recency_bonus, Decimal("0"), Decimal("100"))


def _estimate_cross_clan_diversity(graph_summary: Dict[str, Any]) -> Decimal:
    active_clans = _safe_int(graph_summary.get("active_clan_count"), 0)
    counterparties = _safe_int(graph_summary.get("unique_counterparties"), 0)

    if counterparties <= 1:
        return Decimal("0.00")
    if active_clans <= 1:
        return Decimal("0.00")
    if active_clans == 2:
        return Decimal("6.00")
    if active_clans == 3:
        return Decimal("10.00")
    return Decimal("12.00")


def _graph_reliability(graph_summary: Dict[str, Any], cci: Dict[str, Any]) -> Decimal:
    graph_score = _safe_decimal(graph_summary.get("graph_score"), "0")
    network_quality = _safe_decimal(graph_summary.get("network_quality"), "0")
    repayment_integrity = _safe_decimal(cci.get("repayment_integrity"), "0")

    score = graph_score * Decimal("0.50") + network_quality * Decimal("0.25") + repayment_integrity * Decimal("0.25")
    return _clamp_decimal(score, Decimal("0"), Decimal("100"))


def _build_user_profile_internal(
    db: Session,
    user_id: int,
    graph_cache: Optional[Dict[int, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    user = db.get(User, int(user_id))
    if not user:
        raise ValueError("User not found")

    if graph_cache is None:
        graph_cache = {}

    if int(user_id) not in graph_cache:
        graph_cache[int(user_id)] = build_trust_graph(
            db,
            user_id=int(user_id),
            include_clans=True,
            limit_events=500,
        )

    tg = graph_cache[int(user_id)]
    summary = tg.get("summary", {})
    cci = tg.get("cci", {})

    personal_pool_balance = _q2(getattr(user, "personal_pool_balance", Decimal("0.00")) or Decimal("0.00"))
    active_guarantees = _get_active_guarantee_rows_for_user(db, int(user_id))
    current_locked_guarantees = _q2(sum((_guarantee_exposure_amount(r) for r in active_guarantees), Decimal("0.00")))
    active_guarantee_count = len(active_guarantees)

    repayment_velocity = _estimate_repayment_velocity(db, int(user_id))
    cross_clan_diversity = _estimate_cross_clan_diversity(summary)
    cci_score = _safe_decimal(cci.get("cci_score"), "0")
    cci_band = str(cci.get("cci_band", "E") or "E")
    trust_graph_reliability = _graph_reliability(summary, cci)

    if personal_pool_balance > Decimal("0"):
        exposure_ratio = _q2(current_locked_guarantees / personal_pool_balance)
    else:
        exposure_ratio = Decimal("1.00") if current_locked_guarantees > Decimal("0") else Decimal("0.00")

    stressed_edge_total = _safe_int(summary.get("stressed_edge_total"), 0)
    exposure_penalty = _clamp_decimal(
        exposure_ratio * Decimal("50") + Decimal(active_guarantee_count * 5) + Decimal(stressed_edge_total * 10),
        Decimal("0"),
        Decimal("100"),
    )

    multiplier = _band_multiplier(cci_band)
    available_capacity = _q2((personal_pool_balance * multiplier) - current_locked_guarantees)
    if available_capacity < Decimal("0.00"):
        available_capacity = Decimal("0.00")

    risk_level = _risk_level(
        available_capacity=available_capacity,
        exposure_ratio=exposure_ratio,
        cci_score=cci_score,
    )

    reasons: List[str] = []
    if available_capacity > Decimal("0"):
        reasons.append("has_available_guarantee_capacity")
    if cci_score >= Decimal("50"):
        reasons.append("acceptable_cci_band")
    if repayment_velocity >= Decimal("40"):
        reasons.append("good_repayment_velocity")
    if cross_clan_diversity > Decimal("0"):
        reasons.append("cross_clan_trust_present")
    if exposure_penalty >= Decimal("50"):
        reasons.append("exposure_pressure_high")

    return {
        "user_id": int(user.id),
        "email": getattr(user, "email", None),
        "gmfn_id": getattr(user, "gmfn_id", None),
        "personal_pool_balance": str(personal_pool_balance),
        "current_locked_guarantees": str(current_locked_guarantees),
        "active_guarantee_count": active_guarantee_count,
        "trust_graph_reliability": str(_q2(trust_graph_reliability)),
        "cci_score": str(_q2(cci_score)),
        "cci_band": cci_band,
        "repayment_velocity": str(_q2(repayment_velocity)),
        "cross_clan_diversity": str(_q2(cross_clan_diversity)),
        "overexposure_ratio": str(_q2(exposure_ratio)),
        "exposure_penalty": str(_q2(exposure_penalty)),
        "guarantee_capacity_multiplier": str(_q2(multiplier)),
        "available_guarantee_capacity": str(available_capacity),
        "risk_level": risk_level,
        "reasons": reasons,
        "summary": {
            "active_clan_count": _safe_int(summary.get("active_clan_count"), 0),
            "unique_counterparties": _safe_int(summary.get("unique_counterparties"), 0),
            "sponsor_count": _safe_int(summary.get("sponsor_count"), 0),
            "guarantor_count": _safe_int(summary.get("guarantor_count"), 0),
            "graph_score": str(summary.get("graph_score", "0.00")),
            "trust_volatility": str(summary.get("trust_volatility", "0.00")),
        },
    }


def build_user_liquidity_profile(db: Session, user_id: int) -> Dict[str, Any]:
    return _build_user_profile_internal(db, int(user_id), graph_cache={})


def build_clan_liquidity_snapshot(db: Session, clan_id: int) -> Dict[str, Any]:
    memberships = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .all()
    )

    graph_cache: Dict[int, Dict[str, Any]] = {}
    members: List[Dict[str, Any]] = []

    for membership in memberships:
        uid = _safe_int(getattr(membership, "user_id", None), 0)
        if uid <= 0:
            continue
        try:
            members.append(_build_user_profile_internal(db, uid, graph_cache=graph_cache))
        except ValueError:
            continue

    total_personal_pool = _q2(sum((_safe_decimal(m.get("personal_pool_balance")) for m in members), Decimal("0.00")))
    total_locked = _q2(sum((_safe_decimal(m.get("current_locked_guarantees")) for m in members), Decimal("0.00")))
    total_available = _q2(sum((_safe_decimal(m.get("available_guarantee_capacity")) for m in members), Decimal("0.00")))

    avg_cci = Decimal("0.00")
    if members:
        avg_cci = _q2(sum((_safe_decimal(m.get("cci_score")) for m in members), Decimal("0.00")) / Decimal(len(members)))

    risk_counts = {
        "low": len([m for m in members if str(m.get("risk_level")) == "low"]),
        "medium": len([m for m in members if str(m.get("risk_level")) == "medium"]),
        "high": len([m for m in members if str(m.get("risk_level")) == "high"]),
    }

    if total_personal_pool > Decimal("0"):
        exposure_ratio = _q2(total_locked / total_personal_pool)
    else:
        exposure_ratio = Decimal("1.00") if total_locked > Decimal("0") else Decimal("0.00")

    risk_flags: List[str] = []
    if exposure_ratio >= Decimal("0.80"):
        risk_flags.append("clan_overexposed")
    if risk_counts["high"] > 0:
        risk_flags.append("high_risk_members_present")
    if total_available <= Decimal("0"):
        risk_flags.append("no_available_guarantee_capacity")

    members_sorted = sorted(
        members,
        key=lambda m: (
            _safe_decimal(m.get("available_guarantee_capacity"), "0"),
            _safe_decimal(m.get("cci_score"), "0"),
        ),
        reverse=True,
    )

    return {
        "clan_id": int(clan_id),
        "member_count": len(members_sorted),
        "total_personal_pool_balance": str(total_personal_pool),
        "total_locked_guarantees": str(total_locked),
        "total_available_guarantee_capacity": str(total_available),
        "clan_exposure_ratio": str(_q2(exposure_ratio)),
        "average_cci_score": str(avg_cci),
        "risk_counts": risk_counts,
        "risk_flags": risk_flags,
        "members": members_sorted,
    }