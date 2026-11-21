from __future__ import annotations

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError


PREVIOUS_REVISION = "20261121_spotlight_slice3a_integrity"
HEAD_REVISION = "20261121_spotlight_slice4_payments"


def _config(connection) -> Config:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.attributes["connection"] = connection
    return config


def test_spotlight_slice4_migration_round_trip_and_global_allowlist_guard(
    tmp_path,
) -> None:
    engine = create_engine(
        f"sqlite:///{(tmp_path / 'spotlight-slice4-migration.db').as_posix()}"
    )
    try:
        with engine.begin() as connection:
            command.upgrade(_config(connection), PREVIOUS_REVISION)
            previous_columns = {
                column["name"]
                for column in inspect(connection).get_columns(
                    "advertising_campaign_settlements"
                )
            }
            assert "settlement_scope" not in previous_columns

            command.upgrade(_config(connection), HEAD_REVISION)
            inspector = inspect(connection)
            assert {
                "spotlight_commercial_pilot_entitlements",
                "pipeline_credit_acquisition_orders",
                "pipeline_credit_acquisition_applications",
                "pipeline_credit_acquisition_refunds",
            }.issubset(set(inspector.get_table_names()))
            settlement_columns = {
                column["name"]
                for column in inspector.get_columns(
                    "advertising_campaign_settlements"
                )
            }
            assert {
                "settlement_scope",
                "spotlight_booking_id",
                "funding_classification",
                "deferred_revenue_amount",
                "earned_revenue_amount",
                "outstanding_service_credit_amount",
            }.issubset(settlement_columns)
            entitlement_indexes = {
                index["name"]
                for index in inspector.get_indexes(
                    "spotlight_commercial_pilot_entitlements"
                )
            }
            assert {
                "uq_spotlight_pilot_entitlement_scoped_v1",
                "uq_spotlight_pilot_entitlement_global_v1",
            }.issubset(entitlement_indexes)

            connection.execute(
                text(
                    "INSERT INTO users (id, email, hashed_password, role) "
                    "VALUES (9001, 'slice4-migration@example.test', 'x', 'admin')"
                )
            )
            connection.execute(
                text(
                    "INSERT INTO spotlight_commercial_pilot_entitlements "
                    "(user_id, clan_id, entitlement_role, status, granted_by_user_id) "
                    "VALUES (9001, NULL, 'operator', 'active', 9001)"
                )
            )
            with pytest.raises(IntegrityError):
                with connection.begin_nested():
                    connection.execute(
                        text(
                            "INSERT INTO spotlight_commercial_pilot_entitlements "
                            "(user_id, clan_id, entitlement_role, status, granted_by_user_id) "
                            "VALUES (9001, NULL, 'operator', 'active', 9001)"
                        )
                    )

            command.downgrade(_config(connection), PREVIOUS_REVISION)
            rolled_back = inspect(connection)
            assert "pipeline_credit_acquisition_orders" not in set(
                rolled_back.get_table_names()
            )
            assert "settlement_scope" not in {
                column["name"]
                for column in rolled_back.get_columns(
                    "advertising_campaign_settlements"
                )
            }
            previous_unique_names = {
                constraint["name"]
                for constraint in rolled_back.get_unique_constraints(
                    "advertising_campaign_settlements"
                )
            }
            assert "uq_ad_campaign_settlement_campaign_v1" in previous_unique_names
    finally:
        engine.dispose()