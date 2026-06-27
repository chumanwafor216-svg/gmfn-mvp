# GSN Verified Community Domain Spec

Date: 2026-06-18

Status: Strategic product specification for the community-domain verification
model. This is a no-code source-of-truth document to guide later backend,
frontend, onboarding, pricing, and pilot work.

Implementation checkpoints:

- 2026-06-18: backend parent-domain affiliation spine added through
  `CommunityDomainAffiliation`;
- 2026-06-18: admin UI lane added on `CommunityConfirmationPolicyPage` for
  requesting, approving, rejecting, and revoking parent-domain affiliation;
- 2026-06-18: backend member-witness spine added through
  `CommunityMemberVerification`, with private summary, withdrawal, yearly
  verifier cap, and Trust Event logging.
- 2026-06-19: backend member-witness request/approval spine added through
  `CommunityMemberVerificationRequest`, with applicant-bound request,
  nominated verifier, short-lived token/code, signed-in verifier approval,
  expiry, decline, and Trust Event logging.
- 2026-06-19: basic signed-in member-witness request UI added to
  `CommunityConfirmationPolicyPage`, with create request, copy response link,
  copy one-time code, token-based request loading, and verifier response/decline
  controls.
- 2026-06-19: the member-witness request UI now includes a QR response package
  and Web Share/copy fallback for the response link plus one-time code.
- 2026-06-19: public community-member credentials now include broad aggregate
  community activity evidence scoped to the Community ID, without exposing raw
  event records or private notes.
- 2026-06-19: public community-member credentials now include a
  community-scoped trust reading that combines active membership, witness
  strength, renewal status, and broad activity evidence without turning that
  reading into a universal trust score, guarantee, credit approval, or
  transaction permission.
- 2026-06-19: public community-member credentials now include an
  evidence-currentness reading from the membership witness renewal status, so
  annual renewal is visible without exposing private verifier details.
- 2026-06-19: TrustSlip payloads, merchant summaries, public verify JSON, and
  the React TrustSlip Verify paper now carry the same evidence-currentness
  reading, so portable TrustSlip evidence does not hide whether member-witness
  evidence is current, due, expired, or not yet started.
- 2026-06-19: the signed-in TrustSlip holder/reader view now also carries the
  same evidence-currentness reading, so the member can see the annual witness
  currentness state before sharing a portable TrustSlip.
- 2026-06-19: Trust Passport Community Confirmation and copied Trust Passport
  snapshots now carry the same evidence-currentness reading from TrustSlip
  context, keeping the fuller private story aligned with public member
  credentials and portable TrustSlip evidence.
- 2026-06-19: TrustSlip payloads and TrustSlip Verify surfaces now carry the
  same broad aggregate community activity evidence as portable evidence, while
  keeping raw event types, private notes, verifier identities, payment records,
  shop details, and loan details private.
- 2026-06-19: Trust Passport now reads the same aggregate activity evidence
  from TrustSlip context, shows it in the Community Confirmation lane, and
  includes it in copied Trust Passport snapshots as broad evidence context only.
- 2026-06-19: Trust Passport Community Confirmation lane now links to the
  public member credential when both the Community ID and member GSN ID are
  usable, making the fuller story connect to scoped public evidence.
- 2026-06-19: copied Trust Passport snapshots now include the public member
  credential link when that scoped credential link can be safely built.
- 2026-06-19: copied TrustSlip snapshots and authenticated TrustSlip share
  bundles now include the public member credential link when both the Community
  ID/key and member GSN ID/key can be safely resolved, so portable TrustSlip
  sharing can point back to scoped community membership evidence.
- 2026-06-19: backend-rendered TrustSlip verification papers, including the
  Lite paper, now include the same public member credential link when both keys
  can be safely resolved, including current `GMFN/GSN/GMFM-P-*` and `*-U-*`
  member references.
- 2026-06-19: public TrustSlip share-text now returns and includes the same
  member credential link when the TrustSlip community and holder member
  reference can be safely resolved.
