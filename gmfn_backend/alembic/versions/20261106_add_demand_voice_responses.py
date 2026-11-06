"""add protected demand voice, replies, history, and repost links

Revision ID: 20261106_demand_voice
Revises: 20261106_secure_activation
Create Date: 2026-11-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261106_demand_voice"
down_revision: Union[str, Sequence[str], None] = "20261106_secure_activation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("marketplace_requests") as batch_op:
        batch_op.add_column(sa.Column("reposted_from_request_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("client_request_id", sa.String(length=80), nullable=True))
        batch_op.add_column(
            sa.Column(
                "show_sender_photo",
                sa.Boolean(),
                server_default="0",
                nullable=False,
            )
        )
        batch_op.create_foreign_key(
            "fk_marketplace_request_reposted_from_v1",
            "marketplace_requests",
            ["reposted_from_request_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_unique_constraint(
            "uq_marketplace_request_user_client_id_v1",
            ["user_id", "client_request_id"],
        )
        batch_op.create_index(
            "ix_marketplace_requests_reposted_from_request_id",
            ["reposted_from_request_id"],
            unique=False,
        )

    op.create_table(
        "marketplace_request_responses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("marketplace_request_id", sa.Integer(), nullable=False),
        sa.Column("author_user_id", sa.Integer(), nullable=False),
        sa.Column("recipient_user_id", sa.Integer(), nullable=False),
        sa.Column("client_response_id", sa.String(length=80), nullable=False),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column(
            "show_sender_photo",
            sa.Boolean(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["marketplace_request_id"],
            ["marketplace_requests.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["recipient_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "author_user_id",
            "client_response_id",
            name="uq_marketplace_response_author_client_id_v1",
        ),
    )
    op.create_index(
        "ix_marketplace_response_request_pair_v1",
        "marketplace_request_responses",
        ["marketplace_request_id", "author_user_id", "recipient_user_id"],
        unique=False,
    )
    for column in ("id", "marketplace_request_id", "author_user_id", "recipient_user_id", "created_at"):
        op.create_index(
            f"ix_marketplace_request_responses_{column}",
            "marketplace_request_responses",
            [column],
            unique=False,
        )

    op.create_table(
        "marketplace_request_activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("marketplace_request_id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("event_type", sa.String(length=40), nullable=False),
        sa.Column("detail", sa.String(length=240), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["marketplace_request_id"],
            ["marketplace_requests.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("id", "marketplace_request_id", "actor_user_id", "event_type", "created_at"):
        op.create_index(
            f"ix_marketplace_request_activities_{column}",
            "marketplace_request_activities",
            [column],
            unique=False,
        )

    op.create_table(
        "demand_audio_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("marketplace_request_id", sa.Integer(), nullable=True),
        sa.Column("response_id", sa.Integer(), nullable=True),
        sa.Column("storage_key", sa.String(length=160), nullable=False),
        sa.Column("original_filename", sa.String(length=180), nullable=True),
        sa.Column("mime_type", sa.String(length=80), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("duration_seconds", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(marketplace_request_id IS NOT NULL AND response_id IS NULL) OR "
            "(marketplace_request_id IS NULL AND response_id IS NOT NULL)",
            name="ck_demand_audio_exactly_one_parent_v1",
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("marketplace_request_id"),
        sa.UniqueConstraint("response_id"),
        sa.UniqueConstraint("storage_key"),
    )
    for column in ("id", "marketplace_request_id", "response_id", "created_by_user_id"):
        op.create_index(
            f"ix_demand_audio_attachments_{column}",
            "demand_audio_attachments",
            [column],
            unique=False,
        )


def downgrade() -> None:
    op.drop_table("demand_audio_attachments")
    op.drop_table("marketplace_request_activities")
    op.drop_table("marketplace_request_responses")
    with op.batch_alter_table("marketplace_requests") as batch_op:
        batch_op.drop_index("ix_marketplace_requests_reposted_from_request_id")
        batch_op.drop_constraint(
            "uq_marketplace_request_user_client_id_v1",
            type_="unique",
        )
        batch_op.drop_constraint(
            "fk_marketplace_request_reposted_from_v1",
            type_="foreignkey",
        )
        batch_op.drop_column("client_request_id")
        batch_op.drop_column("show_sender_photo")
        batch_op.drop_column("reposted_from_request_id")
