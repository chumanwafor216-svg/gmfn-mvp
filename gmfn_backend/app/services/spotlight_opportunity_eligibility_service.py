from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomain,
    CommunityDomainAffiliation,
    CommunityDomainPolicy,
    MarketplaceBroadcast,
    SpotlightCampaign,
)
from app.services.community_domain_feature_policy import (
    COMMUNITY_DOMAIN_FEATURE_MODE_OFF,
    COMMUNITY_DOMAIN_FEATURE_POLICY_KEY,
    COMMUNITY_DOMAIN_FEATURE_SPOTLIGHT,
    community_domain_feature_mode_for_clan,
)

SPOTLIGHT_CAMPAIGN_STATUS_ACTIVE = "active"
SPOTLIGHT_CAMPAIGN_STATUS_ENDED = "ended"
SPOTLIGHT_CAMPAIGN_STATUS_EXPIRED = "expired"
SPOTLIGHT_CAMPAIGN_STATUS_LEGACY_PRESERVED = "legacy_preserved"

SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY = "direct_shared_community"
SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT = "canonical_placement"
SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN = "community_domain"
SPOTLIGHT_ELIGIBILITY_EVIDENCE_DIRECT_MEMBERSHIP = "active_direct_membership_overlap"
SPOTLIGHT_ELIGIBILITY_EVIDENCE_LINKED_PLACEMENT = "linked_canonical_broadcast_placement"
SPOTLIGHT_ELIGIBILITY_EVIDENCE_COMMUNITY_DOMAIN = "active_community_domain_affiliation"
SPOTLIGHT_ELIGIBILITY_DISCLOSURE_INTERNAL_ONLY = "internal_only"

REJECTION_CAMPAIGN_NOT_FOUND = "campaign_not_found"
REJECTION_CAMPAIGN_NOT_ACTIVE = "campaign_not_active"
REJECTION_CAMPAIGN_EXPIRED = "campaign_expired"
REJECTION_LEGACY_PRESERVED = "legacy_preserved_excluded"
REJECTION_SELF_DELIVERY = "self_delivery_excluded"
REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP = "no_active_viewer_membership"
REJECTION_NO_ELIGIBLE_ROUTE = "no_eligible_route"
REJECTION_DOMAIN_SPOTLIGHT_DISABLED = "community_domain_spotlight_disabled"
REJECTION_DOMAIN_ROUTE_NOT_PERMITTED = "community_domain_route_not_permitted"
REJECTION_DOMAIN_CONTENT_POLICY_BLOCKED = "community_domain_content_policy_blocked"
REJECTION_GSN_HOUSE_OPT_IN_WITHDRAWN = "gsn_house_campaign_opt_in_withdrawn"

DISTRIBUTION_SCOPE_MARKETPLACE_REPOST = "marketplace_repost"
DISTRIBUTION_SCOPE_COMMUNITY_DOMAIN = "community_domain"
SPOTLIGHT_CAMPAIGN_SOURCE_GSN_HOUSE = "gsn_house"

SPOTLIGHT_DOMAIN_POLICY_SECTION = "spotlight"
SPOTLIGHT_DOMAIN_ROUTE_POLICY_KEY = "cross_community_domain_eligibility"
GSN_CENTRAL_ADVERTISING_POLICY_KEY = "domain.central_advertising"


@dataclass(frozen=True)
class SpotlightEligibilityRoute:
    pathway: str
    route_clan_id: int
    evidence: str
    disclosure: str = SPOTLIGHT_ELIGIBILITY_DISCLOSURE_INTERNAL_ONLY
    placement_broadcast_id: Optional[int] = None
    visibility_scope: Optional[str] = None
    public_disclosure_allowed: bool = False
    community_domain_id: Optional[int] = None
    domain_root_clan_id: Optional[int] = None
    owner_branch_clan_id: Optional[int] = None
    viewer_branch_clan_id: Optional[int] = None
    policy_scope: Optional[str] = None

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "pathway": self.pathway,
            "route_clan_id": self.route_clan_id,
            "evidence": self.evidence,
            "placement_broadcast_id": self.placement_broadcast_id,
            "visibility_scope": self.visibility_scope,
            "community_domain_id": self.community_domain_id,
            "domain_root_clan_id": self.domain_root_clan_id,
            "owner_branch_clan_id": self.owner_branch_clan_id,
            "viewer_branch_clan_id": self.viewer_branch_clan_id,
            "policy_scope": self.policy_scope,
            "disclosure": self.disclosure,
            "public_disclosure_allowed": self.public_disclosure_allowed,
        }


