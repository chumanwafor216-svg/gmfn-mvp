# Canonical System Skeleton

## Date
2026-04-19

## Status
Canonical architecture clarification from product-owner explanation.

This document is now the required reference for route-purpose work,
information-architecture work, and major navigation decisions.

If this document conflicts with earlier provisional architecture docs, this
document wins until those docs are revised.

## Purpose
This document records the product skeleton in the simplest authoritative form
so that future engineering work does not drift away from the real system model.

It is not a cosmetic note.
It is the working architecture basis for:

- route ownership
- page purpose
- navigation decisions
- trust and finance interpretation
- future implementation and review work

For the innovation-case, investor, policy, development-finance, TrustSlip, and
merchant-verification meaning of this architecture, also read:

- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`

## Core identity rules

### 1. Community identity
Every community has:

- one global community ID
- its own visible/community-facing name on the surface

The surface name may vary by context, but the global community ID is the stable
system identity.

### 2. Member identity
Each individual has:

- one global member ID only

That one global member ID remains the same even if the person belongs to many
communities.

The member does not become a different identity in each community.

Important architectural meaning:

- the member's identity is stable across all communities
- Marketplace may show that identity in one selected community
- but the stronger identity anchor belongs to the combined community layer
- Community Home is therefore the clearer place from which one member identity
  is understood across many communities

### 3. Shop ownership
One global member ID is entitled to:

- one shop only

That same shop is the shop that appears across every community/marketplace the
member belongs to.

The member does not get a separate shop for each community.

### 4. Vault ownership
One shop is entitled to:

- six vaults

Vaults are locked surfaces.
They are not open by default.
Viewing is conditional and authorization-based.

## Canonical hierarchy

### Dashboard
Dashboard is not the command centre.
Dashboard is not the operational nucleus.

Dashboard is:

- a reflector
- a compact summary screen
- a cross-angle view of what is happening
- a place to decide where to go next

Dashboard should not try to own the deeper work.

### Community Home
Community Home is the index of all communities a member belongs to.

It is the combined community layer.
It is where the member should be able to see:

- the communities they belong to
- the identity of those communities
- the cross-community record that belongs at that level
- the aggregate spotlight/demand view that is fed from multiple marketplaces
- the cross-community integrity view that belongs above one marketplace

Community Home should not open the full working internals of every community on
the same surface.

### Community Home page composition rule
Community Home should open by answering one plain question:

- Community Home of who?

The first block should therefore be the member-owner identity block. It should
show the owner of this Community Home, including:

- the member's visible name or holder name
- the one global member ID
- the one shop attached to that global member ID
- the member's current spotlight exposure entitlement/status
- the member's cumulative pool position across all communities where available

The cumulative pool number on this first block is only a summary signal. The
full finance breakdown belongs in Finance.

Important identity correction:

- one global member ID owns one shop
- Community Home is the place where that member identity is gathered and
  operated from across communities
- the shop is not multiplied by the number of marketplaces the member belongs to

After the owner identity block, Community Home should show a compact list of the
communities/marketplaces the member belongs to. This list should be simple and
direct, not a long explanatory surface.

Each community row should show:

- row number or clear entry position
- community or marketplace name
- global community ID
- shop / marketplace entry point

Selecting a row should carry that selected community context and open the
working Marketplace for that community. The deeper member list, demand work,
finance detail, invite-link work, and marketplace activity should happen after
that move, not inside the Community Home list itself.

After the community list, Community Home should provide owner-level summary and
control blocks in this order where possible:

- cumulative finance summary
- cumulative trust / Trust Passport summary
- shop control and outward links
- create new community / first-circle continuation
- spotlight apparatus and exposure controls

The cumulative finance summary should point to Finance. It should summarize the
member's overall finance position across communities, such as total pool
position, money locked because of guarantees, earnings from guarantees, support
given, support received, and total exposure where available. Individual
marketplace finance records still belong inside the relevant marketplace or the
deeper Finance workspace.

The cumulative trust summary should point to Trust Passport. It should summarize
the member's carried trust story across communities, while each marketplace
still keeps its own local trust truth.

Shop control belongs on Community Home because the shop follows the one global
member ID. Shop control may include shop media, shop-facing links, Vault links,
spotlight links or controls, and other outward viewing tools. Marketplace still
governs where that shop is visible, but Community Home is the owner-side place
to manage the one shop.

Creating a new community can be started from Community Home even for an existing
member. After creating a new community, the next natural step is first-circle
work: invite the first trusted people and build the starting circle for that new
community.

### Community Home marketplace rollup rule
Community Home is where each marketplace/community the member belongs to can be
seen as one line, card, or command entry.

At this level, the system may show marketplace-level standing such as:

- marketplace/community identity
- marketplace/community finance health
- marketplace/community trust standing
- marketplace/community CCI or group-integrity reading
- entry into that one marketplace

This is group-dynamics information.
It is not the same thing as exposing every member's private financial record or
full personal Trust Passport.

Important privacy and route rule:

- Community Home can compare or summarize marketplaces as groups
- Finance can show the member's own cumulative finance story
- Trust Passport can show the member's own cumulative trust story
- Marketplace can show the local standing needed inside one selected community
- private member-level records must not be exposed as group rollup data

### Marketplace
Marketplace is the operational nucleus of one specific community.

When a member selects a community from Community Home, the member opens that
community as a Marketplace.

So:

- Community Home = all my communities together
- Marketplace = one specific community in action

Marketplace is the strongest internal working domain for one community.

For the concrete Marketplace page block order and screen-composition rules, also
read:

- `docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md`

## What every marketplace should contain
Every marketplace should contain the core operational tools for that one
community, including:

- Shop Gallery
- marketplace-owned invite links
- marketplace-specific finance activity
- Borrow / Lend / Support
- marketplace demand participation
- marketplace spotlight contribution
- Vault
- programme / target / support tools that belong to that community

These are system-level marketplace capabilities.
They are not optional in principle just because communities differ by content.

Important distinction:

- Marketplace is the unit where one community's own activity happens
- some domains are then combined upward across multiple marketplaces

## Marketplace-owned invite links
Invite links belong to Marketplace, not to Dashboard and not to the combined
Community Home layer.

Reason:

- invite links are customized for one marketplace/community unit
- their wording should suit that marketplace
- they travel outward from that marketplace to outsiders or returning members
- they carry that marketplace/community identity with them so return decisions
  resolve back into the same marketplace context

This means every marketplace should be treated as owning a marketplace-specific
invite-link set by default.

The canonical marketplace invite-link set should cover outward access/use cases
such as:

- joining that marketplace/community
- viewing the member's shop from that marketplace context
- viewing authorized Vault content from that marketplace context
- other marketplace-specific outward viewing/access links required by the
  product rules of that marketplace

Confirmed implementation facts in the current repo:

- the current community join invite route already exists through the
  marketplace/community invite flow
- a shop-view link is already sketched in the Marketplace workspace references
- vault-access-link infrastructure already exists in the frontend API layer and
  backend services

Canonical product rule:

- every new marketplace should inherit the marketplace-owned invite-link
  capability as part of its system-level tool set
- those links should not be treated as cross-community Community Home tools
  just because the member belongs to multiple communities
- the combined Finance domain and combined Trust Passport domain may aggregate
  meaning upward, but invite-link ownership stays localized to each marketplace

## Shop Gallery
Shop Gallery is an offshoot of Marketplace, but it is not trivial.

It is the member's storefront/public-facing commerce surface.
It is the interface between:

- the member
- the wider community / outside viewers

Important rules:

- the same single shop appears across all marketplaces the member belongs to
- internal community members can view the shop in their marketplace context
- outside viewers may view it through the appropriate link/invite path

Exposure rule:

- shop ownership follows the one global member ID
- but shop exposure is governed by community membership boundaries
- in normal operation, the shop is visible through the communities and
  marketplaces the member belongs to
- broader exposure can extend only through the approved outward-link/repost
  logic of the product

So:

- shop identity is member-global
- shop exposure is community-governed
- Marketplace is where that community-governed exposure becomes active for one
  selected community

Because of the role it plays, Shop Gallery deserves strong recognition even
though it sits under Marketplace conceptually.

Shop Gallery is separate in emphasis because it is not only inward-facing.
It is also outsider-facing/customer-facing.

For that reason, it should stay strongly recognized even though it is still
marketplace-linked.

## Finance
Finance as a first-class domain should combine the member's finance activity
across all marketplaces the member belongs to.

Each marketplace still has its own marketplace-specific finance truth.
That marketplace-specific finance truth is one unit inside the broader Finance
domain.

So Finance should hold the combined reading of:

- money support
- borrowing
- lending/support participation
- incoming and outgoing money activity
- related financial record across the marketplaces the member belongs to

At the same time, each individual marketplace still has its own peculiar/local
finance record.

Marketplace-specific finance activity includes:

- money support
- borrowing
- lending/support participation
- incoming and outgoing money activity
- related financial record inside that marketplace

So the relationship is:

- Marketplace finance = one community's finance unit
- Finance domain = the combined finance reading across marketplaces

Important architectural anchor:

- Finance should see one global member ID through the eyes of all communities
  the member belongs to
- it gathers local finance units from marketplaces
- but the stronger combined truth belongs to the cross-community layer
- Community Home is therefore the clearer anchor from which the broader Finance
  reading is understood

### Finance group-dynamics distinction
Finance has a personal cumulative meaning and a marketplace/group rollup
meaning. These must not be collapsed into one unclear screen.

Personal cumulative Finance answers:

- what this one global member ID has done financially across marketplaces
- whether this member is becoming overexposed
- how this member has borrowed, supported, repaid, guaranteed, or moved money
  across communities

Marketplace/group finance rollup answers:

- how one marketplace/community is doing financially as a group
- whether that marketplace has healthy support flow, exposure, repayment, and
  money movement
- how one marketplace compares with another marketplace in the member's
  Community Home

Community Home may show marketplace/group finance summaries.
The Finance domain should remain the deeper finance workspace for the member's
own cumulative money story and any permitted marketplace finance details.

## Trust, CCI, Trust Passport, and TrustSlip

### Trust
Trust in one marketplace represents how that one community sees and judges the
member's behavior in that specific place.

Trust can vary between marketplaces.

### CCI
CCI belongs to the cross-community layer.

It is more naturally built from the combined community view rather than only one
marketplace.

### Trust Passport
Trust Passport exists because a member's trust must travel across marketplaces.

Trust Passport is the combined trust/evidence layer across the communities and
marketplaces the member belongs to.

It should represent:

- trust activity in one marketplace
- trust activity across all marketplaces together
- carried-forward trust meaning across communities

So the relationship is:

- marketplace trust = trust truth in one community
- Trust Passport = combined trust reading across marketplaces/communities

Important architectural anchor:

- Trust Passport gathers local trust truth from marketplaces
- but its stronger combined meaning belongs to the cross-community layer
- Community Home is therefore the clearer anchor from which one member's trust
  position across many communities is understood

### Trust group-dynamics distinction
Trust also has two readings that must stay clear.

Personal Trust Passport answers:

- who this one global member ID has been across communities
- what trust evidence, repair path, support behaviour, repayment behaviour, and
  carried-forward meaning belongs to that person

Marketplace/group trust rollup answers:

- how one marketplace/community behaves as a group
- whether members in that marketplace are supporting each other responsibly
- whether the group is becoming stronger or weaker in trust terms
- how one marketplace compares with another marketplace in the member's
  Community Home

Community Home may show marketplace/group trust summaries.
Trust Passport should remain the deeper personal trust and evidence workspace.

### TrustSlip
TrustSlip exists so that a member does not need to start from zero in every new
marketplace.

It helps other communities see the member in a truer carried-forward form,
rather than only as a brand-new stranger.

TrustSlip should be understood as the portable current proof, not the full trust
story.

The fuller trust story belongs in Trust Passport.

TrustSlip is the smaller verified view that can travel outward for a specific
decision, such as merchant confidence, controlled access, or a time-bound
verification moment.

## Merchant verification
Merchant verification is a marketplace-linked outward confidence tool.

It is used when a person needs to trade, receive goods, or be checked by someone
outside the immediate circle where they are already known.

The relationship is:

- Trust Passport = full accumulated trust story
- TrustSlip = portable current proof
- Merchant verification = the process of checking that proof before a trading
  or release decision

Merchant verification should not expose the whole Trust Passport by default.

It should show only the permitted TrustSlip view, with the right visibility
level, evidence reference, expiry, and disclaimer.

Important rule:

- TrustSlip and merchant verification may support confidence
- they are not a bank guarantee
- they do not imply auto-debit
- they need consent, auditability, and plain-language explanation

## Spotlight and Demand Box

### Spotlight
Spotlight is not just the property of one marketplace.

Spotlight is a community-home-level aggregate fed by multiple marketplaces.
Each marketplace contributes a quota of spotlight exposure into that larger
spotlight stream.

Important consequences:

- not every member in a marketplace will have spotlight exposure at the same
  time
- spotlight may appear as a smaller screen or reflection elsewhere, including on
  Dashboard or Shop-related surfaces
- the actual ownership of the spotlight feed belongs above one marketplace
- normal spotlight visibility is bounded by the communities and marketplaces
  inside the member's Community Home circle
- visibility beyond that boundary must move through approved outward paths such
  as repost logic, shop links, vault links, or other authorized invite/share
  links

### Demand Box
Demand Box is the opposite-side counterpart to Spotlight.

Where Spotlight is closer to seller looking for buyer, Demand Box is closer to
buyer looking for seller/support.

Demand Box is also an aggregate cross-marketplace/community-home-level concern,
even though every marketplace member is entitled to create demand and respond
within marketplace rules.

Important consequences:

- demand originates from members inside marketplaces
- the broader demand reading can aggregate upward
- it should not be mistaken for a purely isolated one-marketplace artifact

## Admin / oversight
Admin is not the ordinary operating layer for the member.

Admin is primarily:

- oversight
- record keeping
- observation
- inference/support for external review and system management

Admin should not be confused with the member's working surfaces.

Admin sits on the other side of ordinary member activity.
It should:

- observe
- record
- infer
- support oversight and evidence

It should not be treated as an interfering participant in the member's normal
community and marketplace flow.

## Route-purpose consequences

### Dashboard
Should remain:

- a reflector
- a launcher
- a summary surface
- a place where smaller screens of wider aggregate systems may appear

Should not become:

- a command centre
- a deep trust surface
- a full finance surface
- a full marketplace workspace

Dashboard is therefore best understood as:

- a reflector of what is happening now
- not the owner of the underlying domains

### Community Home
Should remain:

- the list/index of all communities the member belongs to
- the cross-community anchor
- the place that commands the aggregate spotlight/demand/cross-community view

Should not become:

- the full operational surface of one community

### Marketplace
Should remain:

- the operational nucleus of one community

Marketplace should be understood as the core working place for that selected
community.

### Shop Gallery
Should be treated as:

- a major marketplace-linked domain
- not a trivial sub-item

It is conceptually under Marketplace, but important enough to deserve strong
navigation recognition.

### Finance
Should be understood in two layers:

- marketplace finance truth inside one community
- combined finance truth across all marketplaces in the Finance domain

### Trust Passport
Should remain a strong domain because it carries:

- trust portability
- evidence
- cross-marketplace meaning
- combined trust understanding across communities/marketplaces

## Simple movement model

```text
Dashboard
  -> reflects what is happening
  -> sends the member to the right place

