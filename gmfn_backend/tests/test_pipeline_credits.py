from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


def test_pipeline_credit_status_requires_admin(client, override_current_user_user):
    res = client.get("/pipeline-credits/status?clan_id=1")
    assert res.status_code == 403


def _seed_pipeline_credit_account_for_clan(clan_id: int = 1, balance: str = "18.00") -> int:
    account_key = f"community:{clan_id}"
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pipeline_credit_accounts (
                    account_key,
                    owner_type,
                    clan_id,
                    currency,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (:account_key, 'community', :clan_id, 'GBP', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            ),
            {"account_key": account_key, "clan_id": clan_id},
        )
        account_id = conn.execute(
            text("SELECT id FROM pipeline_credit_accounts WHERE account_key = :account_key"),
            {"account_key": account_key},
        ).scalar_one()
        conn.execute(
            text(
                """
                INSERT INTO pipeline_credit_ledger_entries (
                    account_id,
                    clan_id,
                    entry_type,
                    credit_amount,
                    balance_after,
                    workflow_key,
                    reference_type,
                    reference_id,
                    idempotency_key,
                    note,
                    created_by_user_id,
                    created_at
                )
                VALUES (
                    :account_id,
                    :clan_id,
                    'allocation',
                    :balance,
                    :balance,
                    'pipeline_credit.allocation',
                    'pytest_seed',
                    :account_key,
                    :idempotency_key,
                    'Seeded community balance',
                    1,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "account_id": account_id,
                "clan_id": clan_id,
                "balance": balance,
                "account_key": account_key,
                "idempotency_key": f"seed-community-status-{clan_id}",
            },
        )
    return int(account_id)


def test_pipeline_credit_community_provider_gates_allows_community_admin_redacted(
    client,
    override_current_user_user,
    seed_clan_admin_membership,
):
    res = client.get("/pipeline-credits/community-provider-gates?clan_id=1")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["clan_id"] == 1
    assert body["visibility"] == "community_redacted"
    assert body["total"] >= 7
    assert "do not expose secrets" in body["boundary"]

    item = body["items"][0]
    assert item["visibility"] == "community_redacted"
    assert "provider_key" in item
    assert "workflow_key" in item
    assert "integration_status" in item
    assert "status" in item
    assert "account_env_names" not in item
    assert "cost_env_names" not in item
    assert "account_id" not in item
    assert "account_exists" not in item
    assert "balance" not in item


def test_pipeline_credit_community_provider_gates_rejects_ordinary_member(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    res = client.get("/pipeline-credits/community-provider-gates?clan_id=1")
    assert res.status_code == 403


def test_pipeline_credit_community_provider_gates_rejects_other_community(
    client,
    override_current_user_user,
    seed_clan_admin_membership,
):
    res = client.get("/pipeline-credits/community-provider-gates?clan_id=2")
    assert res.status_code == 403

def test_pipeline_credit_community_status_allows_community_admin(
    client,
    override_current_user_user,
    seed_clan_admin_membership,
):
    account_id = _seed_pipeline_credit_account_for_clan(1, "18.00")

    res = client.get("/pipeline-credits/community-status?clan_id=1")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["configured"] is True
    assert body["clan_id"] == 1
    assert body["account"]["id"] == account_id
    assert body["account"]["account_key"] == "community:1"
    assert body["account"]["balance"] == "18.00"
    assert body["entries"][0]["idempotency_key"] == "seed-community-status-1"
    assert "not customer funds" in body["boundary"]


def test_pipeline_credit_community_status_rejects_ordinary_member(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _seed_pipeline_credit_account_for_clan(1, "12.00")

    res = client.get("/pipeline-credits/community-status?clan_id=1")
    assert res.status_code == 403


def test_pipeline_credit_community_status_rejects_other_community(
    client,
    override_current_user_user,
    seed_clan_admin_membership,
):
    res = client.get("/pipeline-credits/community-status?clan_id=2")
    assert res.status_code == 403


def test_pipeline_credit_community_status_reports_missing_account(
    client,
    override_current_user_user,
    seed_clan_admin_membership,
):
    res = client.get("/pipeline-credits/community-status?clan_id=1")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["configured"] is False
    assert body["clan_id"] == 1
    assert body["account"] is None
    assert body["entries"] == []

def test_pipeline_credit_allocate_creates_community_account_and_boundary(client, override_current_user):
    res = client.post(
        "/pipeline-credits/allocate",
        json={
            "owner_type": "community",
            "clan_id": 1,
            "amount": "25.50",
            "currency": "GBP",
            "idempotency_key": "alloc-community-1",
            "reference_type": "manual_pilot_topup",
            "reference_id": "pilot-001",
            "note": "Founding proof pilot",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()

    assert body["ok"] is True
    assert body["entry"]["entry_type"] == "allocation"
    assert body["entry"]["credit_amount"] == "25.50"
    assert body["entry"]["balance_after"] == "25.50"
    assert body["account"]["owner_type"] == "community"
    assert body["account"]["account_key"] == "community:1"
    assert body["account"]["balance"] == "25.50"
    assert "not customer funds" in body["boundary"]
    assert "cash-out" in body["boundary"]
    assert "loan" in body["boundary"]

    status = client.get("/pipeline-credits/status?clan_id=1")
    assert status.status_code == 200, status.text
    status_body = status.json()
    assert status_body["configured"] is True
    assert status_body["account"]["balance"] == "25.50"
    assert status_body["entries"][0]["idempotency_key"] == "alloc-community-1"


def test_pipeline_credit_debit_consumes_provider_usage(client, override_current_user):
    alloc = client.post(
        "/pipeline-credits/allocate",
        json={
            "clan_id": 1,
            "amount": "10.00",
            "idempotency_key": "alloc-debit-test",
            "reference_type": "manual_pilot_topup",
            "reference_id": "pilot-debit",
        },
    )
    assert alloc.status_code == 201, alloc.text

    debit = client.post(
        "/pipeline-credits/debit",
        json={
            "clan_id": 1,
            "amount": "3.25",
            "idempotency_key": "debit-truelayer-1",
            "workflow_key": "bank.gb.truelayer.account_holder_verification",
            "provider_key": "truelayer",
            "reference_type": "provider_call",
            "reference_id": "tl-call-001",
        },
    )
    assert debit.status_code == 201, debit.text
    body = debit.json()

    assert body["entry"]["entry_type"] == "debit"
    assert body["entry"]["credit_amount"] == "-3.25"
    assert body["entry"]["balance_after"] == "6.75"
    assert body["entry"]["workflow_key"] == "bank.gb.truelayer.account_holder_verification"
    assert body["entry"]["provider_key"] == "truelayer"
    assert body["account"]["balance"] == "6.75"


def test_pipeline_credit_debit_rejects_insufficient_balance(client, override_current_user):
    alloc = client.post(
        "/pipeline-credits/allocate",
        json={
            "owner_type": "user",
            "owner_user_id": 1,
            "amount": "2.00",
            "idempotency_key": "alloc-user-small",
        },
    )
    assert alloc.status_code == 201, alloc.text

    debit = client.post(
        "/pipeline-credits/debit",
        json={
            "owner_type": "user",
            "owner_user_id": 1,
            "amount": "3.00",
            "idempotency_key": "debit-too-much",
            "workflow_key": "sms.verify.phone",
            "provider_key": "twilio",
        },
    )
    assert debit.status_code == 409, debit.text
    assert "insufficient" in debit.text.lower()

    status = client.get("/pipeline-credits/status?owner_type=user&owner_user_id=1")
    assert status.status_code == 200, status.text
    assert status.json()["account"]["balance"] == "2.00"

    with engine.begin() as conn:
        count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM pipeline_credit_ledger_entries
                WHERE idempotency_key = 'debit-too-much'
                """
            )
        ).scalar()
    assert count == 0


