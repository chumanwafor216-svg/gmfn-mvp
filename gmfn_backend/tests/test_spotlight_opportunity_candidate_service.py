from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import UserSettings
from app.services.spotlight_opportunity_candidate_service import (
    SPOTLIGHT_CANDIDATE_BAND_COMMUNITY_DOMAIN,
    SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH,
    SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY,
    SPOTLIGHT_CANDIDATE_BAND_OTHER_CANONICAL_ELIGIBLE,
    build_spotlight_opportunity_candidates,
)
from app.services.spotlight_opportunity_eligibility_service import (
    SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT,
    SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
    SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
)


def _fingerprint(campaign_id: int) -> str:
    return f"{int(campaign_id):064d}"[-64:]


def _seed_users_and_clans(*, user_count: int = 24, clan_count: int = 10) -> None:
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
                    "email": f"phase3c-user-{user_id}@example.com",
                    "gmfn_id": f"GSN-P3C-{user_id:04d}",
                    "display_name": f"Phase 3C User {user_id}",
                    "trust_score": 99 if user_id % 2 else 10,
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
                    "name": f"Phase 3C Community {clan_id}",
                    "marketplace_name": f"Phase 3C Market {clan_id}",
                    "community_code": f"GMFN-P3C-{clan_id:04d}",
                    "invite_code": f"P3C-{clan_id:04d}",
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
    commercial_mode: str = "free",
    opportunity_intent: str = "offer",
    opportunity_category: str = "business_service",
    opportunity_subcategory: str | None = "plumber",
    opportunity_keywords: list[str] | None = None,
    opportunity_geo_scope: str = "community",
    opportunity_locality: str | None = None,
    opportunity_availability: str = "available",
    opportunity_expires_delta: timedelta | None = None,
    activated_offset_minutes: int = 0,
) -> None:
    now = datetime(2026, 10, 12, 8, 0, tzinfo=timezone.utc) + timedelta(minutes=activated_offset_minutes)
    campaign_expires_at = None if campaign_expires_delta is None else now + campaign_expires_delta
    opportunity_expires_at = None if opportunity_expires_delta is None else now + opportunity_expires_delta
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, shop_id, origin_clan_id, source_product_id,
                    content_kind, content_fingerprint, status, source_kind,
                    commercial_mode, distribution_scope, opportunity_intent,
                    opportunity_category, opportunity_subcategory, opportunity_keywords_json,
                    opportunity_geo_scope, opportunity_locality,
                    opportunity_availability, opportunity_expires_at,
                    created_at, activated_at, expires_at
                ) VALUES (
                    :id, :owner_user_id, NULL, :origin_clan_id, NULL,
                    'broadcast_snapshot', :fingerprint, :status, 'direct_broadcast',
                    :commercial_mode, :distribution_scope, :opportunity_intent,
                    :opportunity_category, :opportunity_subcategory, :opportunity_keywords_json,
                    :opportunity_geo_scope, :opportunity_locality,
                    :opportunity_availability, :opportunity_expires_at,
                    :created_at, :activated_at, :campaign_expires_at
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
                "opportunity_intent": opportunity_intent,
                "opportunity_category": opportunity_category,
                "opportunity_subcategory": opportunity_subcategory,
                "opportunity_keywords_json": json.dumps(opportunity_keywords) if opportunity_keywords else None,
                "opportunity_geo_scope": opportunity_geo_scope,
                "opportunity_locality": opportunity_locality,
                "opportunity_availability": opportunity_availability,
                "opportunity_expires_at": opportunity_expires_at,
                "created_at": now,
                "activated_at": now,
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
    description: str = "Pipe leak near Aberdeen",
    area: str | None = "Aberdeen",
    status: str = "open",
    expires_delta: timedelta | None = timedelta(days=2),
) -> None:
    expires_at = None if expires_delta is None else datetime.now(timezone.utc) + expires_delta
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                ) VALUES (
                    :id, :clan_id, :user_id, :title, :description, :category, 'medium',
                    :area, 'cash', 0, :status, :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": demand_id,
                "clan_id": clan_id,
                "user_id": user_id,
                "title": title,
                "description": description,
                "category": category,
                "area": area,
                "status": status,
                "expires_at": expires_at,
            },
        )


def _seed_placement(
    *,
    broadcast_id: int,
    campaign_id: int | None,
    clan_id: int,
    author_user_id: int,
    visibility_scope: str = "marketplace_repost",
    priority_mode: str = "free",
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :id, :campaign_id, :clan_id, :author_user_id, 'Phase 3C placement',
                    :priority_mode, :visibility_scope, :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": broadcast_id,
                "campaign_id": campaign_id,
                "clan_id": clan_id,
                "author_user_id": author_user_id,
                "priority_mode": priority_mode,
                "visibility_scope": visibility_scope,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=2),
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
                "domain_name": f"phase3c-domain-{domain_id}",
                "display_name": f"Phase 3C Domain {domain_id}",
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
                    'Phase 3C policy', :config_json, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
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


