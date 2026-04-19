import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import bcrypt
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
DEFAULT_DEV_SECRET = "CHANGE_ME_TO_A_LONG_RANDOM_STRING"


def _truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _dev_mode() -> bool:
    return _truthy(os.getenv("GMFN_DEV_MODE"))


def _secret_key() -> str:
    secret = (
        os.getenv("GMFN_SECRET_KEY")
        or os.getenv("SECRET_KEY")
        or ""
    ).strip()
    if secret:
        return secret
    if _dev_mode():
        return DEFAULT_DEV_SECRET
    raise RuntimeError(
        "Missing GMFN_SECRET_KEY/SECRET_KEY for JWT signing."
    )


def _access_token_expiry_minutes() -> int:
    raw = (
        os.getenv("GMFN_ACCESS_TOKEN_EXPIRE_MINUTES")
        or os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
        or "60"
    ).strip()
    try:
        value = int(raw)
    except Exception:
        value = 60
    return max(value, 1)


def _password_bytes(password: str) -> bytes:
    return str(password or "").encode("utf-8")


def _looks_like_bcrypt_hash(hashed_password: str) -> bool:
    return str(hashed_password or "").startswith(("$2a$", "$2b$", "$2y$"))


# ----------------------------
# Password helpers
# ----------------------------
def hash_password(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except Exception:
        return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode(
            "utf-8"
        )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        if not _looks_like_bcrypt_hash(hashed_password):
            return False

        try:
            return bcrypt.checkpw(
                _password_bytes(plain_password),
                str(hashed_password or "").encode("utf-8"),
            )
        except Exception:
            return False


# Backwards-compatible name some modules may import
def get_password_hash(password: str) -> str:
    return hash_password(password)


# ----------------------------
# JWT helpers
# ----------------------------
def create_access_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=_access_token_expiry_minutes())
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _secret_key(), algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, _secret_key(), algorithms=[ALGORITHM])
