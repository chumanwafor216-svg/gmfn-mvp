from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.api.routes import marketplace as marketplace_routes
from app.db.database import engine


READY_IMAGE_URL = "https://cdn.example.test/spotlight-ready.jpg"


def _seed_owner_shop(*, target_clan: bool = False, entitlement: bool = False) -> None:
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES (1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-META')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code, community_code, status)
                VALUES (1, 'Source Community', 'Source Market', 'META1', 'GMFN-C-000001', 'active')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (id, clan_id, owner_user_id, shop_name, description, is_active)
                VALUES (1, 1, 1, 'Metadata Shop', 'Phase 3A test shop', 1)
                """
            )
        )
        if target_clan:
            conn.execute(
                text(
                    """
                    INSERT INTO clans (id, name, marketplace_name, invite_code, community_code, status)
                    VALUES (2, 'Target Community', 'Target Market', 'META2', 'GMFN-C-000002', 'active')
                    """
                )
            )
        if entitlement:
            conn.execute(
                text(
                    """
                    INSERT INTO feature_entitlements (
                        id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                        quantity_total, quantity_used, status, starts_at, expires_at,
                        payment_reference
                    ) VALUES (
                        1, 1, 1, 1, 'spotlight_priority', 'spotlight_credit_pack',
                        5, 0, 'active', :starts_at, :expires_at, 'GMFN-SPOT-META'
                    )
                    """
                ),
                {
                    "starts_at": now - timedelta(minutes=1),
                    "expires_at": now + timedelta(days=30),
                },
            )


def _campaign_row() -> dict[str, object]:
    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT *
                FROM spotlight_campaigns
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).mappings().one()
        return dict(row)


def test_direct_spotlight_campaign_stores_offer_metadata_on_campaign_not_broadcast(
    client,
    override_current_user_user,
):
    _seed_owner_shop()
    opportunity_expires_at = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()

    response = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Accounting consultation slots open",
            "image_url": READY_IMAGE_URL,
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
            "opportunity_intent": "offer",
            "opportunity_category": "professional_service",
            "opportunity_subcategory": "accountant",
            "opportunity_keywords": ["Accounting", "Tax help", "Accounting"],
            "opportunity_geo_scope": "local",
            "opportunity_country": "United Kingdom",
            "opportunity_region": "Scotland",
            "opportunity_locality": "Aberdeen",
            "opportunity_remote_available": True,
            "opportunity_availability": "available",
            "opportunity_expires_at": opportunity_expires_at,
        },
    )
    assert response.status_code == 200, response.text

    campaign = _campaign_row()
    assert campaign["opportunity_intent"] == "offer"
    assert campaign["opportunity_category"] == "professional_service"
    assert campaign["opportunity_subcategory"] == "accountant"
    assert json.loads(campaign["opportunity_keywords_json"]) == ["accounting", "tax help"]
    assert campaign["opportunity_geo_scope"] == "local"
    assert campaign["opportunity_country"] == "United Kingdom"
    assert campaign["opportunity_region"] == "Scotland"
    assert campaign["opportunity_locality"] == "Aberdeen"
    assert bool(campaign["opportunity_remote_available"]) is True
    assert campaign["opportunity_availability"] == "available"
    assert campaign["opportunity_expires_at"] is not None

    with engine.begin() as conn:
        broadcast_columns = {
            row[1] for row in conn.execute(text("PRAGMA table_info(marketplace_broadcasts)")).fetchall()
        }
    assert "opportunity_intent" not in broadcast_columns
    assert "opportunity_category" not in broadcast_columns


def test_direct_spotlight_campaign_can_store_need_metadata(client, override_current_user_user):
    _seed_owner_shop()

    response = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Need volunteers for Saturday food packing",
            "image_url": READY_IMAGE_URL,
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
            "opportunity_intent": "need",
            "opportunity_category": "volunteering",
            "opportunity_subcategory": "food packing",
            "opportunity_geo_scope": "community",
            "opportunity_availability": "available",
        },
    )
    assert response.status_code == 200, response.text

    campaign = _campaign_row()
    assert campaign["opportunity_intent"] == "need"
    assert campaign["opportunity_category"] == "volunteering"
    assert campaign["opportunity_subcategory"] == "food packing"


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("opportunity_intent", "selling-ish"),
        ("opportunity_category", "plumbing"),
        ("opportunity_geo_scope", "postcode"),
        ("opportunity_availability", "maybe"),
    ],
)
def test_direct_spotlight_rejects_invalid_opportunity_metadata(
    client,
    override_current_user_user,
    field: str,
    value: str,
):
    _seed_owner_shop()
    payload = {
        "clan_id": 1,
        "shop_id": 1,
        "message": "Metadata validation post",
        "image_url": READY_IMAGE_URL,
        "priority_mode": "free",
        "visibility_scope": "direct_communities",
    }
    payload[field] = value

    response = client.post("/marketplace/broadcasts", json=payload)

    assert response.status_code == 400, response.text
    assert response.json()["detail"]["code"] == "invalid_spotlight_opportunity_metadata"
    assert response.json()["detail"]["field"] == field


def test_legacy_campaign_insert_defaults_to_unspecified_without_fabricated_metadata():
    _seed_owner_shop()
    fingerprint = marketplace_routes._spotlight_content_fingerprint(
        content_kind=marketplace_routes.SPOTLIGHT_CONTENT_KIND_BROADCAST,
        shop_id=1,
        origin_clan_id=1,
        message="Legacy post with no explicit taxonomy",
    )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    owner_user_id, shop_id, origin_clan_id, content_kind,
                    content_fingerprint, status, source_kind, commercial_mode,
                    distribution_scope
                ) VALUES (
                    1, 1, 1, 'broadcast_snapshot', :fingerprint, 'legacy_preserved',
                    'direct_broadcast', 'free', 'direct_communities'
                )
                """
            ),
            {"fingerprint": fingerprint},
        )

    campaign = _campaign_row()
    assert campaign["status"] == "legacy_preserved"
    assert campaign["opportunity_intent"] == "unspecified"
    assert campaign["opportunity_category"] == "unspecified"
    assert campaign["opportunity_geo_scope"] == "unspecified"
    assert campaign["opportunity_availability"] == "unspecified"
    assert campaign["opportunity_subcategory"] is None
    assert campaign["opportunity_keywords_json"] is None