- 2026-06-19: public TrustSlip JSON verification now returns the same member
  credential link at top level and inside `merchant_view` when both keys can be
  safely resolved.
- 2026-06-19: the React public TrustSlip verifier now normalizes the backend
  `member_credential_page` field and prefers it before deriving a fallback from
  Community ID plus member GSN ID.
- 2026-06-19: `CommunityVerifyPage` now includes a compact public reading that
  separates what the Community ID record shows, what it does not show,
  and the next safe action.
- 2026-06-19: `CommunityMemberVerifyPage` now includes a compact public reading
  that separates scoped membership evidence, private/transaction claims not
  confirmed on the page, and the next safe action.
- 2026-06-19: `CommunityConfirmationOutcomePage` now includes a compact public
  reading that separates the aggregate community response, unconfirmed private
  or transaction claims, and the reader's next safe action.
- 2026-06-19: `CommunityConfirmationPolicyPage` member-witness lane now includes
  a compact meaning strip that separates pending witness request, witness
  approval, and public member credential evidence.
- 2026-06-19: `CommunityConfirmationPolicyPage` domain-affiliation lane now
  includes a compact meaning strip that separates Community ID anchor, pending
  request, and acknowledged affiliate meaning.
- 2026-06-19: `TrustSlipVerifyPublicPaper` now includes a compact public
  reading that separates TrustSlip validity, supporting scoped community
  evidence, and the reader's next safe action.
- 2026-06-19: copied TrustSlip and TrustSlip verification snapshots now carry
  an explicit reader boundary, so exported evidence says it is evidence for
  judgement rather than credit approval, payment instruction, legal promise, or
  permission to release money or goods.
- 2026-06-19: backend-rendered TrustSlip Lite/full papers, public share-text,
  and authenticated WhatsApp/SMS share bundles now describe the trust amount as
  a signal and explicitly say the evidence is not credit approval or permission to
  release goods, credit, or money.
- 2026-06-19: frontend TrustSlip owner/verify screens now use `trust limit
  signal` wording and avoid `merchant review before release` language.
- 2026-06-19: Trust Passport Finance Discipline now uses `trust limit signal`
  wording so the amount is read as evidence context, not an approved limit.
- 2026-06-19: TrustSlip-related backend PDFs now avoid `authorization
  snapshot` and `integrity limit` wording, using evidence/signal language
  instead.
- 2026-06-19: `MarketplacePage` now opens with a compact community trust front
  desk before work lanes, using existing safe facts to make marketplace
  operations read as community-scoped trust infrastructure.
- 2026-06-19: CAC or external company-registration references are clarified as
  recorded supporting evidence only, not GSN verification and not public ID
  formulas.
- 2026-06-19: backend external-registration evidence recording added through
  `POST /clans/{clan_id}/external-registration-records`, with private admin
  listing through `GET /clans/{clan_id}/external-registration-records`; the MVP
  record stores presence flags and a stable evidence fingerprint only, not raw
  CAC/reference text, and the Trust Event carries `verification_effect: none`.
- 2026-06-19: public Community Verification default wording changed from
  `Verified in GSN` to `Recorded in GSN`, so a public community record is not
  overclaimed as protected-domain verification before parent-domain governance,
  official acknowledgement, or stronger credential evidence exists.
- 2026-06-19: public Community Verification now shows an inferred community
  type reading, with a source note. This helps outsiders understand whether the
  record reads like a market association, church/religious group, cooperative,
  town union, student association, diaspora association, social club, or
  organized community, but it is not official classification or registration.
- 2026-06-19: public Community Verification now shows a scoped public-face
  status: `Basic public record` or `Affiliate acknowledged public record`. The
  page states the scope directly, so the record is not mistaken for a full
  community profile, service guarantee, member list, or community health report.
- 2026-06-19: public Community Verification now shows a next-evidence path,
  telling visitors to request scoped member credential evidence, TrustSlip
  evidence, acknowledged affiliate evidence, or controlled community confirmation
  instead of relying on a display name alone.
- 2026-06-19: public Community Verification now shows a `GSN record since`
  signal from the community record creation date. The scope says this is the
  GSN record date, not the date the real-world community was founded or
  formally registered.
