from __future__ import annotations

import os
from typing import Any, Dict

from fastapi import APIRouter

router = APIRouter(prefix="/public", tags=["public"])


def _s(name: str, default: str = "") -> str:
    return str(os.getenv(name, default) or "").strip()


@router.get("/config")
def get_public_config() -> Dict[str, Any]:
    """
    Public-safe runtime config for frontend display.
    Do not put secrets here.
    """
    return {
        "settlement": {
            "rail_name": _s("GMFN_SETTLEMENT_RAIL_NAME", "Bank Transfer"),
            "bank_name": _s("GMFN_SETTLEMENT_BANK_NAME", "Pilot Bank Rail"),
            "account_name": _s("GMFN_SETTLEMENT_ACCOUNT_NAME", "GMFN Pilot Settlement"),
            "account_number": _s("GMFN_SETTLEMENT_ACCOUNT_NUMBER", "To be assigned"),
            "sort_code": _s("GMFN_SETTLEMENT_SORT_CODE", ""),
            "country": _s("GMFN_SETTLEMENT_COUNTRY", ""),
            "support_note": _s(
                "GMFN_SETTLEMENT_SUPPORT_NOTE",
                "Use the exact payment reference. Normal matched transfers should reconcile automatically.",
            ),
        },
        "webhooks": {
            "signature_verification_enabled": bool(_s("GMFN_WEBHOOK_SECRET", "")),
        },
        "app": {
            "mode": _s("GMFN_APP_MODE", "pilot"),
        },
    }