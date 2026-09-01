from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from app.api.routes import marketplace as marketplace_routes
from app.core.security import create_access_token
from app.db.database import engine
from app.db.models import (
    FeatureEntitlement,
    FeatureUsageEvent,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceProductRepost,
    MarketplaceShop,
    ShopFollower,
    TrustEvent,
)
from app.db.notification_models import Notification


def _ensure_marketplace_tables() -> None:
    MarketplaceShop.__table__.create(bind=engine, checkfirst=True)
    MarketplaceProduct.__table__.create(bind=engine, checkfirst=True)
    MarketplaceBroadcast.__table__.create(bind=engine, checkfirst=True)
    MarketplaceProductRepost.__table__.create(bind=engine, checkfirst=True)
    ShopFollower.__table__.create(bind=engine, checkfirst=True)
    TrustEvent.__table__.create(bind=engine, checkfirst=True)
    Notification.__table__.create(bind=engine, checkfirst=True)
    FeatureEntitlement.__table__.create(bind=engine, checkfirst=True)
    FeatureUsageEvent.__table__.create(bind=engine, checkfirst=True)


def _write_upload(root: Path, relative_path: str, content: bytes = b"ok") -> str:
    target = root / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return f"/uploads/{relative_path.replace(chr(92), '/')}"


def _seed_community_domain_feature_policy(
    *,
    feature_key: str,
    mode: str = "off",
    domain_id: int = 970,
    policy_id: int = 971,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id,
                    domain_name,
                    display_name,
                    domain_type,
                    template_key,
                    owner_user_id,
                    clan_id,
                    status,
                    verification_status,
                    created_at,
                    updated_at
                )
                VALUES (
                    :domain_id,
                    :domain_name,
                    'Shop Feature Policy Domain',
                    'ngo_project_network',
                    'ngo_project_network',
                    1,
                    1,
                    'active',
                    'unverified',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "domain_id": domain_id,
                "domain_name": f"shop-feature-policy-{feature_key}",
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id,
                    community_domain_id,
                    policy_key,
                    action_key,
                    scope_type,
                    review_mode,
                    required_role,
                    status,
                    policy_summary,
                    config_json,
                    created_by_user_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    :policy_id,
                    :domain_id,
                    'domain.feature_policy',
                    'domain.features.configure',
                    'domain',
                    'domain_admin_review',
                    'owner_admin',
                    'active',
                    'Marketplace write route feature policy test',
                    :config_json,
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "policy_id": policy_id,
                "domain_id": domain_id,
                "config_json": json.dumps({"features": {feature_key: mode}}),
            },
        )


def _scalar(sql: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(text(sql)).scalar() or 0)


def _seed_marketplace_governance_profile_event(
    *,
    enable_member_service_listings: bool = True,
    require_admin_approval_for_listings: bool = True,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community.governance_profile_selected',
                    1,
                    1,
                    1,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "community_type": "migrant_community",
                        "community_type_label": "Migrant Community",
                        "governance_weight": "light",
                        "governance_weight_label": "Light",
                        "preset_key": "light_migrant_support_network",
                        "preset_label": "Light Migrant Support Network",
                        "verification_mode": "light_member_recognition",
                        "policies": {
                            "enable_member_service_listings": enable_member_service_listings,
                            "require_admin_approval_for_listings": require_admin_approval_for_listings,
                        },
                        "requirements": {
                            "member_phone_required": True,
                            "rules_acceptance_required": True,
                        },
                        "truth_boundary": "Recorded as setup evidence only.",
                    }
                )
            },
        )


def _seed_second_community_admin() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (2, 'market-admin@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (2, 1, 2, 'admin', 0)
                """
            )
        )


def _seed_second_marketplace_member() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name)
                VALUES (2, 'market-member@example.com', 'hashed', 'user', 'Market Member')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (2, 1, 2, 'user', 0)
                """
            )
        )


def test_spotlight_message_parser_keeps_two_part_price_detail():
    parts = marketplace_routes._spotlight_message_parts("Rice bag - N25k")

    assert parts["title"] == "Rice bag"
    assert parts["price_note"] == "N25k"
    assert parts["description"] == "N25k"
    assert parts["availability"] is None


def test_marketplace_shop_creation_respects_disabled_community_domain_shop_policy(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_community_domain_feature_policy(feature_key="marketplace_shops")

    response = client.post(
        "/marketplace/shops",
        json={
            "clan_id": 1,
            "name": "Pillar Community Shop",
            "description": "A governed domain shop.",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "marketplace_shops"
    assert _scalar("SELECT COUNT(*) FROM marketplace_shops") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.shop.created'"
        )
        == 0
    )


def test_marketplace_shop_creation_respects_disabled_light_governance_listings_policy(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_marketplace_governance_profile_event(enable_member_service_listings=False)

    response = client.post(
        "/marketplace/shops",
        json={
            "clan_id": 1,
            "name": "Pillar Community Shop",
            "description": "A governed light community shop.",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_member_service_listings_disabled"
    assert detail["governance_profile_key"] == "light_migrant_support_network"
    assert detail["marketplace_governance_policy"]["member_service_listings_enabled"] is False
    assert _scalar("SELECT COUNT(*) FROM marketplace_shops") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.shop.created'"
        )
        == 0
    )


def test_marketplace_product_creation_respects_disabled_light_governance_listings_policy(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_marketplace_governance_profile_event(enable_member_service_listings=False)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    is_active,
                    created_at
                )
                VALUES (
                    982,
                    1,
                    1,
                    'Pillar Existing Shop',
                    'Shop exists before listings are disabled',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 982,
            "name": "Community service listing",
            "description": "Translation and settlement help",
            "price": "Ask",
            "currency": "GBP",
            "image_url": "/uploads/test/service.jpg",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_member_service_listings_disabled"
    assert detail["marketplace_governance_policy"]["member_service_listings_enabled"] is False
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.product.created'"
        )
        == 0
    )


def test_marketplace_platform_admin_without_membership_cannot_publish_listing(
    client,
    monkeypatch,
):
    monkeypatch.setenv("SECRET_KEY", "pytest-platform-market-admin-secret")
    _ensure_marketplace_tables()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES (
                    22, 'platform-market-admin@example.com', 'hashed',
                    'Platform Market Admin', 'admin', 'GMFN-U-PLATFORMMARKET'
                )
                """
            )
        )

    token = create_access_token({"sub": "platform-market-admin@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/marketplace/shops",
        headers=headers,
        json={
            "clan_id": 1,
            "name": "Platform Admin Shop",
            "description": "Published by platform admin oversight.",
        },
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "You are not an active member of this community"
    assert _scalar("SELECT COUNT(*) FROM marketplace_shops WHERE owner_user_id = 22") == 0


def test_marketplace_platform_admin_without_membership_cannot_publish_product(
    client,
    monkeypatch,
):
    monkeypatch.setenv("SECRET_KEY", "pytest-platform-market-product-secret")
    _ensure_marketplace_tables()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES
                    (22, 'platform-product-admin@example.com', 'hashed',
                     'Platform Product Admin', 'admin', 'GMFN-U-PLATFORMPRODUCT'),
                    (23, 'seller-product-owner@example.com', 'hashed',
                     'Seller Product Owner', 'user', 'GMFN-U-SELLERPRODUCT')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    983, 1, 23, 'Seller Product Shop', 'Existing community shop', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )

    token = create_access_token({"sub": "platform-product-admin@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    response = client.post(
        "/marketplace/products",
        headers=headers,
        json={
            "clan_id": 1,
            "shop_id": 983,
            "name": "Platform Admin Product",
            "description": "Should not publish without community membership.",
            "price": "Ask",
            "currency": "GBP",
            "image_url": "/uploads/test/platform-product.jpg",
        },
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"] == "You are not an active member of this community"
    assert _scalar("SELECT COUNT(*) FROM marketplace_products WHERE shop_id = 983") == 0

def test_marketplace_shop_creation_reports_light_governance_listing_review_policy(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _ensure_marketplace_tables()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )

    response = client.post(
        "/marketplace/shops",
        json={
            "clan_id": 1,
            "name": "Pillar Community Shop",
            "description": "A governed light community shop.",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    policy = body["marketplace_governance_policy"]
    item = body["item"]
    assert policy["governance_profile_key"] == "light_migrant_support_network"
    assert policy["member_service_listings_enabled"] is True
    assert policy["admin_approval_required_for_listings"] is True
    assert policy["listing_review_required"] is True
    assert policy["listing_review_after_days"] == 30
    assert policy["listing_expiry_enforced"] is False
    assert item["listing_review_required"] is True
    assert item["listing_review_status"] == "review_scheduled"
    assert item["listing_expiry_enforced"] is False
    created_at = datetime.fromisoformat(item["created_at"])
    due_at = datetime.fromisoformat(item["listing_review_due_at"])
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if due_at.tzinfo is None:
        due_at = due_at.replace(tzinfo=timezone.utc)
    assert due_at == created_at + timedelta(days=30)

    with engine.begin() as conn:
        meta_json = conn.execute(
            text(
                """
                SELECT meta_json
                FROM trust_events
                WHERE event_type = 'marketplace.shop.created'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).scalar_one()

    event_meta = json.loads(meta_json or "{}")
    event_policy = event_meta["marketplace_governance_policy"]
    assert event_policy["governance_profile_key"] == "light_migrant_support_network"
    assert event_policy["admin_approval_required_for_listings"] is True
    assert event_policy["listing_review_required"] is True
    assert event_policy["listing_review_after_days"] == 30
    assert event_policy["listing_expiry_enforced"] is False



def test_marketplace_shop_creation_submits_member_listing_when_admin_approval_required(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_second_community_admin()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )

    response = client.post(
        "/marketplace/shops",
        json={
            "clan_id": 1,
            "name": "Member Service Shop",
            "description": "Should wait for admin review.",
        },
    )

    assert response.status_code == 202, response.text
    body = response.json()
    assert body["submitted_for_review"] is True
    assert body["item"] is None
    assert body["submission"]["listing_type"] == "shop"
    assert body["submission"]["listing_payload"]["name"] == "Member Service Shop"
    assert body["marketplace_governance_policy"]["admin_approval_required_for_listings"] is True
    assert body["admin_notifications_created"] == 1
    assert _scalar("SELECT COUNT(*) FROM marketplace_shops") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.shop.created'"
        )
        == 0
    )
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.submitted'"
        )
        == 1
    )

    with engine.begin() as conn:
        notification = conn.execute(
            text(
                """
                SELECT user_id, kind, title, action_url, action_label
                FROM notifications
                WHERE kind = 'marketplace.listing.submitted'
                """
            )
        ).mappings().one()

    assert notification["user_id"] == 2
    assert notification["title"] == "Marketplace listing waiting for review"
    assert "listing_review_submission_id=" in notification["action_url"]
    assert notification["action_label"] == "Review listing"


def test_marketplace_shop_creation_reuses_matching_pending_submission(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_second_community_admin()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    payload = {
        "clan_id": 1,
        "name": "Member Service Shop",
        "description": "Should wait for admin review.",
    }

    first_response = client.post("/marketplace/shops", json=payload)
    second_response = client.post("/marketplace/shops", json=payload)

    assert first_response.status_code == 202, first_response.text
    assert second_response.status_code == 202, second_response.text
    first_body = first_response.json()
    second_body = second_response.json()
    assert second_body["submitted_for_review"] is True
    assert second_body["duplicate_pending_submission"] is True
    assert second_body["submission"]["submission_event_id"] == first_body["submission"]["submission_event_id"]
    assert second_body["admin_notifications_created"] == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.submitted'"
        )
        == 1
    )
    assert (
        _scalar(
            "SELECT COUNT(*) FROM notifications "
            "WHERE kind = 'marketplace.listing.submitted'"
        )
        == 1
    )

    changed_response = client.post(
        "/marketplace/shops",
        json={**payload, "description": "Updated detail for a separate review."},
    )
    assert changed_response.status_code == 202, changed_response.text
    changed_body = changed_response.json()
    assert changed_body.get("duplicate_pending_submission") is not True
    assert changed_body["submission"]["submission_event_id"] != first_body["submission"]["submission_event_id"]
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.submitted'"
        )
        == 2
    )
    assert (
        _scalar(
            "SELECT COUNT(*) FROM notifications "
            "WHERE kind = 'marketplace.listing.submitted'"
        )
        == 2
    )


