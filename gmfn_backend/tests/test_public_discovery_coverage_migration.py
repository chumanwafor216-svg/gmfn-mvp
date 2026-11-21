from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


PREVIOUS_REVISION = "20261120_public_merchant_discovery"
HEAD_REVISION = "20261120_public_discovery_coverage"


def _config(connection) -> Config:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.attributes["connection"] = connection
    return config


def test_coverage_migration_marks_only_historical_searches_unknown(tmp_path) -> None:
    historical_engine = create_engine(
        f"sqlite:///{(tmp_path / 'historical-discovery.db').as_posix()}"
    )
    clean_engine = create_engine(
        f"sqlite:///{(tmp_path / 'clean-discovery.db').as_posix()}"
    )
    try:
        with historical_engine.begin() as connection:
            command.upgrade(_config(connection), PREVIOUS_REVISION)
            connection.execute(
                text(
                    "INSERT INTO marketplace_public_discovery_search_events "
                    "(id, query_hash) VALUES (1, 'historical')"
                )
            )
            command.upgrade(_config(connection), HEAD_REVISION)
            historical = connection.execute(
                text(
                    "SELECT coverage_complete, coverage_known, scan_limit_reached, "
                    "scanned_publication_count, evaluated_publication_count "
                    "FROM marketplace_public_discovery_search_events WHERE id = 1"
                )
            ).one()
            assert tuple(historical) == (False, False, False, 0, 0)

        with clean_engine.begin() as connection:
            command.upgrade(_config(connection), HEAD_REVISION)
            connection.execute(
                text(
                    "INSERT INTO marketplace_public_discovery_search_events "
                    "(id, query_hash) VALUES (1, 'measured')"
                )
            )
            measured = connection.execute(
                text(
                    "SELECT coverage_complete, coverage_known, scan_limit_reached, "
                    "scanned_publication_count, evaluated_publication_count "
                    "FROM marketplace_public_discovery_search_events WHERE id = 1"
                )
            ).one()
            assert tuple(measured) == (True, True, False, 0, 0)
    finally:
        historical_engine.dispose()
        clean_engine.dispose()
