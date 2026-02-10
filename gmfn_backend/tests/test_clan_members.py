def test_list_clan_members_admin_ok(client, override_current_user, seed_clan_admin_membership):
    r = client.get("/clans/1/members")
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_add_member_admin_ok(client, override_current_user, seed_clan_admin_membership, seed_user2_non_member):
    payload = {"user_id": 2, "role": "member"}
    r = client.post("/clans/1/members", json=payload)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data["clan_id"] == 1
    assert data["user_id"] == 2


def test_add_member_non_admin_forbidden(client, override_current_user, seed_clan_member_membership, seed_user2_non_member):
    payload = {"user_id": 2, "role": "member"}
    r = client.post("/clans/1/members", json=payload)
    assert r.status_code == 403, r.text
    assert "detail" in r.json()


def test_remove_member_admin_ok(client, override_current_user, seed_clan_admin_membership, seed_user2_non_member):
    # add member first
    r1 = client.post("/clans/1/members", json={"user_id": 2, "role": "member"})
    assert r1.status_code in (200, 201), r1.text

    # remove member
    r2 = client.delete("/clans/1/members/2")
    assert r2.status_code == 204, r2.text
