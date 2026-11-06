from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.core.security import verify_password
from app.db.database import SessionLocal
from app.db.models import (
    AccountActivationGrant,
    Clan,
    ClanInvite,
    ClanJoinRequest,
    ClanMembership,
    User,
)
from app.services.account_activation_service import issue_activation_grant


def _seed_pending_member(*, with_join_request: bool = False) -> tuple[str, str | None]:
    with SessionLocal() as db:
        owner = User(
            id=1,
            email="owner@example.com",
            hashed_password="owner-password",
            role="admin",
            gmfn_id="GMFN-U-OWNER0001",
        )
        applicant = User(
            id=2,
            email="applicant@pending.gmfn.local",
            hashed_password="PENDING_APPROVAL",
            role="user",
            gmfn_id="GMFN-U-APPLICANT1",
            phone_e164="+2348000000002",
        )
        clan = Clan(
            id=1,
            name="Security Test Circle",
            community_code="GMFN-C-000001",
            invite_code="security-invite",
            status="active",
        )
        db.add_all([owner, applicant, clan])
        db.flush()
        db.add_all(
            [
                ClanMembership(clan_id=1, user_id=1, role="admin"),
                ClanMembership(clan_id=1, user_id=2, role="user"),
            ]
        )
        join_request_id = None
        if with_join_request:
            join_request = ClanJoinRequest(
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="approved",
                created_at=datetime.now(timezone.utc),
            )
            db.add(join_request)
            db.flush()
            join_request_id = int(join_request.id)
        issued = issue_activation_grant(
            db,
            user_id=2,
            source_type="join_request" if join_request_id else "entry_create",
            join_request_id=join_request_id,
            authorize_activation=True,
        )
        db.commit()
        return issued.activation_token, issued.status_token


def test_identifier_only_activation_is_rejected(client: TestClient):
    _seed_pending_member()
    payload = {
        "gmfn_id": "GMFN-U-APPLICANT1",
        "password": "secret123",
        "confirm_password": "secret123",
    }

    assert client.post("/auth/activate-membership", json=payload).status_code == 422
    assert client.post("/auth/activate-approved-member", json=payload).status_code == 422


def test_one_activation_wins_across_all_account_grants(client: TestClient, monkeypatch):
    monkeypatch.setenv("GMFN_DEV_MODE", "1")
    first_token, _ = _seed_pending_member()
    with SessionLocal() as db:
        second = issue_activation_grant(
            db,
            user_id=2,
            source_type="entry_create",
            authorize_activation=True,
        )
        second_token = second.activation_token
        db.commit()

    first = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-APPLICANT1",
            "activation_token": first_token,
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    replay = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-APPLICANT1",
            "activation_token": second_token,
            "password": "attacker-password",
            "confirm_password": "attacker-password",
        },
    )

    assert first.status_code == 200, first.text
    assert replay.status_code == 403, replay.text
    with SessionLocal() as db:
        user = db.get(User, 2)
        grants = db.query(AccountActivationGrant).filter_by(user_id=2).all()
        assert user is not None
        assert verify_password("secret123", user.hashed_password)
        assert not verify_password("attacker-password", user.hashed_password)
        assert sum(row.consumed_at is not None for row in grants) == 1
        assert sum(row.revoked_at is not None for row in grants) == 1


def test_join_status_requires_separate_read_only_credential(client: TestClient):
    _activation_token, status_token = _seed_pending_member(with_join_request=True)

    anonymous = client.get("/clans/join-requests/1/status")
    query_only = client.get(
        "/clans/join-requests/1/status",
        params={"status_token": status_token},
    )
    protected = client.get(
        "/clans/join-requests/1/status",
        headers={"X-Join-Status-Token": status_token},
    )

    assert anonymous.status_code == 404
    assert query_only.status_code == 404
    assert protected.status_code == 200, protected.text
    assert protected.json()["status"] == "approved"
    assert "activation_token" not in protected.json()


