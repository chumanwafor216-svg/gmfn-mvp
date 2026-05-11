from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from app.api.routes import marketplace as marketplace_routes
from app.db.database import engine
from app.db.models import (
    FeatureEntitlement,
    FeatureUsageEvent,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceProductRepost,
    MarketplaceShop,
)


def _ensure_marketplace_tables() -> None:
    MarketplaceShop.__table__.create(bind=engine, checkfirst=True)
    MarketplaceProduct.__table__.create(bind=engine, checkfirst=True)
    MarketplaceBroadcast.__table__.create(bind=engine, checkfirst=True)
    MarketplaceProductRepost.__table__.create(bind=engine, checkfirst=True)
    FeatureEntitlement.__table__.create(bind=engine, checkfirst=True)
    FeatureUsageEvent.__table__.create(bind=engine, checkfirst=True)


def _write_upload(root: Path, relative_path: str, content: bytes = b"ok") -> str:
    target = root / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return f"/uploads/{relative_path.replace(chr(92), '/')}"


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
    assert body["item"]["gmfn_id"] == "GMFN-U-TESTSHOP"
    assert body["item"]["image_url"] == image_url
    assert body["community_name"] == "Golden boys Marketplace"
    assert len(body["products"]) == 1
    assert body["products"][0]["name"] == "Fresh Rice"
    assert body["products"][0]["image_url"] == product_image_url
    assert body["products"][0]["image_url_available"] is True
    assert body["primary_broadcast"]["message"] == "Spotlight update"
    assert body["primary_broadcast"]["image_url"] == spotlight_image_url
    assert len(body["broadcasts"]) == 1

    gsn_alias = client.get("/marketplace/public/shop/GSN-U-TESTSHOP")
    assert gsn_alias.status_code == 200, gsn_alias.text
    alias_body = gsn_alias.json()
    assert alias_body["item"]["gmfn_id"] == "GMFN-U-TESTSHOP"
    assert [item["name"] for item in alias_body["products"]] == ["Fresh Rice"]


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

    assert body["products"][0]["image_url"] is None
    assert body["products"][0]["image_url_available"] is False
    assert body["primary_broadcast"]["image_url"] is None


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
    public_names = [item["name"] for item in public_shop.json()["products"]]
    assert set(public_names) == {"Origin Public Product", "Second Community Product"}
    assert "Private Vault Product" not in public_names


def test_shop_spotlight_publish_targets_only_the_shop_community(
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
            "message": "Fresh spotlight",
            "image_url": "/uploads/marketplace/images/live-spotlight.jpg",
            "priority_mode": "free",
            "visibility_scope": "direct_communities",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["propagated_count"] == 1
    assert body["propagated_clan_ids"] == [1]

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

    assert [int(row[0]) for row in rows] == [1]


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


def test_free_spotlight_capacity_reached_is_suspended_for_test_week(
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
    assert res.status_code == 200, res.text
    assert "Spotlight capacity reached" not in res.text
    assert res.json()["ok"] is True

    with engine.begin() as conn:
        broadcast_count = conn.execute(
            text("SELECT COUNT(*) FROM marketplace_broadcasts WHERE clan_id = 3")
        ).scalar_one()

    assert int(broadcast_count) == 2


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
