from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Callable

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.orm import Session


def _as_money_str(v: Any) -> str:
    if v is None:
        return "0"
    if isinstance(v, Decimal):
        return str(v)
    return str(v)


def _dt(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def _import_any(mod_names: List[str], attr: str) -> Any:
    last: Optional[Exception] = None
    for mn in mod_names:
        try:
            m = __import__(mn, fromlist=[attr])
            return getattr(m, attr)
        except Exception as e:
            last = e
    raise RuntimeError(f"Cannot import {attr} from {mod_names}. Last error: {last}")


# Resolve get_db
get_db: Callable[..., Any] = _import_any(
    ["app.deps", "app.api.deps", "app.api.dependencies", "app.db.database"],
    "get_db",
)

# Resolve current user dependency
get_current_user: Callable[..., Any] = _import_any(
    ["app.api.routes.auth", "app.deps", "app.api.deps", "app.api.dependencies"],
    "get_current_user",
)

# Resolve LoanGuarantor model
LoanGuarantor = _import_any(
    ["app.db.models", "app.db.models.models", "app.db.models.models.models"],
    "LoanGuarantor",
)

router = APIRouter(prefix="/loans/guarantors", tags=["loans"])


@router.get("/inbox")
def guarantor_inbox(
    status: str = Query("pending"),
    limit: int = Query(50, ge=1, le=200),
    X_Clan_Id: Optional[int] = Header(default=None, convert_underscores=False),
    db: Session = Depends(get_db),
    user: Any = Depends(get_current_user),
):
    """
    Frontend expects:
      GET /loans/guarantors/inbox?status=pending&limit=50
    Returns:
      { items: [...], total: N }
    """
    q = db.query(LoanGuarantor).filter(LoanGuarantor.guarantor_user_id == user.id)

    if X_Clan_Id:
        q = q.filter(LoanGuarantor.clan_id == int(X_Clan_Id))

    if status:
        q = q.filter(LoanGuarantor.status == status)

    rows = q.order_by(LoanGuarantor.id.desc()).limit(int(limit)).all()

    items: List[Dict[str, Any]] = []
    for r in rows:
        items.append(
            {
                "id": int(r.id),
                "loan_id": int(r.loan_id),
                "clan_id": int(r.clan_id),
                "guarantor_user_id": int(r.guarantor_user_id),
                "pledge_amount": _as_money_str(getattr(r, "pledge_amount", None)),
                "status": str(getattr(r, "status", "")),
                "responded_at": _dt(getattr(r, "responded_at", None)),
                "is_locked": bool(getattr(r, "is_locked", False)),
                "locked_amount": _as_money_str(getattr(r, "locked_amount", None)),
                "released_amount": _as_money_str(getattr(r, "released_amount", None)),
            }
        )

    return {"items": items, "total": len(items)}