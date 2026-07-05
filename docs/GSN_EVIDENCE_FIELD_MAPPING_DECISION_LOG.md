# GSN Evidence Field Mapping Decision Log

Date: 2026-07-05
Status: Local implementation decision log

## Purpose

This document records the first shared decision after the evidence-display
route audits:

- public TrustSlip Verify;
- Community Verify / Community Member Credential / Confirmation Outcome;
- Trust Passport and holder TrustSlip;
- Trust Timeline and evidence pack;
- Finance / Loans;
- Marketplace / Public Shop;
- Community Domain evidence/readiness.

The decision is intentionally conservative: do not add a new runtime schema,
backend schema, or shared display abstraction until the route-local source
fields below are stable enough to justify it.

## Decision

Keep evidence-display meaning route-local for now, but audit these shared
field meanings:

| Field | Shared Meaning | Current Decision |
| --- | --- | --- |
| `evidence_kind` | The type of surface being shown, such as TrustSlip, public community record, confirmation outcome, private timeline, support evidence, trade evidence, public shop context, or Community Domain readiness. | Keep route-local labels. Do not collapse Trust Passport, TrustSlip, Community Verify, Marketplace, Finance, or Community Domain readiness into one generic proof type. |
| `source_engine` | The product engine that produced the display source, such as TrustSlip, Community Confirmation, Trust Events, Community Domain, Marketplace, Finance / Support, Identity, or CCI. | Add display labels only when the route can name the source without overclaiming. Do not infer source engine from visual styling alone. |
| `verification_state` | The state of the underlying source, such as current, expired, revoked, frozen, pending, readiness-only, active, verified, disputed, or not connected. | Preserve backend/source wording. A normalized user label may be added, but the UI must not upgrade pending/readiness/not-connected into verified/current. |
| `visibility` | Who may safely read the display: public, public-safe, signed-in member, holder/private, admin/reviewer, or redacted export. | Keep visibility explicit at each route. Public visual styling does not make private fields public. Signed-in readiness does not become public proof. |
| `provenance` | Where the statement came from: user-submitted, community-witnessed, admin-reviewed, system-derived, Trust Event-backed, backend payload, or frontend fallback. | Do not claim witness/admin/Trust Event provenance unless the payload has that source. Frontend fallbacks must stay fallback language. |
| `excluded_claims` | What the surface does not confirm, such as bank approval, payment movement, payout, auto-debit, legal identity proof, professional licence, escrow, delivery guarantee, goods release, private evidence, member lists, or universal trust. | Keep route-local does-not-confirm copy until repeated language is stable enough for a shared helper. |
| `maturity_label` | Whether the surface is a live record, public proof, private evidence, readiness check, planning view, placeholder, or not connected in this slice. | Keep in docs/audits first. Do not expose to users as a new label until there is a product need. |
| `reference_fingerprint` | A deterministic display reference used to help compare records. | Keep calling it a record/reference fingerprint. Do not call it cryptographic proof unless the backend provides cryptographic verification. |
| `related_trust_event_id` | A concrete Trust Event or evidence record ID attached to the displayed claim. | Show only when the route has an actual ID/source. Do not imply event-backed evidence from summaries or counts alone. |
| `trustslip_eligible` | Whether a surface can point toward a TrustSlip or release flow. | Treat as eligible only when a current TrustSlip code, holder-controlled TrustSlip page, public verify route, or explicit release path exists. Marketplace, Finance, Identity, and Community Domain readiness are not TrustSlip proof by themselves. |

## Route Family Mapping