def test_marketplace_product_creation_uses_selected_community_for_global_owner_shop(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, invite_code, community_code, status, invite_uses, created_at
                ) VALUES (
                    2, 'Other Test Clan', 'test-invite-2', 'GMFN-C-000002', 'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (12, 2, 1, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    982, 1, 1, 'Clan One Shop', 'Global shop identity', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.post(
        "/marketplace/products",
        json={
            "clan_id": 2,
            "shop_id": 982,
            "name": "Selected community listing",
            "description": "This product belongs to the selected community shelf.",
            "price": "Ask",
            "currency": "GBP",
            "image_url": "/uploads/test/selected-community.jpg",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["item"]["clan_id"] == 2
    assert body["item"]["shop_id"] == 982
    assert _scalar("SELECT COUNT(*) FROM marketplace_products WHERE clan_id = 2 AND shop_id = 982") == 1
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.product.created' AND clan_id = 2"
        )
        == 1
    )



def test_marketplace_shop_update_rejects_wrong_selected_community(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, invite_code, community_code, status, invite_uses, created_at
                ) VALUES (
                    2, 'Other Test Clan', 'test-invite-2', 'GMFN-C-000002', 'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (12, 2, 1, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    984, 1, 1, 'Clan One Shop', 'Original shop copy', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.patch(
        "/marketplace/shops/984",
        json={"clan_id": 2, "description": "Wrong community update"},
    )

    assert response.status_code == 409, response.text
    assert response.json()["detail"] == "Selected community does not own this shop"
    with engine.begin() as conn:
        description = conn.execute(
            text("SELECT description FROM marketplace_shops WHERE id = 984")
        ).scalar_one()
    assert description == "Original shop copy"
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.shop.updated'"
        )
        == 0
    )

def test_marketplace_product_update_rejects_wrong_selected_community(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, invite_code, community_code, status, invite_uses, created_at
                ) VALUES (
                    2, 'Other Test Clan', 'test-invite-2', 'GMFN-C-000002', 'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (12, 2, 1, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    985, 1, 1, 'Clan One Shop', 'Source shop', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description, price, currency,
                    image_url, visibility_mode, is_active, created_at
                ) VALUES (
                    986, 1, 985, 1, 'Clan One Product', 'Source product', 'Ask', 'GBP',
                    '/uploads/test/product.jpg', 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.patch(
        "/marketplace/products/986",
        json={"clan_id": 2, "price": "Updated"},
    )

    assert response.status_code == 409, response.text
    assert response.json()["detail"] == "Selected community does not own this product"
    with engine.begin() as conn:
        price = conn.execute(
            text("SELECT price FROM marketplace_products WHERE id = 986")
        ).scalar_one()
    assert price == "Ask"


def test_marketplace_product_update_rejects_target_shop_not_visible_in_product_community(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _ensure_marketplace_tables()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role)
                VALUES (2, 'other-shop-owner@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, invite_code, community_code, status, invite_uses, created_at
                ) VALUES (
                    2, 'Other Test Clan', 'test-invite-2', 'GMFN-C-000002', 'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES
                    (987, 1, 1, 'Clan One Shop', 'Source shop', 1, CURRENT_TIMESTAMP),
                    (988, 2, 2, 'Clan Two Shop', 'Target shop from another community', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description, price, currency,
                    image_url, visibility_mode, is_active, created_at
                ) VALUES (
                    989, 1, 987, 1, 'Clan One Product', 'Source product', 'Ask', 'GBP',
                    '/uploads/test/product.jpg', 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.patch(
        "/marketplace/products/989",
        json={"clan_id": 1, "shop_id": 988},
    )

    assert response.status_code == 409, response.text
    assert response.json()["detail"] == "Target shop is not visible in this product's community"
    with engine.begin() as conn:
        shop_id = conn.execute(
            text("SELECT shop_id FROM marketplace_products WHERE id = 989")
        ).scalar_one()
    assert int(shop_id) == 987


def test_marketplace_private_product_management_stays_in_selected_community(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Private Manager', 'user', 'GMFN-U-PRIVATECTX'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Origin community', 'Origin Marketplace', 'PRIVATECTX1'),
                    (2, 'Second community', 'Second Marketplace', 'PRIVATECTX2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    990, 1, 1, 'Global Private Context Shop', 'One owner shelf', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active, created_at
                ) VALUES
                    (
                        991, 1, 990, 1, 'Origin Private Item', 'Should stay out of clan two management',
                        '1000', 'GBP', '/uploads/test/private-origin.jpg', 'vault_private', 1, CURRENT_TIMESTAMP
                    ),
                    (
                        992, 2, 990, 1, 'Second Community Private Item', 'Selected management context',
                        '2000', 'GBP', '/uploads/test/private-second.jpg', 'vault_private', 1, CURRENT_TIMESTAMP
                    )
                """
            )
        )

    response = client.get(
        "/marketplace/products?clan_id=2&shop_id=990&include_private_manage=true&only_active=false"
    )

    assert response.status_code == 200, response.text
    body = response.json()
    names = [item["name"] for item in body["items"]]
    assert names == ["Second Community Private Item"]
    assert body["clan_id"] == 2
    assert body["include_private_manage"] is True

def test_marketplace_product_creation_submits_member_listing_when_admin_approval_required(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_second_community_admin()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    is_active,
                    created_at
                )
                VALUES (
                    983,
                    1,
                    1,
                    'Pillar Existing Shop',
                    'Shop exists before approval gate',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 983,
            "name": "Community service listing",
            "description": "Translation and settlement help",
            "price": "Ask",
            "currency": "GBP",
            "image_url": "/uploads/test/service.jpg",
        },
    )

    assert response.status_code == 202, response.text
    body = response.json()
    assert body["submitted_for_review"] is True
    assert body["item"] is None
    assert body["submission"]["listing_type"] == "product"
    assert body["submission"]["listing_payload"]["shop_id"] == 983
    assert body["submission"]["listing_payload"]["name"] == "Community service listing"
    assert body["marketplace_governance_policy"]["admin_approval_required_for_listings"] is True
    assert body["admin_notifications_created"] == 1
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.product.created'"
        )
        == 0
    )
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.submitted'"
        )
        == 1
    )


def test_marketplace_product_creation_reuses_matching_pending_submission(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_second_community_admin()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    984, 1, 1, 'Pillar Existing Shop', 'Shop exists before approval gate', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
    payload = {
        "clan_id": 1,
        "shop_id": 984,
        "name": "Community service listing",
        "description": "Translation and settlement help",
        "price": "Ask",
        "currency": "GBP",
        "image_url": "/uploads/test/service.jpg",
    }

    first_response = client.post("/marketplace/products", json=payload)
    second_response = client.post("/marketplace/products", json=payload)

    assert first_response.status_code == 202, first_response.text
    assert second_response.status_code == 202, second_response.text
    first_body = first_response.json()
    second_body = second_response.json()
    assert second_body["submitted_for_review"] is True
    assert second_body["duplicate_pending_submission"] is True
    assert second_body["submission"]["submission_event_id"] == first_body["submission"]["submission_event_id"]
    assert second_body["admin_notifications_created"] == 0
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.submitted'"
        )
        == 1
    )
    assert (
        _scalar(
            "SELECT COUNT(*) FROM notifications "
            "WHERE kind = 'marketplace.listing.submitted'"
        )
        == 1
    )

    changed_response = client.post(
        "/marketplace/products",
        json={**payload, "image_url": "/uploads/test/service-updated.jpg"},
    )
    assert changed_response.status_code == 202, changed_response.text
    changed_body = changed_response.json()
    assert changed_body.get("duplicate_pending_submission") is not True
    assert changed_body["submission"]["submission_event_id"] != first_body["submission"]["submission_event_id"]
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.submitted'"
        )
        == 2
    )
    assert (
        _scalar(
            "SELECT COUNT(*) FROM notifications "
            "WHERE kind = 'marketplace.listing.submitted'"
        )
        == 2
    )


def test_marketplace_listing_review_approval_publishes_shop_and_notifies_submitter(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _ensure_marketplace_tables()
    _seed_second_marketplace_member()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    meta_json = json.dumps(
        {
            "source": "marketplace_listing_review",
            "reason": "marketplace_listing_submitted_for_review",
            "listing_type": "shop",
            "listing_payload": {
                "name": "Approved Member Shop",
                "description": "Admin reviewed shop.",
            },
            "review_status": "pending",
            "submitted_by_role": "member",
            "marketplace_governance_policy": {
                "admin_approval_required_for_listings": True,
                "listing_review_required": True,
            },
        }
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type, clan_id, actor_user_id, subject_user_id, meta_json, created_at
                ) VALUES (
                    'marketplace.listing.submitted', 1, 2, 2, :meta_json, CURRENT_TIMESTAMP
                )
                """
            ),
            {"meta_json": meta_json},
        )
        submission_id = int(conn.execute(text("SELECT MAX(id) FROM trust_events")).scalar_one())
        conn.execute(
            text(
                """
                INSERT INTO notifications (
                    user_id, kind, title, message, action_url, action_label, is_read, created_at
                ) VALUES (
                    1,
                    'marketplace.listing.submitted',
                    'Marketplace listing waiting for review',
                    'A member submitted Approved Member Shop (shop) for marketplace approval.',
                    :action_url,
                    'Review listing',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "action_url": (
                    f"/app/marketplace?clan_id=1&listing_review_submission_id={submission_id}"
                    "#marketplace-listing-review-panel"
                )
            },
        )

    queue_response = client.get("/marketplace/listing-review-queue?clan_id=1")
    assert queue_response.status_code == 200, queue_response.text
    assert queue_response.json()["pending_review_count"] == 1

    decision = client.post(
        f"/marketplace/listing-review-queue/{submission_id}/decision",
        json={"clan_id": 1, "decision": "approve"},
    )

    assert decision.status_code == 200, decision.text
    body = decision.json()
    assert body["decision"] == "approve"
    assert body["listing_type"] == "shop"
    assert body["shop"]["owner_user_id"] == 2
    assert body["shop"]["name"] == "Approved Member Shop"
    assert body["review_notifications_retired"] == 1
    assert body["submitter_notification_created"] == 1
    assert _scalar("SELECT COUNT(*) FROM marketplace_shops WHERE owner_user_id = 2") == 1
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.review_decided'"
        )
        == 1
    )

    with engine.begin() as conn:
        submitter_notification = conn.execute(
            text(
                """
                SELECT user_id, kind, action_label
                FROM notifications
                WHERE kind = 'marketplace.listing.review_decided'
                """
            )
        ).mappings().one()
        retired = conn.execute(
            text(
                """
                SELECT is_read
                FROM notifications
                WHERE kind = 'marketplace.listing.submitted'
                """
            )
        ).scalar_one()

    assert submitter_notification["user_id"] == 2
    assert submitter_notification["action_label"] == "Open Marketplace"
    assert bool(retired) is True


def test_marketplace_listing_review_rejection_records_decision_without_publishing(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _ensure_marketplace_tables()
    _seed_second_marketplace_member()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    meta_json = json.dumps(
        {
            "source": "marketplace_listing_review",
            "reason": "marketplace_listing_submitted_for_review",
            "listing_type": "shop",
            "listing_payload": {
                "name": "Rejected Member Shop",
                "description": "Admin should not publish this shop.",
            },
            "review_status": "pending",
            "submitted_by_role": "member",
            "marketplace_governance_policy": {
                "admin_approval_required_for_listings": True,
                "listing_review_required": True,
            },
        }
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type, clan_id, actor_user_id, subject_user_id, meta_json, created_at
                ) VALUES (
                    'marketplace.listing.submitted', 1, 2, 2, :meta_json, CURRENT_TIMESTAMP
                )
                """
            ),
            {"meta_json": meta_json},
        )
        submission_id = int(conn.execute(text("SELECT MAX(id) FROM trust_events")).scalar_one())
        conn.execute(
            text(
                """
                INSERT INTO notifications (
                    user_id, kind, title, message, action_url, action_label, is_read, created_at
                ) VALUES (
                    1,
                    'marketplace.listing.submitted',
                    'Marketplace listing waiting for review',
                    'A member submitted Rejected Member Shop (shop) for marketplace approval.',
                    :action_url,
                    'Review listing',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "action_url": (
                    f"/app/marketplace?clan_id=1&listing_review_submission_id={submission_id}"
                    "#marketplace-listing-review-panel"
                )
            },
        )

    decision = client.post(
        f"/marketplace/listing-review-queue/{submission_id}/decision",
        json={"clan_id": 1, "decision": "reject", "reviewer_note": "Missing contact detail"},
    )

    assert decision.status_code == 200, decision.text
    body = decision.json()
    assert body["decision"] == "reject"
    assert body["listing_type"] == "shop"
    assert body["shop"] is None
    assert body["product"] is None
    assert body["review_notifications_retired"] == 1
    assert body["submitter_notification_created"] == 1
    assert _scalar("SELECT COUNT(*) FROM marketplace_shops WHERE owner_user_id = 2") == 0
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.review_decided'"
        )
        == 1
    )

    with engine.begin() as conn:
        decision_meta = conn.execute(
            text(
                """
                SELECT meta_json
                FROM trust_events
                WHERE event_type = 'marketplace.listing.review_decided'
                """
            )
        ).scalar_one()
        submitter_notification = conn.execute(
            text(
                """
                SELECT user_id, title, action_label
                FROM notifications
                WHERE kind = 'marketplace.listing.review_decided'
                """
            )
        ).mappings().one()
        retired = conn.execute(
            text(
                """
                SELECT is_read
                FROM notifications
                WHERE kind = 'marketplace.listing.submitted'
                """
            )
        ).scalar_one()

    meta = json.loads(decision_meta)
    assert meta["decision"] == "reject"
    assert meta["reviewer_note"] == "Missing contact detail"
    assert meta["published_shop_id"] is None
    assert submitter_notification["user_id"] == 2
    assert submitter_notification["title"] == "Marketplace listing was not posted"
    assert submitter_notification["action_label"] == "Open Marketplace"
    assert bool(retired) is True

    queue_response = client.get("/marketplace/listing-review-queue?clan_id=1")
    assert queue_response.status_code == 200, queue_response.text
    assert queue_response.json()["pending_review_count"] == 0

    duplicate_decision = client.post(
        f"/marketplace/listing-review-queue/{submission_id}/decision",
        json={"clan_id": 1, "decision": "approve"},
    )
    assert duplicate_decision.status_code == 409, duplicate_decision.text


def test_marketplace_listing_review_product_approval_uses_selected_community_for_global_shop(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _ensure_marketplace_tables()
    _seed_second_marketplace_member()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, invite_code, community_code, status, invite_uses, created_at
                ) VALUES (
                    2, 'Other Test Clan', 'test-invite-2', 'GMFN-C-000002', 'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    992, 2, 2, 'Member Global Shop', 'Global shop row outside review community', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type, clan_id, actor_user_id, subject_user_id, meta_json, created_at
                ) VALUES (
                    'marketplace.listing.submitted', 1, 2, 2, :meta_json, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "marketplace_listing_review",
                        "reason": "marketplace_listing_submitted_for_review",
                        "listing_type": "product",
                        "listing_payload": {
                            "shop_id": 992,
                            "name": "Selected community approved listing",
                            "description": "Should publish into the review community under the global shop.",
                            "price": "Ask",
                            "currency": "GBP",
                            "image_url": "/uploads/test/selected-community-review.jpg",
                            "visibility_mode": "community_visible",
                        },
                        "review_status": "pending",
                        "submitted_by_role": "member",
                        "marketplace_governance_policy": {
                            "admin_approval_required_for_listings": True,
                            "listing_review_required": True,
                        },
                    }
                )
            },
        )
        submission_id = int(conn.execute(text("SELECT MAX(id) FROM trust_events")).scalar_one())
        conn.execute(
            text(
                """
                INSERT INTO notifications (
                    user_id, kind, title, message, action_url, action_label, is_read, created_at
                ) VALUES (
                    1,
                    'marketplace.listing.submitted',
                    'Marketplace listing waiting for review',
                    'A member submitted Selected community approved listing (product) for marketplace approval.',
                    :action_url,
                    'Review listing',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "action_url": (
                    f"/app/marketplace?clan_id=1&listing_review_submission_id={submission_id}"
                    "#marketplace-listing-review-panel"
                )
            },
        )

    decision = client.post(
        f"/marketplace/listing-review-queue/{submission_id}/decision",
        json={"clan_id": 1, "decision": "approve"},
    )

    assert decision.status_code == 200, decision.text
    body = decision.json()
    assert body["product"]["clan_id"] == 1
    assert body["product"]["shop_id"] == 992
    assert body["decision"] == "approve"
    assert _scalar("SELECT COUNT(*) FROM marketplace_products WHERE clan_id = 1 AND shop_id = 992") == 1
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.listing.review_decided'"
        )
        == 1
    )



