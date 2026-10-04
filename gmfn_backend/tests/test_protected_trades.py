from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import ProtectedTradeEvent, ProtectedTradeRecord, TrustEvent
from app.services.protected_trade_service import trade_to_dict


def _protected_trade_count() -> int:
    with SessionLocal() as db:
        return int(db.query(ProtectedTradeRecord).count())


def test_protected_trade_create_and_lifecycle_logs_trust_events(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    create_res = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "seller",
            "buyer_user_id": 2,
            "item_title": "Two bags of rice",
            "terms_summary": "Buyer collects after payment claim is reviewed.",
            "amount": "42000.00",
            "currency": "NGN",
            "trust_slip_code": "GSN-TS-TEST",
            "meta": {"source": "pytest"},
        },
    )
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    assert created["trade_code"].startswith("GSN-TRADE-")
    assert created["seller_user_id"] == 1
    assert created["buyer_user_id"] == 2
    assert created["status"] == "draft"
    assert created["payment_status"] == "not_started"
    assert "not escrow" in created["boundary_note"]
    assert created["events"][0]["event_type"] == "protected_trade.created"

    trade_id = created["id"]

    claimed_res = client.post(
        f"/protected-trades/{trade_id}/events",
        json={
            "event_type": "payment.claimed",
            "expected_payment_id": 55,
            "note": "Buyer claims transfer was sent.",
            "meta": {"payment_reference": "GSN-PAY-TEST-1"},
        },
    )
    assert claimed_res.status_code == 201, claimed_res.text
    assert claimed_res.json()["event_type"] == "protected_trade.payment.claimed"

    released_res = client.post(
        f"/protected-trades/{trade_id}/events",
        json={"event_type": "release.recorded", "note": "Seller released goods."},
    )
    assert released_res.status_code == 201, released_res.text

    detail_res = client.get(f"/protected-trades/{trade_id}")
    assert detail_res.status_code == 200, detail_res.text
    detail = detail_res.json()
    assert detail["status"] == "released"
    assert detail["payment_status"] == "claimed"
    assert detail["release_status"] == "released"
    assert detail["derived_outcome_state"] == "PROVIDER_REPORTED_COMPLETED"
    assert detail["derived_outcome_label"] == "Provider recorded completion"
    assert detail["has_provider_release_event"] is True
    assert detail["has_requester_receipt_event"] is False
    assert detail["expected_payment_id"] == 55
    assert [event["event_type"] for event in detail["events"]] == [
        "protected_trade.created",
        "protected_trade.payment.claimed",
        "protected_trade.release.recorded",
    ]

    with SessionLocal() as db:
        trade = db.get(ProtectedTradeRecord, trade_id)
        assert trade is not None
        assert trade.status == "released"
        trade_events = (
            db.query(ProtectedTradeEvent)
            .filter(ProtectedTradeEvent.trade_id == trade_id)
            .order_by(ProtectedTradeEvent.id.asc())
            .all()
        )
        assert len(trade_events) == 3
        trust_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type.like("protected_trade.%"))
            .order_by(TrustEvent.id.asc())
            .all()
        )
        assert [event.event_type for event in trust_events] == [
            "protected_trade.created",
            "protected_trade.payment.claimed",
            "protected_trade.release.recorded",
        ]
        meta = json.loads(trust_events[1].meta_json or "{}")
        assert meta["trade_id"] == trade_id
        assert meta["expected_payment_id"] == 55
        assert "not automatic payout" in meta["boundary_note"]


def test_protected_trade_rejects_unsupported_event_type(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    create_res = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "buyer",
            "seller_user_id": 2,
            "item_title": "Phone charger",
            "amount": "2500.00",
            "currency": "NGN",
        },
    )
    assert create_res.status_code == 201, create_res.text
    trade_id = create_res.json()["id"]

    bad_res = client.post(
        f"/protected-trades/{trade_id}/events",
        json={"event_type": "escrow.released", "note": "Should not be accepted."},
    )
    assert bad_res.status_code == 400, bad_res.text
    assert "Unsupported protected trade event_type" in bad_res.json()["detail"]


