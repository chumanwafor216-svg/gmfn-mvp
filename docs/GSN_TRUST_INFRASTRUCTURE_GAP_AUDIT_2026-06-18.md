# GSN Trust Infrastructure Gap Audit

Date: 2026-06-18

Status: Strategic gap audit comparing the trust infrastructure GSN should have
against the current MVP surfaces, backend capabilities, and documented product
vision.

Implementation update:

- 2026-06-19: Trust document copied snapshots now ask weak or uncertain
  consistency readings to seek current evidence, not current confirmation. This
  keeps portable evidence language aligned with the doctrine that one
  confirmation is not the same as fresh scoped evidence.
- 2026-06-19: TrustSlip Verify action guidance now says a print carries the
  current public reading, not a public confirmation. This keeps the portable
  verification surface from sounding like a guarantee, approval, or broad
  decision authority.
- 2026-06-19: shared visual snapshot paper cards now use the same fallback
  footer as copied snapshot papers: `Trust infrastructure for organized
  communities`. This prevents evidence previews from falling back to the older
  marketplace-only positioning when a snapshot omits its own footer.
- 2026-06-19: shared copied snapshot papers now end with `Trust
  infrastructure for organized communities` instead of the narrower `Trusted
  marketplace` footer. This moves evidence packages toward the strategic GSN
  framing without changing their data or authority.
- 2026-06-19: Trust Passport copied snapshots now use the shared
  `buildGsnSnapshotPaper` helper instead of a separate hand-built headed-paper
  string. This reduces drift across Identity, CCI, TrustSlip, TrustSlip Verify,
  and Trust Passport copy packages, but it does not finish all copy/share/PDF
  evidence packaging.
- 2026-06-19: Marketplace `Trusted Trade` now tells the user to open the shop
  record for current evidence before trade, credit, goods, or money move. This
  keeps the marketplace lane trust-first without turning it into a full
  TrustSlip/member credential surface.
- 2026-06-19: Public Shop `Shop verification` now includes a buyer-facing
  trade boundary: before credit, goods, or money move, read shop ID,
  Community ID, current TrustSlip, and community confirmation together. It also
  states that the panel is evidence for judgement, not approval to release
  goods or credit.
- 2026-06-19: public Community Verification now exposes an inferred
  `community_type`, `community_type_label`, and `community_type_source` from
  existing public community text. This closes part of the public-face
  presentation gap, but it is not a schema-backed official community type,
  CAC-backed trust claim, protected-domain ownership evidence, or measured
  type-specific intelligence.
- 2026-06-19: public Community Verification now exposes a scoped
  `community_public_face_status`, `community_public_face_label`, and
  `community_public_face_scope`. This makes the current public page read more
  like a community public face while explicitly saying it is not a full
  community profile, member list, service guarantee, or community health
  report.
- 2026-06-19: public Community Verification now exposes
  `community_next_evidence_label` and `community_next_evidence_scope`, telling
  visitors to ask for a scoped member credential, TrustSlip, acknowledged affiliate
  record, or controlled community confirmation before relying on a person,
  shop, line, or subgroup claim. This is workflow guidance, not a new approval
  or guarantee.
- 2026-06-19: public Community Verification now exposes
  `community_record_started_at`, `community_record_started_label`, and
  `community_record_started_scope`. This lets the public page say when the
  community record entered GSN, while explicitly saying it is not the
  real-world founding or formal-registration date.
- 2026-06-19: public Community Verification now exposes
  `community_mobility_label` and `community_mobility_scope`, framing the
  Community ID as a portable anchor for scoped member credentials, TrustSlips,
  acknowledged affiliate records, or controlled confirmations. This supports the
  trust-mobility story without claiming the Community ID alone transfers trust
  or approves a transaction.
- 2026-06-19: public Community Verification no-claim affiliate language now
  says `No parent-domain affiliate claim on this record` and asks for a
  separate parent-domain acknowledgement record. Internal compatibility fields
  still use `official_affiliate_*`, but the reader-facing meaning is scoped to
  parent-domain acknowledgement, not legal or blanket official certification.
- 2026-06-19: Community Confirmation Policy operator copy now says a parent
  Community ID Domain must acknowledge a group before GSN shows it as a
  `parent-domain acknowledged affiliate`. This keeps the signed-in admin lane
  aligned with the public reader boundary and avoids making the relationship
  sound like broad legal or blanket official certification.
- 2026-06-19: Community Confirmation Policy no-member helper now says the lane
  records `member-backed witness evidence`, not `member-backed community
  verification`. This keeps one member-witness event from reading like full
  member, shop, subgroup, or parent-domain verification.
- 2026-06-19: Verified Community Domain doctrine now avoids broad `official`
  status language for groups, affiliates, custodians, parent bodies,
  association standing, umbrella recognition, and membership credentials. It
  now uses protected-domain and parent-domain acknowledgement wording so the
  commercial package stays anchored to GSN records, not legal/political
  certification.
- 2026-06-19: Verified Community Domain doctrine now separates internal group
  belonging/witness records from protected-domain membership credentials.
  Internal groups can record local belonging evidence, but they do not issue
  protected parent-community credentials by themselves.
- 2026-06-19: The verified-domain spec final doctrine and market-entry
  playbook now close with the same safer model: personal identity evidence,
  internal belonging evidence, parent-domain acknowledged affiliation, and
  protected membership credentials. The closing summary no longer says
  personal verification, internal group verification, official standing, or
  official membership credential.
