from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from app.db.database import engine
from app.db.models import (
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


def _write_upload(root: Path, relative_path: str, content: bytes = b"ok") -> str:
    target = root / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return f"/uploads/{relative_path.replace(chr(92), '/')}"


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
