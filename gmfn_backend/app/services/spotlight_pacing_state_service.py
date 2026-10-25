from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import SpotlightCampaign, SpotlightCampaignPacingState as SpotlightCampaignPacingStateModel
from app.services.spotlight_delivery_pacing_service import (
    SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
    SPOTLIGHT_PACING_PROFILE_NEUTRAL,
    SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED,
    SPOTLIGHT_PACING_REASON_CAMPAIGN_MISSING,
    SPOTLIGHT_PACING_REASON_CAMPAIGN_NOT_ACTIVE,
    SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE,
    SPOTLIGHT_PACING_REASON_QUIET_WINDOW,
    SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED,
    SpotlightCampaignPacingState as VolatileSpotlightCampaignPacingState,
    SpotlightDeliveryPacingResult,
    SpotlightDeliveryWindowPolicy,
    evaluate_spotlight_delivery_window,
    next_eligible_delivery_time,
    schedule_spotlight_delivery_opportunities,
)
from app.services.spotlight_frequency_control_service import SpotlightFrequencyControlResult
from app.services.spotlight_lifecycle_service import authorized_expiry, row_is_serving

SPOTLIGHT_PACING_STATE_PRIVACY = "private_internal_persistent_campaign_pacing_state"
SPOTLIGHT_PACING_STATE_CONFLICT = "pacing_state_version_conflict"
SPOTLIGHT_PACING_STATE_EXPIRED_BEFORE_EXHAUSTION = "expired_before_exhaustion"
# This is a global pilot safety ceiling for one 24-hour GSN promotion, not a
# per-viewer impression cap. It is deliberately bounded until load tests prove
# a larger production value.
SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS = 10_000


@dataclass(frozen=True)
class SpotlightPacingStateSnapshot:
    campaign_id: int
    max_delivery_rounds: int
    consumed_delivery_rounds: int
    rounds_remaining: int
    last_delivery_opportunity_at: Optional[datetime]
    next_eligible_delivery_at: Optional[datetime]
    pacing_profile: str
    delivery_window_policy: Optional[SpotlightDeliveryWindowPolicy]
    exhausted: bool
    version: int
    updated_at: Optional[datetime]
    expired_before_exhaustion: bool = False
    privacy: str = SPOTLIGHT_PACING_STATE_PRIVACY

    def to_volatile_state(self) -> VolatileSpotlightCampaignPacingState:
        return VolatileSpotlightCampaignPacingState(
            campaign_id=self.campaign_id,
            consumed_rounds=self.consumed_delivery_rounds,
            max_delivery_rounds=self.max_delivery_rounds,
            next_eligible_delivery_at=self.next_eligible_delivery_at,
            delivery_window_policy=self.delivery_window_policy,
            pacing_profile=self.pacing_profile,
        )

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "max_delivery_rounds": self.max_delivery_rounds,
            "consumed_delivery_rounds": self.consumed_delivery_rounds,
            "rounds_remaining": self.rounds_remaining,
            "last_delivery_opportunity_at": _iso_or_none(self.last_delivery_opportunity_at),
            "next_eligible_delivery_at": _iso_or_none(self.next_eligible_delivery_at),
            "pacing_profile": self.pacing_profile,
            "delivery_window_policy": self.delivery_window_policy.to_internal_dict() if self.delivery_window_policy else None,
            "exhausted": self.exhausted,
            "version": self.version,
            "updated_at": _iso_or_none(self.updated_at),
            "expired_before_exhaustion": self.expired_before_exhaustion,
            "privacy": self.privacy,
        }


