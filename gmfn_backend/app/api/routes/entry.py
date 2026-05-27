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
    _is_user_approved_somewhere,
    _validate_founder_invite,
)
from app.core.security import create_access_token, get_password_hash
from app.core.auth import is_user_activation_pending
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanJoinRequest,
    ClanMembership,
    EntryPhoneVerification,
    User,
    UserPayoutDestination,
)
from app.db.verification_models import IdentityVerificationCheck
from app.services.notification_service import create_notification
from app.services.trust_events_services import build_trust_meta, log_trust_event
from app.services.trust_score_service import apply_trust_score

router = APIRouter(prefix="/entry", tags=["entry"])


class EntryPhoneStartIn(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=120)
    phone_e164: str = Field(..., min_length=8, max_length=32)
    email: Optional[EmailStr] = None
    browser_locale: Optional[str] = Field(default=None, max_length=32)
    browser_timezone: Optional[str] = Field(default=None, max_length=64)


class EntryPhoneStartOut(BaseModel):
    ok: bool
    verification_id: int
    phone_e164: str
    expires_at: str
    delivery_mode: str
    otp_preview: Optional[str] = None
    verified: bool = False
    registered_only: bool = False
    verified_at: Optional[str] = None
    bank_details_recorded: bool = False
    confirmation_message: Optional[str] = None


class EntryPhoneConfirmIn(BaseModel):
    verification_id: int
    code: str = Field(..., min_length=4, max_length=12)


class EntryTrustEventResponse(BaseModel):
    event_type: str
    status: str
    message: str


class EntryPhoneConfirmOut(BaseModel):
    ok: bool
    verification_id: int
    verified: bool
    verified_at: str
    display_name: str
    phone_e164: str
    email: Optional[EmailStr] = None
    confirmation_message: str
    trust_event_response: EntryTrustEventResponse


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
    confirmation_message: str
    trust_event_response: EntryTrustEventResponse
    region_consistency_status: Optional[str] = None
    phone_country_hint: Optional[str] = None
    locale_country_hint: Optional[str] = None


class CreateEntryIn(BaseModel):
    verification_id: int = Field(..., gt=0)
    display_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    phone_e164: Optional[str] = Field(default=None, min_length=8, max_length=32)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6, max_length=128)
    confirm_password: Optional[str] = Field(default=None, min_length=6, max_length=128)
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
    access_token: Optional[str] = None
    token_type: Optional[str] = None


def _entry_duplicate_identity_error(
    *,
    db: Session,
    user: User,
    field_label: str,
) -> HTTPException:
    gmfn_id = _clean_text(getattr(user, "gmfn_id", ""), upper=True)
    approved = _is_user_approved_somewhere(db, user)

    if is_user_activation_pending(user) and approved:
        activation_path = (
            f"/activate-membership?gmfn_id={gmfn_id}" if gmfn_id else "/activate-membership"
        )
        return HTTPException(
            status_code=409,
            detail={
                "code": "entry_activation_pending",
                "message": (
                    f"This {field_label} is already attached to an unfinished GSN entry. "
                    "The community was created, but the account still needs membership activation before sign-in will work."
                ),
                "next_action": "activate_membership",
                "next_action_label": "Activate membership",
                "activation_path": activation_path,
                "gmfn_id": gmfn_id or None,
            },
        )

    if is_user_activation_pending(user):
        return HTTPException(
            status_code=409,
            detail={
                "code": "entry_pending_admin_review",
                "message": (
                    f"This {field_label} is already attached to a pending GSN identity. "
                    "Ask the community helper to review the intake record before starting again."
                ),
                "next_action": "admin_review",
                "next_action_label": "Ask community helper to review",
                "gmfn_id": gmfn_id or None,
            },
        )

    return HTTPException(
        status_code=400,
        detail=f"{field_label.capitalize()} already registered",
    )


def _clean_text(value: object, *, upper: bool = False) -> str:
    text = str(value or "").strip()
    return text.upper() if upper else text


