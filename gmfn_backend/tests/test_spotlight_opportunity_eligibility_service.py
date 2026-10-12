from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.security import create_access_token
from app.db.database import SessionLocal, engine
from app.services.spotlight_opportunity_eligibility_service import (
    REJECTION_CAMPAIGN_EXPIRED,
    REJECTION_CAMPAIGN_NOT_ACTIVE,
    REJECTION_DOMAIN_ROUTE_NOT_PERMITTED,
    REJECTION_DOMAIN_SPOTLIGHT_DISABLED,
    REJECTION_LEGACY_PRESERVED,
    REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP,
    REJECTION_NO_ELIGIBLE_ROUTE,
    REJECTION_SELF_DELIVERY,
    SPOTLIGHT_ELIGIBILITY_DISCLOSURE_INTERNAL_ONLY,
    SPOTLIGHT_ELIGIBILITY_EVIDENCE_COMMUNITY_DOMAIN,
    SPOTLIGHT_ELIGIBILITY_EVIDENCE_DIRECT_MEMBERSHIP,
    SPOTLIGHT_ELIGIBILITY_EVIDENCE_LINKED_PLACEMENT,
    SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT,
    SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
    SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
    evaluate_spotlight_eligibility,
    evaluate_spotlight_eligibility_batch,
)

def _seed_users_and_clans(*, clan_statuses: dict[int, str] | None = None) -> None:
    clan_statuses = clan_statuses or {}
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES
                    (1, 'owner@example.com', 'hashed', 'Owner One', 'user', 'GSN-U-OWNER'),
                    (2, 'viewer@example.com', 'hashed', 'Viewer Two', 'user', 'GSN-U-VIEWER'),
                    (3, 'other-owner@example.com', 'hashed', 'Owner Three', 'user', 'GSN-U-OWNER3'),
                    (4, 'extra@example.com', 'hashed', 'Extra Four', 'user', 'GSN-U-EXTRA')
                """
            )
        )
        values = []
        for clan_id, name in (
            (1, "Origin Community"),
            (2, "Shared Community"),
            (3, "Second Shared Community"),
            (4, "Placement Target Community"),
            (5, "Dormant Community"),
        ):
            values.append(
                {
                    "id": clan_id,
                    "name": name,
                    "marketplace_name": f"{name} Marketplace",
                    "community_code": f"GMFN-C-00000{clan_id}",
                    "invite_code": f"ELIG-{clan_id}",
                    "status": clan_statuses.get(clan_id, "active"),
                }
            )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, invite_code,
                    status, invite_uses, created_at
                ) VALUES (
                    :id, :name, :marketplace_name, :community_code,
                    :invite_code, :status, 0, CURRENT_TIMESTAMP
                )
                """
            ),
            values,
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    is_active, created_at
                ) VALUES
                    (1, 1, 1, 'Owner Shop', 'Eligibility shop', 1, CURRENT_TIMESTAMP),
                    (3, 1, 3, 'Other Owner Shop', 'Eligibility shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )


def _seed_memberships(rows: list[tuple[int, int, int, bool]]) -> None:
    if not rows:
        return
    params = []
    now = datetime.now(timezone.utc)
    for row_id, clan_id, user_id, left in rows:
        params.append(
            {
                "id": row_id,
                "clan_id": clan_id,
                "user_id": user_id,
                "left_at": now if left else None,
            }
        )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance, left_at
                ) VALUES (
                    :id, :clan_id, :user_id, 'member', 0, :left_at
                )
                """
            ),
            params,
        )


def _seed_campaign(
    *,
    campaign_id: int = 1,
    owner_user_id: int = 1,
    shop_id: int = 1,
    origin_clan_id: int = 1,
    status: str = "active",
    distribution_scope: str = "direct_communities",
    expires_delta: timedelta | None = timedelta(days=1),
) -> None:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    expires_at = None if expires_delta is None else now + expires_delta
    fingerprint = (str(campaign_id % 10) * 64)[:64]
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, shop_id, origin_clan_id, source_product_id,
                    content_kind, content_fingerprint, status, source_kind,
                    commercial_mode, distribution_scope, created_at, activated_at,
                    expires_at
                ) VALUES (
                    :campaign_id, :owner_user_id, :shop_id, :origin_clan_id,
                    NULL, 'broadcast_snapshot', :fingerprint, :status,
                    'direct_broadcast', 'free', :distribution_scope,
                    :created_at, :created_at, :expires_at
                )
                """
            ),
            {
                "campaign_id": campaign_id,
                "owner_user_id": owner_user_id,
                "shop_id": shop_id,
                "origin_clan_id": origin_clan_id,
                "fingerprint": fingerprint,
                "status": status,
                "distribution_scope": distribution_scope,
                "created_at": now,
                "expires_at": expires_at,
            },
        )


