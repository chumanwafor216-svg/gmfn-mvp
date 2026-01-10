from fastapi.testclient import TestClient


def test_patch_member_pool_balance_admin_ok_contract(
    client: TestClient,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
):
    clan_id = 1
    user_id = 1
    payload = {"pool_balance": 20000}

    r = client.patch(f"/clans/{clan_id}/members/{user_id}/pool", json=payload)
    assert r.status_code == 200, r.text

    data = r.json()

    # Contract: response must include pool_balance as number
    assert "pool_balance" in data
    assert isinstance(data["pool_balance"], (int, float))
    assert float(data["pool_balance"]) == 20000.0


def test_patch_member_pool_balance_non_admin_forbidden_contract(
    client: TestClient,
    override_clan_ctx_member,
    seed_clan_admin_membership,
):
    clan_id = 1
    user_id = 1
    payload = {"pool_balance": 20000}

    r = client.patch(f"/clans/{clan_id}/members/{user_id}/pool", json=payload)
    assert r.status_code == 403, r.text

    data = r.json()
    # Contract: error responses include detail
    assert "detail" in data
    assert isinstance(data["detail"], str)
    assert "Clan admin" in data["detail"]


def test_patch_member_pool_balance_membership_not_found_contract(
    client: TestClient,
    override_clan_ctx_admin,
):
    clan_id = 1
    missing_user_id = 999999
    payload = {"pool_balance": 20000}

    r = client.patch(f"/clans/{clan_id}/members/{missing_user_id}/pool", json=payload)
    assert r.status_code == 404, r.text

    data = r.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)