@dataclass(frozen=True)
class SpotlightRoundConsumptionResult:
    campaign_id: int
    consumed: bool
    consumed_rounds_before: int
    consumed_rounds_after: int
    max_delivery_rounds: int
    version_before: int
    version_after: int
    last_delivery_opportunity_at: Optional[datetime]
    next_eligible_delivery_at: Optional[datetime]
    exhausted: bool
    blocked_reason: Optional[str] = None
    privacy: str = SPOTLIGHT_PACING_STATE_PRIVACY

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "consumed": self.consumed,
            "consumed_rounds_before": self.consumed_rounds_before,
            "consumed_rounds_after": self.consumed_rounds_after,
            "max_delivery_rounds": self.max_delivery_rounds,
            "version_before": self.version_before,
            "version_after": self.version_after,
            "last_delivery_opportunity_at": _iso_or_none(self.last_delivery_opportunity_at),
            "next_eligible_delivery_at": _iso_or_none(self.next_eligible_delivery_at),
            "exhausted": self.exhausted,
            "blocked_reason": self.blocked_reason,
            "privacy": self.privacy,
        }


@dataclass(frozen=True)
class SpotlightPersistentPacingResult:
    viewer_user_id: int
    pacing_result: SpotlightDeliveryPacingResult
    consumption_results: tuple[SpotlightRoundConsumptionResult, ...]
    scheduled_campaign_ids: tuple[int, ...]
    consumed_campaign_ids: tuple[int, ...]
    blocked_campaign_ids: tuple[int, ...]
    privacy: str = SPOTLIGHT_PACING_STATE_PRIVACY

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "viewer_user_id": self.viewer_user_id,
            "pacing": self.pacing_result.to_internal_dict(),
            "consumption_results": [result.to_internal_dict() for result in self.consumption_results],
            "scheduled_campaign_ids": list(self.scheduled_campaign_ids),
            "consumed_campaign_ids": list(self.consumed_campaign_ids),
            "blocked_campaign_ids": list(self.blocked_campaign_ids),
            "privacy": self.privacy,
        }


def get_or_create_spotlight_campaign_pacing_state(
    db: Session,
    *,
    campaign_id: int,
    now: Optional[datetime] = None,
    default_max_delivery_rounds: int = SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
    default_pacing_profile: str = SPOTLIGHT_PACING_PROFILE_NEUTRAL,
    default_delivery_window_policy: Optional[SpotlightDeliveryWindowPolicy] = None,
) -> SpotlightPacingStateSnapshot:
    safe_campaign_id = int(campaign_id)
    campaign = db.query(SpotlightCampaign).filter(SpotlightCampaign.id == safe_campaign_id).one_or_none()
    if campaign is None:
        raise ValueError(f"Spotlight campaign {safe_campaign_id} does not exist")

    current_time = _as_aware_utc(now) or _now_utc()
    is_gsn_house = str(getattr(campaign, "source_kind", "") or "") == "gsn_house"
    existing = _state_for_campaign(db, campaign_id=safe_campaign_id)
    if existing is not None:
        if (
            is_gsn_house
            and str(existing.pacing_profile or "neutral") == SPOTLIGHT_PACING_PROFILE_NEUTRAL
            and int(existing.max_delivery_rounds or 0)
            < SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS
        ):
            existing.max_delivery_rounds = SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS
            existing.exhausted = (
                int(existing.consumed_delivery_rounds or 0)
                >= SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS
            )
            existing.updated_at = current_time
            db.flush()
        return snapshot_from_pacing_state(db, existing, now=now)

    max_rounds = (
        SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS
        if is_gsn_house
        else max(int(default_max_delivery_rounds), 0)
    )
    policy_json = _delivery_window_policy_to_json(default_delivery_window_policy)
    next_eligible = _next_permitted_time(
        raw_time=next_eligible_delivery_time(
            activated_at=_campaign_activation_time(campaign, fallback=current_time),
            expires_at=authorized_expiry(campaign),
            max_delivery_rounds=max_rounds,
            consumed_rounds=0,
        ),
        policy=default_delivery_window_policy,
    )
    row = SpotlightCampaignPacingStateModel(
        campaign_id=safe_campaign_id,
        max_delivery_rounds=max_rounds,
        consumed_delivery_rounds=0,
        next_eligible_delivery_at=next_eligible,
        pacing_profile=str(default_pacing_profile or SPOTLIGHT_PACING_PROFILE_NEUTRAL),
        delivery_window_policy_json=policy_json,
        exhausted=max_rounds <= 0,
        version=0,
        created_at=current_time,
        updated_at=current_time,
    )
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        existing = _state_for_campaign(db, campaign_id=safe_campaign_id)
        if existing is None:
            raise
        return snapshot_from_pacing_state(db, existing, now=now)
    return snapshot_from_pacing_state(db, row, now=now)


