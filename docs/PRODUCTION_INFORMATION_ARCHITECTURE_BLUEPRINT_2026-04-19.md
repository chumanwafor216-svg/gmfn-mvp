# Production Information Architecture Blueprint

## Date
2026-04-19

## Status
Proposed production architecture blueprint for route ownership, route movement,
and page responsibility.

This is a decision document, not an implementation commit.

Important update:
- For the corrected canonical community/marketplace/shop skeleton, also read
  `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.
- Where this blueprint conflicts with that canonical skeleton, the canonical
  skeleton wins until this blueprint is rewritten.

## Purpose
This document sets out the strongest production information architecture for the
current GSN product based on:

- current repo code
- current route map
- current recovery findings
- senior interaction audit
- senior route/domain architecture audit
- institutional/product-structure audit

It is intended to reduce route drift, reduce page heaviness, and improve both:

- ordinary-user comprehension
- institutional, investor, and endorsement-readiness presentation

## Product standard we are designing toward
This architecture should support:

- ordinary users, including low-literacy and underbanked users
- institutional-quality product scrutiny
- investor confidence
- endorsement/readiness framing for Innovator Founder style review

Relevant official UK framing checked during this architecture pass:

- Innovator Founder endorsement guidance:
  `https://www.gov.uk/government/publications/scale-up-and-innovator-founder-visa-endorsing-bodies-guidance/innovator-founder-and-scale-up-visas-guidance-for-endorsing-bodies-accessible`
- Innovator Founder eligibility:
  `https://www.gov.uk/innovator-founder-visa/eligibility`
- Innovator Founder caseworker guidance:
  `https://www.gov.uk/government/publications/innovator-appendix-w-workers/innovator-founder-caseworker-guidance-accessible`

The architecture should therefore help the product read as:

- innovative
- viable
- scalable
- understandable
- disciplined

## Core architectural decision
The app should stop trying to let a few heavy routes do everything.

The strongest production shape is:

- `Dashboard` = compact member workspace only
- `Community Home` = community command centre only
- `Marketplace` = commerce and light support continuation only
- `Finance` = first-class internal money workspace
- `Trust Passport` = first-class trust and evidence workspace
- `Shop Gallery` = public/storefront surface
- `My GSN and I` = personal guide and settings
- `Admin / Command Center` = role-gated oversight and operational management

## Why this decision is necessary

### Current problem
The current product surfaces have drifted into overlap:

- `Dashboard` carries too many live modules
- `Community Home` partially owns finance, demand, spotlight, and circle work
- `Marketplace` partially owns commerce, support entry, finance launch, and
  community shortcuts
- `Finance` already behaves like a real domain, but is not treated with equal
  prominence in the primary architecture

This creates:

- user confusion
- page heaviness
- duplicated route meaning
- unstable sense of where work actually belongs

### Why Finance must be promoted
Finance is not a small sub-feature. In current code it already acts as a full
money-truth hub, including:

- pool position
- exposure
- liquidity
- borrower-side obligations
- money events
- rails
- payout destination
- movement into `Money In` and `Money Out`

That makes `Finance` a strong domain, not a side panel.

### Why Trust Passport must remain strong
Trust Passport is not merely a badge screen. It carries:

- trust reading
- trust record
- trust explanation
- trust portability
- trust evidence surfaces

That makes it a strong domain in the same sense Finance is a strong domain.

## Recommended production spine

### Primary internal workspaces
- `/app/dashboard`
- `/app/community`
- `/app/marketplace`
- `/app/finance`
- `/app/trust`

### Supporting internal workspaces
- `/app/notifications`
- `/app/loans`
- `/app/identity`
- `/app/my-gmfn-and-i`
  - `?tab=settings`

### Public / external-facing surface
- `/shop/:gmfnId`

### Owner / operator shop surface
- `/app/shop-control`
- `/app/shop-assets`

### Admin / oversight surface
- `/app/command-center/*`

## Canonical route structure

```text
/app
  /dashboard
  /community
  /marketplace
  /finance
    /money-in          alias current /app/payment/pool
    /money-out         alias current /app/withdrawal-instructions
    /payment-rails
    /payout-details
  /loans
    /readiness
    /suggestions
    /workbench
  /trust
  /notifications
  /identity
  /my-gmfn-and-i
    ?tab=settings

/shop/:gmfnId
/app/shop-control
```

Current route aliases should remain alive during implementation so route
contracts do not break unexpectedly.

## Page responsibility model

### 1. Dashboard
Role:
- compact member workspace
- launchpad
- summary
- next-step orientation

Should contain:
- a compact top trust/identity status
- one compact attention or next-step signal
- compact notifications summary
- compact demand summary
- regular apps
- compact commitments summary

Should NOT carry:
- a giant spotlight hero
- large trust explainer blocks
- large finance previews
- full command-centre behavior
- duplicated educational layers

Goal:
- answer “what should I do next?” quickly

### 2. Community Home
Role:
- command centre for the currently active community
- community context anchor

Should contain:
- selected community identity and role
- core community command tools
- route launches into:
  - Marketplace
  - Demand Box
  - Build First Circle
  - Notifications
  - Finance
  - Trust Passport where relevant

Should NOT carry:
- full finance ownership
- full marketplace behavior
- heavy spotlight ownership
- deep demand/finance duplication

Goal:
- answer “which community am I working in, and what community action do I need?”

### 3. Marketplace
Role:
- commerce visibility
- member/shop discovery
- light support continuation

