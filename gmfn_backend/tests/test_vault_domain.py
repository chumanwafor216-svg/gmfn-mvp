from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import engine
from app.db.models import (
    CommunityDomain,
    CommunityDomainPolicy,
    FeatureEntitlement,
    MarketplaceProduct,
    MarketplaceShop,
    VaultAccessLink,
    VaultAccessLog,
    VaultBlock,
    VaultOrder,
    VaultPrivateOffer,
)


def _future(days: int = 30) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def _ensure_vault_tables() -> None:
    CommunityDomain.__table__.create(bind=engine, checkfirst=True)
    CommunityDomainPolicy.__table__.create(bind=engine, checkfirst=True)
    MarketplaceShop.__table__.create(bind=engine, checkfirst=True)
    MarketplaceProduct.__table__.create(bind=engine, checkfirst=True)
    FeatureEntitlement.__table__.create(bind=engine, checkfirst=True)
    VaultOrder.__table__.create(bind=engine, checkfirst=True)
    VaultBlock.__table__.create(bind=engine, checkfirst=True)
    VaultPrivateOffer.__table__.create(bind=engine, checkfirst=True)
    VaultAccessLink.__table__.create(bind=engine, checkfirst=True)
    VaultAccessLog.__table__.create(bind=engine, checkfirst=True)


def _seed_vault_owner(*, entitlement_quantity: int = 2) -> None:
    _ensure_vault_tables()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'vault-owner@example.com', 'hashed', 'Vault Owner', 'user', 'GMFN-U-VAULT'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Vault Clan', 'Vault Clan Marketplace', 'VAULTTEST1')
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
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Vault Owner Shop', 'Private offer shop', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    payment_reference
                ) VALUES (
                    1, 1, 1, 1, 'vault_slot', 'PLAN_VAULT_SLOT_1_PERIOD',
                    :quantity_total, 0, 'active', :starts_at, :expires_at,
                    'VAULT-TEST-ENTITLEMENT'
                )
                """
            ),
            {
                "quantity_total": int(entitlement_quantity),
                "starts_at": datetime.now(timezone.utc),
                "expires_at": _future(),
            },
        )


def _seed_community_domain_vault_policy(*, mode: str = "off") -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id,
                    domain_name,
                    display_name,
                    domain_type,
                    template_key,
                    owner_user_id,
                    clan_id,
                    status,
                    verification_status,
                    created_at,
                    updated_at
                )
                VALUES (
                    1,
                    'vault-feature-policy-domain',
                    'Vault Feature Policy Domain',
                    'ngo_project_network',
                    'ngo_project_network',
                    1,
                    1,
                    'active',
                    'unverified',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id,
                    community_domain_id,
                    policy_key,
                    action_key,
                    scope_type,
                    review_mode,
                    required_role,
                    status,
                    policy_summary,
                    config_json,
                    created_by_user_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    1,
                    1,
                    'domain.feature_policy',
                    'domain.features.configure',
                    'domain',
                    'domain_admin_review',
                    'owner_admin',
                    'active',
                    'Vault route feature policy test',
                    :config_json,
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {"config_json": json.dumps({"features": {"vault": mode}})},
        )


def _seed_private_vault_product() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Private Vault Offer', 'Only visible through one Vault link',
                    '20', 'GBP', '/uploads/vault/private.jpg', NULL, 'vault_private', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO vault_blocks (
                    id, shop_id, slot_number, state, product_id, activated_at, expires_at
                ) VALUES (
                    1, 1, 1, 'active', 1, :activated_at, :expires_at
                )
                """
            ),
            {"activated_at": datetime.now(timezone.utc), "expires_at": _future()},
        )
        conn.execute(
            text(
                """
                INSERT INTO vault_private_offers (
                    id, block_id, shop_id, product_id, media_type, media_url,
                    thumbnail_url, caption, status
                ) VALUES (
                    1, 1, 1, 1, 'image', '/uploads/vault/private.jpg',
                    '/uploads/vault/private.jpg', 'Only visible through one Vault link', 'published'
                )
                """
            )
        )


def test_vault_status_creates_blocks_and_syncs_legacy_entitlement(
    client,
    override_current_user_user,
):
    _seed_vault_owner(entitlement_quantity=2)

    res = client.get("/marketplace/shops/1/vault-status")

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["ok"] is True
    assert body["shop_id"] == 1
    assert body["max_slots"] == 6
    assert body["active_paid_slots"] == 2
    assert len(body["blocks"]) == 6
    assert [block["slot_number"] for block in body["blocks"]] == [1, 2, 3, 4, 5, 6]
    assert [block["state"] for block in body["blocks"][:2]] == ["active", "active"]
    assert [block["state"] for block in body["blocks"][2:]] == ["inactive", "inactive", "inactive", "inactive"]


