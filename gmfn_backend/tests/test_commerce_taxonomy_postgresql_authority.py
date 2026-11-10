from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import secrets

import psycopg
from psycopg import sql
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.pool import NullPool

from app.services.commerce_taxonomy_checksum import (
    canonical_release_document,
    checksum_release_payload,
)
from app.services.commerce_taxonomy_service import (
    admin_api_enabled,
    owner_api_enabled,
    publication_enabled,
)


PREVIOUS_REVISION = '20261030_market_dir_scale'
FOUNDATION_REVISION = '20261102_commerce_taxonomy'
AUTHORITY_REVISION = '20261102_taxonomy_authority'
DISPOSABLE_DATABASE_PREFIX = 'gsn_taxonomy_authority_proof_'


@dataclass(frozen=True)
class ProofDatabase:
    admin_url: str
    migrator_url: str
    runtime_url: str
    authority_url: str
    database_name: str
    preserved_shop_name: str
    preserved_product_name: str


def _driver_url(url: URL, *, username: str, password: str) -> str:
    return url.set(
        drivername='postgresql+psycopg',
        username=username,
        password=password,
    ).render_as_string(hide_password=False)


def _psycopg_dsn(url: URL) -> str:
    return url.set(drivername='postgresql').render_as_string(hide_password=False)


def _alembic_config(connection) -> Config:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / 'alembic.ini'))
    config.set_main_option('script_location', str(backend_root / 'alembic'))
    config.attributes['connection'] = connection
    return config


def _upgrade(connection, revision: str) -> None:
    command.upgrade(_alembic_config(connection), revision)


def _engine(url: str):
    return create_engine(url, poolclass=NullPool)


def _assert_role(connection, expected: str) -> None:
    row = connection.execute(
        text('SELECT current_user, session_user, current_database()')
    ).one()
    assert row.current_user == expected
    assert row.session_user == expected
    print(f'ROLE_EVIDENCE test={os.environ.get("PYTEST_CURRENT_TEST", "unknown")} role={expected} db={row.current_database}')


def _create_roles(admin_url: URL, database_name: str) -> dict[str, str]:
    passwords = {
        'gsn_migrator': secrets.token_urlsafe(24),
        'gsn_runtime': secrets.token_urlsafe(24),
        'gsn_taxonomy_authority': secrets.token_urlsafe(24),
    }
    with psycopg.connect(_psycopg_dsn(admin_url), autocommit=True) as connection:
        existing = connection.execute(
            """
            SELECT rolname FROM pg_roles
            WHERE rolname IN (
                'gsn_runtime', 'gsn_migrator',
                'gsn_taxonomy_authority', 'gsn_taxonomy_owner'
            )
            """
        ).fetchall()
        assert existing == []
        connection.execute('CREATE ROLE gsn_taxonomy_owner NOLOGIN NOINHERIT')
        for role_name, password in passwords.items():
            connection.execute(
                sql.SQL(
                    'CREATE ROLE {} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD {}'
                ).format(sql.Identifier(role_name), sql.Literal(password))
            )
        connection.execute('GRANT gsn_taxonomy_owner TO gsn_migrator')
        for role_name in passwords:
            connection.execute(
                sql.SQL('GRANT CONNECT ON DATABASE {} TO {}').format(
                    sql.Identifier(database_name),
                    sql.Identifier(role_name),
                )
            )
        connection.execute(
            sql.SQL('GRANT CREATE, TEMPORARY ON DATABASE {} TO gsn_migrator').format(
                sql.Identifier(database_name)
            )
        )
        connection.execute(
            sql.SQL('GRANT CREATE ON DATABASE {} TO gsn_taxonomy_owner').format(
                sql.Identifier(database_name)
            )
        )
        connection.execute('ALTER SCHEMA public OWNER TO gsn_migrator')
        connection.execute('GRANT USAGE, CREATE ON SCHEMA public TO gsn_migrator')
        connection.execute('GRANT USAGE ON SCHEMA public TO gsn_runtime, gsn_taxonomy_authority')
    return passwords


