# app/api/routes/admin_repayment_reversals.py
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import EvidenceLifecycleMarker, User, Loan, Repayment, TrustEvent
from app.schemas.admin_repayment_reversal import AdminRepaymentReverseIn
from app.services.trust_events_services import log_trust_event
from app.core.evidence_lifecycle import (
    DISPUTED,
    MARKER_DISPUTE,
    MARKER_REVERSAL,
    NOT_MEASURED_YET,
    RESOLUTION_REVERSED,
    RESOLUTION_UNRESOLVED,
    REVERSED,
    SOURCE_LOAN,
    SOURCE_REPAYMENT,
    SOURCE_TRUST_EVENT,
)
from app.services.evidence_lifecycle_service import create_lifecycle_marker

router = APIRouter(prefix="/admin/repayments", tags=["admin"])

EV_INFO_REPAYMENT_REVERSED = "repayment.reversed"
EV_FULL_REPAID = "loan_fully_repaid"
EV_FULL_REPAID_DOT = "loan.repaid"
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


def _resolve_repayment_target(db: Session, *, loan_id: int, repayment_id: Optional[int]) -> tuple[Optional[Repayment], str]:
    if repayment_id is not None:
        repayment = (
            db.query(Repayment)
            .filter(Repayment.id == int(repayment_id))
            .filter(Repayment.loan_id == int(loan_id))
            .first()
        )
        return (repayment, "provided") if repayment else (None, "provided_not_found")

    repayments = db.query(Repayment).filter(Repayment.loan_id == int(loan_id)).all()
    if len(repayments) == 1:
        return repayments[0], "single_repayment_on_loan"
    if not repayments:
        return None, "not_measured_yet"
    return None, "ambiguous_multiple_repayments"


def _marker_exists(db: Session, *, source_type: str, source_id: int, marker_type: str) -> bool:
    q = (
        db.query(EvidenceLifecycleMarker)
        .filter(EvidenceLifecycleMarker.source_type == source_type)
        .filter(EvidenceLifecycleMarker.source_id == str(int(source_id)))
        .filter(EvidenceLifecycleMarker.marker_type == marker_type)
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

    repayment_target, repayment_linkage = _resolve_repayment_target(
        db,
        loan_id=int(loan_id),
        repayment_id=payload.repayment_id,
    )

    info_event: Optional[TrustEvent] = None

    # 1) Info event (always)
    if not _exists(db, loan_id=int(loan_id), event_type=EV_INFO_REPAYMENT_REVERSED, subject_user_id=borrower_id):
        info_event = log_trust_event(
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
                "repayment_id": int(repayment_target.id) if repayment_target else None,
                "repayment_linkage": repayment_linkage,
            },
        )

    if repayment_target is not None and not _marker_exists(
        db,
        source_type=SOURCE_REPAYMENT,
        source_id=int(repayment_target.id),
        marker_type=MARKER_REVERSAL,
    ):
        create_lifecycle_marker(
            db,
            source_type=SOURCE_REPAYMENT,
            source_id=int(repayment_target.id),
            marker_type=MARKER_REVERSAL,
            state=REVERSED,
            resolution=RESOLUTION_REVERSED,
            actor_user_id=int(current_user.id),
            authority_type="admin_repayment_reversal",
            reason="Repayment row was linked to an admin reversal.",
            related_source_type=SOURCE_LOAN,
            related_source_id=int(loan_id),
            related_trust_event_id=getattr(info_event, "id", None),
            meta={"repayment_linkage": repayment_linkage},
        )
    elif repayment_target is None and not _marker_exists(
        db,
        source_type=SOURCE_LOAN,
        source_id=int(loan_id),
        marker_type=MARKER_DISPUTE,
    ):
        create_lifecycle_marker(
            db,
            source_type=SOURCE_LOAN,
            source_id=int(loan_id),
            marker_type=MARKER_DISPUTE,
            state=DISPUTED if repayment_linkage != "not_measured_yet" else NOT_MEASURED_YET,
            resolution=RESOLUTION_UNRESOLVED,
            actor_user_id=int(current_user.id),
            authority_type="admin_repayment_reversal",
            reason="Repayment reversal could not be linked to an exact repayment row.",
            related_trust_event_id=getattr(info_event, "id", None),
            meta={"repayment_linkage": repayment_linkage},
        )
    db.commit()

    # 2) Reverse borrower full repay trust delta if it was awarded
    borrower_full = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.subject_user_id == borrower_id)
        .filter(TrustEvent.event_type.in_([EV_FULL_REPAID, EV_FULL_REPAID_DOT]))
        .order_by(TrustEvent.created_at.desc())
        .first()
    )

    if borrower_full and not _exists(db, loan_id=int(loan_id), event_type=EV_FULL_REPAID_REV, subject_user_id=borrower_id):
        meta0 = _parse_meta(getattr(borrower_full, "meta_json", None))
        ref = payload.payment_reference or meta0.get("payment_reference")

        borrower_reversal = log_trust_event(
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
        if not _marker_exists(
            db,
            source_type=SOURCE_TRUST_EVENT,
            source_id=int(borrower_full.id),
            marker_type=MARKER_REVERSAL,
        ):
            create_lifecycle_marker(
                db,
                source_type=SOURCE_TRUST_EVENT,
                source_id=int(borrower_full.id),
                trust_event_id=int(borrower_full.id),
                marker_type=MARKER_REVERSAL,
                state=REVERSED,
                resolution=RESOLUTION_REVERSED,
                actor_user_id=int(current_user.id),
                authority_type="admin_repayment_reversal",
                reason="Full repayment TrustEvent was reversed by admin repayment reversal.",
                related_source_type=SOURCE_LOAN,
                related_source_id=int(loan_id),
                related_trust_event_id=getattr(borrower_reversal, "id", None),
            )
        db.commit()

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

        guarantor_reversal = log_trust_event(
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
        if not _marker_exists(
            db,
            source_type=SOURCE_TRUST_EVENT,
            source_id=int(ge.id),
            marker_type=MARKER_REVERSAL,
        ):
            create_lifecycle_marker(
                db,
                source_type=SOURCE_TRUST_EVENT,
                source_id=int(ge.id),
                trust_event_id=int(ge.id),
                marker_type=MARKER_REVERSAL,
                state=REVERSED,
                resolution=RESOLUTION_REVERSED,
                actor_user_id=int(current_user.id),
                authority_type="admin_repayment_reversal",
                reason="Guarantor success TrustEvent was reversed by admin repayment reversal.",
                related_source_type=SOURCE_LOAN,
                related_source_id=int(loan_id),
                related_trust_event_id=getattr(guarantor_reversal, "id", None),
            )
        db.commit()
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
        "repayment_lifecycle_linkage": repayment_linkage,
        "repayment_lifecycle_marker_source_id": int(repayment_target.id) if repayment_target else None,
        "mode": "admin_append_only_reversal_mvp",
    }
    