# app/db/database.py
from __future__ import annotations

from sqlalchemy.orm import sessionmaker, Session

from app.db.engine import engine, Base

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()