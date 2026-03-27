# app/api/routes/repayment_claims.py
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, Loan, TrustEvent
from app.schemas.repayment_claims import RepaymentClaimCreate
from app.services.trust_events_services import log_trust_event

router = APIRouter(tags=["repayments"])


EV_REPAYMENT_CLAIMED = "repayment.claimed"


def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False) is True:
        return True
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


def _require_admin(user: Any) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _row_to_dict(r: TrustEvent) -> Dict[str, Any]:
    return {
        "id": getattr(r, "id", None),
        "event_type": getattr(r, "event_type", None),
        "clan_id": getattr(r, "clan_id", None),
        "loan_id": getattr(r, "loan_id", None),
        "actor_user_id": getattr(r, "actor_user_id", None),
        "subject_user_id": getattr(r, "subject_user_id", None),
        "created_at": getattr(r, "created_at", None).isoformat() if getattr(r, "created_at", None) else None,
        "meta_json": getattr(r, "meta_json", None),
    }


@router.post("/loans/{loan_id}/repayment-claim")
def create_repayment_claim(
    loan_id: int,
    payload: RepaymentClaimCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Borrower submits: "I have paid" (manual transfer MVP).
    - Logs an append-only TrustEvent with payment reference + note.
    - Does NOT create a Repayment.
    - Admin will confirm later via /admin/repayments/loans/{loan_id}/confirm
    """
    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if int(getattr(loan, "borrower_user_id")) != int(current_user.id):
        raise HTTPException(status_code=403, detail="Not your loan")

    st = str(getattr(loan, "status", "") or "").lower()
    if st in ("cancelled", "canceled", "declined", "rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot claim repayment for a {st} loan")

    # Prevent spam duplicates: one claim per loan per user (simple MVP rule)
    existing = (
        db.query(TrustEvent)
        .filter(TrustEvent.event_type == EV_REPAYMENT_CLAIMED)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.subject_user_id == int(current_user.id))
        .first()
    )
    if existing:
        return {
            "ok": True,
            "already_claimed": True,
            "loan_id": int(loan_id),
            "payment_reference": payload.payment_reference,
            "note": payload.note,
            "message": "Repayment claim already recorded.",
        }

    log_trust_event(
        db,
        event_type=EV_REPAYMENT_CLAIMED,
        clan_id=int(getattr(loan, "clan_id")),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "repayment_claimed",
            "payment_reference": payload.payment_reference,
            "note": payload.note,
        },
    )

    return {
        "ok": True,
        "loan_id": int(loan_id),
        "payment_reference": payload.payment_reference,
        "note": payload.note,
        "mode": "borrower_claim_mvp",
    }


@router.get("/admin/repayments/claims")
def list_repayment_claims_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50,
) -> Dict[str, Any]:
    """
    Admin-only: list recent repayment claims awaiting confirmation.
    """
    _require_admin(current_user)
    limit = max(1, min(int(limit), 200))

    rows: List[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.event_type == EV_REPAYMENT_CLAIMED)
        .order_by(TrustEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    return {"items": [_row_to_dict(r) for r in rows], "total": len(rows)}