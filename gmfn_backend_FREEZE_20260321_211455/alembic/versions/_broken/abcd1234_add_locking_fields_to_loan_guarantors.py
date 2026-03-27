from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "loan_guarantors",
        sa.Column(
            "is_locked",
            sa.Boolean(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "loan_guarantors",
        sa.Column(
            "locked_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "loan_guarantors",
        sa.Column(
            "released_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("loan_guarantors", "released_amount")
    op.drop_column("loan_guarantors", "locked_amount")
    op.drop_column("loan_guarantors", "is_locked")
