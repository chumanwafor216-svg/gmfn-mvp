from __future__ import annotations

import json
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base as CoreBase
from app.db.models import Clan, ClanMembership, User
from app.db.bank_models import ExpectedPayment
from app.db.database import engine
from app.db.pipeline_credit_models import PipelineCreditAccount, PipelineCreditLedgerEntry
from app.services.bank_application_service import apply_expected_payment_match
from app.services.payment_instruction_service import create_pipeline_credit_topup_instruction
from app.services.reconciliation_service import create_bank_event, reconcile_batch

@pytest.fixture()
def isolated_reconciliation_db():
    local_engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    CoreBase.metadata.create_all(bind=local_engine)
    LocalSession = sessionmaker(bind=local_engine, autoflush=False, autocommit=False, future=True)
    db = LocalSession()
    try:
        db.add(User(id=1, email="pytest@example.com", hashed_password="hashed", role="admin"))
        db.add(
            Clan(
                id=1,
                name="Test Clan",
                invite_code="test-invite-1",
                community_code="GMFN-C-000001",
                status="active",
                invite_uses=0,
            )
        )
        db.add(ClanMembership(id=1, clan_id=1, user_id=1, role="admin"))
        db.commit()
        yield db
    finally:
        db.close()
        local_engine.dispose()

