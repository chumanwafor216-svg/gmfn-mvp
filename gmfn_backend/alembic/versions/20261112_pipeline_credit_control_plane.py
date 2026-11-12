"""add Pipeline Credit commercial control plane versions"""

from alembic import op
import sqlalchemy as sa


revision = "20261112_pipeline_credit_control_plane"
down_revision = "20261112_pipeline_credit_commerce"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pipeline_credit_commercial_control_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("lifecycle_status", sa.String(length=24), nullable=False),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version", name="uq_pipeline_credit_commercial_control_version_v1"),
    )
    op.create_index(
        "ix_pipeline_credit_commercial_control_status_v1",
        "pipeline_credit_commercial_control_versions",
        ["lifecycle_status", "version"],
    )

    op.create_table(
        "pipeline_credit_acquisition_pack_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("profile_code", sa.String(length=48), nullable=False),
        sa.Column("profile_label", sa.String(length=120), nullable=False),
        sa.Column("country_codes_json", sa.Text(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("pack_code", sa.String(length=48), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("credit_quantity", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("cash_amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("lifecycle_status", sa.String(length=24), nullable=False),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "profile_code",
            "pack_code",
            "version",
            name="uq_pipeline_credit_acquisition_pack_version_v1",
        ),
    )
    op.create_index(
        "ix_pipeline_credit_acquisition_pack_current_v1",
        "pipeline_credit_acquisition_pack_versions",
        ["profile_code", "pack_code", "version"],
    )
    op.create_index(
        "ix_pipeline_credit_acquisition_pack_status_v1",
        "pipeline_credit_acquisition_pack_versions",
        ["lifecycle_status", "currency"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    control_count = int(
        bind.execute(
            sa.text("SELECT COUNT(*) FROM pipeline_credit_commercial_control_versions")
        ).scalar()
        or 0
    )
    acquisition_count = int(
        bind.execute(
            sa.text("SELECT COUNT(*) FROM pipeline_credit_acquisition_pack_versions")
        ).scalar()
        or 0
    )
    if control_count or acquisition_count:
        raise RuntimeError(
            "Unsafe downgrade refused: Pipeline Credit control-plane evidence exists; roll forward instead."
        )

    op.drop_index(
        "ix_pipeline_credit_acquisition_pack_status_v1",
        table_name="pipeline_credit_acquisition_pack_versions",
    )
    op.drop_index(
        "ix_pipeline_credit_acquisition_pack_current_v1",
        table_name="pipeline_credit_acquisition_pack_versions",
    )
    op.drop_table("pipeline_credit_acquisition_pack_versions")
    op.drop_index(
        "ix_pipeline_credit_commercial_control_status_v1",
        table_name="pipeline_credit_commercial_control_versions",
    )
    op.drop_table("pipeline_credit_commercial_control_versions")
