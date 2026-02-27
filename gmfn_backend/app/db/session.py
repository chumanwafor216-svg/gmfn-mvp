from __future__ import annotations

"""
Compatibility shim.

Some parts of the codebase (or older snippets) expect:
  from app.db.session import SessionLocal

In this project, the session factory lives in app.db.database.
This module re-exports SessionLocal to prevent runtime import failures.
"""

try:
    # Preferred: project-standard location
    from app.db.database import SessionLocal  # type: ignore
except Exception as e:  # pragma: no cover
    # Fall back to engine-based session factory if database.py changes
    try:
        from sqlalchemy.orm import sessionmaker
        from app.db.engine import engine  # type: ignore

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    except Exception as e2:  # pragma: no cover
        raise RuntimeError(f"Failed to initialize SessionLocal (database import error: {e}; fallback error: {e2})")