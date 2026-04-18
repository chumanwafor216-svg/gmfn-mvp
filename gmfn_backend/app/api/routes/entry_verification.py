from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import EntryPhoneVerification
from app.db.verification_models import IdentityVerificationCheck
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


class VerificationCheckOut(BaseModel):
    ok: bool
    verification_check_id: int
    verification_type: str
    status: str
    provider_key: str
    region_code: Optional[str] = None
    confidence_score: Optional[int] = None
    explanation: str
    verified_at: Optional[str] = None


def _clean_text(value: object, *, upper: bool = False) -> str:
    text = str(value or "").strip()
    return text.upper() if upper else text


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _json_text(data: Any) -> str:
    return json.dumps(data, sort_keys=True, default=str)


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
    if row.verified_at is None:
        raise HTTPException(status_code=400, detail="Phone verification must be completed first")
    return row


def _serialize_check(row: IdentityVerificationCheck) -> dict[str, Any]:
    verified_at = _utc_aware(row.verified_at)
    return {
        "ok": True,
        "verification_check_id": int(row.id),
        "verification_type": row.verification_type,
        "status": row.status,
        "provider_key": row.provider_key,
        "region_code": row.region_code,
        "confidence_score": row.confidence_score,
        "explanation": _clean_text(row.explanation) or "Verification was recorded.",
        "verified_at": verified_at.isoformat() if verified_at else None,
    }


@router.post("/bank/verify", response_model=VerificationCheckOut, status_code=status.HTTP_201_CREATED)
def verify_bank_details(payload: BankVerificationIn, db: Session = Depends(get_db)):
    session_row = _require_verified_session(payload.verification_id, db)
    region_code = _clean_text(payload.country, upper=True) or _clean_text(
        session_row.bank_country or session_row.phone_country_hint,
        upper=True,
    ) or None

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
    region_code = _clean_text(payload.country, upper=True) or _clean_text(
        session_row.driver_licence_country,
        upper=True,
    ) or None

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
