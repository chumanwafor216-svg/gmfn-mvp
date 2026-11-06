from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import AccountActivationGrant, User


ACTIVATION_LIFETIME = timedelta(hours=1)
STATUS_LIFETIME = timedelta(days=30)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _digest(token: str) -> str:
    return hashlib.sha256(str(token).encode("utf-8")).hexdigest()


def _secret() -> str:
    return secrets.token_urlsafe(32)


def _is_expired(value: datetime | None, *, now: datetime) -> bool:
    if value is None:
        return True
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value <= now


@dataclass(frozen=True)
class IssuedActivationGrant:
    row: AccountActivationGrant
    activation_token: str
    status_token: str | None


def issue_activation_grant(
    db: Session,
    *,
    user_id: int,
    source_type: str,
    join_request_id: int | None = None,
    authorize_activation: bool = False,
) -> IssuedActivationGrant:
    now = _now()
    activation_token = _secret()
    status_token = _secret() if join_request_id is not None else None
    row = AccountActivationGrant(
        user_id=int(user_id),
        join_request_id=(int(join_request_id) if join_request_id is not None else None),
        source_type=str(source_type),
        status_token_digest=(_digest(status_token) if status_token else None),
        activation_token_digest=_digest(activation_token),
        status_expires_at=(now + STATUS_LIFETIME if status_token else None),
        activation_authorized_at=(now if authorize_activation else None),
        activation_expires_at=(now + ACTIVATION_LIFETIME if authorize_activation else None),
        created_at=now,
    )
    db.add(row)
    db.flush()
    return IssuedActivationGrant(row=row, activation_token=activation_token, status_token=status_token)


def authorize_join_activation_grant(
    db: Session, *, join_request_id: int, user_id: int
) -> AccountActivationGrant | None:
    row = (
        db.query(AccountActivationGrant)
        .filter(
            AccountActivationGrant.join_request_id == int(join_request_id),
            AccountActivationGrant.user_id == int(user_id),
            AccountActivationGrant.revoked_at.is_(None),
            AccountActivationGrant.consumed_at.is_(None),
        )
        .with_for_update()
        .first()
    )
    if row is None:
        return None
    now = _now()
    row.activation_authorized_at = now
    row.activation_expires_at = now + ACTIVATION_LIFETIME
    db.add(row)
    return row


def require_status_grant(
    db: Session, *, join_request_id: int, status_token: str
) -> AccountActivationGrant:
    token = str(status_token or "").strip()
    if not token:
        raise HTTPException(status_code=404, detail="Join request not found")
    row = (
        db.query(AccountActivationGrant)
        .filter(
            AccountActivationGrant.join_request_id == int(join_request_id),
            AccountActivationGrant.status_token_digest == _digest(token),
            AccountActivationGrant.revoked_at.is_(None),
        )
        .first()
    )
    if row is None or _is_expired(row.status_expires_at, now=_now()):
        raise HTTPException(status_code=404, detail="Join request not found")
    return row


def require_activation_grant(
    db: Session, *, activation_token: str
) -> tuple[AccountActivationGrant, User]:
    token = str(activation_token or "").strip()
    if not token:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "activation_proof_required",
                "message": "Open the protected activation continuation from the original application browser, or use verified account recovery.",
                "next_action": "account_recovery",
            },
        )
    row = (
        db.query(AccountActivationGrant)
        .filter(AccountActivationGrant.activation_token_digest == _digest(token))
        .first()
    )
    if row is None:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "activation_proof_invalid",
                "message": "This protected activation continuation is invalid or expired. Use verified account recovery for a replacement.",
                "next_action": "account_recovery",
            },
        )
    user = db.query(User).filter(User.id == int(row.user_id)).with_for_update().first()
    if user is None:
        raise HTTPException(status_code=404, detail="Approved member identity not found")
    row = (
        db.query(AccountActivationGrant)
        .filter(AccountActivationGrant.id == int(row.id))
        .with_for_update()
        .first()
    )
    now = _now()
    if (
        row is None
        or row.revoked_at is not None
        or row.consumed_at is not None
        or row.activation_authorized_at is None
        or _is_expired(row.activation_expires_at, now=now)
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "activation_proof_invalid",
                "message": "This protected activation continuation is invalid or expired. Use verified account recovery for a replacement.",
                "next_action": "account_recovery",
            },
        )
    return row, user


def consume_account_activation_grants(
    db: Session, *, successful_grant: AccountActivationGrant
) -> None:
    now = _now()
    rows = (
        db.query(AccountActivationGrant)
        .filter(
            AccountActivationGrant.user_id == int(successful_grant.user_id),
            AccountActivationGrant.revoked_at.is_(None),
        )
        .with_for_update()
        .all()
    )
    for row in rows:
        if int(row.id) == int(successful_grant.id):
            row.consumed_at = now
        else:
            row.revoked_at = now
        db.add(row)


def revoke_account_activation_grants(db: Session, *, user_id: int) -> None:
    now = _now()
    rows = (
        db.query(AccountActivationGrant)
        .filter(
            AccountActivationGrant.user_id == int(user_id),
            AccountActivationGrant.revoked_at.is_(None),
            AccountActivationGrant.consumed_at.is_(None),
        )
        .with_for_update()
        .all()
    )
    for row in rows:
        row.revoked_at = now
        db.add(row)
