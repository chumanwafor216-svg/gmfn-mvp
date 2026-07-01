from app.db.database import SessionLocal
from app.db.models import TrustEvent
from app.db.verification_models import IdentityVerificationCheck


def test_entry_identity_verification_rejects_coerced_public_controls_before_check_write(client):
    bank_res = client.post(
        "/entry/bank/verify",
        json={
            "verification_id": True,
            "destination_name": "Pilot Member",
            "bank_name": "Pilot Bank",
            "account_number": 12345678,
            "country": "GB",
        },
    )
    assert bank_res.status_code == 422, bank_res.text

    official_res = client.post(
        "/entry/official-id/record",
        json={
            "verification_id": 1.0,
            "document_type": "Passport",
            "document_reference": 1234567,
            "country": True,
        },
    )
    assert official_res.status_code == 422, official_res.text

    with SessionLocal() as db:
        assert db.query(IdentityVerificationCheck).count() == 0


def test_signed_in_identity_verification_rejects_coerced_controls_before_writes(
    client,
    override_current_user_user,
):
    with SessionLocal() as db:
        existing_check_count = db.query(IdentityVerificationCheck).count()
        existing_event_count = (
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == 1)
            .filter(
                TrustEvent.event_type.in_(
                    [
                        "identity.phone_registered",
                        "identity.phone_verified",
                        "identity.official_id_recorded",
                    ]
                )
            )
            .count()
        )

    start_res = client.post(
        "/entry/signed-in/phone/start",
        json={"phone_e164": 447700900123, "country": ["GB"]},
    )
    assert start_res.status_code == 422, start_res.text

    confirm_res = client.post(
        "/entry/signed-in/phone/confirm",
        json={"verification_id": True, "code": 123456},
    )
    assert confirm_res.status_code == 422, confirm_res.text

    official_res = client.post(
        "/entry/signed-in/official-id/record",
        json={
            "document_type": 12345,
            "document_reference": False,
            "country": "GB",
        },
    )
    assert official_res.status_code == 422, official_res.text

    with SessionLocal() as db:
        assert db.query(IdentityVerificationCheck).count() == existing_check_count
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == 1)
            .filter(
                TrustEvent.event_type.in_(
                    [
                        "identity.phone_registered",
                        "identity.phone_verified",
                        "identity.official_id_recorded",
                    ]
                )
            )
            .count()
        ) == existing_event_count
