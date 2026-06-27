from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.protected_trades import (
    ProtectedTradeCreateIn,
    ProtectedTradeEventIn,
    ProtectedTradeEventOut,
    ProtectedTradeOut,
)
from app.services.protected_trade_service import (
    add_trade_event,
    create_trade,
    get_trade_for_user,
    list_trade_events,
    list_trades_for_user,
    trade_to_dict,
    event_to_dict,
)


router = APIRouter(prefix="/protected-trades", tags=["protected-trades"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, LookupError):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail="Protected trade record failed.")


@router.post("", response_model=ProtectedTradeOut, status_code=201)
def create_protected_trade(
    payload: ProtectedTradeCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        trade = create_trade(db, payload=payload, current_user=current_user)
        events = list_trade_events(db, trade_id=int(trade.id), limit=20)
        return trade_to_dict(trade, events=events)
    except Exception as exc:
        raise _http_error(exc) from exc


@router.get("", response_model=list[ProtectedTradeOut])
def list_protected_trades(
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        trades = list_trades_for_user(
            db,
            current_user=current_user,
            status=status,
            limit=limit,
        )
        return [trade_to_dict(trade) for trade in trades]
    except Exception as exc:
        raise _http_error(exc) from exc


@router.get("/{trade_id}", response_model=ProtectedTradeOut)
def get_protected_trade(
    trade_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        trade = get_trade_for_user(db, trade_id=trade_id, current_user=current_user)
        events = list_trade_events(db, trade_id=int(trade.id), limit=200)
        return trade_to_dict(trade, events=events)
    except Exception as exc:
        raise _http_error(exc) from exc


@router.post("/{trade_id}/events", response_model=ProtectedTradeEventOut, status_code=201)
def add_protected_trade_event(
    trade_id: int,
    payload: ProtectedTradeEventIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        trade = get_trade_for_user(db, trade_id=trade_id, current_user=current_user)
        event = add_trade_event(
            db,
            trade=trade,
            payload=payload,
            current_user=current_user,
        )
        return event_to_dict(event)
    except Exception as exc:
        raise _http_error(exc) from exc

