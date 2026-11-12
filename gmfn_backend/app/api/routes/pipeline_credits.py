from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, User
from app.db.pipeline_credit_models import PipelineCreditLedgerEntry
from app.services.pipeline_credit_spend_gate import provider_spend_gate_catalog
from app.services.pipeline_credit_service import (
    PIPELINE_CREDIT_BOUNDARY,
    InsufficientPipelineCreditError,
    PipelineCreditError,
    allocate_pipeline_credits,
    debit_pipeline_credits,
    get_pipeline_credit_account,
    serialize_pipeline_credit_account,
    serialize_pipeline_credit_entry,
)
from app.services.pipeline_credit_commerce_service import (
    PipelineCreditCommerceError,
    customer_credit_status,
    issue_service_quote,
    pricing_catalogue,
    quote_out,
    set_pricing_policy,
    set_service_price,
    spend_out,
    spend_service_quote,
)
from app.services.payment_operations_policy import (
    PaymentOperationsSuspended,
    require_payment_operations_enabled,
)

router = APIRouter(prefix="/pipeline-credits", tags=["pipeline-credits"])


class PipelineCreditAccountSelector(BaseModel):
    account_id: Optional[int] = Field(default=None, ge=1)
    owner_type: Optional[str] = Field(default=None, max_length=32)
    owner_user_id: Optional[int] = Field(default=None, ge=1)
    clan_id: Optional[int] = Field(default=None, ge=1)
    sponsor_ref: Optional[str] = Field(default=None, max_length=96)
    account_purpose: str = Field(default="provider_operations", max_length=32)
    pricing_region: str = Field(default="global", max_length=32)

    @field_validator("owner_type", "sponsor_ref", "account_purpose", "pricing_region", mode="before")
    @classmethod
    def _text_or_none(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text")
        return value.strip()


class PipelineCreditAllocateIn(PipelineCreditAccountSelector):
    amount: str = Field(..., min_length=1, max_length=32)
    currency: str = Field(default="GBP", min_length=1, max_length=8)
    idempotency_key: str = Field(..., min_length=6, max_length=160)
    workflow_key: str = Field(default="pipeline_credit.allocation", min_length=3, max_length=96)
    reference_type: Optional[str] = Field(default=None, max_length=64)
    reference_id: Optional[str] = Field(default=None, max_length=128)
    note: Optional[str] = Field(default=None, max_length=500)
    meta: Optional[dict[str, Any]] = None

    @field_validator(
        "amount",
        "currency",
        "idempotency_key",
        "workflow_key",
        "reference_type",
        "reference_id",
        "note",
        mode="before",
    )
    @classmethod
    def _strings_only(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text")
        return value.strip()


class PipelineCreditDebitIn(PipelineCreditAccountSelector):
    amount: str = Field(..., min_length=1, max_length=32)
    idempotency_key: str = Field(..., min_length=6, max_length=160)
    workflow_key: str = Field(..., min_length=3, max_length=96)
    provider_key: Optional[str] = Field(default=None, max_length=96)
    reference_type: Optional[str] = Field(default=None, max_length=64)
    reference_id: Optional[str] = Field(default=None, max_length=128)
    note: Optional[str] = Field(default=None, max_length=500)
    meta: Optional[dict[str, Any]] = None

    @field_validator(
        "amount",
        "idempotency_key",
        "workflow_key",
        "provider_key",
        "reference_type",
        "reference_id",
        "note",
        mode="before",
    )
    @classmethod
    def _strings_only(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text")
        return value.strip()


class PipelineCreditPricingPolicyIn(BaseModel):
    region_code: str = Field(default="global", min_length=2, max_length=32)
    currency: str = Field(default="GBP", min_length=2, max_length=8)
    credits_per_currency_unit: str = Field(..., min_length=1, max_length=32)


class PipelineCreditServicePriceIn(BaseModel):
    region_code: str = Field(default="global", min_length=2, max_length=32)
    pricing_mode: str = Field(default="fixed_credits", min_length=3, max_length=24)
    credit_cost: Optional[str] = Field(default=None, max_length=32)
    cash_reference_amount: Optional[str] = Field(default=None, max_length=32)
    cash_reference_currency: str = Field(default="GBP", min_length=2, max_length=8)
    duration_days: Optional[int] = Field(default=None, ge=1, le=3650)
    unit_label: Optional[str] = Field(default=None, max_length=80)


class PipelineCreditServiceQuoteIn(BaseModel):
    service_code: str = Field(..., min_length=3, max_length=96)
    quantity: int = Field(default=1, ge=1, le=1000)
    region_code: str = Field(default="global", min_length=2, max_length=32)
    context: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str = Field(..., min_length=8, max_length=160)


class PipelineCreditServiceSpendIn(BaseModel):
    quote_key: str = Field(..., min_length=8, max_length=96)
    idempotency_key: str = Field(..., min_length=8, max_length=160)


def _is_admin(user: Any) -> bool:
    return str(getattr(user, "role", "") or "").lower() == "admin" or getattr(user, "is_admin", False) is True


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _require_community_admin_or_platform_admin(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> None:
    if _is_admin(current_user):
        return

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership or str(getattr(membership, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Community admin access required")

def _community_provider_gate_response(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider_key": item.get("provider_key"),
        "workflow_key": item.get("workflow_key"),
        "label": item.get("label"),
        "integration_status": item.get("integration_status"),
        "status": item.get("status"),
        "account_configured": bool(item.get("account_configured")),
        "cost_configured": bool(item.get("cost_configured")),
        "cost_per_attempt": item.get("cost_per_attempt"),
        "currency": item.get("currency") or "GBP",
        "visibility": "community_redacted",
        "boundary": (
            "Community view shows provider readiness and Pipeline Credit metering only. It hides server environment names, platform account ids, and raw provider secrets; it does not activate providers or perform paid calls."
        ),
    }

def _entry_response(db: Session, entry: PipelineCreditLedgerEntry) -> dict[str, Any]:
    account = get_pipeline_credit_account(db, account_id=int(entry.account_id))
    return {
        "ok": True,
        "entry": serialize_pipeline_credit_entry(entry),
        "account": serialize_pipeline_credit_account(db, account) if account else None,
        "boundary": PIPELINE_CREDIT_BOUNDARY,
    }


def _raise_commerce_error(exc: PipelineCreditCommerceError) -> None:
    if exc.code == "quote_not_found":
        status_code = 404
    elif exc.code in {
        "account_mismatch",
        "credit_debit_failed",
        "idempotency_conflict",
        "insufficient_credits",
        "pricing_policy_not_configured",
        "quote_expired",
        "quote_not_available",
        "service_not_connected",
        "service_price_not_configured",
        "vault_capacity_unavailable",
    }:
        status_code = 409
    else:
        status_code = 422
    raise HTTPException(status_code=status_code, detail={"code": exc.code, "message": str(exc)}) from exc




@router.get("/provider-gates")
def pipeline_credit_provider_gates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_admin(current_user)
    items = provider_spend_gate_catalog(db)
    return {
        "ok": True,
        "items": items,
        "total": len(items),
        "boundary": (
            "Provider gates show Pipeline Credit meter readiness only. They do not activate providers, validate secrets, create checkout, send messages, run AI, or perform paid calls."
        ),
    }

@router.get("/community-provider-gates")
def pipeline_credit_community_provider_gates(
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_community_admin_or_platform_admin(db, clan_id=clan_id, current_user=current_user)
    raw_items = provider_spend_gate_catalog(db)
    items = [_community_provider_gate_response(item) for item in raw_items]
    return {
        "ok": True,
        "clan_id": int(clan_id),
        "items": items,
        "total": len(items),
        "visibility": "community_redacted",
        "boundary": (
            "Community provider gates show readiness and Pipeline Credit meter status only. They do not expose secrets or platform account identifiers, and they do not activate providers, create checkout, send messages, run AI, or perform paid calls."
        ),
    }
@router.get("/status")
def pipeline_credit_status(
    account_id: Optional[int] = Query(default=None, ge=1),
    owner_type: Optional[str] = Query(default=None, max_length=32),
    owner_user_id: Optional[int] = Query(default=None, ge=1),
    clan_id: Optional[int] = Query(default=None, ge=1),
    sponsor_ref: Optional[str] = Query(default=None, max_length=96),
    account_purpose: str = Query(default="provider_operations", max_length=32),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_admin(current_user)
    try:
        account = get_pipeline_credit_account(
            db,
            account_id=account_id,
            owner_type=owner_type,
            owner_user_id=owner_user_id,
            clan_id=clan_id,
            sponsor_ref=sponsor_ref,
            account_purpose=account_purpose,
        )
    except PipelineCreditError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not account:
        return {
            "ok": True,
            "configured": False,
            "account": None,
            "entries": [],
            "boundary": PIPELINE_CREDIT_BOUNDARY,
        }

    entries = (
        db.query(PipelineCreditLedgerEntry)
        .filter(PipelineCreditLedgerEntry.account_id == int(account.id))
        .order_by(PipelineCreditLedgerEntry.id.desc())
        .limit(int(limit))
        .all()
    )
    return {
        "ok": True,
        "configured": True,
        "account": serialize_pipeline_credit_account(db, account),
        "entries": [serialize_pipeline_credit_entry(entry) for entry in entries],
        "boundary": PIPELINE_CREDIT_BOUNDARY,
    }


@router.get("/community-status")
def pipeline_credit_community_status(
    clan_id: int = Query(..., ge=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_community_admin_or_platform_admin(db, clan_id=clan_id, current_user=current_user)
    account = get_pipeline_credit_account(db, owner_type="community", clan_id=clan_id)

    if not account:
        return {
            "ok": True,
            "configured": False,
            "clan_id": int(clan_id),
            "account": None,
            "entries": [],
            "boundary": PIPELINE_CREDIT_BOUNDARY,
        }

    entries = (
        db.query(PipelineCreditLedgerEntry)
        .filter(PipelineCreditLedgerEntry.account_id == int(account.id))
        .order_by(PipelineCreditLedgerEntry.id.desc())
        .limit(int(limit))
        .all()
    )
    return {
        "ok": True,
        "configured": True,
        "clan_id": int(clan_id),
        "account": serialize_pipeline_credit_account(db, account),
        "entries": [serialize_pipeline_credit_entry(entry) for entry in entries],
        "boundary": PIPELINE_CREDIT_BOUNDARY,
    }

@router.post("/allocate", status_code=status.HTTP_201_CREATED)
def pipeline_credit_allocate(
    payload: PipelineCreditAllocateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_admin(current_user)
    if payload.account_id is not None:
        raise HTTPException(status_code=422, detail="Allocate by owner scope, not account_id")
    try:
        require_payment_operations_enabled()
        entry = allocate_pipeline_credits(
            db,
            owner_type=payload.owner_type,
            owner_user_id=payload.owner_user_id,
            clan_id=payload.clan_id,
            sponsor_ref=payload.sponsor_ref,
            amount=payload.amount,
            currency=payload.currency,
            workflow_key=payload.workflow_key,
            idempotency_key=payload.idempotency_key,
            reference_type=payload.reference_type,
            reference_id=payload.reference_id,
            note=payload.note,
            created_by_user_id=int(current_user.id),
            meta=payload.meta,
            account_purpose=payload.account_purpose,
            pricing_region=payload.pricing_region,
        )
    except PaymentOperationsSuspended as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PipelineCreditError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _entry_response(db, entry)


@router.post("/debit", status_code=status.HTTP_201_CREATED)
def pipeline_credit_debit(
    payload: PipelineCreditDebitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_admin(current_user)
    try:
        require_payment_operations_enabled()
        entry = debit_pipeline_credits(
            db,
            account_id=payload.account_id,
            owner_type=payload.owner_type,
            owner_user_id=payload.owner_user_id,
            clan_id=payload.clan_id,
            sponsor_ref=payload.sponsor_ref,
            amount=payload.amount,
            workflow_key=payload.workflow_key,
            provider_key=payload.provider_key,
            idempotency_key=payload.idempotency_key,
            reference_type=payload.reference_type,
            reference_id=payload.reference_id,
            note=payload.note,
            created_by_user_id=int(current_user.id),
            meta=payload.meta,
            account_purpose=payload.account_purpose,
        )
    except PaymentOperationsSuspended as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InsufficientPipelineCreditError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PipelineCreditError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _entry_response(db, entry)


@router.get("/admin/pricing-catalogue")
def pipeline_credit_admin_pricing_catalogue(
    region_code: str = Query(default="global", max_length=32),
    currency: str = Query(default="GBP", max_length=8),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_admin(current_user)
    return pricing_catalogue(db, region_code=region_code, currency=currency)


@router.put("/admin/pricing-policy")
def pipeline_credit_admin_set_pricing_policy(
    payload: PipelineCreditPricingPolicyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_admin(current_user)
    try:
        set_pricing_policy(
            db,
            region_code=payload.region_code,
            currency=payload.currency,
            credits_per_currency_unit=payload.credits_per_currency_unit,
            actor_user_id=int(current_user.id),
        )
    except PipelineCreditCommerceError as exc:
        db.rollback()
        _raise_commerce_error(exc)
    return pricing_catalogue(db, region_code=payload.region_code, currency=payload.currency)


@router.put("/admin/service-prices/{service_code:path}")
def pipeline_credit_admin_set_service_price(
    service_code: str,
    payload: PipelineCreditServicePriceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_admin(current_user)
    try:
        set_service_price(
            db,
            service_code=service_code,
            region_code=payload.region_code,
            pricing_mode=payload.pricing_mode,
            credit_cost=payload.credit_cost,
            cash_reference_amount=payload.cash_reference_amount,
            cash_reference_currency=payload.cash_reference_currency,
            duration_days=payload.duration_days,
            unit_label=payload.unit_label,
            actor_user_id=int(current_user.id),
        )
    except PipelineCreditCommerceError as exc:
        db.rollback()
        _raise_commerce_error(exc)
    return pricing_catalogue(
        db,
        region_code=payload.region_code,
        currency=payload.cash_reference_currency,
    )


@router.get("/service-catalogue")
def pipeline_credit_service_catalogue(
    region_code: str = Query(default="global", max_length=32),
    currency: str = Query(default="GBP", max_length=8),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _ = current_user
    return pricing_catalogue(db, region_code=region_code, currency=currency)


@router.get("/me-service-balance")
def pipeline_credit_me_service_balance(
    region_code: str = Query(default="global", max_length=32),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return customer_credit_status(db, user_id=int(current_user.id), region_code=region_code)


@router.post("/service-quotes", status_code=status.HTTP_201_CREATED)
def pipeline_credit_create_service_quote(
    payload: PipelineCreditServiceQuoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        quote = issue_service_quote(
            db,
            actor_user_id=int(current_user.id),
            service_code=payload.service_code,
            quantity=int(payload.quantity),
            region_code=payload.region_code,
            context=payload.context,
            idempotency_key=payload.idempotency_key,
        )
    except PipelineCreditCommerceError as exc:
        db.rollback()
        _raise_commerce_error(exc)
    return {"ok": True, "quote": quote_out(db, quote)}


@router.post("/service-spends", status_code=status.HTTP_201_CREATED)
def pipeline_credit_create_service_spend(
    payload: PipelineCreditServiceSpendIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    try:
        require_payment_operations_enabled()
        order = spend_service_quote(
            db,
            actor_user_id=int(current_user.id),
            quote_key=payload.quote_key,
            idempotency_key=payload.idempotency_key,
        )
    except PaymentOperationsSuspended as exc:
        raise HTTPException(
            status_code=409,
            detail={"code": "payment_operations_suspended", "message": str(exc)},
        ) from exc
    except PipelineCreditCommerceError as exc:
        db.rollback()
        _raise_commerce_error(exc)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail={"code": "delivery_unavailable", "message": str(exc)}) from exc
    return {"ok": True, "spend": spend_out(db, order)}
