from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path


import pytest
from fastapi import HTTPException
from sqlalchemy import text

from app.api.routes import marketplace_requests
from app.db.database import SessionLocal, engine

ROOT = Path(__file__).resolve().parents[1]

class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


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
    source = (ROOT / "app/services/demand_supply_intelligence_service.py").read_text()
    lowered = source.lower()

    assert "featureentitlement" not in source
    assert "marketplacebroadcast" not in source
    assert "spotlight" not in lowered
    assert "trust_score" not in lowered
    assert "cci" not in lowered


def _table_count(table_name: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one())


def _route_user(user_id: int) -> Obj:
    return Obj(id=user_id, email=f"user-{user_id}@example.com", role="member")


def test_demand_supply_read_api_returns_authorised_matches_without_private_contacts():
    _seed_base()
    _seed_request(request_id=40)

    with SessionLocal() as db:
        result = marketplace_requests.get_marketplace_request_supply_matches(
            request_id=40,
            db=db,
            current_user=_route_user(1),
            limit=10,
        )

    data = result.model_dump()
    assert data["request_id"] == 40
    assert data["count"] == 1
    assert data["matches"][0]["product_id"] == 100
    assert data["matches"][0]["shop_id"] == 10
    assert data["matches"][0]["public_shop_path"] == (
        "/shop/GSN-U-SELLER?product_id=100&clan_id=1&gsn_source=demand_box_match"
    )
    assert data["matches"][0]["reason_codes"] == [
        REASON_SAME_COMMUNITY,
        REASON_LIVE_DEMAND,
        REASON_ACTIVE_SUPPLY,
        REASON_CATEGORY_MATCH,
        REASON_AREA_COMPATIBLE,
    ]
    assert "seller_user_id" not in data["matches"][0]
    assert "requester_user_id" not in data["matches"][0]
    assert "trust" not in str(data["matches"][0]).lower()
    assert "cci" not in str(data["matches"][0]).lower()


def test_demand_supply_read_api_empty_match_is_normal_200():
    _seed_base()
    _seed_request(request_id=41, category="tailoring", title="Need tailoring")

    with SessionLocal() as db:
        result = marketplace_requests.get_marketplace_request_supply_matches(
            request_id=41,
            db=db,
            current_user=_route_user(1),
            limit=10,
        )

    assert result.count == 0
    assert result.matches == []


def test_demand_supply_read_api_does_not_probe_inaccessible_or_closed_demand():
    _seed_base()
    _seed_request(request_id=42, clan_id=2, user_id=5)
    _seed_request(request_id=43, status="fulfilled")
    _seed_request(request_id=44, status="cancelled")
    _seed_request(request_id=45, status="open", expires_delta=timedelta(hours=-1))

    with SessionLocal() as db:
        for request_id in [42, 43, 44, 45]:
            with pytest.raises(HTTPException) as exc:
                marketplace_requests.get_marketplace_request_supply_matches(
                    request_id=request_id,
                    db=db,
                    current_user=_route_user(1),
                    limit=10,
                )
            assert exc.value.status_code == 404


def test_demand_supply_read_api_preserves_protected_target_visibility():
    _seed_base()
    _seed_request(
        request_id=46,
        title="Need plumbing help from @GSN-U-SELLER",
        description="[GSN_VISIBILITY_SCOPE:protected_target]\n\nPrivate ask for @GSN-U-SELLER",
        category="plumbing",
    )

    with SessionLocal() as db:
        target_result = marketplace_requests.get_marketplace_request_supply_matches(
            request_id=46,
            db=db,
            current_user=_route_user(2),
            limit=10,
        )
        with pytest.raises(HTTPException) as exc:
            marketplace_requests.get_marketplace_request_supply_matches(
                request_id=46,
                db=db,
                current_user=_route_user(3),
                limit=10,
            )

    assert target_result.count == 1
    assert target_result.matches[0].product_id == 100
    assert exc.value.status_code == 404