- 2026-06-19: public Community Verification now includes a trust-mobility note
  that frames the Community ID as a portable anchor to read beside scoped member
  credentials, TrustSlips, acknowledged affiliate records, and controlled
  confirmations, not as automatic transferable trust or transaction approval.
- 2026-06-19: public Community Verification now includes a reader-decision note
  that frames the public Community ID record as a first check only. Serious
  trade, lending, membership, shop, line, welfare, or affiliate decisions still
  require current scoped evidence before action.
- 2026-06-19: Marketplace trust-front-desk and Public Shop status wording now
  avoid `verified community` claims from community context alone, using safer
  recorded-community language unless a later protected-domain credential state
  explicitly supports stronger wording.
- 2026-06-19: copied Community Verification packages now say the link opens a
  public GSN community record only; they no longer say the package verifies the
  record or proves protected-domain approval.
- 2026-06-19: Marketplace `Local Marketplace Trust` now states that
  member-level witness currentness belongs in fuller evidence routes, not the
  local marketplace summary, so trusted commerce stays truthfully scoped.
- 2026-06-19: Public Shop `Shop verification` now says shop and community IDs
  do not show member-witness currentness by themselves, so a buyer is pointed
  back to current scoped evidence before serious trade.
- 2026-06-19: public Community Confirmation outcome now says responses are
  counted against contacts asked, not as a whole-community vote, keeping instant
  confirmation as scoped response evidence rather than a percentage election.
- 2026-06-19: public Community Confirmation limitation language now says the
  result is tied to a recorded GSN community record and explicitly says it is
  not a whole-community vote.
- 2026-06-19: member-witness review now says a recorded verifier response is
  one witness event, not parent-domain approval or a guarantee for every claim,
  preserving the boundary between witness evidence and official domain
  authority.
- 2026-06-19: member-witness strength now says current strength depends on
  active witness records inside their validity window, and that expired,
  withdrawn, or disputed witness records are weaker evidence until renewed.
- 2026-06-19: Community Confirmation review cases now separate internal
  trust-reading decisions from parent-domain certification, legal approval, and
  permission to release goods, credit, or money. The reviewer-facing clean-case
  wording now says `No issue found`, not `Confirmed clean`.
- 2026-06-19: Community Confirmation responder cards now frame relay responses
  as personal/community knowledge answers. They use `Answer about {member}` and
  `Can support`, and state that a response is not parent-domain certification
  or a whole-community vote.
- 2026-06-19: public community-member credentials now use `Record shown`
  instead of a broad `Confirmed` card title, and explicitly say the credential
  does not certify shop, line, subgroup, payment, loan, or parent-domain
  approval claims.
- 2026-06-19: Demand Box now frames trust credit as openness/preferences rather
  than approval. Demand badges say `Open to trust credit`, and responder
  guidance states that this is not approval to release goods, credit, or money.
- 2026-06-19: Loan Readiness and Loan Suggestions now frame readiness and fit
  as decision support only, not loan approval, guarantor approval, or permission
  to release goods, credit, or money.
- 2026-06-19: Guarantor Inbox now frames `approved` guarantor decisions as
  pledge-response approval only. The action label says `Approve pledge`, and
  the page says this is not whole-loan approval or authority to release goods,
  credit, or money.
- 2026-06-19: Loan Workbench now frames readings, suggested pledges, and
  guarantor-fit rows as decision support only. It states that those rows do not
  approve loans, approve guarantors, or authorize release of goods, credit, or
  money, and it labels history as `Past pledge approvals`.
- 2026-06-19: Repayment now frames payment declaration as a route action that
  still needs admin or finance reconciliation before money receipt, loan
  closure, or guarantor-exposure release can be treated as confirmed.
- 2026-06-19: Loan Summary now frames guarantor row approvals as pledge
  decisions for a support item, not whole-loan approval or release authority.
  The screen labels counts as `Approved pledges`.
