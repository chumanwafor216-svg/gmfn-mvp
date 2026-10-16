from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from sqlalchemy import inspect, text

from app.api.routes import bank as bank_routes
from app.api.routes import member_credits as member_credit_routes
from app.db.database import SessionLocal, engine
from app.db.member_credit_models import (
    MemberCreditAwardObligation,
    MemberCreditPackVersion,
    MemberCreditProviderPayment,
    MemberCreditPurchaseOrder,
    MemberServiceCreditLedgerEntry,
)
from app.services import member_credit_purchase_service as purchase_service
from app.services.member_credit_purchase_service import CollectionSession, VerifiedTransfer
from app.services.stripe_member_credit_service import (
    STRIPE_PROVIDER_KEY,
    STRIPE_PURPOSE,
    StripeCheckoutCollectionAdapter,
)


NOW = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)
WEBHOOK_SECRET = "whsec_local_member_credit_test"
MERCHANT_KEY = "acct_gsn_test_merchant"


def _community_bank_event_count() -> int:
    if not inspect(engine).has_table("bank_events"):
        return 0
    with engine.connect() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM bank_events")).scalar_one())


class FakeStripeCollectionAdapter:
    provider_key = STRIPE_PROVIDER_KEY
    merchant_key = MERCHANT_KEY

    def create_session(
        self, *, idempotency_key: str, reference: str, amount_minor: int,
        currency: str, purchase_order_key: str, member_user_id: int,
    ) -> CollectionSession:
        return CollectionSession(
            provider_session_id="cs_test_gsn_purchase",
            collection_reference=reference,
            public_payload={
                "kind": "stripe_checkout",
                "checkout_url": "https://checkout.stripe.test/c/pay/cs_test_gsn_purchase",
                "livemode": False,
            },
        )

    def check_session(self, *, provider_session_id: str):
        return []


def _seed_pack() -> int:
    with engine.begin() as conn:
        conn.execute(text(
            "INSERT INTO users (id,email,hashed_password,role) "
            "VALUES (1,'buyer@example.com','x','member')"
        ))
    with SessionLocal() as db:
        pack = MemberCreditPackVersion(
            pack_code="stripe.test.pack", version=1, credit_units=4,
            quoted_amount_minor=2500, currency="GBP", status="test_active",
            terms_json='{"provider":"stripe","test_only":true}', created_at=NOW,
        )
        db.add(pack)
        db.commit()
        return int(pack.id)


def _signed_headers(raw: bytes, *, secret: str = WEBHOOK_SECRET) -> dict[str, str]:
    timestamp = int(time.time())
    digest = hmac.new(
        secret.encode("utf-8"), f"{timestamp}.".encode("utf-8") + raw, hashlib.sha256,
    ).hexdigest()
    return {
        "Content-Type": "application/json",
        "Stripe-Signature": f"t={timestamp},v1={digest}",
    }


def _gmfn_signed_headers(raw: bytes, *, secret: str) -> dict[str, str]:
    digest = hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    return {
        "Content-Type": "application/json",
        "X-GMFN-Signature": f"sha256={digest}",
    }


def _event(*, order: dict, payment_status: str = "paid", event_type: str = "checkout.session.completed",
           amount_minor: int = 2500, currency: str = "gbp", purpose: str = STRIPE_PURPOSE,
           member_user_id: int = 1, livemode: bool = False,
           extra_metadata: dict | None = None) -> dict:
    metadata = {
        "gsn_purpose": purpose,
        "gsn_merchant_key": MERCHANT_KEY,
        "gsn_collection_reference": order["collection_reference"],
        "gsn_purchase_order_key": order["order_key"],
        "gsn_member_user_id": str(member_user_id),
    }
    metadata.update(extra_metadata or {})
    return {
        "id": "evt_gsn_member_credit",
        "object": "event",
        "type": event_type,
        "livemode": livemode,
        "created": int(time.time()),
        "data": {"object": {
            "id": order["provider_session_id"],
            "object": "checkout.session",
            "mode": "payment",
            "livemode": livemode,
            "created": int(time.time()),
            "payment_status": payment_status,
            "payment_intent": "pi_gsn_member_credit",
            "amount_total": amount_minor,
            "currency": currency,
            "client_reference_id": order["order_key"],
            "metadata": metadata,
        }},
    }


