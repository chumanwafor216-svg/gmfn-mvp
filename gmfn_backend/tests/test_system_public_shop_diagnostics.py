from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine
from app.db.models import MarketplaceProduct, MarketplaceShop


def _ensure_marketplace_tables() -> None:
    MarketplaceShop.__table__.create(bind=engine, checkfirst=True)
    MarketplaceProduct.__table__.create(bind=engine, checkfirst=True)


def test_public_shop_identity_diagnostics_finds_alias_ready_shop(
    client,
    override_current_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Seller Owner', 'admin', 'GMFN-U-DIAGSHOP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Golden boys', 'Golden boys Marketplace', 'DIAGSHOP1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'DIAGNOSTIC SHOP', 'Public diagnostic shop', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Diagnostic Rice', 'Visible product',
                    'community_visible', 1
                )
                """
            )
        )

    res = client.get("/system/public-shop-identity/GSN-U-DIAGSHOP")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["user_found"] is True
    assert body["matched_identity"] == "GMFN-U-DIAGSHOP"
    assert body["active_shop_count"] == 1
    assert body["public_product_count"] == 1
    assert body["public_shop_status"] == "ready"
    assert body["public_shop_ready"] is True


def test_public_shop_identity_diagnostics_reports_missing_identity(
    client,
    override_current_user,
):
    _ensure_marketplace_tables()

    res = client.get("/system/public-shop-identity/GMFN-U-NOTFOUND")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["user_found"] is False
    assert body["reason"] == "seller_identity_not_found"
    assert body["public_shop_status"] == "identity_missing"
    assert body["candidates_checked"] == ["GMFN-U-NOTFOUND", "GSN-U-NOTFOUND"]


def test_public_shop_identity_diagnostics_requires_admin(
    client,
    override_current_user_user,
):
    res = client.get("/system/public-shop-identity/GMFN-U-DIAGSHOP")
    assert res.status_code == 403
