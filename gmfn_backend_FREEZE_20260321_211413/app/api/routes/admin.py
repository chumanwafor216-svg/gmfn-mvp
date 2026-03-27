# app/api/routes/admin.py
from __future__ import annotations

import json
from decimal import Decimal
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


def _d(x: Any) -> Decimal:
    try:
        return Decimal(str(x if x is not None else 0))
    except Exception:
        return Decimal("0")


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
                "clan_id": int(getattr(r, "clan_id", 0) or 0) if getattr(r, "clan_id", None) is not None else None,
                "loan_id": int(getattr(r, "loan_id", 0) or 0) if getattr(r, "loan_id", None) is not None else None,
                "guarantor_id": int(getattr(r, "guarantor_id", 0) or 0) if getattr(r, "guarantor_id", None) is not None else None,
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

    members = (
        db.query(
            ClanMembership.user_id,
            ClanMembership.role,
            ClanMembership.personal_pool_balance,
            User.email,
        )
        .join(User, User.id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .order_by(ClanMembership.id.asc())
        .all()
    )

    items = []
    for user_id, role, personal_pool_balance, email in members:
        uid = int(user_id)

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

        pool = _d(personal_pool_balance)
        exposure = _d(exposure_raw)
        available = pool - exposure
        if available < 0:
            available = Decimal("0")

        items.append(
            {
                "user_id": uid,
                "email": email,
                "role": role,
                "personal_pool_balance": str(pool),
                "exposure": str(exposure),
                "available": str(available),
            }
        )

    return {"items": items, "total": len(items), "clan_id": int(clan_id)}
@router.post("/activate-membership")
def activate(payload: dict):
    db = SessionLocal()

    user = db.query(models.User).filter_by(gmfn_id=payload["gmfn_id"]).first()

    if not user:
        raise HTTPException(404, "Invalid ID")

    user.hashed_password = payload["password"]
    user.is_active = True

    db.commit()

    return {"status": "activated"}    