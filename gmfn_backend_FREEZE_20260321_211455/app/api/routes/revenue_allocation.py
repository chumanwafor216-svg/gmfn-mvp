from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.services.revenue_allocation_service import get_loan_revenue_allocation

router = APIRouter(prefix="/revenue-allocation", tags=["revenue-allocation"])


@router.get("/loan/{loan_id}")
def revenue_allocation_for_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    _clan, membership, current_user = clan_ctx

    is_admin = (getattr(current_user, "role", "") or "").lower() == "admin" or (
        getattr(membership, "role", "") or ""
    ).lower() == "admin"

    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        return get_loan_revenue_allocation(db, loan_id=int(loan_id))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))