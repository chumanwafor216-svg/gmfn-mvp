from __future__ import annotations

import json

from sqlalchemy import text

from app.db.database import engine


def _assert_rejected(client, path: str, payload: dict, expected_text: str) -> None:
    response = client.post(path, json=payload)
    assert response.status_code == 422, response.text
    assert expected_text in response.text


def _seed_shop_domain_feature_policy(feature_key: str, mode: str = "off") -> int:
    shop_id = 908
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    is_active,
                    created_at
                )
                VALUES (
                    :shop_id,
                    1,
                    1,
                    'Payment Policy Test Shop',
                    'Shop for payment instruction policy tests',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {"shop_id": shop_id},
        )
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
                    906,
                    'shop-service-policy-test-domain',
                    'Shop Service Policy Test Domain',
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
                    907,
                    906,
                    'domain.feature_policy',
                    'domain.features.configure',
                    'domain',
                    'domain_admin_review',
                    'owner_admin',
                    'active',
                    'Shop service payment route feature policy test',
                    :config_json,
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {"config_json": json.dumps({"features": {feature_key: mode}})},
        )
    return shop_id


def test_loan_instruction_rejects_malformed_boundary_controls(
    client,
    override_current_user,
):
    base_payload = {
        "clan_id": 1,
        "loan_id": 1,
        "amount": "20.00",
        "currency": "GBP",
    }

    for field_name in ("clan_id", "loan_id"):
        payload = dict(base_payload)
        payload[field_name] = False
        _assert_rejected(
            client,
            "/payment-instructions/loan",
            payload,
            f"{field_name} must be an integer, not a boolean",
        )

        payload[field_name] = 1.5
        _assert_rejected(
            client,
            "/payment-instructions/loan",
            payload,
            f"{field_name} must be an integer, not a float",
        )

    for bad_value in (False, 20):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        _assert_rejected(
            client,
            "/payment-instructions/loan",
            payload,
            "amount must be a decimal string",
        )

    for bad_value in (False, 1.5):
        payload = dict(base_payload)
        payload["currency"] = bad_value
        _assert_rejected(
            client,
            "/payment-instructions/loan",
            payload,
            "currency must be text",
        )


def test_vault_instruction_rejects_malformed_boundary_controls(
    client,
    override_current_user,
):
    base_payload = {
        "clan_id": 1,
        "shop_id": 1,
        "quantity_total": 1,
        "currency": "GBP",
    }

    for field_name in ("clan_id", "shop_id", "quantity_total"):
        payload = dict(base_payload)
        payload[field_name] = False
        _assert_rejected(
            client,
            "/payment-instructions/vault",
            payload,
            f"{field_name} must be an integer, not a boolean",
        )

        payload[field_name] = 1.5
        _assert_rejected(
            client,
            "/payment-instructions/vault",
            payload,
            f"{field_name} must be an integer, not a float",
        )

    for bad_value in (False, 1.5):
        payload = dict(base_payload)
        payload["currency"] = bad_value
        _assert_rejected(
            client,
            "/payment-instructions/vault",
            payload,
            "currency must be text",
        )


def test_merchant_verify_instruction_rejects_malformed_boundary_controls(
    client,
    override_current_user,
):
    base_payload = {
        "clan_id": 1,
        "shop_id": 1,
        "amount": "20.00",
        "currency": "GBP",
    }

    for field_name in ("clan_id", "shop_id"):
        payload = dict(base_payload)
        payload[field_name] = False
        _assert_rejected(
            client,
            "/payment-instructions/merchant-verify",
            payload,
            f"{field_name} must be an integer, not a boolean",
        )

        payload[field_name] = 1.5
        _assert_rejected(
            client,
            "/payment-instructions/merchant-verify",
            payload,
            f"{field_name} must be an integer, not a float",
        )

    for bad_value in (False, 20):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        _assert_rejected(
            client,
            "/payment-instructions/merchant-verify",
            payload,
            "amount must be a decimal string",
        )

    for bad_value in (False, 1.5):
        payload = dict(base_payload)
        payload["currency"] = bad_value
        _assert_rejected(
            client,
            "/payment-instructions/merchant-verify",
            payload,
            "currency must be text",
        )


def test_spotlight_instruction_rejects_malformed_boundary_controls(
    client,
    override_current_user,
):
    base_payload = {
        "clan_id": 1,
        "shop_id": 1,
        "quantity_total": 1,
        "currency": "GBP",
        "visibility_scope": "direct_communities",
    }

    for field_name in ("clan_id", "shop_id", "quantity_total"):
        payload = dict(base_payload)
        payload[field_name] = False
        _assert_rejected(
            client,
            "/payment-instructions/spotlight",
            payload,
            f"{field_name} must be an integer, not a boolean",
        )

        payload[field_name] = 1.5
        _assert_rejected(
            client,
            "/payment-instructions/spotlight",
            payload,
            f"{field_name} must be an integer, not a float",
        )

    for bad_value in (False, 20):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        _assert_rejected(
            client,
            "/payment-instructions/spotlight",
            payload,
            "amount must be a decimal string",
        )

    for field_name in ("currency", "visibility_scope"):
        payload = dict(base_payload)
        payload[field_name] = False
        _assert_rejected(
            client,
            "/payment-instructions/spotlight",
            payload,
            f"{field_name} must be text",
        )

        payload[field_name] = 1.5
        _assert_rejected(
            client,
            "/payment-instructions/spotlight",
            payload,
            f"{field_name} must be text",
        )


def test_spotlight_instruction_respects_disabled_community_domain_spotlight_policy(
    client,
    override_current_user,
):
    shop_id = _seed_shop_domain_feature_policy("spotlight", "off")

    response = client.post(
        "/payment-instructions/spotlight",
        json={
            "clan_id": 1,
            "shop_id": shop_id,
            "quantity_total": 1,
            "currency": "GBP",
            "visibility_scope": "direct_communities",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "spotlight"
    assert "paid Spotlight payments" in detail["message"]

    with engine.begin() as conn:
        created = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM expected_payments
                WHERE expected_type = 'spotlight_subscription'
                """
            )
        ).scalar_one()
    assert created == 0


def test_payment_instruction_exposes_pending_authentication_contract(
    client,
    override_current_user,
):
    response = client.post(
        "/payment-instructions/pool",
        json={
            "clan_id": 1,
            "amount": "20.00",
            "currency": "GBP",
            "contribution_reason": "Monthly contribution",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "expected"
    assert body["payment_stage"] == "pending_authentication"
    assert body["payment_status_label"] == "Pending Authentication"
    assert "bank" in body["bank_authentication_guidance"].lower()
    assert "provider" in body["bank_authentication_guidance"].lower()
