from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, is_user_activation_pending
from app.core.clan_auth import ensure_membership
from app.core.dev_guard import require_dev_mode
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.database import get_db
from app.db.models import Clan, ClanInvite, ClanJoinRequest, ClanMembership, TrustEvent, User
from app.services.global_identity_service import ensure_user_gmfn_id

router = APIRouter(prefix="/auth", tags=["auth"])

PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
PROFILE_IMAGE_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
PROFILE_IMAGE_ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
PROFILE_IMAGE_CONTENT_TYPE_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    gmfn_id: Optional[str] = None
    phone_e164: Optional[str] = None
    phone_verified_at: Optional[str] = None
    phone_verified: bool = False
    display_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    nickname: Optional[str] = None

    cci_score: Optional[float] = None
    cci_class: Optional[str] = None
    cci_reason: Optional[str] = None
    cci_tone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdateIn(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=120)

    @field_validator("display_name", mode="before")
    @classmethod
    def _reject_non_text_display_name(cls, value: object) -> object:
        if not isinstance(value, str):
            raise ValueError("display_name must be text.")
        return value


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    gmfn_id: Optional[str] = None


class DevUserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["user", "admin"] = "user"


class DevResetPassword(BaseModel):
    email: EmailStr
    new_password: str
    role: Literal["user", "admin"] | None = None


class DevVerifyPhoneIn(BaseModel):
    email: str
    phone_e164: str


class FounderSignupWithInviteIn(BaseModel):
    invite_code: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    clan_name: str = Field(..., min_length=2, max_length=80)
    clan_description: Optional[str] = Field(default=None, max_length=500)

    @field_validator("display_name", mode="before")
    @classmethod
    def _reject_non_text_display_name(cls, value: object) -> object:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError("display_name must be text.")
        return value


class FounderSignupWithInviteOut(BaseModel):
    ok: bool
    user_id: int
    email: EmailStr
    gmfn_id: Optional[str] = None
    display_name: Optional[str] = None
    nickname: Optional[str] = None
    clan_id: int
    clan_name: str
    membership_role: str
    access_token: str
    token_type: str = "bearer"


class ActivateApprovedMemberIn(BaseModel):
    gmfn_id: Optional[str] = Field(default=None, min_length=6, max_length=64)
    request_id: Optional[str] = Field(default=None, min_length=1, max_length=64)
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = Field(default=None, min_length=6)


class ActivateApprovedMemberOut(BaseModel):
    ok: bool
    user_id: int
    email: str
    gmfn_id: str
    display_name: Optional[str] = None
    nickname: Optional[str] = None
    phone_e164: Optional[str] = None
    phone_verified_at: Optional[str] = None
    phone_verified: bool = False
    phone_verification_required: bool = True
    next_action: Optional[str] = None
    next_action_label: Optional[str] = None
    next_action_path: Optional[str] = None
    access_token: str
    token_type: str = "bearer"


class ActivateMembershipIn(BaseModel):
    gmfn_id: str = Field(..., min_length=6, max_length=64)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    request_id: Optional[str] = None


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None

    if is_user_activation_pending(user):
        return None

    hashed = str(getattr(user, "hashed_password", "") or "")
    if not verify_password(password, hashed):
        return None

    return user


def _identity_candidates(identity: str) -> list[str]:
    raw = str(identity or "").strip()
    if not raw:
        return []

    candidates: list[str] = []

    def add(value: str) -> None:
        cleaned = str(value or "").strip()
        if cleaned and cleaned not in candidates:
            candidates.append(cleaned)

    add(raw)
    add(raw.lower())
    add(raw.upper())

    compact_phone = (
        raw.replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )
    if compact_phone.startswith("00"):
        add(f"+{compact_phone[2:]}")
    elif compact_phone.startswith("+"):
        add(compact_phone)
    elif compact_phone.isdigit():
        add(f"+{compact_phone}")
        if compact_phone.startswith("0") and len(compact_phone) == 11:
            add(f"+234{compact_phone[1:]}")

    return candidates


