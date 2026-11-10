from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Any

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.pool import NullPool

from gate3.test_deployment_rehearsal import (
    DATABASE_PREFIX as GATE3_DATABASE_PREFIX,
    TAXONOMY_TABLES,
    _create_roles,
    _driver_url,
    _engine,
    _insert_taxonomy_draft,
    _inventory,
    _run_isolated as _run_gate3_isolated,
    _seed_synthetic_application_data,
    _verify_runtime_cannot_escalate,
)


DATABASE_PREFIX = "gsn_gate4_coverage_"
TABLE_PRIVILEGES = {"SELECT", "INSERT", "UPDATE", "DELETE"}


def _load_contract() -> dict[str, Any]:
    raw = str(os.getenv("GSN_GATE4_CONTRACT_PATH", "") or "").strip()
    if not raw:
        raise RuntimeError("GSN_GATE4_CONTRACT_PATH is required")
    return json.loads(Path(raw).resolve().read_text(encoding="utf-8"))


def _apply_runtime_contract(migrator_url: str, contract: dict[str, Any]) -> dict[str, set[str]]:
    expected: dict[str, set[str]] = {}
    engine = _engine(migrator_url)
    try:
        with engine.begin() as connection:
            existing_tables = {
                str(row[0])
                for row in connection.execute(
                    text(
                        "SELECT tablename FROM pg_tables "
                        "WHERE schemaname = 'public' AND tablename <> 'alembic_version'"
                    )
                )
            }
            for table_name, row in contract["runtime"]["tables"].items():
                if table_name not in existing_tables:
                    raise RuntimeError(f"Contract table is missing after migration: {table_name}")
                privileges = set(row["privileges"]).intersection(TABLE_PRIVILEGES)
                expected[table_name] = privileges
                if table_name in TAXONOMY_TABLES:
                    continue
                if privileges:
                    connection.execute(
                        text(
                            f'GRANT {", ".join(sorted(privileges))} '
                            f'ON TABLE public."{table_name}" TO gsn_runtime'
                        )
                    )
                if "INSERT" in privileges:
                    sequence_name = connection.execute(
                        text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
                        {"table_name": f"public.{table_name}"},
                    ).scalar_one_or_none()
                    if sequence_name:
                        connection.execute(
                            text(
                                f"GRANT USAGE, SELECT ON SEQUENCE {sequence_name} "
                                "TO gsn_runtime"
                            )
                        )
            connection.execute(text("REVOKE CREATE ON SCHEMA public FROM gsn_runtime"))
    finally:
        engine.dispose()
    return expected


