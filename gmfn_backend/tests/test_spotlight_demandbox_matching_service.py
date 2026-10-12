from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.spotlight_demandbox_matching_service import (
    GEO_COMPATIBLE,
    GEO_UNKNOWN,
    MATCH_STRENGTH_NONE,
    MATCH_STRENGTH_POSSIBLE,
    MATCH_STRENGTH_STRONG,
    REASON_EXPLICIT_KEYWORD_MATCH,
    REASON_GEO_GLOBAL,
    REASON_GEO_LOCAL_MATCH,
    REASON_GEO_REMOTE,
    REASON_NORMALIZED_SUBCATEGORY_MATCH,
    REJECTION_AVAILABILITY_UNKNOWN_WEAK_SIGNAL,
    REJECTION_GEO_INCOMPATIBLE,
    REJECTION_GEO_UNKNOWN_FOR_LOCAL_SCOPE,
    REJECTION_INTENT_NOT_OFFER,
    REJECTION_OPPORTUNITY_EXPIRED,
    REJECTION_OPPORTUNITY_UNAVAILABLE,
    REJECTION_SEMANTIC_MISMATCH,
    evaluate_spotlight_demand_match,
    find_spotlight_matches_for_demand,
)
from app.services.spotlight_opportunity_eligibility_service import (
    SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
)


def _fingerprint(campaign_id: int) -> str:
    return f"{int(campaign_id):064d}"[-64:]


