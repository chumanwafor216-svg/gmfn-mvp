"""add commerce taxonomy and owner-declared shop capabilities

Revision ID: 20261102_commerce_taxonomy
Revises: 20261030_market_dir_scale
Create Date: 2026-11-02
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261102_commerce_taxonomy"
down_revision = "20261030_market_dir_scale"
branch_labels = None
depends_on = None


_IMMUTABLE_RELEASE_CHILDREN = (
    "commerce_taxonomy_concept_versions",
    "commerce_taxonomy_terms",
    "commerce_taxonomy_redirects",
)


def _install_postgresql_immutability_guards() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION commerce_taxonomy_child_immutable_v1()
        RETURNS trigger AS $$
        DECLARE
            old_status text;
            new_status text;
        BEGIN
            IF TG_OP <> 'INSERT' THEN
                SELECT status INTO old_status
                FROM commerce_taxonomy_releases
                WHERE id = OLD.release_id;
                IF COALESCE(old_status, 'missing') <> 'draft' THEN
                    RAISE EXCEPTION 'published taxonomy release is immutable';
                END IF;
            END IF;
            IF TG_OP <> 'DELETE' THEN
                SELECT status INTO new_status
                FROM commerce_taxonomy_releases
                WHERE id = NEW.release_id;
                IF COALESCE(new_status, 'missing') <> 'draft' THEN
                    RAISE EXCEPTION 'published taxonomy release is immutable';
                END IF;
            END IF;
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    for table_name in _IMMUTABLE_RELEASE_CHILDREN:
        op.execute(
            f"""
            CREATE TRIGGER trg_{table_name}_immutable_v1
            BEFORE INSERT OR UPDATE OR DELETE ON {table_name}
            FOR EACH ROW EXECUTE FUNCTION commerce_taxonomy_child_immutable_v1()
            """
        )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION commerce_taxonomy_concept_immutable_v1()
        RETURNS trigger AS $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM commerce_taxonomy_concept_versions version
                JOIN commerce_taxonomy_releases release ON release.id = version.release_id
                WHERE version.concept_id = OLD.id
                  AND release.status IN ('published', 'withdrawn')
            ) THEN
                RAISE EXCEPTION 'published taxonomy concept is immutable';
            END IF;
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_commerce_taxonomy_concepts_immutable_v1
        BEFORE UPDATE OR DELETE ON commerce_taxonomy_concepts
        FOR EACH ROW EXECUTE FUNCTION commerce_taxonomy_concept_immutable_v1()
        """
    )
    op.execute(
        """
        CREATE OR REPLACE FUNCTION commerce_taxonomy_release_immutable_v1()
        RETURNS trigger AS $$
        BEGIN
            IF TG_OP = 'DELETE' THEN
                IF OLD.status IN ('published', 'withdrawn') THEN
                    RAISE EXCEPTION 'published taxonomy release is immutable';
                END IF;
                RETURN OLD;
            END IF;
            IF OLD.status IN ('published', 'withdrawn')
               AND NOT (
                    OLD.status = 'published'
                    AND NEW.status = 'withdrawn'
                    AND NEW.public_id IS NOT DISTINCT FROM OLD.public_id
                    AND NEW.version_number IS NOT DISTINCT FROM OLD.version_number
                    AND NEW.languages_json IS NOT DISTINCT FROM OLD.languages_json
                    AND NEW.checksum IS NOT DISTINCT FROM OLD.checksum
                    AND NEW.steward_user_id IS NOT DISTINCT FROM OLD.steward_user_id
                    AND NEW.backup_steward_name IS NOT DISTINCT FROM OLD.backup_steward_name
                    AND NEW.safety_reviewer_name IS NOT DISTINCT FROM OLD.safety_reviewer_name
                    AND NEW.published_by_user_id IS NOT DISTINCT FROM OLD.published_by_user_id
                    AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
                    AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
               )
            THEN
                RAISE EXCEPTION 'published taxonomy release is immutable';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_commerce_taxonomy_releases_immutable_v1
        BEFORE UPDATE OR DELETE ON commerce_taxonomy_releases
        FOR EACH ROW EXECUTE FUNCTION commerce_taxonomy_release_immutable_v1()
        """
    )


