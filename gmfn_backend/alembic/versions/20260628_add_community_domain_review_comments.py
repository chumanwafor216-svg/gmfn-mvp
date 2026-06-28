"""add community domain review comments

Revision ID: 20260628_comm_domain_review_comments
Revises: 20260628_comm_domain_review_revisions
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260628_comm_domain_review_comments"
down_revision = "20260628_comm_domain_review_revisions"
branch_labels = None
depends_on = None

TABLE = "community_domain_action_review_comments"


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
            sa.Column("author_user_id", sa.Integer(), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
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
            sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = (
        ("ix_comm_review_comments_review", ["action_review_id"]),
        ("ix_comm_review_comments_domain", ["community_domain_id"]),
        ("ix_comm_review_comments_node", ["community_node_id"]),
        ("ix_comm_review_comments_author", ["author_user_id"]),
        ("ix_comm_review_comments_created", ["action_review_id", "created_at"]),
    )
    for index_name, columns in indexes:
        if not _has_index(bind, TABLE, index_name):
            op.create_index(index_name, TABLE, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, TABLE):
        for index_name in (
            "ix_comm_review_comments_created",
            "ix_comm_review_comments_author",
            "ix_comm_review_comments_node",
            "ix_comm_review_comments_domain",
            "ix_comm_review_comments_review",
        ):
            if _has_index(bind, TABLE, index_name):
                op.drop_index(index_name, table_name=TABLE)
        op.drop_table(TABLE)
