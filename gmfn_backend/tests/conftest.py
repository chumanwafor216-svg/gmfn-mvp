# tests/conftest.py
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Iterable

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

backend_root = Path(__file__).resolve().parents[1]  # gmfn_backend/
pid = os.getpid()
db_path = backend_root / f"test_{pid}.db"
db_url = f"sqlite:///{db_path.as_posix()}"

os.environ["DATABASE_URL"] = db_url
os.environ["PYTEST_RUNNING"] = "1"

if db_path.exists():
    try:
        db_path.unlink()
    except Exception:
        pass

from app.main import app  # noqa: E402
from app.core import clan_auth  # noqa: E402
from app.db.database import engine  # noqa: E402


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _list_user_tables(conn) -> list[str]:
    rows = conn.execute(
        text(
            """
            SELECT name
            FROM sqlite_master
            WHERE type='table'
              AND name NOT LIKE 'sqlite_%'
              AND name != 'alembic_version'
            ORDER BY name ASC
            """
        )
    ).fetchall()
    return [r[0] for r in rows]


def _wipe_all_tables(conn, tables: Iterable[str]) -> None:
    conn.execute(text("PRAGMA foreign_keys=OFF"))
    for t in tables:
        conn.execute(text(f'DELETE FROM "{t}"'))
    conn.execute(text("PRAGMA foreign_keys=ON"))


@pytest.fixture(scope="session", autouse=True)
def _apply_migrations():
    if db_path.name not in str(engine.url):
        raise RuntimeError(
            "TEST DB MISCONFIGURATION: app engine is not using the per-run test DB.\n"
            f"Expected engine.url to include '{db_path.name}'\n"
            f"Actual engine.url = {engine.url}\n"
            f"DATABASE_URL = {db_url}\n"
        )

    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)

    with engine.begin() as connection:
        alembic_cfg.attributes["connection"] = connection
        command.upgrade(alembic_cfg, "head")

    yield

    try:
        if db_path.exists():
            db_path.unlink()
    except Exception:
        pass


@pytest.fixture(autouse=True)
def _clean_db_between_tests(_apply_migrations):
    with engine.begin() as conn:
        tables = _list_user_tables(conn)
        _wipe_all_tables(conn, tables)
    yield


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def seed_clan_admin_membership():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO users (id, email, hashed_password, role)
            VALUES (1, 'pytest@example.com', 'hashed', 'admin')
            """
            )
        )
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO clans (
                id,
                name,
                invite_code,
                community_code,
                status,
                invite_uses,
                created_at
            )
            VALUES (
                1,
                'Test Clan',
                'test-invite-1',
                'GMFN-C-000001',
                'active',
                0,
                CURRENT_TIMESTAMP
            )
            """
            )
        )
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
            VALUES (1, 1, 1, 'admin', 0)
            """
            )
        )
    yield


@pytest.fixture()
def seed_clan_member_membership():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO users (id, email, hashed_password, role)
            VALUES (1, 'pytest@example.com', 'hashed', 'user')
            """
            )
        )
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO clans (
                id,
                name,
                invite_code,
                community_code,
                status,
                invite_uses,
                created_at
            )
            VALUES (
                1,
                'Test Clan',
                'test-invite-1',
                'GMFN-C-000001',
                'active',
                0,
                CURRENT_TIMESTAMP
            )
            """
            )
        )
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
            VALUES (1, 1, 1, 'member', 0)
            """
            )
        )
    yield


@pytest.fixture()
def seed_user2_non_member():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO users (id, email, hashed_password, role)
            VALUES (2, 'user2@example.com', 'hashed', 'user')
            """
            )
        )
    yield


@pytest.fixture()
def seed_user2_member_membership(seed_clan_admin_membership, seed_user2_non_member):
    """
    Make user 2 a normal member of clan 1 (so they can be invited as guarantor).
    """
    with engine.begin() as conn:
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
            VALUES (1, 2, 'member', 0)
            """
            )
        )
    yield


@pytest.fixture()
def seed_loan():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO loans (
                id, borrower_user_id, amount, currency, status, clan_id, guarantors_required
            )
            VALUES (1, 1, 1000, 'USD', 'pending', 1, 1)
            """
            )
        )
    yield


@pytest.fixture()
def seed_loan_guarantor(seed_clan_admin_membership, seed_loan):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
            INSERT OR IGNORE INTO loan_guarantors (
                id, loan_id, clan_id, guarantor_user_id, pledge_amount, status
            )
            VALUES (1, 1, 1, 1, 1.00, 'pending')
            """
            )
        )
    yield


@pytest.fixture()
def override_clan_ctx_admin():
    def fake_clan_ctx():
        clan = Obj(id=1)
        membership = Obj(role="admin", clan_id=1, user_id=1)
        current_user = Obj(id=1, email="pytest@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx
    yield
    app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)


@pytest.fixture()
def override_clan_ctx_member():
    def fake_clan_ctx():
        clan = Obj(id=1)
        membership = Obj(role="member", clan_id=1, user_id=1)
        current_user = Obj(id=1, email="pytest@example.com")
        return clan, membership, current_user

    app.dependency_overrides[clan_auth.get_current_clan_membership] = fake_clan_ctx
    yield
    app.dependency_overrides.pop(clan_auth.get_current_clan_membership, None)


@pytest.fixture()
def override_current_user():
    def fake_current_user():
        return Obj(id=1, email="pytest@example.com", role="admin")

    targets = (
        ("app.core.auth", "get_current_user"),
        ("app.core.auth", "get_current_active_user"),
        ("app.core.security", "get_current_user"),
        ("app.core.security", "get_current_active_user"),
        ("app.deps", "get_current_user"),
        ("app.deps", "get_current_active_user"),
    )

    for mod_name, fn_name in targets:
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            app.dependency_overrides[fn] = fake_current_user
        except Exception:
            pass

    yield

    for mod_name, fn_name in targets:
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            app.dependency_overrides.pop(fn, None)
        except Exception:
            pass


@pytest.fixture()
def override_current_user_user():
    """
    Non-admin current user override for permission tests.
    """
    def fake_current_user():
        return Obj(id=1, email="pytest@example.com", role="user")

    targets = (
        ("app.core.auth", "get_current_user"),
        ("app.core.auth", "get_current_active_user"),
        ("app.core.security", "get_current_user"),
        ("app.core.security", "get_current_active_user"),
        ("app.deps", "get_current_user"),
        ("app.deps", "get_current_active_user"),
    )

    for mod_name, fn_name in targets:
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            app.dependency_overrides[fn] = fake_current_user
        except Exception:
            pass

    yield

    for mod_name, fn_name in targets:
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            app.dependency_overrides.pop(fn, None)
        except Exception:
            pass