def upgrade() -> None:
    op.create_table(
        "commerce_taxonomy_releases",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_id", sa.String(length=64), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("languages_json", sa.Text(), server_default="[]", nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=True),
        sa.Column("steward_user_id", sa.Integer(), nullable=False),
        sa.Column("backup_steward_name", sa.String(length=160), nullable=True),
        sa.Column("safety_reviewer_name", sa.String(length=160), nullable=True),
        sa.Column("published_by_user_id", sa.Integer(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("withdrawn_by_user_id", sa.Integer(), nullable=True),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("withdrawal_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('draft', 'published', 'withdrawn')", name="ck_commerce_taxonomy_release_status_v1"),
        sa.CheckConstraint("version_number > 0", name="ck_commerce_taxonomy_release_version_v1"),
        sa.ForeignKeyConstraint(["steward_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["published_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["withdrawn_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id", name="uq_commerce_taxonomy_release_public_id_v1"),
        sa.UniqueConstraint("version_number", name="uq_commerce_taxonomy_release_version_v1"),
    )

    op.create_table(
        "commerce_taxonomy_concepts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_id", sa.String(length=64), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id", name="uq_commerce_taxonomy_concept_public_id_v1"),
    )

    op.create_table(
        "commerce_taxonomy_concept_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("release_id", sa.Integer(), nullable=False),
        sa.Column("concept_id", sa.Integer(), nullable=False),
        sa.Column("parent_concept_id", sa.Integer(), nullable=True),
        sa.Column("canonical_label", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("concept_kind", sa.String(length=20), nullable=False),
        sa.Column("sensitivity", sa.String(length=24), server_default="standard", nullable=False),
        sa.Column("credential_notice", sa.Text(), nullable=True),
        sa.Column("lifecycle_status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("concept_kind IN ('product', 'service', 'hybrid')", name="ck_commerce_taxonomy_concept_kind_v1"),
        sa.CheckConstraint("sensitivity IN ('standard', 'regulated', 'safety_critical')", name="ck_commerce_taxonomy_sensitivity_v1"),
        sa.CheckConstraint("lifecycle_status IN ('active', 'retired')", name="ck_commerce_taxonomy_concept_lifecycle_v1"),
        sa.CheckConstraint("parent_concept_id IS NULL OR parent_concept_id <> concept_id", name="ck_commerce_taxonomy_parent_self_v1"),
        sa.ForeignKeyConstraint(["release_id"], ["commerce_taxonomy_releases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["parent_concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("release_id", "concept_id", name="uq_commerce_taxonomy_concept_release_v1"),
    )

    op.create_table(
        "commerce_taxonomy_terms",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("release_id", sa.Integer(), nullable=False),
        sa.Column("concept_id", sa.Integer(), nullable=False),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("term", sa.String(length=200), nullable=False),
        sa.Column("normalized_term", sa.String(length=200), nullable=False),
        sa.Column("term_kind", sa.String(length=20), nullable=False),
        sa.Column("review_status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("term_kind IN ('canonical', 'alias')", name="ck_commerce_taxonomy_term_kind_v1"),
        sa.CheckConstraint("review_status IN ('draft', 'approved', 'rejected')", name="ck_commerce_taxonomy_term_review_v1"),
        sa.ForeignKeyConstraint(["release_id"], ["commerce_taxonomy_releases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("release_id", "locale", "normalized_term", name="uq_commerce_taxonomy_term_resolution_v1"),
    )

    op.create_table(
        "commerce_taxonomy_redirects",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("release_id", sa.Integer(), nullable=False),
        sa.Column("source_concept_id", sa.Integer(), nullable=False),
        sa.Column("target_concept_id", sa.Integer(), nullable=False),
        sa.Column("redirect_kind", sa.String(length=20), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("redirect_kind IN ('renamed', 'merged', 'retired', 'reparented')", name="ck_commerce_taxonomy_redirect_kind_v1"),
        sa.CheckConstraint("source_concept_id <> target_concept_id", name="ck_commerce_taxonomy_redirect_self_v1"),
        sa.ForeignKeyConstraint(["release_id"], ["commerce_taxonomy_releases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["target_concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("release_id", "source_concept_id", name="uq_commerce_taxonomy_redirect_source_v1"),
    )

    op.create_table(
        "commerce_taxonomy_proposals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_id", sa.String(length=64), nullable=False),
        sa.Column("proposer_user_id", sa.Integer(), nullable=False),
        sa.Column("shop_id", sa.Integer(), nullable=False),
        sa.Column("proposed_concept_id", sa.Integer(), nullable=True),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("term", sa.String(length=200), nullable=False),
        sa.Column("normalized_term", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("moderation_reason", sa.Text(), nullable=True),
        sa.Column("duplicate_of_proposal_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retention_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('pending', 'approved', 'rejected', 'duplicate', 'withdrawn')", name="ck_commerce_taxonomy_proposal_status_v1"),
        sa.ForeignKeyConstraint(["proposer_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["proposed_concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["duplicate_of_proposal_id"], ["commerce_taxonomy_proposals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id", name="uq_commerce_taxonomy_proposal_public_id_v1"),
    )

    op.create_table(
        "marketplace_shop_capabilities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_id", sa.String(length=64), nullable=False),
        sa.Column("shop_id", sa.Integer(), nullable=False),
        sa.Column("concept_id", sa.Integer(), nullable=True),
        sa.Column("taxonomy_release_id", sa.Integer(), nullable=True),
        sa.Column("owner_description", sa.String(length=240), nullable=False),
        sa.Column("normalized_description", sa.String(length=240), nullable=False),
        sa.Column("role_code", sa.String(length=32), nullable=False),
        sa.Column("mapping_status", sa.String(length=24), server_default="unmapped", nullable=False),
        sa.Column("claim_basis", sa.String(length=24), server_default="owner_declared", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role_code IN ('manufactures', 'sells', 'repairs', 'installs', 'delivers', 'rents', 'teaches_trains', 'professional_service', 'other')", name="ck_marketplace_shop_capability_role_v1"),
        sa.CheckConstraint("mapping_status IN ('unmapped', 'owner_selected', 'admin_approved', 'rejected')", name="ck_marketplace_shop_capability_mapping_v1"),
        sa.CheckConstraint("claim_basis = 'owner_declared'", name="ck_marketplace_shop_capability_claim_basis_v1"),
        sa.CheckConstraint("((mapping_status = 'unmapped' AND concept_id IS NULL AND taxonomy_release_id IS NULL) OR (mapping_status <> 'unmapped' AND concept_id IS NOT NULL AND taxonomy_release_id IS NOT NULL))", name="ck_marketplace_shop_capability_mapping_refs_v1"),
        sa.CheckConstraint("length(trim(owner_description)) > 0", name="ck_marketplace_shop_capability_description_v1"),
        sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["taxonomy_release_id"], ["commerce_taxonomy_releases.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("public_id", name="uq_marketplace_shop_capability_public_id_v1"),
        sa.UniqueConstraint("shop_id", "role_code", "normalized_description", name="uq_marketplace_shop_capability_description_v1"),
        sa.UniqueConstraint("shop_id", "role_code", "concept_id", name="uq_marketplace_shop_capability_concept_v1"),
    )

    op.create_table(
        "marketplace_shop_capability_availability",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("capability_id", sa.Integer(), nullable=False),
        sa.Column("availability_status", sa.String(length=20), server_default="unspecified", nullable=False),
        sa.Column("available_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.String(length=240), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("availability_status IN ('available', 'on_request', 'unavailable', 'unspecified')", name="ck_marketplace_shop_capability_availability_v1"),
        sa.CheckConstraint("available_until IS NULL OR available_from IS NULL OR available_until >= available_from", name="ck_marketplace_shop_capability_availability_dates_v1"),
        sa.ForeignKeyConstraint(["capability_id"], ["marketplace_shop_capabilities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("capability_id", name="uq_marketplace_shop_capability_availability_v1"),
    )

    op.create_table(
        "marketplace_shop_capability_coverage",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("capability_id", sa.Integer(), nullable=False),
        sa.Column("scope_type", sa.String(length=20), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=True),
        sa.Column("region_name", sa.String(length=120), nullable=True),
        sa.Column("locality_name", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("scope_type IN ('locality', 'region', 'country', 'remote')", name="ck_marketplace_shop_capability_coverage_scope_v1"),
        sa.CheckConstraint("((scope_type = 'remote' AND country_code IS NULL AND region_name IS NULL AND locality_name IS NULL) OR (scope_type = 'country' AND country_code IS NOT NULL AND region_name IS NULL AND locality_name IS NULL) OR (scope_type = 'region' AND country_code IS NOT NULL AND region_name IS NOT NULL AND locality_name IS NULL) OR (scope_type = 'locality' AND country_code IS NOT NULL AND region_name IS NOT NULL AND locality_name IS NOT NULL))", name="ck_marketplace_shop_capability_coverage_fields_v1"),
        sa.ForeignKeyConstraint(["capability_id"], ["marketplace_shop_capabilities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("capability_id", "scope_type", "country_code", "region_name", "locality_name", name="uq_marketplace_shop_capability_coverage_v1"),
    )

    op.create_table(
        "marketplace_product_capabilities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("concept_id", sa.Integer(), nullable=False),
        sa.Column("taxonomy_release_id", sa.Integer(), nullable=False),
        sa.Column("mapping_status", sa.String(length=24), nullable=False),
        sa.Column("mapped_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("mapping_status IN ('owner_selected', 'admin_approved', 'rejected')", name="ck_marketplace_product_capability_mapping_v1"),
        sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["concept_id"], ["commerce_taxonomy_concepts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["taxonomy_release_id"], ["commerce_taxonomy_releases.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["mapped_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "concept_id", name="uq_marketplace_product_capability_concept_v1"),
    )

    indexes = (
        ("ix_commerce_taxonomy_release_status_v1", "commerce_taxonomy_releases", ["status", "version_number"]),
        ("ix_commerce_taxonomy_releases_id", "commerce_taxonomy_releases", ["id"]),
        ("ix_commerce_taxonomy_releases_public_id", "commerce_taxonomy_releases", ["public_id"]),
        ("ix_commerce_taxonomy_releases_version_number", "commerce_taxonomy_releases", ["version_number"]),
        ("ix_commerce_taxonomy_releases_status", "commerce_taxonomy_releases", ["status"]),
        ("ix_commerce_taxonomy_releases_steward_user_id", "commerce_taxonomy_releases", ["steward_user_id"]),
        ("ix_commerce_taxonomy_releases_published_by_user_id", "commerce_taxonomy_releases", ["published_by_user_id"]),
        ("ix_commerce_taxonomy_releases_withdrawn_by_user_id", "commerce_taxonomy_releases", ["withdrawn_by_user_id"]),
        ("ix_commerce_taxonomy_concepts_id", "commerce_taxonomy_concepts", ["id"]),
        ("ix_commerce_taxonomy_concepts_public_id", "commerce_taxonomy_concepts", ["public_id"]),
        ("ix_commerce_taxonomy_concepts_created_by_user_id", "commerce_taxonomy_concepts", ["created_by_user_id"]),
        ("ix_commerce_taxonomy_concept_release_parent_v1", "commerce_taxonomy_concept_versions", ["release_id", "parent_concept_id"]),
        ("ix_commerce_taxonomy_concept_versions_id", "commerce_taxonomy_concept_versions", ["id"]),
        ("ix_commerce_taxonomy_concept_versions_release_id", "commerce_taxonomy_concept_versions", ["release_id"]),
        ("ix_commerce_taxonomy_concept_versions_concept_id", "commerce_taxonomy_concept_versions", ["concept_id"]),
        ("ix_commerce_taxonomy_concept_versions_parent_concept_id", "commerce_taxonomy_concept_versions", ["parent_concept_id"]),
        ("ix_commerce_taxonomy_concept_versions_created_by_user_id", "commerce_taxonomy_concept_versions", ["created_by_user_id"]),
        ("ix_commerce_taxonomy_term_lookup_v1", "commerce_taxonomy_terms", ["release_id", "locale", "normalized_term"]),
        ("ix_commerce_taxonomy_terms_id", "commerce_taxonomy_terms", ["id"]),
        ("ix_commerce_taxonomy_terms_release_id", "commerce_taxonomy_terms", ["release_id"]),
        ("ix_commerce_taxonomy_terms_concept_id", "commerce_taxonomy_terms", ["concept_id"]),
        ("ix_commerce_taxonomy_terms_locale", "commerce_taxonomy_terms", ["locale"]),
        ("ix_commerce_taxonomy_terms_reviewed_by_user_id", "commerce_taxonomy_terms", ["reviewed_by_user_id"]),
        ("ix_commerce_taxonomy_terms_created_by_user_id", "commerce_taxonomy_terms", ["created_by_user_id"]),
        ("ix_commerce_taxonomy_redirects_id", "commerce_taxonomy_redirects", ["id"]),
        ("ix_commerce_taxonomy_redirects_release_id", "commerce_taxonomy_redirects", ["release_id"]),
        ("ix_commerce_taxonomy_redirects_source_concept_id", "commerce_taxonomy_redirects", ["source_concept_id"]),
        ("ix_commerce_taxonomy_redirects_target_concept_id", "commerce_taxonomy_redirects", ["target_concept_id"]),
        ("ix_commerce_taxonomy_redirects_created_by_user_id", "commerce_taxonomy_redirects", ["created_by_user_id"]),
        ("ix_commerce_taxonomy_proposal_duplicate_v1", "commerce_taxonomy_proposals", ["proposer_user_id", "locale", "normalized_term", "status"]),
        ("ix_commerce_taxonomy_proposals_id", "commerce_taxonomy_proposals", ["id"]),
        ("ix_commerce_taxonomy_proposals_public_id", "commerce_taxonomy_proposals", ["public_id"]),
        ("ix_commerce_taxonomy_proposals_proposer_user_id", "commerce_taxonomy_proposals", ["proposer_user_id"]),
        ("ix_commerce_taxonomy_proposals_shop_id", "commerce_taxonomy_proposals", ["shop_id"]),
        ("ix_commerce_taxonomy_proposals_proposed_concept_id", "commerce_taxonomy_proposals", ["proposed_concept_id"]),
        ("ix_commerce_taxonomy_proposals_status", "commerce_taxonomy_proposals", ["status"]),
        ("ix_commerce_taxonomy_proposals_reviewed_by_user_id", "commerce_taxonomy_proposals", ["reviewed_by_user_id"]),
        ("ix_commerce_taxonomy_proposals_created_at", "commerce_taxonomy_proposals", ["created_at"]),
        ("ix_marketplace_shop_capability_active_v1", "marketplace_shop_capabilities", ["shop_id", "is_active", "role_code"]),
        ("ix_marketplace_shop_capability_concept_active_v1", "marketplace_shop_capabilities", ["concept_id", "is_active"]),
        ("ix_marketplace_shop_capabilities_id", "marketplace_shop_capabilities", ["id"]),
        ("ix_marketplace_shop_capabilities_public_id", "marketplace_shop_capabilities", ["public_id"]),
        ("ix_marketplace_shop_capabilities_shop_id", "marketplace_shop_capabilities", ["shop_id"]),
        ("ix_marketplace_shop_capabilities_concept_id", "marketplace_shop_capabilities", ["concept_id"]),
        ("ix_marketplace_shop_capabilities_taxonomy_release_id", "marketplace_shop_capabilities", ["taxonomy_release_id"]),
        ("ix_marketplace_shop_capabilities_normalized_description", "marketplace_shop_capabilities", ["normalized_description"]),
        ("ix_marketplace_shop_capabilities_role_code", "marketplace_shop_capabilities", ["role_code"]),
        ("ix_marketplace_shop_capabilities_mapping_status", "marketplace_shop_capabilities", ["mapping_status"]),
        ("ix_marketplace_shop_capabilities_is_active", "marketplace_shop_capabilities", ["is_active"]),
        ("ix_marketplace_shop_capabilities_created_by_user_id", "marketplace_shop_capabilities", ["created_by_user_id"]),
        ("ix_marketplace_shop_capability_availability_id", "marketplace_shop_capability_availability", ["id"]),
        ("ix_marketplace_shop_capability_availability_capability_id", "marketplace_shop_capability_availability", ["capability_id"]),
        ("ix_marketplace_shop_capability_availability_availability_status", "marketplace_shop_capability_availability", ["availability_status"]),
        ("ix_marketplace_shop_capability_coverage_lookup_v1", "marketplace_shop_capability_coverage", ["scope_type", "country_code", "region_name", "locality_name"]),
        ("ix_marketplace_shop_capability_coverage_id", "marketplace_shop_capability_coverage", ["id"]),
        ("ix_marketplace_shop_capability_coverage_capability_id", "marketplace_shop_capability_coverage", ["capability_id"]),
        ("ix_marketplace_shop_capability_coverage_scope_type", "marketplace_shop_capability_coverage", ["scope_type"]),
        ("ix_marketplace_shop_capability_coverage_country_code", "marketplace_shop_capability_coverage", ["country_code"]),
        ("ix_marketplace_shop_capability_coverage_region_name", "marketplace_shop_capability_coverage", ["region_name"]),
        ("ix_marketplace_shop_capability_coverage_locality_name", "marketplace_shop_capability_coverage", ["locality_name"]),
        ("ix_marketplace_product_capability_concept_v1", "marketplace_product_capabilities", ["concept_id", "mapping_status"]),
        ("ix_marketplace_product_capabilities_id", "marketplace_product_capabilities", ["id"]),
        ("ix_marketplace_product_capabilities_product_id", "marketplace_product_capabilities", ["product_id"]),
        ("ix_marketplace_product_capabilities_concept_id", "marketplace_product_capabilities", ["concept_id"]),
        ("ix_marketplace_product_capabilities_taxonomy_release_id", "marketplace_product_capabilities", ["taxonomy_release_id"]),
        ("ix_marketplace_product_capabilities_mapped_by_user_id", "marketplace_product_capabilities", ["mapped_by_user_id"]),
    )
    for name, table_name, columns in indexes:
        op.create_index(name, table_name, columns)
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        _install_postgresql_immutability_guards()


def downgrade() -> None:
    bind = op.get_bind()
    tables = (
        "commerce_taxonomy_releases",
        "commerce_taxonomy_concepts",
        "commerce_taxonomy_proposals",
        "marketplace_shop_capabilities",
        "marketplace_product_capabilities",
    )
    populated = []
    inspector = sa.inspect(bind)
    for table_name in tables:
        if inspector.has_table(table_name):
            count = bind.execute(sa.text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar() or 0
            if int(count) > 0:
                populated.append(table_name)
    if populated:
        raise RuntimeError(
            "Unsafe commerce taxonomy rollback refused because additive tables contain data: "
            + ", ".join(populated)
        )

    if bind.dialect.name == "postgresql":
        op.execute("DROP FUNCTION IF EXISTS commerce_taxonomy_release_immutable_v1() CASCADE")
        op.execute("DROP FUNCTION IF EXISTS commerce_taxonomy_concept_immutable_v1() CASCADE")
        op.execute("DROP FUNCTION IF EXISTS commerce_taxonomy_child_immutable_v1() CASCADE")

    for table_name in (
        "marketplace_product_capabilities",
        "marketplace_shop_capability_coverage",
        "marketplace_shop_capability_availability",
        "marketplace_shop_capabilities",
        "commerce_taxonomy_proposals",
        "commerce_taxonomy_redirects",
        "commerce_taxonomy_terms",
        "commerce_taxonomy_concept_versions",
        "commerce_taxonomy_concepts",
        "commerce_taxonomy_releases",
    ):
        op.drop_table(table_name)
