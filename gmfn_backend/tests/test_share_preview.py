import base64
import json
from io import BytesIO
from datetime import datetime, timedelta, timezone

from PIL import Image
from sqlalchemy import text

from app.db.database import engine
from app.api.routes import share_preview as share_preview_route


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
                    id, name, invite_code, community_code, created_by_user_id,
                    status, invite_uses, created_at
                )
                VALUES (
                    1, 'Share Clan', 'share-invite', 'GMFN-C-SHARE', 1,
                    'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_invites (
                    id, clan_id, created_by_user_id, code, is_active,
                    max_uses, uses, created_at
                )
                VALUES (
                    1, 1, 1, 'share-invite', 1, 100, 0, CURRENT_TIMESTAMP
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

def _seed_shop_update(*, entry_id=7, hours_ago=0, is_public=1, evidence_class="owner_update"):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO shop_diary_entries (
                    id, clan_id, shop_id, owner_user_id, activity_type, evidence_class,
                    note, occurred_at, is_public, is_active, created_at, updated_at
                )
                VALUES (
                    :entry_id, 1, 1, 1, 'product_update', :evidence_class,
                    'Fresh rice is available for pickup today.', :occurred_at,
                    :is_public, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "entry_id": entry_id,
                "evidence_class": evidence_class,
                "occurred_at": datetime.now(timezone.utc) - timedelta(hours=hours_ago),
                "is_public": is_public,
            },
        )



