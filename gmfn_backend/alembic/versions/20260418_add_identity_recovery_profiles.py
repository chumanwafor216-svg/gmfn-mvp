"""add identity recovery profiles

Revision ID: 20260418_add_identity_recovery_profiles
Revises: 20260418_add_identity_risk_tables
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_identity_recovery_profiles"
down_revision = "20260418_add_identity_risk_tables"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "identity_recovery_profiles"):
        op.create_table(
            "identity_recovery_profiles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("prompt_one", sa.String(length=180), nullable=False),
            sa.Column("answer_hash_one", sa.String(length=128), nullable=False),
            sa.Column("prompt_two", sa.String(length=180), nullable=False),
            sa.Column("answer_hash_two", sa.String(length=128), nullable=False),
            sa.Column("prompt_three", sa.String(length=180), nullable=False),
            sa.Column("answer_hash_three", sa.String(length=128), nullable=False),
            sa.Column("configured_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("failed_attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", name="uq_identity_recovery_profiles_user_id"),
        )
    if not _has_index(bind, "identity_recovery_profiles", "ix_identity_recovery_profiles_user_id"):
        op.create_index(
            "ix_identity_recovery_profiles_user_id",
            "identity_recovery_profiles",
            ["user_id"],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_index(bind, "identity_recovery_profiles", "ix_identity_recovery_profiles_user_id"):
        op.drop_index("ix_identity_recovery_profiles_user_id", table_name="identity_recovery_profiles")
    if _has_table(bind, "identity_recovery_profiles"):
        op.drop_table("identity_recovery_profiles")
