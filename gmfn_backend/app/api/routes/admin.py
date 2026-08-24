# app/api/routes/admin.py
from __future__ import annotations

import json
import mimetypes
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import or_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.security import get_password_hash
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanJoinRequest,
    ClanMembership,
    CommunityDomain,
    CommunityDomainMembership,
    EntryPhoneVerification,
    LoanGuarantor,
    User,
    UserPayoutDestination,
)
from app.db.verification_models import IdentityVerificationCheck
from app.services.global_identity_service import generate_gmfn_id
from app.services.trust_events_services import build_trust_meta, log_trust_event
from app.services.trust_score_service import apply_trust_score

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_platform_admin(u: User) -> None:
    if (getattr(u, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")


def _d(x: Any) -> Decimal:
    try:
        return Decimal(str(x if x is not None else 0))
    except Exception:
        return Decimal("0")


def _safe_str(x: Any) -> str:
    return str(x or "").strip()


def _community_ownership_compact_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "", _safe_str(value).lower())


def _community_ownership_text_keys(value: Any) -> list[str]:
    raw = _safe_str(value)
    if not raw:
        return []
    lowered = raw.lower()
    spaced = re.sub(r"[-_]+", " ", lowered)
    spaced = re.sub(r"\s+", " ", spaced).strip()
    slugged = re.sub(r"\s+", "-", spaced)
    return [item for item in dict.fromkeys([lowered, spaced, slugged]) if item]


def _community_ownership_compact_expr(column: Any) -> Any:
    lowered = func.lower(column)
    without_hyphen = func.replace(lowered, "-", "")
    without_underscore = func.replace(without_hyphen, "_", "")
    without_space = func.replace(without_underscore, " ", "")
    return func.replace(without_space, ".", "")


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _dt_iso(x: Any) -> Optional[str]:
    if x is None:
        return None
    if isinstance(x, datetime):
        return x.isoformat()
    return _safe_str(x) or None


def _utc_dt(x: Any) -> Optional[datetime]:
    if not isinstance(x, datetime):
        return None
    if x.tzinfo is None:
        return x.replace(tzinfo=timezone.utc)
    return x.astimezone(timezone.utc)



def _ownership_gsn_id_candidates(value: Any) -> list[str]:
    raw = _safe_str(value).upper()
    if not raw:
        return []
    candidates = [raw]
    if raw.startswith("GMFN-"):
        candidates.append(f"GSN-{raw[5:]}")
    elif raw.startswith("GSN-"):
        candidates.append(f"GMFN-{raw[4:]}")
    return [
        item
        for index, item in enumerate(candidates)
        if item and item not in candidates[:index]
    ]


def _ownership_phone_candidates(value: Any) -> list[str]:
    raw = _safe_str(value)
    if not raw:
        return []

    compact = re.sub(r"[\s().-]+", "", raw)
    digits = re.sub(r"\D+", "", compact)
    candidates = {raw, compact}

    if compact.startswith("00") and len(compact) > 4:
        candidates.add(f"+{compact[2:]}")
    elif compact.startswith("+"):
        candidates.add(compact)
    elif digits:
        candidates.add(f"+{digits}")
        if digits.startswith("0") and len(digits) >= 10:
            national = digits[1:]
            candidates.add(f"+44{national}")
            candidates.add(f"+234{national}")

    return sorted(item for item in candidates if item)

def _last4(x: Any) -> Optional[str]:
    digits = "".join(ch for ch in _safe_str(x) if ch.isdigit())
    return digits[-4:] if digits else None


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _local_upload_path(upload_url: Any) -> Optional[Path]:
    value = _safe_str(upload_url).split("?", 1)[0].split("#", 1)[0].replace("\\", "/")
    if not value.startswith("/uploads/"):
        return None

    relative = value[len("/uploads/") :].lstrip("/")
    if not relative:
        return None

    try:
        root = _uploads_root().resolve()
        candidate = (root / relative).resolve()
        candidate.relative_to(root)
    except Exception:
        return None

    return candidate


class IdentityVerificationDecisionIn(BaseModel):
    decision: str = Field(..., min_length=3, max_length=16)
    reviewer_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("decision", "reviewer_note", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class IdentityVerificationCorrectionIn(BaseModel):
    reason: str = Field(..., min_length=4, max_length=500)

    @field_validator("reason", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class CommunityOwnershipReconcileIn(BaseModel):
    community_name: Optional[str] = Field(default=None, max_length=120)
    clan_id: Optional[int] = Field(default=None, ge=1)
    entry_verification_id: Optional[int] = Field(default=None, ge=1)
    owner_user_id: Optional[int] = Field(default=None, ge=1)
    owner_gmfn_id: Optional[str] = Field(default=None, max_length=64)
    owner_email: Optional[str] = Field(default=None, max_length=240)
    owner_phone_e164: Optional[str] = Field(default=None, max_length=40)
    owner_proof_confirmed: bool = False
    execute: bool = False
    reviewer_note: Optional[str] = Field(default=None, max_length=800)

    @field_validator(
        "community_name",
        "owner_gmfn_id",
        "owner_email",
        "owner_phone_e164",
        "reviewer_note",
        mode="before",
    )
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)



class CommunityDomainOwnershipReconcileIn(BaseModel):
    domain_name: Optional[str] = Field(default=None, max_length=120)
    community_domain_id: Optional[int] = Field(default=None, ge=1)
    owner_user_id: Optional[int] = Field(default=None, ge=1)
    owner_gmfn_id: Optional[str] = Field(default=None, max_length=64)
    owner_email: Optional[str] = Field(default=None, max_length=240)
    owner_phone_e164: Optional[str] = Field(default=None, max_length=40)
    owner_proof_confirmed: bool = False
    execute: bool = False
    reviewer_note: Optional[str] = Field(default=None, max_length=800)

    @field_validator(
        "domain_name",
        "owner_gmfn_id",
        "owner_email",
        "owner_phone_e164",
        "reviewer_note",
        mode="before",
    )
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class AdminActivateMembershipIn(BaseModel):
    gmfn_id: str = Field(..., min_length=6, max_length=64)
    password: str = Field(..., min_length=6)

    @field_validator("gmfn_id", "password", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


def _json_text(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, default=str)


def _check_provider_response(check: IdentityVerificationCheck) -> dict[str, Any]:
    raw = getattr(check, "provider_response_json", None)
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _serialize_identity_check(check: IdentityVerificationCheck) -> dict[str, Any]:
    provider_response = _check_provider_response(check)
    return {
        "ok": True,
        "verification_check_id": int(check.id),
        "verification_type": check.verification_type,
        "status": check.status,
        "provider_key": check.provider_key,
        "region_code": check.region_code,
        "confidence_score": check.confidence_score,
        "explanation": check.explanation,
        "evidence_url": _safe_str(provider_response.get("evidence_url")) or None,
        "verified_at": _dt_iso(check.verified_at),
        "manual_review": bool(provider_response.get("manual_review")),
        "provider_verified": bool(provider_response.get("provider_verified")),
        "review_decision": _safe_str(provider_response.get("review_decision")) or None,
        "reviewed_at": _safe_str(provider_response.get("reviewed_at")) or None,
        "provider_response": provider_response,
    }


def _user_label(user: Optional[User]) -> Optional[dict[str, Any]]:
    if user is None:
        return None
    return {
        "user_id": int(user.id),
        "display_name": _safe_str(getattr(user, "display_name", None)) or None,
        "email": _safe_str(getattr(user, "email", None)) or None,
        "gmfn_id": _safe_str(getattr(user, "gmfn_id", None)) or None,
        "phone_last4": _last4(getattr(user, "phone_e164", None)),
        "role": _safe_str(getattr(user, "role", None)) or None,
    }


def _community_admin_rows(db: Session, clan_id: int) -> list[dict[str, Any]]:
    rows = (
        db.query(ClanMembership, User)
        .join(User, User.id == ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
            ClanMembership.role == "admin",
        )
        .order_by(ClanMembership.id.asc())
        .all()
    )
    return [
        {
            "membership_id": int(membership.id),
            "role": _safe_str(getattr(membership, "role", None)) or "admin",
            "created_at": _dt_iso(getattr(membership, "created_at", None)),
            **(_user_label(user) or {}),
        }
        for membership, user in rows
    ]


def _community_row(db: Session, clan: Clan) -> dict[str, Any]:
    creator = db.get(User, int(clan.created_by_user_id)) if clan.created_by_user_id else None
    return {
        "clan_id": int(clan.id),
        "name": _safe_str(clan.name),
        "description": _safe_str(getattr(clan, "description", None)) or None,
        "community_code": _safe_str(getattr(clan, "community_code", None)) or f"GSN-C-{int(clan.id):06d}",
        "status": _safe_str(getattr(clan, "status", None)) or "active",
        "created_by_user_id": int(clan.created_by_user_id) if clan.created_by_user_id else None,
        "created_at": _dt_iso(getattr(clan, "created_at", None)),
        "canonical_owner": _user_label(creator),
        "admin_members": _community_admin_rows(db, int(clan.id)),
    }


def _resolve_community_for_ownership(
    db: Session,
    *,
    clan_id: Optional[int] = None,
    community_name: Optional[str] = None,
) -> Clan:
    if clan_id:
        clan = db.get(Clan, int(clan_id))
        if clan is None:
            raise HTTPException(status_code=404, detail="Community not found.")
        return clan

    name = _safe_str(community_name)
    if not name:
        raise HTTPException(status_code=400, detail="Community name or community ID is required.")

    text_keys = _community_ownership_text_keys(name)
    compact_key = _community_ownership_compact_key(name)
    filters = []
    if text_keys:
        filters.extend(
            [
                func.lower(Clan.name).in_(text_keys),
                func.lower(Clan.community_code).in_(text_keys),
            ]
        )
    if compact_key:
        filters.extend(
            [
                _community_ownership_compact_expr(Clan.name) == compact_key,
                _community_ownership_compact_expr(Clan.community_code) == compact_key,
            ]
        )

    if not filters:
        raise HTTPException(status_code=404, detail="Community name was not found.")

    candidates = (
        db.query(Clan)
        .filter(or_(*filters))
        .order_by(Clan.id.asc())
        .limit(10)
        .all()
    )
    if not candidates:
        raise HTTPException(status_code=404, detail="Community name was not found.")

    exact_matches = [
        clan
        for clan in candidates
        if _safe_str(clan.name).lower() in text_keys
        or _safe_str(getattr(clan, "community_code", None)).lower() in text_keys
    ]
    if len(exact_matches) == 1:
        return exact_matches[0]

    compact_matches = [
        clan
        for clan in candidates
        if _community_ownership_compact_key(clan.name) == compact_key
        or _community_ownership_compact_key(getattr(clan, "community_code", None)) == compact_key
    ]
    if len(compact_matches) == 1:
        return compact_matches[0]

    raise HTTPException(
        status_code=409,
        detail="More than one community matched that name. Search records, then select the exact community before preview.",
    )


def _resolve_owner_for_ownership(db: Session, payload: Any) -> User:
    filters = []
    if payload.owner_user_id:
        filters.append(User.id == int(payload.owner_user_id))
    gmfn_ids = _ownership_gsn_id_candidates(payload.owner_gmfn_id)
    if gmfn_ids:
        filters.append(
            func.lower(User.gmfn_id).in_([item.lower() for item in gmfn_ids])
        )
    email = _safe_str(payload.owner_email)
    if email:
        filters.append(func.lower(User.email) == email.lower())
    phone_candidates = _ownership_phone_candidates(payload.owner_phone_e164)
    if phone_candidates:
        filters.append(User.phone_e164.in_(phone_candidates))

    if not filters:
        raise HTTPException(
            status_code=400,
            detail="Owner user ID, GSN ID, email, or phone is required.",
        )

    rows = db.query(User).filter(or_(*filters)).order_by(User.id.asc()).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Owner identity was not found.")
    if len(rows) > 1:
        raise HTTPException(
            status_code=409,
            detail="More than one owner identity matched. Use exact user ID or GSN ID.",
        )
    return rows[0]


def _community_ownership_preview(
    db: Session,
    *,
    clan: Clan,
    owner: User,
) -> dict[str, Any]:
    current_owner = (
        db.get(User, int(clan.created_by_user_id))
        if getattr(clan, "created_by_user_id", None)
        else None
    )
    active_membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan.id),
            ClanMembership.user_id == int(owner.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    archived_membership = None
    if active_membership is None:
        archived_membership = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == int(clan.id),
                ClanMembership.user_id == int(owner.id),
                ClanMembership.left_at.isnot(None),
            )
            .order_by(ClanMembership.id.desc())
            .first()
        )

    membership_action = "already_admin"
    if active_membership is None and archived_membership is not None:
        membership_action = "reactivate_admin"
    elif active_membership is None:
        membership_action = "add_admin"
    elif _safe_str(getattr(active_membership, "role", None)).lower() != "admin":
        membership_action = "promote_to_admin"

    return {
        "community": _community_row(db, clan),
        "requested_owner": _user_label(owner),
        "current_owner": _user_label(current_owner),
        "membership_action": membership_action,
        "will_set_created_by_user_id": int(owner.id),
        "will_preserve_community_code": True,
        "will_preserve_history": True,
        "will_remove_other_admins": False,
        "boundary": (
            "This records the canonical owner/admin for the existing community. "
            "It does not delete historical evidence or erase previous activity."
        ),
    }



def _entry_user_for_intake(db: Session, row: EntryPhoneVerification) -> Optional[User]:
    phone_filters = []
    phone = _safe_str(getattr(row, "phone_e164", None))
    if phone:
        phone_candidates = _ownership_phone_candidates(phone)
        if phone_candidates:
            phone_filters.append(User.phone_e164.in_(phone_candidates))

    email = _safe_str(getattr(row, "email", None)).lower()
    filters = list(phone_filters)
    if email:
        filters.append(func.lower(User.email) == email)

    if not filters:
        return None
    return db.query(User).filter(or_(*filters)).order_by(User.id.asc()).first()


def _entry_intake_owner_label(
    db: Session,
    row: EntryPhoneVerification,
    *,
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    existing_user = _entry_user_for_intake(db, row)
    stage = _entry_stage(row, existing_user, now or datetime.now(timezone.utc))
    return {
        "source": "entry_intake",
        "entry_verification_id": int(row.id),
        "display_name": _safe_str(getattr(row, "display_name", None)) or None,
        "email": _safe_str(getattr(row, "email", None)) or None,
        "gmfn_id": _safe_str(getattr(existing_user, "gmfn_id", None)) if existing_user else None,
        "phone_last4": _last4(getattr(row, "phone_e164", None)),
        "stage": stage,
        "next_action": _entry_next_action(stage),
        "created_at": _dt_iso(getattr(row, "created_at", None)),
        "expires_at": _dt_iso(getattr(row, "expires_at", None)),
        "verified_at": _dt_iso(getattr(row, "verified_at", None)),
        "bank_details_recorded_at": _dt_iso(getattr(row, "bank_details_recorded_at", None)),
        "identity_evidence_count": int(
            db.query(IdentityVerificationCheck)
            .filter(IdentityVerificationCheck.entry_phone_verification_id == int(row.id))
            .count()
        ),
        "has_gsn_identity": existing_user is not None,
        "user": _user_label(existing_user),
    }


def _owner_intake_rows(
    db: Session,
    *,
    owner_query: str,
    limit: int,
) -> list[dict[str, Any]]:
    clean_owner = _safe_str(owner_query)
    if not clean_owner:
        return []

    owner_like = f"%{clean_owner.lower()}%"
    filters = [
        func.lower(EntryPhoneVerification.display_name).like(owner_like),
        func.lower(EntryPhoneVerification.email).like(owner_like),
    ]
    phone_candidates = _ownership_phone_candidates(clean_owner)
    if phone_candidates:
        filters.append(EntryPhoneVerification.phone_e164.in_(phone_candidates))
        owner_digits = "".join(ch for ch in clean_owner if ch.isdigit())
        if len(owner_digits) >= 6:
            filters.append(EntryPhoneVerification.phone_e164.like(f"%{owner_digits[-8:]}%"))

    rows = (
        db.query(EntryPhoneVerification)
        .filter(or_(*filters))
        .order_by(EntryPhoneVerification.id.desc())
        .limit(int(limit))
        .all()
    )
    now = datetime.now(timezone.utc)
    return [_entry_intake_owner_label(db, row, now=now) for row in rows]


def _resolve_entry_intake_for_ownership(
    db: Session,
    entry_verification_id: int,
) -> EntryPhoneVerification:
    row = db.get(EntryPhoneVerification, int(entry_verification_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Onboarding intake record was not found.")
    return row


def _entry_intake_has_owner_repair_evidence(db: Session, row: EntryPhoneVerification) -> bool:
    if _safe_str(getattr(row, "phone_e164", None)) and getattr(row, "verified_at", None) is not None:
        return True
    if getattr(row, "bank_details_recorded_at", None) is not None:
        return True
    if getattr(row, "driver_licence_recorded_at", None) is not None:
        return True
    check_count = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.entry_phone_verification_id == int(row.id))
        .count()
    )
    return int(check_count or 0) > 0


def _owner_repair_founder_email(row: EntryPhoneVerification) -> str:
    email = _safe_str(getattr(row, "email", None)).lower()
    if email:
        return email
    digits = "".join(ch for ch in _safe_str(getattr(row, "phone_e164", None)) if ch.isdigit())
    if not digits:
        raise HTTPException(status_code=400, detail="A usable phone number is required before creating the GSN identity.")
    return f"{digits}@founder-entry.gsnmail.app"


def _owner_repair_account_number(value: Any) -> str:
    raw = _safe_str(value).replace(" ", "")
    if len(raw) < 6:
        raise HTTPException(status_code=400, detail="The recorded bank account number is too short for owner repair.")
    return raw


def _owner_repair_phone(value: Any, fallback: Any = None) -> Optional[str]:
    raw = _safe_str(value) or _safe_str(fallback)
    if not raw:
        return None
    compact = raw.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if compact.startswith("00") and len(compact) > 4:
        return f"+{compact[2:]}"
    return compact


def _owner_repair_bank_status_note(region_status: Optional[str], phone_verified: bool) -> tuple[str, str]:
    if not phone_verified:
        return (
            "phone_registered_bank_recorded_sms_suspended",
            "Bank destination is recorded server-side and tied to a registered phone number. SMS phone ownership verification is suspended for controlled testing.",
        )
    if region_status == "matched":
        return (
            "phone_verified_bank_recorded_region_matched",
            "Bank destination is recorded server-side, tied to a verified phone, and its declared region aligns with the phone region.",
        )
    if region_status == "explained_mismatch":
        return (
            "phone_verified_bank_recorded_region_explained",
            "Bank destination is recorded server-side and tied to a verified phone. The phone and bank regions differ, and the explanation was recorded for trust review.",
        )
    if region_status == "partial":
        return (
            "phone_verified_bank_recorded_region_partial",
            "Bank destination is recorded server-side and tied to a verified phone, but region evidence is still partial.",
        )
    return (
        "phone_verified_bank_recorded",
        "Bank destination is recorded server-side and tied to a verified phone.",
    )


def _owner_repair_verification_event_type(verification_type: Any) -> str:
    vt = _safe_str(verification_type).lower()
    if vt == "bank":
        return "identity.bank_verification_checked"
    if vt == "drivers_licence":
        return "identity.drivers_licence_verification_checked"
    if vt == "official_id":
        return "identity.official_id_recorded"
    if vt == "identity_photo":
        return "identity.photo_evidence_checked"
    return "identity.verification_checked"


def _assign_gsn_id_no_commit(db: Session, user: User) -> User:
    if _safe_str(getattr(user, "gmfn_id", None)):
        return user
    for _ in range(20):
        candidate = generate_gmfn_id()
        if db.query(User).filter(User.gmfn_id == candidate).first() is None:
            user.gmfn_id = candidate
            db.add(user)
            db.flush()
            return user
    raise HTTPException(status_code=500, detail="Could not generate unique GSN ID")


def _community_ownership_intake_preview(
    db: Session,
    *,
    clan: Clan,
    intake: EntryPhoneVerification,
) -> dict[str, Any]:
    current_owner = (
        db.get(User, int(clan.created_by_user_id))
        if getattr(clan, "created_by_user_id", None)
        else None
    )
    return {
        "community": _community_row(db, clan),
        "requested_owner": _entry_intake_owner_label(db, intake),
        "current_owner": _user_label(current_owner),
        "membership_action": "create_identity_then_add_admin",
        "will_create_owner_identity": True,
        "will_set_created_by_user_id": None,
        "will_preserve_community_code": True,
        "will_preserve_history": True,
        "will_remove_other_admins": False,
        "boundary": (
            "This will create the missing GSN identity from the recorded onboarding intake, "
            "then record that identity as canonical owner/admin. It does not delete historical evidence or erase previous activity."
        ),
    }


def _community_ownership_missing_community_preview(
    db: Session,
    *,
    community_name: str,
    intake: EntryPhoneVerification,
    owner: Optional[User] = None,
) -> dict[str, Any]:
    clean_name = _safe_str(community_name)
    return {
        "community": {
            "clan_id": None,
            "name": clean_name,
            "description": None,
            "community_code": "Will be created",
            "status": "pending_creation",
            "created_by_user_id": None,
            "created_at": None,
            "canonical_owner": None,
            "admin_members": [],
        },
        "requested_owner": _user_label(owner) if owner is not None else _entry_intake_owner_label(db, intake),
        "current_owner": None,
        "membership_action": "create_community_and_add_admin" if owner is not None else "create_community_and_owner_identity",
        "will_create_community": True,
        "will_create_owner_identity": owner is None,
        "will_set_created_by_user_id": None,
        "will_preserve_community_code": False,
        "will_preserve_history": True,
        "will_remove_other_admins": False,
        "boundary": (
            "No existing normal GSN community matched that name. This will create the missing community from the typed name, "
            "create or attach the owner identity from the stuck intake, and record the owner/admin after proof is checked."
        ),
    }


def _create_missing_community_from_intake_no_commit(
    db: Session,
    *,
    community_name: str,
    intake: EntryPhoneVerification,
) -> Clan:
    clean_name = _safe_str(community_name)
    if len(clean_name) < 2:
        raise HTTPException(status_code=400, detail="Community name is required before creating the missing community.")
    try:
        return _resolve_community_for_ownership(db, community_name=clean_name)
    except HTTPException as exc:
        if exc.status_code not in (404,):
            raise

    now = datetime.now(timezone.utc)
    clan = Clan(
        name=clean_name,
        description="Created from a stuck onboarding intake by Command Centre repair.",
        invite_code=secrets.token_urlsafe(16),
        invite_created_at=now,
        invite_expires_at=now + timedelta(days=7),
        invite_max_uses=None,
        invite_uses=0,
        status="active",
    )
    db.add(clan)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Community name already exists. Search records and select the exact community before preview.")
    if not _safe_str(getattr(clan, "community_code", None)):
        clan.community_code = f"GSN-C-{int(clan.id):06d}"
        db.add(clan)
        db.flush()
    return clan


def _create_owner_identity_from_intake_no_commit(
    db: Session,
    *,
    clan: Clan,
    intake: EntryPhoneVerification,
    admin_user: User,
    reviewer_note: str,
) -> User:
    if getattr(intake, "consumed_at", None) is not None:
        raise HTTPException(status_code=409, detail="This onboarding intake has already been used.")
    if not _entry_intake_has_owner_repair_evidence(db, intake):
        raise HTTPException(
            status_code=400,
            detail="This intake does not have enough recorded owner evidence to create a GSN identity.",
        )

    existing_user = _entry_user_for_intake(db, intake)
    if existing_user is not None:
        return existing_user

    email = _owner_repair_founder_email(intake)
    phone_e164 = _safe_str(getattr(intake, "phone_e164", None))
    if not phone_e164:
        raise HTTPException(status_code=400, detail="A phone number is required before creating the GSN identity.")

    email_clash = db.query(User).filter(func.lower(User.email) == email.lower()).first()
    if email_clash is not None:
        raise HTTPException(status_code=409, detail="That intake email already belongs to a GSN identity. Use the existing owner identity instead.")
    phone_clash = db.query(User).filter(User.phone_e164.in_(_ownership_phone_candidates(phone_e164))).first()
    if phone_clash is not None:
        raise HTTPException(status_code=409, detail="That intake phone already belongs to a GSN identity. Use the existing owner identity instead.")

    user = User(
        email=email,
        hashed_password="PENDING_APPROVAL",
        role="admin",
        display_name=_safe_str(getattr(intake, "display_name", None)) or "Community owner",
        phone_e164=phone_e164,
        phone_verified_at=getattr(intake, "verified_at", None),
    )
    db.add(user)
    try:
        db.flush()
        user = _assign_gsn_id_no_commit(db, user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Founder identity already exists")

    checks = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.entry_phone_verification_id == int(intake.id))
        .order_by(IdentityVerificationCheck.created_at.asc(), IdentityVerificationCheck.id.asc())
        .all()
    )

    identity_photo_url: Optional[str] = None
    for check in checks:
        check.user_id = int(user.id)
        db.add(check)
        provider_response = _check_provider_response(check)
        if _safe_str(check.verification_type).lower() == "identity_photo" and not identity_photo_url:
            identity_photo_url = _safe_str(provider_response.get("evidence_url")) or None
        log_trust_event(
            db,
            event_type=_owner_repair_verification_event_type(check.verification_type),
            clan_id=int(clan.id),
            actor_user_id=int(admin_user.id),
            subject_user_id=int(user.id),
            meta=build_trust_meta(
                reason="identity_verification_check_attached_by_owner_repair",
                note=_safe_str(check.explanation) or "Recorded intake evidence was attached during Command Centre owner repair.",
                system=True,
                extra={
                    "entry_verification_id": int(intake.id),
                    "verification_check_id": int(check.id),
                    "verification_type": _safe_str(check.verification_type),
                    "verification_status": _safe_str(check.status),
                    "provider_key": _safe_str(check.provider_key) or None,
                    "admin_repair": True,
                },
            ),
            dedupe_key=f"admin-intake:{int(intake.id)}:check:{int(check.id)}",
            commit=False,
            refresh=False,
        )

    if identity_photo_url:
        user.profile_image_url = identity_photo_url
        db.add(user)
        log_trust_event(
            db,
            event_type="identity.photo_evidence_recorded",
            clan_id=int(clan.id),
            actor_user_id=int(admin_user.id),
            subject_user_id=int(user.id),
            meta=build_trust_meta(
                reason="identity_photo_attached_by_owner_repair",
                note="Founder photo/selfie evidence from the stuck intake was attached during Command Centre owner repair.",
                system=True,
                extra={
                    "entry_verification_id": int(intake.id),
                    "profile_image_url": identity_photo_url,
                    "provider_verified": False,
                    "requires_review": True,
                    "admin_repair": True,
                },
            ),
            dedupe_key=f"admin-intake:{int(intake.id)}:photo",
            commit=False,
            refresh=False,
        )

    phone_verified = getattr(intake, "verified_at", None) is not None
    log_trust_event(
        db,
        event_type="identity.phone_verified" if phone_verified else "identity.phone_registered",
        clan_id=int(clan.id),
        actor_user_id=int(admin_user.id),
        subject_user_id=int(user.id),
        meta=build_trust_meta(
            reason="owner_repair_phone_attached_from_intake",
            note=(
                "Founder phone verification was attached from the stuck onboarding intake."
                if phone_verified
                else "Founder phone registration was attached from the stuck onboarding intake while SMS verification was suspended."
            ),
            system=True,
            extra={
                "entry_verification_id": int(intake.id),
                "phone_e164": phone_e164,
                "sms_suspended": not phone_verified,
                "admin_repair": True,
            },
        ),
        dedupe_key=f"admin-intake:{int(intake.id)}:phone",
        commit=False,
        refresh=False,
    )

    bank_recorded = getattr(intake, "bank_details_recorded_at", None) is not None
    if bank_recorded and _safe_str(getattr(intake, "bank_name", None)) and _safe_str(getattr(intake, "bank_account_number", None)):
        payout_status, payout_note = _owner_repair_bank_status_note(
            _safe_str(getattr(intake, "region_consistency_status", None)),
            phone_verified,
        )
        payout = UserPayoutDestination(
            user_id=int(user.id),
            destination_name=_safe_str(getattr(intake, "bank_account_name", None)) or user.display_name or "Community owner",
            bank_name=_safe_str(getattr(intake, "bank_name", None)),
            account_number=_owner_repair_account_number(getattr(intake, "bank_account_number", None)),
            phone_number=_owner_repair_phone(getattr(intake, "bank_phone_number", None), phone_e164),
            country=_safe_str(getattr(intake, "bank_country", None)) or None,
            currency=_safe_str(getattr(intake, "bank_currency", None)).upper() or "NGN",
            note=_safe_str(getattr(intake, "bank_note", None)) or None,
            verification_status=payout_status,
            verification_note=payout_note,
            phone_country_hint=_safe_str(getattr(intake, "phone_country_hint", None)).upper() or None,
            locale_country_hint=_safe_str(getattr(intake, "locale_country_hint", None)).upper() or None,
            region_consistency_status=_safe_str(getattr(intake, "region_consistency_status", None)) or None,
            region_consistency_note=_safe_str(getattr(intake, "region_consistency_note", None)) or None,
            verified_at=None,
        )
        db.add(payout)
        log_trust_event(
            db,
            event_type="identity.bank_destination_recorded",
            clan_id=int(clan.id),
            actor_user_id=int(admin_user.id),
            subject_user_id=int(user.id),
            meta=build_trust_meta(
                reason="bank_destination_attached_by_owner_repair",
                note="Founder bank destination from the stuck intake was attached during Command Centre owner repair.",
                system=True,
                extra={
                    "entry_verification_id": int(intake.id),
                    "bank_name": payout.bank_name,
                    "currency": payout.currency,
                    "verification_status": payout.verification_status,
                    "admin_repair": True,
                },
            ),
            dedupe_key=f"admin-intake:{int(intake.id)}:bank",
            commit=False,
            refresh=False,
        )

    if _safe_str(getattr(intake, "driver_licence_number", None)):
        log_trust_event(
            db,
            event_type="identity.drivers_licence_recorded",
            clan_id=int(clan.id),
            actor_user_id=int(admin_user.id),
            subject_user_id=int(user.id),
            meta=build_trust_meta(
                reason="drivers_licence_attached_by_owner_repair",
                note="Founder driver's licence reference from the stuck intake was attached during Command Centre owner repair.",
                system=True,
                extra={
                    "entry_verification_id": int(intake.id),
                    "driver_licence_country": _safe_str(getattr(intake, "driver_licence_country", None)) or None,
                    "driver_licence_last4": _safe_str(getattr(intake, "driver_licence_number", None))[-4:],
                    "admin_repair": True,
                },
            ),
            dedupe_key=f"admin-intake:{int(intake.id)}:licence",
            commit=False,
            refresh=False,
        )

    intake.consumed_at = datetime.now(timezone.utc)
    db.add(intake)
    db.add(user)
    db.flush()
    return user
def _ensure_ownership_admin_membership_no_commit(
    db: Session,
    *,
    clan: Clan,
    owner: User,
) -> ClanMembership:
    active = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan.id),
            ClanMembership.user_id == int(owner.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if active is not None:
        if _safe_str(getattr(active, "role", None)).lower() != "admin":
            active.role = "admin"
            db.add(active)
            db.flush()
        return active

    archived = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan.id),
            ClanMembership.user_id == int(owner.id),
            ClanMembership.left_at.isnot(None),
        )
        .order_by(ClanMembership.id.desc())
        .first()
    )
    if archived is not None:
        archived.left_at = None
        archived.role = "admin"
        db.add(archived)
        db.flush()
        return archived

    membership = ClanMembership(
        clan_id=int(clan.id),
        user_id=int(owner.id),
        role="admin",
        personal_pool_balance=Decimal("0"),
    )
    db.add(membership)
    db.flush()
    return membership


