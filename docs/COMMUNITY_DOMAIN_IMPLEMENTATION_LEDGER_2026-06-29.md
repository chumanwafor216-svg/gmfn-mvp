# Community Domain Implementation Ledger

Date: 2026-06-29
Current review update: 2026-07-14

Status: programme truth ledger. This file separates implemented backend
capability from read-only projections and absent product pieces so future work
does not confuse endpoint coverage with finished Community Domain product.

## Current Completion Review - 2026-07-14

Community Domain has now reached a **pilot-complete operating slice** for the
current purchase, dashboard, member-access, governance-review, billing-readiness,
and evidence-readiness contracts.

Confirmed current proof:

- `npm --prefix frontend run audit:community-domain-product-contracts` passed.
- `npm --prefix frontend run audit:community-domain-billing-sequence` passed
  after Playwright was rerun outside the Windows sandbox.
- `npm --prefix frontend run audit:community-domain-evidence-readiness-boundary`
  passed.
- `python -m pytest -q gmfn_backend\tests\test_community_domains.py` passed
  with `216` tests.
- `python -m pytest -q gmfn_backend\tests\test_community_domain_affiliations.py`
  passed with `12` tests.
- `python -m pytest -q gmfn_backend\tests\test_vault_domain.py` passed with
  `7` tests.

What this means:

- purchase entry, domain lookup, draft creation, package quote, dashboard
  recovery, billing sequence, member access request, requester follow-up,
  reviewer queue, approve/apply, decline, node/member placement summaries,
  structure planning, service readiness, governance readiness, and
  evidence-readiness boundaries are implemented enough for the current pilot
  contracts;
- public/shop/community/member proof checks have current live proof elsewhere
  in `docs/HANDOFF_NOTES.md`;
- the Community Domain dashboard remains a pilot operating surface, not a
  final polished institutional SaaS product for every future organization.

What this still does **not** mean:

- no claim of full paid lifecycle automation beyond the current manual/admin
  activation and billing-readiness path;
- no claim of a real relay-path write table for source domain, bridge member,
  destination domain, and relayed content/action;
- no claim of a public Community Domain evidence release/publishing engine;
- no claim that shop visibility grants, Spotlight publish-to-domain, vault
  visibility grants, notification jobs, or analytics usage meters are all real
  write paths rather than readiness/projection surfaces;
- no claim of live TrustSlip, live confirmation outcome, or signed-in private
  evidence production proof without supplied live fixtures/tokens.

Unabated truth:

- The **current Community Domain pilot slice is complete**.
- The **future Community Domain roadmap is not complete**.
- Do not use old June status rows below to overrule this July review without
  re-running the audits/tests above.

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
| Slice 2: purchase entry | Pilot-complete real path plus manual billing boundary | `/community-domains/availability`, `/community-domains/drafts`, `/community-domains/{id}/package-quote`, purchase page lookup/open access path, billing-sequence audit. | Draft, quote, lookup, recovery, and billing-readiness paths exist. Payment/admin confirmation remains deliberately bounded; do not claim automatic paid lifecycle. |
| Slice 3: activation/lifecycle | Pilot-complete readiness and manual/admin activation boundary | `/readiness`, `/activation-requirements`, `/subscription-lifecycle`, payment-instruction/proof path, admin activation proof in route tests. | These routes explain blockers and guide the current manual/admin pilot activation path. Full automatic renewal/suspension/entitlement enforcement remains future work. |
| Slice 4: dashboard MVP | Pilot-complete operating dashboard | `/dashboard`, `/operating-map`, `/setup-plan`, `/capacity-plan`, `/rollout-plan`, `/network-presence`, route-local frontend panels and audits. | The dashboard is testable for the current pilot lanes. It is not the final institutional SaaS surface for every future organization. |
| Slice 5: structure and membership | Pilot-complete real path | Node create/status routes, member upsert, node-member upsert, policy upsert, action-review create/decide/apply, comments, evidence, reviewer queue, self-service membership request, requester follow-up, withdraw/revise, admin approve/apply. | Strongest real implementation area. Domain-specific member request/approval UX now exists. Mature appeals beyond requester follow-up remain future work. |
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
| Owner can start Purchase Community Domain | True for the current pilot path: availability, draft creation, package quote, recovery, and billing-readiness are caged by frontend audits and backend tests. |
| Domain name availability is checked | True. |
| Payment instruction can be generated | True for the current pilot/manual billing path. Activation is still not an automatic bank-confirmed lifecycle. |
| Domain is not active until payment/admin confirmation | True for the current pilot boundary. Full automatic paid lifecycle and entitlement enforcement remain future work. |
| Activation provisions identity, owner role, settings, root node | Draft creation provisions identity, owner membership, and root node; current settings/readiness are caged as setup/policy surfaces. |
| Admin can create branches/departments/classes/committees | True at generic node level. |
| Members can request entry | True for the current pilot path: public-safe lookup, signed-in access request, applicant status, withdraw/revise, and admin queue/apply path exist. |
| Admins can approve/reject/assign roles/nodes | True for the current pilot path: membership/node assignment, action review decisions, comments, evidence, queue filtering, approve/apply, decline, and requester follow-up are caged by tests. Mature appeal tribunals remain future work. |
| One member can belong to many communities/domains | Structurally true by membership rows. |
| Shops, Spotlight, vault, verification, notifications can be scoped to domain | Mostly projected. Verification evidence has partial review metadata. Notifications are read-only planning only. |
| Relay path records source, bridge member, destination | Absent as real write path. |
| Public viewers see safe domain evidence without private records | Projected. Public-safe summary exists as readiness/network presence, not a mature public evidence release. |
| Expired/suspended domains keep history but lose paid rights until renewed | Projected in lifecycle/readiness language; not complete entitlement enforcement. |

## Best Next Programme Move

Do not add another broad readiness endpoint by default.

After the 2026-07-14 completion review, the next high-value slice should be one
of these:

1. Run a real signed-in pilot account walkthrough on a phone for purchase,
   lookup, access request, admin review/apply, billing proof, and dashboard
   recovery.
2. Supply live TrustSlip, public confirmation outcome, and signed-in private
   evidence fixtures/tokens for production-boundary proof.
3. Choose a future roadmap slice deliberately: relay-path write records,
   durable public evidence release, domain-scoped shop/Spotlight/vault grants,
   notification jobs, analytics usage meters, or mature appeals.

Avoid resuming the reverted commerce-visibility readiness endpoint unless the
product owner explicitly asks for that exact projection.
