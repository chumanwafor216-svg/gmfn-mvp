from __future__ import annotations

import json

from sqlalchemy import text

from app.db.database import engine
from app.services.marketplace_shop_privacy_service import (
    ShopPrivacyScope,
    decide_shop_privacy,
    project_shop_contact_fields,
)


PRIVACY_FLAG = "GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED"


def _seed_shop_privacy_case(
    *,
    settings: tuple[bool, bool, bool, bool] | None,
    shop_active: bool = True,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES
                    (1, 'viewer@example.invalid', 'hashed', 'Community Viewer', 'user', 'GMFN-U-VIEWER'),
                    (2, 'owner@example.invalid', 'hashed', 'Shop Owner', 'user', 'GMFN-U-PRIVATE')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Privacy Community', 'Privacy Marketplace', 'PRIVACY-ONE'),
                    (2, 'Other Community', 'Other Marketplace', 'PRIVACY-TWO')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance
                ) VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, 2, 'member', 0),
                    (3, 2, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    whatsapp_number, telegram_handle, is_active
                ) VALUES (
                    1, 1, 2, 'Privacy Shop', 'Private contact test shop',
                    '+2348000000001', 'private-shop-handle', :is_active
                )
                """
            ),
            {"is_active": 1 if shop_active else 0},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    visibility_mode, is_active
                ) VALUES
                    (1, 1, 1, 2, 'Canonical offer', 'Current visibility name', 'community_visible', 1),
                    (2, 1, 1, 2, 'Legacy public offer', 'Legacy public alias', 'public', 1),
                    (3, 1, 1, 2, 'Legacy community offer', 'Legacy community alias', 'community', 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, clan_id, author_user_id, shop_id, message,
                    priority_mode, visibility_scope, created_at
                ) VALUES (
                    1, 1, 2, 1, 'Privacy spotlight',
                    'free', 'direct_communities', CURRENT_TIMESTAMP
                )
                """
            )
        )
        if settings is not None:
            show_shop, show_whatsapp, show_phone, show_telegram = settings
            conn.execute(
                text(
                    """
                    INSERT INTO user_settings (
                        user_id,
                        show_shop_public,
                        show_whatsapp_public,
                        show_phone_public,
                        show_telegram_public
                    ) VALUES (
                        2,
                        :show_shop,
                        :show_whatsapp,
                        :show_phone,
                        :show_telegram
                    )
                    """
                ),
                {
                    "show_shop": bool(show_shop),
                    "show_whatsapp": bool(show_whatsapp),
                    "show_phone": bool(show_phone),
                    "show_telegram": bool(show_telegram),
                },
            )


def test_public_contact_projection_redacts_all_supported_aliases() -> None:
    decision = decide_shop_privacy(
        scope=ShopPrivacyScope.UNAUTHENTICATED_PUBLIC,
        shop_active=True,
        authorized=True,
        preferences=None,
        enforcement_enabled=True,
    )
    projected = project_shop_contact_fields(
        {
            "whatsapp_number": "wa-secret",
            "whatsapp_contact": "wa-alias-secret",
            "phone": "phone-secret",
            "phone_e164": "phone-alias-secret",
            "telegram_handle": "telegram-secret",
            "telegram_username": "telegram-alias-secret",
            "contact_ready": True,
        },
        decision=decision,
    )

    assert decision.shop_visible is False
    assert projected == {
        "whatsapp_number": None,
        "whatsapp_contact": None,
        "phone": None,
        "phone_e164": None,
        "telegram_handle": None,
        "telegram_username": None,
        "contact_ready": False,
    }


def test_disabled_flag_preserves_legacy_public_shop_behavior(client, monkeypatch) -> None:
    monkeypatch.delenv(PRIVACY_FLAG, raising=False)
    _seed_shop_privacy_case(settings=None)

    response = client.get("/marketplace/public/shop/GMFN-U-PRIVATE")

    assert response.status_code == 200, response.text
    item = response.json()["item"]
    assert item["whatsapp_number"] == "+2348000000001"
    assert item["telegram_handle"] == "private-shop-handle"
    assert response.json()["primary_broadcast"]["source_shop_whatsapp_number"] == "+2348000000001"


