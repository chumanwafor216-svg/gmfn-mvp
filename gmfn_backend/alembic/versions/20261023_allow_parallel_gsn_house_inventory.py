"""allow parallel active GSN house inventory

Revision ID: 20261023_parallel_gsn_house
Revises: 20261019_phone_verification_provider_audit_v1
Create Date: 2026-10-23
"""

from alembic import op
import sqlalchemy as sa


revision = "20261023_parallel_gsn_house"
down_revision = "20261019_phone_verification_provider_audit_v1"
branch_labels = None
depends_on = None


INDEX_NAME = "uq_spotlight_campaigns_one_active_owner"
TABLE_NAME = "spotlight_campaigns"


def upgrade() -> None:
    op.drop_index(INDEX_NAME, table_name=TABLE_NAME)
    op.create_index(
        INDEX_NAME,
        TABLE_NAME,
        ["owner_user_id"],
        unique=True,
        sqlite_where=sa.text("status = 'active' AND source_kind != 'gsn_house'"),
        postgresql_where=sa.text("status = 'active' AND source_kind != 'gsn_house'"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    # Restoring the historic index requires ending older overlapping GSN rows.
    bind.execute(
        sa.text(
            """
            UPDATE spotlight_campaigns
            SET status = 'ended', ended_at = CURRENT_TIMESTAMP
            WHERE source_kind = 'gsn_house'
              AND status = 'active'
              AND id NOT IN (
                  SELECT MAX(id)
                  FROM spotlight_campaigns
                  WHERE source_kind = 'gsn_house' AND status = 'active'
                  GROUP BY owner_user_id
              )
            """
        )
    )
    op.drop_index(INDEX_NAME, table_name=TABLE_NAME)
    op.create_index(
        INDEX_NAME,
        TABLE_NAME,
        ["owner_user_id"],
        unique=True,
        sqlite_where=sa.text("status = 'active'"),
        postgresql_where=sa.text("status = 'active'"),
    )
