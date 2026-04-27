from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.api.routes import clans as clans_route
from app.core import clan_auth
from app.db.database import SessionLocal
from app.db.models import Clan, ClanInvite, ClanJoinRequest, ClanMembership, User
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
            id=2,
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

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert res.status_code == 201, res.text

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind == "approval_request")
            .order_by(Notification.user_id.asc(), Notification.id.asc())
            .all()
        )

        assert [int(row.user_id) for row in notifications] == [1, 2]
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
            json={"vote": "approve"},
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


def test_create_invite_route_refreshes_by_retiring_older_live_invites(
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
        assert second_data["retired_live_invites"] == 1

        with SessionLocal() as db:
            invites = (
                db.query(ClanInvite)
                .filter(ClanInvite.clan_id == 1)
                .order_by(ClanInvite.created_at.asc(), ClanInvite.id.asc())
                .all()
            )

            assert len(invites) == 2
            assert invites[0].code == first_code
            assert invites[0].is_active is False
            assert invites[0].revoked_at is not None
            assert invites[1].code == second_code
            assert invites[1].is_active is True
            assert invites[1].revoked_at is None
    finally:
        app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)