def _seed_trustslip_share_context(
    *,
    code="GSN-TRUSTSLIP-EMPLOYMENT",
    holder_id=21,
    clan_id=8,
    clan_name="GNS Marketplace",
    community_code="GMFN-C-GNS-MARKETPLACE",
    status="active",
    is_current=1,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                )
                VALUES (
                    :holder_id, :email, 'hashed', 'TrustSlip Holder', 'user', :gmfn_id
                )
                """
            ),
            {
                "holder_id": holder_id,
                "email": f"holder-{holder_id}@example.com",
                "gmfn_id": f"GMFN-U-HOLDER-{holder_id}",
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, invite_code, community_code,
                    status, invite_uses, created_at
                )
                VALUES (
                    :clan_id, :clan_name, :clan_name, :invite_code, :community_code,
                    'active', 0, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "clan_id": clan_id,
                "clan_name": clan_name,
                "invite_code": f"invite-{clan_id}",
                "community_code": community_code,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    clan_id, user_id, role, personal_pool_balance, created_at
                )
                VALUES (
                    :clan_id, :holder_id, 'member', 0, CURRENT_TIMESTAMP
                )
                """
            ),
            {"clan_id": clan_id, "holder_id": holder_id},
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_slips (
                    code, clan_id, holder_user_id, trust_limit, currency, status,
                    created_at, is_current, snapshot_visibility_level
                )
                VALUES (
                    :code, :clan_id, :holder_id, 0, 'NGN', :status,
                    CURRENT_TIMESTAMP, :is_current, 'public_summary'
                )
                """
            ),
            {
                "code": code,
                "clan_id": clan_id,
                "holder_id": holder_id,
                "status": status,
                "is_current": is_current,
            },
        )


def _seed_other_holder_community():
    _seed_trustslip_share_context(
        code="GSN-TRUSTSLIP-OTHER-HOLDER",
        holder_id=22,
        clan_id=9,
        clan_name="Other Holder Community",
        community_code="GMFN-C-OTHER-HOLDER",
    )


def test_share_identity_preview_is_read_only_and_privacy_bounded(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_public_shop()

    with engine.begin() as conn:
        before = {
            "users": conn.execute(text("SELECT COUNT(*) FROM users")).scalar_one(),
            "memberships": conn.execute(text("SELECT COUNT(*) FROM clan_memberships")).scalar_one(),
            "invite_uses": conn.execute(
                text("SELECT uses FROM clan_invites WHERE code = 'share-invite'")
            ).scalar_one(),
        }

    response = client.get("/share/id/GMFN-U-SHARE")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert 'property="og:type" content="profile"' in response.text
    assert 'property="og:title" content="Open my GSN card"' in response.text
    assert "Ada Seller shared a GSN identity card with you." in response.text
    assert "https://api.gsn.example/share/id/GMFN-U-SHARE/card.png" in response.text
    assert 'content="0;url=https://pilot.gsn.example/id/GMFN-U-SHARE"' in response.text
    assert "share-owner@example.com" not in response.text
    assert "Share Clan" not in response.text
    assert "Ada Trust Shop" not in response.text
    assert "share-invite" not in response.text
    assert "TrustSlip" not in response.text
    assert "phone" not in response.text.lower()

    with engine.begin() as conn:
        after = {
            "users": conn.execute(text("SELECT COUNT(*) FROM users")).scalar_one(),
            "memberships": conn.execute(text("SELECT COUNT(*) FROM clan_memberships")).scalar_one(),
            "invite_uses": conn.execute(
                text("SELECT uses FROM clan_invites WHERE code = 'share-invite'")
            ).scalar_one(),
        }

    assert after == before


def test_share_identity_card_png_uses_public_portrait_renderer(client, monkeypatch):
    portrait_calls = []

    def fake_public_portrait(value, size):
        portrait_calls.append((value, size))
        return Image.new("RGB", size, "#F20DCB")

    monkeypatch.setattr(
        share_preview_route,
        "_identity_profile_hero",
        fake_public_portrait,
    )
    _seed_public_shop()

    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE users SET profile_image_url = "
                "'/uploads/profile/users/member.png' WHERE id = 1"
            )
        )

    response = client.get("/share/id/GMFN-U-SHARE/card.png")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.headers["cache-control"] == "no-store"
    assert portrait_calls == [
        ("/uploads/profile/users/member.png", (312, 338)),
    ]
    image = Image.open(BytesIO(response.content)).convert("RGB")
    assert image.size == (1200, 630)
    red, green, blue = image.getpixel((200, 300))
    assert red > 220
    assert green < 50
    assert blue > 180


def test_share_identity_preview_rejects_unknown_gsn_id(client):
    page_response = client.get("/share/id/GMFN-U-MISSING")
    card_response = client.get("/share/id/GMFN-U-MISSING/card.png")

    assert page_response.status_code == 404
    assert page_response.json()["detail"] == "GSN ID not found."
    assert card_response.status_code == 404
    assert card_response.json()["detail"] == "GSN ID not found."


def test_identity_portrait_loader_rejects_private_or_traversal_paths():
    assert share_preview_route._identity_profile_hero(
        "/uploads/entry/identity/government-id.png",
        (100, 100),
    ) is None
    assert share_preview_route._identity_profile_hero(
        "/uploads/profile/users/../../private/government-id.png",
        (100, 100),
    ) is None


def test_share_shop_preview_exposes_open_graph_card(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE?product_id=3&block=1&gsn_share=share_product&gsn_channel=facebook&utm_source=gsn_shop_gallery")

    assert res.status_code == 200
    assert 'property="og:title"' in res.text
    assert "Fresh rice bag | Ada Trust Shop | Open Shop" in res.text
    assert "https://api.gsn.example/share/shop/GMFN-U-SHARE/open?product_id=3&amp;block=1" in res.text
    assert "https://api.gsn.example/share/shop/GMFN-U-SHARE/card.png?preview=open-shop-v3&amp;product_id=3&amp;block=1" in res.text
    assert 'property="og:image:type" content="image/png"' in res.text
    assert "Tap Open Shop to view this item and current shop details." in res.text
    assert '<meta http-equiv="refresh" content="0;url=' in res.text
    assert ">Open Shop</a>" in res.text
    assert "Trusted GSN shop item. Tap to open product." not in res.text
    assert "Trusted GSN shop. Tap to open shop." not in res.text
    assert "https://pilot.gsn.example/shop/GMFN-U-SHARE?product_id=3&amp;gsn_share=share_product&amp;gsn_channel=facebook&amp;utm_source=gsn_shop_gallery#shop-block-1" in res.text


def test_share_shop_clean_open_preview_uses_single_action_and_default_attribution(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE/open?gsn_channel=whatsapp")

    assert res.status_code == 200
    assert '<meta property="og:title" content="Open Shop" />' in res.text
    assert '<meta property="og:description" content="Click to open shop." />' in res.text
    assert "https://api.gsn.example/share/shop/GMFN-U-SHARE/open" in res.text
    assert "https://api.gsn.example/share/shop/GMFN-U-SHARE/card.png?preview=open-shop-v3" in res.text
    assert "https://pilot.gsn.example/shop/GMFN-U-SHARE?gsn_share=share_shop&amp;gsn_channel=whatsapp&amp;utm_source=gsn_shop_gallery" in res.text
    assert "gsn_shop_gallery#shop-diaries" not in res.text
    assert "Ada Trust Shop | Open Shop" not in res.text


def test_share_shop_live_video_is_personalized_and_cached(
    client,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_PUBLIC_SHOP_VIDEO_CACHE_DIR", str(tmp_path))
    _seed_public_shop()
    render_calls = []

    def fake_render(output_path, *, shop_name):
        render_calls.append(shop_name)
        output_path.write_bytes(b"personalized-mp4")
        return output_path

    monkeypatch.setattr(
        share_preview_route,
        "render_public_shop_share_video",
        fake_render,
    )

    first = client.get("/share/shop/GMFN-U-SHARE/live.mp4")
    second = client.get("/share/shop/GMFN-U-SHARE/live.mp4")

    assert first.status_code == 200, first.text
    assert first.headers["content-type"] == "video/mp4"
    assert first.headers["cache-control"] == "public, max-age=300"
    assert first.headers["content-disposition"].startswith("inline;")
    assert first.content == b"personalized-mp4"
    assert second.status_code == 200
    assert second.content == first.content
    assert render_calls == ["Ada Trust Shop"]


def test_share_shop_live_video_requires_active_public_shop(client):
    response = client.get("/share/shop/GMFN-U-MISSING/live.mp4")

    assert response.status_code == 404
    assert response.json()["detail"] == "Public shop not found."



def test_share_shop_update_preview_targets_exact_live_update(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_public_shop()
    _seed_shop_update(entry_id=7)

    res = client.get(
        "/share/shop-update/7?gsn_share=share_shop_update&gsn_channel=whatsapp&utm_source=gsn_shop_diary"
    )

    assert res.status_code == 200, res.text
    assert "New stock/product update | Ada Trust Shop" in res.text
    assert "GSN Shop Update. Tap to open this live public update." in res.text
    assert "https://api.gsn.example/share/shop-update/7/card.png" in res.text
    assert (
        "https://pilot.gsn.example/shop/GMFN-U-SHARE?"
        "diary_entry_id=7&amp;gsn_share=share_shop_update&amp;"
        "gsn_channel=whatsapp&amp;utm_source=gsn_shop_diary#shop-diaries"
    ) in res.text


def test_share_shop_update_card_png_is_scraper_friendly(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()
    _seed_shop_update(entry_id=7)

    res = client.get("/share/shop-update/7/card.png")

    assert res.status_code == 200, res.text
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(res.content) > 10_000


def test_share_shop_update_rejects_expired_update(client):
    _seed_public_shop()
    _seed_shop_update(entry_id=8, hours_ago=25)

    page_res = client.get("/share/shop-update/8")
    card_res = client.get("/share/shop-update/8/card.png")

    assert page_res.status_code == 404
    assert card_res.status_code == 404

def test_share_shop_card_png_uses_scraper_friendly_image(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE/card.png?product_id=3&block=1")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(res.content) > 10_000


def test_share_shop_card_png_uses_approved_shopfront(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()
    calls = []

    def approved_shopfront(size):
        calls.append(size)
        return Image.new("RGBA", size, (255, 0, 255, 255))

    monkeypatch.setattr(
        share_preview_route,
        "_approved_shopfront_share_hero",
        approved_shopfront,
    )

    res = client.get("/share/shop/GMFN-U-SHARE/card.png?product_id=3&block=1")

    assert res.status_code == 200
    assert calls == [(388, 474)]
    with Image.open(BytesIO(res.content)) as card:
        assert card.convert("RGB").getpixel((900, 250)) == (255, 0, 255)


def test_root_share_shop_card_keeps_static_storefront_as_primary_image(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()
    calls = []

    def approved_shopfront(size):
        calls.append(size)
        return Image.new("RGBA", size, (255, 0, 255, 255))

    monkeypatch.setattr(
        share_preview_route,
        "_approved_shopfront_share_hero",
        approved_shopfront,
    )

    res = client.get("/share/shop/GMFN-U-SHARE/card.png")

    assert res.status_code == 200
    assert calls == [(660, 630)]
    with Image.open(BytesIO(res.content)) as card:
        assert card.size == (1200, 630)
        assert card.convert("RGB").getpixel((600, 250)) == (255, 0, 255)


def test_approved_shopfront_poster_is_packaged_with_backend():
    assert share_preview_route.APPROVED_SHOPFRONT_POSTER_PATH.is_file()
    with Image.open(share_preview_route.APPROVED_SHOPFRONT_POSTER_PATH) as poster:
        assert poster.width >= 400
        assert poster.height >= 400


def test_share_shop_card_svg_remains_as_fallback(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/shop/GMFN-U-SHARE/card.svg?product_id=3&block=1")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/svg+xml")
    assert "GLOBAL SUPPORT NETWORK" in res.text
    assert "Ada Trust Shop" in res.text
    assert "OPEN SHOP" in res.text
    assert "TAP TO OPEN" in res.text
    assert "NGN 45000" in res.text
    assert "GMFN-U-SHARE" not in res.text
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
    assert "Ada Seller invited you to join Share Clan on GSN" in res.text
    assert "Open to request access. Community approval is required." in res.text
    assert "https://api.gsn.example/share/join/share-invite/card.png?community_code=GMFN-C-SHARE&amp;qr_policy=market_access" in res.text
    assert 'property="og:image:type" content="image/png"' in res.text
    assert "https://pilot.gsn.example/start/join/share-invite" in res.text
    assert "start/join/share-invite?invite=" not in res.text
    assert "community_name=Share+Clan" not in res.text


def test_share_join_card_png_uses_invite_branding(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()

    res = client.get("/share/join/share-invite/card.png?community_code=GMFN-C-SHARE")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(res.content) > 10_000


def test_share_join_preview_uses_saved_instant_policy_without_consuming_invite(
    client,
    monkeypatch,
):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE clan_invites SET admission_mode = 'instant_invite' "
                "WHERE code = 'share-invite'"
            )
        )
        before = {
            "uses": conn.execute(
                text("SELECT uses FROM clan_invites WHERE code = 'share-invite'")
            ).scalar_one(),
            "memberships": conn.execute(
                text("SELECT COUNT(*) FROM clan_memberships")
            ).scalar_one(),
            "requests": conn.execute(
                text("SELECT COUNT(*) FROM clan_join_requests")
            ).scalar_one(),
        }

    res = client.get("/share/join/share-invite")
    card = client.get("/share/join/share-invite/card.png")

    assert res.status_code == 200
    assert card.status_code == 200
    assert "Open to join this GSN community. No approval wait." in res.text
    assert "Approval is required" not in res.text
    with engine.begin() as conn:
        after = {
            "uses": conn.execute(
                text("SELECT uses FROM clan_invites WHERE code = 'share-invite'")
            ).scalar_one(),
            "memberships": conn.execute(
                text("SELECT COUNT(*) FROM clan_memberships")
            ).scalar_one(),
            "requests": conn.execute(
                text("SELECT COUNT(*) FROM clan_join_requests")
            ).scalar_one(),
        }
    assert after == before


def test_share_join_preview_uses_saved_admin_approval_policy(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE clan_invites SET admission_mode = 'admin_approval' "
                "WHERE code = 'share-invite'"
            )
        )

    res = client.get("/share/join/share-invite")

    assert res.status_code == 200
    assert "A community administrator must approve it." in res.text


def test_share_join_preview_hides_metadata_for_expired_or_mismatched_invites(
    client,
    monkeypatch,
):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_public_shop()
    mismatched = client.get(
        "/share/join/share-invite",
        params={"community_code": "GMFN-C-OTHER"},
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE clan_invites SET expires_at = :expired_at "
                "WHERE code = 'share-invite'"
            ),
            {"expired_at": datetime.now(timezone.utc) - timedelta(minutes=1)},
        )

    expired = client.get("/share/join/share-invite")

    for res in (expired, mismatched):
        assert res.status_code == 200
        assert "GSN community invitation" in res.text
        assert "check whether this invitation is still available" in res.text
        assert "Share Clan" not in res.text
        assert "Ada Seller" not in res.text
        assert "Ada Trust Shop" not in res.text


def test_trustslip_share_preview_exposes_route_specific_open_graph_card(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_trustslip_share_context()
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
    _seed_trustslip_share_context()
    share_ref = _trustslip_share_ref()

    res = client.get(f"/share/trustslip/{share_ref}/card.png")

    assert res.status_code == 200
    assert res.headers["content-type"].startswith("image/png")
    assert res.content.startswith(b"\x89PNG\r\n\x1a\n")
    with Image.open(BytesIO(res.content)) as image:
        assert image.size == (1200, 630)
    assert len(res.content) > 10_000


def test_trustslip_share_preview_rejects_nonexistent_code_without_branding(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_trustslip_share_context()
    share_ref = _trustslip_share_ref(c="GSN-TRUSTSLIP-MISSING")

    res = client.get(f"/share/trustslip/{share_ref}")
    card = client.get(f"/share/trustslip/{share_ref}/card.png")

    assert res.status_code == 404
    assert card.status_code == 404
    assert "GSN TrustSlip" not in res.text
    assert "GNS Marketplace" not in res.text
    assert not card.content.startswith(b"\x89PNG")


def test_trustslip_share_preview_rejects_fabricated_community_id(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_trustslip_share_context()
    share_ref = _trustslip_share_ref(cid="9999", cl="Fabricated Community", cr="GMFN-C-FAKE")

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 404
    assert "Fabricated Community" not in res.text
    assert "GSN TrustSlip" not in res.text


def test_trustslip_share_preview_uses_database_community_label_not_forged_label(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_trustslip_share_context()
    share_ref = _trustslip_share_ref(
        cl="Verified Employer Approved Ltd",
        vsl="Verified Employer Approved Ltd",
        vsb="This employer is approved and safe.",
    )

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 200
    assert "GNS Marketplace" in res.text
    assert "verification_community_label=GNS+Marketplace" in res.text
    assert "Verified Employer Approved Ltd" not in res.text
    assert "approved and safe" not in res.text.lower()


def test_trustslip_share_preview_rejects_community_for_another_holder(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_trustslip_share_context()
    _seed_other_holder_community()
    share_ref = _trustslip_share_ref(
        cid="9",
        cl="Other Holder Community",
        cr="GMFN-C-OTHER-HOLDER",
    )

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 404
    assert "Other Holder Community" not in res.text
    assert "GSN TrustSlip" not in res.text


def test_trustslip_share_preview_rejects_unsupported_decision_pack_key(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_trustslip_share_context()
    share_ref = _trustslip_share_ref(
        p="verified_employer_low_risk",
        ap="Verified Employer Low Risk Pack",
    )

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 404
    assert "Verified Employer Low Risk" not in res.text
    assert "GSN TrustSlip" not in res.text


def test_trustslip_share_preview_does_not_use_forged_purpose_question_or_focus(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_trustslip_share_context()
    share_ref = _trustslip_share_ref(
        ap="Approved safe worker",
        q="Is this person low risk and recommended?",
        f="Employer verified, safe, trusted and recommended.",
    )

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 200
    assert "Employment Decision Pack" in res.text
    assert "Approved safe worker" not in res.text
    assert "low risk" not in res.text.lower()
    assert "recommended" not in res.text.lower()
    assert "Employer verified" not in res.text
    assert "access_purpose=Employment+Decision+Pack" in res.text
    assert "recipient_question=Is+there+enough+evidence+to+continue+an+employment+conversation" in res.text


def test_trustslip_share_preview_rejects_malformed_reference_without_leakage(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.gsn.example")
    _seed_trustslip_share_context()

    res = client.get("/share/trustslip/not-a-real-ref")

    assert res.status_code == 404
    assert "GSN-TRUSTSLIP-EMPLOYMENT" not in res.text
    assert "GNS Marketplace" not in res.text
    assert "GSN TrustSlip" not in res.text


def test_trustslip_share_preview_redirects_to_existing_recipient_page_with_canonical_context(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_trustslip_share_context()
    share_ref = _trustslip_share_ref(
        ap="Forged Pack Label",
        q="Forged decision question",
        f="Forged decision focus",
        cl="Wrong Label",
        vsl="Wrong Label",
    )

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 200
    assert 'http-equiv="refresh"' in res.text
    assert "https://pilot.gsn.example/t/GSN-TRUSTSLIP-EMPLOYMENT" in res.text
    assert "decision_pack=employment_decision" in res.text
    assert "access_purpose=Employment+Decision+Pack" in res.text
    assert "verification_community_id=8" in res.text
    assert "verification_community_label=GNS+Marketplace" in res.text
    assert "Wrong Label" not in res.text
    assert "Forged decision" not in res.text


def test_trustslip_share_preview_for_restricted_slip_stays_neutral_and_delegates_currentness(client, monkeypatch):
    monkeypatch.setenv("PUBLIC_FRONTEND_URL", "https://pilot.gsn.example")
    _seed_trustslip_share_context(status="revoked", is_current=0)
    share_ref = _trustslip_share_ref()

    res = client.get(f"/share/trustslip/{share_ref}")

    assert res.status_code == 200
    assert "GSN TrustSlip" in res.text
    assert "https://pilot.gsn.example/t/GSN-TRUSTSLIP-EMPLOYMENT" in res.text
    assert "approved" not in res.text.lower()
    assert "safe" not in res.text.lower()
    assert "trusted" not in res.text.lower()
    assert "valid" not in res.text.lower()
