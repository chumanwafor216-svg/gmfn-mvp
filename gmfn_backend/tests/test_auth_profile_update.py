from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db.models import Clan, ClanInvite, ClanMembership, TrustEvent, User


def _seed_profile_user() -> str:
    email = "profile-save@example.com"
    with SessionLocal() as db:
        db.add(
            User(
                id=1,
                email=email,
                hashed_password="hashed",
                role="user",
                display_name=None,
                gmfn_id="GMFN-U-PROFILE",
            )
        )
        db.commit()
    return email


def _headers(email: str) -> dict[str, str]:
    os.environ["SECRET_KEY"] = "pytest-profile-update-secret"
    token = create_access_token({"sub": email})
    return {"Authorization": f"Bearer {token}"}


def test_profile_update_saves_display_name_to_account(client):
    email = _seed_profile_user()

    response = client.patch(
        "/auth/me/profile",
        headers=_headers(email),
        json={"display_name": "  Nwafor Chuma  "},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["display_name"] == "Nwafor Chuma"
    assert body["nickname"] == "Nwafor Chuma"
    assert body["gmfn_id"] == "GMFN-U-PROFILE"

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        assert user.display_name == "Nwafor Chuma"


def test_profile_update_rejects_missing_name_placeholder(client):
    email = _seed_profile_user()

    response = client.patch(
        "/auth/me/profile",
        headers=_headers(email),
        json={"display_name": "Member name not set"},
    )

    assert response.status_code == 400, response.text
    assert "name or street name" in response.text

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        assert user.display_name is None


def test_profile_update_rejects_non_text_display_name(client):
    email = _seed_profile_user()

    response = client.patch(
        "/auth/me/profile",
        headers=_headers(email),
        json={"display_name": True},
    )

    assert response.status_code == 422, response.text
    assert "display_name must be text" in response.text

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        assert user.display_name is None


def test_founder_signup_with_invite_saves_display_name(client):
    with SessionLocal() as db:
        db.add(
            User(
                id=1,
                email="invite-owner@example.com",
                hashed_password="hashed",
                role="admin",
                gmfn_id="GMFN-U-OWNER",
            )
        )
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="founder-package",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    response = client.post(
        "/auth/signup-with-invite",
        json={
            "invite_code": "founder-package",
            "email": "new-founder@example.com",
            "password": "secret123",
            "display_name": "  Street Chairman  ",
            "clan_name": "Street Chairman Circle",
        },
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["display_name"] == "Street Chairman"
    assert body["nickname"] == "Street Chairman"

    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "new-founder@example.com").one()
        invite = db.get(ClanInvite, 1)
        assert user.display_name == "Street Chairman"
        assert invite is not None
        assert invite.uses == 1


def test_activate_membership_recovers_display_name_from_join_evidence(client):
    with SessionLocal() as db:
        db.add(
            User(
                id=1,
                email="2348011112222@pending.gmfn.local",
                hashed_password="PENDING_APPROVAL",
                role="user",
                gmfn_id="GMFN-U-JOINRECOVER",
                phone_e164="+2348011112222",
                display_name=None,
            )
        )
        db.add(
            Clan(
                id=1,
                name="Recovered Join Community",
                invite_code="recover-join-code",
                invite_created_at=datetime.now(timezone.utc),
                invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                invite_uses=0,
            )
        )
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="member",
                personal_pool_balance=0,
            )
        )
        event = TrustEvent(
            event_type="invite_accepted",
            clan_id=1,
            actor_user_id=1,
            subject_user_id=1,
            dedupe_key="recover-name-join-event",
        )
        event.meta = {
            "reason": "new_applicant_join_request_created",
            "applicant_profile": {
                "first_name": "Ada",
                "surname": "Ebony",
                "phone_e164": "+2348011112222",
            },
        }
        db.add(event)
        db.commit()

    response = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-JOINRECOVER",
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["display_name"] == "Ada Ebony"
    assert body["nickname"] == "Ada Ebony"

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        assert user.display_name == "Ada Ebony"

    status_response = client.get("/auth/approved-member/GMFN-U-JOINRECOVER")
    assert status_response.status_code == 200, status_response.text
    status_body = status_response.json()
    assert status_body["display_name"] == "Ada Ebony"
    assert status_body["nickname"] == "Ada Ebony"
