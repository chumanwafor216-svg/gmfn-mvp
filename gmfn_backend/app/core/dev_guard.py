# app/core/dev_guard.py
from __future__ import annotations

import os
from fastapi import HTTPException

def dev_mode_enabled() -> bool:
    return (os.getenv("GMFN_DEV_MODE", "").strip().lower() in ("1", "true", "yes", "on"))

def require_dev_mode() -> None:
    if not dev_mode_enabled():
        raise HTTPException(status_code=404, detail="Not found")
