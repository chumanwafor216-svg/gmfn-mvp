from __future__ import annotations

import asyncio
import os
import traceback
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import distinct
from sqlalchemy.orm import Session

from app.api.router import api_router
from app.db.database import Base, SessionLocal, engine

# IMPORTANT: ensure models are imported so SQLAlchemy sees them
import app.db.bank_models  # noqa: F401
import app.db.identity_models  # noqa: F401
import app.db.models  # noqa: F401
import app.db.notification_models  # noqa: F401

from app.db.bank_models import BankEvent
from app.services.reconciliation_service import reconcile_batch


def _truthy(value: str | None) -> bool:
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _dev_mode() -> bool:
    return _truthy(os.getenv("GMFN_DEV_MODE"))


def _auto_create_schema() -> bool:
    raw = os.getenv("GMFN_AUTO_CREATE_SCHEMA")
    if raw is not None and str(raw).strip() != "":
        return _truthy(raw)
    return _dev_mode()


def _reconciliation_loop_enabled() -> bool:
    raw = os.getenv("GMFN_ENABLE_RECONCILIATION_LOOP")
    if raw is not None and str(raw).strip() != "":
        return _truthy(raw)
    return True


def _cors_settings() -> tuple[list[str], Optional[str]]:
    raw = str(os.getenv("GMFN_CORS_ORIGINS", "") or "").strip()
    if raw:
        origins = [item.strip() for item in raw.split(",") if item.strip()]
        return origins, None

    if _dev_mode():
        return (
            [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174",
            ],
            r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
        )

    return [], None


def _uploads_dir() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _reconcile_all_clans_once() -> None:
    db: Session = SessionLocal()
    try:
        clan_rows = (
            db.query(distinct(BankEvent.clan_id))
            .order_by(BankEvent.clan_id.asc())
            .all()
        )

        clan_ids = [
            int(row[0])
            for row in clan_rows
            if row and row[0] is not None
        ]

        for clan_id in clan_ids:
            try:
                reconcile_batch(
                    db,
                    clan_id=int(clan_id),
                    limit=300,
                    confirm_non_canonical=True,
                    canonical_only_match=False,
                    dry_run=False,
                )
            except Exception:
                # Pilot-safe: keep other clans reconciling even if one fails
                db.rollback()
                if _dev_mode():
                    print(f"[GMFN reconcile] clan_id={clan_id} failed")
                    print(traceback.format_exc())
    finally:
        db.close()


async def _reconciliation_loop() -> None:
    while True:
        await asyncio.sleep(60)
        try:
            _reconcile_all_clans_once()
        except Exception:
            # Pilot-safe background swallow
            if _dev_mode():
                print("[GMFN reconcile loop] failed")
                print(traceback.format_exc())


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- Startup ----
    if _auto_create_schema():
        Base.metadata.create_all(bind=engine)

    reconciliation_task: Optional[asyncio.Task] = None
    if _reconciliation_loop_enabled():
        try:
            reconciliation_task = asyncio.create_task(_reconciliation_loop())
            app.state.reconciliation_task = reconciliation_task
        except Exception:
            app.state.reconciliation_task = None
    else:
        app.state.reconciliation_task = None

    yield

    # ---- Shutdown ----
    task = getattr(app.state, "reconciliation_task", None)
    if task is not None:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        except Exception:
            pass


app = FastAPI(
    title="GMFN API",
    version="0.1.0",
    redirect_slashes=False,
    lifespan=lifespan,
)

cors_origins, cors_origin_regex = _cors_settings()
uploads_dir = _uploads_dir()

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Media uploads/static serving
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

# ✅ DEV-ONLY: return traceback JSON for unhandled exceptions
if _dev_mode():

    @app.middleware("http")
    async def dev_traceback_middleware(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            tb = traceback.format_exc()
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
