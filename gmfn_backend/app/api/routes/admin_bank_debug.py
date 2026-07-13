# app/api/routes/admin_bank_debug.py
from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.db.bank_models import BankEvent, ExpectedPayment

router = APIRouter(prefix="/admin/bank", tags=["admin"])


def _safe_meta_json(raw: Optional[str]) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _admin_only(current_user: User) -> None:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/bank-events/recent")
def admin_bank_events_recent(
    clan_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _admin_only(current_user)

    q = db.query(BankEvent).filter(BankEvent.clan_id == int(clan_id))
    if status:
        q = q.filter(BankEvent.status == status)

    rows = q.order_by(BankEvent.id.desc()).limit(int(limit)).all()
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
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _admin_only(current_user)

    q = db.query(ExpectedPayment).filter(ExpectedPayment.clan_id == int(clan_id))
    if status:
        q = q.filter(ExpectedPayment.status == status)

    rows = q.order_by(ExpectedPayment.id.desc()).limit(int(limit)).all()
    items = []
    for r in rows:
        meta = _safe_meta_json(getattr(r, "meta_json", None))
        latest_proof = meta.get("latest_payment_proof")
        if not isinstance(latest_proof, dict):
            latest_proof = {}

        items.append(
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
                "meta": meta,
                "meta_json": meta,
                "proof_status": meta.get("proof_status"),
                "proof_status_text": meta.get("proof_status_text"),
                "proof_filename": latest_proof.get("original_filename")
                or latest_proof.get("stored_filename"),
                "proof_submitted_at": latest_proof.get("submitted_at")
                or meta.get("proof_submitted_at"),
            }
        )
    return {"items": items, "total": len(items)}