def get_or_create_spotlight_campaign_pacing_states(
    db: Session,
    *,
    campaign_ids: Iterable[int],
    now: Optional[datetime] = None,
    default_max_delivery_rounds: int = SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
) -> dict[int, SpotlightPacingStateSnapshot]:
    snapshots: dict[int, SpotlightPacingStateSnapshot] = {}
    for campaign_id in _safe_campaign_ids(campaign_ids):
        snapshots[campaign_id] = get_or_create_spotlight_campaign_pacing_state(
            db,
            campaign_id=campaign_id,
            now=now,
            default_max_delivery_rounds=default_max_delivery_rounds,
        )
    return snapshots


def schedule_persistent_spotlight_delivery_opportunities(
    db: Session,
    *,
    viewer_user_id: int,
    frequency_result: SpotlightFrequencyControlResult,
    requested_delivery_slots: int = 1,
    now: Optional[datetime] = None,
    default_max_delivery_rounds: int = SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
) -> SpotlightPersistentPacingResult:
    planned = plan_persistent_spotlight_delivery_opportunities(
        db,
        viewer_user_id=viewer_user_id,
        frequency_result=frequency_result,
        requested_delivery_slots=requested_delivery_slots,
        now=now,
        default_max_delivery_rounds=default_max_delivery_rounds,
    )
    current_time = _as_aware_utc(now) or _now_utc()
    snapshots = get_or_create_spotlight_campaign_pacing_states(
        db,
        campaign_ids=planned.scheduled_campaign_ids,
        now=current_time,
        default_max_delivery_rounds=default_max_delivery_rounds,
    )
    consumption_results: list[SpotlightRoundConsumptionResult] = []
    for campaign_id in planned.scheduled_campaign_ids:
        snapshot = snapshots.get(int(campaign_id))
        consumption_results.append(
            consume_spotlight_delivery_round(
                db,
                campaign_id=int(campaign_id),
                now=current_time,
                expected_version=(snapshot.version if snapshot else None),
                expected_consumed_rounds=(snapshot.consumed_delivery_rounds if snapshot else None),
            )
        )
    consumed_ids = tuple(result.campaign_id for result in consumption_results if result.consumed)
    blocked_ids = tuple(result.campaign_id for result in consumption_results if not result.consumed)
    return SpotlightPersistentPacingResult(
        viewer_user_id=int(viewer_user_id or 0),
        pacing_result=planned.pacing_result,
        consumption_results=tuple(consumption_results),
        scheduled_campaign_ids=planned.scheduled_campaign_ids,
        consumed_campaign_ids=consumed_ids,
        blocked_campaign_ids=blocked_ids,
    )


def plan_persistent_spotlight_delivery_opportunities(
    db: Session,
    *,
    viewer_user_id: int,
    frequency_result: SpotlightFrequencyControlResult,
    requested_delivery_slots: int = 1,
    now: Optional[datetime] = None,
    default_max_delivery_rounds: int = SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
) -> SpotlightPersistentPacingResult:
    """Plan presentation reservations without consuming a delivery round."""
    current_time = _as_aware_utc(now) or _now_utc()
    campaign_ids = [int(candidate.campaign_id) for candidate in frequency_result.candidates]
    snapshots = get_or_create_spotlight_campaign_pacing_states(
        db,
        campaign_ids=campaign_ids,
        now=current_time,
        default_max_delivery_rounds=default_max_delivery_rounds,
    )
    pacing_result = schedule_spotlight_delivery_opportunities(
        db,
        viewer_user_id=viewer_user_id,
        frequency_result=frequency_result,
        requested_delivery_slots=requested_delivery_slots,
        pacing_states=[snapshot.to_volatile_state() for snapshot in snapshots.values()],
        now=current_time,
    )
    return SpotlightPersistentPacingResult(
        viewer_user_id=int(viewer_user_id or 0),
        pacing_result=pacing_result,
        consumption_results=(),
        scheduled_campaign_ids=pacing_result.scheduled_campaign_ids,
        consumed_campaign_ids=(),
        blocked_campaign_ids=(),
    )


