from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import FeatureEntitlement, FeatureUsageEvent


class _EntitlementConsumptionConflict(RuntimeError):
    pass


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
    if expires_at is not None and expires_at <= current:
        return False

    return True


def get_active_entitlements(
    db: Session,
    *,
    owner_user_id: int,
    feature_code: str,
    shop_id: Optional[int] = None,
    clan_id: Optional[int] = None,
    now: Optional[datetime] = None,
    lock_for_update: bool = False,
) -> list[FeatureEntitlement]:
    q = db.query(FeatureEntitlement).filter(
        FeatureEntitlement.owner_user_id == int(owner_user_id),
        FeatureEntitlement.feature_code == _safe_str(feature_code),
    )

    if shop_id is not None:
        q = q.filter(FeatureEntitlement.shop_id == int(shop_id))

    if clan_id is not None:
        q = q.filter(FeatureEntitlement.clan_id == int(clan_id))

    q = q.order_by(
        FeatureEntitlement.expires_at.asc(),
        FeatureEntitlement.id.asc(),
    )
    if lock_for_update:
        q = q.with_for_update()
    rows = q.all()

    current_time = _to_aware(now) or _now_utc()
    return [row for row in rows if _is_active_row(row, now=current_time)]


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


def get_active_feature_quantity_for_scope(
    db: Session,
    *,
    feature_code: str,
    shop_id: Optional[int] = None,
    clan_id: Optional[int] = None,
) -> int:
    q = db.query(FeatureEntitlement).filter(
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
    total = 0
    for row in rows:
        if not _is_active_row(row, now=now):
            continue
        quantity_total = _safe_int(getattr(row, "quantity_total", None), 0)
        quantity_used = _safe_int(getattr(row, "quantity_used", None), 0)
        total += max(0, quantity_total - quantity_used)
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
    request_fingerprint: Optional[str] = None,
    note: Optional[str] = None,
    commit: bool = True,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    requested = max(1, int(units or 1))
    safe_reference_key = _safe_str(reference_key) or None
    current_time = _to_aware(now) or _now_utc()
    canonical_fingerprint = _feature_usage_fingerprint(
        owner_user_id=int(owner_user_id),
        feature_code=feature_code,
        units=requested,
        shop_id=shop_id,
        clan_id=clan_id,
    )
    supplied_fingerprint = _safe_str(request_fingerprint) or canonical_fingerprint
    if supplied_fingerprint != canonical_fingerprint:
        return {
            "ok": False,
            "consumed": 0,
            "requested": requested,
            "reason": "request_fingerprint_mismatch",
        }

    if safe_reference_key:
        replay = _feature_usage_replay(
            db,
            owner_user_id=int(owner_user_id),
            feature_code=feature_code,
            reference_key=safe_reference_key,
            request_fingerprint=canonical_fingerprint,
            requested=requested,
            shop_id=shop_id,
            clan_id=clan_id,
        )
        if replay is not None:
            return replay

    rows = get_active_entitlements(
        db,
        owner_user_id=int(owner_user_id),
        feature_code=feature_code,
        shop_id=shop_id,
        clan_id=clan_id,
        now=current_time,
        lock_for_update=True,
    )

    if not rows:
        return {
            "ok": False,
            "consumed": 0,
            "requested": requested,
            "reason": "no_active_entitlement",
        }

    if safe_reference_key:
        replay = _feature_usage_replay(
            db,
            owner_user_id=int(owner_user_id),
            feature_code=feature_code,
            reference_key=safe_reference_key,
            request_fingerprint=canonical_fingerprint,
            requested=requested,
            shop_id=shop_id,
            clan_id=clan_id,
        )
        if replay is not None:
            return replay

    total_available = sum(
        max(
            0,
            _safe_int(getattr(row, "quantity_total", None), 0)
            - _safe_int(getattr(row, "quantity_used", None), 0),
        )
        for row in rows
    )
    if total_available < requested:
        return {
            "ok": False,
            "consumed": 0,
            "requested": requested,
            "remaining_unfulfilled": requested,
            "reason": "insufficient_entitlement_units",
        }

    remaining = requested
    used_rows: list[int] = []
    try:
        with db.begin_nested():
            for row in rows:
                qty_total = _safe_int(getattr(row, "quantity_total", None), 0)
                qty_used = _safe_int(getattr(row, "quantity_used", None), 0)
                available = max(0, qty_total - qty_used)
                take = min(available, remaining)
                if take <= 0:
                    continue
                updated = (
                    db.query(FeatureEntitlement)
                    .filter(FeatureEntitlement.id == int(row.id))
                    .filter(FeatureEntitlement.quantity_used == qty_used)
                    .filter(FeatureEntitlement.status == "active")
                    .filter(FeatureEntitlement.revoked_at.is_(None))
                    .filter(FeatureEntitlement.quantity_used + take <= FeatureEntitlement.quantity_total)
                    .update(
                        {FeatureEntitlement.quantity_used: FeatureEntitlement.quantity_used + take},
                        synchronize_session=False,
                    )
                )
                if updated != 1:
                    raise _EntitlementConsumptionConflict("concurrent_entitlement_conflict")
                _persist_feature_usage(
                    db,
                    usage=FeatureUsageEvent(
                        entitlement_id=int(row.id),
                        owner_user_id=int(owner_user_id),
                        clan_id=int(clan_id) if clan_id is not None else None,
                        shop_id=int(shop_id) if shop_id is not None else None,
                        feature_code=_safe_str(feature_code),
                        units_used=int(take),
                        reference_key=safe_reference_key,
                        request_fingerprint=canonical_fingerprint,
                        note=_safe_str(note) or None,
                    ),
                )
                used_rows.append(int(row.id))
                remaining -= take
                if remaining <= 0:
                    break
            if remaining != 0:
                raise _EntitlementConsumptionConflict("incomplete_entitlement_consumption")
            db.flush()
    except _EntitlementConsumptionConflict as exc:
        return {
            "ok": False,
            "consumed": 0,
            "requested": requested,
            "remaining_unfulfilled": requested,
            "reason": str(exc),
        }

    if commit:
        db.commit()

    return {
        "ok": True,
        "consumed": requested,
        "requested": requested,
        "remaining_unfulfilled": 0,
        "entitlement_ids": used_rows,
        "deduped": False,
        "request_fingerprint": canonical_fingerprint,
    }


def _feature_usage_replay(
    db: Session,
    *,
    owner_user_id: int,
    feature_code: str,
    reference_key: str,
    request_fingerprint: str,
    requested: int,
    shop_id: Optional[int],
    clan_id: Optional[int],
) -> Optional[Dict[str, Any]]:
    rows = (
        db.query(FeatureUsageEvent)
        .filter(FeatureUsageEvent.owner_user_id == int(owner_user_id))
        .filter(FeatureUsageEvent.feature_code == _safe_str(feature_code))
        .filter(FeatureUsageEvent.reference_key == reference_key)
        .order_by(FeatureUsageEvent.id.asc())
        .all()
    )
    if not rows:
        return None
    fingerprints = {str(row.request_fingerprint) for row in rows if row.request_fingerprint}
    legacy_scope_matches = all(
        (row.shop_id == (int(shop_id) if shop_id is not None else None))
        and (row.clan_id == (int(clan_id) if clan_id is not None else None))
        for row in rows
    )
    existing_units = sum(int(row.units_used or 0) for row in rows)
    if (
        (fingerprints and fingerprints != {request_fingerprint})
        or (not fingerprints and not legacy_scope_matches)
        or existing_units != int(requested)
    ):
        return {
            "ok": False,
            "consumed": 0,
            "requested": requested,
            "reason": "conflicting_idempotency_fingerprint",
        }
    return {
        "ok": True,
        "consumed": requested,
        "requested": requested,
        "remaining_unfulfilled": 0,
        "entitlement_ids": sorted(
            {int(row.entitlement_id) for row in rows if row.entitlement_id is not None}
        ),
        "deduped": True,
        "request_fingerprint": request_fingerprint,
    }


def _persist_feature_usage(db: Session, *, usage: FeatureUsageEvent) -> None:
    """Failure-injection seam for all-or-nothing multi-row consumption tests."""
    db.add(usage)
    db.flush()


def _feature_usage_fingerprint(
    *,
    owner_user_id: int,
    feature_code: str,
    units: int,
    shop_id: Optional[int],
    clan_id: Optional[int],
) -> str:
    payload = {
        "clan_id": int(clan_id) if clan_id is not None else None,
        "feature_code": _safe_str(feature_code),
        "owner_user_id": int(owner_user_id),
        "shop_id": int(shop_id) if shop_id is not None else None,
        "units": int(units),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()
