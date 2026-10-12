from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Optional

from sqlalchemy.orm import Session

from app.db.models import SpotlightExposureEvent
from app.services.spotlight_exposure_ledger_service import (
    derive_spotlight_exposure_attribution,
    recent_qualifying_impressions_for_viewer,
)
from app.services.spotlight_opportunity_candidate_service import (
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH,
    SpotlightOpportunityCandidate,
)
from app.services.spotlight_opportunity_eligibility_service import (
    SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT,
    SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
    SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
)

SPOTLIGHT_DIVERSITY_WARMUP_IMPRESSION_THRESHOLD = 40
SPOTLIGHT_DIVERSITY_RECENT_EXPOSURE_WINDOW = 100
SPOTLIGHT_DIVERSITY_SOURCE_CONCENTRATION_THRESHOLD = 0.60

SPOTLIGHT_DIVERSITY_EXEMPTION_DEMANDBOX_MATCH = "demandbox_match"
SPOTLIGHT_DIVERSITY_FALLBACK_SPARSE_INVENTORY = "sparse_inventory_no_viable_alternative"
SPOTLIGHT_DIVERSITY_PRIVACY = "private_internal_allocation_metadata"

_BUCKET_DIRECT_PREFIX = "direct_community"
_BUCKET_DOMAIN_PREFIX = "community_domain"
_BUCKET_PLACEMENT_PREFIX = "canonical_placement"
_BUCKET_UNKNOWN = "unknown_source"


@dataclass(frozen=True)
class SpotlightCandidateDiversityAllocation:
    campaign_id: int
    original_rank: int
    allocated_rank: int
    priority_band: str
    priority_rank: int
    source_bucket: str
    source_count: int
    source_ratio: float
    over_threshold: bool
    diversity_pressure_applied: bool
    diversity_exemption: Optional[str] = None
    sparse_inventory_fallback_reason: Optional[str] = None

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "original_rank": self.original_rank,
            "allocated_rank": self.allocated_rank,
            "priority_band": self.priority_band,
            "priority_rank": self.priority_rank,
            "source_bucket": self.source_bucket,
            "source_count": self.source_count,
            "source_ratio": self.source_ratio,
            "over_threshold": self.over_threshold,
            "diversity_pressure_applied": self.diversity_pressure_applied,
            "diversity_exemption": self.diversity_exemption,
            "sparse_inventory_fallback_reason": self.sparse_inventory_fallback_reason,
            "privacy": SPOTLIGHT_DIVERSITY_PRIVACY,
        }


@dataclass(frozen=True)
class SpotlightDiversityAllocationResult:
    viewer_user_id: int
    candidates: tuple[SpotlightOpportunityCandidate, ...]
    warmup_active: bool
    warmup_complete: bool
    viewer_qualifying_impression_count: int
    qualifying_history_count_used: int
    configured_window_size: int
    warmup_threshold: int
    source_concentration_threshold: float
    source_counts: dict[str, int]
    source_ratios: dict[str, float]
    candidate_order_before: tuple[int, ...]
    candidate_order_after: tuple[int, ...]
    candidate_allocations: tuple[SpotlightCandidateDiversityAllocation, ...]
    diversity_pressure_applied: bool
    sparse_inventory_fallback_reason: Optional[str] = None
    privacy: str = SPOTLIGHT_DIVERSITY_PRIVACY

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "viewer_user_id": self.viewer_user_id,
            "warmup_active": self.warmup_active,
            "warmup_complete": self.warmup_complete,
            "viewer_qualifying_impression_count": self.viewer_qualifying_impression_count,
            "qualifying_history_count_used": self.qualifying_history_count_used,
            "configured_window_size": self.configured_window_size,
            "warmup_threshold": self.warmup_threshold,
            "source_concentration_threshold": self.source_concentration_threshold,
            "source_counts": dict(self.source_counts),
            "source_ratios": dict(self.source_ratios),
            "candidate_order_before": list(self.candidate_order_before),
            "candidate_order_after": list(self.candidate_order_after),
            "candidate_allocations": [allocation.to_internal_dict() for allocation in self.candidate_allocations],
            "diversity_pressure_applied": self.diversity_pressure_applied,
            "sparse_inventory_fallback_reason": self.sparse_inventory_fallback_reason,
            "privacy": self.privacy,
        }


