"""add participant-centred rosca tables

Revision ID: 20261005_participant_rosca
Revises: 20261004_opportunity_relay
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20261005_participant_rosca"
down_revision = "20261004_opportunity_relay"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return bool(insp.has_table(name))


def _drop_table_if_exists(name: str) -> None:
    if _has_table(name):
        op.drop_table(name)


def upgrade() -> None:
    if not _has_table("rosca_runs"):
        op.create_table(
            "rosca_runs",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("public_id", sa.String(length=32), nullable=False),
            sa.Column("created_by_user_id", sa.Integer(), nullable=False),
            sa.Column("coordinator_user_id", sa.Integer(), nullable=False),
            sa.Column("origin_clan_id", sa.Integer(), nullable=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(length=8), nullable=False, server_default="NGN"),
            sa.Column("frequency_unit", sa.String(length=24), nullable=False, server_default="monthly"),
            sa.Column("frequency_interval", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("round_count", sa.Integer(), nullable=False),
            sa.Column("participant_count_required", sa.Integer(), nullable=False),
            sa.Column("start_rule", sa.String(length=48), nullable=False, server_default="on_all_acceptance"),
            sa.Column("start_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("rotation_method", sa.String(length=32), nullable=False, server_default="explicit_order"),
            sa.Column("terms_version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("terms_snapshot_json", sa.Text(), nullable=False),
            sa.Column("terms_hash", sa.String(length=96), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column("external_money_moved_by_gsn", sa.Boolean(), nullable=False, server_default="0"),
            sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["coordinator_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["origin_clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.UniqueConstraint("public_id", name="uq_rosca_runs_public_id_v1"),
            sa.CheckConstraint(
                "status IN ('draft', 'inviting', 'ready_to_activate', 'active', 'completed', 'cancelled')",
                name="ck_rosca_runs_status_v1",
            ),
            sa.CheckConstraint(
                "start_rule IN ('on_all_acceptance', 'on_date_after_all_acceptance', 'manual_activate_after_all_acceptance')",
                name="ck_rosca_runs_start_rule_v1",
            ),
            sa.CheckConstraint("amount > 0", name="ck_rosca_runs_amount_positive_v1"),
            sa.CheckConstraint("round_count >= 2", name="ck_rosca_runs_round_count_v1"),
            sa.CheckConstraint("participant_count_required >= 2", name="ck_rosca_runs_participant_count_v1"),
            sa.CheckConstraint("frequency_interval >= 1", name="ck_rosca_runs_frequency_interval_v1"),
        )
        op.create_index("ix_rosca_runs_id", "rosca_runs", ["id"])
        op.create_index("ix_rosca_runs_public_id", "rosca_runs", ["public_id"])
        op.create_index("ix_rosca_runs_created_by_user_id", "rosca_runs", ["created_by_user_id"])
        op.create_index("ix_rosca_runs_coordinator_user_id", "rosca_runs", ["coordinator_user_id"])
        op.create_index("ix_rosca_runs_origin_clan_id", "rosca_runs", ["origin_clan_id"])
        op.create_index("ix_rosca_runs_terms_hash", "rosca_runs", ["terms_hash"])
        op.create_index("ix_rosca_runs_status", "rosca_runs", ["status"])
        op.create_index("ix_rosca_runs_activated_at", "rosca_runs", ["activated_at"])
        op.create_index("ix_rosca_runs_created_at", "rosca_runs", ["created_at"])
        op.create_index("ix_rosca_runs_coordinator_status_v1", "rosca_runs", ["coordinator_user_id", "status"])
        op.create_index("ix_rosca_runs_creator_status_v1", "rosca_runs", ["created_by_user_id", "status"])
        op.create_index("ix_rosca_runs_origin_status_v1", "rosca_runs", ["origin_clan_id", "status"])
        op.create_index("ix_rosca_runs_terms_hash_v1", "rosca_runs", ["terms_hash"])

    if not _has_table("rosca_participants"):
        op.create_table(
            "rosca_participants",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("rosca_run_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(length=24), nullable=False, server_default="participant"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="invited"),
            sa.Column("rotation_position", sa.Integer(), nullable=True),
            sa.Column("invited_by_user_id", sa.Integer(), nullable=False),
            sa.Column("invited_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("accepted_terms_version", sa.Integer(), nullable=True),
            sa.Column("accepted_terms_hash", sa.String(length=96), nullable=True),
            sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("acceptance_source", sa.String(length=40), nullable=True),
            sa.Column("idempotency_key", sa.String(length=96), nullable=True),
            sa.Column("invitation_token_hash", sa.String(length=128), nullable=True),
            sa.Column("invitee_identifier_hash", sa.String(length=128), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["rosca_run_id"], ["rosca_runs.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("rosca_run_id", "user_id", name="uq_rosca_participants_run_user_v1"),
            sa.UniqueConstraint("invitation_token_hash", name="uq_rosca_participants_invitation_token_v1"),
            sa.CheckConstraint("role IN ('coordinator', 'participant')", name="ck_rosca_participants_role_v1"),
            sa.CheckConstraint(
                "status IN ('invited', 'accepted', 'declined', 'revoked', 'removed', 'withdraw_requested', 'withdrawn')",
                name="ck_rosca_participants_status_v1",
            ),
        )
        op.create_index("ix_rosca_participants_id", "rosca_participants", ["id"])
        op.create_index("ix_rosca_participants_rosca_run_id", "rosca_participants", ["rosca_run_id"])
        op.create_index("ix_rosca_participants_user_id", "rosca_participants", ["user_id"])
        op.create_index("ix_rosca_participants_status", "rosca_participants", ["status"])
        op.create_index("ix_rosca_participants_rotation_position", "rosca_participants", ["rotation_position"])
        op.create_index("ix_rosca_participants_invited_by_user_id", "rosca_participants", ["invited_by_user_id"])
        op.create_index("ix_rosca_participants_responded_at", "rosca_participants", ["responded_at"])
        op.create_index("ix_rosca_participants_accepted_at", "rosca_participants", ["accepted_at"])
        op.create_index("ix_rosca_participants_invitee_identifier_hash", "rosca_participants", ["invitee_identifier_hash"])
        op.create_index("ix_rosca_participants_created_at", "rosca_participants", ["created_at"])
        op.create_index("ix_rosca_participants_user_status_v1", "rosca_participants", ["user_id", "status"])
        op.create_index("ix_rosca_participants_run_status_v1", "rosca_participants", ["rosca_run_id", "status"])
        op.create_index(
            "uq_rosca_participants_run_rotation_active_v1",
            "rosca_participants",
            ["rosca_run_id", "rotation_position"],
            unique=True,
            sqlite_where=sa.text("rotation_position IS NOT NULL AND status IN ('invited', 'accepted')"),
            postgresql_where=sa.text("rotation_position IS NOT NULL AND status IN ('invited', 'accepted')"),
        )

    if not _has_table("rosca_obligations"):
        op.create_table(
            "rosca_obligations",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("rosca_run_id", sa.Integer(), nullable=False),
            sa.Column("participant_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("round_number", sa.Integer(), nullable=False),
            sa.Column("obligation_type", sa.String(length=32), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(length=8), nullable=False, server_default="NGN"),
            sa.Column("amount_recorded", sa.Numeric(12, 2), nullable=False, server_default="0"),
            sa.Column("amount_outstanding", sa.Numeric(12, 2), nullable=False, server_default="0"),
            sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("state", sa.String(length=32), nullable=False, server_default="scheduled"),
            sa.Column("external_reference", sa.String(length=128), nullable=True),
            sa.Column("reported_by_user_id", sa.Integer(), nullable=True),
            sa.Column("reported_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("confirmed_by_user_id", sa.Integer(), nullable=True),
            sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("correction_of_obligation_id", sa.Integer(), nullable=True),
            sa.Column("evidence_json", sa.Text(), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["rosca_run_id"], ["rosca_runs.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["participant_id"], ["rosca_participants.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["reported_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["confirmed_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["correction_of_obligation_id"], ["rosca_obligations.id"], ondelete="SET NULL"),
            sa.UniqueConstraint(
                "rosca_run_id",
                "participant_id",
                "round_number",
                "obligation_type",
                name="uq_rosca_obligations_run_participant_round_type_v1",
            ),
            sa.CheckConstraint("round_number >= 1", name="ck_rosca_obligations_round_v1"),
            sa.CheckConstraint("amount >= 0", name="ck_rosca_obligations_amount_v1"),
            sa.CheckConstraint("amount_recorded >= 0", name="ck_rosca_obligations_amount_recorded_v1"),
            sa.CheckConstraint("amount_outstanding >= 0", name="ck_rosca_obligations_amount_outstanding_v1"),
            sa.CheckConstraint("obligation_type IN ('contribution', 'payout')", name="ck_rosca_obligations_type_v1"),
            sa.CheckConstraint("state IN ('scheduled', 'reported', 'confirmed')", name="ck_rosca_obligations_state_v1"),
        )
        op.create_index("ix_rosca_obligations_id", "rosca_obligations", ["id"])
        op.create_index("ix_rosca_obligations_rosca_run_id", "rosca_obligations", ["rosca_run_id"])
        op.create_index("ix_rosca_obligations_participant_id", "rosca_obligations", ["participant_id"])
        op.create_index("ix_rosca_obligations_user_id", "rosca_obligations", ["user_id"])
        op.create_index("ix_rosca_obligations_round_number", "rosca_obligations", ["round_number"])
        op.create_index("ix_rosca_obligations_obligation_type", "rosca_obligations", ["obligation_type"])
        op.create_index("ix_rosca_obligations_due_at", "rosca_obligations", ["due_at"])
        op.create_index("ix_rosca_obligations_state", "rosca_obligations", ["state"])
        op.create_index("ix_rosca_obligations_reported_by_user_id", "rosca_obligations", ["reported_by_user_id"])
        op.create_index("ix_rosca_obligations_confirmed_by_user_id", "rosca_obligations", ["confirmed_by_user_id"])
        op.create_index("ix_rosca_obligations_created_at", "rosca_obligations", ["created_at"])
        op.create_index("ix_rosca_obligations_user_state_v1", "rosca_obligations", ["user_id", "state"])
        op.create_index("ix_rosca_obligations_run_round_v1", "rosca_obligations", ["rosca_run_id", "round_number"])
        op.create_index("ix_rosca_obligations_due_state_v1", "rosca_obligations", ["due_at", "state"])


def downgrade() -> None:
    _drop_table_if_exists("rosca_obligations")
    _drop_table_if_exists("rosca_participants")
    _drop_table_if_exists("rosca_runs")
