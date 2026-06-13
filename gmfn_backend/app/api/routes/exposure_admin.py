# app/api/routes/exposure_admin.py
from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, LoanGuarantor, User
from app.services.cci_service import compute_cci_score

router = APIRouter(prefix="/exposure/admin", tags=["exposure"])


def _require_clan_admin(db: Session, *, clan_id: int, current_user: User) -> None:
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
        )
        .first()
    )
    if not m or m.role != "admin":
        raise HTTPException(status_code=403, detail="Community admin privileges required")


def _D(x: Any) -> Decimal:
    try:
        return Decimal(str(x))
    except Exception:
        return Decimal("0")


@router.get("/", operation_id="exposure_admin_get_exposure")
def get_exposure_admin(
    clan_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns per-user exposure in clan:
      exposure = sum(locked_amount - released_amount) for approved guarantors
      pool = ClanMembership.personal_pool_balance
      available = max(pool - exposure, 0)
    """
    _require_clan_admin(db, clan_id=clan_id, current_user=current_user)

    # All clan members
    members = (
        db.query(ClanMembership, User)
        .join(User, User.id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .all()
    )

    # Precompute exposure by user (approved only)
    exposure_rows = (
        db.query(
            LoanGuarantor.guarantor_user_id.label("user_id"),
            func.coalesce(
                func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount),
                0,
            ).label("exposure"),
        )
        .filter(LoanGuarantor.clan_id == int(clan_id))
        .filter(LoanGuarantor.status == "approved")
        .group_by(LoanGuarantor.guarantor_user_id)
        .all()
    )
    exposure_by_user = {int(r.user_id): _D(r.exposure) for r in exposure_rows}

    items: List[Dict[str, Any]] = []
    totals_pool = Decimal("0")
    totals_exposure = Decimal("0")

    for m, u in members:
        pool = _D(getattr(m, "personal_pool_balance", 0))
        exposure = exposure_by_user.get(int(u.id), Decimal("0"))
        available = pool - exposure
        if available < 0:
            available = Decimal("0")

        totals_pool += pool
        totals_exposure += exposure

        items.append(
            {
                "user_id": int(u.id),
                "email": u.email,
                "role": getattr(m, "role", None),
                "pool": float(pool),
                "exposure": float(exposure),
                "available": float(available),
            }
        )

    return {
        "clan_id": int(clan_id),
        "items": items,
        "total": len(items),
        "totals": {
            "pool": float(totals_pool),
            "exposure": float(totals_exposure),
            "available": float(max(totals_pool - totals_exposure, Decimal("0"))),
        },
    }


@router.get("/cci-scores", operation_id="exposure_admin_get_cci_scores")
def get_cci_scores_for_clan(
    clan_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_clan_admin(db, clan_id=clan_id, current_user=current_user)

    member_ids = (
        db.query(ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .all()
    )
    ids = [int(x[0]) for x in member_ids]

    items: List[Dict[str, Any]] = []
    for uid in ids:
        cci = compute_cci_score(db, clan_id=int(clan_id), user_id=int(uid))
        items.append(
            {
                "user_id": int(uid),
                "score": int(cci.score),
                "events_counted": int(cci.events_counted),
                "breakdown": cci.breakdown,
            }
        )

    return {"clan_id": int(clan_id), "items": items, "total": len(items)}
