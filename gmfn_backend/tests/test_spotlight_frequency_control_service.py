from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.spotlight_exposure_diversity_allocation_service import allocate_spotlight_opportunity_candidates
from app.services.spotlight_exposure_ledger_service import (
    SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
    SPOTLIGHT_EXPOSURE_EVENT_SERVED,
)
from app.services.spotlight_frequency_control_service import (
    SPOTLIGHT_DEMANDBOX_FREQUENCY_OVERRIDE_EXTRA,
    SPOTLIGHT_FREQUENCY_STATE_FREQUENCY_CAPPED,
    SPOTLIGHT_FREQUENCY_STATE_REPEAT_ALLOWED,
    SPOTLIGHT_FREQUENCY_STATE_UNSEEN,
    SPOTLIGHT_FREQUENCY_SUPPRESSION_CAMPAIGN_QUOTA_EXHAUSTED,
    SPOTLIGHT_FREQUENCY_SUPPRESSION_DEMANDBOX_OVERRIDE_EXHAUSTED,
    SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP,
    SPOTLIGHT_VIEWER_CAMPAIGN_FREQUENCY_CAP,
    apply_spotlight_frequency_control,
    frequency_state_for_prior_count,
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


def _seed_users_and_clans(*, user_count: int = 40, clan_count: int = 10) -> None:
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
                    "email": f"phase4c-user-{user_id}@example.com",
                    "gmfn_id": f"GSN-P4C-{user_id:04d}",
                    "display_name": f"Phase 4C User {user_id}",
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
                    "name": f"Phase 4C Community {clan_id}",
                    "marketplace_name": f"Phase 4C Market {clan_id}",
                    "community_code": f"GMFN-P4C-{clan_id:04d}",
                    "invite_code": f"P4C-{clan_id:04d}",
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
    opportunity_category: str = "event",
    opportunity_subcategory: str | None = "choir",
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


def _seed_placement(*, broadcast_id: int, campaign_id: int | None, clan_id: int, author_user_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :id, :campaign_id, :clan_id, :author_user_id, 'Phase 4C placement',
                    'free', 'marketplace_repost', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {"id": broadcast_id, "campaign_id": campaign_id, "clan_id": clan_id, "author_user_id": author_user_id, "expires_at": BASE_TIME + timedelta(days=2)},
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
            {"id": domain_id, "domain_name": f"phase4c-domain-{domain_id}", "display_name": f"Phase 4C Domain {domain_id}", "root_clan_id": root_clan_id},
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
                    'Phase 4C policy', :config_json, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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
            text("INSERT INTO user_settings (user_id, spotlight_interests_json) VALUES (:user_id, :interests_json)"),
            {"user_id": user_id, "interests_json": serialize_spotlight_interests(interests or [])},
        )


def _seed_exposures(
    *,
    campaign_id: int,
    count: int,
    viewer_user_id: int = 1,
    event_type: str = SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
    route_type: str = SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
    source_id: int = 1,
    start_offset_minutes: int = 0,
    placement_broadcast_id: int | None = None,
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
                        allocation_route_clan_id, placement_broadcast_id, idempotency_key,
                        presentation_surface, supporting_routes_json, relevance_signals_json,
                        presentation_context_json, created_at
                    ) VALUES (
                        :event_type, :viewer_user_id, :campaign_id, :event_at,
                        :route_type, 'test_source', :source_id,
                        :source_id, :placement_broadcast_id, :idempotency_key,
                        'phase4c-test', '[]', '{}', '{}', :event_at
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
                    "placement_broadcast_id": placement_broadcast_id,
                    "idempotency_key": f"p4c-{event_type}-{viewer_user_id}-{campaign_id}-{source_id}-{start_offset_minutes}-{index}",
                },
            )


def _basic_setup(*, commercial_mode_2: str = "free") -> None:
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 2, 1), (5, 2, 4)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", activated_offset_minutes=2)
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, commercial_mode=commercial_mode_2, opportunity_category="event", activated_offset_minutes=1)
    _seed_campaign(campaign_id=3, owner_user_id=4, origin_clan_id=2, opportunity_category="event", activated_offset_minutes=3)


def _frequency_result(campaign_ids: list[int], **kwargs):
    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(
            db, viewer_user_id=1, campaign_ids=campaign_ids, now=BASE_TIME + timedelta(hours=1)
        )
        diversity = allocate_spotlight_opportunity_candidates(db, viewer_user_id=1, candidates=candidates)
        return apply_spotlight_frequency_control(db, viewer_user_id=1, diversity_result=diversity, **kwargs)


def _candidate_meta(result):
    return {row.campaign_id: row for row in result.candidate_frequency}


def _ledger_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM spotlight_exposure_events")).scalar_one())


def _attention_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM marketplace_attention_events")).scalar_one())


