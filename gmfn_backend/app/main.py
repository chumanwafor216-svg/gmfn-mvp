from __future__ import annotations

import asyncio
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.db.database import Base, engine, SessionLocal

# IMPORTANT: ensure models are imported so SQLAlchemy sees them
import app.db.models  # noqa: F401
import app.db.bank_models  # noqa: F401

from app.services.reconciliation_service import reconcile_batch


def _dev_mode() -> bool:
    return str(os.getenv("GMFN_DEV_MODE", "") or "").strip() == "1"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    Base.metadata.create_all(bind=engine)

    # start reconciliation loop
    asyncio.create_task(_reconciliation_loop())

    yield

    # ---- Shutdown ----
    pass


app = FastAPI(
    title="GMFN API",
    version="0.1.0",
    redirect_slashes=False,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ DEV-ONLY: return traceback JSON for unhandled exceptions
if _dev_mode():

    @app.middleware("http")
    async def dev_traceback_middleware(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            tb = traceback.format_exc()
            # Keep it JSON for easy copy/paste
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal Server Error (dev traceback enabled)",
                    "error_type": type(e).__name__,
                    "error": str(e),
                    "path": str(request.url.path),
                    "method": request.method,
                    "traceback": tb,
                },
            )


app.include_router(api_router)


@app.get("/health", tags=["system"])
def health():
    return {"ok": True, "dev_mode": _dev_mode()}


async def _reconciliation_loop() -> None:
    while True:
        await asyncio.sleep(60)

        db: Session = SessionLocal()
        try:
            reconcile_batch(db, limit=300)
        except Exception:
            # swallow in background loop (pilot-safe)
            pass
        finally:
            db.close()