# Marketplace Page Blueprint

## Date
2026-04-20

## Status
CLOSED/FROZEN as of 2026-10-08 after Marketplace Rebuild Phases 1-3 and final verification gate.

This document does not replace the broader canonical system skeleton.
It explains how the Marketplace page itself should be arranged and how its
buttons and blocks should behave.

If this document conflicts with the broader product skeleton, the broader
canonical system skeleton still wins unless both are intentionally revised
together.


## Marketplace CLOSED/FROZEN contract - 2026-10-08
The canonical `/app/marketplace` surface is frozen around this contract:

- real needs first;
- contextual relevant provider relationships directly under the applicable need;
- Shops & Services as the neutral directory/discovery mode;
- DemandBox owns request lifecycle, detailed matching, closure, and request management;
- Public Shop owns shop/provider detail, contact, and visitor/provider action;
- Shop Control owns owner-side shop management;
- Trade Evidence owns formal evidence preservation;
- no hidden trust/quality ranking, endorsement, score, token, paid-placement, best-provider, verified-provider, or guarantee language in Marketplace need-provider presentation;
- Marketplace connects action but must not absorb every workflow.

Final phone-first order is:

1. compact Marketplace/community context;
2. `Ask for something`;
3. active `Community need` rows;
4. contextual `Relevant provider` rows under the applicable need;
5. `Shops & Services` preview and directory handoff;
6. unique overflow provider connections only when they are not already shown under visible need cards;
7. active/contextual money, support, ROSCA, or Trade Evidence areas when state exists;
8. secondary tools;
9. demoted `Suggested next step` / Marketplace Wisdom.

Older block-order prose below is retained as historical capability guidance only where it does not conflict with this frozen phone-first order. It must not be used to restore a profile/shortcut-first Marketplace front.
## Phase 1 live-market implementation note - 2026-10-08
The canonical `/app/marketplace` surface now starts from the human flow `NEED -> DISCOVER -> CONNECT -> ACT` rather than a console-first tool dump. The first phone viewport should prioritize current DemandBox needs, Shops & Services, and relevant DemandBox matches. Money/support/ROSCA, board/notices, marketing, Trade Evidence, and access-link tools remain reachable as contextual or secondary controls.

`frontend/src/pages/MarketplaceWorkspacePage.tsx` is source-stale/unmounted as of this pass; do not treat it as a canonical route without a fresh owner decision.

## Phase 2 Shops & Services discovery note - 2026-10-08
The canonical `/app/marketplace` Shops & Services lane is a lightweight community business directory, not a member roster and not a mini Public Shop. It uses only existing visible shop/product/match data: shop/business name, owner label, description, public contact availability, image/logo aliases, active/public status, community/domain labels, loaded product/service names/descriptions, and existing DemandBox match titles.

Search is local/client-side across those loaded text fields. No category filters are exposed in this phase because current shop/product responses do not provide a trustworthy structured category taxonomy. Ordering is neutral alphabetical by displayed business/shop name; it must not imply quality, TrustSlip/CCI rank, paid placement, or recommendation. DemandBox relevance may appear only as a light `Relevant to current need` signal from existing match rows, without exposing scores or absorbing the DemandBox lifecycle. The primary card action remains `Open shop` to the canonical Public Shop.
## Phase 3 Needs to Relevant Providers note - 2026-10-08
The canonical `/app/marketplace` live front now translates the human flow `Need -> Relevant provider -> Open shop -> act`. A visible request is labelled as a `Community need`; an associated DemandBox supply match is labelled as a `Relevant provider`; an unassociated directory listing remains a normal `Shops & Services` shop.

`Relevant provider` is neutral: it means the existing DemandBox supply-match response found a plausible shop/product connection for that need. It must not be treated as GSN endorsement, trustworthiness, best-provider ranking, guaranteed suitability, or guaranteed availability. Marketplace preserves the existing backend response order from `getDemandSupplyMatches`; it does not add scores, tokens, or frontend ranking language.

The direct need remains visually primary. Matching providers render compactly beneath the need with `Open shop` as the handoff to canonical Public Shop/contact behavior. DemandBox still owns create/edit/lifecycle/detailed matching/trade handoff/closure. The previous generic `Needs with possible supply` block should not return as a duplicate list; any separate provider block is only overflow for matches tied to needs not shown above. No-match wording stays community-scoped and must not imply a global supplier search.
## Route in focus
- `/app/marketplace`

## Purpose
Marketplace is the operational nucleus of one selected community.

It is the place where:
- one community becomes active
- one community's finance unit becomes active
- one community's trust reading becomes active
- one community's demand/support/member/shop activity becomes active

Marketplace is not:
- the combined index of all communities
- the cumulative finance domain
- the cumulative trust domain
- a generic reflector like Dashboard

