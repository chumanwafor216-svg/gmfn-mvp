from __future__ import annotations

import io
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import Clan, ClanMembership, TrustEvent, TrustSlip, User, UserPayoutDestination
from app.db.verification_models import IdentityVerificationCheck
from app.api.routes.trust_slips import _public_visibility_level
from app.services.trust_slips_services import get_trust_slip_payload, issue_trust_slip_for_user


def test_focus_commitment_route_logs_deduped_trust_event(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    payload = {
        "clan_id": 1,
        "local_commitment_id": "focus-local-1",
        "local_event_id": "focus-event-local-1",
        "event_kind": "complete",
        "title": "Save for workshop transport",
        "category": "savings",
        "target_value": 100.0,
        "current_value": 100.0,
        "progress_value": 100.0,
        "unit": "NGN",
        "due_date": "2026-05-20",
        "cadence": "weekly",
        "note": "Marked as completed",
    }

    first = client.post("/trust-events/me/focus-commitment", json=payload)
    assert first.status_code == 200, first.text
    first_data = first.json()
    assert first_data["ok"] is True
    assert first_data["event_type"] == "commitment.completed"

    second = client.post("/trust-events/me/focus-commitment", json=payload)
    assert second.status_code == 200, second.text
    assert second.json()["event_id"] == first_data["event_id"]

    with SessionLocal() as db:
        rows = db.query(TrustEvent).all()
        assert len(rows) == 1
        row = rows[0]
        assert row.event_type == "commitment.completed"
        assert row.actor_user_id == 1
        assert row.subject_user_id == 1
        assert row.clan_id == 1
        meta = json.loads(row.meta_json or "{}")
        assert meta["source"] == "dashboard_focus_commitment"
        assert meta["local_commitment_id"] == "focus-local-1"
        assert meta["local_event_id"] == "focus-event-local-1"
        assert meta["trust_delta"] == "0.00"
        assert "personal commitment event" in meta["reader_note"]


def test_trust_passport_identity_context_uses_signed_in_payout_and_membership(
    override_current_user_user,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        user.phone_e164 = "+447700900123"
        user.phone_verified_at = datetime.now(timezone.utc)
        db.add(
            UserPayoutDestination(
                user_id=1,
                destination_name="Ada Member",
                bank_name="Pilot Bank",
                account_number="12345678",
                phone_number="+447700900123",
                country="GB",
                currency="GBP",
                verification_status="phone_verified_bank_recorded",
                verification_note="Recorded in signed-in payout details.",
            )
        )
        db.add(
            Clan(
                id=2,
                name="Second Circle",
                marketplace_name="Second Circle Marketplace",
                community_code="GMFN-C-000002",
                invite_code="second-circle-invite",
            )
        )
        db.add(
            ClanMembership(
                clan_id=2,
                user_id=1,
                role="admin",
            )
        )
        db.commit()

        payload = get_trust_slip_payload(db, user_id=1)

    identity_context = payload["identity_context"]
    assert identity_context["phone_verified"] is True
    assert identity_context["bank_details_recorded"] is True
    assert identity_context["bank_verified"] is False
    assert identity_context["bank_evidence_status"] == "recorded"
    assert identity_context["bank_verification_label"] == "Bank destination recorded in payout details"
    assert identity_context["community_identity_confirmed"] is True
    assert payload["identity_evidence_summary"]["score"] >= 60
    assert "bank" in payload["identity_evidence_summary"]["pending_verification"]
    assert payload["active_clan_count"] >= 1
    assert payload["active_community_count"] == 2
    footprint = payload["community_footprint"]
    assert len(footprint) == 2
    assert {item["community_code"] for item in footprint} == {
        "GMFN-C-000001",
        "GMFN-C-000002",
    }
    assert {item["role"] for item in footprint} == {"user", "admin"}
    assert payload["community_role_counts"] == {"member": 1, "admin": 1}


def test_trust_passport_identity_context_uses_bank_recorded_trust_event(
    override_current_user_user,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="identity.bank_destination_recorded",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "reason": "signed_in_bank_destination_recorded",
                        "verification_status": "recorded",
                        "provider_verified": False,
                    }
                ),
                dedupe_key="pytest-bank-event-only",
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

        payload = get_trust_slip_payload(db, user_id=1)

    identity_context = payload["identity_context"]
    assert identity_context["bank_details_recorded"] is True
    assert identity_context["bank_verified"] is False
    assert identity_context["bank_evidence_status"] == "recorded"
    assert identity_context["bank_verification_label"] == "Bank destination recorded in identity events"
    assert "bank" in payload["identity_evidence_summary"]["pending_verification"]


def test_signed_in_payout_save_logs_bank_recorded_trust_event(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    res = client.post(
        "/withdrawal-destinations/me",
        json={
            "destination_name": "Ada Member",
            "bank_name": "Pilot Bank",
            "account_number": "12345678",
            "sort_code": "12-34-56",
            "country": "GB",
            "currency": "GBP",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["trust_event_response"]["event_type"] == "identity.bank_destination_recorded"

    with SessionLocal() as db:
        event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.subject_user_id == 1,
                TrustEvent.event_type == "identity.bank_destination_recorded",
            )
            .one()
        )
        assert event.clan_id == 1
        payload = get_trust_slip_payload(db, user_id=1)

    assert payload["identity_context"]["bank_details_recorded"] is True
    assert payload["identity_context"]["bank_evidence_status"] == "recorded"


def test_trustslip_me_exposes_bank_context_before_phone_verification(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        user.phone_e164 = "+447700900222"
        user.phone_verified_at = None
        db.add(
            UserPayoutDestination(
                user_id=1,
                destination_name="Ada Member",
                bank_name="Pilot Bank",
                account_number="12345678",
                phone_number="+447700900222",
                country="GB",
                currency="GBP",
                verification_status="recorded",
                verification_note="Recorded before phone verification.",
            )
        )
        db.commit()

    res = client.get("/trust-slips/me")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["active"] is False
    assert body["reason"] == "phone_unverified"
    assert body["identity_context"]["phone_recorded"] is True
    assert body["identity_context"]["bank_details_recorded"] is True
    assert body["identity_context"]["bank_evidence_status"] == "recorded"


def test_signed_in_phone_start_records_system_generated_phone_evidence(
    client: TestClient,
    monkeypatch,
    override_current_user_user,
    seed_clan_member_membership,
):
    monkeypatch.delenv("GMFN_ENTRY_PHONE_DELIVERY", raising=False)
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)

    start_res = client.post(
        "/entry/signed-in/phone/start",
        json={"phone_e164": "+447700900111", "country": "GB"},
    )
    assert start_res.status_code == 201, start_res.text
    body = start_res.json()
    assert body["registered"] is True
    assert body["delivery_mode"] == "preview"
    assert body["otp_preview"]

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user.phone_e164 == "+447700900111"
        assert user.phone_verified_at is None
        event = (
            db.query(TrustEvent)
            .filter(
                TrustEvent.subject_user_id == 1,
                TrustEvent.event_type == "identity.phone_registered",
            )
            .one()
        )
        assert event.clan_id == 1
        payload = get_trust_slip_payload(db, user_id=1)

    assert payload["identity_context"]["phone_recorded"] is True
    assert payload["identity_context"]["phone_verified"] is False
    assert payload["identity_context"]["phone_status_label"] == (
        "Phone number recorded; network verification pending"
    )


def test_signed_in_identity_completion_records_phone_and_official_id(
    client: TestClient,
    monkeypatch,
    override_current_user_user,
    seed_clan_member_membership,
):
    monkeypatch.setenv("GMFN_ENTRY_PHONE_DELIVERY", "preview")

    start_res = client.post(
        "/entry/signed-in/phone/start",
        json={"phone_e164": "+447700900999", "country": "GB"},
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()
    assert start_body["otp_preview"]

    confirm_res = client.post(
        "/entry/signed-in/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text
    assert confirm_res.json()["verified"] is True

    official_res = client.post(
        "/entry/signed-in/official-id/record",
        json={
            "document_type": "Passport",
            "document_reference": "P1234567",
            "country": "GB",
            "note": "Pilot official ID record",
        },
    )
    assert official_res.status_code == 201, official_res.text
    official_body = official_res.json()
    assert official_body["verification_type"] == "official_id"
    assert official_body["status"] == "manual_review_required"

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user.phone_e164 == "+447700900999"
        assert user.phone_verified_at is not None
        check = (
            db.query(IdentityVerificationCheck)
            .filter(
                IdentityVerificationCheck.user_id == 1,
                IdentityVerificationCheck.verification_type == "official_id",
            )
            .one()
        )
        assert check.provider_key == "official-id.signed-in-manual-record"
        event_types = {
            row.event_type
            for row in db.query(TrustEvent).filter(TrustEvent.subject_user_id == 1).all()
        }
        assert "identity.phone_verified" in event_types
        assert "identity.official_id_recorded" in event_types


def test_signed_in_identity_completion_records_photo_and_id_image(
    client: TestClient,
    monkeypatch,
    override_current_user_user,
    seed_clan_member_membership,
):
    upload_root = Path("test_uploads/signed_in_photo_focus")
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))

    selfie_res = client.post(
        "/entry/signed-in/identity-photo/record",
        data={"document_type": "selfie", "note": "Pilot selfie"},
        files={"file": ("selfie.jpg", io.BytesIO(b"selfie-bytes"), "image/jpeg")},
    )
    assert selfie_res.status_code == 201, selfie_res.text
    selfie_body = selfie_res.json()
    assert selfie_body["verification_type"] == "identity_photo"
    assert selfie_body["status"] == "manual_review_required"
    assert selfie_body["evidence_url"].startswith("/uploads/entry/identity/")

    id_photo_res = client.post(
        "/entry/signed-in/identity-photo/record",
        data={"document_type": "passport_photo", "note": "Passport image"},
        files={"file": ("passport.jpg", io.BytesIO(b"passport-bytes"), "image/jpeg")},
    )
    assert id_photo_res.status_code == 201, id_photo_res.text
    id_photo_body = id_photo_res.json()
    assert id_photo_body["verification_type"] == "identity_photo"
    assert id_photo_body["evidence_url"].startswith("/uploads/entry/identity/")

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user.profile_image_url == selfie_body["evidence_url"]
        checks = (
            db.query(IdentityVerificationCheck)
            .filter(
                IdentityVerificationCheck.user_id == 1,
                IdentityVerificationCheck.verification_type == "identity_photo",
            )
            .all()
        )
        assert len(checks) == 2
        event_types = [
            row.event_type
            for row in db.query(TrustEvent).filter(TrustEvent.subject_user_id == 1).all()
        ]
        assert event_types.count("identity.photo_evidence_recorded") == 2
        assert "identity.official_id_recorded" in event_types

        payload = get_trust_slip_payload(db, user_id=1)

    summary_items = {
        item["key"]: item
        for item in payload["identity_evidence_summary"]["items"]
    }
    assert summary_items["photo"]["recorded"] is True
    assert summary_items["official_id"]["recorded"] is True
    assert payload["identity_context"]["photo_recorded"] is True
    assert payload["identity_context"]["official_id_recorded"] is True
    assert payload["identity_context"]["official_id_verified"] is False


def test_trustslip_payload_includes_personal_commitment_discipline(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    client.post(
        "/trust-events/me/focus-commitment",
        json={
            "clan_id": 1,
            "local_commitment_id": "focus-local-2",
            "local_event_id": "focus-event-local-2",
            "event_kind": "created",
            "title": "Finish weekly stock check",
            "category": "business",
            "target_value": 1.0,
            "current_value": 0.0,
            "progress_value": 0.0,
            "unit": "task",
            "due_date": "2026-05-22",
            "cadence": "weekly",
            "note": "Created business commitment",
        },
    )
    client.post(
        "/trust-events/me/focus-commitment",
        json={
            "clan_id": 1,
            "local_commitment_id": "focus-local-2",
            "local_event_id": "focus-event-local-3",
            "event_kind": "complete",
            "title": "Finish weekly stock check",
            "category": "business",
            "target_value": 1.0,
            "current_value": 1.0,
            "progress_value": 1.0,
            "unit": "task",
            "due_date": "2026-05-22",
            "cadence": "weekly",
            "note": "Marked as completed",
        },
    )

    with SessionLocal() as db:
        payload = get_trust_slip_payload(db, user_id=1)

    discipline = payload["evidence_summary"]["personal_commitment_discipline"]
    assert discipline["source"] == "trust_events"
    assert discipline["total_event_count"] == 2
    assert discipline["distinct_commitment_count"] == 1
    assert discipline["created_count"] == 1
    assert discipline["completed_count"] == 1
    assert discipline["active_commitment_count"] == 0
    assert "completed at least one personal commitment" in discipline["plain_language"]
    assert "bank_verification_label" in payload["identity_context"]
    assert payload["identity_context"]["passport_verification_label"] == "Passport check not connected yet"
    assert payload["identity_context"]["community_identity_confirmed"] is True


def test_focus_commitment_drops_invalid_clan_context(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    response = client.post(
        "/trust-events/me/focus-commitment",
        json={
            "clan_id": 999,
            "local_commitment_id": "focus-local-invalid-clan",
            "local_event_id": "focus-event-invalid-clan",
            "event_kind": "checkin",
            "title": "Check in without valid community",
            "category": "savings",
        },
    )
    assert response.status_code == 200, response.text

    with SessionLocal() as db:
        row = db.query(TrustEvent).filter(TrustEvent.dedupe_key == "focus:1:focus-event-invalid-clan").one()
        assert row.clan_id is None


def test_public_visibility_level_cannot_expand_above_stored_level():
    assert _public_visibility_level(stored_level="minimal", requested_level="detailed") == "minimal"
    assert _public_visibility_level(stored_level="standard", requested_level="detailed") == "standard"
    assert _public_visibility_level(stored_level="detailed", requested_level="minimal") == "minimal"


def test_expired_current_trustslip_reissues_with_fresh_expiry(seed_clan_member_membership):
    def aware(dt):
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    expired_at = now - timedelta(days=1)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE users
                SET phone_e164 = '+2348000000000',
                    phone_verified_at = CURRENT_TIMESTAMP
                WHERE id = 1
                """
            )
        )

    with SessionLocal() as db:
        old_slip = TrustSlip(
            code="OLD-TRUSTSLIP",
            clan_id=1,
            holder_user_id=1,
            trust_limit=Decimal("0.00"),
            currency="NGN",
            status="active",
            expires_at=expired_at,
            created_at=expired_at - timedelta(days=7),
            is_current=True,
        )
        db.add(old_slip)
        db.commit()
        db.refresh(old_slip)
        old_id = int(old_slip.id)

        result = issue_trust_slip_for_user(db, user_id=1)

        assert result["issued"] is True
        assert result["code"] != "OLD-TRUSTSLIP"
        new_expires_at = aware(datetime.fromisoformat(result["expires_at"]))
        assert new_expires_at > now

        db.refresh(old_slip)
        new_slip = db.query(TrustSlip).filter(TrustSlip.code == result["code"]).one()

        assert old_slip.is_current is False
        assert old_slip.superseded_by_trust_slip_id == new_slip.id
        assert new_slip.is_current is True
        assert new_slip.supersedes_trust_slip_id == old_id
        assert new_slip.expires_at is not None
        assert aware(new_slip.expires_at) > now


def test_holder_can_force_fresh_trustslip_for_new_public_qr(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    def aware(dt):
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    old_created_at = now - timedelta(days=2)

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE users
                SET phone_e164 = '+2348000000000',
                    phone_verified_at = CURRENT_TIMESTAMP
                WHERE id = 1
                """
            )
        )

    with SessionLocal() as db:
        old_slip = TrustSlip(
            code="CURRENT-TRUSTSLIP",
            clan_id=1,
            holder_user_id=1,
            trust_limit=Decimal("0.00"),
            currency="NGN",
            status="active",
            expires_at=now + timedelta(days=5),
            created_at=old_created_at,
            is_current=True,
        )
        db.add(old_slip)
        db.commit()
        db.refresh(old_slip)
        old_id = int(old_slip.id)

    response = client.post(
        "/trust-slips/me/reissue",
        json={
            "reason": "holder_requested_fresh_public_trustslip",
            "force": True,
        },
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["reissued"] is True
    assert data["code"] != "CURRENT-TRUSTSLIP"
    assert data["issued_at"]

    with SessionLocal() as db:
        old_slip = db.get(TrustSlip, old_id)
        new_slip = db.query(TrustSlip).filter(TrustSlip.code == data["code"]).one()

        assert old_slip is not None
        assert old_slip.is_current is False
        assert old_slip.superseded_by_trust_slip_id == new_slip.id
        assert new_slip.is_current is True
        assert new_slip.supersedes_trust_slip_id == old_id
        assert aware(new_slip.created_at) >= now - timedelta(seconds=5)
        assert aware(new_slip.created_at) > old_created_at
        assert aware(datetime.fromisoformat(data["issued_at"])) == aware(new_slip.created_at)
        assert new_slip.expires_at is not None
        assert aware(new_slip.expires_at) > now


def test_public_trustslip_verify_uses_holder_name_separate_from_gsn_id(
    client: TestClient,
    seed_clan_member_membership,
    monkeypatch,
):
    monkeypatch.setattr("app.api.routes.trust_slips.has_active_feature", lambda *args, **kwargs: True)
    issued_at = datetime(2026, 5, 27, 9, 30, tzinfo=timezone.utc)

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        user.display_name = "GSMIT"
        user.gmfn_id = "GMFN-U-9867079C"
        user.phone_e164 = "+2348000000000"
        user.phone_verified_at = issued_at
        slip = TrustSlip(
            code="PUBLIC-HOLDER-NAME",
            clan_id=1,
            holder_user_id=1,
            trust_limit=Decimal("0.00"),
            currency="NGN",
            status="active",
            expires_at=issued_at + timedelta(days=7),
            created_at=issued_at,
            is_current=True,
        )
        db.add(slip)
        db.commit()

    response = client.get("/trust-slips/verify/PUBLIC-HOLDER-NAME")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["holder_name"] == "GSMIT"
    assert data["display_name"] == "GSMIT"
    assert data["gmfn_id"] == "GMFN-U-9867079C"
    assert data["holder_name"] != data["gmfn_id"]
    assert datetime.fromisoformat(data["issued_at"]).replace(tzinfo=timezone.utc) == issued_at


def test_public_trustslip_verify_does_not_use_gsn_id_as_missing_holder_name(
    client: TestClient,
    seed_clan_member_membership,
    monkeypatch,
):
    monkeypatch.setattr("app.api.routes.trust_slips.has_active_feature", lambda *args, **kwargs: True)
    issued_at = datetime(2026, 5, 27, 10, 15, tzinfo=timezone.utc)

    with SessionLocal() as db:
        user = db.get(User, 1)
        assert user is not None
        user.display_name = None
        user.gmfn_id = "GMFN-U-9867079C"
        slip = TrustSlip(
            code="PUBLIC-HOLDER-MISSING-NAME",
            clan_id=1,
            holder_user_id=1,
            trust_limit=Decimal("0.00"),
            currency="NGN",
            status="active",
            expires_at=issued_at + timedelta(days=7),
            created_at=issued_at,
            is_current=True,
        )
        db.add(slip)
        db.commit()

    response = client.get("/trust-slips/verify/PUBLIC-HOLDER-MISSING-NAME")
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["gmfn_id"] == "GMFN-U-9867079C"
    assert data["holder_name"] == "Member name not set"
    assert data["display_name"] == "Member name not set"
    assert data["holder_name"] != data["gmfn_id"]
