from datetime import datetime, timedelta, timezone

from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db.models import (
    AccountActivationGrant,
    Clan,
    ClanJoinRequest,
    ClanMembership,
    EntryPhoneVerification,
    TrustEvent,
    User,
)
from app.db.notification_models import Notification


def _seed_community(*, enabled: bool, search_mode: str = "community_vote") -> None:
    with SessionLocal() as db:
        owner = User(
            id=1,
            email="owner@example.com",
            hashed_password="active-password-hash",
            role="admin",
            display_name="Community Owner",
            gmfn_id="GMFN-U-OWNER001",
        )
        clan = Clan(
            id=1,
            name="Visible Support Circle",
            description="A calm local support network.",
            community_code="GMFN-C-000001",
            created_by_user_id=1,
            status="active",
            invite_code="visible-support-invite",
            admission_mode="instant_invite",
            voting_admin_override=False,
            search_join_enabled=enabled,
            search_join_admission_mode=search_mode,
            search_join_admin_override=True,
        )
        db.add_all([owner, clan])
        db.flush()
        db.add(
            ClanMembership(
                clan_id=1,
                user_id=1,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()


def _verified_phone(*, phone: str, display_name: str = "Ada Applicant") -> int:
    with SessionLocal() as db:
        row = EntryPhoneVerification(
            display_name=display_name,
            phone_e164=phone,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
            verified_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return int(row.id)


def test_public_search_returns_every_active_non_default_community(client, monkeypatch):
    monkeypatch.setenv("GMFN_SECRET_KEY", "corrected-entry-test-secret")
    _seed_community(enabled=True)
    with SessionLocal() as db:
        db.add(
            Clan(
                id=2,
                name="Hidden Support Circle",
                community_code="GMFN-C-000002",
                status="active",
                invite_code="hidden-support-invite",
                search_join_enabled=False,
                search_join_admission_mode="community_vote",
            )
        )
        db.add_all(
            [
                Clan(
                    id=3,
                    name="Inactive Support Circle",
                    community_code="GMFN-C-000003",
                    status="dormant",
                    invite_code="inactive-support-invite",
                    search_join_enabled=True,
                    search_join_admission_mode="community_vote",
                ),
                Clan(
                    id=4,
                    name="Default Clan",
                    community_code="GMFN-C-000004",
                    status="active",
                    invite_code="default-clan-invite",
                    search_join_enabled=True,
                    search_join_admission_mode="community_vote",
                ),
            ]
        )
        db.commit()

    visible = client.get("/clans/join-search", params={"query": "Support"})
    assert visible.status_code == 200, visible.text
    assert [item["community_id"] for item in visible.json()["items"]] == [2, 1]
    assert "created_by_user_id" not in visible.text
    assert "owner@example.com" not in visible.text

    formerly_hidden = client.get("/clans/join-search/2")
    assert formerly_hidden.status_code == 200
    assert formerly_hidden.json()["community"]["community_id"] == 2
    owner_token = create_access_token({"sub": "owner@example.com"})
    direct_request = client.post(
        "/clans/search-join-requests",
        json={"community_id": 2},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert direct_request.status_code == 201, direct_request.text
    assert direct_request.json()["community_id"] == 2
    assert client.get("/clans/join-search/3").status_code == 404
    assert client.get("/clans/join-search/4").status_code == 404


def test_owner_can_change_search_admission_without_changing_visibility_or_invitation_policy(
    client,
    override_clan_ctx_admin,
):
    _seed_community(enabled=False)

    before = client.get("/clans/1/search-join-settings")
    assert before.status_code == 200, before.text
    assert before.json()["enabled"] is True

    updated = client.patch(
        "/clans/1/search-join-settings",
        json={
            "enabled": False,
            "admission_mode": "community_vote",
            "admin_override": True,
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["enabled"] is True
    assert updated.json()["admission_mode"] == "community_vote"
    assert updated.json()["admin_override"] is True

    visible = client.get("/clans/join-search", params={"query": "Visible"})
    assert visible.status_code == 200, visible.text
    assert [item["community_id"] for item in visible.json()["items"]] == [1]

    with SessionLocal() as db:
        clan = db.get(Clan, 1)
        assert clan.admission_mode == "instant_invite"
        assert clan.voting_admin_override is False
        assert clan.search_join_enabled is True


def test_search_join_uses_separate_policy_and_records_immutable_snapshot(client):
    _seed_community(enabled=True, search_mode="community_vote")
    verification_id = _verified_phone(phone="+447700900711")

    response = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 1,
            "verification_id": verification_id,
            "first_name": "Ada",
            "surname": "Applicant",
            "phone_e164": "+447700900711",
            "country": "United Kingdom",
            "note": "I live locally.",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "pending"
    assert body["request_source"] == "search"
    assert body["gmfn_id"] is None
    assert body["status_token"]

    with SessionLocal() as db:
        request = db.query(ClanJoinRequest).one()
        applicant = db.get(User, int(request.applicant_user_id))
        assert applicant is not None
        assert applicant.gmfn_id is None
        assert (
            db.query(ClanMembership)
            .filter(
                ClanMembership.user_id == int(applicant.id),
                ClanMembership.left_at.is_(None),
            )
            .count()
            == 0
        )
        assert request.request_source == "search"
        assert request.invite_id is None
        assert request.admission_mode_snapshot == "community_vote"
        assert request.admin_override_snapshot is True
        assert db.query(Notification).filter(Notification.user_id == 1).count() == 1
        clan = db.get(Clan, 1)
        clan.search_join_admission_mode = "instant_invite"
        clan.search_join_admin_override = False
        db.commit()
        db.refresh(request)
        assert request.admission_mode_snapshot == "community_vote"
        assert request.admin_override_snapshot is True


def test_search_join_rejects_unverified_phone_session(client):
    _seed_community(enabled=True)
    with SessionLocal() as db:
        verification = EntryPhoneVerification(
            display_name="Unverified Applicant",
            phone_e164="+447700900712",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(verification)
        db.commit()
        db.refresh(verification)
        verification_id = int(verification.id)

    response = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 1,
            "verification_id": verification_id,
            "first_name": "Unverified",
            "phone_e164": "+447700900712",
            "country": "United Kingdom",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "verified_phone_session_required"
    with SessionLocal() as db:
        assert db.query(ClanJoinRequest).count() == 0


def test_identity_first_creation_activates_before_idempotent_community_create(
    client,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_DEV_MODE", "true")
    verification_id = _verified_phone(
        phone="+447700900713",
        display_name="Ife Founder",
    )
    identity_key = "identity-11111111-2222-4333-8444-555555555555"
    establish = client.post(
        "/entry/identity/establish",
        json={
            "verification_id": verification_id,
            "identity_request_key": identity_key,
            "email": "ife-founder@example.com",
            "country": "United Kingdom",
        },
    )
    assert establish.status_code == 201, establish.text
    identity = establish.json()
    assert identity["gmfn_id"].startswith("GMFN-U-")
    assert identity["activation_token"]
    with SessionLocal() as db:
        assert db.query(User).count() == 1
        assert db.query(Clan).count() == 0
        assert db.query(ClanMembership).count() == 0

    wrong_resume = client.post(
        "/entry/identity/establish",
        json={
            "verification_id": verification_id,
            "identity_request_key": "identity-99999999-8888-4777-8666-555555555555",
            "email": "ife-founder@example.com",
            "country": "United Kingdom",
        },
    )
    assert wrong_resume.status_code == 409

    retry = client.post(
        "/entry/identity/establish",
        json={
            "verification_id": verification_id,
            "identity_request_key": identity_key,
            "email": "ife-founder@example.com",
            "country": "United Kingdom",
        },
    )
    assert retry.status_code == 201, retry.text
    assert retry.json()["resumed"] is True
    assert retry.json()["user_id"] == identity["user_id"]

    stale_activation = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": identity["gmfn_id"],
            "activation_token": identity["activation_token"],
            "password": "secure-password",
            "confirm_password": "secure-password",
        },
    )
    assert stale_activation.status_code == 403

    mismatched_identity = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-WRONG001",
            "activation_token": retry.json()["activation_token"],
            "password": "secure-password",
            "confirm_password": "secure-password",
        },
    )
    assert mismatched_identity.status_code == 404

    activate = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": identity["gmfn_id"],
            "activation_token": retry.json()["activation_token"],
            "password": "secure-password",
            "confirm_password": "secure-password",
        },
    )
    assert activate.status_code == 200, activate.text
    assert activate.json()["community_id"] is None
    replay = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": identity["gmfn_id"],
            "activation_token": retry.json()["activation_token"],
            "password": "changed-password",
            "confirm_password": "changed-password",
        },
    )
    assert replay.status_code == 403
    access_token = activate.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}
    creation_key = "community-11111111-2222-4333-8444-555555555555"
    payload = {
        "creation_request_key": creation_key,
        "clan_name": "Ife Trusted Circle",
        "clan_description": "A new support community.",
        "invite_admission_mode": "community_vote",
        "invite_admin_override": True,
        "search_join_enabled": True,
        "search_join_admission_mode": "community_vote",
        "search_join_admin_override": True,
    }
    failed_save = client.post(
        "/entry/identity/community",
        json={**payload, "clan_name": ""},
        headers=headers,
    )
    assert failed_save.status_code == 422
    with SessionLocal() as db:
        founder = db.get(User, identity["user_id"])
        assert founder.gmfn_id == identity["gmfn_id"]
        assert db.query(Clan).count() == 0
        assert db.query(ClanMembership).count() == 0

    created = client.post("/entry/identity/community", json=payload, headers=headers)
    assert created.status_code == 201, created.text
    assert created.json()["idempotent"] is False
    repeated = client.post("/entry/identity/community", json=payload, headers=headers)
    assert repeated.status_code == 201, repeated.text
    assert repeated.json()["idempotent"] is True
    assert repeated.json()["community_id"] == created.json()["community_id"]

    with SessionLocal() as db:
        clan = db.query(Clan).one()
        assert clan.creation_request_key == creation_key
        assert clan.created_by_user_id == identity["user_id"]
        assert clan.admission_mode == "community_vote"
        assert clan.voting_admin_override is True
        assert clan.search_join_enabled is True
        assert db.query(ClanMembership).count() == 1


