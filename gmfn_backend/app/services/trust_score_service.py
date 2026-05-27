from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.core.constants import (
    BORROWER_FULL_REPAY_GAIN,
    DEFAULT_PENALTY,
    DEFAULT_WINDOW_DAYS,
    FRAUD_PENALTY,
    GUARANTOR_SUCCESS_GAIN,
    IDENTITY_BANK_RECORDED_GAIN,
    IDENTITY_DRIVERS_LICENCE_GAIN,
    IDENTITY_PHOTO_VERIFIED_GAIN,
    IDENTITY_PHONE_VERIFIED_GAIN,
    IDENTITY_REGION_CONSISTENT_GAIN,
    INACTIVITY_DECAY_FLOOR,
    INACTIVITY_DECAY_PENALTY,
    INACTIVITY_DECAY_START_DAYS,
    MISSED_PAYMENT_PENALTY,
    RECENCY_MAX_FACTOR,
    RECENCY_MIN_FACTOR,
)
from app.db.models import TrustEvent, User

# Canonical event types
EV_BORROWER_FULL_REPAID = "loan_fully_repaid"
EV_GUARANTOR_SUCCESS = "guarantor_success"
EV_MISSED_PAYMENT = "missed_payment"
EV_DEFAULT = "default"
EV_FRAUD_FLAG = "fraud_flag"
EV_IDENTITY_PHONE_VERIFIED = "identity.phone_verified"
EV_IDENTITY_BANK_RECORDED = "identity.bank_destination_recorded"
EV_IDENTITY_DRIVERS_LICENCE = "identity.drivers_licence_recorded"
EV_IDENTITY_PHOTO_RECORDED = "identity.photo_evidence_recorded"
EV_IDENTITY_PHOTO_VERIFIED = "identity.photo_evidence_verified"
EV_IDENTITY_PHOTO_VERIFIED_REV = "identity.photo_evidence_verified_reversed"
EV_IDENTITY_PHOTO_REJECTED = "identity.photo_evidence_rejected"
EV_IDENTITY_PHOTO_NEEDS_MORE = "identity.photo_evidence_needs_more"
EV_IDENTITY_PHOTO_REVIEW_CORRECTED = "identity.photo_evidence_review_corrected"
EV_IDENTITY_REGION_CONSISTENT = "identity.region_consistent"
EV_IDENTITY_REGION_MISMATCH_EXPLAINED = "identity.region_mismatch_explained"
EV_COMMUNITY_CONFIRMATION_REVIEW_RESOLVED = "community_confirmation.review_case_resolved"

# Reversal event types (append-only corrections)
EV_BORROWER_FULL_REPAID_REV = "loan_fully_repaid_reversed"
EV_GUARANTOR_SUCCESS_REV = "guarantor_success_reversed"

