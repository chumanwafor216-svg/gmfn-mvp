import base64
import json
from io import BytesIO

from PIL import Image
from sqlalchemy import text

from app.db.database import engine


def _trustslip_share_ref(**overrides):
    payload = {
        "v": 1,
        "c": "GSN-TRUSTSLIP-EMPLOYMENT",
        "p": "employment_decision",
        "ap": "Employment Decision Pack",
        "q": "Is there enough evidence to continue an employment conversation?",
        "f": "Role, consistency, contribution, leadership or service signals, and the next verification step.",
        "s": "community_specific",
        "vs": "community_specific",
        "vsl": "GNS Marketplace",
        "vsb": "Live confirmation requests should be answered by GNS Marketplace.",
        "cid": "8",
        "cl": "GNS Marketplace",
        "cr": "GMFN-C-GNS-MARKETPLACE",
    }
    payload.update(overrides)
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


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
    assert "GSN public shop item. Tap to open product." in res.text
    assert "Trusted GSN shop item. Tap to open product." not in res.text
    assert "Trusted GSN shop. Tap to open shop." not in res.text
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
    assert "NGN 45000" in res.text
    assert "Trusted product" not in res.text
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


def test_share_join_preview_exposes_open_graph_card(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_public_shop()

    res = client.get("/share/join/share-invite?community_code=GMFN-C-SHARE&qr_policy=market_access")

    assert res.status_code == 200
    assert 'property="og:title"' in res.text
    assert "Fresh rice bag | Share Clan GSN invite" in res.text
    assert "GSN invite pack. Tap to request access. Approval required." in res.text
    assert "https://api.gsn.example/share/join/share-invite/card.png?community_code=GMFN-C-SHARE&amp;qr_policy=market_access" in res.text
    assert 'property="og:image:type" content="image/png"' in res.text
    assert "https://pilot.gsn.example/start/join/share-invite?invite=share-invite&amp;community_code=GMFN-C-SHARE&amp;community_name=Share+Clan&amp;marketplace_name=Share+Clan&amp;qr_policy=market_access" in res.text


def test_share_join_card_png_uses_invite_branding(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/join/share-invite/card.png?community_code=GMFN-C-SHARE")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(res.content) > 10_000


def test_trustslip_share_preview_exposes_route_specific_open_graph_card(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    share_ref = _trustslip_share_ref()

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 200
    assert "GSN TrustSlip" in res.text
    assert 'property="og:title" content="GSN TrustSlip"' in res.text
    assert "GSN Public Record" not in res.text
    assert "Employment Decision Pack - GNS Marketplace" in res.text
    assert "https://api.gsn.example/share/trustslip/" in res.text
    assert "/card.png" in res.text
    assert "https://pilot.gsn.example/t/GSN-TRUSTSLIP-EMPLOYMENT" in res.text
    assert "decision_pack=employment_decision" in res.text
    assert "access_purpose=Employment+Decision+Pack" in res.text
    assert "verification_community_label=GNS+Marketplace" in res.text
    assert "verification_community_id=8" in res.text
    assert "approved" not in res.text.lower()
    assert "low risk" not in res.text.lower()


def test_trustslip_share_card_png_uses_institutional_trustslip_branding(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    share_ref = _trustslip_share_ref()

    res = client.get(f"/share/trustslip/{share_ref}/card.png")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    with Image.open(BytesIO(res.content)) as image:
        assert image.size == (1200, 630)
    assert len(res.content) > 10_000


def test_trustslip_share_preview_rejects_malformed_reference_without_leakage(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")

    res = client.get("/share/trustslip/not-a-real-ref")

    assert res.status_code == 404
    assert "GSN-TRUSTSLIP-EMPLOYMENT" not in res.text
    assert "GNS Marketplace" not in res.text
