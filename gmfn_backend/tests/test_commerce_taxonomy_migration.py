from __future__ import annotations

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from app.db.database import engine


PREVIOUS_REVISION = "20261030_market_dir_scale"
HEAD_REVISION = "20261106_assisted_activation"


EXPECTED_TABLES = {
    "commerce_taxonomy_releases",
    "commerce_taxonomy_concepts",
    "commerce_taxonomy_concept_versions",
    "commerce_taxonomy_terms",
    "commerce_taxonomy_redirects",
    "commerce_taxonomy_proposals",
    "marketplace_shop_capabilities",
    "marketplace_shop_capability_availability",
    "marketplace_shop_capability_coverage",
    "marketplace_product_capabilities",
}


def _config(connection) -> Config:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.attributes["connection"] = connection
    return config


def _upgrade(connection, revision: str) -> None:
    command.upgrade(_config(connection), revision)


def _downgrade(connection, revision: str) -> None:
    command.downgrade(_config(connection), revision)


def test_test_database_is_at_the_single_taxonomy_head() -> None:
    inspector = inspect(engine)
    assert EXPECTED_TABLES.issubset(set(inspector.get_table_names()))
    with engine.connect() as conn:
        revision = conn.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    assert revision == HEAD_REVISION


def test_additive_upgrade_and_empty_rollback_preserve_existing_shop_records(tmp_path) -> None:
    database_path = tmp_path / "taxonomy-migration.db"
    isolated_engine = create_engine(f"sqlite:///{database_path.as_posix()}")
    try:
        with isolated_engine.begin() as conn:
            _upgrade(conn, PREVIOUS_REVISION)
            conn.execute(
                text(
                    """
                    INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                    VALUES (1, 'migration@example.invalid', 'hashed', 'admin', 'GMFN-U-MIGRATION')
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO clans (id, name, marketplace_name, invite_code)
                    VALUES (1, 'Migration Community', 'Migration Market', 'MIGRATION')
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_shops (
                        id, clan_id, owner_user_id, shop_name, description, is_active
                    ) VALUES (1, 1, 1, 'Existing Shop', 'Must survive', 1)
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        visibility_mode, is_active
                    ) VALUES (
                        1, 1, 1, 1, 'Existing offer', 'Must survive',
                        'community_visible', 1
                    )
                    """
                )
            )

        with isolated_engine.begin() as conn:
            _upgrade(conn, HEAD_REVISION)

        inspector = inspect(isolated_engine)
        assert EXPECTED_TABLES.issubset(set(inspector.get_table_names()))
        with isolated_engine.connect() as conn:
            assert conn.execute(text("SELECT shop_name FROM marketplace_shops WHERE id = 1")).scalar_one() == "Existing Shop"
            assert conn.execute(text("SELECT title FROM marketplace_products WHERE id = 1")).scalar_one() == "Existing offer"
            assert conn.execute(text("SELECT COUNT(*) FROM commerce_taxonomy_releases")).scalar_one() == 0

        with isolated_engine.begin() as conn:
            _downgrade(conn, PREVIOUS_REVISION)

        inspector = inspect(isolated_engine)
        assert EXPECTED_TABLES.isdisjoint(set(inspector.get_table_names()))
        with isolated_engine.connect() as conn:
            assert conn.execute(text("SELECT shop_name FROM marketplace_shops WHERE id = 1")).scalar_one() == "Existing Shop"
            assert conn.execute(text("SELECT title FROM marketplace_products WHERE id = 1")).scalar_one() == "Existing offer"
    finally:
        isolated_engine.dispose()


def test_downgrade_refuses_to_destroy_taxonomy_data(tmp_path) -> None:
    database_path = tmp_path / "taxonomy-rollback-guard.db"
    isolated_engine = create_engine(f"sqlite:///{database_path.as_posix()}")
    try:
        with isolated_engine.begin() as conn:
            _upgrade(conn, HEAD_REVISION)
            conn.execute(
                text(
                    """
                    INSERT INTO users (id, email, hashed_password, role)
                    VALUES (1, 'rollback@example.invalid', 'hashed', 'admin')
                    """
                )
            )
            conn.execute(
                text(
                    """
                    INSERT INTO commerce_taxonomy_releases (
                        id, public_id, version_number, status, languages_json,
                        steward_user_id, backup_steward_name, safety_reviewer_name
                    ) VALUES (
                        1, 'GSN-TAX-R-ROLLBACK', 1, 'draft', '["en","en-NG"]',
                        1, 'Backup', 'Reviewer'
                    )
                    """
                )
            )

        with pytest.raises(RuntimeError, match="Unsafe commerce taxonomy rollback refused"):
            with isolated_engine.begin() as conn:
                _downgrade(conn, PREVIOUS_REVISION)

        assert EXPECTED_TABLES.issubset(set(inspect(isolated_engine).get_table_names()))
    finally:
        isolated_engine.dispose()