def _seed_gate4_member(migrator_url: str) -> None:
    from app.core.security import get_password_hash

    engine = _engine(migrator_url)
    try:
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, display_name, role, gmfn_id,
                        merchant_visibility_level, personal_pool_balance,
                        trust_score, created_at
                    ) VALUES (
                        2, 'gate4-member@example.test', :hashed_password,
                        'Gate Four Member', 'user', 'GMFN-U-GATE4-MEMBER',
                        'standard', 0, 0, now()
                    )
                    """
                ),
                {"hashed_password": get_password_hash("Gate4-member-pass-123")},
            )
            connection.execute(text("SELECT setval('users_id_seq', 2, true)"))
    finally:
        engine.dispose()


def _child_env(database_url: str, artifact_dir: Path) -> dict[str, str]:
    keep = {
        "ALLUSERSPROFILE", "APPDATA", "COMSPEC", "HOMEDRIVE", "HOMEPATH",
        "LOCALAPPDATA", "NUMBER_OF_PROCESSORS", "OS", "PATH", "PATHEXT",
        "PROCESSOR_ARCHITECTURE", "PROGRAMDATA", "PROGRAMFILES",
        "PROGRAMFILES(X86)", "SYSTEMDRIVE", "SYSTEMROOT", "TEMP", "TMP",
        "USERDOMAIN", "USERNAME", "USERPROFILE", "WINDIR",
    }
    environment = {key: value for key, value in os.environ.items() if key.upper() in keep}
    environment.update(
        {
            "DATABASE_URL": database_url,
            "SECRET_KEY": "gate4-disposable-synthetic-secret",
            "GMFN_DEV_MODE": "false",
            "GMFN_AUTO_CREATE_SCHEMA": "false",
            "GMFN_ENABLE_RECONCILIATION_LOOP": "false",
            "GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP": "false",
            "GSN_RUNTIME_MEMORY_LOGGING": "false",
            "GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED": "false",
            "GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED": "false",
            "GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED": "false",
            "GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED": "false",
            "GSN_TRUSTSLIP_V1_SNAPSHOT_WRITES_ENABLED": "false",
            "GMFN_UPLOADS_DIR": str(artifact_dir / "uploads"),
            "PYTHONIOENCODING": "utf-8",
        }
    )
    return environment


def _run_gate4_isolated(
    runtime_url: str,
    *,
    mode: str,
    artifact_dir: Path,
) -> subprocess.CompletedProcess[str]:
    backend_root = Path(__file__).resolve().parents[1]
    completed = subprocess.run(
        [sys.executable, str(backend_root / "tools" / "gate4_isolated_process.py"), mode],
        cwd=backend_root,
        env=_child_env(runtime_url, artifact_dir),
        text=True,
        capture_output=True,
        check=False,
        timeout=240,
    )
    print(completed.stdout)
    if completed.stderr:
        print(completed.stderr)
    return completed


def _verify_contract_grants(
    admin_url: str,
    expected: dict[str, set[str]],
) -> None:
    engine = create_engine(admin_url, poolclass=NullPool)
    try:
        with engine.connect() as connection:
            all_tables = {
                str(row[0])
                for row in connection.execute(
                    text(
                        "SELECT tablename FROM pg_tables "
                        "WHERE schemaname = 'public' AND tablename <> 'alembic_version'"
                    )
                )
            }
            for table_name, privileges in expected.items():
                for privilege in TABLE_PRIVILEGES:
                    granted = bool(
                        connection.execute(
                            text("SELECT has_table_privilege('gsn_runtime', :table, :privilege)"),
                            {"table": f"public.{table_name}", "privilege": privilege},
                        ).scalar_one()
                    )
                    assert granted is (privilege in privileges), (
                        table_name,
                        privilege,
                        granted,
                    )
                if "INSERT" in privileges:
                    sequence_name = connection.execute(
                        text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
                        {"table_name": f"public.{table_name}"},
                    ).scalar_one_or_none()
                    if sequence_name:
                        assert bool(
                            connection.execute(
                                text(
                                    "SELECT has_sequence_privilege("
                                    "'gsn_runtime', :sequence_name, 'USAGE')"
                                ),
                                {"sequence_name": sequence_name},
                            ).scalar_one()
                        ) is True
            for table_name in sorted(all_tables.difference(expected)):
                for privilege in TABLE_PRIVILEGES:
                    assert bool(
                        connection.execute(
                            text(
                                "SELECT has_table_privilege("
                                "'gsn_runtime', :table, :privilege)"
                            ),
                            {"table": f"public.{table_name}", "privilege": privilege},
                        ).scalar_one()
                    ) is False, (table_name, privilege)
            for column_name in (
                "languages_json",
                "backup_steward_name",
                "safety_reviewer_name",
                "updated_at",
            ):
                assert bool(
                    connection.execute(
                        text(
                            "SELECT has_column_privilege("
                            "'gsn_runtime', 'public.commerce_taxonomy_releases', "
                            ":column_name, 'UPDATE')"
                        ),
                        {"column_name": column_name},
                    ).scalar_one()
                ) is True
            assert bool(
                connection.execute(
                    text(
                        "SELECT has_column_privilege("
                        "'gsn_runtime', 'public.commerce_taxonomy_releases', "
                        "'status', 'UPDATE')"
                    )
                ).scalar_one()
            ) is False
            assert bool(
                connection.execute(
                    text("SELECT has_schema_privilege('gsn_runtime', 'public', 'CREATE')")
                ).scalar_one()
            ) is False
    finally:
        engine.dispose()


def _verify_runtime_ddl_and_authority_denials(runtime_url: str) -> None:
    engine = _engine(runtime_url)
    try:
        statements = (
            "CREATE TABLE gate4_runtime_escape(id integer)",
            "ALTER TABLE commerce_taxonomy_releases DISABLE TRIGGER ALL",
            "SET ROLE gsn_migrator",
            "SET ROLE gsn_taxonomy_owner",
            "CREATE ROLE gate4_runtime_role_escape",
        )
        for statement in statements:
            with pytest.raises(DBAPIError):
                with engine.begin() as connection:
                    connection.execute(text(statement))
        with pytest.raises(DBAPIError):
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "SELECT * FROM gsn_taxonomy_authority.publish_release_v1("
                        "'GSN-TAX-R-GATE4', 1)"
                    )
                )
    finally:
        engine.dispose()


def test_gate4_full_observed_runtime_privilege_contract() -> None:
    raw_admin_url = str(os.getenv("GSN_GATE4_ADMIN_URL", "") or "").strip()
    if not raw_admin_url:
        pytest.skip("GSN_GATE4_ADMIN_URL is required")
    admin_url = make_url(raw_admin_url)
    if admin_url.get_backend_name() != "postgresql":
        raise RuntimeError("Gate 4 requires PostgreSQL")
    if str(admin_url.host or "").lower() not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Gate 4 refuses non-local PostgreSQL")
    database_name = str(admin_url.database or "")
    if not database_name.startswith(DATABASE_PREFIX):
        raise RuntimeError("Gate 4 refuses a database without its disposable prefix")

    contract = _load_contract()
    assert contract["contract_version"] == "gate4a-observed-v1"
    artifact_dir = Path(
        str(os.getenv("GSN_GATE4_ARTIFACT_DIR", "") or "").strip()
        or (Path.cwd() / ".gate4-artifacts")
    ).resolve()
    passwords = _create_roles(admin_url, database_name)
    migrator_url = _driver_url(
        admin_url, username="gsn_migrator", password=passwords["gsn_migrator"]
    )
    runtime_url = _driver_url(
        admin_url, username="gsn_runtime", password=passwords["gsn_runtime"]
    )

    migration = _run_gate3_isolated(
        migrator_url, mode="migrate", artifact_dir=artifact_dir
    )
    assert migration.returncode == 0, migration.stderr
    expected = _apply_runtime_contract(migrator_url, contract)
    _seed_synthetic_application_data(migrator_url)
    _seed_gate4_member(migrator_url)
    release_public_id = _insert_taxonomy_draft(runtime_url)
    assert release_public_id == "GSN-TAX-R-GATE3"

    _verify_contract_grants(raw_admin_url, expected)
    gate3_runtime = _run_gate3_isolated(
        runtime_url, mode="runtime", artifact_dir=artifact_dir
    )
    assert gate3_runtime.returncode == 0, gate3_runtime.stderr

    security = _run_gate4_isolated(
        runtime_url, mode="security", artifact_dir=artifact_dir
    )
    assert security.returncode == 0, security.stderr
    background = _run_gate4_isolated(
        runtime_url, mode="background", artifact_dir=artifact_dir
    )
    assert background.returncode == 0, background.stderr

    _verify_runtime_cannot_escalate(runtime_url)
    _verify_runtime_ddl_and_authority_denials(runtime_url)
    inventory = _inventory(raw_admin_url, artifact_dir)
    assert all(role["rolsuper"] is False for role in inventory["roles"])
    assert all(role["rolcreaterole"] is False for role in inventory["roles"])
    print(
        "GATE4_COVERAGE_COMPLETE "
        f"contract_tables={len(expected)} "
        f"database_routes={contract['evidence_boundary']['database_routes']} "
        f"called_routes={contract['evidence_boundary']['called_database_routes']} "
        f"sql_traced_routes={contract['evidence_boundary']['sql_traced_database_routes']}"
    )
