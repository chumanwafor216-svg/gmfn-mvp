"""add community confirmation decisions

Revision ID: 20260515_add_community_confirmation_decisions
Revises: 20260515_add_community_confirmation_relay
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260515_add_community_confirmation_decisions"
down_revision = "20260515_add_community_confirmation_relay"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _create_index_if_missing(
    bind,
    index_name: str,
    table_name: str,
    columns: list[str],
    *,
    unique: bool = False,
) -> None:
    if _has_table(bind, table_name) and not _has_index(bind, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "community_confirmation_decisions"):
        op.create_table(
            "community_confirmation_decisions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("request_id", sa.Integer(), nullable=False),
            sa.Column("community_id", sa.Integer(), nullable=False),
            sa.Column("subject_user_id", sa.Integer(), nullable=False),
            sa.Column("actor_user_id", sa.Integer(), nullable=False),
            sa.Column("decision", sa.String(length=32), nullable=False),
            sa.Column("amount_band", sa.String(length=32), nullable=True),
            sa.Column("issue_reported", sa.Boolean(), nullable=True),
            sa.Column("settled", sa.Boolean(), nullable=True),
            sa.Column("status", sa.String(length=24), server_default="recorded", nullable=False),
            sa.Column("decision_note", sa.Text(), nullable=True),
            sa.Column("confidence_snapshot_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["community_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["request_id"], ["community_confirmation_requests.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "request_id",
                "actor_user_id",
                name="uq_community_confirmation_decision_actor_once",
            ),
        )

    _create_index_if_missing(bind, "ix_community_confirmation_decisions_id", "community_confirmation_decisions", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_decisions_request_id", "community_confirmation_decisions", ["request_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_decisions_community_id", "community_confirmation_decisions", ["community_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_decisions_subject_user_id", "community_confirmation_decisions", ["subject_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_decisions_actor_user_id", "community_confirmation_decisions", ["actor_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_decisions_decision", "community_confirmation_decisions", ["decision"])
    _create_index_if_missing(bind, "ix_community_confirmation_decisions_status", "community_confirmation_decisions", ["status"])
    _create_index_if_missing(bind, "ix_community_confirmation_decisions_created_at", "community_confirmation_decisions", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "community_confirmation_decisions"):
        op.drop_table("community_confirmation_decisions")
