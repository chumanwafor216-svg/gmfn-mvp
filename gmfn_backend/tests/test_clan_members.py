# tests/test_clan_members.py

from app.routers import clans as legacy_clans_router
from app.db.database import engine
from app.schemas.clan_memberships import ClanMemberCreate
from sqlalchemy import text

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


def test_list_clan_members_separates_admitted_members_from_reviewers(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (
                    2,
                    'pending-member@example.com',
                    'PENDING_APPROVAL',
                    'user',
                    'GMFN-U-PENDING'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    clan_id,
                    user_id,
                    role,
                    personal_pool_balance
                )
                VALUES (1, 2, 'user', 0)
                """
            )
        )

    r = client.get("/clans/1/members")
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["total"] == 2
    assert data["active_membership_total"] == 2
    assert data["member_capacity_used"] == 2
    assert data["reviewer_total"] == 1
    assert [item["gmfn_id"] for item in data["items"]] == [
        None,
        "GMFN-U-PENDING",
    ]
    assert len(data["reviewer_items"]) == 1


def test_add_member_admin_ok(client, override_current_user, seed_clan_admin_membership, seed_user2_non_member):
    payload = {"user_id": 2, "role": "member"}
    r = client.post("/clans/1/members", json=payload)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data["clan_id"] == 1
    assert data["user_id"] == 2


def test_add_member_requires_extra_capacity_after_included_places(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    with engine.begin() as conn:
        for user_id in range(2, 17):
            conn.execute(
                text(
                    """
                    INSERT INTO users (id, email, hashed_password, role)
                    VALUES (:id, :email, 'hashed', 'user')
                    """
                ),
                {"id": user_id, "email": f"user{user_id}@example.com"},
            )

        for user_id in range(2, 16):
            conn.execute(
                text(
                    """
                    INSERT INTO clan_memberships (
                        clan_id,
                        user_id,
                        role,
                        personal_pool_balance
                    )
                    VALUES (1, :user_id, 'user', 0)
                    """
                ),
                {"user_id": user_id},
            )

    r = client.post("/clans/1/members", json={"user_id": 16, "role": "member"})
    assert r.status_code == 409, r.text
    detail = r.json()["detail"]
    assert detail["code"] == "community_member_capacity_full"
    assert detail["member_capacity"]["total"] == 15
    assert detail["member_capacity"]["remaining"] == 0

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    owner_user_id,
                    clan_id,
                    feature_code,
                    plan_code,
                    quantity_total,
                    quantity_used,
                    status,
                    starts_at,
                    expires_at,
                    payment_reference
                )
                VALUES (
                    1,
                    1,
                    'community_member_capacity',
                    'extra_members_1',
                    1,
                    0,
                    'active',
                    CURRENT_TIMESTAMP,
                    datetime('now', '+365 days'),
                    'pytest-extra-member-1'
                )
                """
            )
        )

    r2 = client.post("/clans/1/members", json={"user_id": 16, "role": "member"})
    assert r2.status_code in (200, 201), r2.text
    assert r2.json()["user_id"] == 16


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


def test_legacy_clan_member_schema_defaults_to_user_role():
    assert legacy_clans_router.router is not None
    payload = ClanMemberCreate(user_id=2)
    assert payload.role == "user"