def _find_user_by_identity(db: Session, identity: str) -> User | None:
    candidates = _identity_candidates(identity)
    if not candidates:
        return None

    user = db.query(User).filter(User.email.in_(candidates)).first()
    if not user:
        user = db.query(User).filter(User.gmfn_id.in_(candidates)).first()
    if not user:
        user = db.query(User).filter(User.phone_e164.in_(candidates)).first()
    return user


def authenticate_user_by_identity(db: Session, identity: str, password: str) -> User | None:
    user = _find_user_by_identity(db, identity)
    if not user:
        return None

    if is_user_activation_pending(user):
        return None

    hashed = str(getattr(user, "hashed_password", "") or "")
    if not verify_password(password, hashed):
        return None

    return user


_ensure_user_gmfn_id = ensure_user_gmfn_id


def _utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _validate_founder_invite(db: Session, code: str) -> ClanInvite:
    safe_code = (code or "").strip()
    if not safe_code:
        raise HTTPException(status_code=400, detail="Invite code is required")

    invite = db.query(ClanInvite).filter(ClanInvite.code == safe_code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")

    if not bool(invite.is_active):
        raise HTTPException(status_code=400, detail="Invitation is not active")

    if invite.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Invitation has been revoked")

    expires_at = _utc_aware(invite.expires_at)
    if expires_at is not None and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invitation has expired")

    max_uses = int(invite.max_uses or 0)
    uses = int(invite.uses or 0)
    if max_uses > 0 and uses >= max_uses:
        raise HTTPException(status_code=400, detail="Invitation usage limit reached")

    return invite


def _create_founder_clan(
    db: Session,
    *,
    current_user: User,
    clan_name: str,
    clan_description: Optional[str],
) -> tuple[Clan, str]:
    existing = db.query(Clan).filter(Clan.name == clan_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Community name already exists")

    now = datetime.now(timezone.utc)
    invite_code = secrets.token_urlsafe(16)

    clan = Clan(
        name=clan_name,
        description=clan_description,
        marketplace_name=f"{clan_name} Marketplace",
        marketplace_description=f"Marketplace for {clan_name} community members.",
        invite_code=invite_code,
        invite_created_at=now,
        invite_expires_at=now + timedelta(days=7),
        invite_max_uses=None,
        invite_uses=0,
    )
    db.add(clan)
    db.commit()
    db.refresh(clan)

    membership = ensure_membership(db=db, clan=clan, user=current_user, role="admin")
    return clan, membership.role


def _is_user_approved_somewhere(db: Session, user: User) -> bool:
    membership_exists = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
        is not None
    )
    return membership_exists


def _cci_tone_from_score(score: Optional[float]) -> str:
    if score is None:
        return "neutral"
    if score >= 75:
        return "green"
    if score >= 55:
        return "green"
    if score >= 35:
        return "yellow"
    return "red"


def _cci_class_from_score(score: Optional[float]) -> str:
    if score is None:
        return "Pending"
    if score >= 75:
        return "A"
    if score >= 55:
        return "B"
    if score >= 35:
        return "C"
    return "D"


def _build_cci_reason(
    *,
    score: Optional[float],
    strengths: list[str],
    pressures: list[str],
) -> str:
    if score is None:
        return "Your community integrity reading is not ready yet."

    if strengths and pressures:
        return (
            f"You are showing strength in {strengths[0].replace('_', ' ')}, "
            f"but there is still pressure around {pressures[0].replace('_', ' ')}."
        )

    if strengths:
        return (
            f"You are showing strength in {strengths[0].replace('_', ' ')} "
            "across your network."
        )

    if pressures:
        return (
            f"There is caution around {pressures[0].replace('_', ' ')} "
            "in your recent network activity."
        )

    if score >= 75:
        return "You have been fair and dependable across communities."
    if score >= 55:
        return "You are generally fair to deal with and still growing stronger."
    if score >= 35:
        return "You are building your record, but more consistency is needed."
    return "Recent signals suggest caution before depending heavily on this record."


def _extract_user_cci_payload(db: Session, user_id: int) -> dict[str, Any]:
    """
    Global CCI is tied to the PERSON identity (User.id / GMFN ID),
    not to a shop and not to a single clan.
    """
    try:
        from app.services.trust_graph_service import build_trust_graph

        graph = build_trust_graph(
            db,
            user_id=int(user_id),
            include_clans=True,
            limit_events=500,
        )

        cci = graph.get("cci") or {}
        explain = cci.get("explain") or {}

        raw_score = (
            cci.get("cci_score")
            or cci.get("score")
            or cci.get("value")
            or graph.get("summary", {}).get("graph_score")
        )

        score: Optional[float]
        try:
            score = float(raw_score) if raw_score is not None else None
        except Exception:
            score = None

        strengths = explain.get("strengths") or []
        pressures = explain.get("pressures") or []

        raw_class = (
            cci.get("cci_band")
            or cci.get("band")
            or cci.get("cci_class")
            or _cci_class_from_score(score)
        )

        cci_class = str(raw_class or _cci_class_from_score(score)).upper()
        cci_tone = _cci_tone_from_score(score)
        cci_reason = _build_cci_reason(
            score=score,
            strengths=[str(x) for x in strengths],
            pressures=[str(x) for x in pressures],
        )

        return {
            "cci_score": round(score, 2) if score is not None else None,
            "cci_class": cci_class,
            "cci_reason": cci_reason,
            "cci_tone": cci_tone,
        }

    except Exception:
        return {
            "cci_score": None,
            "cci_class": "Pending",
            "cci_reason": "Your community integrity reading is not ready yet.",
            "cci_tone": "neutral",
        }


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _profile_image_upload_dir() -> Path:
    return _uploads_root() / "profile" / "users"


def _ensure_profile_image_upload_dir() -> None:
    _profile_image_upload_dir().mkdir(parents=True, exist_ok=True)


def _normalize_profile_image_content_type(content_type: str) -> str:
    ct = str(content_type or "").strip().lower()
    if ";" in ct:
        ct = ct.split(";", 1)[0].strip().lower()
    return PROFILE_IMAGE_CONTENT_TYPE_ALIASES.get(ct, ct)


def _safe_profile_image_ext(filename: Optional[str]) -> str:
    if not filename:
        return ""
    return Path(filename).suffix.lower().strip()


def _validate_profile_image_type(upload: UploadFile) -> str:
    ext = _safe_profile_image_ext(getattr(upload, "filename", None))
    if ext not in PROFILE_IMAGE_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported profile picture format. Use jpg, jpeg, png, or webp.",
        )

    content_type = _normalize_profile_image_content_type(
        getattr(upload, "content_type", "") or ""
    )
    if content_type not in PROFILE_IMAGE_ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported profile picture content type.",
        )
    return ext