def test_public_shop_opt_out_does_not_restrict_authorized_community_access(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    _seed_shop_privacy_case(settings=(False, False, False, False))

    public_response = client.get("/marketplace/public/shop/GMFN-U-PRIVATE")
    community_response = client.get(
        "/marketplace/shops/by-gmfn/GMFN-U-PRIVATE",
        params={"clan_id": 1},
    )
    directory_response = client.get(
        "/marketplace/shops/directory",
        params={"clan_id": 1, "contact_ready": True},
    )

    assert public_response.status_code == 404
    assert community_response.status_code == 200, community_response.text
    community_item = community_response.json()["item"]
    assert community_item["whatsapp_number"] == "+2348000000001"
    assert community_item["telegram_handle"] == "private-shop-handle"
    assert directory_response.status_code == 200, directory_response.text
    assert directory_response.json()["total"] == 1
    assert directory_response.json()["items"][0]["contact_ready"] is True


def test_public_shop_contact_preferences_and_legacy_offer_aliases(
    client,
    monkeypatch,
) -> None:
    monkeypatch.setenv(PRIVACY_FLAG, "1")
    _seed_shop_privacy_case(settings=(True, False, False, True))

    response = client.get("/marketplace/public/shop/GMFN-U-PRIVATE")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["item"]["whatsapp_number"] is None
    assert payload["item"]["telegram_handle"] == "private-shop-handle"
    assert payload["primary_broadcast"]["source_shop_whatsapp_number"] is None
    assert payload["primary_broadcast"]["spotlight_contact_available"] is False
    assert {item["name"] for item in payload["products"]} == {
        "Canonical offer",
        "Legacy public offer",
        "Legacy community offer",
    }
    assert "+2348000000001" not in json.dumps(payload)

    alias_response = client.get("/marketplace/public/shop/GSN-U-PRIVATE")
    assert alias_response.status_code == 200, alias_response.text
    assert alias_response.json()["item"]["gmfn_id"] == "GMFN-U-PRIVATE"


def test_missing_settings_fail_closed_for_public_access(client, monkeypatch) -> None:
    monkeypatch.setenv(PRIVACY_FLAG, "yes")
    _seed_shop_privacy_case(settings=None)

    response = client.get("/marketplace/public/shop/GMFN-U-PRIVATE")

    assert response.status_code == 404


def test_owner_management_keeps_saved_contacts_for_inactive_shop(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    monkeypatch.setenv(PRIVACY_FLAG, "on")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'Inactive Owner', 'user', 'GMFN-U-INACTIVE'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Owner Community', 'Owner Marketplace', 'OWNER-PRIVACY')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance
                ) VALUES (1, 1, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    whatsapp_number, telegram_handle, is_active
                ) VALUES (
                    1, 1, 1, 'Inactive Shop', 'Saved owner shop',
                    '+2348000000002', 'inactive-owner-handle', 0
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO user_settings (
                    user_id, show_shop_public, show_whatsapp_public,
                    show_phone_public, show_telegram_public
                ) VALUES (1, 0, 0, 0, 0)
                """
            )
        )

    response = client.patch(
        "/marketplace/shops/1",
        json={"clan_id": 1, "description": "Owner can still manage this shop"},
    )

    assert response.status_code == 200, response.text
    item = response.json()["item"]
    assert item["is_active"] is False
    assert item["whatsapp_number"] == "+2348000000002"
    assert item["telegram_handle"] == "inactive-owner-handle"


def test_nonmember_cannot_use_authenticated_route_to_bypass_public_opt_out(
    client,
    monkeypatch,
    override_current_user_user,
) -> None:
    monkeypatch.setenv(PRIVACY_FLAG, "true")
    _seed_shop_privacy_case(settings=(False, False, False, False))

    response = client.get(
        "/marketplace/shops/by-gmfn/GMFN-U-PRIVATE",
        params={"clan_id": 2},
    )

    assert response.status_code == 403
