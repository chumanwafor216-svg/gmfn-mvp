from __future__ import annotations

import os

from fastapi import APIRouter

from app.services.settlement_config_service import get_settlement_config

router = APIRouter(prefix="/public/config", tags=["public-config"])


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _configured(value: object) -> bool:
    text = str(value or "").strip().lower()
    return bool(text) and text not in {"to be assigned", "not configured", "pending"}


@router.get("")
def public_config():
    settlement = get_settlement_config()
    bank_transfer_ready = all(
        _configured(settlement.get(key))
        for key in ("bank_name", "account_name", "account_number")
    )
    mobile_money_ready = all(
        _configured(settlement.get(key))
        for key in ("mobile_money_provider", "mobile_money_number")
    )

    return {
        "app_name": "GSN",
        "product_name": "Global Support Network",
        "protocol_name": "Trust Infrastructure Protocol",
        "supports_bank_transfer": bank_transfer_ready,
        "supports_gateway": _truthy(os.getenv("GMFN_PAYMENT_GATEWAY_ENABLED")),
        "supports_mobile_money": mobile_money_ready,
        "default_currency": "NGN",
        "settlement": settlement,
    }
