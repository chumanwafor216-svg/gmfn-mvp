import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanJoinRequest,
    ClanMembership,
    EntryPhoneVerification,
    TrustEvent,
    User,
    UserPayoutDestination,
)
from app.db.verification_models import IdentityVerificationCheck


def _parse_api_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def test_entry_phone_default_registers_without_sms_for_controlled_testing(client, monkeypatch):
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

    assert start_body["delivery_mode"] == "registration-only"
    assert start_body["otp_preview"] is None
    assert start_body["registered_only"] is True
    assert start_body["verified"] is False
    assert "SMS ownership verification is suspended" in start_body["confirmation_message"]

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Production Tester",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
        },
    )
    assert bank_res.status_code == 200, bank_res.text
    assert "phone registration session" in bank_res.json()["confirmation_message"]

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Production Tester Circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    with SessionLocal() as db:
        user = db.query(User).filter(User.phone_e164 == "+2348011111010").one()
        assert user.phone_verified_at is None
        event = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "identity.phone_registered")
            .one()
        )
        assert event.subject_user_id == create_body["user_id"]


def test_entry_phone_start_canonicalizes_local_number_and_blocks_existing_identity(client):
    with SessionLocal() as db:
        db.add(
            User(
                email="existing-local-phone@example.com",
                hashed_password=get_password_hash("secret123"),
                role="user",
                gmfn_id="GMFN-U-LOCALMATCH",
                phone_e164="+2348011112020",
                display_name="Existing Local Phone",
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Existing Local Phone",
            "phone_e164": "08011112020",
            "country": "Nigeria",
        },
    )

    assert start_res.status_code == 400, start_res.text
    assert "Phone number already registered" in start_res.text


def test_entry_phone_start_blocks_legacy_malformed_local_identity_variant(client):
    with SessionLocal() as db:
        db.add(
            User(
                email="legacy-local-phone@example.com",
                hashed_password=get_password_hash("secret123"),
                role="user",
                gmfn_id="GMFN-U-LEGACYLOCAL",
                phone_e164="+08011112021",
                display_name="Legacy Local Phone",
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Legacy Local Phone",
            "phone_e164": "08011112021",
            "country": "Nigeria",
        },
    )

    assert start_res.status_code == 400, start_res.text
    assert "Phone number already registered" in start_res.text


def test_entry_phone_start_rejects_ambiguous_local_number_without_country(client):
    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "No Country Local",
            "phone_e164": "08011112022",
        },
    )

    assert start_res.status_code == 400, start_res.text
    assert "select the phone country first" in start_res.text


def test_entry_phone_start_records_identity_profile_evidence(client):
    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Profile Evidence Founder",
            "phone_e164": "+2348011113025",
            "email": "profile-evidence@example.com",
            "country": "Nigeria",
            "date_of_birth": "1984-03-21",
            "birth_country": "Nigeria",
            "birth_place": "Aba, Abia State",
            "country_of_origin": "Nigeria",
            "residential_area": "Wuse 2, Abuja",
            "client_fingerprint": "entry-device-alpha",
            "device_label": "Pilot browser",
        },
    )

    assert start_res.status_code == 201, start_res.text
    verification_id = int(start_res.json()["verification_id"])

    with SessionLocal() as db:
        check = (
            db.query(IdentityVerificationCheck)
            .filter(
                IdentityVerificationCheck.entry_phone_verification_id == verification_id,
                IdentityVerificationCheck.verification_type == "identity_profile",
            )
            .first()
        )
        assert check is not None
        payload = json.loads(check.submitted_payload_json)
        assert payload["date_of_birth"] == "1984-03-21"
        assert payload["client_fingerprint"] == "ENTRYDEVICEALPHA"
        assert payload["country_key"] == "NG"
        assert payload["birth_country_key"] == "NG"
        assert payload["birth_place_key"] == "ABAABIASTATE"
        assert payload["country_of_origin_key"] == "NG"
        assert payload["residential_area_key"] == "WUSE2ABUJA"


