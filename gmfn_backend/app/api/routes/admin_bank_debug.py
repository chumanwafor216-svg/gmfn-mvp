# app/api/routes/admin_bank_debug.py
from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import CommunityDomain, User
from app.db.bank_models import BankEvent, ExpectedPayment
from app.services.feature_entitlements_service import grant_or_extend_entitlement

router = APIRouter(prefix="/admin/bank", tags=["admin"])


class ExpectedPaymentFinanceReviewIn(BaseModel):
    decision: str = Field(..., min_length=2, max_length=24)
    note: Optional[str] = Field(default=None, max_length=300)


def _safe_meta_json(raw: Optional[str]) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _admin_only(current_user: User) -> None:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value.quantize(Decimal("0.01"))
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _expected_payment_admin_payload(row: ExpectedPayment) -> dict[str, Any]:
    meta = _safe_meta_json(getattr(row, "meta_json", None))
    latest_proof = meta.get("latest_payment_proof")
    if not isinstance(latest_proof, dict):
        latest_proof = {}

    return {
        "id": row.id,
        "clan_id": row.clan_id,
        "user_id": row.user_id,
        "expected_type": row.expected_type,
        "amount": str(row.amount),
        "currency": row.currency,
        "reference_display": row.reference_display,
        "reference_normalized": row.reference_normalized,
        "status": row.status,
        "status_reason": row.status_reason,
        "bank_event_id": row.bank_event_id,
        "created_at": row.created_at,
        "meta": meta,
        "meta_json": meta,
        "proof_status": meta.get("proof_status"),
        "proof_status_text": meta.get("proof_status_text"),
        "proof_filename": latest_proof.get("original_filename")
        or latest_proof.get("stored_filename"),
        "proof_submitted_at": latest_proof.get("submitted_at")
        or meta.get("proof_submitted_at"),
        "finance_review_status": meta.get("finance_review_status"),
        "finance_reviewed_at": meta.get("finance_reviewed_at"),
        "finance_reviewed_by_user_id": meta.get("finance_reviewed_by_user_id"),
    }


def _write_meta(row: ExpectedPayment, meta: dict[str, Any]) -> None:
    row.meta_json = json.dumps(meta, ensure_ascii=False)


def _append_finance_review(
    meta: dict[str, Any],
    *,
    decision: str,
    current_user: User,
    note: Optional[str],
    bank_event_id: Optional[int] = None,
) -> None:
    reviewed_at = _now_utc().isoformat()
    item = {
        "decision": decision,
        "reviewed_at": reviewed_at,
        "reviewed_by_user_id": int(current_user.id),
        "note": (note or "").strip()[:300],
        "bank_event_id": int(bank_event_id) if bank_event_id else None,
        "source": "admin_manual_finance_review",
    }
    reviews = meta.get("finance_reviews")
    if not isinstance(reviews, list):
        reviews = []
    reviews.append(item)
    meta["finance_reviews"] = reviews[-10:]
    meta["finance_review_status"] = decision
    meta["finance_reviewed_at"] = reviewed_at
    meta["finance_reviewed_by_user_id"] = int(current_user.id)
    if note:
        meta["finance_review_note"] = (note or "").strip()[:300]
    if bank_event_id:
        meta["finance_review_bank_event_id"] = int(bank_event_id)


