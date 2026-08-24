from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.security import verify_password
from app.db.database import SessionLocal
from app.db.models import User


def _seed_pending_member() -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES (2, 'pending-member@example.com', 'PENDING_APPROVAL', 'Pending Member', 'user', 'GSN-U-PENDING')
                """
            )
        )
        db.commit()


def test_admin_activate_membership_rejects_ordinary_user(
    client: TestClient,
    override_current_user_user,
):
    _seed_pending_member()

    response = client.post(
        "/admin/activate-membership",
        json={"gmfn_id": "GSN-U-PENDING", "password": "newpass123"},
    )

    assert response.status_code == 403, response.text
    with SessionLocal() as db:
        user = db.query(User).filter(User.gmfn_id == "GSN-U-PENDING").first()
        assert user is not None
        assert user.hashed_password == "PENDING_APPROVAL"


def test_admin_activate_membership_hashes_password_for_platform_admin(
    client: TestClient,
    override_current_user,
):
    _seed_pending_member()

    response = client.post(
        "/admin/activate-membership",
        json={"gmfn_id": "gsn-u-pending", "password": "newpass123"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "activated"
    assert body["gmfn_id"] == "GSN-U-PENDING"
    assert body["activated_by_user_id"] == 1

    with SessionLocal() as db:
        user = db.query(User).filter(User.gmfn_id == "GSN-U-PENDING").first()
        assert user is not None
        assert user.hashed_password != "newpass123"
        assert verify_password("newpass123", user.hashed_password)