## Core page rule
When the user opens Marketplace, the page must answer these questions first:

1. Which community/marketplace am I inside right now?
2. Who am I inside this marketplace right now?
3. What is my local standing here right now?
4. What can I do next from this marketplace right now?

Everything on the page should stay scoped to that one selected marketplace.

## Marketplace page order

### Block 1. Marketplace Profile and Member Standing
This must be the first block.

This is the billboard / DP / profile block for the active marketplace.
It should describe both:
- the marketplace itself
- the current member's standing inside that marketplace

#### 1A. Marketplace identity lane
Should show:
- marketplace/community picture or billboard
- marketplace/community name
- marketplace/community story or short description
- marketplace/community global ID
- marketplace trust standing for that marketplace

Confirmed current truth already available in code:
- community / marketplace name
- community description
- community/global code
- community trust band/class style fields
- community image candidates

#### 1B. Current member standing lane
Should show the current member inside this marketplace:
- current member display name
- current member global member ID
- current member role in this marketplace
- current member local pool standing in this marketplace

Important rule:
- the member ID shown here is the same one global member ID carried across all
  communities
- this is not the combined finance view across all communities
- this is the member's local standing inside the currently selected marketplace

#### 1C. Community rail readiness lane
This first block should also show the money rails that belong to the current
marketplace:
- community money-in rail readiness
- community money-out rail readiness
- community settlement path
- personal payout path for the current member

This lets the user understand, from the first block, whether:
- money can come in
- money can go out
- the shared community rail is ready
- the member-side payout rail is ready

Important rule:
- these rails are local to the current marketplace/community
- they are not the same as the cumulative Finance domain

#### What Block 1 should not become
- not a combined cross-community finance page
- not a combined Trust Passport page
- not a giant shortcut deck
- not a spotlight ownership surface

## Block 2. Marketplace Shortcuts
This is the second block.

This block exists to open the core marketplace actions quickly.
It should contain launcher buttons only, not deep explanation overload.

### Required shortcuts
- `Finance`
- `Money In`
- `Money Out`
- `Trust Passport`
- `CCI`
- `TrustSlip`
- `Demand Box`
- `Notifications` when needed

Supporting navigation can still include:
- `Community Home`
- `Dashboard`
- `Shop`

### Shortcut rule
Every shortcut launched from Marketplace must carry the active marketplace
context with it.

Meaning:
- opening `Money In` from Aberdeen City Marketplace should clearly mean
  Aberdeen City's money-in rail
- opening `Money Out` from Aberdeen City Marketplace should clearly mean
  Aberdeen City's money-out rail
- opening `Finance` from Marketplace should land with the current marketplace
  context visible first, even though the bigger Finance domain can aggregate
  across communities
- opening `Trust Passport` from Marketplace should respect that the user came
  from one marketplace's local trust context, even though Trust Passport is the
  broader combined trust domain

## Block 3. Member Roles and Shops
This is the third block.

It should list the members visible in the current marketplace only.

### Each member row should show
- member display name
- member global member ID
- member role in this marketplace
- member's visible shop status
- a button/link to that member's Shop Gallery when available

### Shop rule
The shop opened from a member row is the same one-shop identity that follows
that member across marketplaces.

So:
- member row is marketplace-local
- shop identity is member-global
- the same shop may appear through multiple marketplaces

Important exposure rule:

- shop identity follows the one global member ID
- but shop exposure is governed by community membership boundaries
- the visible shop is therefore limited by the communities and marketplaces the
  member belongs to
- broader outward exposure can extend only through the approved share/repost
  logic of the product

### Button behavior
If a member has a visible shop in this marketplace:
- the member row should show an `Open Shop` / `Open Shop Gallery` action
- that action should open that member's shop directly

If a member does not yet have a visible shop:
- show the absence clearly
- do not fake visibility

## Block 4. Marketplace-Owned Links
This block should sit on the Marketplace page because outward links belong to
Marketplace.

### It should contain the outward links for that one marketplace
- join this community / marketplace
- view this marketplace
- view this shop
- controlled outward links such as Vault or vote-style links when the relevant
  permission/live token exists

### Key rule
These links:
- are customized for the current marketplace
- carry the marketplace/community identity outward
- should return people into the same marketplace/community context

### Important distinction
Not every outward link should be presented as one permanent public URL.

Some outward links are conditional/live links:
- Vault access
- vote-related controlled access
- other approved access routes

So Marketplace owns them, but not all of them should appear as permanently open
public routes.

## Block 5. Demand Box
This should appear on Marketplace as a real marketplace tool.

Why:
- demand originates in marketplaces even if the broader demand reading can
  aggregate upward
- the user needs marketplace-local demand action from the marketplace itself

