from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.bank_models import BankEvent, ExpectedPayment
from app.db.models import PoolEvent, User
from app.services.feature_entitlements_service import grant_or_extend_entitlement
from app.services.repayments_service import create_repayment
from app.services.trust_events_services import log_trust_event
from app.services.vault_domain_service import (
    activate_vault_order_from_expected_payment,
    mark_vault_order_payment_detected,
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _d(x: Any) -> Decimal:
    if x is None:
        return Decimal("0.00")
    if isinstance(x, Decimal):
        return x.quantize(Decimal("0.01"))
    return Decimal(str(x)).quantize(Decimal("0.01"))


def _safe_meta_json(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _set_meta_json(row: ExpectedPayment, meta: Dict[str, Any]) -> None:
    row.meta_json = json.dumps(meta, ensure_ascii=False)


def _append_note(existing: Optional[str], extra: str) -> str:
    e = (existing or "").strip()
    x = (extra or "").strip()
    if not e:
        return x
    if not x:
        return e
    return f"{e} | {x}"


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _find_pool_event_for_expected(db: Session, *, exp: ExpectedPayment) -> Optional[PoolEvent]:
    meta = _safe_meta_json(getattr(exp, "meta_json", None))
    pool_event_id = meta.get("pool_event_id")

    if pool_event_id:
        row = db.get(PoolEvent, int(pool_event_id))
        if row:
            return row

    return (
        db.query(PoolEvent)
        .filter(PoolEvent.clan_id == int(exp.clan_id))
        .filter(PoolEvent.user_id == int(exp.user_id))
        .filter(PoolEvent.reference == exp.reference_display)
        .filter(PoolEvent.currency == exp.currency)
        .filter(PoolEvent.amount == exp.amount)
        .order_by(PoolEvent.id.asc())
        .first()
    )


def _mark_expected_applied(
    db: Session,
    *,
    exp: ExpectedPayment,
    be: BankEvent,
    application_kind: str,
    applied_amount: Decimal,
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    meta = _safe_meta_json(getattr(exp, "meta_json", None))
    meta["application_kind"] = application_kind
    meta["last_applied_bank_event_id"] = int(be.id)
    meta["last_applied_amount"] = str(_d(applied_amount))
    meta["last_applied_at"] = _now_utc().isoformat()
    if extra:
        meta.update(extra)
    _set_meta_json(exp, meta)
    db.add(exp)


def _apply_pool_contribution(
    db: Session,
    *,
    be: BankEvent,
    exp: ExpectedPayment,
) -> Dict[str, Any]:
    """
    For MVP safety:
    - only auto-confirm pool deposit when ExpectedPayment is fully confirmed
    - do not auto-confirm on partial contribution matches
    """
    if (exp.status or "").lower() != "confirmed":
        return {
            "ok": True,
            "applied": False,
            "kind": "contribution",
            "reason": "expected_not_fully_confirmed",
        }

    pe = _find_pool_event_for_expected(db, exp=exp)
    if not pe:
        return {
            "ok": False,
            "applied": False,
            "kind": "contribution",
            "reason": "pool_event_not_found",
        }

    if (pe.event_type or "").lower() == "deposit.confirmed":
        return {
            "ok": True,
            "applied": False,
            "kind": "contribution",
            "reason": "already_confirmed",
            "pool_event_id": int(pe.id),
        }

    if (pe.event_type or "").lower() != "deposit.requested":
        return {
            "ok": False,
            "applied": False,
            "kind": "contribution",
            "reason": f"unexpected_pool_event_type:{pe.event_type}",
            "pool_event_id": int(pe.id),
        }

    pe.event_type = "deposit.confirmed"
    pe.confirmed_at = _now_utc()
    pe.confirmed_by_user_id = None
    pe.note = _append_note(
        getattr(pe, "note", None),
        f"auto-confirmed by bank reconciliation (bank_event_id={int(be.id)})",
    )

    _mark_expected_applied(
        db,
        exp=exp,
        be=be,
        application_kind="pool_contribution",
        applied_amount=_d(exp.amount),
        extra={"pool_event_id": int(pe.id)},
    )

    db.add(pe)

    log_trust_event(
        db,
        event_type="pool.deposit.confirmed.auto",
        clan_id=int(exp.clan_id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(exp.user_id),
        subject_user_id=int(exp.user_id),
        meta={
            "reason": "pool_deposit_confirmed_by_reconciliation",
            "bank_event_id": int(be.id),
            "expected_payment_id": int(exp.id),
            "pool_event_id": int(pe.id),
            "amount": str(_d(exp.amount)),
            "currency": str(exp.currency),
            "reference": str(exp.reference_display),
        },
        commit=False,
        refresh=False,
    )

    from app.services.rosca_service import notify_rosca_contribution_confirmed

    notify_rosca_contribution_confirmed(db, exp=exp)

    db.commit()
    db.refresh(pe)
    db.refresh(exp)

    return {
        "ok": True,
        "applied": True,
        "kind": "contribution",
        "pool_event_id": int(pe.id),
    }


def _apply_repayment(
    db: Session,
    *,
    be: BankEvent,
    exp: ExpectedPayment,
) -> Dict[str, Any]:
    """
    Deterministically apply reconciled repayment progress into the loan ledger.

    Uses exp.meta_json:
    - loan_id
    - borrower_user_id
    - applied_to_loan_amount (tracked cumulatively)

    Safe behavior:
    - only applies delta = exp.paid_amount - already_applied
    - supports partial repayment progression
    """
    meta = _safe_meta_json(getattr(exp, "meta_json", None))
    loan_id = meta.get("loan_id")
    borrower_user_id = meta.get("borrower_user_id")

    if not loan_id or not borrower_user_id:
        return {
            "ok": False,
            "applied": False,
            "kind": "repayment",
            "reason": "missing_loan_or_borrower_meta",
        }

    paid_amount = _d(getattr(exp, "paid_amount", None))
    already_applied = _d(meta.get("applied_to_loan_amount"))

    delta = paid_amount - already_applied
    if delta <= Decimal("0.00"):
        return {
            "ok": True,
            "applied": False,
            "kind": "repayment",
            "reason": "no_unapplied_delta",
            "applied_to_loan_amount": str(already_applied),
        }

    borrower = db.get(User, int(borrower_user_id))
    if not borrower:
        return {
            "ok": False,
            "applied": False,
            "kind": "repayment",
            "reason": "borrower_not_found",
        }

    repayment, loan = create_repayment(
        db=db,
        loan_id=int(loan_id),
        payer=borrower,
        amount=delta,
        payment_reference=str(
            getattr(be, "reference_raw", None)
            or getattr(be, "reference_normalized", None)
            or ""
        ).strip()
        or None,
        confirmed_by_user_id=int(borrower_user_id),
    )

    _mark_expected_applied(
        db,
        exp=exp,
        be=be,
        application_kind="loan_repayment",
        applied_amount=delta,
        extra={
            "loan_id": int(loan_id),
            "borrower_user_id": int(borrower_user_id),
            "applied_to_loan_amount": str(_d(already_applied + delta)),
            "repayment_id": int(repayment.id),
            "loan_status_after_application": str(getattr(loan, "status", "")),
            "loan_remaining_after_application": str(
                getattr(loan, "remaining_amount", "0")
            ),
        },
    )

    log_trust_event(
        db,
        event_type="repayment.auto_applied",
        clan_id=int(exp.clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(borrower_user_id),
        subject_user_id=int(borrower_user_id),
        meta={
            "reason": "reconciled_payment_applied_to_loan",
            "bank_event_id": int(be.id),
            "expected_payment_id": int(exp.id),
            "repayment_id": int(repayment.id),
            "applied_delta": str(delta),
            "total_paid_on_expected": str(paid_amount),
            "previously_applied": str(already_applied),
            "loan_status_after": str(getattr(loan, "status", "")),
            "loan_remaining_after": str(getattr(loan, "remaining_amount", "0")),
            "currency": str(exp.currency),
            "reference": str(exp.reference_display),
        },
        commit=False,
        refresh=False,
    )

    db.add(exp)
    db.commit()
    db.refresh(exp)

    return {
        "ok": True,
        "applied": True,
        "kind": "repayment",
        "repayment_id": int(repayment.id),
        "loan_id": int(loan.id),
        "applied_delta": str(delta),
        "loan_status": str(getattr(loan, "status", "")),
        "remaining_amount": str(getattr(loan, "remaining_amount", "0")),
    }


def _apply_feature_subscription(
    db: Session,
    *,
    be: BankEvent,
    exp: ExpectedPayment,
) -> Dict[str, Any]:
    """
    Apply paid feature subscriptions only when the expected payment is fully confirmed.

    Supported expected_type values:
    - vault_subscription
    - merchant_verify_subscription
    - spotlight_subscription
    - community_package_subscription
    - community_domain_subscription
    """
    if (exp.status or "").lower() != "confirmed":
        return {
            "ok": True,
            "applied": False,
            "kind": "feature_subscription",
            "reason": "expected_not_fully_confirmed",
        }

    meta = _safe_meta_json(getattr(exp, "meta_json", None))

    existing_entitlement_id = _safe_int(meta.get("entitlement_id"), 0)
    if existing_entitlement_id > 0:
        return {
            "ok": True,
            "applied": False,
            "kind": "feature_subscription",
            "reason": "already_applied",
            "entitlement_id": existing_entitlement_id,
        }

    expected_type = _safe_str(exp.expected_type).lower()
    feature_code = _safe_str(meta.get("feature_code"))
    plan_code = _safe_str(meta.get("plan_code"))
    owner_user_id = _safe_int(meta.get("owner_user_id"), int(exp.user_id))
    shop_id = _safe_int(meta.get("shop_id"), 0) or None
    clan_id = _safe_int(meta.get("clan_id"), int(exp.clan_id)) or int(exp.clan_id)
    quantity_total = max(1, _safe_int(meta.get("quantity_total"), 1))
    billing_cycle = _safe_str(meta.get("billing_cycle"), "annual")
    payment_reference = _safe_str(
        meta.get("payment_reference"),
        _safe_str(exp.reference_normalized) or _safe_str(exp.reference_display),
    )

    if not feature_code:
        if expected_type == "vault_subscription":
            feature_code = "vault_slot"
        elif expected_type == "merchant_verify_subscription":
            feature_code = "merchant_verify"
        elif expected_type == "spotlight_subscription":
            feature_code = "spotlight_priority"
        elif expected_type == "community_domain_subscription":
            feature_code = "community_domain"

    if not feature_code or not plan_code:
        return {
            "ok": False,
            "applied": False,
            "kind": "feature_subscription",
            "reason": "missing_feature_meta",
        }

    vault_activation: Optional[Dict[str, Any]] = None
    if expected_type == "vault_subscription":
        event_time = (
            _to_aware(getattr(be, "posted_at", None))
            or _to_aware(getattr(be, "value_at", None))
            or _to_aware(getattr(be, "ingested_at", None))
            or _now_utc()
        )
        due_at = _to_aware(getattr(exp, "due_at", None))
        if due_at is not None and event_time > due_at:
            meta["vault_late_payment_review"] = True
            meta["last_detected_bank_event_id"] = int(be.id)
            _set_meta_json(exp, meta)
            mark_vault_order_payment_detected(
                db,
                expected_payment=exp,
                bank_event=be,
                reason="late_payment_after_instruction_expiry",
            )
            db.add(exp)
            db.commit()
            return {
                "ok": True,
                "applied": False,
                "kind": "feature_subscription",
                "reason": "late_payment_requires_admin_review",
            }

        vault_activation = activate_vault_order_from_expected_payment(
            db,
            expected_payment=exp,
            bank_event=be,
        )
        if not bool(vault_activation.get("ok")):
            db.commit()
            return {
                "ok": False,
                "applied": False,
                "kind": "feature_subscription",
                "reason": _safe_str(vault_activation.get("reason"), "vault_activation_failed"),
            }

    entitlement = grant_or_extend_entitlement(
        db,
        owner_user_id=int(owner_user_id),
        clan_id=int(clan_id) if clan_id is not None else None,
        shop_id=int(shop_id) if shop_id is not None else None,
        feature_code=feature_code,
        plan_code=plan_code,
        quantity_total=quantity_total,
        billing_cycle=billing_cycle,
        payment_reference=payment_reference,
        commit=False,
        refresh=False,
    )

    community_domain_activation: Optional[Dict[str, Any]] = None
    if expected_type == "community_domain_subscription":
        community_domain_id = _safe_int(meta.get("community_domain_id"), 0)
        if community_domain_id > 0:
            from app.db.models import CommunityDomain

            domain = db.get(CommunityDomain, int(community_domain_id))
            if domain is not None:
                previous_status = _safe_str(getattr(domain, "status", None), "draft")
                if previous_status.lower() not in {"closed", "suspended"}:
                    domain.status = "active"
                    db.add(domain)
                community_domain_activation = {
                    "community_domain_id": int(community_domain_id),
                    "previous_status": previous_status,
                    "status": _safe_str(getattr(domain, "status", None), previous_status),
                    "verification_status": _safe_str(
                        getattr(domain, "verification_status", None),
                        "unverified",
                    ),
                }

    _mark_expected_applied(
        db,
        exp=exp,
        be=be,
        application_kind="feature_subscription",
        applied_amount=_d(exp.amount),
        extra={
            "entitlement_id": int(entitlement.id),
            "feature_code": feature_code,
            "plan_code": plan_code,
            "quantity_total": quantity_total,
            "billing_cycle": billing_cycle,
            "payment_reference": payment_reference,
            "shop_id": int(shop_id) if shop_id is not None else None,
            "vault_activation": vault_activation if expected_type == "vault_subscription" else None,
            "community_domain_activation": community_domain_activation,
        },
    )

    event_type_map = {
        "vault_slot": "feature.vault_subscription.activated",
        "merchant_verify": "feature.merchant_verify_subscription.activated",
        "spotlight_priority": "feature.spotlight_subscription.activated",
        "extra_shop_block": "feature.extra_shop_blocks.activated",
        "community_member_capacity": "feature.community_member_capacity.activated",
        "rosca_cycle": "feature.rosca_cycle.activated",
        "community_meeting_pack": "feature.community_meeting_pack.activated",
        "community_domain": "feature.community_domain_subscription.activated",
    }

    log_trust_event(
        db,
        event_type=event_type_map.get(feature_code, "feature.subscription.activated"),
        clan_id=int(clan_id or exp.clan_id or 0),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(owner_user_id),
        subject_user_id=int(owner_user_id),
        meta={
            "reason": "reconciled_payment_activated_feature",
            "bank_event_id": int(be.id),
            "expected_payment_id": int(exp.id),
            "entitlement_id": int(entitlement.id),
            "feature_code": feature_code,
            "plan_code": plan_code,
            "quantity_total": quantity_total,
            "billing_cycle": billing_cycle,
            "amount": str(_d(exp.amount)),
            "currency": str(exp.currency),
            "reference": str(exp.reference_display),
            "shop_id": int(shop_id) if shop_id is not None else None,
            "vault_activation": vault_activation if expected_type == "vault_subscription" else None,
            "community_domain_activation": community_domain_activation,
            "expires_at": entitlement.expires_at.isoformat()
            if getattr(entitlement, "expires_at", None)
            else None,
        },
        commit=False,
        refresh=False,
    )

    db.add(exp)
    db.add(entitlement)
    db.commit()
    db.refresh(exp)
    db.refresh(entitlement)

    return {
        "ok": True,
        "applied": True,
        "kind": "feature_subscription",
        "feature_code": feature_code,
        "plan_code": plan_code,
        "entitlement_id": int(entitlement.id),
        "quantity_total": int(entitlement.quantity_total),
        "expires_at": entitlement.expires_at.isoformat()
        if getattr(entitlement, "expires_at", None)
        else None,
    }


def apply_expected_payment_match(
    db: Session,
    *,
    bank_event_id: int,
    expected_payment_id: int,
) -> Dict[str, Any]:
    be = db.get(BankEvent, int(bank_event_id))
    if not be:
        return {"ok": False, "applied": False, "reason": "bank_event_not_found"}

    exp = db.get(ExpectedPayment, int(expected_payment_id))
    if not exp:
        return {"ok": False, "applied": False, "reason": "expected_payment_not_found"}

    expected_type = (getattr(exp, "expected_type", "") or "").strip().lower()

    if expected_type == "contribution":
        return _apply_pool_contribution(db, be=be, exp=exp)

    if expected_type == "repayment":
        return _apply_repayment(db, be=be, exp=exp)

    if expected_type in {
        "vault_subscription",
        "merchant_verify_subscription",
        "spotlight_subscription",
        "community_package_subscription",
        "community_domain_subscription",
    }:
        return _apply_feature_subscription(db, be=be, exp=exp)

    return {
        "ok": True,
        "applied": False,
        "reason": f"unsupported_expected_type:{expected_type}",
    }