def _primary_membership_clan_id(db: Session, user_id: int) -> Optional[int]:
    row = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.id.asc())
        .first()
    )
    if row is None:
        return None
    return int(row.clan_id)


def _entry_stage(row: EntryPhoneVerification, user: Optional[User], now: datetime) -> str:
    expires_at = _utc_dt(getattr(row, "expires_at", None))

    if user is not None and getattr(row, "consumed_at", None) is not None:
        return "completed"
    if user is not None:
        return "account_exists"
    if expires_at is not None and expires_at < now:
        return "expired"
    if getattr(row, "bank_details_recorded_at", None) is not None:
        return "ready_for_community"
    if getattr(row, "verified_at", None) is not None:
        return "awaiting_bank"
    return "awaiting_phone"


def _entry_next_action(stage: str) -> str:
    if stage == "completed":
        return "Creation appears complete. If the tester is stuck, ask them to sign in or use the frontend recovery path."
    if stage == "account_exists":
        return "The phone or email already belongs to an account. Guide the tester to sign in instead of restarting."
    if stage == "ready_for_community":
        return "Phone and bank or wallet details are ready. The tester should finish community setup."
    if stage == "awaiting_bank":
        return "Phone evidence is ready. The tester should add bank or wallet details."
    if stage == "awaiting_phone":
        return "The tester started entry but phone evidence is not complete yet."
    if stage == "expired":
        return "The pilot session expired before completion. Ask the tester to start again with the same name, phone, and email."
    return "Review this intake record."


