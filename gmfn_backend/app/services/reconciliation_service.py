from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.bank_models import BankCredit, BankEvent, ExpectedPayment


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_decimal(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _q2(x: Any) -> Decimal:
    return _safe_decimal(x).quantize(Decimal("0.01"))


def normalize_reference(s: Optional[str]) -> Optional[str]:
    """
    Normalize reference so it matches across banks/countries:
    - strip
    - upper
    - collapse whitespace
    - keep only A-Z0-9 and hyphen
    """
    if not s:
        return None
    t = s.strip().upper()
    t = re.sub(r"\s+", " ", t)
    t = t.replace(" ", "-")
    t = re.sub(r"[^A-Z0-9\-]", "", t)
    t = re.sub(r"\-+", "-", t).strip("-")
    return t or None


def is_canonical_source(source_type: str) -> bool:
    return (source_type or "").lower() in {"statement_csv", "webhook_api"}


def compute_match_key(
    *,
    clan_id: int,
    direction: str,
    amount: Decimal,
    currency: str,
    reference_normalized: Optional[str],
) -> str:
    a = _q2(amount)
    ref = reference_normalized or ""
    return f"{int(clan_id)}|{(direction or '').lower()}|{currency.upper()}|{str(a)}|{ref}"


def compute_hash(fields: Dict[str, Any]) -> str:
    """
    Stable hash for dedupe, using only deterministic fields.
    """
    clean: Dict[str, Any] = {}
    for k in sorted(fields.keys()):
        v = fields[k]
        if isinstance(v, Decimal):
            clean[k] = str(_q2(v))
        elif isinstance(v, datetime):
            clean[k] = v.isoformat()
        else:
            clean[k] = v
    blob = json.dumps(clean, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def create_bank_event(
    db: Session,
    *,
    clan_id: int,
    source_type: str,
    source_id: Optional[str],
    direction: str,
    amount: Any,
    currency: str,
    reference_raw: Optional[str],
    description_raw: Optional[str],
    bank_txn_id: Optional[str] = None,
    posted_at: Optional[datetime] = None,
    value_at: Optional[datetime] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> BankEvent:
    """
    Insert-or-return (by hash unique key) to avoid duplicates.
    Deterministic: hash ignores ingested_at.
    """
    amt = _q2(amount)
    ref_norm = normalize_reference(reference_raw)

    match_key = compute_match_key(
        clan_id=clan_id,
        direction=direction,
        amount=amt,
        currency=currency,
        reference_normalized=ref_norm,
    )

    h = compute_hash(
        {
            "clan_id": int(clan_id),
            "source_type": (source_type or "").lower(),
            "source_id": source_id or "",
            "bank_txn_id": bank_txn_id or "",
            "direction": (direction or "").lower(),
            "amount": amt,
            "currency": (currency or "").upper(),
            "reference_normalized": ref_norm or "",
            "description_raw": (description_raw or "")[:2000],
            "posted_at": posted_at,
            "value_at": value_at,
        }
    )

    row = BankEvent(
        clan_id=int(clan_id),
        source_type=(source_type or "").lower(),
        source_id=source_id,
        ingested_at=_now_utc(),
        bank_txn_id=bank_txn_id,
        posted_at=posted_at,
        value_at=value_at,
        direction=(direction or "").lower(),
        amount=amt,
        currency=(currency or "").upper(),
        reference_raw=reference_raw,
        reference_normalized=ref_norm,
        description_raw=description_raw,
        match_key=match_key,
        status="detected",
        status_reason=None,
        confidence=0,
        canonical=is_canonical_source(source_type),
        expected_payment_id=None,
        meta_json=json.dumps(meta) if meta else None,
        hash=h,
    )

    db.add(row)
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        existing = db.query(BankEvent).filter(BankEvent.hash == h).first()
        if existing:
            return existing
        raise


def _find_expected_candidates(
    db: Session,
    *,
    clan_id: int,
    reference_normalized: Optional[str],
    currency: str,
) -> List[ExpectedPayment]:
    if not reference_normalized:
        return []
    return (
        db.query(ExpectedPayment)
        .filter(ExpectedPayment.clan_id == int(clan_id))
        .filter(ExpectedPayment.reference_normalized == reference_normalized)
        .filter(ExpectedPayment.currency == (currency or "").upper())
        .order_by(ExpectedPayment.id.asc())
        .all()
    )


def _select_expected_deterministically(
    *,
    candidates: List[ExpectedPayment],
    incoming_amount: Decimal,
) -> Tuple[Optional[ExpectedPayment], str]:
    """
    Deterministic selection rules:
    - If 0 candidates -> None, reason
    - If >1 candidates:
        - If exactly one candidate has amount == incoming -> choose it
        - Else -> None + "ambiguous_reference" (NEVER guess first row)
    - If 1 candidate -> choose it
    """
    if not candidates:
        return None, "no_expected_match"

    amt = _q2(incoming_amount)

    if len(candidates) == 1:
        return candidates[0], "matched_by_reference"

    exact = [c for c in candidates if _q2(c.amount) == amt]
    if len(exact) == 1:
        return exact[0], "matched_by_reference_exact_amount"

    return None, "ambiguous_reference"


def _already_confirmed_expected(expected: ExpectedPayment) -> bool:
    return (expected.status or "").lower() == "confirmed"


def _canonical_already_linked(be: BankEvent) -> bool:
    return bool(be.expected_payment_id) and (be.status or "").lower() in {"confirmed", "partial"}


def _ensure_expected_remaining_initialized(exp: ExpectedPayment) -> None:
    """
    Migration adds remaining_amount, but existing rows may have 0 until migration runs.
    Ensure deterministic behavior for pre-migration data:
    - If remaining_amount <= 0 and status not confirmed/cancelled -> set remaining=amount-paid
    """
    amt = _q2(exp.amount)
    paid = _q2(getattr(exp, "paid_amount", Decimal("0.00")))

    rem = _q2(getattr(exp, "remaining_amount", Decimal("0.00")))
    status = (exp.status or "").lower()

    if status in {"confirmed", "cancelled"}:
        return

    calc = amt - paid
    if calc < Decimal("0"):
        calc = Decimal("0")

    if rem <= Decimal("0"):
        exp.remaining_amount = calc


def _create_credit(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    currency: str,
    amount: Decimal,
    source_bank_event_id: int,
    dry_run: bool,
) -> Optional[BankCredit]:
    amt = _q2(amount)
    if amt <= Decimal("0"):
        return None

    row = BankCredit(
        clan_id=int(clan_id),
        user_id=int(user_id),
        currency=(currency or "").upper(),
        amount=amt,
        source_bank_event_id=int(source_bank_event_id),
        created_at=_now_utc(),
        meta_json=None,
    )

    db.add(row)
    if not dry_run:
        try:
            db.commit()
            db.refresh(row)
        except IntegrityError:
            db.rollback()
            existing = (
                db.query(BankCredit)
                .filter(BankCredit.source_bank_event_id == int(source_bank_event_id))
                .first()
            )
            return existing
    return row


def apply_available_credits_to_expected(
    db: Session,
    *,
    exp: ExpectedPayment,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Deterministically applies credits (oldest-first) to reduce exp.remaining_amount.
    This is safe to call from any expected-payment creation flow later.
    It does NOT require human intervention.
    """
    _ensure_expected_remaining_initialized(exp)

    if _q2(exp.remaining_amount) <= Decimal("0"):
        return {"applied": "0.00", "used_credits": 0}

    credits = (
        db.query(BankCredit)
        .filter(BankCredit.clan_id == int(exp.clan_id))
        .filter(BankCredit.user_id == int(exp.user_id))
        .filter(BankCredit.currency == (exp.currency or "").upper())
        .order_by(BankCredit.id.asc())
        .all()
    )

    remaining = _q2(exp.remaining_amount)
    applied_total = Decimal("0.00")
    used = 0

    for c in credits:
        if remaining <= Decimal("0"):
            break
        c_amt = _q2(c.amount)
        if c_amt <= Decimal("0"):
            continue

        use = min(c_amt, remaining)
        use = _q2(use)

        exp.paid_amount = _q2(exp.paid_amount) + use
        remaining = _q2(remaining - use)
        exp.remaining_amount = remaining

        applied_total = _q2(applied_total + use)
        used += 1

        new_c = _q2(c_amt - use)
        if new_c <= Decimal("0"):
            db.delete(c)
        else:
            c.amount = new_c
        if not dry_run:
            db.add(c)

    if remaining == Decimal("0"):
        exp.status = "confirmed"
        exp.status_reason = "covered_by_credit"
    else:
        if applied_total > Decimal("0"):
            exp.status = "partial"
            exp.status_reason = "partially_covered_by_credit"

    if not dry_run:
        db.add(exp)
        db.commit()
        db.refresh(exp)

    return {"applied": str(applied_total), "used_credits": used}


def _maybe_apply_match(
    db: Session,
    *,
    be: BankEvent,
    exp: Optional[ExpectedPayment],
    dry_run: bool,
) -> None:
    """
    Apply matched/confirmed payment into downstream ledgers.

    This is intentionally best-effort:
    - reconciliation truth is committed first
    - downstream application runs second
    - exceptions here should not roll back reconciliation
    """
    if dry_run:
        return
    if not exp:
        return

    status = (be.status or "").lower()
    if status not in {"confirmed", "partial"}:
        return

    try:
        from app.services.bank_application_service import apply_expected_payment_match

        apply_expected_payment_match(
            db,
            bank_event_id=int(be.id),
            expected_payment_id=int(exp.id),
        )
    except Exception as exc:
        current_reason = (be.status_reason or "").strip()
        extra = f"application_error:{str(exc)[:80]}"
        be.status_reason = f"{current_reason}|{extra}".strip("|")
        db.add(be)
        db.commit()
        db.refresh(be)


def reconcile_one_event(
    db: Session,
    *,
    be: BankEvent,
    confirm_non_canonical: bool = True,
    canonical_only_match: bool = False,
    dry_run: bool = False,
) -> BankEvent:
    """
    Deterministic reconciliation:

    Match:
    - candidates = clan_id + reference_normalized + currency
    - if ambiguous -> mismatch_flagged (never guess)
    - if none -> pending_match

    Apply:
    - partial payment supported via ExpectedPayment.paid_amount/remaining_amount
    - overpay stored as BankCredit
    """
    if _canonical_already_linked(be):
        return be

    if canonical_only_match and not bool(getattr(be, "canonical", False)):
        be.status = "pending_match"
        be.status_reason = "non_canonical_skipped"
        be.confidence = 0
        if not dry_run:
            db.add(be)
            db.commit()
            db.refresh(be)
        return be

    if (be.direction or "").lower() != "credit":
        be.status = "mismatch_flagged"
        be.status_reason = "non_credit_event_skipped"
        be.confidence = 0
        if not dry_run:
            db.add(be)
            db.commit()
            db.refresh(be)
        return be

    candidates = _find_expected_candidates(
        db,
        clan_id=int(be.clan_id),
        reference_normalized=be.reference_normalized,
        currency=be.currency,
    )

    exp, reason = _select_expected_deterministically(
        candidates=candidates,
        incoming_amount=be.amount,
    )

    if not exp:
        be.status = "mismatch_flagged" if reason == "ambiguous_reference" else "pending_match"
        be.status_reason = reason
        be.confidence = 0 if reason != "ambiguous_reference" else 1
        if not dry_run:
            db.add(be)
            db.commit()
            db.refresh(be)
        return be

    _ensure_expected_remaining_initialized(exp)

    if _already_confirmed_expected(exp) and exp.bank_event_id and int(exp.bank_event_id) != int(be.id):
        be.status = "duplicate"
        be.status_reason = "expected_already_confirmed_elsewhere"
        be.confidence = 10 if be.canonical else 5
        if not dry_run:
            db.add(be)
            db.commit()
            db.refresh(be)
        return be

    should_confirm = bool(be.canonical) or bool(confirm_non_canonical)

    incoming = _q2(be.amount)
    remaining = _q2(exp.remaining_amount)
    apply_amt = min(incoming, remaining)
    apply_amt = _q2(apply_amt)

    exp.paid_amount = _q2(exp.paid_amount) + apply_amt
    exp.remaining_amount = _q2(remaining - apply_amt)

    if exp.remaining_amount == Decimal("0.00"):
        exp.status = "confirmed" if should_confirm else (exp.status or "expected")
        exp.status_reason = reason if should_confirm else "matched_unconfirmed"
        be.status = "confirmed" if should_confirm else "matched_unconfirmed"
        be.status_reason = "matched_expected"
        be.confidence = 10 if be.canonical else (7 if should_confirm else 5)
    else:
        exp.status = "partial"
        exp.status_reason = "partial_payment_applied"
        be.status = "partial"
        be.status_reason = "partial_payment_applied"
        be.confidence = 9 if be.canonical else 6

    exp.bank_event_id = be.id
    be.expected_payment_id = exp.id

    excess = _q2(incoming - apply_amt)
    if excess > Decimal("0.00"):
        _create_credit(
            db,
            clan_id=int(exp.clan_id),
            user_id=int(exp.user_id),
            currency=exp.currency,
            amount=excess,
            source_bank_event_id=int(be.id),
            dry_run=dry_run,
        )

    if not dry_run:
        db.add(exp)
        db.add(be)
        db.commit()
        db.refresh(be)
        db.refresh(exp)
        _maybe_apply_match(db, be=be, exp=exp, dry_run=dry_run)

    return be


def reconcile_batch(
    db: Session,
    *,
    clan_id: int,
    limit: int = 200,
    confirm_non_canonical: bool = True,
    canonical_only_match: bool = False,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Reconcile newest events first for a clan.
    Returns stats. Deterministic iteration order.
    """
    lim = int(limit or 200)
    lim = max(1, min(lim, 2000))

    rows = (
        db.query(BankEvent)
        .filter(BankEvent.clan_id == int(clan_id))
        .order_by(BankEvent.id.desc())
        .limit(lim)
        .all()
    )

    stats: Dict[str, Any] = {
        "clan_id": int(clan_id),
        "limit": lim,
        "seen": 0,
        "confirmed": 0,
        "partial": 0,
        "matched_unconfirmed": 0,
        "pending_match": 0,
        "mismatch_flagged": 0,
        "duplicate": 0,
        "other": 0,
        "last_event_id": None,
        "dry_run": bool(dry_run),
        "confirm_non_canonical": bool(confirm_non_canonical),
        "canonical_only_match": bool(canonical_only_match),
    }

    for r in rows:
        stats["seen"] += 1
        if stats["last_event_id"] is None:
            stats["last_event_id"] = r.id

        out = reconcile_one_event(
            db,
            be=r,
            confirm_non_canonical=confirm_non_canonical,
            canonical_only_match=canonical_only_match,
            dry_run=dry_run,
        )

        s = (out.status or "").lower()
        if s == "confirmed":
            stats["confirmed"] += 1
        elif s == "partial":
            stats["partial"] += 1
        elif s == "matched_unconfirmed":
            stats["matched_unconfirmed"] += 1
        elif s == "pending_match":
            stats["pending_match"] += 1
        elif s == "mismatch_flagged":
            stats["mismatch_flagged"] += 1
        elif s == "duplicate":
            stats["duplicate"] += 1
        else:
            stats["other"] += 1

    return stats