from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.api.routes import entry as entry_routes
from app.api.routes import entry_verification as signed_entry_routes
from app.db.database import SessionLocal
from app.db.models import EntryPhoneVerification, User
from app.services.phone_verification_service import (
    PIPELINE_WORKFLOW_KEY,
    TWILIO_PROVIDER_KEY,
    PhoneVerificationServiceError,
    provider_delivery_context,
)


def _accept_provider_delivery(db, row, **_kwargs):
    row.provider_key = TWILIO_PROVIDER_KEY
    row.provider_verification_id = f"VE-route-{int(row.id)}"
    row.provider_status = "pending"
    row.provider_send_attempts = int(row.provider_send_attempts or 0) + 1
    row.last_provider_send_attempt_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    db.refresh(row)
    return provider_delivery_context(row)


def test_public_live_provider_start_and_confirm_use_provider_receipt(
    client: TestClient,
    monkeypatch,
):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.setenv("GMFN_ENTRY_PHONE_DELIVERY", "sms")
    monkeypatch.setattr(entry_routes, "begin_live_phone_verification", _accept_provider_delivery)

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Live Route Tester",
            "phone_e164": "+447700900701",
        },
    )

    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()
    assert start_body["delivery_mode"] == "pending-sms"
    assert start_body["otp_preview"] is None
    assert start_body["provider_key"] == TWILIO_PROVIDER_KEY
    assert start_body["workflow_key"] == PIPELINE_WORKFLOW_KEY
    assert start_body["provider_delivery_status"] == "pending"

    seen = {}

    def approve_provider_code(db, row, code):
        seen["verification_id"] = int(row.id)
        seen["code"] = code
        return True

    monkeypatch.setattr(entry_routes, "confirm_live_phone_verification", approve_provider_code)
    confirm_res = client.post(
        "/entry/phone/confirm",
        json={"verification_id": start_body["verification_id"], "code": "701701"},
    )

    assert confirm_res.status_code == 200, confirm_res.text
    assert confirm_res.json()["verified"] is True
    assert seen == {
        "verification_id": start_body["verification_id"],
        "code": "701701",
    }
    with SessionLocal() as db:
        row = db.get(EntryPhoneVerification, start_body["verification_id"])
        assert row is not None
        assert row.verified_at is not None
        assert row.code is None
        assert row.code_digest is None


def test_public_resend_returns_retry_after_header(client: TestClient, monkeypatch):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.setenv("GMFN_ENTRY_PHONE_DELIVERY", "sms")
    monkeypatch.setattr(entry_routes, "begin_live_phone_verification", _accept_provider_delivery)
    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Resend Route Tester",
            "phone_e164": "+447700900702",
        },
    )
    assert start_res.status_code == 201, start_res.text

    def reject_early_resend(*_args, **_kwargs):
        raise PhoneVerificationServiceError(
            "phone_resend_too_soon",
            "Please wait before asking GSN to send another code.",
            status_code=429,
            retry_after_seconds=47,
        )

    monkeypatch.setattr(entry_routes, "begin_live_phone_verification", reject_early_resend)
    resend_res = client.post(
        "/entry/phone/resend",
        json={
            "verification_id": start_res.json()["verification_id"],
            "phone_e164": "+447700900702",
        },
    )

    assert resend_res.status_code == 429, resend_res.text
    assert resend_res.headers["retry-after"] == "47"
    assert resend_res.json()["detail"] == {
        "code": "phone_resend_too_soon",
        "message": "Please wait before asking GSN to send another code.",
        "retry_after_seconds": 47,
    }


def test_signed_in_live_provider_does_not_attach_phone_before_confirmation(
    client: TestClient,
    monkeypatch,
    override_current_user_user,
    seed_clan_member_membership,
):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.setenv("GMFN_ENTRY_PHONE_DELIVERY", "sms")
    monkeypatch.setattr(
        signed_entry_routes,
        "begin_live_phone_verification",
        _accept_provider_delivery,
    )

    start_res = client.post(
        "/entry/signed-in/phone/start",
        json={"phone_e164": "+447700900703", "country": "GB"},
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()
    assert start_body["delivery_mode"] == "pending-sms"
    assert start_body["otp_preview"] is None
    assert start_body["provider_key"] == TWILIO_PROVIDER_KEY
    assert start_body["provider_delivery_status"] == "pending"
    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        assert user.phone_e164 is None
        assert user.phone_verified_at is None

    monkeypatch.setattr(
        signed_entry_routes,
        "confirm_live_phone_verification",
        lambda db, row, code: code == "703703",
    )
    confirm_res = client.post(
        "/entry/signed-in/phone/confirm",
        json={"verification_id": start_body["verification_id"], "code": "703703"},
    )

    assert confirm_res.status_code == 200, confirm_res.text
    assert confirm_res.json()["verified"] is True
    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        assert user.phone_e164 == "+447700900703"
        assert user.phone_verified_at is not None


def test_signed_in_phone_session_owner_isolation_precedes_confirm_and_resend(
    client: TestClient,
    monkeypatch,
    override_current_user_user,
    seed_clan_member_membership,
):
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    monkeypatch.setenv("GMFN_ENTRY_PHONE_DELIVERY", "sms")
    with SessionLocal() as db:
        row = EntryPhoneVerification(
            display_name="Different Owner",
            phone_e164="+447700900704",
            email="user2@example.com",
            owner_user_id=2,
            code=None,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        verification_id = int(row.id)

    def provider_must_not_run(*_args, **_kwargs):
        raise AssertionError("provider must not run for another user's session")

    monkeypatch.setattr(
        signed_entry_routes,
        "confirm_live_phone_verification",
        provider_must_not_run,
    )
    monkeypatch.setattr(
        signed_entry_routes,
        "begin_live_phone_verification",
        provider_must_not_run,
    )

    confirm_res = client.post(
        "/entry/signed-in/phone/confirm",
        json={"verification_id": verification_id, "code": "704704"},
    )
    resend_res = client.post(
        "/entry/signed-in/phone/resend",
        json={"verification_id": verification_id},
    )

    assert confirm_res.status_code == 403, confirm_res.text
    assert resend_res.status_code == 403, resend_res.text
    expected = "Phone verification session does not belong to this user"
    assert confirm_res.json()["detail"] == expected
    assert resend_res.json()["detail"] == expected