This block should:
- show marketplace-local demand state
- open the marketplace-relevant demand activity
- avoid pretending Demand Box belongs only to the aggregate layer

## Block 6. Borrow / Lend / Support
This should remain on Marketplace as a real marketplace tool.

Why:
- support and borrowing are part of the operational life of one community
- the member needs to begin or continue the support flow from the live
  marketplace context

This block should:
- start support/borrowing work
- show local draft/readiness state when relevant
- remain connected to visible members and guarantor logic in that marketplace

## ROSCA lane rule

ROSCA is a marketplace-local operating lane, but ROSCA membership is not the
same thing as community membership.

A single marketplace/community may run more than one ROSCA cycle at the same
time. For example, one cycle may collect a smaller weekly contribution while
another collects a larger monthly contribution. The same person may belong to
one cycle, more than one cycle, or no ROSCA cycle inside the same community.

Each ROSCA cycle should carry:

- cycle name;
- contribution amount;
- currency;
- duration/frequency such as daily, weekly, monthly, yearly, or custom days;
- selected members drawn from the current community membership;
- a saved/copyable cycle record.

The cycle membership selector should open from a clear `Members` or
`Membership` control. It should let the operator choose only the people involved
in that cycle from the community membership list.

ROSCA reminders, alerts, payment notices, and cycle actions should address the
selected cycle members, not every member of the community by default.

## What does NOT own the page

### Spotlight
Spotlight should not dominate Marketplace as the main top block.

Reason:
- Spotlight is an aggregate concern above one marketplace
- individual marketplaces contribute into Spotlight
- smaller spotlight reflections may appear elsewhere
- but Marketplace should not be designed as if Spotlight is its main owner

### Dashboard
Dashboard should not be treated as a control owner over Marketplace.
Dashboard only reflects.

### Community Home
Community Home should not own the working internals of one marketplace.
It indexes communities and aggregates above them.
It is also the stronger cross-community anchor for:

- one global member identity across many communities
- cumulative Finance understanding
- cumulative Trust Passport understanding

## Relationship to Finance and Trust Passport

### Marketplace finance
Marketplace contains one community's finance unit:
- local pool standing
- local money rails
- local money movement context
- local support/borrowing movement

### Finance domain
Finance is bigger than Marketplace.
Finance combines the member's finance activity across marketplaces.

So:
- Marketplace = local finance unit
- Finance = cumulative finance domain

Important anchor:

- Finance sees one global member ID through the eyes of all communities the
  member belongs to
- it gathers local finance units from marketplaces
- but the stronger combined reading belongs to the cross-community layer
- Community Home is therefore the clearer anchor for how cumulative Finance is
  understood

### Marketplace trust
Marketplace contains one community's trust truth:
- how this one community reads the member

### Trust Passport
Trust Passport is bigger than Marketplace.
It combines trust/evidence across communities and marketplaces.

So:
- Marketplace = local trust unit
- Trust Passport = cumulative trust domain

Important anchor:

- Trust Passport gathers local trust pieces from marketplaces
- but its stronger combined meaning belongs to the cross-community layer
- Community Home is therefore the clearer anchor for how one member's trust
  position across many communities is understood

## Current repo truths already supporting this model

### Confirmed in frontend/backend now
- Marketplace page already reads one selected community as active
- community/global ID already exists in backend clan/community payloads
- marketplace/community name already exists
- community trust-style fields already exist in page payload normalization
- local money surface already exists through the marketplace community-money
  surface
- member list is marketplace/community scoped
- shop visibility is marketplace/community scoped
- marketplace invite-link contract already exists
- shop-facing public path already exists
- vault-access-link infrastructure already exists

### Confirmed limitation
There is not yet one single backend payload that returns the fully merged
Marketplace top block exactly in the final intended shape.

Right now the frontend composes that block from multiple truths:
- selected community data
- current user data
- marketplace money surface
- member rows
- invite-link results

That is acceptable for now, but the page composition must still follow the
correct architecture.

## Concrete implementation order for Marketplace page work

When implementing or refactoring Marketplace, use this order:

1. Marketplace Profile and Member Standing
2. Marketplace Shortcuts
3. Member Roles and Shops
4. Marketplace-Owned Links
5. Demand Box
6. Borrow / Lend / Support

Only after these are correct should any lighter supporting surfaces be added.

## Working rule for future assistants
Before changing Marketplace layout, route ownership, or launcher behavior:

1. read `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
2. read this document
3. inspect `frontend/src/pages/MarketplacePage.tsx`
4. inspect the current backend community/invite/money truth
5. keep Marketplace scoped to one selected community in action

Do not redesign Marketplace as:
- another Dashboard
- another Community Home
- a cumulative Finance page
- a cumulative Trust Passport page
