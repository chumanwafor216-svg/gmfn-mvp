"""add community notice voice attachments

Revision ID: 20261106_notice_voice
Revises: 20261106_shop_voice
Create Date: 2026-11-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261106_notice_voice"
down_revision: Union[str, Sequence[str], None] = "20261106_shop_voice"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "community_notice_voice_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_kind", sa.String(length=24), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.Column("source_submission_event_id", sa.Integer(), nullable=True),
        sa.Column("clan_id", sa.Integer(), nullable=False),
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
            "event_kind IN ('notice', 'submission')",
            name="ck_community_notice_voice_event_kind_v1",
        ),
        sa.ForeignKeyConstraint(["event_id"], ["trust_events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_submission_event_id"], ["trust_events.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["deleted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id", name="uq_community_notice_voice_event_v1"),
        sa.UniqueConstraint("storage_key", name="uq_community_notice_voice_storage_key_v1"),
    )
    for column in (
        "id",
        "event_kind",
        "event_id",
        "source_submission_event_id",
        "clan_id",
        "created_by_user_id",
        "deleted_at",
        "deleted_by_user_id",
        "created_at",
        "updated_at",
    ):
        op.create_index(
            f"ix_community_notice_voice_attachments_{column}",
            "community_notice_voice_attachments",
            [column],
            unique=False,
        )
    op.create_index(
        "ix_community_notice_voice_clan_kind",
        "community_notice_voice_attachments",
        ["clan_id", "event_kind"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("community_notice_voice_attachments")
