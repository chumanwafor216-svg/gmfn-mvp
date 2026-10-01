from __future__ import annotations

import json
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.bank_models import ExpectedPayment
import app.db.models as db_models

Loan = getattr(db_models, "Loan", None)
LoanGuarantor = getattr(db_models, "LoanGuarantor", None)


COMPLETED_EXPECTED_PAYMENT_STATUSES = {"confirmed", "paid", "completed", "settled"}
COMPLETED_LOAN_STATUSES = {"repaid", "completed", "closed"}
ROSCA_SOURCE = "rosca.cycle"


def _safe_decimal(value: Any, default: str = "0") -> Decimal:
    try:
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _safe_meta(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _expected_payment_completed(row: ExpectedPayment) -> bool:
    status = str(getattr(row, "status", "") or "").lower()
    if status in COMPLETED_EXPECTED_PAYMENT_STATUSES:
        return True

    amount = _safe_decimal(getattr(row, "amount", None), "0")
    paid = _safe_decimal(getattr(row, "paid_amount", None), "0")
    remaining = _safe_decimal(getattr(row, "remaining_amount", None), "0")
    return amount > Decimal("0") and paid >= amount and remaining <= Decimal("0")


def build_financial_obligation_evidence(
    db: Session,
    *,
    user_id: int,
    clan_id: int | None = None,
) -> Dict[str, Any]:
    """Purpose-relevant financial evidence from existing obligation records.

    This helper intentionally counts positive comparable fulfilment only. The
    current data model does not reliably distinguish unresolved, resolved,
    reversed, disputed, and stale adverse signals across all sources, so adverse
    evidence is left neutral here instead of being converted into a penalty.
    """

    expected_q = db.query(ExpectedPayment).filter(ExpectedPayment.user_id == int(user_id))
    if clan_id is not None:
        expected_q = expected_q.filter(ExpectedPayment.clan_id == int(clan_id))

    completed_expected = 0
    completed_rosca = 0
    completed_recurring = 0
    for row in expected_q.limit(1000).all():
        if not _expected_payment_completed(row):
            continue
        completed_expected += 1
        meta = _safe_meta(getattr(row, "meta_json", None))
        expected_type = str(getattr(row, "expected_type", "") or "").lower()
        if expected_type == "contribution" and meta.get("source") == ROSCA_SOURCE:
            completed_rosca += 1
        if expected_type in {"contribution", "repayment"}:
            completed_recurring += 1

    completed_repayment_obligations = 0
    if Loan is not None:
        loan_q = db.query(Loan).filter(Loan.borrower_user_id == int(user_id))
        if clan_id is not None:
            loan_q = loan_q.filter(Loan.clan_id == int(clan_id))
        for row in loan_q.limit(500).all():
            status = str(getattr(row, "status", "") or "").lower()
            remaining = _safe_decimal(getattr(row, "remaining_amount", None), "0")
            paid_total = _safe_decimal(getattr(row, "paid_total", None), "0")
            if (
                status in COMPLETED_LOAN_STATUSES
                or getattr(row, "repaid_at", None) is not None
                or (paid_total > Decimal("0") and remaining <= Decimal("0"))
            ):
                completed_repayment_obligations += 1

    support_follow_through = 0
    support_commitments = 0
    if LoanGuarantor is not None:
        guarantor_q = db.query(LoanGuarantor).filter(
            LoanGuarantor.guarantor_user_id == int(user_id)
        )
        if clan_id is not None:
            guarantor_q = guarantor_q.filter(LoanGuarantor.clan_id == int(clan_id))
        for row in guarantor_q.limit(500).all():
            status = str(getattr(row, "status", "") or "").lower()
            locked = _safe_decimal(getattr(row, "locked_amount", None), "0")
            released = _safe_decimal(getattr(row, "released_amount", None), "0")
            if status in {"approved", "locked"} or locked > Decimal("0"):
                support_commitments += 1
            if status in {"released", "completed"} or released > Decimal("0"):
                support_follow_through += 1

    positive_signal_count = (
        completed_expected
        + completed_repayment_obligations
        + support_follow_through
    )
    if positive_signal_count <= 0:
        evidence_state = "not_enough_relevant_evidence"
    elif positive_signal_count <= 2:
        evidence_state = "limited_relevant_evidence"
    else:
        evidence_state = "relevant_evidence_available"

    return {
        "user_id": int(user_id),
        "completed_rosca_contributions": completed_rosca,
        "completed_expected_payments": completed_expected,
        "completed_recurring_obligations": completed_recurring,
        "completed_repayment_obligations": completed_repayment_obligations,
        "support_follow_through_count": support_follow_through,
        "support_commitment_count": support_commitments,
        "positive_signal_count": positive_signal_count,
        "evidence_state": evidence_state,
        "adverse_evidence_used": False,
        "adverse_evidence_policy": (
            "Ambiguous default, delay, reversal, dispute, and stale signals are "
            "not used here until unresolved adverse-state integrity is explicit."
        ),
        "willingness_state": "unknown_until_explicit_response",
    }


def obligation_evidence_sort_tuple(evidence: Dict[str, Any]) -> tuple[int, int, int, int, int]:
    return (
        int(evidence.get("completed_rosca_contributions") or 0),
        int(evidence.get("completed_recurring_obligations") or 0),
        int(evidence.get("completed_repayment_obligations") or 0),
        int(evidence.get("support_follow_through_count") or 0),
        int(evidence.get("positive_signal_count") or 0),
    )
