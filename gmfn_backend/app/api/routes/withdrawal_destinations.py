from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, UserPayoutDestination

router = APIRouter(prefix="/withdrawal-destinations", tags=["withdrawal-destinations"])


def _clean(value: object) -> str:
    return str(value or "").strip()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_currency(value: object) -> str:
    raw = _clean(value).upper()
    return raw or "NGN"


def _normalize_account_number(value: object) -> str:
    raw = _clean(value).replace(" ", "")
    if len(raw) < 6:
        raise HTTPException(status_code=400, detail="Account number is too short")
    return raw


def _normalize_phone(value: object) -> str:
    raw = _clean(value)
    if not raw:
        return ""

    compact = raw.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if compact.startswith("00"):
        compact = f"+{compact[2:]}"
    elif compact and not compact.startswith("+"):
        compact = f"+{compact}"
    return compact


def _verification_summary(current_user: User) -> tuple[str, str]:
    if getattr(current_user, "phone_verified_at", None):
        return (
            "phone_verified_bank_recorded",
            "Phone has been verified. Bank destination is recorded server-side but external bank-rail verification is not yet connected.",
        )

    return (
        "recorded",
        "Bank destination is recorded server-side. Phone verification should be completed before relying on this route.",
    )


class WithdrawalDestinationIn(BaseModel):
    destination_name: str = Field(..., min_length=2, max_length=160)
    bank_name: str = Field(..., min_length=2, max_length=120)
    account_number: str = Field(..., min_length=6, max_length=64)
    phone_number: Optional[str] = Field(default=None, max_length=32)
    country: Optional[str] = Field(default=None, max_length=64)
    currency: Optional[str] = Field(default="NGN", max_length=8)
    note: Optional[str] = Field(default=None, max_length=500)


def _payload(row: UserPayoutDestination) -> dict:
    return {
        "id": int(row.id),
        "destination_name": row.destination_name,
        "account_name": row.destination_name,
        "bank_name": row.bank_name,
        "bank": row.bank_name,
        "account_number": row.account_number,
        "bank_account_number": row.account_number,
        "phone_number": row.phone_number,
        "country": row.country,
        "currency": row.currency,
        "note": row.note,
        "verification_status": row.verification_status,
        "verification_note": row.verification_note,
        "phone_country_hint": row.phone_country_hint,
        "locale_country_hint": row.locale_country_hint,
        "region_consistency_status": row.region_consistency_status,
        "region_consistency_note": row.region_consistency_note,
        "verified_at": row.verified_at.isoformat() if row.verified_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _get_or_create_destination(db: Session, current_user: User) -> UserPayoutDestination:
    row = (
        db.query(UserPayoutDestination)
        .filter(UserPayoutDestination.user_id == int(current_user.id))
        .first()
    )
    if row:
        return row

    row = UserPayoutDestination(
        user_id=int(current_user.id),
        destination_name=_clean(getattr(current_user, "display_name", "")) or "Pending destination",
        bank_name="Pending bank",
        account_number="000000",
        phone_number=_clean(getattr(current_user, "phone_e164", "")) or None,
        country=None,
        currency="NGN",
        note=None,
        verification_status="recorded",
        verification_note="Destination placeholder created before full bank details were submitted.",
        verified_at=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/me")
def get_my_withdrawal_destination(
    clan_id: Optional[int] = Query(default=None),
    gmfn_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = (clan_id, gmfn_id)
    row = (
        db.query(UserPayoutDestination)
        .filter(UserPayoutDestination.user_id == int(current_user.id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No payout destination saved yet")
    return _payload(row)


@router.post("/me", status_code=status.HTTP_201_CREATED)
def create_my_withdrawal_destination(
    payload: WithdrawalDestinationIn,
    clan_id: Optional[int] = Query(default=None),
    gmfn_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = (clan_id, gmfn_id)
    existing = (
        db.query(UserPayoutDestination)
        .filter(UserPayoutDestination.user_id == int(current_user.id))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Payout destination already exists")

    verification_status, verification_note = _verification_summary(current_user)
    row = UserPayoutDestination(
        user_id=int(current_user.id),
        destination_name=_clean(payload.destination_name),
        bank_name=_clean(payload.bank_name),
        account_number=_normalize_account_number(payload.account_number),
        phone_number=_normalize_phone(payload.phone_number) or None,
        country=_clean(payload.country) or None,
        currency=_normalize_currency(payload.currency),
        note=_clean(payload.note) or None,
        verification_status=verification_status,
        verification_note=verification_note,
        verified_at=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _payload(row)


@router.patch("/me")
def update_my_withdrawal_destination(
    payload: WithdrawalDestinationIn,
    clan_id: Optional[int] = Query(default=None),
    gmfn_id: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = (clan_id, gmfn_id)
    row = _get_or_create_destination(db, current_user)
    verification_status, verification_note = _verification_summary(current_user)

    row.destination_name = _clean(payload.destination_name)
    row.bank_name = _clean(payload.bank_name)
    row.account_number = _normalize_account_number(payload.account_number)
    row.phone_number = _normalize_phone(payload.phone_number) or None
    row.country = _clean(payload.country) or None
    row.currency = _normalize_currency(payload.currency)
    row.note = _clean(payload.note) or None
    row.verification_status = verification_status
    row.verification_note = verification_note
    row.verified_at = None
    row.updated_at = _now()

    db.add(row)
    db.commit()
    db.refresh(row)
    return _payload(row)
