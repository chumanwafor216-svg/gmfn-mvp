from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import LoanGuarantor

router = APIRouter(prefix="/guarantors/exposure", tags=["exposure"])


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


@router.get("/me")
def my_guarantor_exposure(
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
) -> Dict[str, Any]:
    """
    A4: Deterministic exposure summary for the current user within the current clan.
    Returns:
      - total_locked
      - total_released
      - active_guarantees (pending)
      - historical_guarantees (approved/declined/etc)
    """
    clan, membership, current_user = clan_ctx
    uid = int(current_user.id)

    rows = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.clan_id == int(clan.id))
        .filter(LoanGuarantor.guarantor_user_id == uid)
        .order_by(LoanGuarantor.id.desc())
        .all()
    )

    total_locked = Decimal("0")
    total_released = Decimal("0")
    active = 0
    historical = 0

    for g in rows:
        total_locked += _d(getattr(g, "locked_amount", None))
        total_released += _d(getattr(g, "released_amount", None))

        st = (getattr(g, "status", "") or "").lower()
        if st == "pending":
            active += 1
        else:
            historical += 1

    return {
        "user_id": uid,
        "clan_id": int(clan.id),
        "total_locked": str(total_locked),
        "total_released": str(total_released),
        "active_guarantees": int(active),
        "historical_guarantees": int(historical),
        "note": "Exposure is informational in MVP; guarantors are not auto-debited.",
    }