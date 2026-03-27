from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent
from app.services.trust_band_service import compute_trust_band

BORROWER_REPAYMENT_DELTA = Decimal("0.10")
GUARANTOR_REPAYMENT_DELTA = Decimal("0.03")
TRUST_Q = Decimal("0.0001")


def _qd(x: Decimal) -> Decimal:
    return x.quantize(TRUST_Q, rounding=ROUND_HALF_UP)


def _safe_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        value = json.loads(meta_json)
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def _score_to_user_int(score: Decimal) -> int:
    return int(score.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


@dataclass(frozen=True)
class TrustRecomputeResult:
    user_id: int
    score: str
    band: str
    breakdown: dict[str, Any]
    event_count: int
    last_event_id: Optional[int]


def recompute_trust_for_user(
    db: Session,
    *,
    user_id: int,
    limit: Optional[int] = None,
) -> TrustRecomputeResult:
    q = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.id.asc())
    )

    if limit is not None:
        safe_limit = max(1, min(int(limit), 50000))
        q = q.limit(safe_limit)

    rows = q.all()

    score = Decimal("0")
    counts: dict[str, int] = {}
    delta_by_type: dict[str, str] = {}

    for ev in rows:
        et = (ev.event_type or "").strip()
        counts[et] = counts.get(et, 0) + 1

        meta = _safe_meta(getattr(ev, "meta_json", None))
        role = str(meta.get("role") or "").strip().lower()

        delta = Decimal("0")
        et_lower = et.lower()

        if role == "borrower":
            if "repay" in et_lower:
                delta = BORROWER_REPAYMENT_DELTA
        elif role == "guarantor":
            if "repay" in et_lower:
                delta = GUARANTOR_REPAYMENT_DELTA
        else:
            if "repay" in et_lower:
                if "guarantor" in et_lower:
                    delta = GUARANTOR_REPAYMENT_DELTA
                else:
                    delta = BORROWER_REPAYMENT_DELTA

        if delta != Decimal("0"):
            score = _qd(score + delta)
            current_total = Decimal(delta_by_type.get(et, "0"))
            delta_by_type[et] = str(_qd(current_total + delta))

    last_event_id = rows[-1].id if rows else None
    final_score = _qd(score)
    band = compute_trust_band(final_score)

    breakdown = {
        "ruleset": {
            "borrower_repayment_delta": str(BORROWER_REPAYMENT_DELTA),
            "guarantor_repayment_delta": str(GUARANTOR_REPAYMENT_DELTA),
            "precision": str(TRUST_Q),
            "ordering": "TrustEvent.id ASC",
        },
        "counts_by_event_type": counts,
        "delta_by_event_type": delta_by_type,
        "last_event_id_used": last_event_id,
        "event_count_used": len(rows),
        "computed_band": band,
        "computed_score": str(final_score),
        "computed_score_int": _score_to_user_int(final_score),
    }

    return TrustRecomputeResult(
        user_id=int(user_id),
        score=str(final_score),
        band=band,
        breakdown=breakdown,
        event_count=len(rows),
        last_event_id=last_event_id,
    )


def _safe_json_dict(s: Optional[str]) -> dict[str, Any]:
    if not s:
        return {}
    try:
        value = json.loads(s)
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def apply_recomputed_trust_for_user(
    db: Session,
    *,
    user_id: int,
    limit: Optional[int] = None,
    dry_run: bool = False,
    set_updated_at: bool = True,
    force: bool = False,
) -> dict[str, Any]:
    """
    Apply recomputed trust to user row.

    Idempotent when no new events:
    - if stored breakdown has same last_event_id_used + event_count_used,
      it is a NO-OP unless force=True.
    """
    from app.db.models import User  # lazy import

    result = recompute_trust_for_user(
        db,
        user_id=int(user_id),
        limit=limit,
    )

    user = db.get(User, int(user_id))
    if not user:
        raise LookupError("User not found")

    existing_breakdown = _safe_json_dict(getattr(user, "trust_breakdown_json", None))
    existing_last = existing_breakdown.get("last_event_id_used")
    existing_count = existing_breakdown.get("event_count_used")

    is_same_inputs = (
        existing_last == result.last_event_id
        and existing_count == result.event_count
    )

    before = {
        "trust_score": (
            str(getattr(user, "trust_score", None))
            if getattr(user, "trust_score", None) is not None
            else None
        ),
        "trust_band": getattr(user, "trust_band", None),
        "trust_score_updated_at": getattr(user, "trust_score_updated_at", None),
        "last_event_id_used": existing_last,
        "event_count_used": existing_count,
    }

    if (not dry_run) and (not force) and is_same_inputs:
        return {
            "user_id": result.user_id,
            "computed": {
                "score": result.score,
                "band": result.band,
                "event_count": result.event_count,
                "last_event_id": result.last_event_id,
                "breakdown": result.breakdown,
            },
            "noop": True,
            "applied": False,
            "before": before,
            "after": before,
        }

    new_score_dec = Decimal(result.score)
    new_score_int = _score_to_user_int(new_score_dec)
    new_breakdown_json = json.dumps(
        result.breakdown,
        separators=(",", ":"),
        ensure_ascii=True,
    )

    if not dry_run:
        user.trust_score = new_score_int
        user.trust_band = result.band
        user.trust_breakdown_json = new_breakdown_json
        if set_updated_at:
            user.trust_score_updated_at = datetime.now(timezone.utc)
        db.add(user)
        db.commit()
        db.refresh(user)

    after = {
        "trust_score": str(new_score_int),
        "trust_band": result.band,
        "trust_score_updated_at": (
            getattr(user, "trust_score_updated_at", None) if not dry_run else None
        ),
        "last_event_id_used": result.last_event_id,
        "event_count_used": result.event_count,
    }

    return {
        "user_id": result.user_id,
        "computed": {
            "score": result.score,
            "score_int": new_score_int,
            "band": result.band,
            "event_count": result.event_count,
            "last_event_id": result.last_event_id,
            "breakdown": result.breakdown,
        },
        "noop": False,
        "applied": (not dry_run),
        "before": before,
        "after": after,
    }