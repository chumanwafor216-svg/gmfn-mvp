from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from app.services.settlement_config_service import get_settlement_config

router = APIRouter(prefix="/settlement-config", tags=["settlement-config"])


@router.get("")
def settlement_config(country: Optional[str] = Query(default=None)):
    return get_settlement_config(country)
