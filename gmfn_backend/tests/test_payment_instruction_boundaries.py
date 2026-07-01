from __future__ import annotations


def _assert_rejected(client, path: str, payload: dict, expected_text: str) -> None:
    response = client.post(path, json=payload)
    assert response.status_code == 422, response.text
    assert expected_text in response.text


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
