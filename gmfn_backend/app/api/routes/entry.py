from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.auth import (
    _create_founder_clan,
    _ensure_user_gmfn_id,
    _validate_founder_invite,
)
from app.db.database import get_db
from app.db.models import Clan, EntryPhoneVerification, User, UserPayoutDestination
from app.services.notification_service import create_notification
from app.services.trust_events_services import build_trust_meta, log_trust_event
from app.services.trust_score_service import apply_trust_score

router = APIRouter(prefix="/entry", tags=["entry"])


class EntryPhoneStartIn(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=120)
    phone_e164: str = Field(..., min_length=8, max_length=32)
    email: Optional[EmailStr] = None


class EntryPhoneStartOut(BaseModel):
    ok: bool
    verification_id: int
    phone_e164: str
    expires_at: str
    delivery_mode: str
    otp_preview: Optional[str] = None


class EntryPhoneConfirmIn(BaseModel):
    verification_id: int
    code: str = Field(..., min_length=4, max_length=12)


class EntryPhoneConfirmOut(BaseModel):
    ok: bool
    verification_id: int
    verified: bool
    display_name: str
    phone_e164: str
    email: Optional[EmailStr] = None


class EntryBankDetailsIn(BaseModel):
    verification_id: int = Field(..., gt=0)
    destination_name: str = Field(..., min_length=2, max_length=160)
    bank_name: str = Field(..., min_length=2, max_length=120)
    account_number: str = Field(..., min_length=6, max_length=64)
    phone_number: Optional[str] = Field(default=None, max_length=32)
    country: Optional[str] = Field(default=None, max_length=64)
    currency: Optional[str] = Field(default="NGN", max_length=8)
    note: Optional[str] = Field(default=None, max_length=500)
    driver_licence_number: Optional[str] = Field(default=None, max_length=120)
    driver_licence_country: Optional[str] = Field(default=None, max_length=64)
    driver_licence_note: Optional[str] = Field(default=None, max_length=500)


class EntryBankDetailsOut(BaseModel):
    ok: bool
    verification_id: int
    bank_details_recorded: bool
    verification_status: str
    verification_note: str


class CreateEntryIn(BaseModel):
    verification_id: int = Field(..., gt=0)
    display_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone_e164: Optional[str] = Field(default=None, min_length=8, max_length=32)
    email: Optional[EmailStr] = None
    clan_name: str = Field(..., min_length=2, max_length=80)
    clan_description: Optional[str] = Field(default=None, max_length=500)
    create_code: Optional[str] = Field(default=None, max_length=128)


class CreateEntryOut(BaseModel):
    ok: bool
    user_id: int
    gmfn_id: str
    display_name: str
    nickname: str
    phone_e164: str
    email: EmailStr
    clan_id: int
    clan_name: str
    membership_role: str
    next_step: str


def _clean_text(value: object, *, upper: bool = False) -> str:
    text = str(value or "").strip()
    return text.upper() if upper else text


