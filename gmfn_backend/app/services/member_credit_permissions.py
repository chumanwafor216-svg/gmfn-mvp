from __future__ import annotations

import json
from typing import Iterable

from sqlalchemy.orm import Session

from app.db.models import UserSettings


SUPPORTED_MEMBER_CREDIT_SERVICE_CODES = frozenset({"spotlight.single_day"})
MEMBER_CREDIT_SERVICE_CONTRACTS = {
    'spotlight.single_day': {
        'service_name': 'Spotlight',
        'scope': 'One eligible shop campaign for one 24-hour activation period.',
        'workflow_url': '/app/shop-control#shop-control-spotlight',
    },
}


def _member_credit_error(code: str) -> RuntimeError:
    from app.services.member_credit_service import MemberCreditError

    return MemberCreditError(code)


def parse_member_credit_service_permissions(raw: str | None) -> dict[str, bool]:
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    if not isinstance(payload, dict):
        return {}
    return {
        str(code): bool(enabled)
        for code, enabled in payload.items()
        if str(code) in SUPPORTED_MEMBER_CREDIT_SERVICE_CODES
    }


def serialize_member_credit_service_permissions(value: dict[str, bool]) -> str:
    normalized = {
        str(code): bool(enabled)
        for code, enabled in value.items()
        if str(code) in SUPPORTED_MEMBER_CREDIT_SERVICE_CODES
    }
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"))


def get_member_credit_service_permissions(
    db: Session,
    *,
    member_user_id: int,
    service_codes: Iterable[str] | None = None,
    for_update: bool = False,
) -> dict[str, bool]:
    query = db.query(UserSettings).filter(UserSettings.user_id == int(member_user_id))
    if for_update:
        query = query.with_for_update()
    row = query.one_or_none()
    stored = parse_member_credit_service_permissions(
        getattr(row, "member_credit_service_permissions_json", None) if row else None
    )
    requested = {
        str(code)
        for code in (service_codes or SUPPORTED_MEMBER_CREDIT_SERVICE_CODES)
        if str(code) in SUPPORTED_MEMBER_CREDIT_SERVICE_CODES
    }
    return {code: bool(stored.get(code, False)) for code in sorted(requested)}


def set_member_credit_service_permission(
    db: Session,
    *,
    member_user_id: int,
    service_code: str,
    enabled: bool,
    commit: bool = True,
) -> dict[str, bool]:
    code = str(service_code or "").strip()
    if code not in SUPPORTED_MEMBER_CREDIT_SERVICE_CODES:
        raise _member_credit_error('member_credit_service_not_supported')
    row = (
        db.query(UserSettings)
        .filter(UserSettings.user_id == int(member_user_id))
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        row = UserSettings(user_id=int(member_user_id))
        db.add(row)
        db.flush()
    stored = parse_member_credit_service_permissions(
        getattr(row, "member_credit_service_permissions_json", None)
    )
    stored[code] = bool(enabled)
    row.member_credit_service_permissions_json = serialize_member_credit_service_permissions(stored)
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    return get_member_credit_service_permissions(
        db,
        member_user_id=int(member_user_id),
        service_codes=[code],
    )


def require_member_credit_service_permission(
    db: Session,
    *,
    member_user_id: int,
    service_code: str,
) -> None:
    permissions = get_member_credit_service_permissions(
        db,
        member_user_id=int(member_user_id),
        service_codes=[service_code],
        for_update=True,
    )
    if not permissions.get(str(service_code), False):
        raise _member_credit_error('member_credit_service_permission_required')
