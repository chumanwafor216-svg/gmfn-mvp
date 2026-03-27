def test_admin_trust_why_forbidden_for_non_admin(client, override_current_user_user, seed_clan_admin_membership):
    r = client.get("/admin/trust/why/1?limit=5")
    assert r.status_code == 403, r.text


def test_admin_trust_why_admin_ok(client, override_current_user, seed_clan_admin_membership):
    r = client.get("/admin/trust/why/1?limit=5")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user_id"] == 1
    assert "computed" in data
    assert "events" in data