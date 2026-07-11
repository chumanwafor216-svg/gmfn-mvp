from __future__ import annotations

import os
from typing import Any, Dict, List, Optional


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


COUNTRY_LABELS: Dict[str, str] = {
    "NG": "Nigeria",
    "GB": "United Kingdom",
}

COUNTRY_ALIASES: Dict[str, str] = {
    "NIGERIA": "NG",
    "NGN": "NG",
    "UK": "GB",
    "GBR": "GB",
    "UNITEDKINGDOM": "GB",
    "GREATBRITAIN": "GB",
    "ENGLAND": "GB",
    "SCOTLAND": "GB",
    "WALES": "GB",
    "NORTHERNIRELAND": "GB",
}


def normalize_settlement_country(country: Any = None) -> str:
    raw = _s(country)
    if not raw:
        raw = _s(os.getenv("GMFN_SETTLEMENT_COUNTRY"), "NG")
    compact = "".join(ch for ch in raw.upper() if ch.isalnum())
    return COUNTRY_ALIASES.get(compact, compact[:2] or "NG")


def _country_prefixes(country: str) -> List[str]:
    code = normalize_settlement_country(country)
    prefixes = [code]
    if code == "GB":
        prefixes.append("UK")
    return prefixes


def _country_env(country: str, name: str) -> Optional[str]:
    for prefix in _country_prefixes(country):
        value = os.getenv(f"GMFN_SETTLEMENT_{prefix}_{name}")
        if _s(value):
            return value
    return None


def _configured(value: object) -> bool:
    text = _s(value).lower()
    return bool(text) and text not in {"to be assigned", "not configured", "pending"}


def _field(country: str, name: str, default: str, *, allow_global: bool) -> str:
    country_value = _country_env(country, name)
    if _s(country_value):
        return _s(country_value)
    if allow_global:
        return _s(os.getenv(f"GMFN_SETTLEMENT_{name}"), default)
    return default


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


def list_settlement_country_options() -> List[Dict[str, Any]]:
    return [
        {
            "country": code,
            "country_label": label,
            "configured": _configured(get_settlement_config(code).get("account_number")),
        }
        for code, label in COUNTRY_LABELS.items()
    ]


def get_settlement_config(country: Any = None) -> Dict[str, Any]:
    global_country = normalize_settlement_country(os.getenv("GMFN_SETTLEMENT_COUNTRY"))
    requested_country = normalize_settlement_country(country)
    allow_global = country is None or requested_country == global_country
    country_label = COUNTRY_LABELS.get(requested_country, requested_country)
    region_code = _s(
        _country_env(requested_country, "REGION")
        or (os.getenv("GMFN_SETTLEMENT_REGION") if allow_global else ""),
        _region_for_country(requested_country),
    )
    rail_name = _field(requested_country, "RAIL_NAME", "Bank Transfer", allow_global=allow_global)
    bank_name = _field(
        requested_country,
        "BANK_NAME",
        "GSN Settlement Rail",
        allow_global=allow_global,
    )
    account_name = _field(
        requested_country,
        "ACCOUNT_NAME",
        "GSN Settlement",
        allow_global=allow_global,
    )
    account_number = _field(
        requested_country,
        "ACCOUNT_NUMBER",
        "To be assigned",
        allow_global=allow_global,
    )
    payment_networks = _csv(
        _country_env(requested_country, "PAYMENT_NETWORKS")
        or (os.getenv("GMFN_SETTLEMENT_PAYMENT_NETWORKS") if allow_global else None),
        ["UK sort code", "account number"]
        if requested_country == "GB"
        else ["local bank code", "account number"],
    )

    config = {
        "rail_name": rail_name,
        "bank_name": bank_name,
        "account_name": account_name,
        "account_number": account_number,
        "sort_code": _field(requested_country, "SORT_CODE", "", allow_global=allow_global),
        "routing_number": _field(
            requested_country,
            "ROUTING_NUMBER",
            "",
            allow_global=allow_global,
        ),
        "ach_routing_number": _field(
            requested_country,
            "ACH_ROUTING_NUMBER",
            "",
            allow_global=allow_global,
        ),
        "wire_routing_number": _field(
            requested_country,
            "WIRE_ROUTING_NUMBER",
            "",
            allow_global=allow_global,
        ),
        "iban": _field(requested_country, "IBAN", "", allow_global=allow_global),
        "swift_bic": _s(
            _country_env(requested_country, "SWIFT_BIC")
            or _country_env(requested_country, "BIC")
            or (os.getenv("GMFN_SETTLEMENT_SWIFT_BIC") if allow_global else "")
            or (os.getenv("GMFN_SETTLEMENT_BIC") if allow_global else ""),
            "",
        ),
        "bank_code": _field(requested_country, "BANK_CODE", "", allow_global=allow_global),
        "branch_code": _field(requested_country, "BRANCH_CODE", "", allow_global=allow_global),
        "branch_name": _field(requested_country, "BRANCH_NAME", "", allow_global=allow_global),
        "ifsc_code": _field(requested_country, "IFSC_CODE", "", allow_global=allow_global),
        "mobile_money_provider": _field(
            requested_country,
            "MOBILE_MONEY_PROVIDER",
            "",
            allow_global=allow_global,
        ),
        "mobile_money_number": _field(
            requested_country,
            "MOBILE_MONEY_NUMBER",
            "",
            allow_global=allow_global,
        ),
        "country": requested_country,
        "country_label": country_label,
        "region_code": region_code,
        "payment_networks": payment_networks,
        "regional_requirements": {
            "uk": ["sort_code", "account_number"],
            "united_states": ["routing_number", "account_number"],
            "europe_mena": ["iban", "swift_bic"],
            "africa": ["bank_code", "branch_code", "account_number", "mobile_money_number"],
            "asia": ["swift_bic", "bank_code", "branch_code", "ifsc_code"],
            "global": ["swift_bic", "iban", "local_bank_identifier"],
        },
        "missing_field_text": _s(
            _country_env(requested_country, "MISSING_FIELD_TEXT")
            or (os.getenv("GMFN_SETTLEMENT_MISSING_FIELD_TEXT") if allow_global else None),
            "Payment setup is not ready for this region yet.",
        ),
        "support_note": _s(
            _country_env(requested_country, "SUPPORT_NOTE")
            or (os.getenv("GMFN_SETTLEMENT_SUPPORT_NOTE") if allow_global else None),
            "Use the exact payment code and the regional bank identifier your country requires. If your bank asks for a field that is not configured here yet, contact GSN support before sending money.",
        ),
    }
    config["configured"] = all(
        _configured(config.get(key))
        for key in ("bank_name", "account_name", "account_number")
    )
    return config
