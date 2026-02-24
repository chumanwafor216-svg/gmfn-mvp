# app/api/routes/pool.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.schemas.pool import PoolMeOut, PoolRequestIn, PoolEventOut
from app.services.pool_service import (
    compute_pool_balances,
    request_deposit,
    request_withdrawal,
    build_reference,
)

router = APIRouter(prefix="/pool", tags=["pool"])


@router.get("/me", response_model=PoolMeOut)
def pool_me(
    limit: int = Query(20, ge=1, le=200),
    currency: str = Query("NGN"),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    uid = int(current_user.id)
    cid = int(clan.id)

    bal = compute_pool_balances(db, clan_id=cid, user_id=uid, currency=currency)

    # recent events
    from app.db.models import PoolEvent

    rows = (
        db.query(PoolEvent)
        .filter(
            PoolEvent.clan_id == cid,
            PoolEvent.user_id == uid,
            PoolEvent.currency == currency,
        )
        .order_by(PoolEvent.id.desc())
        .limit(int(limit))
        .all()
    )

    # IMPORTANT: serialize Decimals as strings at API boundary (PoolMeOut expects strings)
    out = {
        "clan_id": cid,
        "user_id": uid,
        "currency": currency,
        "available_balance": str(bal.get("available", "0")),
        "pending_deposits": str(bal.get("pending_deposits", "0")),
        "pending_withdrawals": str(bal.get("pending_withdrawals", "0")),
        "reference": build_reference(clan_id=cid, user_id=uid),
        "recent_events": list(reversed([PoolEventOut.model_validate(r) for r in rows])),
    }

    # If your PoolMeOut schema includes these (from the “reserved/effective” work), return them too.
    # If it DOESN'T, remove these 2 lines.
    if "reserved_pool" in getattr(PoolMeOut, "model_fields", {}):
        out["reserved_pool"] = str(bal.get("reserved_pool", "0"))
    if "effective_available" in getattr(PoolMeOut, "model_fields", {}):
        out["effective_available"] = str(bal.get("effective_available", bal.get("available", "0")))

    return out


@router.post("/deposits/request", response_model=PoolEventOut)
def deposit_request(
    payload: PoolRequestIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    try:
        e = request_deposit(
            db,
            clan_id=int(clan.id),
            user_id=int(current_user.id),
            amount=payload.amount,
            currency=payload.currency,
            note=payload.note,
        )
        db.commit()
        db.refresh(e)
        return PoolEventOut.model_validate(e)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/withdrawals/request", response_model=PoolEventOut)
def withdrawal_request(
    payload: PoolRequestIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    try:
        e = request_withdrawal(
            db,
            clan_id=int(clan.id),
            user_id=int(current_user.id),
            amount=payload.amount,
            currency=payload.currency,
            note=payload.note,
        )
        db.commit()
        db.refresh(e)
        return PoolEventOut.model_validate(e)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))