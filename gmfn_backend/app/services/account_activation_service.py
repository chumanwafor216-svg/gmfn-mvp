from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.db.models import (
    AccountActivationAssistanceChallenge,
    AccountActivationGrant,
    User,
)


ACTIVATION_LIFETIME = timedelta(hours=1)
STATUS_LIFETIME = timedelta(days=30)
ASSISTED_CODE_LIFETIME = timedelta(minutes=15)
ASSISTED_CODE_ISSUE_COOLDOWN = timedelta(minutes=1)
ASSISTED_CODE_ISSUE_WINDOW = timedelta(hours=1)
ASSISTED_CODE_MAX_ISSUES = 5
ASSISTED_CODE_MAX_CHECKS = 5


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


@dataclass(frozen=True)
class IssuedAssistedActivationChallenge:
    row: AccountActivationAssistanceChallenge
    code: str


@dataclass(frozen=True)
class AssistedActivationConfirmation:
    row: AccountActivationAssistanceChallenge | None
    activation_token: str | None
    error_code: str | None


def _utc(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


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


def rotate_authorized_activation_token(
    db: Session, *, grant: AccountActivationGrant
) -> str:
    row = (
        db.query(AccountActivationGrant)
        .filter(AccountActivationGrant.id == int(grant.id))
        .with_for_update()
        .first()
    )
    now = _now()
    if (
        row is None
        or row.revoked_at is not None
        or row.consumed_at is not None
        or row.activation_authorized_at is None
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "activation_recovery_unavailable",
                "message": "This approved activation can no longer be recovered. Sign in or ask the community administrator for help.",
                "next_action": "account_recovery",
            },
        )

    activation_token = _secret()
    row.activation_token_digest = _digest(activation_token)
    row.activation_expires_at = now + ACTIVATION_LIFETIME
    db.add(row)
    return activation_token


def issue_assisted_activation_challenge(
    db: Session,
    *,
    grant: AccountActivationGrant,
    clan_id: int,
    applicant_user_id: int,
    issued_by_user_id: int,
    verification_note: str,
) -> IssuedAssistedActivationChallenge:
    now = _now()
    locked_grant = (
        db.query(AccountActivationGrant)
        .filter(AccountActivationGrant.id == int(grant.id))
        .with_for_update()
        .first()
    )
    if (
        locked_grant is None
        or locked_grant.join_request_id is None
        or locked_grant.revoked_at is not None
        or locked_grant.consumed_at is not None
        or locked_grant.activation_authorized_at is None
    ):
        raise HTTPException(status_code=409, detail="Activation assistance is no longer available")

    latest = (
        db.query(AccountActivationAssistanceChallenge)
        .filter(
            AccountActivationAssistanceChallenge.join_request_id
            == int(locked_grant.join_request_id)
        )
        .order_by(
            AccountActivationAssistanceChallenge.created_at.desc(),
            AccountActivationAssistanceChallenge.id.desc(),
        )
        .first()
    )
    latest_created_at = _utc(getattr(latest, "created_at", None))
    if latest_created_at is not None and latest_created_at > now - ASSISTED_CODE_ISSUE_COOLDOWN:
        wait_seconds = max(
            1,
            int((latest_created_at + ASSISTED_CODE_ISSUE_COOLDOWN - now).total_seconds()),
        )
        raise HTTPException(
            status_code=429,
            detail={
                "code": "activation_assistance_cooldown",
                "message": f"Wait {wait_seconds} seconds before creating another private code.",
                "retry_after_seconds": wait_seconds,
            },
            headers={"Retry-After": str(wait_seconds)},
        )

    issued_count = (
        db.query(AccountActivationAssistanceChallenge)
        .filter(
            AccountActivationAssistanceChallenge.join_request_id
            == int(locked_grant.join_request_id),
            AccountActivationAssistanceChallenge.created_at
            >= now - ASSISTED_CODE_ISSUE_WINDOW,
        )
        .count()
    )
    if issued_count >= ASSISTED_CODE_MAX_ISSUES:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "activation_assistance_issue_limit",
                "message": "Too many private codes were created for this request. Wait one hour before trying again.",
            },
        )

    open_rows = (
        db.query(AccountActivationAssistanceChallenge)
        .filter(
            AccountActivationAssistanceChallenge.join_request_id
            == int(locked_grant.join_request_id),
            AccountActivationAssistanceChallenge.consumed_at.is_(None),
            AccountActivationAssistanceChallenge.revoked_at.is_(None),
        )
        .with_for_update()
        .all()
    )
    for row in open_rows:
        row.revoked_at = now
        db.add(row)

    code = f"{secrets.randbelow(1_000_000):06d}"
    row = AccountActivationAssistanceChallenge(
        activation_grant_id=int(locked_grant.id),
        join_request_id=int(locked_grant.join_request_id),
        clan_id=int(clan_id),
        applicant_user_id=int(applicant_user_id),
        issued_by_user_id=int(issued_by_user_id),
        code_digest=hash_password(code),
        verification_note=str(verification_note).strip()[:240],
        check_attempts=0,
        expires_at=now + ASSISTED_CODE_LIFETIME,
        created_at=now,
    )
    db.add(row)
    db.flush()
    return IssuedAssistedActivationChallenge(row=row, code=code)


def confirm_assisted_activation_challenge(
    db: Session,
    *,
    grant: AccountActivationGrant,
    applicant_user_id: int,
    code: str,
) -> AssistedActivationConfirmation:
    now = _now()
    row = (
        db.query(AccountActivationAssistanceChallenge)
        .filter(
            AccountActivationAssistanceChallenge.activation_grant_id == int(grant.id),
            AccountActivationAssistanceChallenge.join_request_id
            == int(grant.join_request_id or 0),
            AccountActivationAssistanceChallenge.applicant_user_id
            == int(applicant_user_id),
            AccountActivationAssistanceChallenge.consumed_at.is_(None),
            AccountActivationAssistanceChallenge.revoked_at.is_(None),
        )
        .order_by(
            AccountActivationAssistanceChallenge.created_at.desc(),
            AccountActivationAssistanceChallenge.id.desc(),
        )
        .with_for_update()
        .first()
    )
    if row is None:
        return AssistedActivationConfirmation(None, None, "invalid_or_expired")

    expires_at = _utc(row.expires_at)
    if expires_at is None or expires_at <= now or row.check_attempts >= ASSISTED_CODE_MAX_CHECKS:
        row.revoked_at = now
        db.add(row)
        return AssistedActivationConfirmation(row, None, "invalid_or_expired")

    row.check_attempts = int(row.check_attempts or 0) + 1
    if not verify_password(str(code), row.code_digest):
        if row.check_attempts >= ASSISTED_CODE_MAX_CHECKS:
            row.revoked_at = now
        db.add(row)
        return AssistedActivationConfirmation(row, None, "invalid_or_expired")

    parallel_rows = (
        db.query(AccountActivationAssistanceChallenge)
        .filter(
            AccountActivationAssistanceChallenge.join_request_id == int(row.join_request_id),
            AccountActivationAssistanceChallenge.consumed_at.is_(None),
            AccountActivationAssistanceChallenge.revoked_at.is_(None),
        )
        .with_for_update()
        .all()
    )
    for challenge in parallel_rows:
        if int(challenge.id) == int(row.id):
            challenge.confirmed_at = now
            challenge.consumed_at = now
        else:
            challenge.revoked_at = now
        db.add(challenge)

    activation_token = rotate_authorized_activation_token(db, grant=grant)
    return AssistedActivationConfirmation(row, activation_token, None)

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
