from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


POSTGRES_URL = str(os.getenv("SPOTLIGHT_POSTGRES_TEST_DATABASE_URL", "") or "").strip()
POSTGRES_OPT_IN = str(os.getenv("GSN_ALLOW_DESTRUCTIVE_DISPOSABLE_DB_TESTS", "") or "").lower() in {"1", "true", "yes", "on"}
pytestmark = pytest.mark.skipif(
    not POSTGRES_URL or not POSTGRES_OPT_IN,
    reason="requires an explicit disposable PostgreSQL URL and destructive-test opt-in",
)
ROOT = Path(__file__).resolve().parents[1]
PREVIOUS = "20261015_membership_admission"
LIFECYCLE = "20261016_spotlight_lifecycle"
HEAD = "20261016_member_credit_v1"
ACTIVATED = datetime(2026, 10, 16, 14, 35, 27, 123456, tzinfo=timezone.utc)
EXPIRES = ACTIVATED + timedelta(hours=7, minutes=13, seconds=11)


def _run(engine, revision: str, *, downgrade: bool = False) -> None:
    config = Config(str(ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", POSTGRES_URL)
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        (command.downgrade if downgrade else command.upgrade)(config, revision)


@pytest.fixture()
def postgres():
    database = (urlparse(POSTGRES_URL).path or "").strip("/").lower()
    if not any(marker in database for marker in ("test", "tmp", "disposable")):
        pytest.fail("PostgreSQL migration URL must identify a disposable test database")
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    try:
        yield engine
    finally:
        engine.dispose()


def _seed(engine, *, two_users: bool = False) -> None:
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO users (id,email,hashed_password,role) VALUES (1,'migration-owner@example.invalid','x','member')"))
        if two_users:
            connection.execute(text("INSERT INTO users (id,email,hashed_password,role) VALUES (2,'migration-viewer@example.invalid','x','member')"))
        connection.execute(text("INSERT INTO clans (id,name,community_code,status,invite_code,invite_uses) VALUES (1,'Migration Test Community','MIGRATION-TEST','active','MIGRATION-TEST',0)"))
        connection.execute(text("""
            INSERT INTO spotlight_campaigns (
                id,owner_user_id,origin_clan_id,content_kind,content_fingerprint,
                status,source_kind,commercial_mode,distribution_scope,
                opportunity_intent,opportunity_category,opportunity_geo_scope,
                opportunity_availability,created_at,activated_at,expires_at
            ) VALUES (1,1,1,'broadcast_snapshot',:fingerprint,'active',
                'direct_broadcast','free','direct_communities','offer','product',
                'community','available',:created,:activated,:expires)
        """), {"fingerprint": "a" * 64, "created": ACTIVATED - timedelta(minutes=2), "activated": ACTIVATED, "expires": EXPIRES})
        connection.execute(text("""
            INSERT INTO marketplace_broadcasts (
                id,clan_id,author_user_id,message,priority_mode,visibility_scope,
                expires_at,created_at,spotlight_campaign_id
            ) VALUES (1,1,1,'Migration fixture','free','direct_communities',:expires,:created,1)
        """), {"expires": EXPIRES - timedelta(minutes=3), "created": ACTIVATED})
        connection.execute(text("""
            INSERT INTO feature_entitlements (
                id,owner_user_id,clan_id,feature_code,plan_code,quantity_total,
                quantity_used,status,starts_at,expires_at,payment_reference,created_at,updated_at
            ) VALUES (1,1,1,'spotlight_priority','migration-preserved',3,1,'active',
                :starts,:expires,'migration-preserved-entitlement',:created,:updated)
        """), {"starts": ACTIVATED - timedelta(days=1), "expires": EXPIRES + timedelta(days=2), "created": ACTIVATED - timedelta(days=2), "updated": ACTIVATED - timedelta(hours=1)})
        connection.execute(text("""
            INSERT INTO feature_usage_events (
                id,entitlement_id,owner_user_id,clan_id,feature_code,units_used,
                reference_key,note,created_at
            ) VALUES (1,1,1,1,'spotlight_priority',1,'migration-existing-usage','preserve history',:created)
        """), {"created": ACTIVATED - timedelta(minutes=30)})


def _snapshot(engine) -> tuple[tuple, ...]:
    queries = (
        "SELECT id,owner_user_id,origin_clan_id,content_fingerprint,status,created_at,activated_at,expires_at FROM spotlight_campaigns WHERE id=1",
        "SELECT id,clan_id,author_user_id,message,priority_mode,expires_at,created_at,spotlight_campaign_id FROM marketplace_broadcasts WHERE id=1",
        "SELECT id,owner_user_id,clan_id,feature_code,plan_code,quantity_total,quantity_used,status,starts_at,expires_at,payment_reference,created_at,updated_at FROM feature_entitlements WHERE id=1",
        "SELECT id,entitlement_id,owner_user_id,clan_id,feature_code,units_used,reference_key,note,created_at FROM feature_usage_events WHERE id=1",
    )
    with engine.begin() as connection:
        return tuple(tuple(connection.execute(text(query)).one()) for query in queries)


def test_upgrade_clean_rollback_and_reupgrade_preserve_legacy_rows(postgres) -> None:
    _run(postgres, PREVIOUS)
    _seed(postgres)
    before = _snapshot(postgres)
    _run(postgres, HEAD)
    assert _snapshot(postgres) == before
    with postgres.begin() as connection:
        campaign = connection.execute(text("SELECT expires_at,authorized_expires_at FROM spotlight_campaigns WHERE id=1")).one()
        placement = connection.execute(text("SELECT expires_at,authorized_expires_at FROM marketplace_broadcasts WHERE id=1")).one()
        assert campaign.authorized_expires_at == campaign.expires_at
        assert placement.authorized_expires_at == placement.expires_at
        assert connection.execute(text("SELECT COUNT(*) FROM spotlight_content_versions")).scalar_one() == 1
    _run(postgres, PREVIOUS, downgrade=True)
    assert _snapshot(postgres) == before
    _run(postgres, HEAD)
    assert _snapshot(postgres) == before


def test_duplicate_usage_preflight_preserves_rows(postgres) -> None:
    _run(postgres, PREVIOUS)
    _seed(postgres)
    with postgres.begin() as connection:
        connection.execute(text("""
            INSERT INTO feature_usage_events (id,entitlement_id,owner_user_id,clan_id,
                feature_code,units_used,reference_key,note,created_at)
            VALUES (2,1,1,1,'spotlight_priority',1,'migration-existing-usage','duplicate',:created)
        """), {"created": ACTIVATED})
    with pytest.raises(RuntimeError, match="duplicate non-null references"):
        _run(postgres, LIFECYCLE)
    with postgres.begin() as connection:
        assert connection.execute(text("SELECT COUNT(*) FROM feature_usage_events WHERE reference_key='migration-existing-usage'")).scalar_one() == 2
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == PREVIOUS
        assert "serving_status" not in {column["name"] for column in inspect(connection).get_columns("spotlight_campaigns")}


def test_duplicate_issuance_preflight_preserves_rows(postgres) -> None:
    _run(postgres, LIFECYCLE)
    _seed(postgres, two_users=True)
    with postgres.begin() as connection:
        for index, viewer in enumerate((1, 2), start=1):
            connection.execute(text("""
                INSERT INTO spotlight_presentation_leases (
                    presentation_id,issuance_key,viewer_user_id,campaign_id,
                    placement_broadcast_id,content_version,surface,status,issued_at,lease_expires_at
                ) VALUES (:presentation,'duplicate-global-issuance',:viewer,1,1,1,
                    'public_shop_spotlight_rail','issued',:issued,:expires)
            """), {"presentation": f"duplicate-{index}", "viewer": viewer, "issued": ACTIVATED, "expires": ACTIVATED + timedelta(seconds=30)})
    with pytest.raises(RuntimeError, match="duplicate references exist"):
        _run(postgres, HEAD)
    with postgres.begin() as connection:
        assert connection.execute(text("SELECT COUNT(*) FROM spotlight_presentation_leases WHERE issuance_key='duplicate-global-issuance'")).scalar_one() == 2
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == LIFECYCLE
        assert "issuance_fingerprint" not in {column["name"] for column in inspect(connection).get_columns("spotlight_presentation_leases")}


def test_fingerprint_blocks_downgrade_with_flags_off(postgres, monkeypatch) -> None:
    monkeypatch.delenv("GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED", raising=False)
    monkeypatch.delenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", raising=False)
    _run(postgres, HEAD)
    _seed(postgres)
    with postgres.begin() as connection:
        connection.execute(text("""
            INSERT INTO spotlight_presentation_leases (
                presentation_id,issuance_key,issuance_fingerprint,viewer_user_id,
                campaign_id,placement_broadcast_id,content_version,surface,status,
                issued_at,lease_expires_at
            ) VALUES ('fingerprinted','fingerprinted',:fingerprint,1,1,1,1,
                'public_shop_spotlight_rail','issued',:issued,:expires)
        """), {"fingerprint": "f" * 64, "issued": ACTIVATED, "expires": ACTIVATED + timedelta(seconds=30)})
    with pytest.raises(RuntimeError, match="idempotency fingerprints have been written"):
        _run(postgres, LIFECYCLE, downgrade=True)
    with postgres.begin() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == HEAD


def test_publication_key_blocks_lifecycle_downgrade_with_flags_off(postgres, monkeypatch) -> None:
    monkeypatch.delenv("GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED", raising=False)
    monkeypatch.delenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", raising=False)
    _run(postgres, HEAD)
    _seed(postgres)
    with postgres.begin() as connection:
        connection.execute(text("UPDATE marketplace_broadcasts SET publication_key='ordinary-publication-request' WHERE id=1"))
    with pytest.raises(RuntimeError, match="Unsafe Spotlight rollback refused"):
        _run(postgres, PREVIOUS, downgrade=True)
    with postgres.begin() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == HEAD
        assert connection.execute(text("SELECT publication_key FROM marketplace_broadcasts WHERE id=1")).scalar_one() == "ordinary-publication-request"
