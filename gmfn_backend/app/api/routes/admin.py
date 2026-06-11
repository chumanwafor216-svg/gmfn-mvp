# app/api/routes/admin.py
from __future__ import annotations

import json
import mimetypes
import os
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
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
    User,
    UserPayoutDestination,
)
from app.db.verification_models import IdentityVerificationCheck
from app.services.trust_events_services import build_trust_meta, log_trust_event
from app.services.trust_score_service import apply_trust_score

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_platform_admin(u: User) -> None:
    if (getattr(u, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")


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


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _local_upload_path(upload_url: Any) -> Optional[Path]:
    value = _safe_str(upload_url).split("?", 1)[0].split("#", 1)[0].replace("\\", "/")
    if not value.startswith("/uploads/"):
        return None

    relative = value[len("/uploads/") :].lstrip("/")
    if not relative:
        return None

    try:
        root = _uploads_root().resolve()
        candidate = (root / relative).resolve()
        candidate.relative_to(root)
    except Exception:
        return None

    return candidate


class IdentityVerificationDecisionIn(BaseModel):
    decision: str = Field(..., min_length=3, max_length=16)
    reviewer_note: Optional[str] = Field(default=None, max_length=500)


class IdentityVerificationCorrectionIn(BaseModel):
    reason: str = Field(..., min_length=4, max_length=500)


def _json_text(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, sort_keys=True, default=str)


def _check_provider_response(check: IdentityVerificationCheck) -> dict[str, Any]:
    raw = getattr(check, "provider_response_json", None)
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _serialize_identity_check(check: IdentityVerificationCheck) -> dict[str, Any]:
    provider_response = _check_provider_response(check)
    return {
        "ok": True,
        "verification_check_id": int(check.id),
        "verification_type": check.verification_type,
        "status": check.status,
        "provider_key": check.provider_key,
        "region_code": check.region_code,
        "confidence_score": check.confidence_score,
        "explanation": check.explanation,
        "evidence_url": _safe_str(provider_response.get("evidence_url")) or None,
        "verified_at": _dt_iso(check.verified_at),
        "manual_review": bool(provider_response.get("manual_review")),
        "provider_verified": bool(provider_response.get("provider_verified")),
        "review_decision": _safe_str(provider_response.get("review_decision")) or None,
        "reviewed_at": _safe_str(provider_response.get("reviewed_at")) or None,
        "provider_response": provider_response,
    }


def _primary_membership_clan_id(db: Session, user_id: int) -> Optional[int]:
    row = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.id.asc())
        .first()
    )
    if row is None:
        return None
    return int(row.clan_id)


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


