# app/api/routes/admin_disputes.py
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.db.models import Loan, User
from app.services.dispute_service import mark_under_review, resolve_dispute

router = APIRouter(prefix="/admin/disputes", tags=["admin"])


def _require_admin(user: User):
    if not getattr(user, "role", "").lower() == "admin":
        raise HTTPException(status_code=403, detail="Admin required")


@router.post("/{loan_id}/review")
def review_dispute(
    loan_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    note = payload.get("note")

    mark_under_review(
        db,
        loan_id=int(loan.id),
        clan_id=int(loan.clan_id),
        admin_user_id=int(current_user.id),
        subject_user_id=int(loan.borrower_user_id),
        note=note,
    )

    return {"ok": True}


@router.post("/{loan_id}/resolve")
def resolve_dispute_route(
    loan_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)

    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    outcome = str(payload.get("outcome") or "rejected")
    note = payload.get("note")

    resolve_dispute(
        db,
        loan_id=int(loan.id),
        clan_id=int(loan.clan_id),
        admin_user_id=int(current_user.id),
        subject_user_id=int(loan.borrower_user_id),
        outcome=outcome,
        note=note,
    )

    return {"ok": True, "outcome": outcome}