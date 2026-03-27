from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.identity_service import (
    get_identity_risk_summary,
    list_identity_risks,
    register_identity_observation,
)

router = APIRouter(prefix="/identity-risk", tags=["identity-risk"])


@router.post("/observe")
def observe_identity(
    request: Request,
    client_hint: str | None = Header(default=None, alias="X-Client-Fingerprint"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return register_identity_observation(
        db,
        user_id=int(current_user.id),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        client_hint=client_hint,
    )


@router.get("/me")
def my_identity_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return get_identity_risk_summary(
        db,
        user_id=int(current_user.id),
    )


@router.get("/admin")
def admin_identity_risk(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if (getattr(current_user, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    return list_identity_risks(
        db,
        limit=int(limit),
    )