def test_priority_bands_cover_demandbox_direct_domain_and_canonical_placement():
    _seed_users_and_clans()
    _seed_memberships([
        (1, 1, 1), (2, 3, 1), (3, 5, 1),
        (4, 1, 2), (5, 1, 3), (6, 2, 4), (7, 4, 5),
    ])
    _seed_domain(domain_id=701, root_clan_id=6, affiliate_clan_ids=[2, 3])
    _seed_demand(demand_id=1, clan_id=1)
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")
    _seed_campaign(
        campaign_id=3,
        owner_user_id=4,
        origin_clan_id=2,
        distribution_scope="community_domain",
        opportunity_category="event",
        opportunity_subcategory="choir",
    )
    _seed_campaign(campaign_id=4, owner_user_id=5, origin_clan_id=4, opportunity_category="event", opportunity_subcategory="choir")
    _seed_placement(broadcast_id=1, campaign_id=4, clan_id=5, author_user_id=5)

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2, 3, 4])

    assert [(candidate.campaign_id, candidate.priority_band) for candidate in candidates] == [
        (1, SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH),
        (2, SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY),
        (3, SPOTLIGHT_CANDIDATE_BAND_COMMUNITY_DOMAIN),
        (4, SPOTLIGHT_CANDIDATE_BAND_OTHER_CANONICAL_ELIGIBLE),
    ]
    assert candidates[3].eligibility.routes[0].pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT


def test_demandbox_precedence_dedupes_candidate_and_retains_route_provenance():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 3, 1), (3, 1, 2), (4, 2, 2)])
    _seed_domain(domain_id=702, root_clan_id=4, affiliate_clan_ids=[2, 3])
    _seed_demand(demand_id=1, clan_id=1)
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 1])
        payload = candidates[0].to_internal_dict()

    assert len(candidates) == 1
    assert candidates[0].priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    assert candidates[0].matched_demand_ids == (1,)
    pathways = [route.pathway for route in candidates[0].eligibility.routes]
    assert SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY in pathways
    assert SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN in pathways
    assert payload["privacy"] == "internal_route_provenance_only"
    assert payload["community_domain_routes"][0]["public_disclosure_allowed"] is False


def test_multiple_direct_routes_do_not_duplicate_candidate():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 2, 1), (3, 1, 2), (4, 2, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1])

    assert len(candidates) == 1
    assert candidates[0].priority_band == SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY
    assert [route.route_clan_id for route in candidates[0].eligibility.routes] == [1, 2]


def test_multiple_community_domain_routes_do_not_duplicate_candidate():
    _seed_users_and_clans()
    _seed_memberships([(1, 3, 1), (2, 6, 1), (3, 2, 2), (4, 5, 2)])
    _seed_domain(domain_id=703, root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_domain(domain_id=704, root_clan_id=4, affiliate_clan_ids=[5, 6])
    _seed_campaign(
        campaign_id=1,
        owner_user_id=2,
        origin_clan_id=2,
        distribution_scope="community_domain",
        opportunity_category="event",
        opportunity_subcategory="choir",
    )

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1])

    assert len(candidates) == 1
    assert candidates[0].priority_band == SPOTLIGHT_CANDIDATE_BAND_COMMUNITY_DOMAIN
    domain_routes = [route for route in candidates[0].eligibility.routes if route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN]
    assert [(route.community_domain_id, route.owner_branch_clan_id, route.viewer_branch_clan_id) for route in domain_routes] == [
        (703, 2, 3),
        (704, 5, 6),
    ]


def test_multiple_open_demandbox_matches_are_internal_without_candidate_duplication():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_demand(demand_id=1, clan_id=1, category="plumbing", title="Need plumber")
    _seed_demand(demand_id=2, clan_id=1, category="plumber", title="Need pipe repair")
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1)

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1])

    assert len(candidates) == 1
    assert candidates[0].priority_band == SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH
    assert candidates[0].matched_demand_ids == (1, 2)
    assert len(candidates[0].demand_matches) == 2


def test_invalid_or_legacy_campaigns_and_unlinked_reposts_never_enter_candidates():
    _seed_users_and_clans()
    _seed_memberships([
        (1, 1, 1), (2, 1, 3), (3, 1, 4), (4, 1, 5), (5, 1, 6), (6, 1, 7),
        (7, 2, 8),
    ])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=2)
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, status="ended")
    _seed_campaign(campaign_id=3, owner_user_id=4, origin_clan_id=1, status="expired")
    _seed_campaign(campaign_id=4, owner_user_id=5, origin_clan_id=1, opportunity_availability="unavailable")
    _seed_campaign(campaign_id=5, owner_user_id=6, origin_clan_id=1, opportunity_expires_delta=timedelta(hours=-1))
    _seed_campaign(campaign_id=6, owner_user_id=7, origin_clan_id=1, status="legacy_preserved")
    _seed_campaign(campaign_id=7, owner_user_id=8, origin_clan_id=2)
    _seed_placement(broadcast_id=99, campaign_id=None, clan_id=1, author_user_id=8, priority_mode="paid")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2, 3, 4, 5, 6, 7])

    assert candidates == []


