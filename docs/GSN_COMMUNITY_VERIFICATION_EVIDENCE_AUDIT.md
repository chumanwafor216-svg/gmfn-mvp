# GSN Community Verification Evidence Audit

Status: Route audit draft
Date: 2026-07-05
Scope: Community Verification, Community Member Credential, Community
Confirmation Outcome, and controlled public confirmation request.

## Purpose

This audit records what the public community verification family currently
proves, what it must not imply, and what still needs a route-local guard before
GSN treats these pages as hardened public registry records.

This is a docs-only audit. It does not change frontend code, backend code,
schema, auth, permissions, deployment workflows, Render behavior, or frozen
Dashboard behavior.

## Routes Audited

Frontend routes:

- `/verify/community/:communityKey`
- `/verify/community/:communityKey/member/:memberKey`
- `/community-confirmations/public/:token`

Backend routes:

- `GET /verify/community/{community_key}`
- `GET /verify/community/{community_key}/member/{member_key}`
- `POST /verify/community/{community_key}/confirmation-request`
- `GET /community-confirmations/public/{public_token}`
- signed-in supporting endpoints under `/community-confirmations/...` for
  decisions, request status, review cases, and private review evidence.

## Source Anchors

Frontend:

- `frontend/src/App.tsx`
- `frontend/src/pages/CommunityVerifyPage.tsx`
- `frontend/src/pages/CommunityMemberVerifyPage.tsx`
- `frontend/src/pages/CommunityConfirmationOutcomePage.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/publicLinks.ts`
- `frontend/src/components/TrustDocumentLanguage.tsx`
- `frontend/src/components/TrustPaperMarks.tsx`

Backend:

- `gmfn_backend/app/api/routes/community_confirmations.py`
- `gmfn_backend/app/services/community_confirmation_service.py`

Protocol anchors:

- `docs/TRUST_DOCUMENT_LANGUAGE_PROTOCOL.md`
- `docs/GSN_EVIDENCE_DISPLAY_CONTRACT_DRAFT.md`
- `docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`

## Current Role

This family is the public community-evidence layer:

- Community Verification confirms a public Community ID anchor.
- Community Member Credential confirms a scoped member/community relationship.
- Community Confirmation Outcome confirms a scoped response outcome from
  approved community contacts.

The protocol truth is simple: GSN is communicating what the community record or
community contacts currently know. It is not creating trust, guaranteeing a
future action, or replacing the reader's judgement.

## Surface 1: Community Verification

Route:

- `/verify/community/:communityKey`

Backend source:

- `public_community_verification`

What it can confirm:

- Community ID/code and public community name returned by GSN.
- Current GSN community record status.
- Inferred public community type label.
- Basic or affiliate-acknowledged public face status.
- Parent-community acknowledgement only when an approved active affiliation and
  active parent community are present.
- Public currentness label: active basic record, current parent
  acknowledgement, historical parent acknowledgement, or inactive record.
- Controlled relay availability for requesting a current community
  confirmation.
- Public QR/link back to the same community record.

What it must not confirm:

- Every member, shop, department, line, subgroup, affiliate, or transaction.
- Parent-community approval unless the returned record says it is current.
- Legal registration, formal ownership, paid domain ownership, or regulatory
  status.
- Trust Passport standing for any member.
- Payment, lending, delivery, or release authority.

Confirmed source facts:

- The frontend uses `TrustDocumentRegistryMasthead`,
  `TrustDocumentConfidenceRibbon`, `TrustDocumentBoundaryPanel`,
  `TrustDocumentSecurityPanel`, `TrustDocumentFingerprint`, QR, and GSN paper
  marks.
- The page says it confirms the community identity anchor and does not verify
  every member, shop, line, subgroup, or transaction.
- The backend returns explicit scope fields such as
  `community_public_face_scope`, `community_next_evidence_scope`,
  `community_reader_decision_scope`, `community_evidence_currentness_scope`,
  `domain_evidence_scope`, and `public_limitation`.
- Controlled relay requests are sent through GSN notifications and return
  `private_contacts_exposed: False`.

Devil's advocate:

The page uses "Live check loaded" in its confidence ribbon after loading. That
is acceptable only as a route-load state, not as a claim that every community
fact is freshly audited. A future test should ensure inactive/historical records
do not get green currentness language.

