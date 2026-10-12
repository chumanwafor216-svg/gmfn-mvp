from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from sqlalchemy.orm import Session

from app.db.models import MarketplaceRequest, SpotlightCampaign
from app.services.demand_supply_intelligence_service import (
    OPEN_DEMAND_STATUS,
    _clean_text,
    _demand_compatibility_tokens,
    _is_visible_live_demand,
    _tokens,
)
from app.services.spotlight_opportunity_eligibility_service import (
    SpotlightEligibilityResult,
    evaluate_spotlight_eligibility,
    evaluate_spotlight_eligibility_batch,
)

MATCH_STRENGTH_STRONG = "strong"
MATCH_STRENGTH_POSSIBLE = "possible"
MATCH_STRENGTH_NONE = "none"

GEO_COMPATIBLE = "compatible"
GEO_INCOMPATIBLE = "incompatible"
GEO_UNKNOWN = "unknown"

REASON_ELIGIBLE = "phase2_eligible"
REASON_INTENT_OFFER = "intent_offer"
REASON_AVAILABILITY_AVAILABLE = "opportunity_available"
REASON_AVAILABILITY_UNKNOWN = "opportunity_availability_unknown"
REASON_EXACT_SUBCATEGORY_MATCH = "exact_subcategory_match"
REASON_NORMALIZED_SUBCATEGORY_MATCH = "normalized_subcategory_match"
REASON_EXPLICIT_KEYWORD_MATCH = "explicit_keyword_match"
REASON_NORMALIZED_KEYWORD_OVERLAP = "normalized_keyword_overlap"
REASON_COMPATIBLE_PRIMARY_CATEGORY = "compatible_primary_category"
REASON_GEO_COMMUNITY_SCOPE = "geo_community_scope"
REASON_GEO_GLOBAL = "geo_global"
REASON_GEO_REMOTE = "geo_remote"
REASON_GEO_REMOTE_AVAILABLE = "geo_remote_available"
REASON_GEO_LOCAL_MATCH = "geo_local_match"
REASON_GEO_REGIONAL_MATCH = "geo_regional_match"
REASON_GEO_NATIONAL_MATCH = "geo_national_match"
REASON_GEO_UNKNOWN = "geo_unknown"

REJECTION_DEMAND_NOT_FOUND = "demand_not_found"
REJECTION_DEMAND_NOT_OPEN = "demand_not_open_or_visible"
REJECTION_NOT_ELIGIBLE = "phase2_not_eligible"
REJECTION_INTENT_NOT_OFFER = "intent_not_offer"
REJECTION_OPPORTUNITY_UNAVAILABLE = "opportunity_unavailable"
REJECTION_OPPORTUNITY_EXPIRED = "opportunity_expired"
REJECTION_SEMANTIC_MISMATCH = "semantic_mismatch"
REJECTION_GEO_INCOMPATIBLE = "geography_incompatible"
REJECTION_GEO_UNKNOWN_FOR_LOCAL_SCOPE = "geography_unknown_for_local_scope"
REJECTION_AVAILABILITY_UNKNOWN_WEAK_SIGNAL = "availability_unknown_without_strong_signal"
REJECTION_CAMPAIGN_NOT_FOUND = "campaign_not_found"

_PRIMARY_CATEGORY_TERMS = {
    "employment": {"job", "work", "hire", "career", "employment", "worker"},
    "business_service": {"plumb", "electric", "repair", "clean", "service", "tailor"},
    "professional_service": {"account", "tax", "legal", "consult", "bookkeep"},
    "education_training": {"tutor", "teach", "training", "course", "lesson"},
    "property": {"rent", "room", "house", "property", "flat"},
    "community_support": {"support", "help", "care"},
    "event": {"event", "workshop", "meeting", "class"},
    "volunteering": {"volunteer", "volunteering"},
    "buy_sell": {"buy", "sell", "sale"},
}
_LOCALIZED_GEO_SCOPES = {"local", "regional", "national"}


@dataclass(frozen=True)
class SpotlightDemandSemanticResult:
    strength: str
    positive_reasons: tuple[str, ...]


@dataclass(frozen=True)
class SpotlightDemandGeographyResult:
    compatibility: str
    positive_reasons: tuple[str, ...] = ()
    rejection_reason: Optional[str] = None


