from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.revenue_allocation_service import get_my_guarantor_earnings

router = APIRouter(prefix="/guarantor-earnings", tags=["guarantor-earnings"])


@router.get("/me")
def my_guarantor_earnings(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_guarantor_earnings(db, user_id=int(current_user.id), limit=int(limit))