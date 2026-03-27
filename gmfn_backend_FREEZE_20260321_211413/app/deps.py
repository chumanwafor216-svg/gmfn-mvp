# app/deps.py
from __future__ import annotations

from typing import Generator
from sqlalchemy.orm import Session

SessionLocal = None  # will be set by one of the imports below


# Try the most common places projects keep SessionLocal
try:
    # e.g. app/db/session.py
    from app.db.session import SessionLocal as _SessionLocal  # type: ignore
    SessionLocal = _SessionLocal
except Exception:
    try:
        # e.g. app/db/database.py
        from app.db.database import SessionLocal as _SessionLocal  # type: ignore
        SessionLocal = _SessionLocal
    except Exception:
        try:
            # e.g. app/database.py
            from app.database import SessionLocal as _SessionLocal  # type: ignore
            SessionLocal = _SessionLocal
        except Exception:
            # Leave SessionLocal as None; get_db will raise a clear error when called.
            SessionLocal = None


def get_db() -> Generator[Session, None, None]:
    """
    DB session dependency for FastAPI routes.

    If this raises RuntimeError, it means your project defines SessionLocal
    in a different module path. Use the search command below to locate it
    and adjust the import above.
    """
    if SessionLocal is None:
        raise RuntimeError(
            "SessionLocal not found. Locate it with:\n"
            "  Select-String -Path .\\app\\**\\*.py -Pattern \"SessionLocal\" -List\n"
            "Then update app/deps.py to import SessionLocal from that file."
        )

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
