from __future__ import annotations

import secrets

from fastapi import HTTPException
from sqlalchemy.orm import Session, object_session

from app.db.models import User


def generate_gmfn_id() -> str:
    return "GMFN-U-" + secrets.token_hex(4).upper()


def ensure_user_gmfn_id(db: Session, user: User) -> User:
    if object_session(user) is not db:
        user = db.merge(user)

    current = str(getattr(user, "gmfn_id", "") or "").strip()
    if current:
        return user

    for _ in range(20):
        candidate = generate_gmfn_id()
        exists = db.query(User).filter(User.gmfn_id == candidate).first()
        if not exists:
            user.gmfn_id = candidate
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    raise HTTPException(status_code=500, detail="Could not generate unique GMFN ID")
