# GSN Pilot Evidence Pack Checklist

Last updated: 2026-07-19

## Purpose

This checklist defines what must be captured before GSN can call the pilot
evidence pack complete.

Unabated truth: this file is not evidence by itself. It is the acceptance map
for screenshots, PDFs, route evidence, and limitation notes that still need to be
captured from the working system.

## Evidence Rules

- Use GSN-branded evidence surfaces wherever the system provides them.
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
  visual evidence or a generated PDF opened and reviewed.

## Required Evidence Index

| Area | Required evidence | Current status | Acceptance rule |
| --- | --- | --- | --- |
| Entry flow | Cover, Welcome, Sign In, Create Community, Join Request path | Not captured | First viewport shows one clear action, no pre-auth bottom nav, and no route confusion. |
| Community Home | Community identity, next action chooser, compact owner rows | Not captured | 3D icons are readable, no oversized blocks, and owner tools are grouped rather than dumped. |
| Marketplace | Main marketplace lanes, shop/opportunity route, trust/finance lane clarity | Not captured | Marketplace does not overload the first screen and every visible action has a real destination or clear explanation. |
| Shop Control | Status summary, public shop, vault/assets/spotlight controls | Not captured | Owner controls are guided, icons are meaningful, and media/audio controls use the speaker/video meaning system. |
| Finance | Money-in, money-out, repayment, revenue and evidence routes | Not captured | Finance uses institutional money meaning, not weak wallet-only imagery, and states what GSN can and cannot do. |
| Loan request | Borrower draft, readiness, guarantor fit, decision path | Not captured | Borrowing state, needed support, and next action are visible without decoding backend terms. |
| Repayment | Full-balance choice, part-payment choice, payment instruction | Not captured | Screenshot shows selected amount, outstanding amount, and that part payment is not a scheduled instalment calendar. |
| Guarantor flow | Invite, decision, exposure release, earnings | Not captured | Evidence shows who can invite, what a guarantor is accepting, when exposure releases, and that earnings are not automatic payout. |
| Trust Passport | Identity, trust summary, evidence/document lane | Not captured | Looks like a dignified GSN evidence surface with watermark/mark, limitation statement, and clear next action. |
| TrustSlip Verify | Public evidence and private evidence view | Not captured | Public paper is shareable without private overload; private evidence stays clearly separate. |
| Evidence PDFs | Member, community, loan, TrustSlip, Trust Timeline, Loan Trust, Community Exposure | Not captured | Generated PDF opens visually with GSN title, watermark/header/footer, generated time, and a clear "not a bank guarantee" limitation statement. |
| Admin readiness | Protocol status and pilot readiness partials | Not captured | Partial labels explain what is complete, what remains, why it matters, and the next route. |
| Product evidence capture standard | 12-step sequence from Join GSN through recipient TrustSlip view and access record, with administrative review captured separately where required | Accepted for required 12-step sequence | Must follow `docs/whitepaper_variants/GSN_PRODUCT_EVIDENCE_CAPTURE_STANDARD.md`, use one redacted demo account/community, separate product state from proof state, include caption limitations, and remove private identifiers plus personal CCI/trust-score numbers. |

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
  12_product_evidence_capture/
  limitations.md
