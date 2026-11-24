from __future__ import annotations

from sqlalchemy import text

from app.core.security import create_access_token
from app.db.database import engine
from app.db.models import MarketplaceProductSave


def _seed_saveable_product() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES
                    (1, 'save-owner@example.com', 'hashed', 'Save Owner', 'user', 'GMFN-U-SAVEOWNER'),
                    (2, 'save-buyer@example.com', 'hashed', 'Save Buyer', 'user', 'GMFN-U-SAVEBUYER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code, community_code)
                VALUES (1, 'Save Community', 'Save Community Marketplace', 'SAVE1', 'GMFN-C-SAVE1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 1, 'member', 0), (2, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (1, 1, 1, 'Save Shop', 'Products worth saving', 1)
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
                    1, 1, 1, 1, 'Saveable Product', 'A product to save',
                    '1000', 'NGN', '/uploads/saveable.jpg', 'community_visible', 1
                )
                """
            )
        )


def test_product_save_is_idempotent_and_owner_cannot_save_own_product(client):
    _seed_saveable_product()
    buyer_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': 'save-buyer@example.com'})}"
    }
    owner_headers = {
        "Authorization": f"Bearer {create_access_token({'sub': 'save-owner@example.com'})}"
    }

    first = client.post("/marketplace/products/1/save", headers=buyer_headers)
    assert first.status_code == 200, first.text
    assert first.json()["saved"] is True

    second = client.post("/marketplace/products/1/save", headers=buyer_headers)
    assert second.status_code == 200, second.text
    assert second.json()["already_saved"] is True

    saved = client.get("/marketplace/products/saved", headers=buyer_headers)
    assert saved.status_code == 200, saved.text
    assert [item["id"] for item in saved.json()["products"]] == [1]

    owner_attempt = client.post("/marketplace/products/1/save", headers=owner_headers)
    assert owner_attempt.status_code == 403, owner_attempt.text
    assert client.delete("/marketplace/products/1/save", headers=buyer_headers).json()["saved"] is False
    assert client.get("/marketplace/products/saved", headers=buyer_headers).json()["products"] == []


def test_authenticated_public_shop_marks_saved_product_and_analytics_accepts_save_event(client):
    _seed_saveable_product()
    buyer_token = create_access_token({"sub": "save-buyer@example.com"})
    headers = {"Authorization": f"Bearer {buyer_token}"}

    saved = client.post("/marketplace/products/1/save", headers=headers)
    assert saved.status_code == 200, saved.text

    public_shop = client.get("/marketplace/public/shop/GMFN-U-SAVEOWNER", headers=headers)
    assert public_shop.status_code == 200, public_shop.text
    assert public_shop.json()["products"][0]["is_saved"] is True

    event = client.post(
        "/marketplace/analytics/attention",
        headers=headers,
        json={
            "event_type": "product_saved",
            "shop_id": 1,
            "product_id": 1,
            "source": "public_shop_product_save",
            "session_key": "save-test-session",
            "client_event_id": "save-test-event-1",
        },
    )
    assert event.status_code == 200, event.text
    with engine.begin() as conn:
        count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM marketplace_attention_events
                WHERE event_type = 'product_saved' AND product_id = 1
                """
            )
        ).scalar_one()
    assert count == 1


def test_product_save_constraint_prevents_duplicate_rows():
    _seed_saveable_product()
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO marketplace_product_saves (product_id, user_id) VALUES (1, 2)"
            )
        )
    with engine.begin() as conn:
        try:
            conn.execute(
                text(
                    "INSERT INTO marketplace_product_saves (product_id, user_id) VALUES (1, 2)"
                )
            )
        except Exception as exc:
            assert "UNIQUE" in str(exc).upper() or "CONSTRAINT" in str(exc).upper()
        else:
            raise AssertionError("duplicate product save was accepted")