def test_marketplace_listing_review_approval_publishes_product_and_notifies_submitter(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _ensure_marketplace_tables()
    _seed_second_marketplace_member()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=True,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    991, 1, 2, 'Member Existing Shop', 'Shop exists before product approval', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type, clan_id, actor_user_id, subject_user_id, meta_json, created_at
                ) VALUES (
                    'marketplace.listing.submitted', 1, 2, 2, :meta_json, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": json.dumps(
                    {
                        "source": "marketplace_listing_review",
                        "reason": "marketplace_listing_submitted_for_review",
                        "listing_type": "product",
                        "listing_payload": {
                            "shop_id": 991,
                            "name": "Approved service listing",
                            "description": "Translation and settlement help",
                            "price": "Ask",
                            "currency": "GBP",
                            "image_url": "/uploads/test/approved-service.jpg",
                            "visibility_mode": "community_visible",
                        },
                        "review_status": "pending",
                        "submitted_by_role": "member",
                        "marketplace_governance_policy": {
                            "admin_approval_required_for_listings": True,
                            "listing_review_required": True,
                        },
                    }
                )
            },
        )
        submission_id = int(conn.execute(text("SELECT MAX(id) FROM trust_events")).scalar_one())
        conn.execute(
            text(
                """
                INSERT INTO notifications (
                    user_id, kind, title, message, action_url, action_label, is_read, created_at
                ) VALUES (
                    1,
                    'marketplace.listing.submitted',
                    'Marketplace listing waiting for review',
                    'A member submitted Approved service listing (product) for marketplace approval.',
                    :action_url,
                    'Review listing',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "action_url": (
                    f"/app/marketplace?clan_id=1&listing_review_submission_id={submission_id}"
                    "#marketplace-listing-review-panel"
                )
            },
        )

    decision = client.post(
        f"/marketplace/listing-review-queue/{submission_id}/decision",
        json={"clan_id": 1, "decision": "approve"},
    )

    assert decision.status_code == 200, decision.text
    body = decision.json()
    assert body["decision"] == "approve"
    assert body["listing_type"] == "product"
    assert body["product"]["seller_user_id"] == 2
    assert body["product"]["name"] == "Approved service listing"
    assert body["review_notifications_retired"] == 1
    assert body["submitter_notification_created"] == 1
    assert _scalar("SELECT COUNT(*) FROM marketplace_products WHERE seller_user_id = 2") == 1
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.product.created'"
        )
        == 1
    )

def test_marketplace_product_creation_allows_member_when_listing_admin_approval_not_required(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_marketplace_governance_profile_event(
        enable_member_service_listings=True,
        require_admin_approval_for_listings=False,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    is_active,
                    created_at
                )
                VALUES (
                    984,
                    1,
                    1,
                    'Member Existing Shop',
                    'Shop exists before approval-free listing',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 984,
            "name": "Community service listing",
            "description": "Translation and settlement help",
            "price": "Ask",
            "currency": "GBP",
            "image_url": "/uploads/test/service.jpg",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    policy = body["marketplace_governance_policy"]
    item = body["item"]
    assert policy["member_service_listings_enabled"] is True
    assert policy["admin_approval_required_for_listings"] is False
    assert policy["listing_review_required"] is False
    assert policy["listing_review_after_days"] is None
    assert policy["listing_expiry_enforced"] is False
    assert item["listing_review_required"] is False
    assert item["listing_review_due_at"] is None
    assert item["listing_review_status"] == "not_required"
    assert item["listing_expiry_enforced"] is False
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 1


def test_marketplace_product_creation_respects_disabled_community_domain_shop_diary_policy(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_community_domain_feature_policy(feature_key="shop_diary")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    is_active,
                    created_at
                )
                VALUES (
                    981,
                    1,
                    1,
                    'Pillar Existing Shop',
                    'Shop exists before diary is disabled',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 981,
            "name": "Community block update",
            "description": "Block #1",
            "price": "100",
            "currency": "GBP",
            "image_url": "/uploads/test/product.jpg",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "shop_diary"
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.product.created'"
        )
        == 0
    )


def test_marketplace_spotlight_broadcast_respects_disabled_community_domain_spotlight_policy(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_community_domain_feature_policy(feature_key="spotlight")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    is_active,
                    created_at
                )
                VALUES (
                    982,
                    1,
                    1,
                    'Spotlight Policy Shop',
                    'A governed domain shop.',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 982,
            "message": "This should not publish while Spotlight is off.",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "spotlight"
    assert "Spotlight broadcasts" in detail["message"]
    assert _scalar("SELECT COUNT(*) FROM marketplace_broadcasts") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.broadcast.created'"
        )
        == 0
    )


def test_marketplace_vault_private_product_respects_disabled_community_domain_vault_policy(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _ensure_marketplace_tables()
    _seed_community_domain_feature_policy(feature_key="vault")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    is_active,
                    created_at
                )
                VALUES (
                    983,
                    1,
                    1,
                    'Vault Policy Shop',
                    'A governed private-offer shop.',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 983,
            "name": "Private domain file",
            "description": "This should not become Vault-private while Vault is off.",
            "price": "100",
            "currency": "GBP",
            "image_url": "/uploads/test/private-vault.jpg",
            "visibility_mode": "vault_private",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "vault"
    assert "private Vault content" in detail["message"]
    assert _scalar("SELECT COUNT(*) FROM marketplace_products") == 0
    assert (
        _scalar(
            "SELECT COUNT(*) FROM trust_events "
            "WHERE event_type = 'marketplace.product.created'"
        )
        == 0
    )


def test_spotlight_capacity_pilot_override_is_active_for_test_week(monkeypatch):
    monkeypatch.setattr(
        marketplace_routes,
        "SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL",
        datetime(2026, 5, 17, 23, 59, 59, tzinfo=timezone.utc),
    )

    assert marketplace_routes._spotlight_capacity_pilot_override_active(
        datetime(2026, 5, 10, 12, 0, 0, tzinfo=timezone.utc)
    )
    assert marketplace_routes._spotlight_capacity_pilot_override_active(
        datetime(2026, 5, 17, 23, 59, 59, tzinfo=timezone.utc)
    )
    assert not marketplace_routes._spotlight_capacity_pilot_override_active(
        datetime(2026, 5, 18, 0, 0, 0, tzinfo=timezone.utc)
    )


def test_spotlight_capacity_pilot_override_ignores_stale_force_off_env(monkeypatch):
    monkeypatch.setenv("GMFN_SPOTLIGHT_CAPACITY_OVERRIDE", "0")
    monkeypatch.setattr(
        marketplace_routes,
        "SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL",
        datetime(2026, 5, 17, 23, 59, 59, tzinfo=timezone.utc),
    )

    assert marketplace_routes._spotlight_capacity_pilot_override_active(
        datetime(2026, 5, 10, 12, 0, 0, tzinfo=timezone.utc)
    )


def test_public_shop_face_returns_saved_products_and_spotlight(client, monkeypatch, tmp_path):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _ensure_marketplace_tables()

    image_url = _write_upload(tmp_path, "marketplace/images/shop-public.jpg")
    product_image_url = _write_upload(tmp_path, "marketplace/images/product-public.jpg")
    spotlight_image_url = _write_upload(tmp_path, "marketplace/images/spotlight-public.jpg")

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id, trust_score, trust_band
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Chuma Seller', 'user', 'GMFN-U-TESTSHOP', 88, 'A'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Golden boys', 'Golden boys Marketplace', 'PUBLICTEST1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    whatsapp_number, telegram_handle, image_url, is_active
                ) VALUES (
                    1, 1, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods',
                    '07903165266', 'telegram-handle', :image_url, 1
                )
                """
            ),
            {"image_url": image_url},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Fresh Rice', 'Bag of rice',
                    '25000', 'NGN', :image_url, NULL, 'community_visible', 1
                )
                """
            ),
            {"image_url": product_image_url},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message,
                    image_url, video_url, priority_mode, visibility_scope,
                    expires_at, created_at
                ) VALUES (
                    1, 1, 1, 1, 'Spotlight update',
                    :image_url, NULL, 'free', 'direct_communities',
                    :expires_at, :created_at
                )
                """
            ),
            {
                "image_url": spotlight_image_url,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=3),
                "created_at": datetime.now(timezone.utc),
            },
        )

    res = client.get("/marketplace/public/shop/GMFN-U-TESTSHOP")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["is_public_shop_face"] is True
    assert body["item"]["name"] == "CHUMA INTERNATIONAL SHOP"
    assert body["item"]["shop_name"] == "CHUMA INTERNATIONAL SHOP"
    assert body["item"]["gmfn_id"] == "GMFN-U-TESTSHOP"
    assert body["item"]["image_url"] == image_url
    assert body["community_name"] == "Golden boys Marketplace"
    assert body["verification"]["scan_kind"] == "community"
    assert body["verification"]["community_verify_path"] == "/verify/community/1"
    assert body["verification"]["community_confirmation_mode"] == "owner_mediated"
    assert body["verification"]["trustslip_available"] is False
    assert len(body["products"]) == 1
    assert body["products"][0]["name"] == "Fresh Rice"
    assert body["products"][0]["image_url"] == product_image_url
    assert body["products"][0]["image_url_available"] is True
    assert body["primary_broadcast"]["message"] == "Spotlight update"
    assert body["primary_broadcast"]["image_url"] == spotlight_image_url
    assert body["primary_broadcast"]["source_shop_whatsapp_number"] == "07903165266"
    assert len(body["broadcasts"]) == 1

    gsn_alias = client.get("/marketplace/public/shop/GSN-U-TESTSHOP")
    assert gsn_alias.status_code == 200, gsn_alias.text
    alias_body = gsn_alias.json()
    assert alias_body["item"]["gmfn_id"] == "GMFN-U-TESTSHOP"
    assert [item["name"] for item in alias_body["products"]] == ["Fresh Rice"]


