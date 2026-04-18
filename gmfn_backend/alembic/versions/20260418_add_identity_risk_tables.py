"""add identity risk tables

Revision ID: 20260418_add_identity_risk_tables
Revises: 20260418_add_entry_region_consistency_fields
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_identity_risk_tables"
down_revision = "20260418_add_entry_region_consistency_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "device_fingerprints",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("fingerprint_hash", sa.String(length=128), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_device_fingerprints_user_id"), "device_fingerprints", ["user_id"], unique=False)
    op.create_index(op.f("ix_device_fingerprints_fingerprint_hash"), "device_fingerprints", ["fingerprint_hash"], unique=False)
    op.create_index(
        "ix_device_fingerprint_hash_user_v1",
        "device_fingerprints",
        ["fingerprint_hash", "user_id"],
        unique=False,
    )

    op.create_table(
        "identity_risk_signals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("signal_type", sa.String(length=64), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_identity_risk_signals_user_id"), "identity_risk_signals", ["user_id"], unique=False)

    op.create_table(
        "identity_clusters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("root_user_id", sa.Integer(), nullable=False),
        sa.Column("linked_user_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=128), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_identity_clusters_root_user_id"), "identity_clusters", ["root_user_id"], unique=False)
    op.create_index(op.f("ix_identity_clusters_linked_user_id"), "identity_clusters", ["linked_user_id"], unique=False)
    op.create_index(
        "ix_identity_cluster_root_linked_v1",
        "identity_clusters",
        ["root_user_id", "linked_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_identity_cluster_root_linked_v1", table_name="identity_clusters")
    op.drop_index(op.f("ix_identity_clusters_linked_user_id"), table_name="identity_clusters")
    op.drop_index(op.f("ix_identity_clusters_root_user_id"), table_name="identity_clusters")
    op.drop_table("identity_clusters")

    op.drop_index(op.f("ix_identity_risk_signals_user_id"), table_name="identity_risk_signals")
    op.drop_table("identity_risk_signals")

    op.drop_index("ix_device_fingerprint_hash_user_v1", table_name="device_fingerprints")
    op.drop_index(op.f("ix_device_fingerprints_fingerprint_hash"), table_name="device_fingerprints")
    op.drop_index(op.f("ix_device_fingerprints_user_id"), table_name="device_fingerprints")
    op.drop_table("device_fingerprints")
