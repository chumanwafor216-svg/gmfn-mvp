import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.clan_auth import get_current_clan_membership


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


@pytest.fixture(scope="session")
def client():
    """
    Base client fixture. Individual tests can override dependencies as needed.
    """
    with TestClient(app) as c:
        yield c


# -------------------------
# Clan context overrides
# -------------------------
@pytest.fixture()
def override_clan_ctx_admin():
    def fake_clan_ctx():
        clan = Obj(id=1)
        membership = Obj(role="admin")
        current_user = Obj(id=1, email="pytest@example.com")
        return (clan, membership, current_user)

    app.dependency_overrides[get_current_clan_membership] = fake_clan_ctx
    yield
    app.dependency_overrides.pop(get_current_clan_membership, None)


@pytest.fixture()
def override_clan_ctx_member():
    def fake_clan_ctx():
        clan = Obj(id=1)
        membership = Obj(role="member")
        current_user = Obj(id=1, email="pytest@example.com")
        return (clan, membership, current_user)

    app.dependency_overrides[get_current_clan_membership] = fake_clan_ctx
    yield
    app.dependency_overrides.pop(get_current_clan_membership, None)


# -------------------------
# Current-user override (loans/auth-protected routes)
# -------------------------
@pytest.fixture()
def override_current_user():
    def fake_current_user():
        return Obj(id=1, email="pytest@example.com", role="admin")

    # Try overriding common dependency functions if they exist
    for mod_name, fn_name in (
        ("app.core.auth", "get_current_user"),
        ("app.core.auth", "get_current_active_user"),
        ("app.core.security", "get_current_user"),
        ("app.core.security", "get_current_active_user"),
        ("app.deps", "get_current_user"),
        ("app.deps", "get_current_active_user"),
    ):
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            app.dependency_overrides[fn] = fake_current_user
        except Exception:
            pass

    yield

    # Clear only the overrides we might have set
    for mod_name, fn_name in (
        ("app.core.auth", "get_current_user"),
        ("app.core.auth", "get_current_active_user"),
        ("app.core.security", "get_current_user"),
        ("app.core.security", "get_current_active_user"),
        ("app.deps", "get_current_user"),
        ("app.deps", "get_current_active_user"),
    ):
        try:
            mod = __import__(mod_name, fromlist=[fn_name])
            fn = getattr(mod, fn_name)
            app.dependency_overrides.pop(fn, None)
        except Exception:
            pass
