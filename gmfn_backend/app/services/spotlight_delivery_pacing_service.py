from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.db.models import SpotlightCampaign
from app.services.spotlight_exposure_diversity_allocation_service import source_bucket_for_candidate
from app.services.spotlight_frequency_control_service import SpotlightFrequencyControlResult
from app.services.spotlight_opportunity_candidate_service import SpotlightOpportunityCandidate

SPOTLIGHT_TRAFFIC_STATE_LOW = "low"
SPOTLIGHT_TRAFFIC_STATE_NORMAL = "normal"
SPOTLIGHT_TRAFFIC_STATE_HIGH = "high"

SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS = 10
SPOTLIGHT_DEFAULT_REQUESTED_DELIVERY_SLOTS = 1
SPOTLIGHT_DEFAULT_ROUND_INTERVAL_MINUTES = 60
SPOTLIGHT_TRAFFIC_LOW_CANDIDATE_PRESSURE_RATIO = 1.0
SPOTLIGHT_TRAFFIC_HIGH_CANDIDATE_PRESSURE_RATIO = 2.0
SPOTLIGHT_TRAFFIC_HIGH_DISTINCT_SOURCE_BUCKETS = 3

SPOTLIGHT_PACING_PROFILE_NEUTRAL = "neutral"
SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK = "peak"
SPOTLIGHT_PACING_FUTURE_PROFILE_BALANCED = "balanced"
SPOTLIGHT_PACING_FUTURE_PROFILE_OFF_PEAK = "off_peak"
SPOTLIGHT_PACING_SUPPORTED_PROFILE_HOOKS = (
    SPOTLIGHT_PACING_PROFILE_NEUTRAL,
    SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK,
    SPOTLIGHT_PACING_FUTURE_PROFILE_BALANCED,
    SPOTLIGHT_PACING_FUTURE_PROFILE_OFF_PEAK,
)

SPOTLIGHT_PACING_REASON_CAMPAIGN_MISSING = "campaign_missing"
SPOTLIGHT_PACING_REASON_CAMPAIGN_NOT_ACTIVE = "campaign_not_active"
SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED = "campaign_expired"
SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED = "delivery_rounds_exhausted"
SPOTLIGHT_PACING_REASON_QUIET_WINDOW = "quiet_delivery_window"
SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE = "pacing_window_not_due"
SPOTLIGHT_PACING_REASON_SLOT_COMPETITION = "slot_competition_not_selected"
SPOTLIGHT_PACING_PRIVACY = "private_internal_delivery_pacing_metadata"


@dataclass(frozen=True)
class SpotlightTrafficClassification:
    traffic_state: str
    viable_candidate_count: int
    distinct_source_bucket_count: int
    requested_delivery_slots: int
    candidate_pressure_ratio: float
    low_candidate_pressure_ratio: float
    high_candidate_pressure_ratio: float
    high_distinct_source_bucket_count: int

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "traffic_state": self.traffic_state,
            "viable_candidate_count": self.viable_candidate_count,
            "distinct_source_bucket_count": self.distinct_source_bucket_count,
            "requested_delivery_slots": self.requested_delivery_slots,
            "candidate_pressure_ratio": self.candidate_pressure_ratio,
            "low_candidate_pressure_ratio": self.low_candidate_pressure_ratio,
            "high_candidate_pressure_ratio": self.high_candidate_pressure_ratio,
            "high_distinct_source_bucket_count": self.high_distinct_source_bucket_count,
        }


@dataclass(frozen=True)
class SpotlightDeliveryWindowPolicy:
    active_start_minute: Optional[int] = None
    active_end_minute: Optional[int] = None
    timezone_identifier: Optional[str] = None
    utc_offset_minutes: Optional[int] = None
    policy_name: str = SPOTLIGHT_PACING_PROFILE_NEUTRAL
    schedule_starts_at: Optional[datetime] = None
    schedule_ends_at: Optional[datetime] = None
    interval_minutes: Optional[int] = None
    timezone_label: Optional[str] = None

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "active_start_minute": self.active_start_minute,
            "active_end_minute": self.active_end_minute,
            "timezone_identifier": self.timezone_identifier,
            "utc_offset_minutes": self.utc_offset_minutes,
            "policy_name": self.policy_name,
            "schedule_starts_at": _iso_or_none(self.schedule_starts_at),
            "schedule_ends_at": _iso_or_none(self.schedule_ends_at),
            "interval_minutes": self.interval_minutes,
            "timezone_label": self.timezone_label,
        }


