from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.deps import get_db
from app.core.auth import get_current_user

from app.db.bank_models import BankEvent, ExpectedPayment
from app.services.expected_payments_service import (
    create_expected_payment as create_expected_payment_row,
    get_expected_payment_by_id,
    list_expected_payments as list_expected_payment_rows,
)
from app.services.reconciliation_service import create_bank_event, reconcile_batch

router = APIRouter(prefix="/bank", tags=["bank"])


# -----------------------------
# Helpers
# -----------------------------
def _dstr(x: Any) -> str:
    if x is None:
        return "0"
    if isinstance(x, Decimal):
        return str(x)
    return str(x)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _expected_payment_out(row: ExpectedPayment) -> Dict[str, Any]:
    return {
        "id": int(row.id),
        "clan_id": int(row.clan_id),
        "user_id": int(row.user_id),
        "expected_type": row.expected_type,
        "amount": _dstr(row.amount),
        "currency": row.currency,
        "paid_amount": _dstr(getattr(row, "paid_amount", None)),
        "remaining_amount": _dstr(getattr(row, "remaining_amount", None)),
        "due_at": _iso(getattr(row, "due_at", None)),
        "reference_display": row.reference_display,
        "reference_normalized": row.reference_normalized,
        "status": row.status,
        "status_reason": row.status_reason,
        "bank_event_id": getattr(row, "bank_event_id", None),
        "trust_event_id": getattr(row, "trust_event_id", None),
        "created_at": _iso(getattr(row, "created_at", None)),
    }


# -----------------------------
# Schemas
# -----------------------------
class BankEventIn(BaseModel):
    clan_id: int
    source_type: str = Field(
        ...,
        description="statement_csv|webhook_api|email_alert|sms_alert|manual_api",
    )
    source_id: Optional[str] = None

    direction: str = Field(..., description="credit|debit")
    amount: str = Field(..., description="Decimal as string, e.g. '250.00'")
    currency: str = Field(..., description="e.g. 'NGN', 'GBP'")

    reference_raw: Optional[str] = None
    description_raw: Optional[str] = None

    bank_txn_id: Optional[str] = None
    posted_at: Optional[datetime] = None
    value_at: Optional[datetime] = None

    meta: Optional[Dict[str, Any]] = None


class BankEventOut(BaseModel):
    id: int
    clan_id: int
    source_type: str
    ingested_at: str

    direction: str
    amount: str
    currency: str

    reference_raw: Optional[str]
    reference_normalized: Optional[str]

    status: str
    status_reason: Optional[str]
    confidence: int
    canonical: bool

    expected_payment_id: Optional[int]
    hash: str


class ExpectedPaymentIn(BaseModel):
    clan_id: int
    user_id: int
    expected_type: str = Field(
        ...,
        description=(
            "contribution|repayment|vault_subscription|"
            "merchant_verify_subscription|spotlight_subscription|other"
        ),
    )
    amount: str = Field(..., description="Decimal as string")
    currency: str = Field(..., description="e.g. NGN, GBP")
    due_at: Optional[datetime] = None

    # Canonical input is reference_display.
    # reference_normalized is accepted for backward compatibility but ignored;
    # normalization must happen server-side.
    reference_display: str = Field(
        ...,
        description="What the member / payer must put in the bank reference",
    )
    reference_normalized: Optional[str] = Field(
        default=None,
        description="Accepted for backward compatibility; server computes the canonical normalized reference.",
    )

    trust_event_id: Optional[int] = None
    meta: Optional[Dict[str, Any]] = None


class ExpectedPaymentOut(BaseModel):
    id: int
    clan_id: int
    user_id: int
    expected_type: str

    amount: str
    currency: str
    paid_amount: str
    remaining_amount: str
    due_at: Optional[str]

    reference_display: str
    reference_normalized: str

    status: str
    status_reason: Optional[str]

    bank_event_id: Optional[int]
    trust_event_id: Optional[int]
    created_at: Optional[str]


class ReconcileRunIn(BaseModel):
    clan_id: int
    limit: int = 200