def spotlight_delivery_round_blocked_reason(
    db: Session,
    *,
    campaign_id: int,
    now: Optional[datetime] = None,
    lock_for_update: bool = False,
) -> Optional[str]:
    """Revalidate current round availability without consuming it."""
    current_time = _as_aware_utc(now) or _now_utc()
    state_query = db.query(SpotlightCampaignPacingStateModel).filter(
        SpotlightCampaignPacingStateModel.campaign_id == int(campaign_id)
    )
    if lock_for_update:
        state_query = state_query.with_for_update()
    row = state_query.one_or_none()
    if row is None:
        return SPOTLIGHT_PACING_REASON_CAMPAIGN_MISSING

    campaign = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id == int(campaign_id))
        .one_or_none()
    )
    if campaign is None:
        return SPOTLIGHT_PACING_REASON_CAMPAIGN_MISSING
    if str(campaign.status or '') != 'active' or not row_is_serving(
        campaign, now=current_time
    ):
        return SPOTLIGHT_PACING_REASON_CAMPAIGN_NOT_ACTIVE
    expires_at = authorized_expiry(campaign)
    if expires_at is not None and current_time >= expires_at:
        return SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED

    policy = _delivery_window_policy_from_json(row.delivery_window_policy_json)
    if not evaluate_spotlight_delivery_window(now=current_time, policy=policy).active:
        return SPOTLIGHT_PACING_REASON_QUIET_WINDOW
    next_eligible = _as_aware_utc(row.next_eligible_delivery_at)
    if next_eligible is not None and current_time < next_eligible:
        return SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE
    if bool(row.exhausted) or int(row.consumed_delivery_rounds) >= int(
        row.max_delivery_rounds
    ):
        return SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED
    return None


