from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, User
from app.services.community_pay_in_account_service import (
    community_pay_in_payload,
    get_community_pay_in_account,
    get_community_pay_in_settlement,
    upsert_community_pay_in_account,
)

router = APIRouter(prefix="/community-pay-in-accounts", tags=["community-pay-in-accounts"])
COMMUNITY_PAY_IN_MANAGER_ROLES = {"admin", "owner", "founder", "creator"}


class CommunityPayInAccountIn(BaseModel):
    account_name: str = Field(..., min_length=2, max_length=160)
    bank_name: str = Field(..., min_length=2, max_length=120)
    account_number: str = Field(..., min_length=6, max_length=64)
    sort_code: Optional[str] = Field(default=None, max_length=32)
    routing_number: Optional[str] = Field(default=None, max_length=64)
    iban: Optional[str] = Field(default=None, max_length=64)
    swift_bic: Optional[str] = Field(default=None, max_length=32)
    country: Optional[str] = Field(default=None, max_length=64)
    currency: Optional[str] = Field(default="NGN", max_length=8)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator(
        "account_name",
        "bank_name",
        "account_number",
        "sort_code",
        "routing_number",
        "iban",
        "swift_bic",
        "country",
        "currency",
        "note",
        mode="before",
    )
    @classmethod
    def _reject_non_text_account_controls(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text.")
        return value


def _platform_admin(user: User) -> bool:
    return str(getattr(user, "role", "") or "").lower() == "admin"


def _membership(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
) -> Optional[ClanMembership]:
    return (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )


def _require_existing_clan(db: Session, *, clan_id: int) -> Clan:
    clan = db.get(Clan, int(clan_id))
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")
    return clan


def _require_member_or_platform_admin(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> Optional[ClanMembership]:
    _require_existing_clan(db, clan_id=int(clan_id))
    membership = _membership(
        db,
        clan_id=int(clan_id),
        user_id=int(current_user.id),
    )
    if membership:
        return membership
    if _platform_admin(current_user):
        return None
    raise HTTPException(status_code=403, detail="Only community members can read this pay-in account")


def _require_clan_admin(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> Optional[ClanMembership]:
    membership = _require_member_or_platform_admin(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    if _platform_admin(current_user):
        return membership
    if (
        membership
        and str(getattr(membership, "role", "") or "").lower()
        in COMMUNITY_PAY_IN_MANAGER_ROLES
    ):
        return membership
    raise HTTPException(
        status_code=403,
        detail="Only a community manager can save this pay-in account",
    )


@router.get("/{clan_id}")
def get_community_pay_in_account_route(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_member_or_platform_admin(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    row = get_community_pay_in_account(db, clan_id=int(clan_id))
    if not row:
        return {
            "configured": False,
            "clan_id": int(clan_id),
            "item": None,
            "settlement": get_community_pay_in_settlement(db, clan_id=int(clan_id)),
            "message": "Community pay-in account is not saved yet.",
        }
    return community_pay_in_payload(row)


@router.put("/{clan_id}", status_code=status.HTTP_200_OK)
def save_community_pay_in_account_route(
    clan_id: int,
    payload: CommunityPayInAccountIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_clan_admin(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    row = upsert_community_pay_in_account(
        db,
        clan_id=int(clan_id),
        updated_by_user_id=int(current_user.id),
        account_name=payload.account_name,
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        sort_code=payload.sort_code or "",
        routing_number=payload.routing_number or "",
        iban=payload.iban or "",
        swift_bic=payload.swift_bic or "",
        country=payload.country or "",
        currency=payload.currency or "NGN",
        note=payload.note or "",
    )
    return community_pay_in_payload(row)


@router.get("/{clan_id}/settlement")
def get_community_pay_in_settlement_route(
    clan_id: int,
    configured_only: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_member_or_platform_admin(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    row = get_community_pay_in_account(db, clan_id=int(clan_id))
    if configured_only and not row:
        raise HTTPException(status_code=404, detail="Community pay-in account is not saved yet")
    return get_community_pay_in_settlement(db, clan_id=int(clan_id))