def _seed_users_and_clans(
    *,
    viewer_clans: tuple[int, ...] = (1,),
    owner_clans: tuple[int, ...] = (1,),
    other_owner_clans: tuple[int, ...] = (2,),
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name)
                VALUES
                    (1, 'viewer@example.com', 'hashed', 'member', 'GSN-U-VIEWER', 'Demand Viewer'),
                    (2, 'owner@example.com', 'hashed', 'member', 'GSN-U-OWNER', 'Spotlight Owner'),
                    (3, 'other-owner@example.com', 'hashed', 'member', 'GSN-U-OTHEROWNER', 'Other Owner')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at)
                VALUES
                    (1, 'Aberdeen Community', 'Aberdeen Market', 'GMFN-C-000001', 'active', 'invite-1', 0, CURRENT_TIMESTAMP),
                    (2, 'Glasgow Community', 'Glasgow Market', 'GMFN-C-000002', 'active', 'invite-2', 0, CURRENT_TIMESTAMP),
                    (3, 'Domain Branch Community', 'Domain Branch Market', 'GMFN-C-000003', 'active', 'invite-3', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        membership_id = 1
        for user_id, clan_ids in ((1, viewer_clans), (2, owner_clans), (3, other_owner_clans)):
            for clan_id in clan_ids:
                conn.execute(
                    text(
                        """
                        INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                        VALUES (:id, :clan_id, :user_id, 'member', 0)
                        """
                    ),
                    {"id": membership_id, "clan_id": int(clan_id), "user_id": int(user_id)},
                )
                membership_id += 1


def _seed_demand(
    *,
    demand_id: int = 1,
    clan_id: int = 1,
    user_id: int = 1,
    title: str = "Need urgent plumbing help",
    description: str = "Pipe leak near Aberdeen",
    category: str = "plumbing",
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


def _seed_campaign(
    *,
    campaign_id: int = 1,
    owner_user_id: int = 2,
    origin_clan_id: int = 1,
    status: str = "active",
    campaign_expires_delta: timedelta | None = timedelta(days=2),
    opportunity_intent: str = "offer",
    opportunity_category: str = "business_service",
    opportunity_subcategory: str | None = "plumber",
    opportunity_keywords: list[str] | None = None,
    opportunity_geo_scope: str = "community",
    opportunity_locality: str | None = None,
    opportunity_region: str | None = None,
    opportunity_country: str | None = None,
    opportunity_remote_available: bool | None = None,
    opportunity_availability: str = "available",
    opportunity_expires_delta: timedelta | None = None,
    distribution_scope: str = "direct_communities",
    content_kind: str = "broadcast_snapshot",
    source_product_id: int | None = None,
) -> None:
    now = datetime.now(timezone.utc)
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
                    opportunity_geo_scope, opportunity_country, opportunity_region,
                    opportunity_locality, opportunity_remote_available,
                    opportunity_availability, opportunity_expires_at,
                    created_at, activated_at, expires_at
                ) VALUES (
                    :id, :owner_user_id, NULL, :origin_clan_id, :source_product_id,
                    :content_kind, :content_fingerprint, :status, 'direct_broadcast',
                    'free', :distribution_scope, :opportunity_intent,
                    :opportunity_category, :opportunity_subcategory, :opportunity_keywords_json,
                    :opportunity_geo_scope, :opportunity_country, :opportunity_region,
                    :opportunity_locality, :opportunity_remote_available,
                    :opportunity_availability, :opportunity_expires_at,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :campaign_expires_at
                )
                """
            ),
            {
                "id": campaign_id,
                "owner_user_id": owner_user_id,
                "origin_clan_id": origin_clan_id,
                "source_product_id": source_product_id,
                "content_kind": content_kind,
                "content_fingerprint": _fingerprint(campaign_id),
                "status": status,
                "distribution_scope": distribution_scope,
                "opportunity_intent": opportunity_intent,
                "opportunity_category": opportunity_category,
                "opportunity_subcategory": opportunity_subcategory,
                "opportunity_keywords_json": (
                    json.dumps(opportunity_keywords) if opportunity_keywords is not None else None
                ),
                "opportunity_geo_scope": opportunity_geo_scope,
                "opportunity_country": opportunity_country,
                "opportunity_region": opportunity_region,
                "opportunity_locality": opportunity_locality,
                "opportunity_remote_available": opportunity_remote_available,
                "opportunity_availability": opportunity_availability,
                "opportunity_expires_at": opportunity_expires_at,
                "campaign_expires_at": campaign_expires_at,
            },
        )


def _seed_linked_placement(*, campaign_id: int, clan_id: int, broadcast_id: int) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :id, :campaign_id, :clan_id, 2, 'Plumber available',
                    'free', 'direct_communities', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": broadcast_id,
                "campaign_id": campaign_id,
                "clan_id": clan_id,
                "expires_at": datetime.now(timezone.utc) + timedelta(days=2),
            },
        )


def test_open_demandbox_need_matches_eligible_spotlight_offer():
    _seed_users_and_clans()
    _seed_demand()
    _seed_campaign()

    with SessionLocal() as db:
        matches = find_spotlight_matches_for_demand(
            db,
            demand_id=1,
            current_user_id=1,
            campaign_ids=[1],
        )

    assert len(matches) == 1
    assert matches[0].matched is True
    assert matches[0].match_strength == MATCH_STRENGTH_STRONG
    assert REASON_NORMALIZED_SUBCATEGORY_MATCH in matches[0].positive_reasons


def test_spotlight_need_and_unspecified_intent_do_not_satisfy_demand_need():
    _seed_users_and_clans(other_owner_clans=(1,))
    _seed_demand()
    _seed_campaign(campaign_id=1, opportunity_intent="need")
    _seed_campaign(campaign_id=2, owner_user_id=3, opportunity_intent="unspecified")

    with SessionLocal() as db:
        need_result = evaluate_spotlight_demand_match(
            db,
            demand_id=1,
            campaign_id=1,
            current_user_id=1,
        )
        unspecified_result = evaluate_spotlight_demand_match(
            db,
            demand_id=1,
            campaign_id=2,
            current_user_id=1,
        )

    assert need_result.matched is False
    assert unspecified_result.matched is False
    assert need_result.rejection_reasons == (REJECTION_INTENT_NOT_OFFER,)
    assert unspecified_result.rejection_reasons == (REJECTION_INTENT_NOT_OFFER,)


def test_ineligible_campaign_cannot_match_even_with_identical_terms():
    _seed_users_and_clans(owner_clans=(2,))
    _seed_demand()
    _seed_campaign(origin_clan_id=2)

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(
            db,
            demand_id=1,
            campaign_id=1,
            current_user_id=1,
        )

    assert result.matched is False
    assert result.rejection_reasons[0].startswith("phase2_not_eligible")


def test_ended_expired_unavailable_and_opportunity_expired_campaigns_do_not_match():
    _seed_users_and_clans(viewer_clans=(1, 2, 3), owner_clans=(1, 2, 3), other_owner_clans=(1,))
    _seed_demand()
    _seed_campaign(campaign_id=1, status="ended")
    _seed_campaign(campaign_id=2, owner_user_id=3, status="expired", campaign_expires_delta=timedelta(hours=-1))
    _seed_campaign(campaign_id=3, owner_user_id=2, status="active", opportunity_availability="unavailable", origin_clan_id=2)
    _seed_campaign(campaign_id=4, owner_user_id=3, status="active", opportunity_expires_delta=timedelta(hours=-1), origin_clan_id=3)

    with SessionLocal() as db:
        ended = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)
        expired = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=2, current_user_id=1)
        unavailable = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=3, current_user_id=1)
        opportunity_expired = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=4, current_user_id=1)

    assert ended.matched is False
    assert ended.rejection_reasons[0].startswith("phase2_not_eligible")
    assert expired.matched is False
    assert expired.rejection_reasons[0].startswith("phase2_not_eligible")
    assert unavailable.rejection_reasons == (REJECTION_OPPORTUNITY_UNAVAILABLE,)
    assert opportunity_expired.rejection_reasons == (REJECTION_OPPORTUNITY_EXPIRED,)


def test_plumbing_matches_plumber_and_accountant_matches_professional_service():
    _seed_users_and_clans(viewer_clans=(1, 2), owner_clans=(1, 2), other_owner_clans=(1,))
    _seed_demand(demand_id=1, category="plumbing", title="Need plumbing")
    _seed_campaign(campaign_id=1, opportunity_category="business_service", opportunity_subcategory="plumber")
    _seed_demand(
        demand_id=2,
        category="accountant",
        title="Need accountant",
        description="Need tax help",
        area="Aberdeen",
    )
    _seed_campaign(
        campaign_id=2,
        owner_user_id=3,
        opportunity_category="professional_service",
        opportunity_subcategory="accountant",
    )

    with SessionLocal() as db:
        plumbing = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)
        accountant = evaluate_spotlight_demand_match(db, demand_id=2, campaign_id=2, current_user_id=1)

    assert plumbing.matched is True
    assert REASON_NORMALIZED_SUBCATEGORY_MATCH in plumbing.positive_reasons
    assert accountant.matched is True
    assert accountant.match_strength == MATCH_STRENGTH_STRONG


def test_explicit_keyword_overlap_can_support_match():
    _seed_users_and_clans()
    _seed_demand(category="home repair", title="Pipe repair needed", description="Kitchen leak")
    _seed_campaign(
        opportunity_category="other",
        opportunity_subcategory=None,
        opportunity_keywords=["pipe repair"],
    )

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)

    assert result.matched is True
    assert REASON_EXPLICIT_KEYWORD_MATCH in result.positive_reasons


def test_unrelated_category_or_weak_unknown_availability_does_not_match():
    _seed_users_and_clans(viewer_clans=(1, 2), owner_clans=(1, 2))
    _seed_demand(category="plumbing", title="Need plumber")
    _seed_campaign(campaign_id=1, opportunity_category="event", opportunity_subcategory="choir practice")
    _seed_campaign(
        campaign_id=2,
        owner_user_id=3,
        opportunity_category="business_service",
        opportunity_subcategory=None,
        opportunity_availability="unspecified",
    )

    with SessionLocal() as db:
        unrelated = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)
        weak_unknown = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=2, current_user_id=1)

    assert unrelated.matched is False
    assert unrelated.rejection_reasons == (REJECTION_SEMANTIC_MISMATCH,)
    assert weak_unknown.matched is False
    assert weak_unknown.rejection_reasons == (REJECTION_AVAILABILITY_UNKNOWN_WEAK_SIGNAL,)


def test_local_same_area_matches_and_different_local_area_does_not():
    _seed_users_and_clans(viewer_clans=(1, 2), owner_clans=(1, 2), other_owner_clans=(1,))
    _seed_demand(area="Aberdeen")
    _seed_campaign(campaign_id=1, opportunity_geo_scope="local", opportunity_locality="Aberdeen")
    _seed_campaign(campaign_id=2, owner_user_id=3, opportunity_geo_scope="local", opportunity_locality="Glasgow")

    with SessionLocal() as db:
        same = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)
        different = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=2, current_user_id=1)

    assert same.matched is True
    assert same.geographic_compatibility == GEO_COMPATIBLE
    assert REASON_GEO_LOCAL_MATCH in same.positive_reasons
    assert different.matched is False
    assert different.rejection_reasons == (REJECTION_GEO_INCOMPATIBLE,)


def test_remote_and_global_offers_are_not_blocked_by_local_demand_area():
    _seed_users_and_clans(viewer_clans=(1, 2), owner_clans=(1, 2), other_owner_clans=(1,))
    _seed_demand(area="Aberdeen")
    _seed_campaign(campaign_id=1, opportunity_geo_scope="remote", opportunity_remote_available=True)
    _seed_campaign(campaign_id=2, owner_user_id=3, opportunity_geo_scope="global")

    with SessionLocal() as db:
        remote = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)
        global_result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=2, current_user_id=1)

    assert remote.matched is True
    assert REASON_GEO_REMOTE in remote.positive_reasons or "geo_remote_available" in remote.positive_reasons
    assert global_result.matched is True
    assert REASON_GEO_GLOBAL in global_result.positive_reasons


def test_unknown_local_geography_does_not_fabricate_positive_local_match():
    _seed_users_and_clans()
    _seed_demand(area="Aberdeen")
    _seed_campaign(opportunity_geo_scope="local", opportunity_locality=None)

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)

    assert result.matched is False
    assert result.geographic_compatibility == GEO_UNKNOWN
    assert result.rejection_reasons == (REJECTION_GEO_UNKNOWN_FOR_LOCAL_SCOPE,)


def test_multiple_eligible_routes_still_return_one_campaign_match_result():
    _seed_users_and_clans(viewer_clans=(1, 2), owner_clans=(1, 2))
    _seed_demand()
    _seed_campaign()
    _seed_linked_placement(campaign_id=1, clan_id=1, broadcast_id=1)
    _seed_linked_placement(campaign_id=1, clan_id=2, broadcast_id=2)

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)

    assert result.matched is True
    assert len(result.eligibility.routes) == 2
    assert result.campaign_id == 1


def _seed_domain_route() -> None:
    _seed_users_and_clans(viewer_clans=(3,), owner_clans=(2,), other_owner_clans=(1,))
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, clan_id, status, verification_status,
                    created_at, updated_at
                ) VALUES (
                    701, 'phase3b-domain', 'Phase 3B Domain', 'ngo_project_network',
                    'ngo_project_network', 1, 1, 'active', 'verified',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id, community_domain_id, policy_key, action_key, scope_type,
                    review_mode, required_role, status, policy_summary,
                    config_json, created_by_user_id, created_at, updated_at
                ) VALUES (
                    1701, 701, 'domain.feature_policy', 'domain.features.configure',
                    'domain', 'domain_admin_review', 'owner_admin', 'active',
                    'Phase 3B Spotlight policy', :config_json, 1,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"config_json": json.dumps({"features": {"spotlight": "admin_only"}, "spotlight": {"cross_community_domain_eligibility": True}})},
        )
        for affiliation_id, affiliate_clan_id in ((710, 2), (711, 3)):
            conn.execute(
                text(
                    """
                    INSERT INTO community_domain_affiliations (
                        id, parent_clan_id, affiliate_clan_id,
                        requested_by_user_id, decided_by_user_id, status,
                        request_note, decision_note, created_at, updated_at, decided_at
                    ) VALUES (
                        :id, 1, :affiliate_clan_id, 1, 1, 'approved',
                        'Request', 'Approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    """
                ),
                {"id": affiliation_id, "affiliate_clan_id": affiliate_clan_id},
            )