def consume_spotlight_delivery_round(
    db: Session,
    *,
    campaign_id: int,
    now: Optional[datetime] = None,
    expected_version: Optional[int] = None,
    expected_consumed_rounds: Optional[int] = None,
) -> SpotlightRoundConsumptionResult:
    current_time = _as_aware_utc(now) or _now_utc()
    row = _state_for_campaign(db, campaign_id=int(campaign_id))
    if row is None:
        return _blocked_consumption(campaign_id=int(campaign_id), reason=SPOTLIGHT_PACING_REASON_CAMPAIGN_MISSING)
    campaign = db.query(SpotlightCampaign).filter(SpotlightCampaign.id == int(campaign_id)).one_or_none()
    if campaign is None:
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_REASON_CAMPAIGN_MISSING)
    if str(campaign.status or "") != "active":
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_REASON_CAMPAIGN_NOT_ACTIVE)
    if not row_is_serving(campaign, now=current_time):
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_REASON_CAMPAIGN_NOT_ACTIVE)
    expires_at = authorized_expiry(campaign)
    if expires_at is not None and current_time >= expires_at:
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED)

    policy = _delivery_window_policy_from_json(row.delivery_window_policy_json)
    if not evaluate_spotlight_delivery_window(now=current_time, policy=policy).active:
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_REASON_QUIET_WINDOW)

    next_eligible = _as_aware_utc(row.next_eligible_delivery_at)
    if next_eligible is not None and current_time < next_eligible:
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE)
    if int(row.consumed_delivery_rounds) >= int(row.max_delivery_rounds):
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED)
    if expected_version is not None and int(row.version) != int(expected_version):
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_STATE_CONFLICT)
    if expected_consumed_rounds is not None and int(row.consumed_delivery_rounds) != int(expected_consumed_rounds):
        return _blocked_from_row(row, reason=SPOTLIGHT_PACING_STATE_CONFLICT)

    consumed_before = int(row.consumed_delivery_rounds)
    version_before = int(row.version)
    consumed_after = _consumed_rounds_after_delivery(
        consumed_before=consumed_before,
        consumed_at=current_time,
        policy=policy,
    )
    consumed_after = min(max(consumed_after, consumed_before + 1), int(row.max_delivery_rounds))
    exhausted_after = consumed_after >= int(row.max_delivery_rounds)
    raw_next = _scheduled_next_eligible_time(
        consumed_rounds=consumed_after,
        policy=policy,
    ) or next_eligible_delivery_time(
        activated_at=_campaign_activation_time(campaign, fallback=current_time),
        expires_at=expires_at,
        max_delivery_rounds=int(row.max_delivery_rounds),
        consumed_rounds=consumed_after,
    )
    raw_next = _defer_past_due_next_time(
        raw_time=raw_next,
        consumed_at=current_time,
        activated_at=_campaign_activation_time(campaign, fallback=current_time),
        expires_at=expires_at,
        max_delivery_rounds=int(row.max_delivery_rounds),
    )
    next_after = None if exhausted_after else _next_permitted_time(raw_time=raw_next, policy=policy)
    rows_updated = (
        db.query(SpotlightCampaignPacingStateModel)
        .filter(SpotlightCampaignPacingStateModel.campaign_id == int(campaign_id))
        .filter(SpotlightCampaignPacingStateModel.version == version_before)
        .filter(SpotlightCampaignPacingStateModel.consumed_delivery_rounds == consumed_before)
        .filter(SpotlightCampaignPacingStateModel.consumed_delivery_rounds < SpotlightCampaignPacingStateModel.max_delivery_rounds)
        .update(
            {
                "consumed_delivery_rounds": consumed_after,
                "last_delivery_opportunity_at": current_time,
                "next_eligible_delivery_at": next_after,
                "exhausted": exhausted_after,
                "version": version_before + 1,
                "updated_at": current_time,
            },
            synchronize_session=False,
        )
    )
    if rows_updated != 1:
        db.flush()
        current = _state_for_campaign(db, campaign_id=int(campaign_id))
        if current is None:
            return _blocked_consumption(campaign_id=int(campaign_id), reason=SPOTLIGHT_PACING_STATE_CONFLICT)
        return _blocked_from_row(current, reason=SPOTLIGHT_PACING_STATE_CONFLICT)
    db.flush()
    return SpotlightRoundConsumptionResult(
        campaign_id=int(campaign_id),
        consumed=True,
        consumed_rounds_before=consumed_before,
        consumed_rounds_after=consumed_after,
        max_delivery_rounds=int(row.max_delivery_rounds),
        version_before=version_before,
        version_after=version_before + 1,
        last_delivery_opportunity_at=current_time,
        next_eligible_delivery_at=next_after,
        exhausted=exhausted_after,
    )


def snapshot_from_pacing_state(
    db: Session,
    row: SpotlightCampaignPacingStateModel,
    *,
    now: Optional[datetime] = None,
) -> SpotlightPacingStateSnapshot:
    campaign = db.query(SpotlightCampaign).filter(SpotlightCampaign.id == int(row.campaign_id)).one_or_none()
    current_time = _as_aware_utc(now) or _now_utc()
    expires_at = _as_aware_utc(getattr(campaign, "expires_at", None)) if campaign is not None else None
    expired_before_exhaustion = bool(
        expires_at is not None
        and current_time >= expires_at
        and int(row.consumed_delivery_rounds) < int(row.max_delivery_rounds)
    )
    return SpotlightPacingStateSnapshot(
        campaign_id=int(row.campaign_id),
        max_delivery_rounds=int(row.max_delivery_rounds),
        consumed_delivery_rounds=int(row.consumed_delivery_rounds),
        rounds_remaining=max(int(row.max_delivery_rounds) - int(row.consumed_delivery_rounds), 0),
        last_delivery_opportunity_at=_as_aware_utc(row.last_delivery_opportunity_at),
        next_eligible_delivery_at=_as_aware_utc(row.next_eligible_delivery_at),
        pacing_profile=str(row.pacing_profile or SPOTLIGHT_PACING_PROFILE_NEUTRAL),
        delivery_window_policy=_delivery_window_policy_from_json(row.delivery_window_policy_json),
        exhausted=bool(row.exhausted),
        version=int(row.version),
        updated_at=_as_aware_utc(row.updated_at),
        expired_before_exhaustion=expired_before_exhaustion,
    )


