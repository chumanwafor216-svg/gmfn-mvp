from __future__ import annotations

import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
from typing import Any

import psycopg
from psycopg import sql
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.pool import NullPool


DATABASE_PREFIX = "gsn_gate3_rehearsal_"
TAXONOMY_TABLES = {
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
REPRESENTATIVE_RUNTIME_READS = {
    "clan_memberships",
    "clans",
    "community_member_verifications",
    "community_domains",
    "feature_entitlements",
    "marketplace_broadcasts",
    "marketplace_product_reposts",
    "marketplace_products",
    "marketplace_relay_consent_events",
    "marketplace_relay_policies",
    "marketplace_requests",
    "marketplace_reviews",
    "marketplace_shops",
    "notifications",
    "opportunity_relay_offers",
    "opportunity_relay_runs",
    "shop_diary_entries",
    "shop_followers",
    "spotlight_campaign_pacing_states",
    "spotlight_campaigns",
    "spotlight_content_versions",
    "spotlight_exposure_events",
    "spotlight_presentation_leases",
    "trust_events",
    "trust_slips",
    "user_settings",
    "users",
}
REPRESENTATIVE_RUNTIME_WRITES = {
    "users": {"UPDATE"},
    "marketplace_shops": {"UPDATE"},
    "shop_diary_entries": {"INSERT"},
    "trust_events": {"INSERT"},
    "marketplace_requests": {"INSERT", "UPDATE"},
    "notifications": {"INSERT"},
}


def _driver_url(url: URL, *, username: str, password: str) -> str:
    return url.set(
        drivername="postgresql+psycopg",
        username=username,
        password=password,
    ).render_as_string(hide_password=False)


def _psycopg_dsn(url: URL) -> str:
    return url.set(drivername="postgresql").render_as_string(hide_password=False)


def _engine(url: str):
    return create_engine(url, poolclass=NullPool)


def _isolated_child_env(database_url: str, *, mode: str, artifact_dir: Path) -> dict[str, str]:
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
            "SECRET_KEY": "gate3-disposable-synthetic-secret",
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
            "GSN_GATE3_PROCESS_MODE": mode,
            "GMFN_UPLOADS_DIR": str(artifact_dir / "uploads"),
            "PYTHONIOENCODING": "utf-8",
        }
    )
    return environment


def _run_isolated(
    database_url: str,
    *,
    mode: str,
    artifact_dir: Path,
    release_public_id: str | None = None,
) -> subprocess.CompletedProcess[str]:
    backend_root = Path(__file__).resolve().parents[1]
    command = [
        sys.executable,
        str(backend_root / "tools" / "gate3_isolated_process.py"),
        mode,
    ]
    if release_public_id:
        command.extend(["--release-public-id", release_public_id])
    completed = subprocess.run(
        command,
        cwd=backend_root,
        env=_isolated_child_env(database_url, mode=mode, artifact_dir=artifact_dir),
        text=True,
        capture_output=True,
        check=False,
        timeout=180,
    )
    print(completed.stdout)
    if completed.stderr:
        print(completed.stderr)
    return completed


def _create_roles(admin_url: URL, database_name: str) -> dict[str, str]:
    passwords = {
        "gsn_runtime": secrets.token_urlsafe(24),
        "gsn_migrator": secrets.token_urlsafe(24),
        "gsn_taxonomy_authority": secrets.token_urlsafe(24),
    }
    with psycopg.connect(_psycopg_dsn(admin_url), autocommit=True) as connection:
        connection.execute("CREATE ROLE gsn_taxonomy_owner NOLOGIN NOINHERIT")
        for role_name, password in passwords.items():
            connection.execute(
                sql.SQL(
                    "CREATE ROLE {} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE "
                    "NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD {}"
                ).format(sql.Identifier(role_name), sql.Literal(password))
            )
        connection.execute("GRANT gsn_taxonomy_owner TO gsn_migrator")
        connection.execute(
            sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(
                sql.Identifier(database_name)
            )
        )
        for role_name in passwords:
            connection.execute(
                sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                    sql.Identifier(database_name), sql.Identifier(role_name)
                )
            )
        connection.execute(
            sql.SQL("GRANT CREATE, TEMPORARY ON DATABASE {} TO gsn_migrator").format(
                sql.Identifier(database_name)
            )
        )
        connection.execute(
            sql.SQL("GRANT CREATE ON DATABASE {} TO gsn_taxonomy_owner").format(
                sql.Identifier(database_name)
            )
        )
        connection.execute("ALTER SCHEMA public OWNER TO gsn_migrator")
        connection.execute("GRANT USAGE, CREATE ON SCHEMA public TO gsn_migrator")
        connection.execute(
            "GRANT USAGE ON SCHEMA public TO gsn_runtime, gsn_taxonomy_authority"
        )
    return passwords


