from __future__ import annotations

import os
from typing import Any, Dict, List


def _s(x: Any, default: str = "") -> str:
    if x is None:
        return default
    out = str(x).strip()
    return out if out else default


def _csv(value: Any, default: List[str]) -> List[str]:
    raw = _s(value)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def _region_for_country(country: str) -> str:
    code = _s(country).upper()
    if code in {"GB", "UK", "IM", "JE", "GG"}:
        return "uk"
    if code in {"US", "USA"}:
        return "united_states"
    if code in {
        "AT",
        "BE",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "HU",
        "IE",
        "IT",
        "LV",
        "LT",
        "LU",
        "MT",
        "NL",
        "PL",
        "PT",
        "RO",
        "SK",
        "SI",
        "ES",
        "SE",
        "EG",
    }:
        return "europe_mena"
    if code in {
        "NG",
        "GH",
        "KE",
        "UG",
        "TZ",
        "ZA",
        "RW",
        "CM",
        "SN",
        "CI",
        "MA",
        "DZ",
        "TN",
    }:
        return "africa"
    if code in {"IN", "CN", "HK", "SG", "MY", "PH", "ID", "TH", "JP", "KR", "AE", "SA"}:
        return "asia"
    return "global"


def get_settlement_config() -> Dict[str, Any]:
    country = _s(os.getenv("GMFN_SETTLEMENT_COUNTRY"), "NG").upper()
    region_code = _s(os.getenv("GMFN_SETTLEMENT_REGION"), _region_for_country(country))

    return {
        "rail_name": _s(os.getenv("GMFN_SETTLEMENT_RAIL_NAME"), "Bank Transfer"),
        "bank_name": _s(os.getenv("GMFN_SETTLEMENT_BANK_NAME"), "Pilot Bank Rail"),
        "account_name": _s(os.getenv("GMFN_SETTLEMENT_ACCOUNT_NAME"), "GMFN Pilot Settlement"),
        "account_number": _s(os.getenv("GMFN_SETTLEMENT_ACCOUNT_NUMBER"), "0000000000"),
        "sort_code": _s(os.getenv("GMFN_SETTLEMENT_SORT_CODE"), ""),
        "routing_number": _s(os.getenv("GMFN_SETTLEMENT_ROUTING_NUMBER"), ""),
        "ach_routing_number": _s(os.getenv("GMFN_SETTLEMENT_ACH_ROUTING_NUMBER"), ""),
        "wire_routing_number": _s(os.getenv("GMFN_SETTLEMENT_WIRE_ROUTING_NUMBER"), ""),
        "iban": _s(os.getenv("GMFN_SETTLEMENT_IBAN"), ""),
        "swift_bic": _s(
            os.getenv("GMFN_SETTLEMENT_SWIFT_BIC"),
            _s(os.getenv("GMFN_SETTLEMENT_BIC"), ""),
        ),
        "bank_code": _s(os.getenv("GMFN_SETTLEMENT_BANK_CODE"), ""),
        "branch_code": _s(os.getenv("GMFN_SETTLEMENT_BRANCH_CODE"), ""),
        "branch_name": _s(os.getenv("GMFN_SETTLEMENT_BRANCH_NAME"), ""),
        "ifsc_code": _s(os.getenv("GMFN_SETTLEMENT_IFSC_CODE"), ""),
        "mobile_money_provider": _s(os.getenv("GMFN_SETTLEMENT_MOBILE_MONEY_PROVIDER"), ""),
        "mobile_money_number": _s(os.getenv("GMFN_SETTLEMENT_MOBILE_MONEY_NUMBER"), ""),
        "country": country,
        "region_code": region_code,
        "payment_networks": _csv(
            os.getenv("GMFN_SETTLEMENT_PAYMENT_NETWORKS"),
            [
                "UK sort code",
                "US routing",
                "IBAN",
                "SWIFT/BIC",
                "local bank or mobile money code where configured",
            ],
        ),
        "regional_requirements": {
            "uk": ["sort_code", "account_number"],
            "united_states": ["routing_number", "account_number"],
            "europe_mena": ["iban", "swift_bic"],
            "africa": ["bank_code", "branch_code", "account_number", "mobile_money_number"],
            "asia": ["swift_bic", "bank_code", "branch_code", "ifsc_code"],
            "global": ["swift_bic", "iban", "local_bank_identifier"],
        },
        "missing_field_text": _s(
            os.getenv("GMFN_SETTLEMENT_MISSING_FIELD_TEXT"),
            "Not configured for this pilot rail yet.",
        ),
        "support_note": _s(
            os.getenv("GMFN_SETTLEMENT_SUPPORT_NOTE"),
            "Use the exact payment code and the regional bank identifier your country requires. If your bank asks for a field that is not configured here yet, contact GSN support before sending money.",
        ),
    }
