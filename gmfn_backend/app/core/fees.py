from decimal import Decimal

# ---- CONFIG (easy to tune later) ----
MIN_SERVICE_FEE = Decimal("0.02")   # 2%
MAX_SERVICE_FEE = Decimal("0.05")   # 5%
GUARANTOR_SHARE = Decimal("0.20")   # 20% of service fee


def calculate_service_fee(amount: Decimal) -> Decimal:
    """
    Progressive fee:
    - small loans → 2%
    - medium loans → 3%
    - larger loans → 5%
    """
    if amount <= Decimal("50000"):
        return amount * MIN_SERVICE_FEE
    elif amount <= Decimal("200000"):
        return amount * Decimal("0.03")
    else:
        return amount * MAX_SERVICE_FEE


def split_fee(service_fee: Decimal) -> dict:
    guarantor_pool = service_fee * GUARANTOR_SHARE
    platform_revenue = service_fee - guarantor_pool

    return {
        "guarantor_pool": guarantor_pool,
        "platform_revenue": platform_revenue,
    }
