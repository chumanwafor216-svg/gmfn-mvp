from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PREVIOUS_REVISION = "20261016_spotlight_lifecycle"
MEMBER_REVISION = "20261016_member_credit_v1"


def _config(db_path: Path) -> Config:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{db_path.as_posix()}")
    return config


def _upgrade(config: Config, disposable, revision: str) -> None:
    with disposable.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, revision)


def _downgrade(config: Config, disposable, revision: str) -> None:
    with disposable.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, revision)


def test_duplicate_issuance_reference_preflight_refuses_upgrade_without_deleting_rows(tmp_path) -> None:
    db_path = tmp_path / "duplicate-preflight.db"
    config = _config(db_path)
    disposable = create_engine(f"sqlite:///{db_path.as_posix()}")
    _upgrade(config, disposable, PREVIOUS_REVISION)
    with disposable.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        for index, viewer_id in enumerate((101, 102), start=1):
            conn.execute(
                text(
                    """
                    INSERT INTO spotlight_presentation_leases (
                        presentation_id, issuance_key, viewer_user_id, campaign_id,
                        placement_broadcast_id, content_version, surface, status,
                        issued_at, lease_expires_at
                    ) VALUES (
                        :presentation_id, 'duplicate-global-key', :viewer_id, 999,
                        999, 1, 'public_shop_spotlight_rail', 'issued',
                        :issued_at, :lease_expires_at
                    )
                    """
                ),
                {
                    "presentation_id": f"duplicate-{index}",
                    "viewer_id": viewer_id,
                    "issued_at": datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc),
                    "lease_expires_at": datetime(2026, 10, 16, 12, 0, 30, tzinfo=timezone.utc),
                },
            )
    with pytest.raises(RuntimeError, match="duplicate references exist"):
        _upgrade(config, disposable, MEMBER_REVISION)
    with disposable.begin() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM spotlight_presentation_leases")).scalar_one() == 2


def test_upgrade_preserves_exact_legacy_expiry_and_downgrade_refuses_financial_history(tmp_path) -> None:
    db_path = tmp_path / "expiry-and-downgrade.db"
    config = _config(db_path)
    disposable = create_engine(f"sqlite:///{db_path.as_posix()}")
    _upgrade(config, disposable, PREVIOUS_REVISION)
    exact_expiry = "2026-10-16 15:00:00+00:00"
    with disposable.begin() as conn:
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, feature_code, plan_code, quantity_total,
                    quantity_used, status, starts_at, expires_at, payment_reference
                ) VALUES (
                    1, 999, 'spotlight_priority', 'legacy-preserved', 1,
                    0, 'active', '2026-10-15 15:00:00+00:00',
                    :expires_at, 'legacy-expiry-preserved'
                )
                """
            ),
            {"expires_at": exact_expiry},
        )
    _upgrade(config, disposable, MEMBER_REVISION)
    with disposable.begin() as conn:
        stored = str(conn.execute(text("SELECT expires_at FROM feature_entitlements WHERE id = 1")).scalar_one())
        assert stored == exact_expiry
        conn.execute(text("PRAGMA foreign_keys=OFF"))
        conn.execute(
            text(
                """
                INSERT INTO member_credit_pack_versions (
                    pack_code, version, credit_units, quoted_amount_minor,
                    currency, status, created_at
                ) VALUES (
                    'synthetic.downgrade.guard', 1, 1, 1,
                    'TST', 'inactive', '2026-10-16 15:00:00+00:00'
                )
                """
            )
        )
    with pytest.raises(RuntimeError, match="Unsafe downgrade refused"):
        _downgrade(config, disposable, PREVIOUS_REVISION)
    with disposable.begin() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM member_credit_pack_versions")).scalar_one() == 1