def test_public_shop_face_masks_internal_phone_identity_fallback(client):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, '+447903165266@pending.gmfn.local', 'hashed', NULL, 'user', 'GMFN-U-INTERNAL1'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'INTERNAL1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    whatsapp_number, telegram_handle, is_active
                ) VALUES (
                    1, 1, 1, '+447903165266', 'Internal fallback shop',
                    '07903165266', NULL, 1
                )
                """
            )
        )

    res = client.get("/marketplace/public/shop/GMFN-U-INTERNAL1")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["item"]["owner_name"] == "GSN member"
    assert body["item"]["name"] == "Public GSN Shop"
    assert "07903165266" not in body["item"]["name"]
    assert "pending.gmfn.local" not in body["item"]["owner_name"]


def test_product_repost_requires_paid_credit_and_creates_target_marketplace_spotlight(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-marketplace-repost-secret")
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'seller@example.com', 'hashed', 'Seller One', 'user', 'GMFN-U-SELLER1'),
                    (2, 'reposter@example.com', 'hashed', 'Reposter Two', 'user', 'GMFN-U-REPOST2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code, community_code)
                VALUES
                    (1, 'Source Community', 'Source Marketplace', 'SOURCE1', 'GMFN-C-000001'),
                    (2, 'Target Community', 'Target Marketplace', 'TARGET2', 'GMFN-C-000002')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    whatsapp_number, telegram_handle, is_active
                ) VALUES (
                    1, 1, 1, 'Seller Public Shop', 'Trusted products',
                    '07903165266', NULL, 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Fresh Rice', '[BLOCK:5] [LABEL:Rice] Bag of rice',
                    '25000', 'NGN', '/uploads/marketplace/images/rice.jpg',
                    NULL, 'community_visible', 1
                ), (
                    2, 1, 1, 1, 'Archived Rice', '[BLOCK:6] Hidden bag',
                    '25000', 'NGN', '/uploads/marketplace/images/rice-old.jpg',
                    NULL, 'community_visible', 0
                )
                """
            )
        )

    non_owner_token = create_access_token({"sub": "reposter@example.com"})
    non_owner_headers = {"Authorization": f"Bearer {non_owner_token}"}

    non_owner = client.post(
        "/marketplace/products/1/repost",
        json={"target_clan_id": 2},
        headers=non_owner_headers,
    )
    assert non_owner.status_code == 403, non_owner.text
    assert "Only the shop owner" in non_owner.json()["detail"]

    token = create_access_token({"sub": "seller@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    products = client.get("/marketplace/products?clan_id=1", headers=headers)
    assert products.status_code == 200, products.text
    product_body = products.json()
    assert product_body["items"][0]["public_block_number"] == 5
    assert product_body["items"][0]["slot_number"] == 5

    inactive = client.post(
        "/marketplace/products/2/repost",
        json={"target_clan_id": 2},
        headers=headers,
    )
    assert inactive.status_code == 400, inactive.text
    assert "active public shop blocks" in inactive.json()["detail"]

    blocked = client.post(
        "/marketplace/products/1/repost",
        json={"target_clan_id": 2},
        headers=headers,
    )
    assert blocked.status_code == 403, blocked.text
    assert "Subscription Spotlight credit" in blocked.json()["detail"]

    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    payment_reference
                ) VALUES (
                    1, 1, 1, 1, 'spotlight_priority', 'spotlight_credit_pack',
                    5, 0, 'active', :starts_at, :expires_at, 'GMFN-SPOT-REPOST'
                )
                """
            ),
            {
                "starts_at": now - timedelta(minutes=1),
                "expires_at": now + timedelta(days=30),
            },
        )

    res = client.post(
        "/marketplace/products/1/repost",
        json={"target_community_code": "GMFN-C-000002", "duration_days": 5},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["item"]["target_clan_id"] == 2
    assert body["target_community"]["community_code"] == "GMFN-C-000002"
    assert body["duration_days"] == 5
    assert body["broadcast"]["clan_id"] == 2
    assert body["broadcast"]["source_shop_name"] == "Seller Public Shop"
    assert body["broadcast"]["message"] == "Fresh Rice - Bag of rice"
    assert body["broadcast"]["visibility_scope"] == "marketplace_repost"
    assert body["broadcast"]["priority_mode"] == "paid"
    assert body["broadcast"]["source_product_id"] == 1
    assert body["broadcast"]["source_product_block"] == 5
    assert body["broadcast"]["source_product_title"] == "Fresh Rice"
    assert body["broadcast"]["source_product_description"] == "Bag of rice"
    assert body["broadcast"]["source_product_price"] == "25000"
    assert body["broadcast"]["source_product_currency"] == "NGN"
    assert body["broadcast"]["source_product_category"] == "Shop item"
    assert body["broadcast"]["source_product_image_url"].endswith("/rice.jpg")
    assert body["broadcast"]["spotlight_owner"] == "Seller Public Shop"
    assert body["broadcast"]["spotlight_contact_available"] is True
    expires_at = datetime.fromisoformat(body["broadcast"]["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    assert expires_at >= now + timedelta(days=4)

    feed = client.get("/marketplace/broadcasts?clan_id=2", headers=non_owner_headers)
    assert feed.status_code == 200, feed.text
    feed_body = feed.json()
    assert feed_body["total"] == 1
    assert feed_body["items"][0]["id"] == body["broadcast"]["id"]
    assert feed_body["items"][0]["source_product_id"] == 1
    assert feed_body["items"][0]["source_product_block"] == 5
    assert feed_body["items"][0]["spotlight_title"] == "Fresh Rice"
    assert feed_body["items"][0]["spotlight_description"] == "Bag of rice"
    assert feed_body["items"][0]["source_product_category"] == "Shop item"

    with engine.begin() as conn:
        entitlement = conn.execute(
            text(
                """
                SELECT quantity_used
                FROM feature_entitlements
                WHERE id = 1
                """
            )
        ).fetchone()
        usage_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM feature_usage_events
                WHERE feature_code = 'spotlight_priority'
                  AND reference_key LIKE 'marketplace.repost:%'
                """
            )
        ).scalar_one()

    assert int(entitlement[0]) == 5
    assert int(usage_count) == 1

    second = client.post(
        "/marketplace/products/1/repost",
        json={"target_community_code": "GMFN-C-000002", "duration_days": 1},
        headers=headers,
    )
    assert second.status_code == 403, second.text
    assert "Subscription Spotlight credit" in second.json()["detail"]


def test_product_repost_target_suggestions_return_public_community_codes(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-marketplace-repost-targets-secret")
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'seller-targets@example.com', 'hashed', 'Seller Targets', 'user', 'GMFN-U-TARGETSELLER'),
                    (2, 'other-targets@example.com', 'hashed', 'Other Targets', 'user', 'GMFN-U-TARGETOTHER'),
                    (3, 'solar-targets@example.com', 'hashed', 'Solar Targets', 'user', 'GMFN-U-TARGETSOLAR')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, description, marketplace_name, marketplace_description, invite_code, community_code)
                VALUES
                    (1, 'Source Traders', 'Origin only', 'Source Marketplace', 'Origin rice sellers', 'SOURCE-TARGETS', 'GMFN-C-010001'),
                    (2, 'Rice Traders', 'Food and bag supply community', 'Rice Marketplace', 'Rice bags and food trade', 'RICE-TARGETS', 'GMFN-C-010002'),
                    (3, 'Solar Builders', 'Renewable installation community', 'Solar Marketplace', 'Panels and energy tools', 'SOLAR-TARGETS', 'GMFN-C-010003')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 2, 'member', 0),
                    (3, 2, 1, 'member', 0),
                    (4, 3, 3, 'member', 0),
                    (5, 3, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    whatsapp_number, telegram_handle, is_active
                ) VALUES
                    (1, 1, 1, 'Seller Food Shop', 'Rice supplier', '07903165266', NULL, 1),
                    (2, 2, 2, 'Target Food Shop', 'Rice and food', '07903165267', NULL, 1),
                    (3, 3, 3, 'Solar Shop', 'Solar products', '07903165268', NULL, 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message, image_url,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    1, 3, 3, 3, 'Solar spotlight is already live',
                    '/uploads/marketplace/images/solar-live.jpg',
                    'free', 'direct_communities',
                    '2035-01-01T00:00:00+00:00', '2026-06-17T10:00:00+00:00'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode, is_active
                ) VALUES
                    (1, 1, 1, 1, 'Fresh Rice', '[BLOCK:2] Bag of rice for traders', '25000', 'NGN', NULL, NULL, 'community_visible', 1),
                    (2, 2, 2, 2, 'Rice Bags', 'Wholesale rice and food supply', '26000', 'NGN', NULL, NULL, 'community_visible', 1),
                    (3, 3, 3, 3, 'Solar Panel', 'Energy panel', '50000', 'NGN', NULL, NULL, 'community_visible', 1)
                """
            )
        )

    token = create_access_token({"sub": "seller-targets@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/marketplace/products/1/repost-targets?limit=4", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["origin_community_code"] == "GMFN-C-010001"
    assert body["recommendation_basis"]["private_member_data_exposed"] is False
    assert "rice" in body["recommendation_basis"]["product_terms"]

    codes = [item["community_code"] for item in body["items"]]
    assert "GMFN-C-010001" not in codes
    assert codes[0] == "GMFN-C-010002"
    assert body["items"][0]["marketplace_name"] == "Rice Marketplace"
    assert "rice" in body["items"][0]["matched_terms"]
    assert body["items"][0]["active_public_blocks"] == 1
    assert "active_members" not in body["items"][0]
    assert "active member" not in " ".join(body["items"][0]["reasons"]).lower()
    saturated_target = next(
        item for item in body["items"] if item["community_code"] == "GMFN-C-010003"
    )
    assert "Spotlight capacity reached for community" in saturated_target["reasons"]

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE marketplace_products SET visibility_mode = 'public' WHERE id = 1")
        )
    alias_res = client.get("/marketplace/products/1/repost-targets?limit=4", headers=headers)
    assert alias_res.status_code == 200, alias_res.text

    with engine.begin() as conn:
        conn.execute(text("UPDATE marketplace_products SET is_active = 0 WHERE id = 1"))
    inactive_res = client.get("/marketplace/products/1/repost-targets?limit=4", headers=headers)
    assert inactive_res.status_code == 400, inactive_res.text
    assert "active public shop blocks" in inactive_res.json()["detail"]

    non_owner_token = create_access_token({"sub": "other-targets@example.com"})
    non_owner = client.get(
        "/marketplace/products/1/repost-targets",
        headers={"Authorization": f"Bearer {non_owner_token}"},
    )
    assert non_owner.status_code == 403, non_owner.text


def test_public_shop_picture_stays_scoped_to_one_shop_in_shared_community(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    original_owner_image = "/uploads/marketplace/images/owner-one-old.jpg"
    new_owner_image = "/uploads/marketplace/images/owner-one-new.jpg"
    other_owner_image = "/uploads/marketplace/images/owner-two.jpg"

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'owner-one@example.com', 'hashed', 'Owner One', 'user', 'GMFN-U-SHOPPIC1'),
                    (2, 'owner-two@example.com', 'hashed', 'Owner Two', 'user', 'GMFN-U-SHOPPIC2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'SHOPPIC1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    image_url, is_active
                ) VALUES
                    (
                        1, 1, 1, 'OWNER ONE SHOP', 'Owner one public shop',
                        :original_owner_image, 1
                    ),
                    (
                        2, 1, 2, 'OWNER TWO SHOP', 'Owner two public shop',
                        :other_owner_image, 1
                    )
                """
            ),
            {
                "original_owner_image": original_owner_image,
                "other_owner_image": other_owner_image,
            },
        )

    update = client.patch(
        "/marketplace/shops/1",
        json={"image_url": new_owner_image},
    )
    assert update.status_code == 200, update.text
    assert update.json()["item"]["image_url"] == new_owner_image

    owner_public_shop = client.get("/marketplace/public/shop/GMFN-U-SHOPPIC1")
    assert owner_public_shop.status_code == 200, owner_public_shop.text
    owner_item = owner_public_shop.json()["item"]
    assert owner_item["gmfn_id"] == "GMFN-U-SHOPPIC1"
    assert owner_item["community_name"] == "Homeland ISA Marketplace"
    assert owner_item["image_url"] == new_owner_image
    assert owner_item["photo_url"] == new_owner_image
    assert owner_item["shop_logo_url"] == new_owner_image

    other_public_shop = client.get("/marketplace/public/shop/GMFN-U-SHOPPIC2")
    assert other_public_shop.status_code == 200, other_public_shop.text
    other_item = other_public_shop.json()["item"]
    assert other_item["gmfn_id"] == "GMFN-U-SHOPPIC2"
    assert other_item["community_name"] == "Homeland ISA Marketplace"
    assert other_item["image_url"] == other_owner_image
    assert other_item["photo_url"] == other_owner_image
    assert other_item["shop_logo_url"] == other_owner_image