@dataclass(frozen=True)
class SpotlightCampaignPacingState:
    campaign_id: int
    consumed_rounds: int = 0
    max_delivery_rounds: Optional[int] = None
    next_eligible_delivery_at: Optional[datetime] = None
    delivery_window_policy: Optional[SpotlightDeliveryWindowPolicy] = None
    pacing_profile: str = SPOTLIGHT_PACING_PROFILE_NEUTRAL


@dataclass(frozen=True)
class SpotlightDeliveryWindowEvaluation:
    active: bool
    quiet: bool
    always_active_fallback: bool
    timezone_mode: str
    local_minute: Optional[int]
    policy: SpotlightDeliveryWindowPolicy

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "active": self.active,
            "quiet": self.quiet,
            "always_active_fallback": self.always_active_fallback,
            "timezone_mode": self.timezone_mode,
            "local_minute": self.local_minute,
            "policy": self.policy.to_internal_dict(),
        }


@dataclass(frozen=True)
class SpotlightCandidatePacingDecision:
    campaign_id: int
    original_rank: int
    pacing_rank: Optional[int]
    priority_band: str
    priority_rank: int
    source_bucket: str
    traffic_state: str
    scheduled: bool
    delivery_opportunity_created: bool
    delivery_round_consumed: bool
    consumed_rounds_before: int
    consumed_rounds_after: int
    max_delivery_rounds: int
    rounds_remaining_before: int
    rounds_remaining_after: int
    next_eligible_delivery_time: Optional[datetime]
    next_eligible_after_admission: Optional[datetime]
    campaign_activated_at: Optional[datetime]
    campaign_expires_at: Optional[datetime]
    exhausted: bool
    delivery_window: SpotlightDeliveryWindowEvaluation
    blocked_reason: Optional[str] = None
    pacing_profile: str = SPOTLIGHT_PACING_PROFILE_NEUTRAL
    privacy: str = SPOTLIGHT_PACING_PRIVACY

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "original_rank": self.original_rank,
            "pacing_rank": self.pacing_rank,
            "priority_band": self.priority_band,
            "priority_rank": self.priority_rank,
            "source_bucket": self.source_bucket,
            "traffic_state": self.traffic_state,
            "scheduled": self.scheduled,
            "delivery_opportunity_created": self.delivery_opportunity_created,
            "delivery_round_consumed": self.delivery_round_consumed,
            "consumed_rounds_before": self.consumed_rounds_before,
            "consumed_rounds_after": self.consumed_rounds_after,
            "max_delivery_rounds": self.max_delivery_rounds,
            "rounds_remaining_before": self.rounds_remaining_before,
            "rounds_remaining_after": self.rounds_remaining_after,
            "next_eligible_delivery_time": _iso_or_none(self.next_eligible_delivery_time),
            "next_eligible_after_admission": _iso_or_none(self.next_eligible_after_admission),
            "campaign_activated_at": _iso_or_none(self.campaign_activated_at),
            "campaign_expires_at": _iso_or_none(self.campaign_expires_at),
            "exhausted": self.exhausted,
            "delivery_window": self.delivery_window.to_internal_dict(),
            "blocked_reason": self.blocked_reason,
            "pacing_profile": self.pacing_profile,
            "privacy": self.privacy,
        }


@dataclass(frozen=True)
class SpotlightDeliveryPacingResult:
    viewer_user_id: int
    candidates: tuple[SpotlightOpportunityCandidate, ...]
    delivery_opportunities: tuple[SpotlightCandidatePacingDecision, ...]
    candidate_pacing: tuple[SpotlightCandidatePacingDecision, ...]
    traffic: SpotlightTrafficClassification
    requested_delivery_slots: int
    unused_delivery_slots: int
    scheduled_campaign_ids: tuple[int, ...]
    blocked_campaign_ids: tuple[int, ...]
    exhausted_campaign_ids: tuple[int, ...]
    frequency_result: Optional[SpotlightFrequencyControlResult] = None
    privacy: str = SPOTLIGHT_PACING_PRIVACY

    def to_internal_dict(self) -> dict[str, Any]:
        return {
            "viewer_user_id": self.viewer_user_id,
            "candidate_order_before_pacing": [decision.campaign_id for decision in self.candidate_pacing],
            "scheduled_campaign_ids": list(self.scheduled_campaign_ids),
            "blocked_campaign_ids": list(self.blocked_campaign_ids),
            "exhausted_campaign_ids": list(self.exhausted_campaign_ids),
            "requested_delivery_slots": self.requested_delivery_slots,
            "unused_delivery_slots": self.unused_delivery_slots,
            "traffic": self.traffic.to_internal_dict(),
            "delivery_opportunities": [decision.to_internal_dict() for decision in self.delivery_opportunities],
            "candidate_pacing": [decision.to_internal_dict() for decision in self.candidate_pacing],
            "frequency": self.frequency_result.to_internal_dict() if self.frequency_result is not None else None,
            "privacy": self.privacy,
        }


def classify_spotlight_traffic_state(
    *,
    viable_candidate_count: int,
    distinct_source_bucket_count: int,
    requested_delivery_slots: int = SPOTLIGHT_DEFAULT_REQUESTED_DELIVERY_SLOTS,
    low_candidate_pressure_ratio: float = SPOTLIGHT_TRAFFIC_LOW_CANDIDATE_PRESSURE_RATIO,
    high_candidate_pressure_ratio: float = SPOTLIGHT_TRAFFIC_HIGH_CANDIDATE_PRESSURE_RATIO,
    high_distinct_source_bucket_count: int = SPOTLIGHT_TRAFFIC_HIGH_DISTINCT_SOURCE_BUCKETS,
) -> SpotlightTrafficClassification:
    slots = max(int(requested_delivery_slots), 1)
    viable = max(int(viable_candidate_count), 0)
    distinct_buckets = max(int(distinct_source_bucket_count), 0)
    pressure = viable / slots
    low_threshold = max(float(low_candidate_pressure_ratio), 0.0)
    high_threshold = max(float(high_candidate_pressure_ratio), low_threshold)
    high_bucket_threshold = max(int(high_distinct_source_bucket_count), 1)
    if viable == 0 or pressure < low_threshold:
        state = SPOTLIGHT_TRAFFIC_STATE_LOW
    elif pressure >= high_threshold and distinct_buckets >= high_bucket_threshold:
        state = SPOTLIGHT_TRAFFIC_STATE_HIGH
    else:
        state = SPOTLIGHT_TRAFFIC_STATE_NORMAL
    return SpotlightTrafficClassification(
        traffic_state=state,
        viable_candidate_count=viable,
        distinct_source_bucket_count=distinct_buckets,
        requested_delivery_slots=slots,
        candidate_pressure_ratio=pressure,
        low_candidate_pressure_ratio=low_threshold,
        high_candidate_pressure_ratio=high_threshold,
        high_distinct_source_bucket_count=high_bucket_threshold,
    )


def schedule_spotlight_delivery_opportunities(
    db: Session,
    *,
    viewer_user_id: int,
    frequency_result: SpotlightFrequencyControlResult,
    requested_delivery_slots: int = SPOTLIGHT_DEFAULT_REQUESTED_DELIVERY_SLOTS,
    pacing_states: Optional[Iterable[SpotlightCampaignPacingState]] = None,
    default_max_delivery_rounds: int = SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
    default_delivery_window_policy: Optional[SpotlightDeliveryWindowPolicy] = None,
    low_candidate_pressure_ratio: float = SPOTLIGHT_TRAFFIC_LOW_CANDIDATE_PRESSURE_RATIO,
    high_candidate_pressure_ratio: float = SPOTLIGHT_TRAFFIC_HIGH_CANDIDATE_PRESSURE_RATIO,
    high_distinct_source_bucket_count: int = SPOTLIGHT_TRAFFIC_HIGH_DISTINCT_SOURCE_BUCKETS,
    now: Optional[datetime] = None,
) -> SpotlightDeliveryPacingResult:
    current_time = _as_aware_utc(now) or _now_utc()
    slots = max(int(requested_delivery_slots), 0)
    candidate_list = list(frequency_result.candidates or ())
    source_buckets = {
        int(candidate.campaign_id): source_bucket_for_candidate(candidate)
        for candidate in candidate_list
    }
    traffic = classify_spotlight_traffic_state(
        viable_candidate_count=len(candidate_list),
        distinct_source_bucket_count=len(set(source_buckets.values())),
        requested_delivery_slots=max(slots, 1),
        low_candidate_pressure_ratio=low_candidate_pressure_ratio,
        high_candidate_pressure_ratio=high_candidate_pressure_ratio,
        high_distinct_source_bucket_count=high_distinct_source_bucket_count,
    )
    campaign_ids = [int(candidate.campaign_id) for candidate in candidate_list]
    campaigns = _campaigns_by_id(db, campaign_ids)
    state_by_campaign = {
        int(state.campaign_id): state
        for state in pacing_states or []
        if int(state.campaign_id or 0) > 0
    }

    preliminary: list[dict[str, Any]] = []
    default_policy = default_delivery_window_policy or SpotlightDeliveryWindowPolicy()
    for original_rank, candidate in enumerate(candidate_list):
        campaign_id = int(candidate.campaign_id)
        campaign = campaigns.get(campaign_id)
        state = state_by_campaign.get(campaign_id, SpotlightCampaignPacingState(campaign_id=campaign_id))
        max_rounds = max(int(state.max_delivery_rounds if state.max_delivery_rounds is not None else default_max_delivery_rounds), 0)
        consumed_before = max(int(state.consumed_rounds), 0)
        remaining_before = max(max_rounds - consumed_before, 0)
        policy = state.delivery_window_policy or default_policy
        window = evaluate_spotlight_delivery_window(now=current_time, policy=policy)
        activated_at = _as_aware_utc(getattr(campaign, "activated_at", None)) if campaign is not None else None
        created_at = _as_aware_utc(getattr(campaign, "created_at", None)) if campaign is not None else None
        expires_at = _as_aware_utc(getattr(campaign, "expires_at", None)) if campaign is not None else None
        status = str(getattr(campaign, "status", "") or "") if campaign is not None else ""
        active_start = activated_at or created_at or current_time
        persisted_next_eligible = _as_aware_utc(state.next_eligible_delivery_at)
        next_eligible = persisted_next_eligible or next_eligible_delivery_time(
            activated_at=active_start,
            expires_at=expires_at,
            max_delivery_rounds=max_rounds,
            consumed_rounds=consumed_before,
        )
        exhausted = consumed_before >= max_rounds
        blocked_reason: Optional[str] = None
        pacing_eligible = True
        if campaign is None:
            pacing_eligible = False
            blocked_reason = SPOTLIGHT_PACING_REASON_CAMPAIGN_MISSING
        elif status != "active":
            pacing_eligible = False
            blocked_reason = SPOTLIGHT_PACING_REASON_CAMPAIGN_NOT_ACTIVE
        elif expires_at is not None and current_time >= expires_at:
            pacing_eligible = False
            blocked_reason = SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED
        elif exhausted:
            pacing_eligible = False
            blocked_reason = SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED
        elif not window.active:
            pacing_eligible = False
            blocked_reason = SPOTLIGHT_PACING_REASON_QUIET_WINDOW
        elif next_eligible is not None and current_time < next_eligible:
            pacing_eligible = False
            blocked_reason = SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE
        preliminary.append(
            {
                "candidate": candidate,
                "campaign_id": campaign_id,
                "original_rank": original_rank,
                "source_bucket": source_buckets.get(campaign_id, "unknown_source"),
                "state": state,
                "max_rounds": max_rounds,
                "consumed_before": consumed_before,
                "remaining_before": remaining_before,
                "window": window,
                "activated_at": active_start,
                "expires_at": expires_at,
                "next_eligible": next_eligible,
                "exhausted": exhausted,
                "pacing_eligible": pacing_eligible,
                "blocked_reason": blocked_reason,
            }
        )

    selected_ids = {
        int(row["campaign_id"])
        for row in [row for row in preliminary if bool(row["pacing_eligible"])][:slots]
    }
    decisions: list[SpotlightCandidatePacingDecision] = []
    pacing_rank = 0
    for row in preliminary:
        candidate = row["candidate"]
        campaign_id = int(row["campaign_id"])
        scheduled = campaign_id in selected_ids
        blocked_reason = row["blocked_reason"]
        if bool(row["pacing_eligible"]) and not scheduled:
            blocked_reason = SPOTLIGHT_PACING_REASON_SLOT_COMPETITION
        consumed_before = int(row["consumed_before"])
        consumed_after = (
            _scheduled_consumed_rounds_after_opportunity(
                consumed_before=consumed_before,
                now=current_time,
                policy=row["window"].policy,
            )
            if scheduled
            else consumed_before
        )
        consumed_after = min(consumed_after, int(row["max_rounds"]))
        max_rounds = int(row["max_rounds"])
        remaining_after = max(max_rounds - consumed_after, 0)
        next_after = (
            _scheduled_next_eligible_time(
                consumed_rounds=consumed_after,
                policy=row["window"].policy,
            )
            or next_eligible_delivery_time(
                activated_at=row["activated_at"],
                expires_at=row["expires_at"],
                max_delivery_rounds=max_rounds,
                consumed_rounds=consumed_after,
            )
            if scheduled
            else row["next_eligible"]
        )
        rank = pacing_rank if scheduled else None
        if scheduled:
            pacing_rank += 1
        decisions.append(
            SpotlightCandidatePacingDecision(
                campaign_id=campaign_id,
                original_rank=int(row["original_rank"]),
                pacing_rank=rank,
                priority_band=candidate.priority_band,
                priority_rank=int(candidate.priority_rank),
                source_bucket=str(row["source_bucket"]),
                traffic_state=traffic.traffic_state,
                scheduled=scheduled,
                delivery_opportunity_created=scheduled,
                delivery_round_consumed=scheduled,
                consumed_rounds_before=consumed_before,
                consumed_rounds_after=consumed_after,
                max_delivery_rounds=max_rounds,
                rounds_remaining_before=int(row["remaining_before"]),
                rounds_remaining_after=remaining_after,
                next_eligible_delivery_time=row["next_eligible"],
                next_eligible_after_admission=next_after,
                campaign_activated_at=row["activated_at"],
                campaign_expires_at=row["expires_at"],
                exhausted=bool(row["exhausted"]) or remaining_after <= 0,
                delivery_window=row["window"],
                blocked_reason=blocked_reason,
                pacing_profile=str(row["state"].pacing_profile or SPOTLIGHT_PACING_PROFILE_NEUTRAL),
            )
        )

    scheduled_decisions = tuple(decision for decision in decisions if decision.scheduled)
    return SpotlightDeliveryPacingResult(
        viewer_user_id=int(viewer_user_id or 0),
        candidates=tuple(decision_candidate for decision_candidate in candidate_list if int(decision_candidate.campaign_id) in selected_ids),
        delivery_opportunities=scheduled_decisions,
        candidate_pacing=tuple(decisions),
        traffic=traffic,
        requested_delivery_slots=slots,
        unused_delivery_slots=max(slots - len(scheduled_decisions), 0),
        scheduled_campaign_ids=tuple(decision.campaign_id for decision in scheduled_decisions),
        blocked_campaign_ids=tuple(decision.campaign_id for decision in decisions if not decision.scheduled),
        exhausted_campaign_ids=tuple(
            decision.campaign_id
            for decision in decisions
            if decision.blocked_reason == SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED
        ),
        frequency_result=frequency_result,
    )


