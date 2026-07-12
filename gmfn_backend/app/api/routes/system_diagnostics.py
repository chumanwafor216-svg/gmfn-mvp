# app/api/routes/system_diagnostics.py
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import MarketplaceProduct, MarketplaceShop, User

router = APIRouter(prefix="/system", tags=["system"])


def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False) is True:
        return True
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


def _require_admin(user: Any) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _clean_identity(value: Any) -> str:
    return str(value or "").strip()


def _identity_candidates(identity_key: str) -> List[str]:
    raw = _clean_identity(identity_key)
    if not raw:
        return []

    candidates = [raw]
    upper_raw = raw.upper()
    if upper_raw.startswith("GSN-U-"):
        candidates.append(f"GMFN-U-{raw[6:]}")
    elif upper_raw.startswith("GMFN-U-"):
        candidates.append(f"GSN-U-{raw[7:]}")

    seen = set()
    normalized: List[str] = []
    for candidate in candidates:
        candidate_key = _clean_identity(candidate).upper()
        if not candidate_key or candidate_key in seen:
            continue
        seen.add(candidate_key)
        normalized.append(candidate_key)

    return normalized


def _identity_suffix(identity_key: str) -> str:
    raw = _clean_identity(identity_key).upper()
    if raw.startswith("GSN-U-"):
        return raw[6:]
    if raw.startswith("GMFN-U-"):
        return raw[7:]
    return ""


def _public_shop_visibility(value: Any) -> bool:
    return _clean_identity(value).lower() in {
        "community_visible",
        "community",
        "public",
    }


@router.get("/diagnostics")
def diagnostics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: stability + runtime visibility.
    Never returns secrets, only presence.
    """
    _require_admin(current_user)

    def present(name: str) -> bool:
        return bool(os.getenv(name))

    return {
        "ok": True,
        "time_utc": datetime.now(timezone.utc).isoformat(),
        "protocol_version": PROTOCOL_VERSION,
        "python": {
            "version": sys.version.split()[0],
            "executable": sys.executable,
        },
        "env": {
            "GMFN_DEV_MODE": os.getenv("GMFN_DEV_MODE"),
            "GMFN_SECRET_KEY_present": present("GMFN_SECRET_KEY"),
            "SECRET_KEY_present": present("SECRET_KEY"),
        },
        "db": {
            "engine_url_present": present("DATABASE_URL"),
        },
    }


def _table_columns(db: Session, table_name: str) -> list[str]:
    try:
        inspector = inspect(db.get_bind())
        return sorted(str(column["name"]) for column in inspector.get_columns(table_name))
    except Exception:
        return []


def _safe_probe(db: Session, sql: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        value = db.execute(text(sql), params).scalar()
        return {"ok": True, "value": str(value)}
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass
        return {
            "ok": False,
            "error_type": type(exc).__name__,
            "error": str(exc)[:500],
        }


@router.get("/diagnostics/finance-readiness")
def finance_readiness_diagnostics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: schema/probe visibility for finance route readiness.

    This avoids returning row-level finance data. It reports column presence and
    aggregate probe success so production 500s can be diagnosed without exposing
    secrets, tokens, or private transaction records.
    """
    _require_admin(current_user)

    user_id = int(current_user.id)
    tables = {
        "loans": _table_columns(db, "loans"),
        "loan_guarantors": _table_columns(db, "loan_guarantors"),
        "pool_events": _table_columns(db, "pool_events"),
        "clan_memberships": _table_columns(db, "clan_memberships"),
    }

    alembic_version = _safe_probe(
        db,
        "SELECT version_num FROM alembic_version LIMIT 1",
        {},
    )
    active_memberships = _safe_probe(
        db,
        """
        SELECT COUNT(*)
        FROM clan_memberships
        WHERE CAST(user_id AS TEXT) = :user_id
          AND left_at IS NULL
        """,
        {"user_id": str(user_id)},
    )
    loan_rows = _safe_probe(
        db,
        "SELECT COUNT(*) FROM loans WHERE CAST(borrower_user_id AS TEXT) = :user_id",
        {"user_id": str(user_id)},
    )
    pool_event_rows = _safe_probe(
        db,
        "SELECT COUNT(*) FROM pool_events WHERE CAST(user_id AS TEXT) = :user_id",
        {"user_id": str(user_id)},
    )
    reserved_pool_probe = _safe_probe(
        db,
        """
        SELECT COALESCE(SUM(pool_used), 0)
        FROM loans
        WHERE CAST(borrower_user_id AS TEXT) = :user_id
        """,
        {"user_id": str(user_id)},
    )
    locked_guarantee_probe = _safe_probe(
        db,
        """
        SELECT COALESCE(SUM(locked_amount - released_amount), 0)
        FROM loan_guarantors
        WHERE CAST(guarantor_user_id AS TEXT) = :user_id
          AND status = 'approved'
        """,
        {"user_id": str(user_id)},
    )

    required_columns = {
        "loans": [
            "pool_used",
            "guarantee_gap",
            "personal_pool_at_request",
            "paid_total",
            "remaining_amount",
        ],
        "loan_guarantors": ["locked_amount", "released_amount"],
        "clan_memberships": ["left_at"],
    }
    missing_columns = {
        table_name: [
            column
            for column in columns
            if column not in set(tables.get(table_name, []))
        ]
        for table_name, columns in required_columns.items()
    }

    return {
        "ok": True,
        "diagnostic_version": "finance-readiness-2026-07-12",
        "user_id": user_id,
        "gmfn_id": getattr(current_user, "gmfn_id", None),
        "alembic_version": alembic_version,
        "tables": tables,
        "missing_columns": missing_columns,
        "probes": {
            "active_memberships": active_memberships,
            "loan_rows": loan_rows,
            "pool_event_rows": pool_event_rows,
            "reserved_pool": reserved_pool_probe,
            "locked_guarantees": locked_guarantee_probe,
        },
    }