def _apply_rehearsal_runtime_grants(migrator_url: str) -> list[str]:
    engine = _engine(migrator_url)
    try:
        with engine.begin() as connection:
            table_names = [
                str(row[0])
                for row in connection.execute(
                    text(
                        """
                        SELECT tablename
                        FROM pg_tables
                        WHERE schemaname = 'public'
                          AND tablename <> 'alembic_version'
                        ORDER BY tablename
                        """
                    )
                ).all()
            ]
            missing_reads = REPRESENTATIVE_RUNTIME_READS.difference(table_names)
            if missing_reads:
                raise RuntimeError(
                    f"Representative runtime tables are missing: {sorted(missing_reads)}"
                )
            for table_name in sorted(REPRESENTATIVE_RUNTIME_READS):
                connection.execute(
                    text(f'GRANT SELECT ON TABLE public."{table_name}" TO gsn_runtime')
                )
            for table_name, privileges in REPRESENTATIVE_RUNTIME_WRITES.items():
                permission_list = ", ".join(sorted(privileges))
                connection.execute(
                    text(
                        f'GRANT {permission_list} ON TABLE public."{table_name}" TO gsn_runtime'
                    )
                )
                sequence_name = connection.execute(
                    text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
                    {"table_name": f"public.{table_name}"},
                ).scalar_one_or_none()
                if "INSERT" in privileges and sequence_name:
                    connection.execute(
                        text(f"GRANT USAGE, SELECT ON SEQUENCE {sequence_name} TO gsn_runtime")
                    )
            connection.execute(
                text("REVOKE CREATE ON SCHEMA public FROM gsn_runtime")
            )
            return table_names
    finally:
        engine.dispose()


