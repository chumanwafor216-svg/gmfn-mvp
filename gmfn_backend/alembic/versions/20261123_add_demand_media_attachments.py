"""add private demand photo, video, and link attachments

Revision ID: 20261123_demand_media
Revises: 20261121_spotlight_slice4a_completion
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261123_demand_media"
down_revision: Union[str, Sequence[str], None] = "20261121_spotlight_slice4a_completion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "demand_media_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("marketplace_request_id", sa.Integer(), nullable=True),
        sa.Column("response_id", sa.Integer(), nullable=True),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("storage_key", sa.String(length=180), nullable=True),
        sa.Column("external_url", sa.String(length=2000), nullable=True),
        sa.Column("original_filename", sa.String(length=180), nullable=True),
        sa.Column("mime_type", sa.String(length=80), nullable=True),
        sa.Column("byte_size", sa.Integer(), nullable=True),
        sa.Column("duration_seconds", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_by_user_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(marketplace_request_id IS NOT NULL AND response_id IS NULL) OR "
            "(marketplace_request_id IS NULL AND response_id IS NOT NULL)",
            name="ck_demand_media_exactly_one_parent_v1",
        ),
        sa.CheckConstraint(
            "(storage_key IS NOT NULL AND external_url IS NULL) OR "
            "(storage_key IS NULL AND external_url IS NOT NULL)",
            name="ck_demand_media_one_source_v1",
        ),
        sa.ForeignKeyConstraint(
            ["marketplace_request_id"],
            ["marketplace_requests.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["response_id"],
            ["marketplace_request_responses.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["deleted_by_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    for column in (
        "id",
        "marketplace_request_id",
        "response_id",
        "created_by_user_id",
        "deleted_at",
    ):
        op.create_index(
            f"ix_demand_media_attachments_{column}",
            "demand_media_attachments",
            [column],
            unique=False,
        )


def downgrade() -> None:
    op.drop_table("demand_media_attachments")
