from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import SpotlightCampaign, SpotlightExposureEvent
from app.services.spotlight_demandbox_matching_service import _availability_allows_match
from app.services.spotlight_opportunity_candidate_service import (
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH,
    SpotlightOpportunityCandidate,
)
from app.services.spotlight_lifecycle_service import row_is_serving
from app.services.spotlight_opportunity_eligibility_service import (
    SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT,
    SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
    SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
)

SPOTLIGHT_EXPOSURE_EVENT_SERVED = "served"
SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION = "qualifying_impression"
SPOTLIGHT_EXPOSURE_EVENT_OPENED_INTERACTION = "opened_interaction"

REJECTION_VIEWER_REQUIRED = "viewer_user_id_required"
REJECTION_CANONICAL_CANDIDATE_REQUIRED = "canonical_candidate_required"
REJECTION_CANONICAL_CAMPAIGN_REQUIRED = "canonical_campaign_id_required"
REJECTION_CAMPAIGN_NOT_FOUND = "campaign_not_found"
REJECTION_CAMPAIGN_NOT_ACTIVE = "campaign_not_active"
REJECTION_SELF_DELIVERY = "self_delivery_excluded"
REJECTION_OWNER_PREVIEW = "owner_preview_excluded"
REJECTION_NO_ALLOCATION_ROUTE = "no_allocation_route"
REJECTION_OPPORTUNITY_UNAVAILABLE = "opportunity_unavailable"
REJECTION_OPPORTUNITY_EXPIRED = "opportunity_expired"

_SOURCE_KIND_CLAN = "clan"
_SOURCE_KIND_COMMUNITY_DOMAIN = "community_domain"
_SOURCE_KIND_BROADCAST = "broadcast"


@dataclass(frozen=True)
class SpotlightExposureRecordResult:
    recorded: bool
    deduped: bool = False
    event: Optional[SpotlightExposureEvent] = None
    rejection_code: Optional[str] = None
    privacy: str = "private_internal_delivery_ledger"

    def to_internal_dict(self) -> dict[str, Any]:
        event = self.event
        return {
            "recorded": self.recorded,
            "deduped": self.deduped,
            "event_id": int(event.id) if event is not None and event.id is not None else None,
            "viewer_user_id": int(event.viewer_user_id) if event is not None else None,
            "campaign_id": int(event.campaign_id) if event is not None else None,
            "event_type": event.event_type if event is not None else None,
            "event_at": event.event_at.isoformat() if event is not None and event.event_at is not None else None,
            "allocation_route_type": event.allocation_route_type if event is not None else None,
            "allocation_source_kind": event.allocation_source_kind if event is not None else None,
            "allocation_source_id": int(event.allocation_source_id) if event is not None and event.allocation_source_id is not None else None,
            "rejection_code": self.rejection_code,
            "privacy": self.privacy,
        }


@dataclass(frozen=True)
class SpotlightExposureAttribution:
    allocation_route_type: str
    allocation_source_kind: Optional[str]
    allocation_source_id: Optional[int]
    allocation_route_clan_id: Optional[int]
    placement_broadcast_id: Optional[int]
    supporting_routes: tuple[dict[str, Any], ...]