def test_geography_certainty_breaks_demandbox_tie_without_fabricating_unknown_location():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_demand(demand_id=1, clan_id=1, area="Aberdeen")
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_geo_scope="unspecified")
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_geo_scope="local", opportunity_locality="Aberdeen")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2])

    assert [candidate.campaign_id for candidate in candidates] == [2, 1]
    assert candidates[0].geographic_compatibility == "compatible"
    assert candidates[1].geographic_compatibility == "unknown"


def test_availability_certainty_breaks_non_demand_tie():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_campaign(
        campaign_id=1,
        owner_user_id=2,
        origin_clan_id=1,
        opportunity_category="event",
        opportunity_subcategory="choir",
        opportunity_availability="unspecified",
    )
    _seed_campaign(
        campaign_id=2,
        owner_user_id=3,
        origin_clan_id=1,
        opportunity_category="event",
        opportunity_subcategory="choir",
        opportunity_availability="available",
    )

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2])

    assert [candidate.campaign_id for candidate in candidates] == [2, 1]
    assert [candidate.opportunity_availability_state for candidate in candidates] == ["available", "unspecified"]


def test_ordering_is_stable_and_campaign_id_is_final_tiebreaker():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")

    with SessionLocal() as db:
        first = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[2, 1])
        second = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[2, 1])

    assert [candidate.campaign_id for candidate in first] == [1, 2]
    assert [candidate.campaign_id for candidate in second] == [1, 2]
    assert first[0].tie_break_metadata["campaign_id_tiebreak"] == 1


def test_paid_status_and_trust_score_do_not_change_band_or_order():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")
    _seed_campaign(
        campaign_id=2,
        owner_user_id=3,
        origin_clan_id=1,
        commercial_mode="paid",
        opportunity_category="event",
        opportunity_subcategory="choir",
    )

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[2, 1])

    assert [candidate.campaign_id for candidate in candidates] == [1, 2]
    assert [candidate.priority_band for candidate in candidates] == [
        SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY,
        SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY,
    ]
    assert "paid" not in candidates[0].tie_break_metadata
    assert "trust" not in " ".join(candidates[1].tie_break_metadata.keys()).lower()

def _seed_spotlight_interests(*, user_id: int = 1, interests: list[str] | None = None) -> None:
    from app.services.spotlight_member_interest_service import serialize_spotlight_interests

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


def test_explicit_interest_relevance_improves_order_inside_organic_band_and_keeps_general_discovery():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_category="property", opportunity_subcategory="room")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2])
        payload = candidates[0].to_internal_dict()

    assert [candidate.campaign_id for candidate in candidates] == [2, 1]
    assert [candidate.priority_band for candidate in candidates] == [
        SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY,
        SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY,
    ]
    assert candidates[0].interest_relevance is not None
    assert candidates[0].interest_relevance.relevant is True
    assert candidates[0].interest_relevance.matched_interests == ("property",)
    assert candidates[1].interest_relevance is not None
    assert candidates[1].interest_relevance.relevant is False
    assert payload["explicit_interest_relevant"] is True
    assert payload["matched_interest_categories"] == ["property"]
    assert payload["interest_relevance"]["privacy"] == "private_internal_preference_signal"


def test_multiple_explicit_interests_are_supported_without_duplicate_candidates():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_spotlight_interests(user_id=1, interests=["employment", "property", "education_training", "property"])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="education_training", opportunity_subcategory="course")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 1])

    assert len(candidates) == 1
    assert candidates[0].interest_relevance is not None
    assert candidates[0].interest_relevance.relevant is True
    assert candidates[0].interest_relevance.selected_interests == ("employment", "property", "education_training")
    assert candidates[0].interest_relevance.matched_interests == ("education_training",)


def test_unspecified_campaign_category_receives_no_interest_relevance():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_spotlight_interests(user_id=1, interests=["employment"])
    _seed_campaign(
        campaign_id=1,
        owner_user_id=2,
        origin_clan_id=1,
        opportunity_category="unspecified",
        opportunity_subcategory=None,
    )

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1])

    assert len(candidates) == 1
    assert candidates[0].interest_relevance is not None
    assert candidates[0].interest_relevance.relevant is False
    assert candidates[0].interest_relevance.matched_interests == ()


