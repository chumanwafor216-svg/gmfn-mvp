"""add opportunity relay run and offer tables

Revision ID: 20261004_opportunity_relay
Revises: 20261001_evidence_lifecycle_markers
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261004_opportunity_relay"
down_revision = "20261001_evidence_lifecycle_markers"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return bool(insp.has_table(name))


def upgrade() -> None:
    if not _has_table("opportunity_relay_runs"):
        op.create_table(
            "opportunity_relay_runs",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("source_type", sa.String(length=40), nullable=False),
            sa.Column("source_id", sa.Integer(), nullable=False),
            sa.Column("origin_clan_id", sa.Integer(), nullable=False),
            sa.Column("target_clan_id", sa.Integer(), nullable=False),
            sa.Column("created_by_user_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="open"),
            sa.Column("privacy_mode", sa.String(length=40), nullable=False, server_default="bridge_minimum"),
            sa.Column("response_window_seconds", sa.Integer(), nullable=False, server_default="259200"),
            sa.Column("max_active_offers", sa.Integer(), nullable=False, server_default="3"),
            sa.Column("offered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("boundary_crossed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("boundary_crossed_by_user_id", sa.Integer(), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["origin_clan_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["target_clan_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["boundary_crossed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        )
        op.create_index("ix_opportunity_relay_runs_source_id", "opportunity_relay_runs", ["source_id"])
        op.create_index("ix_opportunity_relay_runs_origin_clan_id", "opportunity_relay_runs", ["origin_clan_id"])
        op.create_index("ix_opportunity_relay_runs_target_clan_id", "opportunity_relay_runs", ["target_clan_id"])
        op.create_index("ix_opportunity_relay_runs_created_by_user_id", "opportunity_relay_runs", ["created_by_user_id"])
        op.create_index("ix_opportunity_relay_runs_status", "opportunity_relay_runs", ["status"])
        op.create_index("ix_opportunity_relay_runs_boundary_crossed_at", "opportunity_relay_runs", ["boundary_crossed_at"])
        op.create_index("ix_opportunity_relay_runs_boundary_crossed_by_user_id", "opportunity_relay_runs", ["boundary_crossed_by_user_id"])
        op.create_index("ix_opportunity_relay_runs_created_at", "opportunity_relay_runs", ["created_at"])
        op.create_index("ix_opportunity_relay_runs_expires_at", "opportunity_relay_runs", ["expires_at"])
        op.create_index("ix_opportunity_relay_runs_source_v1", "opportunity_relay_runs", ["source_type", "source_id"])
        op.create_index(
            "ix_opportunity_relay_runs_origin_target_status_v1",
            "opportunity_relay_runs",
            ["origin_clan_id", "target_clan_id", "status"],
        )
        op.create_index(
            "ix_opportunity_relay_runs_target_status_v1",
            "opportunity_relay_runs",
            ["target_clan_id", "status"],
        )
        op.create_index(
            "ix_opportunity_relay_runs_creator_status_v1",
            "opportunity_relay_runs",
            ["created_by_user_id", "status"],
        )
        op.create_index(
            "ix_opportunity_relay_runs_expires_status_v1",
            "opportunity_relay_runs",
            ["expires_at", "status"],
        )
        op.create_index(
            "uq_opportunity_relay_run_active_scope_v1",
            "opportunity_relay_runs",
            ["source_type", "source_id", "origin_clan_id", "target_clan_id"],
            unique=True,
            sqlite_where=sa.text("status IN ('open', 'boundary_crossed')"),
            postgresql_where=sa.text("status IN ('open', 'boundary_crossed')"),
        )

    if not _has_table("opportunity_relay_offers"):
        op.create_table(
            "opportunity_relay_offers",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("relay_run_id", sa.Integer(), nullable=False),
            sa.Column("bridge_user_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="offered"),
            sa.Column("offered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("decline_reason", sa.String(length=120), nullable=True),
            sa.Column("notification_id", sa.Integer(), nullable=True),
            sa.Column("idempotency_key", sa.String(length=96), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["relay_run_id"], ["opportunity_relay_runs.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["bridge_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["notification_id"], ["notifications.id"], ondelete="SET NULL"),
            sa.UniqueConstraint("relay_run_id", "bridge_user_id", name="uq_opportunity_relay_offer_run_bridge_v1"),
            sa.UniqueConstraint(
                "relay_run_id",
                "bridge_user_id",
                "idempotency_key",
                name="uq_opportunity_relay_offer_idempotency_v1",
            ),
        )
        op.create_index("ix_opportunity_relay_offers_relay_run_id", "opportunity_relay_offers", ["relay_run_id"])
        op.create_index("ix_opportunity_relay_offers_bridge_user_id", "opportunity_relay_offers", ["bridge_user_id"])
        op.create_index("ix_opportunity_relay_offers_status", "opportunity_relay_offers", ["status"])
        op.create_index("ix_opportunity_relay_offers_responded_at", "opportunity_relay_offers", ["responded_at"])
        op.create_index("ix_opportunity_relay_offers_expires_at", "opportunity_relay_offers", ["expires_at"])
        op.create_index("ix_opportunity_relay_offers_notification_id", "opportunity_relay_offers", ["notification_id"])
        op.create_index("ix_opportunity_relay_offers_created_at", "opportunity_relay_offers", ["created_at"])
        op.create_index(
            "ix_opportunity_relay_offers_run_status_v1",
            "opportunity_relay_offers",
            ["relay_run_id", "status"],
        )
        op.create_index(
            "ix_opportunity_relay_offers_bridge_status_v1",
            "opportunity_relay_offers",
            ["bridge_user_id", "status"],
        )
        op.create_index(
            "ix_opportunity_relay_offers_expires_status_v1",
            "opportunity_relay_offers",
            ["expires_at", "status"],
        )
        op.create_index(
            "uq_opportunity_relay_offer_one_accepted_v1",
            "opportunity_relay_offers",
            ["relay_run_id"],
            unique=True,
            sqlite_where=sa.text("status = 'accepted'"),
            postgresql_where=sa.text("status = 'accepted'"),
        )


def downgrade() -> None:
    if _has_table("opportunity_relay_offers"):
        op.drop_table("opportunity_relay_offers")
    if _has_table("opportunity_relay_runs"):
        op.drop_table("opportunity_relay_runs")
