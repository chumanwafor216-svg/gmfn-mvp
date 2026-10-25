from __future__ import annotations

import asyncio
import os
import time
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
import app.db.advertising_revenue_models  # noqa: F401
import app.db.identity_models  # noqa: F401
import app.db.models  # noqa: F401
import app.db.notification_models  # noqa: F401
import app.db.pipeline_credit_models  # noqa: F401
import app.db.member_credit_models  # noqa: F401
import app.db.verification_models  # noqa: F401

from app.db.bank_models import BankEvent
from app.core.runtime_memory import (
    log_runtime_event,
    request_finished,
    request_started,
    should_log_request,
)
from app.services.marketplace_media_cleanup_service import (
    process_marketplace_media_deletion_tasks,
)
from app.services.reconciliation_service import reconcile_batch
from app.services.spotlight_retention_service import compact_expired_spotlight_payloads


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
    return False


def _spotlight_retention_loop_enabled() -> bool:
    raw = os.getenv("GSN_ENABLE_SPOTLIGHT_RETENTION_LOOP")
    if raw is not None and str(raw).strip() != "":
        return _truthy(raw)
    return False


def _spotlight_retention_interval_seconds() -> int:
    raw = str(os.getenv("GSN_SPOTLIGHT_RETENTION_INTERVAL_SECONDS", "3600") or "").strip()
    try:
        parsed = int(raw)
    except ValueError:
        parsed = 3600
    return max(300, min(parsed, 86400))


def _bounded_env_int(name: str, *, default: int, minimum: int, maximum: int) -> int:
    raw = str(os.getenv(name, str(default)) or "").strip()
    try:
        parsed = int(raw)
    except ValueError:
        parsed = default
    return max(minimum, min(parsed, maximum))


def _spotlight_retention_startup_delay_seconds() -> int:
    return _bounded_env_int(
        "GSN_SPOTLIGHT_RETENTION_STARTUP_DELAY_SECONDS",
        default=300,
        minimum=30,
        maximum=3600,
    )


def _spotlight_retention_batch_size() -> int:
    return _bounded_env_int(
        "GSN_SPOTLIGHT_RETENTION_BATCH_SIZE",
        default=25,
        minimum=1,
        maximum=100,
    )


def _runtime_memory_logging_enabled() -> bool:
    return _truthy(os.getenv("GSN_RUNTIME_MEMORY_LOGGING"))


def _runtime_memory_sample_seconds() -> int:
    return _bounded_env_int(
        "GSN_RUNTIME_MEMORY_SAMPLE_SECONDS",
        default=60,
        minimum=10,
        maximum=3600,
    )


def _cors_settings() -> tuple[list[str], Optional[str]]:
    raw = str(os.getenv("GMFN_CORS_ORIGINS", "") or "").strip()
    public_frontend_origins = [
        "https://gmfn-frontend.onrender.com",
        "https://frontend.onrender.com",
    ]

    if raw:
        origins = [item.strip() for item in raw.split(",") if item.strip()]
        for origin in public_frontend_origins:
            if origin not in origins:
                origins.append(origin)
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

    return public_frontend_origins, None


def _uploads_dir() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _reconcile_all_clans_once() -> None:
    db: Session = SessionLocal()
    started = time.monotonic()
    clans_processed = 0
    events_seen = 0
    failures = 0
    clan_ids: list[int] = []
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
                stats = reconcile_batch(
                    db,
                    clan_id=int(clan_id),
                    limit=300,
                    confirm_non_canonical=True,
                    canonical_only_match=False,
                    dry_run=False,
                )
                clans_processed += 1
                events_seen += int(stats.get("seen", 0))
            except Exception:
                # Pilot-safe: keep other clans reconciling even if one fails
                db.rollback()
                failures += 1
                if _dev_mode():
                    print(f"[GMFN reconcile] clan_id={clan_id} failed")
                    print(traceback.format_exc())
    finally:
        db.close()
        if _runtime_memory_logging_enabled():
            log_runtime_event(
                "reconciliation_complete",
                duration_ms=round((time.monotonic() - started) * 1000.0, 1),
                clans_discovered=len(clan_ids),
                clans_processed=clans_processed,
                events_seen=events_seen,
                failures=failures,
            )


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


def _compact_expired_spotlights_once() -> None:
    db: Session = SessionLocal()
    started = time.monotonic()
    try:
        batch_size = _spotlight_retention_batch_size()
        retried = process_marketplace_media_deletion_tasks(db, limit=batch_size)
        result = compact_expired_spotlight_payloads(db, limit=batch_size)
        fields = {
            "duration_ms": round((time.monotonic() - started) * 1000.0, 1),
            "batch_size": batch_size,
            "campaigns_scanned": result["scanned_campaigns"],
            "campaigns_compacted": result["campaigns_compacted"],
            "placements_deleted": result["placement_rows_deleted"],
            "content_versions_scrubbed": result["content_versions_scrubbed"],
            "retry_tasks_processed": len(retried),
            "new_media_results": len(result["media_cleanup"]),
        }
        if _runtime_memory_logging_enabled():
            log_runtime_event("spotlight_retention_complete", **fields)
        else:
            print(
                "[GSN retention] "
                + " ".join(f"{key}={value}" for key, value in fields.items())
            )
    finally:
        db.close()


async def _spotlight_retention_loop() -> None:
    await asyncio.sleep(_spotlight_retention_startup_delay_seconds())
    while True:
        try:
            await asyncio.to_thread(_compact_expired_spotlights_once)
        except Exception:
            print("[GSN retention] failed")
            print(traceback.format_exc())
        await asyncio.sleep(_spotlight_retention_interval_seconds())


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

    spotlight_retention_task: Optional[asyncio.Task] = None
    if _spotlight_retention_loop_enabled():
        try:
            spotlight_retention_task = asyncio.create_task(_spotlight_retention_loop())
            app.state.spotlight_retention_task = spotlight_retention_task
        except Exception:
            app.state.spotlight_retention_task = None
    else:
        app.state.spotlight_retention_task = None

    if _runtime_memory_logging_enabled():
        log_runtime_event(
            "startup",
            reconciliation_enabled=_reconciliation_loop_enabled(),
            spotlight_retention_enabled=_spotlight_retention_loop_enabled(),
            spotlight_retention_startup_delay_seconds=(
                _spotlight_retention_startup_delay_seconds()
            ),
            spotlight_retention_interval_seconds=(
                _spotlight_retention_interval_seconds()
            ),
            spotlight_retention_batch_size=_spotlight_retention_batch_size(),
        )

    yield

    # ---- Shutdown ----
    for task_name in ("reconciliation_task", "spotlight_retention_task"):
        task = getattr(app.state, task_name, None)
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

if _runtime_memory_logging_enabled():

    @app.middleware("http")
    async def runtime_memory_middleware(request: Request, call_next):
        request_started()
        started = time.monotonic()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = int(response.status_code)
            return response
        finally:
            active_requests, peak_requests = request_finished()
            duration_seconds = time.monotonic() - started
            if should_log_request(
                duration_seconds=duration_seconds,
                sample_seconds=_runtime_memory_sample_seconds(),
            ):
                route = request.scope.get("route")
                route_template = getattr(route, "path", "unmatched")
                log_runtime_event(
                    "request_complete",
                    method=request.method,
                    route_template=route_template,
                    status_code=status_code,
                    duration_ms=round(duration_seconds * 1000.0, 1),
                    active_requests=active_requests,
                    peak_requests=peak_requests,
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
