# app/api/routes/system_diagnostics.py
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.core.constants import PROTOCOL_VERSION

router = APIRouter(prefix="/system", tags=["system"])


def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False) is True:
        return True
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


def _require_admin(user: Any) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/diagnostics")
def diagnostics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: stability + runtime visibility.
    Never returns secrets, only presence.
    """
    _require_admin(current_user)

    def present(name: str) -> bool:
        return bool(os.getenv(name))

    return {
        "ok": True,
        "time_utc": datetime.now(timezone.utc).isoformat(),
        "protocol_version": PROTOCOL_VERSION,
        "python": {
            "version": sys.version.split()[0],
            "executable": sys.executable,
        },
        "env": {
            "GMFN_DEV_MODE": os.getenv("GMFN_DEV_MODE"),
            "GMFN_SECRET_KEY_present": present("GMFN_SECRET_KEY"),
            "SECRET_KEY_present": present("SECRET_KEY"),
        },
        "db": {
            "engine_url_present": present("DATABASE_URL"),
        },
    }