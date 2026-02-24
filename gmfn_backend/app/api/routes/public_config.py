from __future__ import annotations

from fastapi import APIRouter

from app.core.trust_policy import policy_version

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/config")
def public_config():
    """
    Public, non-sensitive config for frontend.
    Freeze-safe: does not affect backend decisions.
    """
    return {
        "mode": "pilot",
        "service_fee_rate": "0.03",
        "trust_policy_version": policy_version(),
        "notes": [
            "Pilot mode values are placeholders while behavior is validated.",
            "Fees must be visibly disclosed to users (no hidden charges).",
        ],
    }
