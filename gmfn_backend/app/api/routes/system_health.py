from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import get_db

router = APIRouter(prefix="/system-health", tags=["system-health"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("")
def system_health(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "ok": bool(db_ok),
        "service": "gmfn-backend",
        "database": "ok" if db_ok else "down",
        "checked_at": _now_iso(),
    }