## Surface 2: Community Member Credential

Route:

- `/verify/community/:communityKey/member/:memberKey`

Backend source:

- `public_community_member_verification`

What it can confirm:

- The supplied member reference resolves to a GSN member in the supplied
  community.
- The membership record is active and the member is not activation-pending.
- Public member GSN ID, display label, community code, membership status, and
  role.
- Active witness count from current non-withdrawn member verification records.
- Witness renewal status and currentness label.
- Broad community activity count, latest activity timestamp, and public-safe
  activity categories.
- Community record currentness inherited from the public community record.
- Public QR/link back to the same scoped credential.

What it must not confirm:

- Legal identity or government registration.
- Professional licence, employment status, shop ownership, or subgroup
  authority.
- Full Trust Passport or private member history.
- Private verifier names, contacts, notes, disputes, or raw events.
- Payments, escrow, loans, credit approval, delivery, or future behaviour.
- Membership in another community.

Confirmed source facts:

- The backend refuses inactive communities, missing membership, and
  activation-pending members.
- Witness evidence counts only active, non-withdrawn verification rows where
  verifier and subject remain active community members.
- Current witness rows exclude expired validity windows.
- The backend returns `privacy_note` and `decision_note`.
- The frontend uses Trust Document Language boundary panels and explicitly says
  the credential is community-scoped evidence, not universal trust or automatic
  approval.
- The reference fingerprint is deterministic from visible fields; the frontend
  correctly labels it as a record reference, not legal proof or payment
  approval.

Devil's advocate:

The page defaults status to "active" in some frontend fallback paths. That is
safe only after a real credential record is loaded. A future route test should
prove missing/error states never render the primary credential facts with an
active fallback.

## Surface 3: Community Confirmation Outcome

Route:

- `/community-confirmations/public/:token`

Backend source:

- `public_confirmation_outcome`

What it can confirm:

- The public token resolves to a community confirmation request.
- Request status, mode, reason type, risk level, community name/code, and
  subject public reference when available.
- Created/expiry window and whether the request is expired, closed, cancelled,
  under review, or pending.
- Aggregate response counts from requested contacts: requests sent, responses
  received, confirmed-known count, caution count, and objection count.
- Community confidence label derived from the outcome/summary.
- Privacy-safe requester callback status with masked contact only when the
  requester consented.
- Public QR/link back to the same outcome.

What it must not confirm:

- A whole-community vote or approval by every member.
- Private responder names, contact details, phone numbers, notes, or private
  review material.
- Legal identity, legal promise, government registration, repayment promise, or
  professional status.
- Payment received, bank guarantee, escrow, loan approval, or credit approval.
- Permission to release goods, money, credit, or services.
- Future behaviour or guaranteed outcome.

Confirmed source facts:

- The backend sets `private_contacts_exposed: False` in the public outcome
  response.
- The backend public response includes privacy and decision notes:
  controlled community outcome, no private member phone numbers, evidence for
  judgement only, not guarantee/payment/automatic approval.
- The frontend displays aggregate response counts and explicitly says counts
  are contacts asked, not a whole-community vote.
- The frontend uses boundary panels, confidence ribbon, security panel,
  fingerprint, QR, and decision-boundary sections.
- The frontend only loads signed-in decision and review evidence data when
  `getAccessToken()` is present.

Sharpest risk:

This page currently mixes public outcome paper and signed-in operational tools
in one component. The "Record your decision", request lifecycle, review case,
and private review evidence controls are visible on the same public route and
then rely on signed-in API permissions when used.

That may be acceptable as a product choice, but it is the highest-risk boundary
in this family. A public reader should not mistake operational controls for
public evidence, and a signed-in user should not see private review material
unless the backend authorizes it.

Devil's advocate:

The public outcome page can become too powerful-looking. It has a seal, QR,
confidence ribbon, aggregate counts, and decision controls. Without tests, the
page can drift from "community response evidence" into "release authority" by
presentation alone.

## Public Confirmation Request

Route:

- `POST /verify/community/{community_key}/confirmation-request`

What it does:

- Lets a public viewer request controlled confirmation for a community record.
- Sends notifications to controlled relay recipients.
- Logs a Trust Event:
  `community_verification.confirmation_requested`.
