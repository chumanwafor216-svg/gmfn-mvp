from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import CommunityDomain, CommunityDomainGovernancePackage, User

COMMUNITY_DOMAIN_GOVERNANCE_PACKAGE_KEY = "domain.governance_package"

DELEGATION_POWER_MODE_OFF = "off"
DELEGATION_POWER_MODE_PREPARE_ONLY = "prepare_only"
DELEGATION_POWER_MODE_REQUEST_OWNER_APPROVAL = "request_owner_approval"
DELEGATION_POWER_MODE_CAN_APPLY_DIRECTLY = "can_apply_directly"
DELEGATION_POWER_MODES = {
    DELEGATION_POWER_MODE_OFF,
    DELEGATION_POWER_MODE_PREPARE_ONLY,
    DELEGATION_POWER_MODE_REQUEST_OWNER_APPROVAL,
    DELEGATION_POWER_MODE_CAN_APPLY_DIRECTLY,
}

DELEGATION_POWER_MEMBER_APPROVAL = "member_approval"
DELEGATION_POWER_OFFICIAL_NOTICES = "official_notices"
DELEGATION_POWER_BILLING_ADMIN = "billing_admin"
DELEGATION_POWER_PAYMENT_CONFIRMATION = "payment_confirmation"
DELEGATION_POWER_COLLECTIONS_ADMIN = "collections_admin"
DELEGATION_POWER_MARKETPLACE_OPERATION = "marketplace_operation"
DELEGATION_POWER_RECORDS_REPORTS = "records_reports"
DELEGATION_POWER_GOVERNANCE_EDIT_REQUEST = "governance_edit_request"
DELEGATION_POWER_OWNERSHIP_TRANSFER = "ownership_transfer"
DELEGATION_POWER_INSTITUTION_VERIFICATION = "institution_verification"


def _json_load(value: Optional[str]) -> dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def _clean_mode(value: Any, default: str = DELEGATION_POWER_MODE_OFF) -> str:
    text = str(value or "").strip().lower()
    return text if text else default


def latest_domain_governance_package(
    db: Session,
    *,
    community_domain_id: int,
) -> Optional[CommunityDomainGovernancePackage]:
    return (
        db.query(CommunityDomainGovernancePackage)
        .filter(CommunityDomainGovernancePackage.community_domain_id == int(community_domain_id))
        .filter(CommunityDomainGovernancePackage.package_key == COMMUNITY_DOMAIN_GOVERNANCE_PACKAGE_KEY)
        .order_by(
            CommunityDomainGovernancePackage.version.desc(),
            CommunityDomainGovernancePackage.id.desc(),
        )
        .first()
    )


def locked_domain_delegation_package(
    db: Session,
    *,
    community_domain_id: int,
) -> dict[str, Any]:
    latest = latest_domain_governance_package(
        db,
        community_domain_id=int(community_domain_id),
    )
    if latest is None:
        return {}
    package = _json_load(latest.package_json)
    delegation_package = (
        package.get("delegation_package") if isinstance(package, dict) else None
    )
    return delegation_package if isinstance(delegation_package, dict) else {}


def domain_delegation_power_mode(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    power_key: str,
) -> str:
    delegation_package = locked_domain_delegation_package(
        db,
        community_domain_id=int(domain.id),
    )
    try:
        operator_user_id = int(delegation_package.get("operator_user_id") or 0)
    except (TypeError, ValueError):
        operator_user_id = 0
    if operator_user_id != int(current_user.id):
        return DELEGATION_POWER_MODE_OFF

    powers = delegation_package.get("powers")
    if not isinstance(powers, dict):
        return DELEGATION_POWER_MODE_OFF
    mode = _clean_mode(powers.get(power_key), DELEGATION_POWER_MODE_OFF)
    if mode not in DELEGATION_POWER_MODES:
        return DELEGATION_POWER_MODE_OFF
    return mode


def has_domain_direct_delegation_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
    power_key: str,
) -> bool:
    return (
        domain_delegation_power_mode(
            db,
            domain=domain,
            current_user=current_user,
            power_key=power_key,
        )
        == DELEGATION_POWER_MODE_CAN_APPLY_DIRECTLY
    )


def domain_for_clan(
    db: Session,
    *,
    clan_id: int,
) -> Optional[CommunityDomain]:
    return (
        db.query(CommunityDomain)
        .filter(CommunityDomain.clan_id == int(clan_id))
        .order_by(CommunityDomain.id.desc())
        .first()
    )


def has_clan_domain_direct_delegation_scope(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
    power_key: str,
) -> bool:
    domain = domain_for_clan(db, clan_id=int(clan_id))
    if domain is None:
        return False
    return has_domain_direct_delegation_scope(
        db,
        domain=domain,
        current_user=current_user,
        power_key=power_key,
    )
