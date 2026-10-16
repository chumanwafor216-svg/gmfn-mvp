from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from threading import Barrier
from urllib.parse import urlparse

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.db.member_credit_models import (
    MemberCreditAwardObligation,
    MemberCreditPackVersion,
    MemberCreditProviderPayment,
    MemberCreditPurchaseOrder,
    MemberServiceCreditLedgerEntry,
)
from app.services import member_credit_purchase_service as purchase
from app.services import member_credit_service as credit


POSTGRES_URL = str(os.getenv("MEMBER_CREDIT_POSTGRES_TEST_DATABASE_URL", "")).strip()
OPT_IN = str(os.getenv("GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS", "")).lower() in {"1", "true", "yes", "on"}
pytestmark = pytest.mark.skipif(
    not POSTGRES_URL or not OPT_IN,
    reason="requires a disposable member-credit PostgreSQL URL and destructive-test opt-in",
)
NOW = datetime(2026, 10, 16, 15, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="session")
def postgres_engine():
    parsed = urlparse(POSTGRES_URL)
    name = (parsed.path or "").strip("/").lower()
    if not any(marker in name for marker in ("test", "tmp", "disposable")):
        pytest.fail("PostgreSQL URL must identify a disposable test database")
    result = create_engine(POSTGRES_URL, pool_pre_ping=True)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    with result.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    return result


@pytest.fixture(autouse=True)
def clean_postgres(postgres_engine, monkeypatch):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SYNTHETIC_PAYMENTS_ENABLED", "1")
    monkeypatch.setenv("PYTEST_RUNNING", "1")
    tables = [name for name in inspect(postgres_engine).get_table_names() if name != "alembic_version"]
    if tables:
        quoted = ", ".join(f'"{name}"' for name in tables)
        with postgres_engine.begin() as connection:
            connection.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))


def _seed(postgres_engine, *, member_id: int = 1, key: str = "one") -> int:
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    with postgres_engine.begin() as connection:
        connection.execute(text(
            "INSERT INTO users (id,email,hashed_password,role) VALUES (:id,:email,'x','member')"
        ), {"id": member_id, "email": f"{key}@example.com"})
    with sessions() as db:
        pack = MemberCreditPackVersion(
            pack_code=f"synthetic.pg.{key}", version=1, credit_units=3,
            quoted_amount_minor=1200, currency="TST", status="test_active",
            terms_json='{"synthetic":true}', created_at=NOW,
        )
        db.add(pack)
        db.commit()
        return int(pack.id)


def test_postgres_concurrent_confirmation_and_collection_creation_converge(postgres_engine) -> None:
    pack_id = _seed(postgres_engine)
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    adapter = purchase.SyntheticCollectionAdapter()
    barrier = Barrier(2)

    def quote_once():
        with sessions() as db:
            barrier.wait()
            return str(purchase.issue_purchase_quote(
                db, member_user_id=1, pack_version_id=pack_id,
                idempotency_key="pg-quote", now=NOW,
            ).quote_key)

    with ThreadPoolExecutor(max_workers=2) as pool:
        quote_keys = list(pool.map(lambda _: quote_once(), (1, 2)))
    assert quote_keys[0] == quote_keys[1]
    quote_key = quote_keys[0]
    barrier = Barrier(2)

    def confirm_once():
        with sessions() as db:
            barrier.wait()
            order = purchase.confirm_purchase(
                db, member_user_id=1, quote_key=quote_key,
                idempotency_key="pg-confirm", now=NOW,
            )
            attempt = purchase.ensure_collection_session(
                db, member_user_id=1, order_key=str(order.order_key),
                idempotency_key="pg-collection", adapter=adapter, now=NOW,
            )
            return int(order.id), str(attempt.provider_session_id)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: confirm_once(), (1, 2)))
    assert results[0] == results[1]
    with postgres_engine.begin() as connection:
        assert int(connection.execute(text("SELECT COUNT(*) FROM member_credit_purchase_orders")).scalar_one()) == 1
        assert int(connection.execute(text("SELECT COUNT(*) FROM member_credit_collection_attempts")).scalar_one()) == 1
    assert len(adapter.sessions) == 1


def _funded_order(postgres_engine, *, member_id: int, key: str) -> tuple[int, int]:
    pack_id = _seed(postgres_engine, member_id=member_id, key=key)
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    with sessions() as db:
        order = credit.create_purchase_order(
            db, member_user_id=member_id, pack_version_id=pack_id,
            idempotency_key=f"order-{key}", now=NOW, commit=False,
        )
        payment = MemberCreditProviderPayment(
            provider_key="synthetic-pg", merchant_key="synthetic-pg-merchant",
            provider_transaction_id=f"txn-{key}", amount_minor=1200,
            allocated_minor=0, currency="TST", verification_status="test_verified",
            received_at=NOW, created_at=NOW,
        )
        db.add(payment)
        db.flush()
        credit.allocate_verified_payment(
            db, provider_payment_id=int(payment.id), purchase_order_id=int(order.id),
            amount_minor=1200, policy_key="synthetic-pg-exact",
            allow_partial_contributions=False, now=NOW, commit=True,
        )
        obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=int(order.id)).one()
        return int(order.id), int(obligation.id)


