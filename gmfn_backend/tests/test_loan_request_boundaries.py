from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


def _loan_boundary_counts() -> tuple[int, int, int]:
    with engine.begin() as conn:
        loans = conn.execute(text("SELECT COUNT(*) FROM loans")).scalar_one()
        guarantors = conn.execute(text("SELECT COUNT(*) FROM loan_guarantors")).scalar_one()
        trust_events = conn.execute(text("SELECT COUNT(*) FROM trust_events")).scalar_one()
    return int(loans), int(guarantors), int(trust_events)


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


def test_loan_create_rejects_malformed_amount_before_loan_write(
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

    for bad_value in (False, 1.5, "not-money", "   "):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        rejected = client.post("/loans", json=payload)
        assert rejected.status_code == 422, (bad_value, rejected.text)
        assert "amount must be a decimal string" in rejected.text
        assert _loan_boundary_counts() == (0, 0, 0)


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


def test_loan_guarantor_create_rejects_malformed_pledge_amount_before_write(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    base_payload = {
        "guarantor_user_id": 2,
        "pledge_amount": "1.00",
    }

    for bad_value in (False, 1.5, "not-money", "   "):
        payload = dict(base_payload)
        payload["pledge_amount"] = bad_value
        rejected = client.post("/loans/1/guarantors", json=payload)
        assert rejected.status_code == 422, (bad_value, rejected.text)
        assert "pledge_amount must be a decimal string" in rejected.text

    assert _loan_boundary_counts() == (1, 0, 0)
