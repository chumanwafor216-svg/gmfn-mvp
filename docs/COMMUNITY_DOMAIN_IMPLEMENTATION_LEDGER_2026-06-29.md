# Community Domain Implementation Ledger

Date: 2026-06-29

Status: programme truth ledger. This file separates implemented backend
capability from read-only projections and absent product pieces so future work
does not confuse endpoint coverage with finished Community Domain product.

## Current Safe Checkpoint

- Latest safe local code checkpoint before this ledger:
  `2a9d5ae7 Add community domain notification scope readiness map`.
- A later `commerce-visibility-readiness` slice was started, stopped, and
  reverted before commit. Do not treat that reverted work as implemented.
- This ledger is documentation only. It does not add routes, screens, schema,
  activation, billing, notifications, marketplace writes, vault writes, trust
  relay records, or deployment changes.

## Truth Categories

| Category | Meaning |
| --- | --- |
| Real write path | Existing backend route can create/update/decide/apply data. |
| Read-only projection | Existing route explains readiness, coverage, or boundaries, but does not perform the underlying product action. |
| Template/config projection | Existing route reflects constants, presets, or package assumptions without persisting settings. |
| Absent | No real durable product path exists yet in the Community Domain layer. |

## Slice Status

| Plan area | Current status | Evidence in repo | Unabated truth |
| --- | --- | --- | --- |
| Slice 1: data spine | Real write path | `CommunityDomain`, `CommunityNode`, `CommunityDomainMembership`, `CommunityNodeMembership`, `CommunityDomainPolicy`, `CommunityDomainActionReview`, decisions/comments/evidence models and routes exist. | The spine is useful, but it is still not the whole paid institutional product. |
| Slice 2: purchase entry | Partial real path | `/community-domains/availability`, `/community-domains/drafts`, `/community-domains/{id}/package-quote`. | Draft and quote exist. Payment/admin confirmation does not automatically activate a real paid domain lifecycle. |
| Slice 3: activation/lifecycle | Mostly read-only projection | `/readiness`, `/activation-requirements`, `/subscription-lifecycle`. | These routes explain blockers and lifecycle posture; they do not complete paid activation, renewal, suspension, or entitlement enforcement. |
| Slice 4: dashboard MVP | Read-only/backend projection | `/dashboard`, `/operating-map`, `/setup-plan`, `/capacity-plan`, `/rollout-plan`, `/network-presence`. | Backend projections exist. This does not mean a polished user-facing Community Domain dashboard workflow is complete. |
| Slice 5: structure and membership | Partial real path | Node create/status routes, member upsert, node-member upsert, policy upsert, action-review create/decide/apply, comments, evidence, reviewer queue. | Strongest real implementation area. Still lacks a full domain-specific member request/approval UX and a mature appeal object. |
| Slice 6: shop visibility by domain | Projection only | `/economic-participation`, `/node-economic-map`, `/module-scope-readiness`, evidence record presets mention `shop_visibility_grant`. | No real Community Domain shop visibility grant table or write path was added. |
| Slice 6: spotlight publish-to-domain | Projection only | `/network-presence`, `/module-scope-readiness`, `/trust-relay-readiness`, evidence record presets mention `spotlight_publication`. | No real Community Domain Spotlight publish-to-domain or relay path write exists here. |
| Slice 6: vault visibility by domain/node/member | Projection only | `/node-vault-map`, `/record-privacy-map`, evidence record presets mention `vault_access_grant`. | Node vault readiness exists, but no real Community Domain vault visibility grant/write path was added. |
| Slice 6: verification evidence linked to domain | Partial real path plus projection | Action-review evidence can be attached; `/evidence-map`, `/evidence-record-readiness`, `/evidence-release-readiness`, `/member-verification-map`. | Evidence metadata exists around reviews. Durable `CommunityDomainEvidenceRecord` creation/release remains projected, not real. |
| Slice 6: notifications scoped to domain/node/role | Read-only projection | `/notification-scope-readiness`. | The route deliberately does not send notifications, create jobs, create audience lists, publish announcements, or expose member lists. |
| Slice 7: repost/relay path recording | Read-only projection | `/trust-relay-readiness`, `/trust-mobility`, `/network-exchange-map`. | There is no real relay-path table/write path recording source domain, bridge member, destination domain, and content/action. |
| Slice 7: analytics dashboard | Read-only projection | `/analytics`, `/node-analytics-map`. | Analytics are aggregate readiness/coverage projections, not a mature operational dashboard or live usage meter. |
| Slice 7: public-safe domain evidence summary | Read-only projection | `/evidence-map`, `/evidence-release-readiness`, `/network-presence`. | Public-safe evidence is planned and bounded; it is not a public proof publisher or evidence release engine. |
| Slice 8: template polish/sales readiness | Template/config projection | `/templates`, `/templates/{key}/operating-blueprint`, `/service-settings`, package quote. | Templates and package language exist, but this is not yet a complete sales/admin onboarding experience for first real organizations. |

## Acceptance Criteria Snapshot

| Acceptance criterion from plan | Current truth |
| --- | --- |
| Owner can start Purchase Community Domain | Partially true via draft creation and package quote; frontend route quality not asserted here. |
| Domain name availability is checked | True. |
| Payment instruction can be generated | Partially true through package quote/payment-adjacent flow, but activation is not tied to confirmed payment here. |
| Domain is not active until payment/admin confirmation | Projected/partially enforced by status posture; not a complete paid lifecycle. |
| Activation provisions identity, owner role, settings, root node | Draft creation provisions identity, owner membership, and root node. Settings persistence is projected. |
| Admin can create branches/departments/classes/committees | True at generic node level. |
| Members can request entry | Not fully true in Community Domain layer; direct member upsert exists, request/approval UX remains incomplete. |
| Admins can approve/reject/assign roles/nodes | Partial: membership/node assignment and action review decisions exist; full member request/appeal workflow is not complete. |
| One member can belong to many communities/domains | Structurally true by membership rows. |
| Shops, Spotlight, vault, verification, notifications can be scoped to domain | Mostly projected. Verification evidence has partial review metadata. Notifications are read-only planning only. |
| Relay path records source, bridge member, destination | Absent as real write path. |
| Public viewers see safe domain evidence without private records | Projected. Public-safe summary exists as readiness/network presence, not a mature public evidence release. |
| Expired/suspended domains keep history but lose paid rights until renewed | Projected in lifecycle/readiness language; not complete entitlement enforcement. |

## Best Next Programme Move

Do not add another broad readiness endpoint by default.

The next high-value slice should be one of these:

1. Pick one visible Community Domain entry/sales/admin surface and make it
   honestly reflect the ledger: real actions first, projections clearly labeled.
2. Build the smallest missing real write path that unlocks an acceptance
   criterion, such as a domain member request/approval path, if code inspection
   confirms it is not already present elsewhere.
3. Tighten the current frontend Community Domain purchase/dashboard route so a
   pilot user can understand what is real, what is pending, and what cannot be
   done yet.

Avoid resuming the reverted commerce-visibility readiness endpoint unless the
product owner explicitly asks for that exact projection.