_EVENT_ALIASES = {
    EV_BORROWER_FULL_REPAID: {
        "loan_fully_repaid",
        "loan.repaid",
        "loan_repaid",
        "repaid",
        "repayment_full",
        "full_repayment",
        "loan_repayment_completed",
    },
    EV_GUARANTOR_SUCCESS: {
        "guarantor_success",
        "guarantor_repayment_success",
        "guarantor_supported_repaid",
        "guarantor_credit",
    },
    EV_MISSED_PAYMENT: {
        "missed_payment",
        "repayment_missed",
        "late_payment",
        "overdue",
    },
    EV_DEFAULT: {
        "default",
        "loan_defaulted",
        "write_off",
        "chargeoff",
    },
    EV_FRAUD_FLAG: {
        "fraud_flag",
        "fraud",
        "abuse_flag",
        "ban",
    },
    EV_IDENTITY_PHONE_VERIFIED: {
        "identity.phone_verified",
    },
    EV_IDENTITY_BANK_RECORDED: {
        "identity.bank_destination_recorded",
    },
    EV_IDENTITY_DRIVERS_LICENCE: {
        "identity.drivers_licence_recorded",
    },
    EV_IDENTITY_PHOTO_RECORDED: {
        "identity.photo_evidence_recorded",
    },
    EV_IDENTITY_PHOTO_VERIFIED: {
        "identity.photo_evidence_verified",
    },
    EV_IDENTITY_PHOTO_VERIFIED_REV: {
        "identity.photo_evidence_verified_reversed",
    },
    EV_IDENTITY_PHOTO_REJECTED: {
        "identity.photo_evidence_rejected",
    },
    EV_IDENTITY_PHOTO_NEEDS_MORE: {
        "identity.photo_evidence_needs_more",
    },
    EV_IDENTITY_PHOTO_REVIEW_CORRECTED: {
        "identity.photo_evidence_review_corrected",
    },
    EV_IDENTITY_REGION_CONSISTENT: {
        "identity.region_consistent",
    },
    EV_IDENTITY_REGION_MISMATCH_EXPLAINED: {
        "identity.region_mismatch_explained",
    },
    EV_BORROWER_FULL_REPAID_REV: {
        "loan_fully_repaid_reversed",
    },
    EV_GUARANTOR_SUCCESS_REV: {
        "guarantor_success_reversed",
    },
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


def _i(x: Decimal) -> int:
    return int(x.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _normalize_event_type(event_type: str) -> str:
    et = (event_type or "").strip().lower()
    if not et:
        return et
    for canonical, aliases in _EVENT_ALIASES.items():
        if et == canonical or et in aliases:
            return canonical
    return et


def _safe_event_meta(row: TrustEvent) -> Dict[str, Any]:
    raw = getattr(row, "meta", None) or getattr(row, "meta_json", None)
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _explicit_trust_delta(meta: Dict[str, Any]) -> Decimal:
    raw = (
        meta.get("trust_delta")
        or meta.get("delta")
        or meta.get("score_delta")
        or meta.get("points_delta")
    )
    if raw in (None, ""):
        return Decimal("0")
    try:
        return Decimal(str(raw))
    except Exception:
        return Decimal("0")


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
        "note": (
            "Conservative policy (MVP). Trust grows only on full repayment. "
            "Append-only reversals supported."
        ),
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
        .order_by(TrustEvent.created_at.asc(), TrustEvent.id.asc())
        .all()
    )

    counts = {
        EV_BORROWER_FULL_REPAID: 0,
        EV_GUARANTOR_SUCCESS: 0,
        EV_MISSED_PAYMENT: 0,
        EV_DEFAULT: 0,
        EV_FRAUD_FLAG: 0,
        EV_IDENTITY_PHONE_VERIFIED: 0,
        EV_IDENTITY_BANK_RECORDED: 0,
        EV_IDENTITY_DRIVERS_LICENCE: 0,
        EV_IDENTITY_PHOTO_RECORDED: 0,
        EV_IDENTITY_PHOTO_VERIFIED: 0,
        EV_IDENTITY_PHOTO_VERIFIED_REV: 0,
        EV_IDENTITY_PHOTO_REJECTED: 0,
        EV_IDENTITY_PHOTO_NEEDS_MORE: 0,
        EV_IDENTITY_PHOTO_REVIEW_CORRECTED: 0,
        EV_IDENTITY_REGION_CONSISTENT: 0,
        EV_IDENTITY_REGION_MISMATCH_EXPLAINED: 0,
        EV_COMMUNITY_CONFIRMATION_REVIEW_RESOLVED: 0,
        EV_BORROWER_FULL_REPAID_REV: 0,
        EV_GUARANTOR_SUCCESS_REV: 0,
    }

    total_repayments = 0
    recent_repayments = 0
    last_full_repayment_at: Optional[datetime] = None
    review_delta_total = Decimal("0")
    review_positive = 0
    review_caution = 0
    review_negative = 0
    photo_review_state_by_check: Dict[int, str] = {}

    for row in rows:
        et = _normalize_event_type(getattr(row, "event_type", "") or "")
        if et not in counts:
            continue

        counts[et] += 1
        if et in {
            EV_IDENTITY_PHOTO_VERIFIED,
            EV_IDENTITY_PHOTO_VERIFIED_REV,
            EV_IDENTITY_PHOTO_REJECTED,
            EV_IDENTITY_PHOTO_NEEDS_MORE,
            EV_IDENTITY_PHOTO_REVIEW_CORRECTED,
        }:
            meta = _safe_event_meta(row)
            try:
                check_id = int(meta.get("verification_check_id") or 0)
            except Exception:
                check_id = 0
            if check_id > 0:
                if et == EV_IDENTITY_PHOTO_VERIFIED:
                    photo_review_state_by_check[check_id] = "verify"
                elif et == EV_IDENTITY_PHOTO_REJECTED:
                    photo_review_state_by_check[check_id] = "reject"
                elif et == EV_IDENTITY_PHOTO_NEEDS_MORE:
                    photo_review_state_by_check[check_id] = "needs_more"
                elif et in {EV_IDENTITY_PHOTO_VERIFIED_REV, EV_IDENTITY_PHOTO_REVIEW_CORRECTED}:
                    photo_review_state_by_check[check_id] = "reopened"

        if et == EV_COMMUNITY_CONFIRMATION_REVIEW_RESOLVED:
            meta = _safe_event_meta(row)
            if meta.get("affects_trust_reading") is True:
                review_delta_total += _explicit_trust_delta(meta)
                impact = str(meta.get("trust_impact") or "").strip().lower()
                if impact == "positive":
                    review_positive += 1
                elif impact == "caution":
                    review_caution += 1
                elif impact == "negative":
                    review_negative += 1
            continue

        if et == EV_BORROWER_FULL_REPAID:
            total_repayments += 1
            created_at = getattr(row, "created_at", None)

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
    identity_phone_verified = counts[EV_IDENTITY_PHONE_VERIFIED]
    identity_bank_recorded = counts[EV_IDENTITY_BANK_RECORDED]
    identity_drivers_licence = counts[EV_IDENTITY_DRIVERS_LICENCE]
    identity_photo_recorded = counts[EV_IDENTITY_PHOTO_RECORDED]
    identity_photo_verified = counts[EV_IDENTITY_PHOTO_VERIFIED]
    identity_photo_verified_rev = counts[EV_IDENTITY_PHOTO_VERIFIED_REV]
    identity_photo_rejected = counts[EV_IDENTITY_PHOTO_REJECTED]
    identity_photo_needs_more = counts[EV_IDENTITY_PHOTO_NEEDS_MORE]
    identity_photo_review_corrected = counts[EV_IDENTITY_PHOTO_REVIEW_CORRECTED]
    identity_region_consistent = counts[EV_IDENTITY_REGION_CONSISTENT]
    identity_region_mismatch_explained = counts[EV_IDENTITY_REGION_MISMATCH_EXPLAINED]
    full_repayments_rev = counts[EV_BORROWER_FULL_REPAID_REV]
    guarantor_success_rev = counts[EV_GUARANTOR_SUCCESS_REV]

    gain_borrower = BORROWER_FULL_REPAY_GAIN * _d(full_repayments)
    gain_guarantor = GUARANTOR_SUCCESS_GAIN * _d(guarantor_success)
    gain_identity_phone = IDENTITY_PHONE_VERIFIED_GAIN * _d(identity_phone_verified)
    gain_identity_bank = IDENTITY_BANK_RECORDED_GAIN * _d(identity_bank_recorded)
    gain_identity_licence = IDENTITY_DRIVERS_LICENCE_GAIN * _d(identity_drivers_licence)
    if photo_review_state_by_check:
        active_identity_photo_verified = sum(
            1 for state in photo_review_state_by_check.values() if state == "verify"
        )
        active_identity_photo_rejected = sum(
            1 for state in photo_review_state_by_check.values() if state == "reject"
        )
        active_identity_photo_needs_more = sum(
            1 for state in photo_review_state_by_check.values() if state == "needs_more"
        )
    else:
        active_identity_photo_verified = max(
            0, identity_photo_verified - identity_photo_verified_rev
        )
        active_identity_photo_rejected = identity_photo_rejected
        active_identity_photo_needs_more = identity_photo_needs_more
    identity_photo_verified_net = min(1, active_identity_photo_verified)
    gain_identity_photo = IDENTITY_PHOTO_VERIFIED_GAIN * _d(identity_photo_verified_net)
    gain_identity_region = IDENTITY_REGION_CONSISTENT_GAIN * _d(identity_region_consistent)
    rev_borrower = BORROWER_FULL_REPAY_GAIN * _d(full_repayments_rev)
    rev_guarantor = GUARANTOR_SUCCESS_GAIN * _d(guarantor_success_rev)
    gain_review = review_delta_total if review_delta_total > 0 else Decimal("0")

    penalty_missed = MISSED_PAYMENT_PENALTY * _d(missed_payments)
    penalty_default = DEFAULT_PENALTY * _d(defaults)
    penalty_fraud = FRAUD_PENALTY * _d(fraud_flags)
    penalty_review = abs(review_delta_total) if review_delta_total < 0 else Decimal("0")

    total_gains = (
        gain_borrower
        + gain_guarantor
        + gain_identity_phone
        + gain_identity_bank
        + gain_identity_licence
        + gain_identity_photo
        + gain_identity_region
        + gain_review
    ) - (rev_borrower + rev_guarantor)
    total_penalties = penalty_missed + penalty_default + penalty_fraud + penalty_review
    lifetime = total_gains - total_penalties

    denom = max(1, total_repayments)
    ratio = _d(recent_repayments) / _d(denom)
    recency_factor = RECENCY_MIN_FACTOR + (RECENCY_MAX_FACTOR - RECENCY_MIN_FACTOR) * ratio

    inactivity_decay_applied = False
    days_since_last: Optional[int] = None
    latest_reason = "Trust status is not ready yet"
    latest_source = "Trust ledger"

    if last_full_repayment_at is not None:
        delta_days = (as_of - last_full_repayment_at).days
        days_since_last = int(delta_days if delta_days >= 0 else 0)
        latest_reason = "Recent full repayment supports your trust standing"
        latest_source = EV_BORROWER_FULL_REPAID

        if days_since_last >= INACTIVITY_DECAY_START_DAYS:
            recency_factor = recency_factor - INACTIVITY_DECAY_PENALTY
            if recency_factor < INACTIVITY_DECAY_FLOOR:
                recency_factor = INACTIVITY_DECAY_FLOOR
            inactivity_decay_applied = True
            latest_reason = "Trust standing softened because of inactivity after repayment"
            latest_source = "inactivity_decay"

    if fraud_flags > 0:
        latest_reason = "Fraud or abuse flags reduced trust standing"
        latest_source = EV_FRAUD_FLAG
    elif defaults > 0:
        latest_reason = "Loan default reduced trust standing"
        latest_source = EV_DEFAULT
    elif missed_payments > 0:
        latest_reason = "Missed payment reduced trust standing"
        latest_source = EV_MISSED_PAYMENT
    elif review_negative > 0:
        latest_reason = "A resolved community confirmation review created trust pressure"
        latest_source = EV_COMMUNITY_CONFIRMATION_REVIEW_RESOLVED
    elif review_caution > 0:
        latest_reason = "A resolved community confirmation review added caution to the trust reading"
        latest_source = EV_COMMUNITY_CONFIRMATION_REVIEW_RESOLVED
    elif identity_photo_verified_rev > 0 and identity_photo_verified_net <= 0:
        latest_reason = "A previous photo/selfie acceptance was corrected and reopened for review"
        latest_source = EV_IDENTITY_PHOTO_VERIFIED_REV
    elif active_identity_photo_rejected > 0:
        latest_reason = "Photo/selfie evidence was reviewed and could not be accepted yet"
        latest_source = EV_IDENTITY_PHOTO_REJECTED
    elif identity_bank_recorded > 0:
        latest_reason = "Verified onboarding proofs established your starter trust standing"
        latest_source = EV_IDENTITY_BANK_RECORDED
    elif identity_region_consistent > 0:
        latest_reason = "Region consistency between onboarding proofs strengthened your starter trust standing"
        latest_source = EV_IDENTITY_REGION_CONSISTENT
    elif identity_region_mismatch_explained > 0:
        latest_reason = "A cross-region onboarding explanation was recorded for trust review"
        latest_source = EV_IDENTITY_REGION_MISMATCH_EXPLAINED
    elif identity_photo_verified_net > 0:
        latest_reason = "Photo/selfie evidence was reviewed and accepted for identity continuity"
        latest_source = EV_IDENTITY_PHOTO_VERIFIED
    elif active_identity_photo_needs_more > 0:
        latest_reason = "Photo/selfie evidence needs a clearer manual review before it can support trust"
        latest_source = EV_IDENTITY_PHOTO_NEEDS_MORE
    elif identity_photo_recorded > 0:
        latest_reason = "Photo/selfie evidence was recorded for identity continuity"
        latest_source = EV_IDENTITY_PHOTO_RECORDED
    elif identity_phone_verified > 0:
        latest_reason = "Verified phone established a starter trust standing"
        latest_source = EV_IDENTITY_PHONE_VERIFIED
    elif guarantor_success > 0 and full_repayments == 0:
        latest_reason = "Successful guarantor support strengthened trust standing"
        latest_source = EV_GUARANTOR_SUCCESS
    elif review_positive > 0:
        latest_reason = "A resolved community confirmation review supported the trust reading"
        latest_source = EV_COMMUNITY_CONFIRMATION_REVIEW_RESOLVED

    standing = lifetime * recency_factor
    standing_q = _q(standing)
    lifetime_q = _q(lifetime)
    recency_q = _q(recency_factor)

    band = trust_band_for_score(standing_q)
    level_label = humane_trust_level(standing_q)
    score_int = _i(standing_q)

    breakdown = {
        "user_id": int(user_id),
        "lifetime_trust": str(lifetime_q),
        "standing_score": str(standing_q),
        "score": str(standing_q),
        "trust_score": str(standing_q),
        "recency_factor": str(recency_q),
        "band": band,
        "trust_band": band,
        "level_label": level_label,
        "latest_reason": latest_reason,
        "latest_source": latest_source,
        "last_full_repayment_at": (
            last_full_repayment_at.isoformat() if last_full_repayment_at else None
        ),
        "days_since_last_full_repayment": days_since_last,
        "inactivity_decay_applied": inactivity_decay_applied,
        "counts": {
            "full_repayments": full_repayments,
            "guarantor_success": guarantor_success,
            "missed_payments": missed_payments,
            "defaults": defaults,
            "fraud_flags": fraud_flags,
            "identity_phone_verified": identity_phone_verified,
            "identity_bank_recorded": identity_bank_recorded,
            "identity_drivers_licence": identity_drivers_licence,
            "identity_photo_recorded": identity_photo_recorded,
            "identity_photo_verified": identity_photo_verified,
            "identity_photo_verified_reversed": identity_photo_verified_rev,
            "identity_photo_verified_net": identity_photo_verified_net,
            "identity_photo_verified_active": active_identity_photo_verified,
            "identity_photo_rejected": identity_photo_rejected,
            "identity_photo_rejected_active": active_identity_photo_rejected,
            "identity_photo_needs_more": identity_photo_needs_more,
            "identity_photo_needs_more_active": active_identity_photo_needs_more,
            "identity_photo_review_corrected": identity_photo_review_corrected,
            "identity_region_consistent": identity_region_consistent,
            "identity_region_mismatch_explained": identity_region_mismatch_explained,
            "community_confirmation_reviews_resolved": counts[
                EV_COMMUNITY_CONFIRMATION_REVIEW_RESOLVED
            ],
            "community_confirmation_review_positive": review_positive,
            "community_confirmation_review_caution": review_caution,
            "community_confirmation_review_negative": review_negative,
            "full_repayments_reversed": full_repayments_rev,
            "guarantor_success_reversed": guarantor_success_rev,
        },
        "gains": {
            "borrower": str(_q(gain_borrower)),
            "guarantor": str(_q(gain_guarantor)),
            "identity_phone": str(_q(gain_identity_phone)),
            "identity_bank": str(_q(gain_identity_bank)),
            "identity_drivers_licence": str(_q(gain_identity_licence)),
            "identity_photo": str(_q(gain_identity_photo)),
            "identity_region": str(_q(gain_identity_region)),
            "community_confirmation_review": str(_q(gain_review)),
            "reversals": str(_q(rev_borrower + rev_guarantor)),
            "total": str(_q(total_gains)),
        },
        "penalties": {
            "missed": str(_q(penalty_missed)),
            "default": str(_q(penalty_default)),
            "fraud": str(_q(penalty_fraud)),
            "community_confirmation_review": str(_q(penalty_review)),
            "total": str(_q(total_penalties)),
        },
        "policy": loan_policy_for_band(band),
        "score_int": score_int,
        "starter_proof_summary": {
            "phone_verified": identity_phone_verified > 0,
            "bank_recorded": identity_bank_recorded > 0,
            "drivers_licence_recorded": identity_drivers_licence > 0,
            "photo_evidence_recorded": identity_photo_recorded > 0,
            "photo_evidence_verified": identity_photo_verified_net > 0,
            "photo_evidence_needs_more": active_identity_photo_needs_more > 0,
            "photo_evidence_rejected": active_identity_photo_rejected > 0,
            "photo_evidence_verified_reversed": identity_photo_verified_rev > 0,
            "region_consistent": identity_region_consistent > 0,
            "region_mismatch_explained": identity_region_mismatch_explained > 0,
        },
    }

    return breakdown


def get_trust_summary(
    db: Session,
    *,
    user_id: int,
    window_days: int = DEFAULT_WINDOW_DAYS,
) -> Dict[str, Any]:
    return recompute_trust_for_user(
        db,
        user_id=int(user_id),
        window_days=window_days,
    )


def compute_trust_breakdown(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def compute_trust_score_explained(db: Session, user_id: int) -> Dict[str, Any]:
    out = recompute_trust_for_user(db, user_id=int(user_id))
    out["explanation"] = (
        "Your trust standing grows slowly when you fully repay loans. "
        "Starter identity proofs can establish an initial base. "
        "Resolved community confirmation reviews can add small support or caution. "
        "If a repayment is corrected later, a reversal event is logged and the "
        "score is recomputed from the trust ledger."
    )
    return out


def apply_trust_score(
    db: Session,
    user_id: int,
    *args: Any,
    **kwargs: Any,
) -> Dict[str, Any]:
    out = recompute_trust_for_user(db, user_id=int(user_id))

    user = db.get(User, int(user_id))
    if user is None:
        return out

    user.trust_score = int(out["score_int"])
    user.trust_band = str(out["trust_band"])
    user.trust_breakdown_json = json.dumps(out)
    user.trust_score_updated_at = _now_utc()

    db.add(user)
    db.commit()
    db.refresh(user)

    out["applied"] = True
    out["user_row"] = {
        "user_id": int(user.id),
        "trust_score": int(user.trust_score),
        "trust_band": user.trust_band,
        "trust_score_updated_at": (
            user.trust_score_updated_at.isoformat()
            if user.trust_score_updated_at
            else None
        ),
    }
    return out


def recompute_trust_for_user_id(
    db: Session,
    user_id: int,
    *args: Any,
    **kwargs: Any,
) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def recompute_trust_score(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def compute_trust_score(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))


def calculate_trust_score(db: Session, user_id: int) -> Dict[str, Any]:
    return recompute_trust_for_user(db, user_id=int(user_id))
