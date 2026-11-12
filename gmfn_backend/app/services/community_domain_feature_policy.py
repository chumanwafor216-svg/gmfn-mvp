from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import CommunityDomain, CommunityDomainMembership, CommunityDomainPolicy, User

COMMUNITY_DOMAIN_FEATURE_POLICY_KEY = "domain.feature_policy"
COMMUNITY_DOMAIN_FEATURE_MODE_OFF = "off"
COMMUNITY_DOMAIN_FEATURE_MODE_ADMIN_ONLY = "admin_only"
COMMUNITY_DOMAIN_FEATURE_MODE_MEMBERS_SUBMIT_ADMIN_APPROVES = "members_submit_admin_approves"
COMMUNITY_DOMAIN_ADMIN_ROLES = {"owner", "admin", "domain_admin"}
COMMUNITY_DOMAIN_FEATURE_MARKETPLACE_SHOPS = "marketplace_shops"
COMMUNITY_DOMAIN_FEATURE_PAYMENTS_CONTRIBUTIONS = "payments_contributions"
COMMUNITY_DOMAIN_FEATURE_ROSCA_CYCLES = "rosca_cycles"
COMMUNITY_DOMAIN_FEATURE_SHOP_DIARY = "shop_diary"
COMMUNITY_DOMAIN_FEATURE_SPOTLIGHT = "spotlight"
COMMUNITY_DOMAIN_FEATURE_DEMAND_BOX = "demand_box"
COMMUNITY_DOMAIN_FEATURE_VAULT = "vault"


def _safe_json_object(raw: Optional[str]) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def community_domain_feature_mode_for_clan(
    db: Session,
    *,
    clan_id: int,
    feature_key: str,
    default: str = "admin_only",
) -> tuple[str, Optional[CommunityDomain]]:
    domain = (
        db.query(CommunityDomain)
        .filter(CommunityDomain.clan_id == int(clan_id))
        .order_by(CommunityDomain.updated_at.desc(), CommunityDomain.id.desc())
        .first()
    )
    if domain is None:
        return default, None

    policy = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.policy_key == COMMUNITY_DOMAIN_FEATURE_POLICY_KEY)
        .filter(CommunityDomainPolicy.status == "active")
        .order_by(CommunityDomainPolicy.updated_at.desc(), CommunityDomainPolicy.id.desc())
        .first()
    )
    config = _safe_json_object(
        getattr(policy, "config_json", None) if policy is not None else None
    )
    features = config.get("features") if isinstance(config.get("features"), dict) else {}
    mode = str(features.get(feature_key) or default).strip().lower() or default
    return mode, domain


def require_domain_payments_contributions_enabled(
    db: Session,
    *,
    clan_id: int,
) -> None:
    require_community_domain_feature_enabled(
        db,
        clan_id=int(clan_id),
        feature_key=COMMUNITY_DOMAIN_FEATURE_PAYMENTS_CONTRIBUTIONS,
        feature_label="Payments and Contributions",
        boundary_message=(
            "Community Domain subscription activation uses its separate setup "
            "payment route."
        ),
    )


def require_domain_rosca_cycles_enabled(
    db: Session,
    *,
    clan_id: int,
) -> None:
    require_community_domain_feature_enabled(
        db,
        clan_id=int(clan_id),
        feature_key=COMMUNITY_DOMAIN_FEATURE_ROSCA_CYCLES,
        feature_label="ROSCA Cycles",
        boundary_message=(
            "A paid ROSCA yearly service still controls service access; this "
            "Community Domain feature switch controls whether ROSCA cycles may "
            "run inside the domain."
        ),
    )


def require_domain_marketplace_shops_enabled(
    db: Session,
    *,
    clan_id: int,
) -> None:
    require_community_domain_feature_enabled(
        db,
        clan_id=int(clan_id),
        feature_key=COMMUNITY_DOMAIN_FEATURE_MARKETPLACE_SHOPS,
        feature_label="Marketplace Shops",
        boundary_message=(
            "This controls whether members may create or edit shop identities "
            "inside the domain."
        ),
    )


def require_domain_shop_diary_enabled(
    db: Session,
    *,
    clan_id: int,
) -> None:
    require_community_domain_feature_enabled(
        db,
        clan_id=int(clan_id),
        feature_key=COMMUNITY_DOMAIN_FEATURE_SHOP_DIARY,
        feature_label="Shop Diary",
        boundary_message=(
            "This controls product, public gallery block, and shop content "
            "updates inside the domain."
        ),
    )


