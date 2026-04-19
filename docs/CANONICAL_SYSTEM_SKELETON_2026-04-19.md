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

### TrustSlip
TrustSlip exists so that a member does not need to start from zero in every new
marketplace.

It helps other communities see the member in a truer carried-forward form,
rather than only as a brand-new stranger.

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
  -> lists all communities the member belongs to
  -> carries cross-community records and aggregate spotlight/demand view
  -> member selects one community

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
  -> combines finance across marketplaces

Trust Passport / TrustSlip / CCI
  -> interpret and carry identity/trust across marketplaces and communities
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