def test_supply_to_demand_read_api_reuses_reciprocal_matching_boundary():
    _seed_base()
    _seed_request(request_id=47)
    _seed_request(request_id=48, category="food", title="Need food")

    with SessionLocal() as db:
        result = marketplace_requests.get_supply_demand_matches(
            product_id=100,
            db=db,
            current_user=_route_user(1),
            limit=10,
        )
        with pytest.raises(HTTPException) as exc:
            marketplace_requests.get_supply_demand_matches(
                product_id=104,
                db=db,
                current_user=_route_user(1),
                limit=10,
            )

    assert result.product_id == 100
    assert [match.demand_id for match in result.matches] == [47]
    assert exc.value.status_code == 404


def test_demand_supply_match_read_does_not_create_notifications_or_trust_events():
    _seed_base()
    _seed_request(request_id=49)
    before_notifications = _table_count("notifications")
    before_trust_events = _table_count("trust_events")

    with SessionLocal() as db:
        marketplace_requests.get_marketplace_request_supply_matches(
            request_id=49,
            db=db,
            current_user=_route_user(1),
            limit=10,
        )

    assert _table_count("notifications") == before_notifications
    assert _table_count("trust_events") == before_trust_events


def test_demand_supply_attention_events_are_attention_only(client):
    _seed_base()
    _seed_request(request_id=50)
    payloads = [
        {
            "event_type": "match_available",
            "shop_id": 10,
            "product_id": 100,
            "clan_id": 1,
            "source": "demand_box_intelligence",
            "client_event_id": "match-available-50-100",
        },
        {
            "event_type": "matches_opened",
            "shop_id": 10,
            "product_id": 100,
            "clan_id": 1,
            "source": "demand_box_intelligence",
            "client_event_id": "matches-opened-50-100",
        },
        {
            "event_type": "supply_opened",
            "shop_id": 10,
            "product_id": 100,
            "clan_id": 1,
            "source": "demand_box_intelligence",
            "client_event_id": "supply-opened-50-100",
        },
    ]

    for payload in payloads:
        response = client.post("/marketplace/analytics/attention", json=payload)
        assert response.status_code == 200, response.text
        assert response.json()["recorded"] is True

    assert _table_count("marketplace_attention_events") == 3
    assert _table_count("notifications") == 0
    assert _table_count("trust_events") == 0


def test_demand_supply_trade_handoff_does_not_create_until_start_record(client, override_current_user_user):
    _seed_base()
    _seed_request(request_id=60)

    assert _table_count("protected_trade_records") == 0
    assert _table_count("protected_trade_events") == 0
    assert _table_count("trust_events") == 0

    matches_response = client.get("/marketplace/requests/60/supply-matches?limit=10")
    assert matches_response.status_code == 200, matches_response.text
    assert matches_response.json()["count"] == 1
    assert _table_count("protected_trade_records") == 0

    handoff_response = client.get(
        "/marketplace/requests/60/supply-matches/100/trade-handoff?shop_id=10"
    )
    assert handoff_response.status_code == 200, handoff_response.text
    handoff = handoff_response.json()
    assert handoff["source_marker"] == "demand_supply_match"
    assert handoff["product_id"] == 100
    assert handoff["shop_id"] == 10
    assert "seller_user_id" not in handoff
    assert "requester_user_id" not in handoff
    assert _table_count("protected_trade_records") == 0

    attention_response = client.post(
        "/marketplace/analytics/attention",
        json={
            "event_type": "supply_opened",
            "shop_id": 10,
            "product_id": 100,
            "clan_id": 1,
            "source": "demand_box_intelligence",
            "client_event_id": "supply-opened-60-100",
        },
    )
    assert attention_response.status_code == 200, attention_response.text
    assert _table_count("protected_trade_records") == 0

    create_response = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "buyer",
            "source_demand_id": 60,
            "source_match_product_id": 100,
            "source_match_shop_id": 10,
            "source_match_reason_codes": handoff["reason_codes"],
            "item_title": handoff["item_title"],
            "terms_summary": "Requester and provider agreed to inspect the plumbing issue before any payment.",
            "currency": "NGN",
            "meta": {
                "source": "demand_supply_match",
                "not_recommendation": True,
                "not_endorsement": True,
                "not_payment_proof": True,
            },
        },
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["buyer_user_id"] == 1
    assert created["seller_user_id"] == 2
    assert created["shop_id"] == 10
    assert created["product_id"] == 100
    assert created["amount"] is None
    assert created["meta"]["source"] == "demand_supply_match"
    assert created["meta"]["source_demand_id"] == 60
    assert created["meta"]["source_match_product_id"] == 100
    assert created["meta"]["source_match_shop_id"] == 10
    assert created["meta"]["not_recommendation"] is True
    assert created["meta"]["not_endorsement"] is True
    assert created["meta"]["not_payment_proof"] is True
    assert _table_count("protected_trade_records") == 1
    assert _table_count("protected_trade_events") == 1

    with SessionLocal() as db:
        rows = db.execute(text("SELECT event_type, meta_json FROM trust_events ORDER BY id ASC")).fetchall()
    assert [row[0] for row in rows] == ["protected_trade.created"]
    assert "demand_supply_match" in (rows[0][1] or "")


