# app/api/routes/merchant_verify.py
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User

from app.services.merchant_verify_service import (
    build_merchant_verify_link,
    verify_merchant_token,
    is_token_used,
    mark_token_used,
)

router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])


@router.get("/me/merchant-link")
def get_my_merchant_link(
    ttl_hours: int = Query(72, ge=1, le=168),
    level: str = Query("standard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns a shareable merchant verification link + Link ID + optional Pack ID.
    """
    try:
        _token, path, link_id, pack_id, ttl = build_merchant_verify_link(
            db,
            user_id=int(current_user.id),
            ttl_hours=int(ttl_hours),
            level=str(level),
        )
        return {
            "ok": True,
            "path": path,
            "ttl_hours": ttl,
            "verification_link_id": link_id,
            "pack_id": pack_id,
            "hint": "Ask buyer for Pack ID if you need evidence.",
        }
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me/merchant-view")
def get_my_merchant_view(
    token: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Lets a signed-in user preview what a merchant would see.
    """
    try:
        payload = verify_merchant_token(db, token=token)
        return {
            "ok": True,
            "preview": payload,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/verify/{token}")
def verify_for_merchant(token: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Public verification endpoint (merchant can open without login).
    Shows Link ID + optional Pack ID.
    """
    try:
        payload = verify_merchant_token(db, token=token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    jti = payload.get("jti") or ""
    link_id = payload.get("link_id")
    pack_id = payload.get("pack_id")

    used = is_token_used(db, jti=str(jti))

    # Mark as "used" once someone verifies. Actor is 0 (system).
    if not used and jti:
        mark_token_used(
            db,
            actor_user_id=0,
            subject_user_id=int(payload.get("uid") or 0),
            jti=str(jti),
            link_id=link_id,
            pack_id=pack_id,
        )
        used = True

    return {
        "verified": True,
        "verification_link_id": link_id,
        "pack_id": pack_id,
        "level": payload.get("lvl"),
        "expires_at": payload.get("exp"),
        "used": used,
        "disclaimer": "Community-backed integrity limit. Not a bank guarantee. No auto-debit.",
        "ask_for_pack_id_hint": "Ask the buyer for Pack ID if you need evidence.",
    }
