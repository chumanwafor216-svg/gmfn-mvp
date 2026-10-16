from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.spotlight_exposure_diversity_allocation_service import (
    SPOTLIGHT_DIVERSITY_EXEMPTION_DEMANDBOX_MATCH,
    SPOTLIGHT_DIVERSITY_FALLBACK_SPARSE_INVENTORY,
    SPOTLIGHT_DIVERSITY_RECENT_EXPOSURE_WINDOW,
    SPOTLIGHT_DIVERSITY_SOURCE_CONCENTRATION_THRESHOLD,
    SPOTLIGHT_DIVERSITY_WARMUP_IMPRESSION_THRESHOLD,
    allocate_spotlight_opportunity_candidates,
    source_bucket_for_candidate,
    source_bucket_for_route,
)
from app.services.spotlight_exposure_ledger_service import (
    SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
    SPOTLIGHT_EXPOSURE_EVENT_SERVED,
    derive_spotlight_exposure_attribution,
)
from app.services.spotlight_member_interest_service import serialize_spotlight_interests
from app.services.spotlight_opportunity_candidate_service import (
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH,
    build_spotlight_opportunity_candidates,
)
from app.services.spotlight_opportunity_eligibility_service import (
    SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT,
    SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
    SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
)

BASE_TIME = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc)


def _fingerprint(campaign_id: int) -> str:
    return f"{int(campaign_id):064d}"[-64:]


def _seed_users_and_clans(*, user_count: int = 80, clan_count: int = 12) -> None:
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
                    "email": f"phase4b-user-{user_id}@example.com",
                    "gmfn_id": f"GSN-P4B-{user_id:04d}",
                    "display_name": f"Phase 4B User {user_id}",
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
                    "name": f"Phase 4B Community {clan_id}",
                    "marketplace_name": f"Phase 4B Market {clan_id}",
                    "community_code": f"GMFN-P4B-{clan_id:04d}",
                    "invite_code": f"P4B-{clan_id:04d}",
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
    distribution_scope: str = "direct_communities",
    commercial_mode: str = "free",
    opportunity_category: str = "business_service",
    opportunity_subcategory: str | None = "plumber",
    activated_offset_minutes: int = 0,
) -> None:
    now = BASE_TIME + timedelta(minutes=activated_offset_minutes)
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
                    :commercial_mode, :distribution_scope, 'offer',
                    :opportunity_category, :opportunity_subcategory,
                    'community', 'available',
                    :created_at, :created_at, :expires_at
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
                "distribution_scope": distribution_scope,
                "opportunity_category": opportunity_category,
                "opportunity_subcategory": opportunity_subcategory,
                "created_at": now,
                "expires_at": now + timedelta(days=2),
            },
        )


def _seed_history_campaign() -> None:
    _seed_campaign(campaign_id=900, owner_user_id=80, origin_clan_id=12)


def _seed_demand(*, demand_id: int = 1, user_id: int = 1, clan_id: int = 1, category: str = "plumbing") -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                ) VALUES (
                    :id, :clan_id, :user_id, 'Need help', 'Need help', :category, 'medium',
                    'Aberdeen', 'cash', 0, 'open', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": demand_id,
                "clan_id": clan_id,
                "user_id": user_id,
                "category": category,
                "expires_at": BASE_TIME + timedelta(days=2),
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
                    :id, :campaign_id, :clan_id, :author_user_id, 'Phase 4B placement',
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


def _seed_domain(*, domain_id: int, root_clan_id: int, affiliate_clan_ids: list[int]) -> None:
    config = {"features": {"spotlight": "admin_only"}, "spotlight": {"cross_community_domain_eligibility": True}}
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, clan_id, status, verification_status,
                    created_at, updated_at
                ) VALUES (
                    :id, :domain_name, :display_name, 'ngo_project_network',
                    'ngo_project_network', 1, :root_clan_id, 'active', 'verified',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": domain_id,
                "domain_name": f"phase4b-domain-{domain_id}",
                "display_name": f"Phase 4B Domain {domain_id}",
                "root_clan_id": root_clan_id,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id, community_domain_id, policy_key, action_key, scope_type,
                    review_mode, required_role, status, policy_summary,
                    config_json, created_by_user_id, created_at, updated_at
                ) VALUES (
                    :policy_id, :domain_id, 'domain.feature_policy', 'domain.features.configure',
                    'domain', 'domain_admin_review', 'owner_admin', 'active',
                    'Phase 4B policy', :config_json, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"policy_id": domain_id + 1000, "domain_id": domain_id, "config_json": json.dumps(config)},
        )
        for index, affiliate_clan_id in enumerate(affiliate_clan_ids, start=1):
            conn.execute(
                text(
                    """
                    INSERT INTO community_domain_affiliations (
                        id, parent_clan_id, affiliate_clan_id, requested_by_user_id,
                        decided_by_user_id, status, request_note, decision_note,
                        created_at, updated_at, decided_at
                    ) VALUES (
                        :id, :root_clan_id, :affiliate_clan_id, 1,
                        1, 'approved', 'Request', 'Approved',
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    """
                ),
                {"id": (domain_id * 10) + index, "root_clan_id": root_clan_id, "affiliate_clan_id": affiliate_clan_id},
            )


