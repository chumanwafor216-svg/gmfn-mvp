from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional

from sqlalchemy.orm import Session

from app.core.trust_event_types import TrustEventType
from app.db.models import LoanGuarantor, Loan
from app.services.trust_events_services import log_trust_event
from app.services.loans_service import evaluate_loan_after_guarantor_change


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