async def _read_profile_image_bytes(upload: UploadFile) -> bytes:
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded profile picture is empty.")
    if len(raw) > PROFILE_IMAGE_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Profile picture is too large. Maximum allowed is 5MB.",
        )
    return raw


def _build_me_payload(db: Session, user: User) -> dict[str, Any]:
    cci_payload = _extract_user_cci_payload(db, int(user.id))
    display_name = getattr(user, "display_name", None)
    phone_verified_at = getattr(user, "phone_verified_at", None)
    phone_verified_at_text = (
        phone_verified_at.isoformat() if phone_verified_at else None
    )
    return {
        "id": int(user.id),
        "email": user.email,
        "role": str(getattr(user, "role", "user") or "user"),
        "gmfn_id": getattr(user, "gmfn_id", None),
        "phone_e164": getattr(user, "phone_e164", None),
        "phone_verified_at": phone_verified_at_text,
        "phone_verified": bool(phone_verified_at and getattr(user, "phone_e164", None)),
        "display_name": display_name,
        "profile_image_url": getattr(user, "profile_image_url", None),
        "nickname": display_name,
        "cci_score": cci_payload.get("cci_score"),
        "cci_class": cci_payload.get("cci_class"),
        "cci_reason": cci_payload.get("cci_reason"),
        "cci_tone": cci_payload.get("cci_tone"),
    }