def _seed_spotlight_interests(*, user_id: int = 1, interests: list[str] | None = None) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO user_settings (user_id, spotlight_interests_json)
                VALUES (:user_id, :interests_json)
                """
            ),
            {"user_id": user_id, "interests_json": serialize_spotlight_interests(interests or [])},
        )


def _seed_exposures(
    *,
    count: int,
    route_type: str,
    source_id: int,
    start_offset_minutes: int = 0,
    viewer_user_id: int = 1,
    campaign_id: int = 900,
    event_type: str = SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
    route_clan_id: int | None = None,
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
                        supporting_routes_json, relevance_signals_json, presentation_context_json,
                        created_at
                    ) VALUES (
                        :event_type, :viewer_user_id, :campaign_id, :event_at,
                        :route_type, 'test_source', :source_id,
                        :route_clan_id, :idempotency_key, 'phase4b-test',
                        '[]', '{}', '{}', :event_at
                    )
                    """
                ),
                {
                    "event_type": event_type,
                    "viewer_user_id": viewer_user_id,
                    "campaign_id": campaign_id,
                    "event_at": event_at,
                    "route_type": route_type,
                    "source_id": source_id,
                    "route_clan_id": route_clan_id or source_id,
                    "idempotency_key": f"p4b-{event_type}-{route_type}-{source_id}-{start_offset_minutes}-{index}",
                },
            )


def _direct_two_candidate_setup() -> None:
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 2, 1), (3, 1, 2), (4, 2, 3), (5, 12, 80)])
    _seed_history_campaign()
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, activated_offset_minutes=2)
    _seed_campaign(
        campaign_id=2,
        owner_user_id=3,
        origin_clan_id=2,
        opportunity_category="event",
        opportunity_subcategory="choir",
        activated_offset_minutes=1,
    )


def _candidates(campaign_ids: list[int]):
    with SessionLocal() as db:
        return build_spotlight_opportunity_candidates(
            db, viewer_user_id=1, campaign_ids=campaign_ids, now=BASE_TIME + timedelta(hours=1)
        )


def _allocate(campaign_ids: list[int]):
    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(
            db, viewer_user_id=1, campaign_ids=campaign_ids, now=BASE_TIME + timedelta(hours=1)
        )
        return allocate_spotlight_opportunity_candidates(db, viewer_user_id=1, candidates=candidates)


def _ledger_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM spotlight_exposure_events")).scalar_one())


def _attention_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM marketplace_attention_events")).scalar_one())