def test_protected_trade_create_rejects_malformed_integer_controls(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    base_payload = {
        "clan_id": 1,
        "participant_role": "seller",
        "buyer_user_id": 2,
        "item_title": "Two bags of rice",
        "amount": "42000.00",
        "currency": "NGN",
    }

    for field_name in ("clan_id", "buyer_user_id", "expected_payment_id"):
        payload = dict(base_payload)
        payload[field_name] = False
        rejected_bool = client.post("/protected-trades", json=payload)
        assert rejected_bool.status_code == 422, (field_name, rejected_bool.text)
        assert f"{field_name} must be an integer, not a boolean" in rejected_bool.text

        payload[field_name] = 1.0
        rejected_float = client.post("/protected-trades", json=payload)
        assert rejected_float.status_code == 422, (field_name, rejected_float.text)
        assert f"{field_name} must be an integer, not a float" in rejected_float.text
        assert _protected_trade_count() == 0

    for field_name in (
        "participant_role",
        "trust_slip_code",
        "shipment_pack_id",
        "evidence_pack_id",
        "item_title",
        "terms_summary",
        "currency",
    ):
        payload = dict(base_payload)
        payload[field_name] = False
        rejected_text = client.post("/protected-trades", json=payload)
        assert rejected_text.status_code == 422, (field_name, rejected_text.text)
        assert f"{field_name} must be text" in rejected_text.text
        assert _protected_trade_count() == 0

    for bad_value in (False, 42000):
        payload = dict(base_payload)
        payload["amount"] = bad_value
        rejected_amount = client.post("/protected-trades", json=payload)
        assert rejected_amount.status_code == 422, rejected_amount.text
        assert "amount must be a decimal string" in rejected_amount.text
        assert _protected_trade_count() == 0

    payload = dict(base_payload)
    payload["meta"] = ["not", "an", "object"]
    rejected_meta = client.post("/protected-trades", json=payload)
    assert rejected_meta.status_code == 422, rejected_meta.text
    assert "meta must be an object" in rejected_meta.text
    assert _protected_trade_count() == 0


def test_protected_trade_event_rejects_malformed_expected_payment_id(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    create_res = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "seller",
            "buyer_user_id": 2,
            "item_title": "Two bags of rice",
            "amount": "42000.00",
            "currency": "NGN",
        },
    )
    assert create_res.status_code == 201, create_res.text
    trade_id = create_res.json()["id"]

    payload = {
        "event_type": "payment.claimed",
        "expected_payment_id": False,
        "note": "Buyer claims transfer was sent.",
    }
    rejected_bool = client.post(f"/protected-trades/{trade_id}/events", json=payload)
    assert rejected_bool.status_code == 422, rejected_bool.text
    assert "expected_payment_id must be an integer, not a boolean" in rejected_bool.text

    payload["expected_payment_id"] = 1.0
    rejected_float = client.post(f"/protected-trades/{trade_id}/events", json=payload)
    assert rejected_float.status_code == 422, rejected_float.text
    assert "expected_payment_id must be an integer, not a float" in rejected_float.text

    for field_name in (
        "event_type",
        "note",
        "shipment_pack_id",
        "evidence_pack_id",
        "trust_slip_code",
    ):
        payload = {
            "event_type": "payment.claimed",
            "note": "Buyer claims transfer was sent.",
        }
        payload[field_name] = False
        rejected_text = client.post(f"/protected-trades/{trade_id}/events", json=payload)
        assert rejected_text.status_code == 422, (field_name, rejected_text.text)
        assert f"{field_name} must be text" in rejected_text.text

    payload = {
        "event_type": "payment.claimed",
        "note": "Buyer claims transfer was sent.",
        "meta": ["not", "an", "object"],
    }
    rejected_meta = client.post(f"/protected-trades/{trade_id}/events", json=payload)
    assert rejected_meta.status_code == 422, rejected_meta.text
    assert "meta must be an object" in rejected_meta.text


def _derived_trade_dict(
    db,
    *,
    code: str,
    status: str = "draft",
    release_status: str = "not_requested",
    receipt_status: str = "not_confirmed",
    dispute_status: str = "none",
    events: list[tuple[str, int]] | None = None,
    closed: bool = False,
):
    trade = ProtectedTradeRecord(
        trade_code=code,
        clan_id=1,
        creator_user_id=1,
        seller_user_id=1,
        buyer_user_id=2,
        item_title="Outcome provenance test",
        currency="NGN",
        status=status,
        payment_status="not_started",
        release_status=release_status,
        receipt_status=receipt_status,
        dispute_status=dispute_status,
        closed_at=datetime.now(timezone.utc) if closed else None,
    )
    db.add(trade)
    db.flush()
    for event_type, actor_user_id in events or []:
        normalized = event_type if event_type.startswith("protected_trade.") else f"protected_trade.{event_type}"
        db.add(
            ProtectedTradeEvent(
                trade_id=trade.id,
                actor_user_id=actor_user_id,
                event_type=normalized,
                status_to=status,
                note="Outcome provenance test event",
            )
        )
    db.flush()
    event_rows = (
        db.query(ProtectedTradeEvent)
        .filter(ProtectedTradeEvent.trade_id == trade.id)
        .order_by(ProtectedTradeEvent.id.asc())
        .all()
    )
    return trade_to_dict(trade, events=event_rows)


