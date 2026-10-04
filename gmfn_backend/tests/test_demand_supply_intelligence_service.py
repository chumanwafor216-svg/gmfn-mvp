from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.demand_supply_intelligence_service import (
    REASON_ACTIVE_SUPPLY,
    REASON_AREA_COMPATIBLE,
    REASON_CATEGORY_MATCH,
    REASON_LIVE_DEMAND,
    REASON_SAME_COMMUNITY,
    demand_supply_coverage_summary,
    find_demands_for_supply,
    find_supply_for_demand,
)


def _seed_base() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name, trust_score)
                VALUES
                    (1, 'member@example.com', 'hashed', 'member', 'GSN-U-MEMBER', 'Member One', 10),
                    (2, 'seller@example.com', 'hashed', 'member', 'GSN-U-SELLER', 'Plumbing Seller', 10),
                    (3, 'seller-two@example.com', 'hashed', 'member', 'GSN-U-SELLER2', 'Food Seller', 99),
                    (4, 'inactive@example.com', 'hashed', 'member', 'GSN-U-INACTIVE', 'Inactive Seller', 99),
                    (5, 'other@example.com', 'hashed', 'member', 'GSN-U-OTHER', 'Other Seller', 99)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at
                )
                VALUES
                    (1, 'Blessed Community', 'Blessed Marketplace', 'GMFN-C-000001', 'active', 'invite-1', 0, CURRENT_TIMESTAMP),
                    (2, 'Other Community', 'Other Marketplace', 'GMFN-C-000002', 'active', 'invite-2', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, 2, 'member', 0),
                    (3, 1, 3, 'member', 0),
                    (4, 1, 4, 'member', 0),
                    (5, 2, 5, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                )
                VALUES
                    (10, 1, 2, 'Blessed Plumbing Shop', 'Repairs in Ajah and Lekki', 1, CURRENT_TIMESTAMP),
                    (11, 1, 3, 'Blessed Food Shop', 'Rice and food staples in Ajah', 1, CURRENT_TIMESTAMP),
                    (12, 1, 4, 'Inactive Plumbing Shop', 'Plumbing but closed', 0, CURRENT_TIMESTAMP),
                    (20, 2, 5, 'Other Plumbing Shop', 'Plumbing in another community', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode, is_active, created_at
                )
                VALUES
                    (100, 1, 10, 2, 'Emergency Plumbing Repair', 'Plumbing service for Ajah homes', '12000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP),
                    (101, 1, 11, 3, 'Food Rice Bags', 'Food staples and rice', '25000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP),
                    (102, 1, 10, 2, 'Dormant Plumbing Listing', 'Plumbing but unavailable', '12000', 'NGN', NULL, NULL, 'community_visible', 0, CURRENT_TIMESTAMP),
                    (103, 1, 12, 4, 'Closed Shop Plumbing', 'Plumbing from inactive shop', '12000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP),
                    (104, 1, 10, 2, 'Private Plumbing Vault', 'Plumbing hidden in vault', '12000', 'NGN', NULL, NULL, 'vault_private', 1, CURRENT_TIMESTAMP),
                    (200, 2, 20, 5, 'Other Community Plumbing', 'Plumbing outside allowed community', '12000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP)
                """
            )
        )


def _seed_request(
    *,
    request_id: int,
    clan_id: int = 1,
    user_id: int = 1,
    title: str = "Need urgent plumbing help",
    description: str = "Pipe leak near Ajah",
    category: str = "plumbing",
    area: str | None = "Ajah",
    status: str = "open",
    expires_delta: timedelta | None = timedelta(days=1),
) -> None:
    expires_at = None
    if expires_delta is not None:
        expires_at = datetime.now(timezone.utc) + expires_delta
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                )
                VALUES (
                    :id, :clan_id, :user_id, :title, :description, :category, 'medium',
                    :area, 'cash', 0, :status, :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": request_id,
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


def test_same_community_demand_finds_active_category_supply_with_reason_codes():
    _seed_base()
    _seed_request(request_id=1)

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=1, current_user_id=1)

    assert [match["product_id"] for match in matches] == [100]
    assert matches[0]["reason_codes"] == [
        REASON_SAME_COMMUNITY,
        REASON_LIVE_DEMAND,
        REASON_ACTIVE_SUPPLY,
        REASON_CATEGORY_MATCH,
        REASON_AREA_COMPATIBLE,
    ]
    assert "seller_user_id" not in matches[0]
    assert "requester_user_id" not in matches[0]


def test_wrong_category_and_inactive_private_or_cross_community_supply_are_excluded():
    _seed_base()
    _seed_request(request_id=1)

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=1, current_user_id=1)

    product_ids = {match["product_id"] for match in matches}
    assert 100 in product_ids
    assert 101 not in product_ids
    assert 102 not in product_ids
    assert 103 not in product_ids
    assert 104 not in product_ids
    assert 200 not in product_ids


def test_closed_or_expired_demand_is_not_matched():
    _seed_base()
    _seed_request(request_id=1, status="fulfilled")
    _seed_request(request_id=2, status="cancelled")
    _seed_request(request_id=3, status="open", expires_delta=timedelta(hours=-1))

    with SessionLocal() as db:
        assert find_supply_for_demand(db, demand_id=1, current_user_id=1) == []
        assert find_supply_for_demand(db, demand_id=2, current_user_id=1) == []
        assert find_supply_for_demand(db, demand_id=3, current_user_id=1) == []


def test_non_member_cannot_see_other_community_demand_matches():
    _seed_base()
    _seed_request(request_id=1, clan_id=2, user_id=4)

    with SessionLocal() as db:
        assert find_supply_for_demand(db, demand_id=1, current_user_id=1) == []


def test_paid_spotlight_and_trust_posture_do_not_alter_organic_matching():
    _seed_base()
    _seed_request(request_id=1)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    revoked_at, payment_reference, created_at, updated_at
                )
                VALUES (
                    1, 3, 1, 11, 'spotlight_priority', 'spotlight_credit_pack',
                    10, 0, 'active', CURRENT_TIMESTAMP, NULL,
                    NULL, 'paid-food-spotlight', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=1, current_user_id=1)

    assert [match["product_id"] for match in matches] == [100]
    assert all("TRUST" not in code and "CCI" not in code for match in matches for code in match["reason_codes"])


def test_supply_to_demand_reciprocal_query_uses_same_rules():
    _seed_base()
    _seed_request(request_id=1)
    _seed_request(request_id=2, category="food", title="Need food", description="Need rice")

    with SessionLocal() as db:
        plumbing_matches = find_demands_for_supply(db, product_id=100, current_user_id=1)
        food_matches = find_demands_for_supply(db, product_id=101, current_user_id=1)

    assert [match["demand_id"] for match in plumbing_matches] == [1]
    assert [match["demand_id"] for match in food_matches] == [2]


def test_coverage_summary_counts_visible_live_demands_with_supply_matches():
    _seed_base()
    _seed_request(request_id=1)
    _seed_request(request_id=2, category="tailoring", title="Need tailoring")
    _seed_request(request_id=3, status="fulfilled")

    with SessionLocal() as db:
        summary = demand_supply_coverage_summary(db, current_user_id=1, clan_id=1)

    assert summary == {
        "visible_live_demands": 2,
        "demands_with_plausible_supply": 1,
        "demands_without_plausible_supply": 1,
        "sample_matched_demand_ids": [1],
        "sample_unmatched_demand_ids": [2],
        "sample_match_count": 1,
        "instrumentation_scope": "same_community_visible_live_demands",
    }


def _seed_product(
    *,
    product_id: int,
    title: str,
    description: str,
    shop_id: int = 10,
    seller_user_id: int = 2,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode, is_active, created_at
                )
                VALUES (
                    :id, 1, :shop_id, :seller_user_id, :title, :description,
                    '10000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "id": product_id,
                "shop_id": shop_id,
                "seller_user_id": seller_user_id,
                "title": title,
                "description": description,
            },
        )


def test_service_text_matching_handles_painter_painting_without_new_taxonomy():
    _seed_base()
    _seed_product(
        product_id=300,
        title="Room Painter Service",
        description="Interior painting for rooms and flats",
    )
    _seed_request(
        request_id=30,
        title="Need a painter",
        description="One small room needs painting",
        category="painting",
        area=None,
    )

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=30, current_user_id=1)

    assert [match["product_id"] for match in matches] == [300]
    assert REASON_CATEGORY_MATCH in matches[0]["reason_codes"]


def test_service_text_matching_handles_tutor_tutoring_with_metadata_prefixes():
    _seed_base()
    _seed_product(
        product_id=301,
        title="[BLOCK:2] Maths Tutoring",
        description="[LABEL:Weekend] Tutor support for exam preparation",
    )
    _seed_request(
        request_id=31,
        title="Need a maths tutor",
        description="Looking for tutoring after school",
        category="services",
        area=None,
    )

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=31, current_user_id=1)

    assert [match["product_id"] for match in matches] == [301]


def test_service_text_matching_handles_accountant_accounting():
    _seed_base()
    _seed_product(
        product_id=302,
        title="Small Business Accounting",
        description="Accountant service for records and tax preparation",
    )
    _seed_request(
        request_id=32,
        title="Need an accountant",
        description="Accounting help for a small shop",
        category="accountant",
        area=None,
    )

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=32, current_user_id=1)

    assert [match["product_id"] for match in matches] == [302]


def test_generic_category_uses_legitimate_demand_text_but_not_unrelated_service():
    _seed_base()
    _seed_product(
        product_id=303,
        title="Room Painting Service",
        description="Painter available for small rooms",
    )
    _seed_product(
        product_id=304,
        title="Math Tutor Service",
        description="Tutoring for junior students",
    )
    _seed_request(
        request_id=33,
        title="Need a painter",
        description="Painting for one bedroom",
        category="home services",
        area=None,
    )

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=33, current_user_id=1)

    assert [match["product_id"] for match in matches] == [303]


def test_stop_words_alone_cannot_create_a_demand_supply_match():
    _seed_base()
    _seed_product(
        product_id=305,
        title="The Good Community Service",
        description="General offer for the community",
    )
    _seed_request(
        request_id=34,
        title="Need the and with",
        description="General community service request",
        category="the and with general service",
        area=None,
    )

    with SessionLocal() as db:
        matches = find_supply_for_demand(db, demand_id=34, current_user_id=1)

    assert matches == []
def test_intelligence_service_does_not_depend_on_paid_or_trust_ranking_engines():
    source = Path("gmfn_backend/app/services/demand_supply_intelligence_service.py").read_text()
    lowered = source.lower()

    assert "featureentitlement" not in source
    assert "marketplacebroadcast" not in source
    assert "spotlight" not in lowered
    assert "trust_score" not in lowered
    assert "cci" not in lowered