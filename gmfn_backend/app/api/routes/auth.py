from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import ensure_membership, get_or_create_default_clan
from app.core.dev_guard import require_dev_mode  # ✅ DEV MODE GUARD
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.database import get_db
from app.db.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------
# Schemas
# ---------------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str

    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class DevUserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Literal["user", "admin"] = "user"  # ✅ strict, Swagger dropdown


class DevResetPassword(BaseModel):
    email: EmailStr
    new_password: str
    role: Literal["user", "admin"] | None = None  # optional role update


# ---------------------------
# Helpers
# ---------------------------
def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def try_ensure_user_in_default_clan(db: Session, user: User) -> None:
    """
    IMPORTANT: Do NOT allow clan bootstrapping errors to crash login/register.
    We'll log it and continue so you can still login.
    """
    try:
        clan = get_or_create_default_clan(db=db)
        clan_role = "admin" if (user.role or "").lower() == "admin" else "user"
        ensure_membership(db=db, clan=clan, user=user, role=clan_role)
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        print("⚠️ Clan bootstrap failed during login/register:", repr(e))


# ---------------------------
# Routes
# ---------------------------
@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # ✅ never crash register if clan fails
    try_ensure_user_in_default_clan(db, user)

    return user


@router.post("/login", response_model=TokenOut)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # ✅ never crash login if clan fails
    try_ensure_user_in_default_clan(db, user)

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post(
    "/dev/create-user",
    status_code=201,
    response_model=UserOut,
    dependencies=[Depends(require_dev_mode)],  # ✅ HIDDEN unless GMFN_DEV_MODE enabled
)
def dev_create_user(payload: DevUserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="User already exists")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,  # already validated by Literal
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="User already exists")

    db.refresh(user)

    # ✅ never crash dev-create-user if clan fails
    try_ensure_user_in_default_clan(db, user)

    return user


@router.post(
    "/dev/reset-password",
    response_model=UserOut,
    dependencies=[Depends(require_dev_mode)],  # ✅ DEV ONLY
)
def dev_reset_password(payload: DevResetPassword, db: Session = Depends(get_db)):
    """
    DEV-ONLY: Reset an existing user's password (and optionally role).
    This prevents endless "401 password unknown" loops during local development.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    if payload.role is not None:
        user.role = payload.role

    db.add(user)
    db.commit()
    db.refresh(user)

    # keep clan membership aligned (non-fatal)
    try_ensure_user_in_default_clan(db, user)

    return user