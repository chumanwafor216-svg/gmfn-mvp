# GSN Pilot Evidence Pack Checklist

Last updated: 2026-06-11

## Purpose

This checklist defines what must be captured before GSN can call the pilot
evidence pack complete.

Unabated truth: this file is not evidence by itself. It is the acceptance map
for screenshots, PDFs, route proofs, and limitation notes that still need to be
captured from the working system.

## Evidence Rules

- Use GSN-branded proof surfaces wherever the system provides them.
- Prefer phone screenshots at 390x844 or the closest real device size.
- Capture one clear state per screenshot: state, key facts, and next action.
- Do not expose raw private IDs, full bank details, full phone numbers, or
  private member data in shareable evidence.
- Mark every item as one of:
  - `Not captured`
  - `Captured`
  - `Accepted`
  - `Rejected`
- A route is not accepted only because it builds. Acceptance needs local/phone
  visual proof or a generated PDF opened and reviewed.

## Required Evidence Index

| Area | Required proof | Current status | Acceptance rule |
| --- | --- | --- | --- |
| Entry flow | Cover, Welcome, Sign In, Create Community, Join Request path | Not captured | First viewport shows one clear action, no pre-auth bottom nav, and no route confusion. |
| Community Home | Community identity, next action chooser, compact owner rows | Not captured | 3D icons are readable, no oversized blocks, and owner tools are grouped rather than dumped. |
| Marketplace | Main marketplace lanes, shop/opportunity route, trust/finance lane clarity | Not captured | Marketplace does not overload the first screen and every visible action has a real destination or clear explanation. |
| Shop Control | Status summary, public shop, vault/assets/spotlight controls | Not captured | Owner controls are guided, icons are meaningful, and media/audio controls use the speaker/video meaning system. |
| Finance | Money-in, money-out, repayment, revenue and evidence routes | Not captured | Finance uses institutional money meaning, not weak wallet-only imagery, and states what GSN can and cannot do. |
| Loan request | Borrower draft, readiness, guarantor fit, decision path | Not captured | Borrowing state, needed support, and next action are visible without decoding backend terms. |
| Repayment | Full-balance choice, part-payment choice, payment instruction | Not captured | Screenshot shows selected amount, outstanding amount, and that part payment is not a scheduled instalment calendar. |
| Guarantor flow | Invite, decision, exposure release, earnings | Not captured | Proof shows who can invite, what a guarantor is accepting, when exposure releases, and that earnings are not automatic payout. |
| Trust Passport | Identity, trust summary, evidence/document lane | Not captured | Looks like a dignified GSN proof surface with watermark/mark, limitation statement, and clear next action. |
| TrustSlip Verify | Public proof and private evidence view | Not captured | Public paper is shareable without private overload; private evidence stays clearly separate. |
| Evidence PDFs | Member, community, loan, TrustSlip, Trust Timeline, Loan Trust, Clan Exposure | Not captured | Generated PDF opens visually with GSN title, watermark/header/footer, generated time, and a clear "not a bank guarantee" limitation statement. |
| Admin readiness | Protocol status and pilot readiness partials | Not captured | Partial labels explain what is complete, what remains, why it matters, and the next route. |

## Folder Shape

Use this local folder shape when screenshots/PDFs are captured:

```text
pilot_evidence_pack/
  00_index.md
  01_entry/
  02_community/
  03_marketplace/
  04_shop_control/
  05_finance/
  06_loans_repayment/
  07_guarantor_flow/
  08_trust_passport/
  09_trustslip_verify/
  10_generated_pdfs/
  11_admin_readiness/
  limitations.md
```

Do not commit private captured evidence unless it is intentionally redacted and
approved for the repository. During the active pilot, treat the local evidence
folder as working proof, not public documentation.

## Acceptance Notes

Each accepted item should record:

- route or PDF generator;
- date captured;
- device or viewport;
- data used: demo, redacted pilot, or live pilot;
- reviewer decision;
- limitation or known gap;
- related commit hash.

## Current Truth

- The GSN institutional PDF shell exists in source for the known evidence and
  report generators, including generated time, reference, watermark/header/footer,
  and the "not a bank guarantee" limitation.
- Several web routes have received route-local polish, icon, button, and
  language passes.
- The evidence pack is still partial until accepted screenshots/PDFs are
  captured and reviewed.
- Render/pipeline deployment should remain batch-first and push-last until the
  product owner approves publishing.
