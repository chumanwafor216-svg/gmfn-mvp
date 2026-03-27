# app/api/routes/merchant_view.py
from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/merchant-view", tags=["merchant-view"])


MerchantVisibilityLevel = Literal["minimal", "standard", "detailed"]


class MerchantViewOut(BaseModel):
    user_id: int
    level: MerchantVisibilityLevel
    note: str | None = None


class MerchantViewSetIn(BaseModel):
    level: MerchantVisibilityLevel


def _safe_level(value: Any) -> str:
    s = str(value or "").strip().lower()
    if s not in {"minimal", "standard", "detailed"}:
        return "standard"
    return s


@router.get("/me", response_model=MerchantViewOut)
def get_my_merchant_view(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    level = _safe_level(getattr(current_user, "merchant_visibility_level", "standard"))
    return {
        "user_id": int(current_user.id),
        "level": level,
        "note": "Saved merchant visibility policy.",
    }


@router.post("/me", response_model=MerchantViewOut)
def set_my_merchant_view(
    payload: MerchantViewSetIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    level = _safe_level(payload.level)
    current_user.merchant_visibility_level = level
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "user_id": int(current_user.id),
        "level": level,
        "note": "Merchant visibility policy saved.",
    }


@router.patch("/me", response_model=MerchantViewOut)
def patch_my_merchant_view(
    payload: MerchantViewSetIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    level = _safe_level(payload.level)
    current_user.merchant_visibility_level = level
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "user_id": int(current_user.id),
        "level": level,
        "note": "Merchant visibility policy updated.",
    }