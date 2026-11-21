from __future__ import annotations

import json


MEASUREMENT_PATH = "/pipeline-credits/admin/spotlight-capacity-measurement"
MEASUREMENT_PARAMS = {
    "clan_id": 1,
    "service_date": "2026-11-20",
    "timezone_name": "Europe/London",
}


def test_spotlight_capacity_measurement_route_rejects_non_admin(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    response = client.get(MEASUREMENT_PATH, params=MEASUREMENT_PARAMS)

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


def test_spotlight_capacity_measurement_route_is_aggregate_and_read_only(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    response = client.get(MEASUREMENT_PATH, params=MEASUREMENT_PARAMS)

    assert response.status_code == 200
    payload = response.json()
    assert payload["measurement_version"] == "spotlight-capacity-observation.v2"
    assert payload["community_id"] == 1
    assert payload["service_date"] == "2026-11-20"
    assert payload["timezone"] == "Europe/London"
    assert set(payload["observed"]["dayparts"]) == {
        "overnight",
        "morning",
        "afternoon",
        "evening",
    }
    assert payload["safety"]["created_paid_service_commitment"] is False
    assert (
        payload["safety"]["paid_service_commitments_before"]
        == payload["safety"]["paid_service_commitments_after"]
    )
    assert "viewer_user_id" not in json.dumps(payload)
