# app/api/routes/trust_score.py
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.models import User, TrustEvent

from app.services.trust_score_service import compute_trust_score_explained

router = APIRouter(prefix="/trust", tags=["trust"])


def _as_event_row(te: TrustEvent) -> Dict[str, Any]:
    return {
        "id": int(te.id),
        "event_type": te.event_type,
        "clan_id": te.clan_id,
        "loan_id": te.loan_id,
        "guarantor_id": te.guarantor_id,
        "actor_user_id": int(te.actor_user_id),
        "subject_user_id": int(te.subject_user_id),
        "created_at": getattr(te, "created_at", None),
        "meta": getattr(te, "meta", None),
    }


@router.get("/score/explained", response_model=dict[str, Any])
def get_my_trust_score_explained(
    limit: int = Query(25, ge=1, le=200),
    include_global_events: bool = Query(False, description="If true, includes events with clan_id = NULL"),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    """
    Explained trust score for the current user, scoped to the CURRENT CLAN (X-Clan-Id).
    """
    clan, membership, current_user = clan_ctx
    user_id = int(current_user.id)

    q = db.query(TrustEvent).filter(TrustEvent.subject_user_id == user_id)

    # Clan-scoped (optionally include global events)
    if include_global_events:
        q = q.filter((TrustEvent.clan_id == int(clan.id)) | (TrustEvent.clan_id.is_(None)))
    else:
        q = q.filter(TrustEvent.clan_id == int(clan.id))

    events = q.order_by(TrustEvent.id.asc()).all()
    summary = compute_trust_score_explained(events)

    last_events = q.order_by(TrustEvent.id.desc()).limit(limit).all()

    return {
        "scope": {
            "clan_id": int(clan.id),
            "clan_name": getattr(clan, "name", None),
            "include_global_events": include_global_events,
        },
        "user_id": user_id,
        "email": current_user.email,
        "score": summary["score"],
        "positives": summary["positives"],
        "negatives": summary["negatives"],
        "counts": summary["counts"],
        "last_events": [_as_event_row(te) for te in reversed(last_events)],
        "notes": [
            "Score is rule-based (not ML).",
            "This endpoint is clan-scoped using X-Clan-Id. Use include_global_events=true to also include clan_id=NULL events.",
        ],
    }


@router.get("/score/explained/{user_id}", response_model=dict[str, Any])
def get_user_trust_score_explained_admin(
    user_id: int,
    limit: int = Query(25, ge=1, le=200),
    include_global_events: bool = Query(False),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    """
    Clan-admin or platform-admin: explained trust score for any user, scoped to CURRENT CLAN (X-Clan-Id).
    """
    clan, membership, current_user = clan_ctx

    is_platform_admin = (getattr(current_user, "role", "") or "").lower() == "admin"
    is_clan_admin = (getattr(membership, "role", "") or "").lower() == "admin"
    if not (is_platform_admin or is_clan_admin):
        raise HTTPException(status_code=403, detail="Clan admin or platform admin only")

    target = db.get(User, int(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    q = db.query(TrustEvent).filter(TrustEvent.subject_user_id == int(user_id))

    if include_global_events:
        q = q.filter((TrustEvent.clan_id == int(clan.id)) | (TrustEvent.clan_id.is_(None)))
    else:
        q = q.filter(TrustEvent.clan_id == int(clan.id))

    events = q.order_by(TrustEvent.id.asc()).all()
    summary = compute_trust_score_explained(events)
    last_events = q.order_by(TrustEvent.id.desc()).limit(limit).all()

    return {
        "scope": {
            "clan_id": int(clan.id),
            "clan_name": getattr(clan, "name", None),
            "include_global_events": include_global_events,
        },
        "user_id": int(user_id),
        "email": target.email,
        "score": summary["score"],
        "positives": summary["positives"],
        "negatives": summary["negatives"],
        "counts": summary["counts"],
        "last_events": [_as_event_row(te) for te in reversed(last_events)],
        "notes": [
            "Score is rule-based (not ML).",
            "This endpoint is clan-scoped using X-Clan-Id.",
        ],
    }
