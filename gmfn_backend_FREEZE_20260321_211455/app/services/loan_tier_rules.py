from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation


@dataclass(frozen=True)
class TierResult:
    personal_pool_at_request: Decimal
    pool_used: Decimal
    guarantee_gap: Decimal
    guarantors_required: int


def D(x) -> Decimal:
    if x is None:
        return Decimal("0")
    if isinstance(x, Decimal):
        return x
    try:
        return Decimal(str(x))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def compute_guarantors_required_by_ratio(
    loan_amount: Decimal,
    personal_pool_at_request: Decimal,
    *,
    max_guarantors: int = 12,
    starter_guarantors_when_pool_zero: int = 4,
) -> int:
    """
    Chuma ratio tiers:

    A <= P -> 0 guarantors
    P == 0 -> starter default (MVP-safe): 4
    1 < A/P <= 2 -> 4 guarantors
    2 < A/P <= 3 -> 8 guarantors
    A/P > 3 -> 12 guarantors
    """
    A = D(loan_amount)
    P = D(personal_pool_at_request)

    if A <= P:
        return 0

    if P <= Decimal("0"):
        return min(max_guarantors, max(0, int(starter_guarantors_when_pool_zero)))

    if A <= (P * Decimal("2")):
        return min(max_guarantors, 4)
    if A <= (P * Decimal("3")):
        return min(max_guarantors, 8)
    return min(max_guarantors, 12)


def compute_loan_snapshot(
    loan_amount: Decimal,
    personal_pool_at_request: Decimal,
    *,
    max_guarantors: int = 12,
    starter_guarantors_when_pool_zero: int = 4,
) -> TierResult:
    """
    Snapshot fields stored on Loan:
      - personal_pool_at_request
      - pool_used = min(A, P)
      - guarantee_gap = max(0, A - P)
      - guarantors_required from ratio tiers (forced to 0 if no gap)
    """
    A = D(loan_amount)
    P = D(personal_pool_at_request)

    pool_used = min(A, P) if P > 0 else Decimal("0")
    gap = A - P
    if gap < 0:
        gap = Decimal("0")

    req = compute_guarantors_required_by_ratio(
        A,
        P,
        max_guarantors=max_guarantors,
        starter_guarantors_when_pool_zero=starter_guarantors_when_pool_zero,
    )

    if gap <= 0:
        req = 0

    return TierResult(
        personal_pool_at_request=P,
        pool_used=pool_used,
        guarantee_gap=gap,
        guarantors_required=int(req),
    )