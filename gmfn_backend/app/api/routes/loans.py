# app/routers/loans.py
"""
Legacy / compatibility router.

We previously had early loan routes here. The canonical loans API now lives in:
- app/api/routes/loans.py

This file remains only to avoid import/include_router breakage in app.main while we
stabilize the pilot branch. Keeping it minimal prevents syntax regressions.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["loans-legacy"])