- 2026-06-19: public Community Verification now exposes
  `community_reader_decision_label` and `community_reader_decision_scope`,
  making the outside-reader boundary explicit: the record is useful as a first
  check, but serious trade, lending, membership, shop, line, welfare, or
  affiliate decisions still need current scoped evidence before action.
- 2026-06-19: public Community Member Verification now exposes
  `community_trust_reading_label` and `community_trust_reading_scope`, reading
  active membership, witness strength, renewal status, and broad community
  activity together as community-scoped evidence for judgement. It is not a
  universal trust score, guarantee, credit approval, or transaction permission.
- 2026-06-19: public Community Member Verification now exposes
  `membership_currentness_label` and `membership_currentness_scope`, turning
  the renewal clock into a reader-friendly currentness note. The public
  credential can now distinguish current witness windows, renewal due, expired
  witness evidence, and witness renewal not started without exposing private
  verifier details.
- 2026-06-19: TrustSlip payloads and TrustSlip Verify public paper now carry
  the same `membership_currentness_label` and
  `membership_currentness_scope`. This keeps portable TrustSlip evidence aligned
  with annual community-member witness renewal, without turning the TrustSlip
  into approval, guarantee, or a substitute for live community confirmation.
- 2026-06-19: the signed-in TrustSlip page now reads the same membership
  currentness fields and shows them in the holder/reader view. This lets a
  member see whether their community-witness evidence is current, due, expired,
  or not started before they share the TrustSlip outside the community.
- 2026-06-19: Trust Passport now reads the same membership currentness fields
  from TrustSlip context, shows them in the Community Confirmation lane, and
  includes them in copied Trust Passport snapshots. This keeps the fuller
  private trust story aligned with portable TrustSlip and public member
  credential evidence.
- 2026-06-19: Marketplace `Local Marketplace Trust` now carries an explicit
  boundary that member-level witness currentness belongs in fuller evidence
  routes, not the local marketplace summary. This keeps trusted commerce
  trust-first without pretending the compact marketplace trust pill is a member
  credential freshness surface.
- 2026-06-19: Public Shop `Shop verification` now states that shop and
  community IDs do not show member-witness currentness by themselves. This keeps
  the buyer-facing shop surface from treating ID presence as fresh seller
  community evidence.
- 2026-06-19: public Community Confirmation outcome now states that responses
  are counted against the contacts asked, not as a whole-community vote. The
  pending reading now says requested contacts responded instead of implying the
  whole active community responded.
- 2026-06-19: public Community Confirmation limitation language now says the
  outcome is linked to a recorded GSN community record and explicitly adds `Not
  a whole-community vote.` This keeps the public paper from sounding like a
  community-wide decision or stronger real-world certification.
- 2026-06-19: `CommunityConfirmationPolicyPage` witness request review now
  states that approving a request records one witness event, not parent-domain
  approval or a guarantee for every claim. This keeps member-witness evidence
  separate from official domain authority.
- 2026-06-19: `CommunityConfirmationPolicyPage` current witness strength now
  states that witness strength is current only while witness records remain
  active and inside their validity window. Expired, withdrawn, or disputed
  witness records should be treated as weaker evidence until renewed.
- 2026-06-19: `CommunityConfirmationInboxPage` review cases now state that a
  review resolution changes GSN's trust reading only, not parent-domain
  certification, legal approval, or permission to release goods, credit, or
  money. The visible resolution label now says `No issue found` instead of
  `Confirmed clean`.
- 2026-06-19: `CommunityConfirmationInboxPage` responder cards now say
  `Answer about {member}` and `Can support` instead of certification-like
  `Confirm {member}` / `Can confirm`. The responder lane now states that an
  answer records personal knowledge, not parent-domain certification or a
  whole-community vote.
- 2026-06-19: `CommunityMemberVerifyPage` public member credentials now avoid
  a broad `Confirmed` reading card and instead say `Record shown`. The public
  reading now states that scoped membership evidence does not certify shop,
  line, subgroup, payment, loan, or parent-domain approval claims.
- 2026-06-19: `DemandBoxPage` trust-credit wording now says `Open to trust
  credit` instead of `Trust credit allowed`. The responder guidance says
  trust-credit openness is a request preference, not approval to release goods,
  credit, or money.
- 2026-06-19: `LoanReadinessPage` and `LoanSuggestionsPage` now state that
  readiness and fit suggestions are decision support only, not loan approval,
  guarantor approval, or permission to release goods, credit, or money.
- 2026-06-19: `GuarantorInboxPage` now scopes guarantor approval as an
  `Approve pledge` response only. The page states that approving there does not
  approve the whole loan or authorize release of goods, credit, or money.
- 2026-06-19: `LoanWorkbenchPage` now states that workbench readings and
  suggested pledges are decision support only, not loan approval, guarantor
  approval, or release authority. Suggested-guarantor history now says `Past
  pledge approvals` instead of broad `Approved`.
- 2026-06-19: `RepaymentPage` now states that declaring or preparing a
  repayment does not confirm money received, close a loan, or release guarantor
  exposure. Full-balance and result guidance now keep closure/release authority
  with admin or finance reconciliation.
- 2026-06-19: `LoanSummaryPage` now scopes guarantor row approvals as
  guarantor pledge decisions only. Success feedback and the row guide state
  that this is not whole-loan approval or release authority, and visible counts
  now say `Approved pledges`.