def test_public_shop_face_falls_back_to_live_community_spotlight(client, tmp_path, monkeypatch):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _ensure_marketplace_tables()

    community_spotlight_url = _write_upload(
        tmp_path,
        "marketplace/images/community-public-spotlight.jpg",
    )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id, trust_score, trust_band
                ) VALUES
                    (1, 'owner@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-PUBLICOWNER', 70, 'B'),
                    (2, 'seller@example.com', 'hashed', 'Spotlight Seller', 'user', 'GMFN-U-LIVESPOT', 82, 'A')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'PUBLICSPOT1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES
                    (1, 1, 1, 'OWNER PUBLIC SHOP', 'Owner goods', 1),
                    (2, 1, 2, 'LIVE SPOTLIGHT SHOP', 'Spotlight goods', 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message,
                    image_url, video_url, priority_mode, visibility_scope,
                    expires_at, created_at
                ) VALUES (
                    1, 1, 2, 2, 'Community live spotlight',
                    :image_url, NULL, 'free', 'direct_communities',
                    :expires_at, :created_at
                )
                """
            ),
            {
                "image_url": community_spotlight_url,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=3),
                "created_at": datetime.now(timezone.utc),
            },
        )

    res = client.get("/marketplace/public/shop/GMFN-U-PUBLICOWNER")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["item"]["gmfn_id"] == "GMFN-U-PUBLICOWNER"
    assert body["primary_broadcast"]["message"] == "Community live spotlight"
    assert body["primary_broadcast"]["author_gmfn_id"] == "GMFN-U-LIVESPOT"
    assert body["primary_broadcast"]["source_shop_name"] == "LIVE SPOTLIGHT SHOP"
    assert body["primary_broadcast"]["image_url"] == community_spotlight_url
    assert len(body["broadcasts"]) == 1


def test_public_shop_face_uses_current_community_spotlight_not_owner_old_broadcast(
    client,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _ensure_marketplace_tables()

    owner_old_image_url = _write_upload(tmp_path, "marketplace/images/owner-old.jpg")
    community_spotlight_url = _write_upload(tmp_path, "marketplace/images/ardent-live.jpg")

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'cbuk@example.com', 'hashed', 'CBUK Green Energy', 'user', 'GMFN-U-CBUK'),
                    (2, 'ardent@example.com', 'hashed', 'Ardent Ebony', 'user', 'GMFN-U-ARDENT')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'GNS', 'GNS Marketplace', 'GNSLIVE1'),
                    (2, 'Old Route', 'Old Route Marketplace', 'OLDROUTE1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0),
                    (3, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES
                    (1, 1, 1, 'CBUK GREEN ENERGY', 'Renewable products', 1),
                    (3, 1, 2, 'ARDENT EBONY UPLIFT LTD', 'General merchandise', 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message,
                    image_url, video_url, priority_mode, visibility_scope,
                    expires_at, created_at
                ) VALUES
                    (
                        1, 2, 1, 1, 'Owner old spotlight that must not leak',
                        :owner_old_image_url, NULL, 'free', 'direct_communities',
                        :expires_at, :owner_created_at
                    ),
                    (
                        2, 1, 2, 3, 'Ardent community spotlight',
                        :community_spotlight_url, NULL, 'free', 'direct_communities',
                        :expires_at, :community_created_at
                    )
                """
            ),
            {
                "owner_old_image_url": owner_old_image_url,
                "community_spotlight_url": community_spotlight_url,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=3),
                "owner_created_at": datetime.now(timezone.utc) + timedelta(minutes=1),
                "community_created_at": datetime.now(timezone.utc),
            },
        )

    res = client.get("/marketplace/public/shop/GMFN-U-CBUK")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["clan_id"] == 1
    assert body["spotlight_scope"] == "community"
    assert body["spotlight_clan_ids"] == [1]
    assert body["primary_broadcast"]["message"] == "Ardent community spotlight"
    assert body["primary_broadcast"]["author_gmfn_id"] == "GMFN-U-ARDENT"
    assert body["primary_broadcast"]["source_shop_name"] == "ARDENT EBONY UPLIFT LTD"
    assert body["primary_broadcast"]["image_url"] == community_spotlight_url
    assert body["verification"]["primary_scan_path"] == "/verify/community/1"


def test_refresh_public_shop_link_reactivates_stale_owner_shop(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-STALESHOP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Golden boys', 'Golden boys Marketplace', 'STALESHOP1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Dormant shop', 'Old hidden shop', 0
                )
                """
            )
        )

    stale_public = client.get("/marketplace/public/shop/GMFN-U-STALESHOP")
    assert stale_public.status_code == 404

    refresh = client.post(
        "/marketplace/shops",
        json={
            "clan_id": 1,
            "name": "Reconnected public shop",
            "description": "Public GSN shop face for active shop blocks.",
        },
    )
    assert refresh.status_code == 200, refresh.text
    refreshed_body = refresh.json()
    assert refreshed_body["detail"] == "Existing canonical shop reactivated."
    assert refreshed_body["item"]["id"] == 1
    assert refreshed_body["item"]["is_active"] is True
    assert refreshed_body["item"]["name"] == "Reconnected public shop"

    public_shop = client.get("/marketplace/public/shop/GMFN-U-STALESHOP")
    assert public_shop.status_code == 200, public_shop.text
    public_body = public_shop.json()
    assert public_body["is_public_shop_face"] is True
    assert public_body["item"]["id"] == 1
    assert public_body["item"]["name"] == "Reconnected public shop"
    assert public_body["item"]["gmfn_id"] == "GMFN-U-STALESHOP"


def test_public_shop_name_is_not_downgraded_by_default_fallback(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Ardent Owner', 'user', 'GMFN-U-NAMEKEEP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'NAMEKEEP1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Ardent Ebony Uplift LTD', 'Real shop identity', 1
                )
                """
            )
        )

    patch_res = client.patch(
        "/marketplace/shops/1",
        json={
            "clan_id": 1,
            "name": "My GSN Shop",
            "description": "Real shop identity",
        },
    )
    assert patch_res.status_code == 200, patch_res.text
    assert patch_res.json()["item"]["name"] == "Ardent Ebony Uplift LTD"

    upsert_res = client.post(
        "/marketplace/shops",
        json={
            "clan_id": 1,
            "name": "My GSN Shop",
            "description": "Still the same shop",
        },
    )
    assert upsert_res.status_code == 200, upsert_res.text
    assert upsert_res.json()["item"]["name"] == "Ardent Ebony Uplift LTD"

    public_res = client.get("/marketplace/public/shop/GMFN-U-NAMEKEEP")
    assert public_res.status_code == 200, public_res.text
    assert public_res.json()["item"]["name"] == "Ardent Ebony Uplift LTD"


def test_public_gallery_slot_limit_counts_legacy_public_visibility_aliases(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Block Owner', 'user', 'GMFN-U-BLOCKCAP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'BLOCKCAP1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Block Cap Shop', 'Slot cap test', 1
                )
                """
            )
        )
        for slot in range(1, 13):
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, image_url, visibility_mode, is_active
                    ) VALUES (
                        :id, 1, 1, 1, :title, :description,
                        '1000', 'NGN', '/uploads/marketplace/images/alias.jpg', 'public', 1
                    )
                    """
                ),
                {
                    "id": slot,
                    "title": f"Alias public block {slot}",
                    "description": f"[BLOCK:{slot}] Alias public block",
                },
            )

    create_res = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "name": "Thirteenth block",
            "description": "[BLOCK:13] Should be rejected",
            "price": "2000",
            "currency": "NGN",
            "image_url": "/uploads/marketplace/images/new.jpg",
            "visibility_mode": "community_visible",
        },
    )
    assert create_res.status_code == 400, create_res.text
    assert "Maximum of 12 community-visible products" in create_res.json()["detail"]


def test_public_gallery_replacing_numbered_block_hides_previous_live_product(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Block Owner', 'user', 'GMFN-U-BLOCKREPLACE'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'BLOCKREPLACE1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Block Replace Shop', 'Replace slot test', 1
                )
                """
            )
        )
        for slot in range(1, 13):
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, image_url, visibility_mode, is_active
                    ) VALUES (
                        :id, 1, 1, 1, :title, :description,
                        '1000', 'NGN', :image_url, 'community_visible', 1
                    )
                    """
                ),
                {
                    "id": slot,
                    "title": f"Original block {slot}",
                    "description": f"[BLOCK:{slot}] Original public block",
                    "image_url": f"/uploads/marketplace/images/original-{slot}.jpg",
                },
            )

    create_res = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "name": "Replacement block six",
            "description": "[BLOCK:6] New block six product",
            "price": "2000",
            "currency": "NGN",
            "image_url": "/uploads/marketplace/images/replacement-6.jpg",
            "visibility_mode": "community_visible",
        },
    )
    assert create_res.status_code == 200, create_res.text
    body = create_res.json()
    assert body["item"]["public_block_number"] == 6
    assert body["replaced_public_block_products"] == 1

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, title, is_active
                FROM marketplace_products
                WHERE shop_id = 1 AND description LIKE '[BLOCK:6]%'
                ORDER BY id ASC
                """
            )
        ).fetchall()
        active_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM marketplace_products
                WHERE shop_id = 1 AND is_active = 1
                """
            )
        ).scalar()

    assert [(row.id, row.title, row.is_active) for row in rows] == [
        (6, "Original block 6", False),
        (13, "Replacement block six", True),
    ]
    assert active_count == 12

    products_res = client.get("/marketplace/products?clan_id=1&shop_id=1")
    assert products_res.status_code == 200, products_res.text
    active_items = products_res.json()["items"]
    block_six_items = [
        item for item in active_items if item["public_block_number"] == 6
    ]
    assert len(active_items) == 12
    assert len(block_six_items) == 1
    assert block_six_items[0]["name"] == "Replacement block six"


