from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, replace
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_token
from app.db.models import (
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightCampaignPacingState,
    SpotlightExposureEvent,
    SpotlightPresentationLease,
    User,
)
from app.services.spotlight_exposure_diversity_allocation_service import allocate_spotlight_opportunity_candidates
from app.services.spotlight_exposure_ledger_service import (
    SpotlightExposureRecordResult,
    record_spotlight_qualifying_impression,
)
from app.services.spotlight_frequency_control_service import (
    SPOTLIGHT_FREQUENCY_SUPPRESSION_DEMANDBOX_OVERRIDE_EXHAUSTED,
    SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP,
    apply_spotlight_frequency_control,
)
from app.services.spotlight_opportunity_candidate_service import (
    SpotlightOpportunityCandidate,
    build_spotlight_opportunity_candidates,
)
from app.services.spotlight_pacing_state_service import (
    SpotlightPersistentPacingResult,
    consume_spotlight_delivery_round,
    plan_persistent_spotlight_delivery_opportunities,
    spotlight_delivery_round_blocked_reason,
)
from app.services.spotlight_lifecycle_service import authorized_expiry, row_is_serving

SPOTLIGHT_PRESENTATION_TOKEN_TYPE = "spotlight_presentation_v1"
SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP = "public_shop_spotlight_rail"
SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS = 30
SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS = 45
SPOTLIGHT_PRESENTATION_IMAGE_ROTATION_MS = 5000
SPOTLIGHT_PRESENTATION_VIDEO_MIN_ROTATION_MS = 8000
SPOTLIGHT_PRESENTATION_VIDEO_MAX_ROTATION_MS = 10000
# Compatibility/default value for clients that only understand one rotation.
SPOTLIGHT_PRESENTATION_ROTATION_MS = SPOTLIGHT_PRESENTATION_IMAGE_ROTATION_MS
SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS = 1000
SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO = 0.6
SPOTLIGHT_PRESENTATION_INTERACTION_PAUSE_MS = 8000
SPOTLIGHT_PRESENTATION_REDUCED_MOTION_ROTATION_MS = 30000
SPOTLIGHT_PRESENTATION_MAX_ITEMS_PER_WINDOW = 2
SPOTLIGHT_PRESENTATION_REPLAY_LIMIT = SPOTLIGHT_PRESENTATION_MAX_ITEMS_PER_WINDOW
SPOTLIGHT_PRESENTATION_VISIBILITY_LIMIT = SPOTLIGHT_PRESENTATION_MAX_ITEMS_PER_WINDOW
SPOTLIGHT_PRESENTATION_VISIBILITY_SCAN_LIMIT = 64
SPOTLIGHT_PRESENTATION_MAX_UNQUALIFIED_ATTEMPTS_PER_VIEWER = 2

PRESENTATION_REJECTION_NO_CANDIDATES = "no_canonical_candidates"
PRESENTATION_REJECTION_NO_DELIVERY_OPPORTUNITY = "no_delivery_opportunity"
PRESENTATION_REJECTION_DELIVERY_CONFLICT = "delivery_round_not_consumed"
PRESENTATION_REJECTION_INVALID_TOKEN = "invalid_presentation_token"
PRESENTATION_REJECTION_TOKEN_EXPIRED = "presentation_token_expired"
PRESENTATION_REJECTION_WRONG_VIEWER = "wrong_viewer"
PRESENTATION_REJECTION_WRONG_SURFACE = "wrong_surface"
PRESENTATION_REJECTION_OWNER_PREVIEW = "owner_preview_excluded"
PRESENTATION_REJECTION_STALE_CANDIDATE = "candidate_not_currently_presentable"
PRESENTATION_REJECTION_CAMPAIGN_NOT_ACTIVE = "campaign_not_active"
PRESENTATION_REJECTION_ISSUANCE_CONFLICT = "issuance_key_payload_conflict"


PRESENTATION_REJECTION_RESERVATION_ACTIVE = "presentation_reservation_active"
PRESENTATION_REJECTION_VIEWER_ABANDONED = "viewer_abandoned_campaign_version"


class _SpotlightReservationUnavailable(RuntimeError):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True)
class SpotlightPresentationPolicy:
    passive_rotation_ms: int = SPOTLIGHT_PRESENTATION_ROTATION_MS
    image_rotation_ms: int = SPOTLIGHT_PRESENTATION_IMAGE_ROTATION_MS
    video_min_rotation_ms: int = SPOTLIGHT_PRESENTATION_VIDEO_MIN_ROTATION_MS
    video_max_rotation_ms: int = SPOTLIGHT_PRESENTATION_VIDEO_MAX_ROTATION_MS
    max_items_per_window: int = SPOTLIGHT_PRESENTATION_MAX_ITEMS_PER_WINDOW
    qualifying_visible_ms: int = SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS
    minimum_visible_ratio: float = SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO
    hidden_tab_pause_enabled: bool = True
    interaction_pause_enabled: bool = True
    interaction_pause_ms: int = SPOTLIGHT_PRESENTATION_INTERACTION_PAUSE_MS
    reduced_motion_handling_enabled: bool = True
    reduced_motion_rotation_ms: int = SPOTLIGHT_PRESENTATION_REDUCED_MOTION_ROTATION_MS

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "passive_rotation_ms": int(self.passive_rotation_ms),
            "image_rotation_ms": int(self.image_rotation_ms),
            "video_min_rotation_ms": int(self.video_min_rotation_ms),
            "video_max_rotation_ms": int(self.video_max_rotation_ms),
            "max_items_per_window": int(self.max_items_per_window),
            "qualifying_visible_ms": int(self.qualifying_visible_ms),
            "minimum_visible_ratio": float(self.minimum_visible_ratio),
            "hidden_tab_pause_enabled": bool(self.hidden_tab_pause_enabled),
            "interaction_pause_enabled": bool(self.interaction_pause_enabled),
            "interaction_pause_ms": int(self.interaction_pause_ms),
            "reduced_motion_handling_enabled": bool(self.reduced_motion_handling_enabled),
            "reduced_motion_rotation_ms": int(self.reduced_motion_rotation_ms),
        }


