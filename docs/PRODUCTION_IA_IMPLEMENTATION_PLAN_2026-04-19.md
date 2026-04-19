# Production IA Implementation Plan

## Date
2026-04-19

## Status
Proposed implementation plan derived from:

- `docs/PRODUCTION_INFORMATION_ARCHITECTURE_BLUEPRINT_2026-04-19.md`
- `docs/SENIOR_ENGINEERING_HANDOVER_2026-04-19.md`
- active route-recovery findings in `docs/HANDOFF_NOTES.md`

This is an execution plan, not a direct code change.

Important update:
- For the corrected canonical community/marketplace/shop skeleton, also read
  `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.
- Where this plan conflicts with that canonical skeleton, the canonical
  skeleton wins until this plan is revised.

## Purpose
This plan explains how to move from the current mixed route state to the
target production information architecture without destabilizing the app.

It is designed to:

- preserve route contracts where possible
- reduce risk
- avoid broad rewrites
- introduce clean freeze points
- make the product easier to understand for users and reviewers

## The target we are implementing
Primary internal workspaces:

- `Dashboard`
- `Community Home`
- `Marketplace`
- `Finance`
- `Trust Passport`

Supporting internal workspaces:

- `Notifications`
- `Loans & Support`
- `Identity / CCI`
- `My GSN and I`
  - `Settings` inside it

Public/external surface:

- `Shop Gallery`

Admin surface:

- `Command Center`

## Key non-negotiable rules during implementation

1. Do not break existing route aliases unless the change is explicitly approved.
2. Keep backend contracts unchanged unless a real domain requirement forces a
   backend change.
3. Do not continue cosmetic patching while route purpose is still unresolved.
4. Every phase must end with a verification pass and a freeze decision.
5. Only reintroduce guidance/explainer layers after route purpose and
   interaction stability are settled.

## Current structural problems this plan addresses

### 1. Dashboard is too heavy
It currently carries too many live modules and feels like a composite command
board instead of a compact member workspace.

### 2. Community Home is too broad
It is the correct command centre, but it still partially owns too many preview
surfaces and route behaviors.

### 3. Marketplace is too mixed
It should be commerce/support continuation, but it still partly behaves like a
community workspace and partial finance owner.

### 4. Finance is under-promoted
It already behaves like a first-class domain, but the current primary route
structure does not present it that way clearly enough.

### 5. Trust Passport needs to stay strong
It is already a strong domain and should not be diluted back into dashboard or
general helper surfaces.

## Implementation phases

### Phase 0: Freeze the target model
Goal:
- accept the production route-ownership blueprint before more structural edits

Actions:
- treat `docs/PRODUCTION_INFORMATION_ARCHITECTURE_BLUEPRINT_2026-04-19.md` as
  the working architectural target
- do not reopen the route-purpose debate during lower-level implementation work
  unless code proves the target is impossible

Output:
- architecture target frozen for execution

Freeze gate:
- team/owner agrees that:
  - Finance is first-class
  - Trust Passport remains first-class
  - Dashboard must shrink in role
  - Community Home and Marketplace must narrow in role

### Phase 1: Shared interaction stability
Goal:
- stop misrouting and mobile tap fall-through before moving page content around

Focus files:
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/components/OriginLink.tsx`
- dense CTA clusters on:
  - `DashboardPage.tsx`
  - `CommunityHomePage.tsx`
  - `MarketplacePage.tsx`

Actions:
- finish shared shell stabilization
- standardize the high-risk CTA interaction pattern
- remove mixed button/link behavior where it causes route uncertainty
- verify lower-screen mobile buttons carefully

Must not do yet:
- no big route relocation
- no nav redesign

Output:
- stable tap behavior on:
  - `/app/dashboard`
  - `/app/community`
  - `/app/marketplace`
  - `/app/demand-box`
  - `/app/my-gmfn-and-i?tab=settings`

Freeze gate:
- mobile manual QA passes on the routes above

### Phase 2: Dashboard reduction
Goal:
- reduce Dashboard to a true member workspace

Dashboard should keep:
- compact top trust/identity state
- one compact attention/next-step signal
- compact notifications summary
- compact demand summary
- regular apps
- compact focus/commitment summary

Dashboard should lose or reduce:
- oversized spotlight emphasis
- deep trust explanation ownership
- finance-like preview ownership
- command-centre behavior
- duplicated helper layers

Likely files:
- `frontend/src/pages/DashboardPage.tsx`
- supporting shared guidance only if absolutely necessary

Output:
- Dashboard becomes a launcher and summary page, not a domain owner

Freeze gate:
- a user can answer:
  - where am I?
  - what should I do next?
  - which major area should I open?

### Phase 3: Community Home narrowing
Goal:
- make Community Home a true community command centre and nothing broader

Community Home should keep:
- selected community identity and role
- core community tools
- command movement into:
  - Marketplace
  - Demand Box
  - Build First Circle
  - Notifications
  - Finance
  - Trust Passport where relevant

Community Home should lose or reduce:
- partial finance ownership
- large preview ownership of other domains
- heavy spotlight/media management ownership unless truly community-command
  critical

Likely files:
- `frontend/src/pages/CommunityHomePage.tsx`

