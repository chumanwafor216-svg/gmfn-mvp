from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import TrustEvent, User
from app.services.trust_score_service import recompute_trust_for_user

router = APIRouter(prefix="/trust", tags=["trust"])


def _safe_meta(raw: Any) -> Dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            value = json.loads(raw)
            return value if isinstance(value, dict) else {}
        except Exception:
            return {}
    return {}


def _to_iso(value: Any) -> Any:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return value


def _raw_event_counts(events: list[TrustEvent]) -> Dict[str, int]:
    counts: Dict[str, int] = {}
    for event in events:
        event_type = str(getattr(event, "event_type", "") or "")
        counts[event_type] = counts.get(event_type, 0) + 1
    return counts


def _canonical_totals(canonical: Dict[str, Any]) -> tuple[str, str]:
    gains = canonical.get("gains") if isinstance(canonical.get("gains"), dict) else {}
    penalties = canonical.get("penalties") if isinstance(canonical.get("penalties"), dict) else {}
    return str(gains.get("total") or "0.00"), str(penalties.get("total") or "0.00")


def _canonical_score(canonical: Dict[str, Any]) -> str:
    return str(canonical.get("score") or canonical.get("trust_score") or "0.00")


def _canonical_band(canonical: Dict[str, Any]) -> str:
    return str(canonical.get("trust_band") or canonical.get("band") or "D")


def _build_explained_payload(
    *,
    db: Session,
    clan: Any,
    user: User,
    events: list[TrustEvent],
    last_events: list[TrustEvent],
    include_global_events: bool,
) -> Dict[str, Any]:
    canonical = recompute_trust_for_user(db, user_id=int(user.id))
    score = _canonical_score(canonical)
    band = _canonical_band(canonical)
    positives, negatives = _canonical_totals(canonical)
    scoped_counts = _raw_event_counts(events)

    return {
        "scope": {
            "clan_id": int(clan.id),
            "clan_name": getattr(clan, "name", None),
            "include_global_events": include_global_events,
            "score_source": "canonical_lifecycle_aware_trust_score_service",
            "score_scope": "all_eligible_member_trust_evidence",
            "event_listing_scope": "selected_clan_plus_global" if include_global_events else "selected_clan",
        },
        "user_id": int(user.id),
        "email": getattr(user, "email", None),
        "score": score,
        "trust_score": score,
        "band": band,
        "trust_band": band,
        "positives": positives,
        "negatives": negatives,
        "counts": scoped_counts,
        "canonical_counts": canonical.get("counts", {}),
        "computed": canonical,
        "last_events": [_as_event_row(te) for te in reversed(last_events)],
        "notes": [
            "Score is canonical and lifecycle-aware, not route-local.",
            "This endpoint is community-scoped for evidence listing using X-Clan-Id.",
            "Use include_global_events=true to also include clan_id=NULL events in the event listing.",
        ],
    }

def _as_event_row(te: TrustEvent) -> Dict[str, Any]:
    return {
        "id": int(te.id),
        "event_type": te.event_type,
        "clan_id": te.clan_id,
        "loan_id": te.loan_id,
        "guarantor_id": te.guarantor_id,
        "actor_user_id": int(te.actor_user_id),
        "subject_user_id": int(te.subject_user_id),
        "created_at": _to_iso(getattr(te, "created_at", None)),
        "meta": _safe_meta(getattr(te, "meta", None) or getattr(te, "meta_json", None)),
    }


@router.get("/score/explained-clan", response_model=dict[str, Any])
def get_my_trust_score_explained(
    limit: int = Query(25, ge=1, le=200),
    include_global_events: bool = Query(
        False,
        description="If true, includes events with clan_id = NULL",
    ),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    """
    Explained trust score for the current user, scoped to the current community (X-Clan-Id).
    """
    clan, membership, current_user = clan_ctx
    user_id = int(current_user.id)

    q = db.query(TrustEvent).filter(TrustEvent.subject_user_id == user_id)

    if include_global_events:
        q = q.filter(
            (TrustEvent.clan_id == int(clan.id)) | (TrustEvent.clan_id.is_(None))
        )
    else:
        q = q.filter(TrustEvent.clan_id == int(clan.id))

    events = q.order_by(TrustEvent.id.asc()).all()
    last_events = q.order_by(TrustEvent.id.desc()).limit(limit).all()

    return _build_explained_payload(
        db=db,
        clan=clan,
        user=current_user,
        events=events,
        last_events=last_events,
        include_global_events=include_global_events,
    )


@router.get("/score/explained-clan/{user_id}", response_model=dict[str, Any])
def get_user_trust_score_explained_admin(
    user_id: int,
    limit: int = Query(25, ge=1, le=200),
    include_global_events: bool = Query(False),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    """
    Community-admin or platform-admin: explained trust score for any user,
    scoped to current community (X-Clan-Id).
    """
    clan, membership, current_user = clan_ctx

    is_platform_admin = (getattr(current_user, "role", "") or "").lower() == "admin"
    is_clan_admin = (getattr(membership, "role", "") or "").lower() == "admin"
    if not (is_platform_admin or is_clan_admin):
        raise HTTPException(status_code=403, detail="Community admin or platform admin only")

    target = db.get(User, int(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    q = db.query(TrustEvent).filter(TrustEvent.subject_user_id == int(user_id))

    if include_global_events:
        q = q.filter(
            (TrustEvent.clan_id == int(clan.id)) | (TrustEvent.clan_id.is_(None))
        )
    else:
        q = q.filter(TrustEvent.clan_id == int(clan.id))

    events = q.order_by(TrustEvent.id.asc()).all()
    last_events = q.order_by(TrustEvent.id.desc()).limit(limit).all()

    return _build_explained_payload(
        db=db,
        clan=clan,
        user=target,
        events=events,
        last_events=last_events,
        include_global_events=include_global_events,
    )