Should contain:
- community commerce identity
- marketplace readiness
- visible shop/member activity
- direct path to shop gallery
- light support continuation entry
- direct path to Finance when money readiness or transaction state matters

Should NOT carry:
- community command-centre overload
- deep finance record ownership
- large duplicated admin/tool surfaces

Goal:
- answer “what commerce/support activity is visible here, and where do I go next?”

### 4. Finance
Role:
- first-class money workspace
- full financial truth

Should contain:
- pool position
- balance and effective available position
- locked/guarantor exposure
- borrower obligations
- money events
- rails and payout details
- paths into:
  - Money In
  - Money Out
  - Loans
  - Notifications

Should NOT be partially owned by:
- Community Home
- Marketplace
- Dashboard

Goal:
- answer “what is my full money position and what money action should I take?”

### 5. Money In
Role:
- guided pay-in execution

Should sit conceptually under:
- Finance

Should contain:
- pay-in context
- exact amount/reference generation
- confirmation and reconciliation flow

### 6. Money Out
Role:
- guided withdrawal execution

Should sit conceptually under:
- Finance

Should contain:
- withdrawal state
- payout destination
- route branching into direct withdrawal or support

### 7. Trust Passport
Role:
- trust record and trust explanation domain

Should contain:
- trust summary
- CCI relationship
- TrustSlip relationship
- trust journey / trust explainer
- verification and merchant-check flows

Goal:
- answer “how is trust built, read, recorded, checked, and carried?”

### 8. Shop Gallery
Role:
- public/storefront presentation surface

Should contain:
- identity
- spotlight
- public inventory/product visibility
- private access boundary where relevant

Should stay separate from:
- heavy internal workspace logic

### 9. My GSN and I
Role:
- guide, orientation, and settings

Should contain:
- member guide
- settings tab

Should remain the only settings authority.

### 10. Admin / Command Center
Role:
- role-gated oversight and operational management

Should remain clearly separate from ordinary member routes.

## Navigation model

### Recommended primary movement
If the app must expose a small primary movement spine, the strongest order is:

1. Dashboard
2. Community Home
3. Marketplace
4. Finance
5. Trust Passport

Secondary items can be reached from grouped navigation:

- Notifications
- Loans & Support
- Identity / CCI
- My GSN and I
- Shop Control
- Admin tools where role allows

### Why Finance should be promoted
Finance should be promoted into this row before being pushed under Marketplace.

Reason:
- it is already a real domain in code
- it reduces overload on Community Home and Marketplace
- it makes the product look more controlled and scalable

### Settings placement
Settings should not compete for primary navigation space.

Settings should remain inside:
- `My GSN and I`

## Route movement model

### Standard user path
The strongest standard movement is:

1. `Dashboard`
2. `Community Home`
3. `Marketplace`
4. one of:
   - `Finance`
   - `Shop Gallery`
   - `Demand Box`
   - `Trust Passport`
   - `Loans`

### Money path
Money movement should be:

1. `Dashboard` or `Marketplace`
2. `Finance`
3. `Money In` or `Money Out`
4. `Payment Rails` / `Payout Details` / `Loans` as needed

### Trust path
Trust movement should be:

1. `Dashboard` or `Community Home`
2. `Trust Passport`
3. `TrustSlip` / verification / trust-history surfaces as needed

## What must move out of current heavy pages

### From Dashboard
Move out or reduce:
- deep command-centre behavior
- heavy trust explanation
- oversized spotlight presence
- any full-record behavior better owned by Finance or Trust Passport

### From Community Home
Move out or reduce:
- mini finance ownership
- deep demand previewing beyond command launch
- spotlight/media ownership that makes it behave like a hybrid control room

### From Marketplace
Move out or reduce:
- partial finance ownership
- heavy shortcut/admin duplication
- deep support/borrowing ownership that belongs to Loans or Finance

## Advantages of this architecture

### User advantages
- clearer mental model
- less clutter
- easier to know where to go
- easier to understand domain ownership

### Product advantages
- cleaner route identity
- less duplication
- easier stabilization and QA
- better future scaling
- stronger readiness for production

### Review advantages
- more viable-looking architecture
- more scalable-looking architecture
- more disciplined presentation for institutional or investor review

## Tradeoffs / disadvantages

- requires one careful route-purpose tightening pass
- primary navigation may need rebalancing
- some current previews/blocks will need to be reduced or relocated
- implementation should preserve route aliases during transition

## Implementation approach
This document does NOT recommend a big-bang rewrite.

Recommended implementation sequence:

1. stabilize shared interaction behavior
2. reduce `Dashboard` to compact workspace role
3. reduce `Community Home` to command-centre role
4. reduce `Marketplace` to commerce/support continuation role
5. promote `Finance` clearly in nav and route ownership
6. leave `Money In` and `Money Out` under Finance conceptually while preserving
   existing aliases
7. keep `Trust Passport` strong and separate
8. freeze and QA before further polish

## Freeze criteria for this architecture
Do not call this architecture settled until:

- route purpose is clean on:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/finance`
  - `/app/trust`
- button behavior is stable on mobile
- no route feels like it owns another route’s core job
- settings remain unified
- helper/explainer layers are reintroduced only where truly needed

## Final recommendation
Adopt this blueprint as the target production information architecture.

Do not continue broad UI patching without first using this as the route-ownership
reference.

The strongest next step after accepting this blueprint is:

- convert it into an implementation plan
- decide what leaves `Dashboard`
- decide what leaves `Community Home`
- decide what leaves `Marketplace`
- promote `Finance` explicitly as a first-class workspace
