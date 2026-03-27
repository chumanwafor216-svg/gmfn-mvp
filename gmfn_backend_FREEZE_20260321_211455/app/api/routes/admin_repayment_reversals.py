# app/api/routes/admin_repayment_reversals.py
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, Loan, TrustEvent
from app.schemas.admin_repayment_reversal import AdminRepaymentReverseIn
from app.services.trust_events_services import log_trust_event

router = APIRouter(prefix="/admin/repayments", tags=["admin"])

EV_INFO_REPAYMENT_REVERSED = "repayment.reversed"
EV_FULL_REPAID = "loan_fully_repaid"
EV_FULL_REPAID_REV = "loan_fully_repaid_reversed"
EV_GUARANTOR_SUCCESS = "guarantor_success"
EV_GUARANTOR_SUCCESS_REV = "guarantor_success_reversed"


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


def _parse_meta(meta_json: Optional[str]) -> Dict[str, Any]:
    if not meta_json:
        return {}
    try:
        obj = json.loads(meta_json)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _exists(db: Session, *, loan_id: int, event_type: str, subject_user_id: int) -> bool:
    q = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.event_type == event_type)
        .filter(TrustEvent.subject_user_id == int(subject_user_id))
    )
    return db.query(q.exists()).scalar() is True


@router.post("/loans/{loan_id}/reverse")
def reverse_confirmed_repayment_effects(
    loan_id: int,
    payload: AdminRepaymentReverseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Append-only reversal:
    - Logs repayment.reversed (info)
    - If loan_fully_repaid exists for borrower+loan => logs loan_fully_repaid_reversed (-0.10)
    - For each guarantor_success on this loan => logs guarantor_success_reversed (-0.03) for that guarantor
    - Flags loan status as 'disputed' (string status; safe for MVP)
    """
    _require_admin(current_user)

    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    borrower_id = int(getattr(loan, "borrower_user_id"))
    clan_id = int(getattr(loan, "clan_id"))

    # 1) Info event (always)
    if not _exists(db, loan_id=int(loan_id), event_type=EV_INFO_REPAYMENT_REVERSED, subject_user_id=borrower_id):
        log_trust_event(
            db,
            event_type=EV_INFO_REPAYMENT_REVERSED,
            clan_id=clan_id,
            loan_id=int(loan_id),
            guarantor_id=None,
            actor_user_id=int(current_user.id),
            subject_user_id=borrower_id,
            meta={
                "policy": "trust_constitution_v1",
                "trust_delta": "0.00",
                "reason": "repayment_reversed",
                "note": payload.note,
                "payment_reference": payload.payment_reference,
            },
        )

    # 2) Reverse borrower full repay trust delta if it was awarded
    borrower_full = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.subject_user_id == borrower_id)
        .filter(TrustEvent.event_type == EV_FULL_REPAID)
        .order_by(TrustEvent.created_at.desc())
        .first()
    )

    if borrower_full and not _exists(db, loan_id=int(loan_id), event_type=EV_FULL_REPAID_REV, subject_user_id=borrower_id):
        meta0 = _parse_meta(getattr(borrower_full, "meta_json", None))
        ref = payload.payment_reference or meta0.get("payment_reference")

        log_trust_event(
            db,
            event_type=EV_FULL_REPAID_REV,
            clan_id=clan_id,
            loan_id=int(loan_id),
            guarantor_id=None,
            actor_user_id=int(current_user.id),
            subject_user_id=borrower_id,
            meta={
                "policy": "trust_constitution_v1",
                "trust_delta": "-0.10",
                "reason": "full_repayment_reversed",
                "note": payload.note,
                "payment_reference": ref,
                "reverses_event_id": getattr(borrower_full, "id", None),
            },
        )

    # 3) Reverse guarantor_success deltas for this loan (if any)
    g_events: List[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.event_type == EV_GUARANTOR_SUCCESS)
        .order_by(TrustEvent.created_at.desc())
        .all()
    )

    reversed_count = 0
    for ge in g_events:
        g_user_id = int(getattr(ge, "subject_user_id"))
        if _exists(db, loan_id=int(loan_id), event_type=EV_GUARANTOR_SUCCESS_REV, subject_user_id=g_user_id):
            continue

        meta0 = _parse_meta(getattr(ge, "meta_json", None))
        ref = payload.payment_reference or meta0.get("payment_reference")

        log_trust_event(
            db,
            event_type=EV_GUARANTOR_SUCCESS_REV,
            clan_id=clan_id,
            loan_id=int(loan_id),
            guarantor_id=getattr(ge, "guarantor_id", None),
            actor_user_id=int(current_user.id),
            subject_user_id=g_user_id,
            meta={
                "policy": "trust_constitution_v1",
                "trust_delta": "-0.03",
                "reason": "guarantor_success_reversed",
                "note": payload.note,
                "payment_reference": ref,
                "borrower_user_id": borrower_id,
                "reverses_event_id": getattr(ge, "id", None),
            },
        )
        reversed_count += 1

    # 4) Flag loan as disputed (append-only semantics; we do not delete repayments)
    try:
        setattr(loan, "status", "disputed")
        if hasattr(loan, "repaid_at"):
            setattr(loan, "repaid_at", None)
        db.add(loan)
        db.commit()
        db.refresh(loan)
    except Exception:
        db.rollback()

    return {
        "ok": True,
        "loan_id": int(loan_id),
        "loan_status": str(getattr(loan, "status", "")),
        "borrower_user_id": borrower_id,
        "reversed_guarantor_events": reversed_count,
        "mode": "admin_append_only_reversal_mvp",
    }
    