def _pending_user_has_live_entry_path(db: Session, user: User) -> bool:
    user_id = int(user.id or 0)
    if user_id <= 0:
        return False

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == user_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if membership is not None:
        return True

    join_request = (
        db.query(ClanJoinRequest)
        .filter(ClanJoinRequest.applicant_user_id == user_id)
        .first()
    )
    if join_request is not None:
        return True

    created_clan = db.query(Clan).filter(Clan.created_by_user_id == user_id).first()
    return created_clan is not None


def _release_abandoned_pending_identity(
    *,
    db: Session,
    user: User,
    reason: str,
) -> bool:
    """Release phone/email from a half-created entry user that has no live path."""

    if not is_user_activation_pending(user):
        return False
    if _pending_user_has_live_entry_path(db, user):
        return False

    user_id = int(user.id or 0)
    if user_id <= 0:
        return False

    stamp = int(_now().timestamp())
    suffix = secrets.token_hex(4)
    user.email = f"abandoned-entry-{user_id}-{stamp}-{suffix}@abandoned.gsnmail.app"
    user.phone_e164 = None
    user.phone_verified_at = None
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return False
    db.refresh(user)
    return True


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


def _entry_otp_preview_enabled() -> bool:
    return _entry_phone_delivery_mode() == "preview"


def _entry_phone_delivery_mode() -> str:
    configured = str(os.getenv("GMFN_ENTRY_PHONE_DELIVERY") or "").strip().lower()
    if configured in {"sms", "live", "provider", "pending-sms"}:
        return "pending-sms"
    if configured in {"preview", "pilot", "manual"} or _dev_mode():
        return "preview"
    return "registration-only"


def _entry_phone_registration_only_enabled() -> bool:
    return _entry_phone_delivery_mode() == "registration-only"


def _entry_phone_session_minutes(*, preview_enabled: bool) -> int:
    configured = str(os.getenv("GMFN_ENTRY_PHONE_SESSION_MINUTES") or "").strip()
    fallback = 24 * 60 if preview_enabled else 10

    if not configured:
        return fallback

    try:
        minutes = int(configured)
    except ValueError:
        return fallback

    return max(10, min(minutes, 24 * 60))


def _generate_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"


def _phone_confirmation_message(row: EntryPhoneVerification) -> str:
    return (
        f"{row.display_name}, your phone has been successfully linked to your name. "
        "GSN will use it to protect your onboarding record as you continue."
    )


def _phone_registration_only_message(row: EntryPhoneVerification) -> str:
    return (
        f"{row.display_name}, this phone number has been registered against your name for controlled testing. "
        "SMS ownership verification is suspended for now and can be re-enabled when the SMS rail is paid for."
    )


def _find_resumable_entry_phone_session(
    *,
    db: Session,
    phone_e164: str,
    display_name: str,
    email: Optional[str],
) -> Optional[EntryPhoneVerification]:
    normalized_email = _clean_text(email).lower()
    normalized_name = _clean_text(display_name).lower()
    candidates = (
        db.query(EntryPhoneVerification)
        .filter(
            EntryPhoneVerification.phone_e164 == phone_e164,
            EntryPhoneVerification.consumed_at.is_(None),
        )
        .order_by(EntryPhoneVerification.id.desc())
        .limit(8)
        .all()
    )

    for row in candidates:
        if _verification_expired(row):
            continue

        row_email = _clean_text(row.email).lower()
        row_name = _clean_text(row.display_name).lower()
        email_matches = bool(normalized_email and row_email == normalized_email)
        name_matches = bool(normalized_name and row_name == normalized_name)

        if row_email and normalized_email and row_email != normalized_email and not name_matches:
            continue
        if row_email and not normalized_email and not name_matches:
            continue
        if row_email and not email_matches and not name_matches:
            continue
        if not row_email and not name_matches:
            continue

        return row

    return None


PHONE_COUNTRY_HINTS: list[tuple[str, str]] = [
    ("+234", "NG"),
    ("+233", "GH"),
    ("+254", "KE"),
    ("+256", "UG"),
    ("+255", "TZ"),
    ("+27", "ZA"),
    ("+44", "GB"),
    ("+353", "IE"),
    ("+1", "NANP"),
    ("+49", "DE"),
    ("+33", "FR"),
    ("+39", "IT"),
    ("+31", "NL"),
    ("+351", "PT"),
    ("+34", "ES"),
    ("+61", "AU"),
    ("+91", "IN"),
]