def _seed_existing_records(migrator_url: str) -> tuple[str, str]:
    engine = _engine(migrator_url)
    try:
        with engine.begin() as connection:
            _assert_role(connection, 'gsn_migrator')
            connection.execute(
                text(
                    """
                    INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                    VALUES (1, 'authority-proof@example.invalid', 'synthetic', 'admin', 'GMFN-U-AUTH-PROOF')
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO clans (id, name, marketplace_name, invite_code)
                    VALUES (1, 'Authority Proof Community', 'Authority Proof Market', 'AUTH-PROOF')
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO marketplace_shops (
                        id, clan_id, owner_user_id, shop_name, description, is_active
                    ) VALUES (1, 1, 1, 'Preserved Synthetic Shop', 'Before taxonomy', true)
                    """
                )
            )
            connection.execute(
                text(
                    """
                    INSERT INTO marketplace_products (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        visibility_mode, is_active
                    ) VALUES (
                        1, 1, 1, 1, 'Preserved Synthetic Product', 'Before taxonomy',
                        'community_visible', true
                    )
                    """
                )
            )
        return 'Preserved Synthetic Shop', 'Preserved Synthetic Product'
    finally:
        engine.dispose()


@pytest.fixture(scope='session')
def proof_database() -> ProofDatabase:
    raw_admin_url = os.environ.get('GSN_TAXONOMY_AUTHORITY_PROOF_ADMIN_URL', '').strip()
    if not raw_admin_url:
        pytest.skip('Disposable PostgreSQL authority proof URL is not configured')
    admin_url = make_url(raw_admin_url)
    if admin_url.get_backend_name() != 'postgresql':
        raise AssertionError('Authority proof requires PostgreSQL')
    if admin_url.host not in {'127.0.0.1', 'localhost', '::1'}:
        raise AssertionError('Authority proof refuses non-local PostgreSQL hosts')
    database_name = str(admin_url.database or '')
    if not database_name.startswith(DISPOSABLE_DATABASE_PREFIX):
        raise AssertionError('Authority proof refuses a database without the disposable proof prefix')

    passwords = _create_roles(admin_url, database_name)
    migrator_url = _driver_url(admin_url, username='gsn_migrator', password=passwords['gsn_migrator'])
    runtime_url = _driver_url(admin_url, username='gsn_runtime', password=passwords['gsn_runtime'])
    authority_url = _driver_url(
        admin_url,
        username='gsn_taxonomy_authority',
        password=passwords['gsn_taxonomy_authority'],
    )
    migrator_engine = _engine(migrator_url)
    try:
        with migrator_engine.begin() as connection:
            _assert_role(connection, 'gsn_migrator')
            _upgrade(connection, PREVIOUS_REVISION)
        preserved_shop_name, preserved_product_name = _seed_existing_records(migrator_url)
        with migrator_engine.begin() as connection:
            _assert_role(connection, 'gsn_migrator')
            _upgrade(connection, AUTHORITY_REVISION)
            connection.execute(
                text(
                    'GRANT SELECT, UPDATE ON marketplace_shops, marketplace_products TO gsn_runtime'
                )
            )
    finally:
        migrator_engine.dispose()

    return ProofDatabase(
        admin_url=raw_admin_url,
        migrator_url=migrator_url,
        runtime_url=runtime_url,
        authority_url=authority_url,
        database_name=database_name,
        preserved_shop_name=preserved_shop_name,
        preserved_product_name=preserved_product_name,
    )