def test_protected_trade_derived_outcomes_use_existing_fields_and_actor_provenance(
    seed_clan_member_membership,
    seed_user2_non_member,
):
    with SessionLocal() as db:
        trust_event_count = int(db.query(TrustEvent).count())

        seller_release = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-SELLER",
            status="released",
            release_status="released",
            events=[("release.recorded", 1)],
        )
        assert seller_release["derived_outcome_state"] == "PROVIDER_REPORTED_COMPLETED"
        assert seller_release["derived_outcome_label"] == "Provider recorded completion"
        assert seller_release["has_provider_release_event"] is True

        buyer_receipt = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-BUYER",
            status="received",
            receipt_status="received",
            events=[("receipt.confirmed", 2)],
        )
        assert buyer_receipt["derived_outcome_state"] == "REQUESTER_REPORTED_RECEIVED"
        assert buyer_receipt["derived_outcome_label"] == "Requester confirmed receipt"
        assert buyer_receipt["has_requester_receipt_event"] is True

        mutual = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-MUTUAL",
            status="received",
            release_status="released",
            receipt_status="received",
            events=[("release.recorded", 1), ("receipt.confirmed", 2)],
        )
        assert mutual["derived_outcome_state"] == "MUTUALLY_CONFIRMED"
        assert mutual["derived_outcome_label"] == "Mutually confirmed"

        disputed = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-DISPUTED",
            status="disputed",
            release_status="released",
            receipt_status="received",
            dispute_status="opened",
            events=[
                ("release.recorded", 1),
                ("receipt.confirmed", 2),
                ("dispute.opened", 2),
            ],
        )
        assert disputed["derived_outcome_state"] == "DISPUTED"
        assert disputed["has_unresolved_dispute"] is True

        not_received = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-NOT-RECEIVED",
            status="not_received",
            receipt_status="not_received",
            events=[("receipt.not_received", 2)],
        )
        assert not_received["derived_outcome_state"] == "NOT_RECEIVED"
        assert not_received["derived_outcome_label"] == "Not received"

        cancelled = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-CANCELLED",
            status="cancelled",
        )
        assert cancelled["derived_outcome_state"] == "CANCELLED"

        closed_only = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-CLOSED",
            status="closed",
            closed=True,
        )
        assert closed_only["derived_outcome_state"] == "UNCONFIRMED"
        assert closed_only["derived_outcome_label"] == "In progress"
        assert "closed lifecycle state is not treated as fulfilment by itself" in closed_only["evidence_basis"]

        resolved_after_dispute = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-RESOLVED",
            status="received",
            release_status="released",
            receipt_status="received",
            dispute_status="resolved",
            events=[
                ("release.recorded", 1),
                ("receipt.confirmed", 2),
                ("dispute.opened", 2),
                ("dispute.resolved", 1),
            ],
        )
        assert resolved_after_dispute["derived_outcome_state"] == "MUTUALLY_CONFIRMED"
        assert resolved_after_dispute["derived_outcome_label"] == "Mutually confirmed after resolved dispute"
        assert resolved_after_dispute["has_resolved_dispute_history"] is True

        wrong_release_actor = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-WRONG-RELEASE",
            status="released",
            release_status="released",
            events=[("release.recorded", 2)],
        )
        assert wrong_release_actor["derived_outcome_state"] == "UNCONFIRMED"
        assert wrong_release_actor["has_provider_release_event"] is False
        assert "Provider recorded completion" != wrong_release_actor["derived_outcome_label"]

        wrong_receipt_actor = _derived_trade_dict(
            db,
            code="GSN-TRADE-DERIVED-WRONG-RECEIPT",
            status="received",
            receipt_status="received",
            events=[("receipt.confirmed", 1)],
        )
        assert wrong_receipt_actor["derived_outcome_state"] == "UNCONFIRMED"
        assert wrong_receipt_actor["has_requester_receipt_event"] is False
        assert "Requester confirmed receipt" != wrong_receipt_actor["derived_outcome_label"]

        assert int(db.query(TrustEvent).count()) == trust_event_count
