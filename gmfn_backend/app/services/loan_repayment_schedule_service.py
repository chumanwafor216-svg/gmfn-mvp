from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment
from app.db.models import Loan, TrustEvent
from app.services.expected_payments_service import ensure_loan_repayment_expected_payment
from app.services.trust_events_services import log_trust_event


CADENCE_DAYS = {
    "weekly": 7,
    "biweekly": 14,
    "monthly": 30,
}
MAX_PLANNED_INSTALLMENTS = 52


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _d(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value.quantize(Decimal("0.01"))
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _read_meta(row: TrustEvent | None) -> Dict[str, Any]:
    if not row or not getattr(row, "meta_json", None):
        return {}
    try:
        parsed = json.loads(row.meta_json or "{}")
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _loan_agreement_meta(db: Session, *, loan_id: int) -> Dict[str, Any]:
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.event_type.in_(["commitment.created", "loan.created"]))
        .order_by(TrustEvent.id.desc())
        .all()
    )
    merged: Dict[str, Any] = {}
    for row in reversed(rows):
        merged.update(_read_meta(row))
    return merged


def _parse_due_at(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(text)
    except Exception:
        return None


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _positive_int(value: Any) -> int:
    try:
        number = int(value or 0)
    except Exception:
        return 0
    return number if number > 0 else 0


def _planned_installments(
    *,
    amount: Decimal,
    cadence: str,
    duration_days: int,
    due_at: Optional[datetime],
) -> List[Dict[str, Any]]:
    if amount <= Decimal("0.00") or not due_at:
        return []
    due_at = _as_aware(due_at)

    interval = CADENCE_DAYS.get(cadence)
    if not interval or duration_days <= 0:
        return [
            {
                "number": 1,
                "amount": str(amount),
                "due_at": due_at.isoformat(),
            }
        ]

    count = max(1, (duration_days + interval - 1) // interval)
    count = min(count, MAX_PLANNED_INSTALLMENTS)
    cents = int((amount * Decimal("100")).to_integral_value())
    base = cents // count
    remainder = cents - (base * count)
    started_at = _now_utc()

    items: List[Dict[str, Any]] = []
    for index in range(count):
        item_cents = base + (remainder if index == count - 1 else 0)
        item_amount = (Decimal(item_cents) / Decimal("100")).quantize(Decimal("0.01"))
        item_due_at = due_at if index == count - 1 else started_at + timedelta(days=interval * (index + 1))
        if item_due_at > due_at:
            item_due_at = due_at
        items.append(
            {
                "number": index + 1,
                "amount": str(item_amount),
                "due_at": item_due_at.isoformat(),
            }
        )
    return items


def ensure_approved_loan_repayment_schedule(
    db: Session,
    *,
    loan: Loan,
    actor_user_id: Optional[int] = None,
    commit: bool = True,
    refresh: bool = True,
) -> Optional[ExpectedPayment]:
    """
    Create the canonical repayment expectation only after a loan is approved.

    The product already uses one repayment reference per loan and supports part
    payments against that total. The cadence lives in metadata as the planned
    schedule so reconciliation stays deterministic and does not double-count.
    """

    if (getattr(loan, "status", "") or "").lower() != "approved":
        return None

    outstanding = _d(getattr(loan, "remaining_amount", None))
    if outstanding <= Decimal("0.00"):
        amount = _d(getattr(loan, "amount", None))
        paid = _d(getattr(loan, "paid_total", None))
        outstanding = max(Decimal("0.00"), amount - paid)
    if outstanding <= Decimal("0.00"):
        return None

    meta = _loan_agreement_meta(db, loan_id=int(loan.id))
    cadence = str(meta.get("repayment_cadence") or meta.get("cadence") or "").strip().lower()
    duration_days = _positive_int(meta.get("duration_days"))
    due_at = getattr(loan, "due_at", None) or _parse_due_at(meta.get("due_at") or meta.get("due_date"))

    planned_installments = _planned_installments(
        amount=outstanding,
        cadence=cadence,
        duration_days=duration_days,
        due_at=due_at,
    )

    schedule_meta = {
        "source": "loan.approval.repayment_schedule",
        "application_kind": "loan_repayment",
        "loan_id": int(loan.id),
        "borrower_user_id": int(loan.borrower_user_id),
        "repayment_cadence": cadence or None,
        "duration_days": int(duration_days),
        "due_at": due_at.isoformat() if due_at else None,
        "expected_total_amount": str(outstanding),
        "planned_installments": planned_installments,
        "schedule_status": "active_after_loan_approval",
        "reader_note": (
            "This is the approved loan repayment expectation. Bank reconciliation "
            "uses the repayment reference; the planned installments explain the "
            "borrower's agreed repayment rhythm."
        ),
    }

    expected = ensure_loan_repayment_expected_payment(
        db,
        clan_id=int(loan.clan_id),
        loan_id=int(loan.id),
        borrower_user_id=int(loan.borrower_user_id),
        amount=outstanding,
        currency=getattr(loan, "currency", None) or "NGN",
        due_at=due_at,
        meta=schedule_meta,
        commit=False,
        refresh=False,
    )

    log_trust_event(
        db,
        event_type="repayment.schedule.created",
        clan_id=int(loan.clan_id),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(actor_user_id or loan.borrower_user_id),
        subject_user_id=int(loan.borrower_user_id),
        meta={
            "reason": "approved_loan_repayment_schedule_created",
            "expected_payment_id": int(expected.id),
            "reference_display": expected.reference_display,
            "amount": str(outstanding),
            "currency": getattr(loan, "currency", None) or "NGN",
            "repayment_cadence": cadence or None,
            "duration_days": int(duration_days),
            "due_at": due_at.isoformat() if due_at else None,
            "planned_installments": planned_installments,
            "system": True,
        },
        dedupe_key=f"repayment.schedule.loan.{int(loan.id)}",
        commit=False,
        refresh=False,
    )

    if commit:
        db.commit()
        if refresh:
            db.refresh(expected)

    return expected