def _clean_profile_display_name(value: object) -> str:
    text = str(value or "").strip()
    collapsed = " ".join(text.split())
    if not collapsed:
        raise HTTPException(status_code=400, detail="Display name is required")

    lowered = collapsed.lower()
    if lowered in {
        "member name not set",
        "name not set",
        "not set",
        "not shown",
        "unknown",
    }:
        raise HTTPException(
            status_code=400,
            detail="Use the name or street name people know you by",
        )

    return collapsed[:120]


def _join_evidence_display_name_for_user(db: Session, user: User) -> Optional[str]:
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user.id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(10)
        .all()
    )

    for row in rows:
        meta = getattr(row, "meta", None) or {}
        if not isinstance(meta, dict):
            continue
        profile = meta.get("applicant_profile")
        if not isinstance(profile, dict):
            continue
        candidate = " ".join(
            part
            for part in (
                str(profile.get("first_name") or "").strip(),
                str(profile.get("surname") or "").strip(),
            )
            if part
        )
        if not candidate:
            continue
        try:
            return _clean_profile_display_name(candidate)
        except HTTPException:
            continue

    return None


def _recover_missing_display_name_from_join_evidence(
    db: Session,
    user: User,
) -> User:
    current = str(getattr(user, "display_name", "") or "").strip()
    if current:
        try:
            _clean_profile_display_name(current)
            return user
        except HTTPException:
            pass

    recovered = _join_evidence_display_name_for_user(db, user)
    if not recovered:
        return user

    user.display_name = recovered
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _activation_phone_status(user: User) -> dict[str, Any]:
    phone_e164 = getattr(user, "phone_e164", None)
    phone_verified_at = getattr(user, "phone_verified_at", None)
    phone_verified = bool(phone_e164 and phone_verified_at)
    return {
        "phone_e164": phone_e164,
        "phone_verified_at": phone_verified_at.isoformat()
        if phone_verified_at
        else None,
        "phone_verified": phone_verified,
        "phone_verification_required": not phone_verified,
        "next_action": None if phone_verified else "verify_phone",
        "next_action_label": None if phone_verified else "Verify phone",
        "next_action_path": None
        if phone_verified
        else "/app/identity?task=phone&mode=complete",
    }


