from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from threading import Barrier
from urllib.parse import urlparse

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.db.spotlight_commercial_models import (
    SpotlightCommercialBooking,
    SpotlightCommercialRemedy,
)
from app.services.pipeline_credit_commerce_service import (
    PipelineCreditCommerceError,
    issue_service_quote,
    set_commercial_control,
    set_pricing_policy,
    set_service_price,
    spend_service_quote,
)
from app.services.pipeline_credit_service import (
    ACCOUNT_PURPOSE_CUSTOMER,
    allocate_pipeline_credits,
    pipeline_credit_balance,
)
from app.services.spotlight_commercial_service import (
    apply_remedy,
    reconcile_booking,
    record_capacity_evidence,
)


POSTGRES_URL = str(
    os.getenv("SPOTLIGHT_POSTGRES_TEST_DATABASE_URL", "") or ""
).strip()
POSTGRES_OPT_IN = str(
    os.getenv("GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS", "") or ""
).lower() in {"1", "true", "yes", "on"}
pytestmark = pytest.mark.skipif(
    not POSTGRES_URL or not POSTGRES_OPT_IN,
    reason=(
        "requires SPOTLIGHT_POSTGRES_TEST_DATABASE_URL plus "
        "GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS=1"
    ),
)


@pytest.fixture(scope="session")
def postgres_engine():
    parsed = urlparse(POSTGRES_URL)
    database_name = (parsed.path or "").strip("/").lower()
    if not any(marker in database_name for marker in ("test", "tmp", "disposable")):
        pytest.fail("PostgreSQL concurrency URL must identify a disposable test database")
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option(
        "script_location",
        str(Path(__file__).resolve().parents[1] / "alembic"),
    )
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    return engine


@pytest.fixture(autouse=True)
def clean_postgres(postgres_engine, monkeypatch):
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "1")
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    tables = [
        name
        for name in inspect(postgres_engine).get_table_names()
        if name != "alembic_version"
    ]
    if tables:
        quoted = ", ".join(f'"{name}"' for name in tables)
        with postgres_engine.begin() as connection:
            connection.execute(
                text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE")
            )


def _sessions(postgres_engine):
    return sessionmaker(
        bind=postgres_engine,
        autoflush=False,
        expire_on_commit=False,
    )