- 2026-06-19: Loan Summary now frames revenue allocation and net-disbursed
  figures as preview-only. The screen states they are not payment instruction,
  settlement confirmation, or evidence that money moved.
- 2026-06-19: Money In now frames a user's paid action as a payment
  declaration, not confirmed receipt. Reconciliation or a matched event remains
  the money-trail confirmation boundary.
- 2026-06-19: Revenue Allocation now frames returned split figures as readings,
  not settlement evidence. Net-disbursed figures are labeled as preview, and the
  page states that settlement still needs finance evidence.
- 2026-06-19: Finance now frames confirmed expected payments and money events
  as finance-confirmed records. A finance confirmation is a reconciliation
  signal, not broad entitlement outside the related route's own state.
- 2026-06-19: Finance now frames guarantor release totals as recorded release
  readings. Finance can show that exposure was recorded as released, but the
  page itself is not release authority, loan closure, or evidence that money
  moved.
- 2026-06-19: Money Out now frames direct withdrawal submission as a recorded
  request. Community confirmation can support review, but it is not payout
  execution and does not mean money movement is complete.
- 2026-06-19: Payout Details now frames saved bank/wallet details as a
  destination record for Money Out. Destination readiness does not approve or
  execute a withdrawal and does not show that money moved.
- 2026-06-19: Vault Control now frames quote agreement as payment-code
  preparation only. Quote agreement does not confirm payment, and Vault blocks
  become available only after the payment/finance record shows
  payment-confirmed status.
- 2026-06-19: Payment Rails now frames rail status as route-selection
  intelligence only. Status-active rails do not approve payment, confirm
  settlement, or show that money moved.
- 2026-06-19: Guarantor Earnings now frames earnings as recorded earned value
  tied to closed-support records. This makes guarantor contribution visible
  without implying automatic payout, settlement confirmation, or money
  movement.
- 2026-06-19: System Operations now frames admin money/support queues as
  review and reconciliation readings. Queue labels do not create settlement,
  payment confirmation, loan approval, or money movement by themselves.
- 2026-06-19: Bank Console now frames reconciliation as a recorded matching
  review. Finance-confirmed counts and matched records can support later
  settlement review, but they are not settlement completion or evidence that
  money moved by themselves.
- 2026-06-19: Admin Incomplete Loans now frames queue rows as pledge-decision
  progress and locked-pledge-coverage review. The queue does not approve the
  whole loan, authorize release, or show that money moved.
- 2026-06-19: Exposure Admin and legacy Exposure now frame exposure as a
  risk/concentration reading from recorded pledge coverage and release records.
  Exposure does not prove settlement, authorize release, or show that money
  moved.
- 2026-06-19: Community Confirmation Outcome now shows provider follow-up
  `settled` status as `Resolved`. The internal status can remain for API
  compatibility, but the user-facing meaning is an evidence-trail resolution,
  not financial settlement or final truth for every claim.
- 2026-06-19: Demand Box now says a non-finance need is `resolved` rather than
  `settled`. Marketplace demand closure should not sound like payment
  settlement.
- 2026-06-19: Trust Command Centre now frames executive admin readings as
  checks, pledge progress, exposure readings, and buffer signals. The overview
  does not treat those readings as final confirmation, broad approval, or
  personally established exposure evidence.
- 2026-06-19: Community Confirmation Policy now presents the member-witness
  request lane as a verifier response/record. Visible labels now say response
  link, response package, record witness, and scan to respond instead of
  approval-link wording, while backend decision compatibility remains intact.
- 2026-06-19: Community Confirmation Policy now presents the broader
  member-witness lane as witness records and witness strength rather than broad
  member verification. Visible labels now say member witness records, member
  for witness, ask for witness, and paid member-witness packages.
- 2026-06-19: Community Confirmation Policy now presents parent-domain
  affiliate acceptance as acknowledgement rather than broad approval. Visible
  labels now say acknowledged affiliate, acknowledgement, acknowledge only
  groups, parent-domain acknowledged affiliate, and acknowledge action while
  preserving the internal decision contract.
