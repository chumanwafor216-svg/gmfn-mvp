# GSN Evidence Display Contract Draft

Status: Draft protocol
Date: 2026-07-05
Scope: Trust Passport, TrustSlip, verification, community evidence, marketplace,
finance, and Community Domain evidence displays.

## Purpose

GSN needs one shared evidence-display contract before the Trust Passport family
is redesigned further.

The current product already has careful trust language in several places:

- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/lib/trustPassportViewModel.ts`
- `frontend/src/pages/TrustSlipPage.tsx`
- `frontend/src/pages/TrustSlipVerifyPage.tsx`
- `frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx`
- `frontend/src/pages/TrustTimelinePage.tsx`
- community verification and confirmation pages
- marketplace, finance, loan, and Community Domain evidence surfaces

The risk is not that GSN lacks evidence language. The risk is that each route
can slowly invent its own meaning for "evidence", "verified", "current",
"public", "private", "TrustSlip", and "decision support".

This draft defines the minimum shared contract every evidence surface should
follow.

## Non-Goals

This document does not change backend schema, frontend components, auth,
permissions, scoring, routes, Render deployment, or frozen UI behavior.

This document does not claim that every field below exists in the current API.
It defines the display contract the product should move toward.

This document does not turn Trust Events into full universal evidence records.
The universal evidence dimensions from
`docs/GSN_TRUST_EVENT_STANDARDIZATION_PROTOCOL_2026-06-29.md` remain prepared
protocol unless a route, model, migration, backfill, and display audit proves
they are live.

## Evidence Chain

All evidence displays should preserve this chain:

`Community -> Behaviour -> Evidence -> Trust Event -> Trust Passport -> TrustSlip -> Decision -> Opportunity`

Meaning:

- Community is the social and operating context.
- Behaviour is what happened.
- Evidence is the recorded support for what happened.
- Trust Event is the structured system event or audit marker.
- Trust Passport is the fuller private and signed-in trust story.
- TrustSlip is the portable current evidence view for a scoped decision.
- Decision is made by the reader, not by the document.
- Opportunity may follow only when the reader accepts the evidence and limits.

## Required Display Fields

Every evidence display does not need every field on screen, but every display
should be able to answer these questions either directly or through its source
object:

| Field | Meaning |
| --- | --- |
| `evidence_title` | Plain label shown to the reader. |
| `evidence_kind` | Type of evidence, such as identity, membership, witness, activity, repayment, marketplace, document, community-domain, or timeline event. |
| `source_engine` | System that produced or surfaced the record, such as Trust Event, TrustSlip, community confirmation, marketplace, loan, identity evidence, or Community Domain. |
| `source_record_id` | Stable internal or public-safe reference. |
| `community_context` | Community, domain, clan, shop, circle, or institution that gives the evidence meaning. |
| `subject` | Person, community, shop, loan, event, or object the evidence is about. |
| `actor_or_recorder` | Who recorded, confirmed, or issued the evidence, when safe to show. |
| `occurred_at` | When the underlying activity happened, if known. |
| `recorded_at` | When GSN recorded or issued the evidence. |
| `visibility` | Public, holder, signed-in, community-admin, platform-admin, share-bundle, redacted, or private. |
| `verification_state` | Current, ready, pending, limited, expired, revoked, frozen, missing, or unknown. |
| `approval_state` | Whether the evidence has been approved, reviewed, rejected, contested, or left unreviewed. |
| `provenance` | How GSN knows this, such as user-submitted, admin-reviewed, community-witnessed, system-derived, imported, or placeholder. |
| `decision_relevance` | What decision this evidence may support. |
| `public_summary` | Public-safe sentence. |
| `private_summary` | Signed-in or protected explanation. |
| `excluded_claims` | What the evidence does not prove. |
| `privacy_boundary` | What is deliberately hidden and why. |
| `next_action` | First safe action when evidence is missing, weak, expired, or private. |
| `maturity_label` | Live, pilot, prepared, roadmap, or institutional future. |
| `reference_fingerprint` | Public-safe hash/code/reference when available. |
| `related_trust_event_id` | Trust Event anchor when it exists. |
| `related_trust_passport_lane` | Standing, Evidence Story, Community Confirmation, Finance Discipline, Documents / TrustSlip, or Repair. |
| `trustslip_eligible` | Whether the evidence can travel outward through TrustSlip. |
| `current_until` | Expiry, renewal, validity, or currentness window. |

## Maturity Labels

Use these labels consistently:

| Label | Meaning |
| --- | --- |
| Live | Implemented and used in the current app with a route, data source, and user-facing display. |
| Pilot | Implemented or partially implemented for controlled pilot use; may need review, backfill, or manual operation. |
| Prepared | Documented design/protocol exists, but route/data/display parity is not yet proven. |
| Roadmap | Product intent exists, but implementation is not started or not safely mapped. |
| Institutional Future | Useful for the long-term GSN vision, but not a near-term pilot dependency. |

Do not call evidence "live", "verified", "cryptographic", "official",
"bank-confirmed", "government-confirmed", or "community-approved" unless the
specific source supports that exact claim.

## Record States

Evidence displays should use record states that ordinary readers can understand:

| State | Reader Meaning |
| --- | --- |
| Current | The record is usable for the stated scope right now. |
| Ready | The record can be shown or shared, but may still need reader judgement. |
| Limited | Some signal exists, but it is not enough by itself. |
| Pending | The record exists but is waiting for review, confirmation, setup, or renewal. |
| Missing | No usable record is present. |
| Expired | A previous record exists but should not be relied on without refresh. |
| Revoked | A previous record was withdrawn or invalidated. |
| Frozen | The record is held because of risk, dispute, or admin action. |
| Private | The record exists but cannot be shown to this reader. |
| Unknown | The current app cannot determine the state. |

## Visibility Levels

Evidence must never travel farther than its visibility level permits.

| Visibility | Allowed Display |
| --- | --- |
| Private Passport | Fullest protected story for the holder and permitted GSN/admin contexts. |
| Signed-in holder | Member can see their own record and repair path. |
| Community/admin scoped | Community operators can see what they need to govern or confirm. |
| Public scoped | Outside reader sees only current public-safe facts, limits, and next step. |
| Share bundle | Redacted package prepared for a specific support, merchant, admin, or review moment. |
| Redacted aggregate | Count, status, or trend without raw private details. |

Public evidence must protect private contact details, private Trust Passport
history, admin-only notes, raw financial records, and documents that the user or
system did not explicitly release for that reader.

## Surface Boundaries

| Surface | What It May Show | What It Must Not Become |
| --- | --- | --- |
| Trust Passport `/app/trust` | Fuller signed-in trust story, lanes, pressure, repair path, identity, community, finance, documents, and TrustSlip readiness. | Public proof page, moral score, loan approval engine, or raw admin log. |
| TrustSlip `/app/trust-slip` | Portable current evidence and scoped share/verify tools. | Full private Passport, bank guarantee, escrow, payment authority, or delivery guarantee. |
| Public TrustSlip Verify `/t/:code` | Current public-safe status, code, expiry, community/member evidence, QR/reference, limits, and next safe step. | Private Passport access, complete raw evidence trail, member contact disclosure, or automatic approval. |
| Trust Timeline `/app/trust-timeline` | Signed-in event trail, evidence pack reference, redacted package tools. | Full Passport replacement, public proof surface, or release authority. |
| Identity `/app/identity` | Identity continuity, repair, missing evidence, and evidence status. | Trust itself. Identity evidence supports trust, but does not equal trust. |
| CCI reading `/app/cci-reading` | Cross-community consistency signal and limits. | Moral score, full Passport, or universal reliability claim. |
| Community Verify | Community record, currentness, public-safe community identity, limitations. | Member approval, parent-institution guarantee, or proof of every community claim. |
| Community Member Verify | Member/community relationship, witness/currentness, visible role. | Professional licence, employment proof, or full private member record. |
| Confirmation Outcome | Result of a scoped community confirmation request. | Endorsement by every member, release authority, or private contact publication. |
| Marketplace/Public Shop | Shop/activity context and evidence preview. | TrustSlip proof unless a current TrustSlip code/source exists. |
| Finance/Loans | Readiness, repayment, capacity, pressure, and discipline signals. | Bank approval, loan approval, guarantee, auto-debit, or payment movement. |
| Community Domain | Institutional governance, membership, node, role, policy, and evidence scope. | Replacement for member Trust Passport or unrestricted public registry. |

## Trust Document Language Contract

When a surface presents itself as a trust document, it should follow the
sequence in `docs/TRUST_DOCUMENT_LANGUAGE_PROTOCOL.md`:

1. GSN registry masthead
2. gold seal or trust mark
3. record title and status
4. registry ID or verification code
5. confidence ribbon
6. digital security panel
7. what this confirms
8. what this does not confirm
9. evidence/history summary
10. QR verification
11. digital fingerprint/reference hash
12. next action
13. registry notice/limitation footer

The key rule is not visual ceremony. The key rule is truth control: every
document-style surface must say both what it confirms and what it does not
confirm.

## Confirms Templates

Use direct language:

- "This confirms that GSN currently has a visible record for..."
- "This confirms that the public TrustSlip code resolves to..."
- "This confirms that the signed-in member can view..."
- "This confirms that this community record is active in GSN..."
- "This confirms that the evidence pack reference is..."
- "This confirms that GSN has recorded community activity count/status..."

Do not say "verified" unless the source has a real verification state.

## Does Not Confirm Templates

Use these limits where relevant:

- "This does not confirm government identity, legal identity, professional
  licence, or regulatory approval."
- "This does not approve credit, move money, create escrow, start auto-debit, or
  authorize release of goods or services."
- "This does not guarantee future behaviour, repayment, delivery, or marketplace
  outcome."
- "This does not expose private Trust Passport history, private contacts,
  protected documents, or admin-only notes."
- "This does not prove parent-community acknowledgement unless that
  acknowledgement is shown as current evidence."
- "This does not make a shop, listing, member, or community trustworthy by
  itself. It is decision-support evidence."

## Decision-Reading Contract

Every evidence surface that points a user toward a decision must answer:

1. What is wrong, missing, current, or ready?
2. Why does it matter for this decision?
3. What is the first safe thing to do?
4. What should the reader not assume?

Examples:

- Missing TrustSlip code: "This TrustSlip needs a fresh public code before
  outside verification can open. Refresh the TrustSlip, then try again."
- Expired public slip: "Ask the holder to refresh their TrustSlip in GSN and
  share the new public code or QR before relying on it."
- No community responder pool: "A community owner must enable confirmation
  contacts before this public check can open."
- Limited finance evidence: "Ask for more current repayment or contribution
  evidence before making a bigger support decision."

## Universal Evidence Dimensions

The prepared universal dimensions are:

- participation
- contribution
- responsibility
- reliability
- support
- leadership
- learning_development
- recognition

Current app displays may reference these only when the source record actually
stores or maps the dimension. Until then, display them as planned protocol, not
live evidence.

## Public/Private Rules

Public displays may show:

- holder name or public-safe holder label
- GSN ID or scoped public reference
- community name/code when public
- TrustSlip code and public verification URL
- currentness, expiry, visible band, score note, or evidence label
- witness count or relationship summary when already public-safe
- community confirmation result counts/outcome
- QR/reference/fingerprint
- limitations and next action

Public displays must not show:

- raw private Trust Passport notes
- private contacts or phone numbers
- complete admin evidence history
- private financial account details
- private identity documents
- private marketplace or loan records beyond the released scope
- private community disputes unless explicitly released through a safe outcome
  paper

## Placeholder Rules

Fallback placeholders must never trigger readiness, completion, public proof, or
official evidence language.

If a value is placeholder, say:

- "Not available yet"
- "Not shown"
- "Not enough visible activity yet"
- "Evidence reference pending"
- "Ask for current evidence"
- "Refresh before relying on this"

Do not convert placeholder values into positive states such as "verified",
"ready", "approved", "current", or "confirmed".

## Implementation Order

1. Keep this draft as the shared meaning contract.
2. Create an implementation map of all evidence display components and route
   data sources.
3. Identify duplicated display language that should move into shared helpers.
4. Convert one surface at a time, starting with the highest-risk public surfaces:
   public TrustSlip Verify, Community Verify, Community Member Verify, and
   Confirmation Outcome.
5. Then align signed-in Trust Passport, TrustSlip, Timeline, Finance/Loans,
   Marketplace/Public Shop, and Community Domain.
6. Add route-level audit notes using `docs/APP_WIDE_AUDIT_PROTOCOL.md`.
7. Only after that, consider schema or API changes.

## Acceptance Checklist

Before any evidence display is marked done:

- The route says what the evidence confirms.
- The route says what the evidence does not confirm.
- The route distinguishes current, limited, missing, expired, revoked, private,
  and pending states.
- The route does not expose private evidence to public readers.
- The route has a first safe next action.
- The route does not claim bank, legal, government, escrow, payment, delivery,
  or release authority without real source proof.
- The route uses GSN as the user-facing brand.
- The route keeps Trust Passport and TrustSlip distinct.
- Placeholder data cannot look like real proof.
- The source/maturity level is honest.

## Devil's Advocate

This contract is necessary but not sufficient.

The real work will be proving where each field comes from, which routes can
actually support the contract today, and which surfaces are currently using
local copies of the same truth language. A polished Trust Passport redesign
without this source mapping would still be risky: it could make weak evidence
look official, make private evidence travel too far, or let a public verifier
believe GSN has approved a decision that GSN only helped them judge.