@dataclass(frozen=True)
class SpotlightDemandMatchResult:
    demand_id: int
    campaign_id: int
    matched: bool
    match_strength: str
    positive_reasons: tuple[str, ...] = ()
    rejection_reasons: tuple[str, ...] = ()
    eligibility: Optional[SpotlightEligibilityResult] = None
    geographic_compatibility: str = GEO_UNKNOWN
    availability_state: str = "unspecified"
    privacy: str = "internal_route_provenance_only"

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "demand_id": self.demand_id,
            "campaign_id": self.campaign_id,
            "matched": self.matched,
            "match_strength": self.match_strength,
            "positive_reasons": list(self.positive_reasons),
            "rejection_reasons": list(self.rejection_reasons),
            "eligibility": (
                self.eligibility.to_internal_dict()
                if self.eligibility is not None
                else None
            ),
            "eligibility_routes": (
                [route.to_internal_dict() for route in self.eligibility.routes]
                if self.eligibility is not None
                else []
            ),
            "geographic_compatibility": self.geographic_compatibility,
            "availability_state": self.availability_state,
            "privacy": self.privacy,
        }


def find_spotlight_matches_for_demand(
    db: Session,
    *,
    demand_id: int,
    current_user_id: int,
    campaign_ids: Optional[Iterable[int]] = None,
    limit: int = 25,
    now: Optional[datetime] = None,
) -> list[SpotlightDemandMatchResult]:
    current_time = _as_aware_utc(now) or _now_utc()
    demand = db.get(MarketplaceRequest, int(demand_id))
    if not _demand_is_open_and_visible(db, demand, current_user_id=int(current_user_id)):
        return []

    safe_campaign_ids = _safe_campaign_ids(campaign_ids)
    if not safe_campaign_ids:
        safe_campaign_ids = [
            int(row.id)
            for row in (
                db.query(SpotlightCampaign.id)
                .filter(SpotlightCampaign.status == "active")
                .filter(SpotlightCampaign.owner_user_id != int(current_user_id))
                .order_by(SpotlightCampaign.created_at.desc(), SpotlightCampaign.id.desc())
                .limit(max(int(limit) * 8, int(limit), 25))
                .all()
            )
        ]
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
        viewer_user_id=int(current_user_id),
        campaign_ids=safe_campaign_ids,
        now=current_time,
    )

    results: list[SpotlightDemandMatchResult] = []
    for eligibility in eligibility_results:
        campaign = campaign_by_id.get(int(eligibility.campaign_id))
        if campaign is None:
            continue
        result = _evaluate_loaded_campaign_match(
            demand=demand,
            campaign=campaign,
            eligibility=eligibility,
            now=current_time,
        )
        if result.matched:
            results.append(result)
            if len(results) >= int(limit):
                break
    return results


def evaluate_spotlight_demand_match(
    db: Session,
    *,
    demand_id: int,
    campaign_id: int,
    current_user_id: int,
    now: Optional[datetime] = None,
) -> SpotlightDemandMatchResult:
    current_time = _as_aware_utc(now) or _now_utc()
    demand = db.get(MarketplaceRequest, int(demand_id))
    campaign = db.get(SpotlightCampaign, int(campaign_id))

    if demand is None:
        return _result(
            demand_id=int(demand_id),
            campaign_id=int(campaign_id),
            rejection_reasons=(REJECTION_DEMAND_NOT_FOUND,),
        )
    if not _demand_is_open_and_visible(db, demand, current_user_id=int(current_user_id)):
        return _result(
            demand_id=int(demand_id),
            campaign_id=int(campaign_id),
            rejection_reasons=(REJECTION_DEMAND_NOT_OPEN,),
        )
    if campaign is None:
        return _result(
            demand_id=int(demand_id),
            campaign_id=int(campaign_id),
            rejection_reasons=(REJECTION_CAMPAIGN_NOT_FOUND,),
        )

    eligibility = evaluate_spotlight_eligibility(
        db,
        viewer_user_id=int(current_user_id),
        campaign_id=int(campaign_id),
        now=current_time,
    )
    return _evaluate_loaded_campaign_match(
        demand=demand,
        campaign=campaign,
        eligibility=eligibility,
        now=current_time,
    )


