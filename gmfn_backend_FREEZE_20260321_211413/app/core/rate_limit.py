# app/core/rate_limit.py
from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass
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

    def check(self, *, key: str, max_requests: int, window_seconds: int) -> RateLimitResult:
        now = time.time()
        q = self._hits.get(key)
        if q is None:
            q = deque()
            self._hits[key] = q

        cutoff = now - float(window_seconds)
        while q and q[0] < cutoff:
            q.popleft()

        if len(q) >= int(max_requests):
            reset_in = int(max(0.0, (q[0] + float(window_seconds)) - now)) if q else int(window_seconds)
            return RateLimitResult(ok=False, remaining=0, reset_in_seconds=reset_in)

        q.append(now)
        remaining = int(max_requests) - len(q)
        reset_in = int(max(0.0, (q[0] + float(window_seconds)) - now)) if q else int(window_seconds)
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