# app/db/database.py
from __future__ import annotations

import os
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base  # SINGLE source of truth for metadata/Base


def _get_database_url() -> str:
    """
    Source of truth for DB URL.
    Tests/dev/prod MUST set DATABASE_URL to control where the app points.
    """
    return (os.getenv("DATABASE_URL") or "sqlite:///./gmfn.db").strip()


DATABASE_URL = _get_database_url()

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()