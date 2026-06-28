# Community Domain Implementation Plan

Date: 2026-06-28

Status: Implementation planning contract. This document structures the paid
institutional Community Domain package before schema, route, billing, or UI
work begins.

Sources:

- Product-owner direction from 2026-06-28.
- `GSN_Community_Operating_Engine_Blueprint_for_Coders.docx`, inspected from
  the owner's provided attachment.
- Existing repository specs, especially
  `docs/GSN_VERIFIED_COMMUNITY_DOMAIN_SPEC_2026-06-18.md` and
  `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`.

Unabated truth:

- GSN does not yet have the full Community Domain product implemented.
- Current code has useful spines: `Clan`, `ClanMembership`,
  `CommunityDomainAffiliation`, `CommunityMemberVerification`,
  `CommunityMemberVerificationRequest`, feature entitlements, and payment
  instructions for current `community-package` bundles.
- Those spines are not the same as a durable paid institutional
  `CommunityDomain` object with billing lifecycle, hierarchy, roles,
  permissions, module settings, dashboard, analytics, and trust relay paths.
- The next code slice must not pretend that changing button copy creates the
  institutional product.

## 1. Product Split

GSN now has two community concepts.

### Type 1 - Community

A `Community` is the lightweight social/invite relationship layer.

It supports:

- create a community;
- invite friends or known members;
- join an existing community;
- basic membership and participation;
- ordinary social trust context.

This path is free or lightweight. It does not require a purchased domain,
formal governance, department hierarchy, renewal, or institutional operating
space.

### Type 2 - Community Domain

A `Community Domain` is the paid institutional operating space for real-world
organized bodies.

It supports:

- legal or public organizational identity;
- domain name and domain ownership inside GSN;
- owner/admin governance;
- branches, departments, classes, committees, zones, or sections;
- recurring subscription or package activation;
- module settings for GSN services;
- member approval and role assignment;
- evidence, verification, analytics, and trust propagation.

The user-facing entrances should stay separate:

```text
Create Community
Purchase Community Domain
```

Optional third entrance for later:

```text
Upgrade Existing Community to Community Domain
```

That third entrance matters because some existing lightweight communities may
later become formal churches, associations, schools, unions, cooperatives, or
market bodies inside GSN.

## 2. Naming Contract

Use these names consistently.

| Name | Meaning |
| --- | --- |
| Community | Free/lightweight social unit. |
| Community Domain | Durable institutional object bought/owned by an organization. |
| Community Domain Package | The commercial subscription/package that activates or renews the domain. |
| Verified Community Domain | A stronger verified/protected state of a Community Domain. |
| Community Domain Engine | The operating engine that starts after a Community Domain exists. |
| Community Package | Existing bundle language; should be phased away or scoped to specific feature bundles, not used as the object name. |

Devil's advocate:

- Calling the product `Community Package` will confuse users and coders,
  because a package sounds like a payment bundle, not an operating home.
- Calling everything simply `Community` will hide the most valuable SaaS line:
  schools, churches, unions, branches, markets, cooperatives, clubs, and
  associations paying for a governed digital home.
- Hard-coding separate engines for school, church, union, and market would
  make the system expensive and brittle. The correct object is one configurable
  Community Domain with generic hierarchy nodes and module settings.

## 3. Community Domain Package Lifecycle

The institutional package should follow this lifecycle:

1. Draft
   - User starts `Purchase Community Domain`.
   - GSN creates a draft intent, not a live domain.
   - The draft can collect name, type, owner, country/state, and intended use.

2. Domain Check
   - User chooses a domain name or display identity.
   - Backend checks uniqueness, reserved words, impersonation risk, and
     blocked terms.

3. Package Quote
   - Backend returns the package offer, included modules, price, renewal
     period, and limits.
   - This should be a Community Domain Package, not a generic community package.

4. Payment Instruction
   - GSN creates a payment instruction or expected payment.
   - Payment instruction does not activate the domain by itself.
   - Activation requires confirmed payment or an approved admin override.

5. Provisioning
   - Backend creates or upgrades the underlying community record.
   - Backend creates the Community Domain record.
   - Backend creates default service settings, owner role, admin role, member
     role, and default root node.

6. Configuration
   - Owner defines structure: departments, branches, classes, zones,
     committees, sections, chapters, or similar.
   - Owner chooses membership rules and enabled modules.

7. Launch
   - Domain becomes active.
   - Members can request membership or enter by invite.
   - Admins can approve, assign roles, and manage nodes.

8. Renewal / Suspension
   - Domain has renewal date and subscription state.
   - Expired domains should keep evidence history but restrict paid operating
     tools until renewed.

## 4. Backend Data Spine

Do not create database migrations until the first backend slice is approved.
This is the target spine.

### CommunityDomain

Durable institutional object.

Fields:

- `id`
- `community_id` or `clan_id`
- `domain_name`
- `display_name`
- `domain_type`
- `owner_user_id`
- `status`
- `verification_status`
- `country`
- `state`
- `public_profile`
- `created_at`
- `updated_at`

