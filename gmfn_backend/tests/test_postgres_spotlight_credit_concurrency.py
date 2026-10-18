from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Barrier
from urllib.parse import urlparse

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from app.db.member_credit_models import MemberServiceCreditAccount
from app.db.models import FeatureEntitlement, SpotlightCampaign
from app.services.feature_entitlements_service import consume_feature_units
from app.services.member_credit_service import MemberCreditError
from app.services.member_credit_spotlight_service import _consume_member_credits
from app.services.spotlight_lifecycle_service import permanently_withdraw
from app.services.spotlight_presentation_service import (
    SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
    SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
    record_spotlight_presentation_qualification,
    select_spotlight_presentation,
)


POSTGRES_URL = str(os.getenv("SPOTLIGHT_POSTGRES_TEST_DATABASE_URL", "") or "").strip()
POSTGRES_OPT_IN = str(os.getenv("GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS", "") or "").lower() in {
    "1", "true", "yes", "on"
}
pytestmark = pytest.mark.skipif(
    not POSTGRES_URL or not POSTGRES_OPT_IN,
    reason=(
        "requires SPOTLIGHT_POSTGRES_TEST_DATABASE_URL plus "
        "GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS=1"
    ),
)
NOW = datetime(2026, 10, 16, 15, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="session")
def postgres_engine():
    parsed = urlparse(POSTGRES_URL)
    database_name = (parsed.path or "").strip("/").lower()
    if not any(marker in database_name for marker in ("test", "tmp", "disposable")):
        pytest.fail("PostgreSQL concurrency URL must identify a disposable test database")
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    return engine


