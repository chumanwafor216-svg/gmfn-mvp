from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.db.database import SessionLocal
from app.db.models import TrustEvent, TrustSlip, TrustSlipDecisionPackAccess


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


def test_public_verify_records_decision_pack_access_without_trust_event(
    client,
    seed_clan_admin_membership,
):
    slip_id = _create_trust_slip(code="ACCESS-DP")

    response = client.get(
        "/trust-slips/verify/ACCESS-DP",
        params={"decision_pack": "referral_decision"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["decision_pack"] == "referral_decision"
    assert payload["access_purpose"] == "Referral Decision Pack"
    assert payload["access_note"] == "Can this person be referred without damaging my credibility?"
    assert payload["decision_pack_focus"].startswith("Who knows the person")
    assert payload["share_access_record"]["status"] == "backend_access_recorded"

    db = SessionLocal()
    try:
        rows = db.query(TrustSlipDecisionPackAccess).all()
        assert len(rows) == 1
        access = rows[0]
        assert access.trust_slip_id == slip_id
        assert access.code == "ACCESS-DP"
        assert access.holder_user_id == 1
        assert access.clan_id == 1
        assert access.decision_pack_key == "referral_decision"
        assert access.access_purpose == "Referral Decision Pack"
        assert access.access_scope == "public_decision_pack"
        assert access.source == "public_verify"
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()


def test_public_verify_decision_pack_access_bounds_unknown_public_context(
    client,
    seed_clan_admin_membership,
):
    _create_trust_slip(code="ACCESS-UNKNOWN")
    long_focus = "x" * 800

    response = client.get(
        "/trust-slips/verify/ACCESS-UNKNOWN",
        params={
            "decision_pack": "future_pack",
            "purpose": "Future private-looking pack label",
            "decision_question": "Can this evidence help?",
            "focus": long_focus,
            "access_scope": "public_decision_pack",
        },
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["decision_pack"] == "future_pack"
    assert payload["access_purpose"] == "Future private-looking pack label"
    assert payload["access_note"] == "Can this evidence help?"
    assert len(payload["decision_pack_focus"]) == 360

    db = SessionLocal()
    try:
        access = db.query(TrustSlipDecisionPackAccess).one()
        assert access.decision_pack_key == "future_pack"
        assert access.access_purpose == "Future private-looking pack label"
        assert access.recipient_question == "Can this evidence help?"
        assert access.decision_focus == "x" * 360
        assert not hasattr(access, "recipient_name")
        assert not hasattr(access, "recipient_email")
        assert not hasattr(access, "recipient_phone")
        assert db.query(TrustEvent).count() == 0
    finally:
        db.close()

def test_holder_can_read_recent_decision_pack_accesses_without_recipient_identity(
    client,
    seed_clan_admin_membership,
    override_current_user,
):
    _create_trust_slip(code="ACCESS-HOLDER")
    client.get(
        "/trust-slips/verify/ACCESS-HOLDER",
        params={"decision_pack": "housing_decision"},
    )

    response = client.get("/trust-slips/me/decision-pack-accesses")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert "recipient name" in payload["privacy_note"].lower()
    assert "not behaviour evidence" in payload["evidence_note"]
    assert len(payload["items"]) == 1
    item = payload["items"][0]
    assert item["code"] == "ACCESS-HOLDER"
    assert item["decision_pack"] == "housing_decision"
    assert item["access_purpose"] == "Housing Decision Pack"
    assert item["access_scope"] == "public_decision_pack"
    assert item["source"] == "public_verify"
    assert "recipient_name" not in item
    assert "recipient_email" not in item
    assert "recipient_phone" not in item
    assert "ip_address" not in item


def test_holder_decision_pack_accesses_are_holder_scoped(
    client,
    seed_clan_admin_membership,
    seed_user2_non_member,
    override_current_user,
):
    _create_trust_slip(code="ACCESS-USER2", holder_user_id=2)
    client.get(
        "/trust-slips/verify/ACCESS-USER2",
        params={"decision_pack": "supplier_decision"},
    )

    response = client.get("/trust-slips/me/decision-pack-accesses")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["items"] == []