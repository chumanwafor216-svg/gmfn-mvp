from __future__ import annotations

from typing import Any, Dict, List

from app.services.settlement_config_service import get_settlement_config


def list_payment_rails() -> List[Dict[str, Any]]:
    settlement = get_settlement_config()

    return [
        {
            "rail_code": "bank_transfer",
            "label": "Bank Transfer",
            "kind": "push",
            "status": "active",
            "supports_inbound": True,
            "supports_outbound": True,
            "currencies": ["NGN"],
            "settlement": settlement,
        },
        {
            "rail_code": "mobile_money",
            "label": "Mobile Money",
            "kind": "push",
            "status": "planned",
            "supports_inbound": True,
            "supports_outbound": True,
            "currencies": ["NGN", "KES", "GHS", "UGX"],
            "settlement": None,
        },
        {
            "rail_code": "gateway",
            "label": "Gateway / Card",
            "kind": "pull",
            "status": "planned",
            "supports_inbound": True,
            "supports_outbound": False,
            "currencies": ["NGN", "GBP", "USD", "EUR"],
            "settlement": None,
        },
    ]


def get_default_payment_rail(currency: str | None = None) -> Dict[str, Any]:
    ccy = (currency or "NGN").strip().upper()

    rails = list_payment_rails()

    for rail in rails:
        if rail["status"] == "active" and ccy in rail["currencies"]:
            return rail

    return rails[0]


def build_payment_rail_context(
    *,
    instruction_type: str,
    currency: str | None = None,
) -> Dict[str, Any]:
    default_rail = get_default_payment_rail(currency)

    return {
        "instruction_type": str(instruction_type or "").strip().lower(),
        "currency": (currency or "NGN").strip().upper(),
        "default_rail": default_rail,
        "available_rails": list_payment_rails(),
    }