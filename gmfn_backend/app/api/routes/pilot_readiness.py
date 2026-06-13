from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/pilot-readiness", tags=["pilot-readiness"])

EVIDENCE_PACK_CHECKLIST_DOC = "docs/PILOT_EVIDENCE_PACK_CHECKLIST.md"

EVIDENCE_PACK_CHECKLIST_ITEMS: list[dict[str, str]] = [
    {
        "key": "entry_flow",
        "area": "Entry flow",
        "required_proof": "Cover, Welcome, Sign In, Create Community, Join Request path",
        "status": "not_captured",
        "acceptance_rule": "First viewport shows one clear action, no pre-auth bottom nav, and no route confusion.",
    },
    {
        "key": "community_home",
        "area": "Community Home",
        "required_proof": "Community identity, next action chooser, compact owner rows",
        "status": "not_captured",
        "acceptance_rule": "3D icons are readable, no oversized blocks, and owner tools are grouped rather than dumped.",
    },
    {
        "key": "marketplace",
        "area": "Marketplace",
        "required_proof": "Main marketplace lanes, shop/opportunity route, trust/finance lane clarity",
        "status": "not_captured",
        "acceptance_rule": "Marketplace does not overload the first screen and every visible action has a real destination or clear explanation.",
    },
    {
        "key": "shop_control",
        "area": "Shop Control",
        "required_proof": "Status summary, public shop, vault/assets/spotlight controls",
        "status": "not_captured",
        "acceptance_rule": "Owner controls are guided, icons are meaningful, and media/audio controls use the speaker/video meaning system.",
    },
    {
        "key": "finance",
        "area": "Finance",
        "required_proof": "Money-in, money-out, repayment, revenue and evidence routes",
        "status": "not_captured",
        "acceptance_rule": "Finance uses institutional money meaning and states what GSN can and cannot do.",
    },
    {
        "key": "loan_request",
        "area": "Loan request",
        "required_proof": "Borrower draft, readiness, guarantor fit, decision path",
        "status": "not_captured",
        "acceptance_rule": "Borrowing state, needed support, and next action are visible without decoding backend terms.",
    },
    {
        "key": "repayment",
        "area": "Repayment",
        "required_proof": "Full-balance choice, part-payment choice, payment instruction",
        "status": "not_captured",
        "acceptance_rule": "Screenshot shows selected amount, outstanding amount, and that part payment is not a scheduled instalment calendar.",
    },
    {
        "key": "guarantor_flow",
        "area": "Guarantor flow",
        "required_proof": "Invite, decision, exposure release, earnings",
        "status": "not_captured",
        "acceptance_rule": "Proof shows who can invite, what a guarantor accepts, when exposure releases, and that earnings are not automatic payout.",
    },
    {
        "key": "trust_passport",
        "area": "Trust Passport",
        "required_proof": "Identity, trust summary, evidence/document lane",
        "status": "not_captured",
        "acceptance_rule": "Looks like a dignified GSN proof surface with watermark/mark, limitation statement, and clear next action.",
    },
    {
        "key": "trustslip_verify",
        "area": "TrustSlip Verify",
        "required_proof": "Public proof and private evidence view",
        "status": "not_captured",
        "acceptance_rule": "Public paper is shareable without private overload; private evidence stays clearly separate.",
    },
    {
        "key": "evidence_pdfs",
        "area": "Evidence PDFs",
        "required_proof": "Member, community, loan, TrustSlip, Trust Timeline, Loan Trust, Community Exposure",
        "status": "not_captured",
        "acceptance_rule": "Generated PDF opens visually with GSN title, watermark/header/footer, generated time, and limitation statement.",
    },
    {
        "key": "admin_readiness",
        "area": "Admin readiness",
        "required_proof": "Protocol status and pilot readiness partials",
        "status": "not_captured",
        "acceptance_rule": "Partial labels explain what is complete, what remains, why it matters, and the next route.",
    },
]