Community Home
  -> first answers "Community Home of who?"
  -> shows the member-owner identity and one global member ID
  -> anchors the one shop attached to that member ID
  -> shows the member's cumulative pool/finance signal where available
  -> lists all communities the member belongs to
  -> shows each community as a compact line with community ID and entry point
  -> opens the chosen community as Marketplace
  -> carries cross-community summary records and aggregate spotlight/demand view
  -> may summarize marketplace finance/trust/CCI as group dynamics
  -> holds owner-side shop control, outward links, spotlight apparatus, create-community, and first-circle continuation

Selected community
  -> opens as Marketplace

Marketplace
  -> contains Shop Gallery
  -> owns one community's outward invite-link set
  -> contains one community's finance activity
  -> contains one community's demand activity
  -> contributes one community's spotlight activity
  -> contains Borrow/Lend/Support
  -> contains Vault

Finance
  -> combines the member's finance across marketplaces
  -> can also support permitted marketplace/group finance detail

Trust Passport / TrustSlip / CCI
  -> interpret and carry identity/trust across marketplaces and communities
  -> keep personal trust evidence separate from marketplace/group trust rollups
```

## Working rule for future assistants
Before doing route redesign, page-ownership changes, or navigation changes:

1. read this document
2. read `docs/PROJECT_PROTOCOL.md`
3. read the current route-specific code
4. do not revert to the older assumption that Community Home is the main
   operational nucleus

The operational nucleus of one community is Marketplace.
Community Home is the combined community index layer.
