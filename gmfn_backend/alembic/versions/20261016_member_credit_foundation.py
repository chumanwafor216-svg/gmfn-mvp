"""inactive member-credit foundation and request fingerprints

Revision ID: 20261016_member_credit_v1
Revises: 20261016_spotlight_lifecycle
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

from app.db.database import Base
from app.db import member_credit_models  # noqa: F401


revision = "20261016_member_credit_v1"
down_revision = "20261016_spotlight_lifecycle"
branch_labels = None
depends_on = None


MEMBER_CREDIT_TABLES = (
    "member_credit_pack_versions",
    "member_credit_service_versions",
    "member_credit_purchase_orders",
    "member_credit_provider_payments",
    "member_credit_payment_allocations",
    "member_service_credit_accounts",
    "member_service_credit_ledger_entries",
    "member_credit_award_obligations",
    "member_credit_service_spend_orders",
    "member_credit_adjustments",
    "financial_notification_outbox",
)


def upgrade() -> None:
    bind = op.get_bind()
    duplicate_issuance = bind.execute(
        sa.text(
            "SELECT issuance_key, COUNT(*) AS row_count "
            "FROM spotlight_presentation_leases "
            "GROUP BY issuance_key HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicate_issuance is not None:
        raise RuntimeError(
            "Cannot add global Spotlight issuance-key uniqueness while duplicate references exist; "
            "preserve the rows and reconcile them explicitly."
        )

    op.add_column(
        "spotlight_presentation_leases",
        sa.Column("issuance_fingerprint", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "uq_spotlight_presentation_issuance_key_v2",
        "spotlight_presentation_leases",
        ["issuance_key"],
        unique=True,
    )
    op.add_column(
        "feature_usage_events",
        sa.Column("request_fingerprint", sa.String(length=64), nullable=True),
    )

    selected = [Base.metadata.tables[name] for name in MEMBER_CREDIT_TABLES]
    Base.metadata.create_all(bind=bind, tables=selected, checkfirst=False)


def downgrade() -> None:
    bind = op.get_bind()
    for table_name in MEMBER_CREDIT_TABLES:
        count = int(bind.execute(sa.text(f"SELECT COUNT(*) FROM {table_name}")).scalar() or 0)
        if count:
            raise RuntimeError(
                f"Unsafe downgrade refused: {table_name} contains {count} financial/accounting rows."
            )
    lease_fingerprints = int(
        bind.execute(
            sa.text(
                "SELECT COUNT(*) FROM spotlight_presentation_leases "
                "WHERE issuance_fingerprint IS NOT NULL"
            )
        ).scalar()
        or 0
    )
    usage_fingerprints = int(
        bind.execute(
            sa.text(
                "SELECT COUNT(*) FROM feature_usage_events "
                "WHERE request_fingerprint IS NOT NULL"
            )
        ).scalar()
        or 0
    )
    if lease_fingerprints or usage_fingerprints:
        raise RuntimeError(
            "Unsafe downgrade refused: idempotency fingerprints have been written; roll forward instead."
        )

    for table_name in reversed(MEMBER_CREDIT_TABLES):
        Base.metadata.tables[table_name].drop(bind=bind, checkfirst=False)
    op.drop_column("feature_usage_events", "request_fingerprint")
    op.drop_index(
        "uq_spotlight_presentation_issuance_key_v2",
        table_name="spotlight_presentation_leases",
    )
    op.drop_column("spotlight_presentation_leases", "issuance_fingerprint")
