"""protect commerce taxonomy lifecycle with database authority roles

Revision ID: 20261102_taxonomy_authority
Revises: 20261102_commerce_taxonomy
Create Date: 2026-11-02
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261102_taxonomy_authority"
down_revision = "20261102_commerce_taxonomy"
branch_labels = None
depends_on = None


OWNER_ROLE = "gsn_taxonomy_owner"
MIGRATOR_ROLE = "gsn_migrator"
RUNTIME_ROLE = "gsn_runtime"
AUTHORITY_ROLE = "gsn_taxonomy_authority"
AUTHORITY_SCHEMA = "gsn_taxonomy_authority"

TAXONOMY_TABLES = (
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
)

RELEASE_CHILD_TABLES = (
    "commerce_taxonomy_concept_versions",
    "commerce_taxonomy_terms",
    "commerce_taxonomy_redirects",
)


def _require_role_contract(bind) -> None:
    rows = bind.execute(
        sa.text(
            """
            SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole
            FROM pg_roles
            WHERE rolname = ANY(:roles)
            """
        ),
        {"roles": [OWNER_ROLE, MIGRATOR_ROLE, RUNTIME_ROLE, AUTHORITY_ROLE]},
    ).mappings()
    roles = {str(row["rolname"]): row for row in rows}
    missing = sorted(set((OWNER_ROLE, MIGRATOR_ROLE, RUNTIME_ROLE, AUTHORITY_ROLE)) - set(roles))
    if missing:
        raise RuntimeError("Commerce taxonomy authority roles are missing: " + ", ".join(missing))
    if bool(roles[OWNER_ROLE]["rolcanlogin"]):
        raise RuntimeError("gsn_taxonomy_owner must be NOLOGIN")
    for role_name in (MIGRATOR_ROLE, RUNTIME_ROLE, AUTHORITY_ROLE):
        row = roles[role_name]
        if not bool(row["rolcanlogin"]):
            raise RuntimeError(f"{role_name} must be LOGIN")
        if bool(row["rolsuper"]) or bool(row["rolcreatedb"]) or bool(row["rolcreaterole"]):
            raise RuntimeError(f"{role_name} has prohibited database-wide privileges")
    current_user = str(bind.execute(sa.text("SELECT current_user")).scalar_one())
    if current_user != MIGRATOR_ROLE:
        raise RuntimeError("Commerce taxonomy authority migration must run as gsn_migrator")
    may_set_owner = bool(
        bind.execute(
            sa.text("SELECT pg_has_role(current_user, :owner_role, 'SET')"),
            {"owner_role": OWNER_ROLE},
        ).scalar_one()
    )
    if not may_set_owner:
        raise RuntimeError("gsn_migrator must be permitted to SET ROLE gsn_taxonomy_owner")
    owner_may_create_schema = bool(
        bind.execute(
            sa.text("SELECT has_database_privilege(:owner_role, current_database(), 'CREATE')"),
            {"owner_role": OWNER_ROLE},
        ).scalar_one()
    )
    if not owner_may_create_schema:
        raise RuntimeError("gsn_taxonomy_owner requires CREATE on the target database")


def _drop_foundation_triggers() -> None:
    for table_name in RELEASE_CHILD_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table_name}_immutable_v1 ON public.{table_name}")
    op.execute(
        "DROP TRIGGER IF EXISTS trg_commerce_taxonomy_concepts_immutable_v1 "
        "ON public.commerce_taxonomy_concepts"
    )
    op.execute(
        "DROP TRIGGER IF EXISTS trg_commerce_taxonomy_releases_immutable_v1 "
        "ON public.commerce_taxonomy_releases"
    )


def _install_guard_functions() -> None:
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.release_child_guard_v1()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
        DECLARE
            old_status text;
            new_status text;
        BEGIN
            IF TG_OP <> 'INSERT' THEN
                SELECT status INTO old_status
                FROM public.commerce_taxonomy_releases
                WHERE id = OLD.release_id;
                IF COALESCE(old_status, 'missing') <> 'draft' THEN
                    RAISE EXCEPTION 'published taxonomy release is immutable';
                END IF;
            END IF;
            IF TG_OP <> 'DELETE' THEN
                SELECT status INTO new_status
                FROM public.commerce_taxonomy_releases
                WHERE id = NEW.release_id;
                IF COALESCE(new_status, 'missing') <> 'draft' THEN
                    RAISE EXCEPTION 'published taxonomy release is immutable';
                END IF;
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.concept_guard_v1()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM public.commerce_taxonomy_concept_versions AS version
                JOIN public.commerce_taxonomy_releases AS release ON release.id = version.release_id
                WHERE version.concept_id = OLD.id
                  AND release.status IN ('published', 'withdrawn')
            ) THEN
                RAISE EXCEPTION 'published taxonomy concept is immutable';
            END IF;
            RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.release_guard_v1()
        RETURNS trigger
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                IF NEW.status <> 'draft'
                   OR NEW.checksum IS NOT NULL
                   OR NEW.published_by_user_id IS NOT NULL
                   OR NEW.published_at IS NOT NULL
                   OR NEW.withdrawn_by_user_id IS NOT NULL
                   OR NEW.withdrawn_at IS NOT NULL
                   OR NEW.withdrawal_reason IS NOT NULL
                THEN
                    RAISE EXCEPTION 'taxonomy releases must begin as drafts';
                END IF;
                RETURN NEW;
            END IF;
            IF TG_OP = 'DELETE' THEN
                IF OLD.status <> 'draft' THEN
                    RAISE EXCEPTION 'published taxonomy release is immutable';
                END IF;
                RETURN OLD;
            END IF;
            IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
                RETURN NEW;
            END IF;
            IF OLD.status = 'draft' AND NEW.status = 'published' THEN
                IF current_user <> 'gsn_taxonomy_owner'
                   OR NEW.checksum IS NULL
                   OR NEW.published_by_user_id IS NULL
                   OR NEW.published_at IS NULL
                   OR NEW.withdrawn_by_user_id IS NOT NULL
                   OR NEW.withdrawn_at IS NOT NULL
                   OR NEW.withdrawal_reason IS NOT NULL
                THEN
                    RAISE EXCEPTION 'taxonomy publication requires the authority function';
                END IF;
                RETURN NEW;
            END IF;
            IF OLD.status = 'published' AND NEW.status = 'withdrawn' THEN
                IF current_user <> 'gsn_taxonomy_owner'
                   OR NEW.checksum IS DISTINCT FROM OLD.checksum
                   OR NEW.published_by_user_id IS DISTINCT FROM OLD.published_by_user_id
                   OR NEW.published_at IS DISTINCT FROM OLD.published_at
                   OR NEW.withdrawn_by_user_id IS NULL
                   OR NEW.withdrawn_at IS NULL
                   OR NULLIF(btrim(NEW.withdrawal_reason), '') IS NULL
                THEN
                    RAISE EXCEPTION 'taxonomy withdrawal requires the authority function';
                END IF;
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'invalid taxonomy lifecycle transition';
        END;
        $$
        """
    )