def test_unseen_repeat_and_default_cap_states():
    _basic_setup()
    assert frequency_state_for_prior_count(0) == SPOTLIGHT_FREQUENCY_STATE_UNSEEN
    assert frequency_state_for_prior_count(1) == SPOTLIGHT_FREQUENCY_STATE_REPEAT_ALLOWED
    assert frequency_state_for_prior_count(SPOTLIGHT_VIEWER_CAMPAIGN_FREQUENCY_CAP) == SPOTLIGHT_FREQUENCY_STATE_FREQUENCY_CAPPED

    unseen = _frequency_result([1])
    _seed_exposures(campaign_id=1, count=1)
    repeat = _frequency_result([1])
    _seed_exposures(campaign_id=1, count=1, start_offset_minutes=10)
    capped = _frequency_result([1])

    assert _candidate_meta(unseen)[1].frequency_state == SPOTLIGHT_FREQUENCY_STATE_UNSEEN
    assert _candidate_meta(repeat)[1].frequency_state == SPOTLIGHT_FREQUENCY_STATE_REPEAT_ALLOWED
    assert _candidate_meta(capped)[1].frequency_state == SPOTLIGHT_FREQUENCY_STATE_FREQUENCY_CAPPED
    assert _candidate_meta(capped)[1].suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP


def test_served_non_qualified_events_do_not_count():
    _basic_setup()
    _seed_exposures(campaign_id=1, count=5, event_type=SPOTLIGHT_EXPOSURE_EVENT_SERVED)

    result = _frequency_result([1])

    meta = _candidate_meta(result)[1]
    assert meta.viewer_prior_qualifying_impressions == 0
    assert meta.frequency_state == SPOTLIGHT_FREQUENCY_STATE_UNSEEN
    assert result.candidate_order_after_frequency == (1,)


def test_placement_and_route_changes_do_not_reset_campaign_frequency():
    _basic_setup()
    _seed_placement(broadcast_id=10, campaign_id=1, clan_id=1, author_user_id=2)
    _seed_placement(broadcast_id=11, campaign_id=1, clan_id=2, author_user_id=2)
    _seed_exposures(campaign_id=1, count=1, placement_broadcast_id=10, source_id=1)
    _seed_exposures(campaign_id=1, count=1, placement_broadcast_id=11, source_id=2, start_offset_minutes=10)

    result = _frequency_result([1])

    meta = _candidate_meta(result)[1]
    assert meta.viewer_prior_qualifying_impressions == 2
    assert meta.suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP


def test_direct_to_domain_route_change_does_not_reset_frequency():
    _seed_users_and_clans()
    _seed_memberships([(1, 3, 1), (2, 2, 2)])
    _seed_domain(domain_id=701, root_clan_id=4, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2, distribution_scope="community_domain")
    _seed_exposures(campaign_id=1, count=2, route_type=SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, source_id=99)

    result = _frequency_result([1])

    assert result.candidate_order_before_frequency == (1,)
    meta = _candidate_meta(result)[1]
    assert meta.viewer_prior_qualifying_impressions == 2
    assert meta.suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP


def test_different_canonical_campaign_has_independent_frequency_count():
    _basic_setup()
    _seed_exposures(campaign_id=1, count=2)

    result = _frequency_result([1, 2])
    meta = _candidate_meta(result)

    assert meta[1].suppressed is True
    assert meta[2].frequency_state == SPOTLIGHT_FREQUENCY_STATE_UNSEEN
    assert result.candidate_order_after_frequency == (2,)


def test_unseen_comparable_campaign_orders_before_repeat_allowed_campaign():
    _basic_setup()
    _seed_exposures(campaign_id=1, count=1)

    result = _frequency_result([1, 2])

    assert result.candidate_order_before_frequency == (1, 2)
    assert result.candidate_order_after_frequency == (2, 1)
    assert _candidate_meta(result)[1].frequency_deprioritisation_applied is True


def test_frequency_capped_candidate_is_suppressed_for_viewer_but_available_to_another_viewer():
    _basic_setup()
    _seed_exposures(campaign_id=1, count=2, viewer_user_id=1)

    capped = _frequency_result([1])
    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(
            db, viewer_user_id=3, campaign_ids=[1], now=BASE_TIME + timedelta(hours=1)
        )
        diversity = allocate_spotlight_opportunity_candidates(db, viewer_user_id=4, candidates=candidates)
        other_viewer = apply_spotlight_frequency_control(db, viewer_user_id=3, diversity_result=diversity)

    assert capped.candidate_order_after_frequency == ()
    assert _candidate_meta(capped)[1].suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP
    assert other_viewer.candidate_order_after_frequency == (1,)
    assert _candidate_meta(other_viewer)[1].frequency_state == SPOTLIGHT_FREQUENCY_STATE_UNSEEN


def test_explicit_interest_does_not_override_frequency_cap():
    _basic_setup()
    _seed_spotlight_interests(user_id=1, interests=["property"])
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET opportunity_category = 'property' WHERE id = 1"))
    _seed_exposures(campaign_id=1, count=2)

    result = _frequency_result([1])

    meta = _candidate_meta(result)[1]
    assert meta.suppressed is True
    assert meta.suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP


def test_demandbox_match_uses_bounded_override_and_override_extra_is_configurable():
    _basic_setup()
    _seed_demand(category="plumber")
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET opportunity_category = 'business_service', opportunity_subcategory = 'plumber' WHERE id = 1"))
    _seed_exposures(campaign_id=1, count=2)

    allowed = _frequency_result([1])
    denied_default = None
    _seed_exposures(campaign_id=1, count=1, start_offset_minutes=20)
    denied_default = _frequency_result([1])
    allowed_custom = _frequency_result([1], demandbox_frequency_override_extra=2)

    assert allowed.candidates[0].priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    assert _candidate_meta(allowed)[1].demandbox_override_used is True
    assert _candidate_meta(allowed)[1].demandbox_override_available == SPOTLIGHT_DEMANDBOX_FREQUENCY_OVERRIDE_EXTRA
    assert denied_default.candidate_order_after_frequency == ()
    assert _candidate_meta(denied_default)[1].suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_DEMANDBOX_OVERRIDE_EXHAUSTED
    assert allowed_custom.candidate_order_after_frequency == (1,)


def test_frequency_evaluation_does_not_write_ledger_or_attention_events():
    _basic_setup()
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO marketplace_attention_events (event_type, viewer_user_id, source, source_path, created_at) VALUES ('spotlight_impression', 1, 'public_shop', '/shops/example', CURRENT_TIMESTAMP)"))
    ledger_before = _ledger_count()
    attention_before = _attention_count()

    result = _frequency_result([1, 2])

    assert result.candidate_order_after_frequency == (1, 2)
    assert _ledger_count() == ledger_before
    assert _attention_count() == attention_before


def test_campaign_wide_cap_default_unset_does_not_suppress():
    _basic_setup()
    _seed_exposures(campaign_id=1, count=5, viewer_user_id=2)
    _seed_exposures(campaign_id=1, count=5, viewer_user_id=3, start_offset_minutes=10)

    result = _frequency_result([1])

    meta = _candidate_meta(result)[1]
    assert meta.campaign_qualifying_impression_cap is None
    assert meta.campaign_remaining_quota is None
    assert meta.suppressed is False


def test_configured_campaign_quota_is_enforced_across_viewers_without_mutating_history_or_identity():
    _basic_setup()
    with engine.begin() as conn:
        original = conn.execute(text("SELECT content_fingerprint, status FROM spotlight_campaigns WHERE id = 1")).one()
    _seed_exposures(campaign_id=1, count=2, viewer_user_id=2)
    _seed_exposures(campaign_id=1, count=1, viewer_user_id=3, start_offset_minutes=10)

    result = _frequency_result([1], campaign_qualifying_impression_cap=3)

    meta = _candidate_meta(result)[1]
    assert meta.campaign_qualifying_impression_count == 3
    assert meta.campaign_remaining_quota == 0
    assert meta.suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_CAMPAIGN_QUOTA_EXHAUSTED
    assert result.delivery_quota_exhausted_campaign_ids == (1,)
    with engine.begin() as conn:
        after = conn.execute(text("SELECT content_fingerprint, status FROM spotlight_campaigns WHERE id = 1")).one()
    assert tuple(after) == tuple(original)


def test_viewer_cap_is_separate_from_campaign_wide_cap():
    _basic_setup()
    _seed_exposures(campaign_id=1, count=2, viewer_user_id=1)
    _seed_exposures(campaign_id=1, count=10, viewer_user_id=2, start_offset_minutes=10)

    viewer_capped = _frequency_result([1], campaign_qualifying_impression_cap=1000)
    quota_capped = _frequency_result([2], campaign_qualifying_impression_cap=0)

    assert _candidate_meta(viewer_capped)[1].suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP
    assert _candidate_meta(viewer_capped)[1].campaign_remaining_quota == 988
    assert _candidate_meta(quota_capped)[2].suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_CAMPAIGN_QUOTA_EXHAUSTED


def test_paid_status_and_trust_cci_do_not_affect_frequency_cap():
    _basic_setup(commercial_mode_2="paid")
    _seed_exposures(campaign_id=2, count=2)

    result = _frequency_result([2])
    payload = result.to_internal_dict()

    meta = _candidate_meta(result)[2]
    assert meta.viewer_frequency_cap == SPOTLIGHT_VIEWER_CAMPAIGN_FREQUENCY_CAP
    assert meta.suppressed_reason == SPOTLIGHT_FREQUENCY_SUPPRESSION_VIEWER_CAP
    assert "paid" not in json.dumps(payload).lower()
    assert "trust" not in json.dumps(payload).lower()


def test_unlinked_repost_and_legacy_preserved_remain_outside_frequency_control():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, status="legacy_preserved")
    _seed_placement(broadcast_id=99, campaign_id=None, clan_id=1, author_user_id=2)

    result = _frequency_result([1])

    assert result.candidate_order_before_frequency == ()
    assert result.candidate_order_after_frequency == ()
    assert result.candidate_frequency == ()