EVIDENCE_PACK_FOLDER_SHAPE = [
    "pilot_evidence_pack/00_index.md",
    "pilot_evidence_pack/01_entry/",
    "pilot_evidence_pack/02_community/",
    "pilot_evidence_pack/03_marketplace/",
    "pilot_evidence_pack/04_shop_control/",
    "pilot_evidence_pack/05_finance/",
    "pilot_evidence_pack/06_loans_repayment/",
    "pilot_evidence_pack/07_guarantor_flow/",
    "pilot_evidence_pack/08_trust_passport/",
    "pilot_evidence_pack/09_trustslip_verify/",
    "pilot_evidence_pack/10_generated_pdfs/",
    "pilot_evidence_pack/11_admin_readiness/",
    "pilot_evidence_pack/limitations.md",
]


def evidence_pack_checklist() -> dict[str, object]:
    items = [dict(item) for item in EVIDENCE_PACK_CHECKLIST_ITEMS]
    status_counts = {
        "not_captured": sum(1 for item in items if item["status"] == "not_captured"),
        "captured": sum(1 for item in items if item["status"] == "captured"),
        "accepted": sum(1 for item in items if item["status"] == "accepted"),
        "rejected": sum(1 for item in items if item["status"] == "rejected"),
    }

    return {
        "status": "needs_capture",
        "status_label": "Checklist ready, proof not captured",
        "doc": EVIDENCE_PACK_CHECKLIST_DOC,
        "truth_statement": "The checklist exists, but accepted screenshots and PDFs are still zero until the team captures and reviews them.",
        "items": items,
        "item_count": len(items),
        "accepted_count": status_counts["accepted"],
        "status_counts": status_counts,
        "folder_shape": list(EVIDENCE_PACK_FOLDER_SHAPE),
    }


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
                "Guarantor invite permission is locked to the borrower who owns the loan or a community admin; ordinary non-borrower members are forbidden.",
                "Guarantor Earnings now tells users that earned value is a visible record, not an automatic payout.",
            ],
            remaining=[
                "Run the borrower, guarantor, and admin views on a phone and capture proof that invite, decision, exposure, release, and earnings language is clear.",
                "Decide whether a real guided withdrawal workflow must be pilot-ready before guarantor rewards move beyond visibility.",
            ],
            next_step="Run a phone proof pass across support draft, guarantor decision, loan summary, repayment closure, and guarantor earnings; then decide the reward payout route.",
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
                "Trust/evidence route ownership has been deduplicated so trust-why, admin trust-why, admin recent events, and evidence-pack meta each have one active owner.",
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
                "Older Trust Timeline, Loan Trust Report, and Community Exposure Report PDFs now use the same GSN institutional shell.",
            ],
            remaining=[
                "Run phone screenshot review for TrustSlip Verify, Trust Passport, and public proof surfaces.",
                "Render and review exported/shared proof packages visually so they read clearly without surrounding page context.",
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
                "Community Home, Marketplace, Finance, Shop Control, Trust Passport, TrustSlip, repayment, and guarantor earnings screens have received targeted polish passes.",
                "Repayment and guarantor earnings now use plainer user-facing money truth where payout or instalment behavior could be misunderstood.",
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
                "Trust Timeline, Loan Trust Report, Community Exposure Report, Trust Passport, and TrustSlip proof surfaces have official GSN treatment.",
                "Evidence-pack meta and zip routes now share the same GSN package contract and are owned by the active evidence-pack route module.",
                "The current source-level PDF shell pass covers the known evidence/report generators.",
                "A pilot evidence-pack checklist now defines required screenshots, PDFs, acceptance rules, and local folder shape.",
            ],
            remaining=[
                "Assemble accepted screenshots/PDFs for entry, community, marketplace, repayment, TrustSlip, Trust Passport, and admin readiness.",
                "Visually open generated PDFs and screenshots before treating them as accepted pilot evidence.",
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
        "evidence_pack_checklist": evidence_pack_checklist(),
    }


@router.get("/evidence-pack-checklist")
def pilot_evidence_pack_checklist():
    return evidence_pack_checklist()