@dataclass(frozen=True)
class SpotlightEligibilityResult:
    campaign_id: int
    eligible: bool
    origin_clan_id: Optional[int]
    routes: tuple[SpotlightEligibilityRoute, ...] = ()
    rejection_code: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejected_route_codes: tuple[str, ...] = ()
    privacy: str = "route_provenance_internal_only"

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "eligible": self.eligible,
            "origin_clan_id": self.origin_clan_id,
            "routes": [route.to_internal_dict() for route in self.routes],
            "route_clan_ids": [int(route.route_clan_id) for route in self.routes],
            "rejection_code": self.rejection_code,
            "rejection_reason": self.rejection_reason,
            "rejected_route_codes": list(self.rejected_route_codes),
            "privacy": self.privacy,
        }


@dataclass(frozen=True)
class _CommunityDomainRouteCandidate:
    community_domain_id: int
    domain_root_clan_id: int
    owner_branch_clan_id: int
    viewer_branch_clan_id: int
    cross_community_permitted: bool
    domain_spotlight_enabled: bool


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _dedupe_ints(values: Iterable[int]) -> list[int]:
    out: list[int] = []
    seen: set[int] = set()
    for value in values:
        safe_value = int(value or 0)
        if safe_value <= 0 or safe_value in seen:
            continue
        seen.add(safe_value)
        out.append(safe_value)
    return out


def _safe_json_object(raw: Optional[str]) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _truthy_policy_value(value: Any) -> bool:
    if value is True:
        return True
    if value is False or value is None:
        return False
    text = str(value).strip().lower()
    return text in {"1", "true", "yes", "on", "enabled", "allow", "allowed"}


def _domain_spotlight_feature_enabled(config: dict[str, Any]) -> bool:
    features = config.get("features") if isinstance(config.get("features"), dict) else {}
    mode = str(features.get(COMMUNITY_DOMAIN_FEATURE_SPOTLIGHT) or "admin_only").strip().lower()
    return mode != COMMUNITY_DOMAIN_FEATURE_MODE_OFF


def _domain_cross_community_spotlight_permitted(config: dict[str, Any]) -> bool:
    spotlight_config = (
        config.get(SPOTLIGHT_DOMAIN_POLICY_SECTION)
        if isinstance(config.get(SPOTLIGHT_DOMAIN_POLICY_SECTION), dict)
        else {}
    )
    return _truthy_policy_value(spotlight_config.get(SPOTLIGHT_DOMAIN_ROUTE_POLICY_KEY))


def _domain_content_policy_allows(
    *,
    campaign: SpotlightCampaign,
    community_domain_id: int,
) -> bool:
    # Future structured category governance belongs here. Do not infer content policy
    # from raw Spotlight message/media text.
    _ = campaign
    _ = community_domain_id
    return True


def _inactive_result(
    *,
    campaign_id: int,
    origin_clan_id: Optional[int],
    rejection_code: str,
    rejection_reason: str,
    rejected_route_codes: tuple[str, ...] = (),
) -> SpotlightEligibilityResult:
    return SpotlightEligibilityResult(
        campaign_id=int(campaign_id),
        eligible=False,
        origin_clan_id=origin_clan_id,
        routes=(),
        rejection_code=rejection_code,
        rejection_reason=rejection_reason,
        rejected_route_codes=rejected_route_codes,
    )


def _active_direct_membership_clan_ids_by_user(
    db: Session,
    *,
    user_ids: Iterable[int],
) -> dict[int, set[int]]:
    safe_user_ids = _dedupe_ints(user_ids)
    if not safe_user_ids:
        return {}

    rows = (
        db.query(ClanMembership.user_id, ClanMembership.clan_id)
        .join(Clan, Clan.id == ClanMembership.clan_id)
        .filter(ClanMembership.user_id.in_(safe_user_ids))
        .filter(ClanMembership.left_at.is_(None))
        .filter(Clan.status == "active")
        .all()
    )
    out: dict[int, set[int]] = {int(user_id): set() for user_id in safe_user_ids}
    for user_id, clan_id in rows:
        out.setdefault(int(user_id), set()).add(int(clan_id))
    return out


