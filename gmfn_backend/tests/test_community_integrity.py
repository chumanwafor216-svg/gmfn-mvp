def test_set_active_community_rejects_malformed_clan_id(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    for value, expected in (
        (True, "clan_id must be an integer id"),
        (1.5, "clan_id must be an integer id"),
    ):
        response = client.post("/community/active", json={"clan_id": value})
        assert response.status_code == 422, response.text
        assert expected in response.text


def test_join_by_invite_rejects_malformed_invite_code(
    client,
    override_current_user,
):
    for value in (False, 1.5):
        response = client.post(
            "/community/join-by-invite",
            json={"invite_code": value},
        )
        assert response.status_code == 422, response.text
        assert "invite_code must be text" in response.text