@dataclass(frozen=True)
class SpotlightPresentationSelection:
    selected: bool
    candidate: Optional[SpotlightOpportunityCandidate] = None
    campaign: Optional[SpotlightCampaign] = None
    presentation_id: Optional[str] = None
    presentation_token: Optional[str] = None
    placement_broadcast_id: Optional[int] = None
    content_version: Optional[int] = None
    delivery_round_consumed: bool = False
    token_expires_at: Optional[datetime] = None
    pacing_result: Optional[SpotlightPersistentPacingResult] = None
    frequency_suppressed_campaign_ids: tuple[int, ...] = ()
    rejection_code: Optional[str] = None
    policy: SpotlightPresentationPolicy = SpotlightPresentationPolicy()

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "selected": self.selected,
            "campaign_id": int(self.candidate.campaign_id) if self.candidate is not None else None,
            "presentation_id": self.presentation_id,
            "token_expires_at": self.token_expires_at.isoformat() if self.token_expires_at is not None else None,
            "rejection_code": self.rejection_code,
            "policy": self.policy.to_public_dict(),
            "pacing": self.pacing_result.to_internal_dict() if self.pacing_result is not None else None,
            "privacy": "private_internal_presentation_contract",
        }


@dataclass(frozen=True)
class SpotlightPresentationQualificationResult:
    accepted: bool
    recorded: bool = False
    deduped: bool = False
    event_id: Optional[int] = None
    campaign_id: Optional[int] = None
    presentation_id: Optional[str] = None
    delivery_round_consumed: bool = False
    rejection_code: Optional[str] = None
    exposure_result: Optional[SpotlightExposureRecordResult] = None
    policy: SpotlightPresentationPolicy = SpotlightPresentationPolicy()

    def to_public_dict(self) -> dict[str, Any]:
        event = self.exposure_result.event if self.exposure_result is not None else None
        return {
            "ok": bool(self.accepted),
            "recorded": bool(self.recorded),
            "deduped": bool(self.deduped),
            "event_id": int(event.id) if event is not None and event.id is not None else self.event_id,
            "campaign_id": int(self.campaign_id) if self.campaign_id is not None else None,
            "presentation_id": self.presentation_id,
            "delivery_round_consumed": bool(self.delivery_round_consumed),
            "rejection_code": self.rejection_code,
            "policy": self.policy.to_public_dict(),
            "boundary_note": "Issuance reserves presentation access; the delivery round and qualifying impression are recorded together only after the visible presentation contract is satisfied.",
        }


@dataclass(frozen=True)
class SpotlightPresentationReplay:
    candidate: SpotlightOpportunityCandidate
    campaign: SpotlightCampaign
    presentation_id: str
    placement_broadcast_id: int
    content_version: int
    replay_expires_at: datetime

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": int(self.candidate.campaign_id),
            "presentation_id": self.presentation_id,
            "placement_broadcast_id": int(self.placement_broadcast_id),
            "content_version": int(self.content_version),
            "replay_expires_at": self.replay_expires_at.isoformat(),
            "counts_as_delivery": False,
            "counts_as_exposure": False,
            "privacy": "private_same_viewer_canonical_replay",
        }


@dataclass(frozen=True)
class SpotlightPresentationVisibility:
    '''A short-lived, accounting-neutral view of an eligible live campaign.'''

    candidate: SpotlightOpportunityCandidate
    campaign: SpotlightCampaign
    placement_broadcast_id: int
    content_version: int
    visibility_expires_at: datetime

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            'campaign_id': int(self.candidate.campaign_id),
            'placement_broadcast_id': int(self.placement_broadcast_id),
            'content_version': int(self.content_version),
            'visibility_expires_at': self.visibility_expires_at.isoformat(),
            'counts_as_delivery': False,
            'counts_as_exposure': False,
            'privacy': 'private_canonical_non_counting_visibility',
        }


def presentation_policy() -> SpotlightPresentationPolicy:
    return SpotlightPresentationPolicy()


def _spotlight_visibility_window_offset(
    *,
    viewer_user_id: int,
    bucket: int,
    candidate_count: int,
    batch_size: int,
) -> int:
    """Advance a viewer's bounded visibility window instead of reshuffling it."""
    safe_count = max(int(candidate_count), 0)
    if safe_count <= 0:
        return 0
    safe_batch_size = max(int(batch_size), 1)
    seed = int.from_bytes(
        hashlib.sha256(f'visibility:{int(viewer_user_id)}'.encode('utf-8')).digest()[:4],
        'big',
    )
    return (seed + (int(bucket) * safe_batch_size)) % safe_count