def _evaluate_loaded_campaign_match(
    *,
    demand: MarketplaceRequest,
    campaign: SpotlightCampaign,
    eligibility: SpotlightEligibilityResult,
    now: datetime,
) -> SpotlightDemandMatchResult:
    demand_id = int(getattr(demand, "id", 0) or 0)
    campaign_id = int(getattr(campaign, "id", 0) or int(eligibility.campaign_id))
    if not eligibility.eligible:
        return _result(
            demand_id=demand_id,
            campaign_id=campaign_id,
            eligibility=eligibility,
            rejection_reasons=_eligibility_rejections(eligibility),
        )

    availability_allowed, availability_state, availability_rejection = _availability_allows_match(
        campaign=campaign,
        now=now,
    )
    if not availability_allowed:
        return _result(
            demand_id=demand_id,
            campaign_id=campaign_id,
            eligibility=eligibility,
            availability_state=availability_state,
            rejection_reasons=(availability_rejection or REJECTION_OPPORTUNITY_UNAVAILABLE,),
        )

    intent = _clean_text(getattr(campaign, "opportunity_intent", None)).lower()
    if intent != "offer":
        return _result(
            demand_id=demand_id,
            campaign_id=campaign_id,
            eligibility=eligibility,
            availability_state=availability_state,
            rejection_reasons=(REJECTION_INTENT_NOT_OFFER,),
        )

    semantic = _semantic_match(demand=demand, campaign=campaign)
    if semantic.strength == MATCH_STRENGTH_NONE:
        return _result(
            demand_id=demand_id,
            campaign_id=campaign_id,
            eligibility=eligibility,
            availability_state=availability_state,
            rejection_reasons=(REJECTION_SEMANTIC_MISMATCH,),
        )

    geography = _geography_compatible(demand=demand, campaign=campaign)
    if geography.compatibility == GEO_INCOMPATIBLE:
        return _result(
            demand_id=demand_id,
            campaign_id=campaign_id,
            eligibility=eligibility,
            availability_state=availability_state,
            geographic_compatibility=geography.compatibility,
            rejection_reasons=(geography.rejection_reason or REJECTION_GEO_INCOMPATIBLE,),
        )
    if geography.compatibility == GEO_UNKNOWN and _localized_geo_scope(campaign):
        return _result(
            demand_id=demand_id,
            campaign_id=campaign_id,
            eligibility=eligibility,
            availability_state=availability_state,
            geographic_compatibility=geography.compatibility,
            rejection_reasons=(REJECTION_GEO_UNKNOWN_FOR_LOCAL_SCOPE,),
        )
    if availability_state == "unspecified" and semantic.strength != MATCH_STRENGTH_STRONG:
        return _result(
            demand_id=demand_id,
            campaign_id=campaign_id,
            eligibility=eligibility,
            availability_state=availability_state,
            geographic_compatibility=geography.compatibility,
            rejection_reasons=(REJECTION_AVAILABILITY_UNKNOWN_WEAK_SIGNAL,),
        )

    strength = semantic.strength
    positive_reasons = [REASON_ELIGIBLE, REASON_INTENT_OFFER]
    if availability_state == "available":
        positive_reasons.append(REASON_AVAILABILITY_AVAILABLE)
    else:
        positive_reasons.append(REASON_AVAILABILITY_UNKNOWN)
        strength = MATCH_STRENGTH_POSSIBLE
    positive_reasons.extend(semantic.positive_reasons)
    positive_reasons.extend(geography.positive_reasons or (REASON_GEO_UNKNOWN,))

    return SpotlightDemandMatchResult(
        demand_id=demand_id,
        campaign_id=campaign_id,
        matched=True,
        match_strength=strength,
        positive_reasons=tuple(_dedupe_strings(positive_reasons)),
        rejection_reasons=(),
        eligibility=eligibility,
        geographic_compatibility=geography.compatibility,
        availability_state=availability_state,
    )


