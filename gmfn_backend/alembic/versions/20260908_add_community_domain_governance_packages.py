"""Add immutable Community Domain governance packages.

Revision ID: 20260908_comm_domain_gov_packages
Revises: 20260824_support_cases
Create Date: 2026-09-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260908_comm_domain_gov_packages"
down_revision: Union[str, Sequence[str], None] = "20260824_support_cases"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(index.get("name") == index_name for index in sa.inspect(bind).get_indexes(table_name))


def _create_index(bind, table_name: str, index_name: str, columns: list[str], *, unique: bool = False) -> None:
    if not _has_index(bind, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def _drop_index(bind, table_name: str, index_name: str) -> None:
    if _has_index(bind, table_name, index_name):
        op.drop_index(index_name, table_name=table_name)


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, "community_domain_governance_packages"):
        op.create_table(
            "community_domain_governance_packages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_domain_id", sa.Integer(), nullable=False),
            sa.Column("package_key", sa.String(length=96), server_default="domain.governance_package", nullable=False),
            sa.Column("version", sa.Integer(), server_default="1", nullable=False),
            sa.Column("status", sa.String(length=24), server_default="locked", nullable=False),
            sa.Column("source_policy_id", sa.Integer(), nullable=True),
            sa.Column("action_review_id", sa.Integer(), nullable=True),
            sa.Column("previous_package_id", sa.Integer(), nullable=True),
            sa.Column("package_hash", sa.String(length=64), nullable=False),
            sa.Column("package_summary", sa.Text(), nullable=True),
            sa.Column("package_json", sa.Text(), nullable=False),
            sa.Column("locked_by_user_id", sa.Integer(), nullable=True),
            sa.Column("locked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["action_review_id"], ["community_domain_action_reviews.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["community_domain_id"], ["community_domains.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["locked_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["previous_package_id"], ["community_domain_governance_packages.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["source_policy_id"], ["community_domain_policies.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("community_domain_id", "package_key", "version", name="uq_comm_domain_gov_pkg_domain_key_version"),
        )

    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_id", ["id"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_domain_id", ["community_domain_id"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_package_key", ["package_key"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_status", ["status"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_source_policy", ["source_policy_id"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_action_review", ["action_review_id"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_previous", ["previous_package_id"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_locker", ["locked_by_user_id"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_locked_at", ["locked_at"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_domain_key", ["community_domain_id", "package_key"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_domain_status", ["community_domain_id", "status"])
    _create_index(bind, "community_domain_governance_packages", "ix_comm_domain_gov_pkg_hash", ["package_hash"])


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "community_domain_governance_packages"):
        for index_name in (
            "ix_comm_domain_gov_pkg_hash",
            "ix_comm_domain_gov_pkg_domain_status",
            "ix_comm_domain_gov_pkg_domain_key",
            "ix_comm_domain_gov_pkg_locked_at",
            "ix_comm_domain_gov_pkg_locker",
            "ix_comm_domain_gov_pkg_previous",
            "ix_comm_domain_gov_pkg_action_review",
            "ix_comm_domain_gov_pkg_source_policy",
            "ix_comm_domain_gov_pkg_status",
            "ix_comm_domain_gov_pkg_package_key",
            "ix_comm_domain_gov_pkg_domain_id",
            "ix_comm_domain_gov_pkg_id",
        ):
            _drop_index(bind, "community_domain_governance_packages", index_name)
        op.drop_table("community_domain_governance_packages")
