"""Add Spotlight payload retention timestamp and media deletion retry queue.

Revision ID: 20261018_spotlight_payload_retention_v1
Revises: 20261017_member_credit_profile_permissions_v1
"""

from alembic import op
import sqlalchemy as sa


revision = "20261018_spotlight_payload_retention_v1"
down_revision = "20261017_member_credit_profile_permissions_v1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "spotlight_campaigns",
        sa.Column("payload_compacted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_spotlight_campaigns_payload_compacted_at",
        "spotlight_campaigns",
        ["payload_compacted_at"],
        unique=False,
    )
    op.create_table(
        "marketplace_media_deletion_tasks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("canonical_key", sa.String(length=760), nullable=False),
        sa.Column("media_url", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=80), server_default="marketplace", nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("canonical_key", name="uq_marketplace_media_deletion_tasks_canonical_key"),
    )
    op.create_index(
        "ix_marketplace_media_deletion_tasks_id",
        "marketplace_media_deletion_tasks",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_marketplace_media_deletion_tasks_source",
        "marketplace_media_deletion_tasks",
        ["source"],
        unique=False,
    )
    op.create_index(
        "ix_marketplace_media_deletion_tasks_updated_at",
        "marketplace_media_deletion_tasks",
        ["updated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_marketplace_media_deletion_tasks_updated_at",
        table_name="marketplace_media_deletion_tasks",
    )
    op.drop_index(
        "ix_marketplace_media_deletion_tasks_source",
        table_name="marketplace_media_deletion_tasks",
    )
    op.drop_index(
        "ix_marketplace_media_deletion_tasks_id",
        table_name="marketplace_media_deletion_tasks",
    )
    op.drop_table("marketplace_media_deletion_tasks")
    op.drop_index(
        "ix_spotlight_campaigns_payload_compacted_at",
        table_name="spotlight_campaigns",
    )
    op.drop_column("spotlight_campaigns", "payload_compacted_at")
