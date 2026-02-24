"""
Legacy / compatibility router.

Canonical loans API lives in: app/api/routes/loans.py

This file remains only to avoid include_router breakage while stabilizing
the pilot branch. Keep minimal to prevent syntax regressions.
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["loans-legacy"])
