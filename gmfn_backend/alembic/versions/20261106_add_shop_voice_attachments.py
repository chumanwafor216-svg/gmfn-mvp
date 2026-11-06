"""add shop welcome, update, and product voice attachments

Revision ID: 20261106_shop_voice
Revises: 20261106_demand_voice_delete
Create Date: 2026-11-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261106_shop_voice"
down_revision: Union[str, Sequence[str], None] = "20261106_demand_voice_delete"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "shop_voice_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("parent_kind", sa.String(length=32), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=False),
        sa.Column("shop_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(length=160), nullable=False),
        sa.Column("original_filename", sa.String(length=180), nullable=True),
        sa.Column("mime_type", sa.String(length=80), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "parent_kind IN ('shop_welcome', 'shop_update', 'product')",
            name="ck_shop_voice_parent_kind_v1",
        ),
        sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["deleted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parent_kind", "parent_id", name="uq_shop_voice_parent_v1"),
        sa.UniqueConstraint("storage_key", name="uq_shop_voice_storage_key_v1"),
    )
    for column in (
        "id",
        "parent_kind",
        "parent_id",
        "shop_id",
        "created_by_user_id",
        "deleted_at",
        "deleted_by_user_id",
        "created_at",
        "updated_at",
    ):
        op.create_index(
            f"ix_shop_voice_attachments_{column}",
            "shop_voice_attachments",
            [column],
            unique=False,
        )
    op.create_index(
        "ix_shop_voice_shop_kind",
        "shop_voice_attachments",
        ["shop_id", "parent_kind"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("shop_voice_attachments")
