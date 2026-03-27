# app/services/guarantor_service.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Optional

from sqlalchemy.orm import Session


ALLOWED_GUARANTOR_STATUSES = {"pending", "approved", "declined"}


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def update_loan_guarantor_status(
    db: Session,
    *,
    new_status: Optional[str] = None,
    clan_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    guarantor_user_id: Optional[int] = None,
    decided_by_user_id: Optional[int] = None,
    reason: Optional[str] = None,
    note: Optional[str] = None,
    **kwargs: Any,
):
    """
    Canonical guarantor decision service.

    Guarantees:
    - clan isolation (when clan_id provided)
    - only pending/incomplete loans can be decided
    - approval locks pledge -> locked_amount + is_locked
    - decline releases lock -> released_amount += locked_amount, clears lock
    - idempotent: no-op if same status, no flipping after decision
    - appends TrustEvent with meta.reason/meta.note
    - appends lifecycle event(s) for TrustGraph / audit derivation
    - triggers loan evaluation after guarantor change
    """
    from datetime import datetime, timezone

    from app.core.trust_event_types import TrustEventType  # noqa: WPS433
    from app.db.models import Loan, LoanGuarantor  # noqa: WPS433
    from app.services.loans_service import evaluate_loan_after_guarantor_change  # noqa: WPS433
    from app.services.trust_events_services import (  # noqa: WPS433
        log_guarantee_given,
        log_guarantee_released,
        log_trust_event,
    )

    def _now_utc() -> datetime:
        return datetime.now(timezone.utc)

    if decided_by_user_id is None:
        decided_by_user_id = (
            kwargs.get("decided_by_user_id")
            or kwargs.get("actor_user_id")
            or kwargs.get("user_id")
        )

    if reason is None:
        reason = kwargs.get("reason")
    if note is None:
        note = kwargs.get("note")

    if new_status is None:
        new_status = kwargs.get("status") or kwargs.get("decision")

    status = (new_status or "").strip().lower()
    if status not in ALLOWED_GUARANTOR_STATUSES:
        raise ValueError(f"Invalid guarantor status: {new_status}")

    row: Optional[LoanGuarantor] = None

    for k in ("loan_guarantor", "guarantor", "row", "guarantor_row", "lg"):
        v = kwargs.get(k)
        if isinstance(v, LoanGuarantor):
            row = v
            if clan_id is not None and int(getattr(row, "clan_id", -1)) != int(clan_id):
                raise LookupError("LoanGuarantor not found")
            try:
                row_db = db.get(LoanGuarantor, int(row.id))
                if row_db is not None:
                    row = row_db
            except Exception:
                pass
            break

    if row is None:
        loan_guarantor_id = (
            kwargs.get("loan_guarantor_id")
            or kwargs.get("loan_guarantor_row_id")
            or kwargs.get("id")
        )

        if loan_guarantor_id is None and kwargs.get("guarantor_id") is not None and loan_id is None:
            loan_guarantor_id = kwargs.get("guarantor_id")

        if loan_guarantor_id is not None:
            q = db.query(LoanGuarantor).filter(LoanGuarantor.id == int(loan_guarantor_id))
            if clan_id is not None:
                q = q.filter(LoanGuarantor.clan_id == int(clan_id))
            row = q.first()
            if row is None:
                raise LookupError("LoanGuarantor not found")

    if row is None:
        if loan_id is None:
            loan_id = kwargs.get("loan_id")

        if guarantor_user_id is None:
            guarantor_user_id = (
                kwargs.get("guarantor_user_id")
                or kwargs.get("guarantor_user")
                or (kwargs.get("guarantor_id") if loan_id is not None else None)
            )

        if loan_id is None or guarantor_user_id is None:
            raise TypeError("loan_id and guarantor_user_id are required")

        q = (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.loan_id == int(loan_id))
            .filter(LoanGuarantor.guarantor_user_id == int(guarantor_user_id))
        )
        if clan_id is not None:
            q = q.filter(LoanGuarantor.clan_id == int(clan_id))

        row = q.first()
        if row is None:
            raise LookupError("LoanGuarantor not found")

    if clan_id is not None and int(getattr(row, "clan_id", -1)) != int(clan_id):
        raise LookupError("LoanGuarantor not found")

    loan = db.get(Loan, int(getattr(row, "loan_id", 0) or 0))
    if not loan:
        raise LookupError("Loan not found")

    if clan_id is not None and int(getattr(loan, "clan_id", -1)) != int(clan_id):
        raise LookupError("Loan not found")

    loan_status = (getattr(loan, "status", "") or "").lower()
    if loan_status not in {"pending", "incomplete"}:
        raise ValueError(f"Cannot decide guarantor when loan status is '{getattr(loan, 'status', None)}'")

    prev_status = (getattr(row, "status", "") or "").lower()

    if prev_status in {"approved", "declined"} and status != prev_status:
        raise ValueError("Guarantor decision is final and cannot be changed")

    if status == prev_status:
        return row

    pledge = _d(getattr(row, "pledge_amount", None))
    locked_before = _d(getattr(row, "locked_amount", None))
    released_before = _d(getattr(row, "released_amount", None))

    if status == "approved" and pledge <= Decimal("0"):
        raise ValueError("pledge_amount must be > 0 to approve")

    released_now = Decimal("0")

    if status == "approved":
        row.is_locked = True
        row.locked_amount = pledge
    elif status == "declined":
        locked = _d(getattr(row, "locked_amount", None))
        if locked > Decimal("0"):
            row.released_amount = _d(getattr(row, "released_amount", None)) + locked
            released_now = locked
        row.locked_amount = Decimal("0")
        row.is_locked = False

    row.status = status
    row.responded_at = _now_utc()

    db.add(row)
    db.flush()

    actor_id = int(decided_by_user_id or getattr(row, "guarantor_user_id", 0) or 0)
    subject_id = int(getattr(row, "guarantor_user_id", 0) or 0)
    borrower_user_id = int(getattr(loan, "borrower_user_id", 0) or 0)
    row_id = int(getattr(row, "id", 0) or 0)
    loan_id_int = int(getattr(row, "loan_id", 0) or 0)
    clan_id_int = int(getattr(row, "clan_id", 0) or 0)

    event_type = (
        getattr(TrustEventType, "GUARANTOR_APPROVED", "guarantor.approved")
        if status == "approved"
        else getattr(TrustEventType, "GUARANTOR_DECLINED", "guarantor.declined")
    )

    meta = {
        "system": False,
        "decision": status,
        "prev_status": prev_status,
        "pledge_amount": str(pledge),
        "locked_before": str(locked_before),
        "locked_amount": str(_d(getattr(row, "locked_amount", None))),
        "released_before": str(released_before),
        "released_amount": str(_d(getattr(row, "released_amount", None))),
        "reason": (reason or "").strip() or None,
        "note": (note or "").strip() or None,
    }

    log_trust_event(
        db,
        event_type=event_type,
        clan_id=clan_id_int,
        loan_id=loan_id_int,
        guarantor_id=row_id,
        actor_user_id=actor_id,
        subject_user_id=subject_id,
        meta=meta,
        commit=False,
        refresh=False,
    )

    if status == "approved":
        log_guarantee_given(
            db,
            clan_id=clan_id_int,
            actor_user_id=actor_id,
            borrower_user_id=borrower_user_id,
            guarantor_user_id=subject_id,
            loan_id=loan_id_int,
            guarantor_id=row_id,
            pledge_amount=pledge,
            guarantee_gap=_d(getattr(loan, "guarantee_gap", None)),
            reason=(reason or "").strip() or None,
            note=(note or "").strip() or None,
            commit=False,
            refresh=False,
        )

    elif status == "declined" and released_now > Decimal("0"):
        log_guarantee_released(
            db,
            clan_id=clan_id_int,
            actor_user_id=actor_id,
            borrower_user_id=borrower_user_id,
            guarantor_user_id=subject_id,
            loan_id=loan_id_int,
            guarantor_id=row_id,
            released_amount=released_now,
            release_reason="guarantor_declined",
            note=(note or "").strip() or None,
            commit=False,
            refresh=False,
        )

    evaluate_loan_after_guarantor_change(
        db,
        loan_id=int(getattr(loan, "id", 0) or 0),
    )

    db.commit()
    db.refresh(row)
    return row


def approve_guarantor(
    db: Session,
    *,
    loan_id: int,
    guarantor_user_id: int,
    clan_id: Optional[int] = None,
):
    return update_loan_guarantor_status(
        db,
        loan_id=loan_id,
        guarantor_user_id=guarantor_user_id,
        new_status="approved",
        clan_id=clan_id,
        decided_by_user_id=guarantor_user_id,
        reason="guarantor_approved",
    )


def decline_guarantor(
    db: Session,
    *,
    loan_id: int,
    guarantor_user_id: int,
    clan_id: Optional[int] = None,
):
    return update_loan_guarantor_status(
        db,
        loan_id=loan_id,
        guarantor_user_id=guarantor_user_id,
        new_status="declined",
        clan_id=clan_id,
        decided_by_user_id=guarantor_user_id,
        reason="guarantor_declined",
    )