def allocate_spotlight_opportunity_candidates(
    db: Session,
    *,
    viewer_user_id: int,
    candidates: Iterable[SpotlightOpportunityCandidate],
    warmup_threshold: int = SPOTLIGHT_DIVERSITY_WARMUP_IMPRESSION_THRESHOLD,
    recent_window: int = SPOTLIGHT_DIVERSITY_RECENT_EXPOSURE_WINDOW,
    source_concentration_threshold: float = SPOTLIGHT_DIVERSITY_SOURCE_CONCENTRATION_THRESHOLD,
) -> SpotlightDiversityAllocationResult:
    viewer_id = int(viewer_user_id or 0)
    candidate_list = list(candidates or [])
    order_before = tuple(int(candidate.campaign_id) for candidate in candidate_list)
    safe_window = max(int(recent_window), 0)
    recent_events = recent_qualifying_impressions_for_viewer(
        db,
        viewer_user_id=viewer_id,
        limit=max(safe_window, 0),
    )
    source_counts = _source_counts_from_events(recent_events)
    history_count_used = len(recent_events)
    source_ratios = _source_ratios(source_counts, history_count_used)
    qualifying_count = history_count_used
    if history_count_used == safe_window and safe_window > 0:
        qualifying_count = max(qualifying_count, int(_qualifying_count(db, viewer_user_id=viewer_id)))

    warmup_active = qualifying_count < int(warmup_threshold)
    candidate_source_buckets = {
        int(candidate.campaign_id): source_bucket_for_candidate(candidate)
        for candidate in candidate_list
    }

    if warmup_active or not candidate_list:
        allocations = _candidate_allocations(
            candidate_list,
            ordered_candidates=candidate_list,
            source_counts=source_counts,
            source_ratios=source_ratios,
            source_buckets=candidate_source_buckets,
            over_threshold_buckets=set(),
            pressured_buckets=set(),
            exempt_campaigns=_demandbox_exempt_campaigns(candidate_list),
            sparse_fallback_buckets=set(),
        )
        return SpotlightDiversityAllocationResult(
            viewer_user_id=viewer_id,
            candidates=tuple(candidate_list),
            warmup_active=warmup_active,
            warmup_complete=not warmup_active,
            viewer_qualifying_impression_count=qualifying_count,
            qualifying_history_count_used=history_count_used,
            configured_window_size=safe_window,
            warmup_threshold=int(warmup_threshold),
            source_concentration_threshold=float(source_concentration_threshold),
            source_counts=source_counts,
            source_ratios=source_ratios,
            candidate_order_before=order_before,
            candidate_order_after=order_before,
            candidate_allocations=allocations,
            diversity_pressure_applied=False,
        )

    over_threshold_buckets = {
        bucket
        for bucket, ratio in source_ratios.items()
        if ratio > float(source_concentration_threshold)
    }
    viable_underrepresented_buckets_by_band = _viable_underrepresented_buckets_by_band(
        candidate_list,
        candidate_source_buckets,
        over_threshold_buckets,
    )
    pressured_buckets = {
        bucket
        for candidate in candidate_list
        for bucket in (candidate_source_buckets.get(int(candidate.campaign_id), _BUCKET_UNKNOWN),)
        if bucket in over_threshold_buckets
        and candidate.priority_band != SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
        and bool(viable_underrepresented_buckets_by_band.get(int(candidate.priority_rank)))
    }
    sparse_fallback_buckets = over_threshold_buckets - pressured_buckets

    ordered_candidates = sorted(
        candidate_list,
        key=lambda candidate: _allocation_sort_key(
            candidate,
            original_index=_original_index(candidate_list, candidate),
            source_bucket=candidate_source_buckets.get(int(candidate.campaign_id), _BUCKET_UNKNOWN),
            pressured_buckets=pressured_buckets,
        ),
    )
    allocations = _candidate_allocations(
        candidate_list,
        ordered_candidates=ordered_candidates,
        source_counts=source_counts,
        source_ratios=source_ratios,
        source_buckets=candidate_source_buckets,
        over_threshold_buckets=over_threshold_buckets,
        pressured_buckets=pressured_buckets,
        exempt_campaigns=_demandbox_exempt_campaigns(candidate_list),
        sparse_fallback_buckets=sparse_fallback_buckets,
    )
    fallback_reason = (
        SPOTLIGHT_DIVERSITY_FALLBACK_SPARSE_INVENTORY
        if over_threshold_buckets and not pressured_buckets
        else None
    )
    return SpotlightDiversityAllocationResult(
        viewer_user_id=viewer_id,
        candidates=tuple(ordered_candidates),
        warmup_active=False,
        warmup_complete=True,
        viewer_qualifying_impression_count=qualifying_count,
        qualifying_history_count_used=history_count_used,
        configured_window_size=safe_window,
        warmup_threshold=int(warmup_threshold),
        source_concentration_threshold=float(source_concentration_threshold),
        source_counts=source_counts,
        source_ratios=source_ratios,
        candidate_order_before=order_before,
        candidate_order_after=tuple(int(candidate.campaign_id) for candidate in ordered_candidates),
        candidate_allocations=allocations,
        diversity_pressure_applied=bool(pressured_buckets),
        sparse_inventory_fallback_reason=fallback_reason,
    )