def _seed_broadcast(
    *,
    broadcast_id: int,
    campaign_id: int | None,
    clan_id: int,
    author_user_id: int = 1,
    shop_id: int = 1,
    message: str = "Canonical Spotlight",
    visibility_scope: str = "direct_communities",
    expires_delta: timedelta | None = timedelta(days=1),
) -> None:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    expires_at = None if expires_delta is None else now + expires_delta
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, shop_id,
                    message, priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :broadcast_id, :campaign_id, :clan_id, :author_user_id,
                    :shop_id, :message, 'free', :visibility_scope,
                    :expires_at, :created_at
                )
                """
            ),
            {
                "broadcast_id": broadcast_id,
                "campaign_id": campaign_id,
                "clan_id": clan_id,
                "author_user_id": author_user_id,
                "shop_id": shop_id,
                "message": message,
                "visibility_scope": visibility_scope,
                "expires_at": expires_at,
                "created_at": now,
            },
        )


def _seed_spotlight_domain_policy_off(*, clan_id: int = 2) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, clan_id, status, verification_status,
                    created_at, updated_at
                ) VALUES (
                    901, 'spotlight-eligibility-policy', 'Spotlight Eligibility Policy',
                    'ngo_project_network', 'ngo_project_network', 1, :clan_id,
                    'active', 'unverified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"clan_id": clan_id},
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id, community_domain_id, policy_key, action_key, scope_type,
                    review_mode, required_role, status, policy_summary,
                    config_json, created_by_user_id, created_at, updated_at
                ) VALUES (
                    902, 901, 'domain.feature_policy', 'domain.features.configure',
                    'domain', 'domain_admin_review', 'owner_admin', 'active',
                    'Disable Spotlight for eligibility test',
                    '{"features":{"spotlight":"off"}}', 1,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )


def _seed_community_domain_route_policy(
    *,
    domain_id: int = 701,
    root_clan_id: int = 1,
    affiliate_clan_ids: list[int] | None = None,
    domain_status: str = "active",
    feature_mode: str = "admin_only",
    cross_allowed: bool = True,
    affiliation_status_by_clan: dict[int, str] | None = None,
) -> None:
    affiliate_clan_ids = affiliate_clan_ids or []
    affiliation_status_by_clan = affiliation_status_by_clan or {}
    config = {
        "features": {"spotlight": feature_mode},
        "spotlight": {"cross_community_domain_eligibility": cross_allowed},
    }
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, clan_id, status, verification_status,
                    created_at, updated_at
                ) VALUES (
                    :domain_id, :domain_name, :display_name,
                    'ngo_project_network', 'ngo_project_network', 1, :root_clan_id,
                    :domain_status, 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "domain_id": domain_id,
                "domain_name": f"spotlight-domain-{domain_id}",
                "display_name": f"Spotlight Domain {domain_id}",
                "root_clan_id": root_clan_id,
                "domain_status": domain_status,
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
                    'Spotlight Opportunity Engine domain eligibility policy',
                    :config_json, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "policy_id": domain_id + 1000,
                "domain_id": domain_id,
                "config_json": json.dumps(config),
            },
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
                        :affiliation_id, :root_clan_id, :affiliate_clan_id, 1,
                        1, :status, 'Domain branch request.', 'Approved branch.',
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "affiliation_id": domain_id + (index * 10),
                    "root_clan_id": root_clan_id,
                    "affiliate_clan_id": affiliate_clan_id,
                    "status": affiliation_status_by_clan.get(affiliate_clan_id, "approved"),
                },
            )
def test_active_canonical_campaign_shared_membership_is_eligible():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 2, 2, False)])
    _seed_campaign(campaign_id=1, origin_clan_id=1)

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is True
    assert result.campaign_id == 1
    assert result.origin_clan_id == 1
    assert len(result.routes) == 1
    assert result.routes[0].pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY
    assert result.routes[0].route_clan_id == 2
    assert result.routes[0].evidence == SPOTLIGHT_ELIGIBILITY_EVIDENCE_DIRECT_MEMBERSHIP
    assert result.routes[0].disclosure == SPOTLIGHT_ELIGIBILITY_DISCLOSURE_INTERNAL_ONLY
    assert result.routes[0].public_disclosure_allowed is False


def test_campaign_state_rules_exclude_ended_expired_legacy_and_stale_active():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 2, 2, False)])
    _seed_campaign(campaign_id=1, status="ended")
    _seed_campaign(campaign_id=2, status="expired")
    _seed_campaign(campaign_id=3, status="legacy_preserved")
    _seed_campaign(campaign_id=4, status="active", expires_delta=timedelta(hours=-1))

    with SessionLocal() as db:
        results = evaluate_spotlight_eligibility_batch(
            db,
            viewer_user_id=2,
            campaign_ids=[1, 2, 3, 4],
        )

    assert [result.eligible for result in results] == [False, False, False, False]
    assert [result.rejection_code for result in results] == [
        REJECTION_CAMPAIGN_NOT_ACTIVE,
        REJECTION_CAMPAIGN_NOT_ACTIVE,
        REJECTION_LEGACY_PRESERVED,
        REJECTION_CAMPAIGN_EXPIRED,
    ]


def test_pending_join_request_does_not_create_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False)])
    _seed_campaign(campaign_id=1)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clan_join_requests (id, clan_id, applicant_user_id, status, created_at)
                VALUES (1, 2, 2, 'pending', CURRENT_TIMESTAMP)
                """
            )
        )

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP


