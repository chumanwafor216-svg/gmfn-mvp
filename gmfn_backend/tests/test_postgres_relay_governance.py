from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.db.models import MarketplaceRequest
from app.services.marketplace_relay_governance_service import (
    issue_relay_policy,
    record_relay_consent,
)


POSTGRES_URL = str(os.getenv("SPOTLIGHT_POSTGRES_TEST_DATABASE_URL", "") or "").strip()
POSTGRES_OPT_IN = str(
    os.getenv("GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS", "") or ""
).lower() in {"1", "true", "yes", "on"}
pytestmark = pytest.mark.skipif(
    not POSTGRES_URL or not POSTGRES_OPT_IN,
    reason="requires an explicit disposable PostgreSQL URL and destructive-test opt-in",
)


@pytest.fixture(scope="module")
def postgres_engine():
    database_name = (urlparse(POSTGRES_URL).path or "").strip("/").lower()
    if not any(marker in database_name for marker in ("test", "tmp", "disposable")):
        pytest.fail("PostgreSQL relay-governance URL must identify a disposable test database")
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
        connection.execute(
            text(
                "INSERT INTO users (id,email,hashed_password,role,gmfn_id) "
                "VALUES (1,'relay-governance@example.invalid','x','admin','PG-RELAY-ADMIN')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO clans (id,name,community_code,status,invite_code,invite_uses) "
                "VALUES (1,'Relay Governance Test','PG-RELAY','active','PG-RELAY',0)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO clan_memberships (id,clan_id,user_id,role,personal_pool_balance) "
                "VALUES (1,1,1,'admin',0)"
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    allow_trust_credit, status, created_at, expires_at
                ) VALUES (
                    1, 1, 1, 'Concurrent relay consent', 'test', 'test', 'medium',
                    false, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day'
                )
                """
            )
        )
    try:
        yield engine
    finally:
        engine.dispose()


def test_concurrent_policy_versions_are_serial_and_preserved(postgres_engine):
    Session = sessionmaker(bind=postgres_engine, expire_on_commit=False)

    def write_policy(index: int) -> int:
        with Session() as db:
            row = issue_relay_policy(
                db,
                clan_id=1,
                actor_user_id=1,
                outbound_enabled=index % 2 == 0,
                inbound_enabled=index % 3 == 0,
            )
            return int(row.version)

    with ThreadPoolExecutor(max_workers=8) as pool:
        versions = sorted(pool.map(write_policy, range(8)))

    assert versions == list(range(1, 9))
    with postgres_engine.begin() as connection:
        assert connection.execute(
            text("SELECT COUNT(*) FROM marketplace_relay_policies WHERE clan_id=1")
        ).scalar_one() == 8


def test_concurrent_consent_versions_are_serial_and_preserved(postgres_engine):
    Session = sessionmaker(bind=postgres_engine, expire_on_commit=False)

    def write_consent(index: int) -> int:
        with Session() as db:
            demand = db.get(MarketplaceRequest, 1)
            event = record_relay_consent(
                db,
                demand=demand,
                requester_user_id=1,
                granted=index % 2 == 0,
            )
            db.commit()
            return int(event.version)

    with ThreadPoolExecutor(max_workers=8) as pool:
        versions = sorted(pool.map(write_consent, range(8)))

    assert versions == list(range(1, 9))
    with postgres_engine.begin() as connection:
        assert connection.execute(
            text("SELECT COUNT(*) FROM marketplace_relay_consent_events WHERE marketplace_request_id=1")
        ).scalar_one() == 8


def test_latest_policy_read_uses_clan_version_index(postgres_engine):
    with postgres_engine.begin() as connection:
        plan = "\n".join(
            row[0]
            for row in connection.execute(
                text(
                    "EXPLAIN (COSTS OFF) SELECT * FROM marketplace_relay_policies "
                    "WHERE clan_id=1 ORDER BY version DESC, id DESC LIMIT 1"
                )
            )
        )
    assert "ix_marketplace_relay_policy_clan_version_v1" in plan
