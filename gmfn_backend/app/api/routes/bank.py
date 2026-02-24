# app/api/routes/bank.py
from __future__ import annotations

from decimal import Decimal
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.deps import get_db
from app.db.bank_models import BankEvent, BankCredit
from app.services.reconciliation_service import (
    create_bank_event,
    reconcile_batch,
)

router = APIRouter(prefix="/bank", tags=["bank"])


@router.post("/ingest")
def ingest_bank_event(
    clan_id: int,
    amount: Decimal,
    currency: str,
    direction: str,
    reference: Optional[str] = None,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Manual ingestion endpoint (MVP-safe).
    Simulates bank webhook or CSV import.

    Deterministic idempotency:
    - create_bank_event returns existing row if duplicate hash
    """
    if direction not in {"credit", "debit"}:
        raise HTTPException(status_code=400, detail="direction must be 'credit' or 'debit'")

    try:
        event = create_bank_event(
            db=db,
            clan_id=clan_id,
            source_type="manual_api",
            source_id=None,
            direction=direction,
            amount=amount,
            currency=currency,
            reference_raw=reference,
            description_raw=description,
            bank_txn_id=None,
            posted_at=None,
            value_at=None,
            meta=None,
        )
    except IntegrityError:
        # In practice create_bank_event already resolves duplicates, but keep deterministic semantics
        raise HTTPException(status_code=409, detail="Duplicate bank event")

    return {
        "bank_event_id": event.id,
        "status": event.status,
        "status_reason": event.status_reason,
        "reference": event.reference_normalized,
        "hash": event.hash,
    }


@router.post("/reconcile")
def run_reconciliation(
    clan_id: int,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    """
    Trigger reconciliation batch deterministically for a clan.
    """
    return reconcile_batch(db=db, clan_id=int(clan_id), limit=limit)


@router.get("/recent")
def list_recent_bank_events(
    clan_id: int,
    db: Session = Depends(get_db),
):
    events = (
        db.query(BankEvent)
        .filter(BankEvent.clan_id == int(clan_id))
        .order_by(BankEvent.id.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": e.id,
            "direction": e.direction,
            "amount": str(e.amount),
            "currency": e.currency,
            "reference": e.reference_normalized,
            "status": e.status,
            "status_reason": e.status_reason,
            "expected_payment_id": e.expected_payment_id,
            "canonical": bool(e.canonical),
        }
        for e in events
    ]


@router.get("/unmatched")
def list_unmatched_bank_events(
    clan_id: int,
    db: Session = Depends(get_db),
):
    """
    Deterministic "unmatched queue" visibility.
    No human resolution here — just transparency.
    """
    rows = (
        db.query(BankEvent)
        .filter(BankEvent.clan_id == int(clan_id))
        .filter(BankEvent.status.in_(["pending_match", "mismatch_flagged"]))
        .order_by(BankEvent.id.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": r.id,
            "amount": str(r.amount),
            "currency": r.currency,
            "direction": r.direction,
            "reference": r.reference_normalized,
            "status": r.status,
            "status_reason": r.status_reason,
            "hash": r.hash,
        }
        for r in rows
    ]


@router.get("/credits")
def list_credits(
    clan_id: int,
    user_id: Optional[int] = None,
    currency: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Overpayment credits store.
    """
    q = db.query(BankCredit).filter(BankCredit.clan_id == int(clan_id))
    if user_id is not None:
        q = q.filter(BankCredit.user_id == int(user_id))
    if currency:
        q = q.filter(BankCredit.currency == currency.strip().upper())

    rows = q.order_by(BankCredit.id.asc()).limit(500).all()
    return [
        {
            "id": r.id,
            "clan_id": r.clan_id,
            "user_id": r.user_id,
            "currency": r.currency,
            "amount": str(r.amount),
            "source_bank_event_id": r.source_bank_event_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]