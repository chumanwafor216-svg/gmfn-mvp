from __future__ import annotations

from fastapi.testclient import TestClient


def test_admin_behaviour_metrics_rejects_non_positive_route_and_query_ids(
    client: TestClient,
    override_current_user,
):
    bad_user_response = client.get("/admin/behaviour/metrics/0")
    bad_clan_response = client.get(
        "/admin/behaviour/metrics/1",
        params={"clan_id": 0},
    )

    assert bad_user_response.status_code == 422, bad_user_response.text
    assert bad_clan_response.status_code == 422, bad_clan_response.text
    assert "user_id" in bad_user_response.text
    assert "clan_id" in bad_clan_response.text
