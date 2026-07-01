from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.db.database import SessionLocal
from app.db.models import TrustEvent, TrustSlip


def _create_trust_slip(*, code: str, holder_user_id: int = 1) -> int:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        slip = TrustSlip(
            code=code,
            clan_id=1,
            holder_user_id=holder_user_id,
            trust_limit=Decimal("0.00"),
            currency="NGN",
            status="active",
            expires_at=now + timedelta(days=7),
            created_at=now,
            is_current=True,
        )
        db.add(slip)
        db.commit()
        db.refresh(slip)
        return int(slip.id)
    finally:
        db.close()


def _trust_event_count() -> int:
    db = SessionLocal()
    try:
        return db.query(TrustEvent).count()
    finally:
        db.close()


def _trust_slip_count() -> int:
    db = SessionLocal()
    try:
        return db.query(TrustSlip).count()
    finally:
        db.close()


def test_trust_slip_release_rejects_malformed_payload_before_evidence_write(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="RELEASE-BOUNDARY")

    response = client.post(
        "/trust-slips/RELEASE-BOUNDARY/release",
        json={
            "supplier_name": True,
            "supplier_phone": 12345,
            "amount_released": 15000,
            "note": {"bad": "x"},
        },
    )

    assert response.status_code == 422, response.text
    assert "supplier_name must be text" in response.text
    assert "supplier_phone must be text" in response.text
    assert "amount_released must be a decimal string" in response.text
    assert "note must be text" in response.text

    db = SessionLocal()
    try:
        slip = db.get(TrustSlip, slip_id)
        assert slip is not None
        assert slip.last_release_at is None
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()


def test_trust_slip_release_accepts_text_payload(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="RELEASE-VALID")

    response = client.post(
        "/trust-slips/RELEASE-VALID/release",
        json={
            "supplier_name": "Merchant name",
            "supplier_phone": "08000000000",
            "amount_released": "15000.00",
            "note": "Goods released",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["event_type"] == "trust_slip.release_logged"

    db = SessionLocal()
    try:
        slip = db.get(TrustSlip, slip_id)
        assert slip is not None
        assert slip.last_release_at is not None
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "trust_slip.release_logged")
            .count()
            == 1
        )
    finally:
        db.close()


def test_trust_slip_extend_rejects_malformed_days_before_mutation(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    slip_id = _create_trust_slip(code="EXTEND-BOUNDARY")

    db = SessionLocal()
    try:
        original_expires_at = db.get(TrustSlip, slip_id).expires_at
    finally:
        db.close()

    for bad_value, expected_text in (
        (True, "days must be an integer, not a boolean"),
        (1.5, "days must be an integer, not a float"),
    ):
        response = client.post(
            "/trust-slips/EXTEND-BOUNDARY/extend",
            json={"days": bad_value},
        )
        assert response.status_code == 422, response.text
        assert expected_text in response.text

    db = SessionLocal()
    try:
        slip = db.get(TrustSlip, slip_id)
        assert slip is not None
        assert slip.expires_at == original_expires_at
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()


def test_trust_slip_reissue_rejects_malformed_payload_before_new_slip_or_event(
    client,
    seed_clan_member_membership,
    override_current_user_user,
):
    _create_trust_slip(code="REISSUE-BOUNDARY")

    response = client.post(
        "/trust-slips/me/reissue",
        json={
            "reason": {"bad": "x"},
            "force": "yes",
        },
    )

    assert response.status_code == 422, response.text
    assert "reason must be text" in response.text
    assert "force must be boolean" in response.text
    assert _trust_slip_count() == 1
    assert _trust_event_count() == 0