def _insert_valid_draft(proof: ProofDatabase, *, suffix: str, version_number: int) -> int:
    engine = _engine(proof.runtime_url)
    try:
        with engine.begin() as connection:
            _assert_role(connection, 'gsn_runtime')
            release_id = connection.execute(
                text(
                    """
                    INSERT INTO commerce_taxonomy_releases (
                        public_id, version_number, status, languages_json,
                        steward_user_id, backup_steward_name, safety_reviewer_name
                    ) VALUES (
                        :public_id, :version_number, 'draft', '["en","en-NG"]',
                        1, 'Backup Steward', 'Independent Reviewer'
                    ) RETURNING id
                    """
                ),
                {'public_id': f'GSN-TAX-R-{suffix}', 'version_number': version_number},
            ).scalar_one()
            concept_id = connection.execute(
                text(
                    """
                    INSERT INTO commerce_taxonomy_concepts (public_id, created_by_user_id)
                    VALUES (:public_id, 1) RETURNING id
                    """
                ),
                {'public_id': f'GSN-TAX-C-{suffix}'},
            ).scalar_one()
            connection.execute(
                text(
                    """
                    INSERT INTO commerce_taxonomy_concept_versions (
                        release_id, concept_id, canonical_label, description,
                        concept_kind, sensitivity, lifecycle_status, sort_order,
                        created_by_user_id
                    ) VALUES (
                        :release_id, :concept_id, 'Home appliance repair',
                        'Repairs household appliances.', 'service', 'standard',
                        'active', 10, 1
                    )
                    """
                ),
                {'release_id': release_id, 'concept_id': concept_id},
            )
            for locale, term_value in (
                ('en', 'Home appliance repair'),
                ('en-NG', 'Home appliance repairs'),
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
                        'release_id': release_id,
                        'concept_id': concept_id,
                        'locale': locale,
                        'term': term_value,
                        'normalized': term_value.casefold(),
                    },
                )
            return int(release_id)
    finally:
        engine.dispose()


GOLDEN_PAYLOAD = {
    'contract_version': 1,
    'release_public_id': 'GSN-TAX-R-GOLDEN',
    'version_number': 101,
    'languages': ['en', 'en-NG'],
    'concepts': [
        {
            'public_id': 'GSN-TAX-C-GOLDEN',
            'parent_public_id': None,
            'canonical_label': 'Home appliance repair',
            'description': 'Repairs household appliances.',
            'concept_kind': 'service',
            'sensitivity': 'standard',
            'credential_notice': None,
            'lifecycle_status': 'active',
            'sort_order': 10,
        }
    ],
    'terms': [
        {
            'concept_public_id': 'GSN-TAX-C-GOLDEN',
            'locale': 'en',
            'term': 'Home appliance repair',
            'normalized_term': 'home appliance repair',
            'term_kind': 'canonical',
            'review_status': 'approved',
        },
        {
            'concept_public_id': 'GSN-TAX-C-GOLDEN',
            'locale': 'en-NG',
            'term': 'Home appliance repairs',
            'normalized_term': 'home appliance repairs',
            'term_kind': 'canonical',
            'review_status': 'approved',
        },
    ],
    'redirects': [],
}

GOLDEN_DOCUMENT = """checksum_contract\t1
release_public_id\t\"GSN-TAX-R-GOLDEN\"
version_number\t101
language\t\"en\"
language\t\"en-NG\"
concept\t\"GSN-TAX-C-GOLDEN\"\tnull\t\"Home appliance repair\"\t\"Repairs household appliances.\"\t\"service\"\t\"standard\"\tnull\t\"active\"\t10
term\t\"GSN-TAX-C-GOLDEN\"\t\"en\"\t\"Home appliance repair\"\t\"home appliance repair\"\t\"canonical\"\t\"approved\"
term\t\"GSN-TAX-C-GOLDEN\"\t\"en-NG\"\t\"Home appliance repairs\"\t\"home appliance repairs\"\t\"canonical\"\t\"approved\"
"""
GOLDEN_CHECKSUM = '3b1b3a116e7238085f94637dd4c77e0564e58329bcec53b76e82158d5ff7d875'


def test_python_checksum_matches_fixed_golden_fixture() -> None:
    assert canonical_release_document(GOLDEN_PAYLOAD) == GOLDEN_DOCUMENT
    assert checksum_release_payload(GOLDEN_PAYLOAD) == GOLDEN_CHECKSUM


