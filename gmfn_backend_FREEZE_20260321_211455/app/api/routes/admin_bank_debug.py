# app/api/routes/admin_bank_debug.py
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.db.bank_models import BankEvent, ExpectedPayment

router = APIRouter(prefix="/admin/bank", tags=["admin"])


def _admin_only(current_user: User) -> None:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/bank-events/recent")
def admin_bank_events_recent(
    clan_id: int,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _admin_only(current_user)
    lim = max(1, min(int(limit or 50), 200))

    q = db.query(BankEvent).filter(BankEvent.clan_id == int(clan_id))
    if status:
        q = q.filter(BankEvent.status == status)

    rows = q.order_by(BankEvent.id.desc()).limit(lim).all()
    items = [
        {
            "id": r.id,
            "clan_id": r.clan_id,
            "source_type": r.source_type,
            "direction": r.direction,
            "amount": str(r.amount),
            "currency": r.currency,
            "reference_normalized": r.reference_normalized,
            "status": r.status,
            "status_reason": r.status_reason,
            "expected_payment_id": r.expected_payment_id,
            "canonical": bool(r.canonical),
            "created_at": r.ingested_at,
        }
        for r in rows
    ]
    return {"items": items, "total": len(items)}


@router.get("/expected-payments/recent")
def admin_expected_payments_recent(
    clan_id: int,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _admin_only(current_user)
    lim = max(1, min(int(limit or 50), 200))

    q = db.query(ExpectedPayment).filter(ExpectedPayment.clan_id == int(clan_id))
    if status:
        q = q.filter(ExpectedPayment.status == status)

    rows = q.order_by(ExpectedPayment.id.desc()).limit(lim).all()
    items = [
        {
            "id": r.id,
            "clan_id": r.clan_id,
            "user_id": r.user_id,
            "expected_type": r.expected_type,
            "amount": str(r.amount),
            "currency": r.currency,
            "reference_display": r.reference_display,
            "reference_normalized": r.reference_normalized,
            "status": r.status,
            "status_reason": r.status_reason,
            "bank_event_id": r.bank_event_id,
            "created_at": r.created_at,
        }
        for r in rows
    ]
    return {"items": items, "total": len(items)}