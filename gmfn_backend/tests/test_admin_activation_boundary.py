from __future__ import annotations

from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core import auth as auth_core
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


def test_pending_applicant_password_check_is_cached_by_password_hash(monkeypatch):
    auth_core._matches_pending_applicant_password.cache_clear()
    calls: list[tuple[str, str]] = []

    def fake_verify_password(plain_password: str, hashed_password: str) -> bool:
        calls.append((plain_password, hashed_password))
        return True

    monkeypatch.setattr(auth_core, "verify_password", fake_verify_password)
    pending_user = SimpleNamespace(
        email=f"member{auth_core.PENDING_APPLICANT_EMAIL_SUFFIX}",
        hashed_password="$2b$test-pending-hash",
    )

    try:
        assert auth_core.is_user_activation_pending(pending_user) is True
        assert auth_core.is_user_activation_pending(pending_user) is True
        assert calls == [
            (
                auth_core.PENDING_APPLICANT_TEMP_PASSWORD,
                "$2b$test-pending-hash",
            )
        ]
    finally:
        auth_core._matches_pending_applicant_password.cache_clear()
