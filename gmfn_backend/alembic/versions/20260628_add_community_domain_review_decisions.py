"""add community domain review decisions

Revision ID: 20260628_comm_domain_review_decisions
Revises: 20260628_comm_domain_policy_reviews
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260628_comm_domain_review_decisions"
down_revision = "20260628_comm_domain_policy_reviews"
branch_labels = None
depends_on = None

TABLE = "community_domain_action_review_decisions"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    if not _has_table(bind, table_name):
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE):
        op.create_table(
            TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("action_review_id", sa.Integer(), nullable=False),
            sa.Column("community_domain_id", sa.Integer(), nullable=False),
            sa.Column("community_node_id", sa.Integer(), nullable=True),
            sa.Column("decided_by_user_id", sa.Integer(), nullable=False),
            sa.Column("decision", sa.String(length=24), nullable=False),
            sa.Column("decision_note", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.ForeignKeyConstraint(
                ["action_review_id"],
                ["community_domain_action_reviews.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["community_domain_id"],
                ["community_domains.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["community_node_id"],
                ["community_nodes.id"],
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(
                ["decided_by_user_id"],
                ["users.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "action_review_id",
                "decided_by_user_id",
                name="uq_comm_review_decisions_review_user",
            ),
        )

    indexes = (
        ("ix_comm_review_decisions_review", ["action_review_id"]),
        ("ix_comm_review_decisions_domain", ["community_domain_id"]),
        ("ix_comm_review_decisions_node", ["community_node_id"]),
        ("ix_comm_review_decisions_decider", ["decided_by_user_id"]),
        ("ix_comm_review_decisions_decision", ["decision"]),
    )
    for index_name, columns in indexes:
        if not _has_index(bind, TABLE, index_name):
            op.create_index(index_name, TABLE, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, TABLE):
        for index_name in (
            "ix_comm_review_decisions_decision",
            "ix_comm_review_decisions_decider",
            "ix_comm_review_decisions_node",
            "ix_comm_review_decisions_domain",
            "ix_comm_review_decisions_review",
        ):
            if _has_index(bind, TABLE, index_name):
                op.drop_index(index_name, table_name=TABLE)
        op.drop_table(TABLE)
