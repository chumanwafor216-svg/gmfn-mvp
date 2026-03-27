from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.guarantor_selection_service import build_loan_guarantor_suggestions
from app.services.liquidity_engine_service import (
    build_clan_liquidity_snapshot,
    build_user_liquidity_profile,
)

router = APIRouter(prefix="/admin/liquidity", tags=["liquidity"])


def _require_admin(current_user: User) -> None:
    role = str(getattr(current_user, "role", "") or "").strip().lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/clan/{clan_id}")
def get_clan_liquidity(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    return build_clan_liquidity_snapshot(db, int(clan_id))


@router.get("/user/{user_id}")
def get_user_liquidity(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    try:
        return build_user_liquidity_profile(db, int(user_id))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/loan-suggestions/{loan_id}")
def get_loan_guarantor_suggestions(
    loan_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    try:
        return build_loan_guarantor_suggestions(db, int(loan_id), limit=int(limit))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc