from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.security import create_access_token
from app.db.database import SessionLocal, engine
from app.services.spotlight_delivery_pacing_service import (
    SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
    SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED,
    SPOTLIGHT_PACING_REASON_QUIET_WINDOW,
    SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED,
    SPOTLIGHT_PACING_REASON_SLOT_COMPETITION,
    SPOTLIGHT_PACING_PROFILE_NEUTRAL,
    SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK,
    SPOTLIGHT_PACING_SUPPORTED_PROFILE_HOOKS,
    SPOTLIGHT_TRAFFIC_STATE_HIGH,
    SPOTLIGHT_TRAFFIC_STATE_LOW,
    SPOTLIGHT_TRAFFIC_STATE_NORMAL,
    SpotlightCampaignPacingState,
    SpotlightDeliveryWindowPolicy,
    classify_spotlight_traffic_state,
    next_eligible_delivery_time,
    schedule_spotlight_delivery_opportunities,
)
from app.services.spotlight_exposure_diversity_allocation_service import allocate_spotlight_opportunity_candidates
from app.services.spotlight_exposure_ledger_service import (
    SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
    SPOTLIGHT_EXPOSURE_EVENT_SERVED,
)
from app.services.spotlight_frequency_control_service import (
    SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP,
    apply_spotlight_frequency_control,
)
from app.services.spotlight_member_interest_service import serialize_spotlight_interests
from app.services.spotlight_opportunity_candidate_service import (
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH,
    build_spotlight_opportunity_candidates,
)
from app.services.spotlight_opportunity_eligibility_service import (
    SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
    evaluate_spotlight_eligibility_batch,
)

BASE_TIME = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)


def _fingerprint(campaign_id: int) -> str:
    return f"{int(campaign_id):064d}"[-64:]


def _seed_users_and_clans(*, user_count: int = 80, clan_count: int = 20) -> None:
    with engine.begin() as conn:
        for user_id in range(1, user_count + 1):
            conn.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, role, gmfn_id,
                        display_name, trust_score, trust_band, trust_score_updated_at
                    ) VALUES (
                        :id, :email, 'hashed', 'member', :gmfn_id,
                        :display_name, :trust_score, :trust_band, CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "id": user_id,
                    "email": f"phase4d-user-{user_id}@example.com",
                    "gmfn_id": f"GSN-P4D-{user_id:04d}",
                    "display_name": f"Phase 4D User {user_id}",
                    "trust_score": 99 if user_id % 2 else 1,
                    "trust_band": "A" if user_id % 2 else "D",
                },
            )
        for clan_id in range(1, clan_count + 1):
            conn.execute(
                text(
                    """
                    INSERT INTO clans (
                        id, name, marketplace_name, community_code, status,
                        invite_code, invite_uses, created_at
                    ) VALUES (
                        :id, :name, :marketplace_name, :community_code, 'active',
                        :invite_code, 0, CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "id": clan_id,
                    "name": f"Phase 4D Community {clan_id}",
                    "marketplace_name": f"Phase 4D Market {clan_id}",
                    "community_code": f"GMFN-P4D-{clan_id:04d}",
                    "invite_code": f"P4D-{clan_id:04d}",
                },
            )


def _seed_memberships(rows: list[tuple[int, int, int]]) -> None:
    with engine.begin() as conn:
        for row_id, clan_id, user_id in rows:
            conn.execute(
                text(
                    """
                    INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                    VALUES (:id, :clan_id, :user_id, 'member', 0)
                    """
                ),
                {"id": row_id, "clan_id": clan_id, "user_id": user_id},
            )


def _seed_campaign(
    *,
    campaign_id: int,
    owner_user_id: int,
    origin_clan_id: int,
    status: str = "active",
    commercial_mode: str = "free",
    opportunity_category: str = "event",
    opportunity_subcategory: str | None = "choir",
    activated_offset_minutes: int = 0,
    expires_offset_days: int = 2,
) -> None:
    activated_at = BASE_TIME + timedelta(minutes=activated_offset_minutes)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, shop_id, origin_clan_id, source_product_id,
                    content_kind, content_fingerprint, status, source_kind,
                    commercial_mode, distribution_scope, opportunity_intent,
                    opportunity_category, opportunity_subcategory,
                    opportunity_geo_scope, opportunity_availability,
                    created_at, activated_at, expires_at
                ) VALUES (
                    :id, :owner_user_id, NULL, :origin_clan_id, NULL,
                    'broadcast_snapshot', :fingerprint, :status, 'direct_broadcast',
                    :commercial_mode, 'direct_communities', 'offer',
                    :opportunity_category, :opportunity_subcategory,
                    'community', 'available',
                    :activated_at, :activated_at, :expires_at
                )
                """
            ),
            {
                "id": campaign_id,
                "owner_user_id": owner_user_id,
                "origin_clan_id": origin_clan_id,
                "fingerprint": _fingerprint(campaign_id),
                "status": status,
                "commercial_mode": commercial_mode,
                "opportunity_category": opportunity_category,
                "opportunity_subcategory": opportunity_subcategory,
                "activated_at": activated_at,
                "expires_at": activated_at + timedelta(days=expires_offset_days),
            },
        )


