from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.identity_service import (
    get_identity_recovery_summary,
    get_identity_risk_summary,
    list_identity_risks,
    register_identity_observation,
    upsert_identity_recovery_profile,
    verify_identity_recovery_profile,
)

router = APIRouter(prefix="/identity-risk", tags=["identity-risk"])


class RecoveryQuestionIn(BaseModel):
    prompt: str = Field(..., min_length=4, max_length=180)
    answer: str = Field(..., min_length=2, max_length=180)


class RecoverySetupIn(BaseModel):
    questions: list[RecoveryQuestionIn] = Field(..., min_length=3, max_length=3)


class RecoveryVerifyIn(BaseModel):
    answers: list[str] = Field(..., min_length=3, max_length=3)


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


@router.get("/recovery/me")
def my_identity_recovery(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return get_identity_recovery_summary(
        db,
        user_id=int(current_user.id),
    )


@router.post("/recovery/setup")
def setup_identity_recovery(
    payload: RecoverySetupIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return upsert_identity_recovery_profile(
            db,
            user_id=int(current_user.id),
            prompts_and_answers=[item.model_dump() for item in payload.questions],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/recovery/verify")
def verify_identity_recovery(
    payload: RecoveryVerifyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        result = verify_identity_recovery_profile(
            db,
            user_id=int(current_user.id),
            answers=[str(item or "").strip() for item in payload.answers],
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=423, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return result


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
