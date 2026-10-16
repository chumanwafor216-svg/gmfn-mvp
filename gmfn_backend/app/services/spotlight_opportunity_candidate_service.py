from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.db.models import MarketplaceRequest, SpotlightCampaign, SpotlightCampaignPacingState
from app.services.demand_supply_intelligence_service import (
    OPEN_DEMAND_STATUS,
    _is_visible_live_demand,
)
from app.services.spotlight_demandbox_matching_service import (
    GEO_COMPATIBLE,
    GEO_INCOMPATIBLE,
    GEO_UNKNOWN,
    MATCH_STRENGTH_NONE,
    MATCH_STRENGTH_POSSIBLE,
    MATCH_STRENGTH_STRONG,
    SpotlightDemandMatchResult,
    _availability_allows_match,
    _evaluate_loaded_campaign_match,
)
from app.services.spotlight_member_interest_service import (
    SpotlightInterestRelevanceResult,
    evaluate_spotlight_interest_relevance_batch,
)
from app.services.spotlight_opportunity_eligibility_service import (
    SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT,
    SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
    SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
    SpotlightEligibilityResult,
    evaluate_spotlight_eligibility_batch,
)

SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH = "demandbox_match"
SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY = "direct_community"
SPOTLIGHT_CANDIDATE_BAND_COMMUNITY_DOMAIN = "community_domain"
SPOTLIGHT_CANDIDATE_BAND_OTHER_CANONICAL_ELIGIBLE = "other_canonical_eligible"

_BAND_RANK = {
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH: 1,
    SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY: 2,
    SPOTLIGHT_CANDIDATE_BAND_COMMUNITY_DOMAIN: 3,
    SPOTLIGHT_CANDIDATE_BAND_OTHER_CANONICAL_ELIGIBLE: 4,
}

_MATCH_STRENGTH_RANK = {
    MATCH_STRENGTH_STRONG: 0,
    MATCH_STRENGTH_POSSIBLE: 1,
    MATCH_STRENGTH_NONE: 2,
}

_AVAILABILITY_RANK = {
    "available": 0,
    "unspecified": 1,
}

_GEO_RANK = {
    GEO_COMPATIBLE: 0,
    GEO_UNKNOWN: 1,
    GEO_INCOMPATIBLE: 2,
}

_INTEREST_RELEVANCE_RANK = {
    True: 0,
    False: 1,
}


@dataclass(frozen=True)
class SpotlightOpportunityCandidate:
    campaign_id: int
    priority_band: str
    priority_rank: int
    eligibility: SpotlightEligibilityResult
    matched_demand_ids: tuple[int, ...] = ()
    demand_matches: tuple[SpotlightDemandMatchResult, ...] = ()
    match_reasons: tuple[str, ...] = ()
    interest_relevance: Optional[SpotlightInterestRelevanceResult] = None
    opportunity_availability_state: str = "unspecified"
    geographic_compatibility: str = GEO_UNKNOWN
    origin_clan_id: Optional[int] = None
    tie_break_metadata: Optional[dict[str, Any]] = None
    privacy: str = "internal_route_provenance_only"

    def to_internal_dict(self) -> dict[str, Any]:
        routes = [route.to_internal_dict() for route in self.eligibility.routes]
        return {
            "campaign_id": self.campaign_id,
            "priority_band": self.priority_band,
            "priority_rank": self.priority_rank,
            "eligibility_routes": routes,
            "matched_demand_ids": list(self.matched_demand_ids),
            "match_reasons": list(self.match_reasons),
            "demand_matches": [match.to_internal_dict() for match in self.demand_matches],
            "interest_relevance": (
                self.interest_relevance.to_internal_dict()
                if self.interest_relevance is not None
                else None
            ),
            "explicit_interest_relevant": bool(self.interest_relevance.relevant) if self.interest_relevance is not None else False,
            "matched_interest_categories": (
                list(self.interest_relevance.matched_interests)
                if self.interest_relevance is not None
                else []
            ),
            "opportunity_availability_state": self.opportunity_availability_state,
            "geographic_compatibility": self.geographic_compatibility,
            "origin_clan_id": self.origin_clan_id,
            "community_domain_routes": [
                route for route in routes
                if route.get("pathway") == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN
            ],
            "canonical_placement_routes": [
                route for route in routes
                if route.get("pathway") == SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT
            ],
            "tie_break_metadata": dict(self.tie_break_metadata or {}),
            "privacy": self.privacy,
        }