```

Do not commit private captured evidence unless it is intentionally redacted and
approved for the repository. During the active pilot, treat the local evidence
folder as working evidence, not public documentation.

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
- Copy/snapshot text packages still need the same institutional GSN treatment
  before they are accepted as customer-facing evidence: clear `GSN Snapshot` title,
  GSN mark or watermark, official frame, holder/community context, generated
  time or reference, and a limitation/currentness note.
- The working route/page inventory for this evidence-surface rollout is
  `docs/INSTITUTIONAL_EVIDENCE_SURFACE_INVENTORY.md`.
- Several web routes have received route-local polish, icon, button, and
  language passes.
- The evidence pack is still partial until accepted screenshots/PDFs are
  captured and reviewed.
- The product evidence capture standard is
  `docs/whitepaper_variants/GSN_PRODUCT_EVIDENCE_CAPTURE_STANDARD.md`. It
  defines the required 12-step story, product/proof state labels, caption
  template, redaction rules, and acceptance checklist before screenshots can be
  attached to the founder or investor material.
- The local working scaffold for the product evidence sequence now exists at
  `pilot_evidence_pack/12_product_evidence_capture/`. It contains the index,
  caption log, redaction log, route capture map, and limitations file for the
  12-step capture pass. This folder is intentionally ignored by git.
- Fresh local candidate screenshots were captured on 2026-07-19, using local
  Playwright and synthetic demo state where required. There are 16 PNGs in the
  local candidate folder and every required product evidence step now has at
  least one candidate. Formal local review found no privacy, score,
  route/session, or mandatory proof blocker. Cleaner recaptures cleared the
  step 04 and step 05 presentation caveats. Owner selected option `1` on
  2026-07-19 and accepted step 06 with a required crop-limitation caption note:
  the short Recent state starts mid previous panel before the recent-record
  proof. Owner selected option `1` again on 2026-07-19 and accepted step 01 as
  a clear GSN entry screenshot; it does not prove completed onboarding or pilot
  adoption. Owner selected option `2` on 2026-07-19 and accepted step 02 as a
  clear synthetic personal GSN identity/account screenshot; it does not prove
  full identity verification. Owner selected option `1` on 2026-07-19 and
  accepted step 03 as a guided create-community screenshot; it does not prove
  the community is active, paid, verified, governed, or externally used. Owner
  selected option `1` on 2026-07-19 and accepted step 04 as a Community Domain
  operating-area screenshot; it does not prove every operating area is complete
  or pilot-used. Owner selected option `1` on 2026-07-19 and accepted step 05
  as a source activity screenshot; it does not prove the activity has become
  confirmed evidence. Owner selected option `1` on 2026-07-19 and accepted
  step 07 as a confirmation/witness request screenshot; it proves a private
  confirmation-link request action can be prepared for synthetic `Demo Member
  A`, but does not prove contacts, consent rules, delivery channels, or
  provider sending are production-ready. Owner selected option `1` on
  2026-07-19 and accepted step 08 as a confirmation response screenshot; it
  proves a privacy-safe public response/outcome surface and response-count
  state with `TIME LEFT 50:00` and `1 / 1 responded`, but does not prove the
  detailed response text is fully visible in the first viewport or repeated
  external pilot completion. Owner selected option `1` on 2026-07-19 and
  accepted step 09 as a Trust Event detail screenshot; it proves Trust Timeline
  event-detail presentation with latest-event context, status, limitation, and
  evidence reference, but does not prove the evidence is true beyond the
  recorded confirmation and review state. Owner selected option `2` on
  2026-07-19 and accepted step 10 as a privacy, challenge, and currentness
  screenshot; it proves summary presentation for privacy, challenge,
  currentness, consent, response, and delivery state, but does not prove every
  evidence type has complete expiry, dispute-resolution, or consent-enforcement
  policy. Owner selected option `1` on 2026-07-19 and accepted step 11 as a
  TrustSlip selection screenshot; it proves purpose-based TrustSlip preparation
  and evidence selection, but does not prove the TrustSlip is accepted by an
  external decision-maker. Owner selected option `1` on 2026-07-19 and
  accepted step 12 as a recipient view and access record screenshot; it proves
  the public TrustSlip recipient view and synthetic access-record surface, but
  does not prove external recipients trust the evidence in real decisions. Step
  05 was
  recaptured from the Community Domain staged activity draft and now shows
  `Community Support Activity 001`, `Draft only`, `Not requested yet`, and
  `Not confirmed evidence` before submission. Step 06 was recaptured from the
  Community Domain stored activity `Recent records` state and now shows
  `Community Support Activity 001`, `Self Reported`, and `Demo Member A`
  instead of the old pre-submit input form. Step 07 was
  recaptured after the Community Domain safe
  subject-reference patch and no longer shows placeholder-style `Subject 7`
  wording; it is now accepted with the limitation above. Step 09 was recaptured from `/app/trust-timeline` after adding a
  latest-event context panel and now shows date, plain-language signal,
  `Community Support Activity 001`, pending-review status, and limitation in
  the first viewport; it is now accepted with the limitation above. Step 10 was recaptured from the Community Domain
  beneficiary outcome summary and now shows privacy, challenge, currentness,
  and consent in the first viewport without the old correction-form crop; it is
  now accepted with the limitation above. Step
  12 was recaptured from the public TrustSlip recipient view and now shows
  recipient, access date, purpose, and scope in the first viewport; it is now
  accepted with the limitation above. Step 11 was
  recaptured from `/app/trust-slip` and now shows purpose selection, selected
  evidence, currentness, and private-detail exclusion in the first viewport;
  it is now accepted with the limitation above.
  Step 04 was recaptured from the top-of-state Community Domain package and now
  shows the synthetic `GSN Demo Community A` identity, active operating state,
  Daily Work, and Governance separation in one phone viewport. Step 05 was
  cleaner-recaptured after moving the draft-only proof state before activity
  controls and now has clear source-activity proof. Step 06 has a clear proof
  area and is accepted with a caption note about the adjacent previous-panel
  text.
  The candidates are listed in
  `pilot_evidence_pack/12_product_evidence_capture/candidate_capture_log.md`.
- The reusable local capture tool is
  `frontend/tools/capture-product-evidence-candidates.mjs` and can be run with
  `npm --prefix frontend run capture:product-evidence-candidates` against the
  local frontend.
- Route-boundary smokes passed for Community Home Domain list, Trust Timeline,
  Community Confirmation Outcome, Trust Passport/TrustSlip holder boundaries,
  public TrustSlip verify states, TrustSlip private evidence boundaries, and the
  Community Domain mobile visual audit.
- Accepted product evidence screenshots are now `12 of 12`. There are no
  remaining required screenshot acceptance decisions for the 12-step product
  evidence sequence. The older local screenshots and backup/support candidate
  screenshots are not accepted under the current standard unless they are
  separately redacted, captioned, single-demo-context aligned, and approved.
  This local sequence acceptance does not prove traction, adoption, revenue,
  external validation, recipient trust, or product-market fit.
- Current owner override for active pilot testing: completed verified fixes are
  pushed to `main` and a Render deploy is requested. Frontend deploy requests
  can be accepted by the existing hook; backend-impacting fixes are not
  Render-confirmed until `gmfn-api` is deployed manually or GitHub has
  `RENDER_API_KEY` plus preferably `RENDER_API_SERVICE_ID`.
- PDF footer/source-generation slice: owner provided Render dashboard evidence
  that deploy `dep-d90ct20jo6nc73cha64g` for service
  `srv-d7h2c8ugvqtc73eshtd0` is live on commit `68df9e3` as of 2026-06-28
  08:36. Treat the PDF footer runtime source fix as deployed for that service,
  while keeping generated PDF visual review as not yet accepted.
