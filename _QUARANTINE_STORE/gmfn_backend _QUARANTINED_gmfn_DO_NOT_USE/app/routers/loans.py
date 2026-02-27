# app/routers/loans.py
"""
Legacy compatibility router.

Some older code imports `app.routers.loans.router`.
We forward to the real router at `app.api.routes.loans`.
This file must stay tiny (no DB Session params), to avoid FastAPI/Pydantic issues.
"""

from app.api.routes.loans import router  # noqa: F401 