def test_demand_supply_trade_handoff_rejects_tampered_or_inaccessible_context(client, override_current_user_user):
    _seed_base()
    _seed_request(request_id=61)
    _seed_request(
        request_id=62,
        user_id=2,
        description="[GSN_VISIBILITY_SCOPE:protected_target] private plumbing request",
    )

    tampered_shop = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "buyer",
            "source_demand_id": 61,
            "source_match_product_id": 100,
            "source_match_shop_id": 11,
            "item_title": "Emergency Plumbing Repair",
            "terms_summary": "Tampered shop should not create evidence.",
            "currency": "NGN",
        },
    )
    assert tampered_shop.status_code == 403, tampered_shop.text

    protected_target = client.get(
        "/marketplace/requests/62/supply-matches/100/trade-handoff?shop_id=10"
    )
    assert protected_target.status_code == 404, protected_target.text

    inaccessible_create = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "buyer",
            "source_demand_id": 62,
            "source_match_product_id": 100,
            "source_match_shop_id": 10,
            "item_title": "Emergency Plumbing Repair",
            "terms_summary": "Protected target should not create evidence.",
            "currency": "NGN",
        },
    )
    assert inaccessible_create.status_code == 403, inaccessible_create.text
    assert _table_count("protected_trade_records") == 0
    assert _table_count("trust_events") == 0


def test_demand_supply_handoff_supports_services_and_products_without_mandatory_payment(client, override_current_user_user):
    _seed_base()
    cases = [
        (70, 300, "Need painter for kitchen", "painting painter", "Painter on-site service", "Painting and painter service for homes"),
        (71, 301, "Need remote tutor", "tutoring tutor", "Remote tutor listing", "Tutoring and tutor sessions online"),
        (72, 302, "Need laptop delivered", "laptop", "Laptop delivery", "Laptop supply with delivery available"),
    ]
    for request_id, product_id, demand_title, category, product_title, product_description in cases:
        _seed_request(
            request_id=request_id,
            title=demand_title,
            description=demand_title,
            category=category,
            area=None,
        )
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, image_url, video_url, visibility_mode, is_active, created_at
                    )
                    VALUES (:id, 1, 10, 2, :title, :description, NULL, 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP)
                    """
                ),
                {"id": product_id, "title": product_title, "description": product_description},
            )

        response = client.post(
            "/protected-trades",
            json={
                "clan_id": 1,
                "participant_role": "buyer",
                "source_demand_id": request_id,
                "source_match_product_id": product_id,
                "source_match_shop_id": 10,
                "item_title": product_title,
                "terms_summary": f"Requester and provider agreed the next step for {product_title}.",
                "currency": "NGN",
            },
        )
        assert response.status_code == 201, response.text
        created = response.json()
        assert created["amount"] is None
        assert created["buyer_user_id"] == 1
        assert created["seller_user_id"] == 2
        assert created["product_id"] == product_id
        assert created["meta"]["source"] == "demand_supply_match"

    assert _table_count("protected_trade_records") == 3
    assert _table_count("protected_trade_events") == 3
    assert _table_count("trust_events") == 3
