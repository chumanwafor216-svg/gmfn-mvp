from __future__ import annotations

import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, EntryPhoneVerification, User
from app.db.verification_models import IdentityVerificationCheck
from app.services.trust_events_services import build_trust_meta, log_trust_event
from app.services.verification_adapters.base import VerificationAdapterRequest
from app.services.verification_router import (
    route_bank_verification,
    route_drivers_licence_verification,
)

router = APIRouter(prefix="/entry", tags=["entry-verification"])


class BankVerificationIn(BaseModel):
    verification_id: int = Field(..., gt=0)
    destination_name: str = Field(..., min_length=2, max_length=160)
    bank_name: str = Field(..., min_length=2, max_length=120)
    account_number: str = Field(..., min_length=6, max_length=64)
    sort_code: Optional[str] = Field(default=None, max_length=32)
    iban: Optional[str] = Field(default=None, max_length=64)
    phone_number: Optional[str] = Field(default=None, max_length=32)
    country: Optional[str] = Field(default=None, max_length=16)
    currency: Optional[str] = Field(default=None, max_length=8)
    note: Optional[str] = Field(default=None, max_length=500)


class DriversLicenceVerificationIn(BaseModel):
    verification_id: int = Field(..., gt=0)
    licence_number: str = Field(..., min_length=4, max_length=120)
    country: str = Field(..., min_length=2, max_length=16)
    note: Optional[str] = Field(default=None, max_length=500)


class OfficialIdRecordIn(BaseModel):
    verification_id: int = Field(..., gt=0)
    document_type: str = Field(..., min_length=2, max_length=120)
    document_reference: str = Field(..., min_length=2, max_length=160)
    country: str = Field(..., min_length=2, max_length=64)
    note: Optional[str] = Field(default=None, max_length=500)


class SignedInPhoneStartIn(BaseModel):
    phone_e164: str = Field(..., min_length=8, max_length=32)
    country: Optional[str] = Field(default=None, max_length=64)


class SignedInPhoneConfirmIn(BaseModel):
    verification_id: int = Field(..., gt=0)
    code: str = Field(..., min_length=3, max_length=12)


class SignedInOfficialIdRecordIn(BaseModel):
    document_type: str = Field(..., min_length=2, max_length=120)
    document_reference: str = Field(..., min_length=2, max_length=160)
    country: str = Field(..., min_length=2, max_length=64)
    note: Optional[str] = Field(default=None, max_length=500)


class VerificationCheckOut(BaseModel):
    ok: bool
    verification_check_id: int
    verification_type: str
    status: str
    provider_key: str
    region_code: Optional[str] = None
    confidence_score: Optional[int] = None
    explanation: str
    evidence_url: Optional[str] = None
    verified_at: Optional[str] = None


def _clean_text(value: object, *, upper: bool = False) -> str:
    text = str(value or "").strip()
    return text.upper() if upper else text


REGION_ALIASES = {
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
    "UNITED STATES": "US",
    "USA": "US",
}


def _normalize_region_code(value: object) -> Optional[str]:
    raw = _clean_text(value, upper=True)
    if not raw:
        return None

    compact = raw.replace("-", " ").replace("_", " ")
    if compact in REGION_ALIASES:
        return REGION_ALIASES[compact]
    if len(raw) == 2 and raw.isalpha():
        return raw

    return raw


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_phone(value: object) -> str:
    raw = _clean_text(value)
    if not raw:
        return ""
    compact = raw.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if compact.startswith("00"):
        compact = f"+{compact[2:]}"
    elif compact and not compact.startswith("+"):
        compact = f"+{compact}"
    return compact


def _display_name_for_user(user: User) -> str:
    return (
        _clean_text(getattr(user, "display_name", None))
        or _clean_text(getattr(user, "email", None))
        or f"User {int(user.id)}"
    )


