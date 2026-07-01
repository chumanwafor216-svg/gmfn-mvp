from __future__ import annotations

from fastapi.testclient import TestClient


def test_admin_reconcile_rejects_malformed_query_controls_before_reconciliation(
    client: TestClient,
    override_current_user,
):
    response = client.post(
        "/admin/reconcile/1",
        params={
            "limit": 0,
            "dry_run": 2,
            "confirm_non_canonical": -1,
            "canonical_only_match": 3,
        },
    )

    assert response.status_code == 422, response.text
    assert "limit" in response.text
    assert "dry_run" in response.text
    assert "confirm_non_canonical" in response.text
    assert "canonical_only_match" in response.text