def test_new_policy_rejects_standalone_admin_but_legacy_can_remain(
    client,
    override_clan_ctx_admin,
):
    _seed_community(enabled=False)
    rejected = client.patch(
        "/clans/1/admission-policy",
        json={"admission_mode": "admin_approval", "voting_admin_override": False},
    )
    assert rejected.status_code == 422
    assert rejected.json()["detail"]["code"] == (
        "legacy_admin_approval_not_available_for_new_configuration"
    )

    with SessionLocal() as db:
        clan = db.get(Clan, 1)
        clan.admission_mode = "admin_approval"
        db.commit()

    preserved = client.patch(
        "/clans/1/admission-policy",
        json={"admission_mode": "admin_approval", "voting_admin_override": False},
    )
    assert preserved.status_code == 200, preserved.text
    assert preserved.json()["admission_mode"] == "admin_approval"


def test_search_join_instant_admission_creates_one_identity_and_membership(client):
    _seed_community(enabled=True, search_mode="instant_invite")
    verification_id = _verified_phone(phone="+447700900714")

    response = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 1,
            "verification_id": verification_id,
            "first_name": "Kemi",
            "surname": "Applicant",
            "phone_e164": "+447700900714",
            "country": "United Kingdom",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["result_status"] == "instant_search_join_accepted"
    assert body["status"] == "approved"
    assert body["request_source"] == "search"
    assert body["gmfn_id"].startswith("GMFN-U-")

    with SessionLocal() as db:
        request = db.query(ClanJoinRequest).one()
        applicant = db.get(User, request.applicant_user_id)
        memberships = (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == applicant.id)
            .all()
        )
        assert request.status == "approved"
        assert request.request_source == "search"
        assert request.admission_mode_snapshot == "instant_invite"
        assert applicant.gmfn_id == body["gmfn_id"]
        assert len(memberships) == 1
        assert memberships[0].clan_id == 1


