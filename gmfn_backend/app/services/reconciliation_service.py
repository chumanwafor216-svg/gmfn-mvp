# app/services/reconciliation_service.py
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.bank_models import BankEvent, ExpectedPayment


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_decimal(x: Any) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


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
    # canonical sources are those we trust as “final” truth
    return (source_type or "").lower() in {"statement_csv", "webhook_api"}


def compute_match_key(
    *,
    clan_id: int,
    direction: str,
    amount: Decimal,
    currency: str,
    reference_normalized: Optional[str],
) -> str:
    """
    Match key is stable and deterministic.
    We intentionally include direction and currency and 2dp amount.
    """
    a = _safe_decimal(amount).quantize(Decimal("0.01"))
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
            clean[k] = str(v)
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
    amt = _safe_decimal(amount).quantize(Decimal("0.01"))
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


def _find_expected_by_reference(
    db: Session,
    *,
    clan_id: int,
    reference_normalized: Optional[str],
    amount: Decimal,
    currency: str,
) -> Optional[ExpectedPayment]:
    if not reference_normalized:
        return None

    q = (
        db.query(ExpectedPayment)
        .filter(ExpectedPayment.clan_id == int(clan_id))
        .filter(ExpectedPayment.reference_normalized == reference_normalized)
        .filter(ExpectedPayment.currency == (currency or "").upper())
        .order_by(ExpectedPayment.id.asc())
    )

    candidates = q.all()
    if not candidates:
        return None

    amt = _safe_decimal(amount).quantize(Decimal("0.01"))
    for c in candidates:
        if _safe_decimal(c.amount).quantize(Decimal("0.01")) == amt:
            return c

    return candidates[0]


def _already_confirmed_expected(expected: ExpectedPayment) -> bool:
    return (expected.status or "").lower() == "confirmed"


def _canonical_already_linked(be: BankEvent) -> bool:
    return bool(be.expected_payment_id) and (be.status or "").lower() == "confirmed"


def reconcile_one_event(
    db: Session,
    *,
    be: BankEvent,
    confirm_non_canonical: bool = True,
    canonical_only_match: bool = False,
    dry_run: bool = False,
) -> BankEvent:
    """
    Phase 2 hardened reconcile (still deterministic):

    Match rule (still Phase 1 strict):
    - Match by reference_normalized + currency (+ amount preference)

    Options:
    - confirm_non_canonical (default True): preserve current behavior.
      If False, non-canonical events become matched_unconfirmed instead of confirmed.
    - canonical_only_match (default False): if True, only canonical BankEvents are eligible to match.
    - dry_run (default False): no commits, returns a mutated in-memory object (caller should discard session).
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

    ref_norm = be.reference_normalized
    exp = _find_expected_by_reference(
        db,
        clan_id=be.clan_id,
        reference_normalized=ref_norm,
        amount=be.amount,
        currency=be.currency,
    )

    if not exp:
        be.status = "pending_match"
        be.status_reason = "no_expected_match"
        be.confidence = 0
        if not dry_run:
            db.add(be)
            db.commit()
            db.refresh(be)
        return be

    # If expected is already confirmed with another bank_event, treat as duplicate / conflict
    if _already_confirmed_expected(exp) and exp.bank_event_id and exp.bank_event_id != be.id:
        be.status = "duplicate"
        be.status_reason = "expected_already_confirmed_elsewhere"
        be.confidence = 10 if be.canonical else 5
        if not dry_run:
            db.add(be)
            db.commit()
            db.refresh(be)
        return be

    # Linkage decision
    should_confirm = bool(be.canonical) or bool(confirm_non_canonical)

    if should_confirm:
        exp.status = "confirmed"
        exp.status_reason = "matched_by_reference"
        exp.bank_event_id = be.id

        be.expected_payment_id = exp.id
        be.status = "confirmed"
        be.status_reason = "matched_expected"
        be.confidence = 10 if be.canonical else 7
    else:
        # Keep deterministic linkage without “final confirmation”
        exp.status = exp.status or "expected"
        exp.status_reason = exp.status_reason or "matched_unconfirmed"
        exp.bank_event_id = be.id

        be.expected_payment_id = exp.id
        be.status = "matched_unconfirmed"
        be.status_reason = "matched_expected_non_canonical"
        be.confidence = 5

    if not dry_run:
        db.add(exp)
        db.add(be)
        db.commit()
        db.refresh(be)

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

    Options:
    - confirm_non_canonical: see reconcile_one_event
    - canonical_only_match: see reconcile_one_event
    - dry_run: no commits (preview); caller should rollback/discard session
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
        "matched_unconfirmed": 0,
        "pending_match": 0,
        "duplicate": 0,
        "other": 0,
        "last_event_id": None,
        "dry_run": bool(dry_run),
        "confirm_non_canonical": bool(confirm_non_canonical),
        "canonical_only_match": bool(canonical_only_match),
    }

    for r in rows:
        stats["seen"] += 1
        stats["last_event_id"] = r.id if stats["last_event_id"] is None else stats["last_event_id"]

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
        elif s == "matched_unconfirmed":
            stats["matched_unconfirmed"] += 1
        elif s == "pending_match":
            stats["pending_match"] += 1
        elif s == "duplicate":
            stats["duplicate"] += 1
        else:
            stats["other"] += 1

    return stats