"""add auditable demand voice deletion tombstones

Revision ID: 20261106_demand_voice_delete
Revises: 20261106_demand_voice
Create Date: 2026-11-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261106_demand_voice_delete"
down_revision: Union[str, Sequence[str], None] = "20261106_demand_voice"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("demand_audio_attachments") as batch_op:
        batch_op.add_column(
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column("deleted_by_user_id", sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_demand_audio_deleted_by_user_v1",
            "users",
            ["deleted_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(
            "ix_demand_audio_attachments_deleted_at",
            ["deleted_at"],
            unique=False,
        )
        batch_op.create_index(
            "ix_demand_audio_attachments_deleted_by_user_id",
            ["deleted_by_user_id"],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("demand_audio_attachments") as batch_op:
        batch_op.drop_index("ix_demand_audio_attachments_deleted_by_user_id")
        batch_op.drop_index("ix_demand_audio_attachments_deleted_at")
        batch_op.drop_constraint(
            "fk_demand_audio_deleted_by_user_v1",
            type_="foreignkey",
        )
        batch_op.drop_column("deleted_by_user_id")
        batch_op.drop_column("deleted_at")