def test_left_membership_does_not_create_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 2, 2, True)])
    _seed_campaign(campaign_id=1)

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP


def test_dormant_community_membership_does_not_create_eligibility():
    _seed_users_and_clans(clan_statuses={5: "dormant"})
    _seed_memberships([(1, 5, 1, False), (2, 5, 2, False)])
    _seed_campaign(campaign_id=1, origin_clan_id=5)

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP


def test_no_shared_legitimate_route_is_ineligible():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1, False), (2, 2, 2, False)])
    _seed_campaign(campaign_id=1)

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE


def test_multiple_direct_routes_return_one_campaign_with_deduped_routes_and_stable_origin():
    _seed_users_and_clans()
    _seed_memberships(
        [
            (1, 2, 1, False),
            (2, 3, 1, False),
            (3, 2, 2, False),
            (4, 3, 2, False),
        ]
    )
    _seed_campaign(campaign_id=1, origin_clan_id=1)
    _seed_broadcast(broadcast_id=1, campaign_id=1, clan_id=2)
    _seed_broadcast(broadcast_id=2, campaign_id=1, clan_id=2)
    _seed_broadcast(broadcast_id=3, campaign_id=1, clan_id=3)

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is True
    assert result.campaign_id == 1
    assert result.origin_clan_id == 1
    assert [(route.pathway, route.route_clan_id) for route in result.routes] == [
        (SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, 2),
        (SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY, 3),
    ]
    assert [route.evidence for route in result.routes] == [
        SPOTLIGHT_ELIGIBILITY_EVIDENCE_LINKED_PLACEMENT,
        SPOTLIGHT_ELIGIBILITY_EVIDENCE_LINKED_PLACEMENT,
    ]
    assert result.to_internal_dict()["route_clan_ids"] == [2, 3]


def test_linked_canonical_placement_can_create_route_without_owner_membership():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1, False), (2, 4, 2, False)])
    _seed_campaign(campaign_id=1, distribution_scope="marketplace_repost")
    _seed_broadcast(
        broadcast_id=1,
        campaign_id=1,
        clan_id=4,
        visibility_scope="marketplace_repost",
    )

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is True
    assert len(result.routes) == 1
    assert result.routes[0].pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_CANONICAL_PLACEMENT
    assert result.routes[0].route_clan_id == 4
    assert result.routes[0].placement_broadcast_id == 1
    assert result.routes[0].evidence == SPOTLIGHT_ELIGIBILITY_EVIDENCE_LINKED_PLACEMENT


