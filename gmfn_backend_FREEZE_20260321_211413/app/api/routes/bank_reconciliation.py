# app/api/routes/bank_reconciliation.py
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


# -----------------------------
# Schemas
# -----------------------------
class BankEventIn(BaseModel):
    clan_id: int
    source_type: str = Field(..., description="statement_csv|webhook_api|email_alert|sms_alert")
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
    expected_type: str = Field(..., description="contribution|repayment|payout(later)")
    amount: str = Field(..., description="Decimal as string")
    currency: str = Field(..., description="e.g. NGN, GBP")
    due_at: Optional[datetime] = None

    # reference standard
    reference_display: str = Field(..., description="What member must put in bank reference")
    reference_normalized: str = Field(..., description="Normalized reference (usually derived)")

    meta: Optional[Dict[str, Any]] = None


class ExpectedPaymentOut(BaseModel):
    id: int
    clan_id: int
    user_id: int
    expected_type: str

    amount: str
    currency: str
    due_at: Optional[str]

    reference_display: str
    reference_normalized: str

    status: str
    status_reason: Optional[str]

    bank_event_id: Optional[int]
    trust_event_id: Optional[int]
    created_at: str


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
    # Minimal MVP guard: must be authenticated. (Clan membership enforcement can be layered later.)
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
        id=row.id,
        clan_id=row.clan_id,
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
                id=r.id,
                clan_id=r.clan_id,
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
def create_expected_payment(
    payload: ExpectedPaymentIn,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    try:
        amt = Decimal(str(payload.amount))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid amount")

    row = ExpectedPayment(
        clan_id=int(payload.clan_id),
        user_id=int(payload.user_id),
        expected_type=payload.expected_type,
        amount=amt,
        currency=(payload.currency or "").upper(),
        due_at=payload.due_at,
        reference_display=payload.reference_display,
        reference_normalized=payload.reference_normalized,
        status="expected",
        status_reason=None,
        bank_event_id=None,
        trust_event_id=None,
        meta_json=(None if not payload.meta else __import__("json").dumps(payload.meta)),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return ExpectedPaymentOut(
        id=row.id,
        clan_id=row.clan_id,
        user_id=row.user_id,
        expected_type=row.expected_type,
        amount=_dstr(row.amount),
        currency=row.currency,
        due_at=_iso(row.due_at),
        reference_display=row.reference_display,
        reference_normalized=row.reference_normalized,
        status=row.status,
        status_reason=row.status_reason,
        bank_event_id=row.bank_event_id,
        trust_event_id=row.trust_event_id,
        created_at=row.created_at.isoformat(),
    )


@router.get("/expected", response_model=list[ExpectedPaymentOut])
def list_expected_payments(
    clan_id: int,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    lim = max(1, min(int(limit or 50), 200))
    q = db.query(ExpectedPayment).filter(ExpectedPayment.clan_id == int(clan_id))
    if status:
        q = q.filter(ExpectedPayment.status == status)
    rows = q.order_by(ExpectedPayment.id.desc()).limit(lim).all()

    out: list[ExpectedPaymentOut] = []
    for r in rows:
        out.append(
            ExpectedPaymentOut(
                id=r.id,
                clan_id=r.clan_id,
                user_id=r.user_id,
                expected_type=r.expected_type,
                amount=_dstr(r.amount),
                currency=r.currency,
                due_at=_iso(r.due_at),
                reference_display=r.reference_display,
                reference_normalized=r.reference_normalized,
                status=r.status,
                status_reason=r.status_reason,
                bank_event_id=r.bank_event_id,
                trust_event_id=r.trust_event_id,
                created_at=r.created_at.isoformat(),
            )
        )
    return out


@router.post("/reconcile")
def run_reconcile(
    payload: ReconcileRunIn,
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    return reconcile_batch(db, clan_id=payload.clan_id, limit=payload.limit)