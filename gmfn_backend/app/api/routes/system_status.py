# app/api/routes/system_status.py
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/status")
def system_status(db: Session = Depends(get_db)) -> dict[str, Any]:
    # Alembic head (if table exists)
    alembic_version = None
    try:
        row = db.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).fetchone()
        alembic_version = row[0] if row else None
    except Exception:
        alembic_version = None

    # Lightweight counts (safe even on low-end hardware)
    def _count(table: str) -> int:
        try:
            r = db.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
            return int(r[0]) if r else 0
        except Exception:
            return 0

    return {
        "ok": True,
        "protocol_version": PROTOCOL_VERSION,
        "alembic_head": alembic_version,
        "counts": {
            "users": _count("users"),
            "clans": _count("clans"),
            "loans": _count("loans"),
            "trust_events": _count("trust_events"),
            "trust_slips": _count("trust_slips"),
            "bank_events": _count("bank_events"),
            "expected_payments": _count("expected_payments"),
        },
    }
    