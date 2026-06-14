from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from app.api.routes import clans as clans_route
from app.core import auth
from app.core import clan_auth
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db.models import Clan, ClanInvite, ClanJoinRequest, ClanMembership, TrustEvent, User
from app.db.notification_models import Notification
from app.main import app


def _seed_join_context(*, invite_code: str = "legacy-code") -> None:
    with SessionLocal() as db:
        admin = User(id=1, email="admin@example.com", hashed_password="hashed", role="admin")
        clan = Clan(
            id=1,
            name="Aberdeen City ICA",
            marketplace_name="Aberdeen city marketplace",
            invite_code=invite_code,
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        db.add(admin)
        db.add(clan)
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()


def _join_payload(invite_code: str) -> dict[str, str]:
    return {
        "invite_code": invite_code,
        "first_name": "Arinze",
        "surname": "Nnamani",
        "phone_e164": "+2349071733533",
        "country": "Nigeria",
        "business_name": "Business",
        "note": "With God all things are possible",
    }


def test_public_join_request_accepts_clan_invite_record_code(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["community_name"] == "Aberdeen City ICA"
    assert data["request"]["invite_id"] == 1
    assert data["lineage"]["invite_id"] == 1
    assert data["lineage"]["invited_by_user_id"] == 1

    with SessionLocal() as db:
        invite = db.get(ClanInvite, 1)
        join_request = db.query(ClanJoinRequest).first()
        assert invite is not None
        assert invite.uses == 1
        assert join_request is not None
        assert join_request.invite_id == 1


def test_public_join_invite_preview_reports_ready_invite(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.get("/clans/join-invite/preview?code=package-code")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is True
    assert data["status"] == "ready"
    assert data["community_name"] == "Aberdeen City ICA"
    assert data["invite_id"] == 1


def test_public_join_invite_preview_reports_invalid_invite_without_throwing(client):
    _seed_join_context()

    res = client.get("/clans/join-invite/preview?code=missing-code")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is False
    assert data["status"] == "not_found"
    assert "fresh GSN invite link" in data["message"]


def test_public_join_invite_preview_accepts_legacy_clan_invite_code_when_no_live_share_link_exists(client):
    _seed_join_context(invite_code="legacy-code")

    res = client.get("/clans/join-invite/preview?code=legacy-code")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is True
    assert data["status"] == "ready"
    assert data["invite_code"] == "legacy-code"
    assert data["community_name"] == "Aberdeen City ICA"


def test_public_join_invite_preview_recovers_latest_live_invite_from_legacy_clan_invite_code(client):
    _seed_join_context(invite_code="legacy-code")

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="latest-live-code",
                is_active=True,
                max_uses=100,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.get("/clans/join-invite/preview?code=legacy-code")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is True
    assert data["status"] == "ready"
    assert data["invite_code"] == "latest-live-code"
    assert "latest live invitation" in data["message"].lower()


def test_public_join_invite_preview_recovers_latest_invite_from_community_code(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="latest-live-code",
                is_active=True,
                max_uses=100,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.get(
        "/clans/join-invite/preview?code=missing-code&community_code=GMFN-C-000001"
    )

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is True
    assert data["status"] == "ready"
    assert data["invite_code"] == "latest-live-code"
    assert "latest live invitation" in data["message"].lower()


def test_public_join_invite_preview_recovers_from_retired_invite_code(client):
    _seed_join_context()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="old-retired-code",
                is_active=False,
                revoked_at=now - timedelta(minutes=5),
                max_uses=100,
                uses=0,
                created_at=now - timedelta(minutes=10),
                expires_at=now + timedelta(days=7),
            )
        )
        db.add(
            ClanInvite(
                id=2,
                clan_id=1,
                created_by_user_id=1,
                code="latest-live-code",
                is_active=True,
                max_uses=100,
                uses=0,
                created_at=now,
                expires_at=now + timedelta(days=7),
            )
        )
        db.commit()

    res = client.get(
        "/clans/join-invite/preview?code=old-retired-code&community_code=GMFN-C-000001"
    )

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is True
    assert data["status"] == "ready"
    assert data["invite_code"] == "latest-live-code"
    assert "newer live invitation" in data["message"].lower()


def test_shareable_join_invite_max_uses_defaults_to_reusable_value():
    clan = Clan(id=1, invite_max_uses=None)

    assert clans_route._shareable_join_invite_max_uses(clan, None) == 100


def test_shareable_join_invite_max_uses_respects_requested_value():
    clan = Clan(id=1, invite_max_uses=None)

    assert clans_route._shareable_join_invite_max_uses(clan, 5) == 5


def test_public_join_request_accepts_short_lived_invite_during_daily_pilot_window(client):
    _seed_join_context()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="short-lived-package",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=now - timedelta(hours=2),
                expires_at=now - timedelta(hours=1),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("short-lived-package"))

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["request"]["invite_id"] == 1


def test_public_join_request_notifies_all_active_reviewers_not_only_admins(client):
    _seed_join_context()

    with SessionLocal() as db:
        reviewer = User(
            id=3,
            email="reviewer@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add(reviewer)
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=3,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert res.status_code == 201, res.text

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind == "approval_request")
            .order_by(Notification.user_id.asc(), Notification.id.asc())
            .all()
        )

        assert [int(row.user_id) for row in notifications] == [1, 3]
        assert all(
            row.action_url == "/app/community/1/join-requests?request_id=1&community_code=GMFN-C-000001"
            for row in notifications
        )
        assert all("GMFN-C-000001" in row.message for row in notifications)


def test_public_join_request_counts_only_activated_members_for_threshold_and_notifications(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        pending_placeholder = User(
            id=2,
            email="447903165266@pending.gmfn.local",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        active_reviewer = User(
            id=3,
            email="reviewer@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add_all([pending_placeholder, active_reviewer])
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=2,
                    clan_id=1,
                    user_id=2,
                    role="user",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=3,
                    clan_id=1,
                    user_id=3,
                    role="user",
                    personal_pool_balance=0,
                ),
                ClanInvite(
                    id=1,
                    clan_id=1,
                    created_by_user_id=1,
                    code="package-code",
                    is_active=True,
                    max_uses=3,
                    uses=0,
                    created_at=datetime.now(timezone.utc),
                    expires_at=datetime.now(timezone.utc) + timedelta(days=7),
                ),
            ]
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["request"]["active_member_count"] == 2
    assert data["request"]["required_approvals"] == 1

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind == "approval_request")
            .order_by(Notification.user_id.asc(), Notification.id.asc())
            .all()
        )

        assert [int(row.user_id) for row in notifications] == [1, 3]