def test_entry_create_blocks_second_identity_with_existing_bank_destination(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        existing_user = User(
            email="existing-bank-identity@example.com",
            hashed_password=get_password_hash("secret123"),
            role="user",
            gmfn_id="GMFN-U-BANKMATCH",
            phone_e164="+2348011113030",
            display_name="Existing Bank Identity",
        )
        db.add(existing_user)
        db.flush()
        db.add(
            UserPayoutDestination(
                user_id=int(existing_user.id),
                destination_name="Existing Bank Identity",
                bank_name="Pilot Community Bank",
                account_number="0123456789",
                phone_number="+2348011113030",
                country="NG",
                currency="NGN",
                verification_status="recorded",
                verification_note="Existing pilot record.",
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Second Bank Identity",
            "phone_e164": "+2348011113031",
            "country": "Nigeria",
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
            "destination_name": "Second Bank Identity",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "Nigeria",
            "currency": "NGN",
        },
    )
    assert bank_res.status_code == 200, bank_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Second Bank Identity Circle",
            "country": "Nigeria",
        },
    )
    assert create_res.status_code == 409, create_res.text
    detail = create_res.json()["detail"]
    assert detail["code"] == "entry_identity_match_review_required"
    assert detail["signal"] == "bank_destination_exact_match"
    assert detail["gmfn_id"] == "GMFN-U-BANKMATCH"

    with SessionLocal() as db:
        assert db.query(User).filter(User.phone_e164 == "+2348011113031").first() is None


