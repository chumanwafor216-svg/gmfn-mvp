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


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "device_fingerprints"):
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
    if not _has_index(bind, "device_fingerprints", op.f("ix_device_fingerprints_user_id")):
        op.create_index(op.f("ix_device_fingerprints_user_id"), "device_fingerprints", ["user_id"], unique=False)
    if not _has_index(bind, "device_fingerprints", op.f("ix_device_fingerprints_fingerprint_hash")):
        op.create_index(op.f("ix_device_fingerprints_fingerprint_hash"), "device_fingerprints", ["fingerprint_hash"], unique=False)
    if not _has_index(bind, "device_fingerprints", "ix_device_fingerprint_hash_user_v1"):
        op.create_index(
            "ix_device_fingerprint_hash_user_v1",
            "device_fingerprints",
            ["fingerprint_hash", "user_id"],
            unique=False,
        )

    if not _has_table(bind, "identity_risk_signals"):
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
    if not _has_index(bind, "identity_risk_signals", op.f("ix_identity_risk_signals_user_id")):
        op.create_index(op.f("ix_identity_risk_signals_user_id"), "identity_risk_signals", ["user_id"], unique=False)

    if not _has_table(bind, "identity_clusters"):
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
    if not _has_index(bind, "identity_clusters", op.f("ix_identity_clusters_root_user_id")):
        op.create_index(op.f("ix_identity_clusters_root_user_id"), "identity_clusters", ["root_user_id"], unique=False)
    if not _has_index(bind, "identity_clusters", op.f("ix_identity_clusters_linked_user_id")):
        op.create_index(op.f("ix_identity_clusters_linked_user_id"), "identity_clusters", ["linked_user_id"], unique=False)
    if not _has_index(bind, "identity_clusters", "ix_identity_cluster_root_linked_v1"):
        op.create_index(
            "ix_identity_cluster_root_linked_v1",
            "identity_clusters",
            ["root_user_id", "linked_user_id"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_index(bind, "identity_clusters", "ix_identity_cluster_root_linked_v1"):
        op.drop_index("ix_identity_cluster_root_linked_v1", table_name="identity_clusters")
    if _has_index(bind, "identity_clusters", op.f("ix_identity_clusters_linked_user_id")):
        op.drop_index(op.f("ix_identity_clusters_linked_user_id"), table_name="identity_clusters")
    if _has_index(bind, "identity_clusters", op.f("ix_identity_clusters_root_user_id")):
        op.drop_index(op.f("ix_identity_clusters_root_user_id"), table_name="identity_clusters")
    if _has_table(bind, "identity_clusters"):
        op.drop_table("identity_clusters")

    if _has_index(bind, "identity_risk_signals", op.f("ix_identity_risk_signals_user_id")):
        op.drop_index(op.f("ix_identity_risk_signals_user_id"), table_name="identity_risk_signals")
    if _has_table(bind, "identity_risk_signals"):
        op.drop_table("identity_risk_signals")

    if _has_index(bind, "device_fingerprints", "ix_device_fingerprint_hash_user_v1"):
        op.drop_index("ix_device_fingerprint_hash_user_v1", table_name="device_fingerprints")
    if _has_index(bind, "device_fingerprints", op.f("ix_device_fingerprints_fingerprint_hash")):
        op.drop_index(op.f("ix_device_fingerprints_fingerprint_hash"), table_name="device_fingerprints")
    if _has_index(bind, "device_fingerprints", op.f("ix_device_fingerprints_user_id")):
        op.drop_index(op.f("ix_device_fingerprints_user_id"), table_name="device_fingerprints")
    if _has_table(bind, "device_fingerprints"):
        op.drop_table("device_fingerprints")