COUNTRY_ALIASES = {
    "UK": "GB",
    "UNITED KINGDOM": "GB",
    "GREAT BRITAIN": "GB",
    "BRITAIN": "GB",
    "ENGLAND": "GB",
    "SCOTLAND": "GB",
    "WALES": "GB",
    "NORTHERN IRELAND": "GB",
    "NIGERIA": "NG",
    "GHANA": "GH",
    "KENYA": "KE",
    "UGANDA": "UG",
    "TANZANIA": "TZ",
    "SOUTH AFRICA": "ZA",
    "UNITED STATES": "US",
    "USA": "US",
    "AMERICA": "US",
    "CANADA": "CA",
    "GERMANY": "DE",
    "FRANCE": "FR",
    "ITALY": "IT",
    "NETHERLANDS": "NL",
    "PORTUGAL": "PT",
    "SPAIN": "ES",
    "AUSTRALIA": "AU",
    "INDIA": "IN",
    "IRELAND": "IE",
}


def _utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _normalize_country_hint(value: object) -> Optional[str]:
    raw = _clean_text(value, upper=True)
    if not raw:
        return None

    compact = raw.replace("-", " ").replace("_", " ")
    if compact in COUNTRY_ALIASES:
        return COUNTRY_ALIASES[compact]

    if len(raw) == 2 and raw.isalpha():
        return raw

    return None


def _infer_phone_country(phone_e164: str) -> Optional[str]:
    phone = _clean_text(phone_e164)
    for prefix, country in sorted(PHONE_COUNTRY_HINTS, key=lambda item: len(item[0]), reverse=True):
        if phone.startswith(prefix):
            return country
    return None


def _infer_locale_country(locale: object) -> Optional[str]:
    raw = _clean_text(locale)
    if not raw:
        return None

    normalized = raw.replace("_", "-")
    parts = [part for part in normalized.split("-") if part]
    if len(parts) >= 2:
        return _normalize_country_hint(parts[-1])

    return _normalize_country_hint(normalized)


def _evaluate_region_consistency(
    *,
    phone_country: Optional[str],
    bank_country: Optional[str],
    locale_country: Optional[str],
    driver_country: Optional[str],
    explanation_note: Optional[str],
) -> tuple[str, str]:
    note = _clean_text(explanation_note)
    if phone_country and bank_country:
        if phone_country == bank_country:
            base = f"Phone region ({phone_country}) and bank region ({bank_country}) align."
            if locale_country and locale_country not in {phone_country, bank_country}:
                base += f" Browser locale suggests {locale_country}, so that signal was recorded without blocking you."
            if driver_country and driver_country not in {phone_country, bank_country}:
                base += f" Driver's licence country {driver_country} was also recorded."
            return ("matched", base)

        if note:
            return (
                "explained_mismatch",
                f"Phone region ({phone_country}) and bank region ({bank_country}) differ. Your explanation was recorded for trust review.",
            )

        raise HTTPException(
            status_code=400,
            detail=(
                f"Phone region ({phone_country}) and bank region ({bank_country}) do not match yet. "
                "Add a short explanation in the note field before continuing."
            ),
        )

    if bank_country or phone_country or locale_country or driver_country:
        return (
            "partial",
            "Some region evidence was recorded, but the system could not confirm a full phone-to-bank region match yet.",
        )

    return (
        "unknown",
        "No usable region evidence was supplied beyond the core onboarding records.",
    )


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


