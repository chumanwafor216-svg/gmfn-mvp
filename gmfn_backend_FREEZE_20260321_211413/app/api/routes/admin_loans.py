# app/api/routes/admin_loans.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import Loan, LoanGuarantor, User

router = APIRouter(prefix="/admin/loans", tags=["admin"])


def _require_admin(u: User) -> None:
    if (getattr(u, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


def _effective_clan_id(clan_id_query: int | None, x_clan_id: int | None) -> int:
    cid = clan_id_query if clan_id_query is not None else x_clan_id
    if cid is None:
        raise HTTPException(status_code=422, detail="clan_id required (query or X-Clan-Id header)")
    return int(cid)


@router.get("/incomplete")
def list_incomplete_loans(
    clan_id: int | None = Query(default=None),
    x_clan_id: int | None = Header(default=None, alias="X-Clan-Id"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Screenshot-ready admin queue:
      - Incomplete loans
      - Seconds remaining until auto-cancel (based on decision_at marker)
      - Approved vs required count
      - Locked coverage vs required gap (if available)
    """
    _require_admin(current_user)
    cid = _effective_clan_id(clan_id, x_clan_id)

    now = datetime.now(timezone.utc)

    loans = (
        db.query(Loan)
        .filter(Loan.clan_id == cid)
        .filter(func.lower(Loan.status) == "incomplete")
        .order_by(Loan.id.desc())
        .limit(int(limit))
        .all()
    )

    items: list[dict[str, Any]] = []
    for loan in loans:
        approved = (
            db.query(func.count(LoanGuarantor.id))
            .filter(LoanGuarantor.loan_id == loan.id)
            .filter(func.lower(LoanGuarantor.status) == "approved")
            .scalar()
            or 0
        )
        pending = (
            db.query(func.count(LoanGuarantor.id))
            .filter(LoanGuarantor.loan_id == loan.id)
            .filter(func.lower(LoanGuarantor.status) == "pending")
            .scalar()
            or 0
        )
        locked_coverage = (
            db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0))
            .filter(LoanGuarantor.loan_id == loan.id)
            .filter(func.lower(LoanGuarantor.status) == "approved")
            .scalar()
            or 0
        )

        required_gap = getattr(loan, "guarantee_gap", None)
        required_gap = float(required_gap) if required_gap is not None else 0.0

        decision_at = getattr(loan, "decision_at", None)
        remaining_seconds = None
        if decision_at:
            elapsed = (now - decision_at).total_seconds()
            remaining_seconds = int(max(0, 120 - elapsed))

        items.append(
            {
                "loan_id": int(loan.id),
                "borrower_user_id": int(loan.borrower_user_id),
                "amount": float(getattr(loan, "amount", 0) or 0),
                "currency": getattr(loan, "currency", "NGN"),
                "status": loan.status,
                "decision_at": decision_at.isoformat() if decision_at else None,
                "auto_cancel_remaining_seconds": remaining_seconds,
                "guarantors_required": int(getattr(loan, "guarantors_required", 0) or 0),
                "approved_guarantors": int(approved),
                "pending_guarantors": int(pending),
                "locked_coverage": float(locked_coverage),
                "required_gap": float(required_gap),
            }
        )

    return {"clan_id": cid, "items": items, "total": len(items)}


@router.get("/locks")
def list_active_locks(
    clan_id: int | None = Query(default=None),
    x_clan_id: int | None = Header(default=None, alias="X-Clan-Id"),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Active locked holds (approved guarantees) for the clan.
    Useful for admin risk monitoring.
    """
    _require_admin(current_user)
    cid = _effective_clan_id(clan_id, x_clan_id)

    rows = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.clan_id == cid)
        .filter(func.lower(LoanGuarantor.status) == "approved")
        .filter(func.coalesce(LoanGuarantor.locked_amount, 0) > 0)
        .order_by(LoanGuarantor.id.desc())
        .limit(int(limit))
        .all()
    )

    items = []
    for g in rows:
        items.append(
            {
                "id": int(g.id),
                "loan_id": int(g.loan_id),
                "guarantor_user_id": int(g.guarantor_user_id),
                "status": g.status,
                "locked_amount": float(getattr(g, "locked_amount", 0) or 0),
                "released_amount": float(getattr(g, "released_amount", 0) or 0),
                "is_locked": bool(getattr(g, "is_locked", False)),
                "responded_at": getattr(g, "responded_at", None).isoformat() if getattr(g, "responded_at", None) else None,
            }
        )

    return {"clan_id": cid, "items": items, "total": len(items)}