def test_vault_access_link_requires_and_returns_one_active_block_scope(
    client,
    override_current_user_user,
):
    _seed_vault_owner(entitlement_quantity=1)
    _seed_private_vault_product()

    missing_scope = client.post("/marketplace/shops/1/vault-access-links", json={})
    assert missing_scope.status_code == 400
    assert "one selected private block" in missing_scope.json()["detail"]

    created = client.post(
        "/marketplace/shops/1/vault-access-links",
        json={"product_id": 1, "max_views": 2},
    )
    assert created.status_code == 200, created.text
    first_link = created.json()["item"]
    assert first_link["product_id"] == 1
    assert first_link["block_id"] == 1
    assert first_link["status"] == "active"

    replacement = client.post(
        "/marketplace/shops/1/vault-access-links",
        json={"product_id": 1},
    )
    assert replacement.status_code == 200, replacement.text
    second_link = replacement.json()["item"]
    assert second_link["product_id"] == 1
    assert second_link["block_id"] == 1
    assert second_link["id"] != first_link["id"]

    listed = client.get("/marketplace/shops/1/vault-access-links")
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert {item["id"]: item["status"] for item in items} == {
        first_link["id"]: "revoked",
        second_link["id"]: "active",
    }

    viewed = client.get(f"/marketplace/vault-access/{second_link['token']}")
    assert viewed.status_code == 200, viewed.text
    view_body = viewed.json()
    assert view_body["ok"] is True
    assert view_body["product_id"] == 1
    assert view_body["block_id"] == 1
    assert [product["id"] for product in view_body["products"]] == [1]
    assert view_body["views_used"] == 0

    opened = client.post(f"/marketplace/vault-access/{second_link['token']}/open")
    assert opened.status_code == 200, opened.text
    assert opened.json()["views_used"] == 1

    with engine.begin() as conn:
        log_count = conn.execute(text("SELECT COUNT(*) FROM vault_access_logs")).scalar_one()
    assert log_count == 1


def test_vault_access_link_create_respects_disabled_community_domain_vault_policy(
    client,
    override_current_user_user,
):
    _seed_vault_owner(entitlement_quantity=1)
    _seed_private_vault_product()
    _seed_community_domain_vault_policy(mode="off")

    response = client.post(
        "/marketplace/shops/1/vault-access-links",
        json={"product_id": 1},
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "vault"
    assert "private Vault content" in detail["message"]
    with engine.begin() as conn:
        link_count = conn.execute(text("SELECT COUNT(*) FROM vault_access_links")).scalar_one()
    assert link_count == 0


def test_vault_access_view_stops_when_community_domain_vault_policy_is_disabled(
    client,
    override_current_user_user,
):
    _seed_vault_owner(entitlement_quantity=1)
    _seed_private_vault_product()

    created = client.post(
        "/marketplace/shops/1/vault-access-links",
        json={"product_id": 1, "max_views": 2},
    )
    assert created.status_code == 200, created.text
    token = created.json()["item"]["token"]

    _seed_community_domain_vault_policy(mode="off")

    viewed = client.get(f"/marketplace/vault-access/{token}")

    assert viewed.status_code == 200, viewed.text
    body = viewed.json()
    assert body["ok"] is False
    assert body["status"] == "domain_vault_disabled"
    assert body["detail"] == "Vault is not enabled for this Community Domain."
    with engine.begin() as conn:
        log_count = conn.execute(text("SELECT COUNT(*) FROM vault_access_logs")).scalar_one()
    assert log_count == 1


def test_vault_access_link_rejects_malformed_integer_controls(
    client,
    override_current_user_user,
):
    _seed_vault_owner(entitlement_quantity=1)
    _seed_private_vault_product()

    base_payload = {"product_id": 1, "max_views": 2}

    for field_name in ("product_id", "max_views"):
        payload = dict(base_payload)
        payload[field_name] = False
        rejected_bool = client.post("/marketplace/shops/1/vault-access-links", json=payload)
        assert rejected_bool.status_code == 422, (field_name, rejected_bool.text)
        assert f"{field_name} must be an integer, not a boolean" in rejected_bool.text

        payload[field_name] = 1.0
        rejected_float = client.post("/marketplace/shops/1/vault-access-links", json=payload)
        assert rejected_float.status_code == 422, (field_name, rejected_float.text)
        assert f"{field_name} must be an integer, not a float" in rejected_float.text


def test_vault_access_link_rejects_malformed_boolean_controls_before_link_write(
    client,
    override_current_user_user,
):
    _seed_vault_owner(entitlement_quantity=1)
    _seed_private_vault_product()

    base_payload = {
        "product_id": 1,
        "max_views": 2,
        "allow_download": False,
        "allow_print": False,
        "allow_reshare": False,
        "watermark_enabled": True,
    }

    for field_name in ("allow_download", "allow_print", "allow_reshare", "watermark_enabled"):
        payload = dict(base_payload)
        payload[field_name] = "yes"
        response = client.post("/marketplace/shops/1/vault-access-links", json=payload)
        assert response.status_code == 422, (field_name, response.text)
        assert f"{field_name} must be boolean" in response.text

    with engine.begin() as conn:
        link_count = conn.execute(text("SELECT COUNT(*) FROM vault_access_links")).scalar_one()
    assert link_count == 0


def test_vault_access_link_rejects_malformed_expiry_controls_before_mutation(
    client,
    override_current_user_user,
):
    _seed_vault_owner(entitlement_quantity=1)
    _seed_private_vault_product()

    create_response = client.post(
        "/marketplace/shops/1/vault-access-links",
        json={"product_id": 1, "expires_at": _future(2).isoformat()},
    )
    assert create_response.status_code == 200, create_response.text
    link = create_response.json()["item"]
    original_expires_at = link["expires_at"]

    create_bad_expiry = client.post(
        "/marketplace/shops/1/vault-access-links",
        json={"product_id": 1, "expires_at": 12345},
    )
    assert create_bad_expiry.status_code == 422, create_bad_expiry.text
    assert "expires_at must be an ISO datetime string" in create_bad_expiry.text

    extend_bad_expiry = client.post(
        f"/marketplace/vault-access-links/{link['id']}/extend",
        json={"expires_at": True},
    )
    assert extend_bad_expiry.status_code == 422, extend_bad_expiry.text
    assert "expires_at must be an ISO datetime string" in extend_bad_expiry.text

    listed = client.get("/marketplace/shops/1/vault-access-links")
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == link["id"]
    assert items[0]["expires_at"] == original_expires_at