def test_public_gallery_replacing_overflow_block_hides_legacy_unmarked_product(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Block Owner', 'user', 'GMFN-U-BLOCKOVERFLOW'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'BLOCKOVERFLOW1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Block Overflow Shop', 'Legacy overflow slot test', 1
                )
                """
            )
        )
        for slot in [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]:
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, image_url, visibility_mode, is_active
                    ) VALUES (
                        :id, 1, 1, 1, :title, :description,
                        '1000', 'NGN', :image_url, 'community_visible', 1
                    )
                    """
                ),
                {
                    "id": slot,
                    "title": f"Original block {slot}",
                    "description": f"[BLOCK:{slot}] Original public block",
                    "image_url": f"/uploads/marketplace/images/original-{slot}.jpg",
                },
            )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES (
                    20, 1, 1, 1, 'Legacy unmarked block two',
                    'Legacy product without block metadata',
                    '1500', 'NGN', '/uploads/marketplace/images/legacy-2.jpg',
                    'community_visible', 1
                )
                """
            )
        )

    before_res = client.get("/marketplace/products?clan_id=1&shop_id=1")
    assert before_res.status_code == 200, before_res.text
    legacy_item = next(
        item
        for item in before_res.json()["items"]
        if item["name"] == "Legacy unmarked block two"
    )
    assert legacy_item["public_block_number"] == 2
    assert legacy_item["slot_number"] == 2
    assert legacy_item["display_block_number"] == 2
    assert legacy_item["metadata_block_number"] is None
    limited_res = client.get("/marketplace/products?clan_id=1&shop_id=1&limit=1")
    assert limited_res.status_code == 200, limited_res.text
    limited_item = limited_res.json()["items"][0]
    assert limited_item["name"] == "Legacy unmarked block two"
    assert limited_item["public_block_number"] == 2
    assert limited_item["display_block_number"] == 2
    owner_limited_res = client.get("/marketplace/shops/me?clan_id=1&product_limit=1")
    assert owner_limited_res.status_code == 200, owner_limited_res.text
    owner_limited_item = owner_limited_res.json()["products"][0]
    assert owner_limited_item["name"] == "Legacy unmarked block two"
    assert owner_limited_item["public_block_number"] == 2
    assert owner_limited_item["display_block_number"] == 2
    public_deep_link_res = client.get(
        "/marketplace/public/shop/GMFN-U-BLOCKOVERFLOW?clan_id=1&product_id=20&product_limit=1"
    )
    assert public_deep_link_res.status_code == 200, public_deep_link_res.text
    public_deep_link_item = public_deep_link_res.json()["products"][0]
    assert public_deep_link_item["name"] == "Legacy unmarked block two"
    assert public_deep_link_item["public_block_number"] == 2
    assert public_deep_link_item["display_block_number"] == 2

    create_res = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "name": "Replacement block two",
            "description": "[BLOCK:2] New explicit block two",
            "price": "2500",
            "currency": "NGN",
            "image_url": "/uploads/marketplace/images/replacement-2.jpg",
            "visibility_mode": "community_visible",
        },
    )
    assert create_res.status_code == 200, create_res.text
    body = create_res.json()
    assert body["item"]["public_block_number"] == 2
    assert body["replaced_public_block_products"] == 1

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, title, is_active
                FROM marketplace_products
                WHERE id IN (20, 21)
                ORDER BY id ASC
                """
            )
        ).fetchall()
        active_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM marketplace_products
                WHERE shop_id = 1 AND is_active = 1
                """
            )
        ).scalar()

    assert [(row.id, row.title, row.is_active) for row in rows] == [
        (20, "Legacy unmarked block two", False),
        (21, "Replacement block two", True),
    ]
    assert active_count == 12

    products_res = client.get("/marketplace/products?clan_id=1&shop_id=1")
    assert products_res.status_code == 200, products_res.text
    active_items = products_res.json()["items"]
    assert len(active_items) == 12
    assert [item["name"] for item in active_items if item["public_block_number"] == 2] == [
        "Replacement block two"
    ]


def test_public_gallery_update_to_numbered_block_hides_previous_live_product(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Block Owner', 'user', 'GMFN-U-BLOCKUPDATE'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'BLOCKUPDATE1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Block Update Shop', 'Update slot test', 1
                )
                """
            )
        )
        for slot in range(1, 13):
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, image_url, visibility_mode, is_active
                    ) VALUES (
                        :id, 1, 1, 1, :title, :description,
                        '1000', 'NGN', :image_url, 'community_visible', 1
                    )
                    """
                ),
                {
                    "id": slot,
                    "title": f"Original block {slot}",
                    "description": f"[BLOCK:{slot}] Original public block",
                    "image_url": f"/uploads/marketplace/images/original-{slot}.jpg",
                },
            )

    update_res = client.patch(
        "/marketplace/products/7",
        json={
            "clan_id": 1,
            "name": "Edited into block six",
            "description": "[BLOCK:6] Edited product now owns block six",
            "price": "3000",
            "currency": "NGN",
            "image_url": "/uploads/marketplace/images/edited-6.jpg",
            "visibility_mode": "community_visible",
        },
    )
    assert update_res.status_code == 200, update_res.text
    body = update_res.json()
    assert body["item"]["id"] == 7
    assert body["item"]["public_block_number"] == 6
    assert body["replaced_public_block_products"] == 1

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, title, is_active
                FROM marketplace_products
                WHERE shop_id = 1 AND description LIKE '[BLOCK:6]%'
                ORDER BY id ASC
                """
            )
        ).fetchall()
        active_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM marketplace_products
                WHERE shop_id = 1 AND is_active = 1
                """
            )
        ).scalar()

    assert [(row.id, row.title, row.is_active) for row in rows] == [
        (6, "Original block 6", False),
        (7, "Edited into block six", True),
    ]
    assert active_count == 11

    products_res = client.get("/marketplace/products?clan_id=1&shop_id=1")
    assert products_res.status_code == 200, products_res.text
    active_items = products_res.json()["items"]
    assert [item["name"] for item in active_items if item["public_block_number"] == 6] == [
        "Edited into block six"
    ]


def test_public_gallery_reads_hide_older_duplicate_active_numbered_blocks(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Block Owner', 'user', 'GMFN-U-BLOCKDEDUP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'BLOCKDEDUP1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Block Dedup Shop', 'Duplicate slot test', 1
                )
                """
            )
        )
        for slot in range(1, 13):
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, image_url, visibility_mode, is_active
                    ) VALUES (
                        :id, 1, 1, 1, :title, :description,
                        '1000', 'NGN', :image_url, 'community_visible', 1
                    )
                    """
                ),
                {
                    "id": slot,
                    "title": f"Original block {slot}",
                    "description": f"[BLOCK:{slot}] Original public block",
                    "image_url": f"/uploads/marketplace/images/original-{slot}.jpg",
                },
            )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES (
                    13, 1, 1, 1, 'Newest block six', '[BLOCK:6] Newer duplicate block',
                    '2000', 'NGN', '/uploads/marketplace/images/newest-6.jpg',
                    'community_visible', 1
                )
                """
            )
        )

    products_res = client.get("/marketplace/products?clan_id=1&shop_id=1")
    assert products_res.status_code == 200, products_res.text
    product_items = products_res.json()["items"]
    assert len(product_items) == 12
    assert [item["name"] for item in product_items if item["public_block_number"] == 6] == [
        "Newest block six"
    ]

    owner_res = client.get("/marketplace/shops/me?clan_id=1")
    assert owner_res.status_code == 200, owner_res.text
    owner_products = owner_res.json()["products"]
    assert len(owner_products) == 12
    assert [item["name"] for item in owner_products if item["public_block_number"] == 6] == [
        "Newest block six"
    ]

    public_res = client.get("/marketplace/public/shop/GMFN-U-BLOCKDEDUP?clan_id=1")
    assert public_res.status_code == 200, public_res.text
    public_products = public_res.json()["products"]
    assert len(public_products) == 12
    assert [item["name"] for item in public_products if item["public_block_number"] == 6] == [
        "Newest block six"
    ]

    old_deep_link_res = client.get(
        "/marketplace/public/shop/GMFN-U-BLOCKDEDUP?clan_id=1&product_id=6&product_limit=1"
    )
    assert old_deep_link_res.status_code == 200, old_deep_link_res.text
    old_deep_link_products = old_deep_link_res.json()["products"]
    assert [item["name"] for item in old_deep_link_products] == [
        "Newest block six"
    ]


def test_public_gallery_extra_shop_block_entitlement_expands_slot_limit(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()
    now = datetime.now(timezone.utc)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Block Owner', 'user', 'GMFN-U-BLOCKPLUS'
                ), (
                    2, 'admin@example.com', 'hashed', 'Package Admin', 'admin', 'GMFN-U-PACKAGEADMIN'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Homeland ISA', 'Homeland ISA Marketplace', 'BLOCKPLUS1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Block Plus Shop', 'Extra slot test', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    payment_reference
                ) VALUES (
                    1, 2, 1, 1, 'extra_shop_block', 'extra_shop_blocks',
                    3, 0, 'active', :starts_at, :expires_at,
                    'GMFN-EXTRA-BLOCKS'
                )
                """
            ),
            {
                "starts_at": now - timedelta(minutes=1),
                "expires_at": now + timedelta(days=365),
            },
        )
        for slot in range(1, 13):
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, image_url, visibility_mode, is_active
                    ) VALUES (
                        :id, 1, 1, 1, :title, :description,
                        '1000', 'NGN', '/uploads/marketplace/images/alias.jpg', 'public', 1
                    )
                    """
                ),
                {
                    "id": slot,
                    "title": f"Alias public block {slot}",
                    "description": f"[BLOCK:{slot}] Alias public block",
                },
            )

    create_res = client.post(
        "/marketplace/products",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "name": "Thirteenth block",
            "description": "[BLOCK:13] Paid extra slot",
            "price": "2000",
            "currency": "NGN",
            "image_url": "/uploads/marketplace/images/new.jpg",
            "visibility_mode": "community_visible",
        },
    )
    assert create_res.status_code == 200, create_res.text
    item = create_res.json()["item"]
    assert item["public_block_number"] == 13
    assert item["shop_product_slots_free"] == 12
    assert item["shop_product_slots_extra"] == 3
    assert item["shop_product_slots_total"] == 15


def test_public_shop_face_hides_missing_media_links(client, monkeypatch, tmp_path):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Chuma Seller', 'user', 'GMFN-U-MISSING'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Golden boys', 'Golden boys Marketplace', 'PUBLICTEST2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Fresh Rice', 'Bag of rice',
                    '25000', 'NGN', '/uploads/marketplace/images/missing.jpg', 'community_visible', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message,
                    image_url, priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    1, 1, 1, 1, 'Spotlight update',
                    '/uploads/marketplace/images/missing-spotlight.jpg', 'free', 'direct_communities',
                    :expires_at, :created_at
                )
                """
            ),
            {
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=3),
                "created_at": datetime.now(timezone.utc),
            },
        )

    res = client.get("/marketplace/public/shop/GMFN-U-MISSING")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["products"][0]["image_url"] == "/uploads/marketplace/images/missing.jpg"
    assert body["products"][0]["image_url_available"] is False
    assert body["primary_broadcast"]["image_url"] == "/uploads/marketplace/images/missing-spotlight.jpg"
    assert body["primary_broadcast"]["image_url_available"] is False


def test_shop_gallery_products_follow_owner_across_membership_communities(
    client,
    monkeypatch,
    override_current_user_user,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _ensure_marketplace_tables()

    product_image_url = _write_upload(tmp_path, "marketplace/images/global-product.jpg")
    vault_image_url = _write_upload(tmp_path, "marketplace/images/private-product.jpg")

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'global-shop@example.com', 'hashed', 'Global Shop Owner', 'user', 'GMFN-U-GLOBALSHOP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Origin clan', 'Origin Marketplace', 'GLOBALSHOP1'),
                    (2, 'Second clan', 'Second Marketplace', 'GLOBALSHOP2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'GLOBAL OWNER SHOP', 'One owner shelf', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES
                    (
                        1, 1, 1, 1, 'Origin Public Product', 'Visible in every owner community',
                        '1000', 'NGN', :product_image_url, 'community_visible', 1
                    ),
                    (
                        2, 1, 1, 1, 'Private Vault Product', 'Must stay private',
                        '9000', 'NGN', :vault_image_url, 'vault_private', 1
                    ),
                    (
                        3, 2, 1, 1, 'Second Community Product', 'Also part of the same public shop',
                        '1500', 'NGN', :product_image_url, 'community_visible', 1
                    )
                """
            ),
            {
                "product_image_url": product_image_url,
                "vault_image_url": vault_image_url,
            },
        )

    community_feed = client.get("/marketplace/products?clan_id=2")
    assert community_feed.status_code == 200, community_feed.text
    community_names = [item["name"] for item in community_feed.json()["items"]]
    assert "Origin Public Product" in community_names
    assert "Private Vault Product" not in community_names

    owner_shop = client.get("/marketplace/shops/by-gmfn/GMFN-U-GLOBALSHOP?clan_id=2")
    assert owner_shop.status_code == 200, owner_shop.text
    owner_shop_names = [item["name"] for item in owner_shop.json()["products"]]
    assert set(owner_shop_names) == {"Origin Public Product", "Second Community Product"}

    public_shop = client.get("/marketplace/public/shop/GMFN-U-GLOBALSHOP?clan_id=2")
    assert public_shop.status_code == 200, public_shop.text
    assert public_shop.json()["clan_id"] == 2
    assert public_shop.json()["community_name"] == "Second Marketplace"
    public_names = [item["name"] for item in public_shop.json()["products"]]
    assert set(public_names) == {"Origin Public Product", "Second Community Product"}
    assert "Private Vault Product" not in public_names


