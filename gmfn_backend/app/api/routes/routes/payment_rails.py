from __future__ import annotations

from fastapi import APIRouter, Query

from app.services.payment_rail_service import (
    build_payment_rail_context,
    get_default_payment_rail,
    list_payment_rails,
)

router = APIRouter(prefix="/payment-rails", tags=["payment-rails"])


@router.get("")
def payment_rails():
    return {
        "items": list_payment_rails(),
        "total": len(list_payment_rails()),
    }


@router.get("/default")
def default_payment_rail(
    currency: str = Query("NGN"),
):
    return get_default_payment_rail(currency)


@router.get("/context")
def payment_rail_context(
    instruction_type: str = Query("pool_deposit"),
    currency: str = Query("NGN"),
):
    return build_payment_rail_context(
        instruction_type=instruction_type,
        currency=currency,
    )