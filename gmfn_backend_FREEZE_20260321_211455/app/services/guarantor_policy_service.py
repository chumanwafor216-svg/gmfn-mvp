# app/services/guarantor_policy_service.py
from __future__ import annotations

from decimal import Decimal, ROUND_CEILING
from typing import Tuple


BASE_PERCENT = Decimal("0.25")        # 25%
MAX_MULTIPLIER = Decimal("3")         # pilot cap
MIN_GUARANTORS = 0                    # if within pool, can be 0 (policy)
MIN_POOL = Decimal("0.01")            # guardrail


def _d(x) -> Decimal:
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def _ceil_decimal(x: Decimal) -> int:
    # ceiling to integer
    return int(x.to_integral_value(rounding=ROUND_CEILING))


def compute_multiplier(*, loan_amount: Decimal, pool_amount: Decimal) -> int:
    """
    multiplier = ceil(loan_amount / pool_amount), capped at MAX_MULTIPLIER.
    """
    L = _d(loan_amount)
    P = _d(pool_amount)
    if P < MIN_POOL:
        # If pool is effectively zero, multiplier is max (forces social pressure or denial upstream)
        return int(MAX_MULTIPLIER)

    raw = (L / P)
    m = _ceil_decimal(raw)
    if m < 1:
        m = 1
    if Decimal(m) > MAX_MULTIPLIER:
        m = int(MAX_MULTIPLIER)
    return m


def required_guarantors(
    *,
    member_count: int,
    loan_amount: Decimal,
    pool_amount: Decimal,
) -> Tuple[int, int, Decimal]:
    """
    Returns:
      required_count, multiplier, required_percent

    Required count = ceil(member_count * BASE_PERCENT * multiplier)

    NOTE:
    - This is the SOCIAL PRESSURE requirement.
    - Coverage requirement is separate: sum_locked >= guarantee_gap.
    """
    n = max(0, int(member_count))
    if n == 0:
        return 0, 1, Decimal("0.00")

    m = compute_multiplier(loan_amount=_d(loan_amount), pool_amount=_d(pool_amount))
    req_percent = BASE_PERCENT * Decimal(m)

    # cannot require more than member_count
    req_count = _ceil_decimal(Decimal(n) * req_percent)
    if req_count > n:
        req_count = n

    return req_count, m, req_percent


def approval_ok(
    *,
    approved_guarantors: int,
    required_guarantors_count: int,
    locked_sum: Decimal,
    guarantee_gap: Decimal,
) -> bool:
    """
    Final approval gate:
      approved_count >= required_guarantors_count
      AND locked_sum >= guarantee_gap
    """
    return (int(approved_guarantors) >= int(required_guarantors_count)) and (_d(locked_sum) >= _d(guarantee_gap))