def test_multiple_broadcast_placements_share_one_campaign_opportunity_meaning(
    client,
    override_current_user_user,
):
    _seed_owner_shop()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code, community_code, status)
                VALUES (2, 'Second Community', 'Second Market', 'META-SECOND', 'GMFN-C-000002', 'active')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (2, 2, 1, 'member', 0)
                """
            )
        )

    response = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Remote bookkeeping help available",
            "image_url": READY_IMAGE_URL,
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
            "opportunity_intent": "offer",
            "opportunity_category": "business_service",
            "opportunity_geo_scope": "remote",
            "opportunity_remote_available": True,
            "opportunity_availability": "available",
        },
    )
    assert response.status_code == 200, response.text
    campaign_id = int(response.json()["item"]["spotlight_campaign_id"])

    with engine.begin() as conn:
        campaign_count = conn.execute(text("SELECT COUNT(*) FROM spotlight_campaigns")).scalar_one()
        placement_count = conn.execute(
            text("SELECT COUNT(*) FROM marketplace_broadcasts WHERE spotlight_campaign_id = :campaign_id"),
            {"campaign_id": campaign_id},
        ).scalar_one()
        meanings = conn.execute(
            text(
                """
                SELECT opportunity_intent, opportunity_category, opportunity_geo_scope,
                       opportunity_remote_available
                FROM spotlight_campaigns
                WHERE id = :campaign_id
                """
            ),
            {"campaign_id": campaign_id},
        ).fetchone()

    assert int(campaign_count) == 1
    assert int(placement_count) == 2
    assert meanings == ("offer", "business_service", "remote", 1)


def test_product_backed_campaign_uses_trustworthy_product_metadata(
    client,
    override_current_user_user,
):
    _seed_owner_shop(target_clan=True, entitlement=True)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'School bags', 'Durable school bags',
                    '25', 'GBP', '/uploads/marketplace/images/bags.jpg',
                    'community_visible', 1
                )
                """
            )
        )

    response = client.post(
        "/marketplace/products/1/repost",
        json={"target_clan_id": 2, "duration_days": 2},
    )
    assert response.status_code == 200, response.text

    campaign = _campaign_row()
    assert campaign["content_kind"] == "marketplace_product"
    assert campaign["source_product_id"] == 1
    assert campaign["opportunity_intent"] == "offer"
    assert campaign["opportunity_category"] == "product"
    assert campaign["opportunity_geo_scope"] == "community"
    assert campaign["opportunity_availability"] == "available"
    assert campaign["opportunity_subcategory"] is None


def test_direct_metadata_does_not_fabricate_product_linkage_and_availability_is_separate(
    client,
    override_current_user_user,
):
    _seed_owner_shop()
    campaign_expires_at = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    response = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Workshop no longer has seats but leave history intact",
            "image_url": READY_IMAGE_URL,
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
            "expires_at": campaign_expires_at,
            "opportunity_intent": "offer",
            "opportunity_category": "event",
            "opportunity_geo_scope": "local",
            "opportunity_availability": "unavailable",
        },
    )
    assert response.status_code == 200, response.text

    campaign = _campaign_row()
    assert campaign["source_product_id"] is None
    assert campaign["status"] == "active"
    assert campaign["expires_at"] is not None
    assert campaign["opportunity_availability"] == "unavailable"


def test_content_fingerprint_ignores_opportunity_metadata():
    base = {
        "content_kind": marketplace_routes.SPOTLIGHT_CONTENT_KIND_BROADCAST,
        "shop_id": 1,
        "origin_clan_id": 1,
        "message": "Same advertisement text",
        "image_url": "/uploads/marketplace/images/a.jpg",
        "video_url": None,
    }

    before = marketplace_routes._spotlight_content_fingerprint(**base)
    marketplace_routes._spotlight_opportunity_metadata(
        intent="offer",
        category="business_service",
        subcategory="accountant",
        geo_scope="remote",
        remote_available=True,
        availability="available",
    )
    after = marketplace_routes._spotlight_content_fingerprint(**base)

    assert before == after
    assert len(before) == 64
