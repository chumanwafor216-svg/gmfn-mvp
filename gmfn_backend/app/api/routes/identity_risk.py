from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.auth import is_user_activation_pending
from app.db.database import get_db
from app.db.models import Clan, ClanJoinRequest, ClanMembership, User
from app.services.identity_reconciliation_service import reconcile_duplicate_identity
from app.services.identity_service import (
    get_identity_recovery_summary,
    get_identity_risk_summary,
    list_identity_risks,
    register_identity_observation,
    upsert_identity_recovery_profile,
    verify_identity_recovery_profile,
)

router = APIRouter(prefix="/identity-risk", tags=["identity-risk"])


def _require_admin(current_user: User) -> None:
    if (getattr(current_user, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


def _clean_phone_query(value: object) -> str:
    return "".join(
        ch for ch in str(value or "").strip() if ch.isdigit() or ch == "+"
    )


def _phone_query_candidates(value: object) -> list[str]:
    cleaned = _clean_phone_query(value)
    candidates = [cleaned]
    if cleaned.startswith("00") and len(cleaned) > 4:
        candidates.append(f"+{cleaned[2:]}")
    if cleaned.startswith("+"):
        candidates.append(cleaned.replace("+", "00", 1))
    return [item for index, item in enumerate(candidates) if item and item not in candidates[:index]]


def _iso(value: Any) -> str | None:
    return value.isoformat() if value else None


def _join_request_counts(db: Session, user_id: int) -> dict[str, int]:
    rows = (
        db.query(ClanJoinRequest.status)
        .filter(ClanJoinRequest.applicant_user_id == int(user_id))
        .all()
    )
    counts: dict[str, int] = {}
    for row in rows:
        status = str(row[0] or "unknown")
        counts[status] = counts.get(status, 0) + 1
    return counts


def _identity_lineage_row(db: Session, user: User) -> dict[str, Any]:
    user_id = int(user.id)
    active_memberships = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == user_id,
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.desc(), ClanMembership.id.desc())
        .all()
    )
    created_communities = (
        db.query(Clan)
        .filter(Clan.created_by_user_id == user_id)
        .order_by(Clan.created_at.desc(), Clan.id.desc())
        .limit(10)
        .all()
    )
    pending_join_count = (
        db.query(ClanJoinRequest)
        .filter(
            ClanJoinRequest.applicant_user_id == user_id,
            ClanJoinRequest.status == "pending",
        )
        .count()
    )
    activation_pending = is_user_activation_pending(user)
    phone_verified = bool(getattr(user, "phone_e164", None) and getattr(user, "phone_verified_at", None))
    if activation_pending and pending_join_count:
        protection_state = "pending_join_or_create"
        recommended_first_step = "Open the original join/create activation path before moving this phone."
    elif activation_pending:
        protection_state = "pending_identity"
        recommended_first_step = "Review whether this is abandoned before any admin release."
    else:
        protection_state = "active_or_protected"
        recommended_first_step = "Sign in to this GSN ID, or merge only after ownership checks."

    return {
        "user_id": user_id,
        "gmfn_id": getattr(user, "gmfn_id", None),
        "email": getattr(user, "email", None),
        "display_name": getattr(user, "display_name", None),
        "role": getattr(user, "role", None),
        "phone_e164": getattr(user, "phone_e164", None),
        "phone_verified": phone_verified,
        "phone_verified_at": _iso(getattr(user, "phone_verified_at", None)),
        "activation_pending": activation_pending,
        "protection_state": protection_state,
        "recommended_first_step": recommended_first_step,
        "active_membership_count": len(active_memberships),
        "pending_join_request_count": int(pending_join_count),
        "join_request_counts": _join_request_counts(db, user_id),
        "created_community_count": (
            db.query(Clan)
            .filter(Clan.created_by_user_id == user_id)
            .count()
        ),
        "memberships": [
            {
                "clan_id": int(row.clan_id),
                "role": row.role,
                "created_at": _iso(row.created_at),
            }
            for row in active_memberships[:10]
        ],
        "created_communities": [
            {
                "id": int(row.id),
                "name": row.name,
                "community_code": row.community_code,
                "status": row.status,
                "created_at": _iso(row.created_at),
            }
            for row in created_communities
        ],
    }


class RecoveryQuestionIn(BaseModel):
    prompt: str = Field(..., min_length=4, max_length=180)
    answer: str = Field(..., min_length=2, max_length=180)


class RecoverySetupIn(BaseModel):
    questions: list[RecoveryQuestionIn] = Field(..., min_length=3, max_length=3)


