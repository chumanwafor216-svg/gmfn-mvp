# app/core/rate_limit.py
from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass
from typing import Deque, Dict, Optional


@dataclass(frozen=True)
class RateLimitResult:
    ok: bool
    remaining: int
    reset_in_seconds: int


class InMemoryRateLimiter:
    """
    Minimal in-memory rate limiter (MVP).
    - key: e.g., IP + route name
    - window_seconds: sliding window length
    - max_requests: max allowed in window
    """

    def __init__(self) -> None:
        self._hits: Dict[str, Deque[float]] = {}

    def check(self, *, key: str, max_requests: int, window_seconds: int) -> RateLimitResult:
        now = time.time()
        q = self._hits.get(key)
        if q is None:
            q = deque()
            self._hits[key] = q

        # Drop old hits
        cutoff = now - float(window_seconds)
        while q and q[0] < cutoff:
            q.popleft()

        if len(q) >= int(max_requests):
            reset_in = int(max(0.0, (q[0] + float(window_seconds)) - now)) if q else window_seconds
            return RateLimitResult(ok=False, remaining=0, reset_in_seconds=reset_in)

        q.append(now)
        remaining = int(max_requests) - len(q)
        reset_in = int(max(0.0, (q[0] + float(window_seconds)) - now)) if q else window_seconds
        return RateLimitResult(ok=True, remaining=remaining, reset_in_seconds=reset_in)


# global singleton for the app process
rate_limiter = InMemoryRateLimiter()


def client_ip(headers: dict, fallback: str = "unknown") -> str:
    """
    Best-effort IP extraction.
    In production behind proxy you'll rely on X-Forwarded-For (first IP).
    """
    xff = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For")
    if xff:
        # take first in list
        return str(xff).split(",")[0].strip() or fallback
    xri = headers.get("x-real-ip") or headers.get("X-Real-IP")
    if xri:
        return str(xri).strip() or fallback
    return fallback