def build_spotlight_opportunity_candidates(
    db: Session,
    *,
    viewer_user_id: int,
    campaign_ids: Optional[Iterable[int]] = None,
    limit: int = 25,
    now: Optional[datetime] = None,
) -> list[SpotlightOpportunityCandidate]:
    current_time = _as_aware_utc(now) or _now_utc()
    safe_campaign_ids = _safe_ints(campaign_ids)
    if not safe_campaign_ids:
        safe_campaign_ids = _active_candidate_campaign_ids(
            db,
            viewer_user_id=int(viewer_user_id),
            limit=max(int(limit) * 8, int(limit), 25),
        )
    if not safe_campaign_ids:
        return []

    campaigns = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id.in_(safe_campaign_ids))
        .all()
    )
    campaign_by_id = {int(campaign.id): campaign for campaign in campaigns}
    eligibility_results = evaluate_spotlight_eligibility_batch(
        db,
        viewer_user_id=int(viewer_user_id),
        campaign_ids=safe_campaign_ids,
        now=current_time,
    )
    demands = _viewer_open_visible_demands(
        db,
        viewer_user_id=int(viewer_user_id),
        now=current_time,
    )
    interest_results = evaluate_spotlight_interest_relevance_batch(
        db,
        viewer_user_id=int(viewer_user_id),
        campaigns=campaigns,
    )

    candidates: list[SpotlightOpportunityCandidate] = []
    for eligibility in eligibility_results:
        if not eligibility.eligible:
            continue
        campaign = campaign_by_id.get(int(eligibility.campaign_id))
        if campaign is None:
            continue
        availability_allowed, availability_state, _availability_rejection = _availability_allows_match(
            campaign=campaign,
            now=current_time,
        )
        if not availability_allowed:
            continue

        demand_matches = _matched_demands_for_campaign(
            demands=demands,
            campaign=campaign,
            eligibility=eligibility,
            now=current_time,
        )
        candidate = _candidate_from_evidence(
            campaign=campaign,
            eligibility=eligibility,
            demand_matches=demand_matches,
            availability_state=availability_state,
            interest_relevance=interest_results.get(int(campaign.id)),
        )
        candidates.append(candidate)

    candidates.sort(key=_candidate_sort_key)
    return candidates[: max(int(limit), 0)]


def _active_candidate_campaign_ids(
    db: Session,
    *,
    viewer_user_id: int,
    limit: int,
) -> list[int]:
    rows = (
        db.query(SpotlightCampaign.id)
        .outerjoin(
            SpotlightCampaignPacingState,
            SpotlightCampaignPacingState.campaign_id == SpotlightCampaign.id,
        )
        .filter(SpotlightCampaign.status == "active")
        .filter(SpotlightCampaign.serving_status == 'serving')
        .filter(
            or_(
                SpotlightCampaignPacingState.campaign_id.is_(None),
                and_(
                    SpotlightCampaignPacingState.exhausted.is_(False),
                    SpotlightCampaignPacingState.consumed_delivery_rounds
                    < SpotlightCampaignPacingState.max_delivery_rounds,
                ),
            )
        )
        .filter(SpotlightCampaign.owner_user_id != int(viewer_user_id))
        .order_by(SpotlightCampaign.activated_at.desc(), SpotlightCampaign.created_at.desc(), SpotlightCampaign.id.asc())
        .all()
    )
    return [int(row.id) for row in rows]


def _viewer_open_visible_demands(
    db: Session,
    *,
    viewer_user_id: int,
    now: datetime,
) -> list[MarketplaceRequest]:
    rows = (
        db.query(MarketplaceRequest)
        .filter(MarketplaceRequest.user_id == int(viewer_user_id))
        .filter(MarketplaceRequest.status == OPEN_DEMAND_STATUS)
        .filter(or_(MarketplaceRequest.expires_at.is_(None), MarketplaceRequest.expires_at >= now))
        .order_by(MarketplaceRequest.created_at.desc(), MarketplaceRequest.id.asc())
        .all()
    )
    return [
        demand for demand in rows
        if _is_visible_live_demand(
            db,
            demand,
            current_user_id=int(viewer_user_id),
            now=now,
        )
    ]


def _matched_demands_for_campaign(
    *,
    demands: Iterable[MarketplaceRequest],
    campaign: SpotlightCampaign,
    eligibility: SpotlightEligibilityResult,
    now: datetime,
) -> tuple[SpotlightDemandMatchResult, ...]:
    matches: list[SpotlightDemandMatchResult] = []
    for demand in demands:
        result = _evaluate_loaded_campaign_match(
            demand=demand,
            campaign=campaign,
            eligibility=eligibility,
            now=now,
        )
        if result.matched:
            matches.append(result)
    matches.sort(key=lambda match: int(match.demand_id))
    return tuple(matches)


