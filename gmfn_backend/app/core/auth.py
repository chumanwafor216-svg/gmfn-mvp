from __future__ import annotations

import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token, get_password_hash
from app.db.database import get_db
from app.db.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _dev_mode() -> bool:
    return str(os.getenv("GMFN_DEV_MODE", "") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _get_or_create_test_user(db: Session) -> User:
    user = db.query(User).filter(User.email == "admin@test.com").first()
    if user:
        return user

    user = User(
        email="admin@test.com",
        hashed_password=get_password_hash("pass1234"),
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> User:
    # Public-safe behavior:
    # - In dev mode only, missing/invalid auth may fall back to a seeded local admin.
    # - In non-dev mode, missing/invalid auth must fail closed.

    if token:
        try:
            payload = decode_token(token)
            subject = str(payload.get("sub") or "").strip()

            if subject:
                user = db.query(User).filter(User.email == subject).first()
                if user:
                    return user

                user = db.query(User).filter(User.gmfn_id == subject).first()
                if user:
                    return user
        except JWTError:
            pass
        except RuntimeError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            ) from exc
        except Exception:
            pass

    if _dev_mode():
        return _get_or_create_test_user(db)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
