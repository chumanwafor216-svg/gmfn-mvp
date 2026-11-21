from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import Clan, User
from app.db.spotlight_commercial_models import SpotlightCommercialPilotEntitlement
from app.services.payment_operations_policy import (
    PaymentOperationsSuspended,
    require_payment_operations_enabled,
)


PILOT_ROLES = frozenset({"merchant", "operator"})


class SpotlightCommercialAccessError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def spotlight_payment_operations_enabled() -> bool:
    value = str(
        os.getenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "0") or "0"
    ).strip().lower()
    return value in {"1", "true", "yes", "on"}


def require_spotlight_payment_operations_enabled() -> None:
    try:
        require_payment_operations_enabled()
    except PaymentOperationsSuspended as exc:
        raise SpotlightCommercialAccessError(
            "payment_operations_suspended",
            str(exc),
        ) from exc
    if not spotlight_payment_operations_enabled():
        raise SpotlightCommercialAccessError(
            "spotlight_payment_operations_suspended",
            "Paid Spotlight collection and spending are installed but disabled.",
        )


def grant_spotlight_pilot_entitlement(
    db: Session,
    *,
    user_id: int,
    clan_id: Optional[int],
    entitlement_role: str,
    granted_by_user_id: int,
    expires_at: Optional[datetime] = None,
    decision_note: Optional[str] = None,
    commit: bool = True,
) -> SpotlightCommercialPilotEntitlement:
    role = str(entitlement_role or "").strip().lower()
    if role not in PILOT_ROLES:
        raise SpotlightCommercialAccessError(
            "invalid_pilot_role",
            "Pilot role must be merchant or operator.",
        )
    target_user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .with_for_update()
        .one_or_none()
    )
    if target_user is None:
        raise SpotlightCommercialAccessError(
            "pilot_user_not_found",
            "The selected pilot user was not found.",
        )
    if db.get(User, int(granted_by_user_id)) is None:
        raise SpotlightCommercialAccessError(
            "pilot_grantor_not_found",
            "The pilot grantor was not found.",
        )
    resolved_clan_id = int(clan_id) if clan_id else None
    if resolved_clan_id is not None and db.get(Clan, resolved_clan_id) is None:
        raise SpotlightCommercialAccessError(
            "pilot_community_not_found",
            "The selected pilot community was not found.",
        )
    row = (
        db.query(SpotlightCommercialPilotEntitlement)
        .filter(SpotlightCommercialPilotEntitlement.user_id == int(user_id))
        .filter(SpotlightCommercialPilotEntitlement.clan_id == resolved_clan_id)
        .filter(SpotlightCommercialPilotEntitlement.entitlement_role == role)
        .one_or_none()
    )
    if row is None:
        row = SpotlightCommercialPilotEntitlement(
            user_id=int(user_id),
            clan_id=resolved_clan_id,
            entitlement_role=role,
            granted_by_user_id=int(granted_by_user_id),
            starts_at=_now(),
            created_at=_now(),
        )
    row.status = "active"
    row.expires_at = _aware(expires_at)
    row.revoked_by_user_id = None
    row.decision_note = str(decision_note or "").strip()[:500] or None
    row.updated_at = _now()
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    return row


def revoke_spotlight_pilot_entitlement(
    db: Session,
    *,
    entitlement_id: int,
    revoked_by_user_id: int,
    decision_note: str,
    commit: bool = True,
) -> SpotlightCommercialPilotEntitlement:
    row = (
        db.query(SpotlightCommercialPilotEntitlement)
        .filter(SpotlightCommercialPilotEntitlement.id == int(entitlement_id))
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        raise SpotlightCommercialAccessError(
            "pilot_entitlement_not_found",
            "Spotlight pilot entitlement not found.",
        )
    row.status = "revoked"
    row.revoked_by_user_id = int(revoked_by_user_id)
    row.decision_note = str(decision_note or "").strip()[:500] or row.decision_note
    row.updated_at = _now()
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    return row


def active_spotlight_pilot_roles(
    db: Session,
    *,
    user_id: int,
    clan_id: Optional[int],
    at: Optional[datetime] = None,
    lock_rows: bool = False,
) -> set[str]:
    current = _aware(at) or _now()
    resolved_clan_id = int(clan_id) if clan_id else -1
    query = (
        db.query(SpotlightCommercialPilotEntitlement)
        .filter(SpotlightCommercialPilotEntitlement.user_id == int(user_id))
        .filter(SpotlightCommercialPilotEntitlement.status == "active")
        .filter(
            SpotlightCommercialPilotEntitlement.clan_id.is_(None)
            | (SpotlightCommercialPilotEntitlement.clan_id == resolved_clan_id)
        )
    )
    if lock_rows:
        query = query.with_for_update()
    rows = query.all()
    return {
        str(row.entitlement_role)
        for row in rows
        if _aware(row.starts_at) <= current
        and (_aware(row.expires_at) is None or _aware(row.expires_at) > current)
    }

def require_spotlight_pilot_entitlement(
    db: Session,
    *,
    user_id: int,
    clan_id: Optional[int],
    funding_classification: str,
) -> str:
    funding = str(funding_classification or "").strip().lower()
    roles = active_spotlight_pilot_roles(
        db,
        user_id=int(user_id),
        clan_id=clan_id,
        lock_rows=True,
    )
    required_role = "merchant" if funding == "merchant_paid" else "operator"
    if required_role == "merchant" and "operator" in roles:
        return "operator"
    if required_role not in roles:
        raise SpotlightCommercialAccessError(
            "spotlight_pilot_not_authorised",
            f"An active {required_role} pilot entitlement is required for this Spotlight action.",
        )
    return required_role
