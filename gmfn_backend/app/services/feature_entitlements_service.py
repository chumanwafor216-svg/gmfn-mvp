from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import FeatureEntitlement, FeatureUsageEvent


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _expiry_for_cycle(
    *,
    starts_at: datetime,
    billing_cycle: str,
) -> datetime:
    cycle = _safe_str(billing_cycle, "annual").lower()
    if cycle == "monthly":
        return starts_at + timedelta(days=30)
    if cycle == "weekly":
        return starts_at + timedelta(days=7)
    return starts_at + timedelta(days=365)


def _is_active_row(row: FeatureEntitlement, now: Optional[datetime] = None) -> bool:
    current = now or _now_utc()

    status = _safe_str(getattr(row, "status", None), "active").lower()
    if status != "active":
        return False

    revoked_at = _to_aware(getattr(row, "revoked_at", None))
    if revoked_at is not None:
        return False

    expires_at = _to_aware(getattr(row, "expires_at", None))
    if expires_at is not None and expires_at < current:
        return False

    return True


def get_active_entitlements(
    db: Session,
    *,
    owner_user_id: int,
    feature_code: str,
    shop_id: Optional[int] = None,
    clan_id: Optional[int] = None,
) -> list[FeatureEntitlement]:
    q = db.query(FeatureEntitlement).filter(
        FeatureEntitlement.owner_user_id == int(owner_user_id),
        FeatureEntitlement.feature_code == _safe_str(feature_code),
    )

    if shop_id is not None:
        q = q.filter(FeatureEntitlement.shop_id == int(shop_id))

    if clan_id is not None:
        q = q.filter(FeatureEntitlement.clan_id == int(clan_id))

    rows = q.order_by(
        FeatureEntitlement.expires_at.asc(),
        FeatureEntitlement.id.asc(),
    ).all()

    now = _now_utc()
    return [row for row in rows if _is_active_row(row, now=now)]


def get_active_feature_quantity(
    db: Session,
    *,
    owner_user_id: int,
    feature_code: str,
    shop_id: Optional[int] = None,
    clan_id: Optional[int] = None,
) -> int:
    rows = get_active_entitlements(
        db,
        owner_user_id=int(owner_user_id),
        feature_code=feature_code,
        shop_id=shop_id,
        clan_id=clan_id,
    )

    total = 0
    for row in rows:
        quantity_total = _safe_int(getattr(row, "quantity_total", None), 0)
        quantity_used = _safe_int(getattr(row, "quantity_used", None), 0)
        remaining = max(0, quantity_total - quantity_used)
        total += remaining
    return total


def has_active_feature(
    db: Session,
    *,
    owner_user_id: int,
    feature_code: str,
    shop_id: Optional[int] = None,
    clan_id: Optional[int] = None,
) -> bool:
    return (
        get_active_feature_quantity(
            db,
            owner_user_id=int(owner_user_id),
            feature_code=feature_code,
            shop_id=shop_id,
            clan_id=clan_id,
        )
        > 0
    )


def grant_or_extend_entitlement(
    db: Session,
    *,
    owner_user_id: int,
    feature_code: str,
    plan_code: str,
    payment_reference: str,
    quantity_total: int = 1,
    shop_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    billing_cycle: str = "annual",
    starts_at: Optional[datetime] = None,
    commit: bool = True,
    refresh: bool = True,
) -> FeatureEntitlement:
    payment_ref = _safe_str(payment_reference)
    if not payment_ref:
        raise ValueError("payment_reference is required")

    existing = (
        db.query(FeatureEntitlement)
        .filter(FeatureEntitlement.payment_reference == payment_ref)
        .filter(FeatureEntitlement.feature_code == _safe_str(feature_code))
        .first()
    )
    if existing:
        return existing

    starts = _to_aware(starts_at) or _now_utc()
    expires = _expiry_for_cycle(starts_at=starts, billing_cycle=billing_cycle)

    row = FeatureEntitlement(
        owner_user_id=int(owner_user_id),
        clan_id=int(clan_id) if clan_id is not None else None,
        shop_id=int(shop_id) if shop_id is not None else None,
        feature_code=_safe_str(feature_code),
        plan_code=_safe_str(plan_code),
        quantity_total=max(1, int(quantity_total or 1)),
        quantity_used=0,
        status="active",
        starts_at=starts,
        expires_at=expires,
        revoked_at=None,
        payment_reference=payment_ref,
    )

    db.add(row)
    if commit:
        db.commit()
        if refresh:
            db.refresh(row)
    else:
        db.flush()
        if refresh:
            db.refresh(row)

    return row


def consume_feature_units(
    db: Session,
    *,
    owner_user_id: int,
    feature_code: str,
    units: int = 1,
    shop_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    reference_key: Optional[str] = None,
    note: Optional[str] = None,
    commit: bool = True,
) -> Dict[str, Any]:
    requested = max(1, int(units or 1))
    remaining = requested

    rows = get_active_entitlements(
        db,
        owner_user_id=int(owner_user_id),
        feature_code=feature_code,
        shop_id=shop_id,
        clan_id=clan_id,
    )

    if not rows:
        return {
            "ok": False,
            "consumed": 0,
            "requested": requested,
            "reason": "no_active_entitlement",
        }

    consumed = 0
    used_rows = []

    for row in rows:
        qty_total = _safe_int(getattr(row, "quantity_total", None), 0)
        qty_used = _safe_int(getattr(row, "quantity_used", None), 0)
        available = max(0, qty_total - qty_used)
        if available <= 0:
            continue

        take = min(available, remaining)
        if take <= 0:
            continue

        row.quantity_used = qty_used + take
        db.add(row)

        usage = FeatureUsageEvent(
            entitlement_id=int(row.id),
            owner_user_id=int(owner_user_id),
            clan_id=int(clan_id) if clan_id is not None else None,
            shop_id=int(shop_id) if shop_id is not None else None,
            feature_code=_safe_str(feature_code),
            units_used=int(take),
            reference_key=_safe_str(reference_key) or None,
            note=_safe_str(note) or None,
        )
        db.add(usage)

        consumed += take
        remaining -= take
        used_rows.append(int(row.id))

        if remaining <= 0:
            break

    if commit:
        db.commit()

    return {
        "ok": consumed == requested,
        "consumed": consumed,
        "requested": requested,
        "remaining_unfulfilled": remaining,
        "entitlement_ids": used_rows,
    }