from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from fastapi.testclient import TestClient

from app.db.bank_models import ExpectedPayment
from app.db.database import SessionLocal
from app.db.models import (
    ProtectedTradeEvent,
    ProtectedTradeRecord,
    TrustEvent,
    User,
    UserPayoutDestination,
)
from app.schemas.protected_trades import ProtectedTradeEventIn
from app.services.protected_trade_service import (
    add_trade_event,
    create_or_get_seller_payment_reference,
    trade_to_dict,
)
from app.services.reconciliation_service import _find_expected_candidates


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
            "terms_summary": "Buyer collects after seller acknowledges payment.",
            "amount": "42000.00",
            "currency": "NGN",
            "trust_slip_code": "GSN-TS-TEST",
            "meta": {"source": "pytest", "quantity": "2 bags", "payment_timing": "pay_now"},
        },
    )
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    assert created["trade_code"].startswith("GSN-TRADE-")
    assert created["seller_user_id"] == 1
    assert created["buyer_user_id"] == 2
    assert created["status"] == "awaiting_buyer_acceptance"
    assert created["payment_status"] == "not_started"
    assert "not escrow" in created["boundary_note"]
    assert [event["event_type"] for event in created["events"]] == [
        "protected_trade.created",
        "protected_trade.terms.issued",
    ]

    trade_id = created["id"]
    with SessionLocal() as db:
        trade = db.get(ProtectedTradeRecord, trade_id)
        buyer = db.get(User, 2)
        assert trade is not None
        assert buyer is not None
        add_trade_event(
            db,
            trade=trade,
            payload=ProtectedTradeEventIn(
                event_type="terms.agreed",
                note="Buyer accepted the seller-issued agreement.",
            ),
            current_user=buyer,
        )
        with pytest.raises(ValueError, match="bank details with a payment code"):
            add_trade_event(
                db,
                trade=trade,
                payload=ProtectedTradeEventIn(
                    event_type="payment.claimed",
                    expected_payment_id=55,
                    note="Buyer tried to record payment before receiving a code.",
                ),
                current_user=buyer,
            )
        seller = db.get(User, 1)
        assert seller is not None
        add_trade_event(
            db,
            trade=trade,
            payload=ProtectedTradeEventIn(
                event_type="payment.instruction_added",
                expected_payment_id=55,
                note="Seller sent bank details with the generated payment code.",
                meta={"payment_reference": "GSN-PAY-TEST-1"},
            ),
            current_user=seller,
        )
        add_trade_event(
            db,
            trade=trade,
            payload=ProtectedTradeEventIn(
                event_type="payment.claimed",
                expected_payment_id=55,
                note="Buyer recorded that transfer was sent.",
                meta={"payment_reference": "GSN-PAY-TEST-1"},
            ),
            current_user=buyer,
        )

    received_res = client.post(
        f"/protected-trades/{trade_id}/events",
        json={"event_type": "payment.received", "note": "Seller acknowledged payment."},
    )
    assert received_res.status_code == 201, received_res.text

    released_res = client.post(
        f"/protected-trades/{trade_id}/events",
        json={"event_type": "release.recorded", "note": "Seller released goods."},
    )
    assert released_res.status_code == 201, released_res.text

    detail_res = client.get(f"/protected-trades/{trade_id}")
    assert detail_res.status_code == 200, detail_res.text
    detail = detail_res.json()
    assert detail["status"] == "released"
    assert detail["payment_status"] == "seller_confirmed_received"
    assert detail["release_status"] == "released"
    assert detail["derived_outcome_state"] == "PROVIDER_REPORTED_COMPLETED"
    assert detail["has_provider_release_event"] is True
    assert detail["has_requester_receipt_event"] is False
    assert detail["expected_payment_id"] == 55
    assert [event["event_type"] for event in detail["events"]] == [
        "protected_trade.created",
        "protected_trade.terms.issued",
        "protected_trade.terms.agreed",
        "protected_trade.payment.instruction_added",
        "protected_trade.payment.claimed",
        "protected_trade.payment.received",
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
        assert len(trade_events) == 7
        trust_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type.like("protected_trade.%"))
            .order_by(TrustEvent.id.asc())
            .all()
        )
        assert [event.event_type for event in trust_events] == [
            "protected_trade.created",
            "protected_trade.terms.issued",
            "protected_trade.terms.agreed",
            "protected_trade.payment.instruction_added",
            "protected_trade.payment.claimed",
            "protected_trade.payment.received",
            "protected_trade.release.recorded",
        ]
        meta = json.loads(trust_events[4].meta_json or "{}")
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
            "participant_role": "seller",
            "buyer_user_id": 2,
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