def test_search_join_uses_selected_stable_id_for_similarly_named_communities(client):
    _seed_community(enabled=True, search_mode="community_vote")
    with SessionLocal() as db:
        second = Clan(
            id=2,
            name="Visible Support Circle East",
            description="A separate support network.",
            community_code="GMFN-C-000002",
            created_by_user_id=1,
            status="active",
            invite_code="visible-support-east-invite",
            admission_mode="instant_invite",
            voting_admin_override=False,
            search_join_enabled=True,
            search_join_admission_mode="community_vote",
            search_join_admin_override=False,
        )
        db.add(second)
        db.flush()
        db.add(
            ClanMembership(
                clan_id=2,
                user_id=1,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()

    search = client.get(
        "/clans/join-search",
        params={"query": "Visible Support Circle"},
    )
    assert search.status_code == 200, search.text
    assert [item["community_id"] for item in search.json()["items"]] == [1, 2]

    verification_id = _verified_phone(phone="+447700900715")
    requested = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 2,
            "verification_id": verification_id,
            "first_name": "Nneka",
            "surname": "Applicant",
            "phone_e164": "+447700900715",
            "country": "United Kingdom",
        },
    )
    assert requested.status_code == 201, requested.text
    assert requested.json()["community_id"] == 2

    with SessionLocal() as db:
        request = db.query(ClanJoinRequest).one()
        assert request.clan_id == 2
        assert request.request_source == "search"


