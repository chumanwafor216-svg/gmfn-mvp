from __future__ import annotations

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PURCHASE_LINK_REVISION = "20261017_member_credit_purchase_link_v1"
PROFILE_PERMISSION_REVISION = "20261017_member_credit_profile_permissions_v1"


def _config(db_path: Path) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{db_path.as_posix()}")
    return config


def _migrate(config: Config, database, direction: str, revision: str) -> None:
    with database.begin() as connection:
        config.attributes["connection"] = connection
        getattr(command, direction)(config, revision)


def test_profile_permission_migration_round_trip_when_no_preferences_exist(tmp_path) -> None:
    db_path = tmp_path / "profile-permission-round-trip.db"
    config = _config(db_path)
    database = create_engine(f"sqlite:///{db_path.as_posix()}")

    _migrate(config, database, "upgrade", PURCHASE_LINK_REVISION)
    assert "member_credit_service_permissions_json" not in {
        column["name"] for column in inspect(database).get_columns("user_settings")
    }

    _migrate(config, database, "upgrade", PROFILE_PERMISSION_REVISION)
    assert "member_credit_service_permissions_json" in {
        column["name"] for column in inspect(database).get_columns("user_settings")
    }

    _migrate(config, database, "downgrade", PURCHASE_LINK_REVISION)
    assert "member_credit_service_permissions_json" not in {
        column["name"] for column in inspect(database).get_columns("user_settings")
    }


def test_profile_permission_migration_refuses_to_drop_saved_member_choice(tmp_path) -> None:
    db_path = tmp_path / "profile-permission-downgrade-guard.db"
    config = _config(db_path)
    database = create_engine(f"sqlite:///{db_path.as_posix()}")
    _migrate(config, database, "upgrade", PROFILE_PERMISSION_REVISION)

    with database.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, email, hashed_password, role) "
                "VALUES (7001, 'permission-owner@example.invalid', 'x', 'member')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO user_settings "
                "(user_id, member_credit_service_permissions_json) "
                "VALUES (7001, json_object('spotlight.single_day', 1))"
            )
        )

    with pytest.raises(RuntimeError, match="Unsafe downgrade refused"):
        _migrate(config, database, "downgrade", PURCHASE_LINK_REVISION)

    with database.begin() as connection:
        saved = connection.execute(
            text(
                "SELECT member_credit_service_permissions_json "
                "FROM user_settings WHERE user_id = 7001"
            )
        ).scalar_one()
        assert saved == '{"spotlight.single_day":1}'
