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