def _join_stage(row: ClanJoinRequest) -> str:
    status = _safe_str(getattr(row, "status", "")).lower() or "pending"
    if status == "approved" and getattr(row, "activation_link", None):
        return "approved_activation_ready"
    if status == "approved":
        return "approved_missing_activation"
    if status == "rejected":
        return "rejected"
    return status


def _join_next_action(stage: str) -> str:
    if stage == "approved_activation_ready":
        return "The request is approved and has an activation link. Confirm the tester received it."
    if stage == "approved_missing_activation":
        return "The request is approved but the activation link is missing. Admin should regenerate or review activation delivery."
    if stage == "pending":
        return "Members still need to review or vote on this join request."
    if stage == "rejected":
        return "No action unless the community wants to invite this person again."
    return "Review this join request."


@router.get("/community-ownership/lookup")
def admin_community_ownership_lookup(
    community_name: Optional[str] = Query(default=None, max_length=120),
    owner_query: Optional[str] = Query(default=None, max_length=240),
    limit: int = Query(default=10, ge=1, le=25),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_platform_admin(current_user)

    clean_name = _safe_str(community_name)
    clean_owner = _safe_str(owner_query)
    community_rows = []
    owner_rows = []
    owner_intake_rows = []

    if clean_name:
        name_like = f"%{clean_name.lower()}%"
        text_keys = _community_ownership_text_keys(clean_name)
        compact_key = _community_ownership_compact_key(clean_name)
        community_filters = [
            func.lower(Clan.name).like(name_like),
            func.lower(Clan.community_code).like(name_like),
        ]
        if text_keys:
            community_filters.extend(
                [
                    func.lower(Clan.name).in_(text_keys),
                    func.lower(Clan.community_code).in_(text_keys),
                ]
            )
        if compact_key:
            community_filters.extend(
                [
                    _community_ownership_compact_expr(Clan.name) == compact_key,
                    _community_ownership_compact_expr(Clan.community_code) == compact_key,
                ]
            )
        communities = (
            db.query(Clan)
            .filter(or_(*community_filters))
            .order_by(
                (func.lower(Clan.name) == clean_name.lower()).desc(),
                (_community_ownership_compact_expr(Clan.name) == compact_key).desc(),
                (_community_ownership_compact_expr(Clan.community_code) == compact_key).desc(),
                Clan.id.asc(),
            )
            .limit(int(limit))
            .all()
        )
        community_rows = [_community_row(db, clan) for clan in communities]

    if clean_owner:
        owner_like = f"%{clean_owner.lower()}%"
        owner_filters = [
            func.lower(User.email).like(owner_like),
            func.lower(User.display_name).like(owner_like),
        ]
        gsn_id_candidates = _ownership_gsn_id_candidates(clean_owner)
        if gsn_id_candidates:
            owner_filters.append(
                func.lower(User.gmfn_id).in_([item.lower() for item in gsn_id_candidates])
            )
            owner_filters.append(func.lower(User.gmfn_id).like(owner_like))
        phone_candidates = _ownership_phone_candidates(clean_owner)
        if phone_candidates:
            owner_filters.append(User.phone_e164.in_(phone_candidates))
            owner_digits = "".join(ch for ch in clean_owner if ch.isdigit())
            if len(owner_digits) >= 6:
                owner_filters.append(User.phone_e164.like(f"%{owner_digits[-8:]}%"))

        owners = (
            db.query(User)
            .filter(or_(*owner_filters))
            .order_by(User.id.asc())
            .limit(int(limit))
            .all()
        )
        owner_rows = [_user_label(owner) for owner in owners]
        owner_intake_rows = _owner_intake_rows(db, owner_query=clean_owner, limit=int(limit))

    return {
        "ok": True,
        "community_name": clean_name or None,
        "owner_query": clean_owner or None,
        "communities": community_rows,
        "owners": owner_rows,
        "owner_intakes": owner_intake_rows,
        "boundary": (
            "Lookup is read-only. Use preview first, then execute only after the owner proof has been checked."
        ),
    }



def _domain_ownership_domain_row(db: Session, domain: CommunityDomain) -> dict[str, Any]:
    owner = db.get(User, int(domain.owner_user_id)) if domain.owner_user_id else None
    memberships = (
        db.query(CommunityDomainMembership, User)
        .join(User, User.id == CommunityDomainMembership.user_id)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.status == "active")
        .order_by(CommunityDomainMembership.id.asc())
        .all()
    )
    return {
        "community_domain_id": int(domain.id),
        "domain_name": _safe_str(domain.domain_name),
        "display_name": _safe_str(domain.display_name),
        "domain_type": _safe_str(domain.domain_type),
        "template_key": _safe_str(domain.template_key),
        "status": _safe_str(domain.status),
        "verification_status": _safe_str(domain.verification_status),
        "clan_id": int(domain.clan_id) if domain.clan_id is not None else None,
        "owner_user_id": int(domain.owner_user_id),
        "canonical_owner": _user_label(owner),
        "active_members": [
            {
                "membership_id": int(membership.id),
                "role": _safe_str(membership.role),
                "status": _safe_str(membership.status),
                **(_user_label(user) or {}),
            }
            for membership, user in memberships
        ],
    }