@router.post("/identity-verification-checks/{check_id}/decision")
def admin_identity_verification_decision(
    check_id: int,
    payload: IdentityVerificationDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin/manual review decision for founder identity photo evidence.

    This does not pretend to be provider KYC or liveness. It records a human
    review decision and feeds the append-only Trust Event trail.
    """
    _require_platform_admin(current_user)

    decision = _safe_str(payload.decision).lower().replace("-", "_")
    decision_aliases = {
        "accept": "verify",
        "accepted": "verify",
        "approved": "verify",
        "verify": "verify",
        "verified": "verify",
        "reject": "reject",
        "rejected": "reject",
        "fail": "reject",
        "failed": "reject",
        "needs_more": "needs_more",
        "needs_more_evidence": "needs_more",
        "more": "needs_more",
    }
    decision = decision_aliases.get(decision, decision)
    if decision not in {"verify", "reject", "needs_more"}:
        raise HTTPException(
            status_code=400,
            detail="Decision must be verify, reject, or needs_more.",
        )

    check = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.id == int(check_id))
        .with_for_update()
        .one_or_none()
    )
    if check is None:
        raise HTTPException(status_code=404, detail="Identity verification check not found")
    if _safe_str(check.verification_type) != "identity_photo":
        raise HTTPException(
            status_code=400,
            detail="Only identity photo checks can be reviewed with this endpoint.",
        )
    subject_user = db.get(User, int(check.user_id)) if check.user_id else None
    if subject_user is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Identity photo review can only be decided after account creation "
                "attaches this evidence to a user."
            ),
        )

    now = datetime.now(timezone.utc)
    provider_response = _check_provider_response(check)
    evidence_url = _safe_str(provider_response.get("evidence_url")) or None
    reviewer_note = _safe_str(payload.reviewer_note) or None
    previous_decision = _safe_str(provider_response.get("review_decision")).lower()
    try:
        review_cycle = max(1, int(provider_response.get("review_cycle") or 1))
    except Exception:
        review_cycle = 1
    if previous_decision in {"verify", "reject"}:
        if decision == previous_decision:
            return {
                **_serialize_identity_check(check),
                "decision": previous_decision,
                "trust_summary": apply_trust_score(db, user_id=int(subject_user.id)),
                "already_reviewed": True,
            }
        raise HTTPException(
            status_code=409,
            detail=(
                "This identity photo already has a terminal review decision. "
                "Use a correction/reversal flow before changing it."
            ),
        )

    if decision == "verify":
        check.status = "matched"
        check.verified_at = now
        check.confidence_score = max(int(check.confidence_score or 0), 70)
        check.explanation = (
            "Photo/selfie evidence was reviewed and accepted for identity continuity. "
            "This is manual review evidence, not external liveness or passport-provider verification."
        )
        event_type = "identity.photo_evidence_verified"
        event_reason = "identity_photo_manual_review_accepted"
        trust_delta = "0.20"
    elif decision == "reject":
        check.status = "failed"
        check.verified_at = None
        check.confidence_score = 0
        check.explanation = (
            "Photo/selfie evidence was reviewed and could not be accepted. "
            "A clearer selfie, passport photo, or identity photo is needed before this proof can support trust."
        )
        event_type = "identity.photo_evidence_rejected"
        event_reason = "identity_photo_manual_review_rejected"
        trust_delta = "0.00"
    else:
        check.status = "manual_review_required"
        check.verified_at = None
        check.confidence_score = max(int(check.confidence_score or 0), 25)
        check.explanation = (
            "Photo/selfie evidence needs a clearer review before it can be accepted for identity continuity."
        )
        event_type = "identity.photo_evidence_needs_more"
        event_reason = "identity_photo_manual_review_needs_more"
        trust_delta = "0.00"

    provider_response.update(
        {
            "provider_configured": False,
            "provider_verified": False,
            "manual_review": True,
            "review_decision": decision,
            "reviewer_user_id": int(current_user.id),
            "reviewed_at": now.isoformat(),
            "reviewer_note": reviewer_note,
            "review_verified": decision == "verify",
            "review_cycle": review_cycle,
            "correction_required": False,
        }
    )
    check.provider_response_json = _json_text(provider_response)

    if decision == "verify" and evidence_url:
        subject_user.profile_image_url = evidence_url
        db.add(subject_user)
    elif decision == "reject" and evidence_url and subject_user.profile_image_url == evidence_url:
        subject_user.profile_image_url = None
        db.add(subject_user)

    meta = build_trust_meta(
        reason=event_reason,
        note=reviewer_note
        or (
            "Founder identity photo evidence was reviewed by a platform admin. "
            "No external liveness or KYC provider was connected for this decision."
        ),
        trust_delta=trust_delta,
        system=True,
        extra={
            "verification_check_id": int(check.id),
            "decision": decision,
            "evidence_url": evidence_url,
            "provider_verified": False,
            "manual_review": True,
            "review_cycle": review_cycle,
            "affects_trust_reading": decision == "verify",
        },
    )
    log_trust_event(
        db,
        event_type=event_type,
        clan_id=_primary_membership_clan_id(db, int(subject_user.id)),
        actor_user_id=int(current_user.id),
        subject_user_id=int(subject_user.id),
        meta=meta,
        dedupe_key=f"identity_photo_review:{int(check.id)}:{review_cycle}:{decision}",
        commit=False,
        refresh=False,
    )

    db.add(check)
    db.commit()
    db.refresh(check)

    trust_summary = apply_trust_score(db, user_id=int(subject_user.id))

    return {
        **_serialize_identity_check(check),
        "decision": decision,
        "trust_summary": trust_summary,
    }


@router.get("/identity-verification-checks/{check_id}/evidence")
def admin_identity_verification_evidence(
    check_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Authenticated admin-only preview of private identity-photo evidence.

    The stored upload URL is still an internal pointer; admin UI should use
    this route instead of opening the raw /uploads path.
    """
    _require_platform_admin(current_user)

    check = db.get(IdentityVerificationCheck, int(check_id))
    if check is None:
        raise HTTPException(status_code=404, detail="Identity verification check not found")
    if _safe_str(check.verification_type) != "identity_photo":
        raise HTTPException(
            status_code=400,
            detail="Only identity photo evidence can be opened with this endpoint.",
        )

    evidence_url = _safe_str(_check_provider_response(check).get("evidence_url"))
    candidate = _local_upload_path(evidence_url)
    if candidate is None or not candidate.is_file():
        raise HTTPException(status_code=404, detail="Identity photo evidence file not found")

    media_type = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
    return FileResponse(
        path=str(candidate),
        media_type=media_type,
        filename=candidate.name,
        headers={"Cache-Control": "no-store"},
    )


@router.post("/identity-verification-checks/{check_id}/correction")
def admin_identity_verification_correction(
    check_id: int,
    payload: IdentityVerificationCorrectionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reopen a terminal identity-photo review without deleting the old decision.

    If the previous decision strengthened trust, a reversal TrustEvent removes
    that score effect before the check returns to manual review.
    """
    _require_platform_admin(current_user)

    check = (
        db.query(IdentityVerificationCheck)
        .filter(IdentityVerificationCheck.id == int(check_id))
        .with_for_update()
        .one_or_none()
    )
    if check is None:
        raise HTTPException(status_code=404, detail="Identity verification check not found")
    if _safe_str(check.verification_type) != "identity_photo":
        raise HTTPException(
            status_code=400,
            detail="Only identity photo checks can be corrected with this endpoint.",
        )
    subject_user = db.get(User, int(check.user_id)) if check.user_id else None
    if subject_user is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Identity photo correction can only run after account creation "
                "attaches this evidence to a user."
            ),
        )

    provider_response = _check_provider_response(check)
    previous_decision = _safe_str(provider_response.get("review_decision")).lower()
    if previous_decision not in {"verify", "reject"}:
        raise HTTPException(
            status_code=400,
            detail="Only accepted or rejected identity photo decisions can be reopened.",
        )

    try:
        previous_cycle = max(1, int(provider_response.get("review_cycle") or 1))
    except Exception:
        previous_cycle = 1
    next_cycle = previous_cycle + 1
    reason = _safe_str(payload.reason)
    now = datetime.now(timezone.utc)
    evidence_url = _safe_str(provider_response.get("evidence_url")) or None

    event_type = (
        "identity.photo_evidence_verified_reversed"
        if previous_decision == "verify"
        else "identity.photo_evidence_review_corrected"
    )
    meta = build_trust_meta(
        reason=(
            "identity_photo_verified_review_reopened"
            if previous_decision == "verify"
            else "identity_photo_rejected_review_reopened"
        ),
        note=reason,
        trust_delta="-0.20" if previous_decision == "verify" else "0.00",
        system=True,
        extra={
            "verification_check_id": int(check.id),
            "previous_decision": previous_decision,
            "review_cycle_reopened": previous_cycle,
            "next_review_cycle": next_cycle,
            "evidence_url": evidence_url,
            "provider_verified": False,
            "manual_review": True,
            "affects_trust_reading": previous_decision == "verify",
        },
    )
    log_trust_event(
        db,
        event_type=event_type,
        clan_id=_primary_membership_clan_id(db, int(subject_user.id)),
        actor_user_id=int(current_user.id),
        subject_user_id=int(subject_user.id),
        meta=meta,
        dedupe_key=f"identity_photo_review:{int(check.id)}:{previous_cycle}:correction",
        commit=False,
        refresh=False,
    )

    if previous_decision == "verify" and evidence_url and subject_user.profile_image_url == evidence_url:
        subject_user.profile_image_url = None
        db.add(subject_user)

    provider_response.update(
        {
            "provider_verified": False,
            "manual_review": True,
            "review_decision": "reopened",
            "review_verified": False,
            "previous_review_decision": previous_decision,
            "previous_review_cycle": previous_cycle,
            "review_cycle": next_cycle,
            "correction_required": True,
            "corrected_by_user_id": int(current_user.id),
            "corrected_at": now.isoformat(),
            "correction_reason": reason,
        }
    )
    check.provider_response_json = _json_text(provider_response)
    check.status = "manual_review_required"
    check.verified_at = None
    check.confidence_score = max(25, int(check.confidence_score or 0))
    check.explanation = (
        "A previous photo/selfie review decision was reopened. "
        "This evidence needs a fresh admin decision before it can strengthen trust."
    )

    db.add(check)
    db.commit()
    db.refresh(check)

    trust_summary = apply_trust_score(db, user_id=int(subject_user.id))

    return {
        **_serialize_identity_check(check),
        "decision": "reopened",
        "previous_decision": previous_decision,
        "trust_summary": trust_summary,
    }


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
                        "has_user": bool(check.user_id),
                        "user_id": int(check.user_id) if check.user_id else None,
                        "manual_review": bool(
                            _check_provider_response(check).get("manual_review")
                        ),
                        "provider_verified": bool(
                            _check_provider_response(check).get("provider_verified")
                        ),
                        "review_decision": _safe_str(
                            _check_provider_response(check).get("review_decision")
                        )
                        or None,
                        "evidence_url": _safe_str(
                            _check_provider_response(check).get("evidence_url")
                        )
                        or None,
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
