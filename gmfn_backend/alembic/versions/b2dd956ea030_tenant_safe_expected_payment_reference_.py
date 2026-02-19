"""tenant-safe expected_payment reference uniqueness + bank_event_id unique (SQLite-safe)

Revision ID: b2dd956ea030
Revises: 375c4be49afa
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "b2dd956ea030"
down_revision = "375c4be49afa"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return bool(insp.has_table(name))


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        # Minimal non-sqlite support (not needed for MVP right now)
        return

    # If missing, create final form directly
    if not _has_table("expected_payments"):
        op.execute(
            """
            CREATE TABLE expected_payments (
                id INTEGER NOT NULL PRIMARY KEY,
                clan_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                expected_type VARCHAR(32) NOT NULL,
                amount NUMERIC(18, 2) NOT NULL,
                currency VARCHAR(8) NOT NULL,
                due_at DATETIME,
                reference_display VARCHAR(64) NOT NULL,
                reference_normalized VARCHAR(128) NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'expected',
                status_reason VARCHAR(64),
                bank_event_id INTEGER,
                trust_event_id INTEGER,
                created_at DATETIME NOT NULL,
                meta_json TEXT,

                CONSTRAINT uq_expected_payments_clan_refdisp_v1 UNIQUE (clan_id, reference_display),
                CONSTRAINT uq_expected_payments_clan_refnorm_v1 UNIQUE (clan_id, reference_normalized),
                CONSTRAINT uq_expected_payments_bank_event_id_v1 UNIQUE (bank_event_id)
            )
            """
        )
        op.execute("CREATE INDEX ix_expected_payments_clan_user_v1 ON expected_payments (clan_id, user_id)")
        op.execute("CREATE INDEX ix_expected_payments_clan_type_v1 ON expected_payments (clan_id, expected_type)")
        op.execute("CREATE INDEX ix_expected_payments_status_v1 ON expected_payments (status)")
        op.execute("CREATE INDEX ix_expected_payments_clan_refnorm_v1 ON expected_payments (clan_id, reference_normalized)")
        op.execute("CREATE INDEX ix_expected_payments_clan_refnorm_ccy_v1 ON expected_payments (clan_id, reference_normalized, currency)")
        return

    # If exists, rebuild into final form
    op.execute(
        """
        CREATE TABLE expected_payments__new (
            id INTEGER NOT NULL PRIMARY KEY,
            clan_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            expected_type VARCHAR(32) NOT NULL,
            amount NUMERIC(18, 2) NOT NULL,
            currency VARCHAR(8) NOT NULL,
            due_at DATETIME,
            reference_display VARCHAR(64) NOT NULL,
            reference_normalized VARCHAR(128) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'expected',
            status_reason VARCHAR(64),
            bank_event_id INTEGER,
            trust_event_id INTEGER,
            created_at DATETIME NOT NULL,
            meta_json TEXT,

            CONSTRAINT uq_expected_payments_clan_refdisp_v1 UNIQUE (clan_id, reference_display),
            CONSTRAINT uq_expected_payments_clan_refnorm_v1 UNIQUE (clan_id, reference_normalized),
            CONSTRAINT uq_expected_payments_bank_event_id_v1 UNIQUE (bank_event_id)
        )
        """
    )
    op.execute(
        """
        INSERT INTO expected_payments__new (
            id, clan_id, user_id, expected_type, amount, currency, due_at,
            reference_display, reference_normalized,
            status, status_reason,
            bank_event_id, trust_event_id,
            created_at, meta_json
        )
        SELECT
            id, clan_id, user_id, expected_type, amount, currency, due_at,
            reference_display, reference_normalized,
            status, status_reason,
            bank_event_id, trust_event_id,
            created_at, meta_json
        FROM expected_payments
        """
    )
    op.execute("DROP TABLE expected_payments")
    op.execute("ALTER TABLE expected_payments__new RENAME TO expected_payments")

    op.execute("CREATE INDEX ix_expected_payments_clan_user_v1 ON expected_payments (clan_id, user_id)")
    op.execute("CREATE INDEX ix_expected_payments_clan_type_v1 ON expected_payments (clan_id, expected_type)")
    op.execute("CREATE INDEX ix_expected_payments_status_v1 ON expected_payments (status)")
    op.execute("CREATE INDEX ix_expected_payments_clan_refnorm_v1 ON expected_payments (clan_id, reference_normalized)")
    op.execute("CREATE INDEX ix_expected_payments_clan_refnorm_ccy_v1 ON expected_payments (clan_id, reference_normalized, currency)")


def downgrade() -> None:
    return