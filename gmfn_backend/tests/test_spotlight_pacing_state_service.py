from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.security import create_access_token
from app.db.database import SessionLocal, engine
from app.services.spotlight_delivery_pacing_service import (
    SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS,
    SPOTLIGHT_PACING_PROFILE_NEUTRAL,
    SPOTLIGHT_PACING_REASON_CAMPAIGN_EXPIRED,
    SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE,
    SPOTLIGHT_PACING_REASON_QUIET_WINDOW,
    SPOTLIGHT_PACING_REASON_ROUNDS_EXHAUSTED,
    SpotlightDeliveryWindowPolicy,
)
from app.services.spotlight_exposure_diversity_allocation_service import allocate_spotlight_opportunity_candidates
from app.services.spotlight_exposure_ledger_service import SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION
from app.services.spotlight_frequency_control_service import apply_spotlight_frequency_control
from app.services.spotlight_opportunity_candidate_service import build_spotlight_opportunity_candidates
from app.services.spotlight_opportunity_eligibility_service import evaluate_spotlight_eligibility_batch
from app.services.spotlight_pacing_state_service import (
    SPOTLIGHT_PACING_STATE_CONFLICT,
    consume_spotlight_delivery_round,
    get_or_create_spotlight_campaign_pacing_state,
    schedule_persistent_spotlight_delivery_opportunities,
)

BASE_TIME = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)


def _fingerprint(campaign_id: int) -> str:
    return f"{int(campaign_id):064d}"[-64:]


def _seed_users_and_clans(*, user_count: int = 80, clan_count: int = 8) -> None:
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
                        :display_name, 50, 'B', CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "id": user_id,
                    "email": f"phase4e1-user-{user_id}@example.com",
                    "gmfn_id": f"GSN-P4E1-{user_id:04d}",
                    "display_name": f"Phase 4E1 User {user_id}",
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
                    "name": f"Phase 4E1 Community {clan_id}",
                    "marketplace_name": f"Phase 4E1 Market {clan_id}",
                    "community_code": f"GMFN-P4E1-{clan_id:04d}",
                    "invite_code": f"P4E1-{clan_id:04d}",
                },
            )


def _seed_memberships(rows: list[tuple[int, int, int]]) -> None:
    with engine.begin() as conn:
        for row_id, clan_id, user_id in rows:
            conn.execute(
                text("INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance) VALUES (:id, :clan_id, :user_id, 'member', 0)"),
                {"id": row_id, "clan_id": clan_id, "user_id": user_id},
            )


def _seed_campaign(
    *,
    campaign_id: int,
    owner_user_id: int = 2,
    origin_clan_id: int = 1,
    status: str = "active",
    commercial_mode: str = "free",
    activated_at: datetime = BASE_TIME,
    expires_at: datetime | None = BASE_TIME + timedelta(hours=10),
) -> None:
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
                    'event', 'choir', 'community', 'available',
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
                "activated_at": activated_at,
                "expires_at": expires_at,
            },
        )


def _seed_placement(*, broadcast_id: int, campaign_id: int | None, clan_id: int = 1, author_user_id: int = 2) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :id, :campaign_id, :clan_id, :author_user_id, 'Phase 4E1 placement',
                    'free', 'marketplace_repost', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {"id": broadcast_id, "campaign_id": campaign_id, "clan_id": clan_id, "author_user_id": author_user_id, "expires_at": BASE_TIME + timedelta(days=2)},
        )