def test_activation_token_is_bound_to_account_and_request(client: TestClient):
    activation_token, _status_token = _seed_pending_member(with_join_request=True)

    wrong_account = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-OWNER0001",
            "request_id": "1",
            "activation_token": activation_token,
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    wrong_request = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-APPLICANT1",
            "request_id": "999",
            "activation_token": activation_token,
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )

    assert wrong_account.status_code == 404
    assert wrong_request.status_code == 404
    with SessionLocal() as db:
        user = db.get(User, 2)
        grant = db.query(AccountActivationGrant).filter_by(user_id=2).one()
        assert user is not None
        assert user.hashed_password == "PENDING_APPROVAL"
        assert grant.consumed_at is None
        assert grant.revoked_at is None


def test_expired_activation_token_cannot_change_password(client: TestClient):
    activation_token, _status_token = _seed_pending_member()
    with SessionLocal() as db:
        grant = db.query(AccountActivationGrant).filter_by(user_id=2).one()
        grant.activation_expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()

    response = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-APPLICANT1",
            "activation_token": activation_token,
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )

    assert response.status_code == 403, response.text
    assert response.json()["detail"]["code"] == "activation_proof_invalid"
    with SessionLocal() as db:
        user = db.get(User, 2)
        assert user is not None
        assert user.hashed_password == "PENDING_APPROVAL"


def test_public_phone_status_lookup_is_retired(client: TestClient):
    response = client.get(
        "/clans/join-invite/request-status",
        params={"code": "security-invite", "phone_e164": "+2348000000002"},
    )

    assert response.status_code == 410
    assert response.json()["detail"]["code"] == "public_join_status_lookup_retired"


def test_anonymous_existing_identity_claim_is_rejected(client: TestClient):
    with SessionLocal() as db:
        owner = User(id=1, email="owner@example.com", hashed_password="owner-password", role="admin", gmfn_id="GMFN-U-OWNER0001")
        existing = User(id=2, email="existing@example.com", hashed_password="active-password", role="user", gmfn_id="GMFN-U-EXISTING1")
        clan = Clan(id=1, name="Security Test Circle", community_code="GMFN-C-000001", invite_code="security-invite", status="active")
        db.add_all([owner, existing, clan])
        db.flush()
        db.add(ClanMembership(clan_id=1, user_id=1, role="admin"))
        db.commit()

    response = client.post(
        "/clans/join-requests",
        json={"invite_code": "security-invite", "existing_gmfn_id": "GMFN-U-EXISTING1"},
    )

    assert response.status_code == 401, response.text
    assert response.json()["detail"]["code"] == "existing_gsn_sign_in_required"
    with SessionLocal() as db:
        assert db.query(ClanJoinRequest).count() == 0


def test_duplicate_submission_does_not_return_protected_continuation(client: TestClient):
    with SessionLocal() as db:
        owner = User(id=1, email="owner@example.com", hashed_password="owner-password", role="admin", gmfn_id="GMFN-U-OWNER0001")
        clan = Clan(id=1, name="Security Test Circle", community_code="GMFN-C-000001", invite_code="security-invite", status="active")
        invite = ClanInvite(
            id=1,
            clan_id=1,
            code="secure-code",
            created_by_user_id=1,
            is_active=True,
            max_uses=10,
            uses=0,
            created_at=datetime.now(timezone.utc),
        )
        db.add_all([owner, clan, invite])
        db.flush()
        db.add(ClanMembership(clan_id=1, user_id=1, role="admin"))
        db.commit()

    payload = {
        "invite_code": "secure-code",
        "first_name": "Ada",
        "surname": "Secure",
        "phone_e164": "+2348000000009",
        "country": "Nigeria",
    }
    first = client.post("/clans/join-requests", json=payload)
    duplicate = client.post("/clans/join-requests", json=payload)

    assert first.status_code == 201, first.text
    assert first.json()["status_token"]
    assert first.json()["activation_token"]
    assert duplicate.status_code == 409, duplicate.text
    detail = duplicate.json()["detail"]
    assert detail["protected_continuation_required"] is True
    assert "request_id" not in detail
    assert "status_token" not in detail
    assert "activation_token" not in detail
