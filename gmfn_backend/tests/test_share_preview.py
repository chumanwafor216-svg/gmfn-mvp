from sqlalchemy import text

from app.db.database import engine


def _seed_public_shop():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                )
                VALUES (
                    1, 'share-owner@example.com', 'hashed', 'Ada Seller', 'user', 'GMFN-U-SHARE'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, invite_code, community_code, status, invite_uses, created_at
                )
                VALUES (
                    1, 'Share Clan', 'share-invite', 'GMFN-C-SHARE', 'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                )
                VALUES (
                    1, 1, 1, 'Ada Trust Shop', 'Everyday goods with visible trust.', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, visibility_mode, is_active, created_at
                )
                VALUES (
                    3, 1, 1, 1, 'Fresh rice bag', 'Clean rice ready for pickup.',
                    '45000', 'NGN', 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )


def test_share_shop_preview_exposes_open_graph_card(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE?product_id=3&block=1")

    assert res.status_code == 200
    assert 'property="og:title"' in res.text
    assert "Fresh rice bag | Ada Trust Shop" in res.text
    assert "https://api.gsn.example/share/shop/GMFN-U-SHARE/card.svg?product_id=3&amp;block=1" in res.text
    assert "https://pilot.gsn.example/shop/GMFN-U-SHARE?product_id=3#shop-block-1" in res.text


def test_share_shop_card_svg_prints_link_and_brand(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE/card.svg?product_id=3&block=1")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/svg+xml")
    assert "GLOBAL SUPPORT NETWORK" in res.text
    assert "Ada Trust Shop" in res.text
    assert "pilot.gsn.example/shop/GMFN-U-SHARE?product_id=3#shop-block-1" in res.text
