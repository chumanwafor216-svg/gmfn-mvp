"""add spotlight exposure events

Revision ID: 20261012_spotlight_exposure_events
Revises: 20261012_spotlight_member_interests
Create Date: 2026-10-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261012_spotlight_exposure_events"
down_revision = "20261012_spotlight_member_interests"
branch_labels = None
depends_on = None

TABLE = "spotlight_exposure_events"


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
            sa.Column("event_type", sa.String(length=40), nullable=False, server_default="qualifying_impression"),
            sa.Column("viewer_user_id", sa.Integer(), nullable=False),
            sa.Column("campaign_id", sa.Integer(), nullable=False),
            sa.Column("event_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("allocation_route_type", sa.String(length=40), nullable=False),
            sa.Column("allocation_source_kind", sa.String(length=40), nullable=True),
            sa.Column("allocation_source_id", sa.Integer(), nullable=True),
            sa.Column("allocation_route_clan_id", sa.Integer(), nullable=True),
            sa.Column("placement_broadcast_id", sa.Integer(), nullable=True),
            sa.Column("marketplace_attention_event_id", sa.Integer(), nullable=True),
            sa.Column("idempotency_key", sa.String(length=160), nullable=True),
            sa.Column("presentation_surface", sa.String(length=80), nullable=True),
            sa.Column("demandbox_relevant", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("explicit_interest_relevant", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("supporting_routes_json", sa.Text(), nullable=True),
            sa.Column("relevance_signals_json", sa.Text(), nullable=True),
            sa.Column("presentation_context_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["allocation_route_clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["campaign_id"], ["spotlight_campaigns.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["marketplace_attention_event_id"], ["marketplace_attention_events.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["placement_broadcast_id"], ["marketplace_broadcasts.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["viewer_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.CheckConstraint(
                "event_type IN ('served', 'qualifying_impression', 'opened_interaction')",
                name="ck_spotlight_exposure_events_event_type",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("viewer_user_id", "idempotency_key", name="uq_spotlight_exposures_viewer_idempotency"),
        )

    for index_name, columns in (
        ("ix_spotlight_exposures_viewer_event_at", ["viewer_user_id", "event_at"]),
        ("ix_spotlight_exposures_viewer_campaign", ["viewer_user_id", "campaign_id", "event_at"]),
        ("ix_spotlight_exposures_viewer_route_source", ["viewer_user_id", "allocation_route_type", "allocation_source_id", "event_at"]),
        ("ix_spotlight_exposures_campaign_event_at", ["campaign_id", "event_at"]),
    ):
        if not _has_index(bind, TABLE, index_name):
            op.create_index(index_name, TABLE, columns)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE):
        return

    for index_name in (
        "ix_spotlight_exposures_campaign_event_at",
        "ix_spotlight_exposures_viewer_route_source",
        "ix_spotlight_exposures_viewer_campaign",
        "ix_spotlight_exposures_viewer_event_at",
    ):
        if _has_index(bind, TABLE, index_name):
            op.drop_index(index_name, table_name=TABLE)

    op.drop_table(TABLE)
