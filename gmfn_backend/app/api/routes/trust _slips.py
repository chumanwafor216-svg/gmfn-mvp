# app/api/routes/trust_slips.py
from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, TrustSlip
from app.services.trust_slips_services import get_trust_slip_payload

# lightweight in-memory rate limiter
from app.core.rate_limit import rate_limiter, client_ip


router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])


# =========================================================
# Helpers
# =========================================================

def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


def _require_admin(user: Any) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _throttle_public(request: Request, route_name: str) -> None:
    """
    MVP public throttle:
    30 requests per 60 seconds per IP per route.
    Lightweight. Mobile safe.
    """
    ip = client_ip(request.headers, fallback="unknown")
    key = f"{route_name}:{ip}"

    res = rate_limiter.check(
        key=key,
        max_requests=30,
        window_seconds=60,
    )

    if not res.ok:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Try again in {res.reset_in_seconds}s.",
            headers={"Retry-After": str(res.reset_in_seconds)},
        )


# =========================================================
# Health
# =========================================================

@router.get("/ping")
def ping() -> Dict[str, Any]:
    return {"ok": True, "service": "trust-slips"}


# =========================================================
# Authenticated Routes
# =========================================================

@router.get("/me")
def get_my_trust_slip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:

    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return get_trust_slip_payload(db, user_id=int(current_user.id))


@router.get("/me/summary")
def get_my_trust_slip_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Legacy alias – same payload.
    """

    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return get_trust_slip_payload(db, user_id=int(current_user.id))


@router.get("/{user_id}")
def get_user_trust_slip_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: view any user's TrustSlip.
    """

    _require_admin(current_user)

    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    return get_trust_slip_payload(db, user_id=int(user_id))


# =========================================================
# Public Merchant Verify (Minimal JSON)
# =========================================================

@router.get("/verify/{code}")
def verify_trust_slip_public(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Public merchant-safe verify endpoint.
    Minimal exposure.
    Rate-limited.
    """

    _throttle_public(request, "trustslip_verify_json")

    slip = (
        db.query(TrustSlip)
        .filter(TrustSlip.code == code)
        .first()
    )

    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    return {
        "code": slip.code,
        "status": slip.status,
        "trust_limit": str(slip.trust_limit),
        "currency": slip.currency,
        "expires_at": slip.expires_at.isoformat() if slip.expires_at else None,
    }