def _active_linked_placements_by_campaign(
    db: Session,
    *,
    campaign_ids: Iterable[int],
    now: datetime,
) -> dict[int, list[MarketplaceBroadcast]]:
    safe_campaign_ids = _dedupe_ints(campaign_ids)
    if not safe_campaign_ids:
        return {}

    rows = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.spotlight_campaign_id.in_(safe_campaign_ids))
        .filter(MarketplaceBroadcast.serving_status == 'serving')
        .filter(
            or_(
                MarketplaceBroadcast.authorized_expires_at > now,
                and_(
                    MarketplaceBroadcast.authorized_expires_at.is_(None),
                    or_(
                        MarketplaceBroadcast.expires_at.is_(None),
                        MarketplaceBroadcast.expires_at > now,
                    ),
                ),
            )
        )
        .order_by(
            MarketplaceBroadcast.spotlight_campaign_id.asc(),
            MarketplaceBroadcast.clan_id.asc(),
            MarketplaceBroadcast.id.asc(),
        )
        .all()
    )
    out: dict[int, list[MarketplaceBroadcast]] = {campaign_id: [] for campaign_id in safe_campaign_ids}
    for row in rows:
        campaign_id = int(getattr(row, "spotlight_campaign_id", 0) or 0)
        if campaign_id <= 0:
            continue
        out.setdefault(campaign_id, []).append(row)
    return out


def _active_domain_policy_config_by_domain(
    db: Session,
    *,
    community_domain_ids: Iterable[int],
) -> dict[int, dict[str, Any]]:
    safe_domain_ids = _dedupe_ints(community_domain_ids)
    if not safe_domain_ids:
        return {}
    rows = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id.in_(safe_domain_ids))
        .filter(CommunityDomainPolicy.policy_key == COMMUNITY_DOMAIN_FEATURE_POLICY_KEY)
        .filter(CommunityDomainPolicy.status == "active")
        .order_by(CommunityDomainPolicy.updated_at.desc(), CommunityDomainPolicy.id.desc())
        .all()
    )
    out: dict[int, dict[str, Any]] = {}
    for row in rows:
        domain_id = int(row.community_domain_id)
        if domain_id in out:
            continue
        out[domain_id] = _safe_json_object(row.config_json)
    return out


