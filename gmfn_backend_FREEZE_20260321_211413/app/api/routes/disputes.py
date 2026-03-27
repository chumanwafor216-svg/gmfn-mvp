# app/api/routes/disputes.py
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, Loan
from app.services.trust_events_services import log_trust_event

router = APIRouter(prefix="/disputes", tags=["disputes"])

EV_DISPUTE_OPENED = "dispute.opened"
EV_DISPUTE_NOTE_ADDED = "dispute.note_added"


def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False) is True:
        return True
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


@router.post("/loans/{loan_id}/open")
def open_dispute(
    loan_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    MVP dispute opener (append-only).
    - Borrower can open a dispute on their own loan.
    - Admin can open dispute on any loan.
    - Does not delete anything. Logs TrustEvent only.
    """
    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    borrower_id = int(getattr(loan, "borrower_user_id"))
    if int(current_user.id) != borrower_id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not permitted")

    note = str(payload.get("note") or "").strip()
    if len(note) < 3:
        raise HTTPException(status_code=400, detail="note is required (min 3 chars)")

    log_trust_event(
        db,
        event_type=EV_DISPUTE_OPENED,
        clan_id=int(getattr(loan, "clan_id")),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=borrower_id,
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "dispute_opened",
            "note": note,
        },
    )

    # Optional: flag loan status (best-effort; do not fail if model differs)
    try:
        setattr(loan, "status", "disputed")
        db.add(loan)
        db.commit()
        db.refresh(loan)
    except Exception:
        db.rollback()

    return {"ok": True, "loan_id": int(loan_id), "status": str(getattr(loan, "status", "")), "mode": "append_only_dispute_mvp"}


@router.post("/loans/{loan_id}/note")
def add_dispute_note(
    loan_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Append-only dispute note (no edits/deletes).
    """
    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    borrower_id = int(getattr(loan, "borrower_user_id"))
    if int(current_user.id) != borrower_id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not permitted")

    note = str(payload.get("note") or "").strip()
    if len(note) < 3:
        raise HTTPException(status_code=400, detail="note is required (min 3 chars)")

    log_trust_event(
        db,
        event_type=EV_DISPUTE_NOTE_ADDED,
        clan_id=int(getattr(loan, "clan_id")),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=borrower_id,
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "dispute_note_added",
            "note": note,
        },
    )

    return {"ok": True, "loan_id": int(loan_id)}