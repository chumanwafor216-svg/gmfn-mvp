# app/api/routes/pool.py
from __future__ import annotations

from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, cast, func, inspect
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, Loan, LoanGuarantor, PoolEvent, User
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
    include_all_currencies: bool = Query(False),
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

    active_clan_ids = [int(clan.id) for _, clan in rows]

    def build_currency_summary(
        target_currency: str,
        *,
        include_legacy_membership_pool: bool,
    ) -> dict[str, Any]:
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
                currency=target_currency,
            )
            membership_pool = (
                _money(getattr(membership, "personal_pool_balance", None))
                if include_legacy_membership_pool
                else Decimal("0")
            )

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

            item = {
                "clan_id": int(clan.id),
                "community_code": _community_code(clan),
                "clan_name": getattr(clan, "name", None),
                "marketplace_name": getattr(clan, "marketplace_name", None),
                "currency": target_currency,
                "available_balance": _money_str(balances.get("available")),
                "pending_deposits": _money_str(balances.get("pending_deposits")),
                "pending_withdrawals": _money_str(balances.get("pending_withdrawals")),
                "reserved_pool": _money_str(balances.get("reserved_pool")),
                "effective_available": _money_str(balances.get("effective_available")),
                "withdrawable_now": _money_str(balances.get("withdrawable_now")),
                "reference": build_reference(
                    clan_id=int(clan.id),
                    user_id=int(current_user.id),
                ),
            }
            if include_legacy_membership_pool:
                item["membership_pool_balance"] = _money_str(membership_pool)
            items.append(item)

        if (
            active_clan_ids
            and _table_has_columns(
                db,
                "loan_guarantors",
                {"locked_amount", "released_amount"},
            )
        ):
            locked_guarantees_raw = (
                db.query(
                    func.coalesce(
                        func.sum(
                            LoanGuarantor.locked_amount
                            - LoanGuarantor.released_amount
                        ),
                        0,
                    )
                )
                .join(Loan, Loan.id == LoanGuarantor.loan_id)
                .filter(
                    cast(LoanGuarantor.guarantor_user_id, String)
                    == str(int(current_user.id)),
                    LoanGuarantor.clan_id.in_(active_clan_ids),
                    LoanGuarantor.status == "approved",
                    Loan.currency == target_currency,
                )
                .scalar()
            )
            locked_guarantees = max(
                Decimal("0"),
                _money(locked_guarantees_raw),
            )
        else:
            locked_guarantees = Decimal("0")

        summary_totals = {
            "available_balance": _money_str(totals["available_balance"]),
            "pending_deposits": _money_str(totals["pending_deposits"]),
            "pending_withdrawals": _money_str(totals["pending_withdrawals"]),
            "reserved_pool": _money_str(totals["reserved_pool"]),
            "effective_available": _money_str(totals["effective_available"]),
            "withdrawable_now": _money_str(totals["withdrawable_now"]),
            "guarantee_locked_as_guarantor": _money_str(locked_guarantees),
        }
        if include_legacy_membership_pool:
            summary_totals["membership_pool_balance"] = _money_str(
                totals["membership_pool_balance"]
            )

        return {
            "currency": target_currency,
            "communities_count": len(items),
            "totals": summary_totals,
            "items": items,
        }

    primary_summary = build_currency_summary(
        ccy,
        include_legacy_membership_pool=True,
    )
    currency_summaries: list[dict[str, Any]] = []

    if include_all_currencies and active_clan_ids:
        recorded_currencies: set[str] = set()

        for (value,) in (
            db.query(PoolEvent.currency)
            .filter(
                PoolEvent.clan_id.in_(active_clan_ids),
                cast(PoolEvent.user_id, String) == str(int(current_user.id)),
            )
            .distinct()
            .all()
        ):
            normalized = str(value or "").strip().upper()
            if normalized:
                recorded_currencies.add(normalized)

        for (value,) in (
            db.query(Loan.currency)
            .filter(
                Loan.clan_id.in_(active_clan_ids),
                cast(Loan.borrower_user_id, String) == str(int(current_user.id)),
            )
            .distinct()
            .all()
        ):
            normalized = str(value or "").strip().upper()
            if normalized:
                recorded_currencies.add(normalized)

        for (value,) in (
            db.query(Loan.currency)
            .join(LoanGuarantor, LoanGuarantor.loan_id == Loan.id)
            .filter(
                LoanGuarantor.clan_id.in_(active_clan_ids),
                cast(LoanGuarantor.guarantor_user_id, String)
                == str(int(current_user.id)),
            )
            .distinct()
            .all()
        ):
            normalized = str(value or "").strip().upper()
            if normalized:
                recorded_currencies.add(normalized)

        currency_summaries = [
            build_currency_summary(
                recorded_currency,
                include_legacy_membership_pool=False,
            )
            for recorded_currency in sorted(recorded_currencies)
        ]

    return {
        "user_id": int(current_user.id),
        "gmfn_id": getattr(current_user, "gmfn_id", None),
        "currency": ccy,
        "communities_count": primary_summary["communities_count"],
        "totals": primary_summary["totals"],
        "items": primary_summary["items"],
        "currency_summaries": currency_summaries,
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
            cast(PoolEvent.user_id, String) == str(uid),
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