def _community_domain_route_candidates_by_owner(
    db: Session,
    *,
    viewer_clan_ids: set[int],
    owner_clan_ids_by_user: dict[int, set[int]],
) -> dict[int, list[_CommunityDomainRouteCandidate]]:
    if not viewer_clan_ids:
        return {int(owner_id): [] for owner_id in owner_clan_ids_by_user}

    all_member_clan_ids: set[int] = set(viewer_clan_ids)
    for clan_ids in owner_clan_ids_by_user.values():
        all_member_clan_ids.update(clan_ids)
    if not all_member_clan_ids:
        return {int(owner_id): [] for owner_id in owner_clan_ids_by_user}

    affiliate_parent_rows = (
        db.query(
            CommunityDomainAffiliation.parent_clan_id,
            CommunityDomainAffiliation.affiliate_clan_id,
        )
        .filter(CommunityDomainAffiliation.status == "approved")
        .filter(CommunityDomainAffiliation.affiliate_clan_id.in_(all_member_clan_ids))
        .all()
    )
    candidate_root_clan_ids = set(all_member_clan_ids)
    candidate_root_clan_ids.update(int(parent_id) for parent_id, _affiliate_id in affiliate_parent_rows)

    domains = (
        db.query(CommunityDomain)
        .join(Clan, Clan.id == CommunityDomain.clan_id)
        .filter(CommunityDomain.status == "active")
        .filter(CommunityDomain.clan_id.isnot(None))
        .filter(CommunityDomain.clan_id.in_(candidate_root_clan_ids))
        .filter(Clan.status == "active")
        .order_by(CommunityDomain.id.asc())
        .all()
    )
    if not domains:
        return {int(owner_id): [] for owner_id in owner_clan_ids_by_user}

    domain_ids = [int(domain.id) for domain in domains]
    policy_config_by_domain = _active_domain_policy_config_by_domain(
        db,
        community_domain_ids=domain_ids,
    )

    root_clan_ids = {int(domain.clan_id) for domain in domains if domain.clan_id is not None}
    affiliation_rows = (
        db.query(
            CommunityDomainAffiliation.parent_clan_id,
            CommunityDomainAffiliation.affiliate_clan_id,
        )
        .filter(CommunityDomainAffiliation.status == "approved")
        .filter(CommunityDomainAffiliation.parent_clan_id.in_(root_clan_ids))
        .filter(CommunityDomainAffiliation.affiliate_clan_id.in_(all_member_clan_ids))
        .all()
    )
    affiliates_by_parent: dict[int, set[int]] = {int(root_id): set() for root_id in root_clan_ids}
    for parent_id, affiliate_id in affiliation_rows:
        parent_clan_id = int(parent_id)
        affiliate_clan_id = int(affiliate_id)
        if affiliate_clan_id in all_member_clan_ids:
            affiliates_by_parent.setdefault(parent_clan_id, set()).add(affiliate_clan_id)

    branches_by_domain: dict[int, set[int]] = {}
    branch_domains_by_clan: dict[int, list[_CommunityDomainRouteCandidate]] = {}
    domain_meta: dict[int, tuple[int, bool, bool]] = {}
    for domain in domains:
        domain_id = int(domain.id)
        root_clan_id = int(domain.clan_id)
        config = policy_config_by_domain.get(domain_id, {})
        domain_meta[domain_id] = (
            root_clan_id,
            _domain_cross_community_spotlight_permitted(config),
            _domain_spotlight_feature_enabled(config),
        )
        branches = {root_clan_id, *affiliates_by_parent.get(root_clan_id, set())}
        branches_by_domain[domain_id] = branches
        for branch_clan_id in branches:
            if branch_clan_id not in all_member_clan_ids:
                continue
            root_id, cross_permitted, domain_spotlight_enabled = domain_meta[domain_id]
            branch_domains_by_clan.setdefault(branch_clan_id, []).append(
                _CommunityDomainRouteCandidate(
                    community_domain_id=domain_id,
                    domain_root_clan_id=root_id,
                    owner_branch_clan_id=branch_clan_id,
                    viewer_branch_clan_id=branch_clan_id,
                    cross_community_permitted=cross_permitted,
                    domain_spotlight_enabled=domain_spotlight_enabled,
                )
            )

    out: dict[int, list[_CommunityDomainRouteCandidate]] = {}
    for owner_user_id, owner_clan_ids in owner_clan_ids_by_user.items():
        owner_candidates: list[_CommunityDomainRouteCandidate] = []
        seen: set[tuple[int, int, int]] = set()
        for owner_branch_id in sorted(owner_clan_ids):
            for owner_domain in branch_domains_by_clan.get(int(owner_branch_id), []):
                domain_branches = branches_by_domain.get(owner_domain.community_domain_id, set())
                for viewer_branch_id in sorted(viewer_clan_ids.intersection(domain_branches)):
                    key = (
                        int(owner_domain.community_domain_id),
                        int(owner_branch_id),
                        int(viewer_branch_id),
                    )
                    if key in seen:
                        continue
                    seen.add(key)
                    owner_candidates.append(
                        _CommunityDomainRouteCandidate(
                            community_domain_id=int(owner_domain.community_domain_id),
                            domain_root_clan_id=int(owner_domain.domain_root_clan_id),
                            owner_branch_clan_id=int(owner_branch_id),
                            viewer_branch_clan_id=int(viewer_branch_id),
                            cross_community_permitted=bool(owner_domain.cross_community_permitted),
                            domain_spotlight_enabled=bool(owner_domain.domain_spotlight_enabled),
                        )
                    )
        out[int(owner_user_id)] = owner_candidates
    return out


