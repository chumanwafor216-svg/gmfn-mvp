# app/services/cci_service.py
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import TrustEvent


@dataclass
class CciResult:
    clan_id: int
    user_id: int
    score: int
    events_counted: int
    breakdown: Dict[str, int]


# Simple MVP weights. Tune later.
EVENT_WEIGHTS: Dict[str, int] = {
    "GUARANTOR_APPROVED": 5,
    "GUARANTOR_DECLINED": -2,
    "LOAN_AUTO_APPROVED": 3,
    "LOAN_AUTO_REJECTED": -3,
    "GUARANTEE_LOCKS_RELEASED": 1,
    "ADMIN_POOL_TOPUP": 0,
}


def _clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def compute_cci_score(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
) -> CciResult:
    """
    MVP trust score per user per clan based on TrustEvents where subject_user_id == user_id.
    Score range: 0..100
    """
    rows = (
        db.query(TrustEvent.event_type, func.count(TrustEvent.id))
        .filter(TrustEvent.clan_id == clan_id)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .group_by(TrustEvent.event_type)
        .all()
    )

    breakdown: Dict[str, int] = {k: int(v) for (k, v) in rows}
    total_events = sum(breakdown.values())

    raw = 0
    for etype, count in breakdown.items():
        w = EVENT_WEIGHTS.get(etype, 0)
        raw += int(count) * int(w)

    # Convert raw to 0..100 in a simple way
    # baseline 50, then apply raw, then clamp
    score = _clamp(50 + raw, 0, 100)

    return CciResult(
        clan_id=int(clan_id),
        user_id=int(user_id),
        score=int(score),
        events_counted=int(total_events),
        breakdown=breakdown,
    )


# ✅ Alias used by some routes/services
def compute_cci(db: Session, *, clan_id: int, user_id: int) -> CciResult:
    return compute_cci_score(db, clan_id=clan_id, user_id=user_id)