def test_unlinked_arbitrary_repost_does_not_create_canonical_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1, False), (2, 4, 2, False)])
    _seed_campaign(campaign_id=1)
    _seed_broadcast(
        broadcast_id=1,
        campaign_id=None,
        clan_id=4,
        message="Unlinked arbitrary repost",
        visibility_scope="marketplace_repost",
    )

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE
    assert result.routes == ()


def test_unrelated_broadcast_row_cannot_make_campaign_eligible_by_owner_or_shop():
    _seed_users_and_clans()
    _seed_memberships([(1, 1, 1, False), (2, 4, 2, False)])
    _seed_campaign(campaign_id=1)
    _seed_broadcast(
        broadcast_id=1,
        campaign_id=None,
        clan_id=4,
        author_user_id=1,
        shop_id=1,
        message="Same owner and shop but not linked",
    )

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE


def test_self_delivery_is_excluded_from_opportunity_engine_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False)])
    _seed_campaign(campaign_id=1)

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=1, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_SELF_DELIVERY


def test_community_domain_spotlight_disabled_blocks_route():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 2, 2, False)])
    _seed_campaign(campaign_id=1)
    _seed_broadcast(broadcast_id=1, campaign_id=1, clan_id=2)
    _seed_spotlight_domain_policy_off(clan_id=2)

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_DOMAIN_SPOTLIGHT_DISABLED
    assert result.rejected_route_codes == (REJECTION_DOMAIN_SPOTLIGHT_DISABLED,)


def test_public_broadcast_output_does_not_expose_private_eligibility_routes(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-spotlight-eligibility-secret")
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 2, 2, False)])
    _seed_campaign(campaign_id=1)
    _seed_broadcast(broadcast_id=1, campaign_id=1, clan_id=2)

    token = create_access_token({"sub": "viewer@example.com"})
    response = client.get(
        "/marketplace/broadcasts?clan_id=2&active_only=true",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    item = response.json()["items"][0]
    assert item["spotlight_campaign_id"] == 1
    assert "eligibility_routes" not in item
    assert "route_clan_ids" not in item
    assert "owner_membership" not in item





def test_same_active_domain_different_branches_can_create_domain_route():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is True
    assert result.campaign_id == 1
    assert result.origin_clan_id == 2
    assert len(result.routes) == 1
    route = result.routes[0]
    assert route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN
    assert route.evidence == SPOTLIGHT_ELIGIBILITY_EVIDENCE_COMMUNITY_DOMAIN
    assert route.community_domain_id == 701
    assert route.domain_root_clan_id == 1
    assert route.owner_branch_clan_id == 2
    assert route.viewer_branch_clan_id == 3
    assert route.route_clan_id == 3
    assert route.public_disclosure_allowed is False


def test_same_immediate_community_retains_direct_and_domain_routes_when_scope_permits():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 2, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is True
    assert result.campaign_id == 1
    assert [route.pathway for route in result.routes] == [
        SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY,
        SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN,
    ]
    assert result.routes[0].route_clan_id == 2
    assert result.routes[1].community_domain_id == 701
    assert result.routes[1].owner_branch_clan_id == 2
    assert result.routes[1].viewer_branch_clan_id == 2


def test_domain_route_still_returns_one_campaign_with_direct_and_domain_paths():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 2, 2, False), (3, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        results = evaluate_spotlight_eligibility_batch(db, viewer_user_id=2, campaign_ids=[1])

    assert len(results) == 1
    assert results[0].eligible is True
    assert results[0].campaign_id == 1
    assert SPOTLIGHT_ELIGIBILITY_ROUTE_DIRECT_SHARED_COMMUNITY in [route.pathway for route in results[0].routes]
    assert SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN in [route.pathway for route in results[0].routes]


def test_different_unrelated_domains_do_not_create_domain_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 4, 2, False)])
    _seed_community_domain_route_policy(domain_id=701, root_clan_id=1, affiliate_clan_ids=[2])
    _seed_community_domain_route_policy(domain_id=801, root_clan_id=3, affiliate_clan_ids=[4])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE
    assert result.routes == ()


