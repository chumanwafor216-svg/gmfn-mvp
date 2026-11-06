"""scope phone verification to activation join requests

Revision ID: 20261106_activation_phone
Revises: 20261106_notice_voice
Create Date: 2026-11-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261106_activation_phone"
down_revision: Union[str, Sequence[str], None] = "20261106_notice_voice"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("entry_phone_verifications") as batch_op:
        batch_op.add_column(
            sa.Column("activation_join_request_id", sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_entry_phone_verifications_activation_join_request_id",
            "clan_join_requests",
            ["activation_join_request_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index(
            "ix_entry_phone_verifications_activation_join_request_id",
            ["activation_join_request_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("entry_phone_verifications") as batch_op:
        batch_op.drop_index(
            "ix_entry_phone_verifications_activation_join_request_id"
        )
        batch_op.drop_constraint(
            "fk_entry_phone_verifications_activation_join_request_id",
            type_="foreignkey",
        )
        batch_op.drop_column("activation_join_request_id")