| Route Family | Evidence Kind | Source Engine | Visibility | Current State Rule | Must Not Claim |
| --- | --- | --- | --- | --- | --- |
| Public TrustSlip Verify | Public-safe current TrustSlip verification | TrustSlip | Public / visibility-filtered | Use current/expired/revoked/frozen/source status from verify payload. | Full private Passport, bank approval, payment movement, auto-debit, goods release, unreleased private evidence. |
| Holder TrustSlip | Portable holder-controlled trust document | TrustSlip | Signed-in holder / shareable holder output | Use holder TrustSlip currentness and code state. | Full private Passport, escrow, payout, banking approval, unrestricted release authority. |
| Trust Passport | Fuller personal trust story | Trust Passport / Trust Events / Community and Finance summaries | Signed-in private | Treat as richer explanation, not as the portable public proof. | Public proof by default, universal reliability, legal identity, bank approval, automatic approval. |
| Trust Timeline / Evidence Pack | Signed-in event trail and redacted evidence export | Trust Events / Evidence Pack | Signed-in private / redacted export | Keep timeline and pack reads auth-bound; exports stay redacted. | Public proof, private contact exposure, goods/money/service release authority. |
| CCI Reading | Cross-community consistency signal | CCI / Trust Events | Signed-in | Keep as consistency signal and score explanation. | Moral character label, universal reliability, credit approval, bank guarantee. |
| Identity and Integrity | Identity continuity and evidence readiness | Identity evidence / Trust Events / auth profile | Signed-in | Identity evidence supports trust; it is not trust itself. | Legal identity proof, professional licence, government ID proof, full trust, payment approval. |
| Community Verify | Public community registry record | Community Confirmation / Community registry | Public | Confirm the community record only. | Member proof, shop proof, parent-community proof, every community claim, private contacts. |
| Community Member Credential | Public-safe member-community relationship | Community Confirmation / Member credential | Public | Confirm scoped member relationship/currentness only. | Legal identity, employment proof, professional licence, private member record. |
| Community Confirmation Outcome | Scoped public confirmation outcome plus signed-in review/admin layer | Community Confirmation | Public outcome / signed-in private actions | Keep public outcome separate from signed-in review evidence and decisions. | Guarantee, payment instruction, automatic approval, private contact exposure. |
| Marketplace / Trade Evidence | Commerce activity context and protected trade evidence | Marketplace / Trust Events where present | Signed-in / private trade record unless released | Treat as evidence rail and context, not custody. | Escrow, payout approval, bank confirmation, delivery guarantee, release authority. |
| Public Shop / Shop Gallery | Public-facing shop context and visible public items | Marketplace / Public Shop | Public context | Shop QR/activity/IDs require current TrustSlip or released evidence before trust reliance. | TrustSlip verification by itself, current member-witness proof, credit/goods release approval. |
| Finance / Support Readiness | Support/loan decision-support evidence | Finance / Loans / Support | Signed-in | Readiness and decision intelligence remain support evidence. | Loan approval, bank approval, payout, auto-debit, payment movement, release authority. |
| Community Domain Evidence Readiness | Institutional setup/readiness/configuration | Community Domain | Signed-in domain member/admin | Readiness/configuration/reporting only unless a release/public proof route exists. | Issued credentials, public proof, TrustSlip/Passport writes, permission changes, money movement, private evidence exposure. |

## Shared Helper Decision

Use existing shared primitives:

- `frontend/src/components/TrustDocumentLanguage.tsx` for official document
  visual grammar: masthead, confidence ribbon, boundary panels, security panel,
  disclosures, and record/reference fingerprint.
- `frontend/src/lib/gsnSnapshotPaper.ts` for compact paper/share packages with
  privacy and limitation notes.
- `frontend/src/lib/trustBandLanguage.ts` for signal-only trust-band language.
- `frontend/src/lib/trustDocumentSnapshots.ts` for current Trust/CCI/Identity
  snapshot copy while it remains route-specific.
- `frontend/src/lib/trustDocumentFamilyMap.ts` for explaining the relationship
  between Identity, CCI, Trust Passport, TrustSlip, and TrustSlip Verify.
- `frontend/src/lib/identityEvidenceCompletion.ts` for identity evidence
  completion, with the existing rule that identity evidence supports trust but
  is not trust itself.

Do not add a new `EvidenceDisplayRecord`, `EvidenceKind`, or backend schema in
this batch. The route audits are still proving the vocabulary.

## Next Safe Step

The next safe implementation step is another audit, not a runtime refactor:

- cage this decision log;
- cage the existing shared primitives listed above;
- verify that no route can claim cryptographic proof, Trust Event provenance,
  public proof, or TrustSlip eligibility from styling, fallback data, counts, or
  readiness alone.

## Unabated Truth

This document is not a product schema, backend contract, database migration, or
proof that every route already emits normalized evidence fields.

It is a decision checkpoint. It prevents premature abstraction and keeps the
system honest while the evidence language stabilizes.
