from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import SpotlightExposureEvent
from app.services.spotlight_exposure_diversity_allocation_service import (
    SPOTLIGHT_DIVERSITY_PRIVACY,
    SpotlightDiversityAllocationResult,
)
from app.services.spotlight_exposure_ledger_service import SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION
from app.services.spotlight_opportunity_candidate_service import (
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH,
    SpotlightOpportunityCandidate,
)

SPOTLIGHT_VIEWER_CAMPAIGN_FREQUENCY_CAP = 2
SPOTLIGHT_DEMANDBOX_FREQUENCY_OVERRIDE_EXTRA = 1
SPOTLIGHT_CAMPAIGN_QUALIFYING_IMPRESSION_CAP: Optional[int] = None

SPOTLIGHT_FREQUENCY_STATE_UNSEEN = "unseen"
SPOTLIGHT_FREQUENCY_STATE_REPEAT_ALLOWED = "repeat_allowed"
SPOTLIGHT_FREQUENCY_STATE_FREQUENCY_CAPPED = "frequency_capped"

SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP = "viewer_frequency_capped"
SPOTLIGHT_FREQUENCY_SUPPRESSION_DEMANDBOX_OVERRIDE_EXHAUSTED = "demandbox_frequency_override_exhausted"
SPOTLIGHT_FREQUENCY_SUPPRESSION_CAMPAIGN_QUOTA_EXHAUSTED = "campaign_delivery_quota_exhausted"
SPOTLIGHT_FREQUENCY_PRIVACY = "private_internal_frequency_control_metadata"


@dataclass(frozen=True)
class SpotlightCandidateFrequencyControl:
    campaign_id: int
    original_rank: int
    allocated_rank: Optional[int]
    priority_band: str
    priority_rank: int
    viewer_prior_qualifying_impressions: int
    frequency_state: str
    viewer_frequency_cap: int
    remaining_viewer_impressions: int
    demandbox_override_used: bool
    demandbox_override_available: int
    campaign_qualifying_impression_count: int
    campaign_qualifying_impression_cap: Optional[int]
    campaign_remaining_quota: Optional[int]
    suppressed: bool
    suppressed_reason: Optional[str] = None
    frequency_deprioritisation_applied: bool = False

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "original_rank": self.original_rank,
            "allocated_rank": self.allocated_rank,
            "priority_band": self.priority_band,
            "priority_rank": self.priority_rank,
            "viewer_prior_qualifying_impressions": self.viewer_prior_qualifying_impressions,
            "frequency_state": self.frequency_state,
            "viewer_frequency_cap": self.viewer_frequency_cap,
            "remaining_viewer_impressions": self.remaining_viewer_impressions,
            "demandbox_override_used": self.demandbox_override_used,
            "demandbox_override_available": self.demandbox_override_available,
            "campaign_qualifying_impression_count": self.campaign_qualifying_impression_count,
            "campaign_qualifying_impression_cap": self.campaign_qualifying_impression_cap,
            "campaign_remaining_quota": self.campaign_remaining_quota,
            "suppressed": self.suppressed,
            "suppressed_reason": self.suppressed_reason,
            "frequency_deprioritisation_applied": self.frequency_deprioritisation_applied,
            "privacy": SPOTLIGHT_FREQUENCY_PRIVACY,
        }


@dataclass(frozen=True)
class SpotlightFrequencyControlResult:
    viewer_user_id: int
    candidates: tuple[SpotlightOpportunityCandidate, ...]
    candidate_order_before_frequency: tuple[int, ...]
    candidate_order_after_frequency: tuple[int, ...]
    viewer_frequency_cap: int
    demandbox_frequency_override_extra: int
    campaign_qualifying_impression_cap: Optional[int]
    candidate_frequency: tuple[SpotlightCandidateFrequencyControl, ...]
    suppressed_campaign_ids: tuple[int, ...]
    frequency_deprioritisation_applied: bool
    delivery_quota_exhausted_campaign_ids: tuple[int, ...]
    diversity_result: Optional[SpotlightDiversityAllocationResult] = None
    privacy: str = SPOTLIGHT_FREQUENCY_PRIVACY

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "viewer_user_id": self.viewer_user_id,
            "candidate_order_before_frequency": list(self.candidate_order_before_frequency),
            "candidate_order_after_frequency": list(self.candidate_order_after_frequency),
            "viewer_frequency_cap": self.viewer_frequency_cap,
            "demandbox_frequency_override_extra": self.demandbox_frequency_override_extra,
            "campaign_qualifying_impression_cap": self.campaign_qualifying_impression_cap,
            "candidate_frequency": [row.to_internal_dict() for row in self.candidate_frequency],
            "suppressed_campaign_ids": list(self.suppressed_campaign_ids),
            "frequency_deprioritisation_applied": self.frequency_deprioritisation_applied,
            "delivery_quota_exhausted_campaign_ids": list(self.delivery_quota_exhausted_campaign_ids),
            "diversity": self.diversity_result.to_internal_dict() if self.diversity_result is not None else None,
            "privacy": self.privacy,
        }