- 2026-06-19: `LoanSummaryPage` revenue allocation figures now say they are
  preview-only, not payment instruction, settlement confirmation, or evidence
  that money moved. Net-disbursed figures now say `Net disbursed preview`.
- 2026-06-19: `PaymentInstructionsPage` now frames `Confirm paid` as `Declare
  paid`. The page states that a member declaration does not confirm money
  received, and that reconciliation or matched events confirm the money trail.
- 2026-06-19: `RevenueAllocationPage` now frames allocation figures as returned
  allocation readings only. Net-disbursed labels now say `Net disbursed
  preview`, and the page states that allocation readings are not payment
  instruction, settlement confirmation, or evidence that money moved.
- 2026-06-19: `FinancePage` now scopes payment confirmation as finance
  confirmation. Expected-payment states, reconciliation badges, dates, and
  money-event history now say `Finance confirmed`, and next-action guidance no
  longer treats a confirmed finance record as broad service entitlement.
- 2026-06-19: `FinancePage` now scopes guarantor release totals as release
  records/readings. The page states that Finance reports the record and does
  not release exposure by itself, so release figures are not mistaken for
  route-level authority, loan closure, or money movement.
- 2026-06-19: `WithdrawalInstructionsPage` now scopes a direct withdrawal as a
  recorded request. Community confirmation is framed as review evidence, while
  payout execution and money movement remain separate and are not completed by
  the route itself.
- 2026-06-19: `PayoutDetailsPage` now scopes saved bank/wallet details as a
  destination record for the Money Out route. A ready destination record is not
  withdrawal approval, payout execution, or evidence that money moved.
- 2026-06-19: `VaultControlPage` now separates quote agreement from payment
  confirmation. Agreeing to a Vault quote prepares the payment-code path, but
  Vault blocks become available only after payment confirmation through the
  payment/finance record.
- 2026-06-19: `PaymentRailsPage` now scopes rail status as read-only
  intelligence. Status-active rails are not payment approval, settlement
  confirmation, or evidence that money moved; they only help users choose the
  guided Money In or Money Out route.
- 2026-06-19: `GuarantorEarningsPage` now scopes visible guarantor earnings as
  recorded earned value and closed-support records. The page keeps the Money
  Out boundary explicit: recorded value is not automatic payout, settlement
  confirmation, or evidence that money moved.
- 2026-06-19: `SystemOperationsPage` now scopes admin finance/support queues as
  operational review readings. Unmatched bank, pool, expected-payment, and
  incomplete-loan signals no longer read as final settlement, payment
  confirmation, or broad loan approval.
- 2026-06-19: `BankConsolePage` now scopes reconciliation as a recorded
  matching review. Finance-confirmed counts and matched records do not by
  themselves mean settlement completion or evidence that money moved.
- 2026-06-19: `AdminIncompleteLoansPage` now scopes incomplete support items
  as pledge-decision and locked-pledge-coverage review. Missing pledge
  decisions do not mean whole-loan approval, release authority, or money
  movement.
- 2026-06-19: `ExposureAdminPage` and `ExposurePage` now scope exposure as a
  risk/concentration reading from recorded pledge coverage and release records.
  Exposure is not settlement, release authority, or evidence that money moved.
- 2026-06-19: `CommunityConfirmationOutcomePage` now displays provider
  follow-up `settled` status as `Resolved`. A provider decision can be resolved
  on the evidence trail without implying financial settlement or final truth
  for every claim.
- 2026-06-19: `DemandBoxPage` now describes non-finance demand closure as a
  resolved need, not a settled need. This keeps marketplace request language
  separate from payment or settlement language.
- 2026-06-19: `TrustCommandCentrePage` now scopes executive admin readings as
  checks, pledge progress, exposure readings, and buffer signals. It avoids
  broad confirmation, approval-progress, and exposed-person wording in the
  overview.
- 2026-06-19: `CommunityConfirmationPolicyPage` now presents the member
  witness request lane as a verifier response/record, not broad approval.
  Visible copy now says witness response, response link, response package,
  record witness, and scan to respond while leaving backend compatibility
  untouched.
- 2026-06-19: `CommunityConfirmationPolicyPage` now presents the broader
  member-witness lane as witness records and witness strength, not blanket
  member verification. The UI now says member witness records, member for
  witness, ask for witness, and paid member-witness packages.
- 2026-06-19: `CommunityConfirmationPolicyPage` now presents parent-domain
  affiliate acceptance as acknowledgement rather than broad approval. Visible
  copy now says acknowledged affiliate, acknowledgement, acknowledge only
  groups, and acknowledge action while keeping the internal decision contract
  unchanged.
- 2026-06-19: public Community Verification payloads and fallbacks now ask for
  acknowledged affiliate records rather than approved affiliate records. The
  public affiliate label now says `Acknowledged affiliate under parent domain`
  while the internal status value remains compatible.

Companion document:

- `docs/GSN_REFRAME_WORKSHOP_AND_MARKET_ENTRY_PLAYBOOK_2026-06-18.md`
- `docs/GSN_VERIFIED_COMMUNITY_DOMAIN_SPEC_2026-06-18.md`

Primary source truth checked:

- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`
- `docs/FRONTEND_ENDPOINT_EXPOSURE_AUDIT.md`
- `docs/INSTITUTIONAL_EVIDENCE_SURFACE_INVENTORY.md`
- `docs/GSN_COMMUNITY_CONFIRMATION_RELAY_PROTOCOL_2026-05-15.md`
- `docs/GSN_INSTANT_COMMUNITY_CONFIRMATION_PROTOCOL_2026-05-15.md`
- `frontend/src/App.tsx`
- `frontend/src/pages/CommunityVerifyPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `frontend/src/pages/ShopGalleryPage.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/gsnSnapshotPaper.ts`
- `frontend/src/lib/trustDocumentSnapshots.ts`
- `gmfn_backend/app/api/router.py`
- `gmfn_backend/app/api/routes/community_confirmations.py`
- `gmfn_backend/app/api/routes/community_integrity.py`
- `gmfn_backend/app/api/routes/trust_slips.py`
- `gmfn_backend/app/services/community_confirmation_service.py`
- `gmfn_backend/app/services/trust_slips_services.py`
- `gmfn_backend/app/services/liquidity_engine_service.py`
- `gmfn_backend/app/services/loan_readiness_service.py`
- `gmfn_backend/app/services/loan_decision_intelligence_service.py`
- `gmfn_backend/app/db/models.py`

Unabated truth: the current MVP already has a lot of trust infrastructure. The
gap is not "we have no product." The gap is that the strongest infrastructure is
unevenly distributed: the personal TrustSlip/Trust Passport layer is much
stronger than the outside-facing community-institution layer.

New product anchor added after the first gap pass:

**GSN Verified Community Domain**

This means the highest-priority community gap is now more precise. GSN must
distinguish free public join, personal identity verification, internal group
membership, parent-domain group affiliation, and official community membership
credentials. The current MVP has ingredients for this, but not the complete
community-domain workflow, pricing model, renewal model, verifier limits, or
public evidence language.

CAC/company-registration correction:

- CAC or external company-registration details should be recorded as supporting
  evidence, not treated as GSN verification.
- CAC can support a domain claim review, but it does not prove active
  community consent, current leadership, shop ownership, line membership, or
  member belonging.
- Public community evidence should use GSN Community ID, affiliation status,
  membership credentials, witness evidence, renewal, disputes, and audit trail;
  it should not expose raw CAC numbers or make CAC the record anchor.

## 1. Gap Scale

Use this scale:

- **Built**: capability exists in code and is exposed in active routes.
- **Partly built**: core route/service exists, but presentation, data depth, or
  user workflow is incomplete.
- **Documented but thin**: product protocol exists, but implementation is only
  partial or indirect.
- **Missing**: no reliable route/data/workflow found in current checked scope.
- **Do not claim yet**: possible future/investor/policy story, but current MVP
  cannot responsibly prove it.

## 2. Executive Gap Verdict

The should-have trust infrastructure can be summarized as:

1. stable personal identity
2. portable personal trust evidence
3. recorded and protected community identity
4. community-level trust and health
5. community operating records
6. trust-backed commerce
7. controlled public evidence and confirmation
8. institutional-grade evidence packages
9. market-specific adoption story

Current MVP status:

| Trust infrastructure requirement | Current status | Gap severity | Brutal truth |
| --- | --- | --- | --- |
| Stable member identity | Built | Low | The one-member-ID spine exists conceptually and is used across trust, shop, finance, and routes. |
| Stable community identity | Built | Low | Community ID/code/status exist, but public meaning is still thin. |
| Personal Trust Passport | Built | Low/medium | Strong surface, but must stay connected to community evidence and not become a vague score. |
| TrustSlip portable evidence | Built | Low/medium | Strongest layer. Must keep limitation language and live/currentness clear. |
| Public TrustSlip verification | Built | Low | Public route and paper-like frontend exist. Visual QA still matters. |
| Community public verification | Partly built | High | Route exists, but the community institution evidence is too thin for the strategic claim. |
| Community trust summary | Partly built | High | Some fields/services exist, but no complete public or member-facing institutional trust summary. |
| Community health/reputation | Partly built | High | Liquidity/risk/confirmation data exists, but there is no simple community-health product surface yet. |
| Community type classification | Missing | High | Needed for church/market/cooperative/town union strategy and policy comparison. |
| External registration record | Missing/thin | Medium | CAC/company-registration should be recorded as supporting evidence only, not verification or a public ID formula. |
| Community operating records | Built/partly built | Medium | Finance, loans, confirmation, marketplace, support, and payment records exist, but story is fragmented. |
| Trusted commerce | Built/partly built | Medium | Shop, Spotlight, Demand, Vault, public shop, and verification exist. The trust-first framing still needs tightening. |
| Instant/live community confirmation | Documented and partly built | High | Community confirmation request/outcome exists; instant response-count mode is not fully proven as described. |
| Institutional evidence packages | Partly built | Medium/high | Snapshot helpers exist and some surfaces are polished. Many copy/share/payment/link surfaces still need official paper treatment. |
| Market-entry adoption playbooks | Documented | Medium | Strategic playbook exists; per-market one-page briefs and pilot scripts still need to be produced. |
| Policy/investor claims by community type | Do not claim yet | Critical | Current code does not classify community types or provide measured pilot outcomes. |

## 3. Layer-By-Layer Gap

### Layer 1 - Personal Trust Layer

Should have:

- one stable member identity
- identity status
- verification evidence
- Trust Passport
- TrustSlip
- trust events
- reputation/history
- community membership context
- repair path and limitation language

What we already have:

