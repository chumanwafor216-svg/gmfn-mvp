# tests/test_clan_members.py

def _extract_items(payload):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get("items"), list):
        return payload["items"]
    return []


def test_list_clan_members_admin_ok(client, override_current_user, seed_clan_admin_membership):
    r = client.get("/clans/1/members")
    assert r.status_code == 200, r.text

    data = r.json()
    items = _extract_items(data)

    assert isinstance(items, list)
    assert len(items) >= 1


def test_add_member_admin_ok(client, override_current_user, seed_clan_admin_membership, seed_user2_non_member):
    payload = {"user_id": 2, "role": "member"}
    r = client.post("/clans/1/members", json=payload)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data["clan_id"] == 1
    assert data["user_id"] == 2


def test_add_member_non_admin_forbidden(
    client,
    override_current_user_user,  # 👈 non-admin user
    seed_clan_member_membership,
    seed_user2_non_member,
):
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

    # API may return 204 (old) or 200 {"ok": true} (new)
    assert r2.status_code in (200, 204), r2.text
    if r2.status_code == 200:
        j = r2.json()
        assert j.get("ok") is True