def test_inactive_domain_affiliation_does_not_create_domain_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(
        root_clan_id=1,
        affiliate_clan_ids=[2, 3],
        affiliation_status_by_clan={3: "pending"},
    )
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE


def test_inactive_owner_or_viewer_branch_blocks_domain_eligibility():
    _seed_users_and_clans(clan_statuses={2: "dormant", 3: "dormant"})
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP


def test_left_owner_membership_blocks_domain_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, True), (2, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE


def test_left_viewer_membership_blocks_domain_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, True)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ACTIVE_VIEWER_MEMBERSHIP


def test_spotlight_disabled_domain_blocks_domain_eligibility():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(
        root_clan_id=1,
        affiliate_clan_ids=[2, 3],
        feature_mode="off",
    )
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_DOMAIN_SPOTLIGHT_DISABLED
    assert result.rejected_route_codes == (REJECTION_DOMAIN_SPOTLIGHT_DISABLED,)


def test_spotlight_disabled_branch_policy_cannot_be_bypassed_through_domain():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_spotlight_domain_policy_off(clan_id=3)
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_DOMAIN_SPOTLIGHT_DISABLED


def test_cross_community_domain_permission_is_required():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(
        root_clan_id=1,
        affiliate_clan_ids=[2, 3],
        cross_allowed=False,
    )
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_DOMAIN_ROUTE_NOT_PERMITTED
    assert result.rejected_route_codes == (REJECTION_DOMAIN_ROUTE_NOT_PERMITTED,)


def test_local_only_distribution_is_not_silently_widened_to_domain_route():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="direct_communities")

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE
    assert result.routes == ()


def test_multiple_domain_relationships_and_memberships_are_deduped_under_one_candidate():
    _seed_users_and_clans()
    _seed_memberships(
        [
            (1, 2, 1, False),
            (2, 4, 1, False),
            (3, 3, 2, False),
            (4, 5, 2, False),
        ]
    )
    _seed_community_domain_route_policy(domain_id=701, root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_community_domain_route_policy(domain_id=801, root_clan_id=4, affiliate_clan_ids=[5])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        results = evaluate_spotlight_eligibility_batch(db, viewer_user_id=2, campaign_ids=[1])

    assert len(results) == 1
    assert results[0].eligible is True
    domain_routes = [
        route for route in results[0].routes
        if route.pathway == SPOTLIGHT_ELIGIBILITY_ROUTE_COMMUNITY_DOMAIN
    ]
    assert [(route.community_domain_id, route.owner_branch_clan_id, route.viewer_branch_clan_id) for route in domain_routes] == [
        (701, 2, 3),
        (801, 4, 5),
    ]
    assert results[0].to_internal_dict()["routes"][0]["disclosure"] == SPOTLIGHT_ELIGIBILITY_DISCLOSURE_INTERNAL_ONLY


def test_domain_route_does_not_resurrect_unlinked_network_reposts():
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="direct_communities")
    _seed_broadcast(
        broadcast_id=1,
        campaign_id=None,
        clan_id=3,
        message="Unlinked same-domain repost",
        visibility_scope="marketplace_repost",
    )

    with SessionLocal() as db:
        result = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)

    assert result.eligible is False
    assert result.rejection_code == REJECTION_NO_ELIGIBLE_ROUTE
    assert result.routes == ()


def test_existing_public_broadcast_feed_does_not_serve_domain_eligible_campaign(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-spotlight-domain-eligibility-secret")
    _seed_users_and_clans()
    _seed_memberships([(1, 2, 1, False), (2, 3, 2, False)])
    _seed_community_domain_route_policy(root_clan_id=1, affiliate_clan_ids=[2, 3])
    _seed_campaign(campaign_id=1, origin_clan_id=2, distribution_scope="community_domain")

    with SessionLocal() as db:
        eligibility = evaluate_spotlight_eligibility(db, viewer_user_id=2, campaign_id=1)
    assert eligibility.eligible is True

    token = create_access_token({"sub": "viewer@example.com"})
    response = client.get(
        "/marketplace/broadcasts?clan_id=3&active_only=true",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["items"] == []
    assert response.json()["total"] == 0
