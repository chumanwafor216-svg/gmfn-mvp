from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import MarketplaceShop, User
from app.services.payment_instruction_service import (
    PAYMENT_DUE_WINDOW_DAYS,
    VAULT_DEFAULT_BILLING_CYCLE,
    VAULT_SLOT_DURATION_DAYS,
    create_loan_repayment_instruction,
    create_pool_deposit_instruction,
    create_merchant_verify_instruction,
    create_spotlight_subscription_instruction,
    create_vault_subscription_instruction,
)
from app.services.settlement_config_service import get_settlement_config
from app.services.vault_access_service import DEFAULT_LINK_EXPIRY_HOURS
from app.services.vault_domain_service import (
    ensure_vault_blocks,
    expire_vault_blocks,
    sync_legacy_entitlements_to_blocks,
)

router = APIRouter(prefix="/payment-instructions", tags=["payment-instructions"])


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _require_shop_owner(
    db: Session,
    *,
    shop_id: int,
    current_user: User,
) -> MarketplaceShop:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    is_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    if int(shop.owner_user_id) != int(current_user.id) and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only the shop owner can create this payment instruction",
        )
    return shop


class PoolInstructionIn(BaseModel):
    clan_id: int
    amount: Decimal = Field(..., gt=Decimal("0"))
    currency: str = "NGN"


class LoanInstructionIn(BaseModel):
    clan_id: int
    loan_id: int
    amount: Decimal = Field(..., gt=Decimal("0"))
    currency: str = "NGN"


class VaultInstructionIn(BaseModel):
    clan_id: int
    shop_id: int
    quantity_total: int = Field(..., ge=1, le=6)
    currency: str = "GBP"


class MerchantVerifyInstructionIn(BaseModel):
    clan_id: int
    shop_id: int
    amount: Decimal = Field(..., gt=Decimal("0"))
    currency: str = "GBP"


class SpotlightInstructionIn(BaseModel):
    clan_id: int
    shop_id: int
    amount: Decimal = Field(..., gt=Decimal("0"))
    quantity_total: int = Field(default=1, ge=1)
    currency: str = "GBP"
    visibility_scope: str = "direct_communities"


@router.post("/pool")
def create_pool_instruction(
    payload: PoolInstructionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    out = create_pool_deposit_instruction(
        db,
        clan_id=int(payload.clan_id),
        user_id=int(current_user.id),
        amount=payload.amount,
        currency=payload.currency,
    )
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "pool_deposit"
    return out


@router.post("/loan")
def create_loan_instruction(
    payload: LoanInstructionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    out = create_loan_repayment_instruction(
        db,
        clan_id=int(payload.clan_id),
        user_id=int(current_user.id),
        loan_id=int(payload.loan_id),
        amount=payload.amount,
        currency=payload.currency,
    )
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "loan_repayment"
    return out


@router.post("/vault")
def create_vault_instruction(
    payload: VaultInstructionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_shop_owner(
        db,
        shop_id=int(payload.shop_id),
        current_user=current_user,
    )

    quantity_total = _safe_int(payload.quantity_total, 0)
    if quantity_total < 1 or quantity_total > 6:
        raise HTTPException(
            status_code=400,
            detail="Vault subscription currently supports quantity_total from 1 to 6 only.",
        )
    sync_legacy_entitlements_to_blocks(
        db,
        shop_id=int(payload.shop_id),
        owner_user_id=int(current_user.id),
    )
    expire_vault_blocks(db, shop_id=int(payload.shop_id))
    blocks = ensure_vault_blocks(db, shop_id=int(payload.shop_id))
    available_slots = sum(
        1
        for block in blocks
        if str(getattr(block, "state", "") or "") in {"inactive", "expired"}
    )
    if quantity_total > available_slots:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Vault has {available_slots} available paid slot"
                f"{'' if available_slots == 1 else 's'} right now. "
                "Reduce the slot count or wait for an active block to expire."
            ),
        )

    out = create_vault_subscription_instruction(
        db,
        clan_id=int(payload.clan_id),
        owner_user_id=int(current_user.id),
        shop_id=int(payload.shop_id),
        quantity_total=quantity_total,
        currency=payload.currency,
    )
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "vault_subscription"
    return out


@router.post("/merchant-verify")
def create_merchant_verify_payment_instruction(
    payload: MerchantVerifyInstructionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_shop_owner(
        db,
        shop_id=int(payload.shop_id),
        current_user=current_user,
    )

    out = create_merchant_verify_instruction(
        db,
        clan_id=int(payload.clan_id),
        owner_user_id=int(current_user.id),
        shop_id=int(payload.shop_id),
        amount=payload.amount,
        currency=payload.currency,
    )
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "merchant_verify_subscription"
    return out


@router.post("/spotlight")
def create_spotlight_payment_instruction(
    payload: SpotlightInstructionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_shop_owner(
        db,
        shop_id=int(payload.shop_id),
        current_user=current_user,
    )

    out = create_spotlight_subscription_instruction(
        db,
        clan_id=int(payload.clan_id),
        owner_user_id=int(current_user.id),
        shop_id=int(payload.shop_id),
        amount=payload.amount,
        quantity_total=int(payload.quantity_total),
        currency=payload.currency,
        visibility_scope=payload.visibility_scope,
    )
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "spotlight_subscription"
    return out


@router.get("/my")
def my_instruction_config(
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return {
        "user_id": int(current_user.id),
        "settlement": get_settlement_config(),
        "available_instruction_types": [
            "pool_deposit",
            "loan_repayment",
            "vault_subscription",
            "merchant_verify_subscription",
            "spotlight_subscription",
        ],
        "vault_supported_quantities": [1, 2, 3, 4, 5, 6],
        "vault_config": {
            "max_slots": 6,
            "unit_price_gbp": "1.00",
            "bundle_slot_count": 6,
            "bundle_price_gbp": "5.00",
            "payment_instruction_expiry_days": PAYMENT_DUE_WINDOW_DAYS,
            "vault_slot_duration_days": VAULT_SLOT_DURATION_DAYS,
            "default_link_expiry_hours": DEFAULT_LINK_EXPIRY_HOURS,
            "payment_method": "bank_transfer",
            "payment_beneficiary_scope": "platform",
            "billing_cycle": VAULT_DEFAULT_BILLING_CYCLE,
        },
    }