def _signed_in_phone_delivery_mode() -> str:
    configured = str(os.getenv("GMFN_ENTRY_PHONE_DELIVERY") or "").strip().lower()
    if configured in {"preview", "pilot", "manual"} or str(os.getenv("GMFN_DEV_MODE") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }:
        return "preview"
    if configured in {"sms", "live", "provider", "pending-sms"}:
        return "pending-sms"
    return "preview"


def _generate_code() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def _active_clan_id_for_user(db: Session, user_id: int) -> Optional[int]:
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .first()
    )
    return int(membership.clan_id) if membership else None


def _json_text(data: Any) -> str:
    return json.dumps(data, sort_keys=True, default=str)


ENTRY_IDENTITY_PHOTO_MAX_BYTES = 5 * 1024 * 1024
ENTRY_IDENTITY_PHOTO_MAX_PER_SESSION = 5
ENTRY_IDENTITY_PHOTO_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ENTRY_IDENTITY_PHOTO_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
ENTRY_IDENTITY_PHOTO_CONTENT_TYPE_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
}


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _entry_identity_upload_dir() -> Path:
    return _uploads_root() / "entry" / "identity"


def _normalize_upload_content_type(content_type: str) -> str:
    ct = str(content_type or "").strip().lower()
    if ";" in ct:
        ct = ct.split(";", 1)[0].strip().lower()
    return ENTRY_IDENTITY_PHOTO_CONTENT_TYPE_ALIASES.get(ct, ct)


def _safe_upload_ext(filename: Optional[str]) -> str:
    if not filename:
        return ""
    return Path(filename).suffix.lower().strip()


def _validate_identity_photo_type(upload: UploadFile) -> str:
    ext = _safe_upload_ext(getattr(upload, "filename", None))
    if ext not in ENTRY_IDENTITY_PHOTO_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported identity photo format. Use jpg, jpeg, png, or webp.",
        )

    content_type = _normalize_upload_content_type(
        getattr(upload, "content_type", "") or ""
    )
    if content_type not in ENTRY_IDENTITY_PHOTO_ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported identity photo content type.",
        )
    return ext


async def _read_identity_photo_bytes(upload: UploadFile) -> bytes:
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded identity photo is empty.")
    if len(raw) > ENTRY_IDENTITY_PHOTO_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Identity photo is too large. Maximum allowed is 5MB.",
        )
    return raw


def _entry_phone_registration_only_enabled() -> bool:
    configured = str(os.getenv("GMFN_ENTRY_PHONE_DELIVERY") or "").strip().lower()
    if configured in {"sms", "live", "provider", "pending-sms"}:
        return False
    if configured in {"preview", "pilot", "manual"} or str(os.getenv("GMFN_DEV_MODE") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }:
        return False
    return True


def _provider_response_dict(row: IdentityVerificationCheck) -> dict[str, Any]:
    raw = row.provider_response_json
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _verification_expired(row: EntryPhoneVerification) -> bool:
    expires_at = _utc_aware(row.expires_at)
    return bool(expires_at and expires_at < _now())


