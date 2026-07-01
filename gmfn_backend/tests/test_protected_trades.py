from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import ProtectedTradeEvent, ProtectedTradeRecord, TrustEvent


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
