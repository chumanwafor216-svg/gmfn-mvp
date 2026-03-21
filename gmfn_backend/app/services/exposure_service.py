# app/services/exposure_service.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import User, ClanMembership, LoanGuarantor


def D(x: Any) -> Decimal:
    return Decimal("0") if x is None else Decimal(str(x))


def get_clan_exposure_rows(db: Session, *, clan_id: int) -> List[Dict[str, Any]]:
    """
    Exposure = sum(locked_amount - released_amount) for APPROVED guarantees in this clan, per user.
    Returns rows with:
      user_id, email, pool_balance, exposure, available
    """

    exposure_subq = (
        select(
            LoanGuarantor.guarantor_user_id.label("user_id"),
            func.coalesce(
                func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount),
                0,
            ).label("exposure"),
        )
        .where(
            LoanGuarantor.clan_id == clan_id,
            LoanGuarantor.status == "approved",
        )
        .group_by(LoanGuarantor.guarantor_user_id)
        .subquery()
    )

    q = (
        db.query(
            ClanMembership.user_id.label("user_id"),
            User.email.label("email"),
            ClanMembership.personal_pool_balance.label("pool_balance"),
            func.coalesce(exposure_subq.c.exposure, 0).label("exposure"),
        )
        .join(User, User.id == ClanMembership.user_id)
        .outerjoin(exposure_subq, exposure_subq.c.user_id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == clan_id)
        .order_by(User.id.asc())
    )

    rows: List[Dict[str, Any]] = []
    for user_id, email, pool_balance, exposure in q.all():
        pool = D(pool_balance)
        exp = D(exposure)
        available = pool - exp
        if available < 0:
            available = Decimal("0")

        rows.append(
            {
                "user_id": int(user_id),
                "email": email,
                "pool_balance": str(pool),
                "exposure": str(exp),
                "available": str(available),
            }
        )
    return rows