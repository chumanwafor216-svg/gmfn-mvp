# app/api/routes/admin_pool.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.schemas.pool import AdminPoolPendingOut, PoolEventOut
from app.services.pool_service import list_pending_pool_events, confirm_pool_event

router = APIRouter(prefix="/admin/pool", tags=["admin"])


@router.get("/pending", response_model=AdminPoolPendingOut)
def admin_pool_pending(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    if (getattr(current_user, "role", "") or "").lower() != "admin" and (getattr(membership, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    items = list_pending_pool_events(db, clan_id=int(clan.id), limit=int(limit))
    return {"items": [PoolEventOut.model_validate(x) for x in items], "total": len(items)}


@router.post("/events/{event_id}/confirm", response_model=PoolEventOut)
def admin_confirm_pool_event(
    event_id: int,
    note: str | None = None,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    if (getattr(current_user, "role", "") or "").lower() != "admin" and (getattr(membership, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        e = confirm_pool_event(
            db,
            event_id=int(event_id),
            clan_id=int(clan.id),
            confirmed_by_user_id=int(current_user.id),
            note=note,
        )
        db.commit()
        db.refresh(e)
        return PoolEventOut.model_validate(e)
    except ValueError as le:
        raise HTTPException(status_code=404, detail=str(le))