def test_zero_and_thirty_nine_impressions_remain_warmup_and_preserve_order():
    _direct_two_candidate_setup()

    zero = _allocate([2, 1])
    _seed_exposures(count=39, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    thirty_nine = _allocate([2, 1])

    assert zero.warmup_active is True
    assert zero.viewer_qualifying_impression_count == 0
    assert zero.candidate_order_before == zero.candidate_order_after == (1, 2)
    assert thirty_nine.warmup_active is True
    assert thirty_nine.viewer_qualifying_impression_count == 39
    assert thirty_nine.candidate_order_before == thirty_nine.candidate_order_after == (1, 2)


def test_forty_qualifying_impressions_activate_diversity_evaluation():
    _direct_two_candidate_setup()
    _seed_exposures(count=31, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=9, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=50)

    result = _allocate([1, 2])

    assert result.warmup_active is False
    assert result.warmup_complete is True
    assert result.viewer_qualifying_impression_count == SPOTLIGHT_DIVERSITY_WARMUP_IMPRESSION_THRESHOLD
    assert result.source_ratios["direct_community:1"] > SPOTLIGHT_DIVERSITY_SOURCE_CONCENTRATION_THRESHOLD


def test_only_qualifying_impressions_count_and_served_reserved_events_are_ignored():
    _direct_two_candidate_setup()
    _seed_exposures(count=39, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=40, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1, event_type=SPOTLIGHT_EXPOSURE_EVENT_SERVED, start_offset_minutes=100)

    result = _allocate([1, 2])

    assert result.warmup_active is True
    assert result.viewer_qualifying_impression_count == 39
    assert result.qualifying_history_count_used == 39


def test_last_n_rolling_window_is_respected_and_old_exposure_stops_affecting_allocation():
    _direct_two_candidate_setup()
    _seed_exposures(count=1, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1, start_offset_minutes=0)
    _seed_exposures(count=100, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=10)

    result = _allocate([1, 2])

    assert result.configured_window_size == SPOTLIGHT_DIVERSITY_RECENT_EXPOSURE_WINDOW
    assert result.viewer_qualifying_impression_count == 101
    assert result.qualifying_history_count_used == 100
    assert "direct_community:1" not in result.source_counts
    assert result.source_counts["direct_community:2"] == 100


def test_direct_community_source_buckets_group_by_clan_id():
    _direct_two_candidate_setup()
    _seed_exposures(count=24, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=16, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=40)

    result = _allocate([1, 2])

    assert result.source_counts == {"direct_community:2": 16, "direct_community:1": 24}
    assert result.source_ratios["direct_community:1"] == 0.6
    assert result.diversity_pressure_applied is False


def test_community_domain_buckets_group_by_domain_id_not_branch_id():
    _seed_users_and_clans()
    _seed_memberships([(1, 3, 1), (2, 4, 1), (3, 2, 2), (4, 12, 80)])
    _seed_history_campaign()
    _seed_domain(domain_id=701, root_clan_id=5, affiliate_clan_ids=[2, 3, 4])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2, distribution_scope="community_domain")
    _seed_exposures(count=20, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN, source_id=701, route_clan_id=3)
    _seed_exposures(count=20, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN, source_id=701, route_clan_id=4, start_offset_minutes=20)

    result = _allocate([1])

    assert result.source_counts == {"community_domain:701": 40}
    assert result.source_ratios["community_domain:701"] == 1.0
    assert result.candidate_allocations[0].source_bucket == "community_domain:701"


def test_candidate_source_attribution_matches_phase4a_ledger_attribution():
    _direct_two_candidate_setup()
    candidate = _candidates([1])[0]
    attribution = derive_spotlight_exposure_attribution(candidate)

    assert attribution is not None
    assert source_bucket_for_candidate(candidate) == source_bucket_for_route(
        allocation_route_type=attribution.allocation_route_type,
        allocation_source_id=attribution.allocation_source_id,
    )
    assert source_bucket_for_candidate(candidate) == "direct_community:1"


def test_source_at_below_threshold_receives_no_pressure():
    _direct_two_candidate_setup()
    _seed_exposures(count=24, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=16, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=40)

    result = _allocate([1, 2])

    assert result.source_ratios["direct_community:1"] == 0.6
    assert result.candidate_order_after == (1, 2)
    assert all(not allocation.diversity_pressure_applied for allocation in result.candidate_allocations)


def test_overrepresented_same_band_source_is_deprioritised_but_not_made_ineligible():
    _direct_two_candidate_setup()
    _seed_exposures(count=31, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=9, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=40)

    result = _allocate([1, 2])

    assert result.candidate_order_before == (1, 2)
    assert result.candidate_order_after == (2, 1)
    assert [candidate.campaign_id for candidate in result.candidates] == [2, 1]
    pressured = {row.campaign_id: row for row in result.candidate_allocations}
    assert pressured[1].diversity_pressure_applied is True
    assert pressured[1].over_threshold is True


def test_demandbox_match_is_exempt_and_can_temporarily_permit_above_sixty_percent():
    _direct_two_candidate_setup()
    _seed_demand(category="plumber")
    _seed_exposures(count=31, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=9, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=40)

    result = _allocate([1, 2])
    allocation_by_campaign = {row.campaign_id: row for row in result.candidate_allocations}

    assert result.candidates[0].priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    assert result.candidate_order_after[0] == 1
    assert allocation_by_campaign[1].source_ratio > 0.60
    assert allocation_by_campaign[1].diversity_exemption == SPOTLIGHT_DIVERSITY_EXEMPTION_DEMANDBOX_MATCH
    assert allocation_by_campaign[1].diversity_pressure_applied is False


