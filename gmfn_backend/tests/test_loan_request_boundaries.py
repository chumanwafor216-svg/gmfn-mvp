from __future__ import annotations


def test_loan_create_rejects_malformed_integer_controls(
    client,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    base_payload = {
        "clan_id": 1,
        "amount": "400",
        "currency": "NGN",
        "purpose": "Family support",
        "duration_days": 30,
    }

    for field_name in ("clan_id", "duration_days"):
        payload = dict(base_payload)
        payload[field_name] = False
        rejected_bool = client.post("/loans", json=payload)
        assert rejected_bool.status_code == 422, rejected_bool.text
        assert f"{field_name} must be an integer, not a boolean" in rejected_bool.text

        payload[field_name] = 1.0
        rejected_float = client.post("/loans", json=payload)
        assert rejected_float.status_code == 422, rejected_float.text
        assert f"{field_name} must be an integer, not a float" in rejected_float.text


def test_loan_guarantor_create_rejects_malformed_guarantor_user_id(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    base_payload = {
        "guarantor_user_id": 2,
        "pledge_amount": "1.00",
    }

    payload = dict(base_payload)
    payload["guarantor_user_id"] = False
    rejected_bool = client.post("/loans/1/guarantors", json=payload)
    assert rejected_bool.status_code == 422, rejected_bool.text
    assert "guarantor_user_id must be an integer, not a boolean" in rejected_bool.text

    payload["guarantor_user_id"] = 1.0
    rejected_float = client.post("/loans/1/guarantors", json=payload)
    assert rejected_float.status_code == 422, rejected_float.text
    assert "guarantor_user_id must be an integer, not a float" in rejected_float.text