def test_search_join_admin_override_is_authorized_and_audited(
    client,
    override_clan_ctx_admin,
):
    _seed_community(enabled=True, search_mode="community_vote")
    verification_id = _verified_phone(phone="+447700900716")
    requested = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 1,
            "verification_id": verification_id,
            "first_name": "Amara",
            "surname": "Applicant",
            "phone_e164": "+447700900716",
            "country": "United Kingdom",
        },
    )
    assert requested.status_code == 201, requested.text
    request_id = requested.json()["request"]["id"]

    approved = client.post(
        f"/clans/1/join-requests/{request_id}/admin-approve",
        json={
            "reason_code": "identity_confirmed",
            "reason_text": "Owner confirmed the applicant.",
        },
    )
    assert approved.status_code == 200, approved.text
    body = approved.json()
    assert body["approved_now"] is True
    assert body["override_reason_code"] == "identity_confirmed"
    assert body["override_reason_text"] == "Owner confirmed the applicant."
    assert body["override_decided_at"]

    with SessionLocal() as db:
        request = db.get(ClanJoinRequest, request_id)
        applicant = db.get(User, request.applicant_user_id)
        event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.event_type
                == "community.join_request.admin_override_applied"
            )
            .one()
        )
        assert request.status == "approved"
        assert applicant.gmfn_id
        assert (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == 1,
                ClanMembership.user_id == applicant.id,
                ClanMembership.left_at.is_(None),
            )
            .count()
            == 1
        )
        assert event.actor_user_id == 1
        assert event.subject_user_id == applicant.id
        assert event.meta["decision"] == "approve"
        assert event.meta["reason_code"] == "identity_confirmed"
        assert event.meta["reason_text"] == "Owner confirmed the applicant."
        assert event.meta["decided_at"] == body["override_decided_at"]


def test_search_join_admin_override_rejects_non_admin(
    client,
    override_clan_ctx_member,
):
    _seed_community(enabled=True, search_mode="community_vote")
    verification_id = _verified_phone(phone="+447700900717")
    requested = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 1,
            "verification_id": verification_id,
            "first_name": "Chidi",
            "surname": "Applicant",
            "phone_e164": "+447700900717",
            "country": "United Kingdom",
        },
    )
    assert requested.status_code == 201, requested.text
    request_id = requested.json()["request"]["id"]

    rejected = client.post(
        f"/clans/1/join-requests/{request_id}/admin-approve",
        json={"reason_code": "not_authorized"},
    )
    assert rejected.status_code == 403

    with SessionLocal() as db:
        assert db.get(ClanJoinRequest, request_id).status == "pending"
        assert (
            db.query(TrustEvent)
            .filter(
                TrustEvent.event_type
                == "community.join_request.admin_override_applied"
            )
            .count()
            == 0
        )


