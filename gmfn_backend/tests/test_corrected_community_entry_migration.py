from __future__ import annotations

import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


PREVIOUS = "20261112_pipeline_credit_control_plane"
HEAD = "20261118_corrected_community_entry"
ROOT = Path(__file__).resolve().parents[1]


def _migrate(database_url: str, revision: str, *, downgrade: bool = False) -> None:
    config = Config(str(ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    previous_database_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = database_url
    try:
        (command.downgrade if downgrade else command.upgrade)(config, revision)
    finally:
        if previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous_database_url


def _legacy_snapshot(engine) -> tuple[tuple, ...]:
    statements = (
        "SELECT id, email, gmfn_id FROM users ORDER BY id",
        "SELECT id, name, admission_mode, voting_admin_override FROM clans ORDER BY id",
        "SELECT id, clan_id, applicant_user_id, status, invite_id, invited_by_user_id FROM clan_join_requests ORDER BY id",
        "SELECT id, display_name, phone_e164, verified_at FROM entry_phone_verifications ORDER BY id",
    )
    with engine.begin() as connection:
        return tuple(
            tuple(tuple(row) for row in connection.execute(text(statement)).all())
            for statement in statements
        )


def test_corrected_entry_migration_preserves_legacy_admission_and_pending_rows(
    monkeypatch,
) -> None:
    monkeypatch.setenv("GMFN_DEV_MODE", "true")
    database_path = ROOT / ".corrected-entry-migration-test.db"
    database_path.unlink(missing_ok=True)
    database_url = f"sqlite:///{database_path.as_posix()}"
    _migrate(database_url, PREVIOUS)
    engine = create_engine(database_url)

    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, email, hashed_password, role, gmfn_id) VALUES "
                "(1, 'legacy-owner@example.test', 'x', 'user', 'GMFN-U-LEGACY01'), "
                "(2, 'pending-applicant@example.test', 'PENDING_APPROVAL', 'user', NULL)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO clans "
                "(id, name, invite_code, invite_uses, created_by_user_id, admission_mode, voting_admin_override) VALUES "
                "(1, 'Legacy Vote Community', 'legacy-vote', 0, 1, NULL, 0), "
                "(2, 'Existing Instant Community', 'existing-instant', 0, 1, 'instant_invite', 1)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO clan_memberships (id, clan_id, user_id, role) "
                "VALUES (1, 1, 1, 'admin')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO clan_join_requests "
                "(id, clan_id, applicant_user_id, invited_by_user_id, status, created_at) "
                "VALUES (1, 1, 2, 1, 'pending', '2026-11-17 12:00:00')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO entry_phone_verifications "
                "(id, display_name, phone_e164, expires_at, verified_at) "
                "VALUES (1, 'Pending Applicant', '+447700901111', "
                "'2026-11-17 12:30:00', '2026-11-17 12:00:00')"
            )
        )

    before = _legacy_snapshot(engine)
    _migrate(database_url, HEAD)

    assert _legacy_snapshot(engine) == before
    with engine.begin() as connection:
        communities = connection.execute(
            text(
                "SELECT id, search_join_enabled, search_join_admission_mode, "
                "search_join_admin_override, creation_request_key "
                "FROM clans ORDER BY id"
            )
        ).all()
        assert [tuple(row) for row in communities] == [
            (1, False, "community_vote", False, None),
            (2, False, "community_vote", False, None),
        ]
        request_row = connection.execute(
            text(
                "SELECT status, request_source, admission_mode_snapshot, admin_override_snapshot "
                "FROM clan_join_requests WHERE id = 1"
            )
        ).one()
        assert tuple(request_row) == ("pending", "invite", None, False)
        identity_key = connection.execute(
            text(
                "SELECT identity_request_key FROM entry_phone_verifications WHERE id = 1"
            )
        ).scalar_one()
        assert identity_key is None

    _migrate(database_url, PREVIOUS, downgrade=True)
    assert _legacy_snapshot(engine) == before
    with engine.begin() as connection:
        assert "search_join_enabled" not in {
            column["name"] for column in inspect(connection).get_columns("clans")
        }
        assert "request_source" not in {
            column["name"]
            for column in inspect(connection).get_columns("clan_join_requests")
        }
        assert "identity_request_key" not in {
            column["name"]
            for column in inspect(connection).get_columns("entry_phone_verifications")
        }

    engine.dispose()
    database_path.unlink(missing_ok=True)