- 2026-06-19: public Community Verification payloads and fallbacks now use
  acknowledged affiliate records as the outward reader phrase. The public label
  says `Acknowledged affiliate under parent domain` while the internal status
  remains compatible with existing affiliation records.

Companion documents:

- `docs/GSN_REFRAME_WORKSHOP_AND_MARKET_ENTRY_PLAYBOOK_2026-06-18.md`
- `docs/GSN_TRUST_INFRASTRUCTURE_GAP_AUDIT_2026-06-18.md`

Unabated truth: this spec describes the trust-infrastructure model GSN should
move toward. It does not mean the current MVP already implements every status,
fee, renewal rule, verifier limit, affiliation workflow, or audit surface below.
Treat it as the product contract to build toward in small, reversible steps.

## 1. Core Discovery

The missing product architecture is not another generic "community" feature.
It is a protected identity layer for real-world organized communities.

The product package is:

**GSN Verified Community Domain**

Plain meaning:

**A community pays for or claims a protected GSN identity domain, and all
recognized groups, members, shops, lines, and trust records under that domain
can be checked against the protected Community ID.**

The strongest doctrine:

**Name is display. Community ID is the record anchor. Membership credential is belonging evidence.**

This means GSN should not depend on names alone. Anyone can type "Onitsha Main
Market" or a similar name. The system should care whether the person, group, or
shop is linked to the correct protected Community ID Domain.

## 2. What Must Not Be Mixed

The system must separate four levels:

1. **Personal identity**
   - shows that a person has a GSN identity and may have supplied personal
     evidence such as phone, photo, ID document, passport, driving licence, or
     other allowed identity evidence;
   - does not prove membership of any market, church, town union, school, or
     association.

2. **Internal group membership**
   - shows that a person belongs to a small group created inside GSN;
   - can be based on invite, admin acceptance, or member-backed confirmation;
   - does not automatically prove the group belongs to a protected parent
     community.

3. **Parent-domain group affiliation**
   - shows that a small group, line, section, shop cluster, church unit, branch,
     or association has been accepted under a protected Community ID Domain;
   - this is where the parent community may charge an affiliation or
     credential-review fee to recover the domain cost.

4. **Protected community membership credential**
   - shows that a person has a current protected-domain membership record,
     either directly or through a parent-domain acknowledged affiliate group;
   - this credential should be current, auditable, renewable, and revocable.

Rule:

**A person may be real without being a verified community member. A group may be
real without being a parent-domain acknowledged affiliate. A group may record
its own local belonging evidence without having authority to issue a protected
parent-community credential.**

## 3. Business Model

There are two possible parent-domain ownership paths.

### Path A - Parent Community Pays For The Domain

The market, church, town union, cooperative, student association, diaspora
association, or social club pays GMFN/GSN for the protected Community ID Domain.

The parent community can then recover money through:

- parent-domain affiliation fees;
- line or section verification fees;
- shop or trader credential fees;
- annual member renewal fees;
- premium public evidence or marketplace trust features;
- controlled confirmation or TrustSlip packages.

GSN earns by providing the protected identity infrastructure, public evidence
pages, verification workflow, audit trail, renewal engine, and trust mobility
surfaces.

### Path B - Parent Community Does Not Pay Yet

GSN may still create or reserve a public community record for pilot adoption,
but it must not overclaim parent-authority endorsement.

Use safer labels such as:

- `GSN Public Community Record`
- `Observed Community`
- `Not yet claimed by recognized custodians`
- `Witness-evidenced by GSN/community records, not by parent authority`

In this path, GSN can run witness-evidence work directly and earn from the
review workflow. If the recognized parent body later pays or claims the domain,
the public record can transition into a protected Verified Community Domain
after due review.

Unabated truth: if GSN presents an unclaimed public record as parent-authority
endorsement, the product can create legal, political, and reputational risk.

## 4. Identity Objects

### Personal GSN ID

Owned by the person.

It can prove:

- this person has a GSN profile;
- this person may have personal verification evidence;
- this person may hold TrustSlip or Trust Passport records.

It cannot prove by itself:

- market membership;
- shop ownership;
- church membership;
- town union membership;
- protected association standing.