def _candidate_from_evidence(
    *,
    campaign: SpotlightCampaign,
    eligibility: SpotlightEligibilityResult,
    demand_matches: tuple[SpotlightDemandMatchResult, ...],
    availability_state: str,
    interest_relevance: Optional[SpotlightInterestRelevanceResult] = None,
) -> SpotlightOpportunityCandidate:
    band = _priority_band(eligibility=eligibility, demand_matches=demand_matches)
    match_reasons = _dedupe_strings(
        reason
        for match in demand_matches
        for reason in match.positive_reasons
    )
    matched_demand_ids = tuple(sorted({int(match.demand_id) for match in demand_matches}))
    geographic_compatibility = _best_geo_compatibility(demand_matches)
    best_strength = _best_match_strength(demand_matches)
    reason_quality = max((len(match.positive_reasons) for match in demand_matches), default=0)
    activated_at = _as_aware_utc(getattr(campaign, "activated_at", None))
    created_at = _as_aware_utc(getattr(campaign, "created_at", None))
    freshness_at = activated_at or created_at
    explicit_interest_relevant = bool(interest_relevance.relevant) if interest_relevance is not None else False
    interest_relevance_rank = (
        1
        if band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
        else _INTEREST_RELEVANCE_RANK.get(explicit_interest_relevant, 1)
    )
    tie_break_metadata = {
        "match_strength": best_strength,
        "match_strength_rank": _MATCH_STRENGTH_RANK.get(best_strength, _MATCH_STRENGTH_RANK[MATCH_STRENGTH_NONE]),
        "match_reason_quality": reason_quality,
        "explicit_interest_relevant": explicit_interest_relevant,
        "interest_relevance_rank": interest_relevance_rank,
        "matched_interest_categories": (
            list(interest_relevance.matched_interests)
            if interest_relevance is not None
            else []
        ),
        "availability_rank": _AVAILABILITY_RANK.get(availability_state, 1),
        "geographic_compatibility_rank": _GEO_RANK.get(geographic_compatibility, _GEO_RANK[GEO_UNKNOWN]),
        "freshness_at": freshness_at.isoformat() if freshness_at is not None else None,
        "campaign_id_tiebreak": int(campaign.id),
    }
    return SpotlightOpportunityCandidate(
        campaign_id=int(campaign.id),
        priority_band=band,
        priority_rank=_BAND_RANK[band],
        eligibility=eligibility,
        matched_demand_ids=matched_demand_ids,
        demand_matches=demand_matches,
        match_reasons=tuple(match_reasons),
        interest_relevance=interest_relevance,
        opportunity_availability_state=availability_state,
        geographic_compatibility=geographic_compatibility,
        origin_clan_id=(int(campaign.origin_clan_id) if campaign.origin_clan_id is not None else None),
        tie_break_metadata=tie_break_metadata,
    )


def _priority_band(
    *,
    eligibility: SpotlightEligibilityResult,
    demand_matches: tuple[SpotlightDemandMatchResult, ...],
) -> str:
    if demand_matches:
        return SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    pathways = {route.pathway for route in eligibility.routes}
    if SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY in pathways:
        return SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY
    if SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN in pathways:
        return SPOTLIGHT_CANDIDATE_BAND_COMMUNITY_DOMAIN
    return SPOTLIGHT_CANDIDATE_BAND_OTHER_CANONICAL_ELIGIBLE


def _candidate_sort_key(candidate: SpotlightOpportunityCandidate) -> tuple[Any, ...]:
    meta = candidate.tie_break_metadata or {}
    freshness = _datetime_from_iso(meta.get("freshness_at"))
    freshness_ts = freshness.timestamp() if freshness is not None else 0.0
    return (
        int(candidate.priority_rank),
        int(meta.get("match_strength_rank", _MATCH_STRENGTH_RANK[MATCH_STRENGTH_NONE])),
        -int(meta.get("match_reason_quality", 0)),
        int(meta.get("interest_relevance_rank", 1)),
        int(meta.get("availability_rank", 1)),
        int(meta.get("geographic_compatibility_rank", _GEO_RANK[GEO_UNKNOWN])),
        -freshness_ts,
        int(candidate.campaign_id),
    )


def _best_match_strength(matches: tuple[SpotlightDemandMatchResult, ...]) -> str:
    if not matches:
        return MATCH_STRENGTH_NONE
    return min(
        (match.match_strength for match in matches),
        key=lambda strength: _MATCH_STRENGTH_RANK.get(strength, _MATCH_STRENGTH_RANK[MATCH_STRENGTH_NONE]),
    )


def _best_geo_compatibility(matches: tuple[SpotlightDemandMatchResult, ...]) -> str:
    if not matches:
        return GEO_UNKNOWN
    return min(
        (match.geographic_compatibility for match in matches),
        key=lambda geo: _GEO_RANK.get(geo, _GEO_RANK[GEO_UNKNOWN]),
    )


def _safe_ints(values: Optional[Iterable[int]]) -> list[int]:
    if values is None:
        return []
    out: list[int] = []
    seen: set[int] = set()
    for value in values:
        safe_value = int(value or 0)
        if safe_value <= 0 or safe_value in seen:
            continue
        seen.add(safe_value)
        out.append(safe_value)
    return out


def _dedupe_strings(values: Iterable[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = str(value or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return out


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _datetime_from_iso(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        return _as_aware_utc(datetime.fromisoformat(str(value)))
    except Exception:
        return None