def test_pipeline_credit_debit_is_idempotent(client, override_current_user):
    alloc = client.post(
        "/pipeline-credits/allocate",
        json={
            "clan_id": 2,
            "amount": "9.00",
            "idempotency_key": "alloc-idem-test",
        },
    )
    assert alloc.status_code == 201, alloc.text

    payload = {
        "clan_id": 2,
        "amount": "4.00",
        "idempotency_key": "debit-idem-once",
        "workflow_key": "ai.openai.discovery_summary",
        "provider_key": "openai",
    }
    first = client.post("/pipeline-credits/debit", json=payload)
    second = client.post("/pipeline-credits/debit", json=payload)

    assert first.status_code == 201, first.text
    assert second.status_code == 201, second.text
    assert first.json()["entry"]["id"] == second.json()["entry"]["id"]
    assert second.json()["account"]["balance"] == "5.00"

    with engine.begin() as conn:
        count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM pipeline_credit_ledger_entries
                WHERE idempotency_key = 'debit-idem-once'
                """
            )
        ).scalar()
    assert count == 1


def test_pipeline_credit_allocate_rejects_public_account_id_allocation(client, override_current_user):
    res = client.post(
        "/pipeline-credits/allocate",
        json={
            "account_id": 99,
            "amount": "5.00",
            "idempotency_key": "bad-account-alloc",
        },
    )
    assert res.status_code == 422
    assert "owner scope" in res.text


def test_pipeline_credit_provider_gates_requires_admin(client, override_current_user_user):
    res = client.get("/pipeline-credits/provider-gates")
    assert res.status_code == 403


def test_pipeline_credit_provider_gates_reports_missing_and_not_wired_truth(
    client,
    override_current_user,
    monkeypatch,
):
    for name in (
        "GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID",
        "GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST",
        "GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION",
        "GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION",
        "GSN_PIPELINE_CREDIT_ACCOUNT_ID_AI_OPENAI_DISCOVERY_SUMMARY",
        "GSN_PIPELINE_CREDIT_COST_AI_OPENAI_DISCOVERY_SUMMARY",
    ):
        monkeypatch.delenv(name, raising=False)

    res = client.get("/pipeline-credits/provider-gates")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["ok"] is True
    assert body["total"] >= 7
    assert "perform paid calls" in body["boundary"]

    gates = {item["workflow_key"]: item for item in body["items"]}
    truelayer = gates["bank.gb.truelayer.account_holder_verification"]
    assert truelayer["integration_status"] == "wired"
    assert truelayer["status"] == "blocked_missing_pipeline_credit_config"
    assert truelayer["account_configured"] is False
    assert truelayer["cost_configured"] is False
    assert "GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION" in truelayer["account_env_names"]

    ai = gates["ai.openai.discovery_summary"]
    assert ai["integration_status"] == "not_wired"
    assert ai["status"] == "blocked_missing_pipeline_credit_config"


def test_pipeline_credit_provider_gates_report_ready_and_not_wired_meter_config(
    client,
    override_current_user,
    monkeypatch,
):
    alloc = client.post(
        "/pipeline-credits/allocate",
        json={
            "owner_type": "platform",
            "amount": "12.00",
            "idempotency_key": "alloc-provider-gates-test",
            "note": "Provider gate catalog test",
        },
    )
    assert alloc.status_code == 201, alloc.text
    account_id = alloc.json()["account"]["id"]

    monkeypatch.setenv(
        "GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION",
        str(account_id),
    )
    monkeypatch.setenv(
        "GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION",
        "1.25",
    )
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_AI_OPENAI_DISCOVERY_SUMMARY", str(account_id))
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_AI_OPENAI_DISCOVERY_SUMMARY", "0.50")

    res = client.get("/pipeline-credits/provider-gates")
    assert res.status_code == 200, res.text
    gates = {item["workflow_key"]: item for item in res.json()["items"]}

    truelayer = gates["bank.gb.truelayer.account_holder_verification"]
    assert truelayer["status"] == "meter_ready"
    assert truelayer["account_id"] == account_id
    assert truelayer["account_exists"] is True
    assert truelayer["balance"] == "12.00"
    assert truelayer["cost_per_attempt"] == "1.25"

    ai = gates["ai.openai.discovery_summary"]
    assert ai["integration_status"] == "not_wired"
    assert ai["status"] == "meter_configured_but_provider_not_wired"
    assert ai["balance"] == "12.00"
    assert ai["cost_per_attempt"] == "0.50"