def list_spotlight_presentation_replays(
    db: Session,
    *,
    viewer_user_id: int,
    now: Optional[datetime] = None,
    surface: str = SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
    limit: int = SPOTLIGHT_PRESENTATION_REPLAY_LIMIT,
    exclude_campaign_ids: Optional[set[int]] = None,
    allow_due_campaign_ids: Optional[set[int]] = None,
) -> list[SpotlightPresentationReplay]:
    """Return bounded, read-only continuation rows already qualified by this viewer."""
    current_time = _as_aware_utc(now) or _now_utc()
    viewer_id = int(viewer_user_id or 0)
    safe_limit = max(min(int(limit), SPOTLIGHT_PRESENTATION_REPLAY_LIMIT), 0)
    if viewer_id <= 0 or safe_limit <= 0:
        return []

    excluded = {
        int(value)
        for value in (exclude_campaign_ids or set())
        if int(value or 0) > 0
    }
    due_campaign_ids = {
        int(value)
        for value in (allow_due_campaign_ids or set())
        if int(value or 0) > 0
    }
    leases = (
        db.query(SpotlightPresentationLease)
        .filter(SpotlightPresentationLease.viewer_user_id == viewer_id)
        .filter(SpotlightPresentationLease.surface == surface)
        .filter(SpotlightPresentationLease.status == "qualified")
        .filter(SpotlightPresentationLease.qualified_at.is_not(None))
        .order_by(
            SpotlightPresentationLease.qualified_at.desc(),
            SpotlightPresentationLease.id.desc(),
        )
        .limit(max(safe_limit * 8, 24))
        .all()
    )

    replays: list[SpotlightPresentationReplay] = []
    processed_campaign_ids: set[int] = set(excluded)
    for lease in leases:
        campaign_id = int(lease.campaign_id)
        if campaign_id in processed_campaign_ids:
            continue
        # Only the newest qualified lease for a campaign may authorize replay.
        processed_campaign_ids.add(campaign_id)

        pacing_state = (
            db.query(SpotlightCampaignPacingState)
            .filter(SpotlightCampaignPacingState.campaign_id == campaign_id)
            .one_or_none()
        )
        next_eligible_at = _as_aware_utc(
            getattr(pacing_state, "next_eligible_delivery_at", None)
        )
        if pacing_state is None:
            continue
        pacing_exhausted = bool(getattr(pacing_state, "exhausted", False))
        if not pacing_exhausted and next_eligible_at is None:
            continue
        due_frequency_replay = bool(
            not pacing_exhausted
            and next_eligible_at is not None
            and next_eligible_at <= current_time
            and campaign_id in due_campaign_ids
        )
        if (
            not pacing_exhausted
            and next_eligible_at is not None
            and next_eligible_at <= current_time
            and not due_frequency_replay
        ):
            continue

        exposure = (
            db.query(SpotlightExposureEvent)
            .filter(SpotlightExposureEvent.viewer_user_id == viewer_id)
            .filter(SpotlightExposureEvent.campaign_id == campaign_id)
            .filter(SpotlightExposureEvent.presentation_id == str(lease.presentation_id))
            .filter(SpotlightExposureEvent.presentation_surface == surface)
            .filter(SpotlightExposureEvent.event_type == "qualifying_impression")
            .filter(SpotlightExposureEvent.content_version == int(lease.content_version))
            .filter(
                SpotlightExposureEvent.placement_broadcast_id
                == int(lease.placement_broadcast_id)
            )
            .first()
        )
        if exposure is None:
            continue

        candidates = build_spotlight_opportunity_candidates(
            db,
            viewer_user_id=viewer_id,
            campaign_ids=[campaign_id],
            limit=1,
            now=current_time,
        )
        candidate = next(
            (row for row in candidates if int(row.campaign_id) == campaign_id),
            None,
        )
        campaign = db.get(SpotlightCampaign, campaign_id)
        placement = db.get(MarketplaceBroadcast, int(lease.placement_broadcast_id))
        if candidate is None or campaign is None or placement is None:
            continue
        if not row_is_serving(campaign, now=current_time):
            continue
        if not row_is_serving(placement, now=current_time):
            continue
        if int(campaign.content_version or 1) != int(lease.content_version):
            continue
        if int(placement.content_version or 1) != int(lease.content_version):
            continue

        route_placement_ids = {
            int(route.placement_broadcast_id)
            for route in (getattr(candidate.eligibility, "routes", ()) or ())
            if getattr(route, "placement_broadcast_id", None) is not None
        }
        if int(lease.placement_broadcast_id) not in route_placement_ids:
            continue

        replay_deadlines = [
            current_time + timedelta(seconds=SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS)
        ]
        if (
            not pacing_exhausted
            and next_eligible_at is not None
            and not due_frequency_replay
        ):
            replay_deadlines.append(next_eligible_at)
        for deadline in (
            authorized_expiry(campaign),
            authorized_expiry(placement),
            _as_aware_utc(getattr(campaign, "opportunity_expires_at", None)),
        ):
            if deadline is not None:
                replay_deadlines.append(deadline)
        replay_expires_at = min(replay_deadlines)
        if replay_expires_at <= current_time:
            continue

        replays.append(
            SpotlightPresentationReplay(
                candidate=candidate,
                campaign=campaign,
                presentation_id=str(lease.presentation_id),
                placement_broadcast_id=int(placement.id),
                content_version=int(lease.content_version),
                replay_expires_at=replay_expires_at,
            )
        )
        if len(replays) >= safe_limit:
            break

    return replays