@router.patch("/me/profile", response_model=UserOut)
def update_my_profile(
    payload: ProfileUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.display_name = _clean_profile_display_name(payload.display_name)
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    try:
        current_user = _ensure_user_gmfn_id(db, current_user)
    except Exception:
        pass

    return _build_me_payload(db, current_user)


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    raise HTTPException(
        status_code=403,
        detail=(
            "Open public registration is not enabled. "
            "Use community invitation approval or founder create-community onboarding."
        ),
    )


@router.post("/activate-approved-member", response_model=ActivateApprovedMemberOut)
def activate_approved_member(
    payload: ActivateApprovedMemberIn,
    db: Session = Depends(get_db),
):
    gmfn_id = str(payload.gmfn_id or "").strip().upper()
    request_id = str(payload.request_id or "").strip()
    confirm_password = str(payload.confirm_password or "").strip()

    if not gmfn_id and not request_id:
        raise HTTPException(status_code=400, detail="GSN ID or request ID is required")

    if confirm_password and confirm_password != payload.password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    user: Optional[User] = None

    if gmfn_id:
        user = db.query(User).filter(User.gmfn_id == gmfn_id).first()

    if user is None and request_id:
        try:
            request_id_int = int(request_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Request ID is invalid") from exc

        join_request = (
            db.query(ClanJoinRequest)
            .filter(ClanJoinRequest.id == request_id_int)
            .first()
        )
        if not join_request:
            raise HTTPException(status_code=404, detail="Approved join request not found")

        applicant_user_id = int(getattr(join_request, "applicant_user_id", 0) or 0)
        if not applicant_user_id:
            raise HTTPException(status_code=404, detail="Approved member identity not found")

        user = db.get(User, applicant_user_id)

    if not user:
        raise HTTPException(status_code=404, detail="Approved member identity not found")

    if gmfn_id and str(getattr(user, "gmfn_id", "") or "").strip().upper() != gmfn_id:
        raise HTTPException(
            status_code=409,
            detail="Request ID does not match the supplied GSN ID",
        )

    if not _is_user_approved_somewhere(db, user):
        raise HTTPException(
            status_code=403,
            detail="This identity has not been admitted to an active community",
        )

    if not is_user_activation_pending(user):
        raise HTTPException(
            status_code=409,
            detail="This approved identity has already been activated",
        )

    user = _recover_missing_display_name_from_join_evidence(db, user)
    user.hashed_password = get_password_hash(payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})
    return {
        "ok": True,
        "user_id": int(user.id),
        "email": user.email,
        "gmfn_id": str(user.gmfn_id),
        "display_name": getattr(user, "display_name", None),
        "nickname": getattr(user, "display_name", None),
        **_activation_phone_status(user),
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/activate-membership")
def activate_membership(
    payload: ActivateMembershipIn,
    db: Session = Depends(get_db),
):
    gmfn_id = str(payload.gmfn_id or "").strip().upper()
    password = payload.password or ""
    confirm_password = payload.confirm_password or ""

    if not gmfn_id:
        raise HTTPException(status_code=400, detail="GSN ID is required")

    if not password or len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters",
        )

    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    user = db.query(User).filter(User.gmfn_id == gmfn_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid GSN ID")

    if not _is_user_approved_somewhere(db, user):
        raise HTTPException(
            status_code=403,
            detail="This identity has not been admitted to an active community",
        )

    if not is_user_activation_pending(user):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "account_already_activated",
                "message": (
                    "This membership is already activated. Sign in with the existing "
                    "password or use the account recovery path."
                ),
                "next_action": "login",
                "next_action_label": "Sign in",
                "login_path": "/login?force=1",
                "gmfn_id": gmfn_id,
            },
        )

    user = _recover_missing_display_name_from_join_evidence(db, user)
    user.hashed_password = get_password_hash(password)
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})

    return {
        "status": "activated",
        "gmfn_id": user.gmfn_id,
        "display_name": getattr(user, "display_name", None),
        "nickname": getattr(user, "display_name", None),
        **_activation_phone_status(user),
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.post("/login", response_model=TokenOut)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    identity = str(form_data.username or "").strip()
    password = str(form_data.password or "")

    user = authenticate_user_by_identity(db, identity=identity, password=password)
    if not user:
        pending_user = _find_user_by_identity(db, identity)
        if pending_user and is_user_activation_pending(pending_user):
            gmfn_id = str(getattr(pending_user, "gmfn_id", "") or "").strip().upper()
            approved = _is_user_approved_somewhere(db, pending_user)
            if approved:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={
                        "code": "account_activation_pending",
                        "message": (
                            "This identity exists, but membership activation is not finished yet. "
                            "Activate membership first, then sign in with the password you create there."
                        ),
                        "next_action": "activate_membership",
                        "next_action_label": "Activate membership",
                        "activation_path": (
                            f"/activate-membership?gmfn_id={gmfn_id}"
                            if gmfn_id
                            else "/activate-membership"
                        ),
                        "gmfn_id": gmfn_id or None,
                    },
                )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or account not yet activated",
        )

    user = _ensure_user_gmfn_id(db, user)

    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "gmfn_id": getattr(user, "gmfn_id", None),
    }


@router.post("/signup-with-invite", response_model=FounderSignupWithInviteOut, status_code=201)
def signup_with_invite(payload: FounderSignupWithInviteIn, db: Session = Depends(get_db)):
    invite = _validate_founder_invite(db, payload.invite_code)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role="admin",
        display_name=(
            _clean_profile_display_name(payload.display_name)
            if payload.display_name
            else None
        ),
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User already exists")

    db.refresh(user)
    user = _ensure_user_gmfn_id(db, user)

    clan, membership_role = _create_founder_clan(
        db,
        current_user=user,
        clan_name=payload.clan_name.strip(),
        clan_description=payload.clan_description,
    )

    invite.uses = int(invite.uses or 0) + 1
    if invite.max_uses is not None and invite.uses >= int(invite.max_uses):
        invite.is_active = False

    db.add(invite)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})

    return {
        "ok": True,
        "user_id": int(user.id),
        "email": user.email,
        "gmfn_id": getattr(user, "gmfn_id", None),
        "display_name": getattr(user, "display_name", None),
        "nickname": getattr(user, "display_name", None),
        "clan_id": int(clan.id),
        "clan_name": clan.name,
        "membership_role": membership_role,
        "access_token": access_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserOut)