Status values:

- `draft`
- `pending_payment`
- `active`
- `suspended`
- `expired`
- `closed`

### CommunityDomainSubscription

Commercial package/renewal state.

Fields:

- `id`
- `community_domain_id`
- `package_code`
- `billing_cycle`
- `price_amount`
- `currency`
- `payment_reference`
- `payment_status`
- `starts_at`
- `renews_at`
- `expires_at`
- `status`

This can integrate with existing `FeatureEntitlement` and payment instruction
logic, but should not be reduced to only feature credits.

### CommunityNode

Generic hierarchy engine.

Fields:

- `id`
- `community_domain_id`
- `parent_node_id`
- `name`
- `node_type`
- `description`
- `sort_order`
- `status`

Examples of `node_type`:

- `branch`
- `department`
- `class`
- `committee`
- `zone`
- `section`
- `chapter`
- `unit`
- `group`

The database should not need separate tables for `SchoolClass`,
`ChurchDepartment`, `UnionBranch`, or `MarketSection`.

### CommunityDomainMembership

Membership inside the institutional domain.

Options:

- extend existing `ClanMembership` carefully, or
- create a domain-specific membership table that links back to the existing
  global community membership.

Fields:

- `id`
- `community_domain_id`
- `user_id`
- `primary_node_id`
- `status`
- `role_id`
- `joined_at`
- `approved_by_user_id`

Devil's advocate:

- Adding `node_id` directly to current `ClanMembership` may look quick but can
  break many-to-many reality. One person can belong to more than one department
  or branch context. A separate assignment table may be safer.

### CommunityNodeMembership

Many-to-many node assignment.

Fields:

- `id`
- `community_domain_id`
- `node_id`
- `user_id`
- `role_id`
- `status`
- `assigned_by_user_id`

### CommunityDomainRole

Custom role definitions.

Starter roles:

- Owner
- Admin
- Node Admin
- Moderator
- Verified Member
- Pending Member
- Guest/Public Viewer

Fields:

- `id`
- `community_domain_id`
- `name`
- `system_key`
- `is_system`
- `permissions_json`

### CommunityDomainServiceSetting

Per-domain module toggles and visibility policy.

Modules:

- members
- structure
- shops
- spotlight
- vault
- demand
- verification
- events
- trust_centre
- analytics
- notifications

Fields:

- `community_domain_id`
- `module_key`
- `enabled`
- `visibility_policy`
- `settings_json`

### CommunityTrustRelayPath

Trust propagation and repost path.

Fields:

- `id`
- `content_type`
- `content_id`
- `source_user_id`
- `source_community_id`
- `source_domain_id`
- `bridge_user_id`
- `destination_community_id`
- `destination_domain_id`
- `relay_reason`
- `created_at`

This is what proves how a spotlight, shop block, vault link, demand, or trust
signal moved from one community context to another.

## 5. API Shape

Recommended route family:

```text
POST   /community-domains/drafts
GET    /community-domains/availability?domain_name=
POST   /community-domains/{id}/package-quote
POST   /community-domains/{id}/payment-instruction
POST   /community-domains/{id}/activate
GET    /community-domains/{domain_name}
GET    /community-domains/{id}/dashboard

POST   /community-domains/{id}/nodes
GET    /community-domains/{id}/nodes/tree
PATCH  /community-domains/{id}/nodes/{node_id}

POST   /community-domains/{id}/membership-requests
POST   /community-domains/{id}/membership-requests/{request_id}/approve
POST   /community-domains/{id}/membership-requests/{request_id}/reject

POST   /community-domains/{id}/roles
PATCH  /community-domains/{id}/roles/{role_id}

GET    /community-domains/{id}/service-settings
PATCH  /community-domains/{id}/service-settings/{module_key}

POST   /shops/{shop_id}/community-domain-visibility
POST   /spotlights/{id}/publish-to-community-domains
POST   /spotlights/{id}/relay-to-community-domain
GET    /community-domains/{id}/analytics
```

Compatibility rule:

- Existing `/clans` routes can remain the lightweight community surface.
- New paid institutional work should use `/community-domains` so coders do not
  confuse social community actions with institutional administration.

## 6. Frontend Product Surfaces

### Entry

Pre-auth or early-auth entry should show:

```text
Create Community
Purchase Community Domain
```

`Create Community` remains the simple starter/founder flow.

`Purchase Community Domain` opens an institutional purchase/provisioning flow.

### Community Domain Purchase Flow

Screens:

1. Purpose and organization identity
2. Domain name availability
3. Package selection / quote
4. Payment instruction
5. Pending activation
6. Provisioned dashboard

No bottom nav before authentication, per project rule.

### Community Domain Dashboard

Primary lanes:

- Identity
- Structure
- Members
- Roles
- Modules
- Shops
- Spotlight
- Vault
- Verification
- Trust Centre
- Analytics
- Billing
- Settings