def _resolve_domain_for_ownership(
    db: Session,
    *,
    community_domain_id: Optional[int] = None,
    domain_name: Optional[str] = None,
) -> CommunityDomain:
    if community_domain_id:
        domain = db.get(CommunityDomain, int(community_domain_id))
        if domain is None:
            raise HTTPException(status_code=404, detail="Community Domain not found.")
        return domain

    name = _safe_str(domain_name)
    if not name:
        raise HTTPException(status_code=400, detail="Community Domain name or ID is required.")

    text_keys = _community_ownership_text_keys(name)
    compact_key = _community_ownership_compact_key(name)
    filters = []
    if text_keys:
        filters.extend([
            func.lower(CommunityDomain.domain_name).in_(text_keys),
            func.lower(CommunityDomain.display_name).in_(text_keys),
        ])
    if compact_key:
        filters.extend([
            _community_ownership_compact_expr(CommunityDomain.domain_name) == compact_key,
            _community_ownership_compact_expr(CommunityDomain.display_name) == compact_key,
        ])
    if not filters:
        raise HTTPException(status_code=400, detail="Community Domain name is required.")

    rows = db.query(CommunityDomain).filter(or_(*filters)).order_by(CommunityDomain.id.asc()).all()
    if not rows:
        raise HTTPException(status_code=404, detail="Community Domain name was not found.")
    if len(rows) > 1:
        raise HTTPException(status_code=409, detail="More than one Community Domain matched. Use the exact Community Domain ID.")
    return rows[0]


