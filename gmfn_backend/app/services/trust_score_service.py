from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent, User
from app.services.trust_events_services import log_trust_event


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _loads_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        return json.loads(meta_json)
    except Exception:
        return {}


def trust_band_for_score(score: int) -> tuple[str, str]:
    if score >= 80:
        return ("A", "Highly trusted: you qualify for higher limits and fewer guarantors (if enforcement enabled).")
    if score >= 60:
        return ("B", "Trusted: normal limits and standard guarantor requirements (if enforcement enabled).")
    if score >= 30:
        return ("C", "Building trust: start small, repay consistently to improve your band.")
    return ("D", "High risk: focus on participation and repayments to rebuild trust.")


def compute_trust_score(db: Session, *, user_id: int) -> tuple[int, dict[str, Any]]:
    score = 50
    breakdown: dict[str, Any] = {
        "base": 50,
        "invite": 0,
        "guarantor": 0,
        "repayment": 0,
        "participation": 0,
        "penalties": 0,
        "notes": [],
    }

    events = (
        db.query(TrustEvent)
        .filter((TrustEvent.actor_user_id == user_id) | (TrustEvent.subject_user_id == user_id))
        .order_by(TrustEvent.created_at.desc())
        .limit(1000)
        .all()
    )

    # Invite behaviour
    invite_points = 0.0
    for ev in events:
        et = ev.event_type
        meta = _loads_meta(getattr(ev, "meta_json", None))

        if et == "clan_join_via_invite":
            invited_by = meta.get("invited_by_user_id")
            if invited_by == user_id:
                invite_points += 2

        if et == "invite_revoked" and ev.actor_user_id == user_id:
            invite_points -= 1

        if et == "invite_created" and ev.actor_user_id == user_id:
            invite_points += 0.2

    invite_points = max(-10, min(20, int(round(invite_points))))
    breakdown["invite"] = invite_points

    # Guarantor behaviour
    guarantor_points = 0
    for ev in events:
        et = ev.event_type
        if et in ("guarantor_approved", "loan_guarantor_approved") and ev.actor_user_id == user_id:
            guarantor_points += 2
        if et in ("guarantor_declined", "loan_guarantor_declined") and ev.actor_user_id == user_id:
            guarantor_points -= 1
        if et in ("guarantor_expired", "loan_guarantor_expired") and ev.actor_user_id == user_id:
            guarantor_points -= 2

    guarantor_points = max(-15, min(25, int(round(guarantor_points))))
    breakdown["guarantor"] = guarantor_points

    # Repayment behaviour
    repayment_points = 0
    for ev in events:
        et = ev.event_type
        if et in ("repayment_created", "repayment.made") and ev.actor_user_id == user_id:
            repayment_points += 2
        if et in ("loan_repaid", "loan_closed_repaid") and (ev.subject_user_id == user_id or ev.actor_user_id == user_id):
            repayment_points += 10
        if et in ("loan_defaulted", "loan_failed") and (ev.subject_user_id == user_id or ev.actor_user_id == user_id):
            repayment_points -= 15

    repayment_points = max(-30, min(35, int(round(repayment_points))))
    breakdown["repayment"] = repayment_points

    # Participation (simple MVP)
    participation_points = 0
    if len(events) >= 5:
        participation_points += 3
    if len(events) >= 20:
        participation_points += 4
    if len(events) >= 50:
        participation_points += 3
    participation_points = max(0, min(10, participation_points))
    breakdown["participation"] = participation_points

    # Penalties
    penalties = 0
    for ev in events:
        if ev.event_type in ("abuse_flag", "suspicious_activity"):
            penalties -= 10
    breakdown["penalties"] = penalties

    score = breakdown["base"] + invite_points + guarantor_points + repayment_points + participation_points + penalties
    score = max(0, min(100, int(round(score))))

    band, guidance = trust_band_for_score(score)
    breakdown["score"] = score
    breakdown["band"] = band
    breakdown["guidance"] = guidance

    return score, breakdown


def _log_trust_score_updated(db: Session, *, user_id: int, score: int, band: str, source: str) -> None:
    """
    Writes a TrustEvent so we can build Trust Trend + explainable change history.
    Safe: never raises.
    """
    try:
        log_trust_event(
            db,
            event_type="trust.score_updated",
            clan_id=None,
            loan_id=None,
            guarantor_id=None,
            actor_user_id=int(user_id),
            subject_user_id=int(user_id),
            meta={"score": int(score), "band": band, "source": source},
        )
    except Exception:
        # don't break flows if logging fails
        try:
            db.rollback()
        except Exception:
            pass


def recompute_and_store_trust_score(db: Session, *, user: User) -> User:
    """
    user from auth may be detached; reload persistent instance.
    """
    db_user = db.get(User, int(user.id))
    if not db_user:
        raise ValueError("User not found")

    score, breakdown = compute_trust_score(db, user_id=int(db_user.id))
    db_user.trust_score = score
    db_user.trust_band = breakdown.get("band")
    db_user.trust_breakdown_json = json.dumps(breakdown, ensure_ascii=False)
    db_user.trust_score_updated_at = _utcnow()

    db.commit()
    db.refresh(db_user)

    # emit history event
    _log_trust_score_updated(db, user_id=int(db_user.id), score=int(score), band=str(db_user.trust_band or ""), source="manual_recompute")
    return db_user


def recompute_trust_for_user_id(db: Session, *, user_id: int, source: str = "auto") -> None:
    """
    Auto-recompute hook for business flows.
    Never raises.
    """
    try:
        db_user = db.get(User, int(user_id))
        if not db_user:
            return

        score, breakdown = compute_trust_score(db, user_id=int(db_user.id))
        db_user.trust_score = score
        db_user.trust_band = breakdown.get("band")
        db_user.trust_breakdown_json = json.dumps(breakdown, ensure_ascii=False)
        db_user.trust_score_updated_at = _utcnow()
        db.commit()

        _log_trust_score_updated(db, user_id=int(db_user.id), score=int(score), band=str(db_user.trust_band or ""), source=source)
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


# Backward-compatible wrapper
def compute_trust_score_explained(db: Session, *, user_id: int) -> dict[str, Any]:
    score, breakdown = compute_trust_score(db, user_id=user_id)
    return {"score": score, "breakdown": breakdown}


def trust_enforcement_enabled() -> bool:
    return os.getenv("TRUST_ENFORCE_LOAN_RULES", "0") == "1"


def loan_policy_for_band(band: str) -> dict[str, Any]:
    if band == "A":
        return {"max_amount": 1000, "min_guarantors": 1}
    if band == "B":
        return {"max_amount": 500, "min_guarantors": 2}
    if band == "C":
        return {"max_amount": 200, "min_guarantors": 3}
    return {"max_amount": 50, "min_guarantors": 3}