def test_my_marketplace_shop_returns_owner_public_gallery_blocks(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    hidden_image_url = "/uploads/marketplace/images/my-shop-private.jpg"

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Owner Control User', 'user', 'GMFN-U-MYSHOP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Owner home', 'Owner Home Marketplace', 'MYSHOP1'),
                    (2, 'Second home', 'Second Home Marketplace', 'MYSHOP2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'OWNER CONTROL SHOP', 'Owner truth route', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES
                    (
                        1, 1, 1, 1, 'Public Block One', '[BLOCK:1] Public block #1',
                        '1000', 'NGN', '/uploads/marketplace/images/my-shop-public-1.jpg',
                        'community_visible', 1
                    ),
                    (
                        2, 1, 1, 1, 'Public Block Two', '[BLOCK:2] Public block #2',
                        '2000', 'NGN', '/uploads/marketplace/images/my-shop-public-2.jpg',
                        'community_visible', 1
                    ),
                    (
                        3, 1, 1, 1, 'Public Block Three', '[BLOCK:3] Public block #3',
                        '3000', 'NGN', '/uploads/marketplace/images/my-shop-public-3.jpg',
                        'community_visible', 1
                    ),
                    (
                        4, 1, 1, 1, 'Public Block Four', '[BLOCK:4] Public block #4',
                        '4000', 'NGN', '/uploads/marketplace/images/my-shop-public-4.jpg',
                        'community_visible', 1
                    ),
                    (
                        5, 1, 1, 1, 'Public Block Five', '[BLOCK:5] Public block #5',
                        '5000', 'NGN', '/uploads/marketplace/images/my-shop-public-5.jpg',
                        'community_visible', 1
                    ),
                    (
                        6, 1, 1, 1, 'Vault Item', '[BLOCK:6] Private block',
                        '9000', 'NGN', :hidden_image_url, 'vault_private', 1
                    ),
                    (
                        7, 1, 1, 1, 'Inactive Public Block', '[BLOCK:7] Inactive public block',
                        '7000', 'NGN', '/uploads/marketplace/images/my-shop-inactive.jpg',
                        'community_visible', 0
                    )
                """
            ),
            {
                "hidden_image_url": hidden_image_url,
            },
        )

    res = client.get("/marketplace/shops/me?clan_id=2")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["item"]["name"] == "OWNER CONTROL SHOP"
    assert body["item"]["gmfn_id"] == "GMFN-U-MYSHOP"
    assert body["clan_id"] == 2
    names = [item["name"] for item in body["products"]]
    assert set(names) == {
        "Public Block One",
        "Public Block Two",
        "Public Block Three",
        "Public Block Four",
        "Public Block Five",
    }
    assert "Vault Item" not in names
    assert "Inactive Public Block" not in names
    slot_map = {
        int(item["id"]): int(item["public_block_number"])
        for item in body["products"]
    }
    assert slot_map == {1: 1, 2: 2, 3: 3, 4: 4, 5: 5}
    assert all(
        int(item["slot_number"]) == int(item["public_block_number"])
        for item in body["products"]
    )

    public_res = client.get(
        "/marketplace/public/shop/GMFN-U-MYSHOP?clan_id=2&product_limit=300"
    )
    assert public_res.status_code == 200, public_res.text
    public_body = public_res.json()
    public_slot_map = {
        int(item["id"]): int(item["public_block_number"])
        for item in public_body["products"]
    }
    assert public_slot_map == slot_map


def test_marketplace_shop_list_counts_member_global_shop_in_each_membership_community(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-LISTSHOP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Origin community', 'Origin Marketplace', 'LISTSHOP1'),
                    (2, 'Second community', 'Second Marketplace', 'LISTSHOP2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'ONE GLOBAL SHOP', 'Visible wherever owner belongs', 1
                )
                """
            )
        )

    res = client.get("/marketplace/shops?clan_id=2&only_active=true")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["clan_id"] == 2
    assert body["total"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["name"] == "ONE GLOBAL SHOP"
    assert body["items"][0]["gmfn_id"] == "GMFN-U-LISTSHOP"


def test_shop_spotlight_publish_targets_all_eligible_owner_communities(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-SPOTLIGHT'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Golden boys', 'Golden boys Marketplace', 'SPOTLIGHT1'),
                    (2, 'Aberdeen city ICA', 'Aberdeen city ICA Marketplace', 'SPOTLIGHT2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods', 1
                )
                """
            )
        )

    res = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Fresh spotlight - N90k - Available today for delivery",
            "image_url": "/uploads/marketplace/images/live-spotlight.jpg",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["propagated_count"] == 2
    assert body["propagated_clan_ids"] == [1, 2]
    assert body["skipped_capacity_clan_ids"] == []
    assert body["item"]["source_product_title"] == "Fresh spotlight"
    assert body["item"]["source_product_description"] == "Available today for delivery"
    assert body["item"]["source_product_price"] == "N90k"
    assert body["item"]["source_product_category"] == "Spotlight update"
    assert body["item"]["source_product_availability"] == "Available today for delivery"
    assert body["item"]["spotlight_owner"] == "CHUMA INTERNATIONAL SHOP"
    assert body["item"]["spotlight_community"] == "Golden boys Marketplace"
    assert body["item"]["spotlight_contact_available"] is False

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT clan_id
                FROM marketplace_broadcasts
                ORDER BY id ASC
                """
            )
        ).fetchall()

    assert [int(row[0]) for row in rows] == [1, 2]


def test_shop_spotlight_publish_ignores_community_capacity_but_blocks_second_daily_free_run(
    client,
    override_current_user_user,
    monkeypatch,
):
    _ensure_marketplace_tables()
    fixed_now = datetime(2026, 6, 17, 12, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(marketplace_routes, "_now_utc", lambda: fixed_now)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-SPOTLIGHT'),
                    (2, 'other@example.com', 'hashed', 'Other Owner', 'user', 'GMFN-U-OTHER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Golden boys', 'Golden boys Marketplace', 'SPOTLIGHT1'),
                    (2, 'Aberdeen city ICA', 'Aberdeen city ICA Marketplace', 'SPOTLIGHT2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0),
                    (3, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES
                    (1, 1, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods', 1),
                    (2, 1, 2, 'OTHER SHOP', 'Already live', 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message, image_url,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES
                (
                    1, 1, 2, 2, 'Already live', '/uploads/marketplace/images/other.jpg',
                    'free', 'direct_communities', :expires_at, :created_at
                ),
                (
                    2, 2, 2, 2, 'Paid reach should not consume free quota',
                    '/uploads/marketplace/images/paid.jpg',
                    'paid', 'marketplace_repost', :expires_at, :created_at
                )
                """
            ),
            {
                "expires_at": fixed_now + timedelta(days=1),
                "created_at": fixed_now - timedelta(minutes=5),
            },
        )

    res = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Fresh spotlight",
            "image_url": "/uploads/marketplace/images/live-spotlight.jpg",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["propagated_count"] == 2
    assert body["propagated_clan_ids"] == [1, 2]
    assert body["skipped_capacity_clan_ids"] == []
    assert body["skipped_capacity_count"] == 0
    assert body["free_spotlight_daily_limit_per_author"] == 1
    assert body["free_spotlight_used_today_before_publish"] == 0

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT clan_id, message
                FROM marketplace_broadcasts
                ORDER BY id ASC
                """
            )
        ).fetchall()

    assert [(int(row[0]), row[1]) for row in rows] == [
        (1, "Already live"),
        (2, "Paid reach should not consume free quota"),
        (1, "Fresh spotlight"),
        (2, "Fresh spotlight"),
    ]

    second_res = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Second free spotlight",
            "image_url": "/uploads/marketplace/images/second-live-spotlight.jpg",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )
    assert second_res.status_code == 400, second_res.text
    assert "free Spotlight for today is already active" in second_res.text


def test_shop_spotlight_publish_ignores_stale_requested_clan_for_owned_shop(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-SPOTLIGHT'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Golden boys', 'Golden boys Marketplace', 'SPOTLIGHT1'),
                    (2, 'Aberdeen city ICA', 'Aberdeen city ICA Marketplace', 'SPOTLIGHT2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods', 1
                )
                """
            )
        )

    res = client.post(
        "/marketplace/broadcasts",
        headers={"X-Clan-Id": "2"},
        json={
            "clan_id": 2,
            "shop_id": 1,
            "message": "Fresh spotlight",
            "image_url": "/uploads/marketplace/images/live-spotlight.jpg",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["propagated_clan_ids"] == [1]


def test_free_spotlight_daily_identity_limit_blocks_same_author_test_week_override(
    client,
    override_current_user_user,
    monkeypatch,
):
    _ensure_marketplace_tables()
    fixed_now = datetime(2026, 5, 10, 12, 0, 0, tzinfo=timezone.utc)
    monkeypatch.setenv("GMFN_SPOTLIGHT_CAPACITY_OVERRIDE", "0")
    monkeypatch.setattr(marketplace_routes, "_now_utc", lambda: fixed_now)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-SPOTLIGHT'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (3, 'Clan Three', 'Clan Three Marketplace', 'SPOTLIGHT3')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 3, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 3, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message, image_url,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    1, 3, 1, 1, 'Already live', '/uploads/marketplace/images/live.jpg',
                    'free', 'direct_communities', :expires_at, :created_at
                )
                """
            ),
            {
                "expires_at": datetime(2026, 5, 11, 12, 0, 0, tzinfo=timezone.utc),
                "created_at": fixed_now,
            },
        )

    res = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 3,
            "shop_id": 1,
            "message": "Test-week free spotlight",
            "image_url": "/uploads/marketplace/images/test-week.jpg",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )
    assert res.status_code == 400, res.text
    assert "free Spotlight for today is already active" in res.text

    with engine.begin() as conn:
        broadcast_count = conn.execute(
            text("SELECT COUNT(*) FROM marketplace_broadcasts WHERE clan_id = 3")
        ).scalar_one()

    assert int(broadcast_count) == 1