@router.get("/public-shop-identity/{identity_key}")
def public_shop_identity_diagnostics(
    identity_key: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only: diagnose why a public shop link does or does not resolve.

    This deliberately mirrors the public shop identity lookup without returning
    private product data or secrets.
    """
    _require_admin(current_user)

    candidates = _identity_candidates(identity_key)
    matched_user = None
    matched_identity = None
    for candidate in candidates:
        user = (
            db.query(User)
            .filter(func.upper(User.gmfn_id) == candidate)
            .first()
        )
        if user is not None:
            matched_user = user
            matched_identity = candidate
            break

    numeric_id = 0
    if matched_user is None:
        try:
            numeric_id = int(_clean_identity(identity_key))
        except (TypeError, ValueError):
            numeric_id = 0
        if numeric_id > 0:
            matched_user = db.query(User).filter(User.id == int(numeric_id)).first()
            if matched_user is not None:
                matched_identity = str(numeric_id)

    if matched_user is None:
        suffix = _identity_suffix(identity_key)
        suffix_matches = []
        if suffix:
            rows = (
                db.query(User)
                .filter(func.upper(User.gmfn_id).like(f"%{suffix}"))
                .limit(10)
                .all()
            )
            suffix_matches = [
                {
                    "user_id": int(row.id),
                    "gmfn_id": _clean_identity(getattr(row, "gmfn_id", None)) or None,
                    "role": _clean_identity(getattr(row, "role", None)) or None,
                    "display_name": _clean_identity(
                        getattr(row, "display_name", None)
                    )
                    or None,
                }
                for row in rows
            ]

        return {
            "ok": True,
            "identity_key": _clean_identity(identity_key),
            "candidates_checked": candidates,
            "numeric_id_checked": numeric_id if numeric_id > 0 else None,
            "user_found": False,
            "reason": "seller_identity_not_found",
            "suffix_matches": suffix_matches,
            "public_shop_status": "identity_missing",
            "next_action": (
                "This exact public shop owner identity does not exist in this "
                "database. The signed-in owner must copy a fresh public shop "
                "link from the canonical frontend, or production data must be "
                "repaired if this identity was expected to exist."
            ),
        }

    active_shops = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.owner_user_id == int(matched_user.id),
            MarketplaceShop.is_active.is_(True),
        )
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .all()
    )
    shop_ids = [int(shop.id) for shop in active_shops]
    active_shop_details = [
        {
            "id": int(shop.id),
            "clan_id": int(getattr(shop, "clan_id", 0) or 0) or None,
            "name": _clean_identity(getattr(shop, "name", None)) or None,
            "is_active": bool(getattr(shop, "is_active", False)),
        }
        for shop in active_shops
    ]

    active_product_count = 0
    public_product_count = 0
    if shop_ids:
        product_rows = (
            db.query(MarketplaceProduct)
            .filter(
                MarketplaceProduct.shop_id.in_(shop_ids),
                MarketplaceProduct.seller_user_id == int(matched_user.id),
                MarketplaceProduct.is_active.is_(True),
            )
            .all()
        )
        active_product_count = len(product_rows)
        public_product_count = sum(
            1
            for product in product_rows
            if _public_shop_visibility(getattr(product, "visibility_mode", None))
        )

    if not active_shops:
        public_shop_status = "shop_missing"
        next_action = (
            "The owner identity exists, but there is no active marketplace shop "
            "for that owner. The signed-in owner must open Marketplace and use "
            "the public shop link action so the owner shop is created/refreshed."
        )
    elif public_product_count <= 0:
        public_shop_status = "products_empty"
        next_action = (
            "The owner has an active shop, but no active public/community-visible "
            "products are attached to it yet. Add or restore public shop blocks."
        )
    else:
        public_shop_status = "ready"
        next_action = (
            "The identity, active shop, and public products are connected. The "
            "public shop link should load the whole public shop domain."
        )

    return {
        "ok": True,
        "identity_key": _clean_identity(identity_key),
        "candidates_checked": candidates,
        "numeric_id_checked": numeric_id if numeric_id > 0 else None,
        "matched_identity": matched_identity,
        "user_found": True,
        "user": {
            "id": int(matched_user.id),
            "gmfn_id": _clean_identity(getattr(matched_user, "gmfn_id", None))
            or None,
            "display_name": _clean_identity(
                getattr(matched_user, "display_name", None)
            )
            or None,
            "role": _clean_identity(getattr(matched_user, "role", None)) or None,
        },
        "active_shop_count": len(active_shops),
        "active_shop_ids": shop_ids,
        "active_shop_details": active_shop_details,
        "active_product_count": active_product_count,
        "public_product_count": public_product_count,
        "public_shop_ready": bool(active_shops),
        "has_public_products": public_product_count > 0,
        "public_shop_status": public_shop_status,
        "next_action": next_action,
    }