- `/app/identity` via `IdentityIntegrityPage`
- `/app/trust` via `TrustScorePage`
- `/app/trust-slip` via `TrustSlipPage`
- `/t/:code` and `/trust-slips/verify/:code` via `TrustSlipVerifyPage`
- backend trust routes including `trust_slips.py`, `trust_score.py`,
  `trust_events.py`, `trust_graph.py`, `trust_timeline.py`, and evidence pack
  services
- TrustSlip payload includes community context, CCI, sponsor count, active
  community count, risk flags, evidence summary, identity evidence, visibility
  levels, expiry/currentness, and disclaimer language
- frontend copy repeatedly distinguishes Trust Passport from TrustSlip

Gap:

- not every evidence/copy/export surface has the same official headed-paper
  treatment
- Trust Passport, TrustSlip, CCI, and identity are strong, but a new user can
  still experience them as separate pages unless the journey explains the
  evidence chain
- repair paths and negative evidence need continued care so trust does not feel
  like permanent judgement

Minimum adjustment:

1. Keep Trust Passport as the full private story.
2. Keep TrustSlip as portable current evidence.
3. Finish official snapshot/paper consistency for Identity, CCI, TrustSlip,
   TrustSlip Verify, and Trust Passport copy/export behavior.
4. Add page/audit language that always explains what is evidence, what is
   current, what is private, and what is not guaranteed.

Severity:

Medium, because the core layer is built but evidence packaging consistency still
matters for trust.

### Layer 2 - Community Trust Layer

Should have:

- community ID
- community public face
- community type
- community status
- verification policy
- community trust summary
- community reputation or standing
- community health
- public verification page
- controlled confirmation request
- privacy-safe contact/relay

What we already have:

- `Clan` has `community_code` and `status`
- community membership, invite, join request, vote, and activation models exist
- `/verify/community/:communityKey` frontend route exists
- backend `/verify/community/{community_key}` exists in
  `community_confirmations.py`
- `CommunityVerifyPage` shows community name, ID/code, status, public record,
  relay availability, copy link, and request confirmation
- backend `public_community_verification(...)` returns name, ID, code, status,
  `public_record`, `member_confirmation`, summary, relay availability, and
  confirmation request availability
- confirmation request/outcome/inbox/review/policy routes exist

Gap:

- no confirmed community type field was found in the checked core `Clan` model
- public page does not yet show full community profile, category, public
  description, services/functions, approximate member strength bands, years
  active, completed verification counts, response health, or public policy in a
  complete institution-grade way
- community trust summary is scattered between confirmation, membership,
  liquidity, CCI, and operational data
- community reputation/health exists as raw ingredients, not as a clean product
  concept

Minimum adjustment:

1. Treat this as the top strategic product gap.
2. First improve presentation around existing community verification:
   community name, ID/code, status, relay availability, privacy boundary, and
   what the public record can/cannot prove.
3. Add a documented "Community Public Face" spec before adding fields.
4. Later add data fields for community type, public description, operating area
   at privacy-safe precision, public service categories, years active, response
   health, and safe public statistics.

Severity:

High. This is the missing bridge between "member has evidence" and "the community
behind the evidence is trusted."

### Layer 3 - Community Operating Layer

Should have:

- operating records for contributions, support, ROSCA, finance, requests,
  welfare, repayment, guarantees, and community decisions
- community-specific marketplace operations
- local truth inside one community
- cumulative reading across communities where appropriate

What we already have:

- Marketplace route: `/app/marketplace`
- Finance route: `/app/finance`
- Loans/support routes: `/app/loans`, `/app/loan-readiness`,
  `/app/loan-suggestions`, `/app/loan-workbench`, `/app/loan-summary/:loanId`,
  `/app/payment/loans/:loanId`
- payment instructions, payment rails, withdrawal, payout details
- backend liquidity profile and clan liquidity snapshot services
- backend loan readiness and loan decision intelligence
- ROSCA-related controls are present in operational shop/control code
- community confirmation and review cases create records and events

Gap:

- operating records are real but spread across many pages
- user may see "finance," "loans," "support," "shop," and "payment" as
  separate tools instead of evidence streams inside organized community
  operations
- group-level finance/trust rollups are sensitive and not yet consistently
  presented as safe community health summaries

Minimum adjustment:

1. Create a simple "community operating evidence" vocabulary:
   membership, contribution, support, repayment, shop/trade, confirmation.
2. On major pages, describe actions as records that strengthen or weaken trust
   evidence.
3. Keep private member financial details out of public community rollups.

Severity:

Medium. Logic exists, but interpretation and information architecture still
need tightening.

### Layer 4 - Trusted Commerce Layer

Should have:

- member-owned public shop
- marketplace/community context
- trust evidence before trade
- TrustSlip request/check
- public shop verification
- Demand and Spotlight
- private Vault links
- public/private boundaries
- payment/merchant verification where relevant

What we already have:

- `/app/marketplace`
- `/app/shop-control`
- `/app/shop-assets`
- `/shop/:gmfnId`
- `/vault/:token`
- Spotlight and Subscription Spotlight routes/controls
- Demand Box
- Public Shop verification panel with GSN ID, community context, QR/scan path,
  request TrustSlip, and community record options
- `gsnSnapshotPaper.ts` already has GSN Public Shop Invitation, Vault
  Invitation, payment, support, community verify, and invite package helpers
- backend marketplace/shop/Vault/public shop APIs are surfaced

Gap:

- Marketplace can still be read as commerce first rather than trusted community
  commerce