def me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        current_user = _ensure_user_gmfn_id(db, current_user)
    except Exception:
        pass

    return _build_me_payload(db, current_user)


@router.post("/me/profile-image/upload", response_model=UserOut)
async def upload_my_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = _validate_profile_image_type(file)
    raw = await _read_profile_image_bytes(file)
    _ensure_profile_image_upload_dir()

    generated = (
        f"user_{int(current_user.id)}_"
        f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_"
        f"{secrets.token_hex(6)}{ext}"
    )
    target = _profile_image_upload_dir() / generated
    target.write_bytes(raw)

    current_user.profile_image_url = f"/uploads/profile/users/{generated}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    try:
        current_user = _ensure_user_gmfn_id(db, current_user)
    except Exception:
        pass

    return _build_me_payload(db, current_user)


@router.delete("/me/profile-image", response_model=UserOut)
def remove_my_profile_image(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.profile_image_url = None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    try:
        current_user = _ensure_user_gmfn_id(db, current_user)
    except Exception:
        pass

    return _build_me_payload(db, current_user)


@router.get("/approved-member/{gmfn_id}", response_model=dict[str, object])
def get_approved_member_activation_status(
    gmfn_id: str,
    db: Session = Depends(get_db),
):
    safe_gmfn_id = str(gmfn_id or "").strip().upper()
    if not safe_gmfn_id:
        raise HTTPException(status_code=400, detail="GSN ID is required")

    user = db.query(User).filter(User.gmfn_id == safe_gmfn_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Approved member identity not found")

    approved = _is_user_approved_somewhere(db, user)
    activated = not is_user_activation_pending(user)

    latest_join_request = (
        db.query(ClanJoinRequest)
        .filter(ClanJoinRequest.applicant_user_id == int(user.id))
        .order_by(ClanJoinRequest.created_at.desc(), ClanJoinRequest.id.desc())
        .first()
    )

    return {
        "ok": True,
        "gmfn_id": safe_gmfn_id,
        "approved": approved,
        "activated": activated,
        "status": (latest_join_request.status if latest_join_request else None),
        "user_id": int(user.id),
        "email": user.email,
        "display_name": getattr(user, "display_name", None),
        "nickname": getattr(user, "display_name", None),
    }


@router.post(
    "/dev/create-user",
    status_code=201,
    response_model=UserOut,
    dependencies=[Depends(require_dev_mode)],
)
def dev_create_user(payload: DevUserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User already exists")

    db.refresh(user)
    user = _ensure_user_gmfn_id(db, user)
    return _build_me_payload(db, user)


@router.post(
    "/dev/reset-password",
    response_model=UserOut,
    dependencies=[Depends(require_dev_mode)],
)
def dev_reset_password(payload: DevResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    if payload.role is not None:
        user.role = payload.role

    db.add(user)
    db.commit()
    db.refresh(user)

    try:
        user = _ensure_user_gmfn_id(db, user)
    except Exception:
        pass

    return _build_me_payload(db, user)


@router.post(
    "/dev/verify-phone",
    status_code=200,
    dependencies=[Depends(require_dev_mode)],
)
def dev_verify_phone(
    payload: DevVerifyPhoneIn,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    phone = (payload.phone_e164 or "").strip()
    if not phone.startswith("+") or len(phone) < 8:
        raise HTTPException(
            status_code=400,
            detail="phone_e164 must be in +E164 format (e.g. +447...)",
        )

    clash = db.query(User).filter(User.phone_e164 == phone, User.id != user.id).first()
    if clash:
        raise HTTPException(status_code=400, detail="phone already in use by another account")

    user = _ensure_user_gmfn_id(db, user)

    user.phone_e164 = phone
    user.phone_verified_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "ok": True,
        "user_id": int(user.id),
        "email": user.email,
        "gmfn_id": user.gmfn_id,
        "phone_e164": user.phone_e164,
        "phone_verified_at": user.phone_verified_at.isoformat()
        if user.phone_verified_at
        else None,
    }
