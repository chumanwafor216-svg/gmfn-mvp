# app/api/routes/pool.py
from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, inspect
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, LoanGuarantor, User
from app.schemas.pool import PoolMeOut, PoolRequestIn, PoolEventOut
from app.services.pool_service import (
    compute_pool_balances,
    request_deposit,
    request_withdrawal,
    build_reference,
)

router = APIRouter(prefix="/pool", tags=["pool"])


def _money(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _money_str(value: Any) -> str:
    return str(_money(value).quantize(Decimal("0.01")))


def _community_code(clan: Clan | None) -> str | None:
    if not clan:
        return None
    saved = str(getattr(clan, "community_code", "") or "").strip()
    if saved:
        return saved
    return f"GMFN-C-{int(clan.id):06d}"


def _table_has_columns(db: Session, table_name: str, column_names: set[str]) -> bool:
    try:
        inspector = inspect(db.get_bind())
        available = {column["name"] for column in inspector.get_columns(table_name)}
    except Exception:
        return False
    return column_names.issubset(available)


@router.get("/me/summary", response_model=dict[str, Any])
def pool_me_summary(
    currency: str = Query("NGN"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cumulative member finance signal across all active communities.

    This is a summary contract for Community Home / Finance. It does not replace
    the deeper per-community pool file; it gathers the member's visible totals
    so the UI can show one honest cross-community finance reading.
    """
    ccy = (currency or "NGN").strip().upper() or "NGN"

    rows = (
        db.query(ClanMembership, Clan)
        .join(Clan, Clan.id == ClanMembership.clan_id)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(Clan.id.asc())
        .all()
    )

    totals = {
        "available_balance": Decimal("0"),
        "pending_deposits": Decimal("0"),
        "pending_withdrawals": Decimal("0"),
        "reserved_pool": Decimal("0"),
        "effective_available": Decimal("0"),
        "withdrawable_now": Decimal("0"),
        "membership_pool_balance": Decimal("0"),
    }
    items: list[dict[str, Any]] = []

    for membership, clan in rows:
        balances = compute_pool_balances(
            db,
            clan_id=int(clan.id),
            user_id=int(current_user.id),
            currency=ccy,
        )
        membership_pool = _money(getattr(membership, "personal_pool_balance", None))

        for key in (
            "available_balance",
            "pending_deposits",
            "pending_withdrawals",
            "reserved_pool",
            "effective_available",
            "withdrawable_now",
        ):
            source_key = "available" if key == "available_balance" else key
            totals[key] += _money(balances.get(source_key))
        totals["membership_pool_balance"] += membership_pool

        items.append(
            {
                "clan_id": int(clan.id),
                "community_code": _community_code(clan),
                "clan_name": getattr(clan, "name", None),
                "marketplace_name": getattr(clan, "marketplace_name", None),
                "currency": ccy,
                "available_balance": _money_str(balances.get("available")),
                "pending_deposits": _money_str(balances.get("pending_deposits")),
                "pending_withdrawals": _money_str(balances.get("pending_withdrawals")),
                "reserved_pool": _money_str(balances.get("reserved_pool")),
                "effective_available": _money_str(balances.get("effective_available")),
                "withdrawable_now": _money_str(balances.get("withdrawable_now")),
                "membership_pool_balance": _money_str(membership_pool),
                "reference": build_reference(clan_id=int(clan.id), user_id=int(current_user.id)),
            }
        )

    if _table_has_columns(db, "loan_guarantors", {"locked_amount", "released_amount"}):
        locked_guarantees_raw = (
            db.query(
                func.coalesce(
                    func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount),
                    0,
                )
            )
            .filter(
                LoanGuarantor.guarantor_user_id == int(current_user.id),
                LoanGuarantor.status == "approved",
            )
            .scalar()
        )
        locked_guarantees = max(Decimal("0"), _money(locked_guarantees_raw))
    else:
        locked_guarantees = Decimal("0")

    return {
        "user_id": int(current_user.id),
        "gmfn_id": getattr(current_user, "gmfn_id", None),
        "currency": ccy,
        "communities_count": len(items),
        "totals": {
            "available_balance": _money_str(totals["available_balance"]),
            "pending_deposits": _money_str(totals["pending_deposits"]),
            "pending_withdrawals": _money_str(totals["pending_withdrawals"]),
            "reserved_pool": _money_str(totals["reserved_pool"]),
            "effective_available": _money_str(totals["effective_available"]),
            "withdrawable_now": _money_str(totals["withdrawable_now"]),
            "membership_pool_balance": _money_str(totals["membership_pool_balance"]),
            "guarantee_locked_as_guarantor": _money_str(locked_guarantees),
        },
        "items": items,
    }


@router.get("/me", response_model=PoolMeOut)
def pool_me(
    limit: int = Query(20, ge=1, le=200),
    currency: str = Query("NGN"),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    uid = int(current_user.id)
    cid = int(clan.id)

    bal = compute_pool_balances(db, clan_id=cid, user_id=uid, currency=currency)

    # recent events
    from app.db.models import PoolEvent

    rows = (
        db.query(PoolEvent)
        .filter(
            PoolEvent.clan_id == cid,
            PoolEvent.user_id == uid,
            PoolEvent.currency == currency,
        )
        .order_by(PoolEvent.id.desc())
        .limit(int(limit))
        .all()
    )

    # IMPORTANT: serialize Decimals as strings at API boundary (PoolMeOut expects strings)
    out = {
        "clan_id": cid,
        "user_id": uid,
        "currency": currency,
        "available_balance": str(bal.get("available", "0")),
        "pending_deposits": str(bal.get("pending_deposits", "0")),
        "pending_withdrawals": str(bal.get("pending_withdrawals", "0")),
        "reference": build_reference(clan_id=cid, user_id=uid),
        "recent_events": list(reversed([PoolEventOut.model_validate(r) for r in rows])),
    }

    # If your PoolMeOut schema includes these (from the “reserved/effective” work), return them too.
    # If it DOESN'T, remove these 2 lines.
    if "reserved_pool" in getattr(PoolMeOut, "model_fields", {}):
        out["reserved_pool"] = str(bal.get("reserved_pool", "0"))
    if "effective_available" in getattr(PoolMeOut, "model_fields", {}):
        out["effective_available"] = str(bal.get("effective_available", bal.get("available", "0")))
    if "withdrawable_now" in getattr(PoolMeOut, "model_fields", {}):
        out["withdrawable_now"] = str(bal.get("withdrawable_now", bal.get("effective_available", bal.get("available", "0"))))

    return out


@router.post("/deposits/request", response_model=PoolEventOut)
def deposit_request(
    payload: PoolRequestIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    try:
        e = request_deposit(
            db,
            clan_id=int(clan.id),
            user_id=int(current_user.id),
            amount=payload.amount,
            currency=payload.currency,
            note=payload.note,
        )
        db.commit()
        db.refresh(e)
        return PoolEventOut.model_validate(e)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/withdrawals/request", response_model=PoolEventOut)
def withdrawal_request(
    payload: PoolRequestIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    try:
        e = request_withdrawal(
            db,
            clan_id=int(clan.id),
            user_id=int(current_user.id),
            amount=payload.amount,
            currency=payload.currency,
            note=payload.note,
        )
        db.commit()
        db.refresh(e)
        return PoolEventOut.model_validate(e)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