- Public Shop has stronger trust packaging than many internal marketplace link
  centers, but it still depends on the visitor noticing the verification panel
- merchant verification exists, but the product boundary between TrustSlip
  public verify, merchant verify subscription, and shop verification needs a
  sharper user story
- not every shop/invite/link/payment package is consistently official-paper
  styled

Minimum adjustment:

1. Make Marketplace first-screen framing trust-first without changing route
   contracts or protected button geometry.
2. Keep Public Shop verification visible but compact.
3. Use headed-paper/link-package helpers consistently for copied shop, invite,
   Vault, payment, and support packages.
4. Write a plain "before goods/money move" trust-check script for pilots.

Severity:

Medium. The machinery exists, but the strategic identity is easy to miss.

### Layer 5 - Trust Mobility Layer

Should have:

- Trust Passport for full story
- TrustSlip for portable current evidence
- public verification
- community verification
- community confirmation relay
- public shop link
- Vault/private access link
- evidence packages that can travel by link, QR, copy, screenshot, and print

What we already have:

- TrustSlip signed-in and public verification routes
- backend TrustSlip verify JSON, page, lite, print, QR, share bundle, release,
  revoke, freeze, extend, and reissue flows
- Community verification and confirmation request/outcome routes
- Public Shop links
- Vault access links
- GSN headed-paper snapshot helper and multiple specialized package builders
- institutional evidence surface inventory and backend PDF services

Gap:

- public community verification is weaker than public TrustSlip verification
- instant community confirmation is documented more richly than the current
  visible product experience proves
- evidence surfaces are inconsistent: some are strong paper-like experiences,
  others are still plain text or link packages
- portability narrative is not frontloaded enough in onboarding/adoption

Minimum adjustment:

1. Prioritize public community verification and confirmation outcomes after
   TrustSlip.
2. Create one unified "trust travels" evidence path:
   Community Home -> Trust Passport -> TrustSlip -> Public Verify ->
   Community Verify -> Public Shop/Vault where relevant.
3. Convert high-priority copy/share surfaces to GSN headed-paper output.

Severity:

Medium/high. The personal evidence travels; the community institution evidence and
evidence-package consistency still lag behind.

## 4. Should-Have Versus Already-Have Matrix

| Should-have capability | Already have | Exact current anchor | Gap |
| --- | --- | --- | --- |
| One global member ID | Yes | canonical docs, user/TrustSlip/shop flows | Presentation must keep this visible without renaming internal contracts. |
| One global community ID | Yes | `Clan.community_code`, community routes, community verify | Needs stronger public explanation and more institution profile fields. |
| Community type | No reliable core field found | none confirmed in `Clan` during this audit | Add only after data model/privacy review. |
| Community public profile | Partial | `/verify/community/:communityKey`, `CommunityVerifyPage` | Too thin: needs type, description, services, safe stats, policy, years/response health. |
| Community verification | Yes/partial | backend `/verify/community/{community_key}`, frontend public page | Exists, but must become institution-grade evidence surface. |
| Community confirmation relay | Partial | `community_confirmations.py`, confirmation inbox/outcome/request | Rich protocol exists; instant/live response-count UX is not fully proven. |
| Community health | Partial | liquidity snapshot, risk flags, confirmation summary | Raw ingredients exist; no clean public/member community health summary. |
| Community reputation | Partial | trust events, confirmation, membership, liquidity, CCI | No unified "community reputation" product surface. |
| Member Trust Passport | Yes | `/app/trust`, trust services | Strong but needs continuous evidence-story discipline. |
| TrustSlip | Yes | `/app/trust-slip`, backend `trust_slips.py` | Strong but needs no-overclaim guardrails. |
| Public TrustSlip verify | Yes | `/t/:code`, `/trust-slips/verify/:code`, public paper component | Strong; visual/runtime QA still matters. |
| Merchant verification | Partial | backend mounted, TrustSlip verify/public shop references | Needs clearer active-page journey and subscription boundary. |
| Marketplace trusted commerce | Yes/partial | Marketplace, Public Shop, Demand, Spotlight, Vault | Needs trust-first hierarchy and evidence packaging consistency. |
| ROSCA/contribution evidence | Partial | operational controls and expected payment discipline | Needs clear evidence-stream framing, not app-category framing. |
| Finance as trust evidence | Yes/partial | Finance, expected payments, liquidity, loan readiness | Strong backend logic, but user-facing story can still feel like money admin. |
| Institutional evidence papers | Partial | TrustSlip public paper, snapshot helpers, PDF services | Some strong, many remaining copy/share/payment surfaces unfinished. |
| Market adoption playbooks | Partial | reframe playbook doc | Need one-page briefs and pilot scripts by market. |
| Policy comparison by community type | Not yet | innovation doc says this is future work | Do not claim until community type data and measured outcomes exist. |

## 5. Priority Gap List

### P0 - Do Not Overclaim

Problem:

The trust-infrastructure story is powerful enough to tempt overstatement.

Current risk:

- claiming policy impact before pilot evidence
- implying TrustSlip is a guarantee
- implying community verification means full community endorsement
- implying merchant verification is active everywhere
- implying community type insights without type data

Minimum action:

Keep every public/investor/pilot artifact separated into:

- confirmed current capability
- pilot evidence
- measured result
- inference
- future vision

### P1 - Community Public Face

Problem:

The current public community verification page proves a community record exists,
but it does not yet make the community feel like a trusted institution.

Already there:

