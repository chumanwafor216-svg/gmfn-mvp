from __future__ import annotations

import json
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, MarketplaceShop, User
from app.services.payment_instruction_service import (
    COMMUNITY_PACKAGE_CATALOG,
    PAYMENT_DUE_WINDOW_DAYS,
    VAULT_DEFAULT_BILLING_CYCLE,
    VAULT_SLOT_DURATION_DAYS,
    calc_community_package_amount,
    calc_community_package_amount_for_code,
    create_loan_repayment_instruction,
    create_pool_deposit_instruction,
    create_community_package_instruction,
    create_merchant_verify_instruction,
    create_spotlight_subscription_instruction,
    create_vault_subscription_instruction,
)
from app.services.expected_payments_service import list_expected_payments
from app.services.community_pay_in_account_service import get_community_pay_in_settlement
from app.services.feature_entitlements_service import (
    consume_feature_units,
    get_active_feature_quantity,
)
from app.services.settlement_config_service import get_settlement_config
from app.services.trust_events_services import log_trust_event
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


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _expected_payment_out(row: Any) -> Dict[str, Any]:
    meta = _safe_meta_json(getattr(row, "meta_json", None))
    return {
        "id": int(row.id),
        "clan_id": int(row.clan_id),
        "user_id": int(row.user_id),
        "loan_id": meta.get("loan_id"),
        "expected_type": row.expected_type,
        "amount": str(row.amount),
        "currency": row.currency,
        "paid_amount": str(row.paid_amount),
        "remaining_amount": str(row.remaining_amount),
        "due_at": _iso(row.due_at),
        "reference_display": row.reference_display,
        "reference_normalized": row.reference_normalized,
        "status": row.status,
        "status_reason": row.status_reason,
        "bank_event_id": row.bank_event_id,
        "trust_event_id": row.trust_event_id,
        "created_at": _iso(row.created_at),
        "meta": meta,
        "meta_json": meta,
    }


def _safe_meta_json(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


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


def _require_clan_admin(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> ClanMembership:
    is_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )

    if is_admin:
        if membership:
            return membership
        return ClanMembership(
            clan_id=int(clan_id),
            user_id=int(current_user.id),
            role="admin",
        )

    if not membership or str(getattr(membership, "role", "") or "").lower() != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only a community admin can create this package payment instruction",
        )
    return membership


def _require_clan_member(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> Optional[ClanMembership]:
    is_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )

    if membership:
        return membership
    if is_admin:
        return None

    raise HTTPException(
        status_code=403,
        detail="Only a community member can read this package status",
    )


class PoolInstructionIn(BaseModel):
    clan_id: int
    amount: Decimal = Field(..., gt=Decimal("0"))
    currency: str = "NGN"
    contribution_reason: Optional[str] = Field(default=None, max_length=180)


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
    amount: Optional[Decimal] = Field(default=None, gt=Decimal("0"))
    quantity_total: int = Field(default=1, ge=1, le=365)
    currency: str = "GBP"
    visibility_scope: str = "direct_communities"


class CommunityPackageInstructionIn(BaseModel):
    clan_id: int
    package_code: str = Field(..., min_length=3, max_length=64)
    quantity_total: int = Field(default=1, ge=1, le=365)
    shop_id: Optional[int] = None
    amount: Optional[Decimal] = Field(default=None, gt=Decimal("0"))
    currency: str = "GBP"


class CommunityPackageUseIn(BaseModel):
    clan_id: int
    package_code: str = Field(..., min_length=3, max_length=64)
    units: int = Field(default=1, ge=1, le=365)
    shop_id: Optional[int] = None
    reference_key: Optional[str] = Field(default=None, max_length=128)
    note: Optional[str] = Field(default=None, max_length=500)


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
        contribution_reason=payload.contribution_reason,
    )
    out["settlement"] = get_community_pay_in_settlement(db, clan_id=int(payload.clan_id))
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
    out["settlement"] = get_community_pay_in_settlement(db, clan_id=int(payload.clan_id))
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

    try:
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
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "spotlight_subscription"
    return out


def _latest_package_payment(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    package_code: str,
) -> Optional[Dict[str, Any]]:
    rows = list_expected_payments(
        db,
        clan_id=int(clan_id),
        user_id=int(user_id),
        expected_type="community_package_subscription",
        limit=100,
    )
    for row in rows:
        meta = _safe_meta_json(getattr(row, "meta_json", None))
        if str(meta.get("package_code") or "").strip().lower() != package_code:
            continue
        out = _expected_payment_out(row)
        out["package_code"] = package_code
        out["feature_code"] = str(meta.get("feature_code") or "")
        out["quantity_total"] = _safe_int(meta.get("quantity_total"), 0)
        return out
    return None


