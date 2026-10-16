from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.api.routes import member_credits as route
from app.db.database import SessionLocal, engine
from app.db.member_credit_models import (
    MemberCreditAwardObligation,
    MemberCreditCollectionAttempt,
    MemberCreditPackVersion,
    MemberCreditProviderPayment,
    MemberCreditPurchaseOrder,
    MemberCreditPurchaseQuote,
    MemberCreditServiceVersion,
    MemberServiceCreditLedgerEntry,
)
from app.db.models import SpotlightCampaign
from app.services import member_credit_purchase_service as purchase
from app.services.member_credit_service import MemberCreditError


NOW = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def _enable_isolated_synthetic_runtime(monkeypatch):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SYNTHETIC_PAYMENTS_ENABLED", "1")
    monkeypatch.setenv("PYTEST_RUNNING", "1")
    route._synthetic_adapter.sessions.clear()
    route._synthetic_adapter.transfers.clear()


def _seed_catalog() -> int:
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO users (id,email,hashed_password,role) VALUES "
            "(1,'buyer@example.com','x','member'),(2,'other@example.com','x','member')"
        ))
    with SessionLocal() as db:
        pack = MemberCreditPackVersion(
            pack_code="synthetic.purchase.pack", version=7, credit_units=4,
            quoted_amount_minor=2500, currency="TST", status="test_active",
            terms_json='{"synthetic":true,"refund":"test-only"}', created_at=NOW,
        )
        db.add(pack)
        db.commit()
        return int(pack.id)


def _quote_and_order(adapter=None):
    pack_id = _seed_catalog()
    adapter = adapter or purchase.SyntheticCollectionAdapter()
    with SessionLocal() as db:
        quote = purchase.issue_purchase_quote(
            db, member_user_id=1, pack_version_id=pack_id,
            idempotency_key="quote-one", now=NOW,
        )
        order = purchase.confirm_purchase(
            db, member_user_id=1, quote_key=quote.quote_key,
            idempotency_key="confirm-one", now=NOW,
        )
        attempt = purchase.ensure_collection_session(
            db, member_user_id=1, order_key=order.order_key,
            idempotency_key="collection-one", adapter=adapter, now=NOW,
        )
        return quote.quote_key, order.order_key, attempt.provider_session_id, attempt.collection_reference, adapter


def _transfer(*, transaction_id: str, reference: str, amount: int = 2500,
              currency: str = "TST", merchant: str = "synthetic-test-merchant",
              settled: bool = False) -> purchase.VerifiedTransfer:
    return purchase.VerifiedTransfer(
        provider_transaction_id=transaction_id, merchant_key=merchant,
        collection_reference=reference, amount_minor=amount, currency=currency,
        verified_at=NOW + timedelta(minutes=1),
        settled_at=NOW + timedelta(minutes=2) if settled else None,
    )


def test_purchase_contracts_require_authentication(client, monkeypatch) -> None:
    monkeypatch.delenv("GMFN_DEV_MODE", raising=False)
    prior = dict(client.app.dependency_overrides)
    client.app.dependency_overrides.clear()
    try:
        assert client.get("/member-credits/me").status_code == 401
        assert client.post("/member-credits/purchase-quotes", json={
            "pack_version_id": 1, "idempotency_key": "unauthenticated",
        }).status_code == 401
        assert client.post("/member-credits/purchases", json={
            "quote_key": "none", "idempotency_key": "unauthenticated",
        }).status_code == 401
    finally:
        client.app.dependency_overrides.clear()
        client.app.dependency_overrides.update(prior)


def test_authenticated_internal_journey_tamper_rejection_and_no_service_activation(
    client, override_current_user,
) -> None:
    pack_id = _seed_catalog()
    tampered = client.post("/member-credits/purchase-quotes", json={
        "pack_version_id": pack_id, "idempotency_key": "api-quote",
        "amount_minor": 1, "credit_units": 999, "member_user_id": 2,
    })
    assert tampered.status_code == 422

    quoted = client.post("/member-credits/purchase-quotes", json={
        "pack_version_id": pack_id, "idempotency_key": "api-quote",
    })
    assert quoted.status_code == 200
    assert {key: quoted.json()[key] for key in (
        "pack_code", "catalog_version", "amount_minor", "currency", "credit_units"
    )} == {
        "pack_code": "synthetic.purchase.pack", "catalog_version": 7,
        "amount_minor": 2500, "currency": "TST", "credit_units": 4,
    }
    confirmed = client.post("/member-credits/purchases", json={
        "quote_key": quoted.json()["quote_key"], "idempotency_key": "api-confirm",
    })
    assert confirmed.status_code == 200
    body = confirmed.json()
    assert body["status"] == "verification_pending"
    route._synthetic_adapter.record_transfer(
        provider_session_id=body["provider_session_id"],
        transfer=_transfer(transaction_id="api-transfer", reference=body["collection_reference"]),
    )
    checked = client.post(f"/member-credits/purchases/{body['order_key']}/check-payment")
    assert checked.status_code == 200
    assert checked.json()["status"] == "awarded"
    assert checked.json()["balance_units"] == 4
    assert client.get(f"/member-credits/purchases/{body['order_key']}").json()["status"] == "awarded"
    assert client.get("/member-credits/me").json()["balance_units"] == 4
    with SessionLocal() as db:
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1
        assert db.query(SpotlightCampaign).count() == 0


