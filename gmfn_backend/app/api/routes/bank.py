from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db
from app.db.bank_models import BankEvent
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
    """

    if direction not in {"credit", "debit"}:
        raise HTTPException(status_code=400, detail="direction must be 'credit' or 'debit'")

    event = create_bank_event(
        db=db,
        clan_id=clan_id,
        source_type="manual_api",
        direction=direction,
        amount=amount,
        currency=currency,
        reference_raw=reference,
        description_raw=description,
    )

    return {
        "bank_event_id": event.id,
        "status": event.status,
        "reference": event.reference_normalized,
    }


@router.post("/reconcile")
def run_reconciliation(
    limit: int = 200,
    db: Session = Depends(get_db),
):
    """
    Manually trigger reconciliation batch.
    """

    result = reconcile_batch(db=db, limit=limit)
    return result


@router.get("/recent")
def list_recent_bank_events(
    clan_id: int,
    db: Session = Depends(get_db),
):
    events = (
        db.query(BankEvent)
        .filter(BankEvent.clan_id == clan_id)
        .order_by(BankEvent.id.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": e.id,
            "direction": e.direction,
            "amount": str(e.amount),
            "status": e.status,
            "reference": e.reference_normalized,
            "match_key": e.match_key,
            "canonical": e.canonical,
        }
        for e in events
    ]