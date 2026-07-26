"""add trust slip decision pack consent share ledger

Revision ID: 20260726_trustslip_dp_consent_share
Revises: 20260726_trustslip_decision_pack_access
Create Date: 2026-07-26
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260726_trustslip_dp_consent_share"
down_revision = "20260726_trustslip_decision_pack_access"
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


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "trust_slip_decision_pack_consent_share"):
        op.create_table(
            "trust_slip_decision_pack_consent_share",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("trust_slip_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("holder_user_id", sa.Integer(), nullable=True),
            sa.Column("code", sa.String(length=64), nullable=False),
            sa.Column("decision_pack_key", sa.String(length=64), nullable=True),
            sa.Column("access_purpose", sa.String(length=160), nullable=True),
            sa.Column("recipient_question", sa.String(length=280), nullable=True),
            sa.Column("decision_focus", sa.String(length=360), nullable=True),
            sa.Column(
                "consent_scope",
                sa.String(length=64),
                nullable=False,
                server_default="holder_private_decision_pack",
            ),
            sa.Column(
                "source",
                sa.String(length=64),
                nullable=False,
                server_default="holder_private_preview",
            ),
            sa.Column(
                "export_format",
                sa.String(length=24),
                nullable=False,
                server_default="summary",
            ),
            sa.Column("category_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("event_ref_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="recorded"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["holder_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["trust_slip_id"], ["trust_slips.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = (
        ("ix_trust_slip_decision_pack_consent_share_trust_slip_id", ["trust_slip_id"]),
        ("ix_trust_slip_decision_pack_consent_share_clan_id", ["clan_id"]),
        ("ix_trust_slip_decision_pack_consent_share_holder_user_id", ["holder_user_id"]),
        ("ix_trust_slip_decision_pack_consent_share_code", ["code"]),
        ("ix_trust_slip_decision_pack_consent_share_decision_pack_key", ["decision_pack_key"]),
        ("ix_trust_slip_decision_pack_consent_share_created_at", ["created_at"]),
        ("ix_trust_slip_decision_pack_consent_share_slip_created", ["trust_slip_id", "created_at"]),
        ("ix_trust_slip_decision_pack_consent_share_holder_created", ["holder_user_id", "created_at"]),
        ("ix_trust_slip_decision_pack_consent_share_pack_created", ["decision_pack_key", "created_at"]),
    )
    for name, columns in indexes:
        if not _has_index(bind, "trust_slip_decision_pack_consent_share", name):
            op.create_index(name, "trust_slip_decision_pack_consent_share", columns)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, "trust_slip_decision_pack_consent_share"):
        return

    for name in (
        "ix_trust_slip_decision_pack_consent_share_pack_created",
        "ix_trust_slip_decision_pack_consent_share_holder_created",
        "ix_trust_slip_decision_pack_consent_share_slip_created",
        "ix_trust_slip_decision_pack_consent_share_created_at",
        "ix_trust_slip_decision_pack_consent_share_decision_pack_key",
        "ix_trust_slip_decision_pack_consent_share_code",
        "ix_trust_slip_decision_pack_consent_share_holder_user_id",
        "ix_trust_slip_decision_pack_consent_share_clan_id",
        "ix_trust_slip_decision_pack_consent_share_trust_slip_id",
    ):
        if _has_index(bind, "trust_slip_decision_pack_consent_share", name):
            op.drop_index(name, table_name="trust_slip_decision_pack_consent_share")

    op.drop_table("trust_slip_decision_pack_consent_share")