def test_trade_record_is_seller_issued_and_role_gates_agreement_steps(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    buyer_create = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "buyer",
            "seller_user_id": 2,
            "item_title": "Phone charger",
            "terms_summary": "Buyer tried to issue the agreement.",
            "amount": "2500.00",
            "currency": "NGN",
        },
    )
    assert buyer_create.status_code == 403, buyer_create.text
    assert "issued by the seller" in buyer_create.json()["detail"]

    created = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "seller",
            "buyer_user_id": 2,
            "item_title": "Phone charger",
            "terms_summary": "One charger; buyer pays before collection.",
            "amount": "2500.00",
            "currency": "NGN",
        },
    )
    assert created.status_code == 201, created.text
    trade_id = int(created.json()["id"])

    seller_cannot_accept = client.post(
        f"/protected-trades/{trade_id}/events",
        json={"event_type": "terms.agreed", "note": "Seller cannot accept for buyer."},
    )
    assert seller_cannot_accept.status_code == 403, seller_cannot_accept.text
    assert "Only the buyer" in seller_cannot_accept.json()["detail"]

    with SessionLocal() as db:
        trade = db.get(ProtectedTradeRecord, trade_id)
        buyer = db.get(User, 2)
        assert trade is not None
        assert buyer is not None
        with pytest.raises(PermissionError, match="Only the seller"):
            add_trade_event(
                db,
                trade=trade,
                payload=ProtectedTradeEventIn(
                    event_type="payment.received",
                    note="Buyer cannot acknowledge receipt for seller.",
                ),
                current_user=buyer,
            )


def test_trade_record_amendment_reissues_same_record(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    created = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "seller",
            "buyer_user_id": 2,
            "item_title": "One phone charger",
            "terms_summary": "One charger; payment before collection.",
            "amount": "2500.00",
            "currency": "NGN",
            "meta": {"quantity": "1", "payment_timing": "pay_now"},
        },
    )
    assert created.status_code == 201, created.text
    trade_id = int(created.json()["id"])

    with SessionLocal() as db:
        trade = db.get(ProtectedTradeRecord, trade_id)
        buyer = db.get(User, 2)
        assert trade is not None
        assert buyer is not None
        add_trade_event(
            db,
            trade=trade,
            payload=ProtectedTradeEventIn(
                event_type="terms.amendment_requested",
                note="Buyer asked for two chargers and revised collection terms.",
            ),
            current_user=buyer,
        )

    reissued = client.post(
        f"/protected-trades/{trade_id}/events",
        json={
            "event_type": "terms.reissued",
            "note": "Seller reissued the corrected Trade Record.",
            "meta": {
                "item_title": "Two phone chargers",
                "quantity": "2",
                "amount": "4800.00",
                "currency": "NGN",
                "terms_summary": "Two chargers; buyer pays before collection tomorrow.",
                "payment_timing": "pay_now",
            },
        },
    )
    assert reissued.status_code == 201, reissued.text

    detail = client.get(f"/protected-trades/{trade_id}")
    assert detail.status_code == 200, detail.text
    payload = detail.json()
    assert payload["id"] == trade_id
    assert payload["status"] == "awaiting_buyer_acceptance"
    assert payload["item_title"] == "Two phone chargers"
    assert Decimal(payload["amount"]) == Decimal("4800.00")
    assert payload["terms_summary"] == "Two chargers; buyer pays before collection tomorrow."
    assert payload["meta"]["quantity"] == "2"
    assert payload["meta"]["payment_timing"] == "pay_now"
    assert [event["event_type"] for event in payload["events"]] == [
        "protected_trade.created",
        "protected_trade.terms.issued",
        "protected_trade.terms.amendment_requested",
        "protected_trade.terms.reissued",
    ]
    assert _protected_trade_count() == 1


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


