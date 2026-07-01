from __future__ import annotations

from fastapi.testclient import TestClient


def test_admin_bank_debug_recent_events_rejects_limit_outside_route_bounds(
    client: TestClient,
    override_current_user,
):
    low_response = client.get(
        "/admin/bank/bank-events/recent",
        params={"clan_id": 1, "limit": 0},
    )
    high_response = client.get(
        "/admin/bank/bank-events/recent",
        params={"clan_id": 1, "limit": 201},
    )

    assert low_response.status_code == 422, low_response.text
    assert high_response.status_code == 422, high_response.text
    assert "limit" in low_response.text
    assert "limit" in high_response.text


def test_admin_bank_debug_expected_payments_rejects_limit_outside_route_bounds(
    client: TestClient,
    override_current_user,
):
    low_response = client.get(
        "/admin/bank/expected-payments/recent",
        params={"clan_id": 1, "limit": 0},
    )
    high_response = client.get(
        "/admin/bank/expected-payments/recent",
        params={"clan_id": 1, "limit": 201},
    )

    assert low_response.status_code == 422, low_response.text
    assert high_response.status_code == 422, high_response.text
    assert "limit" in low_response.text
    assert "limit" in high_response.text
