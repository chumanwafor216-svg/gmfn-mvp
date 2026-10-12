"""add spotlight campaign pacing state

Revision ID: 20261012_spotlight_pacing_state
Revises: 20261012_spotlight_exposure_events
Create Date: 2026-10-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261012_spotlight_pacing_state"
down_revision = "20261012_spotlight_exposure_events"
branch_labels = None
depends_on = None

TABLE = "spotlight_campaign_pacing_states"


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(index.get("name") == index_name for index in sa.inspect(bind).get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE):
        op.create_table(
            TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("campaign_id", sa.Integer(), nullable=False),
            sa.Column("max_delivery_rounds", sa.Integer(), nullable=False, server_default="10"),
            sa.Column("consumed_delivery_rounds", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_delivery_opportunity_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("next_eligible_delivery_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("pacing_profile", sa.String(length=24), nullable=False, server_default="neutral"),
            sa.Column("delivery_window_policy_json", sa.Text(), nullable=True),
            sa.Column("exhausted", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("version", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["campaign_id"], ["spotlight_campaigns.id"], ondelete="CASCADE"),
            sa.CheckConstraint("max_delivery_rounds >= 0", name="ck_spotlight_pacing_max_rounds_nonnegative"),
            sa.CheckConstraint("consumed_delivery_rounds >= 0", name="ck_spotlight_pacing_consumed_rounds_nonnegative"),
            sa.CheckConstraint("consumed_delivery_rounds <= max_delivery_rounds", name="ck_spotlight_pacing_consumed_lte_max"),
            sa.CheckConstraint("version >= 0", name="ck_spotlight_pacing_version_nonnegative"),
            sa.CheckConstraint(
                "pacing_profile IN ('neutral', 'peak', 'balanced', 'off_peak')",
                name="ck_spotlight_pacing_profile",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("campaign_id", name="uq_spotlight_pacing_campaign_id"),
        )

    for index_name, columns in (
        ("ix_spotlight_pacing_campaign_id", ["campaign_id"]),
        ("ix_spotlight_pacing_next_eligible", ["next_eligible_delivery_at"]),
        ("ix_spotlight_pacing_exhausted", ["exhausted"]),
        ("ix_spotlight_pacing_profile", ["pacing_profile"]),
    ):
        if not _has_index(bind, TABLE, index_name):
            op.create_index(index_name, TABLE, columns)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE):
        return

    for index_name in (
        "ix_spotlight_pacing_profile",
        "ix_spotlight_pacing_exhausted",
        "ix_spotlight_pacing_next_eligible",
        "ix_spotlight_pacing_campaign_id",
    ):
        if _has_index(bind, TABLE, index_name):
            op.drop_index(index_name, table_name=TABLE)

    op.drop_table(TABLE)