def test_service_quote_is_server_owned_test_only_and_does_not_activate(
    client, override_current_user, monkeypatch,
) -> None:
    _seed_catalog()
    with SessionLocal() as db:
        service = MemberCreditServiceVersion(
            service_code="synthetic.service", version=3, credit_cost=2,
            duration_seconds=86400, status="test_active",
            terms_json='{"synthetic":true}', created_at=NOW,
        )
        db.add(service)
        db.commit()
        service_id = int(service.id)
    assert client.get(f"/member-credits/quotes/services/{service_id}").status_code == 404
    monkeypatch.setenv("GSN_MEMBER_CREDIT_TEST_QUOTES_ENABLED", "1")
    response = client.get(f"/member-credits/quotes/services/{service_id}")
    assert response.status_code == 200
    assert response.json()["credit_cost"] == 2
    assert response.json()["duration_seconds"] == 86400
    assert response.json()["selected_funding_source"] is None
    assert response.json()["activation_performed"] is False
    with SessionLocal() as db:
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0


def test_quote_expiry_member_isolation_and_idempotency_conflicts() -> None:
    pack_id = _seed_catalog()
    with SessionLocal() as db:
        quote = purchase.issue_purchase_quote(
            db, member_user_id=1, pack_version_id=pack_id,
            idempotency_key="expiring", now=NOW,
        )
        assert purchase.issue_purchase_quote(
            db, member_user_id=1, pack_version_id=pack_id,
            idempotency_key="expiring", now=NOW + timedelta(minutes=2),
        ).id == quote.id
        with pytest.raises(MemberCreditError, match="purchase_quote_expired"):
            purchase.confirm_purchase(
                db, member_user_id=1, quote_key=quote.quote_key,
                idempotency_key="late", now=NOW + timedelta(minutes=15),
            )
        with pytest.raises(MemberCreditError, match="purchase_quote_not_found"):
            purchase.confirm_purchase(
                db, member_user_id=2, quote_key=quote.quote_key,
                idempotency_key="stolen", now=NOW,
            )

    with SessionLocal() as db:
        fresh = purchase.issue_purchase_quote(
            db, member_user_id=1, pack_version_id=pack_id,
            idempotency_key="fresh", now=NOW,
        )
        order = purchase.confirm_purchase(
            db, member_user_id=1, quote_key=fresh.quote_key,
            idempotency_key="same-confirm", now=NOW,
        )
        assert purchase.confirm_purchase(
            db, member_user_id=1, quote_key=fresh.quote_key,
            idempotency_key="same-confirm", now=NOW,
        ).id == order.id
        other = purchase.issue_purchase_quote(
            db, member_user_id=1, pack_version_id=pack_id,
            idempotency_key="other", now=NOW,
        )
        with pytest.raises(MemberCreditError, match="conflicting_idempotency_fingerprint"):
            purchase.confirm_purchase(
                db, member_user_id=1, quote_key=other.quote_key,
                idempotency_key="same-confirm", now=NOW,
            )
        with pytest.raises(MemberCreditError, match="purchase_order_not_found"):
            purchase.purchase_status(db, member_user_id=2, order_key=order.order_key)


def test_interrupted_collection_creation_reuses_provider_session(monkeypatch) -> None:
    pack_id = _seed_catalog()
    adapter = purchase.SyntheticCollectionAdapter()
    with SessionLocal() as db:
        quote = purchase.issue_purchase_quote(
            db, member_user_id=1, pack_version_id=pack_id,
            idempotency_key="interrupt-quote", now=NOW,
        )
        order = purchase.confirm_purchase(
            db, member_user_id=1, quote_key=quote.quote_key,
            idempotency_key="interrupt-confirm", now=NOW,
        )
        original = purchase._persist_collection_session

        def fail_after_provider(*args, **kwargs):
            raise RuntimeError("lost provider response")

        monkeypatch.setattr(purchase, "_persist_collection_session", fail_after_provider)
        with pytest.raises(RuntimeError, match="lost provider response"):
            purchase.ensure_collection_session(
                db, member_user_id=1, order_key=order.order_key,
                idempotency_key="interrupt-session", adapter=adapter, now=NOW,
            )
        attempt = db.query(MemberCreditCollectionAttempt).one()
        assert attempt.status == "creation_unknown"
        assert len(adapter.sessions) == 1

        monkeypatch.setattr(purchase, "_persist_collection_session", original)
        recovered = purchase.ensure_collection_session(
            db, member_user_id=1, order_key=order.order_key,
            idempotency_key="interrupt-session", adapter=adapter, now=NOW,
        )
        assert recovered.status == "ready"
        assert recovered.provider_session_id == next(iter(adapter.sessions.values())).provider_session_id
        assert len(adapter.sessions) == 1


