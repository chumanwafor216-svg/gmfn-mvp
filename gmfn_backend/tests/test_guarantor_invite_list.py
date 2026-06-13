# tests/test_guarantor_invite_list.py
from sqlalchemy import text

from app.core import clan_auth
from app.db.database import engine
from app.main import app

PLEDGE_OK = "1.00"  # Decimal-safe, > 0


def _obj(**kwargs):
    return type("Obj", (), kwargs)()


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
    seed_user2_non_member,
    seed_user2_member_membership,
):
    payload = {"guarantor_user_id": 2, "pledge_amount": PLEDGE_OK}
    r = client.post("/loans/1/guarantors", json=payload)
    assert r.status_code in (200, 201), r.text

    data = r.json()
    assert data["loan_id"] == 1
    assert data["clan_id"] == 1
    assert data["guarantor_user_id"] == 2
    assert data["status"] == "pending"


def test_invite_guarantor_duplicate_conflict_contract(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_loan,
    seed_user2_non_member,
    seed_user2_member_membership,
):
    payload = {"guarantor_user_id": 2, "pledge_amount": PLEDGE_OK}

    r1 = client.post("/loans/1/guarantors", json=payload)
    assert r1.status_code in (200, 201), r1.text

    r2 = client.post("/loans/1/guarantors", json=payload)
    assert r2.status_code == 409, r2.text

    data = r2.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)


def test_invite_guarantor_borrower_member_ok_contract(
    client,
    override_clan_ctx_member,  # membership role = user/non-admin
    seed_clan_member_membership,
    seed_loan,
    seed_user2_non_member,
    seed_user2_member_membership,
    override_current_user_user,  # user role = user
):
    payload = {"guarantor_user_id": 2, "pledge_amount": PLEDGE_OK}
    r = client.post("/loans/1/guarantors", json=payload)

    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data["loan_id"] == 1
    assert data["clan_id"] == 1
    assert data["guarantor_user_id"] == 2
    assert data["status"] == "pending"


def test_invite_guarantor_non_borrower_member_forbidden_contract(
    client,
    seed_clan_member_membership,
    seed_loan,
    seed_user2_non_member,
    seed_user2_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (3, 'user3@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 3, 'user', 0)
                """
            )
        )

    def fake_clan_ctx():
        clan = _obj(id=1)
        membership = _obj(role="user", clan_id=1, user_id=3)
        current_user = _obj(id=3, email="user3@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx
    try:
        payload = {"guarantor_user_id": 2, "pledge_amount": PLEDGE_OK}
        r = client.post("/loans/1/guarantors", json=payload)
    finally:
        app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)

    assert r.status_code == 403, r.text
    assert r.json()["detail"] == "Only the borrower or community admin can add guarantors"


def test_invite_guarantor_loan_not_found_contract(
    client,
    override_clan_ctx_admin,
    seed_clan_admin_membership,
    seed_user2_non_member,
):
    payload = {"guarantor_user_id": 2, "pledge_amount": PLEDGE_OK}
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
    # user 2 exists but is NOT a clan member here -> should 400
    payload = {"guarantor_user_id": 2, "pledge_amount": PLEDGE_OK}
    r = client.post("/loans/1/guarantors", json=payload)
    assert r.status_code == 400, r.text
    data = r.json()
    assert "detail" in data
    assert isinstance(data["detail"], str)