def _open_purchase(client, monkeypatch) -> dict:
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("GMFN_DEV_MODE", "0")
    monkeypatch.delenv("GMFN_WEBHOOK_SECRET", raising=False)
    monkeypatch.setenv("GSN_STRIPE_MODE", "test")
    monkeypatch.setenv("GSN_STRIPE_MERCHANT_KEY", MERCHANT_KEY)
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    adapter = FakeStripeCollectionAdapter()
    monkeypatch.setattr(member_credit_routes, "_collection_adapter", lambda: adapter)
    pack_id = _seed_pack()
    quote = client.post("/member-credits/purchase-quotes", json={
        "pack_version_id": pack_id, "idempotency_key": "stripe-quote",
    })
    assert quote.status_code == 200
    purchase = client.post("/member-credits/purchases", json={
        "quote_key": quote.json()["quote_key"], "idempotency_key": "stripe-confirm",
    })
    assert purchase.status_code == 200
    assert purchase.json()["collection_action_url"].startswith("https://checkout.stripe.test/")
    return purchase.json()


def _post_event(client, event: dict, *, secret: str = WEBHOOK_SECRET):
    raw = json.dumps(event, separators=(",", ":")).encode("utf-8")
    return client.post(
        "/bank/webhook/stripe", content=raw,
        headers=_signed_headers(raw, secret=secret),
    )


def test_native_stripe_success_awards_once_without_community_funds(
    client, override_current_user, monkeypatch,
) -> None:
    order = _open_purchase(client, monkeypatch)
    first = _post_event(client, _event(order=order))
    replay = _post_event(client, _event(order=order))
    assert first.status_code == 200
    assert first.json()["awarded"] is True
    assert replay.status_code == 200
    assert replay.json()["awarded"] is True
    assert client.get("/member-credits/me").json()["balance_units"] == 4
    with SessionLocal() as db:
        assert db.query(MemberCreditProviderPayment).count() == 1
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1
        assert _community_bank_event_count() == 0


def test_existing_community_stripe_webhook_keeps_gmfn_signature_path(
    client, monkeypatch,
) -> None:
    community_secret = "legacy-community-webhook-secret"
    monkeypatch.setenv("GMFN_WEBHOOK_SECRET", community_secret)
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "0")
    captured: dict[str, object] = {}

    def capture_community_event(_db, **kwargs):
        captured.update(kwargs)
        return {"ok": True, "event": {"source_type": kwargs["source_type"], "amount": str(kwargs["amount"])}}

    monkeypatch.setattr(bank_routes, "_ingest_and_reconcile_one", capture_community_event)
    payload = {
        "id": "evt_legacy_community_stripe",
        "type": "payment_intent.succeeded",
        "data": {"object": {
            "id": "pi_legacy_community_stripe",
            "status": "succeeded",
            "amount_received": 2500,
            "currency": "gbp",
            "description": "Existing community contribution",
            "metadata": {"clan_id": "1", "reference": "GSN-POOL-1"},
        }},
    }
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    response = client.post(
        "/bank/webhook/stripe",
        content=raw,
        headers={
            **_gmfn_signed_headers(raw, secret=community_secret),
            "Stripe-Signature": "preserved-but-not-used-for-community-routing",
        },
    )

    assert response.status_code == 200
    assert response.json()["event"]["source_type"] == "webhook_api"
    assert response.json()["event"]["amount"] == "25.00"
    assert captured["clan_id"] == 1
    assert captured["source_id"] == "evt_legacy_community_stripe"
    assert captured["bank_txn_id"] == "pi_legacy_community_stripe"
    assert captured["reference_raw"] == "GSN-POOL-1"
    with SessionLocal() as db:
        assert db.query(MemberCreditProviderPayment).count() == 0
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0


