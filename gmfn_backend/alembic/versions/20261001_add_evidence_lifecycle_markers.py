"""add evidence lifecycle markers

Revision ID: 20261001_evidence_lifecycle_markers
Revises: 20260912_clan_qr_preapprovals
Create Date: 2026-10-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261001_evidence_lifecycle_markers"
down_revision: Union[str, Sequence[str], None] = "20260912_clan_qr_preapprovals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "evidence_lifecycle_markers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("source_id", sa.String(length=120), nullable=False),
        sa.Column("trust_event_id", sa.Integer(), nullable=True),
        sa.Column("marker_type", sa.String(length=32), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("resolution", sa.String(length=48), nullable=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("authority_type", sa.String(length=32), nullable=True),
        sa.Column("reason", sa.String(length=160), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("related_source_type", sa.String(length=64), nullable=True),
        sa.Column("related_source_id", sa.String(length=120), nullable=True),
        sa.Column("related_trust_event_id", sa.Integer(), nullable=True),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["related_trust_event_id"], ["trust_events.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["trust_event_id"], ["trust_events.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidence_lifecycle_marker_type", "evidence_lifecycle_markers", ["marker_type"])
    op.create_index("ix_evidence_lifecycle_related_source", "evidence_lifecycle_markers", ["related_source_type", "related_source_id"])
    op.create_index("ix_evidence_lifecycle_related_trust_event", "evidence_lifecycle_markers", ["related_trust_event_id"])
    op.create_index("ix_evidence_lifecycle_source", "evidence_lifecycle_markers", ["source_type", "source_id"])
    op.create_index("ix_evidence_lifecycle_state", "evidence_lifecycle_markers", ["state"])
    op.create_index("ix_evidence_lifecycle_trust_event", "evidence_lifecycle_markers", ["trust_event_id"])


def downgrade() -> None:
    op.drop_index("ix_evidence_lifecycle_trust_event", table_name="evidence_lifecycle_markers")
    op.drop_index("ix_evidence_lifecycle_state", table_name="evidence_lifecycle_markers")
    op.drop_index("ix_evidence_lifecycle_source", table_name="evidence_lifecycle_markers")
    op.drop_index("ix_evidence_lifecycle_related_trust_event", table_name="evidence_lifecycle_markers")
    op.drop_index("ix_evidence_lifecycle_related_source", table_name="evidence_lifecycle_markers")
    op.drop_index("ix_evidence_lifecycle_marker_type", table_name="evidence_lifecycle_markers")
    op.drop_table("evidence_lifecycle_markers")