def _package_scope(
    *,
    package_code: str,
    shop_id: Optional[int],
    clan_id: int,
) -> Dict[str, Optional[int]]:
    if package_code == "extra_shop_blocks":
        return {
            "shop_id": int(shop_id) if shop_id is not None else None,
            "clan_id": int(clan_id),
        }
    return {"shop_id": None, "clan_id": int(clan_id)}


def _package_engine_status(package_code: str) -> Dict[str, Any]:
    if package_code == "extra_shop_blocks":
        return {
            "consumer": "public_gallery_capacity",
            "engine_ready": True,
            "message": "Extra public shop blocks are applied to this shop after payment is matched.",
        }
    if package_code == "extra_members":
        return {
            "consumer": "community_member_capacity",
            "engine_ready": True,
            "message": "Extra member places are applied to the community after payment is matched.",
        }
    if package_code == "rosca_cycle":
        return {
            "consumer": "rosca_cycle_engine",
            "engine_ready": True,
            "message": (
                "An active ROSCA yearly service can start deterministic contribution cycles without spending down credits. "
                "The engine creates member Money In expectations, tracks confirmed contributions, "
                "and records payout completion without claiming external money movement."
            ),
        }
    if package_code == "community_meeting_pack":
        return {
            "consumer": "community_meeting_evidence_engine",
            "engine_ready": True,
            "message": (
                "Meeting pack units now create GSN reminder evidence, WhatsApp share text, "
                "member notifications, and later summary TrustEvents. WhatsApp still carries "
                "the conversation outside GSN."
            ),
        }
    return {"consumer": "unknown", "engine_ready": False, "message": "Package status is unknown."}