def evaluate_spotlight_delivery_window(
    *,
    now: datetime,
    policy: Optional[SpotlightDeliveryWindowPolicy] = None,
) -> SpotlightDeliveryWindowEvaluation:
    current_time = _as_aware_utc(now) or _now_utc()
    safe_policy = policy or SpotlightDeliveryWindowPolicy()
    schedule_start = _as_aware_utc(safe_policy.schedule_starts_at)
    schedule_end = _as_aware_utc(safe_policy.schedule_ends_at)
    if schedule_start is not None or schedule_end is not None:
        active = bool(
            schedule_start is not None
            and schedule_end is not None
            and schedule_start <= current_time < schedule_end
        )
        return SpotlightDeliveryWindowEvaluation(
            active=active,
            quiet=not active,
            always_active_fallback=False,
            timezone_mode="absolute_scheduled_window",
            local_minute=None,
            policy=safe_policy,
        )
    if safe_policy.active_start_minute is None or safe_policy.active_end_minute is None:
        return SpotlightDeliveryWindowEvaluation(
            active=True,
            quiet=False,
            always_active_fallback=True,
            timezone_mode="always_active_no_window",
            local_minute=None,
            policy=safe_policy,
        )
    local_time, timezone_mode = _local_time_for_policy(current_time, safe_policy)
    if timezone_mode == "neutral_default_unknown_timezone":
        return SpotlightDeliveryWindowEvaluation(
            active=True,
            quiet=False,
            always_active_fallback=True,
            timezone_mode=timezone_mode,
            local_minute=None,
            policy=safe_policy,
        )
    local_minute = (local_time.hour * 60) + local_time.minute
    start = _clamp_day_minute(safe_policy.active_start_minute)
    end = _clamp_day_minute(safe_policy.active_end_minute)
    if start == end:
        active = True
    elif start < end:
        active = start <= local_minute < end
    else:
        active = local_minute >= start or local_minute < end
    return SpotlightDeliveryWindowEvaluation(
        active=active,
        quiet=not active,
        always_active_fallback=False,
        timezone_mode=timezone_mode,
        local_minute=local_minute,
        policy=safe_policy,
    )