def test_wrong_transfer_duplicate_notification_two_transfers_and_late_settlement() -> None:
    _, order_key, session_id, reference, adapter = _quote_and_order()
    adapter.record_transfer(
        provider_session_id=session_id,
        transfer=_transfer(transaction_id="wrong-reference", reference="wrong"),
    )
    with SessionLocal() as db:
        first = purchase.check_purchase_payment(
            db, member_user_id=1, order_key=order_key, adapter=adapter, now=NOW,
        )
        assert first["status"] == "verification_pending"
        assert first["receipts"][0]["exception_code"] == "collection_reference_mismatch_unallocated"

    valid = _transfer(transaction_id="valid-one", reference=reference)
    adapter.record_transfer(provider_session_id=session_id, transfer=valid)
    adapter.record_transfer(provider_session_id=session_id, transfer=valid)
    with SessionLocal() as db:
        awarded = purchase.check_purchase_payment(
            db, member_user_id=1, order_key=order_key, adapter=adapter, now=NOW,
        )
        assert awarded["status"] == "awarded"
        assert awarded["balance_units"] == 4
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1
        assert db.query(MemberCreditProviderPayment).count() == 2

    adapter.record_transfer(
        provider_session_id=session_id,
        transfer=_transfer(transaction_id="valid-one", reference=reference, settled=True),
    )
    adapter.record_transfer(
        provider_session_id=session_id,
        transfer=_transfer(transaction_id="additional-transfer", reference=reference),
    )
    with SessionLocal() as db:
        replayed = purchase.check_purchase_payment(
            db, member_user_id=1, order_key=order_key, adapter=adapter, now=NOW,
        )
        assert replayed["balance_units"] == 4
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1
        assert db.query(MemberCreditProviderPayment).count() == 3
        receipts = {item["provider_transaction_id"]: item for item in replayed["receipts"]}
        assert receipts["valid-one"]["settled_at"] is not None
        assert receipts["additional-transfer"]["exception_code"] == "fulfilled_order_additional_payment_unallocated"


def test_interrupted_award_remains_visible_and_retryable(monkeypatch) -> None:
    _, order_key, session_id, reference, adapter = _quote_and_order()
    adapter.record_transfer(
        provider_session_id=session_id,
        transfer=_transfer(transaction_id="award-interrupt", reference=reference),
    )
    original = purchase._apply_verified_award

    def fail_award(*args, **kwargs):
        raise RuntimeError("synthetic award interruption")

    monkeypatch.setattr(purchase, "_apply_verified_award", fail_award)
    with SessionLocal() as db:
        pending = purchase.check_purchase_payment(
            db, member_user_id=1, order_key=order_key, adapter=adapter, now=NOW,
        )
        assert pending["status"] == "verified_award_pending"
        assert pending["award_error"] == "RuntimeError"
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0

    monkeypatch.setattr(purchase, "_apply_verified_award", original)
    with SessionLocal() as db:
        recovered = purchase.check_purchase_payment(
            db, member_user_id=1, order_key=order_key, adapter=adapter, now=NOW,
        )
        assert recovered["status"] == "awarded"
        assert recovered["balance_units"] == 4
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1


def test_production_and_payment_suspension_gates_reject_test_catalog(monkeypatch) -> None:
    pack_id = _seed_catalog()
    with SessionLocal() as db:
        monkeypatch.setenv("PYTEST_RUNNING", "0")
        with pytest.raises(MemberCreditError, match="synthetic_member_credit_runtime_not_enabled"):
            purchase.issue_purchase_quote(
                db, member_user_id=1, pack_version_id=pack_id,
                idempotency_key="not-production", now=NOW,
            )
        monkeypatch.setenv("PYTEST_RUNNING", "1")
        monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "0")
        with pytest.raises(Exception, match="payment operations are suspended"):
            purchase.issue_purchase_quote(
                db, member_user_id=1, pack_version_id=pack_id,
                idempotency_key="suspended", now=NOW,
            )