def _seed(postgres_engine) -> None:
    created_at = datetime(2027, 1, 1, tzinfo=timezone.utc)
    expires_at = datetime(2028, 1, 1, tzinfo=timezone.utc)
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES
                    (1, 'slice3a-buyer-1@example.com', 'x', 'admin', 'S3A-B1'),
                    (2, 'slice3a-buyer-2@example.com', 'x', 'member', 'S3A-B2'),
                    (3, 'slice3a-owner-1@example.com', 'x', 'member', 'S3A-O1'),
                    (4, 'slice3a-owner-2@example.com', 'x', 'member', 'S3A-O2')
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, invite_code, status
                ) VALUES (
                    1, 'Slice 3A PostgreSQL', 'Slice 3A Market',
                    'S3A-PG', 'S3A-PG-INVITE', 'active'
                )
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance
                ) VALUES
                    (1, 1, 1, 'admin', 0),
                    (2, 1, 2, 'member', 0),
                    (3, 1, 3, 'member', 0),
                    (4, 1, 4, 'member', 0)
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, origin_clan_id, content_kind,
                    content_fingerprint, status, serving_status, source_kind,
                    commercial_mode, distribution_scope, opportunity_intent,
                    opportunity_category, opportunity_geo_scope,
                    opportunity_availability, created_at, activated_at,
                    expires_at, authorized_expires_at
                ) VALUES
                    (
                        1, 3, 1, 'broadcast_snapshot', :fingerprint_one,
                        'active', 'serving', 'direct_broadcast', 'pipeline_credit',
                        'direct_communities', 'offer', 'product', 'community',
                        'available', :created_at, :created_at, :expires_at, :expires_at
                    ),
                    (
                        2, 4, 1, 'broadcast_snapshot', :fingerprint_two,
                        'active', 'serving', 'direct_broadcast', 'pipeline_credit',
                        'direct_communities', 'offer', 'product', 'community',
                        'available', :created_at, :created_at, :expires_at, :expires_at
                    )
                """
            ),
            {
                "fingerprint_one": "1" * 64,
                "fingerprint_two": "2" * 64,
                "created_at": created_at,
                "expires_at": expires_at,
            },
        )

    sessions = _sessions(postgres_engine)
    with sessions() as db:
        set_pricing_policy(
            db,
            region_code="global",
            currency="GBP",
            credits_per_currency_unit="2.0000",
            actor_user_id=1,
        )
        set_service_price(
            db,
            service_code="paid_spotlight.day",
            region_code="global",
            pricing_mode="fixed_credits",
            credit_cost="1.00",
            duration_days=1,
            unit_label="30 scheduled opportunities",
            actor_user_id=1,
        )
        set_commercial_control(
            db,
            lifecycle_status="enforced",
            decision_note="Slice 3A PostgreSQL concurrency proof",
            actor_user_id=1,
        )
        for buyer_id in (1, 2):
            allocate_pipeline_credits(
                db,
                owner_type="user",
                owner_user_id=buyer_id,
                account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
                pricing_region="global",
                currency="PC",
                amount="2.00",
                workflow_key="test.slice3a.postgres.funding",
                idempotency_key=f"slice3a-pg-funding-{buyer_id}",
                created_by_user_id=1,
            )


def _capacity(
    postgres_engine,
    *,
    service_date: str,
    observed: int = 10,
) -> None:
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        record_capacity_evidence(
            db,
            clan_id=1,
            region_code="GB-SCT",
            timezone_name="Europe/London",
            service_date=service_date,
            observed_supplied_opportunities={
                "morning": observed,
                "afternoon": observed,
                "evening": observed,
            },
            safety_factor_bps=10000,
            evidence_source="slice3a-postgres-controlled-serving",
            evidence={
                "fixture": True,
                "simultaneous_activity_included": True,
            },
            actor_user_id=1,
        )


def _quote(
    postgres_engine,
    *,
    buyer_id: int,
    campaign_id: int,
    service_date: str,
    key: str,
):
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        quote = issue_service_quote(
            db,
            actor_user_id=buyer_id,
            service_code="paid_spotlight.day",
            quantity=1,
            region_code="global",
            context={
                "campaign_id": campaign_id,
                "clan_id": 1,
                "funding_classification": "merchant_paid",
                "region_code": "GB-SCT",
                "timezone": "Europe/London",
                "service_date": service_date,
                "booking_key": key,
            },
            idempotency_key=f"quote-{key}",
        )
        return str(quote.quote_key), int(quote.account_id)


def test_postgres_final_capacity_has_one_winner_and_no_failed_debit(
    postgres_engine,
) -> None:
    _seed(postgres_engine)
    _capacity(postgres_engine, service_date="2027-05-01", observed=10)
    first_quote, first_account = _quote(
        postgres_engine,
        buyer_id=1,
        campaign_id=1,
        service_date="2027-05-01",
        key="slice3a-pg-capacity-first",
    )
    second_quote, second_account = _quote(
        postgres_engine,
        buyer_id=2,
        campaign_id=2,
        service_date="2027-05-01",
        key="slice3a-pg-capacity-second",
    )
    sessions = _sessions(postgres_engine)
    barrier = Barrier(2)

    def spend(buyer_id: int, quote_key: str):
        with sessions() as db:
            barrier.wait()
            try:
                order = spend_service_quote(
                    db,
                    actor_user_id=buyer_id,
                    quote_key=quote_key,
                    idempotency_key=f"slice3a-pg-capacity-spend-{buyer_id}",
                )
                return buyer_id, True, int(order.id), None
            except PipelineCreditCommerceError as exc:
                db.rollback()
                return buyer_id, False, None, exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(
            pool.map(
                lambda args: spend(*args),
                ((1, first_quote), (2, second_quote)),
            )
        )
    assert sum(1 for _buyer, success, _order, _code in outcomes if success) == 1
    loser = next(row for row in outcomes if not row[1])
    assert loser[3] in {
        "spotlight_capacity_unavailable",
        "spotlight_capacity_conflict",
    }

    with sessions() as db:
        assert db.query(SpotlightCommercialBooking).count() == 1
        completed = db.execute(
            text(
                "SELECT COUNT(*) FROM pipeline_credit_service_spend_orders "
                "WHERE status = 'completed'"
            )
        ).scalar_one()
        pending = db.execute(
            text(
                "SELECT COUNT(*) FROM pipeline_credit_service_spend_orders "
                "WHERE status = 'pending'"
            )
        ).scalar_one()
        allocations = db.execute(
            text("SELECT COUNT(*) FROM spotlight_commercial_allocations")
        ).scalar_one()
        opportunities = db.execute(
            text("SELECT COUNT(*) FROM spotlight_commercial_opportunities")
        ).scalar_one()
        balances = {
            1: pipeline_credit_balance(db, account_id=first_account),
            2: pipeline_credit_balance(db, account_id=second_account),
        }
    winner_id = next(row[0] for row in outcomes if row[1])
    loser_id = next(row[0] for row in outcomes if not row[1])
    assert int(completed) == 1
    assert int(pending) == 0
    assert int(allocations) == 3
    assert int(opportunities) == 30
    assert balances[winner_id] == Decimal("1.00")
    assert balances[loser_id] == Decimal("2.00")


def test_postgres_same_quote_retry_creates_one_booking_and_one_debit(
    postgres_engine,
) -> None:
    _seed(postgres_engine)
    _capacity(postgres_engine, service_date="2027-05-02", observed=20)
    quote_key, account_id = _quote(
        postgres_engine,
        buyer_id=1,
        campaign_id=1,
        service_date="2027-05-02",
        key="slice3a-pg-retry",
    )
    sessions = _sessions(postgres_engine)
    barrier = Barrier(2)

    def retry():
        with sessions() as db:
            barrier.wait()
            order = spend_service_quote(
                db,
                actor_user_id=1,
                quote_key=quote_key,
                idempotency_key="slice3a-pg-identical-retry",
            )
            return int(order.id)

    with ThreadPoolExecutor(max_workers=2) as pool:
        order_ids = list(pool.map(lambda _index: retry(), (1, 2)))
    assert len(set(order_ids)) == 1
    with sessions() as db:
        assert db.query(SpotlightCommercialBooking).count() == 1
        assert (
            db.execute(
                text(
                    "SELECT COUNT(*) FROM pipeline_credit_ledger_entries "
                    "WHERE entry_type = 'debit'"
                )
            ).scalar_one()
            == 1
        )
        assert pipeline_credit_balance(db, account_id=account_id) == Decimal("1.00")


def test_postgres_remedy_retry_creates_one_restoration_and_obligation(
    postgres_engine,
) -> None:
    _seed(postgres_engine)
    _capacity(postgres_engine, service_date="2027-05-03", observed=20)
    quote_key, account_id = _quote(
        postgres_engine,
        buyer_id=1,
        campaign_id=1,
        service_date="2027-05-03",
        key="slice3a-pg-remedy",
    )
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        order = spend_service_quote(
            db,
            actor_user_id=1,
            quote_key=quote_key,
            idempotency_key="slice3a-pg-remedy-spend",
        )
        booking_id = int(order.delivery_reference_id)
        reconcile_booking(
            db,
            booking_id=booking_id,
            now=datetime(2027, 5, 4, 0, 1, tzinfo=timezone.utc),
        )
        remedy_id = int(
            db.query(SpotlightCommercialRemedy.id)
            .filter(SpotlightCommercialRemedy.booking_id == booking_id)
            .scalar()
        )
    barrier = Barrier(2)

    def apply():
        with sessions() as db:
            barrier.wait()
            remedy = apply_remedy(db, remedy_id=remedy_id, actor_user_id=1)
            return int(remedy.ledger_entry_id)

    with ThreadPoolExecutor(max_workers=2) as pool:
        ledger_ids = list(pool.map(lambda _index: apply(), (1, 2)))
    assert len(set(ledger_ids)) == 1
    with sessions() as db:
        restorations = db.execute(
            text(
                "SELECT COUNT(*) FROM pipeline_credit_ledger_entries "
                "WHERE reference_type = 'spotlight_commercial_remedy'"
            )
        ).scalar_one()
        obligations = db.execute(
            text(
                "SELECT COUNT(*) FROM "
                "spotlight_commercial_service_credit_obligations"
            )
        ).scalar_one()
        remedy = db.get(SpotlightCommercialRemedy, remedy_id)
        assert int(restorations) == 1
        assert int(obligations) == 1
        assert remedy.status == "applied"
        assert pipeline_credit_balance(db, account_id=account_id) == Decimal("2.00")
