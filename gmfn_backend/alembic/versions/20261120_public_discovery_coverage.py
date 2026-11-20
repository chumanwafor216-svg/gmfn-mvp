"""record public discovery search coverage completeness"""

from alembic import op
import sqlalchemy as sa


revision = "20261120_public_discovery_coverage"
down_revision = "20261120_public_merchant_discovery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "marketplace_public_discovery_search_events",
        sa.Column("coverage_complete", sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.add_column(
        "marketplace_public_discovery_search_events",
        sa.Column("scan_limit_reached", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column(
        "marketplace_public_discovery_search_events",
        sa.Column("scanned_publication_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index(
        "ix_marketplace_public_discovery_search_coverage_v1",
        "marketplace_public_discovery_search_events",
        ["coverage_complete", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_marketplace_public_discovery_search_coverage_v1",
        table_name="marketplace_public_discovery_search_events",
    )
    op.drop_column("marketplace_public_discovery_search_events", "scanned_publication_count")
    op.drop_column("marketplace_public_discovery_search_events", "scan_limit_reached")
    op.drop_column("marketplace_public_discovery_search_events", "coverage_complete")
