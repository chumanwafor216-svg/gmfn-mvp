# app/core/rate_limit.py
from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass
from threading import Lock
from typing import Deque, Dict


@dataclass(frozen=True)
class RateLimitResult:
    ok: bool
    remaining: int
    reset_in_seconds: int


class InMemoryRateLimiter:
    """
    Minimal in-memory rate limiter (MVP).
    Sliding window per key.

    NOTE: per-process only. Good for MVP/pilot. Redis later for production.
    """

    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = {}
        self._largest_window_seconds = 1
        self._last_sweep_at = 0.0
        self._lock = Lock()

    def _sweep_stale(self, now: float) -> None:
        cutoff = now - float(self._largest_window_seconds)
        stale_keys = [
            key
            for key, values in self._hits.items()
            if not values or values[-1] < cutoff
        ]
        for key in stale_keys:
            self._hits.pop(key, None)
        self._last_sweep_at = now

    def check(self, *, key: str, max_requests: int, window_seconds: int) -> RateLimitResult:
        now = time.time()
        window = max(1, int(window_seconds))
        with self._lock:
            self._largest_window_seconds = max(self._largest_window_seconds, window)
            if now - self._last_sweep_at >= 5.0:
                self._sweep_stale(now)

            q = self._hits.get(key)
            if q is None:
                q = deque()
                self._hits[key] = q

            cutoff = now - float(window)
            while q and q[0] < cutoff:
                q.popleft()

            if len(q) >= int(max_requests):
                reset_in = int(max(0.0, (q[0] + float(window)) - now)) if q else window
                return RateLimitResult(ok=False, remaining=0, reset_in_seconds=reset_in)

            q.append(now)
            remaining = int(max_requests) - len(q)
            reset_in = int(max(0.0, (q[0] + float(window)) - now)) if q else window
            return RateLimitResult(ok=True, remaining=remaining, reset_in_seconds=reset_in)


rate_limiter = InMemoryRateLimiter()


def client_ip(headers: dict, fallback: str = "unknown") -> str:
    """
    Best-effort IP extraction.
    Behind proxy: uses X-Forwarded-For (first IP).
    """
    xff = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For")
    if xff:
        return str(xff).split(",")[0].strip() or fallback

    xri = headers.get("x-real-ip") or headers.get("X-Real-IP")
    if xri:
        return str(xri).strip() or fallback

    return fallback