@router.get("/community-package/status")
def community_package_status(
    clan_id: int = Query(..., ge=1),
    shop_id: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    if shop_id is not None:
        shop = _require_shop_owner(db, shop_id=int(shop_id), current_user=current_user)
        if shop.clan_id is not None and int(shop.clan_id) != int(clan_id):
            raise HTTPException(
                status_code=400,
                detail="This shop does not belong to the selected community",
            )

    packages = []
    for package_code, cfg in COMMUNITY_PACKAGE_CATALOG.items():
        scope = _package_scope(
            package_code=package_code,
            shop_id=int(shop_id) if shop_id is not None else None,
            clan_id=int(clan_id),
        )
        active_remaining = get_active_feature_quantity(
            db,
            owner_user_id=int(current_user.id),
            feature_code=cfg["feature_code"],
            shop_id=scope["shop_id"],
            clan_id=scope["clan_id"],
        )
        packages.append(
            {
                "package_code": package_code,
                "feature_code": cfg["feature_code"],
                "title": cfg["title"],
                "unit_label": cfg["unit_label"],
                "active_remaining": int(active_remaining),
                "latest_payment": _latest_package_payment(
                    db,
                    clan_id=int(clan_id),
                    user_id=int(current_user.id),
                    package_code=package_code,
                ),
                **_package_engine_status(package_code),
            }
        )

    return {
        "ok": True,
        "clan_id": int(clan_id),
        "shop_id": int(shop_id) if shop_id is not None else None,
        "packages": packages,
    }


@router.post("/community-package/use")
def use_community_package_unit(
    payload: CommunityPackageUseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    package_code = str(payload.package_code or "").strip().lower()
    if package_code not in COMMUNITY_PACKAGE_CATALOG:
        raise HTTPException(status_code=400, detail="Unsupported community package code")
    if package_code == "rosca_cycle":
        raise HTTPException(
            status_code=400,
            detail="Use the ROSCA cycle engine to consume ROSCA package credit",
        )
    if package_code == "community_meeting_pack":
        raise HTTPException(
            status_code=400,
            detail="Use the Community Meeting engine to consume meeting pack credit",
        )

    package = COMMUNITY_PACKAGE_CATALOG[package_code]
    if package_code == "extra_shop_blocks":
        if payload.shop_id is None:
            raise HTTPException(status_code=400, detail="Shop ID is required for extra shop blocks")
        shop = _require_shop_owner(db, shop_id=int(payload.shop_id), current_user=current_user)
        if shop.clan_id is not None and int(shop.clan_id) != int(payload.clan_id):
            raise HTTPException(
                status_code=400,
                detail="This shop does not belong to the selected community",
            )
    else:
        _require_clan_admin(db, clan_id=int(payload.clan_id), current_user=current_user)

    scope = _package_scope(
        package_code=package_code,
        shop_id=int(payload.shop_id) if payload.shop_id is not None else None,
        clan_id=int(payload.clan_id),
    )
    result = consume_feature_units(
        db,
        owner_user_id=int(current_user.id),
        feature_code=package["feature_code"],
        units=int(payload.units),
        shop_id=scope["shop_id"],
        clan_id=scope["clan_id"],
        reference_key=payload.reference_key,
        note=payload.note,
        commit=False,
    )
    if not bool(result.get("ok")):
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No active package credit is available for this action",
        )

    remaining_after = get_active_feature_quantity(
        db,
        owner_user_id=int(current_user.id),
        feature_code=package["feature_code"],
        shop_id=scope["shop_id"],
        clan_id=scope["clan_id"],
    )
    engine_status = _package_engine_status(package_code)

    log_trust_event(
        db,
        event_type=f"feature.{package_code}.used",
        clan_id=int(payload.clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "reason": "community_package_unit_used",
            "package_code": package_code,
            "feature_code": package["feature_code"],
            "units": int(payload.units),
            "remaining_after": int(remaining_after),
            "shop_id": int(payload.shop_id) if payload.shop_id is not None else None,
            "reference_key": payload.reference_key,
            "engine_ready": bool(engine_status["engine_ready"]),
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    return {
        "ok": True,
        "package_code": package_code,
        "feature_code": package["feature_code"],
        "consumed": int(result.get("consumed") or 0),
        "remaining_after": int(remaining_after),
        "engine_status": engine_status,
        "message": engine_status["message"],
    }


@router.post("/community-package")
def create_community_package_payment_instruction(
    payload: CommunityPackageInstructionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    package_code = str(payload.package_code or "").strip().lower()
    if package_code not in COMMUNITY_PACKAGE_CATALOG:
        raise HTTPException(status_code=400, detail="Unsupported community package code")

    package = COMMUNITY_PACKAGE_CATALOG[package_code]
    package_needs_shop = package_code in {"extra_shop_blocks"}

    if package_needs_shop or payload.shop_id is not None:
        shop = _require_shop_owner(
            db,
            shop_id=int(payload.shop_id or 0),
            current_user=current_user,
        )
        if shop.clan_id is not None and int(shop.clan_id) != int(payload.clan_id):
            raise HTTPException(
                status_code=400,
                detail="This shop does not belong to the selected community",
            )
    else:
        _require_clan_admin(
            db,
            clan_id=int(payload.clan_id),
            current_user=current_user,
        )

    try:
        out = create_community_package_instruction(
            db,
            clan_id=int(payload.clan_id),
            owner_user_id=int(current_user.id),
            shop_id=int(payload.shop_id) if payload.shop_id is not None else None,
            package_code=package_code,
            quantity_total=int(payload.quantity_total),
            amount=payload.amount,
            currency=payload.currency,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    out["settlement"] = get_settlement_config()
    out["instruction_type"] = "community_package_subscription"
    out["package_code"] = package_code
    out["package_title"] = package["title"]
    return out


@router.get("/my/expected")
def my_expected_payments(
    clan_id: int = Query(..., ge=1),
    expected_type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    currency: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    rows = list_expected_payments(
        db,
        clan_id=int(clan_id),
        user_id=int(current_user.id),
        expected_type=expected_type,
        status=status,
        currency=currency,
        limit=int(limit),
    )
    return {"items": [_expected_payment_out(x) for x in rows], "total": len(rows)}


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
            "community_package_subscription",
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
        "spotlight_config": {
            "max_credits": 365,
            "unit_price_gbp": "1.00",
            "bundle_credit_count": 6,
            "bundle_price_gbp": "5.00",
            "network_repost_credit_unit_days": 1,
            "max_network_repost_days": 365,
            "payment_instruction_expiry_days": PAYMENT_DUE_WINDOW_DAYS,
            "payment_method": "bank_transfer",
            "payment_beneficiary_scope": "platform",
            "billing_cycle": "annual",
        },
        "community_package_config": {
            "max_units": 365,
            "unit_price_gbp": "1.00",
            "bundle_unit_count": 6,
            "bundle_price_gbp": "5.00",
            "payment_instruction_expiry_days": PAYMENT_DUE_WINDOW_DAYS,
            "payment_method": "bank_transfer",
            "payment_beneficiary_scope": "platform",
            "billing_cycle": "annual",
            "packages": [
                {
                    "package_code": code,
                    "feature_code": cfg["feature_code"],
                    "title": cfg["title"],
                    "unit_label": cfg["unit_label"],
                    "pricing_model": cfg.get("pricing_model") or "spotlight_bundle_rail",
                    "one_unit_amount_gbp": str(
                        calc_community_package_amount_for_code(code, 1)
                    ),
                    "six_unit_bundle_amount_gbp": None
                    if str(cfg.get("max_quantity") or "") == "1"
                    else str(calc_community_package_amount(6)),
                }
                for code, cfg in COMMUNITY_PACKAGE_CATALOG.items()
            ],
        },
    }