def list_spotlight_presentation_visibility(
    db: Session,
    *,
    viewer_user_id: int,
    now: Optional[datetime] = None,
    limit: int = SPOTLIGHT_PRESENTATION_VISIBILITY_LIMIT,
    exclude_campaign_ids: Optional[set[int]] = None,
    window_sequence: Optional[int] = None,
) -> list[SpotlightPresentationVisibility]:
    '''Return bounded live content without reserving or spending delivery.

    Delivery pacing and frequency caps decide which presentation may count.
    They must not make otherwise eligible live content disappear from the
    Public Shop rail. Every row is revalidated through the canonical candidate
    and placement rules and expires quickly so membership, lifecycle, route,
    or content changes take effect promptly.
    '''
    current_time = _as_aware_utc(now) or _now_utc()
    viewer_id = int(viewer_user_id or 0)
    safe_limit = max(min(int(limit), SPOTLIGHT_PRESENTATION_VISIBILITY_LIMIT), 0)
    if viewer_id <= 0 or safe_limit <= 0:
        return []

    excluded = {
        int(value)
        for value in (exclude_campaign_ids or set())
        if int(value or 0) > 0
    }
    campaign_query = (
        db.query(SpotlightCampaign.id)
        .filter(SpotlightCampaign.status == 'active')
        .filter(SpotlightCampaign.serving_status == 'serving')
        .filter(SpotlightCampaign.owner_user_id != viewer_id)
        .filter(
            (SpotlightCampaign.authorized_expires_at > current_time)
            | (
                SpotlightCampaign.authorized_expires_at.is_(None)
                & (
                    SpotlightCampaign.expires_at.is_(None)
                    | (SpotlightCampaign.expires_at > current_time)
                )
            )
        )
        .filter(
            SpotlightCampaign.opportunity_expires_at.is_(None)
            | (SpotlightCampaign.opportunity_expires_at > current_time)
        )
    )
    # Keep the cursor coordinate system independent of transient response
    # exclusions. The fresh presentation and recent replay set can change on
    # every request; removing them before count/offset made the same adjacent
    # window sequence point at a different inventory and could skip campaigns
    # while repeating others. Exclusions are applied below, after the stable
    # active-campaign window has been selected and ordered.
    campaign_count = int(campaign_query.count())
    if campaign_count <= 0:
        return []

    scan_limit = min(
        campaign_count,
        max(safe_limit * 8, 32),
        SPOTLIGHT_PRESENTATION_VISIBILITY_SCAN_LIMIT,
    )
    seed = int.from_bytes(
        hashlib.sha256(f'visibility:{viewer_id}'.encode('utf-8')).digest()[:4],
        'big',
    )
    requested_window = (
        max(int(window_sequence), 0)
        if window_sequence is not None
        else None
    )
    if requested_window is None:
        scan_cycle = (
            int(current_time.timestamp())
            // SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS
        )
        window_position = scan_cycle
    else:
        windows_per_scan = max(
            (scan_limit + safe_limit - 1) // safe_limit,
            1,
        )
        scan_cycle = requested_window // windows_per_scan
        window_position = requested_window % windows_per_scan
    offset = (seed + (scan_cycle * scan_limit)) % campaign_count
    ordered_campaign_query = campaign_query.order_by(
        SpotlightCampaign.activated_at.desc(),
        SpotlightCampaign.created_at.desc(),
        SpotlightCampaign.id.asc(),
    )
    campaign_rows = ordered_campaign_query.offset(offset).limit(scan_limit).all()
    if len(campaign_rows) < scan_limit:
        campaign_rows.extend(
            ordered_campaign_query.limit(scan_limit - len(campaign_rows)).all()
        )
    campaign_ids = [int(row.id) for row in campaign_rows]
    if not campaign_ids:
        return []

    # The explicit active set intentionally bypasses delivery-pacing discovery
    # while retaining lifecycle, self-delivery, membership, route,
    # availability, and Community Domain eligibility checks.
    candidates = build_spotlight_opportunity_candidates(
        db,
        viewer_user_id=viewer_id,
        campaign_ids=campaign_ids,
        limit=None,
        now=current_time,
    )
    if not candidates:
        return []
    diversity = allocate_spotlight_opportunity_candidates(
        db,
        viewer_user_id=viewer_id,
        candidates=candidates,
    )
    ordered = list(diversity.candidates)
    if len(ordered) > 1:
        # Explicit client sequences advance as soon as the handset consumes a
        # bounded window. Older clients fall back to the replay-TTL bucket.
        # Adjacent windows move by their own size instead of reshuffling.
        offset = _spotlight_visibility_window_offset(
            viewer_user_id=viewer_id,
            bucket=window_position,
            candidate_count=len(ordered),
            batch_size=safe_limit,
        )
        ordered = [*ordered[offset:], *ordered[:offset]]

    visible: list[SpotlightPresentationVisibility] = []
    # One cursor step owns one bounded slice of the stable ordered inventory.
    # Do not pull rows from the following slice merely because this response
    # already contains the same campaign as a fresh presentation. Pulling
    # forward caused that following slice to repeat the borrowed row and could
    # leave another campaign unseen.
    for candidate in ordered[:safe_limit]:
        campaign_id = int(candidate.campaign_id)
        if campaign_id in excluded:
            continue
        campaign = db.get(SpotlightCampaign, campaign_id)
        placement = _placement_for_candidate(
            db,
            candidate=candidate,
            campaign_id=campaign_id,
            now=current_time,
        )
        if campaign is None or placement is None:
            continue
        if not row_is_serving(campaign, now=current_time):
            continue

        content_version = int(getattr(campaign, 'content_version', 1) or 1)
        if int(getattr(placement, 'content_version', 1) or 1) != content_version:
            continue
        deadlines = [
            current_time + timedelta(seconds=SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS)
        ]
        for deadline in (
            authorized_expiry(campaign),
            authorized_expiry(placement),
            _as_aware_utc(getattr(campaign, 'opportunity_expires_at', None)),
        ):
            if deadline is not None:
                deadlines.append(deadline)
        visibility_expires_at = min(deadlines)
        if visibility_expires_at <= current_time:
            continue

        visible.append(
            SpotlightPresentationVisibility(
                candidate=candidate,
                campaign=campaign,
                placement_broadcast_id=int(placement.id),
                content_version=content_version,
                visibility_expires_at=visibility_expires_at,
            )
        )
        if len(visible) >= safe_limit:
            break

    return visible


