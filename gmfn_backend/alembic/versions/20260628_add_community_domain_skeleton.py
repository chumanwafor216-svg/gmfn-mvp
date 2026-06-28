"""add community domain skeleton

Revision ID: 20260628_community_domain_skeleton
Revises: 20260627_add_community_followers
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260628_community_domain_skeleton"
down_revision = "20260627_add_community_followers"
branch_labels = None
depends_on = None

DOMAIN_TABLE = "community_domains"
NODE_TABLE = "community_nodes"


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

    if not _has_table(bind, DOMAIN_TABLE):
        op.create_table(
            DOMAIN_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("domain_name", sa.String(length=80), nullable=False),
            sa.Column("display_name", sa.String(length=160), nullable=False),
            sa.Column(
                "domain_type",
                sa.String(length=64),
                nullable=False,
                server_default="generic_association",
            ),
            sa.Column(
                "template_key",
                sa.String(length=64),
                nullable=False,
                server_default="generic_association",
            ),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="draft"),
            sa.Column(
                "verification_status",
                sa.String(length=24),
                nullable=False,
                server_default="unverified",
            ),
            sa.Column("country", sa.String(length=80), nullable=True),
            sa.Column("state", sa.String(length=120), nullable=True),
            sa.Column("public_profile", sa.Text(), nullable=True),
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
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("domain_name", name="uq_community_domains_domain_name"),
        )

    domain_indexes = (
        ("ix_community_domains_id", ["id"]),
        ("ix_community_domains_domain_name", ["domain_name"]),
        ("ix_community_domains_owner_user_id", ["owner_user_id"]),
        ("ix_community_domains_clan_id", ["clan_id"]),
        ("ix_community_domains_status", ["status"]),
        ("ix_community_domains_domain_type", ["domain_type"]),
        ("ix_community_domains_verification_status", ["verification_status"]),
        ("ix_community_domains_owner_status", ["owner_user_id", "status"]),
        ("ix_community_domains_type_status", ["domain_type", "status"]),
    )
    for index_name, columns in domain_indexes:
        if not _has_index(bind, DOMAIN_TABLE, index_name):
            op.create_index(index_name, DOMAIN_TABLE, columns, unique=False)

    if not _has_table(bind, NODE_TABLE):
        op.create_table(
            NODE_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_domain_id", sa.Integer(), nullable=False),
            sa.Column("parent_node_id", sa.Integer(), nullable=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("node_type", sa.String(length=64), nullable=False, server_default="root"),
            sa.Column(
                "node_kind",
                sa.String(length=64),
                nullable=False,
                server_default="administrative",
            ),
            sa.Column("path", sa.String(length=512), nullable=True),
            sa.Column("depth", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "visibility_policy",
                sa.String(length=32),
                nullable=False,
                server_default="members",
            ),
            sa.Column(
                "inherits_parent_policy",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="active"),
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
                ["parent_node_id"],
                ["community_nodes.id"],
                ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "community_domain_id",
                "parent_node_id",
                "name",
                name="uq_comm_nodes_domain_parent_name",
            ),
        )

    node_indexes = (
        ("ix_community_nodes_id", ["id"]),
        ("ix_community_nodes_community_domain_id", ["community_domain_id"]),
        ("ix_community_nodes_parent_node_id", ["parent_node_id"]),
        ("ix_community_nodes_node_kind", ["node_kind"]),
        ("ix_community_nodes_status", ["status"]),
        ("ix_comm_nodes_domain_parent", ["community_domain_id", "parent_node_id"]),
        ("ix_comm_nodes_domain_kind", ["community_domain_id", "node_kind"]),
        ("ix_comm_nodes_domain_path", ["community_domain_id", "path"]),
    )
    for index_name, columns in node_indexes:
        if not _has_index(bind, NODE_TABLE, index_name):
            op.create_index(index_name, NODE_TABLE, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, NODE_TABLE):
        for index_name in (
            "ix_comm_nodes_domain_path",
            "ix_comm_nodes_domain_kind",
            "ix_comm_nodes_domain_parent",
            "ix_community_nodes_status",
            "ix_community_nodes_node_kind",
            "ix_community_nodes_parent_node_id",
            "ix_community_nodes_community_domain_id",
            "ix_community_nodes_id",
        ):
            if _has_index(bind, NODE_TABLE, index_name):
                op.drop_index(index_name, table_name=NODE_TABLE)
        op.drop_table(NODE_TABLE)

    if _has_table(bind, DOMAIN_TABLE):
        for index_name in (
            "ix_community_domains_type_status",
            "ix_community_domains_owner_status",
            "ix_community_domains_verification_status",
            "ix_community_domains_domain_type",
            "ix_community_domains_status",
            "ix_community_domains_clan_id",
            "ix_community_domains_owner_user_id",
            "ix_community_domains_domain_name",
            "ix_community_domains_id",
        ):
            if _has_index(bind, DOMAIN_TABLE, index_name):
                op.drop_index(index_name, table_name=DOMAIN_TABLE)
        op.drop_table(DOMAIN_TABLE)
