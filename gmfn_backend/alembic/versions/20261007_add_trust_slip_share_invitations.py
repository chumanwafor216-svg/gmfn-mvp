"""add trust slip share invitations

Revision ID: 20261007_trustslip_share_invitations
Revises: 20261005_participant_rosca
Create Date: 2026-10-07
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261007_trustslip_share_invitations"
down_revision = "20261005_participant_rosca"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _has_unique(bind, table_name: str, constraint_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    inspector = sa.inspect(bind)
    return any(item.get("name") == constraint_name for item in inspector.get_unique_constraints(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "trust_slip_share_invitations"):
        op.create_table(
            "trust_slip_share_invitations",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("share_token_hash", sa.String(length=128), nullable=False),
            sa.Column("share_token_prefix", sa.String(length=16), nullable=True),
            sa.Column("trust_slip_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("holder_user_id", sa.Integer(), nullable=True),
            sa.Column("verification_community_id", sa.Integer(), nullable=True),
            sa.Column("code_at_issue", sa.String(length=64), nullable=False),
            sa.Column("decision_pack_key", sa.String(length=64), nullable=False),
            sa.Column("access_purpose", sa.String(length=160), nullable=False),
            sa.Column("recipient_question", sa.String(length=280), nullable=False),
            sa.Column("decision_focus", sa.String(length=360), nullable=False),
            sa.Column("access_scope", sa.String(length=64), nullable=False, server_default="public_decision_pack"),
            sa.Column("verification_scope", sa.String(length=64), nullable=False, server_default="public_decision_pack"),
            sa.Column("verification_scope_label", sa.String(length=180), nullable=True),
            sa.Column("verification_scope_boundary", sa.String(length=520), nullable=True),
            sa.Column("verification_community_label", sa.String(length=180), nullable=True),
            sa.Column("verification_community_ref", sa.String(length=120), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("superseded_by_share_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["holder_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["trust_slip_id"], ["trust_slips.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["verification_community_id"], ["clans.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("share_token_hash", name="uq_trust_slip_share_invitations_token_hash"),
        )

    indexes = (
        ("ix_trust_slip_share_invitations_share_token_hash", ["share_token_hash"]),
        ("ix_trust_slip_share_invitations_share_token_prefix", ["share_token_prefix"]),
        ("ix_trust_slip_share_invitations_trust_slip_id", ["trust_slip_id"]),
        ("ix_trust_slip_share_invitations_clan_id", ["clan_id"]),
        ("ix_trust_slip_share_invitations_holder_user_id", ["holder_user_id"]),
        ("ix_trust_slip_share_invitations_verification_community_id", ["verification_community_id"]),
        ("ix_trust_slip_share_invitations_code_at_issue", ["code_at_issue"]),
        ("ix_trust_slip_share_invitations_decision_pack_key", ["decision_pack_key"]),
        ("ix_trust_slip_share_invitations_status", ["status"]),
        ("ix_trust_slip_share_invitations_created_at", ["created_at"]),
        ("ix_trust_slip_share_invitations_slip_created", ["trust_slip_id", "created_at"]),
        ("ix_trust_slip_share_invitations_holder_created", ["holder_user_id", "created_at"]),
        ("ix_trust_slip_share_invitations_pack_created", ["decision_pack_key", "created_at"]),
    )
    for name, columns in indexes:
        if not _has_index(bind, "trust_slip_share_invitations", name):
            op.create_index(name, "trust_slip_share_invitations", columns)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, "trust_slip_share_invitations"):
        return

    for name in (
        "ix_trust_slip_share_invitations_pack_created",
        "ix_trust_slip_share_invitations_holder_created",
        "ix_trust_slip_share_invitations_slip_created",
        "ix_trust_slip_share_invitations_created_at",
        "ix_trust_slip_share_invitations_status",
        "ix_trust_slip_share_invitations_decision_pack_key",
        "ix_trust_slip_share_invitations_code_at_issue",
        "ix_trust_slip_share_invitations_verification_community_id",
        "ix_trust_slip_share_invitations_holder_user_id",
        "ix_trust_slip_share_invitations_clan_id",
        "ix_trust_slip_share_invitations_trust_slip_id",
        "ix_trust_slip_share_invitations_share_token_prefix",
        "ix_trust_slip_share_invitations_share_token_hash",
    ):
        if _has_index(bind, "trust_slip_share_invitations", name):
            op.drop_index(name, table_name="trust_slip_share_invitations")

    op.drop_table("trust_slip_share_invitations")
