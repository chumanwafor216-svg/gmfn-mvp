from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import TrustEvent, User

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


def _to_decimal(value: Any) -> Decimal:
    try:
        if isinstance(value, Decimal):
            return value
        if value is None:
            return Decimal("0")
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal("0")


def _infer_delta(event_type: str, meta: Dict[str, Any]) -> Decimal:
    t = str(event_type or "").strip().lower()

    explicit = (
        meta.get("trust_delta")
        or meta.get("delta")
        or meta.get("score_delta")
        or meta.get("points_delta")
    )
    if explicit not in (None, ""):
        return _to_decimal(explicit)

    if t in {"loan_fully_repaid", "loan.repaid", "repayment.completed", "repayment.confirmed"}:
        return Decimal("0.10")

    if t in {"guarantor_success", "guarantor.repayment.confirmed", "guarantor.support.confirmed"}:
        return Decimal("0.03")

    if "default" in t:
        return Decimal("-0.20")

    if "fraud" in t:
        return Decimal("-0.50")

    if "missed" in t or "late" in t or "overdue" in t:
        return Decimal("-0.05")

    return Decimal("0")


def _trust_band(score: Decimal) -> str:
    if score >= Decimal("15.00"):
        return "A"
    if score >= Decimal("6.00"):
        return "B"
    if score >= Decimal("2.00"):
        return "C"
    return "D"


def _compute_explained_from_events(events: list[TrustEvent]) -> Dict[str, Any]:
    positives = Decimal("0")
    negatives = Decimal("0")
    score = Decimal("0")

    counts: Dict[str, int] = {}

    for event in events:
        event_type = str(getattr(event, "event_type", "") or "")
        meta = _safe_meta(getattr(event, "meta", None) or getattr(event, "meta_json", None))
        delta = _infer_delta(event_type, meta)

        counts[event_type] = counts.get(event_type, 0) + 1
        score += delta

        if delta > 0:
            positives += delta
        elif delta < 0:
            negatives += abs(delta)

    return {
        "score": str(score),
        "positives": str(positives),
        "negatives": str(negatives),
        "counts": counts,
        "band": _trust_band(score),
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
    Explained trust score for the current user, scoped to the current clan (X-Clan-Id).
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
    summary = _compute_explained_from_events(events)

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
        "band": summary["band"],
        "positives": summary["positives"],
        "negatives": summary["negatives"],
        "counts": summary["counts"],
        "last_events": [_as_event_row(te) for te in reversed(last_events)],
        "notes": [
            "Score is rule-based, not ML.",
            "This endpoint is clan-scoped using X-Clan-Id.",
            "Use include_global_events=true to also include clan_id=NULL events.",
        ],
    }


@router.get("/score/explained-clan/{user_id}", response_model=dict[str, Any])
def get_user_trust_score_explained_admin(
    user_id: int,
    limit: int = Query(25, ge=1, le=200),
    include_global_events: bool = Query(False),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    """
    Clan-admin or platform-admin: explained trust score for any user,
    scoped to current clan (X-Clan-Id).
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
        q = q.filter(
            (TrustEvent.clan_id == int(clan.id)) | (TrustEvent.clan_id.is_(None))
        )
    else:
        q = q.filter(TrustEvent.clan_id == int(clan.id))

    events = q.order_by(TrustEvent.id.asc()).all()
    summary = _compute_explained_from_events(events)
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
        "band": summary["band"],
        "positives": summary["positives"],
        "negatives": summary["negatives"],
        "counts": summary["counts"],
        "last_events": [_as_event_row(te) for te in reversed(last_events)],
        "notes": [
            "Score is rule-based, not ML.",
            "This endpoint is clan-scoped using X-Clan-Id.",
        ],
    }