def test_community_domain_route_metadata_survives_internally_without_public_membership_disclosure():
    _seed_domain_route()
    _seed_demand(clan_id=3, area="Aberdeen")
    _seed_campaign(origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)
        payload = result.to_internal_dict()

    assert result.matched is True
    routes = payload["eligibility_routes"]
    assert routes[0]["pathway"] == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN
    assert routes[0]["community_domain_id"] == 701
    assert routes[0]["public_disclosure_allowed"] is False
    assert payload["privacy"] == "internal_route_provenance_only"


def test_unlinked_network_repost_row_remains_outside_canonical_matching():
    _seed_users_and_clans(owner_clans=(2,))
    _seed_demand()
    _seed_campaign(origin_clan_id=2)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    99, NULL, 1, 2, 'Plumber available', 'paid', 'marketplace_repost',
                    :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {"expires_at": datetime.now(timezone.utc) + timedelta(days=2)},
        )

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)

    assert result.matched is False
    assert result.rejection_reasons[0].startswith("phase2_not_eligible")


def test_legacy_preserved_campaign_remains_excluded():
    _seed_users_and_clans()
    _seed_demand()
    _seed_campaign(status="legacy_preserved")

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)

    assert result.matched is False
    assert "legacy_preserved" in result.rejection_reasons[0]


def test_product_backed_campaign_without_explicit_semantics_does_not_fabricate_strong_match():
    _seed_users_and_clans()
    _seed_demand(category="school bags", title="Need school bags")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (id, clan_id, owner_user_id, shop_name, description, is_active)
                VALUES (1, 1, 2, 'Product Shop', 'Products', 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    visibility_mode, is_active, created_at
                ) VALUES (
                    1, 1, 1, 2, 'School bags', 'Durable bags',
                    'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
    _seed_campaign(
        content_kind="marketplace_product",
        source_product_id=1,
        opportunity_category="product",
        opportunity_subcategory=None,
        opportunity_keywords=None,
    )

    with SessionLocal() as db:
        result = evaluate_spotlight_demand_match(db, demand_id=1, campaign_id=1, current_user_id=1)

    assert result.matched is False
    assert result.match_strength == MATCH_STRENGTH_NONE
    assert result.rejection_reasons == (REJECTION_SEMANTIC_MISMATCH,)
