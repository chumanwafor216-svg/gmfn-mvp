from __future__ import annotations

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token, get_password_hash
from app.db.database import get_db
from app.db.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


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
    # TEST MODE:
    # If token is missing or invalid, fall back to a dev user instead of blocking.

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
        except Exception:
            pass

    return _get_or_create_test_user(db)