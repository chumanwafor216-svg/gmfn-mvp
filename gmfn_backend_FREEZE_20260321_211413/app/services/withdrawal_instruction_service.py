from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict

from sqlalchemy.orm import Session

from app.db.models import Loan
from app.services.settlement_config_service import get_settlement_config


def _d(x: Any) -> Decimal:
    if isinstance(x, Decimal):
        return x.quantize(Decimal("0.01"))
    return Decimal(str(x or 0)).quantize(Decimal("0.01"))


def create_loan_withdrawal_instruction(
    db: Session,
    *,
    loan_id: int,
) -> Dict[str, Any]:
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise LookupError("Loan not found")

    status = (getattr(loan, "status", "") or "").lower()
    if status not in {"approved", "pending_disbursement", "ready_for_disbursement"}:
        raise ValueError(f"Loan status '{status}' is not ready for withdrawal instruction")

    net_disbursed = _d(getattr(loan, "net_disbursed_amount", None))
    if net_disbursed <= Decimal("0.00"):
        net_disbursed = _d(getattr(loan, "amount", None))

    reference = f"GMFN-WITHDRAW-LOAN-{int(loan.id)}-U{int(getattr(loan, 'borrower_user_id', 0) or 0)}"

    return {
        "loan_id": int(loan.id),
        "borrower_user_id": int(getattr(loan, "borrower_user_id", 0) or 0),
        "clan_id": int(getattr(loan, "clan_id", 0) or 0),
        "currency": str(getattr(loan, "currency", "NGN")),
        "gross_amount": str(_d(getattr(loan, "amount", None))),
        "net_disbursed_amount": str(net_disbursed),
        "loan_status": str(getattr(loan, "status", "")),
        "withdrawal_reference": reference,
        "settlement": get_settlement_config(),
    }