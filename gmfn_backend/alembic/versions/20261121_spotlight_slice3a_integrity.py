"""add Spotlight Slice 3A delivery attribution and service-credit obligations"""

from alembic import op
import sqlalchemy as sa


revision = "20261121_spotlight_slice3a_integrity"
down_revision = "20261121_spotlight_slice3_commercial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "spotlight_commercial_opportunities",
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "spotlight_commercial_opportunities",
        sa.Column("availability_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "spotlight_commercial_presentation_attributions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("presentation_id", sa.String(80), nullable=False, unique=True),
        sa.Column(
            "booking_id",
            sa.Integer(),
            sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "opportunity_id",
            sa.Integer(),
            sa.ForeignKey("spotlight_commercial_opportunities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "campaign_id",
            sa.Integer(),
            sa.ForeignKey("spotlight_campaigns.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "clan_id",
            sa.Integer(),
            sa.ForeignKey("clans.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "viewer_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("selected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("visible_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("qualified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "exposure_event_id",
            sa.Integer(),
            sa.ForeignKey("spotlight_exposure_events.id", ondelete="SET NULL"),
            nullable=True,
            unique=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_spotlight_commercial_attribution_booking_v1",
        "spotlight_commercial_presentation_attributions",
        ["booking_id", "selected_at"],
    )
    op.create_index(
        "ix_spotlight_commercial_attribution_opportunity_v1",
        "spotlight_commercial_presentation_attributions",
        ["opportunity_id", "selected_at"],
    )
    op.create_table(
        "spotlight_commercial_service_credit_obligations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "remedy_id",
            sa.Integer(),
            sa.ForeignKey("spotlight_commercial_remedies.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "account_id",
            sa.Integer(),
            sa.ForeignKey("pipeline_credit_accounts.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "original_booking_id",
            sa.Integer(),
            sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("credit_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("remaining_credit_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="outstanding"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_spotlight_commercial_credit_obligation_account_v1",
        "spotlight_commercial_service_credit_obligations",
        ["account_id", "status"],
    )
    op.create_table(
        "spotlight_commercial_service_credit_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "obligation_id",
            sa.Integer(),
            sa.ForeignKey(
                "spotlight_commercial_service_credit_obligations.id",
                ondelete="CASCADE",
            ),
            nullable=False,
        ),
        sa.Column(
            "replacement_booking_id",
            sa.Integer(),
            sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("credit_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "obligation_id",
            "replacement_booking_id",
            name="uq_spotlight_commercial_credit_application_v1",
        ),
    )
    op.create_index(
        "ix_spotlight_commercial_credit_application_booking_v1",
        "spotlight_commercial_service_credit_applications",
        ["replacement_booking_id", "status"],
    )


def downgrade() -> None:
    op.drop_table("spotlight_commercial_service_credit_applications")
    op.drop_table("spotlight_commercial_service_credit_obligations")
    op.drop_table("spotlight_commercial_presentation_attributions")
    op.drop_column("spotlight_commercial_opportunities", "availability_expires_at")
    op.drop_column("spotlight_commercial_opportunities", "available_at")
