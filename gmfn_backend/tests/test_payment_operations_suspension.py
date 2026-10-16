from __future__ import annotations

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.pipeline_credit_service import allocate_pipeline_credits
from app.services.pipeline_credit_spend_gate import debit_provider_spend


def _count(table_name: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar() or 0)


def test_free_pilot_hides_usable_payment_rails_and_instructions(
    client, override_current_user, monkeypatch
):
    monkeypatch.delenv("GSN_PAYMENT_OPERATIONS_ENABLED", raising=False)

    rails = client.get("/payment-rails")
    assert rails.status_code == 200
    bank = rails.json()["items"][0]
    assert bank["status"] == "suspended_free_pilot"
    assert bank["supports_inbound"] is False
    assert bank["supports_outbound"] is False
    assert bank["settlement"] is None

    config = client.get("/payment-instructions/my")
    assert config.status_code == 200
    body = config.json()
    assert body["payment_operations_enabled"] is False
    assert body["settlement"] is None
    assert "pipeline_credit_topup" not in body["available_instruction_types"]
    assert "unit_price_gbp" not in str(body)


def test_free_pilot_rejects_new_collection_before_writing(
    client, override_current_user, monkeypatch
):
    monkeypatch.delenv("GSN_PAYMENT_OPERATIONS_ENABLED", raising=False)
    before = _count("expected_payments")
    response = client.post(
        "/payment-instructions/pool",
        json={
            "clan_id": 1,
            "amount": "20.00",
            "currency": "GBP",
            "contribution_reason": "Pilot contribution",
        },
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "payment_operations_suspended"
    assert _count("expected_payments") == before


def test_free_pilot_rejects_admin_credit_allocation_before_writing(
    client, override_current_user, monkeypatch
):
    monkeypatch.delenv("GSN_PAYMENT_OPERATIONS_ENABLED", raising=False)
    before = _count("pipeline_credit_ledger_entries")
    response = client.post(
        "/pipeline-credits/allocate",
        json={
            "owner_type": "platform",
            "amount": "5.00",
            "idempotency_key": "pilot-suspension-allocation",
        },
    )
    assert response.status_code == 409
    assert "suspended" in response.text.lower()
    assert _count("pipeline_credit_ledger_entries") == before


def test_free_pilot_blocks_provider_spend_without_consuming_existing_credit(monkeypatch):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    with SessionLocal() as db:
        entry = allocate_pipeline_credits(
            db,
            owner_type="platform",
            amount="3.00",
            idempotency_key="pilot-suspension-provider-seed",
        )
        account_id = int(entry.account_id)

    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_TEST_PROVIDER", str(account_id))
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_TEST_PROVIDER", "0.25")
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "0")
    before = _count("pipeline_credit_ledger_entries")
    with SessionLocal() as db:
        result = debit_provider_spend(
            db,
            provider_key="test.provider",
            workflow_key="test.provider",
            idempotency_key="pilot-suspension-provider-spend",
            reference_type="test",
            reference_id="pilot-suspension",
            note="must remain blocked",
        )
    assert result.ok is False
    assert result.status == "blocked_payment_operations_suspended"
    assert _count("pipeline_credit_ledger_entries") == before


def test_free_pilot_blocks_manual_paid_entitlement_approval(
    client, override_current_user, monkeypatch
):
    monkeypatch.delenv("GSN_PAYMENT_OPERATIONS_ENABLED", raising=False)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, community_code, status, invite_code, invite_uses, created_at
                ) VALUES (
                    1, 'Pilot Community', 'GMFN-C-PILOT', 'active', 'pilot-invite', 0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, clan_id, status, verification_status,
                    created_at, updated_at
                ) VALUES (
                    1, 'pilot-domain', 'Pilot Domain', 'ngo_project_network',
                    'ngo_project_network', 1, 1, 'draft', 'unverified',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO expected_payments (
                    id, clan_id, user_id, expected_type, amount, currency,
                    reference_display, reference_normalized, status, paid_amount,
                    remaining_amount, meta_json, created_at
                ) VALUES (
                    1, 1, 1, 'community_domain_subscription', 20.00, 'GBP',
                    'PILOT-OLD', 'PILOT-OLD', 'proof_submitted', 0.00, 20.00,
                    :meta_json,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "meta_json": (
                    '{"proof_submitted_at":"2026-10-16T12:00:00Z",'
                    '"community_domain_id":1}'
                )
            },
        )

    before = _count("feature_entitlements")
    response = client.post(
        "/admin/bank/expected-payments/1/finance-review",
        json={"decision": "approve", "note": "must stay suspended"},
    )
    assert response.status_code == 409, response.text
    assert "suspended" in response.text.lower()
    assert _count("feature_entitlements") == before
    with engine.begin() as conn:
        status = conn.execute(
            text("SELECT status FROM expected_payments WHERE id=1")
        ).scalar_one()
    assert status == "proof_submitted"