def _seed_placement(*, broadcast_id: int, campaign_id: int | None, clan_id: int, author_user_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :id, :campaign_id, :clan_id, :author_user_id, 'Phase 4D placement',
                    'free', 'marketplace_repost', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": broadcast_id,
                "campaign_id": campaign_id,
                "clan_id": clan_id,
                "author_user_id": author_user_id,
                "expires_at": BASE_TIME + timedelta(days=2),
            },
        )


def _seed_demand(*, demand_id: int = 1, user_id: int = 1, clan_id: int = 1, category: str = "plumber") -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                ) VALUES (
                    :id, :clan_id, :user_id, 'Need plumber', 'Need plumber', :category, 'medium',
                    'Aberdeen', 'cash', 0, 'open', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {"id": demand_id, "clan_id": clan_id, "user_id": user_id, "category": category, "expires_at": BASE_TIME + timedelta(days=2)},
        )


def _seed_spotlight_interests(*, user_id: int = 1, interests: list[str] | None = None) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO user_settings (user_id, spotlight_interests_json) VALUES (:user_id, :interests_json)"),
            {"user_id": user_id, "interests_json": serialize_spotlight_interests(interests or [])},
        )


def _seed_exposures(
    *,
    campaign_id: int,
    count: int,
    viewer_user_id: int = 1,
    event_type: str = SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
    source_id: int = 1,
    start_offset_minutes: int = 0,
) -> None:
    with engine.begin() as conn:
        for index in range(count):
            event_at = BASE_TIME + timedelta(minutes=start_offset_minutes + index)
            conn.execute(
                text(
                    """
                    INSERT INTO spotlight_exposure_events (
                        event_type, viewer_user_id, campaign_id, event_at,
                        allocation_route_type, allocation_source_kind, allocation_source_id,
                        allocation_route_clan_id, idempotency_key, presentation_surface,
                        supporting_routes_json, relevance_signals_json, presentation_context_json, created_at
                    ) VALUES (
                        :event_type, :viewer_user_id, :campaign_id, :event_at,
                        :route_type, 'test_source', :source_id,
                        :source_id, :idempotency_key, 'phase4d-test',
                        '[]', '{}', '{}', :event_at
                    )
                    """
                ),
                {
                    "event_type": event_type,
                    "viewer_user_id": viewer_user_id,
                    "campaign_id": campaign_id,
                    "event_at": event_at,
                    "route_type": SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
                    "source_id": source_id,
                    "idempotency_key": f"p4d-{event_type}-{viewer_user_id}-{campaign_id}-{source_id}-{start_offset_minutes}-{index}",
                },
            )


def _basic_setup(*, campaign_count: int = 4, commercial_mode_2: str = "free") -> None:
    _seed_users_and_clans()
    memberships = [(1, 1, 1), (2, 1, 2), (3, 2, 1), (4, 2, 3), (5, 3, 1), (6, 3, 4), (7, 4, 1), (8, 4, 5)]
    _seed_memberships(memberships)
    for campaign_id in range(1, campaign_count + 1):
        _seed_campaign(
            campaign_id=campaign_id,
            owner_user_id=campaign_id + 1,
            origin_clan_id=campaign_id,
            commercial_mode=(commercial_mode_2 if campaign_id == 2 else "free"),
            activated_offset_minutes=20 - campaign_id,
        )