### Community ID Domain

Owned or protected for the parent community.

Example pattern, illustrative only:

- `GSN-NG-AN-ONM`

The exact formula should be decided later, but the principle is fixed:

- root community ID;
- country/state/locality or controlled geography markers where useful;
- short community code;
- internal unique sequence/check digits where needed.

Do not expose raw CAC or other registration numbers as the public ID formula.
Registration evidence can be recorded internally as supporting claim evidence,
but it is not GSN verification by itself. Public IDs should be GSN-controlled,
privacy-safe, and stable.

CAC doctrine:

- CAC or company-registration details are **recorded**, not treated as automatic
  verification.
- CAC can support the parent-domain application record.
- CAC can help custodians review whether a claimant has an external legal or
  business reference.
- In the current backend spine, CAC/external registration input is recorded as
  presence flags plus a stable fingerprint inside a Trust Event. Raw CAC
  references, registered names, and notes are not stored in that generic event
  because Trust Events appear in multiple audit/evidence surfaces.
- CAC does not prove active market membership, current leadership, community
  consent, shop ownership, or member belonging.
- GSN verification still comes from protected Community ID governance,
  parent-domain acknowledgement, member credentials, witness evidence,
  renewal, dispute handling, and audit trail.

### Affiliate Group ID

Owned by a group under or near a parent domain.

Example:

- `GSN-NG-AN-ONM-001`
- `GSN-NG-AN-ONM-002`

The group starts as independent or unverified. It becomes a parent-domain
acknowledged affiliate only after the parent domain acknowledges it.

### Membership Credential

Owned by the relationship between:

- a person;
- a community domain;
- optionally a subgroup, line, shop, branch, circle, or role.

Example meaning:

`Person X has current member evidence in Community Domain Y through Affiliate
Group Z, with role R, valid until Date D.`

This is the most important credential object for trust mobility.

## 5. Community Join And Verification Flow

### Step 1 - Open Join

Anyone can scan a public QR code or open a join link.

Result:

- personal GSN account can be created;
- public community space can be joined;
- status is `Joined / witness not started`.

Open join is adoption. It is not verification evidence.

### Step 2 - Personal Verification

The person may provide personal evidence:

- phone confirmation;
- photo;
- ID document;
- passport;
- driving licence;
- other allowed evidence.

Result:

- the person may become personally verified;
- this still does not prove community membership.

### Step 3 - Community Claim

The person claims a community, line, shop, group, branch, or role.

Examples:

- Line F Electrical;
- Shop 105;
- mobile trader;
- shop staff;
- apprentice;
- market worker;
- church unit;
- town union branch;
- student association chapter.

### Step 4 - Member-Backed Witness Records

The applicant supplies a required number of community members with active
witness standing
who can stand for them.

The verifier flow should use:

- one-time QR;
- one-time code;
- in-app response;
- short-lived link;
- applicant-bound witness request.

The verifier must respond on their own device or through an assisted staff
process. Permanent public verifier codes should not be reusable.

Implementation status:

- backend request and signed-in response spine exists;
- basic signed-in request/share/review UI exists on
  `CommunityConfirmationPolicyPage`, including QR response package and
  share/copy fallback;
- the applicant can nominate a verifier and receive a short-lived token/code;
- the assigned verifier must respond while signed in;
- a recorded response creates the normal member witness record and respects the same
  yearly verifier limit;
- the final phone-ready QR scanner, assisted field-agent capture, and offline
  elder workflow are still not built.

### Step 5 - GSN Validation

GSN checks:

- whether each verifier is already valid under the same community domain or
  acceptable subgroup;
- whether the verifier is eligible to stand as a witness;
- whether the verifier has exceeded limits;
- whether there are active disputes;
- whether the required fee or renewal rule is satisfied;
- whether the claimed group is affiliated where parent-domain evidence is needed.

### Step 6 - Credential Issuance

If the conditions pass, GSN issues or updates the membership credential.

Possible result:

- `Light member evidence`
- `Community evidence`
- `Strong member evidence`
- `Community Established`
- `Needs Reconfirmation`
- `Disputed`
- `Expired`

