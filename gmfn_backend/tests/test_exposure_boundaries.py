from __future__ import annotations

from fastapi.testclient import TestClient


def test_exposure_admin_rejects_non_positive_clan_scope(
    client: TestClient,
    override_current_user,
):
    bad_query = client.get(
        "/exposure/admin",
        params={"clan_id": 0},
    )
    bad_header = client.get(
        "/exposure/admin",
        headers={"X-Clan-Id": "0"},
    )

    assert bad_query.status_code == 422, bad_query.text
    assert bad_header.status_code == 422, bad_header.text
    assert "clan_id" in bad_query.text
    assert "X-Clan-Id" in bad_header.text


def test_exposure_admin_cci_scores_rejects_non_positive_ids(
    client: TestClient,
    override_current_user,
):
    bad_query = client.get(
        "/exposure/admin/cci-scores",
        params={"clan_id": 0, "user_id": 0},
    )
    bad_header = client.get(
        "/exposure/admin/cci-scores",
        params={"clan_id": 1, "user_id": 1},
        headers={"X-Clan-Id": "0"},
    )

    assert bad_query.status_code == 422, bad_query.text
    assert bad_header.status_code == 422, bad_header.text
    assert "clan_id" in bad_query.text
    assert "user_id" in bad_query.text
    assert "X-Clan-Id" in bad_header.text
