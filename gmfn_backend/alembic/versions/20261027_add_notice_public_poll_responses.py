"""add aggregate-only public notice poll responses

Revision ID: 20261027_notice_public_poll
Revises: 20261025_ad_share
Create Date: 2026-10-27
"""

from alembic import op
import sqlalchemy as sa


revision = "20261027_notice_public_poll"
down_revision = "20261025_ad_share"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "community_notice_public_poll_responses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("notice_event_id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=True),
        sa.Column("responder_key_hash", sa.String(length=64), nullable=False),
        sa.Column("options_json", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["notice_event_id"],
            ["trust_events.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "notice_event_id",
            "responder_key_hash",
            name="uq_notice_public_poll_notice_responder_v1",
        ),
    )
    op.create_index(
        "ix_community_notice_public_poll_responses_notice_event_id",
        "community_notice_public_poll_responses",
        ["notice_event_id"],
    )
    op.create_index(
        "ix_community_notice_public_poll_responses_clan_id",
        "community_notice_public_poll_responses",
        ["clan_id"],
    )
    op.create_index(
        "ix_notice_public_poll_notice_created_v1",
        "community_notice_public_poll_responses",
        ["notice_event_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_notice_public_poll_notice_created_v1",
        table_name="community_notice_public_poll_responses",
    )
    op.drop_index(
        "ix_community_notice_public_poll_responses_clan_id",
        table_name="community_notice_public_poll_responses",
    )
    op.drop_index(
        "ix_community_notice_public_poll_responses_notice_event_id",
        table_name="community_notice_public_poll_responses",
    )
    op.drop_table("community_notice_public_poll_responses")