def test_explicit_interest_relevance_does_not_create_diversity_exemption():
    _direct_two_candidate_setup()
    _seed_spotlight_interests(user_id=1, interests=["property"])
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET opportunity_category = 'property', opportunity_subcategory = 'room' WHERE id = 1"))
        conn.execute(text("UPDATE spotlight_campaigns SET opportunity_category = 'event', opportunity_subcategory = 'choir' WHERE id = 2"))
    _seed_exposures(count=31, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=9, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=40)

    result = _allocate([1, 2])
    allocation_by_campaign = {row.campaign_id: row for row in result.candidate_allocations}

    assert result.candidate_order_before == (1, 2)
    assert result.candidate_order_after == (2, 1)
    assert allocation_by_campaign[1].diversity_exemption is None
    assert allocation_by_campaign[1].diversity_pressure_applied is True


def test_sparse_inventory_and_single_candidate_prevent_pointless_suppression():
    _direct_two_candidate_setup()
    _seed_exposures(count=40, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)

    result = _allocate([1])

    assert result.candidate_order_after == (1,)
    assert result.diversity_pressure_applied is False
    assert result.sparse_inventory_fallback_reason == SPOTLIGHT_DIVERSITY_FALLBACK_SPARSE_INVENTORY
    assert result.candidate_allocations[0].sparse_inventory_fallback_reason == SPOTLIGHT_DIVERSITY_FALLBACK_SPARSE_INVENTORY


def test_multiple_candidate_routes_create_one_candidate_source_bucket_only():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 3, 1), (3, 1, 2), (4, 2, 2), (5, 12, 80)])
    _seed_history_campaign()
    _seed_domain(domain_id=702, root_clan_id=4, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2, distribution_scope="community_domain")
    _seed_exposures(count=40, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)

    result = _allocate([1])
    payload = result.to_internal_dict()

    assert result.candidate_order_after == (1,)
    assert len(result.candidate_allocations) == 1
    assert result.candidate_allocations[0].source_bucket == "direct_community:1"
    assert payload["candidate_allocations"][0]["source_bucket"] == "direct_community:1"


def test_allocation_call_does_not_write_ledger_or_attention_events():
    _direct_two_candidate_setup()
    _seed_exposures(count=31, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=9, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=40)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_attention_events (
                    event_type, viewer_user_id, source, source_path, created_at
                ) VALUES (
                    'spotlight_impression', 1, 'public_shop', '/shops/example', CURRENT_TIMESTAMP
                )
                """
            )
        )
    ledger_before = _ledger_count()
    attention_before = _attention_count()

    result = _allocate([1, 2])

    assert result.diversity_pressure_applied is True
    assert _ledger_count() == ledger_before
    assert _attention_count() == attention_before


def test_paid_status_and_trust_cci_do_not_change_diversity_decision():
    _direct_two_candidate_setup()
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET commercial_mode = 'paid' WHERE id = 2"))
    _seed_exposures(count=31, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)
    _seed_exposures(count=9, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=2, start_offset_minutes=40)

    result = _allocate([1, 2])

    assert result.candidate_order_after == (2, 1)
    assert "paid" not in result.to_internal_dict()["candidate_allocations"][0]
    assert "trust" not in json.dumps(result.to_internal_dict()).lower()


def test_unlinked_network_repost_and_legacy_preserved_remain_outside_allocator():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 12, 80)])
    _seed_history_campaign()
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, status="legacy_preserved")
    _seed_placement(broadcast_id=99, campaign_id=None, clan_id=1, author_user_id=2)
    _seed_exposures(count=40, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=1)

    result = _allocate([1])

    assert result.candidate_order_before == ()
    assert result.candidate_order_after == ()
    assert result.candidates == ()
    assert result.warmup_complete is True


def test_canonical_placement_bucket_uses_stable_route_source_not_campaign_id():
    _seed_users_and_clans()
    _seed_memberships([(1, 5, 1), (2, 4, 2), (3, 12, 80)])
    _seed_history_campaign()
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=4)
    _seed_placement(broadcast_id=44, campaign_id=1, clan_id=5, author_user_id=2)
    _seed_exposures(count=40, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT, source_id=44)

    result = _allocate([1])

    assert result.source_counts == {"canonical_placement:44": 40}
    assert result.candidate_allocations[0].source_bucket == "canonical_placement:44"
    assert result.candidate_allocations[0].source_bucket != "canonical_placement:1"