# -----------------------------
# Routes
# -----------------------------
@router.post("/events", response_model=BankEventOut)
def ingest_bank_event(
    payload: BankEventIn,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    try:
        amt = Decimal(str(payload.amount))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid amount")

    row = create_bank_event(
        db,
        clan_id=payload.clan_id,
        source_type=payload.source_type,
        source_id=payload.source_id,
        direction=payload.direction,
        amount=amt,
        currency=payload.currency,
        reference_raw=payload.reference_raw,
        description_raw=payload.description_raw,
        bank_txn_id=payload.bank_txn_id,
        posted_at=payload.posted_at,
        value_at=payload.value_at,
        meta=payload.meta,
    )

    return BankEventOut(
        id=int(row.id),
        clan_id=int(row.clan_id),
        source_type=row.source_type,
        ingested_at=row.ingested_at.isoformat(),
        direction=row.direction,
        amount=_dstr(row.amount),
        currency=row.currency,
        reference_raw=row.reference_raw,
        reference_normalized=row.reference_normalized,
        status=row.status,
        status_reason=row.status_reason,
        confidence=int(row.confidence or 0),
        canonical=bool(row.canonical),
        expected_payment_id=row.expected_payment_id,
        hash=row.hash,
    )


@router.get("/events", response_model=list[BankEventOut])
def list_bank_events(
    clan_id: int,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    lim = max(1, min(int(limit or 50), 200))
    q = db.query(BankEvent).filter(BankEvent.clan_id == int(clan_id))
    if status:
        q = q.filter(BankEvent.status == status)
    rows = q.order_by(BankEvent.id.desc()).limit(lim).all()

    out: list[BankEventOut] = []
    for r in rows:
        out.append(
            BankEventOut(
                id=int(r.id),
                clan_id=int(r.clan_id),
                source_type=r.source_type,
                ingested_at=r.ingested_at.isoformat(),
                direction=r.direction,
                amount=_dstr(r.amount),
                currency=r.currency,
                reference_raw=r.reference_raw,
                reference_normalized=r.reference_normalized,
                status=r.status,
                status_reason=r.status_reason,
                confidence=int(r.confidence or 0),
                canonical=bool(r.canonical),
                expected_payment_id=r.expected_payment_id,
                hash=r.hash,
            )
        )
    return out


@router.post("/expected", response_model=ExpectedPaymentOut)
def create_expected_payment_route(
    payload: ExpectedPaymentIn,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    try:
        amt = Decimal(str(payload.amount))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid amount")

    try:
        row = create_expected_payment_row(
            db,
            clan_id=int(payload.clan_id),
            user_id=int(payload.user_id),
            expected_type=payload.expected_type,
            amount=amt,
            currency=payload.currency,
            reference_display=payload.reference_display,
            due_at=payload.due_at,
            trust_event_id=payload.trust_event_id,
            meta=payload.meta,
            commit=True,
            refresh=True,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return ExpectedPaymentOut(**_expected_payment_out(row))


@router.get("/expected", response_model=list[ExpectedPaymentOut])
def list_expected_payments_route(
    clan_id: int,
    limit: int = 50,
    status: Optional[str] = None,
    expected_type: Optional[str] = None,
    user_id: Optional[int] = None,
    currency: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    rows = list_expected_payment_rows(
        db,
        clan_id=int(clan_id),
        user_id=int(user_id) if user_id is not None else None,
        expected_type=expected_type,
        status=status,
        currency=currency,
        limit=max(1, min(int(limit or 50), 200)),
    )
    return [ExpectedPaymentOut(**_expected_payment_out(r)) for r in rows]


@router.get("/expected/{expected_payment_id}", response_model=ExpectedPaymentOut)
def get_expected_payment_route(
    expected_payment_id: int,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    row = get_expected_payment_by_id(
        db,
        expected_payment_id=int(expected_payment_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Expected payment not found")

    return ExpectedPaymentOut(**_expected_payment_out(row))


@router.post("/reconcile")
def run_reconcile(
    payload: ReconcileRunIn,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    return reconcile_batch(db, clan_id=payload.clan_id, limit=payload.limit)