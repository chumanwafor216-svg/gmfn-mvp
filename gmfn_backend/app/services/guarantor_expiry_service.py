from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Tuple, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import LoanGuarantor, Loan
from app.services.trust_events_services import log_trust_event
from app.services.loans_service import cancel_loan, evaluate_loan_after_guarantor_change


ACTIVE_SUPPORT_LOAN_STATUSES = {"pending", "incomplete"}
DEFAULT_SUPPORT_RESPONSE_HOURS = 24
DEFAULT_SUPPORT_CANCEL_GRACE_HOURS = 1


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _sum_approved_locked(db: Session, *, loan_id: int) -> Decimal:
    raw = (
        db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0))
        .filter(LoanGuarantor.loan_id == int(loan_id))
        .filter(LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )
    return _decimal(raw)


def _support_complete(db: Session, *, loan: Loan) -> bool:
    required_count = int(getattr(loan, "guarantors_required", 0) or 0)
    if required_count <= 0:
        return True

    approved = int(
        db.query(func.count(LoanGuarantor.id))
        .filter(LoanGuarantor.loan_id == int(loan.id))
        .filter(LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )
    coverage = _sum_approved_locked(db, loan_id=int(loan.id))
    required_gap = _decimal(
        getattr(loan, "guarantee_gap", None)
        if getattr(loan, "guarantee_gap", None) is not None
        else getattr(loan, "amount", 0)
    )
    return approved >= required_count and coverage >= required_gap


def _latest_support_request_created(loan: Loan, guarantors: list[LoanGuarantor]) -> datetime:
    timestamps = [_aware(getattr(loan, "created_at", None)) or _utcnow()]
    for guarantor in guarantors:
        created_at = _aware(getattr(guarantor, "created_at", None))
        if created_at is not None:
            timestamps.append(created_at)
    return max(timestamps)


def expire_pending_guarantors(
    db: Session,
    *,
    clan_id: Optional[int] = None,
    expiry_hours: int = 48,
    max_batch: int = 500,
) -> Tuple[int, int]:
    """
    Mark pending guarantor requests as expired after expiry_hours.

    Returns:
        (expired_count, scanned_count)

    Notes (real-world):
    - We only target guarantors that are truly pending and unanswered (responded_at is NULL).
    - TrustEvent subject is the GUARANTOR (they timed out), not the borrower.
    - We include meta.reason/meta.note to support explainability and visa evidence.
    - evaluate_loan_after_guarantor_change() is called so loan may auto-reject if rules say so.
    """
    if expiry_hours <= 0:
        raise ValueError("expiry_hours must be > 0")

    cutoff = _utcnow() - timedelta(hours=expiry_hours)

    q = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.status == "pending")
        .filter(LoanGuarantor.responded_at.is_(None))
        .filter(LoanGuarantor.created_at <= cutoff)
        .order_by(LoanGuarantor.created_at.asc())
    )

    if clan_id is not None:
        q = q.filter(LoanGuarantor.clan_id == clan_id)

    pending_rows = q.limit(max_batch).all()
    scanned = len(pending_rows)
    expired = 0

    for g in pending_rows:
        # 1) Expire guarantor
        g.status = "expired"
        g.responded_at = _utcnow()

        # 2) Fetch loan safely
        loan = getattr(g, "loan", None)
        if loan is None:
            loan = db.get(Loan, g.loan_id)

        # 3) Log trust event (subject = guarantor who timed out)
        if loan is not None:
            log_trust_event(
                db,
                event_type=TrustEventType.GUARANTOR_EXPIRED,
                clan_id=g.clan_id,
                loan_id=g.loan_id,
                guarantor_id=g.id,
                actor_user_id=g.guarantor_user_id,  # no "system user" concept yet
                subject_user_id=g.guarantor_user_id,
                meta={
                    # ✅ explainability contract
                    "reason": "guarantor_response_timeout",
                    "note": f"Guarantor did not respond within {expiry_hours} hours; request auto-expired.",
                    # context
                    "expiry_hours": expiry_hours,
                    "cutoff_utc": cutoff.isoformat(),
                    "borrower_user_id": loan.borrower_user_id,
                    "loan_status_before_eval": getattr(loan, "status", None),
                },
            )

            # 4) Re-evaluate loan (may auto-reject depending on rules)
            evaluate_loan_after_guarantor_change(db, loan_id=g.loan_id)

        expired += 1

    db.commit()
    return expired, scanned


def expire_stale_support_loans(
    db: Session,
    *,
    clan_id: Optional[int] = None,
    response_hours: int = DEFAULT_SUPPORT_RESPONSE_HOURS,
    cancel_grace_hours: int = DEFAULT_SUPPORT_CANCEL_GRACE_HOURS,
    max_batch: int = 500,
) -> dict:
    """
    Deterministically close stale support-backed loan attempts.

    Flow:
    - unanswered guarantor requests expire after response_hours;
    - if the loan is still incomplete after the grace window and no pending
      guarantor request remains, cancel the loan and release any locked pledges.

    This does not disburse money. It only prevents partial support attempts from
    keeping guarantor funds locked forever.
    """
    if response_hours <= 0:
        raise ValueError("response_hours must be > 0")
    if cancel_grace_hours < 0:
        raise ValueError("cancel_grace_hours must be >= 0")

    expired_guarantors, scanned_guarantors = expire_pending_guarantors(
        db,
        clan_id=clan_id,
        expiry_hours=int(response_hours),
        max_batch=int(max_batch),
    )

    cancel_cutoff = _utcnow() - timedelta(
        hours=int(response_hours) + int(cancel_grace_hours)
    )

    q = (
        db.query(Loan)
        .filter(Loan.status.in_(list(ACTIVE_SUPPORT_LOAN_STATUSES)))
        .filter(Loan.guarantors_required > 0)
        .order_by(Loan.created_at.asc(), Loan.id.asc())
    )
    if clan_id is not None:
        q = q.filter(Loan.clan_id == int(clan_id))

    loans = q.limit(int(max_batch)).all()
    cancelled_ids: list[int] = []
    scanned_loans = 0

    for loan in loans:
        scanned_loans += 1
        guarantors = (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.loan_id == int(loan.id))
            .filter(LoanGuarantor.clan_id == int(loan.clan_id))
            .all()
        )
        if not guarantors:
            continue

        pending_count = sum(1 for row in guarantors if (row.status or "").lower() == "pending")
        if pending_count > 0:
            continue

        if _support_complete(db, loan=loan):
            evaluate_loan_after_guarantor_change(db, loan_id=int(loan.id))
            continue

        latest_request_created = _latest_support_request_created(loan, guarantors)
        if latest_request_created > cancel_cutoff:
            continue

        cancel_loan(
            db,
            loan_id=int(loan.id),
            clan_id=int(loan.clan_id),
            actor_user_id=int(getattr(loan, "borrower_user_id", 0) or 0),
            reason="support_window_expired",
            release_reason="support_window_expired",
            note=(
                "Support window expired before enough guarantors accepted. "
                "Any locked guarantor exposure was released."
            ),
        )
        cancelled_ids.append(int(loan.id))

    return {
        "response_hours": int(response_hours),
        "cancel_grace_hours": int(cancel_grace_hours),
        "expired_guarantors": int(expired_guarantors),
        "scanned_guarantors": int(scanned_guarantors),
        "cancelled_loans": len(cancelled_ids),
        "cancelled_loan_ids": cancelled_ids,
        "scanned_loans": int(scanned_loans),
        "status": "complete",
    }
