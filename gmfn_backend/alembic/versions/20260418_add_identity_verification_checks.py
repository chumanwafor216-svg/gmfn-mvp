"""add identity verification checks

Revision ID: 20260418_add_identity_verification_checks
Revises: 20260418_add_identity_recovery_profiles
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_identity_verification_checks"
down_revision = "20260418_add_identity_recovery_profiles"
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

    if not _has_table(bind, "identity_verification_checks"):
        op.create_table(
            "identity_verification_checks",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("entry_phone_verification_id", sa.Integer(), nullable=True),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("verification_type", sa.String(length=32), nullable=False),
            sa.Column("region_code", sa.String(length=16), nullable=True),
            sa.Column("provider_key", sa.String(length=64), nullable=False),
            sa.Column(
                "status",
                sa.String(length=32),
                nullable=False,
                server_default="pending",
            ),
            sa.Column("subject_reference", sa.String(length=160), nullable=True),
            sa.Column("confidence_score", sa.Integer(), nullable=True),
            sa.Column("explanation", sa.Text(), nullable=True),
            sa.Column("submitted_payload_json", sa.Text(), nullable=True),
            sa.Column("normalized_identity_json", sa.Text(), nullable=True),
            sa.Column("provider_response_json", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["entry_phone_verification_id"],
                ["entry_phone_verifications.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    wanted_indexes = {
        "ix_identity_verification_checks_id": ["id"],
        "ix_identity_verification_checks_entry_phone_verification_id": ["entry_phone_verification_id"],
        "ix_identity_verification_checks_user_id": ["user_id"],
        "ix_identity_verification_checks_verification_type": ["verification_type"],
        "ix_identity_verification_checks_region_code": ["region_code"],
        "ix_identity_verification_checks_status": ["status"],
    }
    for name, columns in wanted_indexes.items():
        if not _has_index(bind, "identity_verification_checks", name):
            op.create_index(name, "identity_verification_checks", columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    for name in [
        "ix_identity_verification_checks_status",
        "ix_identity_verification_checks_region_code",
        "ix_identity_verification_checks_verification_type",
        "ix_identity_verification_checks_user_id",
        "ix_identity_verification_checks_entry_phone_verification_id",
        "ix_identity_verification_checks_id",
    ]:
        if _has_index(bind, "identity_verification_checks", name):
            op.drop_index(name, table_name="identity_verification_checks")
    if _has_table(bind, "identity_verification_checks"):
        op.drop_table("identity_verification_checks")
