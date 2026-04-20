# Innovation and Policy Logic

## Date
2026-04-20

## Status
Product-owner architecture clarification, checked against current code where
possible.

This document records why the GSN architecture matters beyond ordinary app
navigation. It is intended to support:

- innovation-case explanation
- investor explanation
- institutional review
- policy and development-finance storytelling
- future senior engineering handover

It does not replace:

- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md`

Those documents still define route and page ownership.

## Core thesis
GSN is not only an app screen collection.

GSN is a community-anchored behavioural and economic record system.

Its strongest idea is that one person carries one stable identity across many
communities, while each community still preserves its own local truth.

So the system can read:

- how a person behaves in one marketplace/community
- how that same person behaves across many marketplaces/communities
- whether financial and trust behaviour changes by community context
- whether the person is becoming overexposed across communities
- whether the person can carry verified trust into a place where they are not
  already known

## The identity spine
The system should keep these identity rules stable:

- one member has one global member ID
- one community has one global community ID
- one member may belong to many communities
- one member has one shop
- that shop can appear through multiple communities, but exposure is
  community-governed

This is the spine that makes Finance, Trust Passport, TrustSlip, CCI, and
merchant verification meaningful.

Without one stable member ID, the system cannot reliably tell whether the same
person is spreading risk across many communities.

## Marketplace versus cumulative domains
Marketplace remains the working unit of one selected community.

Inside one Marketplace, the member can:

- trade
- show a shop
- borrow
- lend/support
- create demand
- respond to demand
- contribute to spotlight
- build or weaken local trust
- use marketplace-owned outward links
- begin merchant-facing verification work

But Marketplace is not the whole truth.

Finance and Trust Passport are separate strong domains because they must follow
the same member across all communities they belong to.

## Finance as a cross-community risk and behaviour reader
Finance has two levels:

- local Marketplace finance: what happened inside one selected community
- cumulative Finance: what this one member is doing financially across all
  communities

This matters because one person should not be able to borrow or create financial
pressure in many communities without the system seeing the wider pattern.

The policy value is larger than a personal balance screen.

If the system collects enough data responsibly, Finance can help answer:

- is this person overexposed across communities?
- does this person repay better in religious, age-grade, professional, school,
  market, or other community types?
- does support flow better in some community structures than others?
- where are guarantee capacities becoming stressed?
- where should banks, institutions, or development partners focus support?

### Confirmed code support now
Current backend code already supports part of this logic:

- `gmfn_backend/app/services/liquidity_engine_service.py` builds a user
  liquidity profile using personal pool, active guarantees, repayment velocity,
  CCI, trust graph reliability, cross-clan diversity, overexposure ratio, and
  available guarantee capacity.
- `gmfn_backend/app/services/liquidity_engine_service.py` also builds a clan
  liquidity snapshot with member count, total pool, locked guarantees, available
  guarantee capacity, clan exposure ratio, average CCI score, risk counts, and
  risk flags.
- `gmfn_backend/app/services/loan_readiness_service.py` uses clan exposure,
  candidate guarantee capacity, risk members, and CCI-style signals to recommend
  proceed, caution, reduce amount, or block.
- `gmfn_backend/app/services/loan_decision_intelligence_service.py` combines
  readiness, guarantor suggestions, and clan liquidity context into a loan
  decision reading.

### What is still inference or future work
The current code can read cross-clan diversity and exposure pressure, but it
does not yet fully classify communities by social type, such as:

- religious community
- age grade
- school/alumni group
- professional association
- market association
- family circle
- village/town union

That classification would be needed before making responsible policy claims
about which community types produce stronger repayment, trade, or support
behaviour.

## Trust Passport, TrustSlip, and merchant verification
Trust has three related but different surfaces.

### Trust Passport
Trust Passport is the full trust story.

It should gather:

- local trust truth from one marketplace
- trust activity across all marketplaces
- repayment behaviour
- guarantee behaviour
- support relationships
- CCI
- trust graph context
- evidence trail
- repair path
- trust journey explanation

Trust Passport is where the fuller "who has this person been over time?"
question belongs.

### TrustSlip
TrustSlip is not the whole story.

TrustSlip is the portable current proof.

It answers a narrower question:

- what can be safely shown now to someone who needs to make a decision?

TrustSlip should show enough identity and trust evidence to help an outsider or
merchant act with confidence without exposing the whole private Trust Passport.

### Merchant verification
Merchant verification is the process of checking a TrustSlip when a member is
trading outside the place where they are already personally known.

It belongs operationally to Marketplace because commerce begins from one
marketplace and one shop context.

But it interfaces outward because the person verifying may be outside the
immediate community circle.

So the relationship is:

- Trust Passport = full accumulated trust history
- TrustSlip = portable current trust snapshot
- Merchant verification = the process/tool used by an outsider or merchant to
  check the TrustSlip before releasing goods or proceeding with trade

### Confirmed code support now
Current backend/frontend code already supports part of this logic:

- `gmfn_backend/app/services/trust_slips_services.py` builds TrustSlip payloads
  containing GMFN ID, TrustSlip code, trust limit, CCI score/band, sponsor
  count, active clan count, unique counterparties, risk flags, evidence
  summary, merchant summary, and visibility levels.
- TrustSlip payloads explicitly state that the TrustSlip is not a bank
  guarantee and does not create auto-debit.
- `gmfn_backend/app/api/routes/merchant_verify.py` provides merchant
  verification links and public verification by token.
- `gmfn_backend/app/services/merchant_verify_service.py` creates merchant
  verification link IDs, optional Pack IDs, expiry, and append-only
  `merchant.verify_link_created` and `merchant.verify_token_used` events.
- `frontend/src/App.tsx` routes `/merchant-verify` and `/verify-merchant` into
  TrustSlip-related verification surfaces.

## Strategic breakthrough to pursue carefully
The larger breakthrough is this:

TrustSlip should become useful even when one party is not yet a GSN member.

That means the public verification layer must help an outsider understand:

- who is being verified
- whether the verification is current
- what level of visibility the holder permitted
- what the TrustSlip does and does not guarantee
- what evidence pack or Pack ID supports the decision
- what action the verifier can safely take next

This could make GSN useful at the boundary between formal and informal trust:

- market traders
- small merchants
- buyers and sellers outside one community
- local support networks
- development-finance pilots
- community banks and cooperative finance
- institutions trying to read real-world behaviour without forcing everyone
  into a bank-first identity model

## Policy and investor story
If the data is collected responsibly, GSN can help answer questions that are
hard to answer today:

- which community structures produce reliable repayment?
- where does support flow naturally?
- where does trust travel well?
- where does overexposure begin?
- where are guarantees strong but underused?
- where does trade need external confidence?
- where should banks, investors, NGOs, or development-finance partners focus?

This is valuable because many underbanked users already live inside social
structures that know them better than formal institutions do.

GSN's potential is to turn those social structures into readable, consented,
portable, explainable economic infrastructure.

## Required guardrails
This story must not be overstated.

The system should not claim policy proof before real data exists.

The system must protect users from unfair profiling.

Future policy/investor presentation should separate:

- confirmed system capability
- pilot evidence
- measured outcomes
- early inference
- product vision

Required guardrails include:

- clear user consent for what travels outside the community
- visibility levels for TrustSlip and merchant verification
- privacy-first evidence packs
- plain-language explanations for ordinary users
- auditability for institutions
- clear disclaimers that TrustSlip is not a bank guarantee
- no auto-debit implication unless a future regulated contract explicitly says
  so
- appeal/repair paths for negative trust or finance readings
- bias checks before comparing community types
- minimum data thresholds before drawing policy conclusions

## Plain-language explanation
GSN watches one person across the communities they truly belong to.

It does not pretend that all communities are the same.

It lets one community keep its own local truth, but it also lets the system see
when the same person is acting across many places.

Finance tells the money story.

Trust Passport tells the full trust story.

TrustSlip carries a smaller verified proof to someone outside the circle.

Merchant verification checks that proof when goods, trade, or confidence are at
stake.

That is why the architecture matters.

The value is not just a button or page.

The value is a readable bridge between community trust and economic decision.

