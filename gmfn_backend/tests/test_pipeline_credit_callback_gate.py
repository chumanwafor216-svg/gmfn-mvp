from __future__ import annotations

from contextlib import contextmanager
from decimal import Decimal

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.community_confirmation_callback_delivery import (
    attempt_confirmation_callback_delivery,
)
from app.services.pipeline_credit_service import allocate_pipeline_credits


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


REQUEST = Obj(
    id=701,
    community_id=1,
    subject_user_id=2,
    public_token="callback-token-701",
)


CALLBACK = {
    "requested": True,
    "channel": "whatsapp",
    "contact": "+447700900701",
    "contact_masked": "+44...0701",
}


def test_callback_webhook_blocks_without_pipeline_credit_config(monkeypatch):
    calls = {"count": 0}

    def fake_urlopen(*args, **kwargs):
        calls["count"] += 1
        raise AssertionError("webhook should not be called without pipeline credits")

    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_DELIVERY_MODE", "webhook")
    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL", "https://callback.example/deliver")
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_COMMUNITY_CALLBACK_WEBHOOK", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_COMMUNITY_CALLBACK_WEBHOOK", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", raising=False)
    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    with SessionLocal() as db:
        result = attempt_confirmation_callback_delivery(
            db=db,
            request=REQUEST,
            requester_callback=CALLBACK,
            event="community_confirmation.outcome_updated",
            visible_summary="3 members confirmed this relationship.",
            confidence="strong_signal",
            responses_received=3,
        )

    assert result["delivery_status"] == "blocked_missing_pipeline_credit_config"
    assert "Pipeline Credit gate" in result["delivery_note"]
    assert result["last_delivery_attempt"]["pipeline_credit_gate"]["ok"] is False
    assert calls["count"] == 0

    with engine.begin() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM pipeline_credit_ledger_entries")).scalar() == 0


def test_callback_webhook_debits_pipeline_credit_before_delivery(monkeypatch):
    with SessionLocal() as db:
        entry = allocate_pipeline_credits(
            db,
            owner_type="platform",
            amount="4.00",
            idempotency_key="alloc-callback-webhook-test",
            note="Test callback webhook account",
        )
        account_id = int(entry.account_id)

    class FakeResponse:
        status = 202

        def getcode(self):
            return 202

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    calls = []

    def fake_urlopen(request, timeout=None):
        calls.append({"url": request.full_url, "timeout": timeout})
        return FakeResponse()

    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_DELIVERY_MODE", "webhook")
    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL", "https://callback.example/deliver")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", str(account_id))
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", "0.75")
    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    with SessionLocal() as db:
        result = attempt_confirmation_callback_delivery(
            db=db,
            request=REQUEST,
            requester_callback=CALLBACK,
            event="community_confirmation.outcome_updated",
            visible_summary="3 members confirmed this relationship.",
            confidence="strong_signal",
            responses_received=3,
        )

    assert result["delivery_status"] == "accepted"
    assert result["last_delivery_attempt"]["pipeline_credit_gate"]["ok"] is True
    assert result["last_delivery_attempt"]["pipeline_credit_gate"]["ledger_entry"]["credit_amount"] == "-0.75"
    assert calls == [{"url": "https://callback.example/deliver", "timeout": 4.0}]

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT credit_amount, balance_after, workflow_key, provider_key
                FROM pipeline_credit_ledger_entries
                WHERE entry_type = 'debit'
                """
            )
        ).fetchone()

    assert row is not None
    assert Decimal(str(row[0])) == Decimal("-0.75")
    assert Decimal(str(row[1])) == Decimal("3.25")
    assert row[2] == "community.callback_webhook.delivery"
    assert row[3] == "community.callback_webhook"
