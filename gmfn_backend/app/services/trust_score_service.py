# app/services/trust_score_service.py
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.core.constants import (
    BORROWER_FULL_REPAY_GAIN,
    GUARANTOR_SUCCESS_GAIN,
    MISSED_PAYMENT_PENALTY,
    DEFAULT_PENALTY,
    FRAUD_PENALTY,
    DEFAULT_WINDOW_DAYS,
    RECENCY_MIN_FACTOR,
    RECENCY_MAX_FACTOR,
    INACTIVITY_DECAY_START_DAYS,
    INACTIVITY_DECAY_PENALTY,
    INACTIVITY_DECAY_FLOOR,
)
from app.db.models import TrustEvent

# Canonical event types
EV_BORROWER_FULL_REPAID = "loan_fully_repaid"
EV_GUARANTOR_SUCCESS = "guarantor_success"
EV_MISSED_PAYMENT = "missed_payment"
EV_DEFAULT = "default"
EV_FRAUD_FLAG = "fraud_flag"

# Reversal event types (append-only corrections)
EV_BORROWER_FULL_REPAID_REV = "loan_fully_repaid_reversed"
EV_GUARANTOR_SUCCESS_REV = "guarantor_success_reversed"

_EVENT_ALIASES = {
    EV_BORROWER_FULL_REPAID: {"loan_fully_repaid", "loan_repaid", "repaid", "repayment_full", "full_repayment", "loan_repayment_completed"},
    EV_GUARANTOR_SUCCESS: {"guarantor_success", "guarantor_repayment_success", "guarantor_supported_repaid", "guarantor_credit"},
    EV_MISSED_PAYMENT: {"missed_payment", "repayment_missed", "late_payment", "overdue"},
    EV_DEFAULT: {"default", "loan_defaulted", "write_off", "chargeoff"},
    EV_FRAUD_FLAG: {"fraud_flag", "fraud", "abuse_flag", "ban"},
    EV_BORROWER_FULL_REPAID_REV: {"loan_fully_repaid_reversed"},
    EV_GUARANTOR_SUCCESS_REV: {"guarantor_success_reversed"},
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _q(x: Decimal, places: str = "0.01") -> Decimal:
    return x.quantize(Decimal(places), rounding=ROUND_HALF_UP)


def _normalize_event_type(event_type: str) -> str:
    et = (event_type or "").strip()
    if not et:
        return et
    for canonical, aliases in _EVENT_ALIASES.items():
        if et == canonical or et in aliases:
            return canonical
    return et


def humane_trust_level(score: Decimal) -> str:
    s = _d(score)
    if s < Decimal("0.50"):
        return "Starting 🌱"
    if s < Decimal("2.00"):
        return "Growing 🌿"
    if s < Decimal("6.00"):
        return "Strong 🌳"
    if s < Decimal("15.00"):
        return "Established 🛡️"
    return "Pillar 🏛️"


def trust_band_for_score(score: Union[Decimal, str, int]) -> str:
    s = _d(score)
    if s >= Decimal("15.00"):
        return "A"
    if s >= Decimal("6.00"):
        return "B"
    if s >= Decimal("2.00"):
        return "C"
    return "D"


def trust_enforcement_enabled(*_args: Any, **_kwargs: Any) -> bool:
    return False


def loan_policy_for_band(band: str) -> Dict[str, Any]:
    b = (band or "").strip().upper() or "D"
    if b == "A":
        min_guarantors, max_open_loans = 0, 3
    elif b == "B":
        min_guarantors, max_open_loans = 1, 2
    elif b == "C":
        min_guarantors, max_open_loans = 2, 1
    else:
        min_guarantors, max_open_loans = 2, 1
    return {
        "band": b,
        "min_guarantors": min_guarantors,
        "guarantors_required": min_guarantors,
        "max_open_loans": max_open_loans,
        "enforcement_enabled": False,
        "trust_enforcement_enabled": False,
        "note": "Conservative policy (MVP). Trust grows only on full repayment. Append-only reversals supported.",
    }


def recompute_trust_for_user(
    db: Session,
    *,
    user_id: int,
    window_days: int = DEFAULT_WINDOW_DAYS,
    as_of: Optional[datetime] = None,
) -> Dict[str, Any]:
    if as_of is None:
        as_of = _now_utc()
    if as_of.tzinfo is None:
        as_of = as_of.replace(tzinfo=timezone.utc)

    window_start = as_of - timedelta(days=int(window_days))

    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.asc())
        .all()
    )

    counts = {
        EV_BORROWER_FULL_REPAID: 0,
        EV_GUARANTOR_SUCCESS: 0,
        EV_MISSED_PAYMENT: 0,
        EV_DEFAULT: 0,
        EV_FRAUD_FLAG: 0,
        EV_BORROWER_FULL_REPAID_REV: 0,
        EV_GUARANTOR_SUCCESS_REV: 0,
    }

    total_repayments = 0
    recent_repayments = 0
    last_full_repayment_at: Optional[datetime] = None

    for r in rows:
        et = _normalize_event_type(getattr(r, "event_type", "") or "")
        if et not in counts:
            continue
        counts[et] += 1

        if et == EV_BORROWER_FULL_REPAID:
            total_repayments += 1
            created_at = getattr(r, "created_at", None)
            if isinstance(created_at, datetime):
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                if last_full_repayment_at is None or created_at > last_full_repayment_at:
                    last_full_repayment_at = created_at
                if created_at >= window_start:
                    recent_repayments += 1

    full_repayments = counts[EV_BORROWER_FULL_REPAID]
    guarantor_success = counts[EV_GUARANTOR_SUCCESS]
    missed_payments = counts[EV_MISSED_PAYMENT]
    defaults = counts[EV_DEFAULT]
    fraud_flags = counts[EV_FRAUD_FLAG]
    full_repayments_rev = counts[EV_BORROWER_FULL_REPAID_REV]
    guarantor_success_rev = counts[EV_GUARANTOR_SUCCESS_REV]

    gain_borrower = BORROWER_FULL_REPAY_GAIN * _d(full_repayments)
    gain_guarantor = GUARANTOR_SUCCESS_GAIN * _d(guarantor_success)
    rev_borrower = BORROWER_FULL_REPAY_GAIN * _d(full_repayments_rev)
    rev_guarantor = GUARANTOR_SUCCESS_GAIN * _d(guarantor_success_rev)

    penalty_missed = MISSED_PAYMENT_PENALTY * _d(missed_payments)
    penalty_default = DEFAULT_PENALTY * _d(defaults)
    penalty_fraud = FRAUD_PENALTY * _d(fraud_flags)

    total_gains = (gain_borrower + gain_guarantor) - (rev_borrower + rev_guarantor)
    total_penalties = penalty_missed + penalty_default + penalty_fraud

    lifetime = total_gains - total_penalties

    denom = max(1, total_repayments)
    ratio = _d(recent_repayments) / _d(denom)
    recency_factor = RECENCY_MIN_FACTOR + (RECENCY_MAX_FACTOR - RECENCY_MIN_FACTOR) * ratio

    inactivity_decay_applied = False
    days_since_last: Optional[int] = None
    if last_full_repayment_at is not None:
        delta_days = (as_of - last_full_repayment_at).days
        days_since_last = int(delta_days if delta_days >= 0 else 0)
        if days_since_last >= INACTIVITY_DECAY_START_DAYS:
            recency_factor = recency_factor - INACTIVITY_DECAY_PENALTY
            if recency_factor < INACTIVITY_DECAY_FLOOR:
                recency_factor = INACTIVITY_DECAY_FLOOR
            inactivity_decay_applied = True

    standing = lifetime * recency_factor
    band = trust_band_for_score(standing)

    return {
        "user_id": int(user_id),
        "lifetime_trust": str(_q(lifetime)),
        "standing_score": str(_q(standing)),
        "recency_factor": str(_q(recency_factor)),
        "band": band,
        "level_label": humane_trust_level(standing),
        "last_full_repayment_at": last_full_repayment_at.isoformat() if last_full_repayment_at else None,
        "days_since_last_full_repayment": days_since_last,
        "inactivity_decay_applied": inactivity_decay_applied,
        "counts": {
            "full_repayments": full_repayments,
            "guarantor_success": guarantor_success,
            "missed_payments": missed_payments,
            "defaults": defaults,
            "fraud_flags": fraud_flags,
            "full_repayments_reversed": full_repayments_rev,
            "guarantor_success_reversed": guarantor_success_rev,
        },
        "gains": {
            "borrower": str(_q(gain_borrower)),
            "guarantor": str(_q(gain_guarantor)),
            "reversals": str(_q(rev_borrower + rev_guarantor)),
            "total": str(_q(total_gains)),
        },
        "penalties": {
            "missed": str(_q(penalty_missed)),
            "default": str(_q(penalty_default)),
            "fraud": str(_q(penalty_fraud)),
            "total": str(_q(total_penalties)),
        },
        "policy": loan_policy_for_band(band),
    }


# Legacy wrappers
def get_trust_summary(db: Session, *, user_id: int, window_days: int = DEFAULT_WINDOW_DAYS) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id), window_days=window_days)


def compute_trust_breakdown(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def compute_trust_score_explained(db: Session, user_id: int) -> Dict[str, Any]:
    out = recompute_trust_for_user(db, user_id=int(user_id))
    out["explanation"] = (
        "Your reputation grows slowly when you fully repay loans. "
        "If a repayment is corrected later, a reversal event is logged (append-only)."
    )
    return out


def apply_trust_score(db: Session, user_id: int, *args: Any, **kwargs: Any) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def recompute_trust_for_user_id(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def recompute_trust_score(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def compute_trust_score(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def calculate_trust_score(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))