def _state_for_campaign(db: Session, *, campaign_id: int) -> Optional[SpotlightCampaignPacingStateModel]:
    return (
        db.query(SpotlightCampaignPacingStateModel)
        .filter(SpotlightCampaignPacingStateModel.campaign_id == int(campaign_id))
        .one_or_none()
    )


def _blocked_from_row(row: SpotlightCampaignPacingStateModel, *, reason: str) -> SpotlightRoundConsumptionResult:
    return SpotlightRoundConsumptionResult(
        campaign_id=int(row.campaign_id),
        consumed=False,
        consumed_rounds_before=int(row.consumed_delivery_rounds),
        consumed_rounds_after=int(row.consumed_delivery_rounds),
        max_delivery_rounds=int(row.max_delivery_rounds),
        version_before=int(row.version),
        version_after=int(row.version),
        last_delivery_opportunity_at=_as_aware_utc(row.last_delivery_opportunity_at),
        next_eligible_delivery_at=_as_aware_utc(row.next_eligible_delivery_at),
        exhausted=bool(row.exhausted),
        blocked_reason=reason,
    )


def _blocked_consumption(*, campaign_id: int, reason: str) -> SpotlightRoundConsumptionResult:
    return SpotlightRoundConsumptionResult(
        campaign_id=int(campaign_id),
        consumed=False,
        consumed_rounds_before=0,
        consumed_rounds_after=0,
        max_delivery_rounds=0,
        version_before=0,
        version_after=0,
        last_delivery_opportunity_at=None,
        next_eligible_delivery_at=None,
        exhausted=False,
        blocked_reason=reason,
    )



def _defer_past_due_next_time(
    *,
    raw_time: Optional[datetime],
    consumed_at: datetime,
    activated_at: datetime,
    expires_at: Optional[datetime],
    max_delivery_rounds: int,
) -> Optional[datetime]:
    candidate = _as_aware_utc(raw_time)
    current_time = _as_aware_utc(consumed_at) or _now_utc()
    if candidate is None or candidate > current_time:
        return candidate
    expiry = _as_aware_utc(expires_at)
    active_start = _as_aware_utc(activated_at) or current_time
    if expiry is not None and expiry > active_start and max_delivery_rounds > 0:
        interval = (expiry - active_start) / max(int(max_delivery_rounds), 1)
    else:
        interval = timedelta(minutes=60)
    return current_time + interval
def _next_permitted_time(*, raw_time: Optional[datetime], policy: Optional[SpotlightDeliveryWindowPolicy]) -> Optional[datetime]:
    candidate = _as_aware_utc(raw_time)
    if candidate is None:
        return None
    safe_policy = policy or SpotlightDeliveryWindowPolicy()
    schedule_start = _as_aware_utc(safe_policy.schedule_starts_at)
    schedule_end = _as_aware_utc(safe_policy.schedule_ends_at)
    if schedule_start is not None and candidate < schedule_start:
        candidate = schedule_start
    if schedule_end is not None and candidate >= schedule_end:
        return None
    if evaluate_spotlight_delivery_window(now=candidate, policy=safe_policy).active:
        return candidate
    # Deterministic small-step search; policy windows are minute-based and this avoids a second schedule formula.
    probe = candidate
    for _ in range((48 * 60) + 1):
        probe = probe + timedelta(minutes=1)
        if evaluate_spotlight_delivery_window(now=probe, policy=safe_policy).active:
            return probe
    return candidate


