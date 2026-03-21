from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import get_db

router = APIRouter(prefix="/system-status", tags=["system-status"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("")
def system_status(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "service": "gmfn-backend",
        "ok": bool(db_ok),
        "database": "ok" if db_ok else "down",
        "mode": "dev",
        "checked_at": _now_iso(),
    }