def test_entry_create_blocks_second_identity_with_existing_official_id(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        existing_user = User(
            email="existing-official-id@example.com",
            hashed_password=get_password_hash("secret123"),
            role="user",
            gmfn_id="GMFN-U-IDMATCH",
            phone_e164="+2348011113040",
            display_name="Existing Official Identity",
        )
        db.add(existing_user)
        db.flush()
        db.add(
            IdentityVerificationCheck(
                user_id=int(existing_user.id),
                verification_type="official_id",
                region_code="NG",
                provider_key="official-id.manual-record",
                status="manual_review_required",
                subject_reference="National Identification Number (NIN)",
                confidence_score=25,
                explanation="Existing official ID evidence.",
                submitted_payload_json=json.dumps(
                    {
                        "document_type": "National Identification Number (NIN)",
                        "document_reference": "12345678901",
                        "country": "Nigeria",
                    }
                ),
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Second Official Identity",
            "phone_e164": "+2348011113041",
            "country": "Nigeria",
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

    official_res = client.post(
        "/entry/official-id/record",
        json={
            "verification_id": start_body["verification_id"],
            "document_type": "National Identification Number (NIN)",
            "document_reference": "12345678901",
            "country": "Nigeria",
            "note": "Same NIN entered with a second phone",
        },
    )
    assert official_res.status_code == 201, official_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Second Official Identity Circle",
            "country": "Nigeria",
        },
    )
    assert create_res.status_code == 409, create_res.text
    detail = create_res.json()["detail"]
    assert detail["code"] == "entry_identity_match_review_required"
    assert detail["signal"] == "official_id_exact_match"
    assert detail["gmfn_id"] == "GMFN-U-IDMATCH"

    with SessionLocal() as db:
        assert db.query(User).filter(User.phone_e164 == "+2348011113041").first() is None


def test_entry_create_blocks_second_identity_with_same_name_dob_profile(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        existing_user = User(
            email="existing-profile-identity@example.com",
            hashed_password=get_password_hash("secret123"),
            role="user",
            gmfn_id="GMFN-U-PROFILEMATCH",
            phone_e164="+2348011113050",
            display_name="Exact Profile Founder",
        )
        db.add(existing_user)
        db.flush()
        db.add(
            IdentityVerificationCheck(
                user_id=int(existing_user.id),
                verification_type="identity_profile",
                region_code="NG",
                provider_key="entry.profile_and_device",
                status="recorded",
                subject_reference="Exact Profile Founder",
                confidence_score=20,
                explanation="Existing registration profile evidence.",
                submitted_payload_json=json.dumps(
                    {
                        "display_name": "Exact Profile Founder",
                        "date_of_birth": "1980-05-14",
                        "country": "Nigeria",
                        "country_key": "NG",
                        "birth_country": "Nigeria",
                        "birth_country_key": "NG",
                        "birth_place": "Aba, Abia State",
                        "birth_place_key": "ABAABIASTATE",
                        "country_of_origin": "Nigeria",
                        "country_of_origin_key": "NG",
                        "residential_area": "Wuse 2, Abuja",
                        "residential_area_key": "WUSE2ABUJA",
                        "client_fingerprint": "EXISTINGDEVICEPROFILE",
                    }
                ),
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Exact Profile Founder",
            "phone_e164": "+2348011113051",
            "email": "second-profile-identity@example.com",
            "country": "Nigeria",
            "date_of_birth": "1980-05-14",
            "birth_country": "Nigeria",
            "birth_place": "Aba, Abia State",
            "country_of_origin": "Nigeria",
            "residential_area": "Wuse 2, Abuja",
            "client_fingerprint": "another-device-profile",
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
            "clan_name": "Second Profile Identity Circle",
            "country": "Nigeria",
            "date_of_birth": "1980-05-14",
            "birth_country": "Nigeria",
            "birth_place": "Aba, Abia State",
            "country_of_origin": "Nigeria",
            "residential_area": "Wuse 2, Abuja",
        },
    )
    assert create_res.status_code == 409, create_res.text
    detail = create_res.json()["detail"]
    assert detail["code"] == "entry_identity_match_review_required"
    assert detail["signal"] == "profile_composite_match"
    assert detail["gmfn_id"] == "GMFN-U-PROFILEMATCH"

    with SessionLocal() as db:
        assert db.query(User).filter(User.phone_e164 == "+2348011113051").first() is None


def test_entry_create_allows_same_name_dob_without_region_profile_match(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        existing_user = User(
            email="existing-common-name@example.com",
            hashed_password=get_password_hash("secret123"),
            role="user",
            gmfn_id="GMFN-U-COMMONNAME",
            phone_e164="+2348011113055",
            display_name="Common Founder Name",
        )
        db.add(existing_user)
        db.flush()
        db.add(
            IdentityVerificationCheck(
                user_id=int(existing_user.id),
                verification_type="identity_profile",
                region_code="NG",
                provider_key="entry.profile_and_device",
                status="recorded",
                subject_reference="Common Founder Name",
                confidence_score=20,
                explanation="Existing registration profile evidence.",
                submitted_payload_json=json.dumps(
                    {
                        "display_name": "Common Founder Name",
                        "date_of_birth": "1991-09-09",
                        "country": "Nigeria",
                        "country_key": "NG",
                    }
                ),
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Common Founder Name",
            "phone_e164": "+2348011113056",
            "email": "second-common-name@example.com",
            "country": "Nigeria",
            "date_of_birth": "1991-09-09",
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
            "clan_name": "Common Name Separate Circle",
            "country": "Nigeria",
            "date_of_birth": "1991-09-09",
        },
    )
    assert create_res.status_code == 201, create_res.text
    assert create_res.json()["phone_e164"] == "+2348011113056"


def test_entry_create_blocks_second_identity_with_same_device_and_dob(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    with SessionLocal() as db:
        existing_user = User(
            email="existing-device-identity@example.com",
            hashed_password=get_password_hash("secret123"),
            role="user",
            gmfn_id="GMFN-U-DEVICEMATCH",
            phone_e164="+2348011113060",
            display_name="Device Profile One",
        )
        db.add(existing_user)
        db.flush()
        db.add(
            IdentityVerificationCheck(
                user_id=int(existing_user.id),
                verification_type="identity_profile",
                region_code="NG",
                provider_key="entry.profile_and_device",
                status="recorded",
                subject_reference="Device Profile One",
                confidence_score=20,
                explanation="Existing registration profile evidence.",
                submitted_payload_json=json.dumps(
                    {
                        "display_name": "Device Profile One",
                        "date_of_birth": "1977-08-02",
                        "country": "Nigeria",
                        "country_key": "NG",
                        "client_fingerprint": "SHAREDDEVICEKEY",
                    }
                ),
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Device Profile Two",
            "phone_e164": "+2348011113061",
            "email": "second-device-identity@example.com",
            "country": "Nigeria",
            "date_of_birth": "1977-08-02",
            "client_fingerprint": "shared-device-key",
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
            "clan_name": "Second Device Identity Circle",
            "country": "Nigeria",
            "date_of_birth": "1977-08-02",
        },
    )
    assert create_res.status_code == 409, create_res.text
    detail = create_res.json()["detail"]
    assert detail["code"] == "entry_identity_match_review_required"
    assert detail["signal"] == "device_profile_dob_match"
    assert detail["gmfn_id"] == "GMFN-U-DEVICEMATCH"

    with SessionLocal() as db:
        assert db.query(User).filter(User.phone_e164 == "+2348011113061").first() is None


def test_entry_community_name_check_reports_existing_name(client):
    with SessionLocal() as db:
        owner = User(email="name-owner@example.com", hashed_password="hashed", role="admin")
        db.add(owner)
        db.flush()
        db.add(
            Clan(
                name="Existing Founder Circle",
                invite_code="existing-founder-circle",
                community_code="GMFN-C-EXISTING",
                created_by_user_id=int(owner.id),
                status="active",
            )
        )
        db.commit()

    taken_res = client.get(
        "/entry/community-name/check",
        params={"clan_name": "existing founder circle"},
    )
    assert taken_res.status_code == 200, taken_res.text
    taken_body = taken_res.json()
    assert taken_body["available"] is False
    assert taken_body["code"] == "entry_community_name_taken"
    assert "Request to join" in taken_body["message"]

    available_res = client.get(
        "/entry/community-name/check",
        params={"clan_name": "Fresh Available Circle"},
    )
    assert available_res.status_code == 200, available_res.text
    assert available_res.json()["available"] is True


def test_entry_create_duplicate_community_name_returns_structured_recovery(client):
    with SessionLocal() as db:
        owner = User(email="duplicate-owner@example.com", hashed_password="hashed", role="admin")
        db.add(owner)
        db.flush()
        db.add(
            Clan(
                name="Duplicate Founder Circle",
                invite_code="duplicate-founder-circle",
                community_code="GMFN-C-DUPLICATE",
                created_by_user_id=int(owner.id),
                status="active",
            )
        )
        db.commit()

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Duplicate Founder",
            "phone_e164": "+2348011111011",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "duplicate founder circle",
        },
    )
    assert create_res.status_code == 409, create_res.text
    detail = create_res.json()["detail"]
    assert detail["code"] == "entry_community_name_taken"
    assert detail["next_action"] == "rename_or_join_existing"
    assert "different name" in detail["message"]


def test_entry_records_country_and_official_id_without_provider_verification(client, monkeypatch):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.delenv("GMFN_ENTRY_PHONE_DELIVERY", raising=False)

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "NIN Founder",
            "phone_e164": "+2348011111112",
            "email": "nin.founder@example.com",
            "country": "Nigeria",
        },
    )
    assert start_res.status_code == 201, start_res.text
    verification_id = start_res.json()["verification_id"]

    official_res = client.post(
        "/entry/official-id/record",
        json={
            "verification_id": verification_id,
            "document_type": "National Identification Number (NIN)",
            "document_reference": "12345678901",
            "country": "Nigeria",
            "note": "Pilot NIN evidence only",
        },
    )
    assert official_res.status_code == 201, official_res.text
    official_body = official_res.json()
    assert official_body["verification_type"] == "official_id"
    assert official_body["status"] == "manual_review_required"
    assert official_body["provider_key"] == "official-id.manual-record"

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": verification_id,
            "clan_name": "NIN Founder Circle",
            "email": "nin.founder@example.com",
            "country": "Nigeria",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    with SessionLocal() as db:
        check = (
            db.query(IdentityVerificationCheck)
            .filter(
                IdentityVerificationCheck.user_id == create_body["user_id"],
                IdentityVerificationCheck.verification_type == "official_id",
            )
            .one()
        )
        assert check.status == "manual_review_required"
        assert check.verified_at is None
        official_event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.subject_user_id == create_body["user_id"],
                TrustEvent.event_type == "identity.official_id_recorded",
            )
            .one()
        )
        assert "provider_verified" in str(check.provider_response_json)
        assert "National Identification Number" in str(official_event.meta_json or official_event.meta)


