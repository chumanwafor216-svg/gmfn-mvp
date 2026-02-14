# app/core/dev_guard.py
from __future__ import annotations

import os

from fastapi import HTTPException, Request


def _truthy(v: str | None) -> bool:
    if v is None:
        return False
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


def require_dev_mode(request: Request) -> None:
    """
    DEV ROUTE GUARD (SAFE + DEBUGGABLE)

    Why this exists:
      Dev seeding/bootstrap is dangerous in production. It must be explicitly enabled.

    How to enable locally:
      Set GMFN_DEV_MODE=1 in your environment, then restart uvicorn.

    Behavior:
      - If GMFN_DEV_MODE is NOT enabled -> 403 with a clear message.
      - No more 'fake 404' that wastes debugging time.
    """
    dev_mode = _truthy(os.getenv("GMFN_DEV_MODE"))

    if not dev_mode:
        raise HTTPException(
            status_code=403,
            detail=(
                "Dev mode is disabled. To use this endpoint locally, set "
                "GMFN_DEV_MODE=1 and restart the backend."
            ),
        )