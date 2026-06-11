from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/pilot-readiness", tags=["pilot-readiness"])


def _ready_check(
    key: str,
    label: str,
    *,
    complete: list[str] | None = None,
    why_it_matters: str = "",
) -> dict[str, object]:
    return {
        "key": key,
        "label": label,
        "status": "ready",
        "status_label": "Ready",
        "why_it_matters": why_it_matters
        or "This part has a working implementation and no known pilot blocker.",
        "complete": complete or ["Implementation exists and is wired into the service."],
        "remaining": [],
        "next_step": "Keep watching this during local pilot testing.",
        "next_route": "",
    }


def _partial_check(
    key: str,
    label: str,
    *,
    why_it_matters: str,
    complete: list[str],
    remaining: list[str],
    next_step: str,
    next_route: str,
) -> dict[str, object]:
    return {
        "key": key,
        "label": label,
        "status": "partial",
        "status_label": "Needs proof",
        "why_it_matters": why_it_matters,
        "complete": complete,
        "remaining": remaining,
        "next_step": next_step,
        "next_route": next_route,
    }


def pilot_readiness_checks() -> list[dict[str, object]]:
    return [
        _ready_check(
            "auth",
            "Authentication",
            complete=[
                "Existing member sign-in routes are mounted.",
                "Entry/auth recovery is protected by frontend audits.",
            ],
            why_it_matters="People must enter GSN without being sent to the wrong start page.",
        ),
        _ready_check(
            "clans",
            "Community selection and membership",
            complete=[
                "Community membership routes are mounted.",
                "Existing-member invite joining preserves the user's GSN identity.",
            ],
            why_it_matters="Members must land in the right community before marketplace, trust, or money work starts.",
        ),
        _ready_check(
            "loans",
            "Loan engine",
            complete=[
                "Loan request, decision, inbox, summary, and hardening routes are mounted.",
                "Loan state checks are covered by backend tests.",
            ],
            why_it_matters="Borrowing has to behave as a controlled lifecycle, not a loose button.",
        ),
        _ready_check(
            "repayments",
            "Repayment service path",
            complete=[
                "The backend applies partial repayment amounts and only closes a loan when the balance reaches zero.",
                "The frontend now lets a member choose full balance or part payment before generating the bank instruction.",
            ],
            why_it_matters="A borrower must be able to repay what they can, while the record still shows the real remaining balance.",
        ),
        _partial_check(
            "guarantor_flow",
            "Guarantor flow",
            why_it_matters="Guarantors carry real trust pressure in GSN. The system must prove who can ask for support, who can stand for a borrower, when exposure locks, when it releases, and when earnings become payable.",
            complete=[
                "Backend tests cover guarantor list/invite contracts, duplicate blocking, non-member rejection, and decision updates.",
                "Service tests cover guarantor approval, auto-approval when enough pledged support is present, and release of locked exposure.",
                "Repayment proof now covers guarantor exposure release after full repayment, and earnings tests show rewards stay pending until the loan is repaid.",
                "Frontend support surfaces show fit suggestions, selected guarantors, line-by-line decisions, and guarantor earnings routes.",
            ],
            remaining=[
                "Make the product policy explicit for who may invite guarantors; the current contract test still tolerates both admin-only and borrower/member-created guarantor requests.",
                "Run the borrower, guarantor, and admin views on a phone and capture proof that invite, decision, exposure, release, and earnings language is clear.",
                "Confirm whether guarantor reward payout is only visibility for pilot or needs a payable withdrawal flow before pilot sign-off.",
            ],
            next_step="Decide the guarantor-invite permission rule, then run a phone proof pass across support draft, guarantor decision, loan summary, repayment closure, and guarantor earnings.",
            next_route="/app/loans",
        ),
        _partial_check(
            "loan_repayment_e2e",
            "Loan repayment end-to-end proof",
            why_it_matters="The backend path is now protected by a local reconciliation proof test, but pilot trust still needs visible phone/manual evidence and a decision on planned instalment schedules.",
            complete=[
                "Full-balance and part-payment instruction choices are visible on the repayment screen.",
                "Backend repayment logic supports partial repayment without falsely closing the loan.",
                "Automated backend proof covers one expected repayment receiving a part payment, then a final payment, through bank reconciliation, loan balance update, guarantee release, and trust events.",
            ],
            remaining=[
                "Run the same full and part-payment route from the phone/local UI and capture screenshots.",
                "Capture the before/after loan balance, expected payment, bank match, and Trust event evidence as the pilot evidence pack.",
                "Decide whether planned instalment schedules with due dates are required now or after pilot.",
            ],
            next_step="Run the phone/local UI proof and capture the repayment evidence pack; keep planned instalment scheduling as a separate product decision.",
            next_route="/app/loans",
        ),
        _ready_check(
            "pool",
            "Pool ledger",
            complete=[
                "Pool routes and ledger tests are present.",
                "Loan pool truth tests protect pool event behavior.",
            ],
            why_it_matters="Pool money must stay traceable before support or lending can be trusted.",
        ),
        _ready_check(
            "banking",
            "Deterministic bank reconciliation",
            complete=[
                "Expected-payment matching and bank reconciliation routes are mounted.",
                "Admin bank console routes are available for unmatched-event review.",
            ],
            why_it_matters="Incoming money must match expected instructions instead of relying on manual guessing.",
        ),
        _ready_check(
            "payment_instructions",
            "Payment instructions",
            complete=[
                "Expected payment instructions are created for supported payment paths.",
                "Copyable bank instruction data is exposed to the frontend.",
            ],
            why_it_matters="Members need clear payment directions they can follow outside the app.",
        ),
        _ready_check(
            "withdrawal_instructions",
            "Withdrawal instructions",
            complete=[
                "Withdrawal instruction routes and destination routes are mounted.",
            ],
            why_it_matters="Money-out work must remain explicit, reviewed, and traceable.",
        ),
        _ready_check(
            "trust",
            "Trust event audit trail",
            complete=[
                "Trust event, timeline, recompute, and explainability routes are mounted.",
                "Recent trust events are read by the Trust Command Centre.",
                "The admin dedupe-check route now checks real TrustEvent subject, loan, guarantor, and reason context.",
            ],
            why_it_matters="GSN trust must be visible as evidence, not only as a score.",
        ),
        _partial_check(
            "trustslip",
            "TrustSlip presentation",
            why_it_matters="TrustSlip is a portable proof surface. It must look and read like an official GSN evidence package before people share screenshots or PDFs.",
            complete=[
                "Public TrustSlip Verify and TrustSlip proof paper have institutional visual treatment.",
                "GSN PDF shells now share official header, watermark, footer, generated time, and limitation language.",
            ],
            remaining=[
                "Run phone screenshot review for TrustSlip Verify, Trust Passport, and public proof surfaces.",
                "Confirm exported/shared proof packages read clearly without surrounding page context.",
            ],
            next_step="Review the TrustSlip and Trust Passport proof surfaces on a real phone and capture accepted screenshots.",
            next_route="/app/trust-passport",
        ),
        _partial_check(
            "frontend",
            "Frontend route consistency",
            why_it_matters="Users should not be asked to decode route names, wrong icons, jumping buttons, or dead-end actions.",
            complete=[
                "Major button routes and mobile tap stability are protected by audits.",
                "Community Home, Marketplace, Finance, Shop Control, Trust Passport, TrustSlip, and repayment screens have received targeted polish passes.",
            ],
            remaining=[
                "Physical phone screenshot pass for remaining oversized blocks, wrapping, icon size, and action density.",
                "Continue replacing admin/backend language with short user-facing language where it leaks.",
            ],
            next_step="Run one route at a time on a phone, record visual issues, and fix only the confirmed route-local problems.",
            next_route="/app/community",
        ),
        _partial_check(
            "evidence",
            "Evidence capture pack",
            why_it_matters="A pilot needs a dignified package of screenshots, PDFs, route proof, and limitations that an outside reader can respect.",
            complete=[
                "Institutional PDF header, watermark, footer, and limitation shells are in place for key generated reports.",
                "Trust Timeline, Loan Trust Report, Clan Exposure Report, Trust Passport, and TrustSlip proof surfaces have official GSN treatment.",
            ],
            remaining=[
                "Assemble accepted screenshots/PDFs for entry, community, marketplace, repayment, TrustSlip, Trust Passport, and admin readiness.",
                "Record which proofs are system-generated, which are screenshots, and which still need live pilot data.",
            ],
            next_step="Create a local evidence folder or checklist after the next phone screenshot run, then attach each accepted proof to this readiness item.",
            next_route="/app/trust-command",
        ),
    ]


@router.get("")
def pilot_readiness():
    checks = pilot_readiness_checks()

    ready = sum(1 for x in checks if x["status"] == "ready")
    partial = sum(1 for x in checks if x["status"] == "partial")
    blocked = sum(1 for x in checks if x["status"] == "blocked")

    return {
        "overall_status": "pilot_near_ready" if blocked == 0 else "not_ready",
        "overall_label": (
            "Near ready with evidence gaps"
            if blocked == 0 and partial > 0
            else "Ready for pilot"
            if blocked == 0
            else "Not ready"
        ),
        "truth_statement": (
            "No blocked service check is listed, but partial items still need phone proof, evidence packaging, or end-to-end validation."
            if blocked == 0 and partial > 0
            else "No readiness gap is currently listed."
            if blocked == 0
            else "Blocked readiness items must be cleared before pilot use."
        ),
        "ready_count": ready,
        "partial_count": partial,
        "blocked_count": blocked,
        "checks": checks,
    }