def select_spotlight_presentation(
    db: Session,
    *,
    viewer_user_id: int,
    candidate_campaign_ids: Optional[list[int]] = None,
    requested_delivery_slots: int = 1,
    now: Optional[datetime] = None,
    surface: str = SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
    issuance_key: Optional[str] = None,
) -> SpotlightPresentationSelection:
    current_time = _as_aware_utc(now) or _now_utc()
    viewer_id = int(viewer_user_id or 0)
    policy = presentation_policy()
    safe_issuance_key = str(issuance_key or '').strip()[:96]
    issuance_fingerprint = _presentation_issuance_fingerprint(
        viewer_user_id=viewer_id,
        surface=surface,
        requested_delivery_slots=max(int(requested_delivery_slots), 1),
        candidate_campaign_ids=candidate_campaign_ids,
    )
    if safe_issuance_key:
        replay = _replay_existing_lease(
            db,
            viewer_user_id=viewer_id,
            issuance_key=safe_issuance_key,
            issuance_fingerprint=issuance_fingerprint,
            surface=surface,
            now=current_time,
            policy=policy,
        )
        if replay is not None:
            return replay
    scoped_campaign_ids = (
        [int(value) for value in candidate_campaign_ids if int(value or 0) > 0]
        if candidate_campaign_ids is not None
        else None
    )
    if scoped_campaign_ids is not None and not scoped_campaign_ids:
        return SpotlightPresentationSelection(
            selected=False,
            rejection_code=PRESENTATION_REJECTION_NO_CANDIDATES,
            policy=policy,
        )
    candidates = build_spotlight_opportunity_candidates(
        db,
        viewer_user_id=viewer_id,
        campaign_ids=scoped_campaign_ids,
        # Pacing must see the complete eligible set. Candidate discovery was
        # already unbounded here historically; making that intent explicit
        # avoids discarding a due campaign after relevance sorting.
        limit=None,
        now=current_time,
    )
    if not candidates:
        return SpotlightPresentationSelection(selected=False, rejection_code=PRESENTATION_REJECTION_NO_CANDIDATES, policy=policy)

    diversity = allocate_spotlight_opportunity_candidates(
        db,
        viewer_user_id=viewer_id,
        candidates=candidates,
    )
    frequency = apply_spotlight_frequency_control(
        db,
        viewer_user_id=viewer_id,
        diversity_result=diversity,
    )
    frequency_suppressed_campaign_ids = tuple(
        int(control.campaign_id)
        for control in frequency.candidate_frequency
        if control.suppressed_reason
        in {
            SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP,
            SPOTLIGHT_FREQUENCY_SUPPRESSION_DEMANDBOX_OVERRIDE_EXHAUSTED,
        }
    )
    if not frequency.candidates:
        return SpotlightPresentationSelection(
            selected=False,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
            policy=policy,
        )

    candidate_by_id = {int(candidate.campaign_id): candidate for candidate in frequency.candidates}
    remaining_frequency = frequency
    blocked_campaign_ids: list[int] = []
    blocked_reservation_reasons: list[str] = []
    last_pacing: Optional[SpotlightPersistentPacingResult] = None

    while remaining_frequency.candidates:
        pacing = plan_persistent_spotlight_delivery_opportunities(
            db,
            viewer_user_id=viewer_id,
            frequency_result=remaining_frequency,
            requested_delivery_slots=max(int(requested_delivery_slots), 1),
            now=current_time,
        )
        last_pacing = pacing
        if not pacing.scheduled_campaign_ids:
            combined_pacing = SpotlightPersistentPacingResult(
                viewer_user_id=viewer_id,
                pacing_result=pacing.pacing_result,
                consumption_results=(),
                scheduled_campaign_ids=tuple(blocked_campaign_ids),
                consumed_campaign_ids=(),
                blocked_campaign_ids=tuple(blocked_campaign_ids),
            )
            return SpotlightPresentationSelection(
                selected=False,
                pacing_result=combined_pacing,
                frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
                rejection_code=PRESENTATION_REJECTION_NO_DELIVERY_OPPORTUNITY,
                policy=policy,
            )

        selected_campaign_id = int(pacing.scheduled_campaign_ids[0])
        candidate = candidate_by_id.get(selected_campaign_id)
        if candidate is None:
            return SpotlightPresentationSelection(
                selected=False,
                pacing_result=pacing,
                frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
                rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
                policy=policy,
            )

        presentation_id = f"sp-{uuid4().hex}"
        try:
            with db.begin_nested():
                campaign = (
                    db.query(SpotlightCampaign)
                    .filter(SpotlightCampaign.id == selected_campaign_id)
                    .with_for_update()
                    .one_or_none()
                )
                if campaign is None or str(getattr(campaign, "status", "") or "") != "active":
                    raise _SpotlightReservationUnavailable(
                        PRESENTATION_REJECTION_CAMPAIGN_NOT_ACTIVE
                    )

                pacing_blocked_reason = spotlight_delivery_round_blocked_reason(
                    db,
                    campaign_id=selected_campaign_id,
                    now=current_time,
                    lock_for_update=True,
                )
                if pacing_blocked_reason is not None:
                    raise _SpotlightReservationUnavailable(pacing_blocked_reason)

                placement = _placement_for_candidate(
                    db,
                    candidate=candidate,
                    campaign_id=selected_campaign_id,
                    now=current_time,
                    lock_for_update=True,
                )
                if placement is None:
                    raise _SpotlightReservationUnavailable(
                        PRESENTATION_REJECTION_STALE_CANDIDATE
                    )
                deadlines = [current_time + timedelta(seconds=SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS)]
                for deadline in (
                    authorized_expiry(campaign),
                    authorized_expiry(placement),
                    _as_aware_utc(getattr(campaign, 'opportunity_expires_at', None)),
                ):
                    if deadline is not None:
                        deadlines.append(deadline)
                token_expires_at = min(deadlines)
                if token_expires_at <= current_time:
                    raise _SpotlightReservationUnavailable(
                        PRESENTATION_REJECTION_STALE_CANDIDATE
                    )
                content_version = int(getattr(campaign, 'content_version', 1) or 1)
                active_reservation = (
                    db.query(SpotlightPresentationLease.id)
                    .filter(SpotlightPresentationLease.campaign_id == selected_campaign_id)
                    .filter(SpotlightPresentationLease.content_version == content_version)
                    .filter(SpotlightPresentationLease.status == 'issued')
                    .filter(SpotlightPresentationLease.lease_expires_at > current_time)
                    .first()
                )
                if active_reservation is not None:
                    raise _SpotlightReservationUnavailable(
                        PRESENTATION_REJECTION_RESERVATION_ACTIVE
                    )

                # An unqualified lease is a bounded reservation, not a spent
                # delivery round. Permit one recovery from a browser/off-screen
                # interruption, then stop the same viewer from repeatedly
                # reacquiring this campaign version.
                abandoned_attempt_count = (
                    db.query(SpotlightPresentationLease.id)
                    .filter(SpotlightPresentationLease.viewer_user_id == viewer_id)
                    .filter(SpotlightPresentationLease.campaign_id == selected_campaign_id)
                    .filter(SpotlightPresentationLease.content_version == content_version)
                    .filter(SpotlightPresentationLease.qualified_at.is_(None))
                    .filter(SpotlightPresentationLease.lease_expires_at <= current_time)
                    .count()
                )
                if (
                    abandoned_attempt_count
                    >= SPOTLIGHT_PRESENTATION_MAX_UNQUALIFIED_ATTEMPTS_PER_VIEWER
                ):
                    raise _SpotlightReservationUnavailable(
                        PRESENTATION_REJECTION_VIEWER_ABANDONED
                    )

                lease = SpotlightPresentationLease(
                    presentation_id=presentation_id,
                    issuance_key=safe_issuance_key or presentation_id,
                    issuance_fingerprint=issuance_fingerprint,
                    viewer_user_id=viewer_id,
                    campaign_id=selected_campaign_id,
                    placement_broadcast_id=int(placement.id),
                    content_version=content_version,
                    surface=surface,
                    status='issued',
                    issued_at=current_time,
                    lease_expires_at=token_expires_at,
                )
                _persist_presentation_lease(db, lease=lease)
        except _SpotlightReservationUnavailable as exc:
            blocked_campaign_ids.append(selected_campaign_id)
            blocked_reservation_reasons.append(exc.reason)
            remaining_candidates = tuple(
                row
                for row in remaining_frequency.candidates
                if int(row.campaign_id) != selected_campaign_id
            )
            remaining_frequency = replace(
                remaining_frequency,
                candidates=remaining_candidates,
                candidate_order_after_frequency=tuple(
                    int(row.campaign_id) for row in remaining_candidates
                ),
            )
            continue
        except IntegrityError:
            if safe_issuance_key:
                replay = _replay_existing_lease(
                    db,
                    viewer_user_id=viewer_id,
                    issuance_key=safe_issuance_key,
                    issuance_fingerprint=issuance_fingerprint,
                    surface=surface,
                    now=current_time,
                    policy=policy,
                )
                if replay is not None:
                    return replay
            raise

        combined_pacing = SpotlightPersistentPacingResult(
            viewer_user_id=viewer_id,
            pacing_result=pacing.pacing_result,
            consumption_results=(),
            scheduled_campaign_ids=tuple([*blocked_campaign_ids, selected_campaign_id]),
            consumed_campaign_ids=(),
            blocked_campaign_ids=tuple(blocked_campaign_ids),
        )
        token = create_access_token(
            {
                "typ": SPOTLIGHT_PRESENTATION_TOKEN_TYPE,
                "sid": presentation_id,
                "viewer_user_id": viewer_id,
                "campaign_id": selected_campaign_id,
                "surface": surface,
                "issued_at": current_time.isoformat(),
            },
            expires_delta=timedelta(seconds=SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS),
        )
        return SpotlightPresentationSelection(
            selected=True,
            candidate=candidate,
            campaign=campaign,
            presentation_id=presentation_id,
            presentation_token=token,
            placement_broadcast_id=int(placement.id),
            content_version=content_version,
            delivery_round_consumed=False,
            token_expires_at=token_expires_at,
            pacing_result=combined_pacing,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            policy=policy,
        )

    return SpotlightPresentationSelection(
        selected=False,
        pacing_result=last_pacing,
        frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
        rejection_code=(
            blocked_reservation_reasons[-1]
            if blocked_reservation_reasons
            else PRESENTATION_REJECTION_NO_DELIVERY_OPPORTUNITY
        ),
        policy=policy,
    )