def test_pipeline_credit_topup_instruction_route_creates_expected_payment(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    res = client.post(
        "/payment-instructions/pipeline-credit-topup",
        json={
            "clan_id": 1,
            "amount": "8.00",
            "currency": "GBP",
            "note": "Founding proof pilot API float",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["instruction_type"] == "pipeline_credit_topup"
    assert body["expected_type"] == "pipeline_credit_topup"
    assert body["payment_stage"] == "pending_authentication"
    assert body["status"] == "expected"
    assert body["amount"] == "8.00"
    assert body["clan_id"] == 1
    assert body["pipeline_credit_account_owner_type"] == "community"
    assert body["settlement"]["configured"] in {True, False}
    assert "not customer funds" in body["boundary"]
    assert "wallet" in body["boundary"]
    assert "cash-out" in body["boundary"]

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT expected_type, clan_id, user_id, amount, currency, meta_json
                FROM expected_payments
                WHERE id = :expected_payment_id
                """
            ),
            {"expected_payment_id": int(body["expected_payment_id"])},
        ).mappings().one()

    meta = json.loads(row["meta_json"] or "{}")
    assert row["expected_type"] == "pipeline_credit_topup"
    assert int(row["clan_id"]) == 1
    assert int(row["user_id"]) == 1
    assert str(row["currency"]) == "GBP"
    assert meta["payment_context"] == "pipeline_credit_topup"
    assert meta["pipeline_credit_account_owner_type"] == "community"
    assert meta["clan_id"] == 1


def test_pipeline_credit_topup_route_requires_community_admin(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    res = client.post(
        "/payment-instructions/pipeline-credit-topup",
        json={"clan_id": 1, "amount": "8.00", "currency": "GBP"},
    )
    assert res.status_code == 403, res.text



def test_pipeline_credit_topup_route_rejects_controlled_malformed_values(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    numeric_amount = client.post(
        "/payment-instructions/pipeline-credit-topup",
        json={"clan_id": 1, "amount": 8, "currency": "GBP"},
    )
    assert numeric_amount.status_code == 422, numeric_amount.text
    assert "amount must be a decimal string" in numeric_amount.text

    bool_clan = client.post(
        "/payment-instructions/pipeline-credit-topup",
        json={"clan_id": True, "amount": "8.00", "currency": "GBP"},
    )
    assert bool_clan.status_code == 422, bool_clan.text
    assert "clan_id must be an integer" in bool_clan.text

    too_small = client.post(
        "/payment-instructions/pipeline-credit-topup",
        json={"clan_id": 1, "amount": "0.50", "currency": "GBP"},
    )
    assert too_small.status_code == 422, too_small.text



def test_pipeline_credit_topup_reconciliation_allocates_only_after_confirmed_payment(
    isolated_reconciliation_db,
):
    db = isolated_reconciliation_db
    instruction = create_pipeline_credit_topup_instruction(
        db,
        owner_user_id=1,
        clan_id=1,
        amount=Decimal("8.00"),
        currency="GBP",
        note="Confirmed pilot API top-up",
    )

    bank_event = create_bank_event(
        db,
        clan_id=1,
        source_type="webhook_api",
        source_id="pipeline-credit-test",
        direction="credit",
        amount=Decimal("8.00"),
        currency="GBP",
        reference_raw=instruction["reference_display"],
        description_raw="Pipeline credit top-up",
        bank_txn_id="TXN-PCREDIT-1",
        posted_at=None,
        value_at=None,
        meta={"test": "pipeline_credit_topup"},
    )

    stats = reconcile_batch(db, clan_id=1, limit=50)
    assert stats["confirmed"] == 1

    expected = db.get(ExpectedPayment, int(instruction["expected_payment_id"]))
    assert expected is not None
    assert expected.status == "confirmed"
    assert expected.bank_event_id == bank_event.id

    account = db.query(PipelineCreditAccount).filter_by(account_key="community:1").one()
    assert account.owner_type == "community"
    assert int(account.clan_id) == 1

    entries = db.query(PipelineCreditLedgerEntry).filter_by(account_id=account.id).all()
    assert len(entries) == 1
    entry = entries[0]
    assert entry.entry_type == "allocation"
    assert entry.workflow_key == "pipeline_credit.topup.bank_confirmed"
    assert entry.reference_type == "expected_payment"
    assert entry.reference_id == str(int(expected.id))
    assert entry.idempotency_key == f"pipeline-credit-topup:expected-payment:{int(expected.id)}"
    assert Decimal(str(entry.credit_amount)) == Decimal("8.00")
    assert Decimal(str(entry.balance_after)) == Decimal("8.00")

    repeat = apply_expected_payment_match(
        db,
        bank_event_id=int(bank_event.id),
        expected_payment_id=int(expected.id),
    )
    assert repeat["applied"] is False
    assert repeat["reason"] == "already_applied"

    entries_after = db.query(PipelineCreditLedgerEntry).filter_by(account_id=account.id).all()
    assert len(entries_after) == 1



def test_pipeline_credit_topup_partial_payment_does_not_allocate_credits(
    isolated_reconciliation_db,
):
    db = isolated_reconciliation_db
    instruction = create_pipeline_credit_topup_instruction(
        db,
        owner_user_id=1,
        clan_id=1,
        amount=Decimal("10.00"),
        currency="GBP",
        note="Partial payment must not create usage credit",
    )

    create_bank_event(
        db,
        clan_id=1,
        source_type="webhook_api",
        source_id="pipeline-credit-partial-test",
        direction="credit",
        amount=Decimal("5.00"),
        currency="GBP",
        reference_raw=instruction["reference_display"],
        description_raw="Partial pipeline credit top-up",
        bank_txn_id="TXN-PCREDIT-PARTIAL-1",
        posted_at=None,
        value_at=None,
        meta={"test": "pipeline_credit_topup_partial"},
    )

    stats = reconcile_batch(db, clan_id=1, limit=50)
    assert stats["partial"] == 1

    expected = db.get(ExpectedPayment, int(instruction["expected_payment_id"]))
    assert expected is not None
    assert expected.status == "partial"
    assert Decimal(str(expected.paid_amount)) == Decimal("5.00")
    assert Decimal(str(expected.remaining_amount)) == Decimal("5.00")

    assert db.query(PipelineCreditAccount).filter_by(account_key="community:1").first() is None
    assert db.query(PipelineCreditLedgerEntry).count() == 0


def test_payment_instruction_config_exposes_pipeline_credit_topup(client, override_current_user):
    res = client.get("/payment-instructions/my")
    assert res.status_code == 200, res.text
    body = res.json()
    assert "pipeline_credit_topup" in body["available_instruction_types"]
    assert body["pipeline_credit_config"]["min_topup_gbp"] == "1.00"
    assert body["pipeline_credit_config"]["applies_after"] == "bank_or_provider_reconciliation_confirmed"
    assert "not customer funds" in body["pipeline_credit_config"]["boundary"]