def _frequency_result(
    campaign_ids: list[int],
    *,
    viewer_user_id: int = 1,
    candidate_now=BASE_TIME + timedelta(hours=1),
    **frequency_kwargs,
):
    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(
            db,
            viewer_user_id=viewer_user_id,
            campaign_ids=campaign_ids,
            now=candidate_now,
        )
        diversity = allocate_spotlight_opportunity_candidates(db, viewer_user_id=viewer_user_id, candidates=candidates)
        return apply_spotlight_frequency_control(db, viewer_user_id=viewer_user_id, diversity_result=diversity, **frequency_kwargs)


def _pacing_result(campaign_ids: list[int], *, viewer_user_id: int = 1, requested_delivery_slots: int = 1, pacing_states=None, now=BASE_TIME + timedelta(hours=1), **frequency_kwargs):
    frequency = _frequency_result(
        campaign_ids,
        viewer_user_id=viewer_user_id,
        candidate_now=now,
        **frequency_kwargs,
    )
    with SessionLocal() as db:
        return schedule_spotlight_delivery_opportunities(
            db,
            viewer_user_id=viewer_user_id,
            frequency_result=frequency,
            requested_delivery_slots=requested_delivery_slots,
            pacing_states=pacing_states,
            now=now,
        )


def _decision(result, campaign_id: int):
    return {row.campaign_id: row for row in result.candidate_pacing}[campaign_id]


def _ledger_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM spotlight_exposure_events")).scalar_one())


def test_traffic_classifier_low_normal_high_and_configurable_thresholds():
    low = classify_spotlight_traffic_state(viable_candidate_count=1, distinct_source_bucket_count=1, requested_delivery_slots=3)
    normal = classify_spotlight_traffic_state(viable_candidate_count=2, distinct_source_bucket_count=2, requested_delivery_slots=1)
    high = classify_spotlight_traffic_state(viable_candidate_count=3, distinct_source_bucket_count=3, requested_delivery_slots=1, high_candidate_pressure_ratio=3)
    configurable = classify_spotlight_traffic_state(viable_candidate_count=2, distinct_source_bucket_count=2, requested_delivery_slots=1, high_candidate_pressure_ratio=2, high_distinct_source_bucket_count=2)

    assert low.traffic_state == SPOTLIGHT_TRAFFIC_STATE_LOW
    assert normal.traffic_state == SPOTLIGHT_TRAFFIC_STATE_NORMAL
    assert high.traffic_state == SPOTLIGHT_TRAFFIC_STATE_HIGH
    assert configurable.traffic_state == SPOTLIGHT_TRAFFIC_STATE_HIGH
    assert configurable.high_candidate_pressure_ratio == 2


def test_low_traffic_does_not_force_irrelevant_replacement_and_leaves_capacity_unused():
    _basic_setup(campaign_count=1)

    result = _pacing_result([1], requested_delivery_slots=3)

    assert result.traffic.traffic_state == SPOTLIGHT_TRAFFIC_STATE_LOW
    assert result.scheduled_campaign_ids == (1,)
    assert result.unused_delivery_slots == 2
    assert len(result.delivery_opportunities) == 1


def test_normal_traffic_preserves_post_frequency_order():
    _basic_setup(campaign_count=2)
    frequency = _frequency_result([1, 2])

    with SessionLocal() as db:
        result = schedule_spotlight_delivery_opportunities(db, viewer_user_id=1, frequency_result=frequency, requested_delivery_slots=2, now=BASE_TIME + timedelta(hours=1))

    assert result.traffic.traffic_state == SPOTLIGHT_TRAFFIC_STATE_NORMAL
    assert result.scheduled_campaign_ids == frequency.candidate_order_after_frequency


def test_high_traffic_keeps_demandbox_precedence_without_paid_weighting():
    _basic_setup(campaign_count=4)
    _seed_demand(category="plumber")
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET opportunity_category = 'business_service', opportunity_subcategory = 'plumber', commercial_mode = 'free' WHERE id = 1"))
        conn.execute(text("UPDATE spotlight_campaigns SET commercial_mode = 'paid' WHERE id = 2"))

    result = _pacing_result([1, 2, 3, 4], requested_delivery_slots=1)

    assert result.traffic.traffic_state == SPOTLIGHT_TRAFFIC_STATE_HIGH
    assert result.scheduled_campaign_ids == (1,)
    assert result.delivery_opportunities[0].priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    assert "paid" not in json.dumps(result.to_internal_dict()).lower()


