import os
from datetime import datetime, timedelta, timezone

from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.db.models import Clan, ClanJoinRequest, ClanMembership, User


def _parse_api_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def test_entry_phone_default_does_not_expose_otp_preview(client, monkeypatch):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.delenv("GMFN_ENTRY_PHONE_DELIVERY", raising=False)

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Production Tester",
            "phone_e164": "+2348011111010",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    assert start_body["delivery_mode"] == "pending-sms"
    assert start_body["otp_preview"] is None


def test_entry_phone_preview_session_lasts_one_day_for_pilot_onboarding(client):
    os.environ["GMFN_DEV_MODE"] = "1"
    os.environ.pop("GMFN_ENTRY_PHONE_SESSION_MINUTES", None)

    started_at = datetime.now(timezone.utc)
    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Patient Tester",
            "phone_e164": "+2348011111111",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    assert start_body["delivery_mode"] == "preview"
    assert start_body["otp_preview"]
    expires_at = _parse_api_datetime(start_body["expires_at"])
    assert expires_at - started_at > timedelta(hours=23, minutes=59)
    assert expires_at - started_at < timedelta(hours=24, minutes=1)


def test_entry_phone_start_releases_abandoned_pending_identity(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        abandoned = User(
            email="abandoned-intake@example.com",
            phone_e164="+2348011112222",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        db.add(abandoned)
        db.commit()
        abandoned_id = int(abandoned.id)

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Returning Starter",
            "phone_e164": "+2348011112222",
            "email": "abandoned-intake@example.com",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()
    assert start_body["ok"] is True
    assert start_body["phone_e164"] == "+2348011112222"

    with SessionLocal() as db:
        released = db.get(User, abandoned_id)
        assert released is not None
        assert released.phone_e164 is None
        assert released.email.startswith(f"abandoned-entry-{abandoned_id}-")
        assert released.email.endswith("@abandoned.gsnmail.app")


def test_entry_create_releases_abandoned_pending_email_identity(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        abandoned = User(
            email="half-finished@example.com",
            phone_e164=None,
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        db.add(abandoned)
        db.commit()
        abandoned_id = int(abandoned.id)

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Fresh Founder",
            "phone_e164": "+2348011113333",
            "email": "half-finished@example.com",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Fresh Founder",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
        },
    )
    assert bank_res.status_code == 200, bank_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Fresh Founder Circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    assert create_res.json()["email"] == "half-finished@example.com"

    with SessionLocal() as db:
        released = db.get(User, abandoned_id)
        assert released is not None
        assert released.email.startswith(f"abandoned-entry-{abandoned_id}-")


def test_entry_phone_start_keeps_real_pending_join_request_protected(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        owner = User(email="owner@example.com", hashed_password="hashed", role="admin")
        applicant = User(
            email="pending-applicant@example.com",
            phone_e164="+2348011114444",
            hashed_password="PENDING_APPROVAL",
            role="user",
        )
        db.add(owner)
        db.add(applicant)
        db.flush()
        clan = Clan(
            name="Protected Join Circle",
            invite_code="protected-join-circle",
            community_code="GMFN-C-PROTECT1",
            created_by_user_id=int(owner.id),
            status="active",
        )
        db.add(clan)
        db.flush()
        db.add(
            ClanJoinRequest(
                clan_id=int(clan.id),
                applicant_user_id=int(applicant.id),
                status="pending",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
        applicant_id = int(applicant.id)

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Pending Applicant",
            "phone_e164": "+2348011114444",
        },
    )
    assert start_res.status_code == 409, start_res.text
    assert start_res.json()["detail"]["code"] == "entry_pending_admin_review"

    with SessionLocal() as db:
        protected = db.get(User, applicant_id)
        assert protected is not None
        assert protected.phone_e164 == "+2348011114444"


def test_entry_phone_verification_then_create_and_phone_login(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Mama Chuks",
            "phone_e164": "+2348012345678",
            "browser_locale": "en-NG",
            "browser_timezone": "Africa/Lagos",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    assert start_body["ok"] is True
    assert start_body["verification_id"] > 0
    assert start_body["phone_e164"] == "+2348012345678"
    assert start_body["otp_preview"]

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text
    confirm_body = confirm_res.json()

    assert confirm_body["ok"] is True
    assert confirm_body["verified"] is True
    assert confirm_body["display_name"] == "Mama Chuks"
    assert confirm_body["verified_at"]
    assert "successfully linked to your name" in confirm_body["confirmation_message"]
    assert confirm_body["trust_event_response"]["event_type"] == "identity.phone_verified"
    assert confirm_body["trust_event_response"]["status"] == "ready_for_registration"

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Mama Chuks",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
            "currency": "NGN",
            "driver_licence_number": "LAG-DRV-9911",
            "driver_licence_country": "NG",
        },
    )
    assert bank_res.status_code == 200, bank_res.text
    bank_body = bank_res.json()

    assert bank_body["ok"] is True
    assert bank_body["bank_details_recorded"] is True
    assert "recorded against this verified phone session" in bank_body["confirmation_message"]
    assert bank_body["trust_event_response"]["event_type"] == "identity.bank_destination_recorded"
    assert bank_body["trust_event_response"]["status"] == "ready_for_registration"

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Rising Market Women",
            "clan_description": "Daily trade support circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    assert create_body["ok"] is True
    assert create_body["display_name"] == "Mama Chuks"
    assert create_body["nickname"] == "Mama Chuks"
    assert create_body["phone_e164"] == "+2348012345678"
    assert create_body["next_step"] == "activate-membership"
    assert create_body["email"].endswith("@founder-entry.gsnmail.app")

    pending_login_res = client.post(
        "/auth/login",
        data={
            "username": "+2348012345678",
            "password": "secret123",
        },
    )
    assert pending_login_res.status_code == 401, pending_login_res.text
    pending_login_body = pending_login_res.json()
    assert pending_login_body["detail"]["code"] == "account_activation_pending"
    assert pending_login_body["detail"]["gmfn_id"] == create_body["gmfn_id"]
    assert "activate-membership" in pending_login_body["detail"]["activation_path"]

    blocked_restart_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Mama Chuks",
            "phone_e164": "+2348012345678",
            "browser_locale": "en-NG",
        },
    )
    assert blocked_restart_res.status_code == 409, blocked_restart_res.text
    blocked_restart_body = blocked_restart_res.json()
    assert blocked_restart_body["detail"]["code"] == "entry_activation_pending"
    assert blocked_restart_body["detail"]["gmfn_id"] == create_body["gmfn_id"]
    assert "activate-membership" in blocked_restart_body["detail"]["activation_path"]

    activate_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": create_body["gmfn_id"],
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text

    login_res = client.post(
        "/auth/login",
        data={
            "username": "+2348012345678",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    me_res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200, me_res.text
    me_body = me_res.json()

    assert me_body["display_name"] == "Mama Chuks"
    assert me_body["nickname"] == "Mama Chuks"
    assert me_body["phone_e164"] == "+2348012345678"

    payout_res = client.get(
        "/withdrawal-destinations/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert payout_res.status_code == 200, payout_res.text
    payout_body = payout_res.json()

    assert payout_body["destination_name"] == "Mama Chuks"
    assert payout_body["bank_name"] == "Pilot Community Bank"
    assert payout_body["verification_status"] == "phone_verified_bank_recorded_region_matched"
    assert payout_body["region_consistency_status"] == "matched"
    assert payout_body["confirmation_message"]
    assert payout_body["trust_event_response"]["event_type"] == "identity.bank_destination_recorded"
    assert "phone_verified" in payout_body["trust_event_response"]["status"]

    observe_res = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "trusted-device-one",
        },
    )
    assert observe_res.status_code == 200, observe_res.text
    observe_body = observe_res.json()
    assert observe_body["continuity"]["status"] == "trusted"

    risk_res = client.get(
        "/identity-risk/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert risk_res.status_code == 200, risk_res.text
    risk_body = risk_res.json()
    assert risk_body["continuity"]["status"] == "trusted"
    assert risk_body["device_count"] >= 1

    trust_res = client.get(
        "/trust-events/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert trust_res.status_code == 200, trust_res.text
    trust_body = trust_res.json()
    event_types = [item["event_type"] for item in trust_body["items"]]

    assert "identity.phone_verified" in event_types
    assert "identity.bank_destination_recorded" in event_types
    assert "identity.drivers_licence_recorded" in event_types
    assert "identity.region_consistent" in event_types

    explained_res = client.get(
        "/trust/score/explained",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert explained_res.status_code == 200, explained_res.text
    explained_body = explained_res.json()
    assert explained_body["starter_proof_summary"]["phone_verified"] is True
    assert explained_body["starter_proof_summary"]["bank_recorded"] is True
    assert explained_body["starter_proof_summary"]["drivers_licence_recorded"] is True
    assert explained_body["starter_proof_summary"]["region_consistent"] is True
    assert float(explained_body["standing_score"]) >= 0.95

    notifications_res = client.get(
        "/notifications/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert notifications_res.status_code == 200, notifications_res.text
    notifications_body = notifications_res.json()
    notification_titles = [item["title"] for item in notifications_body["items"]]
    assert "Starter trust has been established" in notification_titles


def test_activate_membership_cannot_reset_already_activated_account(client):
    with SessionLocal() as db:
        user = User(
            email="active.member@example.com",
            hashed_password=get_password_hash("old-secret"),
            role="user",
            gmfn_id="GMFN-U-ACTIVE1",
            phone_e164="+2348011112222",
            display_name="Active Member",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        clan = Clan(
            name="Active Member Circle",
            invite_code="active-member-circle",
            status="active",
            created_by_user_id=int(user.id),
        )
        db.add(clan)
        db.commit()
        db.refresh(clan)

        db.add(
            ClanMembership(
                clan_id=int(clan.id),
                user_id=int(user.id),
                role="member",
            )
        )
        db.commit()

    reset_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": "GMFN-U-ACTIVE1",
            "password": "new-secret",
            "confirm_password": "new-secret",
        },
    )
    assert reset_res.status_code == 409, reset_res.text
    assert reset_res.json()["detail"]["code"] == "account_already_activated"

    old_login_res = client.post(
        "/auth/login",
        data={
            "username": "active.member@example.com",
            "password": "old-secret",
        },
    )
    assert old_login_res.status_code == 200, old_login_res.text

    new_login_res = client.post(
        "/auth/login",
        data={
            "username": "active.member@example.com",
            "password": "new-secret",
        },
    )
    assert new_login_res.status_code == 401, new_login_res.text


def test_auth_me_profile_image_upload_persists_on_user_record(client):
    with SessionLocal() as db:
        user = User(
            email="avatar.tester@example.com",
            hashed_password=get_password_hash("secret123"),
            role="user",
            display_name="Avatar Tester",
        )
        db.add(user)
        db.commit()

    login_res = client.post(
        "/auth/login",
        data={
            "username": "avatar.tester@example.com",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    upload_res = client.post(
        "/auth/me/profile-image/upload",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "file": (
                "avatar.png",
                b"\x89PNG\r\n\x1a\navatar-bytes",
                "image/png",
            )
        },
    )
    assert upload_res.status_code == 200, upload_res.text
    upload_body = upload_res.json()

    assert upload_body["email"] == "avatar.tester@example.com"
    assert upload_body["profile_image_url"].startswith("/uploads/profile/users/")

    me_res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200, me_res.text
    me_body = me_res.json()

    assert me_body["profile_image_url"] == upload_body["profile_image_url"]


def test_auth_me_profile_image_delete_clears_user_record(client):
    with SessionLocal() as db:
        user = User(
            email="avatar.remove@example.com",
            hashed_password=get_password_hash("secret123"),
            role="user",
            display_name="Avatar Remove",
            profile_image_url="/uploads/profile/users/existing.png",
        )
        db.add(user)
        db.commit()

    login_res = client.post(
        "/auth/login",
        data={
            "username": "avatar.remove@example.com",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    delete_res = client.delete(
        "/auth/me/profile-image",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_res.status_code == 200, delete_res.text
    assert delete_res.json()["profile_image_url"] is None

    me_res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200, me_res.text
    assert me_res.json()["profile_image_url"] is None


def test_admin_pilot_intake_reports_completed_create_entry(client, override_current_user):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Pilot Admin Watch",
            "phone_e164": "+2348012345600",
            "email": "pilot.admin.watch@example.com",
            "browser_locale": "en-NG",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Pilot Admin Watch",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
            "currency": "NGN",
        },
    )
    assert bank_res.status_code == 200, bank_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Pilot Admin Watch Circle",
            "clan_description": "Admin-visible pilot intake test",
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert create_res.status_code == 201, create_res.text

    intake_res = client.get("/admin/pilot-intake?limit=20")
    assert intake_res.status_code == 200, intake_res.text
    intake_body = intake_res.json()

    assert intake_body["summary"]["create_by_stage"]["completed"] >= 1

    item = next(
        row
        for row in intake_body["create_entries"]
        if row["verification_id"] == start_body["verification_id"]
    )
    assert item["stage"] == "completed"
    assert item["display_name"] == "Pilot Admin Watch"
    assert item["bank_account_last4"] == "6789"
    assert item["user"]["gmfn_id"]
    assert item["communities"][0]["name"] == "Pilot Admin Watch Circle"
    assert "Creation appears complete" in item["next_action"]


def test_entry_phone_start_resumes_unfinished_verified_session(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Pilot Resume",
            "phone_e164": "+2348015550001",
            "email": "pilot.resume@example.com",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    resume_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Pilot Resume",
            "phone_e164": "+2348015550001",
            "email": "pilot.resume@example.com",
        },
    )
    assert resume_res.status_code == 201, resume_res.text
    resume_body = resume_res.json()

    assert resume_body["verification_id"] == start_body["verification_id"]
    assert resume_body["verified"] is True
    assert resume_body["bank_details_recorded"] is False
    assert resume_body["otp_preview"] is None
    assert "successfully linked to your name" in resume_body["confirmation_message"]


def test_entry_phone_start_resumes_unfinished_bank_record(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Pilot Bank Resume",
            "phone_e164": "+447700900321",
            "email": "pilot.bank.resume@example.com",
            "browser_locale": "en-GB",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Pilot Bank Resume",
            "bank_name": "Pilot Scotland Bank",
            "account_number": "12345678",
            "country": "Scotland",
            "currency": "GBP",
        },
    )
    assert bank_res.status_code == 200, bank_res.text
    assert bank_res.json()["region_consistency_status"] == "matched"

    resume_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Pilot Bank Resume",
            "phone_e164": "+447700900321",
            "email": "pilot.bank.resume@example.com",
        },
    )
    assert resume_res.status_code == 201, resume_res.text
    resume_body = resume_res.json()

    assert resume_body["verification_id"] == start_body["verification_id"]
    assert resume_body["verified"] is True
    assert resume_body["bank_details_recorded"] is True


def test_entry_create_requires_verified_phone_first(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Street Boss",
            "phone_e164": "+2348099999999",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Unverified Circle",
        },
    )
    assert create_res.status_code == 400, create_res.text
    assert "Phone verification must be completed first" in create_res.text


def test_entry_create_requires_bank_details_after_verified_phone(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Market Chair",
            "phone_e164": "+2348066666666",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Awaiting Bank Circle",
        },
    )
    assert create_res.status_code == 400, create_res.text
    assert "Bank details must be completed before community creation" in create_res.text


