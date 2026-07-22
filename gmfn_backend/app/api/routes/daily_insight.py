from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.daily_insight_service import (
    MARKET_WISDOM_EXPOSURE_ACTIONS,
    MARKET_WISDOM_STATUSES,
    admin_market_wisdom_entry,
    create_market_wisdom_entry,
    get_daily_market_wisdom,
    list_market_wisdom_entries,
    recommend_market_wisdom,
    record_market_wisdom_exposure,
    update_market_wisdom_entry,
)

router = APIRouter(tags=["market-wisdom"])


def _require_admin(user: User) -> None:
    if str(getattr(user, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required.")


def _safe_text(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value.strip()


class MarketWisdomEntryIn(BaseModel):
    public_id: Optional[str] = None
    title: str = Field(..., min_length=2, max_length=180)
    principle: str = Field(..., min_length=2)
    short_message: str = Field(..., min_length=2, max_length=280)
    explanation: Optional[str] = None
    business_application: Optional[str] = None
    community_application: Optional[str] = None
    leadership_application: Optional[str] = None
    action_prompt: Optional[str] = Field(default=None, max_length=280)
    warning: Optional[str] = None
    when_to_apply: Optional[str] = None
    when_not_to_apply: Optional[str] = None
    category: str = Field(..., min_length=2, max_length=80)
    subcategory: Optional[str] = Field(default=None, max_length=120)
    behaviour_tags: List[str] = Field(default_factory=list)
    context_tags: List[str] = Field(default_factory=list)
    audience_tags: List[str] = Field(default_factory=list)
    related_gsn_modules: List[str] = Field(default_factory=list)
    source_type: str = "general_practical_wisdom"
    source_title: Optional[str] = None
    source_author: Optional[str] = None
    source_year: Optional[str] = None
    source_url: Optional[str] = None
    source_note: Optional[str] = None
    evidence_level: str = "practical"
    confidence_level: str = "medium"
    ethical_risk_level: str = "low"
    sensitivity_level: str = "low"
    generation_method: str = "admin_created"
    generation_reason: Optional[str] = None
    status: str = "generated"
    version: int = 1
    language: str = "en"

    @field_validator("*", mode="before")
    @classmethod
    def _reject_non_text_scalars(cls, value: Any, info: Any) -> Any:
        list_fields = {"behaviour_tags", "context_tags", "audience_tags", "related_gsn_modules"}
        numeric_fields = {"version"}
        if info.field_name in list_fields or info.field_name in numeric_fields:
            return value
        return _safe_text(value, info.field_name)


class MarketWisdomEntryPatchIn(BaseModel):
    title: Optional[str] = None
    principle: Optional[str] = None
    short_message: Optional[str] = None
    explanation: Optional[str] = None
    business_application: Optional[str] = None
    community_application: Optional[str] = None
    leadership_application: Optional[str] = None
    action_prompt: Optional[str] = None
    warning: Optional[str] = None
    when_to_apply: Optional[str] = None
    when_not_to_apply: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    behaviour_tags: Optional[List[str]] = None
    context_tags: Optional[List[str]] = None
    audience_tags: Optional[List[str]] = None
    related_gsn_modules: Optional[List[str]] = None
    source_type: Optional[str] = None
    source_title: Optional[str] = None
    source_author: Optional[str] = None
    source_year: Optional[str] = None
    source_url: Optional[str] = None
    source_note: Optional[str] = None
    evidence_level: Optional[str] = None
    confidence_level: Optional[str] = None
    ethical_risk_level: Optional[str] = None
    sensitivity_level: Optional[str] = None
    status: Optional[str] = None

    @field_validator("*", mode="before")
    @classmethod
    def _reject_non_text_scalars(cls, value: Any, info: Any) -> Any:
        list_fields = {"behaviour_tags", "context_tags", "audience_tags", "related_gsn_modules"}
        if info.field_name in list_fields:
            return value
        return _safe_text(value, info.field_name)


class MarketWisdomExposureIn(BaseModel):
    public_id: str = Field(..., min_length=2, max_length=64)
    action: str = "shown"
    clan_id: Optional[int] = None
    feedback: Optional[str] = Field(default=None, max_length=40)
    outcome_signal: Optional[str] = Field(default=None, max_length=160)


@router.get("/public/daily-insight")
def daily_insight(db: Session = Depends(get_db)) -> Dict[str, Any]:
    return get_daily_market_wisdom(db)


@router.get("/market-wisdom/recommendation")
def market_wisdom_recommendation(
    context: Optional[str] = Query(default=None, max_length=160),
    clan_id: Optional[int] = Query(default=None, ge=1),
    signals: List[str] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return recommend_market_wisdom(
        db,
        user=current_user,
        clan_id=clan_id,
        context=context,
        signals=signals,
    )


@router.post("/market-wisdom/exposures")
def market_wisdom_exposure(
    payload: MarketWisdomExposureIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if payload.action not in MARKET_WISDOM_EXPOSURE_ACTIONS:
        raise HTTPException(status_code=400, detail="Invalid Market Wisdom exposure action.")
    try:
        return record_market_wisdom_exposure(
            db,
            public_id=payload.public_id,
            action=payload.action,
            user=current_user,
            clan_id=payload.clan_id,
            feedback=payload.feedback,
            outcome_signal=payload.outcome_signal,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/market-wisdom/feedback")
def market_wisdom_feedback(
    payload: MarketWisdomExposureIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    feedback = payload.feedback or "helpful"
    try:
        return record_market_wisdom_exposure(
            db,
            public_id=payload.public_id,
            action=payload.action if payload.action in MARKET_WISDOM_EXPOSURE_ACTIONS else "opened",
            user=current_user,
            clan_id=payload.clan_id,
            feedback=feedback,
            outcome_signal=payload.outcome_signal,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/admin/market-wisdom/entries")
def admin_list_market_wisdom_entries(
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    source: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=250),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    if status and status not in MARKET_WISDOM_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid Market Wisdom status.")
    return list_market_wisdom_entries(db, status=status, category=category, source=source, limit=limit)


@router.post("/admin/market-wisdom/entries")
def admin_create_market_wisdom_entry(
    payload: MarketWisdomEntryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    try:
        entry = create_market_wisdom_entry(db, payload.model_dump(), actor=current_user)
        db.commit()
        db.refresh(entry)
        return {"ok": True, "entry": admin_market_wisdom_entry(entry)}
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/admin/market-wisdom/entries/{public_id}")
def admin_update_market_wisdom_entry(
    public_id: str,
    payload: MarketWisdomEntryPatchIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    try:
        entry = update_market_wisdom_entry(
            db,
            public_id=public_id,
            payload=payload.model_dump(exclude_unset=True),
            actor=current_user,
        )
        return {"ok": True, "entry": admin_market_wisdom_entry(entry)}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
