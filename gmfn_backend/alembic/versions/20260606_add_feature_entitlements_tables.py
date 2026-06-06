"""add feature entitlement package tables

Revision ID: 20260606_feature_entitlements
Revises: 20260516_add_community_confirmation_review_sla_policy
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260606_feature_entitlements"
down_revision = "20260516_add_community_confirmation_review_sla_policy"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return bool(sa.inspect(bind).has_table(name))


def upgrade() -> None:
    if not _has_table("feature_entitlements"):
        op.create_table(
            "feature_entitlements",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("shop_id", sa.Integer(), nullable=True),
            sa.Column("feature_code", sa.String(length=64), nullable=False),
            sa.Column("plan_code", sa.String(length=64), nullable=False),
            sa.Column("quantity_total", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("quantity_used", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
            sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("payment_reference", sa.String(length=128), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="SET NULL"),
            sa.UniqueConstraint(
                "feature_code",
                "payment_reference",
                name="uq_feature_entitlements_feature_payment_ref_v1",
            ),
        )
        op.create_index("ix_feature_entitlements_owner_user_id", "feature_entitlements", ["owner_user_id"])
        op.create_index("ix_feature_entitlements_clan_id", "feature_entitlements", ["clan_id"])
        op.create_index("ix_feature_entitlements_shop_id", "feature_entitlements", ["shop_id"])
        op.create_index("ix_feature_entitlements_feature_code", "feature_entitlements", ["feature_code"])
        op.create_index("ix_feature_entitlements_plan_code", "feature_entitlements", ["plan_code"])
        op.create_index("ix_feature_entitlements_status", "feature_entitlements", ["status"])
        op.create_index("ix_feature_entitlements_expires_at", "feature_entitlements", ["expires_at"])
        op.create_index("ix_feature_entitlements_revoked_at", "feature_entitlements", ["revoked_at"])
        op.create_index("ix_feature_entitlements_payment_reference", "feature_entitlements", ["payment_reference"])

    if not _has_table("feature_usage_events"):
        op.create_table(
            "feature_usage_events",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("entitlement_id", sa.Integer(), nullable=True),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("shop_id", sa.Integer(), nullable=True),
            sa.Column("feature_code", sa.String(length=64), nullable=False),
            sa.Column("units_used", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("reference_key", sa.String(length=128), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["entitlement_id"], ["feature_entitlements.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="SET NULL"),
        )
        op.create_index("ix_feature_usage_events_entitlement_id", "feature_usage_events", ["entitlement_id"])
        op.create_index("ix_feature_usage_events_owner_user_id", "feature_usage_events", ["owner_user_id"])
        op.create_index("ix_feature_usage_events_clan_id", "feature_usage_events", ["clan_id"])
        op.create_index("ix_feature_usage_events_shop_id", "feature_usage_events", ["shop_id"])
        op.create_index("ix_feature_usage_events_feature_code", "feature_usage_events", ["feature_code"])
        op.create_index("ix_feature_usage_events_reference_key", "feature_usage_events", ["reference_key"])
        op.create_index("ix_feature_usage_events_created_at", "feature_usage_events", ["created_at"])


def downgrade() -> None:
    if _has_table("feature_usage_events"):
        op.drop_index("ix_feature_usage_events_created_at", table_name="feature_usage_events")
        op.drop_index("ix_feature_usage_events_reference_key", table_name="feature_usage_events")
        op.drop_index("ix_feature_usage_events_feature_code", table_name="feature_usage_events")
        op.drop_index("ix_feature_usage_events_shop_id", table_name="feature_usage_events")
        op.drop_index("ix_feature_usage_events_clan_id", table_name="feature_usage_events")
        op.drop_index("ix_feature_usage_events_owner_user_id", table_name="feature_usage_events")
        op.drop_index("ix_feature_usage_events_entitlement_id", table_name="feature_usage_events")
        op.drop_table("feature_usage_events")

    if _has_table("feature_entitlements"):
        op.drop_index("ix_feature_entitlements_payment_reference", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_revoked_at", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_expires_at", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_status", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_plan_code", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_feature_code", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_shop_id", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_clan_id", table_name="feature_entitlements")
        op.drop_index("ix_feature_entitlements_owner_user_id", table_name="feature_entitlements")
        op.drop_table("feature_entitlements")
