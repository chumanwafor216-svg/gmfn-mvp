from fastapi.testclient import TestClient


def test_patch_loan_guarantor_status_ok_contract(
    client: TestClient,
    override_current_user,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
    seed_loan_guarantor,  # ✅ add this
):
    loan_id = 1
    guarantor_id = 1
    payload = {"status": "pending"}

    r = client.patch(f"/loans/{loan_id}/guarantors/{guarantor_id}", json=payload)
    assert r.status_code == 200, r.text

    data = r.json()

    # Contract: must have status as string
    assert "status" in data
    assert isinstance(data["status"], str)
    assert data["status"] in {"pending", "approved", "rejected"}

    # Optional fields: type sanity only
    for key in (
        "id",
        "loan_id",
        "clan_id",
        "guarantor_user_id",
        "pledge_amount",
        "responded_at",
    ):
        if key in data:
            if key in ("id", "loan_id", "clan_id", "guarantor_user_id"):
                assert isinstance(data[key], int)
            elif key == "pledge_amount":
                assert isinstance(data[key], (int, float))
            elif key == "responded_at":
                assert isinstance(data[key], (str, type(None)))


def test_patch_loan_guarantor_status_invalid_value_contract(
    client: TestClient,
    override_current_user,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
    seed_loan_guarantor,
):
    loan_id = 1
    guarantor_id = 1
    payload = {"status": "not-a-real-status"}

    r = client.patch(f"/loans/{loan_id}/guarantors/{guarantor_id}", json=payload)
    assert r.status_code in {400, 422}, r.text

    data = r.json()
    assert "detail" in data


def test_patch_loan_guarantor_status_not_found_contract(
    client: TestClient,
    override_current_user,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    loan_id = 1
    missing_guarantor_id = 999999
    payload = {"status": "pending"}

    r = client.patch(f"/loans/{loan_id}/guarantors/{missing_guarantor_id}", json=payload)
    assert r.status_code == 404, r.text

    data = r.json()
    assert "detail" in data