def record_spotlight_qualifying_impression(
    db: Session,
    *,
    viewer_user_id: int,
    candidate: Optional[SpotlightOpportunityCandidate],
    idempotency_key: Optional[str] = None,
    event_at: Optional[datetime] = None,
    presentation_surface: str = "opportunity_engine",
    presentation_context: Optional[dict[str, Any]] = None,
    content_version: Optional[int] = None,
    presentation_id: Optional[str] = None,
    owner_preview: bool = False,
    marketplace_attention_event_id: Optional[int] = None,
) -> SpotlightExposureRecordResult:
    current_time = _as_aware_utc(event_at) or _now_utc()
    viewer_id = int(viewer_user_id or 0)
    if viewer_id <= 0:
        return _rejected(REJECTION_VIEWER_REQUIRED)
    if candidate is None:
        return _rejected(REJECTION_CANONICAL_CANDIDATE_REQUIRED)

    campaign_id = int(getattr(candidate, "campaign_id", 0) or 0)
    if campaign_id <= 0:
        return _rejected(REJECTION_CANONICAL_CAMPAIGN_REQUIRED)

    key = _safe_text(idempotency_key, max_length=160) or None
    if key:
        existing = (
            db.query(SpotlightExposureEvent)
            .filter(
                SpotlightExposureEvent.viewer_user_id == viewer_id,
                SpotlightExposureEvent.idempotency_key == key,
            )
            .first()
        )
        if existing is not None:
            return SpotlightExposureRecordResult(recorded=False, deduped=True, event=existing)

    campaign = db.get(SpotlightCampaign, campaign_id)
    if campaign is None:
        return _rejected(REJECTION_CAMPAIGN_NOT_FOUND)
    if owner_preview:
        return _rejected(REJECTION_OWNER_PREVIEW)
    if int(getattr(campaign, "owner_user_id", 0) or 0) == viewer_id:
        return _rejected(REJECTION_SELF_DELIVERY)

    status = _safe_text(getattr(campaign, "status", None)).lower()
    expires_at = _as_aware_utc(getattr(campaign, "expires_at", None))
    if status != "active" or (expires_at is not None and expires_at <= current_time):
        return _rejected(REJECTION_CAMPAIGN_NOT_ACTIVE)

    if not row_is_serving(campaign, now=current_time):
        return _rejected(REJECTION_CAMPAIGN_NOT_ACTIVE)

    availability_allowed, _availability_state, availability_rejection = _availability_allows_match(
        campaign=campaign,
        now=current_time,
    )
    if not availability_allowed:
        return _rejected(availability_rejection or REJECTION_OPPORTUNITY_UNAVAILABLE)

    attribution = derive_spotlight_exposure_attribution(candidate)
    if attribution is None:
        return _rejected(REJECTION_NO_ALLOCATION_ROUTE)

    relevance_signals = _relevance_signals(candidate)
    event = SpotlightExposureEvent(
        event_type=SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
        viewer_user_id=viewer_id,
        campaign_id=campaign_id,
        content_version=int(content_version or getattr(campaign, 'content_version', 1) or 1),
        presentation_id=_safe_text(presentation_id, max_length=80) or None,
        event_at=current_time,
        allocation_route_type=attribution.allocation_route_type,
        allocation_source_kind=attribution.allocation_source_kind,
        allocation_source_id=attribution.allocation_source_id,
        allocation_route_clan_id=attribution.allocation_route_clan_id,
        placement_broadcast_id=attribution.placement_broadcast_id,
        marketplace_attention_event_id=(
            int(marketplace_attention_event_id)
            if marketplace_attention_event_id is not None and int(marketplace_attention_event_id or 0) > 0
            else None
        ),
        idempotency_key=key,
        presentation_surface=_safe_text(presentation_surface, max_length=80) or "opportunity_engine",
        demandbox_relevant=bool(relevance_signals.get("demandbox_relevant")),
        explicit_interest_relevant=bool(relevance_signals.get("explicit_interest_relevant")),
        supporting_routes_json=_json_dumps(list(attribution.supporting_routes)),
        relevance_signals_json=_json_dumps(relevance_signals),
        presentation_context_json=_json_dumps(presentation_context or {}),
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if key:
            existing = (
                db.query(SpotlightExposureEvent)
                .filter(
                    SpotlightExposureEvent.viewer_user_id == viewer_id,
                    SpotlightExposureEvent.idempotency_key == key,
                )
                .first()
            )
            if existing is not None:
                return SpotlightExposureRecordResult(recorded=False, deduped=True, event=existing)
        raise
    db.refresh(event)
    return SpotlightExposureRecordResult(recorded=True, event=event)


def count_qualifying_impressions_for_viewer(
    db: Session,
    *,
    viewer_user_id: int,
    since: Optional[datetime] = None,
    last_n: Optional[int] = None,
) -> int:
    if last_n is not None:
        return len(recent_qualifying_impressions_for_viewer(db, viewer_user_id=viewer_user_id, limit=last_n, since=since))
    return int(_qualifying_query(db, viewer_user_id=viewer_user_id, since=since).count())


def recent_qualifying_impressions_for_viewer(
    db: Session,
    *,
    viewer_user_id: int,
    limit: int = 25,
    since: Optional[datetime] = None,
) -> list[SpotlightExposureEvent]:
    return (
        _qualifying_query(db, viewer_user_id=viewer_user_id, since=since)
        .order_by(SpotlightExposureEvent.event_at.desc(), SpotlightExposureEvent.id.desc())
        .limit(max(int(limit), 0))
        .all()
    )


def qualifying_impression_counts_by_route_type(
    db: Session,
    *,
    viewer_user_id: int,
    since: Optional[datetime] = None,
    last_n: Optional[int] = None,
) -> dict[str, int]:
    events = _events_for_grouping(db, viewer_user_id=viewer_user_id, since=since, last_n=last_n)
    counts: dict[str, int] = {}
    for event in events:
        key = _safe_text(event.allocation_route_type) or "unknown"
        counts[key] = counts.get(key, 0) + 1
    return counts


def qualifying_impression_counts_by_route_source(
    db: Session,
    *,
    viewer_user_id: int,
    since: Optional[datetime] = None,
    last_n: Optional[int] = None,
) -> dict[tuple[str, Optional[int]], int]:
    events = _events_for_grouping(db, viewer_user_id=viewer_user_id, since=since, last_n=last_n)
    counts: dict[tuple[str, Optional[int]], int] = {}
    for event in events:
        key = (_safe_text(event.allocation_route_type) or "unknown", _safe_int_or_none(event.allocation_source_id))
        counts[key] = counts.get(key, 0) + 1
    return counts


def qualifying_impression_counts_by_campaign(
    db: Session,
    *,
    viewer_user_id: int,
    since: Optional[datetime] = None,
    last_n: Optional[int] = None,
) -> dict[int, int]:
    events = _events_for_grouping(db, viewer_user_id=viewer_user_id, since=since, last_n=last_n)
    counts: dict[int, int] = {}
    for event in events:
        key = int(event.campaign_id)
        counts[key] = counts.get(key, 0) + 1
    return counts


def most_recent_qualifying_impression_at_by_campaign(
    db: Session,
    *,
    viewer_user_id: int,
    since: Optional[datetime] = None,
) -> dict[int, datetime]:
    rows = (
        _qualifying_query(db, viewer_user_id=viewer_user_id, since=since)
        .with_entities(SpotlightExposureEvent.campaign_id, func.max(SpotlightExposureEvent.event_at))
        .group_by(SpotlightExposureEvent.campaign_id)
        .all()
    )
    return {int(campaign_id): _as_aware_utc(last_seen) or last_seen for campaign_id, last_seen in rows}


def _qualifying_query(db: Session, *, viewer_user_id: int, since: Optional[datetime] = None):
    query = db.query(SpotlightExposureEvent).filter(
        SpotlightExposureEvent.viewer_user_id == int(viewer_user_id),
        SpotlightExposureEvent.event_type == SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
    )
    since_at = _as_aware_utc(since)
    if since_at is not None:
        query = query.filter(SpotlightExposureEvent.event_at >= since_at)
    return query


def _events_for_grouping(
    db: Session,
    *,
    viewer_user_id: int,
    since: Optional[datetime],
    last_n: Optional[int],
) -> list[SpotlightExposureEvent]:
    if last_n is not None:
        return recent_qualifying_impressions_for_viewer(
            db,
            viewer_user_id=viewer_user_id,
            limit=last_n,
            since=since,
        )
    return _qualifying_query(db, viewer_user_id=viewer_user_id, since=since).all()


def derive_spotlight_exposure_attribution(candidate: SpotlightOpportunityCandidate) -> Optional[SpotlightExposureAttribution]:
    return _attribution_for_candidate(candidate)


def _attribution_for_candidate(candidate: SpotlightOpportunityCandidate) -> Optional[SpotlightExposureAttribution]:
    routes = tuple(getattr(candidate.eligibility, "routes", ()) or ())
    supporting_routes = tuple(route.to_internal_dict() for route in routes)
    direct_routes = sorted(
        (route for route in routes if route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY),
        key=lambda route: (int(route.route_clan_id or 0), int(route.placement_broadcast_id or 0)),
    )
    domain_routes = sorted(
        (route for route in routes if route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN),
        key=lambda route: (int(route.community_domain_id or 0), int(route.viewer_branch_clan_id or 0)),
    )
    placement_routes = sorted(
        (route for route in routes if route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT),
        key=lambda route: (int(route.placement_broadcast_id or 0), int(route.route_clan_id or 0)),
    )

    band = _safe_text(getattr(candidate, "priority_band", None))
    if band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH:
        route = _first_available(direct_routes, domain_routes, placement_routes)
    elif band == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY or band == "direct_community":
        route = _first_available(direct_routes, domain_routes, placement_routes)
    elif band == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN or band == "community_domain":
        route = _first_available(domain_routes, direct_routes, placement_routes)
    else:
        route = _first_available(placement_routes, direct_routes, domain_routes)
    if route is None:
        return None

    if route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN:
        return SpotlightExposureAttribution(
            allocation_route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
            allocation_source_kind=_SOURCE_KIND_COMMUNITY_DOMAIN,
            allocation_source_id=_safe_int_or_none(route.community_domain_id),
            allocation_route_clan_id=_safe_int_or_none(route.route_clan_id),
            placement_broadcast_id=_safe_int_or_none(route.placement_broadcast_id),
            supporting_routes=supporting_routes,
        )
    if route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY:
        return SpotlightExposureAttribution(
            allocation_route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
            allocation_source_kind=_SOURCE_KIND_CLAN,
            allocation_source_id=_safe_int_or_none(route.route_clan_id),
            allocation_route_clan_id=_safe_int_or_none(route.route_clan_id),
            placement_broadcast_id=_safe_int_or_none(route.placement_broadcast_id),
            supporting_routes=supporting_routes,
        )
    source_id = _safe_int_or_none(route.placement_broadcast_id) or _safe_int_or_none(route.route_clan_id)
    return SpotlightExposureAttribution(
        allocation_route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT,
        allocation_source_kind=_SOURCE_KIND_BROADCAST if route.placement_broadcast_id else _SOURCE_KIND_CLAN,
        allocation_source_id=source_id,
        allocation_route_clan_id=_safe_int_or_none(route.route_clan_id),
        placement_broadcast_id=_safe_int_or_none(route.placement_broadcast_id),
        supporting_routes=supporting_routes,
    )


def _first_available(*route_groups: Iterable[Any]) -> Optional[Any]:
    for group in route_groups:
        for route in group:
            return route
    return None


def _relevance_signals(candidate: SpotlightOpportunityCandidate) -> dict[str, Any]:
    interest = getattr(candidate, "interest_relevance", None)
    return {
        "demandbox_relevant": bool(getattr(candidate, "matched_demand_ids", ()) or ()),
        "matched_demand_ids": [int(value) for value in getattr(candidate, "matched_demand_ids", ())],
        "match_reasons": list(getattr(candidate, "match_reasons", ()) or ()),
        "explicit_interest_relevant": bool(getattr(interest, "relevant", False)) if interest is not None else False,
        "matched_interest_categories": list(getattr(interest, "matched_interests", ()) or ()),
        "candidate_priority_band": _safe_text(getattr(candidate, "priority_band", None)),
        "candidate_priority_rank": int(getattr(candidate, "priority_rank", 0) or 0),
    }


def _rejected(code: str) -> SpotlightExposureRecordResult:
    return SpotlightExposureRecordResult(recorded=False, rejection_code=code)


def _json_dumps(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _safe_text(value: Any, fallback: str = "", *, max_length: int = 240) -> str:
    text = str(value if value is not None else fallback).strip()
    if len(text) > max_length:
        return text[:max_length]
    return text


def _safe_int_or_none(value: Any) -> Optional[int]:
    try:
        parsed = int(value)
    except Exception:
        return None
    return parsed if parsed > 0 else None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, str):
        normalized = value.strip()
        if not normalized:
            return None
        if normalized.endswith("Z"):
            normalized = f"{normalized[:-1]}+00:00"
        try:
            value = datetime.fromisoformat(normalized)
        except ValueError:
            return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
