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
from app.core.clan_auth import get_current_clan_membership
from app.db.database import engine


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


@pytest.fixture(scope="session", autouse=True)
def _apply_migrations():
    """
    Create schema for tests by running Alembic upgrade head on a fresh SQLite DB.
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


@pytest.fixture()
def seed_clan_admin_membership():
    """
    Seed clan=1 and admin membership for user=1.
    """
    with engine.begin() as conn:
        conn.execute(
            text("""
            INSERT OR IGNORE INTO users (id, email, hashed_password, role)
            VALUES (1, 'pytest@example.com', 'hashed', 'admin')
            """)
        )

        conn.execute(
            text("""
            INSERT OR IGNORE INTO clans (id, name)
            VALUES (1, 'Test Clan')
            """)
        )

        conn.execute(
            text("""
            INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role)
            VALUES (1, 1, 1, 'admin')
            """)
        )
    yield


@pytest.fixture()
def seed_loan():
    """
    Seed loan id=1 for guarantor decision tests.
    """
    with engine.begin() as conn:
        conn.execute(
            text("""
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
            """)
        )
    yield


@pytest.fixture()
def seed_loan_guarantor():
    """
    Seed loan_guarantors row id=1 so the OK guarantor PATCH can succeed.
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


# -------------------------------------------------------------------
# Clan context overrides
# -------------------------------------------------------------------
@pytest.fixture()
def override_clan_ctx_admin():
    def fake_clan_ctx():
        clan = Obj(id=1)
        membership = Obj(role="admin", clan_id=1, user_id=1)
        current_user = Obj(id=1, email="pytest@example.com")
        return clan, membership, current_user

    app.dependency_overrides[get_current_clan_membership] = fake_clan_ctx
    yield
    app.dependency_overrides.pop(get_current_clan_membership, None)


@pytest.fixture()
def override_clan_ctx_member():
    def fake_clan_ctx():
        clan = Obj(id=1)
        membership = Obj(role="member", clan_id=1, user_id=1)
        current_user = Obj(id=1, email="pytest@example.com")
        return clan, membership, current_user

    app.dependency_overrides[get_current_clan_membership] = fake_clan_ctx
    yield
    app.dependency_overrides.pop(get_current_clan_membership, None)


# -------------------------------------------------------------------
# Current-user overrides (auth-protected routes)
# -------------------------------------------------------------------
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