def test_role_contract_and_object_ownership(proof_database: ProofDatabase) -> None:
    engine = _engine(proof_database.admin_url)
    try:
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    """
                    SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole
                    FROM pg_roles
                    WHERE rolname IN (
                        'gsn_runtime', 'gsn_migrator',
                        'gsn_taxonomy_authority', 'gsn_taxonomy_owner'
                    )
                    ORDER BY rolname
                    """
                )
            ).mappings().all()
            by_name = {row['rolname']: row for row in rows}
            assert set(by_name) == {
                'gsn_runtime', 'gsn_migrator',
                'gsn_taxonomy_authority', 'gsn_taxonomy_owner',
            }
            assert by_name['gsn_taxonomy_owner']['rolcanlogin'] is False
            for role_name in ('gsn_runtime', 'gsn_migrator', 'gsn_taxonomy_authority'):
                assert by_name[role_name]['rolcanlogin'] is True
                assert by_name[role_name]['rolsuper'] is False
                assert by_name[role_name]['rolcreatedb'] is False
                assert by_name[role_name]['rolcreaterole'] is False
            owners = connection.execute(
                text(
                    """
                    SELECT DISTINCT tableowner
                    FROM pg_tables
                    WHERE schemaname = 'public'
                      AND (tablename LIKE 'commerce_taxonomy_%'
                           OR tablename LIKE 'marketplace_%_capabilit%')
                    """
                )
            ).scalars().all()
            assert owners == ['gsn_taxonomy_owner']
    finally:
        engine.dispose()


def test_runtime_cannot_publish_with_sql_or_authority_function(
    proof_database: ProofDatabase,
) -> None:
    _insert_valid_draft(proof_database, suffix='RUNTIME-DENY', version_number=102)
    runtime_engine = _engine(proof_database.runtime_url)
    try:
        with pytest.raises(DBAPIError):
            with runtime_engine.begin() as connection:
                _assert_role(connection, 'gsn_runtime')
                connection.execute(
                    text(
                        """
                        UPDATE commerce_taxonomy_releases
                        SET status = 'published'
                        WHERE public_id = 'GSN-TAX-R-RUNTIME-DENY'
                        """
                    )
                )
        with pytest.raises(DBAPIError):
            with runtime_engine.begin() as connection:
                _assert_role(connection, 'gsn_runtime')
                connection.execute(
                    text(
                        """
                        SELECT * FROM gsn_taxonomy_authority.publish_release_v1(
                            'GSN-TAX-R-RUNTIME-DENY', 1
                        )
                        """
                    )
                )
        with runtime_engine.connect() as connection:
            _assert_role(connection, 'gsn_runtime')
            status = connection.execute(
                text(
                    """
                    SELECT status FROM commerce_taxonomy_releases
                    WHERE public_id = 'GSN-TAX-R-RUNTIME-DENY'
                    """
                )
            ).scalar_one()
            assert status == 'draft'
    finally:
        runtime_engine.dispose()


def test_authorised_publication_matches_python_and_postgresql_checksums(
    proof_database: ProofDatabase,
) -> None:
    release_id = _insert_valid_draft(proof_database, suffix='GOLDEN', version_number=101)
    authority_engine = _engine(proof_database.authority_url)
    migrator_engine = _engine(proof_database.migrator_url)
    try:
        with authority_engine.begin() as connection:
            _assert_role(connection, 'gsn_taxonomy_authority')
            published = connection.execute(
                text(
                    """
                    SELECT * FROM gsn_taxonomy_authority.publish_release_v1(
                        'GSN-TAX-R-GOLDEN', 1
                    )
                    """
                )
            ).mappings().one()
            assert published['release_status'] == 'published'
            assert published['release_checksum'] == GOLDEN_CHECKSUM
        with migrator_engine.connect() as connection:
            _assert_role(connection, 'gsn_migrator')
            document, checksum = connection.execute(
                text(
                    """
                    SELECT
                        gsn_taxonomy_authority.canonical_release_document_v1(:release_id),
                        gsn_taxonomy_authority.release_checksum_v1(:release_id)
                    """
                ),
                {'release_id': release_id},
            ).one()
            assert document == GOLDEN_DOCUMENT
            assert checksum == GOLDEN_CHECKSUM
    finally:
        authority_engine.dispose()
        migrator_engine.dispose()


