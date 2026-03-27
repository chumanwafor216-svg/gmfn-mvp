from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict

from fastapi import APIRouter, Depends
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
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
) -> Dict[str, Any]:
    """
    Clan liquidity index (simple deterministic aggregate).
    """
    clan, membership, current_user = clan_ctx

    gs = db.query(LoanGuarantor).filter(LoanGuarantor.clan_id == int(clan.id)).all()

    pledged_total = Decimal("0")
    locked_total = Decimal("0")
    released_total = Decimal("0")

    for g in gs:
        pledged_total += _d(getattr(g, "pledge_amount", None))
        locked_total += _d(getattr(g, "locked_amount", None))
        released_total += _d(getattr(g, "released_amount", None))

    active_loans = (
        db.query(Loan)
        .filter(Loan.clan_id == int(clan.id))
        .filter(Loan.status.in_(["pending", "incomplete", "approved", "disbursed"]))
        .count()
    )

    return {
        "clan_id": int(clan.id),
        "clan_name": getattr(clan, "name", None),
        "active_loans_count": int(active_loans),
        "pledged_total": str(pledged_total),
        "locked_total": str(locked_total),
        "released_total": str(released_total),
        "note": "Liquidity is informational in pilot. No custodial funds are held by GMFN.",
    }