def _bank_status_note(region_status: Optional[str]) -> tuple[str, str]:
    if region_status == "matched":
        return (
            "phone_verified_bank_recorded_region_matched",
            "Bank destination is now recorded server-side, tied to a verified phone, and its declared region aligns with the phone region. External bank-rail verification is not yet connected in this repo.",
        )

    if region_status == "explained_mismatch":
        return (
            "phone_verified_bank_recorded_region_explained",
            "Bank destination is now recorded server-side and tied to a verified phone. The phone and bank regions differ, and your explanation was recorded for trust review. External bank-rail verification is not yet connected in this repo.",
        )

    if region_status == "partial":
        return (
            "phone_verified_bank_recorded_region_partial",
            "Bank destination is now recorded server-side and tied to a verified phone, but region evidence is still partial. External bank-rail verification is not yet connected in this repo.",
        )

    return (
        "phone_verified_bank_recorded",
        "Bank destination is now recorded server-side and tied to a verified phone. External bank-rail verification is not yet connected in this repo.",
    )


def _verification_status_label(status: object) -> str:
    text = _clean_text(status).lower()
    if not text:
        return "recorded"
    return text.replace("_", " ")


def _verification_event_type(verification_type: object) -> str:
    vt = _clean_text(verification_type).lower()
    if vt == "bank":
        return "identity.bank_verification_checked"
    if vt == "drivers_licence":
        return "identity.drivers_licence_verification_checked"
    return "identity.verification_checked"


def _verification_summary_line(check: IdentityVerificationCheck) -> str:
    subject = "Bank details" if _clean_text(check.verification_type).lower() == "bank" else "Driver's licence"
    explanation = _clean_text(check.explanation)
    base = f"{subject}: {_verification_status_label(check.status)}."
    if explanation:
        return f"{base} {explanation}"
    return base


