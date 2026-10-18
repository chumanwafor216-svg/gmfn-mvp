from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
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
)
from app.services.spotlight_lifecycle_service import authorized_expiry, row_is_serving

SPOTLIGHT_PRESENTATION_TOKEN_TYPE = "spotlight_presentation_v1"
SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP = "public_shop_spotlight_rail"
SPOTLIGHT_PRESENTATION_TOKEN_TTL_SECONDS = 30
SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS = 60
SPOTLIGHT_PRESENTATION_ROTATION_MS = 5000
SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS = 1000
SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO = 0.6
SPOTLIGHT_PRESENTATION_INTERACTION_PAUSE_MS = 8000
SPOTLIGHT_PRESENTATION_REDUCED_MOTION_ROTATION_MS = 30000
SPOTLIGHT_PRESENTATION_REPLAY_LIMIT = 4

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


class _SpotlightRoundNotConsumed(RuntimeError):
    def __init__(self, result: Any):
        super().__init__(str(getattr(result, "blocked_reason", None) or PRESENTATION_REJECTION_DELIVERY_CONFLICT))
        self.result = result


@dataclass(frozen=True)
class SpotlightPresentationPolicy:
    passive_rotation_ms: int = SPOTLIGHT_PRESENTATION_ROTATION_MS
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
            "rejection_code": self.rejection_code,
            "policy": self.policy.to_public_dict(),
            "boundary_note": "A delivery round is not a qualifying impression until the visible presentation contract is satisfied.",
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


def presentation_policy() -> SpotlightPresentationPolicy:
    return SpotlightPresentationPolicy()


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


def select_spotlight_presentation(
    db: Session,
    *,
    viewer_user_id: int,
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
    candidates = build_spotlight_opportunity_candidates(
        db,
        viewer_user_id=viewer_id,
        limit=50,
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

    pacing = plan_persistent_spotlight_delivery_opportunities(
        db,
        viewer_user_id=viewer_id,
        frequency_result=frequency,
        requested_delivery_slots=max(int(requested_delivery_slots), 1),
        now=current_time,
    )
    if not pacing.scheduled_campaign_ids:
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            rejection_code=PRESENTATION_REJECTION_NO_DELIVERY_OPPORTUNITY,
            policy=policy,
        )
    selected_campaign_id = int(pacing.scheduled_campaign_ids[0])
    candidate_by_id = {int(candidate.campaign_id): candidate for candidate in frequency.candidates}
    candidate = candidate_by_id.get(selected_campaign_id)
    if candidate is None:
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
            policy=policy,
        )
    campaign = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id == selected_campaign_id)
        .with_for_update()
        .one_or_none()
    )
    if campaign is None or str(getattr(campaign, "status", "") or "") != "active":
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            rejection_code=PRESENTATION_REJECTION_CAMPAIGN_NOT_ACTIVE,
            policy=policy,
        )

    presentation_id = f"sp-{uuid4().hex}"
    placement = _placement_for_candidate(
        db,
        candidate=candidate,
        campaign_id=selected_campaign_id,
        now=current_time,
        lock_for_update=True,
    )
    if placement is None:
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
            policy=policy,
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
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=pacing,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            rejection_code=PRESENTATION_REJECTION_STALE_CANDIDATE,
            policy=policy,
        )
    content_version = int(getattr(campaign, 'content_version', 1) or 1)
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
    try:
        with db.begin_nested():
            consumption = consume_spotlight_delivery_round(
                db,
                campaign_id=selected_campaign_id,
                now=current_time,
            )
            if not consumption.consumed:
                raise _SpotlightRoundNotConsumed(consumption)
            _persist_presentation_lease(db, lease=lease)
    except _SpotlightRoundNotConsumed as exc:
        blocked_pacing = SpotlightPersistentPacingResult(
            viewer_user_id=viewer_id,
            pacing_result=pacing.pacing_result,
            consumption_results=(exc.result,),
            scheduled_campaign_ids=pacing.scheduled_campaign_ids,
            consumed_campaign_ids=(),
            blocked_campaign_ids=(selected_campaign_id,),
        )
        return SpotlightPresentationSelection(
            selected=False,
            pacing_result=blocked_pacing,
            frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
            rejection_code=str(exc),
            policy=policy,
        )
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
    pacing = SpotlightPersistentPacingResult(
        viewer_user_id=viewer_id,
        pacing_result=pacing.pacing_result,
        consumption_results=(consumption,),
        scheduled_campaign_ids=pacing.scheduled_campaign_ids,
        consumed_campaign_ids=(selected_campaign_id,),
        blocked_campaign_ids=(),
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
        delivery_round_consumed=True,
        token_expires_at=token_expires_at,
        pacing_result=pacing,
        frequency_suppressed_campaign_ids=frequency_suppressed_campaign_ids,
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

    lease = (
        db.query(SpotlightPresentationLease)
        .filter(SpotlightPresentationLease.presentation_id == presentation_id)
        .filter(SpotlightPresentationLease.viewer_user_id == token_viewer_id)
        .with_for_update()
        .one_or_none()
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
    if exposure.recorded or exposure.deduped:
        lease.status = 'qualified'
        lease.qualified_at = current_time
        # Exposure and lease qualification are one transaction. A failed
        # commit cannot consume the viewer cap while leaving an issued lease.
        db.commit()
    event = exposure.event
    return SpotlightPresentationQualificationResult(
        accepted=bool(exposure.recorded or exposure.deduped),
        recorded=bool(exposure.recorded),
        deduped=bool(exposure.deduped),
        event_id=int(event.id) if event is not None and event.id is not None else None,
        campaign_id=campaign_id,
        presentation_id=presentation_id,
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
    *, viewer_user_id: int, surface: str, requested_delivery_slots: int
) -> str:
    payload = {
        'requested_delivery_slots': int(requested_delivery_slots),
        'surface': str(surface),
        'viewer_user_id': int(viewer_user_id),
    }
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