The first MVP dashboard should not expose everything at once. It should follow
the guided work-surface rule:

- one identity hero;
- one primary next action;
- compact status rows;
- deeper lanes opened one at a time.

### Public Domain Home

Purpose:

- show the organization exists inside GSN;
- show public-safe identity, domain status, and next safe action;
- avoid exposing private membership, private nodes, finance records, or raw
  activity.

Potential route:

```text
/domains/:domainName
```

or, if the app route system prefers explicit product language:

```text
/community-domains/:domainName
```

## 7. Shared GSN Services Become Domain-Aware

The Community Domain should not replace existing services. It should add a
community-aware operating layer around them.

| Service | Domain-aware behavior |
| --- | --- |
| Shops | Owner chooses which Community Domains can see the shop or selected blocks. |
| Spotlight | Owner can publish inside own domain or pay/relay into permitted domains. |
| Vault | Owner shares private blocks with approved members, nodes, or invited viewers. |
| Demand Box | Demand can be scoped to a domain, node, or permitted cross-domain audience. |
| Verification | Evidence ties back to domain membership, role, and node context. |
| Trust Passport | One member identity carries many community/domain contexts. |
| TrustSlip | Portable evidence can include relevant domain membership evidence. |
| Notifications | Audiences can be domain-wide, node-specific, role-specific, or invite-specific. |
| Analytics | Shows membership, module activity, trust relay, shop/spotlight reach, and evidence currentness. |

## 8. MVP Slice Order

### Slice 1 - Product Contract and Audit

Deliverables:

- this implementation plan;
- terminology references in existing specs;
- audit of existing backend/frontend surfaces that still say `Community
  Package` when they mean institutional domain.

No schema changes.

### Slice 2 - Backend Domain Skeleton

Deliverables:

- SQLAlchemy models and Alembic migration for `CommunityDomain`,
  `CommunityDomainSubscription`, `CommunityNode`, role/settings tables, and
  node membership assignment;
- unit tests for domain creation, uniqueness, status, and owner access;
- no public UI yet.

Risk:

- Database schema is frozen/high-risk. This must be a small reviewed slice.

### Slice 3 - Purchase / Provisioning Flow

Deliverables:

- draft intent route;
- domain availability route;
- package quote route;
- payment instruction route wired to existing payment infrastructure;
- activation/provisioning route that creates default roles/settings/root node;
- backend tests proving payment instruction is not activation.

### Slice 4 - Domain Dashboard MVP

Deliverables:

- `Purchase Community Domain` entry path;
- provisioned dashboard shell;
- identity/status hero;
- next action;
- structure/member/module compact lanes;
- no bottom nav before auth.

### Slice 5 - Structure and Membership

Deliverables:

- node tree CRUD;
- membership request/approval;
- node assignment;
- starter roles and permissions;
- audit tests for permission boundaries.

### Slice 6 - Shared Service Integration

Deliverables:

- shop visibility by domain;
- spotlight publish-to-domain;
- vault visibility by domain/node/member;
- verification evidence linked to domain;
- notifications scoped to domain/node/role.

### Slice 7 - Trust Relay and Analytics

Deliverables:

- repost/relay path recording;
- analytics dashboard;
- public-safe domain evidence summary.

## 9. Acceptance Criteria

The Community Domain package is not real until all of this is true:

- an owner can start `Purchase Community Domain`;
- domain name availability is checked;
- a payment instruction can be generated;
- domain is not active until payment/admin confirmation;
- activation provisions identity, owner role, settings, and root node;
- admin can create branches/departments/classes/committees through generic
  nodes;
- members can request entry;
- admins can approve, reject, assign roles, and assign nodes;
- one GSN member can belong to many communities/domains with one identity;
- shops, spotlight, vault, verification, and notifications can be scoped to the
  domain;
- a relay/repost path records source, bridge member, and destination domain;
- public viewers see safe domain evidence without private records;
- expired/suspended domains keep history but lose paid operating rights until
  renewed.

## 10. First Safe Code Move

The first implementation code slice should be backend-only and test-led:

1. Add the `CommunityDomain` and `CommunityNode` models behind migration.
2. Add domain availability and draft creation routes.
3. Add tests proving:
   - domain names are unique;
   - draft is not active;
   - only the owner/admin can continue provisioning;
   - existing lightweight community creation still works.

Do not start with the dashboard UI. The UI would look impressive but could
hide the absence of a real billing/provisioning object.

## 11. Open Product Decisions

These must be decided before pricing/UI copy hardens:

- Package tiers: one starter institutional package or multiple tiers?
- Renewal period: monthly, yearly, or both?
- Can an existing lightweight community be upgraded in place?
- Should the public URL be `/domains/:name` or `/community-domains/:name`?
- Which modules are included by default?
- Does domain verification require documents, admin approval, member witness,
  parent-domain affiliation, or some combination?
- What happens to member access when a domain expires?

Until those are answered, code should keep defaults conservative and avoid
claims that imply legal certification, payment movement, loan approval, or
guaranteed trust.
