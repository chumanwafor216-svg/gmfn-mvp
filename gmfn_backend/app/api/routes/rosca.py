from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, User
from app.services.community_domain_feature_policy import (
    require_domain_rosca_cycles_enabled,
)
from app.services.rosca_service import (
    create_rosca_cycle,
    get_rosca_cycle,
    list_my_rosca_obligations,
    list_rosca_cycles,
    record_rosca_payout,
)

router = APIRouter(prefix="/rosca", tags=["rosca"])


def _reject_bool_integer(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer, not a float.")
    return value


def _reject_bool_integer_list(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, list):
        return value
    for item in value:
        _reject_bool_integer(item, field_name)
    return value


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _reject_non_decimal_string(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a decimal string.")
    return value


def _reject_non_datetime_string(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be an ISO datetime string.")
    return value


class RoscaCycleCreateIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    title: Optional[str] = Field(default=None, max_length=120)
    contribution_amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="NGN", max_length=8)
    member_user_ids: Optional[List[int]] = None
    payout_order_user_ids: Optional[List[int]] = None
    start_at: Optional[datetime] = None
    interval_days: int = Field(default=30, ge=1, le=366)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("clan_id", "interval_days", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        return _reject_bool_integer(value, info.field_name)

    @field_validator("member_user_ids", "payout_order_user_ids", mode="before")
    @classmethod
    def _reject_malformed_integer_lists(cls, value: Any, info: Any) -> Any:
        return _reject_bool_integer_list(value, info.field_name)

    @field_validator("title", "currency", "note", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("contribution_amount", mode="before")
    @classmethod
    def _reject_contribution_amount_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_decimal_string(value, info.field_name)

    @field_validator("start_at", mode="before")
    @classmethod
    def _reject_start_at_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_datetime_string(value, info.field_name)


class RoscaPayoutRecordIn(BaseModel):
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("note", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


def _require_clan_member(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> ClanMembership:
    is_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if membership:
        return membership
    if is_admin:
        return ClanMembership(
            clan_id=int(clan_id),
            user_id=int(current_user.id),
            role="admin",
        )
    raise HTTPException(status_code=403, detail="You are not a member of this community")


def _require_clan_admin(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> ClanMembership:
    membership = _require_clan_member(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    is_platform_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    is_clan_admin = str(getattr(membership, "role", "") or "").lower() == "admin"
    if not is_platform_admin and not is_clan_admin:
        raise HTTPException(
            status_code=403,
            detail="Only a community admin can manage ROSCA cycles",
        )
    return membership


@router.get("/cycles")
def list_cycles(
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    cycles = list_rosca_cycles(db, clan_id=int(clan_id))
    return {
        "ok": True,
        "clan_id": int(clan_id),
        "engine_ready": True,
        "cycles": cycles,
    }


@router.get("/obligations/me")
def list_my_obligations(
    clan_id: Optional[int] = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if clan_id:
        _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)

    obligations = list_my_rosca_obligations(
        db,
        user_id=int(current_user.id),
        clan_id=int(clan_id) if clan_id else None,
        limit=int(limit),
    )
    return {
        "ok": True,
        "engine_ready": True,
        "clan_id": int(clan_id) if clan_id else None,
        "obligations": obligations,
    }


@router.get("/cycles/{cycle_id}")
def get_cycle(
    cycle_id: str,
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    cycle = get_rosca_cycle(db, clan_id=int(clan_id), cycle_id=str(cycle_id))
    if not cycle:
        raise HTTPException(status_code=404, detail="ROSCA cycle not found")
    return {
        "ok": True,
        "clan_id": int(clan_id),
        "engine_ready": True,
        "cycle": cycle,
    }


@router.post("/cycles")
def create_cycle(
    payload: RoscaCycleCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_admin(
        db,
        clan_id=int(payload.clan_id),
        current_user=current_user,
    )
    require_domain_rosca_cycles_enabled(
        db,
        clan_id=int(payload.clan_id),
    )
    try:
        cycle = create_rosca_cycle(
            db,
            clan_id=int(payload.clan_id),
            created_by_user_id=int(current_user.id),
            title=payload.title,
            contribution_amount=payload.contribution_amount,
            currency=payload.currency,
            member_user_ids=payload.member_user_ids,
            payout_order_user_ids=payload.payout_order_user_ids,
            start_at=payload.start_at,
            interval_days=int(payload.interval_days),
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "ok": True,
        "engine_ready": True,
        "cycle": cycle,
        "message": "ROSCA cycle started. Member contribution references are ready for Money In reconciliation.",
    }


@router.post("/cycles/{cycle_id}/rounds/{round_number}/payout")
def record_payout(
    cycle_id: str,
    round_number: int,
    payload: RoscaPayoutRecordIn,
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_admin(db, clan_id=int(clan_id), current_user=current_user)
    try:
        cycle = record_rosca_payout(
            db,
            clan_id=int(clan_id),
            cycle_id=str(cycle_id),
            round_number=int(round_number),
            actor_user_id=int(current_user.id),
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "ok": True,
        "engine_ready": True,
        "cycle": cycle,
        "message": "ROSCA payout recorded. No external GSN payout was executed by this action.",
    }
