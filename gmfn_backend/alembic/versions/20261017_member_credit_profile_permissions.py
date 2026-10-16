"""Add server-owned personal member-credit service permissions.

Revision ID: 20261017_member_credit_profile_permissions_v1
Revises: 20261017_member_credit_purchase_link_v1
"""

from alembic import op
import sqlalchemy as sa


revision = "20261017_member_credit_profile_permissions_v1"
down_revision = "20261017_member_credit_purchase_link_v1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("member_credit_service_permissions_json", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    bind = op.get_bind()
    enabled_or_saved = int(
        bind.execute(
            sa.text(
                """
                SELECT COUNT(*)
                FROM user_settings
                WHERE COALESCE(member_credit_service_permissions_json, '')
                      NOT IN ('', '{}')
                """
            )
        ).scalar()
        or 0
    )
    if enabled_or_saved:
        raise RuntimeError(
            "Unsafe downgrade refused: saved personal member-credit service permissions exist."
        )
    with op.batch_alter_table("user_settings") as batch_op:
        batch_op.drop_column("member_credit_service_permissions_json")
