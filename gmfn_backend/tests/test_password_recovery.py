from __future__ import annotations

import os
from datetime import datetime, timezone

from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.db.models import User
from app.services.identity_service import upsert_identity_recovery_profile

os.environ["SECRET_KEY"] = "pytest-password-recovery-secret"


RECOVERY_QUESTIONS = [
    {"prompt": "What is your first community?", "answer": "Main Movement"},
    {"prompt": "What name does your family call you?", "answer": "Chuma"},
    {"prompt": "Which city did you first join from?", "answer": "Aberdeen"},
]


def _seed_recovery_user(*, configured: bool = True, phone_verified: bool = True) -> None:
    with SessionLocal() as db:
        user = User(
            id=77,
            email="recovery-user@example.com",
            hashed_password=get_password_hash("old-secret"),
            role="user",
            gmfn_id="GSN-U-B7AC7BC0",
            phone_e164="+447700900123",
            phone_verified_at=datetime.now(timezone.utc) if phone_verified else None,
        )
        db.add(user)
        db.commit()

        if configured:
            upsert_identity_recovery_profile(
                db,
                user_id=int(user.id),
                prompts_and_answers=RECOVERY_QUESTIONS,
            )


def test_password_recovery_resets_active_account_after_private_answers(client):
    _seed_recovery_user()

    start = client.post(
        "/auth/password-recovery/start",
        json={"gmfn_id": "GSN-U-B7AC7BC0", "phone_e164": "+44 7700 900123"},
    )
    assert start.status_code == 200, start.text
    start_body = start.json()
    assert start_body["ok"] is True
    assert start_body["phone_mask"] == "***0123"
    assert start_body["prompts"] == [item["prompt"] for item in RECOVERY_QUESTIONS]

    reset = client.post(
        "/auth/password-recovery/reset",
        json={
            "gmfn_id": "GSN-U-B7AC7BC0",
            "phone_e164": "+447700900123",
            "answers": [item["answer"] for item in RECOVERY_QUESTIONS],
            "new_password": "new-secret",
            "confirm_password": "new-secret",
        },
    )
    assert reset.status_code == 200, reset.text
    assert reset.json()["access_token"]

    old_login = client.post(
        "/auth/login",
        data={"username": "GSN-U-B7AC7BC0", "password": "old-secret"},
    )
    assert old_login.status_code == 401, old_login.text

    new_login = client.post(
        "/auth/login",
        data={"username": "GSN-U-B7AC7BC0", "password": "new-secret"},
    )
    assert new_login.status_code == 200, new_login.text
    assert new_login.json()["gmfn_id"] == "GSN-U-B7AC7BC0"


def test_password_recovery_requires_matching_verified_phone(client):
    _seed_recovery_user()

    response = client.post(
        "/auth/password-recovery/start",
        json={"gmfn_id": "GSN-U-B7AC7BC0", "phone_e164": "+447700900999"},
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"]["code"] == "password_recovery_unavailable"


def test_password_recovery_rejects_wrong_private_answers(client):
    _seed_recovery_user()

    response = client.post(
        "/auth/password-recovery/reset",
        json={
            "gmfn_id": "GSN-U-B7AC7BC0",
            "phone_e164": "+447700900123",
            "answers": ["wrong", "answers", "here"],
            "new_password": "new-secret",
            "confirm_password": "new-secret",
        },
    )
    assert response.status_code == 401, response.text
    assert response.json()["detail"]["code"] == "recovery_answers_mismatch"

    old_login = client.post(
        "/auth/login",
        data={"username": "GSN-U-B7AC7BC0", "password": "old-secret"},
    )
    assert old_login.status_code == 200, old_login.text


def test_password_recovery_refuses_unconfigured_self_service(client):
    _seed_recovery_user(configured=False)

    response = client.post(
        "/auth/password-recovery/start",
        json={"gmfn_id": "GSN-U-B7AC7BC0", "phone_e164": "+447700900123"},
    )
    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "recovery_not_configured"


def test_password_recovery_refuses_unverified_phone_self_service(client):
    _seed_recovery_user(phone_verified=False)

    response = client.post(
        "/auth/password-recovery/start",
        json={"gmfn_id": "GSN-U-B7AC7BC0", "phone_e164": "+447700900123"},
    )
    assert response.status_code == 404, response.text
    assert response.json()["detail"]["code"] == "password_recovery_unavailable"