- public community route
- GSN paper-like page
- community name/ID/status
- controlled confirmation request
- privacy boundary

Missing/thin:

- community type
- public description
- operating area at safe precision
- services/functions
- years active
- member strength band
- completed verifications
- response/relay health
- public verification policy
- safe community health summary

Minimum next step:

Use `docs/GSN_COMMUNITY_PUBLIC_FACE_SPEC_2026-06-19.md` as the contract, then
implement the current public community verification page against existing data
before adding new fields.

### P1 - Community Trust Summary

Problem:

Community trust currently lives in fragments: membership, confirmation, CCI,
liquidity, active member count, risk flags, and trust events.

Already there:

- confirmation summary
- clan liquidity snapshot
- community fields in TrustSlip
- Community Home fields for trust/finance health

Missing/thin:

- one product-level "community trust summary" contract
- safe separation between public summary, member summary, and admin/internal
  detail
- plain language explaining what the community can and cannot verify

Minimum next step:

Define three views:

- public community evidence
- signed-in member community summary
- admin/internal community evidence

### P1 - Instant Community Confirmation

Problem:

The protocol describes response-count based live confirmation. Current code has
request, inbox, outcome, review, policy, and public request surfaces, but the
exact "5 requests sent, 3 responses received, 2 confirmed..." public experience
is not yet proven as complete.

Already there:

- controlled relay request
- confirmation inbox
- public outcome
- review cases/evidence
- policy/contact settings
- privacy note

Missing/thin:

- clear instant/live mode UX
- response-count public outcome exactly as protocol describes
- explicit risk-band/amount-band display in the public path
- visible "not everyone voted" language where needed

Minimum next step:

Audit Community Confirmation screens against
`GSN_INSTANT_COMMUNITY_CONFIRMATION_PROTOCOL_2026-05-15.md` before writing new
logic.

### P2 - Trust-First Marketplace

Problem:

Marketplace works, but the strategic first impression can still be "commerce
tools" rather than "trusted community commerce."

Already there:

- shop, public shop, Demand, Spotlight, Vault, marketplace invite/context
- TrustSlip linkages
- public shop verification panel

Missing/thin:

- first-screen trust framing
- clear "before goods/money move" workflow
- consistent evidence packages for every copied shop/invite/payment link

Minimum next step:

Adjust copy/hierarchy only after respecting Marketplace and protected button
audits. Do not redesign the route.

### P2 - Evidence Package Consistency

Problem:

GSN's evidence value weakens when one surface looks official and another copy
package looks raw.

Already there:

- `buildGsnSnapshotPaper`
- TrustSlip/TrustSlip Verify snapshot builders
- community verify, invite, shop, Vault, payment, support package helpers
- institutional evidence inventory

Missing/thin:

- every copy/share/print/PDF route using the same standard
- visual QA of backend PDFs
- audit that catches new copy/share surfaces without paper treatment

Minimum next step:

Use the implementation order already defined in
`docs/INSTITUTIONAL_EVIDENCE_SURFACE_INVENTORY.md`.

### P2 - Community-First Onboarding

Problem:

The growth story says "communities adopt GSN," but entry surfaces can still
look like ordinary app signup/join flows.

Already there:

- `/cover`, `/create`, `/join`, invite routes, approval routes, activation
- create community versus join existing community separation

Missing/thin:

- explicit community-adoption framing
- target-market language for founder/organizer flows
- adoption material for churches, markets, cooperatives, town unions, and
  societies

Minimum next step:

Create no-code one-page adoption briefs first. Then decide whether onboarding
copy needs small route-local changes.

### P3 - Community Type And Market Intelligence

Problem:

The strategic playbook depends on community categories, but current core data
does not yet prove type-specific analysis.

Already there:

- finance/trust/liquidity/CCI records can support future analysis
- innovation logic documents the future use

Missing:

- community type field
- responsible taxonomy
- minimum sample thresholds
- bias/appeal policy
- measured pilot evidence

Minimum next step:

Do not add dashboards or investor claims yet. First define the taxonomy and
privacy rules.

## 6. Completion Ledger

Use this ledger to prevent confusion between doctrine cleanup and finished
product capability.

