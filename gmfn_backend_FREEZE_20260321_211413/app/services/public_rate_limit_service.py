# app/services/public_rate_limit_service.py
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import Deque, Dict, Tuple


def _now_ts() -> float:
    return datetime.now(timezone.utc).timestamp()


@dataclass(frozen=True)
class RateLimitRule:
    window_seconds: int
    max_requests: int


_lock = Lock()
_hits: Dict[Tuple[str, str], Deque[float]] = {}


def check_rate_limit(*, bucket: str, key: str, rule: RateLimitRule) -> bool:
    """
    Returns True if allowed, False if rate-limited.

    bucket: logical category (e.g. "merchant_verify")
    key: identifier (usually client IP)
    """
    now = _now_ts()
    cutoff = now - float(rule.window_seconds)

    k = (bucket, key)
    with _lock:
        q = _hits.get(k)
        if q is None:
            q = deque()
            _hits[k] = q

        while q and q[0] < cutoff:
            q.popleft()

        if len(q) >= rule.max_requests:
            return False

        q.append(now)
        return True