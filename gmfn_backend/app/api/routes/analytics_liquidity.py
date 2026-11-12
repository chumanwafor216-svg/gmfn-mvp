from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import Loan, LoanGuarantor

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


@router.get("/clan-liquidity")
def clan_liquidity(
    currency: str | None = Query(None, min_length=3, max_length=8),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
) -> Dict[str, Any]:
    """
    Community liquidity index (simple deterministic aggregate).
    """
    clan, membership, current_user = clan_ctx
    normalized_currency = str(currency or "").strip().upper() or None

    guarantor_query = db.query(LoanGuarantor).filter(
        LoanGuarantor.clan_id == int(clan.id)
    )
    if normalized_currency:
        guarantor_query = guarantor_query.join(
            Loan, Loan.id == LoanGuarantor.loan_id
        ).filter(Loan.currency == normalized_currency)
    gs = guarantor_query.all()

    pledged_total = Decimal("0")
    locked_total = Decimal("0")
    released_total = Decimal("0")

    for g in gs:
        pledged_total += _d(getattr(g, "pledge_amount", None))
        locked_total += _d(getattr(g, "locked_amount", None))
        released_total += _d(getattr(g, "released_amount", None))

    active_loan_query = (
        db.query(Loan)
        .filter(Loan.clan_id == int(clan.id))
        .filter(Loan.status.in_(["pending", "incomplete", "approved", "disbursed"]))
    )
    if normalized_currency:
        active_loan_query = active_loan_query.filter(
            Loan.currency == normalized_currency
        )
    active_loans = active_loan_query.count()

    return {
        "clan_id": int(clan.id),
        "clan_name": getattr(clan, "name", None),
        "currency": normalized_currency,
        "active_loans_count": int(active_loans),
        "pledged_total": str(pledged_total),
        "locked_total": str(locked_total),
        "released_total": str(released_total),
        "note": "Liquidity is informational. No custodial funds are held by GSN.",
    }