def test_entry_phone_sms_mode_can_be_reenabled_without_preview(client, monkeypatch):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.setenv("GMFN_ENTRY_PHONE_DELIVERY", "sms")

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Live SMS Tester",
            "phone_e164": "+2348011111011",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    assert start_body["delivery_mode"] == "pending-sms"
    assert start_body["otp_preview"] is None
    assert start_body["registered_only"] is False
    assert start_body["verified"] is False


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


def test_entry_phone_resume_check_is_safe_and_expiry_aware(client, monkeypatch):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.delenv("GMFN_ENTRY_PHONE_DELIVERY", raising=False)

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Resume Tester",
            "phone_e164": "+2348011111212",
            "email": "resume-tester@example.com",
        },
    )
    assert start_res.status_code == 201, start_res.text
    verification_id = start_res.json()["verification_id"]

    active_res = client.post(
        "/entry/phone/resume",
        json={
            "verification_id": verification_id,
            "phone_e164": "+2348011111212",
        },
    )
    assert active_res.status_code == 200, active_res.text
    active_body = active_res.json()
    assert active_body["ok"] is True
    assert active_body["can_continue"] is True
    assert active_body["status"] == "active"
    assert active_body["registered_only"] is True
    assert "phone_e164" not in active_body
    assert "email" not in active_body
    assert "otp_preview" not in active_body

    mismatch_res = client.post(
        "/entry/phone/resume",
        json={
            "verification_id": verification_id,
            "phone_e164": "+2348011119999",
        },
    )
    assert mismatch_res.status_code == 200, mismatch_res.text
    mismatch_body = mismatch_res.json()
    assert mismatch_body["ok"] is False
    assert mismatch_body["status"] == "not_found"
    assert mismatch_body["can_continue"] is False

    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, verification_id)
        row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.add(row)
        db.commit()

    expired_res = client.post(
        "/entry/phone/resume",
        json={
            "verification_id": verification_id,
            "phone_e164": "+2348011111212",
        },
    )
    assert expired_res.status_code == 200, expired_res.text
    expired_body = expired_res.json()
    assert expired_body["ok"] is False
    assert expired_body["status"] == "expired"
    assert expired_body["can_continue"] is False


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

    local_phone_login_res = client.post(
        "/auth/login",
        data={
            "username": "08012345678",
            "password": "secret123",
        },
    )
    assert local_phone_login_res.status_code == 200, local_phone_login_res.text

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
    assert explained_body["starter_evidence_summary"]["phone_verified"] is True
    assert explained_body["starter_evidence_summary"]["bank_recorded"] is True
    assert (
        explained_body["starter_evidence_summary"]["drivers_licence_recorded"] is True
    )
    assert explained_body["starter_evidence_summary"]["region_consistent"] is True
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
                role="user",
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
    assert old_login_res.json()["gmfn_id"] == "GMFN-U-ACTIVE1"

    new_login_res = client.post(
        "/auth/login",
        data={
            "username": "active.member@example.com",
            "password": "new-secret",
        },
    )
    assert new_login_res.status_code == 401, new_login_res.text


