# app/api/routes/admin_reconcile.py
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.reconciliation_service import reconcile_batch

router = APIRouter(prefix="/admin/reconcile", tags=["admin"])


@router.post("/{clan_id}")
def admin_reconcile_clan(
    clan_id: int,
    limit: int = 300,
    dry_run: int = 0,
    confirm_non_canonical: int = 1,
    canonical_only_match: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Admin/Dev endpoint to run reconciliation for a clan.

    Query params:
    - limit (default 300)
    - dry_run=1 -> no commits (preview)
    - confirm_non_canonical=1 (default) preserves current behavior
    - canonical_only_match=1 -> only match canonical BankEvents
    """
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    stats = reconcile_batch(
        db,
        clan_id=int(clan_id),
        limit=int(limit),
        dry_run=bool(int(dry_run)),
        confirm_non_canonical=bool(int(confirm_non_canonical)),
        canonical_only_match=bool(int(canonical_only_match)),
    )

    # If dry-run, ensure no state is persisted
    if bool(int(dry_run)):
        try:
            db.rollback()
        except Exception:
            pass

    return stats