def test_high_traffic_consumes_diversity_output_not_raw_candidate_order():
    _basic_setup(campaign_count=4)
    _seed_exposures(campaign_id=99, count=40, source_id=1)

    result = _pacing_result([1, 2, 3, 4], requested_delivery_slots=1)

    assert result.traffic.traffic_state == SPOTLIGHT_TRAFFIC_STATE_HIGH
    assert result.frequency_result.diversity_result.diversity_pressure_applied is True
    assert result.scheduled_campaign_ids[0] != 1


def test_high_traffic_does_not_bypass_viewer_frequency_control():
    _basic_setup(campaign_count=4)
    _seed_exposures(campaign_id=1, count=2, viewer_user_id=1)

    result = _pacing_result([1, 2, 3, 4], requested_delivery_slots=1)

    assert 1 not in result.scheduled_campaign_ids
    frequency_meta = {row.campaign_id: row for row in result.frequency_result.candidate_frequency}
    assert frequency_meta[1].suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP


def test_delivery_round_count_is_campaign_level_not_per_viewer_or_impression_count():
    _basic_setup(campaign_count=1)
    _seed_memberships([(99, 1, 3)])
    _seed_campaign(campaign_id=99, owner_user_id=80, origin_clan_id=1)
    state = SpotlightCampaignPacingState(campaign_id=1, consumed_rounds=4)
    _seed_exposures(campaign_id=99, count=6, viewer_user_id=3)

    viewer_one = _pacing_result([1], viewer_user_id=1, pacing_states=[state])
    viewer_three = _pacing_result([1], viewer_user_id=3, pacing_states=[state])

    assert _decision(viewer_one, 1).consumed_rounds_before == 4
    assert _decision(viewer_three, 1).consumed_rounds_before == 4
    assert _decision(viewer_one, 1).consumed_rounds_before != _ledger_count()


def test_candidate_generation_eligibility_and_feed_fetch_do_not_consume_rounds(client):
    _basic_setup(campaign_count=1)
    _seed_placement(broadcast_id=10, campaign_id=1, clan_id=1, author_user_id=2)
    state = SpotlightCampaignPacingState(campaign_id=1, consumed_rounds=0)
    with SessionLocal() as db:
        assert build_spotlight_opportunity_candidates(
            db, viewer_user_id=1, campaign_ids=[1], now=BASE_TIME + timedelta(hours=1)
        )
        assert evaluate_spotlight_eligibility_batch(
            db,
            viewer_user_id=1,
            campaign_ids=[1],
            now=BASE_TIME + timedelta(hours=1),
        )[0].eligible is True
    os.environ["GMFN_SECRET_KEY"] = "phase4d-test-secret"
    token = create_access_token({"sub": "phase4d-user-1@example.com"})
    feed = client.get("/marketplace/broadcasts?clan_id=1&active_only=true", headers={"Authorization": f"Bearer {token}"})
    assert feed.status_code == 200, feed.text

    result = _pacing_result([1], pacing_states=[state])

    assert _decision(result, 1).consumed_rounds_before == 0
    assert _decision(result, 1).delivery_round_consumed is True


def test_quiet_period_does_not_consume_round_and_preserves_remaining_rounds():
    _basic_setup(campaign_count=1)
    quiet_policy = SpotlightDeliveryWindowPolicy(active_start_minute=9 * 60, active_end_minute=17 * 60, utc_offset_minutes=0)
    state = SpotlightCampaignPacingState(campaign_id=1, consumed_rounds=2, delivery_window_policy=quiet_policy)

    result = _pacing_result([1], pacing_states=[state], now=BASE_TIME.replace(hour=20))
    decision = _decision(result, 1)

    assert decision.scheduled is False
    assert decision.blocked_reason == SPOTLIGHT_PACING_REASON_QUIET_WINDOW
    assert decision.consumed_rounds_after == 2
    assert decision.rounds_remaining_after == SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS - 2
    assert result.unused_delivery_slots == 1


def test_valid_delivery_opportunity_consumes_one_round_and_default_max_is_configurable():
    _basic_setup(campaign_count=1)
    state = SpotlightCampaignPacingState(campaign_id=1, consumed_rounds=1, max_delivery_rounds=3)

    result = _pacing_result([1], pacing_states=[state], now=BASE_TIME + timedelta(days=1))
    decision = _decision(result, 1)

    assert decision.delivery_opportunity_created is True
    assert decision.delivery_round_consumed is True
    assert decision.max_delivery_rounds == 3
    assert decision.consumed_rounds_before == 1
    assert decision.consumed_rounds_after == 2
    assert decision.rounds_remaining_after == 1


