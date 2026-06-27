from __future__ import annotations

from fastapi import APIRouter

from app.api.routes.pilot_readiness import pilot_readiness_checks

router = APIRouter(prefix="/protocol-status", tags=["protocol-status"])


@router.get("")
def protocol_status():
    readiness_checks = pilot_readiness_checks()
    readiness_by_key = {str(check["key"]): check for check in readiness_checks}
    summary = {
        "auth": "complete",
        "clans": "complete",
        "invites": "complete",
        "loan_engine": "complete",
        "guarantor_flow": "partial",
        "repayments": "complete",
        "loan_repayment_e2e": "partial",
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
    }
    summary_details = [
        {
            "key": "auth",
            "label": "Authentication",
            "status": summary["auth"],
            "next_step": "Keep covered by entry/auth route audits during local testing.",
        },
        {
            "key": "clans",
            "label": "Communities and membership",
            "status": summary["clans"],
            "next_step": "Keep create, join, invite, and selected-community flows distinct.",
        },
        {
            "key": "invites",
            "label": "Invite entry",
            "status": summary["invites"],
            "next_step": "Keep create-invite and join-existing-community flows separate.",
        },
        {
            "key": "loan_engine",
            "label": "Loan engine",
            "status": summary["loan_engine"],
            "next_step": "Continue lifecycle testing through request, decision, active, repayment, and closure.",
        },
        {
            "key": "guarantor_flow",
            "label": "Supporter flow",
            "status": summary["guarantor_flow"],
            "next_step": str(readiness_by_key["guarantor_flow"]["next_step"]),
            "remaining": readiness_by_key["guarantor_flow"]["remaining"],
            "next_route": readiness_by_key["guarantor_flow"]["next_route"],
        },
        {
            "key": "repayments",
            "label": "Repayment service path",
            "status": summary["repayments"],
            "next_step": "Keep the partial-payment backend validation protected; capture the matching phone UI evidence before marking pilot repayment complete.",
        },
        {
            "key": "loan_repayment_e2e",
            "label": "Loan repayment end-to-end evidence",
            "status": summary["loan_repayment_e2e"],
            "next_step": str(readiness_by_key["loan_repayment_e2e"]["next_step"]),
            "remaining": readiness_by_key["loan_repayment_e2e"]["remaining"],
            "next_route": readiness_by_key["loan_repayment_e2e"]["next_route"],
        },
        {
            "key": "trust_events",
            "label": "Trust events",
            "status": summary["trust_events"],
            "next_step": "Keep the subject-based dedupe-check route protected while the remaining route-consistency evidence is collected.",
        },
        {
            "key": "trustslip",
            "label": "TrustSlip presentation",
            "status": summary["trustslip"],
            "next_step": str(readiness_by_key["trustslip"]["next_step"]),
            "remaining": readiness_by_key["trustslip"]["remaining"],
            "next_route": readiness_by_key["trustslip"]["next_route"],
        },
        {
            "key": "frontend_wiring",
            "label": "Frontend route consistency",
            "status": summary["frontend_wiring"],
            "next_step": str(readiness_by_key["frontend"]["next_step"]),
            "remaining": readiness_by_key["frontend"]["remaining"],
            "next_route": readiness_by_key["frontend"]["next_route"],
        },
        {
            "key": "evidence_pack",
            "label": "Evidence capture pack",
            "status": summary["evidence_pack"],
            "next_step": str(readiness_by_key["evidence"]["next_step"]),
            "remaining": readiness_by_key["evidence"]["remaining"],
            "next_route": readiness_by_key["evidence"]["next_route"],
        },
        {
            "key": "pilot_readiness",
            "label": "Pilot readiness",
            "status": summary["pilot_readiness"],
            "next_step": "Push and deploy only after local evidence gaps are handled and the owner approves one batch publish.",
        },
    ]
    status_counts = {
        "complete": sum(1 for status in summary.values() if status == "complete"),
        "partial": sum(1 for status in summary.values() if status == "partial"),
        "blocked": sum(1 for status in summary.values() if status == "blocked"),
    }

    return {
        "protocol": "GMFN",
        "surface_brand": "GSN",
        "stage": "late_stabilization",
        "truth_statement": "The protocol is late-stabilization, not finished. Partial items must keep their label until evidence, phone review, and route checks are recorded.",
        "summary": summary,
        "summary_details": summary_details,
        "status_counts": status_counts,
        "next_priority": [
            "phone screenshot evidence for polished routes",
            "supporter borrower/admin invite phone evidence and payout-route decision",
            "loan repayment full and part-payment phone evidence",
            "evidence capture pack assembly",
            "trust-event phone evidence audit",
        ],
    }
