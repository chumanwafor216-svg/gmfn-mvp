from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/pilot-readiness", tags=["pilot-readiness"])


@router.get("")
def pilot_readiness():
    checks = [
        {"key": "auth", "label": "Authentication", "status": "ready"},
        {"key": "clans", "label": "Clan selection and membership", "status": "ready"},
        {"key": "loans", "label": "Loan engine", "status": "ready"},
        {"key": "repayments", "label": "Repayments", "status": "ready"},
        {"key": "pool", "label": "Pool ledger", "status": "ready"},
        {"key": "banking", "label": "Deterministic bank reconciliation", "status": "ready"},
        {"key": "payment_instructions", "label": "Payment instructions", "status": "ready"},
        {"key": "withdrawal_instructions", "label": "Withdrawal instructions", "status": "ready"},
        {"key": "trust", "label": "Trust event audit trail", "status": "ready"},
        {"key": "trustslip", "label": "TrustSlip presentation", "status": "partial"},
        {"key": "frontend", "label": "Frontend route consistency", "status": "partial"},
        {"key": "evidence", "label": "Evidence capture pack", "status": "partial"},
    ]

    ready = sum(1 for x in checks if x["status"] == "ready")
    partial = sum(1 for x in checks if x["status"] == "partial")
    blocked = sum(1 for x in checks if x["status"] == "blocked")

    return {
        "overall_status": "pilot_near_ready" if blocked == 0 else "not_ready",
        "ready_count": ready,
        "partial_count": partial,
        "blocked_count": blocked,
        "checks": checks,
    }