def _seed_exposures(*, campaign_id: int, count: int, viewer_user_id: int = 1) -> None:
    with engine.begin() as conn:
        for index in range(count):
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
                        'direct_shared_community', 'test', 1, 1, :key, 'phase4e1',
                        '[]', '{}', '{}', :event_at
                    )
                    """
                ),
                {
                    "event_type": SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
                    "viewer_user_id": viewer_user_id,
                    "campaign_id": campaign_id,
                    "event_at": BASE_TIME + timedelta(minutes=index),
                    "key": f"p4e1-{viewer_user_id}-{campaign_id}-{index}",
                },
            )


def _basic_setup(*, campaign_count: int = 1, commercial_mode: str = "free", expires_at: datetime | None = BASE_TIME + timedelta(hours=10)) -> None:
    _seed_users_and_clans()
    memberships = [(1, 1, 1)]
    for campaign_id in range(1, campaign_count + 1):
        memberships.append((campaign_id + 1, campaign_id, campaign_id + 1))
        if campaign_id != 1:
            memberships.append((campaign_id + 20, campaign_id, 1))
        _seed_campaign(
            campaign_id=campaign_id,
            owner_user_id=campaign_id + 1,
            origin_clan_id=campaign_id,
            commercial_mode=commercial_mode if campaign_id == 1 else "free",
            expires_at=expires_at,
        )
    _seed_memberships(memberships)


def _frequency_result(campaign_ids: list[int], *, viewer_user_id: int = 1, now: datetime = BASE_TIME, **kwargs):
    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=viewer_user_id, campaign_ids=campaign_ids, now=now)
        diversity = allocate_spotlight_opportunity_candidates(db, viewer_user_id=viewer_user_id, candidates=candidates)
        return apply_spotlight_frequency_control(db, viewer_user_id=viewer_user_id, diversity_result=diversity, **kwargs)


def _persistent_result(campaign_ids: list[int], *, now: datetime = BASE_TIME, requested_delivery_slots: int = 1, **kwargs):
    frequency = _frequency_result(campaign_ids, now=now, **kwargs)
    with SessionLocal() as db:
        result = schedule_persistent_spotlight_delivery_opportunities(
            db,
            viewer_user_id=1,
            frequency_result=frequency,
            requested_delivery_slots=requested_delivery_slots,
            now=now,
        )
        db.commit()
        return result


def _pacing_rows() -> list[tuple]:
    with engine.begin() as conn:
        return conn.execute(text("SELECT campaign_id, max_delivery_rounds, consumed_delivery_rounds, pacing_profile, exhausted, version FROM spotlight_campaign_pacing_states ORDER BY campaign_id")).fetchall()


def _ledger_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM spotlight_exposure_events")).scalar_one())


def _attention_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM marketplace_attention_events")).scalar_one())


def test_new_campaign_gets_one_idempotent_default_pacing_state():
    _basic_setup()
    with SessionLocal() as db:
        first = get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME)
        second = get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME)
        db.commit()

    rows = _pacing_rows()
    assert len(rows) == 1
    assert first.campaign_id == second.campaign_id == 1
    assert first.max_delivery_rounds == SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS
    assert first.consumed_delivery_rounds == 0
    assert first.pacing_profile == SPOTLIGHT_PACING_PROFILE_NEUTRAL


def test_multiple_placements_do_not_create_multiple_pacing_states():
    _basic_setup()
    _seed_placement(broadcast_id=10, campaign_id=1)
    _seed_placement(broadcast_id=11, campaign_id=1, clan_id=2)

    _persistent_result([1], now=BASE_TIME)

    assert len(_pacing_rows()) == 1


def test_successful_delivery_opportunity_consumes_and_persists_exactly_one_round():
    _basic_setup()

    result = _persistent_result([1], now=BASE_TIME)
    rows = _pacing_rows()

    assert result.consumed_campaign_ids == (1,)
    assert rows[0][2] == 1
    assert rows[0][5] == 1
    with SessionLocal() as db:
        snapshot = get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME)
    assert snapshot.consumed_delivery_rounds == 1
    assert snapshot.next_eligible_delivery_at == BASE_TIME + timedelta(hours=1)


def test_candidate_generation_eligibility_and_feed_read_do_not_consume(client):
    _basic_setup()
    _seed_placement(broadcast_id=12, campaign_id=1)
    with SessionLocal() as db:
        get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME)
        assert build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1])
        assert evaluate_spotlight_eligibility_batch(db, viewer_user_id=1, campaign_ids=[1])[0].eligible is True
        db.commit()
    os.environ["GMFN_SECRET_KEY"] = "phase4e1-test-secret"
    token = create_access_token({"sub": "phase4e1-user-1@example.com"})
    assert client.get("/marketplace/broadcasts?clan_id=1&active_only=true", headers={"Authorization": f"Bearer {token}"}).status_code == 200

    rows = _pacing_rows()
    assert rows[0][2] == 0


def test_quiet_window_and_not_yet_due_do_not_consume():
    _basic_setup()
    quiet_policy = SpotlightDeliveryWindowPolicy(active_start_minute=9 * 60, active_end_minute=17 * 60, utc_offset_minutes=0)
    with SessionLocal() as db:
        get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME, default_delivery_window_policy=quiet_policy)
        quiet = consume_spotlight_delivery_round(db, campaign_id=1, now=BASE_TIME + timedelta(minutes=30))
        due = consume_spotlight_delivery_round(db, campaign_id=1, now=BASE_TIME + timedelta(hours=1))
        not_due = consume_spotlight_delivery_round(db, campaign_id=1, now=BASE_TIME + timedelta(hours=1, minutes=30))
        db.commit()

    assert quiet.blocked_reason == SPOTLIGHT_PACING_REASON_QUIET_WINDOW
    assert due.consumed is True
    assert not_due.blocked_reason == SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE
    assert _pacing_rows()[0][2] == 1


def test_repeated_and_stale_concurrent_attempts_cannot_double_consume_same_round():
    _basic_setup()
    first = _persistent_result([1], now=BASE_TIME)
    second = _persistent_result([1], now=BASE_TIME)

    with SessionLocal() as db:
        stale = consume_spotlight_delivery_round(db, campaign_id=1, now=BASE_TIME + timedelta(hours=1), expected_version=0, expected_consumed_rounds=0)
        db.commit()

    assert first.consumed_campaign_ids == (1,)
    assert second.consumed_campaign_ids == ()
    assert stale.consumed is False
    assert stale.blocked_reason in {SPOTLIGHT_PACING_STATE_CONFLICT, SPOTLIGHT_PACING_REASON_NOT_YET_ELIGIBLE}
    assert _pacing_rows()[0][2] == 1


def test_ten_successful_rounds_exhaust_and_survive_requery():
    _basic_setup()
    for hour in range(SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS):
        result = _persistent_result([1], now=BASE_TIME + timedelta(hours=hour))
        assert result.consumed_campaign_ids == (1,)

    exhausted = _persistent_result([1], now=BASE_TIME + timedelta(hours=10))
    with SessionLocal() as db:
        snapshot = get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME + timedelta(hours=10))

    assert exhausted.consumed_campaign_ids == ()
    assert snapshot.exhausted is True
    assert snapshot.consumed_delivery_rounds == SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS


def test_expiry_blocks_consumption_without_extension_or_compression():
    _basic_setup(expires_at=BASE_TIME + timedelta(hours=2))
    _persistent_result([1], now=BASE_TIME)

    after_expiry = _persistent_result([1], now=BASE_TIME + timedelta(hours=3))
    with SessionLocal() as db:
        snapshot = get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME + timedelta(hours=3))

    assert after_expiry.consumed_campaign_ids == ()
    assert snapshot.consumed_delivery_rounds == 1
    assert snapshot.rounds_remaining == 9
    assert snapshot.expired_before_exhaustion is True


def test_no_expiry_campaign_uses_compatibility_hourly_fallback():
    _basic_setup(expires_at=None)

    _persistent_result([1], now=BASE_TIME)
    with SessionLocal() as db:
        snapshot = get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME)

    assert snapshot.next_eligible_delivery_at == BASE_TIME + timedelta(minutes=60)


def test_placement_and_route_changes_do_not_reset_pacing_state():
    _basic_setup()
    _persistent_result([1], now=BASE_TIME)
    _seed_placement(broadcast_id=20, campaign_id=1, clan_id=1)
    _seed_placement(broadcast_id=21, campaign_id=1, clan_id=2)
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET distribution_scope = 'community_domain' WHERE id = 1"))

    blocked = _persistent_result([1], now=BASE_TIME)

    assert blocked.consumed_campaign_ids == ()
    assert len(_pacing_rows()) == 1
    assert _pacing_rows()[0][2] == 1


def test_paid_status_does_not_increase_rounds():
    _basic_setup(commercial_mode="paid")

    _persistent_result([1], now=BASE_TIME)

    assert _pacing_rows()[0][1] == SPOTLIGHT_DEFAULT_MAX_DELIVERY_ROUNDS


def test_viewer_frequency_and_campaign_qualifying_quota_remain_separate():
    _basic_setup(campaign_count=2)
    _seed_exposures(campaign_id=1, count=2, viewer_user_id=1)
    with SessionLocal() as db:
        get_or_create_spotlight_campaign_pacing_state(db, campaign_id=1, now=BASE_TIME)
        db.commit()

    viewer_capped = _persistent_result([1, 2], now=BASE_TIME)
    quota_capped_frequency = _frequency_result([2], campaign_qualifying_impression_cap=0)

    assert 1 not in viewer_capped.consumed_campaign_ids
    assert quota_capped_frequency.candidate_order_after_frequency == ()
    assert _pacing_rows()[0][2] == 0


def test_pacing_persistence_writes_no_qualifying_impressions_or_attention_events():
    _basic_setup()
    ledger_before = _ledger_count()
    attention_before = _attention_count()

    _persistent_result([1], now=BASE_TIME)

    assert _ledger_count() == ledger_before
    assert _attention_count() == attention_before


def test_unlinked_repost_and_legacy_preserved_remain_outside_canonical_pacing():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, status="legacy_preserved")
    _seed_placement(broadcast_id=99, campaign_id=None)

    result = _persistent_result([1], now=BASE_TIME)

    assert result.consumed_campaign_ids == ()
    assert _pacing_rows() == []
