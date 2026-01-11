import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

# ------------------------------------------------------------
# Stable SQLite test database
# ------------------------------------------------------------
backend_root = Path(__file__).resolve().parents[1]  # gmfn_backend/
db_path = backend_root / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"

# Start clean BEFORE importing app/engine (important on Windows)
if db_path.exists():
    try:
        db_path.unlink()
    except Exception:
        pass

from app.main import app
from app.core import clan_auth
from app.db.database import engine


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
@pytest.fixture(autouse=True)
def _clean_db_between_tests(_apply_migrations):

    """
    Ensure test isolation: wipe mutable tables before each test.
    """
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM loan_guarantors"))
        conn.execute(text("DELETE FROM loans"))
        conn.execute(text("DELETE FROM clan_memberships"))
        conn.execute(text("DELETE FROM clans"))
        conn.execute(text("DELETE FROM users"))
    yield 


@pytest.fixture(scope="session", autouse=True)
def _apply_migrations():
    """
    Create schema for tests by running Alembic upgrade head on a fresh SQLite DB.
    Uses injected connection (requires alembic/env.py to honor config.attributes['connection']).
    """
    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))

    with engine.begin() as connection:
        alembic_cfg.attributes["connection"] = connection
        command.upgrade(alembic_cfg, "head")

    yield


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


# ------------------------------------------------------------
# Seed fixtures
# ------------------------------------------------------------
@pytest.fixture()
def seed_clan_admin_membership():
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT OR IGNORE INTO users (id, email, hashed_password, role)
            VALUES (1, 'pytest@example.com', 'hashed', 'admin')
        """))
        conn.execute(text("""
            INSERT OR IGNORE INTO clans (id, name)
            VALUES (1, 'Test Clan')
        """))
        conn.execute(text("""
            INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
            VALUES (1, 1, 1, 'admin', 0)
        """))
    yield

@pytest.fixture()
def seed_clan_member_membership():
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT OR IGNORE INTO users (id, email, hashed_password, role)
            VALUES (1, 'pytest@example.com', 'hashed', 'user')
        """))
        conn.execute(text("""
            INSERT OR IGNORE INTO clans (id, name)
            VALUES (1, 'Test Clan')
        """))
        conn.execute(text("""
            INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
            VALUES (1, 1, 1, 'member', 0)
        """))
    yield

@pytest.fixture()
def seed_loan():
    """
    Seed loan id=1. This fixture assumes user=1 and clan=1 already exist
    (provided by seed_clan_admin_membership or seed_clan_member_membership).
    """
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT OR IGNORE INTO loans (
                id,
                borrower_user_id,
                amount,
                currency,
                status,
                clan_id,
                guarantors_required
            )
            VALUES (
                1,
                1,
                1000,
                'USD',
                'pending',
                1,
                1
            )
        """))
    yield
@pytest.fixture()
def seed_loan_guarantor(seed_clan_admin_membership, seed_loan):
    """
    Seed loan_guarantors row id=1 so guarantor decision PATCH tests can succeed.
    Requires:
    - user=1 exists
    - clan=1 exists
    - membership (clan_id=1, user_id=1) exists
    - loan id=1 exists
    """
    with engine.begin() as conn:
        conn.execute(
            text("""
            INSERT OR IGNORE INTO loan_guarantors (
                id, loan_id, clan_id, guarantor_user_id, pledge_amount, status
            )
            VALUES (1, 1, 1, 1, 0, 'pending')
            """)
        )
    yield

@pytest.fixture()
def seed_user2_non_member():
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT OR IGNORE INTO users (id, email, hashed_password, role)
            VALUES (2, 'user2@example.com', 'hashed', 'user')
        """))
    yield


# ------------------------------------------------------------
# Dependency overrides (clan context)
# ------------------------------------------------------------
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


# ------------------------------------------------------------
# Current-user override (auth-protected routes)
# ------------------------------------------------------------
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