def _spotlight_enabled_by_clan(
    db: Session,
    *,
    clan_ids: Iterable[int],
) -> dict[int, bool]:
    out: dict[int, bool] = {}
    for clan_id in _dedupe_ints(clan_ids):
        mode, _domain = community_domain_feature_mode_for_clan(
            db,
            clan_id=int(clan_id),
            feature_key=COMMUNITY_DOMAIN_FEATURE_SPOTLIGHT,
            default="admin_only",
        )
        out[int(clan_id)] = str(mode or "").strip().lower() != COMMUNITY_DOMAIN_FEATURE_MODE_OFF
    return out


def _gsn_house_allowed_by_clan(
    db: Session,
    *,
    clan_ids: Iterable[int],
) -> dict[int, bool]:
    out: dict[int, bool] = {}
    for clan_id in _dedupe_ints(clan_ids):
        domain = (
            db.query(CommunityDomain)
            .filter(CommunityDomain.clan_id == int(clan_id))
            .order_by(CommunityDomain.updated_at.desc(), CommunityDomain.id.desc())
            .first()
        )
        if domain is None or str(domain.status or "").strip().lower() != "active":
            out[int(clan_id)] = False
            continue
        policy = (
            db.query(CommunityDomainPolicy)
            .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
            .filter(CommunityDomainPolicy.policy_key == GSN_CENTRAL_ADVERTISING_POLICY_KEY)
            .filter(CommunityDomainPolicy.status == "active")
            .order_by(CommunityDomainPolicy.updated_at.desc(), CommunityDomainPolicy.id.desc())
            .first()
        )
        config = _safe_json_object(
            getattr(policy, "config_json", None) if policy is not None else None
        )
        out[int(clan_id)] = config.get("allow_gsn_house_campaigns") is True
    return out


def _campaign_status_rejection(
    campaign: SpotlightCampaign,
    *,
    now: datetime,
) -> Optional[SpotlightEligibilityResult]:
    campaign_id = int(getattr(campaign, "id", 0) or 0)
    origin_clan_id = (
        int(campaign.origin_clan_id) if getattr(campaign, "origin_clan_id", None) is not None else None
    )
    status = str(getattr(campaign, "status", "") or "").strip().lower()
    serving_status = str(getattr(campaign, 'serving_status', 'serving') or 'serving').strip().lower()
    if serving_status != 'serving':
        return _inactive_result(
            campaign_id=campaign_id,
            origin_clan_id=origin_clan_id,
            rejection_code='campaign_not_serving',
            rejection_reason='The campaign entitlement remains recorded but its serving state is not active.',
        )
    if status == SPOTLIGHT_CAMPAIGN_STATUS_LEGACY_PRESERVED:
        return _inactive_result(
            campaign_id=campaign_id,
            origin_clan_id=origin_clan_id,
            rejection_code=REJECTION_LEGACY_PRESERVED,
            rejection_reason="Legacy-preserved campaigns are audit/backfill records and are excluded from canonical Opportunity Engine eligibility.",
        )
    if status != SPOTLIGHT_CAMPAIGN_STATUS_ACTIVE:
        return _inactive_result(
            campaign_id=campaign_id,
            origin_clan_id=origin_clan_id,
            rejection_code=REJECTION_CAMPAIGN_NOT_ACTIVE,
            rejection_reason="Only active canonical Spotlight campaigns may enter Opportunity Engine eligibility.",
        )

    expires_at = _as_aware_utc(getattr(campaign, "expires_at", None))
    authorized_expiry = _as_aware_utc(getattr(campaign, 'authorized_expires_at', None))
    if authorized_expiry is not None:
        expires_at = authorized_expiry
    if expires_at is not None and expires_at <= now:
        return _inactive_result(
            campaign_id=campaign_id,
            origin_clan_id=origin_clan_id,
            rejection_code=REJECTION_CAMPAIGN_EXPIRED,
            rejection_reason="The campaign expiry time has passed, even though its stored status is still active.",
        )
    return None