def _availability_allows_match(
    *,
    campaign: SpotlightCampaign,
    now: datetime,
) -> tuple[bool, str, Optional[str]]:
    state = _clean_text(getattr(campaign, "opportunity_availability", None)).lower()
    state = state or "unspecified"
    if state == "unavailable":
        return False, state, REJECTION_OPPORTUNITY_UNAVAILABLE
    expires_at = _as_aware_utc(getattr(campaign, "opportunity_expires_at", None))
    if expires_at is not None and expires_at <= now:
        return False, state, REJECTION_OPPORTUNITY_EXPIRED
    if state not in {"available", "unspecified"}:
        state = "unspecified"
    return True, state, None


def _semantic_match(
    *,
    demand: MarketplaceRequest,
    campaign: SpotlightCampaign,
) -> SpotlightDemandSemanticResult:
    demand_terms = _demand_compatibility_tokens(demand)
    demand_all_terms = _tokens(
        getattr(demand, "category", None),
        getattr(demand, "title", None),
        getattr(demand, "description", None),
    )
    demand_text_key = _phrase_key(
        " ".join(
            _clean_text(value)
            for value in (
                getattr(demand, "category", None),
                getattr(demand, "title", None),
                getattr(demand, "description", None),
            )
        )
    )
    reasons: list[str] = []

    subcategory = _clean_text(getattr(campaign, "opportunity_subcategory", None))
    if subcategory:
        if _phrase_key(getattr(demand, "category", None)) == _phrase_key(subcategory):
            reasons.append(REASON_EXACT_SUBCATEGORY_MATCH)
        elif demand_terms & _tokens(subcategory):
            reasons.append(REASON_NORMALIZED_SUBCATEGORY_MATCH)

    keyword_phrases, keyword_terms = _campaign_keyword_terms(campaign)
    if keyword_phrases and any(keyword in demand_text_key for keyword in keyword_phrases):
        reasons.append(REASON_EXPLICIT_KEYWORD_MATCH)
    if keyword_terms and demand_all_terms & keyword_terms:
        reasons.append(REASON_NORMALIZED_KEYWORD_OVERLAP)

    category = _clean_text(getattr(campaign, "opportunity_category", None)).lower()
    primary_terms = _PRIMARY_CATEGORY_TERMS.get(category, set())
    if primary_terms and demand_terms & primary_terms:
        reasons.append(REASON_COMPATIBLE_PRIMARY_CATEGORY)

    reasons = _dedupe_strings(reasons)
    if any(
        reason in reasons
        for reason in (
            REASON_EXACT_SUBCATEGORY_MATCH,
            REASON_NORMALIZED_SUBCATEGORY_MATCH,
            REASON_EXPLICIT_KEYWORD_MATCH,
            REASON_NORMALIZED_KEYWORD_OVERLAP,
        )
    ):
        return SpotlightDemandSemanticResult(
            strength=MATCH_STRENGTH_STRONG,
            positive_reasons=tuple(reasons),
        )
    if REASON_COMPATIBLE_PRIMARY_CATEGORY in reasons:
        return SpotlightDemandSemanticResult(
            strength=MATCH_STRENGTH_POSSIBLE,
            positive_reasons=tuple(reasons),
        )
    return SpotlightDemandSemanticResult(strength=MATCH_STRENGTH_NONE, positive_reasons=())


def _geography_compatible(
    *,
    demand: MarketplaceRequest,
    campaign: SpotlightCampaign,
) -> SpotlightDemandGeographyResult:
    scope = _clean_text(getattr(campaign, "opportunity_geo_scope", None)).lower() or "unspecified"
    remote_available = getattr(campaign, "opportunity_remote_available", None)
    if remote_available is True:
        return SpotlightDemandGeographyResult(
            compatibility=GEO_COMPATIBLE,
            positive_reasons=(REASON_GEO_REMOTE_AVAILABLE,),
        )
    if scope == "global":
        return SpotlightDemandGeographyResult(
            compatibility=GEO_COMPATIBLE,
            positive_reasons=(REASON_GEO_GLOBAL,),
        )
    if scope == "remote":
        if remote_available is not False:
            return SpotlightDemandGeographyResult(
                compatibility=GEO_COMPATIBLE,
                positive_reasons=(REASON_GEO_REMOTE,),
            )
        return SpotlightDemandGeographyResult(
            compatibility=GEO_INCOMPATIBLE,
            rejection_reason=REJECTION_GEO_INCOMPATIBLE,
        )
    if scope == "community":
        return SpotlightDemandGeographyResult(
            compatibility=GEO_COMPATIBLE,
            positive_reasons=(REASON_GEO_COMMUNITY_SCOPE,),
        )
    if scope == "local":
        return _field_area_compatibility(
            demand=demand,
            campaign_value=getattr(campaign, "opportunity_locality", None),
            positive_reason=REASON_GEO_LOCAL_MATCH,
        )
    if scope == "regional":
        return _field_area_compatibility(
            demand=demand,
            campaign_value=getattr(campaign, "opportunity_region", None),
            positive_reason=REASON_GEO_REGIONAL_MATCH,
        )
    if scope == "national":
        return _field_area_compatibility(
            demand=demand,
            campaign_value=getattr(campaign, "opportunity_country", None),
            positive_reason=REASON_GEO_NATIONAL_MATCH,
        )
    return SpotlightDemandGeographyResult(compatibility=GEO_UNKNOWN)