def test_timed_delivery_plan_stays_anchored_when_an_earlier_slot_was_unfilled():
    _basic_setup(campaign_count=1)
    starts_at = BASE_TIME + timedelta(minutes=10)
    policy = SpotlightDeliveryWindowPolicy(
        policy_name=SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK,
        schedule_starts_at=starts_at,
        schedule_ends_at=starts_at + timedelta(minutes=60),
        interval_minutes=20,
        timezone_label='Africa/Lagos',
    )
    state = SpotlightCampaignPacingState(
        campaign_id=1,
        consumed_rounds=0,
        max_delivery_rounds=3,
        next_eligible_delivery_at=starts_at,
        delivery_window_policy=policy,
        pacing_profile=SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK,
    )

    result = _pacing_result(
        [1],
        pacing_states=[state],
        now=starts_at + timedelta(minutes=45),
    )
    decision = _decision(result, 1)

    assert decision.scheduled is True
    assert decision.consumed_rounds_before == 0
    assert decision.consumed_rounds_after == 3
    assert decision.rounds_remaining_after == 0
    assert decision.next_eligible_after_admission is None
    assert decision.delivery_window.timezone_mode == 'absolute_scheduled_window'


def test_timed_delivery_plan_is_quiet_before_and_after_its_absolute_window():
    _basic_setup(campaign_count=1)
    starts_at = BASE_TIME + timedelta(hours=2)
    ends_at = starts_at + timedelta(hours=1)
    policy = SpotlightDeliveryWindowPolicy(
        policy_name=SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK,
        schedule_starts_at=starts_at,
        schedule_ends_at=ends_at,
        interval_minutes=20,
    )
    state = SpotlightCampaignPacingState(
        campaign_id=1,
        consumed_rounds=0,
        max_delivery_rounds=3,
        next_eligible_delivery_at=starts_at,
        delivery_window_policy=policy,
        pacing_profile=SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK,
    )

    before = _pacing_result([1], pacing_states=[state], now=starts_at - timedelta(minutes=1))
    after = _pacing_result([1], pacing_states=[state], now=ends_at)

    assert _decision(before, 1).blocked_reason == SPOTLIGHT_PACING_REASON_QUIET_WINDOW
    assert _decision(after, 1).blocked_reason == SPOTLIGHT_PACING_REASON_QUIET_WINDOW
    assert before.scheduled_campaign_ids == ()
    assert after.scheduled_campaign_ids == ()


def test_ten_rounds_exhaust_pacing_without_deleting_or_mutating_campaign_identity():
    _basic_setup(campaign_count=1)
    with engine.begin() as conn:
        original = conn.execute(text("SELECT content_fingerprint, status FROM spotlight_campaigns WHERE id = 1")).one()
    exhausted_state = SpotlightCampaignPacingState(campaign_id=1, consumed_rounds=SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS)

    result = _pacing_result([1], pacing_states=[exhausted_state])
    decision = _decision(result, 1)

    assert decision.scheduled is False
    assert decision.blocked_reason == SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED
    assert result.exhausted_campaign_ids == (1,)
    with engine.begin() as conn:
        after = conn.execute(text("SELECT content_fingerprint, status FROM spotlight_campaigns WHERE id = 1")).one()
    assert tuple(after) == tuple(original)


def test_round_exhaustion_is_not_global_impression_cap_and_viewer_campaign_caps_remain_separate():
    _basic_setup(campaign_count=2)
    _seed_memberships([(99, 1, 3)])
    _seed_campaign(campaign_id=99, owner_user_id=80, origin_clan_id=1)
    _seed_exposures(campaign_id=99, count=15, viewer_user_id=3)
    _seed_exposures(campaign_id=1, count=2, viewer_user_id=1)

    no_global_cap = _pacing_result([1], viewer_user_id=3, pacing_states=[SpotlightCampaignPacingState(campaign_id=1, consumed_rounds=0)])
    viewer_capped = _pacing_result([1, 2], viewer_user_id=1)
    campaign_cap = _frequency_result([2], campaign_qualifying_impression_cap=0)

    assert _decision(no_global_cap, 1).scheduled is True
    assert 1 not in viewer_capped.scheduled_campaign_ids
    assert campaign_cap.candidate_order_after_frequency == ()


