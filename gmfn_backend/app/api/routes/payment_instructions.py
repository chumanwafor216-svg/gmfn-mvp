from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User

from app.services.payment_instruction_service import (
    create_loan_repayment_instruction,
    create_pool_deposit_instruction,
)
from app.services.settlement_config_service import get_settlement_config

router = APIRouter(prefix="/payment-instructions", tags=["payment-instructions"])


@router.post("/pool")
def create_pool_instruction(
    clan_id: int,
    amount: Decimal,
    currency: str = "NGN",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be > 0")

    out = create_pool_deposit_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(current_user.id),
        amount=amount,
        currency=currency,
    )
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "pool_deposit"
    return out


@router.post("/loan")
def create_loan_instruction(
    clan_id: int,
    loan_id: int,
    amount: Decimal,
    currency: str = "NGN",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be > 0")

    out = create_loan_repayment_instruction(
        db,
        clan_id=int(clan_id),
        user_id=int(current_user.id),
        loan_id=int(loan_id),
        amount=amount,
        currency=currency,
    )
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "loan_repayment"
    return out


@router.get("/my")
def my_instruction_config(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return {
        "user_id": int(current_user.id),
        "settlement": get_settlement_config(),
        "available_instruction_types": ["pool_deposit", "loan_repayment"],
    }