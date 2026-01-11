def test_list_guarantors_empty_contract(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    r = client.get("/loans/1/guarantors")
    assert r.status_code == 200, r.text

    data = r.json()
    assert isinstance(data, dict)
    assert "items" in data and "total" in data
    assert isinstance(data["items"], list)
    assert data["items"] == []
    assert data["total"] == 0


def test_invite_guarantor_admin_ok_contract(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    payload = {"guarantor_user_id": 1, "pledge_amount": 0}
    r = client.post("/loans/1/guarantors", json=payload)
    assert r.status_code in (200, 201), r.text

    data = r.json()
    assert data["loan_id"] == 1
    assert data["clan_id"] == 1
    assert data["guarantor_user_id"] == 1
    assert data["status"] == "pending"


def test_invite_guarantor_duplicate_conflict_contract(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
):
    payload = {"guarantor_user_id": 1, "pledge_amount": 0}

    r1 = client.post("/loans/1/guarantors", json=payload)
    assert r1.status_code in (200, 201), r1.text

    r2 = client.post("/loans/1/guarantors", json=payload)
    assert r2.status_code == 409, r2.text

    data = r2.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)


def test_invite_guarantor_non_admin_forbidden_contract(
    client,
    seed_clan_member_membership,
    seed_loan,
    override_current_user,
):
    payload = {"guarantor_user_id": 1, "pledge_amount": 0}
    r = client.post("/loans/1/guarantors", json=payload)

    assert r.status_code == 403, r.text
    assert "detail" in r.json() 

def test_invite_guarantor_loan_not_found_contract(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
):
    payload = {"guarantor_user_id": 1}
    r = client.post("/loans/999999/guarantors", json=payload)
    assert r.status_code == 404, r.text
    assert "detail" in r.json()


def test_invite_guarantor_non_member_bad_request_contract(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
    seed_user2_non_member,
):
    payload = {"guarantor_user_id": 2, "pledge_amount": 0}
    r = client.post("/loans/1/guarantors", json=payload)
    assert r.status_code == 400, r.text
    data = r.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)
