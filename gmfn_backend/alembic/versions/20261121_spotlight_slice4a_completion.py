"""complete Spotlight Slice 4A verification safeguards"""

from alembic import op
import sqlalchemy as sa


revision = "20261121_spotlight_slice4a_completion"
down_revision = "20261121_spotlight_slice4_payments"
branch_labels = None
depends_on = None


POLICY_COLUMNS = (
    "processing_fee_policy_status",
    "delivery_cost_policy_status",
    "community_allocation_policy_status",
)


def upgrade() -> None:
    with op.batch_alter_table("advertising_campaign_settlements") as batch:
        for column_name in POLICY_COLUMNS:
            batch.add_column(
                sa.Column(
                    column_name,
                    sa.String(32),
                    nullable=False,
                    server_default="pending_policy",
                )
            )
    op.execute(
        "UPDATE advertising_campaign_settlements "
        "SET processing_fee_policy_status = 'recorded', "
        "delivery_cost_policy_status = 'recorded', "
        "community_allocation_policy_status = 'recorded' "
        "WHERE settlement_scope = 'house_campaign'"
    )


def downgrade() -> None:
    with op.batch_alter_table("advertising_campaign_settlements") as batch:
        for column_name in reversed(POLICY_COLUMNS):
            batch.drop_column(column_name)