from __future__ import annotations

import json

from sqlalchemy import text


def _expected_payment_count() -> int:
    from app.db.database import engine

    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM expected_payments")).scalar_one())


def test_expected_loan_repayment_rejects_malformed_loan_id(
    client,
    override_clan_ctx_admin,
):
    base_payload = {
        "loan_id": 1,
        "amount": "25.00",
        "currency": "NGN",
    }

    for bad_value, expected_text in (
        (False, "loan_id must be an integer, not a boolean"),
        (True, "loan_id must be an integer, not a boolean"),
        (1.0, "loan_id must be an integer, not a float"),
    ):
        payload = dict(base_payload)
        payload["loan_id"] = bad_value
        response = client.post("/bank/expected/loan-repayment", json=payload)
        assert response.status_code == 422, response.text
        assert expected_text in response.text


def test_bank_ingest_rejects_malformed_boundary_controls(
    client,
    override_clan_ctx_admin,
):
    base_payload = {
        "amount": "25.00",
        "currency": "NGN",
        "direction": "credit",
        "reference": "GMFN-POOL-CLAN-1-U1-TEST",
        "description": "Manual pilot bank event",
    }

    for bad_value in (False, 25):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        response = client.post("/bank/ingest", json=payload)
        assert response.status_code == 422, response.text
        assert "amount must be a decimal string" in response.text

    for field_name in ("currency", "direction", "reference", "description"):
        payload = dict(base_payload)
        payload[field_name] = False
        response = client.post("/bank/ingest", json=payload)
        assert response.status_code == 422, (field_name, response.text)
        assert f"{field_name} must be text" in response.text


def test_expected_pool_deposit_rejects_malformed_boundary_controls_without_expected_payment_mutation(
    client,
    override_clan_ctx_admin,
):
    base_payload = {
        "amount": "25.00",
        "currency": "NGN",
        "reference_display": "GMFN-POOL-CLAN-1-U1-TEST",
        "due_at": "2026-07-02T12:00:00Z",
    }

    for bad_value in (False, 25):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        response = client.post("/bank/expected/pool-deposit", json=payload)
        assert response.status_code == 422, response.text
        assert "amount must be a decimal string" in response.text
        assert _expected_payment_count() == 0

    for field_name in ("currency", "reference_display"):
        payload = dict(base_payload)
        payload[field_name] = False
        response = client.post("/bank/expected/pool-deposit", json=payload)
        assert response.status_code == 422, (field_name, response.text)
        assert f"{field_name} must be text" in response.text
        assert _expected_payment_count() == 0

    payload = dict(base_payload)
    payload["due_at"] = 1_783_083_600
    response = client.post("/bank/expected/pool-deposit", json=payload)
    assert response.status_code == 422, response.text
    assert "due_at must be an ISO datetime string" in response.text
    assert _expected_payment_count() == 0


def test_expected_pool_deposit_respects_disabled_community_domain_payments_policy(
    client,
    override_clan_ctx_admin,
):
    from app.db.database import engine

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
                    602,
                    'bank-policy-test-domain',
                    'Bank Policy Test Domain',
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
                    603,
                    602,
                    'domain.feature_policy',
                    'domain.features.configure',
                    'domain',
                    'domain_admin_review',
                    'owner_admin',
                    'active',
                    'Payments disabled for bank expected-payment route test',
                    :config_json,
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "config_json": json.dumps(
                    {
                        "features": {
                            "payments_contributions": "off",
                            "member_invites": "admin_only",
                        }
                    }
                )
            },
        )

    response = client.post(
        "/bank/expected/pool-deposit",
        json={
            "amount": "25.00",
            "currency": "GBP",
            "reference_display": "GMFN-POOL-CLAN-1-U1-DISABLED",
            "due_at": "2026-07-02T12:00:00Z",
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "payments_contributions"
    assert "subscription activation" in detail["message"]
    assert _expected_payment_count() == 0


def test_expected_loan_repayment_rejects_malformed_optional_controls_before_loan_lookup(
    client,
    override_clan_ctx_admin,
):
    base_payload = {
        "loan_id": 1,
        "amount": "25.00",
        "currency": "NGN",
        "due_at": "2026-07-02T12:00:00Z",
    }

    for bad_value in (False, 25):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        response = client.post("/bank/expected/loan-repayment", json=payload)
        assert response.status_code == 422, response.text
        assert "amount must be a decimal string" in response.text
        assert _expected_payment_count() == 0

    payload = dict(base_payload)
    payload["currency"] = False
    response = client.post("/bank/expected/loan-repayment", json=payload)
    assert response.status_code == 422, response.text
    assert "currency must be text" in response.text
    assert _expected_payment_count() == 0

    payload = dict(base_payload)
    payload["due_at"] = 1_783_083_600
    response = client.post("/bank/expected/loan-repayment", json=payload)
    assert response.status_code == 422, response.text
    assert "due_at must be an ISO datetime string" in response.text
    assert _expected_payment_count() == 0