def test_admin_phone_lineage_lookup_identifies_protected_owner(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"

    with SessionLocal() as db:
        admin = User(
            email="lineage-admin@example.com",
            hashed_password=get_password_hash("admin-secret"),
            role="admin",
        )
        owner = User(
            email="lineage-owner@example.com",
            hashed_password=get_password_hash("owner-secret"),
            role="user",
            gmfn_id="GMFN-U-LINEAGE1",
            display_name="Lineage Owner",
            phone_e164="+447903165266",
            phone_verified_at=datetime.now(timezone.utc),
        )
        db.add_all([admin, owner])
        db.flush()
        clan = Clan(
            name="Lineage Owner Circle",
            invite_code="lineage-owner-circle",
            community_code="GMFN-C-LINEAGE",
            created_by_user_id=int(owner.id),
            status="active",
        )
        db.add(clan)
        db.flush()
        db.add(
            ClanMembership(
                clan_id=int(clan.id),
                user_id=int(owner.id),
                role="admin",
            )
        )
        db.commit()

    owner_login = client.post(
        "/auth/login",
        data={"username": "lineage-owner@example.com", "password": "owner-secret"},
    )
    assert owner_login.status_code == 200, owner_login.text
    owner_token = owner_login.json()["access_token"]

    forbidden = client.get(
        "/identity-risk/admin/phone-lineage",
        params={"phone_e164": "+447903165266"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert forbidden.status_code == 403, forbidden.text

    admin_login = client.post(
        "/auth/login",
        data={"username": "lineage-admin@example.com", "password": "admin-secret"},
    )
    assert admin_login.status_code == 200, admin_login.text
    admin_token = admin_login.json()["access_token"]

    res = client.get(
        "/identity-risk/admin/phone-lineage",
        params={"phone_e164": "+447903165266"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["lineage_note"].startswith("Read-only admin diagnostic")
    assert body["match_count"] == 1
    row = body["matches"][0]
    assert row["gmfn_id"] == "GMFN-U-LINEAGE1"
    assert row["phone_verified"] is True
    assert row["protection_state"] == "active_or_protected"
    assert row["active_membership_count"] == 1
    assert row["created_community_count"] == 1
    assert "Sign in to this GSN ID" in row["recommended_first_step"]


def test_admin_phone_lineage_lookup_reports_pending_join_owner(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"

    with SessionLocal() as db:
        admin = User(
            email="pending-lineage-admin@example.com",
            hashed_password=get_password_hash("admin-secret"),
            role="admin",
        )
        applicant = User(
            email="pending-lineage@example.com",
            hashed_password="PENDING_APPROVAL",
            role="user",
            gmfn_id="GMFN-U-PENDING-LINE",
            phone_e164="+447903165267",
        )
        owner = User(
            email="pending-lineage-owner@example.com",
            hashed_password=get_password_hash("owner-secret"),
            role="admin",
        )
        db.add_all([admin, applicant, owner])
        db.flush()
        clan = Clan(
            name="Pending Lineage Circle",
            invite_code="pending-lineage-circle",
            community_code="GMFN-C-PENDLINE",
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

    admin_login = client.post(
        "/auth/login",
        data={"username": "pending-lineage-admin@example.com", "password": "admin-secret"},
    )
    assert admin_login.status_code == 200, admin_login.text
    admin_token = admin_login.json()["access_token"]

    res = client.get(
        "/identity-risk/admin/phone-lineage",
        params={"phone_e164": "+447903165267"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200, res.text
    row = res.json()["matches"][0]
    assert row["gmfn_id"] == "GMFN-U-PENDING-LINE"
    assert row["activation_pending"] is True
    assert row["protection_state"] == "pending_join_or_create"
    assert row["pending_join_request_count"] == 1
    assert row["join_request_counts"]["pending"] == 1
    assert "activation path" in row["recommended_first_step"]


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


def test_entry_create_allows_community_creation_without_bank_details(client):
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
            "email": "market.chair@example.com",
            "password": "strongpass",
            "confirm_password": "strongpass",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    with SessionLocal() as db:
        user = db.query(User).filter(User.id == create_body["user_id"]).one()
        assert user.phone_verified_at is not None
        payout = (
            db.query(UserPayoutDestination)
            .filter(UserPayoutDestination.user_id == create_body["user_id"])
            .first()
        )
        assert payout is None
        bank_event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.subject_user_id == create_body["user_id"],
                TrustEvent.event_type == "identity.bank_destination_recorded",
            )
            .first()
        )
        assert bank_event is None


def test_entry_identity_photo_becomes_trust_passport_image_source(client, monkeypatch):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.delenv("GMFN_ENTRY_PHONE_DELIVERY", raising=False)
    monkeypatch.setenv("GMFN_DEV_MODE", "1")
    upload_root = Path("test_uploads/entry_photo")
    upload_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Photo Founder",
            "phone_e164": "+447700900444",
            "email": "photo.founder@example.com",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()
    verification_id = start_body["verification_id"]

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": verification_id,
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    photo_res = client.post(
        "/entry/identity-photo/record",
        data={
            "verification_id": str(verification_id),
            "document_type": "selfie",
            "note": "Founder face photo for continuity",
        },
        files={
            "file": (
                "selfie.png",
                b"\x89PNG\r\n\x1a\nfounder-selfie-bytes",
                "image/png",
            )
        },
    )
    assert photo_res.status_code == 201, photo_res.text
    photo_body = photo_res.json()
    assert photo_body["verification_type"] == "identity_photo"
    assert photo_body["status"] == "manual_review_required"
    assert photo_body["evidence_url"].startswith("/uploads/entry/identity/")

    early_review_res = client.post(
        f"/admin/identity-verification-checks/{photo_body['verification_check_id']}/decision",
        json={
            "decision": "verify",
            "reviewer_note": "This must not be accepted before a user exists.",
        },
    )
    assert early_review_res.status_code == 400, early_review_res.text
    assert "account creation" in early_review_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": verification_id,
            "clan_name": "Photo Founder Circle",
            "email": "photo.founder@example.com",
            "password": "strongpass",
            "confirm_password": "strongpass",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    with SessionLocal() as db:
        user = db.query(User).filter(User.id == create_body["user_id"]).one()
        assert user.profile_image_url == photo_body["evidence_url"]
        check = (
            db.query(IdentityVerificationCheck)
            .filter(
                IdentityVerificationCheck.user_id == create_body["user_id"],
                IdentityVerificationCheck.verification_type == "identity_photo",
            )
            .one()
        )
        assert check.status == "manual_review_required"
        photo_event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.subject_user_id == create_body["user_id"],
                TrustEvent.event_type == "identity.photo_evidence_recorded",
            )
            .one()
        )
        assert "provider-verified" in str(photo_event.meta_json or photo_event.meta)

    review_res = client.post(
        f"/admin/identity-verification-checks/{photo_body['verification_check_id']}/decision",
        json={
            "decision": "verify",
            "reviewer_note": "Photo is clear enough for manual identity-continuity review.",
        },
    )
    assert review_res.status_code == 200, review_res.text
    review_body = review_res.json()
    assert review_body["status"] == "matched"
    assert review_body["decision"] == "verify"
    assert review_body["provider_response"]["provider_verified"] is False
    assert review_body["provider_response"]["manual_review"] is True
    assert review_body["trust_summary"]["counts"]["identity_photo_verified"] == 1
    assert (
        review_body["trust_summary"]["starter_evidence_summary"]["photo_evidence_verified"]
        is True
    )
    assert review_body["trust_summary"]["starter_proof_summary"]["photo_evidence_verified"] is True

    with SessionLocal() as db:
        reviewed_check = (
            db.query(IdentityVerificationCheck)
            .filter(
                IdentityVerificationCheck.user_id == create_body["user_id"],
                IdentityVerificationCheck.verification_type == "identity_photo",
            )
            .one()
        )
        assert reviewed_check.status == "matched"
        assert reviewed_check.verified_at is not None
        verified_event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.subject_user_id == create_body["user_id"],
                TrustEvent.event_type == "identity.photo_evidence_verified",
            )
            .one()
        )
        verified_meta = str(verified_event.meta_json or verified_event.meta)
        assert '"provider_verified": false' in verified_meta
        assert '"manual_review": true' in verified_meta

    correction_res = client.post(
        f"/admin/identity-verification-checks/{photo_body['verification_check_id']}/correction",
        json={
            "reason": "Reviewer reopened this because the photo must be checked again.",
        },
    )
    assert correction_res.status_code == 200, correction_res.text
    correction_body = correction_res.json()
    assert correction_body["status"] == "manual_review_required"
    assert correction_body["decision"] == "reopened"
    assert correction_body["previous_decision"] == "verify"
    assert correction_body["provider_response"]["review_decision"] == "reopened"
    assert correction_body["trust_summary"]["counts"]["identity_photo_verified"] == 1
    assert correction_body["trust_summary"]["counts"]["identity_photo_verified_reversed"] == 1
    assert correction_body["trust_summary"]["counts"]["identity_photo_verified_net"] == 0
    assert (
        correction_body["trust_summary"]["starter_evidence_summary"]["photo_evidence_verified"]
        is False
    )
    assert (
        correction_body["trust_summary"]["starter_evidence_summary"][
            "photo_evidence_verified_reversed"
        ]
        is True
    )
    assert correction_body["trust_summary"]["starter_proof_summary"]["photo_evidence_verified"] is False
    assert correction_body["trust_summary"]["starter_proof_summary"]["photo_evidence_verified_reversed"] is True

    needs_more_res = client.post(
        f"/admin/identity-verification-checks/{photo_body['verification_check_id']}/decision",
        json={
            "decision": "needs_more",
            "reviewer_note": "Second review needs a clearer identity continuity photo.",
        },
    )
    assert needs_more_res.status_code == 200, needs_more_res.text
    needs_more_body = needs_more_res.json()
    assert needs_more_body["status"] == "manual_review_required"
    assert needs_more_body["trust_summary"]["counts"]["identity_photo_needs_more"] == 1
    assert needs_more_body["trust_summary"]["counts"]["identity_photo_needs_more_active"] == 1
    assert (
        needs_more_body["trust_summary"]["starter_evidence_summary"][
            "photo_evidence_needs_more"
        ]
        is True
    )
    assert needs_more_body["trust_summary"]["starter_proof_summary"]["photo_evidence_needs_more"] is True

    rereview_res = client.post(
        f"/admin/identity-verification-checks/{photo_body['verification_check_id']}/decision",
        json={
            "decision": "verify",
            "reviewer_note": "Second review accepted the clearer identity continuity evidence.",
        },
    )
    assert rereview_res.status_code == 200, rereview_res.text
    rereview_body = rereview_res.json()
    assert rereview_body["status"] == "matched"
    assert rereview_body["trust_summary"]["counts"]["identity_photo_verified"] == 2
    assert rereview_body["trust_summary"]["counts"]["identity_photo_verified_reversed"] == 1
    assert rereview_body["trust_summary"]["counts"]["identity_photo_verified_net"] == 1
    assert rereview_body["trust_summary"]["counts"]["identity_photo_needs_more_active"] == 0
    assert rereview_body["trust_summary"]["latest_source"] == "identity.photo_evidence_verified"
    assert (
        rereview_body["trust_summary"]["starter_evidence_summary"]["photo_evidence_verified"]
        is True
    )
    assert (
        rereview_body["trust_summary"]["starter_evidence_summary"][
            "photo_evidence_needs_more"
        ]
        is False
    )
    assert rereview_body["trust_summary"]["starter_proof_summary"]["photo_evidence_verified"] is True
    assert rereview_body["trust_summary"]["starter_proof_summary"]["photo_evidence_needs_more"] is False

    with SessionLocal() as db:
        reversed_event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.subject_user_id == create_body["user_id"],
                TrustEvent.event_type == "identity.photo_evidence_verified_reversed",
            )
            .one()
        )
        reversed_meta = str(reversed_event.meta_json or reversed_event.meta)
        assert '"previous_decision": "verify"' in reversed_meta
        assert '"next_review_cycle": 2' in reversed_meta

        second_check = IdentityVerificationCheck(
            user_id=create_body["user_id"],
            verification_type="identity_photo",
            provider_key="manual_founder_photo",
            status="manual_review_required",
            confidence_score=25,
            explanation="Second manual photo check for correction coverage.",
            provider_response_json=json.dumps(
                {
                    "evidence_url": "/uploads/entry/identity/rejected-later.png",
                    "provider_configured": False,
                    "provider_verified": False,
                    "manual_review": True,
                    "review_cycle": 1,
                }
            ),
        )
        db.add(second_check)
        db.commit()
        db.refresh(second_check)
        second_check_id = int(second_check.id)

    reject_res = client.post(
        f"/admin/identity-verification-checks/{second_check_id}/decision",
        json={
            "decision": "reject",
            "reviewer_note": "Second check is not clear enough.",
        },
    )
    assert reject_res.status_code == 200, reject_res.text
    reject_body = reject_res.json()
    assert reject_body["trust_summary"]["counts"]["identity_photo_rejected"] == 1
    assert reject_body["trust_summary"]["counts"]["identity_photo_rejected_active"] == 1
    assert (
        reject_body["trust_summary"]["starter_evidence_summary"]["photo_evidence_rejected"]
        is True
    )
    assert reject_body["trust_summary"]["starter_proof_summary"]["photo_evidence_rejected"] is True

    reject_correction_res = client.post(
        f"/admin/identity-verification-checks/{second_check_id}/correction",
        json={
            "reason": "Reopening rejected photo check for corrected evidence path.",
        },
    )
    assert reject_correction_res.status_code == 200, reject_correction_res.text
    reject_correction_body = reject_correction_res.json()
    assert reject_correction_body["trust_summary"]["counts"]["identity_photo_rejected"] == 1
    assert reject_correction_body["trust_summary"]["counts"]["identity_photo_rejected_active"] == 0
    assert (
        reject_correction_body["trust_summary"]["starter_evidence_summary"][
            "photo_evidence_rejected"
        ]
        is False
    )
    assert reject_correction_body["trust_summary"]["starter_proof_summary"]["photo_evidence_rejected"] is False


def test_entry_identity_photo_allows_five_records_and_caps_session(client, monkeypatch):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.delenv("GMFN_ENTRY_PHONE_DELIVERY", raising=False)
    upload_root = Path("test_uploads/entry_photo_five")
    upload_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Five Photo Founder",
            "phone_e164": "+2348011111113",
            "email": "five.photo@example.com",
            "country": "Nigeria",
        },
    )
    assert start_res.status_code == 201, start_res.text
    verification_id = start_res.json()["verification_id"]

    photo_ids = []
    for index in range(5):
        photo_res = client.post(
            "/entry/identity-photo/record",
            data={
                "verification_id": str(verification_id),
                "document_type": "selfie",
                "note": f"Photo {index + 1}",
            },
            files={
                "file": (
                    f"selfie-{index + 1}.png",
                    b"\x89PNG\r\n\x1a\nfounder-selfie-bytes-" + str(index).encode(),
                    "image/png",
                )
            },
        )
        assert photo_res.status_code == 201, photo_res.text
        photo_ids.append(photo_res.json()["verification_check_id"])

    overflow_res = client.post(
        "/entry/identity-photo/record",
        data={
            "verification_id": str(verification_id),
            "document_type": "selfie",
            "note": "Overflow photo",
        },
        files={
            "file": (
                "selfie-6.png",
                b"\x89PNG\r\n\x1a\noverflow-selfie-bytes",
                "image/png",
            )
        },
    )
    assert overflow_res.status_code == 400, overflow_res.text
    assert "maximum of 5" in overflow_res.text.lower()

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": verification_id,
            "clan_name": "Five Photo Founder Circle",
            "email": "five.photo@example.com",
            "password": "strongpass",
            "confirm_password": "strongpass",
            "country": "Nigeria",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    with SessionLocal() as db:
        checks = (
            db.query(IdentityVerificationCheck)
            .filter(
                IdentityVerificationCheck.user_id == create_body["user_id"],
                IdentityVerificationCheck.verification_type == "identity_photo",
            )
            .all()
        )
        assert len(checks) == 5
        assert {check.id for check in checks} == set(photo_ids)


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