def test_stripe_header_never_authenticates_a_generic_provider_webhook(
    client, monkeypatch,
) -> None:
    monkeypatch.setenv("GMFN_WEBHOOK_SECRET", "generic-provider-webhook-secret")
    monkeypatch.setattr(
        bank_routes,
        "_ingest_and_reconcile_one",
        lambda *_args, **_kwargs: pytest.fail("unauthenticated generic webhook reached ingestion"),
    )
    payload = {
        "event": "charge.success",
        "data": {
            "status": "success",
            "id": "paystack-unauthenticated",
            "clan_id": 1,
            "amount": 2500,
            "currency": "NGN",
            "reference": "GSN-POOL-1",
        },
    }

    response = client.post(
        "/bank/webhook/paystack",
        json=payload,
        headers={"Stripe-Signature": "unrelated-header-must-not-authenticate"},
    )

    assert response.status_code == 401


def test_completed_but_unpaid_checkout_does_not_award(
    client, override_current_user, monkeypatch,
) -> None:
    order = _open_purchase(client, monkeypatch)
    response = _post_event(client, _event(order=order, payment_status="unpaid"))
    assert response.status_code == 200
    assert response.json() == {
        "ok": True, "handled": True, "awarded": False, "reason": "payment_not_paid",
    }
    with SessionLocal() as db:
        assert db.query(MemberCreditProviderPayment).count() == 0
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0


def test_stripe_event_rejects_bad_signature_mode_and_member_binding(
    client, override_current_user, monkeypatch,
) -> None:
    order = _open_purchase(client, monkeypatch)
    assert _post_event(client, _event(order=order), secret="whsec_wrong").status_code == 401
    assert _post_event(client, _event(order=order, livemode=True)).status_code == 409
    mismatch = _post_event(client, _event(order=order, member_user_id=2))
    assert mismatch.status_code == 200
    assert mismatch.json()["awarded"] is False
    with SessionLocal() as db:
        payment = db.query(MemberCreditProviderPayment).one()
        assert payment.verification_status == "rejected_mismatch"
        assert payment.exception_code == "member_mismatch_unallocated"
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0
        assert _community_bank_event_count() == 0


def test_stripe_event_rejects_wrong_purchase_binding_without_durable_payment(
    client, override_current_user, monkeypatch,
) -> None:
    order = _open_purchase(client, monkeypatch)
    event = _event(order=order)
    event["data"]["object"]["metadata"]["gsn_purchase_order_key"] = "mcp-wrong-purchase"

    response = _post_event(client, event)

    assert response.status_code == 409
    with SessionLocal() as db:
        assert db.query(MemberCreditProviderPayment).count() == 0
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0


@pytest.mark.parametrize(
    ("event_kwargs", "expected_exception"),
    [
        ({"amount_minor": 2400}, "amount_mismatch_unallocated"),
        ({"currency": "usd"}, "currency_mismatch_unallocated"),
    ],
)
def test_stripe_event_does_not_award_wrong_amount_or_currency(
    client, override_current_user, monkeypatch, event_kwargs, expected_exception,
) -> None:
    order = _open_purchase(client, monkeypatch)

    response = _post_event(client, _event(order=order, **event_kwargs))

    assert response.status_code == 200
    assert response.json()["awarded"] is False
    with SessionLocal() as db:
        payment = db.query(MemberCreditProviderPayment).one()
        assert payment.exception_code == expected_exception
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0


def test_unrelated_stripe_events_and_payment_suspension_never_award(
    client, override_current_user, monkeypatch,
) -> None:
    order = _open_purchase(client, monkeypatch)
    unrelated = _post_event(client, _event(
        order=order, purpose="other_gsn_sale", extra_metadata={"clan_id": "999"},
    ))
    assert unrelated.status_code == 200
    assert unrelated.json()["handled"] is False
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "0")
    suspended = _post_event(client, _event(order=order))
    assert suspended.status_code == 503
    hidden = client.get(f"/member-credits/purchases/{order['order_key']}")
    assert hidden.status_code == 200
    assert hidden.json()["collection_action_url"] is None
    with SessionLocal() as db:
        assert db.query(MemberCreditProviderPayment).count() == 0
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0
        assert _community_bank_event_count() == 0


