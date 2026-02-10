# app/services/fees.py
from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import LoanGuarantor


TWOPLACES = Decimal("0.01")


def _q2(x: Decimal) -> Decimal:
    return x.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def calc_service_fee_rate(*, guarantors_required: int) -> Decimal:
    """
    Simple real-world-ish default:
    - Pool-only / no guarantors: 2%
    - Guarantor-backed: 5%
    """
    return Decimal("0.02") if (guarantors_required or 0) == 0 else Decimal("0.05")


def calc_platform_revenue(*, service_fee: Decimal) -> Decimal:
    """
    Commission sharing: 20% of guarantor earnings.
    We model guarantor earnings as coming from the service_fee pool.
    """
    guarantor_commission = _q2(service_fee * Decimal("0.20"))
    return _q2(service_fee - guarantor_commission)


def calc_guarantor_pool(db: Session, *, loan_id: int) -> Decimal:
    """
    Sum of pledge_amounts for this loan.
    """
    total = (
        db.query(func.coalesce(func.sum(LoanGuarantor.pledge_amount), 0))
        .filter(LoanGuarantor.loan_id == loan_id)
        .scalar()
    )
    # SQLAlchemy may return Decimal or int/float depending on DB
    return _q2(Decimal(str(total or 0)))


def calc_loan_financials(
    db: Session,
    *,
    loan_id: int,
    amount: Decimal,
    guarantors_required: int,
) -> Tuple[Decimal, Decimal, Decimal, Decimal]:
    """
    Returns:
      service_fee, net_disbursed_amount, guarantor_pool, platform_revenue
    """
    rate = calc_service_fee_rate(guarantors_required=guarantors_required)
    service_fee = _q2(amount * rate)
    net_disbursed = _q2(amount - service_fee)
    guarantor_pool = calc_guarantor_pool(db, loan_id=loan_id)
    platform_revenue = calc_platform_revenue(service_fee=service_fee)
    return service_fee, net_disbursed, guarantor_pool, platform_revenue
