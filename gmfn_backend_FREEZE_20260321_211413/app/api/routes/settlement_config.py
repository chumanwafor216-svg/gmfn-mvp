from __future__ import annotations

from fastapi import APIRouter

from app.services.settlement_config_service import get_settlement_config

router = APIRouter(prefix="/settlement-config", tags=["settlement-config"])


@router.get("")
def settlement_config():
    return get_settlement_config()