def test_seller_payment_reference_uses_direct_account_and_is_idempotent(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    with SessionLocal() as db:
        destination = (
            db.query(UserPayoutDestination)
            .filter(UserPayoutDestination.user_id == 1)
            .first()
        )
        if destination is None:
            destination = UserPayoutDestination(
                user_id=1,
                destination_name="Chukwuma Nwafor",
                bank_name="Monzo",
                account_number="30396898",
                country="GB",
                currency="GBP",
                note="UK Sort code: 04-00-03",
                verification_status="recorded",
            )
            db.add(destination)
        else:
            destination.destination_name = "Chukwuma Nwafor"
            destination.bank_name = "Monzo"
            destination.account_number = "30396898"
            destination.country = "GB"
            destination.currency = "GBP"
            destination.note = "UK Sort code: 04-00-03"
        db.commit()

    create_res = client.post(
        "/protected-trades",
        json={
            "clan_id": 1,
            "participant_role": "seller",
            "buyer_user_id": 2,
            "item_title": "Newark jewellery",
            "terms_summary": "Buyer pays the agreed amount directly to the seller.",
            "amount": "10.00",
            "currency": "GBP",
            "meta": {"source_demand_id": 77},
        },
    )
    assert create_res.status_code == 201, create_res.text
    trade_id = int(create_res.json()["id"])
    with SessionLocal() as db:
        trade = db.get(ProtectedTradeRecord, trade_id)
        buyer = db.get(User, 2)
        assert trade is not None
        assert buyer is not None
        add_trade_event(
            db,
            trade=trade,
            payload=ProtectedTradeEventIn(
                event_type="terms.agreed",
                note="Buyer accepted the seller-issued agreement.",
            ),
            current_user=buyer,
        )

    first = client.post(f"/protected-trades/{trade_id}/payment-reference")
    assert first.status_code == 201, first.text
    payload = first.json()
    assert payload["protected_trade_id"] == trade_id
    assert payload["payment_reference"].startswith("GSNTP")
    assert len(payload["payment_reference"]) <= 18
    assert payload["item_title"] == "Newark jewellery"
    assert Decimal(payload["amount"]) == Decimal("10.00")
    assert payload["currency"] == "GBP"
    assert payload["account_name"] == "Chukwuma Nwafor"
    assert payload["account_number"] == "30396898"
    assert payload["bank_name"] == "Monzo"
    assert payload["sort_code"] == "04-00-03"
    assert payload["direct_to_seller"] is True
    assert payload["automatic_bank_reconciliation"] is False
    assert "does not hold the money" in payload["boundary_note"]
    trade_detail = client.get(f"/protected-trades/{trade_id}")
    assert trade_detail.status_code == 200, trade_detail.text
    assert trade_detail.json()["meta"]["payment_reference"] == payload["payment_reference"]
    assert trade_detail.json()["meta"]["payment_reference_scope"] == "seller_direct"

    repeated = client.post(f"/protected-trades/{trade_id}/payment-reference")
    assert repeated.status_code == 201, repeated.text
    assert repeated.json()["expected_payment_id"] == payload["expected_payment_id"]
    assert repeated.json()["payment_reference"] == payload["payment_reference"]

    with SessionLocal() as db:
        trade = db.get(ProtectedTradeRecord, trade_id)
        buyer = db.get(User, 2)
        assert trade is not None
        assert buyer is not None
        with pytest.raises(PermissionError, match="Only the seller"):
            create_or_get_seller_payment_reference(
                db,
                trade=trade,
                current_user=buyer,
            )

        expected = db.get(ExpectedPayment, int(payload["expected_payment_id"]))
        assert expected is not None
        assert expected.expected_type == "protected_trade_payment"
        assert int(expected.user_id) == 2
        assert Decimal(expected.amount) == Decimal("10.00")
        meta = json.loads(expected.meta_json or "{}")
        assert meta["payment_beneficiary_scope"] == "seller_direct"
        assert meta["automatic_bank_reconciliation"] is False
        assert meta["source_demand_id"] == 77
        assert (
            _find_expected_candidates(
                db,
                clan_id=1,
                reference_normalized=expected.reference_normalized,
                currency="GBP",
            )
            == []
        )
        events = (
            db.query(ProtectedTradeEvent)
            .filter(
                ProtectedTradeEvent.trade_id == trade_id,
                ProtectedTradeEvent.event_type == "protected_trade.payment.instruction_added",
            )
            .all()
        )
        assert len(events) == 1