def apply_spotlight_frequency_control(
    db: Session,
    *,
    viewer_user_id: int,
    diversity_result: SpotlightDiversityAllocationResult,
    viewer_campaign_frequency_cap: int = SPOTLIGHT_VIEWER_CAMPAIGN_FREQUENCY_CAP,
    demandbox_frequency_override_extra: int = SPOTLIGHT_DEMANDBOX_FREQUENCY_OVERRIDE_EXTRA,
    campaign_qualifying_impression_cap: Optional[int] = SPOTLIGHT_CAMPAIGN_QUALIFYING_IMPRESSION_CAP,
) -> SpotlightFrequencyControlResult:
    viewer_id = int(viewer_user_id or 0)
    candidate_list = list(diversity_result.candidates or ())
    order_before = tuple(int(candidate.campaign_id) for candidate in candidate_list)
    campaign_ids = [int(candidate.campaign_id) for candidate in candidate_list]
    viewer_counts = qualifying_impression_counts_for_viewer_campaigns(
        db,
        viewer_user_id=viewer_id,
        campaign_ids=campaign_ids,
    )
    campaign_counts = qualifying_impression_counts_for_campaigns(db, campaign_ids=campaign_ids)
    safe_viewer_cap = max(int(viewer_campaign_frequency_cap), 0)
    safe_override_extra = max(int(demandbox_frequency_override_extra), 0)
    safe_campaign_cap = None if campaign_qualifying_impression_cap is None else max(int(campaign_qualifying_impression_cap), 0)

    prelim: list[dict[str, Any]] = []
    for original_rank, candidate in enumerate(candidate_list):
        campaign_id = int(candidate.campaign_id)
        prior_count = int(viewer_counts.get(campaign_id, 0))
        campaign_count = int(campaign_counts.get(campaign_id, 0))
        is_demandbox = candidate.priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
        frequency_state = frequency_state_for_prior_count(prior_count, viewer_campaign_frequency_cap=safe_viewer_cap)
        remaining_viewer = max(safe_viewer_cap - prior_count, 0)
        override_available = max((safe_viewer_cap + safe_override_extra) - prior_count, 0) if is_demandbox else 0
        override_used = False
        suppressed = False
        suppressed_reason: Optional[str] = None
        campaign_remaining_quota: Optional[int] = None
        if safe_campaign_cap is not None:
            campaign_remaining_quota = max(safe_campaign_cap - campaign_count, 0)
            if campaign_count >= safe_campaign_cap:
                suppressed = True
                suppressed_reason = SPOTLIGHT_FREQUENCY_SUPPRESSION_CAMPAIGN_QUOTA_EXHAUSTED
        if not suppressed and prior_count >= safe_viewer_cap:
            if is_demandbox and prior_count < safe_viewer_cap + safe_override_extra:
                override_used = True
            elif is_demandbox:
                suppressed = True
                suppressed_reason = SPOTLIGHT_FREQUENCY_SUPPRESSION_DEMANDBOX_OVERRIDE_EXHAUSTED
            else:
                suppressed = True
                suppressed_reason = SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP
        prelim.append(
            {
                "candidate": candidate,
                "original_rank": original_rank,
                "campaign_id": campaign_id,
                "prior_count": prior_count,
                "campaign_count": campaign_count,
                "frequency_state": frequency_state,
                "remaining_viewer": remaining_viewer,
                "override_used": override_used,
                "override_available": override_available,
                "campaign_remaining_quota": campaign_remaining_quota,
                "suppressed": suppressed,
                "suppressed_reason": suppressed_reason,
            }
        )

    active_rows = [row for row in prelim if not bool(row["suppressed"])]
    ordered_rows = sorted(active_rows, key=_frequency_sort_key)
    allocated_rank_by_campaign = {
        int(row["campaign_id"]): index
        for index, row in enumerate(ordered_rows)
    }
    frequency_deprioritised_campaigns = _frequency_deprioritised_campaigns(prelim, ordered_rows)
    controls: list[SpotlightCandidateFrequencyControl] = []
    for row in prelim:
        campaign_id = int(row["campaign_id"])
        controls.append(
            SpotlightCandidateFrequencyControl(
                campaign_id=campaign_id,
                original_rank=int(row["original_rank"]),
                allocated_rank=allocated_rank_by_campaign.get(campaign_id),
                priority_band=row["candidate"].priority_band,
                priority_rank=int(row["candidate"].priority_rank),
                viewer_prior_qualifying_impressions=int(row["prior_count"]),
                frequency_state=str(row["frequency_state"]),
                viewer_frequency_cap=safe_viewer_cap,
                remaining_viewer_impressions=int(row["remaining_viewer"]),
                demandbox_override_used=bool(row["override_used"]),
                demandbox_override_available=int(row["override_available"]),
                campaign_qualifying_impression_count=int(row["campaign_count"]),
                campaign_qualifying_impression_cap=safe_campaign_cap,
                campaign_remaining_quota=row["campaign_remaining_quota"],
                suppressed=bool(row["suppressed"]),
                suppressed_reason=row["suppressed_reason"],
                frequency_deprioritisation_applied=campaign_id in frequency_deprioritised_campaigns,
            )
        )
    return SpotlightFrequencyControlResult(
        viewer_user_id=viewer_id,
        candidates=tuple(row["candidate"] for row in ordered_rows),
        candidate_order_before_frequency=order_before,
        candidate_order_after_frequency=tuple(int(row["campaign_id"]) for row in ordered_rows),
        viewer_frequency_cap=safe_viewer_cap,
        demandbox_frequency_override_extra=safe_override_extra,
        campaign_qualifying_impression_cap=safe_campaign_cap,
        candidate_frequency=tuple(controls),
        suppressed_campaign_ids=tuple(int(row["campaign_id"]) for row in prelim if bool(row["suppressed"])),
        frequency_deprioritisation_applied=bool(frequency_deprioritised_campaigns),
        delivery_quota_exhausted_campaign_ids=tuple(
            int(row["campaign_id"])
            for row in prelim
            if row["suppressed_reason"] == SPOTLIGHT_FREQUENCY_SUPPRESSION_CAMPAIGN_QUOTA_EXHAUSTED
        ),
        diversity_result=diversity_result,
    )


