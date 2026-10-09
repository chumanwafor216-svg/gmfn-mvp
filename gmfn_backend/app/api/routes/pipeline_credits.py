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

router = APIRouter(prefix="/pipeline-credits", tags=["pipeline-credits"])


class PipelineCreditAccountSelector(BaseModel):
    account_id: Optional[int] = Field(default=None, ge=1)
    owner_type: Optional[str] = Field(default=None, max_length=32)
    owner_user_id: Optional[int] = Field(default=None, ge=1)
    clan_id: Optional[int] = Field(default=None, ge=1)
    sponsor_ref: Optional[str] = Field(default=None, max_length=96)

    @field_validator("owner_type", "sponsor_ref", mode="before")
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
        )
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
        )
    except InsufficientPipelineCreditError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except PipelineCreditError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _entry_response(db, entry)
