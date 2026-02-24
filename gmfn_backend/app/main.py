from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.db.database import Base, engine, SessionLocal

# IMPORTANT: ensure models are imported so SQLAlchemy sees them
import app.db.models  # noqa: F401
import app.db.bank_models  # noqa: F401

from app.services.reconciliation_service import reconcile_batch


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    Base.metadata.create_all(bind=engine)

    # start reconciliation loop
    asyncio.create_task(_reconciliation_loop())

    yield

    # ---- Shutdown ----
    # nothing special for now
    pass


app = FastAPI(
    title="GMFN API",
    version="0.1.0",
    redirect_slashes=False,
    lifespan=lifespan,  # ✅ modern FastAPI lifecycle
)

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


async def _reconciliation_loop() -> None:
    while True:
        await asyncio.sleep(60)

        db: Session = SessionLocal()
        try:
            reconcile_batch(db, limit=300)
        except Exception:
            pass
        finally:
            db.close()