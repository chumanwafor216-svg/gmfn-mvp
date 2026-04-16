from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import LoanGuarantor


TWOPLACES = Decimal("0.01")

POOL_ONLY_SERVICE_FEE_RATE = Decimal("0.02")
GUARANTOR_BACKED_SERVICE_FEE_RATE = Decimal("0.05")

# For guarantor-backed loans only:
# platform keeps 20% of the fee, guarantor reward pool gets 80%.
PLATFORM_SHARE_OF_GUARANTOR_BACKED_FEE = Decimal("0.20")


def _q2(x: Decimal) -> Decimal:
    return x.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def calc_service_fee_rate(*, guarantors_required: int) -> Decimal:
    """
    Default MVP rule:
    - Pool-only / no guarantors: 2%
    - Guarantor-backed: 5%
    """
    return (
        POOL_ONLY_SERVICE_FEE_RATE
        if (guarantors_required or 0) == 0
        else GUARANTOR_BACKED_SERVICE_FEE_RATE
    )


def calc_platform_revenue(*, service_fee: Decimal) -> Decimal:
    """
    For guarantor-backed loans, the platform keeps 20% of the service fee.
    The remaining 80% becomes the guarantor reward pool.
    """
    return _q2(service_fee * PLATFORM_SHARE_OF_GUARANTOR_BACKED_FEE)


def calc_guarantor_pool(db: Session, *, loan_id: int) -> Decimal:
    """
    Sum of pledge_amounts for this loan.

    Important:
    This is the nominal pledged support total for the loan.
    It is NOT the same thing as the fee-funded guarantor reward pool
    written during approval.
    """
    total = (
        db.query(func.coalesce(func.sum(LoanGuarantor.pledge_amount), 0))
        .filter(LoanGuarantor.loan_id == loan_id)
        .scalar()
    )
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
      service_fee,
      net_disbursed,
      guarantor_pool,   # fee reward pool; 0.00 if no guarantors
      platform_revenue

    Business rule:
    - If no guarantors are required, there is no guarantor reward pool.
      The full service fee belongs to platform revenue.
    - If guarantors are required, 80% of the fee becomes guarantor reward pool
      and 20% becomes platform revenue.
    """
    _ = db, loan_id  # kept for interface stability and future use

    amount = Decimal(str(amount or 0))
    if amount <= Decimal("0.00"):
      raise ValueError("amount must be > 0")

    rate = calc_service_fee_rate(guarantors_required=guarantors_required)
    service_fee = _q2(amount * rate)
    net_disbursed = _q2(amount - service_fee)

    if (guarantors_required or 0) > 0:
        platform_revenue = calc_platform_revenue(service_fee=service_fee)
        guarantor_pool = _q2(service_fee - platform_revenue)
    else:
        guarantor_pool = Decimal("0.00")
        platform_revenue = service_fee

    return (
        service_fee,
        net_disbursed,
        _q2(guarantor_pool),
        _q2(platform_revenue),
    )