def record_spotlight_presentation_qualification(
    db: Session,
    *,
    viewer_user_id: int,
    presentation_token: str,
    qualification_key: Optional[str] = None,
    event_at: Optional[datetime] = None,
    surface: str = SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
    visible_ms: Optional[int] = None,
    visible_ratio: Optional[float] = None,
    document_visible: Optional[bool] = None,
    owner_preview: bool = False,
) -> SpotlightPresentationQualificationResult:
    policy = presentation_policy()
    current_time = _as_aware_utc(event_at) or _now_utc()
    payload = _decode_presentation_token(presentation_token)
    if payload is None:
        return SpotlightPresentationQualificationResult(accepted=False, rejection_code=PRESENTATION_REJECTION_INVALID_TOKEN, policy=policy)
    if payload.get("expired") is True:
        return SpotlightPresentationQualificationResult(accepted=False, rejection_code=PRESENTATION_REJECTION_TOKEN_EXPIRED, policy=policy)
    if str(payload.get("typ") or "") != SPOTLIGHT_PRESENTATION_TOKEN_TYPE:
        return SpotlightPresentationQualificationResult(accepted=False, rejection_code=PRESENTATION_REJECTION_INVALID_TOKEN, policy=policy)

    token_viewer_id = int(payload.get("viewer_user_id") or 0)
    campaign_id = int(payload.get("campaign_id") or 0)
    presentation_id = str(payload.get("sid") or "").strip()
    token_surface = str(payload.get("surface") or "").strip()
    if token_viewer_id != int(viewer_user_id or 0):
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_WRONG_VIEWER, policy=policy)
    if token_surface != surface:
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_WRONG_SURFACE, policy=policy)
    if owner_preview:
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_OWNER_PREVIEW, policy=policy)

    campaign = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id == campaign_id)
        .with_for_update()
        .one_or_none()
    )
    if campaign is None:
        return SpotlightPresentationQualificationResult(
            accepted=False,
            campaign_id=campaign_id or None,
            presentation_id=presentation_id or None,
            rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
            policy=policy,
        )

    lease = (
        db.query(SpotlightPresentationLease)
        .filter(SpotlightPresentationLease.presentation_id == presentation_id)
        .filter(SpotlightPresentationLease.viewer_user_id == token_viewer_id)
        .with_for_update()
        .one_or_none()
    )
    if lease is not None and int(lease.campaign_id) != campaign_id:
        return SpotlightPresentationQualificationResult(
            accepted=False,
            campaign_id=campaign_id or None,
            presentation_id=presentation_id or None,
            rejection_code=PRESENTATION_REJECTION_INVALID_TOKEN,
            policy=policy,
        )
    invalid_reason = _lease_invalid_reason(db, lease=lease, now=current_time)
    if invalid_reason is not None:
        return SpotlightPresentationQualificationResult(
            accepted=False,
            campaign_id=campaign_id or None,
            presentation_id=presentation_id or None,
            rejection_code=invalid_reason,
            policy=policy,
        )
    server_elapsed_ms = max(
        0,
        int(
            (
                current_time - (_as_aware_utc(lease.issued_at) or current_time)
            ).total_seconds()
            * 1000
        ),
    )
    if server_elapsed_ms < int(policy.qualifying_visible_ms):
        return SpotlightPresentationQualificationResult(
            accepted=False,
            campaign_id=campaign_id or None,
            presentation_id=presentation_id or None,
            rejection_code='server_elapsed_below_visibility_threshold',
            policy=policy,
        )
    if int(visible_ms or 0) > server_elapsed_ms + 250:
        return SpotlightPresentationQualificationResult(
            accepted=False,
            campaign_id=campaign_id or None,
            presentation_id=presentation_id or None,
            rejection_code='reported_visibility_exceeds_server_elapsed_time',
            policy=policy,
        )

    if str(lease.status or '') == 'qualified':
        existing_exposure = (
            db.query(SpotlightExposureEvent)
            .filter(SpotlightExposureEvent.viewer_user_id == token_viewer_id)
            .filter(SpotlightExposureEvent.campaign_id == campaign_id)
            .filter(SpotlightExposureEvent.presentation_id == presentation_id)
            .filter(SpotlightExposureEvent.event_type == 'qualifying_impression')
            .one_or_none()
        )
        if existing_exposure is None:
            return SpotlightPresentationQualificationResult(
                accepted=False,
                campaign_id=campaign_id,
                presentation_id=presentation_id,
                rejection_code='qualified_lease_missing_exposure',
                policy=policy,
            )
        db.commit()
        return SpotlightPresentationQualificationResult(
            accepted=True,
            recorded=False,
            deduped=True,
            event_id=int(existing_exposure.id),
            campaign_id=campaign_id,
            presentation_id=presentation_id,
            delivery_round_consumed=False,
            policy=policy,
        )
    # Different leases for the same viewer must not qualify against the same
    # stale frequency count. The stable viewer row serializes qualification in
    # PostgreSQL; the frequency check below therefore observes the last commit.
    (
        db.query(User.id)
        .filter(User.id == token_viewer_id)
        .with_for_update()
        .one()
    )
    candidate = _current_presentable_candidate(db, viewer_user_id=token_viewer_id, campaign_id=campaign_id, now=current_time)
    if candidate is None:
        return SpotlightPresentationQualificationResult(accepted=False, campaign_id=campaign_id or None, presentation_id=presentation_id or None, rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE, policy=policy)

    safe_key = str(qualification_key or "").strip()[:96]
    idempotency_key = f"{SPOTLIGHT_PRESENTATION_TOKEN_TYPE}:{presentation_id}"
    consumption = consume_spotlight_delivery_round(
        db,
        campaign_id=campaign_id,
        now=current_time,
    )
    if not consumption.consumed:
        db.rollback()
        return SpotlightPresentationQualificationResult(
            accepted=False,
            campaign_id=campaign_id,
            presentation_id=presentation_id,
            rejection_code=(
                str(consumption.blocked_reason)
                if consumption.blocked_reason
                else PRESENTATION_REJECTION_DELIVERY_CONFLICT
            ),
            policy=policy,
        )
    exposure = record_spotlight_qualifying_impression(
        db,
        viewer_user_id=token_viewer_id,
        candidate=candidate,
        idempotency_key=idempotency_key,
        event_at=current_time,
        presentation_surface=surface,
        presentation_context={
            "presentation_id": presentation_id,
            "qualification_key": safe_key or None,
            "visible_ms": int(visible_ms or 0),
            "visible_ratio": float(visible_ratio or 0),
            "document_visible": bool(document_visible),
            "policy": policy.to_public_dict(),
        },
        content_version=int(lease.content_version),
        presentation_id=presentation_id,
        owner_preview=False,
        commit=False,
    )
    if not (exposure.recorded or exposure.deduped):
        db.rollback()
        return SpotlightPresentationQualificationResult(
            accepted=False,
            campaign_id=campaign_id,
            presentation_id=presentation_id,
            rejection_code=exposure.rejection_code,
            exposure_result=exposure,
            policy=policy,
        )

    lease.status = 'qualified'
    lease.qualified_at = current_time
    # Round consumption, qualifying exposure, and lease completion are one
    # transaction. A failed commit leaves all three unchanged.
    db.commit()
    event = exposure.event
    return SpotlightPresentationQualificationResult(
        accepted=bool(exposure.recorded or exposure.deduped),
        recorded=bool(exposure.recorded),
        deduped=bool(exposure.deduped),
        event_id=int(event.id) if event is not None and event.id is not None else None,
        campaign_id=campaign_id,
        presentation_id=presentation_id,
        delivery_round_consumed=True,
        rejection_code=exposure.rejection_code,
        exposure_result=exposure,
        policy=policy,
    )


