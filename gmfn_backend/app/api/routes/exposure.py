from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, LoanGuarantor, User

router = APIRouter(prefix="/exposure", tags=["exposure"])


def _require_admin(u: User) -> None:
    if (getattr(u, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


def _d(x: Any) -> Decimal:
    try:
        return Decimal(str(x if x is not None else 0))
    except Exception:
        return Decimal("0")


def _effective_clan_id(clan_id_query: int | None, x_clan_id: int | None) -> int:
    cid = clan_id_query if clan_id_query is not None else x_clan_id
    if cid is None:
        raise HTTPException(
            status_code=422,
            detail="clan_id required (query or X-Clan-Id header)",
        )
    return int(cid)


@router.get("/admin")
def get_exposure_admin(
    clan_id: int | None = Query(default=None),
    x_clan_id: int | None = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin exposure by user within a clan.

    ✅ Fixes SQLite: 'Header' is not supported
    by NEVER passing Header objects into SQLAlchemy filters.
    """
    _require_admin(current_user)
    cid = _effective_clan_id(clan_id, x_clan_id)

    # Subquery: how many clans each user belongs to (global across DB)
    clan_counts_sq = (
        db.query(
            ClanMembership.user_id.label("user_id"),
            func.count(ClanMembership.clan_id).label("clans_count"),
        )
        .group_by(ClanMembership.user_id)
        .subquery()
    )

    # Members in clan
    members = (
        db.query(
            ClanMembership.user_id,
            ClanMembership.personal_pool_balance,
        )
        .filter(ClanMembership.clan_id == cid)
        .all()
    )

    # Exposure (approved locks minus released) by guarantor
    exposure_rows = (
        db.query(
            LoanGuarantor.guarantor_user_id.label("user_id"),
            func.coalesce(
                func.sum(
                    LoanGuarantor.locked_amount - LoanGuarantor.released_amount
                ),
                0,
            ).label("exposure"),
        )
        .filter(LoanGuarantor.clan_id == cid)
        .filter(func.lower(LoanGuarantor.status) == "approved")
        .group_by(LoanGuarantor.guarantor_user_id)
        .all()
    )

    exposure_by_uid = {int(r.user_id): _d(r.exposure) for r in exposure_rows}

    # Email/role + clan membership count per user (deterministic count)
    users = (
        db.query(
            User.id,
            User.email,
            User.role,
            func.count(ClanMembership.id).label("clans_count"),
        )
        .join(ClanMembership, ClanMembership.user_id == User.id)
        .group_by(User.id)
        .all()
    )

    user_meta = {
        int(u.id): {
            "email": u.email,
            "role": u.role,
            "clans_count": int(u.clans_count or 0),
        }
        for u in users
    }

    items: list[dict[str, Any]] = []

    for uid_raw, pool_raw in members:
        uid = int(uid_raw)
        pool = _d(pool_raw)
        exposure = exposure_by_uid.get(uid, Decimal("0"))
        available = pool - exposure

        if available < 0:
            available = Decimal("0")

        meta = user_meta.get(uid, {})

        items.append(
            {
                "user_id": uid,
                "email": meta.get("email"),
                "role": meta.get("role"),
                # NOTE: UI currently expects numbers. Keep float for now.
                "personal_pool_balance": float(pool),
                "exposure": float(exposure),
                "available": float(available),
                "clans_count": int(meta.get("clans_count", 0) or 0),
            }
        )

    items.sort(key=lambda r: (r.get("exposure") or 0), reverse=True)

    return {"clan_id": cid, "items": items, "total": len(items)}


@router.get("/admin/cci-scores")
def get_cci_scores_for_user(
    clan_id: int = Query(...),
    user_id: int = Query(...),
    x_clan_id: int | None = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Minimal CCI score response (admin only).
    Frontend expects: {score: number}
    """
    _require_admin(current_user)
    cid = _effective_clan_id(clan_id, x_clan_id)

    # If user not in clan => score 0
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == cid,
            ClanMembership.user_id == int(user_id),
        )
        .first()
    )

    if not m:
        return {
            "clan_id": cid,
            "user_id": int(user_id),
            "score": 0,
            "events_counted": 0,
        }

    # MVP stub: simple constant score (tune later)
    return {
        "clan_id": cid,
        "user_id": int(user_id),
        "score": 50,
        "events_counted": 0,
    }