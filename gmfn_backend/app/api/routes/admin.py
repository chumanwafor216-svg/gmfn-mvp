# app/api/routes/admin.py
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, TrustEvent, ClanMembership, LoanGuarantor

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_platform_admin(u: User) -> None:
    if (getattr(u, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")


def _safe_meta(te: TrustEvent) -> Optional[dict[str, Any]]:
    raw = getattr(te, "meta_json", None)
    if not raw:
        return None
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": str(raw)}


@router.get("/trust-events/recent")
def admin_recent_trust_events(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Screenshot-ready recent TrustEvents (includes meta.reason/meta.note if present).
    """
    _require_platform_admin(current_user)

    rows = (
        db.query(TrustEvent)
        .order_by(TrustEvent.id.desc())
        .limit(int(limit))
        .all()
    )

    items = []
    for r in rows:
        items.append(
            {
                "id": int(r.id),
                "event_type": r.event_type,
                "created_at": getattr(r, "created_at", None),
                "clan_id": int(getattr(r, "clan_id", 0) or 0),
                "loan_id": int(getattr(r, "loan_id", 0) or 0) if getattr(r, "loan_id", None) else None,
                "guarantor_id": int(getattr(r, "guarantor_id", 0) or 0) if getattr(r, "guarantor_id", None) else None,
                "actor_user_id": int(getattr(r, "actor_user_id", 0) or 0),
                "subject_user_id": int(getattr(r, "subject_user_id", 0) or 0),
                "meta": _safe_meta(r),
            }
        )

    return {"items": items, "total": len(items)}


@router.get("/exposure")
def admin_exposure(
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Minimal exposure view (admin-only).
    Exposure = sum(locked_amount - released_amount) for approved guarantees per user in clan.
    """
    _require_platform_admin(current_user)

    # clan membership rows
    members = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(clan_id))
        .order_by(ClanMembership.id.asc())
        .all()
    )

    items = []
    for m in members:
        uid = int(m.user_id)

        exposure_raw = (
            db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount), 0))
            .filter(
                LoanGuarantor.clan_id == int(clan_id),
                LoanGuarantor.guarantor_user_id == uid,
                func.lower(LoanGuarantor.status) == "approved",
            )
            .scalar()
            or 0
        )

        pool = getattr(m, "personal_pool_balance", 0) or 0
        exposure = exposure_raw or 0
        available = pool - exposure
        if available < 0:
            available = 0

        items.append(
            {
                "user_id": uid,
                "email": getattr(m, "email", None),
                "role": getattr(m, "role", None),
                "personal_pool_balance": str(pool),
                "exposure": str(exposure),
                "available": str(available),
            }
        )

    return {"items": items, "total": len(items), "clan_id": int(clan_id)}