def _route_pathway_for_placement(
    *,
    campaign: SpotlightCampaign,
    placement: MarketplaceBroadcast,
    owner_clan_ids: set[int],
) -> str:
    route_clan_id = int(getattr(placement, "clan_id", 0) or 0)
    placement_scope = str(getattr(placement, "visibility_scope", "") or "").strip().lower()
    campaign_scope = str(getattr(campaign, "distribution_scope", "") or "").strip().lower()
    if placement_scope == DISTRIBUTION_SCOPE_MARKETPLACE_REPOST or campaign_scope == DISTRIBUTION_SCOPE_MARKETPLACE_REPOST:
        return SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT
    if route_clan_id in owner_clan_ids:
        return SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY
    return SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT


def _campaign_allows_community_domain_route(campaign: SpotlightCampaign) -> bool:
    scope = str(getattr(campaign, "distribution_scope", "") or "").strip().lower()
    return scope == DISTRIBUTION_SCOPE_COMMUNITY_DOMAIN


def _evaluate_loaded_campaign(
    *,
    campaign: SpotlightCampaign,
    viewer_user_id: int,
    viewer_clan_ids: set[int],
    owner_clan_ids: set[int],
    placements: list[MarketplaceBroadcast],
    domain_route_candidates: list[_CommunityDomainRouteCandidate],
    spotlight_enabled_by_clan: dict[int, bool],
    gsn_house_allowed_by_clan: dict[int, bool],
    now: datetime,
) -> SpotlightEligibilityResult:
    campaign_id = int(campaign.id)
    origin_clan_id = int(campaign.origin_clan_id) if campaign.origin_clan_id is not None else None

    state_rejection = _campaign_status_rejection(campaign, now=now)
    if state_rejection is not None:
        return state_rejection

    if int(campaign.owner_user_id) == int(viewer_user_id):
        return _inactive_result(
            campaign_id=campaign_id,
            origin_clan_id=origin_clan_id,
            rejection_code=REJECTION_SELF_DELIVERY,
            rejection_reason="Campaign owners are excluded from canonical Opportunity Engine self-delivery; owner preview remains separate.",
        )

    if not viewer_clan_ids:
        return _inactive_result(
            campaign_id=campaign_id,
            origin_clan_id=origin_clan_id,
            rejection_code=REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP,
            rejection_reason="The viewer has no authoritative active direct community membership.",
        )

    routes: list[SpotlightEligibilityRoute] = []
    route_keys: set[tuple[Any, ...]] = set()
    rejected_route_codes: set[str] = set()

    if placements:
        for placement in placements:
            route_clan_id = int(getattr(placement, "clan_id", 0) or 0)
            if route_clan_id <= 0 or route_clan_id not in viewer_clan_ids:
                continue
            if not spotlight_enabled_by_clan.get(route_clan_id, True):
                rejected_route_codes.add(REJECTION_DOMAIN_SPOTLIGHT_DISABLED)
                continue
            if (
                str(getattr(campaign, "source_kind", "") or "").strip().lower()
                == SPOTLIGHT_CAMPAIGN_SOURCE_GSN_HOUSE
                and not gsn_house_allowed_by_clan.get(route_clan_id, False)
            ):
                rejected_route_codes.add(REJECTION_GSN_HOUSE_OPT_IN_WITHDRAWN)
                continue
            pathway = _route_pathway_for_placement(
                campaign=campaign,
                placement=placement,
                owner_clan_ids=owner_clan_ids,
            )
            key = (pathway, route_clan_id)
            if key in route_keys:
                continue
            route_keys.add(key)
            routes.append(
                SpotlightEligibilityRoute(
                    pathway=pathway,
                    route_clan_id=route_clan_id,
                    evidence=SPOTLIGHT_ELIGIBILITY_EVIDENCE_LINKED_PLACEMENT,
                    placement_broadcast_id=int(placement.id),
                    visibility_scope=getattr(placement, "visibility_scope", None),
                )
            )
    else:
        campaign_scope = str(getattr(campaign, "distribution_scope", "") or "").strip().lower()
        if campaign_scope != DISTRIBUTION_SCOPE_MARKETPLACE_REPOST:
            for route_clan_id in sorted(owner_clan_ids.intersection(viewer_clan_ids)):
                if not spotlight_enabled_by_clan.get(route_clan_id, True):
                    rejected_route_codes.add(REJECTION_DOMAIN_SPOTLIGHT_DISABLED)
                    continue
                key = (SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, int(route_clan_id))
                if key in route_keys:
                    continue
                route_keys.add(key)
                routes.append(
                    SpotlightEligibilityRoute(
                        pathway=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
                        route_clan_id=int(route_clan_id),
                        evidence=SPOTLIGHT_ELIGIBILITY_EVIDENCE_DIRECT_MEMBERSHIP,
                    )
                )

    if _campaign_allows_community_domain_route(campaign):
        for candidate in domain_route_candidates:
            if not candidate.cross_community_permitted:
                rejected_route_codes.add(REJECTION_DOMAIN_ROUTE_NOT_PERMITTED)
                continue
            if not candidate.domain_spotlight_enabled:
                rejected_route_codes.add(REJECTION_DOMAIN_SPOTLIGHT_DISABLED)
                continue
            if not spotlight_enabled_by_clan.get(candidate.domain_root_clan_id, True):
                rejected_route_codes.add(REJECTION_DOMAIN_SPOTLIGHT_DISABLED)
                continue
            if not spotlight_enabled_by_clan.get(candidate.owner_branch_clan_id, True):
                rejected_route_codes.add(REJECTION_DOMAIN_SPOTLIGHT_DISABLED)
                continue
            if not spotlight_enabled_by_clan.get(candidate.viewer_branch_clan_id, True):
                rejected_route_codes.add(REJECTION_DOMAIN_SPOTLIGHT_DISABLED)
                continue
            if not _domain_content_policy_allows(
                campaign=campaign,
                community_domain_id=int(candidate.community_domain_id),
            ):
                rejected_route_codes.add(REJECTION_DOMAIN_CONTENT_POLICY_BLOCKED)
                continue
            key = (
                SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
                int(candidate.community_domain_id),
                int(candidate.owner_branch_clan_id),
                int(candidate.viewer_branch_clan_id),
            )
            if key in route_keys:
                continue
            route_keys.add(key)
            routes.append(
                SpotlightEligibilityRoute(
                    pathway=SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
                    route_clan_id=int(candidate.viewer_branch_clan_id),
                    evidence=SPOTLIGHT_ELIGIBILITY_EVIDENCE_COMMUNITY_DOMAIN,
                    community_domain_id=int(candidate.community_domain_id),
                    domain_root_clan_id=int(candidate.domain_root_clan_id),
                    owner_branch_clan_id=int(candidate.owner_branch_clan_id),
                    viewer_branch_clan_id=int(candidate.viewer_branch_clan_id),
                    policy_scope="domain_cross_community_spotlight",
                )
            )

    if routes:
        return SpotlightEligibilityResult(
            campaign_id=campaign_id,
            eligible=True,
            origin_clan_id=origin_clan_id,
            routes=tuple(routes),
            rejected_route_codes=tuple(sorted(rejected_route_codes)),
        )

    if rejected_route_codes == {REJECTION_DOMAIN_SPOTLIGHT_DISABLED}:
        rejection_code = REJECTION_DOMAIN_SPOTLIGHT_DISABLED
        reason = "All otherwise valid Spotlight routes are blocked by Community Domain Spotlight policy."
    elif rejected_route_codes == {REJECTION_DOMAIN_ROUTE_NOT_PERMITTED}:
        rejection_code = REJECTION_DOMAIN_ROUTE_NOT_PERMITTED
        reason = "The campaign or Domain policy does not permit cross-community Community Domain Spotlight eligibility."
    elif rejected_route_codes == {REJECTION_DOMAIN_CONTENT_POLICY_BLOCKED}:
        rejection_code = REJECTION_DOMAIN_CONTENT_POLICY_BLOCKED
        reason = "A structured Community Domain content policy blocked this Spotlight route."
    elif rejected_route_codes == {REJECTION_GSN_HOUSE_OPT_IN_WITHDRAWN}:
        rejection_code = REJECTION_GSN_HOUSE_OPT_IN_WITHDRAWN
        reason = (
            "The destination Community Domain no longer permits GSN house campaigns."
        )
    else:
        rejection_code = REJECTION_NO_ELIGIBLE_ROUTE
        reason = "No active direct membership, linked canonical placement, or permitted Community Domain route is valid for this viewer."
    return _inactive_result(
        campaign_id=campaign_id,
        origin_clan_id=origin_clan_id,
        rejection_code=rejection_code,
        rejection_reason=reason,
        rejected_route_codes=tuple(sorted(rejected_route_codes)),
    )