## 6. Group Creation And Parent-Domain Affiliation

Any member may create a group.

Initial status:

- `Independent Group`
- `Unverified Affiliate`

That group can invite people and record internal belonging evidence. But it
cannot claim parent-domain acknowledged standing until it applies for
parent-domain affiliation.

Parent-domain affiliation flow:

1. group creates or selects a desired parent community domain;
2. group submits affiliation request;
3. parent domain custodians review the request;
4. parent domain may request evidence, physical review, member references, or
   payment;
5. parent domain acknowledges or rejects;
6. GSN records the acknowledgement.

Result after acknowledgement:

- `Parent-domain acknowledged affiliate under [Parent Community Domain]`.

Rule:

**Members provide evidence. GSN records the credential. The protected community
domain controls parent-domain acknowledged affiliation.**

## 7. Verification Strength

Verification should not be only yes/no. A person can be more or less strongly
confirmed.

Suggested starting levels:

- `Joined / witness not started`: entered GSN or community space, but current member-witness evidence is not yet recorded.
- `Light member evidence`: 1-2 valid confirmations.
- `Community evidence`: 3-5 valid confirmations.
- `Strong member evidence`: 6-10 valid confirmations.
- `Community Established`: 10+ valid confirmations, renewed, with no active
  dispute.

Do not use count alone. Quality matters.

Verification strength should consider:

- number of verifiers;
- verifier quality;
- verifier tenure;
- verifier role;
- same subgroup or line relevance;
- active dispute status;
- renewal status;
- whether the claim is direct parent-domain membership or subgroup membership.

Unabated truth: fifteen weak confirmations from new accounts should not outrank
five strong confirmations from long-standing verified members.

## 8. Verifier Eligibility And Limits

Member-backed verification must not become a fraud chain.

Suggested verifier tiers:

- `Verified Member`: can provide limited witness confirmations.
- `Trusted Verifier`: clean history, renewed status, and stronger witness
  weight.
- `Anchor Verifier`: GSN staff-confirmed, official, long-standing shop owner,
  line veteran, or early verified seed member.
- `Domain Custodian`: parent-domain governance role for group affiliation and
  domain-level decisions.

Suggested yearly limits:

- ordinary verified member: up to 10 verifications per year;
- trusted verifier: up to 20 verifications per year;
- anchor verifier or field agent: higher limit, but audited;
- domain custodian: affiliation and governance authority, audited.

These numbers are starting points, not final law.

Unabated truth: in very large markets, some real leaders may genuinely know
hundreds of people. High limits can exist, but only with special role status,
audit trail, and review.

## 9. Renewal And Reverification

Community membership should be current.

Suggested rule:

- membership credentials last 12 months;
- renewal starts before expiry;
- a grace period may apply;
- stale credentials move into `Needs Reconfirmation` or `Expired`;
- the personal GSN ID does not expire because community membership expires.

Possible statuses:

- `Active`
- `Renewal Due`
- `Grace Period`
- `Needs Reconfirmation`
- `Expired`
- `Partially Withdrawn`
- `Disputed`
- `Suspended`

GSN should periodically ask verifiers:

**Are the people you verified still known to you?**

Verifiers may withdraw support with reasons such as:

- person left the market or group;
- person changed shop, line, or role;
- mistaken verification;
- suspicious conduct;
- dispute;
- relocation;
- death;
- no longer willing to stand by the person.

One withdrawal should not automatically destroy a credential. It should trigger
recalculation or review.

## 10. Old-School And Assisted Witness Recording

Some of the most trusted real-world people may not be app-comfortable. GSN must
not exclude them.

Supported paths should include:

- field staff-assisted witness recording;
- line-agent-assisted confirmation;
- OTP or simple code confirmation;
- admin-assisted QR approval;
- physical onboarding sessions;
- printed QR sheets for public join;
- controlled staff entry of offline evidence.

Rule:

**Trust evidence is human-trust based, but digitally recorded.**

## 11. Small Trust Circles Inside Large Communities

