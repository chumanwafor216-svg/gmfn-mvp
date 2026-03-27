"""add join request applicant fields

Revision ID: e4cf68bffd20
Revises: marketplace_canonical_shop_owner_001
Create Date: 2026-03-19
"""

from alembic import op
import sqlalchemy as sa


revision = "e4cf68bffd20"
down_revision = "f3c2c95a3767"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("clan_join_requests", schema=None) as batch_op:
        batch_op.add_column(sa.Column("applicant_user_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("invite_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("invited_by_user_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True))

        batch_op.create_index(
            "ix_clan_join_requests_applicant_user_id",
            ["applicant_user_id"],
            unique=False,
        )
        batch_op.create_index(
            "ix_clan_join_requests_invite_id",
            ["invite_id"],
            unique=False,
        )
        batch_op.create_index(
            "ix_clan_join_requests_invited_by_user_id",
            ["invited_by_user_id"],
            unique=False,
        )

        batch_op.create_foreign_key(
            "fk_clan_join_requests_applicant_user_id_users",
            "users",
            ["applicant_user_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            "fk_clan_join_requests_invite_id_clan_invites",
            "clan_invites",
            ["invite_id"],
            ["id"],
        )
        batch_op.create_foreign_key(
            "fk_clan_join_requests_invited_by_user_id_users",
            "users",
            ["invited_by_user_id"],
            ["id"],
        )

    op.execute(
        """
        UPDATE clan_join_requests
        SET applicant_user_id = requester_user_id
        WHERE applicant_user_id IS NULL
        """
    )

    with op.batch_alter_table("clan_join_requests", schema=None) as batch_op:
        batch_op.drop_index("ix_clan_join_requests_requester_user_id")
        batch_op.drop_column("requester_user_id")


def downgrade():
    with op.batch_alter_table("clan_join_requests", schema=None) as batch_op:
        batch_op.add_column(sa.Column("requester_user_id", sa.INTEGER(), nullable=True))
        batch_op.create_index(
            "ix_clan_join_requests_requester_user_id",
            ["requester_user_id"],
            unique=False,
        )

    op.execute(
        """
        UPDATE clan_join_requests
        SET requester_user_id = applicant_user_id
        WHERE requester_user_id IS NULL
        """
    )

    with op.batch_alter_table("clan_join_requests", schema=None) as batch_op:
        batch_op.drop_constraint(
            "fk_clan_join_requests_invited_by_user_id_users",
            type_="foreignkey",
        )
        batch_op.drop_constraint(
            "fk_clan_join_requests_invite_id_clan_invites",
            type_="foreignkey",
        )
        batch_op.drop_constraint(
            "fk_clan_join_requests_applicant_user_id_users",
            type_="foreignkey",
        )

        batch_op.drop_index("ix_clan_join_requests_invited_by_user_id")
        batch_op.drop_index("ix_clan_join_requests_invite_id")
        batch_op.drop_index("ix_clan_join_requests_applicant_user_id")

        batch_op.drop_column("decided_at")
        batch_op.drop_column("invited_by_user_id")
        batch_op.drop_column("invite_id")
        batch_op.drop_column("applicant_user_id")