- Returns `private_contacts_exposed: False`.

What it must not do:

- Expose community member contacts.
- Create a member credential by itself.
- Treat a public request as approval, endorsement, or verification of a person.
- Let the requester bypass community governance.

Confirmed source facts:

- The backend requires an active community.
- It fails when no controlled relay recipient is ready.
- The notification message states that private member contacts stay protected.
- The returned message says the request was sent through GSN controlled relay
  and private contacts were not exposed.

## Shared Truth Across The Family

These pages already align with the evidence-display contract better than a
typical app page:

- They use GSN Trust Document Language primitives.
- They include confirms / does-not-confirm boundaries.
- They keep public evidence scoped.
- They repeatedly say evidence is for judgement, not approval.
- They distinguish community record, member credential, and confirmation
  outcome instead of merging them.
- Backend public payloads carry privacy notes, decision notes, scoped fields,
  and aggregate counts.

The biggest product risk is not absence of evidence language. The risk is that
official document styling can make scoped or aggregate evidence feel stronger
than it is.

## Data Source Truth

Canonical public sources:

- `GET /verify/community/{community_key}` for community record.
- `GET /verify/community/{community_key}/member/{member_key}` for member
  credential.
- `GET /community-confirmations/public/{public_token}` for confirmation
  outcome.

Frontend interpretation:

- Each page normalizes backend JSON into local display objects.
- Each page computes deterministic record references from visible fields.
- These references are not cryptographic hashes and not legal proof.
- Fallback labels such as "Recorded in GSN", "active",
  "Witness renewal not started", "No community activity recorded yet", and
  "Protected member reference" must not become stronger evidence than the
  backend source supports.

## Public States To Test

Community Verification:

- missing community key;
- unknown community;
- active basic community record;
- inactive community record;
- current parent acknowledgement;
- historical/non-current parent acknowledgement;
- controlled relay available;
- controlled relay unavailable;
- public confirmation request success;
- public confirmation request blocked because no relay recipient exists.

Community Member Credential:

- missing community/member key;
- unknown member;
- member not in community;
- activation-pending member;
- active membership with no witnesses;
- active membership with current witnesses;
- renewal due soon;
- expired witness validity;
- no community activity;
- community activity present;
- inherited inactive/historical community record currentness.

Community Confirmation Outcome:

- missing token;
- unknown token;
- pending request;
- live response window;
- closed request;
- expired request;
- cancelled request;
- under-review request;
- strong/moderate/limited/caution/no-response confidence;
- zero requested contacts;
- objections present;
- protected subject reference;
- GSN ID subject reference with member credential link;
- requester callback absent;
- requester callback masked;
- public visitor with no access token;
- signed-in user with no decision/review permission;
- signed-in authorized user with decision controls;
- private review evidence present but unauthorized;
- private review evidence authorized.

## Acceptance Checklist For Future Code Work

Before calling this family hardened, prove:

- public community record does not expose member list, private contacts, or
  Trust Passport contents;
- public member credential does not expose verifier names, private contacts,
  private notes, or raw event trails;
- confirmation outcome public payload exposes aggregate counts only;
- `private_contacts_exposed` remains false on public responses;
- inactive, historical, expired, caution, objection, and missing states cannot
  show green "current/verified" styling;
- deterministic fingerprints are labelled as record references only;
- QR links reopen the same public record;
- public routes do not show bottom navigation;
- public visitor view of Confirmation Outcome does not imply signed-in decision
  tools are public evidence;
- signed-in operational controls on Confirmation Outcome are visibly separated
  from the public outcome paper;
- backend permission failures are surfaced as clear "sign in / not allowed"
  guidance rather than generic failure;
- no public route can render private review evidence without backend
  authorization.

## Verdict

Community Verification, Community Member Credential, and Community Confirmation
Outcome already carry strong evidence-boundary language and real backend
privacy controls.

The cleanest public registry record is Community Verification. The cleanest
scoped person/community record is Community Member Credential.

The unabated truth: Community Confirmation Outcome is the next hardening target.
It is valuable, but it blends public record reading with signed-in decision and
private review workflows. That route needs an automated public-vs-signed-in
audit before the family should be called fully hardened.

