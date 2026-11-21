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
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.db.advertising_revenue_models import AdvertisingCampaignSettlement
from app.db.bank_models import BankEvent, ExpectedPayment
from app.db.pipeline_credit_models import (
    PipelineCreditAccount,
    PipelineCreditAcquisitionApplication,
    PipelineCreditAcquisitionOrder,
    PipelineCreditAcquisitionPackVersion,
    PipelineCreditAcquisitionRefund,
    PipelineCreditLedgerEntry,
    PipelineCreditServiceSpendOrder,
)
from app.db.spotlight_commercial_models import (
    SpotlightCommercialBooking,
    SpotlightCommercialPilotEntitlement,
)
from app.services.advertising_revenue_service import reconcile_spotlight_booking_settlement
from app.services.bank_application_service import apply_expected_payment_match
from app.services.pipeline_credit_acquisition_service import (
    PipelineCreditAcquisitionError,
    create_acquisition_instruction,
    record_acquisition_refund,
)
from app.services.pipeline_credit_commerce_service import (
    PipelineCreditCommerceError,
    issue_service_quote,
    set_acquisition_pack,
    set_commercial_control,
    set_pricing_policy,
    set_service_price,
    spend_service_quote,
)
from app.services.pipeline_credit_service import pipeline_credit_balance
from app.services.reconciliation_service import create_bank_event, reconcile_one_event
from app.services.spotlight_commercial_access_service import (
    grant_spotlight_pilot_entitlement,
    revoke_spotlight_pilot_entitlement,
)
from app.services.spotlight_commercial_service import record_capacity_evidence


POSTGRES_URL = str(os.getenv("SPOTLIGHT_POSTGRES_TEST_DATABASE_URL", "") or "").strip()
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


MIGRATION_PREDECESSOR = "20261121_spotlight_slice3a_integrity"
MIGRATION_HEAD = "20261121_spotlight_slice4a_completion"


def _config(connection) -> Config:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.attributes["connection"] = connection
    return config


@pytest.fixture(scope="session")
def postgres_engine():
    parsed = urlparse(POSTGRES_URL)
    database_name = (parsed.path or "").strip("/").lower()
    if not any(marker in database_name for marker in ("test", "tmp", "disposable")):
        pytest.fail("PostgreSQL concurrency URL must identify a disposable test database")
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    with engine.begin() as connection:
        command.upgrade(_config(connection), "head")
    return engine


@pytest.fixture(autouse=True)
def clean_postgres(postgres_engine, monkeypatch):
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "1")
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "1")
    tables = (
        "advertising_campaign_settlements",
        "pipeline_credit_acquisition_refunds",
        "pipeline_credit_acquisition_applications",
        "pipeline_credit_acquisition_orders",
        "spotlight_commercial_pilot_entitlements",
        "spotlight_commercial_service_credit_applications",
        "spotlight_commercial_service_credit_obligations",
        "spotlight_commercial_presentation_attributions",
        "spotlight_commercial_audit_events",
        "spotlight_commercial_remedies",
        "spotlight_commercial_opportunities",
        "spotlight_commercial_allocations",
        "spotlight_commercial_bookings",
        "spotlight_commercial_capacity_windows",
        "pipeline_credit_service_spend_orders",
        "pipeline_credit_service_quotes",
        "pipeline_credit_ledger_entries",
        "pipeline_credit_accounts",
        "pipeline_credit_acquisition_pack_versions",
        "pipeline_credit_service_versions",
        "pipeline_credit_pricing_policies",
        "pipeline_credit_commercial_control_versions",
        "bank_credits",
        "expected_payments",
        "bank_events",
        "marketplace_broadcasts",
        "spotlight_campaigns",
        "clan_memberships",
        "clans",
        "users",
    )
    available = set(inspect(postgres_engine).get_table_names())
    selected = [name for name in tables if name in available]
    if selected:
        with postgres_engine.begin() as connection:
            for table_name in selected:
                connection.exec_driver_sql(f'DELETE FROM "{table_name}"')


def _sessions(postgres_engine):
    return sessionmaker(
        bind=postgres_engine,
        autoflush=False,
        expire_on_commit=False,
    )