def _normalize_phone(phone: str) -> str:
    raw = _clean_text(phone)
    if not raw:
        raise HTTPException(status_code=400, detail="Phone number is required")

    compact = raw.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if compact.startswith("00"):
        compact = f"+{compact[2:]}"
    elif compact and not compact.startswith("+"):
        compact = f"+{compact}"

    if not compact.startswith("+") or len(compact) < 8:
        raise HTTPException(
            status_code=400,
            detail="Phone number must include country code, for example +234...",
        )

    if not compact[1:].isdigit():
        raise HTTPException(
            status_code=400,
            detail="Phone number can contain only digits after the country code",
        )

    return compact


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _dev_mode() -> bool:
    return str(os.getenv("GMFN_DEV_MODE") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _generate_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _verification_expired(row: EntryPhoneVerification) -> bool:
    expires_at = _utc_aware(row.expires_at)
    return bool(expires_at and expires_at < _now())


def _founder_email(*, payload_email: Optional[str], phone_e164: str) -> str:
    email = _clean_text(payload_email).lower()
    if email:
        return email

    digits = "".join(ch for ch in phone_e164 if ch.isdigit())
    if not digits:
        raise HTTPException(status_code=400, detail="A usable phone number is required")

    return f"{digits}@founder-entry.gsnmail.app"


def _normalize_account_number(value: object) -> str:
    raw = _clean_text(value).replace(" ", "")
    if len(raw) < 6:
        raise HTTPException(status_code=400, detail="Account number is too short")
    return raw


def _bank_status_note() -> tuple[str, str]:
    return (
        "phone_verified_bank_recorded",
        "Bank destination is now recorded server-side and tied to a verified phone. External bank-rail verification is not yet connected in this repo.",
    )


@router.post("/phone/start", response_model=EntryPhoneStartOut, status_code=status.HTTP_201_CREATED)
def start_entry_phone_verification(payload: EntryPhoneStartIn, db: Session = Depends(get_db)):
    display_name = _clean_text(payload.display_name)
    if not display_name:
        raise HTTPException(status_code=400, detail="Street name or nickname is required")

    phone_e164 = _normalize_phone(payload.phone_e164)
    email = _clean_text(payload.email).lower() or None

    phone_clash = db.query(User).filter(User.phone_e164 == phone_e164).first()
    if phone_clash:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    verification = EntryPhoneVerification(
        display_name=display_name,
        phone_e164=phone_e164,
        email=email,
        code=_generate_code(),
        expires_at=_now() + timedelta(minutes=10),
        verified_at=None,
        consumed_at=None,
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    return {
        "ok": True,
        "verification_id": int(verification.id),
        "phone_e164": phone_e164,
        "expires_at": verification.expires_at.isoformat(),
        "delivery_mode": "preview" if _dev_mode() else "pending-sms",
        "otp_preview": verification.code if _dev_mode() else None,
    }


@router.post("/phone/confirm", response_model=EntryPhoneConfirmOut)
def confirm_entry_phone_verification(
    payload: EntryPhoneConfirmIn,
    db: Session = Depends(get_db),
):
    row = (
        db.query(EntryPhoneVerification)
        .filter(EntryPhoneVerification.id == int(payload.verification_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Phone verification session not found")

    if row.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Phone verification session has already been used")

    if _verification_expired(row):
        raise HTTPException(status_code=400, detail="Phone verification code has expired")

    if _clean_text(payload.code) != str(row.code):
        raise HTTPException(status_code=400, detail="Verification code is not correct")

    row.verified_at = _now()
    db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "ok": True,
        "verification_id": int(row.id),
        "verified": True,
        "display_name": row.display_name,
        "phone_e164": row.phone_e164,
        "email": row.email,
    }


@router.post("/bank-details", response_model=EntryBankDetailsOut)
def save_entry_bank_details(
    payload: EntryBankDetailsIn,
    db: Session = Depends(get_db),
):
    row = (
        db.query(EntryPhoneVerification)
        .filter(EntryPhoneVerification.id == int(payload.verification_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Verified phone session not found")

    if row.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Verified phone session has already been used")

    if _verification_expired(row):
        raise HTTPException(status_code=400, detail="Verified phone session has expired")

    if row.verified_at is None:
        raise HTTPException(status_code=400, detail="Phone verification must be completed first")

    row.bank_account_name = _clean_text(payload.destination_name)
    row.bank_name = _clean_text(payload.bank_name)
    row.bank_account_number = _normalize_account_number(payload.account_number)
    row.bank_phone_number = _normalize_phone(payload.phone_number or row.phone_e164)
    row.bank_country = _clean_text(payload.country) or None
    row.bank_currency = _clean_text(payload.currency, upper=True) or "NGN"
    row.bank_note = _clean_text(payload.note) or None
    row.bank_details_recorded_at = _now()
    row.driver_licence_number = _clean_text(payload.driver_licence_number) or None
    row.driver_licence_country = _clean_text(payload.driver_licence_country) or None
    row.driver_licence_note = _clean_text(payload.driver_licence_note) or None
    row.driver_licence_recorded_at = _now() if row.driver_licence_number else None

    db.add(row)
    db.commit()
    db.refresh(row)

    verification_status, verification_note = _bank_status_note()

    return {
        "ok": True,
        "verification_id": int(row.id),
        "bank_details_recorded": True,
        "verification_status": verification_status,
        "verification_note": verification_note,
    }


@router.post("/create", response_model=CreateEntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(payload: CreateEntryIn, db: Session = Depends(get_db)):
    verification = (
        db.query(EntryPhoneVerification)
        .filter(EntryPhoneVerification.id == int(payload.verification_id))
        .first()
    )
    if not verification:
        raise HTTPException(status_code=404, detail="Verified phone session not found")

    if verification.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Verified phone session has already been used")

    if _verification_expired(verification):
        raise HTTPException(status_code=400, detail="Verified phone session has expired")

    if verification.verified_at is None:
        raise HTTPException(status_code=400, detail="Phone verification must be completed first")
    if verification.bank_details_recorded_at is None:
        raise HTTPException(status_code=400, detail="Bank details must be completed before community creation")

    display_name = verification.display_name
    phone_e164 = verification.phone_e164
    email = _founder_email(payload_email=verification.email or payload.email, phone_e164=phone_e164)
    create_code = _clean_text(payload.create_code)

    invite = _validate_founder_invite(db, create_code) if create_code else None

    phone_clash = db.query(User).filter(User.phone_e164 == phone_e164).first()
    if phone_clash:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    email_clash = db.query(User).filter(User.email == email).first()
    if email_clash:
        raise HTTPException(status_code=400, detail="Email already registered")

    clan_name = _clean_text(payload.clan_name)
    if db.query(Clan).filter(Clan.name == clan_name).first():
        raise HTTPException(status_code=400, detail="Clan name already exists")

    user = User(
        email=email,
        hashed_password="PENDING_APPROVAL",
        role="admin",
        display_name=display_name,
        phone_e164=phone_e164,
        phone_verified_at=verification.verified_at,
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Founder identity already exists")

    db.refresh(user)
    user = _ensure_user_gmfn_id(db, user)

    clan, membership_role = _create_founder_clan(
        db,
        current_user=user,
        clan_name=clan_name,
        clan_description=_clean_text(payload.clan_description) or None,
    )

    if invite is not None:
        invite.uses = int(invite.uses or 0) + 1
        if invite.max_uses is not None and invite.uses >= int(invite.max_uses):
            invite.is_active = False
        db.add(invite)

    payout_status, payout_note = _bank_status_note()
    payout = UserPayoutDestination(
        user_id=int(user.id),
        destination_name=_clean_text(verification.bank_account_name) or display_name,
        bank_name=_clean_text(verification.bank_name),
        account_number=_normalize_account_number(verification.bank_account_number),
        phone_number=_normalize_phone(verification.bank_phone_number or phone_e164) or None,
        country=_clean_text(verification.bank_country) or None,
        currency=_clean_text(verification.bank_currency, upper=True) or "NGN",
        note=_clean_text(verification.bank_note) or None,
        verification_status=payout_status,
        verification_note=payout_note,
        verified_at=None,
    )
    db.add(payout)

    phone_event_meta = build_trust_meta(
        reason="verified_phone_attached_at_registration",
        note="Founder phone verification completed before community creation.",
        system=True,
        extra={
            "verification_source": "entry.phone.confirm",
            "phone_e164": phone_e164,
        },
    )
    log_trust_event(
        db,
        event_type="identity.phone_verified",
        clan_id=int(clan.id),
        actor_user_id=int(user.id),
        subject_user_id=int(user.id),
        meta=phone_event_meta,
        dedupe_key=f"entry:{int(verification.id)}:user:{int(user.id)}:phone",
        commit=False,
        refresh=False,
    )

    bank_event_meta = build_trust_meta(
        reason="bank_destination_recorded_at_registration",
        note="Founder bank destination was recorded server-side during onboarding.",
        system=True,
        extra={
            "bank_name": payout.bank_name,
            "currency": payout.currency,
            "verification_status": payout.verification_status,
        },
    )
    log_trust_event(
        db,
        event_type="identity.bank_destination_recorded",
        clan_id=int(clan.id),
        actor_user_id=int(user.id),
        subject_user_id=int(user.id),
        meta=bank_event_meta,
        dedupe_key=f"entry:{int(verification.id)}:user:{int(user.id)}:bank",
        commit=False,
        refresh=False,
    )

    if _clean_text(verification.driver_licence_number):
        licence_event_meta = build_trust_meta(
            reason="drivers_licence_recorded_at_registration",
            note="Founder provided an optional driver's licence reference during onboarding.",
            system=True,
            extra={
                "driver_licence_country": _clean_text(verification.driver_licence_country) or None,
                "driver_licence_last4": _clean_text(verification.driver_licence_number)[-4:],
            },
        )
        log_trust_event(
            db,
            event_type="identity.drivers_licence_recorded",
            clan_id=int(clan.id),
            actor_user_id=int(user.id),
            subject_user_id=int(user.id),
            meta=licence_event_meta,
            dedupe_key=f"entry:{int(verification.id)}:user:{int(user.id)}:licence",
            commit=False,
            refresh=False,
        )
    verification.consumed_at = _now()
    db.add(verification)
    db.commit()

    trust_out = apply_trust_score(db, user_id=int(user.id))
    starter_summary = trust_out.get("starter_proof_summary", {}) if isinstance(trust_out, dict) else {}
    proof_bits = []
    if starter_summary.get("phone_verified"):
        proof_bits.append("verified phone")
    if starter_summary.get("bank_recorded"):
        proof_bits.append("bank destination")
    if starter_summary.get("drivers_licence_recorded"):
        proof_bits.append("driver's licence")

    proof_text = ", ".join(proof_bits) if proof_bits else "starter identity proofs"
    score_text = _clean_text(
        trust_out.get("standing_score")
        or trust_out.get("score")
        or trust_out.get("trust_score")
        or "0.00"
    )

    create_notification(
        db,
        user_id=int(user.id),
        kind="trust.onboarding",
        title="Starter trust has been established",
        message=(
            f"Your current starter trust reflects your {proof_text}. "
            f"Current trust score: {score_text}. Open Trust or CCI to see why this score was given and what can strengthen it next."
        ),
        action_url="/app/trust",
        action_label="Review Trust",
    )

    return {
        "ok": True,
        "user_id": int(user.id),
        "gmfn_id": str(user.gmfn_id),
        "display_name": display_name,
        "nickname": display_name,
        "phone_e164": phone_e164,
        "email": email,
        "clan_id": int(clan.id),
        "clan_name": clan.name,
        "membership_role": membership_role,
        "next_step": "activate-membership",
    }