def require_domain_spotlight_enabled(
    db: Session,
    *,
    clan_id: int,
) -> None:
    require_community_domain_feature_enabled(
        db,
        clan_id=int(clan_id),
        feature_key=COMMUNITY_DOMAIN_FEATURE_SPOTLIGHT,
        feature_label="Spotlight",
        boundary_message=(
            "This controls whether free or paid Spotlight broadcasts may run "
            "inside the domain. Paid Spotlight credits and visibility "
            "entitlements stay on their separate service rail."
        ),
    )


def require_domain_demand_box_enabled(
    db: Session,
    *,
    clan_id: int,
) -> None:
    require_community_domain_feature_enabled(
        db,
        clan_id=int(clan_id),
        feature_key=COMMUNITY_DOMAIN_FEATURE_DEMAND_BOX,
        feature_label="DemandBox",
        boundary_message=(
            "This controls whether members may post new DemandBox requests "
            "inside the domain. Existing requests can still be read or closed "
            "so old demand rows do not get stuck open."
        ),
    )


def require_domain_vault_enabled(
    db: Session,
    *,
    clan_id: int,
    actor_user_id: Optional[int] = None,
) -> None:
    mode, domain = community_domain_feature_mode_for_clan(
        db,
        clan_id=int(clan_id),
        feature_key=COMMUNITY_DOMAIN_FEATURE_VAULT,
        default=COMMUNITY_DOMAIN_FEATURE_MODE_ADMIN_ONLY,
    )
    boundary_message = (
        "This controls whether private Vault content and active Vault "
        "access links may be created or extended inside the domain. Paid "
        "Vault slot entitlement, link expiry, and privacy restrictions "
        "remain on their separate service rails."
    )
    if domain is not None and mode == COMMUNITY_DOMAIN_FEATURE_MODE_OFF:
        _raise_feature_boundary(
            domain=domain,
            feature_key=COMMUNITY_DOMAIN_FEATURE_VAULT,
            feature_mode=mode,
            message=(
                "Vault is not enabled for this Community Domain. "
                f"{boundary_message}"
            ),
            code="community_domain_feature_disabled",
        )

    if domain is None or actor_user_id is None:
        return

    actor_id = int(actor_user_id)
    actor = db.get(User, actor_id)
    is_platform_admin = (
        str(getattr(actor, "role", "") or "").strip().lower() == "admin"
    )
    is_domain_owner = int(domain.owner_user_id) == actor_id
    membership = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .filter(CommunityDomainMembership.user_id == actor_id)
        .filter(CommunityDomainMembership.status == "active")
        .first()
    )
    is_domain_admin = (
        membership is not None
        and str(getattr(membership, "role", "") or "").strip().lower()
        in COMMUNITY_DOMAIN_ADMIN_ROLES
    )
    if is_platform_admin or is_domain_owner or is_domain_admin:
        return

    if mode in {
        COMMUNITY_DOMAIN_FEATURE_MODE_ADMIN_ONLY,
        COMMUNITY_DOMAIN_FEATURE_MODE_MEMBERS_SUBMIT_ADMIN_APPROVES,
    }:
        _raise_feature_boundary(
            domain=domain,
            feature_key=COMMUNITY_DOMAIN_FEATURE_VAULT,
            feature_mode=mode,
            message=(
                "Vault is limited to Community Domain owners and admins. "
                "A Community Domain owner or domain admin must complete this "
                "Vault write. Member-submitted Vault approval is not connected "
                "to this direct publication route."
            ),
            code="community_domain_feature_admin_required",
        )


def _raise_feature_boundary(
    *,
    domain: CommunityDomain,
    feature_key: str,
    feature_mode: str,
    message: str,
    code: str,
) -> None:
    raise HTTPException(
        status_code=403,
        detail={
            "code": str(code),
            "feature_key": str(feature_key),
            "feature_mode": str(feature_mode),
            "community_domain_id": int(domain.id),
            "community_domain_name": getattr(domain, "display_name", None),
            "message": str(message),
        },
    )


def require_community_domain_feature_enabled(
    db: Session,
    *,
    clan_id: int,
    feature_key: str,
    feature_label: str,
    boundary_message: str,
) -> None:
    mode, domain = community_domain_feature_mode_for_clan(
        db,
        clan_id=int(clan_id),
        feature_key=feature_key,
        default="admin_only",
    )
    if domain is not None and mode == COMMUNITY_DOMAIN_FEATURE_MODE_OFF:
        _raise_feature_boundary(
            domain=domain,
            feature_key=feature_key,
            feature_mode=COMMUNITY_DOMAIN_FEATURE_MODE_OFF,
            message=(
                f"{feature_label} are not enabled for this Community Domain. "
                "The owner/admin can change this in Domain feature policy. "
                f"{boundary_message}"
            ),
            code="community_domain_feature_disabled",
        )