def test_runtime_cannot_withdraw_or_rewrite_published_history(
    proof_database: ProofDatabase,
) -> None:
    _insert_valid_draft(proof_database, suffix='WITHDRAW', version_number=103)
    authority_engine = _engine(proof_database.authority_url)
    runtime_engine = _engine(proof_database.runtime_url)
    try:
        with authority_engine.begin() as connection:
            _assert_role(connection, 'gsn_taxonomy_authority')
            checksum = connection.execute(
                text(
                    """
                    SELECT release_checksum
                    FROM gsn_taxonomy_authority.publish_release_v1(
                        'GSN-TAX-R-WITHDRAW', 1
                    )
                    """
                )
            ).scalar_one()
        with pytest.raises(DBAPIError):
            with runtime_engine.begin() as connection:
                _assert_role(connection, 'gsn_runtime')
                connection.execute(
                    text(
                        """
                        UPDATE commerce_taxonomy_releases
                        SET status = 'withdrawn', withdrawal_reason = 'bypass'
                        WHERE public_id = 'GSN-TAX-R-WITHDRAW'
                        """
                    )
                )
        with pytest.raises(DBAPIError):
            with runtime_engine.begin() as connection:
                _assert_role(connection, 'gsn_runtime')
                connection.execute(
                    text(
                        """
                        UPDATE commerce_taxonomy_concept_versions
                        SET canonical_label = 'Rewritten label'
                        WHERE release_id = (
                            SELECT id FROM commerce_taxonomy_releases
                            WHERE public_id = 'GSN-TAX-R-WITHDRAW'
                        )
                        """
                    )
                )
        with authority_engine.begin() as connection:
            _assert_role(connection, 'gsn_taxonomy_authority')
            withdrawn = connection.execute(
                text(
                    """
                    SELECT * FROM gsn_taxonomy_authority.withdraw_release_v1(
                        'GSN-TAX-R-WITHDRAW', 1, 'Synthetic defective release'
                    )
                    """
                )
            ).mappings().one()
            assert withdrawn['release_status'] == 'withdrawn'
            assert withdrawn['release_checksum'] == checksum
        with runtime_engine.connect() as connection:
            _assert_role(connection, 'gsn_runtime')
            row = connection.execute(
                text(
                    """
                    SELECT status, checksum, withdrawal_reason
                    FROM commerce_taxonomy_releases
                    WHERE public_id = 'GSN-TAX-R-WITHDRAW'
                    """
                )
            ).one()
            assert row.status == 'withdrawn'
            assert row.checksum == checksum
            assert row.withdrawal_reason == 'Synthetic defective release'
    finally:
        authority_engine.dispose()
        runtime_engine.dispose()


def test_runtime_cannot_alter_guards_functions_ownership_or_roles(
    proof_database: ProofDatabase,
) -> None:
    runtime_engine = _engine(proof_database.runtime_url)
    prohibited_statements = (
        'ALTER TABLE commerce_taxonomy_releases DISABLE TRIGGER trg_commerce_taxonomy_releases_authority_v1',
        'ALTER TABLE commerce_taxonomy_releases OWNER TO gsn_runtime',
        'SET ROLE gsn_taxonomy_owner',
        'GRANT gsn_taxonomy_owner TO gsn_runtime',
        'CREATE ROLE gsn_runtime_escalated',
        """
        CREATE OR REPLACE FUNCTION gsn_taxonomy_authority.publish_release_v1(text, integer)
        RETURNS TABLE(release_public_id text, release_status text, release_checksum text)
        LANGUAGE sql AS $$ SELECT 'x', 'published', 'bypass' $$
        """,
    )
    try:
        for statement in prohibited_statements:
            with pytest.raises(DBAPIError):
                with runtime_engine.begin() as connection:
                    _assert_role(connection, 'gsn_runtime')
                    connection.execute(text(statement))
    finally:
        runtime_engine.dispose()


def test_authority_has_function_execution_but_no_direct_table_update(
    proof_database: ProofDatabase,
) -> None:
    _insert_valid_draft(proof_database, suffix='AUTHORITY-NO-DML', version_number=104)
    authority_engine = _engine(proof_database.authority_url)
    try:
        with pytest.raises(DBAPIError):
            with authority_engine.begin() as connection:
                _assert_role(connection, 'gsn_taxonomy_authority')
                connection.execute(
                    text(
                        """
                        UPDATE commerce_taxonomy_releases
                        SET status = 'published'
                        WHERE public_id = 'GSN-TAX-R-AUTHORITY-NO-DML'
                        """
                    )
                )
        with authority_engine.begin() as connection:
            _assert_role(connection, 'gsn_taxonomy_authority')
            status = connection.execute(
                text(
                    """
                    SELECT release_status
                    FROM gsn_taxonomy_authority.publish_release_v1(
                        'GSN-TAX-R-AUTHORITY-NO-DML', 1
                    )
                    """
                )
            ).scalar_one()
            assert status == 'published'
    finally:
        authority_engine.dispose()