def test_delivery_opportunities_are_spread_across_campaign_lifetime_with_deterministic_next_time():
    activated = BASE_TIME
    expires = BASE_TIME + timedelta(hours=10)

    first = next_eligible_delivery_time(activated_at=activated, expires_at=expires, max_delivery_rounds=10, consumed_rounds=0)
    fifth = next_eligible_delivery_time(activated_at=activated, expires_at=expires, max_delivery_rounds=10, consumed_rounds=5)

    assert first == activated
    assert fifth == BASE_TIME + timedelta(hours=5)

    _basic_setup(campaign_count=1)
    state = SpotlightCampaignPacingState(campaign_id=1, consumed_rounds=1, max_delivery_rounds=10)
    too_early = _pacing_result([1], pacing_states=[state], now=BASE_TIME + timedelta(minutes=30))
    assert _decision(too_early, 1).scheduled is False


def test_campaign_expiry_ends_future_pacing_opportunities():
    _basic_setup(campaign_count=1)
    frequency = _frequency_result([1])
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET expires_at = :expires_at WHERE id = 1"), {"expires_at": BASE_TIME - timedelta(minutes=1)})
    with SessionLocal() as db:
        result = schedule_spotlight_delivery_opportunities(db, viewer_user_id=1, frequency_result=frequency, now=BASE_TIME)

    assert _decision(result, 1).blocked_reason == SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED
    assert result.scheduled_campaign_ids == ()


def test_unknown_timezone_uses_neutral_default_without_precise_location_inference():
    _basic_setup(campaign_count=1)
    policy = SpotlightDeliveryWindowPolicy(active_start_minute=9 * 60, active_end_minute=17 * 60, timezone_identifier="Not/A-Real-Zone")
    state = SpotlightCampaignPacingState(campaign_id=1, delivery_window_policy=policy)

    result = _pacing_result([1], pacing_states=[state], now=BASE_TIME + timedelta(hours=1))
    decision = _decision(result, 1)

    assert decision.scheduled is True
    assert decision.delivery_window.always_active_fallback is True
    assert decision.delivery_window.timezone_mode == "neutral_default_unknown_timezone"
    assert decision.delivery_window.local_minute is None
    assert "precise_location" not in json.dumps(result.to_internal_dict()).lower()


def test_paid_status_and_interest_relevance_do_not_change_round_budget_or_profile():
    _basic_setup(campaign_count=2, commercial_mode_2="paid")
    _seed_spotlight_interests(user_id=1, interests=["property"])
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET opportunity_category = 'property' WHERE id = 2"))

    result = _pacing_result([2], pacing_states=[SpotlightCampaignPacingState(campaign_id=2, consumed_rounds=8)])
    decision = _decision(result, 2)

    assert decision.max_delivery_rounds == SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS
    assert decision.pacing_profile == SPOTLIGHT_PACING_PROFILE_NEUTRAL
    assert SPOTLIGHT_PACING_FUTURE_PROFILE_PEAK in SPOTLIGHT_PACING_SUPPORTED_PROFILE_HOOKS
    assert "paid" not in json.dumps(result.to_internal_dict()).lower()


def test_pacing_call_does_not_write_qualifying_impressions_or_count_served_events():
    _basic_setup(campaign_count=1)
    _seed_exposures(campaign_id=1, count=3, event_type=SPOTLIGHT_EXPOSURE_EVENT_SERVED)
    before = _ledger_count()

    result = _pacing_result([1])

    assert result.scheduled_campaign_ids == (1,)
    assert _ledger_count() == before


def test_unlinked_repost_and_legacy_preserved_remain_outside_canonical_pacing():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, status="legacy_preserved")
    _seed_placement(broadcast_id=99, campaign_id=None, clan_id=1, author_user_id=2)

    result = _pacing_result([1])

    assert result.candidate_pacing == ()
    assert result.scheduled_campaign_ids == ()


def test_high_traffic_campaigns_are_not_guaranteed_all_delivery_opportunities():
    _basic_setup(campaign_count=4)

    result = _pacing_result([1, 2, 3, 4], requested_delivery_slots=1)

    assert result.traffic.traffic_state == SPOTLIGHT_TRAFFIC_STATE_HIGH
    assert len(result.scheduled_campaign_ids) == 1
    assert any(row.blocked_reason == SPOTLIGHT_PACING_REASON_SLOT_COMPETITION for row in result.candidate_pacing if not row.scheduled)
