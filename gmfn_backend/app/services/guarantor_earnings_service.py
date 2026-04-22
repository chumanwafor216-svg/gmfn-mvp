from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.db.guarantor_earnings_models import GuarantorEarning
from app.services.revenue_allocation_service import get_loan_revenue_allocation


TWOPLACES = Decimal("0.01")


def _d(x: Any) -> Decimal:
    if isinstance(x, Decimal):
        return x
    if x is None:
        return Decimal("0.00")
    return Decimal(str(x))


def _q2(x: Any) -> Decimal:
    return _d(x).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def materialize_guarantor_earnings(db: Session, *, loan_id: int, currency: str = "NGN") -> Dict[str, Any]:
    allocation = get_loan_revenue_allocation(db, loan_id=int(loan_id))
    allocation_currency = str(allocation.get("currency") or currency or "NGN")

    created: List[Dict[str, Any]] = []

    for item in allocation.get("items", []):
        loan_guarantor_id = int(item["loan_guarantor_id"])

        existing = (
            db.query(GuarantorEarning)
            .filter(GuarantorEarning.loan_guarantor_id == loan_guarantor_id)
            .first()
        )
        if existing:
            created.append(
                {
                    "id": int(existing.id),
                    "loan_guarantor_id": int(existing.loan_guarantor_id),
                    "guarantor_user_id": int(existing.guarantor_user_id),
                    "earned_amount": str(existing.earned_amount),
                    "status": existing.status,
                    "existing": True,
                }
            )
            continue

        row = GuarantorEarning(
            loan_id=int(allocation["loan_id"]),
            loan_guarantor_id=loan_guarantor_id,
            guarantor_user_id=int(item["guarantor_user_id"]),
            earned_amount=_q2(item["share_amount"]),
            currency=allocation_currency,
            status="pending",
            note=f"Auto-created from revenue allocation for loan {loan_id}",
        )
        db.add(row)
        db.flush()

        created.append(
            {
                "id": int(row.id),
                "loan_guarantor_id": int(row.loan_guarantor_id),
                "guarantor_user_id": int(row.guarantor_user_id),
                "earned_amount": str(row.earned_amount),
                "status": row.status,
                "existing": False,
            }
        )

    db.commit()

    return {
        "loan_id": int(loan_id),
        "count": len(created),
        "items": created,
    }


def list_guarantor_earnings(db: Session, *, loan_id: int | None = None, guarantor_user_id: int | None = None) -> List[GuarantorEarning]:
    q = db.query(GuarantorEarning)

    if loan_id is not None:
        q = q.filter(GuarantorEarning.loan_id == int(loan_id))

    if guarantor_user_id is not None:
        q = q.filter(GuarantorEarning.guarantor_user_id == int(guarantor_user_id))

    return q.order_by(GuarantorEarning.id.asc()).all()
