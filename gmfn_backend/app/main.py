from __future__ import annotations

import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.db.database import Base, engine, SessionLocal

# IMPORTANT: ensure models are imported so SQLAlchemy sees them
import app.db.models  # noqa: F401
import app.db.bank_models  # noqa: F401

from app.services.reconciliation_service import reconcile_batch


app = FastAPI(title="GMFN API", version="0.1.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["system"])
def health():
    return {"ok": True}


def _env_flag(name: str, default: str = "0") -> bool:
    return (os.getenv(name, default) or "").strip().lower() in {"1", "true", "yes", "y", "on"}


@app.on_event("startup")
def on_startup() -> None:
    """
    IMPORTANT:
    This project is Alembic-migration-managed. Therefore we MUST NOT auto-create tables
    in normal operation or tests, otherwise SQLite will drift and migrations will fail
    ("table already exists").

    If you really need create_all for a one-off demo, set:
      GMFN_CREATE_ALL=1
    """
    if _env_flag("GMFN_CREATE_ALL", "0"):
        Base.metadata.create_all(bind=engine)

    # Reconciliation loop is opt-in. Enable only when you intentionally want it running.
    # (Avoid running during tests.)
    if _env_flag("GMFN_RECONCILE_LOOP", "0"):
        asyncio.create_task(_reconciliation_loop())


async def _reconciliation_loop() -> None:
    """
    Phase 1: deterministic reconciliation loop (opt-in).
    - Runs every 60 seconds
    - Reconciles per-clan (must be scoped by clan_id)
    """
    while True:
        await asyncio.sleep(60)

        db: Session = SessionLocal()
        try:
            # Phase 1 requires explicit clan scoping.
            # If you later add a clan registry table, iterate and call reconcile_batch per clan.
            clan_id = os.getenv("GMFN_RECONCILE_CLAN_ID")
            if clan_id:
                reconcile_batch(db, clan_id=int(clan_id), limit=300)
        except Exception:
            # Never crash the server due to reconciliation
            pass
        finally:
            db.close()