def test_payment_check_replay_produces_one_award(
    client, override_current_user, monkeypatch,
) -> None:
    order = _open_purchase(client, monkeypatch)

    class PaidStripeCollectionAdapter(FakeStripeCollectionAdapter):
        def check_session(self, *, provider_session_id: str):
            return [VerifiedTransfer(
                provider_transaction_id="pi_payment_check_replay",
                merchant_key=MERCHANT_KEY,
                collection_reference=order["collection_reference"],
                amount_minor=order["amount_minor"],
                currency=order["currency"],
                verified_at=NOW,
                provider_session_id=provider_session_id,
                purchase_order_key=order["order_key"],
                member_user_id=1,
            )]

    adapter = PaidStripeCollectionAdapter()
    monkeypatch.setattr(member_credit_routes, "_collection_adapter", lambda: adapter)
    first = client.post(f"/member-credits/purchases/{order['order_key']}/check-payment")
    replay = client.post(f"/member-credits/purchases/{order['order_key']}/check-payment")

    assert first.status_code == 200
    assert replay.status_code == 200
    assert first.json()["status"] == "awarded"
    assert replay.json()["status"] == "awarded"
    with SessionLocal() as db:
        assert db.query(MemberCreditProviderPayment).count() == 1
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1


def test_stripe_webhook_persists_interrupted_award_and_replay_recovers(
    client, override_current_user, monkeypatch,
) -> None:
    order = _open_purchase(client, monkeypatch)
    real_apply = purchase_service._apply_verified_award

    def fail_award(*_args, **_kwargs):
        raise RuntimeError("injected_award_interruption")

    monkeypatch.setattr(purchase_service, "_apply_verified_award", fail_award)
    interrupted = _post_event(client, _event(order=order))

    assert interrupted.status_code == 200
    assert interrupted.json()["awarded"] is False
    assert interrupted.json()["status"] == "verified_award_pending"
    with SessionLocal() as db:
        purchase = db.query(MemberCreditPurchaseOrder).one()
        obligation = db.query(MemberCreditAwardObligation).one()
        assert purchase.status == "funded_award_pending"
        assert obligation.status == "pending"
        assert obligation.last_error == "RuntimeError"
        assert db.query(MemberCreditProviderPayment).count() == 1
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0

    monkeypatch.setattr(purchase_service, "_apply_verified_award", real_apply)
    recovered = _post_event(client, _event(order=order))

    assert recovered.status_code == 200
    assert recovered.json()["awarded"] is True
    assert recovered.json()["status"] == "awarded"
    with SessionLocal() as db:
        assert db.query(MemberCreditProviderPayment).count() == 1
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1


def test_stripe_adapter_binds_checkout_to_merchant_member_purchase_and_minor_amount() -> None:
    class Accounts:
        @staticmethod
        def retrieve_current():
            return {"id": MERCHANT_KEY}

    class Sessions:
        created_params = None
        created_options = None

        @classmethod
        def create(cls, params, options=None):
            cls.created_params = params
            cls.created_options = options
            return {
                "id": "cs_test_bound", "url": "https://checkout.stripe.test/c/pay/bound",
                "livemode": False, "expires_at": 1_800_000_000,
            }

    client = SimpleNamespace(v1=SimpleNamespace(
        accounts=Accounts(), checkout=SimpleNamespace(sessions=Sessions()),
    ))
    adapter = StripeCheckoutCollectionAdapter(
        client=client, merchant_key=MERCHANT_KEY, mode="test",
        success_url="https://gsn.test/credits/success",
        cancel_url="https://gsn.test/credits/cancel",
    )
    result = adapter.create_session(
        idempotency_key="attempt-1", reference="mcr-1", amount_minor=2500,
        currency="GBP", purchase_order_key="mcp-1", member_user_id=17,
    )
    params = Sessions.created_params
    assert result.provider_session_id == "cs_test_bound"
    assert Sessions.created_options == {"idempotency_key": "attempt-1"}
    assert params["mode"] == "payment"
    assert params["client_reference_id"] == "mcp-1"
    assert params["line_items"][0]["price_data"]["unit_amount"] == 2500
    assert params["line_items"][0]["price_data"]["currency"] == "gbp"
    assert params["metadata"] == {
        "gsn_purpose": STRIPE_PURPOSE,
        "gsn_merchant_key": MERCHANT_KEY,
        "gsn_collection_reference": "mcr-1",
        "gsn_purchase_order_key": "mcp-1",
        "gsn_member_user_id": "17",
    }
    assert params["payment_intent_data"]["metadata"] == params["metadata"]
