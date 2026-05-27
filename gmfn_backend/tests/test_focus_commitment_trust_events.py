from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import TrustEvent, TrustSlip, User
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
