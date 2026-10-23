from __future__ import annotations

import app.core.rate_limit as core_rate_limit
import app.services.invites_service as invites
import app.services.public_rate_limit_service as public_rate_limit


def test_core_rate_limiter_removes_expired_keys_without_evicting_active_history(
    monkeypatch,
):
    now = [1_000.0]
    monkeypatch.setattr(core_rate_limit.time, "time", lambda: now[0])
    limiter = core_rate_limit.InMemoryRateLimiter()

    for index in range(1_000):
        limiter.check(
            key=f"public-route:{index}",
            max_requests=30,
            window_seconds=60,
        )
    assert len(limiter._hits) == 1_000

    now[0] += 61.0
    limiter.check(key="public-route:new", max_requests=30, window_seconds=60)
    assert list(limiter._hits) == ["public-route:new"]


def test_public_rate_limiter_removes_expired_keys(monkeypatch):
    now = [1_000.0]
    monkeypatch.setattr(public_rate_limit, "_now_ts", lambda: now[0])
    public_rate_limit._hits.clear()
    monkeypatch.setattr(public_rate_limit, "_last_sweep_at", 0.0)
    monkeypatch.setattr(public_rate_limit, "_largest_window_seconds", 1)
    rule = public_rate_limit.RateLimitRule(window_seconds=60, max_requests=20)

    for index in range(1_000):
        assert public_rate_limit.check_rate_limit(
            bucket="merchant",
            key=str(index),
            rule=rule,
        )
    assert len(public_rate_limit._hits) == 1_000

    now[0] += 61.0
    assert public_rate_limit.check_rate_limit(
        bucket="merchant",
        key="new",
        rule=rule,
    )
    assert list(public_rate_limit._hits) == [("merchant", "new")]


def test_invite_rate_limit_maps_remove_expired_keys(monkeypatch):
    now = [1_000.0]
    monkeypatch.setattr(invites.time, "time", lambda: now[0])
    invites._INVITE_CREATE_BUCKET.clear()
    invites._JOIN_BUCKET.clear()
    monkeypatch.setattr(invites, "_INVITE_LAST_SWEEP_AT", 0.0)
    monkeypatch.setattr(invites, "_JOIN_LAST_SWEEP_AT", 0.0)

    for index in range(1_000):
        invites._rate_limit_create_invite(index, 1)
        invites._rate_limit_join(index)
    assert len(invites._INVITE_CREATE_BUCKET) == 1_000
    assert len(invites._JOIN_BUCKET) == 1_000

    now[0] += 3_601.0
    invites._rate_limit_create_invite(2_000, 1)
    invites._rate_limit_join(2_000)
    assert list(invites._INVITE_CREATE_BUCKET) == [(2_000, 1)]
    assert list(invites._JOIN_BUCKET) == [2_000]
