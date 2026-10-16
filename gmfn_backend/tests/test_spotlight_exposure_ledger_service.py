from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import MarketplaceAttentionEvent, SpotlightExposureEvent, UserSettings
from app.services.spotlight_exposure_ledger_service import (
    REJECTION_CANONICAL_CANDIDATE_REQUIRED,
    REJECTION_CAMPAIGN_NOT_ACTIVE,
    REJECTION_OWNER_PREVIEW,
    REJECTION_SELF_DELIVERY,
    REJECTION_VIEWER_REQUIRED,
    count_qualifying_impressions_for_viewer,
    most_recent_qualifying_impression_at_by_campaign,
    qualifying_impression_counts_by_campaign,
    qualifying_impression_counts_by_route_source,
    qualifying_impression_counts_by_route_type,
    recent_qualifying_impressions_for_viewer,
    record_spotlight_qualifying_impression,
)
from app.services.spotlight_member_interest_service import serialize_spotlight_interests
from app.services.spotlight_opportunity_candidate_service import (
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH,
    SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY,
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


def _seed_users_and_clans(*, user_count: int = 12, clan_count: int = 8) -> None:
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
                    "email": f"phase4a-user-{user_id}@example.com",
                    "gmfn_id": f"GSN-P4A-{user_id:04d}",
                    "display_name": f"Phase 4A User {user_id}",
                    "trust_score": 90 if user_id % 2 else 10,
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
                    "name": f"Phase 4A Community {clan_id}",
                    "marketplace_name": f"Phase 4A Market {clan_id}",
                    "community_code": f"GMFN-P4A-{clan_id:04d}",
                    "invite_code": f"P4A-{clan_id:04d}",
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
    origin_clan_id: int = 1,
    status: str = "active",
    campaign_expires_delta: timedelta | None = timedelta(days=2),
    distribution_scope: str = "direct_communities",
    opportunity_category: str = "business_service",
    opportunity_subcategory: str | None = "plumber",
    opportunity_availability: str = "available",
    opportunity_expires_delta: timedelta | None = None,
    activated_offset_minutes: int = 0,
) -> None:
    created_at = BASE_TIME + timedelta(minutes=activated_offset_minutes)
    campaign_expires_at = None if campaign_expires_delta is None else created_at + campaign_expires_delta
    opportunity_expires_at = None if opportunity_expires_delta is None else created_at + opportunity_expires_delta
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, shop_id, origin_clan_id, source_product_id,
                    content_kind, content_fingerprint, status, source_kind,
                    commercial_mode, distribution_scope, opportunity_intent,
                    opportunity_category, opportunity_subcategory,
                    opportunity_geo_scope, opportunity_availability, opportunity_expires_at,
                    created_at, activated_at, expires_at
                ) VALUES (
                    :id, :owner_user_id, NULL, :origin_clan_id, NULL,
                    'broadcast_snapshot', :fingerprint, :status, 'direct_broadcast',
                    'free', :distribution_scope, 'offer',
                    :opportunity_category, :opportunity_subcategory,
                    'community', :opportunity_availability, :opportunity_expires_at,
                    :created_at, :created_at, :campaign_expires_at
                )
                """
            ),
            {
                "id": campaign_id,
                "owner_user_id": owner_user_id,
                "origin_clan_id": origin_clan_id,
                "fingerprint": _fingerprint(campaign_id),
                "status": status,
                "distribution_scope": distribution_scope,
                "opportunity_category": opportunity_category,
                "opportunity_subcategory": opportunity_subcategory,
                "opportunity_availability": opportunity_availability,
                "opportunity_expires_at": opportunity_expires_at,
                "created_at": created_at,
                "campaign_expires_at": campaign_expires_at,
            },
        )


def _seed_demand(
    *,
    demand_id: int,
    user_id: int = 1,
    clan_id: int = 1,
    category: str = "plumbing",
    title: str = "Need plumbing help",
    area: str | None = "Aberdeen",
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                ) VALUES (
                    :id, :clan_id, :user_id, :title, 'Need help', :category, 'medium',
                    :area, 'cash', 0, 'open', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": demand_id,
                "clan_id": clan_id,
                "user_id": user_id,
                "title": title,
                "category": category,
                "area": area,
                "expires_at": BASE_TIME + timedelta(days=2),
            },
        )


def _seed_placement(
    *,
    broadcast_id: int,
    campaign_id: int | None,
    clan_id: int,
    author_user_id: int,
    visibility_scope: str = "marketplace_repost",
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :id, :campaign_id, :clan_id, :author_user_id, 'Phase 4A placement',
                    'free', :visibility_scope, :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": broadcast_id,
                "campaign_id": campaign_id,
                "clan_id": clan_id,
                "author_user_id": author_user_id,
                "visibility_scope": visibility_scope,
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
                "domain_name": f"phase4a-domain-{domain_id}",
                "display_name": f"Phase 4A Domain {domain_id}",
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
                    'Phase 4A policy', :config_json, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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


def _candidate_for(viewer_user_id: int, campaign_ids: list[int]):
    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(
            db,
            viewer_user_id=viewer_user_id,
            campaign_ids=campaign_ids,
            now=BASE_TIME + timedelta(hours=1),
        )
        assert candidates
        return candidates[0]


def _ledger_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM spotlight_exposure_events")).scalar_one())


def test_qualifying_canonical_impression_can_be_recorded_with_required_identity():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        result = record_spotlight_qualifying_impression(
            db,
            viewer_user_id=1,
            candidate=candidate,
            idempotency_key="phase4a-first",
            event_at=BASE_TIME + timedelta(hours=1),
        )

    assert result.recorded is True
    assert result.event is not None
    assert result.event.viewer_user_id == 1
    assert result.event.campaign_id == 1
    assert result.event.event_type == "qualifying_impression"
    assert result.event.allocation_route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY


def test_viewer_and_canonical_campaign_are_required():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        missing_viewer = record_spotlight_qualifying_impression(db, viewer_user_id=0, candidate=candidate)
        missing_candidate = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=None)

    assert missing_viewer.rejection_code == REJECTION_VIEWER_REQUIRED
    assert missing_candidate.rejection_code == REJECTION_CANONICAL_CANDIDATE_REQUIRED
    assert _ledger_count() == 0


def test_candidate_generation_alone_does_not_record_impression():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)

    candidate = _candidate_for(1, [1])

    assert candidate.campaign_id == 1
    assert _ledger_count() == 0


def test_marketplace_feed_fetch_alone_does_not_record_canonical_exposure(client, override_current_user_user):
    _seed_users_and_clans(user_count=2, clan_count=1)
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    _seed_placement(broadcast_id=1, campaign_id=1, clan_id=1, author_user_id=2, visibility_scope="direct_communities")

    response = client.get("/marketplace/broadcasts?clan_id=1&active_only=true")

    assert response.status_code == 200, response.text
    assert _ledger_count() == 0


def test_multiple_eligibility_routes_create_one_impression_with_supporting_routes():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 3, 1), (3, 1, 2), (4, 2, 2)])
    _seed_domain(domain_id=801, root_clan_id=4, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2, distribution_scope="community_domain")
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        result = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, idempotency_key="multi-route", event_at=BASE_TIME + timedelta(hours=1))

    assert result.recorded is True
    assert _ledger_count() == 1
    routes = json.loads(result.event.supporting_routes_json)
    pathways = {route["pathway"] for route in routes}
    assert SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY in pathways
    assert SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN in pathways


def test_direct_community_source_provenance_can_be_stored():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1), (2, 2, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2)
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        result = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, event_at=BASE_TIME + timedelta(hours=1))

    assert result.event.allocation_route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY
    assert result.event.allocation_source_kind == "clan"
    assert result.event.allocation_source_id == 2
    assert result.event.allocation_route_clan_id == 2


def test_community_domain_source_provenance_can_be_stored():
    _seed_users_and_clans()
    _seed_memberships([(1, 3, 1), (2, 2, 2)])
    _seed_domain(domain_id=802, root_clan_id=4, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2, distribution_scope="community_domain")
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        result = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, event_at=BASE_TIME + timedelta(hours=1))

    assert result.event.allocation_route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN
    assert result.event.allocation_source_kind == "community_domain"
    assert result.event.allocation_source_id == 802
    assert result.event.allocation_route_clan_id == 3


def test_demandbox_relevance_coexists_with_domain_source_without_becoming_source():
    _seed_users_and_clans()
    _seed_memberships([(1, 3, 1), (2, 2, 2)])
    _seed_domain(domain_id=803, root_clan_id=4, affiliate_clan_ids=[2, 3])
    _seed_demand(demand_id=1, user_id=1, clan_id=3, category="plumber", title="Need plumber")
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2, distribution_scope="community_domain")
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        result = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, event_at=BASE_TIME + timedelta(hours=1))

    assert candidate.priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    assert result.event.demandbox_relevant is True
    assert result.event.allocation_route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN
    assert result.event.allocation_source_id == 803
    signals = json.loads(result.event.relevance_signals_json)
    assert signals["matched_demand_ids"] == [1]


def test_explicit_interest_relevance_coexists_without_becoming_source():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="property", opportunity_subcategory="room")
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        result = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, event_at=BASE_TIME + timedelta(hours=1))

    assert result.event.explicit_interest_relevant is True
    assert result.event.allocation_route_type == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY
    assert result.event.allocation_source_kind == "clan"
    signals = json.loads(result.event.relevance_signals_json)
    assert signals["matched_interest_categories"] == ["property"]


def test_idempotency_dedupes_retry_but_new_key_records_later_repeat():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        first = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, idempotency_key="same-key", event_at=BASE_TIME + timedelta(hours=1))
        first_event_id = first.event.id
        retry = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, idempotency_key="same-key", event_at=BASE_TIME + timedelta(hours=1))
        retry_event_id = retry.event.id
        later = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, idempotency_key="new-key", event_at=BASE_TIME + timedelta(hours=1, minutes=1))

    assert first.recorded is True
    assert retry.recorded is False
    assert retry.deduped is True
    assert retry_event_id == first_event_id
    assert later.recorded is True
    assert _ledger_count() == 2


def test_owner_preview_and_self_delivery_do_not_count():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    candidate = _candidate_for(1, [1])

    with SessionLocal() as db:
        preview = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, owner_preview=True, event_at=BASE_TIME + timedelta(hours=1))
        self_delivery = record_spotlight_qualifying_impression(db, viewer_user_id=2, candidate=candidate, event_at=BASE_TIME + timedelta(hours=1))

    assert preview.rejection_code == REJECTION_OWNER_PREVIEW
    assert self_delivery.rejection_code == REJECTION_SELF_DELIVERY
    assert _ledger_count() == 0


def test_unlinked_network_repost_cannot_enter_canonical_ledger():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_placement(broadcast_id=99, campaign_id=None, clan_id=1, author_user_id=2, visibility_scope="marketplace_repost")

    with SessionLocal() as db:
        result = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=None, idempotency_key="unlinked")

    assert result.rejection_code == REJECTION_CANONICAL_CANDIDATE_REQUIRED
    assert _ledger_count() == 0


def test_legacy_ended_expired_or_unavailable_campaign_cannot_be_newly_recorded():
    _seed_users_and_clans(user_count=5, clan_count=1)
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3), (4, 1, 4), (5, 1, 5)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1)
    _seed_campaign(campaign_id=3, owner_user_id=4, origin_clan_id=1)
    _seed_campaign(campaign_id=4, owner_user_id=5, origin_clan_id=1)
    candidates = {}
    with SessionLocal() as db:
        for candidate in build_spotlight_opportunity_candidates(
            db, viewer_user_id=1, campaign_ids=[1, 2, 3, 4], now=BASE_TIME
        ):
            candidates[candidate.campaign_id] = candidate
    with engine.begin() as conn:
        conn.execute(text("UPDATE spotlight_campaigns SET status = 'legacy_preserved' WHERE id = 1"))
        conn.execute(text("UPDATE spotlight_campaigns SET status = 'ended' WHERE id = 2"))
        conn.execute(text("UPDATE spotlight_campaigns SET expires_at = :expired WHERE id = 3"), {"expired": BASE_TIME - timedelta(minutes=1)})
        conn.execute(text("UPDATE spotlight_campaigns SET opportunity_availability = 'unavailable' WHERE id = 4"))

    with SessionLocal() as db:
        results = [
            record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidates[campaign_id], event_at=BASE_TIME)
            for campaign_id in (1, 2, 3, 4)
        ]

    assert all(result.recorded is False for result in results)
    assert results[0].rejection_code == REJECTION_CAMPAIGN_NOT_ACTIVE
    assert _ledger_count() == 0


def test_recent_counts_last_n_grouping_and_most_recent_queries():
    _seed_users_and_clans(user_count=5, clan_count=4)
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 2, 1), (4, 2, 3), (5, 4, 1), (6, 3, 4)])
    _seed_domain(domain_id=804, root_clan_id=4, affiliate_clan_ids=[3])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, activated_offset_minutes=1)
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=2, activated_offset_minutes=2)
    _seed_campaign(campaign_id=3, owner_user_id=4, origin_clan_id=3, distribution_scope="community_domain", activated_offset_minutes=3)
    candidates = {}
    with SessionLocal() as db:
        for candidate in build_spotlight_opportunity_candidates(
            db, viewer_user_id=1, campaign_ids=[1, 2, 3], now=BASE_TIME
        ):
            candidates[candidate.campaign_id] = candidate
        record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidates[1], idempotency_key="q1", event_at=BASE_TIME + timedelta(minutes=10))
        record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidates[2], idempotency_key="q2", event_at=BASE_TIME + timedelta(minutes=20))
        record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidates[3], idempotency_key="q3", event_at=BASE_TIME + timedelta(minutes=30))
        record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidates[1], idempotency_key="q4", event_at=BASE_TIME + timedelta(minutes=40))

        assert count_qualifying_impressions_for_viewer(db, viewer_user_id=1) == 4
        assert count_qualifying_impressions_for_viewer(db, viewer_user_id=1, last_n=2) == 2
        recent = recent_qualifying_impressions_for_viewer(db, viewer_user_id=1, limit=3)
        by_type = qualifying_impression_counts_by_route_type(db, viewer_user_id=1)
        by_source = qualifying_impression_counts_by_route_source(db, viewer_user_id=1)
        by_campaign = qualifying_impression_counts_by_campaign(db, viewer_user_id=1)
        latest = most_recent_qualifying_impression_at_by_campaign(db, viewer_user_id=1)

    assert [event.campaign_id for event in recent] == [1, 3, 2]
    assert by_type[SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY] == 3
    assert by_type[SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN] == 1
    assert by_source[(SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN, 804)] == 1
    assert by_campaign == {1: 2, 2: 1, 3: 1}
    assert latest[1] == BASE_TIME + timedelta(minutes=40)


def test_existing_attention_analytics_remain_unchanged_when_canonical_ledger_records():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    candidate = _candidate_for(1, [1])
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_attention_events (
                    event_type, shop_id, broadcast_id, clan_id, shop_owner_user_id,
                    viewer_user_id, source, source_path, dedupe_key, created_at
                ) VALUES (
                    'spotlight_impression', NULL, NULL, 1, 2,
                    1, 'public_shop_spotlight', '/shops/1', 'attention-1', CURRENT_TIMESTAMP
                )
                """
            )
        )

    with SessionLocal() as db:
        attention_before = db.query(MarketplaceAttentionEvent).count()
        result = record_spotlight_qualifying_impression(db, viewer_user_id=1, candidate=candidate, idempotency_key="ledger-1", event_at=BASE_TIME + timedelta(hours=1))
        attention_after = db.query(MarketplaceAttentionEvent).count()
        exposure_count = db.query(SpotlightExposureEvent).count()

    assert attention_before == 1
    assert attention_after == 1
    assert result.recorded is True
    assert exposure_count == 1
