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
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from app.api.routes.auth import _create_founder_clan
from app.api.routes.clans import _approve_join_request, _reject_join_request
from app.db.models import Clan, ClanJoinRequest, ClanMembership, User


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
ROOT = Path(__file__).resolve().parents[1]
NOW = datetime(2026, 11, 18, 20, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="session")
def postgres_engine():
    database_name = (urlparse(POSTGRES_URL).path or "").strip("/").lower()
    if not any(marker in database_name for marker in ("test", "tmp", "disposable")):
        pytest.fail("PostgreSQL concurrency URL must identify a disposable test database")
    engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
    config = Config(str(ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "alembic"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    yield engine
    engine.dispose()


@pytest.fixture(autouse=True)
def clean_postgres(postgres_engine):
    tables = [
        name
        for name in inspect(postgres_engine).get_table_names()
        if name != "alembic_version"
    ]
    if tables:
        quoted = ", ".join(f'"{name}"' for name in tables)
        with postgres_engine.begin() as connection:
            connection.exec_driver_sql(
                f"TRUNCATE TABLE {quoted} RESTART IDENTITY CASCADE"
            )


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "scheme": "https",
            "server": ("testserver", 443),
            "client": ("127.0.0.1", 50000),
            "path": "/clans/join-requests/test",
            "query_string": b"",
            "headers": [],
        }
    )


def _seed_review_requests(postgres_engine, *, community_count: int) -> None:
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    with sessions() as db:
        db.add_all(
            [
                User(
                    id=1,
                    email="pg-owner@example.test",
                    hashed_password="x",
                    role="user",
                    gmfn_id="GMFN-U-PGOWNER1",
                ),
                User(
                    id=2,
                    email="pg-applicant@example.test",
                    hashed_password="PENDING_APPROVAL",
                    role="user",
                ),
            ]
        )
        db.flush()
        for community_id in range(1, community_count + 1):
            db.add(
                Clan(
                    id=community_id,
                    name=f"Postgres Community {community_id}",
                    invite_code=f"pg-invite-{community_id}",
                    invite_uses=0,
                    created_by_user_id=1,
                    admission_mode="community_vote",
                    voting_admin_override=False,
                )
            )
            db.flush()
            db.add(
                ClanMembership(
                    clan_id=community_id,
                    user_id=1,
                    role="admin",
                )
            )
            db.add(
                ClanJoinRequest(
                    id=community_id,
                    clan_id=community_id,
                    applicant_user_id=2,
                    status="pending",
                    request_source="search",
                    admission_mode_snapshot="community_vote",
                    admin_override_snapshot=False,
                    created_at=NOW,
                )
            )
        db.commit()


def test_postgres_competing_final_decisions_keep_one_final_outcome(
    postgres_engine,
) -> None:
    _seed_review_requests(postgres_engine, community_count=1)
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    barrier = Barrier(2)

    def decide(action: str) -> dict:
        with sessions() as db:
            join_request = db.get(ClanJoinRequest, 1)
            barrier.wait()
            if action == "approve":
                return _approve_join_request(
                    db,
                    join_request=join_request,
                    request=_request(),
                )
            return _reject_join_request(db, join_request=join_request)

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(decide, ("approve", "reject")))

    with sessions() as db:
        stored_request = db.get(ClanJoinRequest, 1)
        applicant = db.get(User, 2)
        memberships = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.user_id == 2,
                ClanMembership.left_at.is_(None),
            )
            .count()
        )
        assert stored_request.status in {"approved", "rejected"}
        assert {result["status"] for result in results} == {stored_request.status}
        assert sum(bool(result.get("status_already_final")) for result in results) == 1
        if stored_request.status == "approved":
            assert applicant.gmfn_id
            assert memberships == 1
        else:
            assert applicant.gmfn_id is None
            assert memberships == 0


def test_postgres_concurrent_approvals_reuse_one_new_identity(
    postgres_engine,
) -> None:
    _seed_review_requests(postgres_engine, community_count=2)
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    barrier = Barrier(2)

    def approve(request_id: int) -> dict:
        with sessions() as db:
            join_request = db.get(ClanJoinRequest, request_id)
            barrier.wait()
            return _approve_join_request(
                db,
                join_request=join_request,
                request=_request(),
            )

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(approve, (1, 2)))

    with sessions() as db:
        applicant = db.get(User, 2)
        assert applicant.gmfn_id
        assert {result["status"] for result in results} == {"approved"}
        assert {result["gmfn_id"] for result in results} == {applicant.gmfn_id}
        assert (
            db.query(ClanMembership)
            .filter(
                ClanMembership.user_id == 2,
                ClanMembership.left_at.is_(None),
            )
            .count()
            == 2
        )


def test_postgres_duplicate_community_creation_reuses_one_result(
    postgres_engine,
) -> None:
    sessions = sessionmaker(bind=postgres_engine, expire_on_commit=False)
    with sessions() as db:
        db.add(
            User(
                id=1,
                email="pg-founder@example.test",
                hashed_password="x",
                role="user",
                gmfn_id="GMFN-U-PGFOUND1",
            )
        )
        db.commit()

    barrier = Barrier(2)

    def create_community(_: int) -> tuple[int, str]:
        with sessions() as db:
            founder = db.get(User, 1)
            barrier.wait()
            clan, role = _create_founder_clan(
                db,
                current_user=founder,
                clan_name="Concurrent Founder Community",
                clan_description="PostgreSQL idempotency proof.",
                creation_request_key="pg-create-11111111-2222-4333-8444-555555555555",
            )
            return int(clan.id), role

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(create_community, (1, 2)))

    with sessions() as db:
        assert results[0] == results[1]
        assert db.query(Clan).count() == 1
        assert db.query(ClanMembership).count() == 1
        assert db.query(Clan).one().creation_request_key == (
            "pg-create-11111111-2222-4333-8444-555555555555"
        )