def test_invalid_transition_and_outer_transaction_rollback_are_atomic(
    proof_database: ProofDatabase,
) -> None:
    _insert_valid_draft(proof_database, suffix='ROLLBACK', version_number=105)
    authority_engine = _engine(proof_database.authority_url)
    runtime_engine = _engine(proof_database.runtime_url)
    try:
        with pytest.raises(DBAPIError):
            with authority_engine.begin() as connection:
                _assert_role(connection, 'gsn_taxonomy_authority')
                connection.execute(
                    text(
                        """
                        SELECT * FROM gsn_taxonomy_authority.withdraw_release_v1(
                            'GSN-TAX-R-ROLLBACK', 1, 'Invalid draft withdrawal'
                        )
                        """
                    )
                )
        with authority_engine.connect() as connection:
            transaction = connection.begin()
            _assert_role(connection, 'gsn_taxonomy_authority')
            connection.execute(
                text(
                    """
                    SELECT * FROM gsn_taxonomy_authority.publish_release_v1(
                        'GSN-TAX-R-ROLLBACK', 1
                    )
                    """
                )
            )
            transaction.rollback()
        with runtime_engine.connect() as connection:
            _assert_role(connection, 'gsn_runtime')
            status, checksum = connection.execute(
                text(
                    """
                    SELECT status, checksum FROM commerce_taxonomy_releases
                    WHERE public_id = 'GSN-TAX-R-ROLLBACK'
                    """
                )
            ).one()
            assert status == 'draft'
            assert checksum is None
    finally:
        authority_engine.dispose()
        runtime_engine.dispose()


def test_existing_shop_product_and_runtime_capability_operations_survive(
    proof_database: ProofDatabase,
) -> None:
    runtime_engine = _engine(proof_database.runtime_url)
    try:
        with runtime_engine.begin() as connection:
            _assert_role(connection, 'gsn_runtime')
            shop_name = connection.execute(
                text('SELECT shop_name FROM marketplace_shops WHERE id = 1')
            ).scalar_one()
            product_name = connection.execute(
                text('SELECT title FROM marketplace_products WHERE id = 1')
            ).scalar_one()
            assert shop_name == proof_database.preserved_shop_name
            assert product_name == proof_database.preserved_product_name
            connection.execute(
                text("UPDATE marketplace_shops SET description = 'Runtime update' WHERE id = 1")
            )
            connection.execute(
                text("UPDATE marketplace_products SET description = 'Runtime update' WHERE id = 1")
            )
            capability_id = connection.execute(
                text(
                    """
                    INSERT INTO marketplace_shop_capabilities (
                        public_id, shop_id, owner_description, normalized_description,
                        role_code, mapping_status, claim_basis, is_active, created_by_user_id
                    ) VALUES (
                        'GSN-CAP-AUTH-PROOF', 1, 'Repairs refrigerators',
                        'repairs refrigerators', 'repairs', 'unmapped',
                        'owner_declared', true, 1
                    ) RETURNING id
                    """
                )
            ).scalar_one()
            connection.execute(
                text(
                    """
                    INSERT INTO marketplace_shop_capability_availability (
                        capability_id, availability_status
                    ) VALUES (:capability_id, 'on_request')
                    """
                ),
                {'capability_id': capability_id},
            )
    finally:
        runtime_engine.dispose()


def test_taxonomy_feature_flags_remain_disabled(monkeypatch) -> None:
    for key in (
        'GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED',
        'GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED',
        'GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED',
    ):
        monkeypatch.delenv(key, raising=False)
    assert owner_api_enabled() is False
    assert admin_api_enabled() is False
    assert publication_enabled() is False