Output:
- Community Home clearly becomes the answer to:
  - which community am I in?
  - what community action do I take next?

Freeze gate:
- Community Home no longer feels like a second dashboard or partial finance hub

### Phase 4: Marketplace narrowing
Goal:
- make Marketplace a clean commerce/support continuation layer

Marketplace should keep:
- commerce identity
- member/shop discovery
- marketplace readiness
- light support continuation
- direct movement into Shop Gallery
- direct movement into Finance when money state matters

Marketplace should lose or reduce:
- partial finance ownership
- duplicated command-centre shortcuts
- heavy admin-style or community-control surfaces

Likely files:
- `frontend/src/pages/MarketplacePage.tsx`

Output:
- Marketplace clearly becomes the answer to:
  - what commerce/support activity is visible here?
  - where do I go next from this commerce state?

Freeze gate:
- Marketplace no longer feels like a duplicate community workspace

### Phase 5: Finance promotion
Goal:
- present Finance as the first-class internal money workspace it already is

Finance should own conceptually:
- `Finance`
- `Money In`
- `Money Out`
- `Payment Rails`
- `Payout Details`

Actions:
- promote Finance in navigation/model prominence
- reduce finance ownership in Dashboard, Community Home, and Marketplace
- keep existing route aliases alive
- align route labels so Finance reads as a major domain, not a hidden side room

Likely files:
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/FinancePage.tsx`
- possibly route-launch surfaces on Dashboard / Community / Marketplace

Important note:
- this phase is more architectural than cosmetic
- avoid changing route destinations unless alias coverage is preserved

Output:
- Finance is visibly first-class

Freeze gate:
- a reviewer can immediately understand that Finance is where the money truth
  lives

### Phase 6: Trust Passport reinforcement
Goal:
- keep Trust Passport strong and clearly separate from Dashboard helper logic

Trust Passport should own:
- trust reading
- trust explanation
- trust record portability
- trust evidence surfaces
- trust journey / trust explainer

Actions:
- verify no trust-explainer logic is drifting back into Dashboard as a major
  domain
- keep Dashboard trust signals compact and route users into Trust Passport for
  depth

Likely files:
- `frontend/src/pages/TrustScorePage.tsx`
- `frontend/src/pages/DashboardPage.tsx`

Output:
- Trust Passport remains a deep domain, not a fragmented helper layer

Freeze gate:
- trust explanation is clear and deep in the trust surface, but not bloating the
  dashboard

### Phase 7: Guidance reintroduction, only if needed
Goal:
- bring back only the guidance that genuinely helps users

Current state:
- `ExplainToggle` is globally disabled

Actions:
- decide whether any guidance should return
- if yes, restore only the minimum high-value places
- do not re-enable the old helper network wholesale

Possible candidates:
- one or two true deep pages
- not general-purpose clutter on every route

Output:
- guidance becomes selective and purposeful

Freeze gate:
- guidance helps action instead of adding reading burden

## Suggested order of actual execution

1. Phase 1: shared interaction stability
2. Phase 2: Dashboard reduction
3. Phase 3: Community Home narrowing
4. Phase 4: Marketplace narrowing
5. Phase 5: Finance promotion
6. Phase 6: Trust Passport reinforcement
7. Phase 7: selective guidance return if needed

## What should move where

### Move out of Dashboard
- deep trust explanation
- large spotlight ownership
- finance-like ownership
- command-centre behavior

### Move out of Community Home
- mini finance ownership
- oversized preview blocks that belong to deeper routes

### Move out of Marketplace
- partial finance ownership
- duplicate community-control surfaces

### Keep strong in Finance
- all money truth and money execution ownership

### Keep strong in Trust Passport
- all trust explanation and trust evidence ownership

## Navigation recommendation

### Preferred primary movement
- Dashboard
- Community Home
- Marketplace
- Finance
- Trust Passport

### Secondary grouped movement
- Notifications
- Loans & Support
- Identity / CCI
- My GSN and I
- Shop Control
- Admin tools

### Settings placement
- keep under `My GSN and I`
- do not consume a primary slot with Settings

## QA requirements per phase

### Required device context
- mobile-sized viewport first
- desktop second

### Required route sweep
- `/app/dashboard`
- `/app/community`
- `/app/marketplace`
- `/app/finance`
- `/app/payment/pool`
- `/app/withdrawal-instructions`
- `/app/trust`
- `/app/demand-box`
- `/app/my-gmfn-and-i?tab=settings`

### Required checks
- buttons land correctly
- routes no longer feel mixed in purpose
- heavy pages become easier to explain in one sentence
- no major route loses its core business meaning

## What success looks like

For ordinary users:
- easier to know where to go
- less clutter
- less repeated reading

For institutional or investor review:
- clearer route ownership
- less duplication
- stronger viability/scalability impression
- architecture looks intentional, not accumulated

## Final recommendation
Do not continue broad UI patching without this plan.

The next real implementation move should be:
- Phase 1 if interaction stability is still uncertain
- otherwise Phase 2 immediately, beginning with Dashboard reduction

This plan should be treated as the execution companion to
`docs/PRODUCTION_INFORMATION_ARCHITECTURE_BLUEPRINT_2026-04-19.md`.