def _install_checksum_functions() -> None:
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.canonical_release_document_v1(target_release_id integer)
        RETURNS text
        LANGUAGE plpgsql
        STABLE
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
        DECLARE
            release_row public.commerce_taxonomy_releases%ROWTYPE;
            item record;
            document text := 'checksum_contract' || E'\t' || '1' || E'\n';
        BEGIN
            SELECT * INTO STRICT release_row
            FROM public.commerce_taxonomy_releases
            WHERE id = target_release_id;

            document := document || 'release_public_id' || E'\t'
                || to_json(release_row.public_id)::text || E'\n';
            document := document || 'version_number' || E'\t'
                || to_json(release_row.version_number)::text || E'\n';

            FOR item IN
                SELECT value
                FROM jsonb_array_elements_text(release_row.languages_json::jsonb) AS language(value)
                ORDER BY value
            LOOP
                document := document || 'language' || E'\t' || to_json(item.value)::text || E'\n';
            END LOOP;

            FOR item IN
                SELECT concept.public_id,
                       parent.public_id AS parent_public_id,
                       version.canonical_label,
                       version.description,
                       version.concept_kind,
                       version.sensitivity,
                       version.credential_notice,
                       version.lifecycle_status,
                       version.sort_order
                FROM public.commerce_taxonomy_concept_versions AS version
                JOIN public.commerce_taxonomy_concepts AS concept ON concept.id = version.concept_id
                LEFT JOIN public.commerce_taxonomy_concepts AS parent ON parent.id = version.parent_concept_id
                WHERE version.release_id = target_release_id
                ORDER BY concept.public_id
            LOOP
                document := document || 'concept' || E'\t'
                    || to_json(item.public_id)::text || E'\t'
                    || COALESCE(to_json(item.parent_public_id)::text, 'null') || E'\t'
                    || to_json(item.canonical_label)::text || E'\t'
                    || COALESCE(to_json(item.description)::text, 'null') || E'\t'
                    || to_json(item.concept_kind)::text || E'\t'
                    || to_json(item.sensitivity)::text || E'\t'
                    || COALESCE(to_json(item.credential_notice)::text, 'null') || E'\t'
                    || to_json(item.lifecycle_status)::text || E'\t'
                    || to_json(item.sort_order)::text || E'\n';
            END LOOP;

            FOR item IN
                SELECT concept.public_id AS concept_public_id,
                       term.locale,
                       term.term,
                       term.normalized_term,
                       term.term_kind,
                       term.review_status
                FROM public.commerce_taxonomy_terms AS term
                JOIN public.commerce_taxonomy_concepts AS concept ON concept.id = term.concept_id
                WHERE term.release_id = target_release_id
                ORDER BY term.locale, term.normalized_term, concept.public_id
            LOOP
                document := document || 'term' || E'\t'
                    || to_json(item.concept_public_id)::text || E'\t'
                    || to_json(item.locale)::text || E'\t'
                    || to_json(item.term)::text || E'\t'
                    || to_json(item.normalized_term)::text || E'\t'
                    || to_json(item.term_kind)::text || E'\t'
                    || to_json(item.review_status)::text || E'\n';
            END LOOP;

            FOR item IN
                SELECT source.public_id AS source_public_id,
                       target.public_id AS target_public_id,
                       redirect.redirect_kind,
                       redirect.reason
                FROM public.commerce_taxonomy_redirects AS redirect
                JOIN public.commerce_taxonomy_concepts AS source ON source.id = redirect.source_concept_id
                JOIN public.commerce_taxonomy_concepts AS target ON target.id = redirect.target_concept_id
                WHERE redirect.release_id = target_release_id
                ORDER BY source.public_id, target.public_id
            LOOP
                document := document || 'redirect' || E'\t'
                    || to_json(item.source_public_id)::text || E'\t'
                    || to_json(item.target_public_id)::text || E'\t'
                    || to_json(item.redirect_kind)::text || E'\t'
                    || COALESCE(to_json(item.reason)::text, 'null') || E'\n';
            END LOOP;
            RETURN document;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.release_checksum_v1(target_release_id integer)
        RETURNS text
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
            SELECT encode(
                sha256(convert_to(gsn_taxonomy_authority.canonical_release_document_v1(target_release_id), 'UTF8')),
                'hex'
            )
        $$
        """
    )


def _install_transition_functions() -> None:
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.validate_release_v1(target_release_id integer)
        RETURNS void
        LANGUAGE plpgsql
        STABLE
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
        DECLARE
            release_row public.commerce_taxonomy_releases%ROWTYPE;
        BEGIN
            SELECT * INTO STRICT release_row
            FROM public.commerce_taxonomy_releases
            WHERE id = target_release_id;
            IF release_row.status <> 'draft' THEN
                RAISE EXCEPTION 'only a draft taxonomy release can be published';
            END IF;
            IF NOT (release_row.languages_json::jsonb ? 'en')
               OR NOT (release_row.languages_json::jsonb ? 'en-NG')
            THEN
                RAISE EXCEPTION 'published releases require English and Nigerian English';
            END IF;
            IF NULLIF(btrim(release_row.backup_steward_name), '') IS NULL
               OR NULLIF(btrim(release_row.safety_reviewer_name), '') IS NULL
               OR lower(btrim(release_row.backup_steward_name)) = lower(btrim(release_row.safety_reviewer_name))
            THEN
                RAISE EXCEPTION 'independent taxonomy stewardship is required';
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM public.commerce_taxonomy_concept_versions
                WHERE release_id = target_release_id
            ) THEN
                RAISE EXCEPTION 'a taxonomy release cannot be empty';
            END IF;
            IF EXISTS (
                SELECT 1 FROM public.commerce_taxonomy_concept_versions
                WHERE release_id = target_release_id
                  AND sensitivity <> 'standard'
                  AND NULLIF(btrim(credential_notice), '') IS NULL
            ) THEN
                RAISE EXCEPTION 'sensitive concepts require a non-credential warning';
            END IF;
            IF EXISTS (
                SELECT 1 FROM public.commerce_taxonomy_terms
                WHERE release_id = target_release_id AND review_status <> 'approved'
            ) THEN
                RAISE EXCEPTION 'every published taxonomy term must be approved';
            END IF;
            IF EXISTS (
                SELECT 1
                FROM public.commerce_taxonomy_terms
                WHERE release_id = target_release_id
                  AND locale = 'ig'
                  AND reviewed_by_user_id IS NULL
            ) THEN
                RAISE EXCEPTION 'every Igbo term must have a recorded reviewer';
            END IF;
            IF EXISTS (
                SELECT 1
                FROM public.commerce_taxonomy_concept_versions AS version
                CROSS JOIN (VALUES ('en'), ('en-NG')) AS required(locale)
                WHERE version.release_id = target_release_id
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.commerce_taxonomy_terms AS term
                      WHERE term.release_id = version.release_id
                        AND term.concept_id = version.concept_id
                        AND term.locale = required.locale
                        AND term.term_kind = 'canonical'
                        AND term.review_status = 'approved'
                  )
            ) THEN
                RAISE EXCEPTION 'every concept requires approved English and Nigerian English canonical terms';
            END IF;
            IF EXISTS (
                WITH RECURSIVE paths(source_id, current_id, visited, cycle, depth) AS (
                    SELECT source_concept_id,
                           target_concept_id,
                           ARRAY[source_concept_id],
                           target_concept_id = source_concept_id,
                           1
                    FROM public.commerce_taxonomy_redirects
                    WHERE release_id = target_release_id
                    UNION ALL
                    SELECT paths.source_id,
                           redirect.target_concept_id,
                           paths.visited || paths.current_id,
                           redirect.target_concept_id = ANY(paths.visited),
                           paths.depth + 1
                    FROM paths
                    JOIN public.commerce_taxonomy_redirects AS redirect
                      ON redirect.release_id = target_release_id
                     AND redirect.source_concept_id = paths.current_id
                    WHERE NOT paths.cycle AND paths.depth <= 16
                )
                SELECT 1 FROM paths WHERE cycle OR depth > 16
            ) THEN
                RAISE EXCEPTION 'taxonomy redirects cannot contain a cycle or exceed depth 16';
            END IF;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.publish_release_v1(
            target_release_public_id text,
            actor_user_id integer
        )
        RETURNS TABLE(release_public_id text, release_status text, release_checksum text)
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
        DECLARE
            target_release_id integer;
            calculated_checksum text;
        BEGIN
            SELECT id INTO STRICT target_release_id
            FROM public.commerce_taxonomy_releases
            WHERE public_id = target_release_public_id
            FOR UPDATE;
            PERFORM gsn_taxonomy_authority.validate_release_v1(target_release_id);
            calculated_checksum := gsn_taxonomy_authority.release_checksum_v1(target_release_id);
            RETURN QUERY
            UPDATE public.commerce_taxonomy_releases AS release
            SET status = 'published',
                checksum = calculated_checksum,
                published_by_user_id = actor_user_id,
                published_at = clock_timestamp()
            WHERE release.id = target_release_id
            RETURNING release.public_id::text, release.status::text, release.checksum::text;
        END;
        $$
        """
    )
    op.execute(
        """
        CREATE FUNCTION gsn_taxonomy_authority.withdraw_release_v1(
            target_release_public_id text,
            actor_user_id integer,
            withdrawal_reason_text text
        )
        RETURNS TABLE(release_public_id text, release_status text, release_checksum text)
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog
        AS $$
        DECLARE
            release_row public.commerce_taxonomy_releases%ROWTYPE;
            calculated_checksum text;
        BEGIN
            SELECT * INTO STRICT release_row
            FROM public.commerce_taxonomy_releases
            WHERE public_id = target_release_public_id
            FOR UPDATE;
            IF release_row.status <> 'published' THEN
                RAISE EXCEPTION 'only a published taxonomy release can be withdrawn';
            END IF;
            IF NULLIF(btrim(withdrawal_reason_text), '') IS NULL THEN
                RAISE EXCEPTION 'a withdrawal reason is required';
            END IF;
            calculated_checksum := gsn_taxonomy_authority.release_checksum_v1(release_row.id);
            IF calculated_checksum IS DISTINCT FROM release_row.checksum THEN
                RAISE EXCEPTION 'taxonomy release checksum verification failed';
            END IF;
            RETURN QUERY
            UPDATE public.commerce_taxonomy_releases AS release
            SET status = 'withdrawn',
                withdrawn_by_user_id = actor_user_id,
                withdrawn_at = clock_timestamp(),
                withdrawal_reason = btrim(withdrawal_reason_text)
            WHERE release.id = release_row.id
            RETURNING release.public_id::text, release.status::text, release.checksum::text;
        END;
        $$
        """
    )


