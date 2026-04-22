from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.deps import get_db
from app.db.bank_models import BankCredit, BankEvent, ExpectedPayment
from app.db.models import Loan
from app.services.bank_webhook_service import (
    parse_generic_webhook_payload,
    parse_provider_webhook_payload,
    verify_webhook_signature,
    webhook_secret_is_configured,
)
from app.services.expected_payments_service import (
    build_loan_repayment_reference,
    ensure_loan_repayment_expected_payment,
    ensure_pool_deposit_expected_payment,
    list_expected_payments,
)
from app.services.pool_service import build_reference
from app.services.reconciliation_service import (
    create_bank_event,
    reconcile_batch,
    reconcile_one_event,
)

router = APIRouter(prefix="/bank", tags=["bank"])


def _require_admin(clan_ctx: tuple) -> tuple:
    clan, membership, current_user = clan_ctx
    is_platform_admin = (getattr(current_user, "role", "") or "").lower() == "admin"
    is_clan_admin = (getattr(membership, "role", "") or "").lower() == "admin"

    if not (is_platform_admin or is_clan_admin):
        raise HTTPException(status_code=403, detail="Admin only")

    return clan, membership, current_user


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _expected_out(row: ExpectedPayment) -> Dict[str, Any]:
    return {
        "id": int(row.id),
        "clan_id": int(row.clan_id),
        "user_id": int(row.user_id),
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
    }


