"""add community domain memberships

Revision ID: 20260628_comm_domain_memberships
Revises: 20260628_community_domain_skeleton
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260628_comm_domain_memberships"
down_revision = "20260628_community_domain_skeleton"
branch_labels = None
depends_on = None

DOMAIN_MEMBERS_TABLE = "community_domain_memberships"
NODE_MEMBERS_TABLE = "community_node_memberships"


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

    if not _has_table(bind, DOMAIN_MEMBERS_TABLE):
        op.create_table(
            DOMAIN_MEMBERS_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_domain_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False, server_default="member"),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="active"),
            sa.Column("title", sa.String(length=120), nullable=True),
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
                ["community_domain_id"],
                ["community_domains.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "community_domain_id",
                "user_id",
                name="uq_comm_domain_members_domain_user",
            ),
        )

    domain_indexes = (
        ("ix_community_domain_memberships_id", ["id"]),
        ("ix_comm_domain_members_community_domain_id", ["community_domain_id"]),
        ("ix_comm_domain_members_user_id", ["user_id"]),
        ("ix_comm_domain_members_role", ["role"]),
        ("ix_comm_domain_members_status", ["status"]),
        ("ix_comm_domain_members_domain_status", ["community_domain_id", "status"]),
        ("ix_comm_domain_members_user_status", ["user_id", "status"]),
        ("ix_comm_domain_members_domain_role", ["community_domain_id", "role"]),
    )
    for index_name, columns in domain_indexes:
        if not _has_index(bind, DOMAIN_MEMBERS_TABLE, index_name):
            op.create_index(index_name, DOMAIN_MEMBERS_TABLE, columns, unique=False)

    if not _has_table(bind, NODE_MEMBERS_TABLE):
        op.create_table(
            NODE_MEMBERS_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_domain_id", sa.Integer(), nullable=False),
            sa.Column("community_node_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False, server_default="member"),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="active"),
            sa.Column("title", sa.String(length=120), nullable=True),
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
                ["community_domain_id"],
                ["community_domains.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["community_node_id"],
                ["community_nodes.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "community_node_id",
                "user_id",
                name="uq_comm_node_members_node_user",
            ),
        )

    node_indexes = (
        ("ix_community_node_memberships_id", ["id"]),
        ("ix_comm_node_members_community_domain_id", ["community_domain_id"]),
        ("ix_comm_node_members_community_node_id", ["community_node_id"]),
        ("ix_comm_node_members_user_id", ["user_id"]),
        ("ix_comm_node_members_role", ["role"]),
        ("ix_comm_node_members_status", ["status"]),
        ("ix_comm_node_members_domain_status", ["community_domain_id", "status"]),
        ("ix_comm_node_members_node_status", ["community_node_id", "status"]),
        ("ix_comm_node_members_user_status", ["user_id", "status"]),
        ("ix_comm_node_members_node_role", ["community_node_id", "role"]),
    )
    for index_name, columns in node_indexes:
        if not _has_index(bind, NODE_MEMBERS_TABLE, index_name):
            op.create_index(index_name, NODE_MEMBERS_TABLE, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, NODE_MEMBERS_TABLE):
        for index_name in (
            "ix_comm_node_members_node_role",
            "ix_comm_node_members_user_status",
            "ix_comm_node_members_node_status",
            "ix_comm_node_members_domain_status",
            "ix_comm_node_members_status",
            "ix_comm_node_members_role",
            "ix_comm_node_members_user_id",
            "ix_comm_node_members_community_node_id",
            "ix_comm_node_members_community_domain_id",
            "ix_community_node_memberships_id",
        ):
            if _has_index(bind, NODE_MEMBERS_TABLE, index_name):
                op.drop_index(index_name, table_name=NODE_MEMBERS_TABLE)
        op.drop_table(NODE_MEMBERS_TABLE)

    if _has_table(bind, DOMAIN_MEMBERS_TABLE):
        for index_name in (
            "ix_comm_domain_members_domain_role",
            "ix_comm_domain_members_user_status",
            "ix_comm_domain_members_domain_status",
            "ix_comm_domain_members_status",
            "ix_comm_domain_members_role",
            "ix_comm_domain_members_user_id",
            "ix_comm_domain_members_community_domain_id",
            "ix_community_domain_memberships_id",
        ):
            if _has_index(bind, DOMAIN_MEMBERS_TABLE, index_name):
                op.drop_index(index_name, table_name=DOMAIN_MEMBERS_TABLE)
        op.drop_table(DOMAIN_MEMBERS_TABLE)
