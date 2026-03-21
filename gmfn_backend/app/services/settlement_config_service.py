from __future__ import annotations

import os
from typing import Any, Dict


def _s(x: Any, default: str = "") -> str:
    if x is None:
        return default
    out = str(x).strip()
    return out if out else default


def get_settlement_config() -> Dict[str, Any]:
    return {
        "rail_name": _s(os.getenv("GMFN_SETTLEMENT_RAIL_NAME"), "Bank Transfer"),
        "bank_name": _s(os.getenv("GMFN_SETTLEMENT_BANK_NAME"), "Pilot Bank Rail"),
        "account_name": _s(os.getenv("GMFN_SETTLEMENT_ACCOUNT_NAME"), "GMFN Pilot Settlement"),
        "account_number": _s(os.getenv("GMFN_SETTLEMENT_ACCOUNT_NUMBER"), "0000000000"),
        "sort_code": _s(os.getenv("GMFN_SETTLEMENT_SORT_CODE"), ""),
        "country": _s(os.getenv("GMFN_SETTLEMENT_COUNTRY"), "NG"),
        "support_note": _s(
            os.getenv("GMFN_SETTLEMENT_SUPPORT_NOTE"),
            "Use the exact payment reference when transferring funds.",
        ),
    }