def test_notifications_endpoint_backfills_missing_join_review_notice_for_late_reviewer(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))
    assert res.status_code == 201, res.text

    with SessionLocal() as db:
        reviewer = User(
            id=3,
            email="reviewer@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add(reviewer)
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=3,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.commit()

    def fake_current_user():
        return SimpleNamespace(
            id=3,
            email="reviewer@example.com",
            role="user",
            hashed_password="hashed",
        )

    app.dependency_overrides[auth.get_current_user] = fake_current_user
    try:
        first = client.get("/notifications/me")
        assert first.status_code == 200, first.text
        second = client.get("/notifications/me")
        assert second.status_code == 200, second.text
    finally:
        app.dependency_overrides.pop(auth.get_current_user, None)

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(
                Notification.user_id == 3,
                Notification.kind == "approval_request",
            )
            .order_by(Notification.id.asc())
            .all()
        )

        assert len(notifications) == 1
        assert notifications[0].action_url == (
            "/app/community/1/join-requests?request_id=1&community_code=GMFN-C-000001"
        )


def test_notifications_endpoint_retires_join_review_notice_after_request_is_done(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="pending@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add(applicant)
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="approved",
                created_at=datetime.now(timezone.utc),
                decided_at=datetime.now(timezone.utc),
            )
        )
        db.add(
            Notification(
                id=1,
                user_id=1,
                kind="approval_request",
                title="New join request",
                message="Donatus wants to join Aberdeen City ICA (GMFN-C-000001).",
                action_url="/app/community/1/join-requests?request_id=1&community_code=GMFN-C-000001",
                action_label="Review",
                is_read=False,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    def fake_current_user():
        return SimpleNamespace(
            id=1,
            email="admin@example.com",
            role="admin",
            hashed_password="hashed",
        )

    app.dependency_overrides[auth.get_current_user] = fake_current_user
    try:
        res = client.get("/notifications/me")
        assert res.status_code == 200, res.text
        item = res.json()["items"][0]
        assert item["id"] == 1
        assert item["is_read"] is True
        assert item["join_request_id"] == 1
        assert item["join_request_status"] == "approved"
        assert item["join_request_resolved"] is True

        unread = client.get("/notifications/me?unread_only=true")
        assert unread.status_code == 200, unread.text
        assert unread.json()["items"] == []
    finally:
        app.dependency_overrides.pop(auth.get_current_user, None)

    with SessionLocal() as db:
        notification = db.get(Notification, 1)
        assert notification is not None
        assert notification.is_read is True
        assert notification.read_at is not None


def test_public_join_request_creates_pending_activation_identity(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert res.status_code == 201, res.text

    with SessionLocal() as db:
        applicant = (
            db.query(User)
            .filter(User.email == "2349071733533@pending.gmfn.local")
            .first()
        )
        assert applicant is not None
        assert applicant.hashed_password == "PENDING_APPROVAL"


def test_public_join_request_existing_phone_requires_login_instead_of_duplicate(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            User(
                id=2,
                email="existing-phone@example.com",
                phone_e164="+2349071733533",
                gmfn_id="GMFN-U-PHONEEXISTS",
                hashed_password="hashed",
                role="user",
            )
        )
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert res.status_code == 409, res.text
    detail = res.json()["detail"]
    assert detail["code"] == "existing_account_login_required"
    assert detail["gmfn_id"] == "GMFN-U-PHONEEXISTS"
    assert detail["login_path"] == "/login"

    with SessionLocal() as db:
        assert db.query(User).count() == 2
        assert (
            db.query(User)
            .filter(User.email == "2349071733533@pending.gmfn.local")
            .first()
            is None
        )
        assert db.query(ClanJoinRequest).count() == 0


def test_logged_in_existing_member_join_request_reuses_global_identity(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        existing_user = User(
            id=2,
            email="owner-a@example.com",
            phone_e164="+2348000000002",
            gmfn_id="GMFN-U-OWNERA",
            hashed_password="hashed",
            role="user",
        )
        own_clan = Clan(
            id=2,
            name="Owner A Community",
            marketplace_name="Owner A Marketplace",
            invite_code="owner-a-code",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        db.add_all([existing_user, own_clan])
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=2,
                user_id=2,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    token = create_access_token({"sub": "owner-a@example.com"})
    res = client.post(
        "/clans/join-requests",
        json={"invite_code": "package-code"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["existing_identity"] is True
    assert data["identity_reused"] is True
    assert data["user_id"] == 2
    assert data["gmfn_id"] == "GMFN-U-OWNERA"
    assert data["request"]["applicant_user_id"] == 2
    assert data["request"]["applicant_gmfn_id"] == "GMFN-U-OWNERA"

    with SessionLocal() as db:
        assert db.query(User).count() == 2
        assert (
            db.query(User)
            .filter(User.email == "2348000000002@pending.gmfn.local")
            .first()
            is None
        )
        request = db.query(ClanJoinRequest).first()
        invite = db.get(ClanInvite, 1)
        assert request is not None
        assert request.applicant_user_id == 2
        assert invite is not None
        assert invite.uses == 1


def test_logged_in_existing_member_repeated_join_request_is_idempotent(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            User(
                id=2,
                email="existing@example.com",
                phone_e164="+2348000000003",
                gmfn_id="GMFN-U-EXISTING",
                hashed_password="hashed",
                role="user",
            )
        )
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    token = create_access_token({"sub": "existing@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post("/clans/join-requests", json={"invite_code": "package-code"}, headers=headers)
    assert first.status_code == 201, first.text

    second = client.post("/clans/join-requests", json={"invite_code": "package-code"}, headers=headers)
    assert second.status_code == 409, second.text
    detail = second.json()["detail"]
    assert detail["code"] == "pending_request_exists"
    assert detail["request_id"] == first.json()["request"]["id"]
    assert detail["gmfn_id"] == "GMFN-U-EXISTING"
    assert detail["existing_identity"] is True
    assert detail["identity_reused"] is True

    with SessionLocal() as db:
        assert db.query(ClanJoinRequest).count() == 1
        invite = db.get(ClanInvite, 1)
        assert invite is not None
        assert invite.uses == 1


def test_database_rejects_duplicate_pending_join_request_for_same_user_and_clan(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            User(
                id=2,
                email="pending-db-guard@example.com",
                phone_e164="+2348000000010",
                gmfn_id="GMFN-U-PENDING-GUARD",
                hashed_password="hashed",
                role="user",
            )
        )
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        db.add(
            ClanJoinRequest(
                id=2,
                clan_id=1,
                applicant_user_id=2,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()


def test_logged_in_existing_member_invite_returns_already_member_without_duplicate(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            User(
                id=2,
                email="member@example.com",
                phone_e164="+2348000000004",
                gmfn_id="GMFN-U-MEMBER",
                hashed_password="hashed",
                role="user",
            )
        )
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    token = create_access_token({"sub": "member@example.com"})
    res = client.post(
        "/clans/join-requests",
        json={"invite_code": "package-code"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["result_status"] == "already_member"
    assert data["gmfn_id"] == "GMFN-U-MEMBER"
    assert data["membership"]["user_id"] == 2

    with SessionLocal() as db:
        assert db.query(ClanJoinRequest).count() == 0
        invite = db.get(ClanInvite, 1)
        assert invite is not None
        assert invite.uses == 0


def test_select_community_requires_existing_membership(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            User(
                id=2,
                email="outsider@example.com",
                phone_e164="+2348000000006",
                gmfn_id="GMFN-U-OUTSIDER",
                hashed_password="hashed",
                role="user",
            )
        )
        db.commit()

    token = create_access_token({"sub": "outsider@example.com"})
    res = client.post(
        "/clans/1/select",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 403, res.text
    assert "Join or be approved" in res.json()["detail"]

    with SessionLocal() as db:
        membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 1, ClanMembership.user_id == 2)
            .first()
        )
        assert membership is None


def test_existing_member_can_switch_active_community_without_identity_change(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        user = User(
            id=2,
            email="multi@example.com",
            phone_e164="+2348000000007",
            gmfn_id="GMFN-U-MULTI",
            hashed_password="hashed",
            role="user",
        )
        second_clan = Clan(
            id=2,
            name="Second Community",
            marketplace_name="Second Marketplace",
            invite_code="second-code",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        db.add_all([user, second_clan])
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=2,
                    clan_id=1,
                    user_id=2,
                    role="user",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=3,
                    clan_id=2,
                    user_id=2,
                    role="admin",
                    personal_pool_balance=0,
                ),
            ]
        )
        db.commit()

    token = create_access_token({"sub": "multi@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    switch_res = client.post(
        "/community/active",
        json={"clan_id": 2},
        headers=headers,
    )
    assert switch_res.status_code == 200, switch_res.text
    switch_body = switch_res.json()
    assert switch_body["active_clan_id"] == 2
    assert switch_body["membership_role"] == "admin"

    active_res = client.get("/community/active", headers=headers)
    assert active_res.status_code == 200, active_res.text
    active_body = active_res.json()
    assert active_body["active_clan_id"] == 2
    assert active_body["membership_role"] == "admin"

    clans_res = client.get("/clans/me", headers=headers)
    assert clans_res.status_code == 200, clans_res.text
    clan_ids = {int(row["id"]) for row in clans_res.json()["items"]}
    assert clan_ids == {1, 2}

    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200, me_res.text
    assert me_res.json()["gmfn_id"] == "GMFN-U-MULTI"

    with SessionLocal() as db:
        assert db.get(User, 2).gmfn_id == "GMFN-U-MULTI"


def test_existing_member_creates_second_community_without_new_identity(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        existing_user = User(
            id=2,
            email="community-builder@example.com",
            phone_e164="+2348000000011",
            gmfn_id="GMFN-U-BUILDER",
            hashed_password="hashed",
            role="user",
        )
        db.add(existing_user)
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.commit()

    token = create_access_token({"sub": "community-builder@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/clans/",
        json={
            "name": "Builder Second Community",
            "description": "Second community owned by an existing member",
        },
        headers=headers,
    )
    assert create_res.status_code == 201, create_res.text
    new_clan = create_res.json()
    assert new_clan["name"] == "Builder Second Community"
    new_clan_id = int(new_clan["id"])

    clans_res = client.get("/clans/me", headers=headers)
    assert clans_res.status_code == 200, clans_res.text
    clan_ids = {int(row["id"]) for row in clans_res.json()["items"]}
    assert clan_ids == {1, new_clan_id}

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == 2).count() == 1
        assert db.get(User, 2).gmfn_id == "GMFN-U-BUILDER"
        memberships = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == 2)
            .order_by(ClanMembership.clan_id.asc())
            .all()
        )
        assert [int(row.clan_id) for row in memberships] == [1, new_clan_id]
        assert [row.role for row in memberships] == ["user", "admin"]


def test_direct_clan_join_reuses_existing_identity_and_is_idempotent(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        existing_user = User(
            id=2,
            email="direct-clan-existing@example.com",
            phone_e164="+2348000000009",
            gmfn_id="GMFN-U-DIRECT-CLAN",
            hashed_password="hashed",
            role="user",
        )
        own_clan = Clan(
            id=2,
            name="Direct Clan Owner",
            marketplace_name="Direct Clan Owner Marketplace",
            invite_code="direct-clan-owner-code",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        db.add_all([existing_user, own_clan])
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=2,
                user_id=2,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()

    token = create_access_token({"sub": "direct-clan-existing@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post("/clans/1/join", headers=headers)
    assert first.status_code == 201, first.text
    first_body = first.json()
    assert first_body["result_status"] == "joined_successfully"
    assert first_body["user_id"] == 2
    assert first_body["gmfn_id"] == "GMFN-U-DIRECT-CLAN"
    assert first_body["identity_reused"] is True
    assert first_body["membership"]["role"] == "user"

    second = client.post("/clans/1/join", headers=headers)
    assert second.status_code == 200, second.text
    second_body = second.json()
    assert second_body["result_status"] == "already_member"
    assert second_body["user_id"] == 2
    assert second_body["gmfn_id"] == "GMFN-U-DIRECT-CLAN"
    assert second_body["membership"]["role"] == "user"

    with SessionLocal() as db:
        assert db.query(User).filter(User.id == 2).count() == 1
        memberships = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == 2)
            .order_by(ClanMembership.clan_id.asc())
            .all()
        )
        assert [int(row.clan_id) for row in memberships] == [1, 2]
        assert [row.role for row in memberships] == ["user", "admin"]
        assert db.get(User, 2).gmfn_id == "GMFN-U-DIRECT-CLAN"


def test_two_community_owners_can_mutually_join_without_duplicate_identity(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        owner_a = User(
            id=2,
            email="mutual-owner-a@example.com",
            phone_e164="+2348000000012",
            gmfn_id="GMFN-U-MUTUAL-A",
            hashed_password="hashed",
            role="user",
        )
        owner_b = User(
            id=3,
            email="mutual-owner-b@example.com",
            phone_e164="+2348000000013",
            gmfn_id="GMFN-U-MUTUAL-B",
            hashed_password="hashed",
            role="user",
        )
        community_a = Clan(
            id=2,
            name="Mutual Community A",
            marketplace_name="Mutual Marketplace A",
            invite_code="mutual-a-legacy",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        community_b = Clan(
            id=3,
            name="Mutual Community B",
            marketplace_name="Mutual Marketplace B",
            invite_code="mutual-b-legacy",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        invite_a = ClanInvite(
            id=1,
            clan_id=2,
            created_by_user_id=2,
            code="mutual-a-invite",
            is_active=True,
            max_uses=3,
            uses=0,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        invite_b = ClanInvite(
            id=2,
            clan_id=3,
            created_by_user_id=3,
            code="mutual-b-invite",
            is_active=True,
            max_uses=3,
            uses=0,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add_all([owner_a, owner_b, community_a, community_b, invite_a, invite_b])
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=2,
                    clan_id=2,
                    user_id=2,
                    role="admin",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=3,
                    clan_id=3,
                    user_id=3,
                    role="admin",
                    personal_pool_balance=0,
                ),
            ]
        )
        db.commit()

    token_a = create_access_token({"sub": "mutual-owner-a@example.com"})
    token_b = create_access_token({"sub": "mutual-owner-b@example.com"})

    a_joins_b = client.post(
        "/community/join-by-invite",
        json={"invite_code": "mutual-b-invite"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert a_joins_b.status_code == 200, a_joins_b.text
    assert a_joins_b.json()["joined_user_id"] == 2
    assert a_joins_b.json()["gmfn_id"] == "GMFN-U-MUTUAL-A"
    assert a_joins_b.json()["result_status"] == "joined_successfully"

    b_joins_a = client.post(
        "/community/join-by-invite",
        json={"invite_code": "mutual-a-invite"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert b_joins_a.status_code == 200, b_joins_a.text
    assert b_joins_a.json()["joined_user_id"] == 3
    assert b_joins_a.json()["gmfn_id"] == "GMFN-U-MUTUAL-B"
    assert b_joins_a.json()["result_status"] == "joined_successfully"

    with SessionLocal() as db:
        assert db.query(User).filter(User.id.in_([2, 3])).count() == 2
        assert db.get(User, 2).gmfn_id == "GMFN-U-MUTUAL-A"
        assert db.get(User, 3).gmfn_id == "GMFN-U-MUTUAL-B"

        memberships_a = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == 2)
            .order_by(ClanMembership.clan_id.asc())
            .all()
        )
        memberships_b = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == 3)
            .order_by(ClanMembership.clan_id.asc())
            .all()
        )

        assert [(int(row.clan_id), row.role) for row in memberships_a] == [
            (2, "admin"),
            (3, "user"),
        ]
        assert [(int(row.clan_id), row.role) for row in memberships_b] == [
            (2, "user"),
            (3, "admin"),
        ]


def test_direct_invite_join_sets_active_context_and_reuses_identity(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        existing_user = User(
            id=2,
            email="direct-existing@example.com",
            phone_e164="+2348000000008",
            gmfn_id="GMFN-U-DIRECT",
            hashed_password="hashed",
            role="user",
        )
        own_clan = Clan(
            id=2,
            name="Direct Existing Owner",
            marketplace_name="Direct Owner Marketplace",
            invite_code="direct-owner-code",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        invite = ClanInvite(
            id=1,
            clan_id=1,
            created_by_user_id=1,
            code="direct-package-code",
            is_active=True,
            max_uses=3,
            uses=0,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add_all([existing_user, own_clan, invite])
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=2,
                user_id=2,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()

    token = create_access_token({"sub": "direct-existing@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    join_res = client.post(
        "/community/join-by-invite",
        json={"invite_code": "direct-package-code"},
        headers=headers,
    )
    assert join_res.status_code == 200, join_res.text
    join_body = join_res.json()
    assert join_body["joined_user_id"] == 2
    assert join_body["gmfn_id"] == "GMFN-U-DIRECT"
    assert join_body["result_status"] == "joined_successfully"
    assert join_body["identity_reused"] is True

    active_res = client.get("/community/active", headers=headers)
    assert active_res.status_code == 200, active_res.text
    assert active_res.json()["active_clan_id"] == 1

    with SessionLocal() as db:
        assert db.query(User).count() == 2
        memberships = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == 2)
            .order_by(ClanMembership.clan_id.asc())
            .all()
        )
        assert [int(row.clan_id) for row in memberships] == [1, 2]
        assert [row.role for row in memberships] == ["user", "admin"]
        assert db.get(User, 2).gmfn_id == "GMFN-U-DIRECT"


def test_direct_invite_join_issues_one_missing_global_id_for_same_existing_user(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        existing_user = User(
            id=2,
            email="legacy-direct-existing@example.com",
            phone_e164="+2348000000018",
            gmfn_id=None,
            hashed_password="hashed",
            role="user",
        )
        own_clan = Clan(
            id=2,
            name="Legacy Direct Existing Owner",
            marketplace_name="Legacy Direct Marketplace",
            invite_code="legacy-direct-owner-code",
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        invite = ClanInvite(
            id=1,
            clan_id=1,
            created_by_user_id=1,
            code="legacy-direct-package-code",
            is_active=True,
            max_uses=3,
            uses=0,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add_all([existing_user, own_clan, invite])
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=2,
                user_id=2,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()

    token = create_access_token({"sub": "legacy-direct-existing@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    join_res = client.post(
        "/community/join-by-invite",
        json={"invite_code": "legacy-direct-package-code"},
        headers=headers,
    )
    assert join_res.status_code == 200, join_res.text
    join_body = join_res.json()
    assert join_body["joined_user_id"] == 2
    assert join_body["gmfn_id"].startswith("GMFN-U-")
    assert join_body["result_status"] == "joined_successfully"
    assert join_body["identity_reused"] is True

    with SessionLocal() as db:
        user = db.get(User, 2)
        assert db.query(User).count() == 2
        assert user.gmfn_id == join_body["gmfn_id"]
        memberships = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == 2)
            .order_by(ClanMembership.clan_id.asc())
            .all()
        )
        assert [int(row.clan_id) for row in memberships] == [1, 2]
        assert [row.role for row in memberships] == ["user", "admin"]


def test_legacy_invites_join_issues_one_missing_global_id_for_same_existing_user(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        existing_user = User(
            id=2,
            email="legacy-invites-existing@example.com",
            phone_e164="+2348000000019",
            gmfn_id=None,
            hashed_password="hashed",
            role="user",
        )
        invite = ClanInvite(
            id=1,
            clan_id=1,
            created_by_user_id=1,
            code="legacy-invites-package-code",
            is_active=True,
            max_uses=3,
            uses=0,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
        db.add_all([existing_user, invite])
        db.commit()

    token = create_access_token({"sub": "legacy-invites-existing@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    join_res = client.post(
        "/invites/join",
        json={"code": "legacy-invites-package-code"},
        headers=headers,
    )
    assert join_res.status_code == 200, join_res.text
    join_body = join_res.json()
    assert join_body["user_id"] == 2
    assert join_body["gmfn_id"].startswith("GMFN-U-")
    assert join_body["result_status"] == "joined_successfully"
    assert join_body["identity_reused"] is True

    second_res = client.post(
        "/invites/join",
        json={"code": "legacy-invites-package-code"},
        headers=headers,
    )
    assert second_res.status_code == 200, second_res.text
    assert second_res.json()["result_status"] == "already_member"
    assert second_res.json()["gmfn_id"] == join_body["gmfn_id"]

    with SessionLocal() as db:
        user = db.get(User, 2)
        assert db.query(User).count() == 2
        assert user.gmfn_id == join_body["gmfn_id"]
        memberships = db.query(ClanMembership).filter(ClanMembership.user_id == 2).all()
        assert len(memberships) == 1
        assert int(memberships[0].clan_id) == 1
        assert memberships[0].role == "user"


def test_pending_activation_member_cannot_vote_on_join_request(
    client,
    override_current_user,
):
    _seed_join_context()

    with SessionLocal() as db:
        pending_reviewer = User(
            id=2,
            email="447903165266@pending.gmfn.local",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        applicant = User(
            id=3,
            email="pending@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add_all([pending_reviewer, applicant])
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=3,
                invited_by_user_id=1,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    from app.core import auth as auth_core

    def fake_current_user():
        return SimpleNamespace(id=2, email="447903165266@pending.gmfn.local", role="user")

    app.dependency_overrides[auth_core.get_current_user] = fake_current_user
    try:
        res = client.post(
            "/clans/1/join-requests/1/vote",
            json={
                "vote": "approve",
                "reason_code": "know_directly",
                "reason_text": "I know this person directly.",
            },
            headers={"X-Clan-Id": "1"},
        )
    finally:
        app.dependency_overrides.pop(auth_core.get_current_user, None)

    assert res.status_code == 403, res.text
    assert res.json()["detail"] == "Only activated community members can vote"


def test_public_join_request_returns_pending_request_lineage_when_duplicate(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    first = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert first.status_code == 201, first.text
    created = first.json()

    duplicate = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert duplicate.status_code == 409, duplicate.text
    payload = duplicate.json()
    detail = payload.get("detail") or {}

    assert detail["code"] == "pending_request_exists"
    assert detail["request_id"] == created["request"]["id"]
    assert detail["status"] == "pending"
    assert detail["community_name"] == "Aberdeen City ICA"
    assert detail["marketplace_name"] == "Aberdeen city marketplace"
    assert detail["community_code"] == "GMFN-C-000001"
    assert detail["pending_status_path"].endswith(
        f"request_id={created['request']['id']}"
    )
    assert detail["approval_path"].endswith(f"/{created['request']['id']}")


def test_public_join_request_returns_approved_request_lineage_when_duplicate(client):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="2349071733533@pending.gmfn.local",
            phone_e164="+2349071733533",
            gmfn_id="GMFN-U-TEST0002",
            hashed_password="hashed",
            role="user",
        )
        db.add(applicant)
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invite_id=1,
                invited_by_user_id=1,
                status="approved",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    duplicate = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert duplicate.status_code == 409, duplicate.text
    payload = duplicate.json()
    detail = payload.get("detail") or {}

    assert detail["code"] == "approved_request_exists"
    assert detail["request_id"] == 1
    assert detail["status"] == "approved"
    assert detail["community_name"] == "Aberdeen City ICA"
    assert detail["marketplace_name"] == "Aberdeen city marketplace"
    assert detail["community_code"] == "GMFN-C-000001"
    assert detail["result_channel"] == "activation-ready"
    assert "activate-membership" in str(detail.get("result_path") or "")
    assert "activate-membership" in str(detail.get("activation_path") or "")
    assert detail["activation_delivery_status"] == "opened"
    assert detail["activation_delivered_at"] is not None


def test_public_join_request_returns_rejected_request_lineage_when_duplicate(client):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="2349071733533@pending.gmfn.local",
            phone_e164="+2349071733533",
            hashed_password="hashed",
            role="user",
        )
        db.add(applicant)
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invite_id=1,
                invited_by_user_id=1,
                status="rejected",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    duplicate = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert duplicate.status_code == 409, duplicate.text
    payload = duplicate.json()
    detail = payload.get("detail") or {}

    assert detail["code"] == "rejected_request_exists"
    assert detail["request_id"] == 1
    assert detail["status"] == "rejected"
    assert detail["community_name"] == "Aberdeen City ICA"
    assert detail["marketplace_name"] == "Aberdeen city marketplace"
    assert detail["community_code"] == "GMFN-C-000001"
    assert detail["result_channel"] == "request-rejected"
    assert detail["result_path"] == "/join-approval/1"
    assert detail["approval_path"] == "/join-approval/1"


def test_public_join_invite_request_status_finds_existing_request_by_phone(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    created = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert created.status_code == 201, created.text
    request_id = created.json()["request"]["id"]

    status = client.get(
        "/clans/join-invite/request-status"
        "?code=package-code&phone_e164=%2B2349071733533&community_code=GMFN-C-000001"
    )

    assert status.status_code == 200, status.text
    data = status.json()
    assert data["ok"] is True
    assert data["found"] is True
    assert data["request_id"] == request_id
    assert data["status"] == "pending"
    assert data["community_code"] == "GMFN-C-000001"
    assert data["community_name"] == "Aberdeen City ICA"
    assert data["marketplace_name"] == "Aberdeen city marketplace"
    assert data["result_channel"] == "pending-review"
    assert data["result_path"].endswith(f"request_id={request_id}")


def test_public_join_invite_request_status_returns_activation_lineage_when_approved(client):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="2349071733533@pending.gmfn.local",
            phone_e164="+2349071733533",
            gmfn_id="GMFN-U-TEST0001",
            hashed_password="hashed",
            role="user",
        )
        db.add(applicant)
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invite_id=1,
                invited_by_user_id=1,
                status="approved",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    status = client.get(
        "/clans/join-invite/request-status"
        "?code=package-code&phone_e164=%2B2349071733533&community_code=GMFN-C-000001"
    )

    assert status.status_code == 200, status.text
    data = status.json()
    assert data["ok"] is True
    assert data["found"] is True
    assert data["status"] == "approved"
    assert data["gmfn_id"] == "GMFN-U-TEST0001"
    assert data["result_channel"] == "activation-ready"
    assert "activate-membership" in str(data.get("result_path") or "")
    assert "activate-membership" in str(data.get("activation_path") or "")
    assert data["activation_delivery_status"] == "opened"
    assert data["activation_delivered_at"] is not None

    with SessionLocal() as db:
        refreshed = db.get(ClanJoinRequest, 1)
        assert refreshed is not None
        assert refreshed.activation_delivery_status == "opened"
        assert refreshed.activation_delivered_at is not None


def test_direct_join_request_status_marks_activation_opened_when_approved(client):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="approved@example.com",
            gmfn_id="GMFN-U-APPROVED1",
            hashed_password="hashed",
            role="user",
        )
        db.add(applicant)
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="approved",
                activation_delivery_status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    res = client.get("/clans/join-requests/1/status")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "approved"
    assert data["activation_delivery_status"] == "opened"
    assert data["activation_delivered_at"] is not None

    with SessionLocal() as db:
        refreshed = db.get(ClanJoinRequest, 1)
        assert refreshed is not None
        assert refreshed.activation_delivery_status == "opened"
        assert refreshed.activation_delivered_at is not None


def test_join_request_status_reports_live_review_counts_and_activated_reviewers(client):
    _seed_join_context()

    with SessionLocal() as db:
        pending_applicant = User(
            id=2,
            email="pending@example.com",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        active_reviewer = User(
            id=3,
            email="reviewer@example.com",
            gmfn_id="GMFN-U-REVIEW01",
            hashed_password="hashed",
            role="user",
        )
        pending_placeholder = User(
            id=4,
            email="placeholder@example.com",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        db.add_all([pending_applicant, active_reviewer, pending_placeholder])
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=2,
                    clan_id=1,
                    user_id=3,
                    role="user",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=3,
                    clan_id=1,
                    user_id=4,
                    role="user",
                    personal_pool_balance=0,
                ),
                ClanJoinRequest(
                    id=1,
                    clan_id=1,
                    applicant_user_id=2,
                    invited_by_user_id=1,
                    status="pending",
                    created_at=datetime.now(timezone.utc),
                ),
            ]
        )
        db.commit()

    res = client.get("/clans/join-requests/1/status")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "pending"
    assert data["active_member_count"] == 2
    assert data["required_approvals"] == 1
    assert data["approvals"] == 0
    assert data["rejects"] == 0
    assert isinstance(data["eligible_reviewers"], list)
    assert len(data["eligible_reviewers"]) == 2
    reviewer_ids = {str(item.get("gmfn_id") or "") for item in data["eligible_reviewers"]}
    reviewer_displays = {str(item.get("display") or "") for item in data["eligible_reviewers"]}
    assert "GMFN-U-REVIEW01" in reviewer_ids
    assert "admin@example.com" in reviewer_displays
    assert all(display.strip() for display in reviewer_displays)


def test_list_join_requests_reports_admin_reviewer_override_capability(
    client,
    override_clan_ctx_admin,
):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="pending@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add(applicant)
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    res = client.get("/clans/1/join-requests", headers={"X-Clan-Id": "1"})

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["reviewer_role"] == "admin"
    assert data["reviewer_can_pilot_approve"] is True
    assert len(data["items"]) == 1


def test_admin_can_pilot_approve_join_request_without_waiting_for_threshold(
    client,
    override_clan_ctx_admin,
    override_current_user,
):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="pending@example.com",
            hashed_password="hashed",
            role="user",
        )
        reviewer = User(
            id=3,
            email="reviewer@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add_all([applicant, reviewer])
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=3,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    res = client.post(
        "/clans/1/join-requests/1/pilot-approve",
        headers={"X-Clan-Id": "1"},
    )

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["pilot_override"] is True
    assert data["approved_now"] is True
    assert data["approval_result"]["status"] == "approved"
    assert data["approval_result"]["gmfn_id"].startswith("GMFN-U-")

    with SessionLocal() as db:
        req = db.get(ClanJoinRequest, 1)
        applicant = db.get(User, 2)
        votes = (
            db.query(clans_route.ClanJoinVote)
            .filter(clans_route.ClanJoinVote.join_request_id == 1)
            .all()
        )
        membership = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == 1,
                ClanMembership.user_id == 2,
                ClanMembership.left_at.is_(None),
            )
            .first()
        )

        assert req is not None
        assert req.status == "approved"
        assert applicant is not None
        assert applicant.gmfn_id is not None
        assert membership is not None
        assert len(votes) == 1
        assert votes[0].vote == "approve"

        approval_notice = (
            db.query(Notification)
            .filter(
                Notification.user_id == 2,
                Notification.kind == "approval_success",
            )
            .order_by(Notification.id.desc())
            .first()
        )

        assert approval_notice is not None
        assert approval_notice.action_url == f"/activate-membership?gmfn_id={applicant.gmfn_id}&request_id=1"


def test_approving_existing_member_join_request_does_not_create_activation(
    client,
    override_clan_ctx_admin,
    override_current_user,
):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="existing-approved@example.com",
            phone_e164="+2348000000005",
            gmfn_id="GMFN-U-APPROVED-EXISTING",
            hashed_password="hashed",
            role="user",
        )
        db.add(applicant)
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="pending",
                activation_delivery_status="not_required",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    res = client.post(
        "/clans/1/join-requests/1/pilot-approve",
        headers={"X-Clan-Id": "1"},
    )

    assert res.status_code == 200, res.text
    approval = res.json()["approval_result"]
    assert approval["status"] == "approved"
    assert approval["user_id"] == 2
    assert approval["gmfn_id"] == "GMFN-U-APPROVED-EXISTING"
    assert approval["existing_identity"] is True
    assert approval["identity_reused"] is True
    assert approval["activation_required"] is False
    assert approval["activation_link"] is None
    assert approval["activation_path"] is None
    assert approval["activation_delivery_status"] == "not_required"

    status_res = client.get("/clans/join-requests/1/status")
    assert status_res.status_code == 200, status_res.text
    status = status_res.json()
    assert status["status"] == "approved"
    assert status["result_channel"] == "approved-existing-member"
    assert status["next_step"] == "open-community"
    assert status["activation_required"] is False
    assert status["gmfn_id"] == "GMFN-U-APPROVED-EXISTING"

    with SessionLocal() as db:
        applicant = db.get(User, 2)
        request = db.get(ClanJoinRequest, 1)
        membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 1, ClanMembership.user_id == 2)
            .first()
        )
        assert applicant is not None
        assert applicant.gmfn_id == "GMFN-U-APPROVED-EXISTING"
        assert request is not None
        assert request.activation_delivery_status == "not_required"
        assert membership is not None


def test_activate_approved_member_accepts_request_id_path(
    client,
    override_clan_ctx_admin,
    override_current_user,
):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="pending@example.com",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        reviewer = User(
            id=3,
            email="reviewer@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add_all([applicant, reviewer])
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=3,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    approve_res = client.post(
        "/clans/1/join-requests/1/pilot-approve",
        headers={"X-Clan-Id": "1"},
    )
    assert approve_res.status_code == 200, approve_res.text

    activate_res = client.post(
        "/auth/activate-approved-member",
        json={
            "request_id": "1",
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text
    activate_body = activate_res.json()

    assert activate_body["ok"] is True
    assert activate_body["gmfn_id"].startswith("GMFN-U-")
    assert activate_body["access_token"]

    with SessionLocal() as db:
        applicant = db.get(User, 2)
        assert applicant is not None
        assert applicant.gmfn_id == activate_body["gmfn_id"]
        assert applicant.hashed_password != "PENDING_APPROVAL"


def test_activated_reviewer_reject_vote_reaches_rejected_state_and_notifies_applicant(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="silvia@example.com",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        db.add(applicant)
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    from app.core import auth as auth_core

    def fake_current_user():
        return SimpleNamespace(
            id=1,
            email="admin@example.com",
            role="admin",
            hashed_password="hashed",
        )

    app.dependency_overrides[auth_core.get_current_user] = fake_current_user
    try:
        res = client.post(
            "/clans/1/join-requests/1/vote",
            json={
                "vote": "reject",
                "reason_code": "community_concern",
                "reason_text": "I have a community concern.",
            },
            headers={"X-Clan-Id": "1"},
        )
    finally:
        app.dependency_overrides.pop(auth_core.get_current_user, None)

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["approved_now"] is False
    assert data["rejected_now"] is True
    assert data["rejection_result"]["status"] == "rejected"
    assert data["rejection_result"]["approval_path"] == "/join-approval/1"

    with SessionLocal() as db:
        req = db.get(ClanJoinRequest, 1)
        rejection_notice = (
            db.query(Notification)
            .filter(
                Notification.user_id == 2,
                Notification.kind == "approval_rejected",
            )
            .order_by(Notification.id.desc())
            .first()
        )

        assert req is not None
        assert req.status == "rejected"
        assert req.decided_at is not None
        assert rejection_notice is not None
        assert rejection_notice.action_url == "/join-approval/1"

    status_res = client.get("/clans/join-requests/1/status")
    assert status_res.status_code == 200, status_res.text
    status_data = status_res.json()
    assert status_data["status"] == "rejected"
    assert status_data["result_channel"] == "request-rejected"
    assert status_data["result_path"] == "/join-approval/1"
    assert status_data["next_step"] == "review-decision"


def test_activated_reviewer_neutral_vote_records_reason_without_final_decision(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        applicant = User(
            id=2,
            email="neutral-applicant@example.com",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        db.add(applicant)
        db.flush()
        db.add(
            ClanJoinRequest(
                id=1,
                clan_id=1,
                applicant_user_id=2,
                invited_by_user_id=1,
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    from app.core import auth as auth_core

    def fake_current_user():
        return SimpleNamespace(
            id=1,
            email="admin@example.com",
            role="admin",
            hashed_password="hashed",
        )

    app.dependency_overrides[auth_core.get_current_user] = fake_current_user
    try:
        res = client.post(
            "/clans/1/join-requests/1/vote",
            json={
                "vote": "neutral",
                "reason_code": "do_not_know_enough",
                "reason_text": "I do not know this person well enough to decide.",
            },
            headers={"X-Clan-Id": "1"},
        )
    finally:
        app.dependency_overrides.pop(auth_core.get_current_user, None)

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["approved_now"] is False
    assert data["rejected_now"] is False
    assert data["request"]["status"] == "pending"
    assert data["request"]["neutrals"] == 1
    assert data["request"]["total_votes"] == 1

    with SessionLocal() as db:
        req = db.get(ClanJoinRequest, 1)
        vote = db.query(clans_route.ClanJoinVote).filter_by(join_request_id=1).one()
        event = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "join_request.vote_recorded")
            .order_by(TrustEvent.id.desc())
            .first()
        )

        assert req is not None
        assert req.status == "pending"
        assert vote.vote == "neutral"
        assert event is not None
        meta = json.loads(event.meta_json or "{}")
        assert meta["vote"] == "neutral"
        assert meta["reason_code"] == "do_not_know_enough"
        assert meta["reason_text"] == "I do not know this person well enough to decide."


def test_public_join_request_rejects_short_lived_invite_after_daily_pilot_window(client):
    _seed_join_context()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="old-short-lived-package",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=now - timedelta(hours=26),
                expires_at=now - timedelta(hours=25),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("old-short-lived-package"))

    assert res.status_code == 400, res.text
    assert res.json()["detail"] == "Invitation has expired"


def test_public_join_request_still_accepts_legacy_community_invite_code(client):
    _seed_join_context(invite_code="legacy-code")

    res = client.post("/clans/join-requests", json=_join_payload("legacy-code"))

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["request"]["invite_id"] is None
    assert data["lineage"]["invited_by_user_id"] == 1

    with SessionLocal() as db:
        clan = db.get(Clan, 1)
        assert clan is not None
        assert clan.invite_uses == 1


def test_create_invite_route_refreshes_without_retiring_older_live_invites(
    client,
):
    _seed_join_context()

    def fake_clan_ctx():
        clan = SimpleNamespace(
            id=1,
            name="Aberdeen City ICA",
            marketplace_name="Aberdeen city marketplace",
        )
        membership = SimpleNamespace(role="admin", clan_id=1, user_id=1)
        current_user = SimpleNamespace(id=1, email="admin@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx

    try:
        first = client.post("/clans/1/invite")
        assert first.status_code == 200, first.text
        first_data = first.json()
        first_code = first_data["invite_code"]
        assert first_data["retired_live_invites"] == 0

        second = client.post("/clans/1/invite")
        assert second.status_code == 200, second.text
        second_data = second.json()
        second_code = second_data["invite_code"]

        assert second_code != first_code
        assert second_data["retired_live_invites"] == 0

        with SessionLocal() as db:
            invites = (
                db.query(ClanInvite)
                .filter(ClanInvite.clan_id == 1)
                .order_by(ClanInvite.created_at.asc(), ClanInvite.id.asc())
                .all()
            )

            assert len(invites) == 2
            assert invites[0].code == first_code
            assert invites[0].is_active is True
            assert invites[0].revoked_at is None
            assert invites[1].code == second_code
            assert invites[1].is_active is True
            assert invites[1].revoked_at is None
    finally:
        app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)


def test_create_invite_route_records_relationship_evidence_in_trust_event(
    client,
):
    _seed_join_context()

    def fake_clan_ctx():
        clan = SimpleNamespace(
            id=1,
            name="Aberdeen City ICA",
            marketplace_name="Aberdeen city marketplace",
        )
        membership = SimpleNamespace(role="admin", clan_id=1, user_id=1)
        current_user = SimpleNamespace(id=1, email="admin@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx

    try:
        res = client.post(
            "/clans/1/invite",
            json={
                "relationship_evidence": {
                    "evidence_source": "first_circle",
                    "invitation_context": "trusted_community_invite",
                    "relationship_type": "supplier",
                    "known_duration": "over_5_years",
                    "confidence_level": "known_through_trade",
                    "relationship_context": "We trade every market week.",
                    "first_circle_role": "trader",
                    "first_circle_ready_count": 3,
                    "first_circle_selected_count": 4,
                }
            },
        )

        assert res.status_code == 200, res.text
        invite_code = res.json()["invite_code"]

        with SessionLocal() as db:
            event = (
                db.query(TrustEvent)
                .filter(TrustEvent.event_type == "invite_created")
                .order_by(TrustEvent.id.desc())
                .first()
            )
            assert event is not None

            meta = json.loads(event.meta_json or "{}")
            assert meta["invite_code"] == invite_code
            evidence = meta["relationship_evidence"]
            assert evidence["evidence_source"] == "first_circle"
            assert evidence["relationship_type"] == "supplier"
            assert evidence["known_duration"] == "over_5_years"
            assert evidence["confidence_level"] == "known_through_trade"
            assert evidence["relationship_context"] == "We trade every market week."
            assert evidence["first_circle_ready_count"] == 3
            assert evidence["first_circle_selected_count"] == 4
            assert "private phone numbers" in evidence["privacy_note"]
            assert "relationship statement" in meta["trust_record_note"]
    finally:
        app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)


def test_member_can_read_existing_marketplace_join_link_without_refresh_power(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(User(id=2, email="member@example.com", hashed_password="hashed"))
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="member",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="admin-prepared-code",
                is_active=True,
                max_uses=20,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    def fake_clan_ctx():
        clan = SimpleNamespace(
            id=1,
            name="Aberdeen City ICA",
            marketplace_name="Aberdeen city marketplace",
        )
        membership = SimpleNamespace(role="member", clan_id=1, user_id=2)
        current_user = SimpleNamespace(id=2, email="member@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx

    try:
        res = client.get("/clans/1/invite-link")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["invite_status"] == "ready"
        assert data["invite_code"] == "admin-prepared-code"
        assert "admin-prepared-code" in data["invite_link"]
        assert data["can_refresh_invite"] is True
        assert data["requires_admin_refresh"] is False
        assert data["invited_by_user_id"] == 1
        assert "community review" in data["message"]
    finally:
        app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)


def test_member_get_invite_link_without_live_invite_auto_prepares_shareable_link(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(User(id=2, email="member-auto-link@example.com", hashed_password="hashed"))
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="member",
                personal_pool_balance=0,
            )
        )
        db.commit()

    def fake_clan_ctx():
        clan = SimpleNamespace(
            id=1,
            name="Aberdeen City ICA",
            marketplace_name="Aberdeen city marketplace",
        )
        membership = SimpleNamespace(role="member", clan_id=1, user_id=2)
        current_user = SimpleNamespace(id=2, email="member@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx

    try:
        res = client.get("/clans/1/invite-link")
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["invite_status"] == "ready"
        assert data["can_refresh_invite"] is True
        assert data["requires_admin_refresh"] is False
        assert "Any active member may share it" in data["message"]
        assert data["invite_link"]
        assert data["invited_by_user_id"] == 2

        with SessionLocal() as db:
            invite = db.query(ClanInvite).filter(ClanInvite.clan_id == 1).one()
            assert invite.created_by_user_id == 2
            assert invite.max_uses == 0
    finally:
        app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)


def test_member_can_refresh_marketplace_join_link_without_usage_quota(
    client,
):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(User(id=2, email="member-refresh-link@example.com", hashed_password="hashed"))
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="member",
                personal_pool_balance=0,
            )
        )
        db.commit()

    def fake_clan_ctx():
        clan = SimpleNamespace(
            id=1,
            name="Aberdeen City ICA",
            marketplace_name="Aberdeen city marketplace",
        )
        membership = SimpleNamespace(role="member", clan_id=1, user_id=2)
        current_user = SimpleNamespace(id=2, email="member@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx

    try:
        refresh_res = client.post("/clans/1/invite")
        assert refresh_res.status_code == 200, refresh_res.text
        assert refresh_res.json()["max_uses"] is None

        policy_res = client.get("/clans/1/invite-link?max_uses=10")
        assert policy_res.status_code == 200, policy_res.text
        assert policy_res.json()["invite_max_uses"] is None
    finally:
        app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)