def _seed(postgres_engine):
    created_at = datetime(2027, 1, 1, tzinfo=timezone.utc)
    expires_at = datetime(2028, 1, 1, tzinfo=timezone.utc)
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES
                    (1, 'slice4a-admin@example.com', 'x', 'admin', 'S4A-1'),
                    (2, 'slice4a-member@example.com', 'x', 'member', 'S4A-2')
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, invite_code, status
                ) VALUES (
                    1, 'Slice 4A PostgreSQL', 'Slice 4A Market',
                    'S4A-PG', 'S4A-PG-INVITE', 'active'
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
                    (2, 1, 2, 'member', 0)
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
                ) VALUES (
                    1, 1, 1, 'broadcast_snapshot', :fingerprint,
                    'active', 'serving', 'direct_broadcast', 'pipeline_credit',
                    'direct_communities', 'offer', 'product', 'community',
                    'available', :created_at, :created_at, :expires_at, :expires_at
                )
                """
            ),
            {
                "fingerprint": "4" * 64,
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
            decision_note="Slice 4A PostgreSQL verification",
            actor_user_id=1,
        )
        entitlement = grant_spotlight_pilot_entitlement(
            db,
            user_id=1,
            clan_id=1,
            entitlement_role="merchant",
            granted_by_user_id=1,
            decision_note="Slice 4A PostgreSQL cohort",
        )
        pack = set_acquisition_pack(
            db,
            profile_code="gb-pilot",
            profile_label="UK controlled pilot",
            country_codes=["GB"],
            currency="GBP",
            pack_code="pilot-1",
            credit_quantity="2.00",
            cash_amount="1.00",
            lifecycle_status="enforced",
            decision_note="Slice 4A PostgreSQL pack",
            actor_user_id=1,
        )
        return int(pack.id), int(entitlement.id)


def _order(postgres_engine, *, pack_id: int, key: str) -> int:
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        row = create_acquisition_instruction(
            db,
            purchaser_user_id=1,
            beneficiary_user_id=1,
            clan_id=1,
            pack_version_id=pack_id,
            funding_classification="merchant_paid",
            idempotency_key=key,
        )
        return int(row.id)


def _bank_event(postgres_engine, *, order_id: int, transaction_id: str) -> int:
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        order = db.get(PipelineCreditAcquisitionOrder, order_id)
        expected = db.get(ExpectedPayment, int(order.expected_payment_id))
        event = create_bank_event(
            db,
            clan_id=1,
            source_type="webhook_api",
            source_id=transaction_id,
            direction="credit",
            amount="1.00",
            currency="GBP",
            reference_raw=expected.reference_display,
            description_raw="Slice 4A PostgreSQL acquisition",
            bank_txn_id=transaction_id,
            meta={"fixture": "slice4a"},
        )
        return int(event.id)


def _confirm(postgres_engine, *, order_id: int, transaction_id: str) -> tuple[int, int]:
    event_id = _bank_event(
        postgres_engine,
        order_id=order_id,
        transaction_id=transaction_id,
    )
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        event = db.get(BankEvent, event_id)
        reconciled = reconcile_one_event(db, be=event)
        return int(reconciled.id), int(reconciled.expected_payment_id)


def _capacity(postgres_engine, *, service_date: str, observed: int = 20) -> None:
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
            evidence_source="slice4a-postgres-controlled-serving",
            evidence={"fixture": True, "simultaneous_activity_included": True},
            actor_user_id=1,
        )


def _quote(postgres_engine, *, service_date: str, key: str) -> str:
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        quote = issue_service_quote(
            db,
            actor_user_id=1,
            service_code="paid_spotlight.day",
            quantity=1,
            region_code="global",
            context={
                "campaign_id": 1,
                "clan_id": 1,
                "funding_classification": "merchant_paid",
                "region_code": "GB-SCT",
                "timezone": "Europe/London",
                "service_date": service_date,
                "booking_key": key,
            },
            idempotency_key=f"quote-{key}",
        )
        return str(quote.quote_key)


def _fund_two_credits(postgres_engine, *, key: str) -> int:
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        pack_id = int(
            db.query(PipelineCreditAcquisitionPackVersion.id)
            .filter(PipelineCreditAcquisitionPackVersion.pack_code == "pilot-1")
            .order_by(PipelineCreditAcquisitionPackVersion.version.desc())
            .scalar()
        )
    order_id = _order(postgres_engine, pack_id=pack_id, key=key)
    _confirm(postgres_engine, order_id=order_id, transaction_id=f"txn-{key}")
    return order_id


def test_postgres_slice4_migration_round_trip_and_pack_constraints(postgres_engine):
    with postgres_engine.begin() as connection:
        command.downgrade(_config(connection), MIGRATION_PREDECESSOR)
        inspector = inspect(connection)
        assert "pipeline_credit_acquisition_orders" not in inspector.get_table_names()
        assert "settlement_scope" not in {
            column["name"]
            for column in inspector.get_columns("advertising_campaign_settlements")
        }
        command.upgrade(_config(connection), MIGRATION_HEAD)
        inspector = inspect(connection)
        assert "pipeline_credit_acquisition_orders" in inspector.get_table_names()
        settlement_columns = {
            column["name"]
            for column in inspector.get_columns("advertising_campaign_settlements")
        }
        assert {
            "processing_fee_policy_status",
            "delivery_cost_policy_status",
            "community_allocation_policy_status",
        }.issubset(settlement_columns)
        revision = connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        assert revision == MIGRATION_HEAD

    pack_id, _entitlement_id = _seed(postgres_engine)
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        pack = db.get(PipelineCreditAcquisitionPackVersion, pack_id)
        duplicate = PipelineCreditAcquisitionPackVersion(
            profile_code=pack.profile_code,
            profile_label=pack.profile_label,
            country_codes_json=pack.country_codes_json,
            currency=pack.currency,
            pack_code=pack.pack_code,
            version=pack.version,
            credit_quantity=pack.credit_quantity,
            cash_amount=pack.cash_amount,
            lifecycle_status=pack.lifecycle_status,
            decision_note="Duplicate must fail",
            created_by_user_id=1,
        )
        db.add(duplicate)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        newer = set_acquisition_pack(
            db,
            profile_code="gb-pilot",
            profile_label="UK controlled pilot",
            country_codes=["GB"],
            currency="GBP",
            pack_code="pilot-1",
            credit_quantity="2.00",
            cash_amount="1.00",
            lifecycle_status="enforced",
            decision_note="New version",
            actor_user_id=1,
        )
        assert int(newer.version) == 2
        with pytest.raises(PipelineCreditAcquisitionError) as stale:
            create_acquisition_instruction(
                db,
                purchaser_user_id=1,
                beneficiary_user_id=1,
                clan_id=1,
                pack_version_id=pack_id,
                funding_classification="merchant_paid",
                idempotency_key="slice4a-stale-postgres",
            )
        assert stale.value.code == "stale_acquisition_pack"


def test_postgres_concurrent_confirmation_allocates_once_and_retries_safely(postgres_engine):
    pack_id, _entitlement_id = _seed(postgres_engine)
    order_id = _order(postgres_engine, pack_id=pack_id, key="slice4a-confirm-race")
    event_ids = [
        _bank_event(postgres_engine, order_id=order_id, transaction_id=f"slice4a-confirm-{index}")
        for index in (1, 2)
    ]
    sessions = _sessions(postgres_engine)
    barrier = Barrier(2)

    def confirm(event_id: int):
        with sessions() as db:
            event = db.get(BankEvent, event_id)
            barrier.wait()
            result = reconcile_one_event(db, be=event)
            return int(result.id), str(result.status)

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(confirm, event_ids))
    assert sorted(status for _event_id, status in outcomes) == ["confirmed", "duplicate"]
    with sessions() as db:
        order = db.get(PipelineCreditAcquisitionOrder, order_id)
        assert order.status == "allocated"
        assert order.allocated_credit_amount == Decimal("2.00")
        assert db.query(PipelineCreditLedgerEntry).filter_by(
            workflow_key="pipeline_credit.acquisition.bank_confirmed"
        ).count() == 1
        confirmed_event = db.query(BankEvent).filter_by(status="confirmed").one()
        expected = db.get(ExpectedPayment, int(order.expected_payment_id))
        retry = apply_expected_payment_match(
            db,
            bank_event_id=int(confirmed_event.id),
            expected_payment_id=int(expected.id),
        )
        assert retry["reason"] == "already_applied"
        assert db.query(PipelineCreditLedgerEntry).filter_by(
            workflow_key="pipeline_credit.acquisition.bank_confirmed"
        ).count() == 1


def test_postgres_simultaneous_cash_backed_spending_has_one_complete_winner(postgres_engine):
    _seed(postgres_engine)
    order_id = _fund_two_credits(postgres_engine, key="slice4a-spend-funding")
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        record_acquisition_refund(
            db,
            acquisition_order_id=order_id,
            credit_amount="1.00",
            idempotency_key="slice4a-pre-spend-refund",
            reason="Leave exactly one cash-backed credit",
            actor_user_id=1,
        )
    _capacity(postgres_engine, service_date="2027-06-01")
    quotes = [
        _quote(postgres_engine, service_date="2027-06-01", key=f"slice4a-spend-{index}")
        for index in (1, 2)
    ]
    barrier = Barrier(2)

    def spend(index_and_quote):
        index, quote_key = index_and_quote
        with sessions() as db:
            barrier.wait()
            try:
                order = spend_service_quote(
                    db,
                    actor_user_id=1,
                    quote_key=quote_key,
                    idempotency_key=f"slice4a-spend-race-{index}",
                )
                return True, int(order.id), None
            except PipelineCreditCommerceError as exc:
                db.rollback()
                return False, None, exc.code

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(spend, enumerate(quotes, start=1)))
    assert sum(1 for success, _order_id, _code in outcomes if success) == 1
    loser_code = next(code for success, _order_id, code in outcomes if not success)
    assert loser_code in {"insufficient_credits", "cash_backing_unavailable"}
    with sessions() as db:
        assert db.query(SpotlightCommercialBooking).count() == 1
        assert db.query(PipelineCreditAcquisitionApplication).count() == 1
        assert db.query(PipelineCreditServiceSpendOrder).filter_by(status="completed").count() == 1
        assert db.query(PipelineCreditServiceSpendOrder).filter_by(status="pending").count() == 0
        account = db.query(PipelineCreditAccount).filter_by(account_key="customer_service:user:1").one()
        assert pipeline_credit_balance(db, account_id=int(account.id)) == Decimal("0.00")


def test_postgres_refund_vs_spend_race_preserves_one_financial_outcome(postgres_engine):
    _seed(postgres_engine)
    order_id = _fund_two_credits(postgres_engine, key="slice4a-refund-spend-funding")
    _capacity(postgres_engine, service_date="2027-06-02")
    quote_key = _quote(postgres_engine, service_date="2027-06-02", key="slice4a-refund-spend")
    sessions = _sessions(postgres_engine)
    barrier = Barrier(2)

    def spend():
        with sessions() as db:
            barrier.wait()
            try:
                spend_service_quote(
                    db,
                    actor_user_id=1,
                    quote_key=quote_key,
                    idempotency_key="slice4a-refund-spend-booking",
                )
                return "spend"
            except PipelineCreditCommerceError:
                db.rollback()
                return "spend_rejected"

    def refund():
        with sessions() as db:
            barrier.wait()
            try:
                record_acquisition_refund(
                    db,
                    acquisition_order_id=order_id,
                    credit_amount="2.00",
                    idempotency_key="slice4a-refund-spend-refund",
                    reason="Concurrent full refund classification",
                    actor_user_id=1,
                )
                return "refund"
            except PipelineCreditAcquisitionError:
                db.rollback()
                return "refund_rejected"

    with ThreadPoolExecutor(max_workers=2) as pool:
        spend_future = pool.submit(spend)
        refund_future = pool.submit(refund)
        outcomes = {spend_future.result(), refund_future.result()}
    assert outcomes in ({"spend", "refund_rejected"}, {"refund", "spend_rejected"})
    with sessions() as db:
        applications = db.query(PipelineCreditAcquisitionApplication).count()
        refunds = db.query(PipelineCreditAcquisitionRefund).count()
        completed = db.query(PipelineCreditServiceSpendOrder).filter_by(status="completed").count()
        pending = db.query(PipelineCreditServiceSpendOrder).filter_by(status="pending").count()
        assert applications + refunds == 1
        assert completed + refunds == 1
        assert pending == 0


def test_postgres_revoked_late_payment_is_held_then_allocated_once(postgres_engine):
    pack_id, entitlement_id = _seed(postgres_engine)
    order_id = _order(postgres_engine, pack_id=pack_id, key="slice4a-revoked-late")
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        revoke_spotlight_pilot_entitlement(
            db,
            entitlement_id=entitlement_id,
            revoked_by_user_id=1,
            decision_note="Revoked before late cash",
        )
    event_id = _bank_event(
        postgres_engine,
        order_id=order_id,
        transaction_id="slice4a-revoked-late-event",
    )
    with sessions() as db:
        event = db.get(BankEvent, event_id)
        reconcile_one_event(db, be=event)
    with sessions() as db:
        order = db.get(PipelineCreditAcquisitionOrder, order_id)
        expected = db.get(ExpectedPayment, int(order.expected_payment_id))
        event = db.get(BankEvent, event_id)
        assert expected.status == "confirmed"
        assert event.status == "confirmed"
        assert "application_hold:spotlight_pilot_not_authorised" in str(event.status_reason)
        assert order.status == "payment_received_permission_hold"
        assert order.allocation_ledger_entry_id is None
        assert db.query(PipelineCreditLedgerEntry).count() == 0
        grant_spotlight_pilot_entitlement(
            db,
            user_id=1,
            clan_id=1,
            entitlement_role="merchant",
            granted_by_user_id=1,
            decision_note="Controlled approval restored",
        )
        applied = apply_expected_payment_match(
            db,
            bank_event_id=event_id,
            expected_payment_id=int(expected.id),
        )
        assert applied["applied"] is True
        repeated = apply_expected_payment_match(
            db,
            bank_event_id=event_id,
            expected_payment_id=int(expected.id),
        )
        assert repeated["reason"] == "already_applied"
        assert db.query(PipelineCreditLedgerEntry).count() == 1


def test_postgres_settlement_rollback_and_concurrent_idempotency(postgres_engine):
    _seed(postgres_engine)
    _fund_two_credits(postgres_engine, key="slice4a-settlement-funding")
    _capacity(postgres_engine, service_date="2027-06-03")
    quote_key = _quote(postgres_engine, service_date="2027-06-03", key="slice4a-settlement")
    sessions = _sessions(postgres_engine)
    with sessions() as db:
        spend = spend_service_quote(
            db,
            actor_user_id=1,
            quote_key=quote_key,
            idempotency_key="slice4a-settlement-spend",
        )
        booking_id = int(spend.delivery_reference_id)
        db.query(AdvertisingCampaignSettlement).filter_by(
            spotlight_booking_id=booking_id
        ).delete()
        db.commit()
        row = reconcile_spotlight_booking_settlement(
            db,
            booking_id=booking_id,
            actor_user_id=1,
            commit=False,
        )
        assert row.id is not None
        db.rollback()
    with sessions() as db:
        assert db.query(AdvertisingCampaignSettlement).filter_by(
            spotlight_booking_id=booking_id
        ).count() == 0

    barrier = Barrier(2)

    def settle():
        with sessions() as db:
            barrier.wait()
            row = reconcile_spotlight_booking_settlement(
                db,
                booking_id=booking_id,
                actor_user_id=1,
            )
            return int(row.id)

    with ThreadPoolExecutor(max_workers=2) as pool:
        settlement_ids = list(pool.map(lambda _index: settle(), (1, 2)))
    assert len(set(settlement_ids)) == 1
    with sessions() as db:
        row = db.query(AdvertisingCampaignSettlement).filter_by(
            spotlight_booking_id=booking_id
        ).one()
        assert row.processing_fee_policy_status == "pending_policy"
        assert row.delivery_cost_policy_status == "pending_policy"
        assert row.community_allocation_policy_status == "pending_policy"
        assert db.query(AdvertisingCampaignSettlement).filter_by(
            spotlight_booking_id=booking_id
        ).count() == 1
