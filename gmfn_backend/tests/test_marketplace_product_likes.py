from __future__ import annotations

from sqlalchemy import text

from app.core.security import create_access_token
from app.db.database import engine


def _seed_likeable_product() -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
            VALUES
                (1, 'like-owner@example.com', 'hashed', 'Like Owner', 'user', 'GMFN-U-LIKEOWNER'),
                (2, 'like-buyer@example.com', 'hashed', 'Like Buyer', 'user', 'GMFN-U-LIKEBUYER')
        """))
        conn.execute(text("""
            INSERT INTO clans (id, name, marketplace_name, invite_code, community_code)
            VALUES (1, 'Like Community', 'Like Community Marketplace', 'LIKE1', 'GMFN-C-LIKE1')
        """))
        conn.execute(text("""
            INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
            VALUES (1, 1, 1, 'member', 0), (2, 1, 2, 'member', 0)
        """))
        conn.execute(text("""
            INSERT INTO marketplace_shops (id, clan_id, owner_user_id, shop_name, description, is_active)
            VALUES (1, 1, 1, 'Like Shop', 'Products worth liking', 1)
        """))
        conn.execute(text("""
            INSERT INTO marketplace_products (
                id, clan_id, shop_id, seller_user_id, title, description,
                price, currency, image_url, visibility_mode, is_active
            ) VALUES (
                1, 1, 1, 1, 'Likeable Product', 'A product to like privately',
                '1000', 'NGN', '/uploads/likeable.jpg', 'community_visible', 1
            )
        """))


def test_private_product_like_is_idempotent_retrievable_and_removable(client):
    _seed_likeable_product()
    buyer_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': 'like-buyer@example.com'})}"
    }

    first = client.put("/marketplace/products/1/like", headers=buyer_headers)
    assert first.status_code == 200, first.text
    assert first.json()["liked"] is True

    second = client.put("/marketplace/products/1/like", headers=buyer_headers)
    assert second.status_code == 200, second.text
    assert second.json()["already_liked"] is True

    liked = client.get("/marketplace/products/liked", headers=buyer_headers)
    assert liked.status_code == 200, liked.text
    assert [item["id"] for item in liked.json()["products"]] == [1]
    assert "like_count" not in liked.json()["products"][0]

    removed = client.delete("/marketplace/products/1/like", headers=buyer_headers)
    assert removed.status_code == 200, removed.text
    assert removed.json()["liked"] is False
    assert client.get("/marketplace/products/liked", headers=buyer_headers).json()["products"] == []


def test_product_owner_cannot_like_own_product(client):
    _seed_likeable_product()
    owner_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': 'like-owner@example.com'})}"
    }
    response = client.put("/marketplace/products/1/like", headers=owner_headers)
    assert response.status_code == 403, response.text