@router.post("/phone/start", response_model=EntryPhoneStartOut, status_code=status.HTTP_201_CREATED)
def start_entry_phone_verification(payload: EntryPhoneStartIn, db: Session = Depends(get_db)):
    display_name = _clean_text(payload.display_name)
    if not display_name:
        raise HTTPException(status_code=400, detail="Street name or nickname is required")

    phone_e164 = _normalize_phone(payload.phone_e164)
    email = _clean_text(payload.email).lower() or None
    browser_locale = _clean_text(payload.browser_locale) or None
    browser_timezone = _clean_text(payload.browser_timezone) or None
    phone_country_hint = _infer_phone_country(phone_e164)
    locale_country_hint = _infer_locale_country(browser_locale)

    phone_clash = db.query(User).filter(User.phone_e164 == phone_e164).first()
    if phone_clash:
        released = _release_abandoned_pending_identity(
            db=db,
            user=phone_clash,
            reason="entry_phone_start_reuse",
        )
        if released:
            phone_clash = None
    if phone_clash:
        raise _entry_duplicate_identity_error(
            db=db,
            user=phone_clash,
            field_label="phone number",
        )

    delivery_mode = _entry_phone_delivery_mode()
    preview_enabled = delivery_mode == "preview"
    registration_only = delivery_mode == "registration-only"
    resumable = _find_resumable_entry_phone_session(
        db=db,
        phone_e164=phone_e164,
        display_name=display_name,
        email=email,
    )

    if resumable is not None:
        if email and not _clean_text(resumable.email):
            resumable.email = email
        if browser_locale:
            resumable.browser_locale = browser_locale
            resumable.locale_country_hint = _infer_locale_country(browser_locale)
        if browser_timezone:
            resumable.browser_timezone = browser_timezone

        resumable.expires_at = _now() + timedelta(
            minutes=_entry_phone_session_minutes(preview_enabled=preview_enabled)
        )
        db.add(resumable)
        db.commit()
        db.refresh(resumable)

        verified_at = _utc_aware(resumable.verified_at)
        is_verified = verified_at is not None
        return {
            "ok": True,
            "verification_id": int(resumable.id),
            "phone_e164": resumable.phone_e164,
            "expires_at": resumable.expires_at.isoformat(),
            "delivery_mode": delivery_mode,
            "otp_preview": resumable.code if preview_enabled and not is_verified else None,
            "verified": is_verified,
            "registered_only": registration_only and not is_verified,
            "verified_at": verified_at.isoformat() if verified_at else None,
            "bank_details_recorded": resumable.bank_details_recorded_at is not None,
            "confirmation_message": (
                "GSN found your unfinished entry record and reopened it so you can continue."
                if not is_verified and not registration_only
                else _phone_registration_only_message(resumable)
                if not is_verified and registration_only
                else _phone_confirmation_message(resumable)
            ),
        }

    verification = EntryPhoneVerification(
        display_name=display_name,
        phone_e164=phone_e164,
        email=email,
        browser_locale=browser_locale,
        browser_timezone=browser_timezone,
        phone_country_hint=phone_country_hint,
        locale_country_hint=locale_country_hint,
        code=_generate_code(),
        expires_at=_now()
        + timedelta(minutes=_entry_phone_session_minutes(preview_enabled=preview_enabled)),
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
        "delivery_mode": delivery_mode,
        "otp_preview": verification.code if preview_enabled else None,
        "registered_only": registration_only,
        "confirmation_message": _phone_registration_only_message(verification)
        if registration_only
        else None,
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

    verified_at = _now()
    row.verified_at = verified_at
    db.add(row)
    db.commit()
    db.refresh(row)

    confirmation_message = _phone_confirmation_message(row)

    return {
        "ok": True,
        "verification_id": int(row.id),
        "verified": True,
        "verified_at": verified_at.isoformat(),
        "display_name": row.display_name,
        "phone_e164": row.phone_e164,
        "email": row.email,
        "confirmation_message": confirmation_message,
        "trust_event_response": {
            "event_type": "identity.phone_verified",
            "status": "ready_for_registration",
            "message": (
                "Phone proof is ready. When you finish creating the community, "
                "GSN will write this as a permanent trust event on your record."
            ),
        },
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

    registration_only = _entry_phone_registration_only_enabled()
    if row.verified_at is None and not registration_only:
        raise HTTPException(status_code=400, detail="Phone verification must be completed first")

    bank_country = _normalize_country_hint(payload.country)
    driver_country = _normalize_country_hint(payload.driver_licence_country)
    locale_country = _normalize_country_hint(row.locale_country_hint)
    phone_country = _normalize_country_hint(row.phone_country_hint) or _infer_phone_country(
        row.phone_e164
    )
    region_consistency_status, region_consistency_note = _evaluate_region_consistency(
        phone_country=phone_country,
        bank_country=bank_country,
        locale_country=locale_country,
        driver_country=driver_country,
        explanation_note=payload.note,
    )

    row.bank_account_name = _clean_text(payload.destination_name)
    row.bank_name = _clean_text(payload.bank_name)
    row.bank_account_number = _normalize_account_number(payload.account_number)
    row.bank_phone_number = _normalize_phone(payload.phone_number or row.phone_e164)
    row.bank_country = bank_country
    row.bank_currency = _clean_text(payload.currency, upper=True) or "NGN"
    row.bank_note = _clean_text(payload.note) or None
    row.bank_details_recorded_at = _now()
    row.driver_licence_number = _clean_text(payload.driver_licence_number) or None
    row.driver_licence_country = driver_country
    row.driver_licence_note = _clean_text(payload.driver_licence_note) or None
    row.driver_licence_recorded_at = _now() if row.driver_licence_number else None
    row.region_consistency_status = region_consistency_status
    row.region_consistency_note = region_consistency_note
    row.phone_country_hint = phone_country
    row.locale_country_hint = locale_country

    db.add(row)
    db.commit()
    db.refresh(row)

    if row.verified_at is None:
        verification_status, verification_note = (
            "phone_registered_bank_recorded_sms_suspended",
            "Bank destination is recorded server-side and tied to a registered phone number. SMS phone ownership verification is suspended for controlled testing.",
        )
    else:
        verification_status, verification_note = _bank_status_note(region_consistency_status)
    confirmation_message = (
        "Your bank or wallet destination has been recorded against this phone registration session. "
        "SMS ownership verification is suspended for controlled testing and can be completed later."
        if row.verified_at is None
        else (
            "Your bank or wallet destination has been recorded against this verified phone session. "
            "GSN will attach this proof to your starter trust record when community creation is completed."
        )
    )

    return {
        "ok": True,
        "verification_id": int(row.id),
        "bank_details_recorded": True,
        "verification_status": verification_status,
        "verification_note": verification_note,
        "confirmation_message": confirmation_message,
        "trust_event_response": {
            "event_type": "identity.bank_destination_recorded",
            "status": "ready_for_registration",
            "message": (
                "Bank or wallet proof is ready. When you finish creating the community, "
                "GSN will write this as permanent starter trust evidence. External bank ownership verification remains a separate future rail."
            ),
        },
        "region_consistency_status": region_consistency_status,
        "phone_country_hint": phone_country,
        "locale_country_hint": locale_country,
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

    registration_only = _entry_phone_registration_only_enabled()
    if verification.verified_at is None and not registration_only:
        raise HTTPException(status_code=400, detail="Phone verification must be completed first")
    if verification.bank_details_recorded_at is None:
        raise HTTPException(status_code=400, detail="Bank details must be completed before community creation")

    display_name = verification.display_name
    phone_e164 = verification.phone_e164
    email = _founder_email(payload_email=verification.email or payload.email, phone_e164=phone_e164)
    create_code = _clean_text(payload.create_code)
    password = _clean_text(payload.password)
    confirm_password = _clean_text(payload.confirm_password)

    has_entry_password = bool(password or confirm_password)
    if has_entry_password:
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        if password != confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

    invite = _validate_founder_invite(db, create_code) if create_code else None

    phone_clash = db.query(User).filter(User.phone_e164 == phone_e164).first()
    if phone_clash:
        released = _release_abandoned_pending_identity(
            db=db,
            user=phone_clash,
            reason="entry_create_phone_reuse",
        )
        if released:
            phone_clash = None
    if phone_clash:
        raise _entry_duplicate_identity_error(
            db=db,
            user=phone_clash,
            field_label="phone number",
        )

    email_clash = db.query(User).filter(User.email == email).first()
    if email_clash:
        released = _release_abandoned_pending_identity(
            db=db,
            user=email_clash,
            reason="entry_create_email_reuse",
        )
        if released:
            email_clash = None
    if email_clash:
        raise _entry_duplicate_identity_error(
            db=db,
            user=email_clash,
            field_label="email",
        )

    clan_name = _clean_text(payload.clan_name)
    if db.query(Clan).filter(Clan.name == clan_name).first():
        raise HTTPException(status_code=400, detail="Clan name already exists")

    user = User(
        email=email,
        hashed_password=get_password_hash(password) if has_entry_password else "PENDING_APPROVAL",
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

    if verification.verified_at is None:
        payout_status, payout_note = (
            "phone_registered_bank_recorded_sms_suspended",
            "Bank destination is recorded server-side and tied to a registered phone number. SMS phone ownership verification is suspended for controlled testing.",
        )
    else:
        payout_status, payout_note = _bank_status_note(verification.region_consistency_status)
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
        phone_country_hint=_clean_text(verification.phone_country_hint, upper=True) or None,
        locale_country_hint=_clean_text(verification.locale_country_hint, upper=True) or None,
        region_consistency_status=_clean_text(verification.region_consistency_status) or None,
        region_consistency_note=_clean_text(verification.region_consistency_note) or None,
        verified_at=None,
    )
    db.add(payout)

    verification_checks = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.entry_phone_verification_id == int(verification.id))
        .order_by(IdentityVerificationCheck.created_at.asc(), IdentityVerificationCheck.id.asc())
        .all()
    )

    verification_summary_lines: list[str] = []
    for check in verification_checks:
        check.user_id = int(user.id)
        db.add(check)
        verification_summary_lines.append(_verification_summary_line(check))

        verification_meta = build_trust_meta(
            reason="identity_verification_check_recorded_at_registration",
            note=_clean_text(check.explanation) or "A verification result was recorded during onboarding.",
            system=True,
            extra={
                "verification_check_id": int(check.id),
                "verification_type": _clean_text(check.verification_type),
                "verification_status": _clean_text(check.status),
                "provider_key": _clean_text(check.provider_key) or None,
                "region_code": _clean_text(check.region_code, upper=True) or None,
                "confidence_score": check.confidence_score,
            },
        )
        log_trust_event(
            db,
            event_type=_verification_event_type(check.verification_type),
            clan_id=int(clan.id),
            actor_user_id=int(user.id),
            subject_user_id=int(user.id),
            meta=verification_meta,
            dedupe_key=f"entry:verification-check:{int(check.id)}",
            commit=False,
            refresh=False,
        )

    phone_event_meta = build_trust_meta(
        reason=(
            "entry_phone_registered_sms_suspended"
            if verification.verified_at is None
            else "verified_phone_attached_at_registration"
        ),
        note=(
            "Founder phone number was registered before community creation while SMS verification was suspended for controlled testing."
            if verification.verified_at is None
            else "Founder phone verification completed before community creation."
        ),
        system=True,
        extra={
            "verification_source": (
                "entry.phone.registration_only"
                if verification.verified_at is None
                else "entry.phone.confirm"
            ),
            "phone_e164": phone_e164,
            "sms_suspended": verification.verified_at is None,
        },
    )
    log_trust_event(
        db,
        event_type=(
            "identity.phone_registered"
            if verification.verified_at is None
            else "identity.phone_verified"
        ),
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

    if _clean_text(verification.region_consistency_status) == "matched":
        region_event_meta = build_trust_meta(
            reason="region_consistency_confirmed_at_registration",
            note=_clean_text(verification.region_consistency_note) or "Phone and bank region evidence aligned at onboarding.",
            system=True,
            extra={
                "phone_country_hint": _clean_text(verification.phone_country_hint, upper=True) or None,
                "bank_country": _clean_text(verification.bank_country, upper=True) or None,
                "locale_country_hint": _clean_text(verification.locale_country_hint, upper=True) or None,
                "browser_timezone": _clean_text(verification.browser_timezone) or None,
            },
        )
        log_trust_event(
            db,
            event_type="identity.region_consistent",
            clan_id=int(clan.id),
            actor_user_id=int(user.id),
            subject_user_id=int(user.id),
            meta=region_event_meta,
            dedupe_key=f"entry:{int(verification.id)}:user:{int(user.id)}:region-matched",
            commit=False,
            refresh=False,
        )
    elif _clean_text(verification.region_consistency_status) == "explained_mismatch":
        region_event_meta = build_trust_meta(
            reason="cross_region_onboarding_explained",
            note=_clean_text(verification.region_consistency_note) or "Cross-region onboarding explanation was recorded.",
            system=True,
            extra={
                "phone_country_hint": _clean_text(verification.phone_country_hint, upper=True) or None,
                "bank_country": _clean_text(verification.bank_country, upper=True) or None,
                "locale_country_hint": _clean_text(verification.locale_country_hint, upper=True) or None,
                "browser_timezone": _clean_text(verification.browser_timezone) or None,
            },
        )
        log_trust_event(
            db,
            event_type="identity.region_mismatch_explained",
            clan_id=int(clan.id),
            actor_user_id=int(user.id),
            subject_user_id=int(user.id),
            meta=region_event_meta,
            dedupe_key=f"entry:{int(verification.id)}:user:{int(user.id)}:region-explained",
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
    if starter_summary.get("region_consistent"):
        proof_bits.append("matched region signals")

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

    if verification_summary_lines:
        create_notification(
            db,
            user_id=int(user.id),
            kind="trust.verification-results",
            title="Your onboarding checks were recorded",
            message=(
                "The app has recorded your verification checks so your trust record starts with explainable evidence. "
                + " ".join(verification_summary_lines)
                + " Open Trust to review how these checks were attached to your record."
            ),
            action_url="/app/trust",
            action_label="Review Trust",
        )

    if _clean_text(verification.region_consistency_status) == "explained_mismatch":
        create_notification(
            db,
            user_id=int(user.id),
            kind="trust.region-review",
            title="Cross-region onboarding was recorded for review",
            message=(
                "Your phone and bank regions do not match, so your explanation was attached to your trust record. "
                "Open Trust to review how this was recorded and what further proof may strengthen it."
            ),
            action_url="/app/trust",
            action_label="Review Trust",
        )

    access_token = create_access_token(data={"sub": user.email}) if has_entry_password else None

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
        "next_step": "build-first-circle" if access_token else "activate-membership",
        "access_token": access_token,
        "token_type": "bearer" if access_token else None,
    }
