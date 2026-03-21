from __future__ import annotations

from fastapi import APIRouter

from app.services.settlement_config_service import get_settlement_config

router = APIRouter(prefix="/public/config", tags=["public-config"])


@router.get("")
def public_config():
    settlement = get_settlement_config()

    return {
        "app_name": "GMFN",
        "product_name": "Global Support Network",
        "protocol_name": "Trust Infrastructure Protocol",
        "supports_bank_transfer": True,
        "supports_gateway": True,
        "supports_mobile_money": True,
        "default_currency": "NGN",
        "settlement": settlement,
    }