@pytest.fixture(autouse=True)
def clean_postgres(postgres_engine):
    tables = [name for name in inspect(postgres_engine).get_table_names() if name != "alembic_version"]
    if tables:
        quoted = ", ".join(f'"{name}"' for name in tables)
        with postgres_engine.begin() as connection:
            connection.execute(text(f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"))


def _seed_spotlight(postgres_engine, *, max_rounds: int = 1) -> None:
    with postgres_engine.begin() as conn:
        conn.execute(text("INSERT INTO users (id, email, hashed_password, role, gmfn_id) VALUES (1, 'pg-viewer@example.com', 'x', 'member', 'PG-VIEWER'), (2, 'pg-owner@example.com', 'x', 'member', 'PG-OWNER')"))
        conn.execute(text("INSERT INTO clans (id, name, community_code, status, invite_code, invite_uses) VALUES (1, 'PG Test', 'PG-TEST', 'active', 'PGTEST', 0)"))
        conn.execute(text("INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance) VALUES (1,1,1,'member',0),(2,1,2,'member',0)"))
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, serving_status, content_version, owner_user_id, origin_clan_id,
                    content_kind, content_fingerprint, status, source_kind, commercial_mode,
                    distribution_scope, opportunity_intent, opportunity_category,
                    opportunity_geo_scope, opportunity_availability, created_at, activated_at,
                    expires_at, authorized_expires_at, serving_status_changed_at
                ) VALUES (
                    1, 'serving', 1, 2, 1, 'broadcast_snapshot', :fingerprint,
                    'active', 'direct_broadcast', 'paid', 'direct_communities', 'offer',
                    'product', 'community', 'available', :now, :now, :expires, :expires, :now
                )
                """
            ),
            {"fingerprint": "a" * 64, "now": NOW, "expires": NOW + timedelta(hours=24)},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, serving_status, content_version, spotlight_campaign_id, clan_id,
                    author_user_id, message, priority_mode, visibility_scope, expires_at,
                    authorized_expires_at, serving_status_changed_at, created_at
                ) VALUES (1, 'serving', 1, 1, 1, 2, 'PG atomic', 'paid',
                    'direct_communities', :expires, :expires, :now, :now)
                """
            ),
            {"now": NOW, "expires": NOW + timedelta(hours=24)},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaign_pacing_states (
                    campaign_id, max_delivery_rounds, consumed_delivery_rounds,
                    pacing_profile, exhausted, version, created_at, updated_at
                ) VALUES (1, :max_rounds, 0, 'neutral', false, 0, :now, :now)
                """
            ),
            {"max_rounds": max_rounds, "now": NOW},
        )


def test_postgres_concurrent_final_round_allows_one_live_reservation(postgres_engine, monkeypatch) -> None:
    monkeypatch.setenv("SECRET_KEY", "postgres-disposable-concurrency-secret")
    _seed_spotlight(postgres_engine)
    sessions = sessionmaker(bind=postgres_engine, autoflush=False, expire_on_commit=False)
    barrier = Barrier(2)

    def issue(index: int):
        with sessions() as db:
            barrier.wait()
            result = select_spotlight_presentation(
                db, viewer_user_id=1, now=NOW, issuance_key=f"pg-final-round-{index}"
            )
            db.commit()
            return result.selected

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(issue, (1, 2)))
    with postgres_engine.begin() as conn:
        consumed = conn.execute(text("SELECT consumed_delivery_rounds FROM spotlight_campaign_pacing_states WHERE campaign_id=1")).scalar_one()
        leases = conn.execute(text("SELECT COUNT(*) FROM spotlight_presentation_leases")).scalar_one()
    assert sum(bool(value) for value in outcomes) == 1
    assert int(consumed) == 0
    assert int(leases) == 1


def test_postgres_concurrent_qualification_consumes_final_round_once(
    postgres_engine, monkeypatch
) -> None:
    monkeypatch.setenv("SECRET_KEY", "postgres-disposable-concurrency-secret")
    _seed_spotlight(postgres_engine)
    sessions = sessionmaker(bind=postgres_engine, autoflush=False, expire_on_commit=False)
    with sessions() as db:
        issued = select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=NOW,
            issuance_key="pg-qualified-final-round",
        )
        db.commit()
    assert issued.selected is True
    token = issued.presentation_token or ""
    barrier = Barrier(2)

    def qualify():
        with sessions() as db:
            barrier.wait()
            result = record_spotlight_presentation_qualification(
                db,
                viewer_user_id=1,
                presentation_token=token,
                qualification_key="pg-qualified-final-round",
                event_at=NOW + timedelta(seconds=2),
                visible_ms=SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
                visible_ratio=SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
                document_visible=True,
            )
            return result.recorded, result.deduped, result.delivery_round_consumed

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(lambda _index: qualify(), (1, 2)))
    with postgres_engine.begin() as conn:
        consumed = conn.execute(
            text(
                "SELECT consumed_delivery_rounds FROM spotlight_campaign_pacing_states WHERE campaign_id=1"
            )
        ).scalar_one()
        exposures = conn.execute(
            text("SELECT COUNT(*) FROM spotlight_exposure_events")
        ).scalar_one()
        lease_status = conn.execute(
            text("SELECT status FROM spotlight_presentation_leases")
        ).scalar_one()

    assert sum(bool(recorded) for recorded, _deduped, _consumed in outcomes) == 1
    assert sum(bool(deduped) for _recorded, deduped, _consumed in outcomes) == 1
    assert sum(bool(round_consumed) for _recorded, _deduped, round_consumed in outcomes) == 1
    assert int(consumed) == 1
    assert int(exposures) == 1
    assert lease_status == "qualified"


def test_postgres_concurrent_final_legacy_unit_cannot_overconsume(postgres_engine) -> None:
    with postgres_engine.begin() as conn:
        conn.execute(text("INSERT INTO users (id, email, hashed_password, role) VALUES (1, 'pg-legacy@example.com', 'x', 'member')"))
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    owner_user_id, feature_code, plan_code, quantity_total, quantity_used,
                    status, starts_at, expires_at, payment_reference
                ) VALUES (1, 'spotlight_priority', 'pg-test', 1, 0, 'active', :start, :expiry, 'pg-final-unit')
                """
            ),
            {"start": NOW - timedelta(days=1), "expiry": NOW + timedelta(days=1)},
        )
    sessions = sessionmaker(bind=postgres_engine, autoflush=False, expire_on_commit=False)
    barrier = Barrier(2)

    def consume(index: int):
        with sessions() as db:
            barrier.wait()
            result = consume_feature_units(
                db,
                owner_user_id=1,
                feature_code="spotlight_priority",
                reference_key=f"pg-final-unit-{index}",
                now=NOW,
            )
            return bool(result.get("ok"))

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(consume, (1, 2)))
    with postgres_engine.begin() as conn:
        used = conn.execute(text("SELECT quantity_used FROM feature_entitlements")).scalar_one()
        events = conn.execute(text("SELECT COUNT(*) FROM feature_usage_events")).scalar_one()
    assert sum(outcomes) == 1
    assert int(used) == 1
    assert int(events) == 1


