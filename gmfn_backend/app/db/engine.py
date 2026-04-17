# app/db/engine.py
from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base


def _truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _database_url() -> str:
    configured = str(os.getenv("DATABASE_URL", "") or "").strip()
    if configured:
        return configured
    if _truthy(os.getenv("GMFN_DEV_MODE")):
        return "sqlite:///./gmfn.db"
    raise RuntimeError(
        "DATABASE_URL is required when GMFN_DEV_MODE is not enabled."
    )


DATABASE_URL = _database_url()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
)

Base = declarative_base()
