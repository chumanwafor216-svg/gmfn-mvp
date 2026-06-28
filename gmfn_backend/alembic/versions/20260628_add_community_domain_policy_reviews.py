"""add community domain policy reviews

Revision ID: 20260628_comm_domain_policy_reviews
Revises: 20260628_comm_domain_memberships
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260628_comm_domain_policy_reviews"
down_revision = "20260628_comm_domain_memberships"
branch_labels = None
depends_on = None

POLICY_TABLE = "community_domain_policies"
REVIEW_TABLE = "community_domain_action_reviews"


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

    if not _has_table(bind, POLICY_TABLE):
        op.create_table(
            POLICY_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_domain_id", sa.Integer(), nullable=False),
            sa.Column("community_node_id", sa.Integer(), nullable=True),
            sa.Column("policy_key", sa.String(length=96), nullable=False),
            sa.Column("action_key", sa.String(length=96), nullable=False),
            sa.Column("scope_type", sa.String(length=24), nullable=False, server_default="domain"),
            sa.Column(
                "review_mode",
                sa.String(length=48),
                nullable=False,
                server_default="domain_admin_review",
            ),
            sa.Column("required_role", sa.String(length=48), nullable=True),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="active"),
            sa.Column("policy_summary", sa.Text(), nullable=True),
            sa.Column("config_json", sa.Text(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=False),
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
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
                ondelete="SET NULL",
            ),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "community_domain_id",
                "policy_key",
                name="uq_comm_domain_policies_domain_key",
            ),
        )

    policy_indexes = (
        ("ix_community_domain_policies_id", ["id"]),
        ("ix_comm_domain_policies_community_domain_id", ["community_domain_id"]),
        ("ix_comm_domain_policies_community_node_id", ["community_node_id"]),
        ("ix_comm_domain_policies_action_key", ["action_key"]),
        ("ix_comm_domain_policies_scope_type", ["scope_type"]),
        ("ix_comm_domain_policies_review_mode", ["review_mode"]),
        ("ix_comm_domain_policies_status", ["status"]),
        ("ix_comm_domain_policies_created_by_user_id", ["created_by_user_id"]),
        ("ix_comm_domain_policies_updated_by_user_id", ["updated_by_user_id"]),
        ("ix_comm_domain_policies_domain_status", ["community_domain_id", "status"]),
        ("ix_comm_domain_policies_action", ["community_domain_id", "action_key"]),
        ("ix_comm_domain_policies_node", ["community_node_id"]),
    )
    for index_name, columns in policy_indexes:
        if not _has_index(bind, POLICY_TABLE, index_name):
            op.create_index(index_name, POLICY_TABLE, columns, unique=False)

    if not _has_table(bind, REVIEW_TABLE):
        op.create_table(
            REVIEW_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_domain_id", sa.Integer(), nullable=False),
            sa.Column("community_node_id", sa.Integer(), nullable=True),
            sa.Column("policy_id", sa.Integer(), nullable=True),
            sa.Column("action_key", sa.String(length=96), nullable=False),
            sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
            sa.Column("subject_user_id", sa.Integer(), nullable=True),
            sa.Column("decided_by_user_id", sa.Integer(), nullable=True),
            sa.Column("target_type", sa.String(length=64), nullable=True),
            sa.Column("target_id", sa.String(length=96), nullable=True),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="pending"),
            sa.Column("decision", sa.String(length=24), nullable=True),
            sa.Column("request_note", sa.Text(), nullable=True),
            sa.Column("decision_note", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.Text(), nullable=True),
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
            sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
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
            sa.ForeignKeyConstraint(["policy_id"], ["community_domain_policies.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["decided_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    review_indexes = (
        ("ix_community_domain_action_reviews_id", ["id"]),
        ("ix_comm_action_reviews_community_domain_id", ["community_domain_id"]),
        ("ix_comm_action_reviews_community_node_id", ["community_node_id"]),
        ("ix_comm_action_reviews_policy_id", ["policy_id"]),
        ("ix_comm_action_reviews_action_key", ["action_key"]),
        ("ix_comm_action_reviews_requested_by_user_id", ["requested_by_user_id"]),
        ("ix_comm_action_reviews_subject_user_id", ["subject_user_id"]),
        ("ix_comm_action_reviews_decided_by_user_id", ["decided_by_user_id"]),
        ("ix_comm_action_reviews_status", ["status"]),
        ("ix_comm_action_reviews_domain_status", ["community_domain_id", "status"]),
        ("ix_comm_action_reviews_node_status", ["community_node_id", "status"]),
        ("ix_comm_action_reviews_policy_status", ["policy_id", "status"]),
        ("ix_comm_action_reviews_requester", ["requested_by_user_id", "created_at"]),
        ("ix_comm_action_reviews_action", ["community_domain_id", "action_key"]),
    )
    for index_name, columns in review_indexes:
        if not _has_index(bind, REVIEW_TABLE, index_name):
            op.create_index(index_name, REVIEW_TABLE, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, REVIEW_TABLE):
        for index_name in (
            "ix_comm_action_reviews_action",
            "ix_comm_action_reviews_requester",
            "ix_comm_action_reviews_policy_status",
            "ix_comm_action_reviews_node_status",
            "ix_comm_action_reviews_domain_status",
            "ix_comm_action_reviews_status",
            "ix_comm_action_reviews_decided_by_user_id",
            "ix_comm_action_reviews_subject_user_id",
            "ix_comm_action_reviews_requested_by_user_id",
            "ix_comm_action_reviews_action_key",
            "ix_comm_action_reviews_policy_id",
            "ix_comm_action_reviews_community_node_id",
            "ix_comm_action_reviews_community_domain_id",
            "ix_community_domain_action_reviews_id",
        ):
            if _has_index(bind, REVIEW_TABLE, index_name):
                op.drop_index(index_name, table_name=REVIEW_TABLE)
        op.drop_table(REVIEW_TABLE)

    if _has_table(bind, POLICY_TABLE):
        for index_name in (
            "ix_comm_domain_policies_node",
            "ix_comm_domain_policies_action",
            "ix_comm_domain_policies_domain_status",
            "ix_comm_domain_policies_updated_by_user_id",
            "ix_comm_domain_policies_created_by_user_id",
            "ix_comm_domain_policies_status",
            "ix_comm_domain_policies_review_mode",
            "ix_comm_domain_policies_scope_type",
            "ix_comm_domain_policies_action_key",
            "ix_comm_domain_policies_community_node_id",
            "ix_comm_domain_policies_community_domain_id",
            "ix_community_domain_policies_id",
        ):
            if _has_index(bind, POLICY_TABLE, index_name):
                op.drop_index(index_name, table_name=POLICY_TABLE)
        op.drop_table(POLICY_TABLE)
