from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services.community_integrity_service import ensure_future_expiry


def test_ensure_future_expiry_repairs_bad_order():
    created = datetime.now(timezone.utc)
    expires = created - timedelta(hours=1)

    new_created, new_expires = ensure_future_expiry(
        created_at=created,
        expires_at=expires,
        ttl_hours=72,
    )

    assert new_created == created
    assert new_expires > new_created


def test_ensure_future_expiry_creates_default_when_missing():
    created = datetime.now(timezone.utc)

    new_created, new_expires = ensure_future_expiry(
        created_at=created,
        expires_at=None,
        ttl_hours=72,
    )

    assert new_created == created
    assert new_expires > new_created