class BankIngestIn(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0"))
    currency: str = Field(default="NGN", min_length=3, max_length=8)
    direction: str = Field(...)
    reference: Optional[str] = None
    description: Optional[str] = None


class ExpectedPoolDepositIn(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0"))
    currency: str = Field(default="NGN", min_length=3, max_length=8)
    reference_display: Optional[str] = None
    due_at: Optional[datetime] = None


class ExpectedLoanRepaymentIn(BaseModel):
    loan_id: int = Field(..., gt=0)
    amount: Optional[Decimal] = Field(default=None, gt=Decimal("0"))
    currency: Optional[str] = Field(default=None, min_length=3, max_length=8)
    due_at: Optional[datetime] = None


def _bank_event_out(e: BankEvent) -> Dict[str, Any]:
    return {
        "id": int(e.id),
        "direction": e.direction,
        "amount": str(e.amount),
        "currency": e.currency,
        "reference_raw": e.reference_raw,
        "reference": e.reference_normalized,
        "status": e.status,
        "status_reason": e.status_reason,
        "expected_payment_id": e.expected_payment_id,
        "canonical": bool(e.canonical),
        "confidence": int(e.confidence or 0),
        "source_type": e.source_type,
        "source_id": e.source_id,
        "bank_txn_id": e.bank_txn_id,
        "posted_at": _iso(e.posted_at),
        "value_at": _iso(e.value_at),
        "ingested_at": _iso(e.ingested_at),
        "hash": e.hash,
    }


def _ingest_and_reconcile_one(
    db: Session,
    *,
    clan_id: int,
    source_type: str,
    source_id: Optional[str],
    direction: str,
    amount: Decimal,
    currency: str,
    reference_raw: Optional[str],
    description_raw: Optional[str],
    bank_txn_id: Optional[str],
    posted_at: Optional[datetime],
    value_at: Optional[datetime],
    meta: Optional[Dict[str, Any]],
    confirm_non_canonical: bool = True,
    canonical_only_match: bool = False,
) -> Dict[str, Any]:
    event = create_bank_event(
        db=db,
        clan_id=int(clan_id),
        source_type=source_type,
        source_id=source_id,
        direction=direction,
        amount=amount,
        currency=currency,
        reference_raw=reference_raw,
        description_raw=description_raw,
        bank_txn_id=bank_txn_id,
        posted_at=posted_at,
        value_at=value_at,
        meta=meta,
    )

    out = reconcile_one_event(
        db,
        be=event,
        confirm_non_canonical=bool(confirm_non_canonical),
        canonical_only_match=bool(canonical_only_match),
        dry_run=False,
    )

    return {
        "ok": True,
        "event": _bank_event_out(out),
    }


@router.post("/ingest")
def ingest_bank_event(
    payload: BankIngestIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    """
    Manual admin ingestion endpoint (pilot-safe).
    """
    clan, _membership, _current_user = _require_admin(clan_ctx)

    direction = (payload.direction or "").strip().lower()
    if direction not in {"credit", "debit"}:
        raise HTTPException(status_code=400, detail="direction must be 'credit' or 'debit'")

    try:
        event = create_bank_event(
            db=db,
            clan_id=int(clan.id),
            source_type="manual_api",
            source_id=None,
            direction=direction,
            amount=payload.amount,
            currency=payload.currency,
            reference_raw=payload.reference,
            description_raw=payload.description,
            bank_txn_id=None,
            posted_at=None,
            value_at=None,
            meta=None,
        )
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Duplicate bank event")

    return {
        "bank_event_id": int(event.id),
        "status": event.status,
        "status_reason": event.status_reason,
        "reference": event.reference_normalized,
        "hash": event.hash,
    }


@router.post("/webhook")
async def generic_bank_webhook(
    request: Request,
    payload: Dict[str, Any] = Body(...),
    x_gmfn_signature: Optional[str] = Header(default=None, alias="X-GMFN-Signature"),
    db: Session = Depends(get_db),
):
    """
    Generic automated webhook intake.

    Expected payload shape (minimum):
    {
      "clan_id": 15,
      "amount": "1000.00",
      "currency": "NGN",
      "direction": "credit",
      "reference": "GMFN-POOL-CLAN-15-U42-...",
      "description": "optional",
      "provider_event_id": "abc123",
      "bank_txn_id": "txn_456"
    }

    Behavior:
    - verifies signature if GMFN_WEBHOOK_SECRET is configured
    - ingests as canonical webhook_api source
    - auto-runs reconcile_one_event immediately
    """
    raw_body = await request.body()
    if not verify_webhook_signature(raw_body=raw_body, provided_signature=x_gmfn_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        parsed = parse_generic_webhook_payload(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return _ingest_and_reconcile_one(
        db,
        clan_id=int(parsed["clan_id"]),
        source_type="webhook_api",
        source_id=parsed.get("source_id"),
        direction=str(parsed["direction"]),
        amount=parsed["amount"],
        currency=str(parsed["currency"]),
        reference_raw=parsed.get("reference_raw"),
        description_raw=parsed.get("description_raw"),
        bank_txn_id=parsed.get("bank_txn_id"),
        posted_at=parsed.get("posted_at"),
        value_at=parsed.get("value_at"),
        meta=parsed.get("meta"),
        confirm_non_canonical=True,
        canonical_only_match=False,
    )


@router.post("/webhook/{provider}")
async def provider_bank_webhook(
    provider: str,
    request: Request,
    payload: Dict[str, Any] = Body(...),
    x_gmfn_signature: Optional[str] = Header(default=None, alias="X-GMFN-Signature"),
    db: Session = Depends(get_db),
):
    """
    Provider-named webhook intake.

    Examples:
    - /bank/webhook/paystack
    - /bank/webhook/flutterwave
    - /bank/webhook/stripe
    - /bank/webhook/monnify

    For MVP this still uses generic field mapping, but the route identity
    allows provider-specific evolution later without changing architecture.
    """
    raw_body = await request.body()
    if not verify_webhook_signature(raw_body=raw_body, provided_signature=x_gmfn_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        parsed = parse_provider_webhook_payload(provider, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return _ingest_and_reconcile_one(
        db,
        clan_id=int(parsed["clan_id"]),
        source_type="webhook_api",
        source_id=parsed.get("source_id"),
        direction=str(parsed["direction"]),
        amount=parsed["amount"],
        currency=str(parsed["currency"]),
        reference_raw=parsed.get("reference_raw"),
        description_raw=parsed.get("description_raw"),
        bank_txn_id=parsed.get("bank_txn_id"),
        posted_at=parsed.get("posted_at"),
        value_at=parsed.get("value_at"),
        meta=parsed.get("meta"),
        confirm_non_canonical=True,
        canonical_only_match=False,
    )


@router.get("/webhook/status")
def bank_webhook_status():
    """
    Basic operational visibility for whether HMAC verification is enforced.
    """
    return {
        "ok": True,
        "signature_verification_enabled": bool(webhook_secret_is_configured()),
    }


@router.post("/reconcile")
def run_reconciliation(
    limit: int = Query(200, ge=1, le=2000),
    confirm_non_canonical: bool = Query(True),
    canonical_only_match: bool = Query(False),
    dry_run: bool = Query(False),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_admin(clan_ctx)

    return reconcile_batch(
        db=db,
        clan_id=int(clan.id),
        limit=int(limit),
        confirm_non_canonical=bool(confirm_non_canonical),
        canonical_only_match=bool(canonical_only_match),
        dry_run=bool(dry_run),
    )


@router.get("/recent")
def list_recent_bank_events(
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_admin(clan_ctx)

    events = (
        db.query(BankEvent)
        .filter(BankEvent.clan_id == int(clan.id))
        .order_by(BankEvent.id.desc())
        .limit(int(limit))
        .all()
    )

    return {"items": [_bank_event_out(e) for e in events], "total": len(events)}


@router.get("/unmatched")
def list_unmatched_bank_events(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_admin(clan_ctx)

    rows = (
        db.query(BankEvent)
        .filter(BankEvent.clan_id == int(clan.id))
        .filter(BankEvent.status.in_(["pending_match", "mismatch_flagged"]))
        .order_by(BankEvent.id.desc())
        .limit(int(limit))
        .all()
    )

    return {"items": [_bank_event_out(r) for r in rows], "total": len(rows)}


@router.get("/credits")
def list_credits(
    user_id: Optional[int] = Query(default=None, ge=1),
    currency: Optional[str] = Query(default=None),
    limit: int = Query(500, ge=1, le=1000),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_admin(clan_ctx)

    q = db.query(BankCredit).filter(BankCredit.clan_id == int(clan.id))

    if user_id is not None:
        q = q.filter(BankCredit.user_id == int(user_id))

    if currency:
        q = q.filter(BankCredit.currency == currency.strip().upper())

    rows = q.order_by(BankCredit.id.asc()).limit(int(limit)).all()

    return {
        "items": [
            {
                "id": int(r.id),
                "clan_id": int(r.clan_id),
                "user_id": int(r.user_id),
                "currency": r.currency,
                "amount": str(r.amount),
                "source_bank_event_id": int(r.source_bank_event_id),
                "created_at": _iso(r.created_at),
            }
            for r in rows
        ],
        "total": len(rows),
    }


@router.get("/expected")
def list_expected(
    user_id: Optional[int] = Query(default=None, ge=1),
    expected_type: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    currency: Optional[str] = Query(default=None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_admin(clan_ctx)

    rows = list_expected_payments(
        db,
        clan_id=int(clan.id),
        user_id=int(user_id) if user_id is not None else None,
        expected_type=expected_type,
        status=status,
        currency=currency,
        limit=int(limit),
    )

    return {"items": [_expected_out(x) for x in rows], "total": len(rows)}


@router.post("/expected/pool-deposit")
def create_expected_pool_deposit(
    payload: ExpectedPoolDepositIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, current_user = clan_ctx

    reference_display = (
        payload.reference_display.strip()
        if payload.reference_display and payload.reference_display.strip()
        else (
            f"{build_reference(int(clan.id), int(current_user.id))}-POOL-"
            f"{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        )
    )

    row = ensure_pool_deposit_expected_payment(
        db,
        clan_id=int(clan.id),
        user_id=int(current_user.id),
        amount=payload.amount,
        currency=payload.currency,
        reference_display=reference_display,
        due_at=payload.due_at,
        meta={"source": "bank.expected.pool-deposit"},
        commit=True,
        refresh=True,
    )

    return {"ok": True, "item": _expected_out(row)}


@router.post("/expected/loan-repayment")
def create_expected_loan_repayment(
    payload: ExpectedLoanRepaymentIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    loan = db.get(Loan, int(payload.loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(getattr(loan, "clan_id", 0) or 0) != int(clan.id):
        raise HTTPException(status_code=403, detail="Loan not in selected clan")

    is_platform_admin = (getattr(current_user, "role", "") or "").lower() == "admin"
    is_clan_admin = (getattr(membership, "role", "") or "").lower() == "admin"
    is_borrower = int(getattr(loan, "borrower_user_id", 0) or 0) == int(current_user.id)

    if not (is_platform_admin or is_clan_admin or is_borrower):
        raise HTTPException(status_code=403, detail="Only borrower or admin can create repayment expectation")

    remaining_amount = Decimal(str(getattr(loan, "remaining_amount", 0) or 0))
    if remaining_amount <= Decimal("0"):
        amount = Decimal(str(getattr(loan, "amount", 0) or 0)) - Decimal(str(getattr(loan, "paid_total", 0) or 0))
        if amount < Decimal("0"):
            amount = Decimal("0")
    else:
        amount = remaining_amount

    if payload.amount is not None:
        requested = Decimal(str(payload.amount))
        if requested <= Decimal("0"):
            raise HTTPException(status_code=400, detail="amount must be > 0")
        if amount > Decimal("0") and requested > amount:
            amount = amount
        else:
            amount = requested

    if amount <= Decimal("0"):
        raise HTTPException(status_code=400, detail="No outstanding repayment amount")

    currency = payload.currency or getattr(loan, "currency", None) or "NGN"

    row = ensure_loan_repayment_expected_payment(
        db,
        clan_id=int(clan.id),
        loan_id=int(loan.id),
        borrower_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
        amount=amount,
        currency=str(currency),
        due_at=payload.due_at,
        meta={
            "source": "bank.expected.loan-repayment",
            "reference_preview": build_loan_repayment_reference(
                loan_id=int(loan.id),
                borrower_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
            ),
        },
        commit=True,
        refresh=True,
    )

    return {"ok": True, "item": _expected_out(row)}