def revalidate_spotlight_presentation(
    db: Session,
    *,
    viewer_user_id: int,
    presentation_token: str,
    now: Optional[datetime] = None,
    surface: str = SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
) -> dict[str, Any]:
    current_time = _as_aware_utc(now) or _now_utc()
    payload = _decode_presentation_token(presentation_token)
    presentation_id = str((payload or {}).get('sid') or '').strip()
    if not presentation_id or int((payload or {}).get('viewer_user_id') or 0) != int(viewer_user_id):
        return {'valid': False, 'rejection_code': PRESENTATION_REJECTION_INVALID_TOKEN}
    lease = (
        db.query(SpotlightPresentationLease)
        .filter(SpotlightPresentationLease.presentation_id == presentation_id)
        .filter(SpotlightPresentationLease.viewer_user_id == int(viewer_user_id))
        .filter(SpotlightPresentationLease.surface == surface)
        .one_or_none()
    )
    reason = _lease_invalid_reason(db, lease=lease, now=current_time)
    if reason is not None:
        if lease is not None and lease.status == 'issued':
            lease.status = 'invalidated'
            lease.invalidated_at = current_time
            lease.invalidation_reason = reason
        return {
            'valid': False,
            'presentation_id': presentation_id,
            'rejection_code': reason,
            'serving_contract_version': 2,
        }
    return {
        'valid': True,
        'presentation_id': presentation_id,
        'campaign_id': int(lease.campaign_id),
        'placement_broadcast_id': int(lease.placement_broadcast_id),
        'content_version': int(lease.content_version),
        'lease_expires_at': _as_aware_utc(lease.lease_expires_at).isoformat(),
        'serving_contract_version': 2,
    }