def _require_verified_session(verification_id: int, db: Session) -> EntryPhoneVerification:
    row = (
        db.query(EntryPhoneVerification)
        .filter(EntryPhoneVerification.id == int(verification_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Verified phone session not found")
    if row.consumed_at is not None:
        raise HTTPException(status_code=400, detail="Verified phone session has already been used")
    if _verification_expired(row):
        raise HTTPException(status_code=400, detail="Verified phone session has expired")
    if row.verified_at is None and not _entry_phone_registration_only_enabled():
        raise HTTPException(status_code=400, detail="Phone verification must be completed first")
    return row


def _serialize_check(row: IdentityVerificationCheck) -> dict[str, Any]:
    verified_at = _utc_aware(row.verified_at)
    provider_response = _provider_response_dict(row)
    return {
        "ok": True,
        "verification_check_id": int(row.id),
        "verification_type": row.verification_type,
        "status": row.status,
        "provider_key": row.provider_key,
        "region_code": row.region_code,
        "confidence_score": row.confidence_score,
        "explanation": _clean_text(row.explanation) or "Verification was recorded.",
        "evidence_url": _clean_text(provider_response.get("evidence_url")) or None,
        "verified_at": verified_at.isoformat() if verified_at else None,
    }


def _document_reference_last4(value: object) -> str:
    compact = "".join(ch for ch in _clean_text(value) if ch.isalnum())
    return compact[-4:] if compact else ""


@router.post("/signed-in/phone/start", status_code=status.HTTP_201_CREATED)
def start_signed_in_phone_verification(
    payload: SignedInPhoneStartIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_user = db.get(User, int(current_user.id))
    if db_user is None:
        raise HTTPException(status_code=404, detail="Signed-in user was not found")
    phone = _normalize_phone(payload.phone_e164)
    if not phone.startswith("+") or len(phone) < 8:
        raise HTTPException(
            status_code=400,
            detail="Phone number must be in international format, for example +447700900123.",
        )

    clash = (
        db.query(User)
        .filter(User.phone_e164 == phone, User.id != int(db_user.id))
        .first()
    )
    if clash:
        raise HTTPException(status_code=409, detail="This phone number is already used by another account.")

    delivery_mode = _signed_in_phone_delivery_mode()
    verification = EntryPhoneVerification(
        display_name=_display_name_for_user(db_user),
        phone_e164=phone,
        email=_clean_text(getattr(db_user, "email", None)) or None,
        phone_country_hint=_normalize_region_code(payload.country),
        code=_generate_code(),
        expires_at=_now() + timedelta(minutes=15),
        verified_at=None,
        consumed_at=None,
    )
    db.add(verification)
    db_user.phone_e164 = phone
    db.add(db_user)
    db.flush()

    clan_id = _active_clan_id_for_user(db, int(db_user.id))
    meta = build_trust_meta(
        reason="signed_in_phone_registered",
        note=(
            "Phone number was recorded from the signed-in Identity Integrity task. "
            "It is recorded phone evidence until the code is confirmed."
        ),
        system=True,
        extra={
            "verification_source": "identity.signed_in.phone.start",
            "phone_e164": phone,
            "delivery_mode": delivery_mode,
            "verified": False,
        },
    )
    log_trust_event(
        db,
        event_type="identity.phone_registered",
        clan_id=clan_id,
        actor_user_id=int(db_user.id),
        subject_user_id=int(db_user.id),
        meta=meta,
        dedupe_key=f"signed-in-phone-registered:{int(verification.id)}:{int(db_user.id)}",
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(verification)

    return {
        "ok": True,
        "registered": True,
        "verification_id": int(verification.id),
        "phone_e164": phone,
        "expires_at": verification.expires_at.isoformat(),
        "delivery_mode": delivery_mode,
        "otp_preview": verification.code if delivery_mode == "preview" else None,
        "message": (
            "Phone code created. Confirm the code to attach this phone to your signed-in identity."
        ),
    }


@router.post("/signed-in/phone/confirm")
def confirm_signed_in_phone_verification(
    payload: SignedInPhoneConfirmIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_user = db.get(User, int(current_user.id))
    if db_user is None:
        raise HTTPException(status_code=404, detail="Signed-in user was not found")
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
    if _clean_text(row.email).lower() and _clean_text(row.email).lower() != _clean_text(getattr(db_user, "email", None)).lower():
        raise HTTPException(status_code=403, detail="Phone verification session does not belong to this user")
    if _clean_text(payload.code) != str(row.code):
        raise HTTPException(status_code=400, detail="Verification code is not correct")

    verified_at = _now()
    row.verified_at = verified_at
    row.consumed_at = verified_at
    db_user.phone_e164 = row.phone_e164
    db_user.phone_verified_at = verified_at
    db.add(row)
    db.add(db_user)

    clan_id = _active_clan_id_for_user(db, int(db_user.id))
    meta = build_trust_meta(
        reason="signed_in_phone_verified",
        note="Phone number was verified from the signed-in Identity Integrity task.",
        system=True,
        extra={
            "verification_source": "identity.signed_in.phone.confirm",
            "phone_e164": row.phone_e164,
        },
    )
    log_trust_event(
        db,
        event_type="identity.phone_verified",
        clan_id=clan_id,
        actor_user_id=int(db_user.id),
        subject_user_id=int(db_user.id),
        meta=meta,
        dedupe_key=f"signed-in-phone:{int(row.id)}:{int(db_user.id)}",
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(db_user)

    return {
        "ok": True,
        "verified": True,
        "phone_e164": db_user.phone_e164,
        "phone_verified_at": db_user.phone_verified_at.isoformat()
        if db_user.phone_verified_at
        else None,
        "message": "Phone proof is now connected to your signed-in GSN identity.",
    }


@router.post(
    "/signed-in/official-id/record",
    response_model=VerificationCheckOut,
    status_code=status.HTTP_201_CREATED,
)
def record_signed_in_official_id(
    payload: SignedInOfficialIdRecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_user = db.get(User, int(current_user.id))
    if db_user is None:
        raise HTTPException(status_code=404, detail="Signed-in user was not found")
    region_code = _normalize_region_code(payload.country)
    document_type = _clean_text(payload.document_type) or "Official ID"
    explanation = (
        f"{document_type} evidence was recorded on the signed-in identity. "
        "Live provider verification is not connected yet, so this is recorded evidence for review, not provider-verified identity."
    )
    check = IdentityVerificationCheck(
        entry_phone_verification_id=None,
        user_id=int(db_user.id),
        verification_type="official_id",
        region_code=region_code,
        provider_key="official-id.signed-in-manual-record",
        status="manual_review_required",
        subject_reference=document_type,
        confidence_score=25,
        explanation=explanation,
        submitted_payload_json=_json_text(payload.model_dump()),
        normalized_identity_json=_json_text(
            {
                "display_name": _display_name_for_user(db_user),
                "phone_e164": _clean_text(getattr(db_user, "phone_e164", None)) or None,
                "document_type": document_type,
                "document_reference_last4": _document_reference_last4(
                    payload.document_reference
                ),
                "country": region_code or _clean_text(payload.country),
            }
        ),
        provider_response_json=_json_text(
            {
                "provider_configured": False,
                "provider_verified": False,
                "manual_review": True,
                "verification_suspended_for_pilot": True,
                "document_type": document_type,
                "document_reference_last4": _document_reference_last4(
                    payload.document_reference
                ),
                "country": region_code or _clean_text(payload.country),
            }
        ),
        verified_at=None,
    )
    db.add(check)
    db.flush()

    clan_id = _active_clan_id_for_user(db, int(db_user.id))
    meta = build_trust_meta(
        reason="signed_in_official_id_recorded",
        note=explanation,
        system=True,
        extra={
            "verification_check_id": int(check.id),
            "verification_type": "official_id",
            "verification_status": check.status,
            "provider_key": check.provider_key,
            "region_code": region_code,
            "provider_verified": False,
        },
    )
    log_trust_event(
        db,
        event_type="identity.official_id_recorded",
        clan_id=clan_id,
        actor_user_id=int(db_user.id),
        subject_user_id=int(db_user.id),
        meta=meta,
        dedupe_key=f"signed-in-official-id:{int(check.id)}:{int(db_user.id)}",
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(check)
    return _serialize_check(check)


@router.post("/bank/verify", response_model=VerificationCheckOut, status_code=status.HTTP_201_CREATED)
def verify_bank_details(payload: BankVerificationIn, db: Session = Depends(get_db)):
    session_row = _require_verified_session(payload.verification_id, db)
    region_code = _normalize_region_code(payload.country) or _normalize_region_code(
        session_row.bank_country or session_row.phone_country_hint
    )

    adapter = route_bank_verification(region_code)
    adapter_result = adapter.verify(
        VerificationAdapterRequest(
            verification_type="bank",
            region_code=region_code,
            payload=payload.model_dump(),
        )
    )

    check = IdentityVerificationCheck(
        entry_phone_verification_id=int(session_row.id),
        verification_type="bank",
        region_code=region_code,
        provider_key=adapter_result.provider_key,
        status=adapter_result.status,
        subject_reference=_clean_text(payload.bank_name),
        confidence_score=adapter_result.confidence_score,
        explanation=adapter_result.explanation,
        submitted_payload_json=_json_text(payload.model_dump()),
        normalized_identity_json=_json_text(adapter_result.normalized_identity),
        provider_response_json=_json_text(adapter_result.provider_response),
        verified_at=_now() if adapter_result.status == "matched" else None,
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    return _serialize_check(check)


@router.post(
    "/licence/verify",
    response_model=VerificationCheckOut,
    status_code=status.HTTP_201_CREATED,
)
def verify_drivers_licence(
    payload: DriversLicenceVerificationIn,
    db: Session = Depends(get_db),
):
    session_row = _require_verified_session(payload.verification_id, db)
    region_code = _normalize_region_code(payload.country) or _normalize_region_code(
        session_row.driver_licence_country
    )

    adapter = route_drivers_licence_verification(region_code)
    adapter_result = adapter.verify(
        VerificationAdapterRequest(
            verification_type="drivers_licence",
            region_code=region_code,
            payload=payload.model_dump(),
        )
    )

    check = IdentityVerificationCheck(
        entry_phone_verification_id=int(session_row.id),
        verification_type="drivers_licence",
        region_code=region_code,
        provider_key=adapter_result.provider_key,
        status=adapter_result.status,
        subject_reference=_clean_text(payload.licence_number),
        confidence_score=adapter_result.confidence_score,
        explanation=adapter_result.explanation,
        submitted_payload_json=_json_text(payload.model_dump()),
        normalized_identity_json=_json_text(adapter_result.normalized_identity),
        provider_response_json=_json_text(adapter_result.provider_response),
        verified_at=_now() if adapter_result.status == "matched" else None,
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    return _serialize_check(check)


@router.post(
    "/official-id/record",
    response_model=VerificationCheckOut,
    status_code=status.HTTP_201_CREATED,
)
def record_official_id(payload: OfficialIdRecordIn, db: Session = Depends(get_db)):
    session_row = _require_verified_session(payload.verification_id, db)
    region_code = _normalize_region_code(payload.country)
    document_type = _clean_text(payload.document_type) or "Official ID"

    explanation = (
        f"{document_type} evidence was recorded for identity confidence. "
        "Live provider verification is suspended during pilot testing, so this is reviewable evidence, not provider-verified identity."
    )
    check = IdentityVerificationCheck(
        entry_phone_verification_id=int(session_row.id),
        verification_type="official_id",
        region_code=region_code,
        provider_key="official-id.manual-record",
        status="manual_review_required",
        subject_reference=document_type,
        confidence_score=25,
        explanation=explanation,
        submitted_payload_json=_json_text(payload.model_dump()),
        normalized_identity_json=_json_text(
            {
                "display_name": _clean_text(session_row.display_name),
                "phone_e164": _clean_text(session_row.phone_e164),
                "document_type": document_type,
                "document_reference_last4": _document_reference_last4(
                    payload.document_reference
                ),
                "country": region_code or _clean_text(payload.country),
            }
        ),
        provider_response_json=_json_text(
            {
                "provider_configured": False,
                "provider_verified": False,
                "manual_review": True,
                "verification_suspended_for_pilot": True,
                "document_type": document_type,
                "document_reference_last4": _document_reference_last4(
                    payload.document_reference
                ),
                "country": region_code or _clean_text(payload.country),
            }
        ),
        verified_at=None,
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    return _serialize_check(check)


@router.post(
    "/identity-photo/record",
    response_model=VerificationCheckOut,
    status_code=status.HTTP_201_CREATED,
)
async def record_identity_photo(
    verification_id: int = Form(..., gt=0),
    document_type: str = Form(default="selfie"),
    note: Optional[str] = Form(default=None, max_length=500),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    session_row = _require_verified_session(int(verification_id), db)
    existing_photo_count = (
        db.query(IdentityVerificationCheck)
        .filter(
            IdentityVerificationCheck.entry_phone_verification_id == int(session_row.id),
            IdentityVerificationCheck.verification_type == "identity_photo",
        )
        .count()
    )
    if existing_photo_count >= ENTRY_IDENTITY_PHOTO_MAX_PER_SESSION:
        raise HTTPException(
            status_code=400,
            detail="A maximum of 5 identity photos can be attached to this entry session.",
        )
    ext = _validate_identity_photo_type(file)
    raw = await _read_identity_photo_bytes(file)

    upload_dir = _entry_identity_upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)

    normalized_document_type = _clean_text(document_type).lower().replace(" ", "_") or "selfie"
    allowed_document_types = {"selfie", "passport_photo", "identity_photo"}
    if normalized_document_type not in allowed_document_types:
        raise HTTPException(
            status_code=400,
            detail="Identity photo type must be selfie, passport_photo, or identity_photo.",
        )

    generated = (
        f"entry_{int(session_row.id)}_"
        f"{normalized_document_type}_"
        f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_"
        f"{secrets.token_hex(6)}{ext}"
    )
    target = upload_dir / generated
    target.write_bytes(raw)
    evidence_url = f"/uploads/entry/identity/{generated}"

    explanation = (
        "Founder photo evidence was recorded for identity continuity. "
        "No live passport or face-match provider is connected yet, so this evidence requires review before it is treated as provider-verified."
    )
    check = IdentityVerificationCheck(
        entry_phone_verification_id=int(session_row.id),
        verification_type="identity_photo",
        region_code=None,
        provider_key="identity-photo.manual-review",
        status="manual_review_required",
        subject_reference=_clean_text(session_row.display_name),
        confidence_score=25,
        explanation=explanation,
        submitted_payload_json=_json_text(
            {
                "verification_id": int(session_row.id),
                "document_type": normalized_document_type,
                "note": _clean_text(note) or None,
            }
        ),
        normalized_identity_json=_json_text(
            {
                "display_name": _clean_text(session_row.display_name),
                "phone_e164": _clean_text(session_row.phone_e164),
                "document_type": normalized_document_type,
            }
        ),
        provider_response_json=_json_text(
            {
                "provider_configured": False,
                "provider_key": "identity-photo.manual-review",
                "evidence_url": evidence_url,
                "document_type": normalized_document_type,
                "review_required": True,
                "private_evidence": True,
            }
        ),
        verified_at=None,
    )
    db.add(check)
    db.commit()
    db.refresh(check)
    return _serialize_check(check)


@router.post(
    "/signed-in/identity-photo/record",
    response_model=VerificationCheckOut,
    status_code=status.HTTP_201_CREATED,
)
async def record_signed_in_identity_photo(
    document_type: str = Form(default="selfie"),
    note: Optional[str] = Form(default=None, max_length=500),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_user = db.get(User, int(current_user.id))
    if db_user is None:
        raise HTTPException(status_code=404, detail="Signed-in user was not found")

    existing_photo_count = (
        db.query(IdentityVerificationCheck)
        .filter(
            IdentityVerificationCheck.user_id == int(db_user.id),
            IdentityVerificationCheck.verification_type == "identity_photo",
        )
        .count()
    )
    if existing_photo_count >= ENTRY_IDENTITY_PHOTO_MAX_PER_SESSION:
        raise HTTPException(
            status_code=400,
            detail="A maximum of 5 identity photos can be attached to this identity.",
        )

    ext = _validate_identity_photo_type(file)
    raw = await _read_identity_photo_bytes(file)

    upload_dir = _entry_identity_upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)

    normalized_document_type = _clean_text(document_type).lower().replace(" ", "_") or "selfie"
    allowed_document_types = {"selfie", "passport_photo", "identity_photo"}
    if normalized_document_type not in allowed_document_types:
        raise HTTPException(
            status_code=400,
            detail="Identity photo type must be selfie, passport_photo, or identity_photo.",
        )

    generated = (
        f"signedin_{int(db_user.id)}_"
        f"{normalized_document_type}_"
        f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_"
        f"{secrets.token_hex(6)}{ext}"
    )
    target = upload_dir / generated
    target.write_bytes(raw)
    evidence_url = f"/uploads/entry/identity/{generated}"

    explanation = (
        "Signed-in photo/selfie evidence was recorded for identity continuity. "
        "No live passport or face-match provider is connected yet, so this evidence requires review before it is treated as provider-verified."
    )
    check = IdentityVerificationCheck(
        entry_phone_verification_id=None,
        user_id=int(db_user.id),
        verification_type="identity_photo",
        region_code=None,
        provider_key="identity-photo.signed-in-manual-review",
        status="manual_review_required",
        subject_reference=_display_name_for_user(db_user),
        confidence_score=20,
        explanation=explanation,
        submitted_payload_json=_json_text(
            {
                "document_type": normalized_document_type,
                "note": _clean_text(note) or None,
            }
        ),
        normalized_identity_json=_json_text(
            {
                "display_name": _display_name_for_user(db_user),
                "phone_e164": _clean_text(getattr(db_user, "phone_e164", None)) or None,
                "document_type": normalized_document_type,
            }
        ),
        provider_response_json=_json_text(
            {
                "provider_configured": False,
                "provider_key": "identity-photo.signed-in-manual-review",
                "evidence_url": evidence_url,
                "document_type": normalized_document_type,
                "review_required": True,
                "private_evidence": True,
            }
        ),
        verified_at=None,
    )
    db.add(check)
    db.flush()

    if normalized_document_type == "selfie":
        db_user.profile_image_url = evidence_url
        db.add(db_user)

    clan_id = _active_clan_id_for_user(db, int(db_user.id))
    photo_meta = build_trust_meta(
        reason="signed_in_identity_photo_recorded",
        note=explanation,
        system=True,
        extra={
            "verification_check_id": int(check.id),
            "verification_type": "identity_photo",
            "verification_status": check.status,
            "provider_key": check.provider_key,
            "document_type": normalized_document_type,
            "evidence_url": evidence_url,
            "provider_verified": False,
        },
    )
    log_trust_event(
        db,
        event_type="identity.photo_evidence_recorded",
        clan_id=clan_id,
        actor_user_id=int(db_user.id),
        subject_user_id=int(db_user.id),
        meta=photo_meta,
        dedupe_key=f"signed-in-identity-photo:{int(check.id)}:{int(db_user.id)}",
        commit=False,
        refresh=False,
    )

    if normalized_document_type in {"passport_photo", "identity_photo"}:
        official_meta = build_trust_meta(
            reason="signed_in_official_id_image_recorded",
            note=(
                "Official ID image evidence was recorded for review. "
                "It is recorded evidence, not provider-verified identity."
            ),
            system=True,
            extra={
                "verification_check_id": int(check.id),
                "verification_type": "official_id",
                "verification_status": check.status,
                "provider_key": check.provider_key,
                "document_type": normalized_document_type,
                "evidence_url": evidence_url,
                "provider_verified": False,
            },
        )
        log_trust_event(
            db,
            event_type="identity.official_id_recorded",
            clan_id=clan_id,
            actor_user_id=int(db_user.id),
            subject_user_id=int(db_user.id),
            meta=official_meta,
            dedupe_key=f"signed-in-official-id-image:{int(check.id)}:{int(db_user.id)}",
            commit=False,
            refresh=False,
        )

    db.commit()
    db.refresh(check)
    return _serialize_check(check)


@router.get("/verification/{verification_check_id}", response_model=VerificationCheckOut)
def get_verification_check(verification_check_id: int, db: Session = Depends(get_db)):
    row = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.id == int(verification_check_id))
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Verification check not found")
    return _serialize_check(row)
