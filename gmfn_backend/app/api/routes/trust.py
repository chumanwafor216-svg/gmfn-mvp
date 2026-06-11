from __future__ import annotations

import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.trust_policy import (
    infer_delta_str,
    policy_version,
    rule_kind,
    rule_label,
)
from app.db.database import get_db
from app.db.models import TrustEvent, User
from app.services.trust_score_service import apply_trust_score, compute_trust_breakdown

router = APIRouter(prefix="/trust", tags=["trust"])


def _safe_meta(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            v = json.loads(raw)
            return v if isinstance(v, dict) else {}
        except Exception:
            return {}
    return {}


@router.get("/score/explained")
def get_my_trust_score_explained(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Friendly, explainable trust score.
    Trust increases only when a loan is fully repaid.
    """
    apply_trust_score(db, user_id=int(current_user.id))
    return compute_trust_breakdown(db, user_id=int(current_user.id))


@router.get("/me/latest-source")
def trust_latest_source(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Minimal latest-source endpoint.
    """
    return {
        "event_type": "REPAYMENT_ONLY_POLICY",
        "note": "Trust increases only when a loan is fully repaid.",
    }


@router.get("/me")
def trust_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Single trust snapshot endpoint.
    Returns current trust snapshot + last change in one payload.
    Must never crash.
    """
    uid = int(current_user.id)

    apply_trust_score(db, user_id=uid)
    breakdown = compute_trust_breakdown(db, user_id=uid)

    last: Optional[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == uid)
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .first()
    )

    last_change: Dict[str, Any] = {
        "event_type": None,
        "delta": None,
        "reason": None,
        "note": None,
        "clan_id": None,
        "loan_id": None,
        "created_at": None,
        "rule_label": None,
        "rule_kind": None,
        "policy_version": policy_version(),
    }

    if last is not None:
        meta = _safe_meta(getattr(last, "meta", None) or getattr(last, "meta_json", None))
        et = getattr(last, "event_type", None) or ""
        last_change = {
            "event_type": getattr(last, "event_type", None),
            "delta": infer_delta_str(et),
            "reason": meta.get("reason"),
            "note": meta.get("note"),
            "clan_id": getattr(last, "clan_id", None),
            "loan_id": getattr(last, "loan_id", None),
            "created_at": getattr(last, "created_at", None),
            "rule_label": rule_label(et),
            "rule_kind": rule_kind(et),
            "policy_version": policy_version(),
        }

    try:
        event_count = int(
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == uid)
            .count()
        )
    except Exception:
        event_count = None

    try:
        invite_join_events = int(
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == uid)
            .filter(TrustEvent.event_type == "invite_join")
            .count()
        )
    except Exception:
        invite_join_events = None

    identity_conf = {
        "event_count": event_count,
        "account_age_days": None,
        "invite_join_events": invite_join_events,
    }

    score_value = (
        breakdown.get("standing_score")
        or breakdown.get("score")
        or breakdown.get("trust_score")
        or "0.00"
    )
    band_value = breakdown.get("band")

    return {
        "user_id": uid,
        "email": getattr(current_user, "email", None),
        "trust_score": str(score_value),
        "trust_band": band_value,
        "computed": breakdown,
        "last_change": last_change,
        "policy_note": "Trust is rule-based and increases only when a loan is fully repaid.",
        "trust_policy_version": policy_version(),
        "identity_confidence": identity_conf,
    }
