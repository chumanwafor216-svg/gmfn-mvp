"""add community confirmation relay

Revision ID: 20260515_add_community_confirmation_relay
Revises: 20260510_add_pending_join_request_unique_guard
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260515_add_community_confirmation_relay"
down_revision = "20260510_add_pending_join_request_unique_guard"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _create_index_if_missing(
    bind,
    index_name: str,
    table_name: str,
    columns: list[str],
    *,
    unique: bool = False,
) -> None:
    if _has_table(bind, table_name) and not _has_index(bind, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "community_confirmation_contacts"):
        op.create_table(
            "community_confirmation_contacts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role_type", sa.String(length=32), server_default="member", nullable=False),
            sa.Column("active", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("can_receive_relay_requests", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("can_receive_instant_pulse", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("priority_order", sa.Integer(), server_default="10", nullable=False),
            sa.Column("standing_status", sa.String(length=24), server_default="active", nullable=False),
            sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("opted_in_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("opted_out_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["community_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("community_id", "user_id", name="uq_community_confirmation_contact"),
        )

    if not _has_table(bind, "community_confirmation_policies"):
        op.create_table(
            "community_confirmation_policies",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("community_id", sa.Integer(), nullable=False),
            sa.Column("relay_enabled", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("instant_pulse_enabled", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("minimum_positive_responses", sa.Integer(), server_default="2", nullable=False),
            sa.Column("maximum_relay_contacts", sa.Integer(), server_default="8", nullable=False),
            sa.Column("response_window_seconds", sa.Integer(), server_default="86400", nullable=False),
            sa.Column("allow_admin_contacts", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("allow_sponsor_contacts", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("allow_voting_member_contacts", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("allow_subject_nominated_contacts", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("public_confirmation_enabled", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["community_id"], ["clans.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("community_id"),
        )

    if not _has_table(bind, "community_confirmation_requests"):
        op.create_table(
            "community_confirmation_requests",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("public_token", sa.String(length=80), nullable=False),
            sa.Column("requester_user_id", sa.Integer(), nullable=True),
            sa.Column("requester_external_label", sa.String(length=120), nullable=True),
            sa.Column("subject_user_id", sa.Integer(), nullable=False),
            sa.Column("community_id", sa.Integer(), nullable=False),
            sa.Column("trust_slip_id", sa.Integer(), nullable=True),
            sa.Column("reason_type", sa.String(length=48), nullable=False),
            sa.Column("risk_level", sa.String(length=24), server_default="low", nullable=False),
            sa.Column("mode", sa.String(length=24), server_default="relay", nullable=False),
            sa.Column("status", sa.String(length=24), server_default="pending", nullable=False),
            sa.Column("visible_outcome", sa.String(length=24), nullable=True),
            sa.Column("outcome_summary_json", sa.Text(), nullable=True),
            sa.Column("abuse_flag", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["community_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["trust_slip_id"], ["trust_slips.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("public_token"),
        )

    if not _has_table(bind, "community_confirmation_responses"):
        op.create_table(
            "community_confirmation_responses",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("request_id", sa.Integer(), nullable=False),
            sa.Column("responder_user_id", sa.Integer(), nullable=False),
            sa.Column("response_type", sa.String(length=48), nullable=False),
            sa.Column("response_reason", sa.String(length=80), nullable=True),
            sa.Column("response_note", sa.Text(), nullable=True),
            sa.Column("counted_in_outcome", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("responded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["request_id"], ["community_confirmation_requests.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["responder_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("request_id", "responder_user_id", name="uq_community_confirmation_response_once"),
        )

    if not _has_table(bind, "community_confirmation_outcomes"):
        op.create_table(
            "community_confirmation_outcomes",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("request_id", sa.Integer(), nullable=False),
            sa.Column("positive_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("caution_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("objection_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("no_response_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("eligible_contact_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("confidence_level", sa.String(length=24), server_default="limited", nullable=False),
            sa.Column("visible_summary", sa.Text(), nullable=True),
            sa.Column("closed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["request_id"], ["community_confirmation_requests.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("request_id"),
        )

    _create_index_if_missing(bind, "ix_community_confirmation_contacts_id", "community_confirmation_contacts", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_contacts_community_id", "community_confirmation_contacts", ["community_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_contacts_user_id", "community_confirmation_contacts", ["user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_policies_id", "community_confirmation_policies", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_policies_community_id", "community_confirmation_policies", ["community_id"], unique=True)
    _create_index_if_missing(bind, "ix_community_confirmation_requests_id", "community_confirmation_requests", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_public_token", "community_confirmation_requests", ["public_token"], unique=True)
    _create_index_if_missing(bind, "ix_community_confirmation_requests_community_id", "community_confirmation_requests", ["community_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_subject_user_id", "community_confirmation_requests", ["subject_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_requester_user_id", "community_confirmation_requests", ["requester_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_trust_slip_id", "community_confirmation_requests", ["trust_slip_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_reason_type", "community_confirmation_requests", ["reason_type"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_mode", "community_confirmation_requests", ["mode"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_status", "community_confirmation_requests", ["status"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_created_at", "community_confirmation_requests", ["created_at"])
    _create_index_if_missing(bind, "ix_community_confirmation_requests_expires_at", "community_confirmation_requests", ["expires_at"])
    _create_index_if_missing(bind, "ix_community_confirmation_responses_id", "community_confirmation_responses", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_responses_request_id", "community_confirmation_responses", ["request_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_responses_responder_user_id", "community_confirmation_responses", ["responder_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_responses_response_type", "community_confirmation_responses", ["response_type"])
    _create_index_if_missing(bind, "ix_community_confirmation_responses_responded_at", "community_confirmation_responses", ["responded_at"])
    _create_index_if_missing(bind, "ix_community_confirmation_outcomes_id", "community_confirmation_outcomes", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_outcomes_request_id", "community_confirmation_outcomes", ["request_id"], unique=True)
    _create_index_if_missing(bind, "ix_community_confirmation_outcomes_confidence_level", "community_confirmation_outcomes", ["confidence_level"])


def downgrade() -> None:
    bind = op.get_bind()

    for table_name in (
        "community_confirmation_outcomes",
        "community_confirmation_responses",
        "community_confirmation_requests",
        "community_confirmation_policies",
        "community_confirmation_contacts",
    ):
        if _has_table(bind, table_name):
            op.drop_table(table_name)