def _seed_synthetic_application_data(migrator_url: str) -> None:
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
                        1, 'gate3-owner@example.test', :hashed_password,
                        'Gate Three Owner', 'admin', 'GMFN-U-GATE3',
                        'standard', 0, 50, now()
                    )
                    """
                ),
                {"hashed_password": get_password_hash("Gate3-pass-123")},
            )
            connection.execute(
                text(
                    """
                    INSERT INTO clans (
                        id, name, marketplace_name, community_code, invite_code,
                        created_by_user_id, status, invite_uses,
                        notice_posting_policy, voting_admin_override, created_at
                    ) VALUES (
                        1, 'Gate 3 Community', 'Gate 3 Marketplace',
                        'GMFN-C-GATE3', 'GATE3INVITE', 1, 'active', 0,
                        'members', false, now()
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO clan_memberships (
                        id, clan_id, user_id, role, personal_pool_balance, created_at
                    ) VALUES (1, 1, 1, 'admin', 0, now())
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO user_settings (
                        id, user_id, show_phone_public, show_whatsapp_public,
                        show_telegram_public, show_shop_public
                    ) VALUES (1, 1, false, true, false, true)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO marketplace_shops (
                        id, clan_id, owner_user_id, shop_name, description,
                        whatsapp_number, is_active, created_at
                    ) VALUES (
                        1, 1, 1, 'Gate 3 Appliance Services',
                        'Synthetic restricted-runtime shop', '+2348000000000',
                        true, now()
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, visibility_mode, is_active, created_at
                    ) VALUES (
                        1, 1, 1, 1, 'Refrigerator repair',
                        'Synthetic Gate 3 service', '25000', 'NGN',
                        'community_visible', true, now()
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO marketplace_broadcasts (
                        id, publication_key, serving_status, content_version,
                        clan_id, author_user_id, shop_id, message, priority_mode,
                        visibility_scope, expires_at, authorized_expires_at, created_at
                    ) VALUES (
                        1, 'GATE3-SPOTLIGHT-001', 'serving', 1,
                        1, 1, 1, 'Synthetic Gate 3 Spotlight', 'free',
                        'direct_communities', now() + interval '1 day',
                        now() + interval '1 day', now()
                    )
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO trust_slips (
                        id, code, clan_id, holder_user_id, trust_limit, currency,
                        status, is_current, snapshot_version,
                        snapshot_visibility_level, created_at
                    ) VALUES (
                        1, 'GATE3-TRUSTSLIP-001', 1, 1, 0, 'NGN',
                        'active', true, 'v2', 'standard', now()
                    )
                    """
                )
            )
            for table_name in (
                "users", "clans", "clan_memberships", "user_settings",
                "marketplace_shops", "marketplace_products",
                "marketplace_broadcasts", "trust_slips",
            ):
                sequence_name = connection.execute(
                    text("SELECT pg_get_serial_sequence(:table_name, 'id')"),
                    {"table_name": f"public.{table_name}"},
                ).scalar_one_or_none()
                if sequence_name:
                    connection.execute(text(f"SELECT setval('{sequence_name}', 1, true)"))
    finally:
        engine.dispose()


def _insert_taxonomy_draft(runtime_url: str) -> str:
    release_public_id = "GSN-TAX-R-GATE3"
    engine = _engine(runtime_url)
    try:
        with engine.begin() as connection:
            release_id = connection.execute(
                text(
                    """
                    INSERT INTO commerce_taxonomy_releases (
                        public_id, version_number, status, languages_json,
                        steward_user_id, backup_steward_name, safety_reviewer_name
                    ) VALUES (
                        :public_id, 303, 'draft', '["en","en-NG"]',
                        1, 'Gate 3 Backup', 'Gate 3 Safety Reviewer'
                    ) RETURNING id
                    """
                ),
                {"public_id": release_public_id},
            ).scalar_one()
            concept_id = connection.execute(
                text(
                    """
                    INSERT INTO commerce_taxonomy_concepts (
                        public_id, created_by_user_id
                    ) VALUES ('GSN-TAX-C-GATE3', 1) RETURNING id
                    """
                )
            ).scalar_one()
            connection.execute(
                text(
                    """
                    INSERT INTO commerce_taxonomy_concept_versions (
                        release_id, concept_id, canonical_label, description,
                        concept_kind, sensitivity, lifecycle_status, sort_order,
                        created_by_user_id
                    ) VALUES (
                        :release_id, :concept_id, 'Refrigerator repair',
                        'Repairs household refrigerators.', 'service', 'standard',
                        'active', 10, 1
                    )
                    """
                ),
                {"release_id": release_id, "concept_id": concept_id},
            )
            for locale, term_value in (
                ("en", "Refrigerator repair"),
                ("en-NG", "Fridge repair"),
            ):
                connection.execute(
                    text(
                        """
                        INSERT INTO commerce_taxonomy_terms (
                            release_id, concept_id, locale, term, normalized_term,
                            term_kind, review_status, reviewed_by_user_id,
                            reviewed_at, created_by_user_id
                        ) VALUES (
                            :release_id, :concept_id, :locale, :term, :normalized,
                            'canonical', 'approved', 1, now(), 1
                        )
                        """
                    ),
                    {
                        "release_id": release_id,
                        "concept_id": concept_id,
                        "locale": locale,
                        "term": term_value,
                        "normalized": term_value.casefold(),
                    },
                )
        return release_public_id
    finally:
        engine.dispose()


def _inventory(admin_url: str, artifact_dir: Path) -> dict[str, Any]:
    engine = _engine(admin_url)
    try:
        with engine.connect() as connection:
            tables = [
                dict(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT n.nspname AS schema_name, c.relname AS object_name,
                               pg_get_userbyid(c.relowner) AS owner,
                               has_table_privilege('gsn_runtime', c.oid, 'SELECT') AS runtime_select,
                               has_table_privilege('gsn_runtime', c.oid, 'INSERT') AS runtime_insert,
                               has_table_privilege('gsn_runtime', c.oid, 'UPDATE') AS runtime_update,
                               has_table_privilege('gsn_runtime', c.oid, 'DELETE') AS runtime_delete
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
                        ORDER BY c.relname
                        """
                    )
                ).mappings()
            ]
            sequences = [
                dict(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT n.nspname AS schema_name, c.relname AS object_name,
                               pg_get_userbyid(c.relowner) AS owner,
                               has_sequence_privilege('gsn_runtime', c.oid, 'USAGE') AS runtime_usage,
                               has_sequence_privilege('gsn_runtime', c.oid, 'SELECT') AS runtime_select,
                               has_sequence_privilege('gsn_runtime', c.oid, 'UPDATE') AS runtime_update
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public' AND c.relkind = 'S'
                        ORDER BY c.relname
                        """
                    )
                ).mappings()
            ]
            functions = [
                dict(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT n.nspname AS schema_name, p.proname AS object_name,
                               pg_get_function_identity_arguments(p.oid) AS arguments,
                               pg_get_userbyid(p.proowner) AS owner,
                               p.prosecdef AS security_definer,
                               has_function_privilege(
                                   'gsn_runtime', p.oid, 'EXECUTE'
                               ) AS runtime_execute,
                               has_function_privilege(
                                   'gsn_taxonomy_authority', p.oid, 'EXECUTE'
                               ) AS authority_execute
                        FROM pg_proc p
                        JOIN pg_namespace n ON n.oid = p.pronamespace
                        WHERE n.nspname IN ('public', 'gsn_taxonomy_authority')
                        ORDER BY n.nspname, p.proname,
                                 pg_get_function_identity_arguments(p.oid)
                        """
                    )
                ).mappings()
            ]
            schemas = [
                dict(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT nspname AS schema_name,
                               pg_get_userbyid(nspowner) AS owner,
                               has_schema_privilege('gsn_runtime', oid, 'USAGE') AS runtime_usage,
                               has_schema_privilege('gsn_runtime', oid, 'CREATE') AS runtime_create,
                               has_schema_privilege(
                                   'gsn_taxonomy_authority', oid, 'USAGE'
                               ) AS authority_usage
                        FROM pg_namespace
                        WHERE nspname IN ('public', 'gsn_taxonomy_authority')
                        ORDER BY nspname
                        """
                    )
                ).mappings()
            ]
            roles = [
                dict(row)
                for row in connection.execute(
                    text(
                        """
                        SELECT rolname, rolcanlogin, rolsuper, rolcreatedb,
                               rolcreaterole, rolinherit, rolbypassrls
                        FROM pg_roles
                        WHERE rolname IN (
                            'gsn_runtime', 'gsn_migrator',
                            'gsn_taxonomy_authority', 'gsn_taxonomy_owner'
                        )
                        ORDER BY rolname
                        """
                    )
                ).mappings()
            ]
        payload = {
            "roles": roles,
            "schemas": schemas,
            "tables": tables,
            "sequences": sequences,
            "functions": functions,
            "runtime_write_contract": {
                key: sorted(value)
                for key, value in sorted(REPRESENTATIVE_RUNTIME_WRITES.items())
            },
            "runtime_read_contract": sorted(REPRESENTATIVE_RUNTIME_READS),
            "taxonomy_tables": sorted(TAXONOMY_TABLES),
        }
        artifact_dir.mkdir(parents=True, exist_ok=True)
        inventory_path = artifact_dir / "gate3_privilege_inventory.json"
        inventory_path.write_text(
            json.dumps(payload, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        print(
            "PRIVILEGE_INVENTORY "
            f"path={inventory_path} tables={len(tables)} "
            f"sequences={len(sequences)} functions={len(functions)}"
        )
        return payload
    finally:
        engine.dispose()


def _verify_runtime_cannot_escalate(runtime_url: str) -> None:
    engine = _engine(runtime_url)
    try:
        prohibited = (
            "SET ROLE gsn_migrator",
            "SET ROLE gsn_taxonomy_owner",
            "CREATE ROLE gate3_runtime_escape",
            "ALTER TABLE commerce_taxonomy_releases DISABLE TRIGGER ALL",
        )
        for statement in prohibited:
            with pytest.raises(DBAPIError):
                with engine.begin() as connection:
                    connection.execute(text(statement))
        with pytest.raises(DBAPIError):
            with engine.begin() as connection:
                connection.execute(
                    text(
                        """
                        SELECT *
                        FROM gsn_taxonomy_authority.publish_release_v1(
                            'GSN-TAX-R-GATE3', 1
                        )
                        """
                    )
                )
    finally:
        engine.dispose()


def _verify_failed_migration_blocks_start(
    admin_url: URL,
    *,
    migrator_password: str,
    artifact_dir: Path,
) -> None:
    blocked_database = f"{DATABASE_PREFIX}blocked_{secrets.token_hex(4)}"
    maintenance_url = admin_url.set(database="postgres")
    with psycopg.connect(_psycopg_dsn(maintenance_url), autocommit=True) as connection:
        connection.execute(
            sql.SQL("CREATE DATABASE {}").format(sql.Identifier(blocked_database))
        )
        connection.execute(
            sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(
                sql.Identifier(blocked_database)
            )
        )
        connection.execute(
            sql.SQL("GRANT CONNECT ON DATABASE {} TO gsn_migrator").format(
                sql.Identifier(blocked_database)
            )
        )
    blocked_url = _driver_url(
        admin_url.set(database=blocked_database),
        username="gsn_migrator",
        password=migrator_password,
    )
    migration = _run_isolated(
        blocked_url, mode="migrate", artifact_dir=artifact_dir
    )
    assert migration.returncode != 0
    assert "permission denied" in (migration.stderr + migration.stdout).lower()
    api_started = migration.returncode == 0
    assert api_started is False
    print(
        "DEPLOYMENT_FAILURE_GATE migration_exit="
        f"{migration.returncode} api_started={str(api_started).lower()}"
    )


def test_gate3_restricted_runtime_deployment_rehearsal() -> None:
    raw_admin_url = str(os.getenv("GSN_GATE3_ADMIN_URL", "") or "").strip()
    if not raw_admin_url:
        pytest.skip("GSN_GATE3_ADMIN_URL is required for the disposable Gate 3 rehearsal")
    admin_url = make_url(raw_admin_url)
    if admin_url.get_backend_name() != "postgresql":
        raise RuntimeError("Gate 3 requires PostgreSQL")
    if str(admin_url.host or "").lower() not in {"127.0.0.1", "localhost"}:
        raise RuntimeError("Gate 3 refuses non-local PostgreSQL")
    database_name = str(admin_url.database or "")
    if not database_name.startswith(DATABASE_PREFIX):
        raise RuntimeError("Gate 3 refuses a database without the disposable prefix")

    artifact_dir = Path(
        str(os.getenv("GSN_GATE3_ARTIFACT_DIR", "") or "").strip()
        or (Path.cwd() / ".gate3-artifacts")
    ).resolve()
    passwords = _create_roles(admin_url, database_name)
    migrator_url = _driver_url(
        admin_url,
        username="gsn_migrator",
        password=passwords["gsn_migrator"],
    )
    runtime_url = _driver_url(
        admin_url,
        username="gsn_runtime",
        password=passwords["gsn_runtime"],
    )
    authority_url = _driver_url(
        admin_url,
        username="gsn_taxonomy_authority",
        password=passwords["gsn_taxonomy_authority"],
    )

    migration = _run_isolated(
        migrator_url, mode="migrate", artifact_dir=artifact_dir
    )
    assert migration.returncode == 0, migration.stderr
    table_names = _apply_rehearsal_runtime_grants(migrator_url)
    assert "users" in table_names
    assert TAXONOMY_TABLES.issubset(set(table_names))
    _seed_synthetic_application_data(migrator_url)
    release_public_id = _insert_taxonomy_draft(runtime_url)

    inventory = _inventory(raw_admin_url, artifact_dir)
    assert len(inventory["tables"]) >= 100
    runtime_readable_non_taxonomy = {
        row["object_name"]
        for row in inventory["tables"]
        if row["runtime_select"]
        and row["object_name"] not in TAXONOMY_TABLES
        and row["object_name"] != "alembic_version"
    }
    assert runtime_readable_non_taxonomy == REPRESENTATIVE_RUNTIME_READS
    assert all(role["rolsuper"] is False for role in inventory["roles"])
    assert all(role["rolcreaterole"] is False for role in inventory["roles"])
    owner = next(
        role for role in inventory["roles"]
        if role["rolname"] == "gsn_taxonomy_owner"
    )
    assert owner["rolcanlogin"] is False
    public_schema = next(
        schema for schema in inventory["schemas"]
        if schema["schema_name"] == "public"
    )
    assert public_schema["runtime_usage"] is True
    assert public_schema["runtime_create"] is False

    runtime = _run_isolated(
        runtime_url, mode="runtime", artifact_dir=artifact_dir
    )
    assert runtime.returncode == 0, runtime.stderr
    assert "current_user=gsn_runtime" in runtime.stdout
    assert "RUNTIME_REHEARSAL_COMPLETE" in runtime.stdout

    _verify_runtime_cannot_escalate(runtime_url)
    authority = _run_isolated(
        authority_url,
        mode="authority",
        artifact_dir=artifact_dir,
        release_public_id=release_public_id,
    )
    assert authority.returncode == 0, authority.stderr
    assert "current_user=gsn_taxonomy_authority" in authority.stdout
    assert "status=withdrawn" in authority.stdout

    _verify_failed_migration_blocks_start(
        admin_url,
        migrator_password=passwords["gsn_migrator"],
        artifact_dir=artifact_dir,
    )

    admin_engine = _engine(raw_admin_url)
    try:
        with admin_engine.connect() as connection:
            version = connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one()
            assert version == "20261102_taxonomy_authority"
            taxonomy_owners = {
                row.owner
                for row in connection.execute(
                    text(
                        """
                        SELECT pg_get_userbyid(c.relowner) AS owner
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public'
                          AND c.relname = ANY(:table_names)
                        """
                    ),
                    {"table_names": sorted(TAXONOMY_TABLES)},
                ).all()
            }
            assert taxonomy_owners == {"gsn_taxonomy_owner"}
    finally:
        admin_engine.dispose()