def source_bucket_for_candidate(candidate: SpotlightOpportunityCandidate) -> str:
    attribution = derive_spotlight_exposure_attribution(candidate)
    if attribution is None:
        return _BUCKET_UNKNOWN
    return source_bucket_for_route(
        allocation_route_type=attribution.allocation_route_type,
        allocation_source_id=attribution.allocation_source_id,
    )


def source_bucket_for_exposure_event(event: SpotlightExposureEvent) -> str:
    return source_bucket_for_route(
        allocation_route_type=str(event.allocation_route_type or ""),
        allocation_source_id=(int(event.allocation_source_id) if event.allocation_source_id is not None else None),
    )


def source_bucket_for_route(*, allocation_route_type: str, allocation_source_id: Optional[int]) -> str:
    route_type = str(allocation_route_type or "").strip()
    source_id = _safe_positive_int(allocation_source_id)
    if route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY:
        return f"{_BUCKET_DIRECT_PREFIX}:{source_id or 'unknown'}"
    if route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN:
        return f"{_BUCKET_DOMAIN_PREFIX}:{source_id or 'unknown'}"
    if route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT:
        return f"{_BUCKET_PLACEMENT_PREFIX}:{source_id or 'unknown'}"
    if route_type:
        return f"{route_type}:{source_id or 'unknown'}"
    return _BUCKET_UNKNOWN