def test_existing_identity_is_reused_across_search_join_and_community_creation(
    client,
    override_clan_ctx_admin,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_SECRET_KEY", "corrected-entry-test-secret")
    _seed_community(enabled=True, search_mode="community_vote")
    with SessionLocal() as db:
        existing_user = User(
            id=2,
            email="existing-builder@example.com",
            hashed_password="active-password-hash",
            role="user",
            display_name="Existing Builder",
            gmfn_id="GMFN-U-EXIST001",
            phone_e164="+447700900720",
            phone_verified_at=datetime.now(timezone.utc),
        )
        db.add(existing_user)
        db.commit()

    token = create_access_token({"sub": "existing-builder@example.com"})
    headers = {"Authorization": f"Bearer {token}"}
    requested = client.post(
        "/clans/search-join-requests",
        json={"community_id": 1},
        headers=headers,
    )
    assert requested.status_code == 201, requested.text
    request_id = requested.json()["request"]["id"]

    approved = client.post(
        f"/clans/1/join-requests/{request_id}/admin-approve",
        json={
            "reason_code": "known_member",
            "reason_text": "The established member identity was confirmed.",
        },
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["approval_result"]["identity_reused"] is True
    assert approved.json()["approval_result"]["gmfn_id"] == "GMFN-U-EXIST001"
    assert approved.json()["approval_result"]["activation_required"] is False

    created = client.post(
        "/entry/identity/community",
        json={
            "creation_request_key": (
                "community-existing-11111111-2222-4333-8444-555555555555"
            ),
            "clan_name": "Existing Builder Circle",
            "clan_description": "A second community for an established member.",
            "invite_admission_mode": "instant_invite",
            "invite_admin_override": False,
            "search_join_enabled": False,
            "search_join_admission_mode": "community_vote",
            "search_join_admin_override": False,
        },
        headers=headers,
    )
    assert created.status_code == 201, created.text
    assert created.json()["gmfn_id"] == "GMFN-U-EXIST001"

    with SessionLocal() as db:
        existing_user = db.get(User, 2)
        assert existing_user.gmfn_id == "GMFN-U-EXIST001"
        assert db.query(User).filter(User.id == 2).count() == 1
        assert (
            db.query(ClanMembership)
            .filter(ClanMembership.user_id == 2, ClanMembership.left_at.is_(None))
            .count()
            == 2
        )


def test_reviewed_search_member_vote_approves_once_without_duplicate_membership(
    client,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_SECRET_KEY", "corrected-entry-test-secret")
    _seed_community(enabled=True, search_mode="community_vote")
    verification_id = _verified_phone(phone="+447700900718")
    requested = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 1,
            "verification_id": verification_id,
            "first_name": "Ngozi",
            "surname": "Applicant",
            "phone_e164": "+447700900718",
            "country": "United Kingdom",
        },
    )
    assert requested.status_code == 201, requested.text
    request_id = requested.json()["request"]["id"]
    owner_token = create_access_token({"sub": "owner@example.com"})
    owner_headers = {"Authorization": f"Bearer {owner_token}"}

    approved = client.post(
        f"/clans/1/join-requests/{request_id}/vote",
        json={
            "vote": "approve",
            "reason_code": "community_fit",
            "reason_text": "The applicant meets the community criteria.",
        },
        headers=owner_headers,
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["approved_now"] is True
    assert approved.json()["approval_result"]["status"] == "approved"

    repeated = client.post(
        f"/clans/1/join-requests/{request_id}/vote",
        json={
            "vote": "approve",
            "reason_code": "community_fit",
            "reason_text": "Repeated approval must be harmless.",
        },
        headers=owner_headers,
    )
    assert repeated.status_code == 200, repeated.text
    assert repeated.json()["status_already_final"] is True
    assert repeated.json()["approved_now"] is False

    with SessionLocal() as db:
        request = db.get(ClanJoinRequest, request_id)
        applicant = db.get(User, request.applicant_user_id)
        assert request.status == "approved"
        assert applicant.gmfn_id
        assert (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == 1,
                ClanMembership.user_id == applicant.id,
                ClanMembership.left_at.is_(None),
            )
            .count()
            == 1
        )
        assert (
            db.query(AccountActivationGrant)
            .filter(AccountActivationGrant.join_request_id == request_id)
            .count()
            == 1
        )


def test_reviewed_search_rejection_cannot_be_overturned_by_late_override(
    client,
    override_clan_ctx_admin,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_SECRET_KEY", "corrected-entry-test-secret")
    _seed_community(enabled=True, search_mode="community_vote")
    verification_id = _verified_phone(phone="+447700900719")
    requested = client.post(
        "/clans/search-join-requests",
        json={
            "community_id": 1,
            "verification_id": verification_id,
            "first_name": "Uche",
            "surname": "Applicant",
            "phone_e164": "+447700900719",
            "country": "United Kingdom",
        },
    )
    assert requested.status_code == 201, requested.text
    request_id = requested.json()["request"]["id"]
    owner_token = create_access_token({"sub": "owner@example.com"})

    rejected = client.post(
        f"/clans/1/join-requests/{request_id}/vote",
        json={
            "vote": "reject",
            "reason_code": "community_concern",
            "reason_text": "The request needs a different community.",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["rejected_now"] is True
    assert rejected.json()["rejection_result"]["status"] == "rejected"

    late_override = client.post(
        f"/clans/1/join-requests/{request_id}/admin-approve",
        json={
            "reason_code": "late_override",
            "reason_text": "This must not change a final rejection.",
        },
    )
    assert late_override.status_code == 200, late_override.text
    assert late_override.json()["status_already_final"] is True
    assert late_override.json()["approved_now"] is False

    with SessionLocal() as db:
        request = db.get(ClanJoinRequest, request_id)
        applicant = db.get(User, request.applicant_user_id)
        assert request.status == "rejected"
        assert applicant.gmfn_id is None
        assert (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == 1,
                ClanMembership.user_id == applicant.id,
                ClanMembership.left_at.is_(None),
            )
            .count()
            == 0
        )
        assert (
            db.query(TrustEvent)
            .filter(
                TrustEvent.event_type
                == "community.join_request.admin_override_applied"
            )
            .count()
            == 0
        )