def frequency_state_for_prior_count(
    prior_count: int,
    *,
    viewer_campaign_frequency_cap: int = SPOTLIGHT_VIEWER_CAMPAIGN_FREQUENCY_CAP,
) -> str:
    safe_count = max(int(prior_count), 0)
    safe_cap = max(int(viewer_campaign_frequency_cap), 0)
    if safe_count <= 0:
        return SPOTLIGHT_FREQUENCY_STATE_UNSEEN
    if safe_count < safe_cap:
        return SPOTLIGHT_FREQUENCY_STATE_REPEAT_ALLOWED
    return SPOTLIGHT_FREQUENCY_STATE_FREQUENCY_CAPPED


def qualifying_impression_counts_for_viewer_campaigns(
    db: Session,
    *,
    viewer_user_id: int,
    campaign_ids: Iterable[int],
) -> dict[int, int]:
    safe_campaign_ids = _safe_campaign_ids(campaign_ids)
    if not safe_campaign_ids:
        return {}
    rows = (
        db.query(SpotlightExposureEvent.campaign_id, func.count(SpotlightExposureEvent.id))
        .filter(SpotlightExposureEvent.viewer_user_id == int(viewer_user_id))
        .filter(SpotlightExposureEvent.event_type == SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION)
        .filter(SpotlightExposureEvent.campaign_id.in_(safe_campaign_ids))
        .group_by(SpotlightExposureEvent.campaign_id)
        .all()
    )
    return {int(campaign_id): int(count) for campaign_id, count in rows}


def qualifying_impression_counts_for_campaigns(
    db: Session,
    *,
    campaign_ids: Iterable[int],
) -> dict[int, int]:
    safe_campaign_ids = _safe_campaign_ids(campaign_ids)
    if not safe_campaign_ids:
        return {}
    rows = (
        db.query(SpotlightExposureEvent.campaign_id, func.count(SpotlightExposureEvent.id))
        .filter(SpotlightExposureEvent.event_type == SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION)
        .filter(SpotlightExposureEvent.campaign_id.in_(safe_campaign_ids))
        .group_by(SpotlightExposureEvent.campaign_id)
        .all()
    )
    return {int(campaign_id): int(count) for campaign_id, count in rows}


def _frequency_sort_key(row: dict[str, Any]) -> tuple[Any, ...]:
    candidate = row["candidate"]
    frequency_rank = _frequency_order_rank(
        state=str(row["frequency_state"]),
        demandbox_override_used=bool(row["override_used"]),
    )
    return (
        int(candidate.priority_rank),
        frequency_rank,
        int(row["original_rank"]),
        int(row["campaign_id"]),
    )


def _frequency_order_rank(*, state: str, demandbox_override_used: bool) -> int:
    if demandbox_override_used:
        return 1
    if state == SPOTLIGHT_FREQUENCY_STATE_UNSEEN:
        return 0
    if state == SPOTLIGHT_FREQUENCY_STATE_REPEAT_ALLOWED:
        return 1
    return 2


def _frequency_deprioritised_campaigns(
    original_rows: list[dict[str, Any]],
    ordered_rows: list[dict[str, Any]],
) -> set[int]:
    original_rank = {
        int(row["campaign_id"]): int(row["original_rank"])
        for row in original_rows
        if not bool(row["suppressed"])
    }
    moved: set[int] = set()
    for new_rank, row in enumerate(ordered_rows):
        campaign_id = int(row["campaign_id"])
        if new_rank > int(original_rank.get(campaign_id, new_rank)):
            moved.add(campaign_id)
    return moved


def _safe_campaign_ids(campaign_ids: Iterable[int]) -> list[int]:
    out: list[int] = []
    seen: set[int] = set()
    for value in campaign_ids or []:
        try:
            campaign_id = int(value)
        except Exception:
            continue
        if campaign_id <= 0 or campaign_id in seen:
            continue
        seen.add(campaign_id)
        out.append(campaign_id)
    return out