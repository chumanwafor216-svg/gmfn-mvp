from __future__ import annotations

import os


PAYMENT_OPERATIONS_ENV = "GSN_PAYMENT_OPERATIONS_ENABLED"
PAYMENT_SUSPENDED_MESSAGE = (
    "GSN payment operations are suspended for the free pilot. No new payment "
    "instruction, purchased-credit award, paid-service deduction, or automatic "
    "renewal can be created. Existing genuine obligations and history remain visible."
)


class PaymentOperationsSuspended(RuntimeError):
    pass


def payment_operations_enabled() -> bool:
    return str(os.getenv(PAYMENT_OPERATIONS_ENV, "0") or "0").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def require_payment_operations_enabled() -> None:
    if not payment_operations_enabled():
        raise PaymentOperationsSuspended(PAYMENT_SUSPENDED_MESSAGE)
