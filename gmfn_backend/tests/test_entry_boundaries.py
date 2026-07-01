from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    EntryPhoneVerification,
    TrustEvent,
    User,
    UserPayoutDestination,
)
from app.db.verification_models import IdentityVerificationCheck


def test_entry_phone_start_rejects_non_text_payload_before_session_write(client):
    response = client.post(
        "/entry/phone/start",
        json={
            "display_name": True,
            "phone_e164": 2348011111010,
            "country": {"code": "NG"},
        },
    )

    assert response.status_code == 422, response.text
    assert "display_name must be text" in response.text
    assert "phone_e164 must be text" in response.text
    assert "country must be text" in response.text

    with SessionLocal() as db:
        assert db.query(EntryPhoneVerification).count() == 0
        assert db.query(IdentityVerificationCheck).count() == 0


def test_entry_phone_confirm_and_resume_reject_malformed_payload_before_mutation(client):
    start = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Boundary Founder",
            "phone_e164": "+2348011111919",
        },
    )
    assert start.status_code == 201, start.text
    verification_id = start.json()["verification_id"]

    confirm = client.post(
        "/entry/phone/confirm",
        json={"verification_id": True, "code": 1234},
    )
    assert confirm.status_code == 422, confirm.text
    assert "verification_id must be an integer" in confirm.text
    assert "code must be text" in confirm.text

    resume = client.post(
        "/entry/phone/resume",
        json={"verification_id": 1.5, "phone_e164": False},
    )
    assert resume.status_code == 422, resume.text
    assert "verification_id must be an integer" in resume.text
    assert "phone_e164 must be text" in resume.text

    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, verification_id)
        assert row is not None
        assert row.verified_at is None
        assert row.consumed_at is None


def test_entry_bank_details_rejects_non_text_payload_before_bank_mutation(client):
    start = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Boundary Bank Founder",
            "phone_e164": "+2348011112021",
        },
    )
    assert start.status_code == 201, start.text
    verification_id = start.json()["verification_id"]

    response = client.post(
        "/entry/bank-details",
        json={
            "verification_id": verification_id,
            "destination_name": True,
            "bank_name": "Pilot Community Bank",
            "account_number": 1234567890,
            "country": {"code": "NG"},
        },
    )

    assert response.status_code == 422, response.text
    assert "destination_name must be text" in response.text
    assert "account_number must be text" in response.text
    assert "country must be text" in response.text

    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, verification_id)
        assert row is not None
        assert row.bank_details_recorded_at is None
        assert row.bank_account_name is None
        assert row.bank_account_number is None
        assert db.query(UserPayoutDestination).count() == 0


def test_entry_create_rejects_malformed_payload_before_user_clan_trust_writes(client):
    start = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Boundary Create Founder",
            "phone_e164": "+2348011113030",
        },
    )
    assert start.status_code == 201, start.text
    verification_id = start.json()["verification_id"]

    response = client.post(
        "/entry/create",
        json={
            "verification_id": verification_id,
            "clan_name": True,
            "clan_description": 1.5,
            "password": 123456,
            "confirm_password": 123456,
        },
    )

    assert response.status_code == 422, response.text
    assert "clan_name must be text" in response.text
    assert "clan_description must be text" in response.text
    assert "password must be text" in response.text
    assert "confirm_password must be text" in response.text

    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, verification_id)
        assert row is not None
        assert row.consumed_at is None
        assert db.query(User).count() == 0
        assert db.query(Clan).count() == 0
        assert db.query(UserPayoutDestination).count() == 0
        assert db.query(TrustEvent).count() == 0
