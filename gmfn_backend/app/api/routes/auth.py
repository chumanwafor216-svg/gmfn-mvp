from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import ensure_membership
from app.core.dev_guard import require_dev_mode
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.database import get_db
from app.db.models import Clan, ClanInvite, ClanJoinRequest, ClanMembership, User

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
    display_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    nickname: Optional[str] = None

    cci_score: Optional[float] = None
    cci_class: Optional[str] = None
    cci_reason: Optional[str] = None
    cci_tone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


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
    clan_name: str = Field(..., min_length=2, max_length=80)
    clan_description: Optional[str] = Field(default=None, max_length=500)


class FounderSignupWithInviteOut(BaseModel):
    ok: bool
    user_id: int
    email: EmailStr
    gmfn_id: Optional[str] = None
    clan_id: int
    clan_name: str
    membership_role: str
    access_token: str
    token_type: str = "bearer"


class ActivateApprovedMemberIn(BaseModel):
    gmfn_id: str = Field(..., min_length=6, max_length=64)
    password: str = Field(..., min_length=6)


class ActivateApprovedMemberOut(BaseModel):
    ok: bool
    user_id: int
    email: str
    gmfn_id: str
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

    hashed = str(getattr(user, "hashed_password", "") or "")
    if not hashed or hashed == "PENDING_APPROVAL":
        return None

    if not verify_password(password, hashed):
        return None

    return user


def authenticate_user_by_identity(db: Session, identity: str, password: str) -> User | None:
    raw = str(identity or "").strip()
    if not raw:
        return None

    user = db.query(User).filter(User.email == raw).first()
    if not user:
        user = db.query(User).filter(User.gmfn_id == raw).first()
    if not user:
        user = db.query(User).filter(User.phone_e164 == raw).first()
    if not user:
        return None

    hashed = str(getattr(user, "hashed_password", "") or "")
    if not hashed or hashed == "PENDING_APPROVAL":
        return None

    if not verify_password(password, hashed):
        return None

    return user


def _generate_gmfn_id() -> str:
    return "GMFN-U-" + secrets.token_hex(4).upper()


def _ensure_user_gmfn_id(db: Session, user: User) -> User:
    current = str(getattr(user, "gmfn_id", "") or "").strip()
    if current:
        return user

    for _ in range(20):
        candidate = _generate_gmfn_id()
        exists = db.query(User).filter(User.gmfn_id == candidate).first()
        if not exists:
            user.gmfn_id = candidate
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    raise HTTPException(status_code=500, detail="Could not generate unique GMFN ID.")


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
        raise HTTPException(status_code=400, detail="Clan name already exists")

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
        return "Your community integrity reading is being prepared."

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
            "cci_reason": "Your community integrity reading is being prepared.",
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
    return {
        "id": int(user.id),
        "email": user.email,
        "role": str(getattr(user, "role", "user") or "user"),
        "gmfn_id": getattr(user, "gmfn_id", None),
        "phone_e164": getattr(user, "phone_e164", None),
        "display_name": display_name,
        "profile_image_url": getattr(user, "profile_image_url", None),
        "nickname": display_name,
        "cci_score": cci_payload.get("cci_score"),
        "cci_class": cci_payload.get("cci_class"),
        "cci_reason": cci_payload.get("cci_reason"),
        "cci_tone": cci_payload.get("cci_tone"),
    }


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
    if not gmfn_id:
        raise HTTPException(status_code=400, detail="GMFN ID is required")

    user = db.query(User).filter(User.gmfn_id == gmfn_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Approved member identity not found")

    if not _is_user_approved_somewhere(db, user):
        raise HTTPException(
            status_code=403,
            detail="This identity has not been admitted to an active community",
        )

    current_hash = str(getattr(user, "hashed_password", "") or "")
    if current_hash and current_hash != "PENDING_APPROVAL":
        raise HTTPException(
            status_code=409,
            detail="This approved identity has already been activated",
        )

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
        raise HTTPException(status_code=400, detail="GMFN ID is required")

    if not password or len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters",
        )

    if password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    user = db.query(User).filter(User.gmfn_id == gmfn_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid GMFN ID")

    if not _is_user_approved_somewhere(db, user):
        raise HTTPException(
            status_code=403,
            detail="This identity has not been admitted to an active community",
        )

    user.hashed_password = get_password_hash(password)
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.email})

    return {
        "status": "activated",
        "gmfn_id": user.gmfn_id,
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or account not yet activated",
        )

    user = _ensure_user_gmfn_id(db, user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


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


@router.get("/approved-member/{gmfn_id}", response_model=dict[str, object])
def get_approved_member_activation_status(
    gmfn_id: str,
    db: Session = Depends(get_db),
):
    safe_gmfn_id = str(gmfn_id or "").strip().upper()
    if not safe_gmfn_id:
        raise HTTPException(status_code=400, detail="GMFN ID is required")

    user = db.query(User).filter(User.gmfn_id == safe_gmfn_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Approved member identity not found")

    approved = _is_user_approved_somewhere(db, user)
    activated = bool(
        str(getattr(user, "hashed_password", "") or "") not in ("", "PENDING_APPROVAL")
    )

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