def _install_privileges() -> None:
    op.execute("REVOKE ALL ON SCHEMA gsn_taxonomy_authority FROM PUBLIC, gsn_runtime")
    op.execute("GRANT USAGE ON SCHEMA gsn_taxonomy_authority TO gsn_taxonomy_authority, gsn_migrator")
    for signature in (
        "canonical_release_document_v1(integer)",
        "release_checksum_v1(integer)",
        "validate_release_v1(integer)",
        "publish_release_v1(text, integer)",
        "withdraw_release_v1(text, integer, text)",
        "release_child_guard_v1()",
        "concept_guard_v1()",
        "release_guard_v1()",
    ):
        op.execute(f"REVOKE ALL ON FUNCTION gsn_taxonomy_authority.{signature} FROM PUBLIC")
    op.execute(
        "GRANT EXECUTE ON FUNCTION "
        "gsn_taxonomy_authority.publish_release_v1(text, integer), "
        "gsn_taxonomy_authority.withdraw_release_v1(text, integer, text) "
        "TO gsn_taxonomy_authority"
    )
    op.execute(
        "GRANT EXECUTE ON FUNCTION "
        "gsn_taxonomy_authority.canonical_release_document_v1(integer), "
        "gsn_taxonomy_authority.release_checksum_v1(integer), "
        "gsn_taxonomy_authority.validate_release_v1(integer) "
        "TO gsn_migrator"
    )

    for table_name in TAXONOMY_TABLES:
        op.execute(f"REVOKE ALL ON TABLE public.{table_name} FROM gsn_runtime, gsn_taxonomy_authority")
        op.execute(f"GRANT SELECT ON TABLE public.{table_name} TO gsn_runtime")

    op.execute("GRANT INSERT ON TABLE public.commerce_taxonomy_releases TO gsn_runtime")
    op.execute(
        "GRANT UPDATE (languages_json, backup_steward_name, safety_reviewer_name, updated_at) "
        "ON public.commerce_taxonomy_releases TO gsn_runtime"
    )
    for table_name in (
        "commerce_taxonomy_concepts",
        "commerce_taxonomy_concept_versions",
        "commerce_taxonomy_terms",
        "commerce_taxonomy_redirects",
        "commerce_taxonomy_proposals",
        "marketplace_shop_capabilities",
        "marketplace_shop_capability_availability",
        "marketplace_shop_capability_coverage",
        "marketplace_product_capabilities",
    ):
        op.execute(f"GRANT INSERT, UPDATE, DELETE ON TABLE public.{table_name} TO gsn_runtime")

    op.execute(
        """
        DO $$
        DECLARE
            sequence_name text;
        BEGIN
            FOR sequence_name IN
                SELECT pg_get_serial_sequence('public.' || table_name, 'id')
                FROM unnest(ARRAY[
                    'commerce_taxonomy_releases',
                    'commerce_taxonomy_concepts',
                    'commerce_taxonomy_concept_versions',
                    'commerce_taxonomy_terms',
                    'commerce_taxonomy_redirects',
                    'commerce_taxonomy_proposals',
                    'marketplace_shop_capabilities',
                    'marketplace_shop_capability_availability',
                    'marketplace_shop_capability_coverage',
                    'marketplace_product_capabilities'
                ]) AS table_name
            LOOP
                IF sequence_name IS NOT NULL THEN
                    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO gsn_runtime', sequence_name);
                END IF;
            END LOOP;
        END;
        $$
        """
    )


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    _require_role_contract(bind)
    _drop_foundation_triggers()
    op.execute("GRANT USAGE, CREATE ON SCHEMA public TO gsn_taxonomy_owner")
    op.execute("REVOKE CREATE ON SCHEMA public FROM gsn_runtime")
    for function_name in (
        "commerce_taxonomy_release_immutable_v1()",
        "commerce_taxonomy_concept_immutable_v1()",
        "commerce_taxonomy_child_immutable_v1()",
    ):
        op.execute(f"ALTER FUNCTION public.{function_name} OWNER TO gsn_taxonomy_owner")
        op.execute(f"REVOKE ALL ON FUNCTION public.{function_name} FROM PUBLIC")
    for table_name in TAXONOMY_TABLES:
        op.execute(f"ALTER TABLE public.{table_name} OWNER TO gsn_taxonomy_owner")
    op.execute("SET LOCAL ROLE gsn_taxonomy_owner")
    op.execute(
        "CREATE SCHEMA IF NOT EXISTS gsn_taxonomy_authority "
        "AUTHORIZATION gsn_taxonomy_owner"
    )
    _install_guard_functions()
    _install_checksum_functions()
    _install_transition_functions()
    for table_name in RELEASE_CHILD_TABLES:
        op.execute(
            f"CREATE TRIGGER trg_{table_name}_authority_v1 "
            f"BEFORE INSERT OR UPDATE OR DELETE ON public.{table_name} "
            "FOR EACH ROW EXECUTE FUNCTION gsn_taxonomy_authority.release_child_guard_v1()"
        )
    op.execute(
        "CREATE TRIGGER trg_commerce_taxonomy_concepts_authority_v1 "
        "BEFORE UPDATE OR DELETE ON public.commerce_taxonomy_concepts "
        "FOR EACH ROW EXECUTE FUNCTION gsn_taxonomy_authority.concept_guard_v1()"
    )
    op.execute(
        "CREATE TRIGGER trg_commerce_taxonomy_releases_authority_v1 "
        "BEFORE INSERT OR UPDATE OR DELETE ON public.commerce_taxonomy_releases "
        "FOR EACH ROW EXECUTE FUNCTION gsn_taxonomy_authority.release_guard_v1()"
    )
    _install_privileges()
    op.execute("RESET ROLE")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    _require_role_contract(bind)
    populated = int(
        bind.execute(sa.text("SELECT COUNT(*) FROM public.commerce_taxonomy_releases")).scalar_one()
    )
    if populated:
        raise RuntimeError(
            "Unsafe commerce taxonomy authority rollback refused because taxonomy releases exist"
        )
    op.execute("SET LOCAL ROLE gsn_taxonomy_owner")
    for table_name in RELEASE_CHILD_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table_name}_authority_v1 ON public.{table_name}")
    op.execute(
        "DROP TRIGGER IF EXISTS trg_commerce_taxonomy_concepts_authority_v1 "
        "ON public.commerce_taxonomy_concepts"
    )
    op.execute(
        "DROP TRIGGER IF EXISTS trg_commerce_taxonomy_releases_authority_v1 "
        "ON public.commerce_taxonomy_releases"
    )
    op.execute("DROP SCHEMA gsn_taxonomy_authority CASCADE")
    op.execute("RESET ROLE")
    for table_name in TAXONOMY_TABLES:
        op.execute(f"ALTER TABLE public.{table_name} OWNER TO gsn_migrator")
    for function_name in (
        "commerce_taxonomy_release_immutable_v1()",
        "commerce_taxonomy_concept_immutable_v1()",
        "commerce_taxonomy_child_immutable_v1()",
    ):
        op.execute(f"ALTER FUNCTION public.{function_name} OWNER TO gsn_migrator")
        op.execute(f"GRANT EXECUTE ON FUNCTION public.{function_name} TO PUBLIC")
    op.execute("REVOKE CREATE ON SCHEMA public FROM gsn_taxonomy_owner")
    for table_name in RELEASE_CHILD_TABLES:
        op.execute(
            f"CREATE TRIGGER trg_{table_name}_immutable_v1 "
            f"BEFORE INSERT OR UPDATE OR DELETE ON public.{table_name} "
            "FOR EACH ROW EXECUTE FUNCTION public.commerce_taxonomy_child_immutable_v1()"
        )
    op.execute(
        "CREATE TRIGGER trg_commerce_taxonomy_concepts_immutable_v1 "
        "BEFORE UPDATE OR DELETE ON public.commerce_taxonomy_concepts "
        "FOR EACH ROW EXECUTE FUNCTION public.commerce_taxonomy_concept_immutable_v1()"
    )
    op.execute(
        "CREATE TRIGGER trg_commerce_taxonomy_releases_immutable_v1 "
        "BEFORE UPDATE OR DELETE ON public.commerce_taxonomy_releases "
        "FOR EACH ROW EXECUTE FUNCTION public.commerce_taxonomy_release_immutable_v1()"
    )