def test_postgres_concurrent_final_member_credit_cannot_overspend(postgres_engine) -> None:
    with postgres_engine.begin() as conn:
        conn.execute(text("INSERT INTO users (id, email, hashed_password, role) VALUES (1, 'pg-credit@example.com', 'x', 'member')"))
        conn.execute(text("INSERT INTO member_service_credit_accounts (member_user_id, balance_units, version, status, created_at, updated_at) VALUES (1,1,0,'active',:now,:now)"), {"now": NOW})
    sessions = sessionmaker(bind=postgres_engine, autoflush=False, expire_on_commit=False)
    barrier = Barrier(2)

    def spend(index: int):
        with sessions() as db:
            barrier.wait()
            try:
                _consume_member_credits(
                    db,
                    member_user_id=1,
                    units=1,
                    spend_order_id=index,
                    fingerprint=f"{index:064d}",
                    now=NOW,
                )
                db.commit()
                return True
            except MemberCreditError:
                db.rollback()
                return False

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(spend, (1, 2)))
    with postgres_engine.begin() as conn:
        balance = conn.execute(text("SELECT balance_units FROM member_service_credit_accounts")).scalar_one()
        entries = conn.execute(text("SELECT COUNT(*) FROM member_service_credit_ledger_entries")).scalar_one()
    assert sum(outcomes) == 1
    assert int(balance) == 0
    assert int(entries) == 1


def test_postgres_withdrawal_racing_issuance_never_leaves_a_servable_lease(
    postgres_engine, monkeypatch
) -> None:
    monkeypatch.setenv("SECRET_KEY", "postgres-disposable-concurrency-secret")
    monkeypatch.setenv("GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED", "1")
    _seed_spotlight(postgres_engine)
    sessions = sessionmaker(bind=postgres_engine, autoflush=False, expire_on_commit=False)
    barrier = Barrier(2)

    def issue():
        with sessions() as db:
            barrier.wait()
            result = select_spotlight_presentation(db, viewer_user_id=1, now=NOW, issuance_key="pg-race-withdraw")
            db.commit()
            return result.selected

    def withdraw():
        with sessions() as db:
            campaign = db.get(SpotlightCampaign, 1)
            barrier.wait()
            permanently_withdraw(db, campaign=campaign, now=NOW + timedelta(seconds=1))
            db.commit()

    with ThreadPoolExecutor(max_workers=2) as pool:
        issue_future = pool.submit(issue)
        withdraw_future = pool.submit(withdraw)
        issue_future.result()
        withdraw_future.result()
    with postgres_engine.begin() as conn:
        serving = conn.execute(text("SELECT serving_status FROM spotlight_campaigns WHERE id=1")).scalar_one()
        issued = conn.execute(text("SELECT COUNT(*) FROM spotlight_presentation_leases WHERE status='issued'")).scalar_one()
    assert serving == "withdrawn"
    assert int(issued) == 0
