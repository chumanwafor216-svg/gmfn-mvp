from __future__ import annotations

import argparse
import json
from collections import Counter
from typing import Any

from sqlalchemy import String, cast, func, or_


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read-only inspector for live GSN/GMFN identity splits."
    )
    parser.add_argument(
        "--gmfn-id",
        action="append",
        default=[],
        help="GSN/GMFN ID to inspect. May be provided more than once.",
    )
    parser.add_argument(
        "--phone",
        action="append",
        default=[],
        help="E.164 phone number to inspect. May be provided more than once.",
    )
    parser.add_argument(
        "--email",
        action="append",
        default=[],
        help="Email to inspect. May be provided more than once.",
    )
    return parser.parse_args()


def _safe_str(value: object) -> str:
    return str(value or "").strip()


def _identity_candidates(value: str) -> list[str]:
    raw = _safe_str(value).upper()
    if not raw:
        return []

    candidates = [raw]
    if raw.startswith("GSN-U-"):
        candidates.append(f"GMFN-U-{raw[6:]}")
    elif raw.startswith("GMFN-U-"):
        candidates.append(f"GSN-U-{raw[7:]}")

    seen: set[str] = set()
    out: list[str] = []
    for candidate in candidates:
        if candidate and candidate not in seen:
            seen.add(candidate)
            out.append(candidate)
    return out


def _phone_candidates(value: str) -> list[str]:
    raw = _safe_str(value)
    compact = (
        raw.replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )
    candidates = [raw, compact]
    if compact.startswith("00"):
        candidates.append(f"+{compact[2:]}")
    elif compact.startswith("+"):
        candidates.append(compact)
    elif compact.isdigit():
        candidates.append(f"+{compact}")
        if compact.startswith("0") and len(compact) == 11:
            candidates.append(f"+234{compact[1:]}")

    seen: set[str] = set()
    out: list[str] = []
    for candidate in candidates:
        clean = _safe_str(candidate)
        if clean and clean not in seen:
            seen.add(clean)
            out.append(clean)
    return out


def _count(db: Any, model: Any, **filters: Any) -> int:
    query = db.query(model)
    for field, value in filters.items():
        query = query.filter(getattr(model, field) == value)
    return int(query.count())


def _count_text_match(db: Any, model: Any, field: str, value: object) -> int:
    query = db.query(model).filter(cast(getattr(model, field), String) == str(value))
    return int(query.count())


def _safe_count(label: str, fn: Any, db: Any) -> int | dict[str, str]:
    try:
        return int(fn())
    except Exception as exc:
        db.rollback()
        return {
            "error": str(exc).splitlines()[0],
            "label": label,
        }


def _status_counts(db: Any, model: Any, user_field: str, user_id: int, status_field: str) -> dict[str, int]:
    rows = (
        db.query(getattr(model, status_field))
        .filter(getattr(model, user_field) == int(user_id))
        .all()
    )
    counts = Counter(_safe_str(row[0]) or "unknown" for row in rows)
    return dict(sorted(counts.items()))