def next_eligible_delivery_time(
    *,
    activated_at: datetime,
    expires_at: Optional[datetime],
    max_delivery_rounds: int = SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
    consumed_rounds: int = 0,
) -> Optional[datetime]:
    max_rounds = max(int(max_delivery_rounds), 0)
    consumed = max(int(consumed_rounds), 0)
    active_start = _as_aware_utc(activated_at) or _now_utc()
    if max_rounds <= 0 or consumed >= max_rounds:
        return None
    expiry = _as_aware_utc(expires_at)
    if expiry is not None and expiry <= active_start:
        return expiry
    if expiry is None:
        interval = timedelta(minutes=SPOTLIGHT_DEFAULT_ROUND_INTERVAL_MINUTES)
    else:
        interval = (expiry - active_start) / max_rounds
    return active_start + (interval * consumed)


def _scheduled_consumed_rounds_after_opportunity(
    *,
    consumed_before: int,
    now: datetime,
    policy: SpotlightDeliveryWindowPolicy,
) -> int:
    starts_at = _as_aware_utc(policy.schedule_starts_at)
    interval_minutes = int(policy.interval_minutes or 0)
    current_time = _as_aware_utc(now) or _now_utc()
    if starts_at is None or interval_minutes <= 0 or current_time < starts_at:
        return int(consumed_before) + 1
    elapsed_seconds = max((current_time - starts_at).total_seconds(), 0.0)
    current_slot_index = int(elapsed_seconds // (interval_minutes * 60))
    return max(int(consumed_before) + 1, current_slot_index + 1)


def _scheduled_next_eligible_time(
    *,
    consumed_rounds: int,
    policy: SpotlightDeliveryWindowPolicy,
) -> Optional[datetime]:
    starts_at = _as_aware_utc(policy.schedule_starts_at)
    ends_at = _as_aware_utc(policy.schedule_ends_at)
    interval_minutes = int(policy.interval_minutes or 0)
    if starts_at is None or ends_at is None or interval_minutes <= 0:
        return None
    candidate = starts_at + timedelta(minutes=interval_minutes * max(int(consumed_rounds), 0))
    return candidate if candidate < ends_at else None


def _campaigns_by_id(db: Session, campaign_ids: Iterable[int]) -> dict[int, SpotlightCampaign]:
    safe_ids = []
    seen: set[int] = set()
    for value in campaign_ids or []:
        campaign_id = int(value or 0)
        if campaign_id <= 0 or campaign_id in seen:
            continue
        seen.add(campaign_id)
        safe_ids.append(campaign_id)
    if not safe_ids:
        return {}
    rows = db.query(SpotlightCampaign).filter(SpotlightCampaign.id.in_(safe_ids)).all()
    return {int(row.id): row for row in rows}


def _local_time_for_policy(now: datetime, policy: SpotlightDeliveryWindowPolicy) -> tuple[datetime, str]:
    if policy.timezone_identifier:
        try:
            return now.astimezone(ZoneInfo(str(policy.timezone_identifier))), "timezone_identifier"
        except ZoneInfoNotFoundError:
            return now, "neutral_default_unknown_timezone"
    if policy.utc_offset_minutes is not None:
        offset = timedelta(minutes=int(policy.utc_offset_minutes))
        return (now + offset), "explicit_utc_offset"
    return now, "utc_default"


def _clamp_day_minute(value: int) -> int:
    return max(0, min(int(value), (24 * 60) - 1))


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
