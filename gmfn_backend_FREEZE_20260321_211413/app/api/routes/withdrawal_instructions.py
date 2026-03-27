from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.services.withdrawal_instruction_service import create_loan_withdrawal_instruction

router = APIRouter(prefix="/withdrawal-instructions", tags=["withdrawal-instructions"])


@router.get("/loan/{loan_id}")
def loan_withdrawal_instruction(
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
        return create_loan_withdrawal_instruction(db, loan_id=int(loan_id))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))