def _field_area_compatibility(
    *,
    demand: MarketplaceRequest,
    campaign_value: Any,
    positive_reason: str,
) -> SpotlightDemandGeographyResult:
    demand_area_terms = _tokens(getattr(demand, "area", None))
    campaign_terms = _tokens(campaign_value)
    if demand_area_terms and campaign_terms:
        if demand_area_terms & campaign_terms:
            return SpotlightDemandGeographyResult(
                compatibility=GEO_COMPATIBLE,
                positive_reasons=(positive_reason,),
            )
        return SpotlightDemandGeographyResult(
            compatibility=GEO_INCOMPATIBLE,
            rejection_reason=REJECTION_GEO_INCOMPATIBLE,
        )
    return SpotlightDemandGeographyResult(compatibility=GEO_UNKNOWN)


def _campaign_keyword_terms(campaign: SpotlightCampaign) -> tuple[set[str], set[str]]:
    raw = getattr(campaign, "opportunity_keywords_json", None)
    if not raw:
        return set(), set()
    try:
        parsed = json.loads(raw)
    except Exception:
        return set(), set()
    if not isinstance(parsed, list):
        return set(), set()
    phrases: set[str] = set()
    terms: set[str] = set()
    for value in parsed:
        phrase = _phrase_key(value)
        if phrase:
            phrases.add(phrase)
            terms.update(_tokens(value))
    return phrases, terms


def _demand_is_open_and_visible(
    db: Session,
    demand: Optional[MarketplaceRequest],
    *,
    current_user_id: int,
) -> bool:
    if demand is None:
        return False
    if _clean_text(getattr(demand, "status", None)).lower() != OPEN_DEMAND_STATUS:
        return False
    return _is_visible_live_demand(db, demand, current_user_id=int(current_user_id))


def _localized_geo_scope(campaign: SpotlightCampaign) -> bool:
    return _clean_text(getattr(campaign, "opportunity_geo_scope", None)).lower() in _LOCALIZED_GEO_SCOPES


def _eligibility_rejections(eligibility: SpotlightEligibilityResult) -> tuple[str, ...]:
    rejection = _clean_text(getattr(eligibility, "rejection_code", None))
    if rejection:
        return (f"{REJECTION_NOT_ELIGIBLE}:{rejection}",)
    return (REJECTION_NOT_ELIGIBLE,)


def _result(
    *,
    demand_id: int,
    campaign_id: int,
    rejection_reasons: tuple[str, ...],
    eligibility: Optional[SpotlightEligibilityResult] = None,
    geographic_compatibility: str = GEO_UNKNOWN,
    availability_state: str = "unspecified",
) -> SpotlightDemandMatchResult:
    return SpotlightDemandMatchResult(
        demand_id=int(demand_id),
        campaign_id=int(campaign_id),
        matched=False,
        match_strength=MATCH_STRENGTH_NONE,
        positive_reasons=(),
        rejection_reasons=tuple(rejection_reasons),
        eligibility=eligibility,
        geographic_compatibility=geographic_compatibility,
        availability_state=availability_state,
    )


def _safe_campaign_ids(values: Optional[Iterable[int]]) -> list[int]:
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
        text = _clean_text(value)
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return out


def _phrase_key(value: Any) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", str(value or "").lower()))


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
