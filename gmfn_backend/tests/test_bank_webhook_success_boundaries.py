from __future__ import annotations

from decimal import Decimal

import pytest

from app.api.routes.bank import bank_webhook_status
from app.services.bank_webhook_service import (
    parse_generic_webhook_payload,
    parse_provider_webhook_payload,
)


@pytest.mark.parametrize(
    ("provider", "payload"),
    [
        (
            "stripe",
            {
                "id": "evt_pending_auth",
                "type": "payment_intent.requires_action",
                "data": {
                    "object": {
                        "id": "pi_pending_auth",
                        "status": "requires_action",
                        "amount": 2500,
                        "currency": "gbp",
                        "metadata": {"clan_id": "1", "reference": "GSN-POOL-1"},
                    }
                },
            },
        ),
        (
            "paystack",
            {
                "event": "charge.pending",
                "data": {
                    "status": "pending",
                    "clan_id": 1,
                    "amount": 2500,
                    "currency": "NGN",
                    "reference": "GSN-POOL-1",
                },
            },
        ),
        (
            "flutterwave",
            {
                "event": "charge.pending",
                "data": {
                    "status": "pending",
                    "clan_id": 1,
                    "amount": "25.00",
                    "currency": "NGN",
                    "tx_ref": "GSN-POOL-1",
                },
            },
        ),
        (
            "monnify",
            {
                "eventType": "PENDING_TRANSACTION",
                "eventData": {
                    "paymentStatus": "PENDING",
                    "clan_id": 1,
                    "amountPaid": "25.00",
                    "currency": "NGN",
                    "paymentReference": "GSN-POOL-1",
                },
            },
        ),
    ],
)
def test_named_provider_webhooks_reject_pending_authentication_events(provider, payload):
    with pytest.raises(ValueError, match="not confirmed payment success"):
        parse_provider_webhook_payload(provider, payload)


def test_named_provider_webhook_requires_explicit_final_success_signal():
    payload = {
        "data": {
            "object": {
                "id": "pi_missing_status",
                "amount_received": 2500,
                "currency": "gbp",
                "metadata": {"clan_id": "1", "reference": "GSN-POOL-1"},
            }
        }
    }

    with pytest.raises(ValueError, match="must include a final success status"):
        parse_provider_webhook_payload("stripe", payload)


def test_stripe_success_webhook_maps_only_after_final_success():
    parsed = parse_provider_webhook_payload(
        "stripe",
        {
            "id": "evt_success",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_success",
                    "status": "succeeded",
                    "amount_received": 2500,
                    "currency": "gbp",
                    "description": "Pool deposit",
                    "metadata": {"clan_id": "1", "reference": "GSN-POOL-1"},
                }
            },
        },
    )

    assert parsed["provider"] == "stripe"
    assert parsed["clan_id"] == 1
    assert parsed["amount"] == Decimal("25.00")
    assert parsed["currency"] == "GBP"
    assert parsed["reference_raw"] == "GSN-POOL-1"


def test_paystack_success_webhook_maps_only_after_final_success():
    parsed = parse_provider_webhook_payload(
        "paystack",
        {
            "event": "charge.success",
            "data": {
                "status": "success",
                "id": "paystack-txn-1",
                "clan_id": 1,
                "amount": 2500,
                "currency": "NGN",
                "reference": "GSN-POOL-1",
            },
        },
    )

    assert parsed["provider"] == "paystack"
    assert parsed["clan_id"] == 1
    assert parsed["amount"] == Decimal("25.00")
    assert parsed["currency"] == "NGN"
    assert parsed["reference_raw"] == "GSN-POOL-1"


def test_generic_webhook_rejects_explicit_non_success_status_but_keeps_legacy_bank_observations():
    with pytest.raises(ValueError, match="not confirmed payment success"):
        parse_generic_webhook_payload(
            {
                "clan_id": 1,
                "amount": "25.00",
                "currency": "NGN",
                "direction": "credit",
                "status": "pending",
                "reference": "GSN-POOL-1",
            }
        )

    parsed = parse_generic_webhook_payload(
        {
            "clan_id": 1,
            "amount": "25.00",
            "currency": "NGN",
            "direction": "credit",
            "reference": "GSN-POOL-1",
        }
    )

    assert parsed["clan_id"] == 1
    assert parsed["amount"] == Decimal("25.00")
    assert parsed["reference_raw"] == "GSN-POOL-1"


def test_webhook_status_exposes_payment_confirmation_boundary():
    status = bank_webhook_status()

    assert status["payment_provider_mode"] == "bank_transfer_reconciliation"
    assert status["provider_success_event_required"] is True
    assert status["delayed_authorisation_supported"] is True
    assert status["success_requires_bank_or_provider_confirmation"] is True
    assert status["bank_authentication_replaced_by_gsn"] is False