def _ensure_domain_owner_membership_no_commit(db: Session, *, domain: CommunityDomain, owner: User) -> CommunityDomainMembership:
    membership = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.user_id == int(owner.id))
        .first()
    )
    if membership is None:
        membership = CommunityDomainMembership(community_domain_id=int(domain.id), user_id=int(owner.id))
        db.add(membership)
    membership.role = "owner"
    membership.status = "active"
    db.flush()
    return membership


def _community_domain_ownership_preview(db: Session, *, domain: CommunityDomain, owner: User) -> dict[str, Any]:
    current_owner = db.get(User, int(domain.owner_user_id)) if domain.owner_user_id else None
    active_membership = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.user_id == int(owner.id))
        .filter(CommunityDomainMembership.status == "active")
        .first()
    )
    if int(owner.id) == int(domain.owner_user_id):
        membership_action = "already_owner"
    elif active_membership is None:
        membership_action = "add_owner"
    else:
        membership_action = "promote_to_owner"
    return {
        "community_domain": _domain_ownership_domain_row(db, domain),
        "requested_owner": _user_label(owner),
        "current_owner": _user_label(current_owner),
        "membership_action": membership_action,
        "will_set_owner_user_id": int(owner.id),
        "will_preserve_domain_name": True,
        "will_preserve_history": True,
        "will_delete_domain": False,
        "will_make_previous_owner_domain_admin": bool(current_owner and int(current_owner.id) != int(owner.id)),
        "boundary": "This records the canonical owner for the existing Community Domain. It does not delete the domain, make a duplicate name, erase payment history, or verify ownership without proof.",
    }