def _delivery_window_policy_to_json(policy: Optional[SpotlightDeliveryWindowPolicy]) -> Optional[str]:
    if policy is None:
        return None
    return json.dumps(policy.to_internal_dict(), sort_keys=True)


def _delivery_window_policy_from_json(value: Optional[str]) -> Optional[SpotlightDeliveryWindowPolicy]:
    if not value:
        return None
    try:
        payload = json.loads(value)
    except Exception:
        return None
    return SpotlightDeliveryWindowPolicy(
        active_start_minute=payload.get("active_start_minute"),
        active_end_minute=payload.get("active_end_minute"),
        timezone_identifier=payload.get("timezone_identifier"),
        utc_offset_minutes=payload.get("utc_offset_minutes"),
        policy_name=str(payload.get("policy_name") or SPOTLIGHT_PACING_PROFILE_NEUTRAL),
        schedule_starts_at=_as_aware_utc(_datetime_from_json(payload.get("schedule_starts_at"))),
        schedule_ends_at=_as_aware_utc(_datetime_from_json(payload.get("schedule_ends_at"))),
        interval_minutes=(
            max(int(payload.get("interval_minutes")), 1)
            if payload.get("interval_minutes") is not None
            else None
        ),
        timezone_label=(str(payload.get("timezone_label") or "").strip() or None),
    )


def _scheduled_next_eligible_time(
    *,
    consumed_rounds: int,
    policy: Optional[SpotlightDeliveryWindowPolicy],
) -> Optional[datetime]:
    if policy is None:
        return None
    starts_at = _as_aware_utc(policy.schedule_starts_at)
    ends_at = _as_aware_utc(policy.schedule_ends_at)
    interval_minutes = int(policy.interval_minutes or 0)
    if starts_at is None or ends_at is None or interval_minutes <= 0:
        return None
    candidate = starts_at + timedelta(minutes=interval_minutes * max(int(consumed_rounds), 0))
    return candidate if candidate < ends_at else None


def _consumed_rounds_after_delivery(
    *,
    consumed_before: int,
    consumed_at: datetime,
    policy: Optional[SpotlightDeliveryWindowPolicy],
) -> int:
    if policy is None:
        return int(consumed_before) + 1
    starts_at = _as_aware_utc(policy.schedule_starts_at)
    interval_minutes = int(policy.interval_minutes or 0)
    current_time = _as_aware_utc(consumed_at) or _now_utc()
    if starts_at is None or interval_minutes <= 0 or current_time < starts_at:
        return int(consumed_before) + 1
    elapsed_seconds = max((current_time - starts_at).total_seconds(), 0.0)
    current_slot_index = int(elapsed_seconds // (interval_minutes * 60))
    return max(int(consumed_before) + 1, current_slot_index + 1)


def _datetime_from_json(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    cleaned = str(value or "").strip()
    if not cleaned:
        return None
    try:
        return datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except ValueError:
        return None


def _campaign_activation_time(campaign: SpotlightCampaign, *, fallback: datetime) -> datetime:
    return _as_aware_utc(getattr(campaign, "activated_at", None)) or _as_aware_utc(getattr(campaign, "created_at", None)) or fallback


def _safe_campaign_ids(values: Iterable[int]) -> list[int]:
    out: list[int] = []
    seen: set[int] = set()
    for value in values or []:
        campaign_id = int(value or 0)
        if campaign_id <= 0 or campaign_id in seen:
            continue
        seen.add(campaign_id)
        out.append(campaign_id)
    return out


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _iso_or_none(value: Optional[datetime]) -> Optional[str]:
    normalized = _as_aware_utc(value)
    return normalized.isoformat() if normalized is not None else None
