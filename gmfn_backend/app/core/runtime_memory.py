from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from typing import Any, Optional


_REQUEST_LOCK = threading.Lock()
_ACTIVE_REQUESTS = 0
_PEAK_REQUESTS = 0
_LAST_PERIODIC_LOG_AT = 0.0


def _read_text(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8").strip()
    except (OSError, UnicodeError):
        return None


def _proc_memory_kib(pid: int) -> tuple[Optional[int], Optional[int]]:
    status = _read_text(Path(f"/proc/{int(pid)}/status"))
    if not status:
        return None, None
    rss_kib: Optional[int] = None
    high_water_kib: Optional[int] = None
    for line in status.splitlines():
        if line.startswith("VmRSS:"):
            try:
                rss_kib = int(line.split()[1])
            except (IndexError, ValueError):
                pass
        elif line.startswith("VmHWM:"):
            try:
                high_water_kib = int(line.split()[1])
            except (IndexError, ValueError):
                pass
    return rss_kib, high_water_kib


def _direct_child_pids(pid: int) -> list[int]:
    raw = _read_text(Path(f"/proc/{int(pid)}/task/{int(pid)}/children"))
    if not raw:
        return []
    child_pids: list[int] = []
    for value in raw.split():
        try:
            child_pids.append(int(value))
        except ValueError:
            continue
    return child_pids


def _cgroup_value(paths: tuple[str, ...]) -> Optional[int]:
    for raw_path in paths:
        value = _read_text(Path(raw_path))
        if not value or value == "max":
            continue
        try:
            return int(value)
        except ValueError:
            continue
    return None


def memory_snapshot() -> dict[str, Any]:
    """Return low-cost Linux process/container memory without external packages."""

    pid = os.getpid()
    rss_kib, high_water_kib = _proc_memory_kib(pid)
    child_rss_kib = 0
    child_count = 0
    for child_pid in _direct_child_pids(pid):
        child_rss, _ = _proc_memory_kib(child_pid)
        if child_rss is not None:
            child_count += 1
            child_rss_kib += child_rss

    container_current = _cgroup_value(
        ("/sys/fs/cgroup/memory.current", "/sys/fs/cgroup/memory/memory.usage_in_bytes")
    )
    container_limit = _cgroup_value(
        ("/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes")
    )

    def mib_from_kib(value: Optional[int]) -> Optional[float]:
        return round(value / 1024.0, 1) if value is not None else None

    def mib_from_bytes(value: Optional[int]) -> Optional[float]:
        return round(value / (1024.0 * 1024.0), 1) if value is not None else None

    return {
        "pid": pid,
        "process_rss_mib": mib_from_kib(rss_kib),
        "process_high_water_mib": mib_from_kib(high_water_kib),
        "child_processes": child_count,
        "child_rss_mib": mib_from_kib(child_rss_kib),
        "container_memory_mib": mib_from_bytes(container_current),
        "container_limit_mib": mib_from_bytes(container_limit),
    }


def log_runtime_event(event: str, **fields: Any) -> None:
    payload = {"event": str(event), **fields, **memory_snapshot()}
    print(f"[GSN runtime] {json.dumps(payload, sort_keys=True, separators=(',', ':'))}")


def request_started() -> tuple[int, int]:
    global _ACTIVE_REQUESTS, _PEAK_REQUESTS
    with _REQUEST_LOCK:
        _ACTIVE_REQUESTS += 1
        _PEAK_REQUESTS = max(_PEAK_REQUESTS, _ACTIVE_REQUESTS)
        return _ACTIVE_REQUESTS, _PEAK_REQUESTS


def request_finished() -> tuple[int, int]:
    global _ACTIVE_REQUESTS
    with _REQUEST_LOCK:
        _ACTIVE_REQUESTS = max(0, _ACTIVE_REQUESTS - 1)
        return _ACTIVE_REQUESTS, _PEAK_REQUESTS


def should_log_request(*, duration_seconds: float, sample_seconds: int) -> bool:
    global _LAST_PERIODIC_LOG_AT
    now = time.monotonic()
    with _REQUEST_LOCK:
        periodic = now - _LAST_PERIODIC_LOG_AT >= max(10, int(sample_seconds))
        if periodic:
            _LAST_PERIODIC_LOG_AT = now
    return periodic or duration_seconds >= 2.0