def evaluate_spotlight_eligibility_batch(
    db: Session,
    *,
    viewer_user_id: int,
    campaign_ids: Iterable[int],
    now: Optional[datetime] = None,
) -> list[SpotlightEligibilityResult]:
    current_time = _as_aware_utc(now) or _now_utc()
    safe_campaign_ids = _dedupe_ints(campaign_ids)
    if not safe_campaign_ids:
        return []

    campaigns = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id.in_(safe_campaign_ids))
        .all()
    )
    campaign_by_id = {int(campaign.id): campaign for campaign in campaigns}
    owner_user_ids = [int(campaign.owner_user_id) for campaign in campaigns]
    membership_by_user = _active_direct_membership_clan_ids_by_user(
        db,
        user_ids=[int(viewer_user_id), *owner_user_ids],
    )
    viewer_clan_ids = membership_by_user.get(int(viewer_user_id), set())
    owner_clan_ids_by_user = {
        int(owner_user_id): membership_by_user.get(int(owner_user_id), set())
        for owner_user_id in owner_user_ids
    }
    placements_by_campaign = _active_linked_placements_by_campaign(
        db,
        campaign_ids=safe_campaign_ids,
        now=current_time,
    )
    domain_routes_by_owner = _community_domain_route_candidates_by_owner(
        db,
        viewer_clan_ids=viewer_clan_ids,
        owner_clan_ids_by_user=owner_clan_ids_by_user,
    )

    route_clan_ids: set[int] = set()
    for campaign in campaigns:
        owner_clans = membership_by_user.get(int(campaign.owner_user_id), set())
        placements = placements_by_campaign.get(int(campaign.id), [])
        if placements:
            route_clan_ids.update(int(row.clan_id) for row in placements if int(row.clan_id or 0) > 0)
        else:
            route_clan_ids.update(owner_clans.intersection(viewer_clan_ids))
        for candidate in domain_routes_by_owner.get(int(campaign.owner_user_id), []):
            route_clan_ids.add(int(candidate.domain_root_clan_id))
            route_clan_ids.add(int(candidate.owner_branch_clan_id))
            route_clan_ids.add(int(candidate.viewer_branch_clan_id))
    spotlight_enabled_by_clan = _spotlight_enabled_by_clan(db, clan_ids=route_clan_ids)
    gsn_house_allowed_by_clan = _gsn_house_allowed_by_clan(
        db,
        clan_ids=route_clan_ids,
    )

    results: list[SpotlightEligibilityResult] = []
    for campaign_id in safe_campaign_ids:
        campaign = campaign_by_id.get(int(campaign_id))
        if campaign is None:
            results.append(
                _inactive_result(
                    campaign_id=int(campaign_id),
                    origin_clan_id=None,
                    rejection_code=REJECTION_CAMPAIGN_NOT_FOUND,
                    rejection_reason="Spotlight campaign was not found.",
                )
            )
            continue
        results.append(
            _evaluate_loaded_campaign(
                campaign=campaign,
                viewer_user_id=int(viewer_user_id),
                viewer_clan_ids=viewer_clan_ids,
                owner_clan_ids=membership_by_user.get(int(campaign.owner_user_id), set()),
                placements=placements_by_campaign.get(int(campaign.id), []),
                domain_route_candidates=domain_routes_by_owner.get(int(campaign.owner_user_id), []),
                spotlight_enabled_by_clan=spotlight_enabled_by_clan,
                gsn_house_allowed_by_clan=gsn_house_allowed_by_clan,
                now=current_time,
            )
        )
    return results


def evaluate_spotlight_eligibility(
    db: Session,
    *,
    viewer_user_id: int,
    campaign_id: int,
    now: Optional[datetime] = None,
) -> SpotlightEligibilityResult:
    results = evaluate_spotlight_eligibility_batch(
        db,
        viewer_user_id=int(viewer_user_id),
        campaign_ids=[int(campaign_id)],
        now=now,
    )
    return results[0]
