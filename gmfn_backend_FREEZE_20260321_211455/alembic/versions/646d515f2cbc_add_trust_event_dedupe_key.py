"""add trust event dedupe key"""

from alembic import op
import sqlalchemy as sa

revision = "646d515f2cbc"
down_revision = "20260307_add_trustslip_lineage_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trust_events",
        sa.Column("dedupe_key", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_trust_events_dedupe_key",
        "trust_events",
        ["dedupe_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_trust_events_dedupe_key", table_name="trust_events")
    op.drop_column("trust_events", "dedupe_key")