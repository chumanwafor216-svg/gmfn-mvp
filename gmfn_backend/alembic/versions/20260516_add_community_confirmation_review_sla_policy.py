"""add community confirmation review SLA policy

Revision ID: 20260516_add_community_confirmation_review_sla_policy
Revises: 20260516_add_community_confirmation_review_evidence
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa


revision = "20260516_add_community_confirmation_review_sla_policy"
down_revision = "20260516_add_community_confirmation_review_evidence"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    table_name = "community_confirmation_policies"
    if not _has_table(bind, table_name):
        return

    if not _has_column(bind, table_name, "review_attention_after_hours"):
        op.add_column(
            table_name,
            sa.Column(
                "review_attention_after_hours",
                sa.Integer(),
                server_default="24",
                nullable=False,
            ),
        )
    if not _has_column(bind, table_name, "review_overdue_after_hours"):
        op.add_column(
            table_name,
            sa.Column(
                "review_overdue_after_hours",
                sa.Integer(),
                server_default="72",
                nullable=False,
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    table_name = "community_confirmation_policies"
    if not _has_table(bind, table_name):
        return

    if _has_column(bind, table_name, "review_overdue_after_hours"):
        op.drop_column(table_name, "review_overdue_after_hours")
    if _has_column(bind, table_name, "review_attention_after_hours"):
        op.drop_column(table_name, "review_attention_after_hours")
