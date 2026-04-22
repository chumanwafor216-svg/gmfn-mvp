# app/api/routes/admin.py
from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanJoinRequest,
    ClanMembership,
    EntryPhoneVerification,
    LoanGuarantor,
    TrustEvent,
    User,
    UserPayoutDestination,
)
from app.db.verification_models import IdentityVerificationCheck

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_platform_admin(u: User) -> None:
    if (getattr(u, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")


def _safe_meta(te: TrustEvent) -> Optional[dict[str, Any]]:
    raw = getattr(te, "meta_json", None)
    if not raw:
        return None
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": str(raw)}


def _d(x: Any) -> Decimal:
    try:
        return Decimal(str(x if x is not None else 0))
    except Exception:
        return Decimal("0")


def _safe_str(x: Any) -> str:
    return str(x or "").strip()


def _dt_iso(x: Any) -> Optional[str]:
    if x is None:
        return None
    if isinstance(x, datetime):
        return x.isoformat()
    return _safe_str(x) or None


def _utc_dt(x: Any) -> Optional[datetime]:
    if not isinstance(x, datetime):
        return None
    if x.tzinfo is None:
        return x.replace(tzinfo=timezone.utc)
    return x.astimezone(timezone.utc)


def _last4(x: Any) -> Optional[str]:
    digits = "".join(ch for ch in _safe_str(x) if ch.isdigit())
    return digits[-4:] if digits else None


def _entry_stage(row: EntryPhoneVerification, user: Optional[User], now: datetime) -> str:
    expires_at = _utc_dt(getattr(row, "expires_at", None))

    if user is not None and getattr(row, "consumed_at", None) is not None:
        return "completed"
    if user is not None:
        return "account_exists"
    if expires_at is not None and expires_at < now:
        return "expired"
    if getattr(row, "bank_details_recorded_at", None) is not None:
        return "ready_for_community"
    if getattr(row, "verified_at", None) is not None:
        return "awaiting_bank"
    return "awaiting_phone"


def _entry_next_action(stage: str) -> str:
    if stage == "completed":
        return "Creation appears complete. If the tester is stuck, ask them to sign in or use the frontend recovery path."
    if stage == "account_exists":
        return "The phone or email already belongs to an account. Guide the tester to sign in instead of restarting."
    if stage == "ready_for_community":
        return "Phone and bank or wallet details are ready. The tester should finish community setup."
    if stage == "awaiting_bank":
        return "Phone proof is ready. The tester should add bank or wallet details."
    if stage == "awaiting_phone":
        return "The tester started entry but phone proof is not complete yet."
    if stage == "expired":
        return "The pilot session expired before completion. Ask the tester to start again with the same name, phone, and email."
    return "Review this intake record."


def _join_stage(row: ClanJoinRequest) -> str:
    status = _safe_str(getattr(row, "status", "")).lower() or "pending"
    if status == "approved" and getattr(row, "activation_link", None):
        return "approved_activation_ready"
    if status == "approved":
        return "approved_missing_activation"
    if status == "rejected":
        return "rejected"
    return status


def _join_next_action(stage: str) -> str:
    if stage == "approved_activation_ready":
        return "The request is approved and has an activation link. Confirm the tester received it."
    if stage == "approved_missing_activation":
        return "The request is approved but the activation link is missing. Admin should regenerate or review activation delivery."
    if stage == "pending":
        return "Members still need to review or vote on this join request."
    if stage == "rejected":
        return "No action unless the community wants to invite this person again."
    return "Review this join request."


@router.get("/trust-events/recent")
def admin_recent_trust_events(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Screenshot-ready recent TrustEvents (includes meta.reason/meta.note if present).
    """
    _require_platform_admin(current_user)

    rows = (
        db.query(TrustEvent)
        .order_by(TrustEvent.id.desc())
        .limit(int(limit))
        .all()
    )

    items = []
    for r in rows:
        items.append(
            {
                "id": int(r.id),
                "event_type": r.event_type,
                "created_at": getattr(r, "created_at", None),
                "clan_id": int(getattr(r, "clan_id", 0) or 0) if getattr(r, "clan_id", None) is not None else None,
                "loan_id": int(getattr(r, "loan_id", 0) or 0) if getattr(r, "loan_id", None) is not None else None,
                "guarantor_id": int(getattr(r, "guarantor_id", 0) or 0) if getattr(r, "guarantor_id", None) is not None else None,
                "actor_user_id": int(getattr(r, "actor_user_id", 0) or 0),
                "subject_user_id": int(getattr(r, "subject_user_id", 0) or 0),
                "meta": _safe_meta(r),
            }
        )

    return {"items": items, "total": len(items)}


@router.get("/exposure")
def admin_exposure(
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Minimal exposure view (admin-only).
    Exposure = sum(locked_amount - released_amount) for approved guarantees per user in clan.
    """
    _require_platform_admin(current_user)

    members = (
        db.query(
            ClanMembership.user_id,
            ClanMembership.role,
            ClanMembership.personal_pool_balance,
            User.email,
        )
        .join(User, User.id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .order_by(ClanMembership.id.asc())
        .all()
    )

    items = []
    for user_id, role, personal_pool_balance, email in members:
        uid = int(user_id)

        exposure_raw = (
            db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount - LoanGuarantor.released_amount), 0))
            .filter(
                LoanGuarantor.clan_id == int(clan_id),
                LoanGuarantor.guarantor_user_id == uid,
                func.lower(LoanGuarantor.status) == "approved",
            )
            .scalar()
            or 0
        )

        pool = _d(personal_pool_balance)
        exposure = _d(exposure_raw)
        available = pool - exposure
        if available < 0:
            available = Decimal("0")

        items.append(
            {
                "user_id": uid,
                "email": email,
                "role": role,
                "personal_pool_balance": str(pool),
                "exposure": str(exposure),
                "available": str(available),
            }
        )

    return {"items": items, "total": len(items), "clan_id": int(clan_id)}


@router.get("/pilot-intake")
def admin_pilot_intake(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin-only pilot intake monitor.

    This is intentionally read-only. It lets the pilot lead see whether public
    create-entry and join-request testers are moving through the funnel or
    getting stuck between phone, bank/wallet, community setup, and activation.
    """
    _require_platform_admin(current_user)

    now = datetime.now(timezone.utc)
    entry_rows = (
        db.query(EntryPhoneVerification)
        .order_by(EntryPhoneVerification.created_at.desc(), EntryPhoneVerification.id.desc())
        .limit(int(limit))
        .all()
    )

    create_items: list[dict[str, Any]] = []
    stage_counts: dict[str, int] = {}

    for row in entry_rows:
        email = _safe_str(getattr(row, "email", "")).lower()
        phone = _safe_str(getattr(row, "phone_e164", ""))
        user = None

        if phone:
            user = db.query(User).filter(User.phone_e164 == phone).first()
        if user is None and email:
            user = db.query(User).filter(func.lower(User.email) == email).first()

        payout = None
        communities: list[dict[str, Any]] = []
        if user is not None:
            payout = (
                db.query(UserPayoutDestination)
                .filter(UserPayoutDestination.user_id == int(user.id))
                .order_by(UserPayoutDestination.id.desc())
                .first()
            )

            membership_rows = (
                db.query(ClanMembership, Clan)
                .join(Clan, Clan.id == ClanMembership.clan_id)
                .filter(
                    ClanMembership.user_id == int(user.id),
                    ClanMembership.left_at.is_(None),
                )
                .order_by(ClanMembership.id.desc())
                .limit(5)
                .all()
            )

            communities = [
                {
                    "clan_id": int(clan.id),
                    "name": clan.name,
                    "marketplace_name": getattr(clan, "marketplace_name", None),
                    "role": membership.role,
                }
                for membership, clan in membership_rows
            ]

        checks = (
            db.query(IdentityVerificationCheck)
            .filter(IdentityVerificationCheck.entry_phone_verification_id == int(row.id))
            .order_by(IdentityVerificationCheck.id.asc())
            .all()
        )

        stage = _entry_stage(row, user, now)
        stage_counts[stage] = stage_counts.get(stage, 0) + 1

        create_items.append(
            {
                "verification_id": int(row.id),
                "stage": stage,
                "next_action": _entry_next_action(stage),
                "display_name": row.display_name,
                "phone_e164": row.phone_e164,
                "email": row.email,
                "created_at": _dt_iso(row.created_at),
                "expires_at": _dt_iso(row.expires_at),
                "verified_at": _dt_iso(row.verified_at),
                "bank_details_recorded_at": _dt_iso(row.bank_details_recorded_at),
                "driver_licence_recorded_at": _dt_iso(row.driver_licence_recorded_at),
                "consumed_at": _dt_iso(row.consumed_at),
                "phone_country_hint": row.phone_country_hint,
                "locale_country_hint": row.locale_country_hint,
                "bank_country": row.bank_country,
                "bank_currency": row.bank_currency,
                "bank_account_last4": _last4(row.bank_account_number),
                "region_consistency_status": row.region_consistency_status,
                "region_consistency_note": row.region_consistency_note,
                "user": {
                    "id": int(user.id),
                    "email": user.email,
                    "display_name": user.display_name,
                    "gmfn_id": user.gmfn_id,
                    "role": user.role,
                    "created_at": _dt_iso(user.created_at),
                }
                if user is not None
                else None,
                "payout_destination": {
                    "id": int(payout.id),
                    "destination_name": payout.destination_name,
                    "bank_name": payout.bank_name,
                    "account_last4": _last4(payout.account_number),
                    "country": payout.country,
                    "currency": payout.currency,
                    "verification_status": payout.verification_status,
                    "created_at": _dt_iso(payout.created_at),
                }
                if payout is not None
                else None,
                "communities": communities,
                "verification_checks": [
                    {
                        "id": int(check.id),
                        "type": check.verification_type,
                        "status": check.status,
                        "provider_key": check.provider_key,
                        "region_code": check.region_code,
                        "confidence_score": check.confidence_score,
                        "explanation": check.explanation,
                        "created_at": _dt_iso(check.created_at),
                    }
                    for check in checks
                ],
            }
        )

    join_rows = (
        db.query(ClanJoinRequest)
        .order_by(ClanJoinRequest.created_at.desc(), ClanJoinRequest.id.desc())
        .limit(int(limit))
        .all()
    )

    join_items: list[dict[str, Any]] = []
    join_stage_counts: dict[str, int] = {}

    for row in join_rows:
        stage = _join_stage(row)
        join_stage_counts[stage] = join_stage_counts.get(stage, 0) + 1
        clan = db.get(Clan, int(row.clan_id))
        applicant = db.get(User, int(row.applicant_user_id))
        inviter = db.get(User, int(row.invited_by_user_id)) if row.invited_by_user_id else None

        join_items.append(
            {
                "id": int(row.id),
                "stage": stage,
                "next_action": _join_next_action(stage),
                "status": row.status,
                "created_at": _dt_iso(row.created_at),
                "decided_at": _dt_iso(row.decided_at),
                "activation_generated_at": _dt_iso(row.activation_generated_at),
                "activation_delivery_status": row.activation_delivery_status,
                "has_activation_link": bool(row.activation_link),
                "clan": {
                    "id": int(clan.id),
                    "name": clan.name,
                    "marketplace_name": getattr(clan, "marketplace_name", None),
                }
                if clan is not None
                else None,
                "applicant": {
                    "id": int(applicant.id),
                    "email": applicant.email,
                    "display_name": applicant.display_name,
                    "gmfn_id": applicant.gmfn_id,
                    "phone_e164": applicant.phone_e164,
                }
                if applicant is not None
                else None,
                "inviter": {
                    "id": int(inviter.id),
                    "email": inviter.email,
                    "display_name": inviter.display_name,
                    "gmfn_id": inviter.gmfn_id,
                }
                if inviter is not None
                else None,
            }
        )

    return {
        "generated_at": _dt_iso(now),
        "summary": {
            "create_total": len(create_items),
            "create_by_stage": stage_counts,
            "join_total": len(join_items),
            "join_by_stage": join_stage_counts,
            "needs_attention": (
                stage_counts.get("expired", 0)
                + stage_counts.get("account_exists", 0)
                + join_stage_counts.get("approved_missing_activation", 0)
            ),
        },
        "create_entries": create_items,
        "join_requests": join_items,
    }
@router.post("/activate-membership")
def activate(payload: dict):
    db = SessionLocal()

    user = db.query(models.User).filter_by(gmfn_id=payload["gmfn_id"]).first()

    if not user:
        raise HTTPException(404, "Invalid ID")

    user.hashed_password = payload["password"]
    user.is_active = True

    db.commit()

    return {"status": "activated"}