def test_entry_phone_confirm_rejects_wrong_code(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trader Bee",
            "phone_e164": "+2348077777777",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": "000000",
        },
    )
    assert confirm_res.status_code == 400, confirm_res.text
    assert "Verification code is not correct" in confirm_res.text


def test_entry_bank_details_require_verified_phone_first(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trader Bee",
            "phone_e164": "+2348077777777",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Trader Bee",
            "bank_name": "Pilot Community Bank",
            "account_number": "1234567890",
        },
    )
    assert bank_res.status_code == 400, bank_res.text
    assert "Phone verification must be completed first" in bank_res.text


def test_entry_bank_details_require_explanation_for_cross_region_mismatch(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trader UK",
            "phone_e164": "+447700900123",
            "browser_locale": "en-GB",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Trader UK",
            "bank_name": "Pilot Community Bank",
            "account_number": "1234567890",
            "country": "NG",
        },
    )
    assert bank_res.status_code == 400, bank_res.text
    assert "do not match yet" in bank_res.text


def test_entry_cross_region_mismatch_can_be_recorded_with_explanation(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Mama Diaspora",
            "phone_e164": "+447700900123",
            "browser_locale": "en-GB",
            "browser_timezone": "Europe/London",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Mama Diaspora",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
            "currency": "NGN",
            "note": "I live in the UK but I still use my Nigerian community account.",
        },
    )
    assert bank_res.status_code == 200, bank_res.text
    bank_body = bank_res.json()
    assert bank_body["region_consistency_status"] == "explained_mismatch"

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Diaspora Market Circle",
            "clan_description": "Cross-border trade support circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    activate_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": create_body["gmfn_id"],
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text

    login_res = client.post(
        "/auth/login",
        data={
            "username": "+447700900123",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    payout_res = client.get(
        "/withdrawal-destinations/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert payout_res.status_code == 200, payout_res.text
    payout_body = payout_res.json()
    assert payout_body["verification_status"] == "phone_verified_bank_recorded_region_explained"
    assert payout_body["region_consistency_status"] == "explained_mismatch"

    trust_res = client.get(
        "/trust-events/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert trust_res.status_code == 200, trust_res.text
    trust_body = trust_res.json()
    event_types = [item["event_type"] for item in trust_body["items"]]
    assert "identity.region_mismatch_explained" in event_types


def test_identity_risk_observation_moves_to_watch_on_new_device(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trust Watch",
            "phone_e164": "+2348091234567",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Trust Watch",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
        },
    )
    assert bank_res.status_code == 200, bank_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Trust Watch Circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    activate_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": create_body["gmfn_id"],
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text

    login_res = client.post(
        "/auth/login",
        data={
            "username": "+2348091234567",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    first_observe = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "trusted-device-one",
        },
    )
    assert first_observe.status_code == 200, first_observe.text
    assert first_observe.json()["continuity"]["status"] == "trusted"

    second_observe = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "trusted-device-two",
        },
    )
    assert second_observe.status_code == 200, second_observe.text
    assert second_observe.json()["continuity"]["status"] == "watch"

    risk_res = client.get(
        "/identity-risk/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert risk_res.status_code == 200, risk_res.text
    risk_body = risk_res.json()
    assert risk_body["continuity"]["status"] == "watch"
    assert risk_body["device_count"] >= 2
    assert risk_body["signal_count"] >= 1


def test_identity_recovery_challenge_can_restore_continuity_review(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Recovery Keeper",
            "phone_e164": "+2348091234500",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Recovery Keeper",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456799",
            "country": "NG",
        },
    )
    assert bank_res.status_code == 200, bank_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Recovery Keeper Circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    activate_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": create_body["gmfn_id"],
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text

    login_res = client.post(
        "/auth/login",
        data={
            "username": "+2348091234500",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    setup_res = client.post(
        "/identity-risk/recovery/setup",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "questions": [
                {"prompt": "What private word did you keep for GSN?", "answer": "Harbor"},
                {"prompt": "What was your first community seed?", "answer": "Lantern"},
                {"prompt": "What answer do you keep for trust recovery?", "answer": "Bridge"},
            ]
        },
    )
    assert setup_res.status_code == 200, setup_res.text
    assert setup_res.json()["configured"] is True

    first_observe = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "recovery-device-one",
        },
    )
    assert first_observe.status_code == 200, first_observe.text
    assert first_observe.json()["continuity"]["status"] == "trusted"

    second_observe = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "recovery-device-two",
        },
    )
    assert second_observe.status_code == 200, second_observe.text
    assert second_observe.json()["continuity"]["status"] in {"watch", "reverify_required"}

    verify_res = client.post(
        "/identity-risk/recovery/verify",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "answers": ["Harbor", "Lantern", "Bridge"],
        },
    )
    assert verify_res.status_code == 200, verify_res.text
    verify_body = verify_res.json()
    assert verify_body["verified"] is True
    assert verify_body["summary"]["continuity"]["status"] in {"trusted", "watch"}
    assert verify_body["recovery"]["last_verified_at"] is not None