def _replay_existing_lease(
    db: Session,
    *,
    viewer_user_id: int,
    issuance_key: str,
    issuance_fingerprint: str,
    surface: str,
    now: datetime,
    policy: SpotlightPresentationPolicy,
) -> Optional[SpotlightPresentationSelection]:
    leases = (
        db.query(SpotlightPresentationLease)
        .filter(SpotlightPresentationLease.issuance_key == issuance_key)
        .order_by(SpotlightPresentationLease.id.asc())
        .all()
    )
    if not leases:
        return None
    if len(leases) != 1:
        return SpotlightPresentationSelection(
            selected=False,
            rejection_code=PRESENTATION_REJECTION_ISSUANCE_CONFLICT,
            policy=policy,
        )
    lease = leases[0]
    stored_fingerprint = str(getattr(lease, 'issuance_fingerprint', '') or '')
    if (
        int(lease.viewer_user_id) != int(viewer_user_id)
        or str(lease.surface) != str(surface)
        or (stored_fingerprint and stored_fingerprint != issuance_fingerprint)
    ):
        return SpotlightPresentationSelection(
            selected=False,
            rejection_code=PRESENTATION_REJECTION_ISSUANCE_CONFLICT,
            policy=policy,
        )
    invalid_reason = _lease_invalid_reason(db, lease=lease, now=now)
    if invalid_reason is not None:
        return SpotlightPresentationSelection(
            selected=False,
            presentation_id=lease.presentation_id,
            placement_broadcast_id=int(lease.placement_broadcast_id),
            content_version=int(lease.content_version),
            token_expires_at=_as_aware_utc(lease.lease_expires_at),
            rejection_code=invalid_reason,
            policy=policy,
        )
    candidate = _current_presentable_candidate(
        db,
        viewer_user_id=int(viewer_user_id),
        campaign_id=int(lease.campaign_id),
        now=now,
    )
    campaign = db.get(SpotlightCampaign, int(lease.campaign_id))
    if candidate is None or campaign is None:
        return SpotlightPresentationSelection(
            selected=False,
            rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
            policy=policy,
        )
    remaining = max((_as_aware_utc(lease.lease_expires_at) - now).total_seconds(), 1)
    token = create_access_token(
        {
            'typ': SPOTLIGHT_PRESENTATION_TOKEN_TYPE,
            'sid': lease.presentation_id,
            'viewer_user_id': int(viewer_user_id),
            'campaign_id': int(lease.campaign_id),
            'surface': surface,
            'issued_at': _as_aware_utc(lease.issued_at).isoformat(),
        },
        expires_delta=timedelta(seconds=remaining),
    )
    return SpotlightPresentationSelection(
        selected=True,
        candidate=candidate,
        campaign=campaign,
        presentation_id=lease.presentation_id,
        presentation_token=token,
        placement_broadcast_id=int(lease.placement_broadcast_id),
        content_version=int(lease.content_version),
        token_expires_at=_as_aware_utc(lease.lease_expires_at),
        policy=policy,
    )


def _lease_invalid_reason(
    db: Session, *, lease: Optional[SpotlightPresentationLease], now: datetime
) -> Optional[str]:
    if lease is None:
        return 'presentation_lease_missing'
    if str(lease.status or '') not in {'issued', 'qualified'}:
        return str(lease.invalidation_reason or 'presentation_invalidated')
    if now >= _as_aware_utc(lease.lease_expires_at):
        return PRESENTATION_REJECTION_TOKEN_EXPIRED
    campaign = db.get(SpotlightCampaign, int(lease.campaign_id))
    placement = db.get(MarketplaceBroadcast, int(lease.placement_broadcast_id))
    if campaign is None or placement is None:
        return PRESENTATION_REJECTION_STALE_CANDIDATE
    if not row_is_serving(campaign, now=now) or not row_is_serving(placement, now=now):
        return 'presentation_no_longer_serving'
    if int(campaign.content_version or 1) != int(lease.content_version):
        return 'presentation_content_replaced'
    if int(placement.content_version or 1) != int(lease.content_version):
        return 'presentation_content_replaced'
    return None


def _placement_for_candidate(
    db: Session,
    *,
    candidate: SpotlightOpportunityCandidate,
    campaign_id: int,
    now: datetime,
    lock_for_update: bool = False,
) -> Optional[MarketplaceBroadcast]:
    route_ids = [
        int(route.placement_broadcast_id)
        for route in (getattr(candidate.eligibility, 'routes', ()) or ())
        if getattr(route, 'placement_broadcast_id', None) is not None
    ]
    query = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.spotlight_campaign_id == int(campaign_id))
        .filter(MarketplaceBroadcast.serving_status == 'serving')
        .order_by(MarketplaceBroadcast.id.asc())
    )
    if route_ids:
        query = query.filter(MarketplaceBroadcast.id.in_(route_ids))
    if lock_for_update:
        query = query.with_for_update()
    rows = query.all()
    return next((row for row in rows if row_is_serving(row, now=now)), None)


def _persist_presentation_lease(db: Session, *, lease: SpotlightPresentationLease) -> None:
    """Single failure-injection seam for round-plus-lease atomicity tests."""
    db.add(lease)
    db.flush()


def _presentation_issuance_fingerprint(
    *,
    viewer_user_id: int,
    surface: str,
    requested_delivery_slots: int,
    candidate_campaign_ids: Optional[list[int]] = None,
) -> str:
    payload = {
        'requested_delivery_slots': int(requested_delivery_slots),
        'surface': str(surface),
        'viewer_user_id': int(viewer_user_id),
    }
    if candidate_campaign_ids is not None:
        payload['candidate_campaign_ids'] = sorted(
            {
                int(value)
                for value in candidate_campaign_ids
                if int(value or 0) > 0
            }
        )
    encoded = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()


def _current_presentable_candidate(
    db: Session,
    *,
    viewer_user_id: int,
    campaign_id: int,
    now: datetime,
) -> Optional[SpotlightOpportunityCandidate]:
    if int(campaign_id or 0) <= 0:
        return None
    candidates = build_spotlight_opportunity_candidates(
        db,
        viewer_user_id=int(viewer_user_id),
        campaign_ids=[int(campaign_id)],
        limit=1,
        now=now,
    )
    if not candidates:
        return None
    diversity = allocate_spotlight_opportunity_candidates(
        db,
        viewer_user_id=int(viewer_user_id),
        candidates=candidates,
    )
    frequency = apply_spotlight_frequency_control(
        db,
        viewer_user_id=int(viewer_user_id),
        diversity_result=diversity,
    )
    for candidate in frequency.candidates:
        if int(candidate.campaign_id) == int(campaign_id):
            return candidate
    return None


def _decode_presentation_token(token: str) -> Optional[dict[str, Any]]:
    value = str(token or "").strip()
    if not value:
        return None
    try:
        return decode_token(value)
    except Exception as exc:
        if exc.__class__.__name__.lower().endswith("expiredsignatureerror"):
            return {"expired": True}
        return None


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
