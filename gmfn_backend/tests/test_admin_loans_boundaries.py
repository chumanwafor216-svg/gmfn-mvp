from __future__ import annotations

from fastapi.testclient import TestClient


def test_admin_incomplete_loans_rejects_non_positive_clan_scope(
    client: TestClient,
    override_current_user,
):
    bad_query = client.get(
        "/admin/loans/incomplete",
        params={"clan_id": 0},
    )
    bad_header = client.get(
        "/admin/loans/incomplete",
        headers={"X-Clan-Id": "0"},
    )

    assert bad_query.status_code == 422, bad_query.text
    assert bad_header.status_code == 422, bad_header.text
    assert "clan_id" in bad_query.text
    assert "X-Clan-Id" in bad_header.text


def test_admin_loan_locks_rejects_non_positive_clan_scope(
    client: TestClient,
    override_current_user,
):
    bad_query = client.get(
        "/admin/loans/locks",
        params={"clan_id": 0},
    )
    bad_header = client.get(
        "/admin/loans/locks",
        headers={"X-Clan-Id": "0"},
    )

    assert bad_query.status_code == 422, bad_query.text
    assert bad_header.status_code == 422, bad_header.text
    assert "clan_id" in bad_query.text
    assert "X-Clan-Id" in bad_header.text
