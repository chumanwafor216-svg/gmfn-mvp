from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.trust_events_query_service import list_recent_for_subject
from app.services.trust_recompute_service import (
    apply_recomputed_trust_for_user,
    recompute_trust_for_user,
)

router = APIRouter(tags=["trust-recompute"])


def _is_admin(user: User) -> bool:
    return ((getattr(user, "role", "") or "").lower() == "admin")


@router.get("/trust/recompute/me")
def recompute_me(
    limit: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    r = recompute_trust_for_user(db, user_id=int(current_user.id), limit=limit)
    return {
        "user_id": r.user_id,
        "score": r.score,
        "band": r.band,
        "event_count": r.event_count,
        "last_event_id": r.last_event_id,
        "breakdown": r.breakdown,
    }


@router.get("/admin/trust/recompute/{user_id}")
def admin_recompute_user(
    user_id: int,
    limit: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")

    target = db.get(User, int(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    r = recompute_trust_for_user(db, user_id=int(user_id), limit=limit)
    return {
        "user_id": r.user_id,
        "score": r.score,
        "band": r.band,
        "event_count": r.event_count,
        "last_event_id": r.last_event_id,
        "breakdown": r.breakdown,
    }


@router.post("/admin/trust/recompute/{user_id}/apply")
def admin_apply_recompute_user(
    user_id: int,
    limit: int | None = None,
    dry_run: int = 0,
    set_updated_at: int = 1,
    force: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")

    target = db.get(User, int(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    return apply_recomputed_trust_for_user(
        db,
        user_id=int(user_id),
        limit=limit,
        dry_run=bool(dry_run),
        set_updated_at=bool(set_updated_at),
        force=bool(force),
    )


@router.get("/admin/trust/evidence/{user_id}")
def admin_trust_evidence_snapshot(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Single admin evidence snapshot:
    - current stored trust fields
    - recomputed trust
    - diff
    - recent TrustEvents
    """
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")

    u = db.get(User, int(user_id))
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    recomputed = recompute_trust_for_user(db, user_id=int(user_id), limit=None)

    current_score = getattr(u, "trust_score", None)
    current_band = getattr(u, "trust_band", None)
    current_score_str = str(current_score) if current_score is not None else None

    diff = {
        "stored_score": current_score_str,
        "stored_band": current_band,
        "recomputed_score": recomputed.score,
        "recomputed_band": recomputed.band,
        "match": (current_score_str == recomputed.score)
        and (current_band == recomputed.band),
    }

    recent_events = list_recent_for_subject(
        db,
        subject_user_id=int(user_id),
        limit=10,
    )

    return {
        "user_id": int(user_id),
        "current": {
            "trust_score": current_score_str,
            "trust_band": current_band,
            "trust_score_updated_at": (
                getattr(u, "trust_score_updated_at", None).isoformat()
                if getattr(u, "trust_score_updated_at", None) is not None
                else None
            ),
        },
        "recomputed": {
            "score": recomputed.score,
            "band": recomputed.band,
            "event_count": recomputed.event_count,
            "last_event_id": recomputed.last_event_id,
            "breakdown": recomputed.breakdown,
        },
        "diff": diff,
        "recent_events": recent_events,
    }