| Area | Current completion reading | What is actually done | What still remains |
| --- | --- | --- | --- |
| Overclaim guardrails | Mostly closed for current trust surfaces | Public/admin wording now separates evidence, witness records, protected credentials, parent-domain acknowledgement, TrustSlip limits, and non-guarantee boundaries. Audits catch the most dangerous old phrases. | Keep extending audits when new trust, finance, commerce, or adoption copy is added. |
| Personal trust layer | Strong but still needs discipline | Trust Passport, TrustSlip, public verify, currentness, identity evidence, and copied snapshots are built and repeatedly framed as evidence. Trust Passport copied snapshots now use the shared headed-paper helper instead of a separate hand-built format. | Keep avoiding universal score/guarantee language and keep QA on public paper/share surfaces. |
| Community public face | Partially built, not complete | Public community verify exists with Community ID, status, public face notes, next evidence, trust mobility, reader decision, affiliate acknowledgement, and privacy boundaries. `docs/GSN_COMMUNITY_PUBLIC_FACE_SPEC_2026-06-19.md` defines the public/member/admin target, anchor rule, CAC boundary, privacy limits, and no-score guardrails. `CommunityVerifyPage` now places a visible Community ID anchor band near the top, leads the public reading with the Community ID trust anchor, follows the public-face reading order, explains the controlled-confirmation action/unavailable state, separates the public community anchor from person/shop/line/subgroup/affiliate claims, and adds a compact public/member/admin privacy boundary. | Still needs full route QA against the spec, broader visual QA on real public records, and later safe fields for type, public description, services, response health, years active, and public policy. |
| Parent-domain affiliation | Conceptually strong, MVP spine present | Parent-domain acknowledgement wording is now consistent; affiliated groups are no longer described as blanket official/legal certification. | Need pilot-ready admin workflow polish, pricing/recoupment story, and careful affiliate-package UX. |
| Member witness evidence | MVP spine present | Witness requests, response language, currentness, withdrawal/dispute language, and internal belonging-evidence doctrine are safer. `CommunityMemberVerifyPage` now visibly anchors one member GSN ID to one Community ID before the public trust reading, so activity and witness strength read as community-scoped evidence rather than universal trust. It also gives a public reader-decision note before goods or money move: check Community ID, witness strength, renewal, activity summary, TrustSlip, and live confirmation together, and ask for fresh evidence if one is missing or stale. The currentness card now says low, missing, expired, withdrawn, or disputed witness evidence is weaker until renewed. | Need QR/OTP field-flow polish, verifier-quality weighting, annual renewal prompts, assisted/offline witness flows, and abuse review. |
| Community operating evidence | Logic exists, presentation uneven | Finance, support, repayment, marketplace, confirmation, and trust events generate useful records. | Needs a simple operating-evidence vocabulary across major pages so users understand these as trust records, not disconnected modules. |
| Trusted commerce | Built but still easy to read as commerce-first | Marketplace, Public Shop, Demand, Spotlight, Vault, TrustSlip request/check, and shop verification surfaces exist. Marketplace Trusted Trade now points users toward current shop evidence before trade, credit, goods, or money move. Public Shop gives a direct pre-trade reading: check shop ID, Community ID, current TrustSlip, and community confirmation together before credit, goods, or money move, and do not treat the panel as release approval. | Needs trust-first first-screen hierarchy, consistent headed-paper packages, and a pilot script for "before goods or money move." |
| Trust mobility | Strong personal mobility, weaker community mobility | TrustSlip, Trust Passport, public verify, community verify, public shop, Vault, and snapshot helpers exist. Trust Passport copy output now shares the same headed-paper helper as the other trust snapshots, and shared snapshot papers now carry the trust-infrastructure footer. | Need one unified "trust travels" path and stronger community institution evidence packages. |
| Adoption playbook | Started, not pilot-ready | Reframe workshop and market-entry playbook exist. | Needs one-page briefs for markets, churches, cooperatives, town unions, student groups, and diaspora associations. |
| New data/model work | Not ready yet | CAC/external registration is recorded as support only, not verification. Community type is inferred only where safe. | Do not add public scores, rankings, community-type analytics, or investor dashboards until taxonomy, privacy, pilot evidence, and appeal policy exist. |

Unabated truth:

**The gap challenge is not finished. The doctrine/wording harm is much lower
now, but the Community Public Face, community trust summary, trust-first
Marketplace hierarchy, evidence package consistency, and adoption briefs still
need product work.**

## 7. Minimum Adjustment Sequence

This is the safest order:

1. **Docs/no-code:** finalize this gap audit and use it as the worklist.
2. **Spec:** Community Public Face spec with public/member/admin variants is
   now written in `docs/GSN_COMMUNITY_PUBLIC_FACE_SPEC_2026-06-19.md`.
3. **Presentation:** Community Verify has begun moving toward the spec using
   existing data only; continue with route QA before adding fields.
4. **Audit:** compare Community Confirmation implementation against instant
   confirmation protocol.
5. **Presentation:** make Marketplace and Public Shop trust-first where audits
   allow.
6. **Evidence packaging:** finish GSN headed-paper conversion for copy/share
   surfaces.
7. **Adoption:** create market-specific one-page briefs and pilot scripts.
8. **Data model later:** only then consider community type, public profile
   fields, health metrics, and institutional reporting.

## 8. What Not To Build Yet

Do not rush into:

- new community reputation score
- public ranking of communities
- public risk badges for communities
- community type analytics
- investor dashboards comparing churches versus markets versus cooperatives
- automatic trust approval
- public member-level financial rollups

Reason:

Those are high-trust, high-harm surfaces. The MVP has enough ingredients to
explain trust, but not enough measured evidence or privacy policy to make these
claims safely.

## 9. Immediate Answer To The Product Question

Question:

What is the gap between the trust infrastructure we should have and what we
already have?

Answer:

The current MVP already has most of the **member-level trust infrastructure**:
identity, Trust Passport, TrustSlip, public verification, evidence summaries,
finance/support signals, shop context, and public evidence paths.

The current MVP only partly has the **community-institution infrastructure**:
community identity, membership, invites, join requests, controlled
confirmation, and public verification exist, but the community itself is not
yet presented as a full trusted institution with type, public profile, health,
reputation, service function, response strength, and policy.

The current MVP has the **operating and commerce machinery**, but it is still
too easy to experience it as separate app modules instead of evidence-generating
trust infrastructure.

Therefore the primary gap is:

**not core logic first, but community-facing evidence, institutional presentation,
trust-first workflow, and consistent evidence packaging.**

The highest-value next product move is:

**make the community itself publicly understandable and verifiable, then connect
that community evidence back to TrustSlip, Public Shop, Marketplace, Finance, and
Support.**