def test_removed_interest_no_longer_affects_candidate_ordering():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_category="property", opportunity_subcategory="room")

    with SessionLocal() as db:
        before = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2])
        settings = db.query(UserSettings).filter_by(user_id=1).one()
        from app.services.spotlight_member_interest_service import serialize_spotlight_interests

        settings.spotlight_interests_json = serialize_spotlight_interests([])
        db.add(settings)
        db.commit()
        after = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2])

    assert [candidate.campaign_id for candidate in before] == [2, 1]
    assert [candidate.campaign_id for candidate in after] == [1, 2]
    assert all(candidate.interest_relevance is not None and not candidate.interest_relevance.relevant for candidate in after)


def test_member_with_no_interests_preserves_phase3c_ordering():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_category="property", opportunity_subcategory="room")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[2, 1])

    assert [candidate.campaign_id for candidate in candidates] == [1, 2]
    assert [candidate.tie_break_metadata["interest_relevance_rank"] for candidate in candidates] == [1, 1]


def test_demandbox_match_remains_stronger_than_explicit_interest_relevance():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_demand(demand_id=1, clan_id=1, category="electrician", title="Need electrician")
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="business_service", opportunity_subcategory="electrician")
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_category="property", opportunity_subcategory="room")

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[2, 1])

    assert [(candidate.campaign_id, candidate.priority_band) for candidate in candidates] == [
        (1, SPOTLIGHT_CANDIDATE_BAND_DEMANDBOX_MATCH),
        (2, SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY),
    ]
    assert candidates[0].tie_break_metadata["interest_relevance_rank"] == 1


def test_direct_and_domain_relationship_rules_remain_stronger_than_interest_relevance():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 3, 1), (3, 1, 2), (4, 2, 3)])
    _seed_domain(domain_id=771, root_clan_id=4, affiliate_clan_ids=[2, 3])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="event", opportunity_subcategory="choir")
    _seed_campaign(
        campaign_id=2,
        owner_user_id=3,
        origin_clan_id=2,
        distribution_scope="community_domain",
        opportunity_category="property",
        opportunity_subcategory="room",
    )

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[2, 1])

    assert [(candidate.campaign_id, candidate.priority_band) for candidate in candidates] == [
        (1, SPOTLIGHT_CANDIDATE_BAND_DIRECT_COMMUNITY),
        (2, SPOTLIGHT_CANDIDATE_BAND_COMMUNITY_DOMAIN),
    ]
    assert candidates[1].interest_relevance is not None
    assert candidates[1].interest_relevance.relevant is True


def test_interest_cannot_bypass_community_domain_policy_or_relationship_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 2, 2)])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_campaign(
        campaign_id=1,
        owner_user_id=2,
        origin_clan_id=2,
        distribution_scope="community_domain",
        opportunity_category="property",
        opportunity_subcategory="room",
    )

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1])

    assert candidates == []


def test_interest_relevance_does_not_rescue_unavailable_or_expired_opportunity():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="property", opportunity_availability="unavailable")
    _seed_campaign(campaign_id=2, owner_user_id=3, origin_clan_id=1, opportunity_category="property", opportunity_expires_delta=timedelta(hours=-1))

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1, 2])

    assert candidates == []


def test_paid_status_trust_and_attention_events_do_not_change_interest_relevance():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2), (3, 1, 3)])
    _seed_spotlight_interests(user_id=1, interests=["property"])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="property", opportunity_subcategory="room")
    _seed_campaign(
        campaign_id=2,
        owner_user_id=3,
        origin_clan_id=1,
        commercial_mode="paid",
        opportunity_category="property",
        opportunity_subcategory="room",
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_attention_events (
                    event_type, viewer_user_id, source, source_path, created_at
                ) VALUES (
                    'spotlight_shop_click', 1, 'public_shop', '/shops/example', CURRENT_TIMESTAMP
                )
                """
            )
        )

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[2, 1])

    assert [candidate.campaign_id for candidate in candidates] == [1, 2]
    assert [candidate.interest_relevance.relevant for candidate in candidates] == [True, True]
    assert "paid" not in candidates[0].tie_break_metadata
    assert "trust" not in " ".join(candidates[1].tie_break_metadata.keys()).lower()


def test_no_interest_setting_means_attention_events_do_not_infer_interest():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1), (2, 1, 2)])
    _seed_campaign(campaign_id=1, owner_user_id=2, origin_clan_id=1, opportunity_category="property", opportunity_subcategory="room")
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

    with SessionLocal() as db:
        candidates = build_spotlight_opportunity_candidates(db, viewer_user_id=1, campaign_ids=[1])

    assert len(candidates) == 1
    assert candidates[0].interest_relevance is not None
    assert candidates[0].interest_relevance.selected_interests == ()
    assert candidates[0].interest_relevance.relevant is False
