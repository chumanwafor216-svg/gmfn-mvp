from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import TrustEvent


def _to_decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid decimal value: {value}")


def decimal_str(value: Any) -> str:
    return str(_to_decimal(value))


def guarantee_gap_for_loan(
    *,
    loan_amount: Decimal | str | int | float,
    personal_pool: Decimal | str | int | float,
) -> dict[str, Decimal]:
    amount = _to_decimal(loan_amount)
    pool = _to_decimal(personal_pool)

    if amount < Decimal("0"):
        raise HTTPException(status_code=400, detail="loan_amount cannot be negative")
    if pool < Decimal("0"):
        raise HTTPException(status_code=400, detail="personal_pool cannot be negative")

    pool_used = min(amount, pool)
    gap = max(Decimal("0"), amount - pool_used)

    return {
        "loan_amount": amount,
        "personal_pool": pool,
        "pool_used": pool_used,
        "guarantee_gap": gap,
    }


def validate_gap_pledge(
    *,
    guarantee_gap: Decimal | str | int | float,
    pledge_amount: Decimal | str | int | float | None,
) -> dict[str, Any]:
    gap = _to_decimal(guarantee_gap)
    pledge = _to_decimal(pledge_amount) if pledge_amount is not None else Decimal("0")

    pledge_required = gap > Decimal("0")
    pledge_valid = True

    if pledge_required and pledge <= Decimal("0"):
        pledge_valid = False

    if pledge < Decimal("0"):
        pledge_valid = False

    return {
        "guarantee_gap": gap,
        "pledge_amount": pledge,
        "pledge_required": pledge_required,
        "pledge_valid": pledge_valid,
    }


def coverage_ok_for_loan(
    *,
    loan_amount: Decimal | str | int | float,
    personal_pool: Decimal | str | int | float,
    approved_locked_total: Decimal | str | int | float,
    pledge_amount: Decimal | str | int | float | None = None,
) -> dict[str, Any]:
    gap_bits = guarantee_gap_for_loan(
        loan_amount=loan_amount,
        personal_pool=personal_pool,
    )
    pledge_bits = validate_gap_pledge(
        guarantee_gap=gap_bits["guarantee_gap"],
        pledge_amount=pledge_amount,
    )

    approved = _to_decimal(approved_locked_total)
    if approved < Decimal("0"):
        raise HTTPException(status_code=400, detail="approved_locked_total cannot be negative")

    gap = gap_bits["guarantee_gap"]
    coverage_ok = approved >= gap

    if gap == Decimal("0"):
        message = "Within personal pool; no guarantor coverage required"
    elif not pledge_bits["pledge_valid"]:
        message = "Positive guarantee gap requires a positive pledge amount"
    elif coverage_ok:
        message = "Coverage threshold satisfied"
    else:
        message = "Coverage threshold not yet satisfied"

    return {
        "loan_amount": gap_bits["loan_amount"],
        "personal_pool": gap_bits["personal_pool"],
        "pool_used": gap_bits["pool_used"],
        "guarantee_gap": gap,
        "approved_locked_total": approved,
        "pledge_amount": pledge_bits["pledge_amount"],
        "has_positive_gap": gap > Decimal("0"),
        "pledge_required": pledge_bits["pledge_required"],
        "pledge_valid": pledge_bits["pledge_valid"],
        "coverage_ok": coverage_ok,
        "message": message,
    }


def ensure_positive_pledge_for_gap(
    *,
    loan_amount: Decimal | str | int | float,
    personal_pool: Decimal | str | int | float,
    pledge_amount: Decimal | str | int | float | None,
) -> None:
    result = coverage_ok_for_loan(
        loan_amount=loan_amount,
        personal_pool=personal_pool,
        approved_locked_total="0",
        pledge_amount=pledge_amount,
    )
    if result["has_positive_gap"] and not result["pledge_valid"]:
        raise HTTPException(
            status_code=400,
            detail="Guarantee-backed loans require pledge_amount > 0",
        )


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def normalize_expiry_window(
    *,
    created_at: Optional[datetime],
    expires_at: Optional[datetime],
    ttl_hours: int = 48,
) -> tuple[datetime, datetime]:
    created = created_at or now_utc()
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)

    expires = expires_at or (created + timedelta(hours=max(1, ttl_hours)))
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if expires <= created:
        expires = created + timedelta(hours=max(1, ttl_hours))

    return created, expires


def timeout_status(
    *,
    created_at: Optional[datetime],
    expires_at: Optional[datetime],
    ttl_hours: int = 48,
) -> dict[str, Any]:
    created, expires = normalize_expiry_window(
        created_at=created_at,
        expires_at=expires_at,
        ttl_hours=ttl_hours,
    )
    remaining = int((expires - now_utc()).total_seconds())
    return {
        "created_at": created.isoformat(),
        "expires_at": expires.isoformat(),
        "is_expired": remaining <= 0,
        "seconds_remaining": max(0, remaining),
    }


def _normalize_reason(reason: Optional[str]) -> Optional[str]:
    if reason is None:
        return None
    text = str(reason).strip()
    return text or None


def trust_event_duplicate_exists(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    loan_id: Optional[int] = None,
    guarantor_id: Optional[int] = None,
    reason: Optional[str] = None,
) -> bool:
    rows = (
        db.query(TrustEvent)
        .filter(
            TrustEvent.subject_user_id == int(user_id),
            TrustEvent.event_type == str(event_type),
        )
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(50)
        .all()
    )

    norm_reason = _normalize_reason(reason)

    for row in rows:
        meta = getattr(row, "meta", None) or {}
        if not isinstance(meta, dict):
            continue

        row_loan_id = getattr(row, "loan_id", None) or meta.get("loan_id")
        row_guarantor_id = getattr(row, "guarantor_id", None) or meta.get("guarantor_id")
        row_reason = _normalize_reason(meta.get("reason"))

        if loan_id is not None and str(row_loan_id) != str(loan_id):
            continue
        if guarantor_id is not None and str(row_guarantor_id) != str(guarantor_id):
            continue
        if norm_reason is not None and row_reason != norm_reason:
            continue

        return True

    return False


def assert_no_duplicate_trust_event(
    db: Session,
    *,
    user_id: int,
    event_type: str,
    loan_id: Optional[int] = None,
    guarantor_id: Optional[int] = None,
    reason: Optional[str] = None,
) -> None:
    if trust_event_duplicate_exists(
        db,
        user_id=user_id,
        event_type=event_type,
        loan_id=loan_id,
        guarantor_id=guarantor_id,
        reason=reason,
    ):
        raise HTTPException(
            status_code=409,
            detail="Duplicate TrustEvent detected for this context",
        )