@router.get("/bank-events/recent")
def admin_bank_events_recent(
    clan_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _admin_only(current_user)

    q = db.query(BankEvent).filter(BankEvent.clan_id == int(clan_id))
    if status:
        q = q.filter(BankEvent.status == status)

    rows = q.order_by(BankEvent.id.desc()).limit(int(limit)).all()
    items = [
        {
            "id": r.id,
            "clan_id": r.clan_id,
            "source_type": r.source_type,
            "direction": r.direction,
            "amount": str(r.amount),
            "currency": r.currency,
            "reference_normalized": r.reference_normalized,
            "status": r.status,
            "status_reason": r.status_reason,
            "expected_payment_id": r.expected_payment_id,
            "canonical": bool(r.canonical),
            "created_at": r.ingested_at,
        }
        for r in rows
    ]
    return {"items": items, "total": len(items)}


@router.get("/expected-payments/recent")
def admin_expected_payments_recent(
    clan_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _admin_only(current_user)

    q = db.query(ExpectedPayment).filter(ExpectedPayment.clan_id == int(clan_id))
    if status:
        q = q.filter(ExpectedPayment.status == status)

    rows = q.order_by(ExpectedPayment.id.desc()).limit(int(limit)).all()
    items = [_expected_payment_admin_payload(r) for r in rows]
    return {"items": items, "total": len(items)}


@router.post("/expected-payments/{expected_payment_id}/finance-review")
def admin_expected_payment_finance_review(
    expected_payment_id: int,
    payload: ExpectedPaymentFinanceReviewIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _admin_only(current_user)

    row = db.get(ExpectedPayment, int(expected_payment_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Expected payment not found")

    decision = (payload.decision or "").strip().lower()
    if decision not in {"approve", "approved", "reject", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="decision must be approve or reject",
        )

    meta = _safe_meta_json(getattr(row, "meta_json", None))
    latest_proof = meta.get("latest_payment_proof")
    has_proof = isinstance(latest_proof, dict) and bool(
        latest_proof.get("stored_filename") or latest_proof.get("original_filename")
    )
    has_proof = has_proof or bool(meta.get("proof_submitted_at"))
    if not has_proof:
        raise HTTPException(
            status_code=400,
            detail="No submitted proof is recorded for this expected payment.",
        )

    if decision in {"reject", "rejected"}:
        _append_finance_review(
            meta,
            decision="rejected",
            current_user=current_user,
            note=payload.note,
        )
        meta["proof_status"] = "rejected"
        meta["proof_status_text"] = "Rejected by finance review"
        _write_meta(row, meta)
        if (row.status or "").lower() not in {"confirmed", "applied"}:
            row.status_reason = "finance_review_rejected"
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "ok": True,
            "decision": "rejected",
            "expected_payment": _expected_payment_admin_payload(row),
            "boundary": (
                "Proof rejected by manual finance review. No payment was "
                "confirmed, no bank event was applied, and no Community Domain "
                "activation was triggered."
            ),
        }

    if (row.status or "").lower() in {"confirmed", "applied"} and row.bank_event_id:
        _append_finance_review(
            meta,
            decision="approved",
            current_user=current_user,
            note=payload.note,
            bank_event_id=int(row.bank_event_id),
        )
        meta["proof_status"] = "approved"
        meta["proof_status_text"] = "Approved after manual finance review"
        _write_meta(row, meta)
        db.add(row)
        db.commit()
        db.refresh(row)
        return {
            "ok": True,
            "decision": "approved",
            "bank_event_id": int(row.bank_event_id),
            "expected_payment": _expected_payment_admin_payload(row),
            "boundary": "Expected payment was already confirmed; review metadata was recorded.",
        }

    expected_type = _safe_str(getattr(row, "expected_type", "")).lower()
    if expected_type != "community_domain_subscription":
        raise HTTPException(
            status_code=400,
            detail="Manual finance review approval is currently limited to Community Domain subscriptions.",
        )

    community_domain_id = _safe_int(meta.get("community_domain_id"), 0)
    if community_domain_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="This expected payment is missing its Community Domain link.",
        )

    domain = db.get(CommunityDomain, int(community_domain_id))
    if domain is None:
        raise HTTPException(status_code=404, detail="Community Domain not found")

    remaining = _money(getattr(row, "remaining_amount", None))
    paid = _money(getattr(row, "paid_amount", None))
    amount = _money(getattr(row, "amount", None))
    if remaining <= Decimal("0.00"):
        remaining = amount - paid
    if remaining <= Decimal("0.00"):
        remaining = amount

    feature_code = _safe_str(meta.get("feature_code"), "community_domain")
    plan_code = _safe_str(meta.get("plan_code"), "community_domain_starter_year")
    owner_user_id = _safe_int(meta.get("owner_user_id"), int(row.user_id))
    clan_id = _safe_int(meta.get("clan_id"), int(row.clan_id)) or int(row.clan_id)
    quantity_total = max(1, _safe_int(meta.get("quantity_total"), 1))
    billing_cycle = _safe_str(meta.get("billing_cycle"), "annual")
    payment_reference = _safe_str(
        meta.get("payment_reference"),
        _safe_str(row.reference_normalized) or _safe_str(row.reference_display),
    )

    entitlement = grant_or_extend_entitlement(
        db,
        owner_user_id=int(owner_user_id),
        clan_id=int(clan_id),
        shop_id=None,
        feature_code=feature_code,
        plan_code=plan_code,
        quantity_total=quantity_total,
        billing_cycle=billing_cycle,
        payment_reference=payment_reference,
        commit=False,
        refresh=False,
    )

    previous_status = _safe_str(getattr(domain, "status", None), "draft")
    if previous_status.lower() not in {"closed", "suspended"}:
        domain.status = "active"
        db.add(domain)

    row.paid_amount = amount
    row.remaining_amount = Decimal("0.00")
    row.status = "confirmed"
    row.status_reason = "manual_finance_review_approved"

    meta = _safe_meta_json(getattr(row, "meta_json", None))
    _append_finance_review(
        meta,
        decision="approved",
        current_user=current_user,
        note=payload.note,
        bank_event_id=None,
    )
    meta["proof_status"] = "approved"
    meta["proof_status_text"] = "Approved after manual finance review"
    meta["manual_finance_review"] = True
    meta["application_kind"] = "feature_subscription"
    meta["manual_finance_review_no_bank_event"] = True
    meta["last_applied_amount"] = str(amount)
    meta["last_applied_at"] = _now_utc().isoformat()
    meta["entitlement_id"] = int(entitlement.id)
    meta["feature_code"] = feature_code
    meta["plan_code"] = plan_code
    meta["quantity_total"] = quantity_total
    meta["billing_cycle"] = billing_cycle
    meta["payment_reference"] = payment_reference
    meta["community_domain_activation"] = {
        "community_domain_id": int(community_domain_id),
        "previous_status": previous_status,
        "status": _safe_str(getattr(domain, "status", None), previous_status),
        "verification_status": _safe_str(
            getattr(domain, "verification_status", None),
            "unverified",
        ),
        "source": "manual_finance_review",
    }
    _write_meta(row, meta)
    db.add(row)
    db.add(entitlement)
    db.commit()
    db.refresh(row)

    return {
        "ok": True,
        "decision": "approved",
        "bank_event_id": None,
        "bank_event_status": "not_created_for_manual_finance_review",
        "bank_event_status_reason": "manual_finance_review_approved",
        "entitlement_id": int(entitlement.id),
        "expected_payment": _expected_payment_admin_payload(row),
        "boundary": (
            "Manual finance review approved. GSN marked this Community Domain "
            "expected payment confirmed, granted the subscription entitlement, "
            "and activated the linked Community Domain. This is an admin "
            "confirmation record, not automatic proof that the uploaded file "
            "itself moved money."
        ),
    }