class RecoveryVerifyIn(BaseModel):
    answers: list[str] = Field(..., min_length=3, max_length=3)


class AdminIdentityReconcileIn(BaseModel):
    canonical_user_id: int | None = Field(default=None, ge=1)
    canonical_gmfn_id: str | None = Field(default=None, min_length=6, max_length=64)
    duplicate_user_id: int | None = Field(default=None, ge=1)
    duplicate_gmfn_id: str | None = Field(default=None, min_length=6, max_length=64)
    owner_confirmed: bool = False
    execute: bool = False
    reviewer_note: str | None = Field(default=None, max_length=600)


def _resolve_reconcile_user(
    db: Session,
    *,
    user_id: int | None,
    gmfn_id: str | None,
    label: str,
) -> User:
    if user_id is None and not str(gmfn_id or "").strip():
        raise HTTPException(
            status_code=400,
            detail=f"{label} user_id or gmfn_id is required",
        )

    query = db.query(User)
    if user_id is not None:
        user = query.filter(User.id == int(user_id)).first()
    else:
        raw_gmfn_id = str(gmfn_id or "").strip().upper()
        candidate_ids = [raw_gmfn_id]
        if raw_gmfn_id.startswith("GMFN-"):
            candidate_ids.append(f"GSN-{raw_gmfn_id[5:]}")
        elif raw_gmfn_id.startswith("GSN-"):
            candidate_ids.append(f"GMFN-{raw_gmfn_id[4:]}")
        user = query.filter(User.gmfn_id.in_(candidate_ids)).first()

    if user is None:
        raise HTTPException(status_code=404, detail=f"{label} user was not found")
    return user


@router.post("/observe")
def observe_identity(
    request: Request,
    client_hint: str | None = Header(default=None, alias="X-Client-Fingerprint"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return register_identity_observation(
        db,
        user_id=int(current_user.id),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        client_hint=client_hint,
    )


@router.get("/me")
def my_identity_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return get_identity_risk_summary(
        db,
        user_id=int(current_user.id),
    )


@router.get("/recovery/me")
def my_identity_recovery(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return get_identity_recovery_summary(
        db,
        user_id=int(current_user.id),
    )


@router.post("/recovery/setup")
def setup_identity_recovery(
    payload: RecoverySetupIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return upsert_identity_recovery_profile(
            db,
            user_id=int(current_user.id),
            prompts_and_answers=[item.model_dump() for item in payload.questions],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/recovery/verify")
def verify_identity_recovery(
    payload: RecoveryVerifyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        result = verify_identity_recovery_profile(
            db,
            user_id=int(current_user.id),
            answers=[str(item or "").strip() for item in payload.answers],
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=423, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return result


@router.get("/admin")
def admin_identity_risk(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)

    return list_identity_risks(
        db,
        limit=int(limit),
    )


@router.get("/admin/phone-lineage")
def admin_phone_identity_lineage(
    phone_e164: str = Query(..., min_length=6, max_length=40),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)

    candidates = _phone_query_candidates(phone_e164)
    rows = (
        db.query(User)
        .filter(User.phone_e164.in_(candidates))
        .order_by(User.id.asc())
        .all()
        if candidates
        else []
    )

    return {
        "ok": True,
        "query_phone_e164": _clean_phone_query(phone_e164),
        "candidate_count": len(candidates),
        "candidates": candidates,
        "match_count": len(rows),
        "matches": [_identity_lineage_row(db, row) for row in rows],
        "lineage_note": (
            "Read-only admin diagnostic. This does not release, merge, verify, "
            "or move a phone number."
        ),
    }


@router.post("/admin/reconcile-duplicate")
def admin_reconcile_duplicate_identity(
    payload: AdminIdentityReconcileIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)

    canonical = _resolve_reconcile_user(
        db,
        user_id=payload.canonical_user_id,
        gmfn_id=payload.canonical_gmfn_id,
        label="Canonical",
    )
    duplicate = _resolve_reconcile_user(
        db,
        user_id=payload.duplicate_user_id,
        gmfn_id=payload.duplicate_gmfn_id,
        label="Duplicate",
    )

    try:
        return reconcile_duplicate_identity(
            db,
            canonical_user=canonical,
            duplicate_user=duplicate,
            actor_user_id=int(current_user.id),
            owner_confirmed=bool(payload.owner_confirmed),
            execute=bool(payload.execute),
            reviewer_note=str(payload.reviewer_note or "").strip(),
        )
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