def _source_counts_from_events(events: Iterable[SpotlightExposureEvent]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for event in events:
        bucket = source_bucket_for_exposure_event(event)
        counts[bucket] = counts.get(bucket, 0) + 1
    return counts


def _source_ratios(source_counts: dict[str, int], total: int) -> dict[str, float]:
    if total <= 0:
        return {bucket: 0.0 for bucket in source_counts}
    return {bucket: count / total for bucket, count in source_counts.items()}


def _qualifying_count(db: Session, *, viewer_user_id: int) -> int:
    from app.services.spotlight_exposure_ledger_service import count_qualifying_impressions_for_viewer

    return count_qualifying_impressions_for_viewer(db, viewer_user_id=viewer_user_id)


def _viable_underrepresented_buckets_by_band(
    candidates: list[SpotlightOpportunityCandidate],
    source_buckets: dict[int, str],
    over_threshold_buckets: set[str],
) -> dict[int, set[str]]:
    by_band: dict[int, set[str]] = {}
    for candidate in candidates:
        if candidate.priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH:
            continue
        bucket = source_buckets.get(int(candidate.campaign_id), _BUCKET_UNKNOWN)
        if bucket in over_threshold_buckets:
            continue
        by_band.setdefault(int(candidate.priority_rank), set()).add(bucket)
    return by_band


def _allocation_sort_key(
    candidate: SpotlightOpportunityCandidate,
    *,
    original_index: int,
    source_bucket: str,
    pressured_buckets: set[str],
) -> tuple[Any, ...]:
    if candidate.priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH:
        pressure_rank = 0
    else:
        pressure_rank = 1 if source_bucket in pressured_buckets else 0
    return (
        int(candidate.priority_rank),
        pressure_rank,
        original_index,
        int(candidate.campaign_id),
    )


def _candidate_allocations(
    original_candidates: list[SpotlightOpportunityCandidate],
    *,
    ordered_candidates: list[SpotlightOpportunityCandidate],
    source_counts: dict[str, int],
    source_ratios: dict[str, float],
    source_buckets: dict[int, str],
    over_threshold_buckets: set[str],
    pressured_buckets: set[str],
    exempt_campaigns: set[int],
    sparse_fallback_buckets: set[str],
) -> tuple[SpotlightCandidateDiversityAllocation, ...]:
    allocated_rank_by_campaign = {
        int(candidate.campaign_id): index
        for index, candidate in enumerate(ordered_candidates)
    }
    rows: list[SpotlightCandidateDiversityAllocation] = []
    for original_rank, candidate in enumerate(original_candidates):
        campaign_id = int(candidate.campaign_id)
        bucket = source_buckets.get(campaign_id, _BUCKET_UNKNOWN)
        rows.append(
            SpotlightCandidateDiversityAllocation(
                campaign_id=campaign_id,
                original_rank=original_rank,
                allocated_rank=int(allocated_rank_by_campaign.get(campaign_id, original_rank)),
                priority_band=candidate.priority_band,
                priority_rank=int(candidate.priority_rank),
                source_bucket=bucket,
                source_count=int(source_counts.get(bucket, 0)),
                source_ratio=float(source_ratios.get(bucket, 0.0)),
                over_threshold=bucket in over_threshold_buckets,
                diversity_pressure_applied=bucket in pressured_buckets and campaign_id not in exempt_campaigns,
                diversity_exemption=(
                    SPOTLIGHT_DIVERSITY_EXEMPTION_DEMANDBOX_MATCH
                    if campaign_id in exempt_campaigns
                    else None
                ),
                sparse_inventory_fallback_reason=(
                    SPOTLIGHT_DIVERSITY_FALLBACK_SPARSE_INVENTORY
                    if bucket in sparse_fallback_buckets and campaign_id not in exempt_campaigns
                    else None
                ),
            )
        )
    return tuple(rows)


def _demandbox_exempt_campaigns(candidates: Iterable[SpotlightOpportunityCandidate]) -> set[int]:
    return {
        int(candidate.campaign_id)
        for candidate in candidates
        if candidate.priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    }


def _original_index(candidates: list[SpotlightOpportunityCandidate], target: SpotlightOpportunityCandidate) -> int:
    target_id = int(target.campaign_id)
    for index, candidate in enumerate(candidates):
        if int(candidate.campaign_id) == target_id:
            return index
    return len(candidates)


def _safe_positive_int(value: Any) -> Optional[int]:
    try:
        parsed = int(value)
    except Exception:
        return None
    return parsed if parsed > 0 else None