Large markets, churches, associations, and diaspora communities cannot operate
as one flat group.

GSN should encourage small trust circles:

- line group;
- shop cluster;
- trade group;
- apprentice group;
- staff group;
- market worker group;
- service group;
- church unit;
- town union branch;
- student chapter.

Suggested ordinary group size:

- around 15 people for a tight trust circle;
- 16-30 may still be acceptable as a larger circle;
- beyond that, the group should consider subgroups or line structure.

Rule:

**Large community identity, small-circle verification.**

## 12. Public Evidence And Privacy

Public verification should be controlled.

A public viewer may see:

- community name;
- Community ID Domain;
- status;
- subgroup or role when safe;
- verification strength label;
- currentness/expiry state;
- whether there is an unresolved dispute;
- safe evidence summary.

A public viewer should not automatically see:

- raw identity documents;
- raw CAC or registration evidence;
- external company-registration numbers used as supporting records;
- full private verifier list;
- private disputes;
- sensitive personal notes;
- exact address/location if not necessary.

Controlled verification can reveal more with permission.

## 13. Revenue Protection Rule

The community-domain owner must be able to recover cost without blocking
organic growth.

The clean separation:

- free open join creates access;
- internal group records create local belonging evidence;
- witness confirmation supplies evidence;
- parent-domain affiliation creates umbrella acknowledgement;
- protected membership credential is the paid/protected evidence product.

Most important rule:

**Witnesses do not sell protected credentials. They support trust evidence.
The protected community domain issues membership credentials.**

This prevents verified members from bypassing the parent domain's economic
model while still allowing members to stand for one another.

## 14. Governance And Capture Risks

GSN must avoid these traps:

- one chairman controls all verification;
- one official sells verification;
- enemies block legitimate members;
- fake clusters verify each other;
- old-school trusted people are excluded;
- parent domain is claimed by the first person who pays;
- unclaimed public records are presented as parent-authority endorsement;
- expired membership remains trusted forever;
- private evidence is exposed publicly.

Controls:

- multi-custodian domain governance;
- audit trail for every credential and witness record;
- verifier limits;
- weighted verification;
- renewal;
- withdrawal;
- dispute and appeal path;
- assisted witness recording;
- clear public labels for claimed, unclaimed, verified, disputed, suspended,
  and observed records.

## 15. Minimum MVP Adjustment Sequence

Do not start with heavy new logic. Start by making the model legible.

1. **Document the model**
   - this file is the first source-of-truth step.

2. **Map current MVP objects**
   - existing community IDs;
   - existing community public verification;
   - existing invite/share/QR links;
   - existing trust events;
   - existing TrustSlip/Trust Passport;
   - existing membership and join request flows.

3. **Define public labels**
   - joined/unverified;
   - protected member credential;
   - parent-domain acknowledged affiliate;
   - protected domain;
   - observed/unclaimed community.

4. **Upgrade Community Public Face**
   - explain community domain;
   - show safe verification status;
   - distinguish parent-domain acknowledgement evidence from public record
     evidence.

5. **Add group-affiliation doctrine**
   - group can exist independently;
   - group becomes parent-domain acknowledged only after parent-domain
     acknowledgement.

6. **Add member-backed witness evidence workflow**
   - request/response/audit language now has backend and basic signed-in UI;
   - later implement QR scanner, WhatsApp-native sharing, verifier-quality
     weighting, and renewal prompts.

7. **Add renewal and withdrawal**
   - currentness is part of trust.

8. **Add pricing and admin workflows**
   - only after the evidence model is stable enough not to create harm.

## 16. Product Summary

GSN is not selling a name.

GSN is selling protected community trust infrastructure.

The practical promise:

**Any person may join GSN. Any group may form. But only acknowledged groups and
members can operate under a protected Verified Community Domain.**

The final doctrine:

**Open join gives access. Personal identity evidence records the person.
Internal group records capture local belonging evidence. Parent-domain
affiliation records that the group is acknowledged by the larger community.
Protected membership credentials make that trust visible, renewable, and
portable.**
