# app/api/routes/merchant_release.py
from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.merchant_release import MerchantReleaseIn
from app.services.merchant_verify_service import verify_merchant_token, mark_token_used, is_token_used
from app.services.public_rate_limit_service import check_rate_limit, RateLimitRule
from app.services.trust_events_services import log_trust_event

router = APIRouter(prefix="/merchant", tags=["merchant"])


def _parse_decimal(s: str) -> Decimal:
    try:
        d = Decimal(str(s))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid goods_value. Use a decimal string like '140.00'.")
    if d <= Decimal("0"):
        raise HTTPException(status_code=400, detail="goods_value must be greater than 0.")
    return d


@router.post("/releases")
def record_release(
    payload: MerchantReleaseIn,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Public endpoint (no auth):
    - verifies token (signed + exp)
    - marks token used (one-time)
    - logs merchant.release_recorded TrustEvent (append-only)
    """
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(bucket="merchant_release", key=ip, rule=RateLimitRule(window_seconds=60, max_requests=20)):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")

    try:
        info = verify_merchant_token(payload.token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    uid = int(info["user_id"])
    jti = str(info["jti"])

    # one-time token enforcement
    if is_token_used(db, user_id=uid, jti=jti):
        raise HTTPException(status_code=400, detail="This verification link has already been used.")

    amount = _parse_decimal(payload.goods_value)
    currency = str(payload.currency or "NGN")

    # mark as used first (prevents race)
    mark_token_used(db, user_id=uid, jti=jti, token_level=str(info["level"]))

    # append-only merchant release evidence
    log_trust_event(
        db,
        event_type="merchant.release_recorded",
        clan_id=0,
        loan_id=0,
        guarantor_id=None,
        actor_user_id=0,
        subject_user_id=uid,
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "merchant_release_recorded",
            "goods_value": str(amount),
            "currency": currency,
            "merchant_note": payload.merchant_note,
            "jti": jti,
        },
    )

    return {
        "ok": True,
        "user_id": uid,
        "goods_value": str(amount),
        "currency": currency,
        "message": "Release recorded (pilot evidence).",
    }