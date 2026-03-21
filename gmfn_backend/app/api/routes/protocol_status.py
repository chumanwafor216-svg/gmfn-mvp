from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/protocol-status", tags=["protocol-status"])


@router.get("")
def protocol_status():
    return {
        "protocol": "GMFN",
        "stage": "late_stabilization",
        "summary": {
            "auth": "complete",
            "clans": "complete",
            "invites": "complete",
            "loan_engine": "complete",
            "guarantor_flow": "partial",
            "repayments": "complete",
            "trust_events": "complete",
            "trustslip": "partial",
            "pool_ledger": "complete",
            "bank_reconciliation": "complete",
            "payment_instructions": "complete",
            "withdrawal_instructions": "complete",
            "revenue_allocation": "complete",
            "frontend_wiring": "partial",
            "evidence_pack": "partial",
            "pilot_readiness": "partial",
        },
        "next_priority": [
            "frontend integrity sweep",
            "repayment deterministic loop verification",
            "trust event dedupe audit",
            "evidence screenshot capture",
        ],
    }