def test_postgres_recovery_concurrency_normal_award_failure_progress_and_guards(
    postgres_engine, monkeypatch,
) -> None:
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    order_id, obligation_id = _funded_order(postgres_engine, member_id=1, key="concurrent")
    barrier = Barrier(2)

    def recover_once():
        with sessions() as db:
            barrier.wait()
            return credit.recover_funded_purchase_awards(db, now=NOW)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: recover_once(), (1, 2)))
    assert sum(item.awards_applied for item in results) == 1
    with postgres_engine.begin() as connection:
        count = connection.execute(text(
            "SELECT COUNT(*) FROM member_service_credit_ledger_entries WHERE reference_id=:id"
        ), {"id": str(order_id)}).scalar_one()
        assert int(count) == 1

    race_order, race_obligation = _funded_order(postgres_engine, member_id=2, key="normal-race")
    barrier = Barrier(2)

    def normal_award():
        with sessions() as db:
            barrier.wait()
            try:
                credit.apply_award_obligation(db, obligation_id=race_obligation, now=NOW)
            except Exception:
                db.rollback()

    with ThreadPoolExecutor(max_workers=2) as pool:
        first = pool.submit(recover_once)
        second = pool.submit(normal_award)
        first.result(timeout=10)
        second.result(timeout=10)
    with postgres_engine.begin() as connection:
        count = connection.execute(text(
            "SELECT COUNT(*) FROM member_service_credit_ledger_entries WHERE reference_id=:id"
        ), {"id": str(race_order)}).scalar_one()
        assert int(count) == 1

    failing_order, _ = _funded_order(postgres_engine, member_id=3, key="fails")
    progressing_order, _ = _funded_order(postgres_engine, member_id=4, key="progresses")
    original = credit._persist_award_outbox

    def fail_one(db, *, row):
        if row.aggregate_id == str(failing_order):
            raise RuntimeError("synthetic pg crash")
        return original(db, row=row)

    monkeypatch.setattr(credit, "_persist_award_outbox", fail_one)
    with sessions() as db:
        result = credit.recover_funded_purchase_awards(db, now=NOW)
    assert result.awards_applied == 1
    assert result.failures == ({"order_id": failing_order, "error": "RuntimeError"},)
    with postgres_engine.begin() as connection:
        progressed = connection.execute(text(
            "SELECT COUNT(*) FROM member_service_credit_ledger_entries WHERE reference_id=:id"
        ), {"id": str(progressing_order)}).scalar_one()
        failed = connection.execute(text(
            "SELECT COUNT(*) FROM member_service_credit_ledger_entries WHERE reference_id=:id"
        ), {"id": str(failing_order)}).scalar_one()
        assert (int(progressed), int(failed)) == (1, 0)

    monkeypatch.setattr(credit, "_persist_award_outbox", original)
    with sessions() as db:
        assert credit.recover_funded_purchase_awards(db, now=NOW).awards_applied == 1

    guarded_order, _ = _funded_order(postgres_engine, member_id=5, key="unverified")
    with postgres_engine.begin() as connection:
        connection.execute(text(
            "UPDATE member_credit_provider_payments SET verification_status='received_unverified' "
            "WHERE id IN (SELECT provider_payment_id FROM member_credit_payment_allocations WHERE purchase_order_id=:id)"
        ), {"id": guarded_order})
    with sessions() as db:
        guarded = credit.recover_funded_purchase_awards(db, now=NOW)
    assert guarded.failures == ({
        "order_id": guarded_order,
        "error": "purchase_order_verified_funding_invariant_failed",
    },)

    stalled_order, _ = _funded_order(postgres_engine, member_id=6, key="stalled")
    free_order, _ = _funded_order(postgres_engine, member_id=7, key="free")
    locker = sessions()
    locker.begin()
    locker.execute(text(
        "SELECT id FROM member_credit_purchase_orders WHERE id=:id FOR UPDATE"
    ), {"id": stalled_order})
    try:
        with sessions() as db:
            while_locked = credit.recover_funded_purchase_awards(db, now=NOW)
    finally:
        locker.rollback()
        locker.close()
    assert while_locked.skipped >= 1
    with postgres_engine.begin() as connection:
        free_count = connection.execute(text(
            "SELECT COUNT(*) FROM member_service_credit_ledger_entries WHERE reference_id=:id"
        ), {"id": str(free_order)}).scalar_one()
        assert int(free_count) == 1
    with sessions() as db:
        final = credit.recover_funded_purchase_awards(db, now=NOW)
    assert final.awards_applied == 1
