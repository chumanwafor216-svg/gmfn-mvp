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
    assert "https://api.gsn.example/share/shop/GMFN-U-SHARE/card.png?product_id=3&amp;block=1" in res.text
    assert 'property="og:image:type" content="image/png"' in res.text
    assert "Trusted GSN shop item. Tap to open product." in res.text
    assert "https://pilot.gsn.example/shop/GMFN-U-SHARE?product_id=3#shop-block-1" in res.text


def test_share_shop_card_png_uses_scraper_friendly_image(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE/card.png?product_id=3&block=1")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(res.content) > 10_000


def test_share_shop_card_svg_remains_as_fallback(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE/card.svg?product_id=3&block=1")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/svg+xml")
    assert "GLOBAL SUPPORT NETWORK" in res.text
    assert "Ada Trust Shop" in res.text
    assert "TAP TO OPEN" in res.text
    assert "pilot.gsn.example/shop" not in res.text


def test_vault_request_preview_is_vault_scoped(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_public_shop()

    res = client.get("/share/vault-request/GMFN-U-SHARE")

    assert res.status_code == 200
    assert "Ada Trust Shop | GSN Private Vault" in res.text
    assert "Request owner-issued access to selected private Vault offers." in res.text
    assert "https://api.gsn.example/share/vault-request/GMFN-U-SHARE/card.png" in res.text
    assert "https://pilot.gsn.example/shop/GMFN-U-SHARE#private-vault" in res.text
    assert "/share/shop/GMFN-U-SHARE" not in res.text


def test_vault_request_card_png_uses_vault_branding(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/vault-request/GMFN-U-SHARE/card.png")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(res.content) > 10_000