def _user_report(db: Any, user: Any) -> dict[str, Any]:
    from app.db.identity_models import DeviceFingerprint, IdentityRecoveryProfile, IdentityRiskSignal
    from app.db.models import (
        Clan,
        ClanJoinRequest,
        ClanMembership,
        Loan,
        MarketplaceBroadcast,
        MarketplaceProduct,
        MarketplaceShop,
        TrustEvent,
        TrustSlip,
        UserPayoutDestination,
    )

    user_id = int(user.id)
    active_memberships = (
        db.query(ClanMembership)
        .filter(ClanMembership.user_id == user_id, ClanMembership.left_at.is_(None))
        .count()
    )
    active_shops = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.owner_user_id == user_id, MarketplaceShop.is_active.is_(True))
        .count()
    )
    active_products = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.seller_user_id == user_id, MarketplaceProduct.is_active.is_(True))
        .count()
    )

    return {
        "user_id": user_id,
        "email": getattr(user, "email", None),
        "gmfn_id": getattr(user, "gmfn_id", None),
        "phone_e164": getattr(user, "phone_e164", None),
        "phone_verified": bool(
            getattr(user, "phone_e164", None)
            and getattr(user, "phone_verified_at", None)
        ),
        "role": getattr(user, "role", None),
        "display_name": getattr(user, "display_name", None),
        "profile_image_url": getattr(user, "profile_image_url", None),
        "trust_score": getattr(user, "trust_score", None),
        "trust_band": getattr(user, "trust_band", None),
        "cci_score": getattr(user, "cci_score", None),
        "created_at": (
            getattr(user, "created_at", None).isoformat()
            if getattr(user, "created_at", None)
            else None
        ),
        "record_counts": {
            "created_communities": _count(db, Clan, created_by_user_id=user_id),
            "active_memberships": int(active_memberships),
            "total_memberships": _count(db, ClanMembership, user_id=user_id),
            "join_requests": _count(db, ClanJoinRequest, applicant_user_id=user_id),
            "marketplace_shops": _count(db, MarketplaceShop, owner_user_id=user_id),
            "active_marketplace_shops": int(active_shops),
            "marketplace_products": _count(db, MarketplaceProduct, seller_user_id=user_id),
            "active_marketplace_products": int(active_products),
            "marketplace_broadcasts": _count(db, MarketplaceBroadcast, author_user_id=user_id),
            "trust_slips": _count(db, TrustSlip, holder_user_id=user_id),
            "trust_events_as_actor": _count(db, TrustEvent, actor_user_id=user_id),
            "trust_events_as_subject": _count(db, TrustEvent, subject_user_id=user_id),
            "identity_risk_signals": _count(db, IdentityRiskSignal, user_id=user_id),
            "device_fingerprints": _count(db, DeviceFingerprint, user_id=user_id),
            "loans_as_borrower": _safe_count(
                "loans_as_borrower",
                lambda: _count_text_match(db, Loan, "borrower_user_id", user_id),
                db,
            ),
            "payout_destinations": _count(db, UserPayoutDestination, user_id=user_id),
            "recovery_profiles": _count(db, IdentityRecoveryProfile, user_id=user_id),
        },
        "status_counts": {
            "memberships": _status_counts(db, ClanMembership, "user_id", user_id, "role"),
            "join_requests": _status_counts(db, ClanJoinRequest, "applicant_user_id", user_id, "status"),
            "trust_slips": _status_counts(db, TrustSlip, "holder_user_id", user_id, "status"),
        },
    }


def main() -> int:
    args = parse_args()
    from app.db.database import SessionLocal
    from app.db.models import User

    identity_inputs: list[str] = []
    for gmfn_id in args.gmfn_id:
        identity_inputs.extend(_identity_candidates(gmfn_id))

    phone_inputs: list[str] = []
    for phone in args.phone:
        phone_inputs.extend(_phone_candidates(phone))

    emails = [_safe_str(email).lower() for email in args.email if _safe_str(email)]

    if not identity_inputs and not phone_inputs and not emails:
        print("Provide at least one --gmfn-id, --phone, or --email.")
        return 2

    db = SessionLocal()
    try:
        filters = []
        if identity_inputs:
            filters.append(func.upper(User.gmfn_id).in_(identity_inputs))
        if phone_inputs:
            filters.append(User.phone_e164.in_(phone_inputs))
        if emails:
            filters.append(func.lower(User.email).in_(emails))

        users = (
            db.query(User)
            .filter(or_(*filters))
            .order_by(User.id.asc())
            .all()
        )

        report = {
            "ok": True,
            "mode": "read_only",
            "inputs_checked": {
                "gmfn_id_candidates": sorted(set(identity_inputs)),
                "phone_candidates": sorted(set(phone_inputs)),
                "emails": sorted(set(emails)),
            },
            "matched_user_count": len(users),
            "users": [_user_report(db, user) for user in users],
            "next_step": (
                "Choose the canonical identity only after comparing which user "
                "holds the trusted phone, profile image, memberships, created "
                "communities, shops/products, broadcasts, TrustSlip, and trust "
                "events. This script does not merge or edit anything."
            ),
        }
        print(json.dumps(report, indent=2, sort_keys=True, default=str))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