def test_paid_spotlight_requires_unused_subscription_credit(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-PAIDSPOT'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Golden boys', 'Golden boys Marketplace', 'PAIDSPOT1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message, image_url,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    1, 1, 1, 1, 'Free lane already full',
                    '/uploads/marketplace/images/free-full.jpg',
                    'free', 'direct_communities', :expires_at, :created_at
                )
                """
            ),
            {
                "expires_at": datetime.now(timezone.utc) + timedelta(days=1),
                "created_at": datetime.now(timezone.utc) - timedelta(minutes=5),
            },
        )

    blocked = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Paid spotlight",
            "priority_mode": "paid",
            "visibility_scope": "direct_communities",
        },
    )
    assert blocked.status_code == 403, blocked.text

    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    payment_reference
                ) VALUES (
                    1, 1, 1, 1, 'spotlight_priority', 'spotlight_credit_pack',
                    1, 0, 'active', :starts_at, :expires_at, 'GMFN-SPOT-TEST'
                )
                """
            ),
            {
                "starts_at": now - timedelta(minutes=1),
                "expires_at": now + timedelta(days=30),
            },
        )

    status_before = client.get("/marketplace/shops/1/spotlight-status")
    assert status_before.status_code == 200, status_before.text
    assert status_before.json()["available_paid_credits"] == 1
    assert status_before.json()["active_paid_spotlights"] == 0
    assert status_before.json()["can_publish_paid_spotlight"] is True

    published = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Paid spotlight",
            "priority_mode": "paid",
            "visibility_scope": "direct_communities",
        },
    )
    assert published.status_code == 200, published.text
    assert published.json()["item"]["priority_mode"] == "paid"
    assert published.json()["item"]["visibility_scope"] == "direct_communities"

    status_after = client.get("/marketplace/shops/1/spotlight-status")
    assert status_after.status_code == 200, status_after.text
    assert status_after.json()["available_paid_credits"] == 0
    assert status_after.json()["active_paid_spotlights"] == 1
    assert status_after.json()["can_publish_paid_spotlight"] is False

    second = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Second paid spotlight",
            "priority_mode": "paid",
            "visibility_scope": "direct_communities",
        },
    )
    assert second.status_code == 403, second.text

    with engine.begin() as conn:
        entitlement = conn.execute(
            text(
                """
                SELECT quantity_used
                FROM feature_entitlements
                WHERE id = 1
                """
            )
        ).fetchone()
        usage_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM feature_usage_events
                WHERE feature_code = 'spotlight_priority'
                """
            )
        ).scalar_one()

    assert int(entitlement[0]) == 1
    assert int(usage_count) == 1


def test_network_repost_does_not_block_direct_subscription_spotlight(
    client,
    monkeypatch,
):
    monkeypatch.setenv("SECRET_KEY", "pytest-repost-direct-paid-secret")
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Seller One', 'user', 'GMFN-U-PAIDMIX'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code, community_code)
                VALUES
                    (1, 'Source Community', 'Source Marketplace', 'PAIDMIX1', 'GMFN-C-000001'),
                    (2, 'Target Community', 'Target Marketplace', 'PAIDMIX2', 'GMFN-C-000002')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Seller Public Shop', 'Trusted products', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Fresh Rice', '[BLOCK:5] Bag of rice',
                    '25000', 'NGN', '/uploads/marketplace/images/rice.jpg',
                    'community_visible', 1
                )
                """
            )
        )
        now = datetime.now(timezone.utc)
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    payment_reference
                ) VALUES (
                    1, 1, 1, 1, 'spotlight_priority', 'spotlight_credit_pack',
                    2, 0, 'active', :starts_at, :expires_at, 'GMFN-SPOT-MIX'
                )
                """
            ),
            {
                "starts_at": now - timedelta(minutes=1),
                "expires_at": now + timedelta(days=30),
            },
        )

    token = create_access_token({"sub": "seller@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    repost = client.post(
        "/marketplace/products/1/repost",
        json={"target_community_code": "GMFN-C-000002", "duration_days": 1},
        headers=headers,
    )
    assert repost.status_code == 200, repost.text
    assert repost.json()["broadcast"]["visibility_scope"] == "marketplace_repost"

    status_after_repost = client.get("/marketplace/shops/1/spotlight-status", headers=headers)
    assert status_after_repost.status_code == 200, status_after_repost.text
    assert status_after_repost.json()["available_paid_credits"] == 1
    assert status_after_repost.json()["active_paid_spotlights"] == 0
    assert status_after_repost.json()["can_publish_paid_spotlight"] is True

    direct_paid = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Direct paid spotlight",
            "priority_mode": "paid",
            "visibility_scope": "direct_communities",
        },
        headers=headers,
    )
    assert direct_paid.status_code == 200, direct_paid.text
    assert direct_paid.json()["item"]["visibility_scope"] == "direct_communities"

    status_after_direct = client.get("/marketplace/shops/1/spotlight-status", headers=headers)
    assert status_after_direct.status_code == 200, status_after_direct.text
    assert status_after_direct.json()["available_paid_credits"] == 0
    assert status_after_direct.json()["active_paid_spotlights"] == 1
    assert status_after_direct.json()["can_publish_paid_spotlight"] is False


def test_paid_spotlight_blocks_second_active_run_even_with_unused_credit(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-PAIDCAP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Golden boys', 'Golden boys Marketplace', 'PAIDCAP1')
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
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'CHUMA INTERNATIONAL SHOP', 'All kinds of goods', 1
                )
                """
            )
        )
        now = datetime.now(timezone.utc)
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    payment_reference
                ) VALUES (
                    1, 1, 1, 1, 'spotlight_priority', 'spotlight_credit_pack',
                    2, 0, 'active', :starts_at, :expires_at, 'GMFN-SPOT-CAP'
                )
                """
            ),
            {
                "starts_at": now - timedelta(minutes=1),
                "expires_at": now + timedelta(days=30),
            },
        )

    first = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Paid spotlight",
            "priority_mode": "paid",
            "visibility_scope": "direct_communities",
        },
    )
    assert first.status_code == 200, first.text

    second = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Second paid spotlight",
            "priority_mode": "paid",
            "visibility_scope": "direct_communities",
        },
    )
    assert second.status_code == 400, second.text
    assert "already active" in second.json()["detail"]

    status_after = client.get("/marketplace/shops/1/spotlight-status")
    assert status_after.status_code == 200, status_after.text
    assert status_after.json()["available_paid_credits"] == 1
    assert status_after.json()["active_paid_spotlights"] == 1
    assert status_after.json()["can_publish_paid_spotlight"] is False


def test_marketplace_broadcast_delete_only_removes_matching_propagated_siblings(
    client,
    override_current_user_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-BROADDEL'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Golden boys', 'Golden boys Marketplace', 'BDEL1'),
                    (2, 'Aberdeen city ICA', 'Aberdeen city ICA Marketplace', 'BDEL2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'BROADCAST DELETE SHOP', 'Broadcast sibling scope', 1
                )
                """
            )
        )

    create = client.post(
        "/marketplace/broadcasts",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "message": "Same message",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )
    assert create.status_code == 200, create.text
    created_ids = [int(item["id"]) for item in create.json()["items"]]
    assert len(created_ids) == 2

    primary_id = created_ids[0]
    with engine.begin() as conn:
        seed = conn.execute(
            text(
                """
                SELECT created_at, expires_at
                FROM marketplace_broadcasts
                WHERE id = :id
                """
            ),
            {"id": primary_id},
        ).fetchone()
        assert seed is not None
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message, image_url,
                    video_url, priority_mode, visibility_scope, expires_at, created_at
                ) VALUES
                    (991, 1, 1, NULL, 'Same message', NULL, NULL, 'free', 'direct_communities', :expires_at, :created_at),
                    (992, 1, 1, 1, 'Same message', NULL, NULL, 'free', 'marketplace_repost', :expires_at, :created_at)
                """
            ),
            {
                "expires_at": seed[1],
                "created_at": seed[0],
            },
        )

    res = client.delete(f"/marketplace/broadcasts/{primary_id}")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["deleted_count"] == 2
    assert [item["id"] for item in body["deleted_items"]] == created_ids

    with engine.begin() as conn:
        remaining_ids = conn.execute(
            text("SELECT id FROM marketplace_broadcasts ORDER BY id ASC")
        ).fetchall()
        deleted_event_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'marketplace.broadcast.deleted'
                """
            )
        ).scalar_one()

    assert [int(row[0]) for row in remaining_ids] == [991, 992]
    assert int(deleted_event_count) == 2


def test_shop_follow_status_count_and_unfollow(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-shop-follow-secret")
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'shop-owner@example.com', 'hashed', 'Shop Owner', 'user', 'GMFN-U-FOLLOWOWNER'),
                    (2, 'shop-follower@example.com', 'hashed', 'Shop Follower', 'user', 'GMFN-U-FOLLOWER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Follow Clan', 'Follow Marketplace', 'FOLLOW1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Followable Shop', 'Trusted shop updates', 1
                )
                """
            )
        )

    token = create_access_token({"sub": "shop-follower@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    status_before = client.get("/marketplace/shops/1/follow-status", headers=headers)
    assert status_before.status_code == 200, status_before.text
    assert status_before.json()["is_following"] is False
    assert status_before.json()["can_follow"] is True
    assert status_before.json()["follower_count"] == 0

    first_follow = client.post("/marketplace/shops/1/follow", headers=headers)
    assert first_follow.status_code == 200, first_follow.text
    assert first_follow.json()["is_following"] is True
    assert first_follow.json()["already_following"] is False
    assert first_follow.json()["follower_count"] == 1
    with engine.begin() as conn:
        follow_events = (
            conn.execute(
                text(
                    """
                    SELECT event_type, actor_user_id, subject_user_id, meta_json
                    FROM trust_events
                    WHERE event_type = 'marketplace.shop.followed'
                    ORDER BY id
                    """
                )
            )
            .mappings()
            .all()
        )
    assert len(follow_events) == 1
    assert follow_events[0]["actor_user_id"] == 2
    assert follow_events[0]["subject_user_id"] == 1
    follow_meta = json.loads(follow_events[0]["meta_json"])
    assert follow_meta["shop_id"] == 1
    assert follow_meta["trust_delta"] == "0.00"
    assert follow_meta["signal_strength"] == "weak_social_attention"
    assert follow_meta["not_endorsement"] is True
    assert follow_meta["not_verification"] is True
    assert follow_meta["not_payment_evidence"] is True

    second_follow = client.post("/marketplace/shops/1/follow", headers=headers)
    assert second_follow.status_code == 200, second_follow.text
    assert second_follow.json()["already_following"] is True
    assert second_follow.json()["follower_count"] == 1
    with engine.begin() as conn:
        follow_event_count = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM trust_events
                WHERE event_type = 'marketplace.shop.followed'
                """
            )
        ).scalar_one()
    assert follow_event_count == 1

    public_count = client.get("/marketplace/shops/1/followers/count")
    assert public_count.status_code == 200, public_count.text
    assert public_count.json()["follower_count"] == 1

    unfollow = client.delete("/marketplace/shops/1/follow", headers=headers)
    assert unfollow.status_code == 200, unfollow.text
    assert unfollow.json()["is_following"] is False
    assert unfollow.json()["follower_count"] == 0
    with engine.begin() as conn:
        unfollow_events = (
            conn.execute(
                text(
                    """
                    SELECT event_type, actor_user_id, subject_user_id, meta_json
                    FROM trust_events
                    WHERE event_type = 'marketplace.shop.unfollowed'
                    ORDER BY id
                    """
                )
            )
            .mappings()
            .all()
        )
    assert len(unfollow_events) == 1
    assert unfollow_events[0]["actor_user_id"] == 2
    assert unfollow_events[0]["subject_user_id"] == 1
    unfollow_meta = json.loads(unfollow_events[0]["meta_json"])
    assert unfollow_meta["trust_delta"] == "0.00"
    assert unfollow_meta["signal_strength"] == "weak_social_attention"
    assert unfollow_meta["not_endorsement"] is True


def test_shop_product_create_notifies_visible_followers_only(client, monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "pytest-shop-follow-notification-secret")
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'notify-owner@example.com', 'hashed', 'Notify Owner', 'user', 'GMFN-U-NOTIFYOWNER'),
                    (2, 'notify-follower@example.com', 'hashed', 'Notify Follower', 'user', 'GMFN-U-NOTIFYFOLLOW'),
                    (3, 'notify-outsider@example.com', 'hashed', 'Notify Outsider', 'user', 'GMFN-U-NOTIFYOUT')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Visible Clan', 'Visible Marketplace', 'VISIBLE1'),
                    (2, 'Outside Clan', 'Outside Marketplace', 'OUTSIDE1')
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
                    (3, 2, 3, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Visible Follow Shop', 'Trusted visible shop', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO shop_followers (id, shop_id, follower_user_id)
                VALUES
                    (1, 1, 2),
                    (2, 1, 3)
                """
            )
        )

    owner_token = create_access_token({"sub": "notify-owner@example.com"})
    owner_headers = {"Authorization": f"Bearer {owner_token}"}
    created = client.post(
        "/marketplace/products",
        headers=owner_headers,
        json={
            "clan_id": 1,
            "shop_id": 1,
            "name": "Follower Rice",
            "description": "Bag of rice for visible followers",
            "price": "25",
            "currency": "USD",
            "image_url": "/uploads/marketplace/images/follower-rice.jpg",
            "visibility_mode": "community_visible",
        },
    )
    assert created.status_code == 200, created.text

    with engine.begin() as conn:
        notices = conn.execute(
            text(
                """
                SELECT user_id, kind, title, message, action_url, action_label
                FROM notifications
                ORDER BY user_id ASC
                """
            )
        ).fetchall()

    assert len(notices) == 1
    assert notices[0].user_id == 2
    assert notices[0].kind == "marketplace.shop.product_created"
    assert notices[0].title == "Shop update"
    assert notices[0].message == "Visible Follow Shop added a new product."
    assert notices[0].action_label == "Open shop"
    assert "product_id=" in notices[0].action_url