@router.post("/community-ownership/reconcile")
def admin_community_ownership_reconcile(
    payload: CommunityOwnershipReconcileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_platform_admin(current_user)

    intake: Optional[EntryPhoneVerification] = None
    if payload.entry_verification_id:
        intake = _resolve_entry_intake_for_ownership(db, int(payload.entry_verification_id))

    created_community = False
    clan: Optional[Clan] = None
    try:
        clan = _resolve_community_for_ownership(
            db,
            clan_id=payload.clan_id,
            community_name=payload.community_name,
        )
    except HTTPException as exc:
        if exc.status_code == 404 and intake is not None and _safe_str(payload.community_name):
            clan = None
        else:
            raise

    created_owner_identity = False
    if intake is not None:
        owner = _entry_user_for_intake(db, intake)
        if clan is None:
            preview = _community_ownership_missing_community_preview(
                db,
                community_name=_safe_str(payload.community_name),
                intake=intake,
                owner=owner,
            )
        else:
            preview = (
                _community_ownership_preview(db, clan=clan, owner=owner)
                if owner is not None
                else _community_ownership_intake_preview(db, clan=clan, intake=intake)
            )
    else:
        owner = _resolve_owner_for_ownership(db, payload)
        if clan is None:
            raise HTTPException(status_code=404, detail="Community name was not found.")
        preview = _community_ownership_preview(db, clan=clan, owner=owner)

    reviewer_note = _safe_str(payload.reviewer_note)
    if not payload.execute:
        if preview.get("will_create_community") and preview.get("will_create_owner_identity"):
            message = "Preview ready. This will create the missing community and the owner GSN ID from the recorded intake."
        elif preview.get("will_create_community"):
            message = "Preview ready. This will create the missing community and record the owner/admin."
        elif preview.get("will_create_owner_identity"):
            message = "Preview ready. This will create the missing GSN identity from the recorded intake, then record the canonical owner."
        else:
            message = "Preview ready. Confirm owner proof before recording the canonical owner."
        return {
            "ok": True,
            "mode": "preview",
            "executed": False,
            "message": message,
            **preview,
        }

    if not bool(payload.owner_proof_confirmed):
        raise HTTPException(
            status_code=400,
            detail="Owner proof confirmation is required before changing community ownership.",
        )
    if len(reviewer_note) < 12:
        raise HTTPException(
            status_code=400,
            detail="Reviewer note is required before changing community ownership.",
        )

    if clan is None:
        if intake is None:
            raise HTTPException(status_code=404, detail="Community name was not found.")
        clan = _create_missing_community_from_intake_no_commit(
            db,
            community_name=_safe_str(payload.community_name),
            intake=intake,
        )
        created_community = True

    if intake is not None and owner is None:
        owner = _create_owner_identity_from_intake_no_commit(
            db,
            clan=clan,
            intake=intake,
            admin_user=current_user,
            reviewer_note=reviewer_note,
        )
        created_owner_identity = True
        preview = _community_ownership_preview(db, clan=clan, owner=owner)

    previous_owner_id = int(clan.created_by_user_id) if clan.created_by_user_id else None
    clan.created_by_user_id = int(owner.id)
    db.add(clan)
    membership = _ensure_ownership_admin_membership_no_commit(db=db, clan=clan, owner=owner)

    if created_community:
        log_trust_event(
            db,
            event_type="community.created_from_stuck_intake",
            clan_id=int(clan.id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(owner.id),
            meta=build_trust_meta(
                reason="community_created_from_stuck_onboarding_intake",
                note=reviewer_note,
                trust_delta="0.00",
                system=True,
                extra={
                    "community_id": int(clan.id),
                    "community_name": _safe_str(clan.name),
                    "community_code": _safe_str(getattr(clan, "community_code", None)) or f"GSN-C-{int(clan.id):06d}",
                    "entry_verification_id": int(intake.id) if intake is not None else None,
                    "created_owner_identity": created_owner_identity,
                    "owner_proof_confirmed": True,
                    "admin_repair": True,
                },
            ),
            commit=False,
            refresh=False,
        )

    meta = build_trust_meta(
        reason="community_ownership_reconciled",
        note=reviewer_note,
        trust_delta="0.00",
        system=True,
        extra={
            "community_id": int(clan.id),
            "community_name": _safe_str(clan.name),
            "community_code": _safe_str(getattr(clan, "community_code", None)) or f"GSN-C-{int(clan.id):06d}",
            "previous_created_by_user_id": previous_owner_id,
            "canonical_owner_user_id": int(owner.id),
            "canonical_owner_gmfn_id": _safe_str(getattr(owner, "gmfn_id", None)) or None,
            "entry_verification_id": int(intake.id) if intake is not None else None,
            "created_community": created_community,
            "created_owner_identity": created_owner_identity,
            "owner_proof_confirmed": True,
            "admin_membership_id": int(membership.id),
            "membership_action": preview.get("membership_action"),
            "history_preserved": True,
            "other_admins_removed": False,
        },
    )
    log_trust_event(
        db,
        event_type="community.ownership_reconciled",
        clan_id=int(clan.id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(owner.id),
        meta=meta,
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(clan)
    try:
        apply_trust_score(db, user_id=int(owner.id))
    except Exception:
        pass

    refreshed_owner = db.get(User, int(owner.id)) or owner
    result_preview = _community_ownership_preview(db, clan=clan, owner=refreshed_owner)
    result_preview["created_community"] = created_community
    result_preview["created_owner_identity"] = created_owner_identity
    result_preview["entry_verification_id"] = int(intake.id) if intake is not None else None

    if created_community and created_owner_identity:
        message = (
            f"{_safe_str(clan.name)} is created and repaired. The owner now has GSN ID "
            f"{_safe_str(getattr(refreshed_owner, 'gmfn_id', None))} and is recorded as owner/admin."
        )
    elif created_community:
        message = f"{_safe_str(clan.name)} is created and now records this GSN identity as owner/admin."
    elif created_owner_identity:
        message = (
            f"{_safe_str(clan.name)} is repaired. The owner now has GSN ID "
            f"{_safe_str(getattr(refreshed_owner, 'gmfn_id', None))} and is recorded as owner/admin."
        )
    else:
        message = f"{_safe_str(clan.name)} now records this GSN identity as canonical owner/admin."

    return {
        "ok": True,
        "mode": "execute",
        "executed": True,
        "message": message,
        **result_preview,
    }


@router.post("/community-domain-ownership/reconcile")
def admin_community_domain_ownership_reconcile(
    payload: CommunityDomainOwnershipReconcileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_platform_admin(current_user)
    domain = _resolve_domain_for_ownership(db, community_domain_id=payload.community_domain_id, domain_name=payload.domain_name)
    owner = _resolve_owner_for_ownership(db, payload)
    preview = _community_domain_ownership_preview(db, domain=domain, owner=owner)

    reviewer_note = _safe_str(payload.reviewer_note)
    if not payload.execute:
        return {"ok": True, "mode": "preview", "executed": False, "message": "Preview ready. Confirm owner proof before transferring the Community Domain owner.", **preview}

    if not bool(payload.owner_proof_confirmed):
        raise HTTPException(status_code=400, detail="Owner proof confirmation is required before changing Community Domain ownership.")
    if len(reviewer_note) < 12:
        raise HTTPException(status_code=400, detail="Reviewer note is required before changing Community Domain ownership.")

    previous_owner_id = int(domain.owner_user_id)
    previous_owner_membership = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.user_id == previous_owner_id)
        .first()
    )
    domain.owner_user_id = int(owner.id)
    db.add(domain)
    owner_membership = _ensure_domain_owner_membership_no_commit(db=db, domain=domain, owner=owner)

    previous_owner_role_after = None
    if previous_owner_id != int(owner.id) and previous_owner_membership is not None:
        if _safe_str(previous_owner_membership.role).lower() == "owner":
            previous_owner_membership.role = "admin"
            previous_owner_membership.status = "active"
            previous_owner_role_after = "admin"
            db.add(previous_owner_membership)

    log_trust_event(
        db,
        event_type="community_domain.ownership_reconciled",
        clan_id=int(domain.clan_id) if domain.clan_id is not None else None,
        actor_user_id=int(current_user.id),
        subject_user_id=int(owner.id),
        meta=build_trust_meta(
            reason="community_domain_ownership_reconciled",
            note=reviewer_note,
            trust_delta="0.00",
            system=True,
            extra={
                "community_domain_id": int(domain.id),
                "domain_name": _safe_str(domain.domain_name),
                "display_name": _safe_str(domain.display_name),
                "previous_owner_user_id": previous_owner_id,
                "canonical_owner_user_id": int(owner.id),
                "canonical_owner_gmfn_id": _safe_str(getattr(owner, "gmfn_id", None)) or None,
                "owner_membership_id": int(owner_membership.id),
                "previous_owner_role_after": previous_owner_role_after,
                "owner_proof_confirmed": True,
                "history_preserved": True,
                "domain_deleted": False,
                "duplicate_domain_created": False,
            },
        ),
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(domain)

    result_preview = _community_domain_ownership_preview(db, domain=domain, owner=owner)
    return {"ok": True, "mode": "execute", "executed": True, "message": f"{_safe_str(domain.display_name or domain.domain_name)} now records this GSN identity as Community Domain owner.", **result_preview}

@router.post("/identity-verification-checks/{check_id}/decision")
def admin_identity_verification_decision(
    check_id: int,
    payload: IdentityVerificationDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin/manual review decision for founder identity photo evidence.

    This does not pretend to be provider KYC or liveness. It records a human
    review decision and feeds the append-only Trust Event trail.
    """
    _require_platform_admin(current_user)

    decision = _safe_str(payload.decision).lower().replace("-", "_")
    decision_aliases = {
        "accept": "verify",
        "accepted": "verify",
        "approved": "verify",
        "verify": "verify",
        "verified": "verify",
        "reject": "reject",
        "rejected": "reject",
        "fail": "reject",
        "failed": "reject",
        "needs_more": "needs_more",
        "needs_more_evidence": "needs_more",
        "more": "needs_more",
    }
    decision = decision_aliases.get(decision, decision)
    if decision not in {"verify", "reject", "needs_more"}:
        raise HTTPException(
            status_code=400,
            detail="Decision must be verify, reject, or needs_more.",
        )

    check = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.id == int(check_id))
        .with_for_update()
        .one_or_none()
    )
    if check is None:
        raise HTTPException(status_code=404, detail="Identity verification check not found")
    if _safe_str(check.verification_type) != "identity_photo":
        raise HTTPException(
            status_code=400,
            detail="Only identity photo checks can be reviewed with this endpoint.",
        )
    subject_user = db.get(User, int(check.user_id)) if check.user_id else None
    if subject_user is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Identity photo review can only be decided after account creation "
                "attaches this evidence to a user."
            ),
        )

    now = datetime.now(timezone.utc)
    provider_response = _check_provider_response(check)
    evidence_url = _safe_str(provider_response.get("evidence_url")) or None
    reviewer_note = _safe_str(payload.reviewer_note) or None
    previous_decision = _safe_str(provider_response.get("review_decision")).lower()
    try:
        review_cycle = max(1, int(provider_response.get("review_cycle") or 1))
    except Exception:
        review_cycle = 1
    if previous_decision in {"verify", "reject"}:
        if decision == previous_decision:
            return {
                **_serialize_identity_check(check),
                "decision": previous_decision,
                "trust_summary": apply_trust_score(db, user_id=int(subject_user.id)),
                "already_reviewed": True,
            }
        raise HTTPException(
            status_code=409,
            detail=(
                "This identity photo already has a terminal review decision. "
                "Use a correction/reversal flow before changing it."
            ),
        )

    if decision == "verify":
        check.status = "matched"
        check.verified_at = now
        check.confidence_score = max(int(check.confidence_score or 0), 70)
        check.explanation = (
            "Photo/selfie evidence was reviewed and accepted for identity continuity. "
            "This is manual review evidence, not external liveness or passport-provider verification."
        )
        event_type = "identity.photo_evidence_verified"
        event_reason = "identity_photo_manual_review_accepted"
        trust_delta = "0.20"
    elif decision == "reject":
        check.status = "failed"
        check.verified_at = None
        check.confidence_score = 0
        check.explanation = (
            "Photo/selfie evidence was reviewed and could not be accepted. "
            "A clearer selfie, passport photo, or identity photo is needed before this evidence can support trust."
        )
        event_type = "identity.photo_evidence_rejected"
        event_reason = "identity_photo_manual_review_rejected"
        trust_delta = "0.00"
    else:
        check.status = "manual_review_required"
        check.verified_at = None
        check.confidence_score = max(int(check.confidence_score or 0), 25)
        check.explanation = (
            "Photo/selfie evidence needs a clearer review before it can be accepted for identity continuity."
        )
        event_type = "identity.photo_evidence_needs_more"
        event_reason = "identity_photo_manual_review_needs_more"
        trust_delta = "0.00"

    provider_response.update(
        {
            "provider_configured": False,
            "provider_verified": False,
            "manual_review": True,
            "review_decision": decision,
            "reviewer_user_id": int(current_user.id),
            "reviewed_at": now.isoformat(),
            "reviewer_note": reviewer_note,
            "review_verified": decision == "verify",
            "review_cycle": review_cycle,
            "correction_required": False,
        }
    )
    check.provider_response_json = _json_text(provider_response)

    if decision == "verify" and evidence_url:
        subject_user.profile_image_url = evidence_url
        db.add(subject_user)
    elif decision == "reject" and evidence_url and subject_user.profile_image_url == evidence_url:
        subject_user.profile_image_url = None
        db.add(subject_user)

    meta = build_trust_meta(
        reason=event_reason,
        note=reviewer_note
        or (
            "Founder identity photo evidence was reviewed by a platform admin. "
            "No external liveness or KYC provider was connected for this decision."
        ),
        trust_delta=trust_delta,
        system=True,
        extra={
            "verification_check_id": int(check.id),
            "decision": decision,
            "evidence_url": evidence_url,
            "provider_verified": False,
            "manual_review": True,
            "review_cycle": review_cycle,
            "affects_trust_reading": decision == "verify",
        },
    )
    log_trust_event(
        db,
        event_type=event_type,
        clan_id=_primary_membership_clan_id(db, int(subject_user.id)),
        actor_user_id=int(current_user.id),
        subject_user_id=int(subject_user.id),
        meta=meta,
        dedupe_key=f"identity_photo_review:{int(check.id)}:{review_cycle}:{decision}",
        commit=False,
        refresh=False,
    )

    db.add(check)
    db.commit()
    db.refresh(check)

    trust_summary = apply_trust_score(db, user_id=int(subject_user.id))

    return {
        **_serialize_identity_check(check),
        "decision": decision,
        "trust_summary": trust_summary,
    }


@router.get("/identity-verification-checks/{check_id}/evidence")
def admin_identity_verification_evidence(
    check_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authenticated admin-only preview of private identity-photo evidence.

    The stored upload URL is still an internal pointer; admin UI should use
    this route instead of opening the raw /uploads path.
    """
    _require_platform_admin(current_user)

    check = db.get(IdentityVerificationCheck, int(check_id))
    if check is None:
        raise HTTPException(status_code=404, detail="Identity verification check not found")
    if _safe_str(check.verification_type) != "identity_photo":
        raise HTTPException(
            status_code=400,
            detail="Only identity photo evidence can be opened with this endpoint.",
        )

    evidence_url = _safe_str(_check_provider_response(check).get("evidence_url"))
    candidate = _local_upload_path(evidence_url)
    if candidate is None or not candidate.is_file():
        raise HTTPException(status_code=404, detail="Identity photo evidence file not found")

    media_type = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
    return FileResponse(
        path=str(candidate),
        media_type=media_type,
        filename=candidate.name,
        headers={"Cache-Control": "no-store"},
    )


@router.post("/identity-verification-checks/{check_id}/correction")
def admin_identity_verification_correction(
    check_id: int,
    payload: IdentityVerificationCorrectionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reopen a terminal identity-photo review without deleting the old decision.

    If the previous decision strengthened trust, a reversal TrustEvent removes
    that score effect before the check returns to manual review.
    """
    _require_platform_admin(current_user)

    check = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.id == int(check_id))
        .with_for_update()
        .one_or_none()
    )
    if check is None:
        raise HTTPException(status_code=404, detail="Identity verification check not found")
    if _safe_str(check.verification_type) != "identity_photo":
        raise HTTPException(
            status_code=400,
            detail="Only identity photo checks can be corrected with this endpoint.",
        )
    subject_user = db.get(User, int(check.user_id)) if check.user_id else None
    if subject_user is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Identity photo correction can only run after account creation "
                "attaches this evidence to a user."
            ),
        )

    provider_response = _check_provider_response(check)
    previous_decision = _safe_str(provider_response.get("review_decision")).lower()
    if previous_decision not in {"verify", "reject"}:
        raise HTTPException(
            status_code=400,
            detail="Only accepted or rejected identity photo decisions can be reopened.",
        )

    try:
        previous_cycle = max(1, int(provider_response.get("review_cycle") or 1))
    except Exception:
        previous_cycle = 1
    next_cycle = previous_cycle + 1
    reason = _safe_str(payload.reason)
    now = datetime.now(timezone.utc)
    evidence_url = _safe_str(provider_response.get("evidence_url")) or None

    event_type = (
        "identity.photo_evidence_verified_reversed"
        if previous_decision == "verify"
        else "identity.photo_evidence_review_corrected"
    )
    meta = build_trust_meta(
        reason=(
            "identity_photo_verified_review_reopened"
            if previous_decision == "verify"
            else "identity_photo_rejected_review_reopened"
        ),
        note=reason,
        trust_delta="-0.20" if previous_decision == "verify" else "0.00",
        system=True,
        extra={
            "verification_check_id": int(check.id),
            "previous_decision": previous_decision,
            "review_cycle_reopened": previous_cycle,
            "next_review_cycle": next_cycle,
            "evidence_url": evidence_url,
            "provider_verified": False,
            "manual_review": True,
            "affects_trust_reading": previous_decision == "verify",
        },
    )
    log_trust_event(
        db,
        event_type=event_type,
        clan_id=_primary_membership_clan_id(db, int(subject_user.id)),
        actor_user_id=int(current_user.id),
        subject_user_id=int(subject_user.id),
        meta=meta,
        dedupe_key=f"identity_photo_review:{int(check.id)}:{previous_cycle}:correction",
        commit=False,
        refresh=False,
    )

    if previous_decision == "verify" and evidence_url and subject_user.profile_image_url == evidence_url:
        subject_user.profile_image_url = None
        db.add(subject_user)

    provider_response.update(
        {
            "provider_verified": False,
            "manual_review": True,
            "review_decision": "reopened",
            "review_verified": False,
            "previous_review_decision": previous_decision,
            "previous_review_cycle": previous_cycle,
            "review_cycle": next_cycle,
            "correction_required": True,
            "corrected_by_user_id": int(current_user.id),
            "corrected_at": now.isoformat(),
            "correction_reason": reason,
        }
    )
    check.provider_response_json = _json_text(provider_response)
    check.status = "manual_review_required"
    check.verified_at = None
    check.confidence_score = max(25, int(check.confidence_score or 0))
    check.explanation = (
        "A previous photo/selfie review decision was reopened. "
        "This evidence needs a fresh admin decision before it can strengthen trust."
    )

    db.add(check)
    db.commit()
    db.refresh(check)

    trust_summary = apply_trust_score(db, user_id=int(subject_user.id))

    return {
        **_serialize_identity_check(check),
        "decision": "reopened",
        "previous_decision": previous_decision,
        "trust_summary": trust_summary,
    }


@router.get("/exposure")
def admin_exposure(
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Minimal exposure view (admin-only).
    Exposure = sum(locked_amount - released_amount) for approved guarantees per user in clan.
    """
    _require_platform_admin(current_user)

    members = (
        db.query(
            ClanMembership.user_id,
            ClanMembership.role,
            ClanMembership.personal_pool_balance,
            User.email,
        )
        .join(User, User.id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .order_by(ClanMembership.id.asc())
        .all()
    )

    items = []
    for user_id, role, personal_pool_balance, email in members:
        uid = int(user_id)

        exposure_raw = (
            db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount), 0))
            .filter(
                LoanGuarantor.clan_id == int(clan_id),
                LoanGuarantor.guarantor_user_id == uid,
                func.lower(LoanGuarantor.status) == "approved",
            )
            .scalar()
            or 0
        )

        pool = _d(personal_pool_balance)
        exposure = _d(exposure_raw)
        available = pool - exposure
        if available < 0:
            available = Decimal("0")

        items.append(
            {
                "user_id": uid,
                "email": email,
                "role": role,
                "personal_pool_balance": str(pool),
                "exposure": str(exposure),
                "available": str(available),
            }
        )

    return {"items": items, "total": len(items), "clan_id": int(clan_id)}


@router.get("/pilot-intake")
def admin_pilot_intake(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin-only pilot intake monitor.

    This is intentionally read-only. It lets the pilot lead see whether public
    create-entry and join-request testers are moving through the funnel or
    getting stuck between phone, bank/wallet, community setup, and activation.
    """
    _require_platform_admin(current_user)

    now = datetime.now(timezone.utc)
    entry_rows = (
        db.query(EntryPhoneVerification)
        .order_by(EntryPhoneVerification.created_at.desc(), EntryPhoneVerification.id.desc())
        .limit(int(limit))
        .all()
    )

    create_items: list[dict[str, Any]] = []
    stage_counts: dict[str, int] = {}

    for row in entry_rows:
        email = _safe_str(getattr(row, "email", "")).lower()
        phone = _safe_str(getattr(row, "phone_e164", ""))
        user = None

        if phone:
            user = db.query(User).filter(User.phone_e164 == phone).first()
        if user is None and email:
            user = db.query(User).filter(func.lower(User.email) == email).first()

        payout = None
        communities: list[dict[str, Any]] = []
        if user is not None:
            payout = (
                db.query(UserPayoutDestination)
                .filter(UserPayoutDestination.user_id == int(user.id))
                .order_by(UserPayoutDestination.id.desc())
                .first()
            )

            membership_rows = (
                db.query(ClanMembership, Clan)
                .join(Clan, Clan.id == ClanMembership.clan_id)
                .filter(
                    ClanMembership.user_id == int(user.id),
                    ClanMembership.left_at.is_(None),
                )
                .order_by(ClanMembership.id.desc())
                .limit(5)
                .all()
            )

            communities = [
                {
                    "clan_id": int(clan.id),
                    "name": clan.name,
                    "marketplace_name": getattr(clan, "marketplace_name", None),
                    "role": membership.role,
                }
                for membership, clan in membership_rows
            ]

        checks = (
            db.query(IdentityVerificationCheck)
            .filter(IdentityVerificationCheck.entry_phone_verification_id == int(row.id))
            .order_by(IdentityVerificationCheck.id.asc())
            .all()
        )

        stage = _entry_stage(row, user, now)
        stage_counts[stage] = stage_counts.get(stage, 0) + 1

        create_items.append(
            {
                "verification_id": int(row.id),
                "stage": stage,
                "next_action": _entry_next_action(stage),
                "display_name": row.display_name,
                "phone_e164": row.phone_e164,
                "email": row.email,
                "created_at": _dt_iso(row.created_at),
                "expires_at": _dt_iso(row.expires_at),
                "verified_at": _dt_iso(row.verified_at),
                "bank_details_recorded_at": _dt_iso(row.bank_details_recorded_at),
                "driver_licence_recorded_at": _dt_iso(row.driver_licence_recorded_at),
                "consumed_at": _dt_iso(row.consumed_at),
                "phone_country_hint": row.phone_country_hint,
                "locale_country_hint": row.locale_country_hint,
                "bank_country": row.bank_country,
                "bank_currency": row.bank_currency,
                "bank_account_last4": _last4(row.bank_account_number),
                "region_consistency_status": row.region_consistency_status,
                "region_consistency_note": row.region_consistency_note,
                "user": {
                    "id": int(user.id),
                    "email": user.email,
                    "display_name": user.display_name,
                    "gmfn_id": user.gmfn_id,
                    "role": user.role,
                    "created_at": _dt_iso(user.created_at),
                }
                if user is not None
                else None,
                "payout_destination": {
                    "id": int(payout.id),
                    "destination_name": payout.destination_name,
                    "bank_name": payout.bank_name,
                    "account_last4": _last4(payout.account_number),
                    "country": payout.country,
                    "currency": payout.currency,
                    "verification_status": payout.verification_status,
                    "created_at": _dt_iso(payout.created_at),
                }
                if payout is not None
                else None,
                "communities": communities,
                "verification_checks": [
                    {
                        "id": int(check.id),
                        "type": check.verification_type,
                        "status": check.status,
                        "provider_key": check.provider_key,
                        "region_code": check.region_code,
                        "confidence_score": check.confidence_score,
                        "explanation": check.explanation,
                        "has_user": bool(check.user_id),
                        "user_id": int(check.user_id) if check.user_id else None,
                        "manual_review": bool(
                            _check_provider_response(check).get("manual_review")
                        ),
                        "provider_verified": bool(
                            _check_provider_response(check).get("provider_verified")
                        ),
                        "review_decision": _safe_str(
                            _check_provider_response(check).get("review_decision")
                        )
                        or None,
                        "evidence_url": _safe_str(
                            _check_provider_response(check).get("evidence_url")
                        )
                        or None,
                        "created_at": _dt_iso(check.created_at),
                    }
                    for check in checks
                ],
            }
        )

    join_rows = (
        db.query(ClanJoinRequest)
        .order_by(ClanJoinRequest.created_at.desc(), ClanJoinRequest.id.desc())
        .limit(int(limit))
        .all()
    )

    join_items: list[dict[str, Any]] = []
    join_stage_counts: dict[str, int] = {}

    for row in join_rows:
        stage = _join_stage(row)
        join_stage_counts[stage] = join_stage_counts.get(stage, 0) + 1
        clan = db.get(Clan, int(row.clan_id))
        applicant = db.get(User, int(row.applicant_user_id))
        inviter = db.get(User, int(row.invited_by_user_id)) if row.invited_by_user_id else None

        join_items.append(
            {
                "id": int(row.id),
                "stage": stage,
                "next_action": _join_next_action(stage),
                "status": row.status,
                "created_at": _dt_iso(row.created_at),
                "decided_at": _dt_iso(row.decided_at),
                "activation_generated_at": _dt_iso(row.activation_generated_at),
                "activation_delivery_status": row.activation_delivery_status,
                "has_activation_link": bool(row.activation_link),
                "clan": {
                    "id": int(clan.id),
                    "name": clan.name,
                    "marketplace_name": getattr(clan, "marketplace_name", None),
                }
                if clan is not None
                else None,
                "applicant": {
                    "id": int(applicant.id),
                    "email": applicant.email,
                    "display_name": applicant.display_name,
                    "gmfn_id": applicant.gmfn_id,
                    "phone_e164": applicant.phone_e164,
                }
                if applicant is not None
                else None,
                "inviter": {
                    "id": int(inviter.id),
                    "email": inviter.email,
                    "display_name": inviter.display_name,
                    "gmfn_id": inviter.gmfn_id,
                }
                if inviter is not None
                else None,
            }
        )

    return {
        "generated_at": _dt_iso(now),
        "summary": {
            "create_total": len(create_items),
            "create_by_stage": stage_counts,
            "join_total": len(join_items),
            "join_by_stage": join_stage_counts,
            "needs_attention": (
                stage_counts.get("expired", 0)
                + stage_counts.get("account_exists", 0)
                + join_stage_counts.get("approved_missing_activation", 0)
            ),
        },
        "create_entries": create_items,
        "join_requests": join_items,
    }

@router.post("/activate-membership")
def activate(
    payload: AdminActivateMembershipIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin-only compatibility activation path.

    Normal member activation must continue through /auth/activate-membership.
    This endpoint exists only for governed admin repair/support cases.
    """
    _require_platform_admin(current_user)

    gmfn_id = _safe_str(payload.gmfn_id).upper()
    user = db.query(User).filter(User.gmfn_id == gmfn_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Invalid GSN ID")

    user.hashed_password = get_password_hash(payload.password)

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "status": "activated",
        "gmfn_id": user.gmfn_id,
        "activated_by_user_id": int(current_user.id),
    }
