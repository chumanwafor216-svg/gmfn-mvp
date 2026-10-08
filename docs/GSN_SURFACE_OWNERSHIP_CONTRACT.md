# GSN Surface Ownership Contract

## Status

Canonical S1 contract for the SIMPLIFY phase.

Spotlight status as of 2026-10-08: CLOSED/FROZEN after final verification gate.
Canonical ownership remains Shop Control for owner publishing/manage/takedown/preview and Public Shop for visitor presentation. Dashboard must remain Spotlight-free, and Community Home may show only compact owner-status routing with no live media/feed.

Marketplace status as of 2026-10-08: CLOSED/FROZEN after final verification gate. Canonical ownership is one-community needs, Shops & Services discovery, contextual relevant provider connections, and action handoff. DemandBox owns request lifecycle, Public Shop owns shop/provider detail/contact, Shop Control owns owner management, Trade Evidence owns formal evidence, and Marketplace must not imply hidden trust/quality ranking or global search.

Community Home status as of 2026-10-08: CLOSED/FROZEN after Phase 2 cleanup/final verification gate. Canonical ownership is one selected community identity, Bulletin, real actionable attention, compact handoffs, compact switching, and collapsed authority-gated Admin entry. My GSN/Profile owns cross-community personal orientation; Marketplace owns one-community operations; Shop Control owns shop/Spotlight/Vault/merchant management.
Shop Diary status as of 2026-10-08: CLOSED/FROZEN after final verification gate. Canonical ownership is time-ordered, shop-owned activity history. Shop Control owns owner creation/management and promotion handoff; Public Shop owns visitor presentation. Products & Services, Spotlight, Trade Evidence, Dashboard, Community Home, Marketplace, and Analytics/Market Wisdom must not be collapsed into Shop Diary.

O1-O4 connection architecture is frozen for validation. This document does not
change product behaviour, routes, navigation, labels, styling, permissions,
evidence, or backend semantics. It defines the ownership rules future
simplification packages must respect before touching user-facing surfaces.

## Core Doctrine

1. One surface -> one primary human job -> one primary action.
2. One capability -> one canonical home.
3. Other surfaces may show compact status, pointers, or actions, but must not
   silently become duplicate homes for that capability.
4. Simple surface. Deep system.
5. Progressive disclosure before deletion.
6. Contextual before permanent.
7. Operator machinery stays with operators.
8. Simplification must preserve evidence, provenance, permissions, privacy,
   governance, lifecycle truth, dispute state, TrustSlip purpose limitation, and
   O1/O2/O3/O4 boundaries.

## Canonical Surface Ownership

| Surface | Primary human job | Canonical ownership | Not the canonical owner of |
| --- | --- | --- | --- |
| Dashboard | What should I deal with now? | Compact orientation and the highest-priority pointer. | Full DemandBox, TrustSlip, Spotlight, Marketplace, or analytics. |
| Notifications / What Matters Now / Attention Spine | What requires my action? | Actionable queue and action history. | General dashboard summary or research analytics. |
| My GSN / Profile | Who am I across the whole GSN network? | Durable identity orientation, community portfolio, compact attention signal, shop/business handoff, trust/evidence handoff, and settings/account entry. | Full attention queues, selected-community operations, shop management, Trust Passport detail, or Dashboard operational overview. |
| My GSN Communities / Community entry | Where do I belong and where do I want to enter? | Personal community membership orientation and entry pointers. | One-community operations. |
| Community Home | What selected community am I inside and what needs attention here? | Selected-community identity, Bulletin, real selected-community attention, compact handoffs, community switching, and collapsed authorised admin entry. | Full cross-GSN portfolio, Marketplace internals, live Spotlight media/feed, shop readiness, or full Community Domain administration. |
| Community Domain | How do authorised operators administer this community/domain? | Operator/governance machinery, service policy, billing, official records, and readiness. | Ordinary member flow. |
| DemandBox | What do I need? | Requests/needs and their lifecycle. | Full marketplace workspace or formal bilateral evidence. |
| Marketplace | What can I do/find within this selected community marketplace? | One-community needs, Shops & Services discovery, contextual relevant provider connections, and action handoff. | DemandBox request lifecycle, Public Shop detail/contact, Shop Control owner management, cross-community identity, hidden ranking, or system analytics. |
| Authenticated Shop navigation | How does the owner operate their shop? | In this repository, authenticated Shop navigation currently routes toward Shop Control / owner operations. | Public supply browsing. |
| Public Shop | What does this merchant/person offer? | Public supply/offers and legitimate contact paths. | Owner operations or analytics. |
| Shop Control | How does the owner operate the shop? | Shop setup, products, Vault, Spotlight controls, owner analytics, and operating tools. | Public buyer browsing. |
| Shop Diary | What ordinary merchant activity/history has been recorded? | Chronological shop-owned activity history with owner-claim default evidence and only same-shop confirmed Trade Evidence strengthening. | Products/services catalogue, Spotlight promotion, formal bilateral transaction/service evidence, analytics inference, or Dashboard content. |
| Trade Evidence / ProtectedTrade | What formal bilateral transaction/service evidence exists? | Intentional transaction/service evidence lifecycle and derived outcome truth. | Discovery, casual contact, or ordinary diary. |
| Spotlight | What am I currently promoting? | Promotion creation/status. | Dashboard rendering or shop analytics. |
| Trust Passport | What is my full private evidence history/posture? | Fuller private evidence posture and history. | Public proof or purpose-limited sharing. |
| TrustSlip | What purpose-limited evidence can I carry/share? | Holder certificate, real code/link/QR, purpose-limited portable evidence, and refresh/reissue setup. | Full private Trust Passport. |
| Public Verify | What can the recipient verify from this TrustSlip? | Recipient verification result and live-confirmation route. | Holder controls or private evidence. |
| Command Center | What does GSN need to understand operationally/research-wise? | System, funnel, research, inspection, and operator analytics. | Ordinary member action flow. |

## Duplication Rules

Status/pointer duplication is allowed when it helps the user move to the
canonical owner. Full functional duplication requires explicit justification in
the package that introduces it.

| Capability | Canonical owner | Legitimate compact pointers | Should not become a full duplicate home | Capability to preserve |
| --- | --- | --- | --- | --- |
| Attention | Notifications / What Matters Now | Dashboard top item; My GSN compact state if needed. | Dashboard and My GSN. | Notification/action state, relay action truth, terminal states. |
| Demand | DemandBox | Dashboard count; Marketplace selected-lane pointer; Community Domain aggregate inspection. | Dashboard, Community Home, Shop Control. | Request lifecycle, O1/O2/O3/O4 privacy, lineage, and non-endorsement. |
| Spotlight | Spotlight / Shop Control for owner work | Community Home owner-status shortcut; Public Shop preview. | Dashboard, Community Home, Marketplace, and Shop Control all as equal editors; Dashboard must not fetch or render live Spotlight. | Free/paid/repost entitlement and exposure truth. |
| TrustSlip | TrustSlip holder; Public Verify for recipients | Dashboard status; Trust Passport document pointer; Shop/Public Verify request cue. | Dashboard, My GSN, Trust Passport. | Backend-originated code/link, purpose limitation, public/private boundary. |
| Communities | Community Home for one selected community; My GSN for cross-community orientation. | Marketplace selected community context; Dashboard compact pointer if needed. | Dashboard, Marketplace, Community Domain, or Community Home as interchangeable all-community portfolios. | Membership, selected-community context, route continuity, governance. |
| Commerce Evidence | ProtectedTrade for formal evidence; Shop Diary for ordinary activity | Shop Control summary; Marketplace Trade Evidence lane. | Shop Diary and ProtectedTrade collapsing into one vague activity surface. | O2 derived outcome truth, source DemandBox lineage, TrustEvent provenance. |

## Preservation Contract

Every future simplification package must explicitly demonstrate that it does not
remove or weaken:

- unique actions;
- TrustEvents and evidence provenance;
- ProtectedTrade outcomes and derived outcome truth;
- DemandBox lineage;
- TrustSlip code/link/QR authority;
- public verification;
- community governance controls;
- mobile and accessibility paths;
- error and recovery states;
- privacy explanations;
- evidence-not-endorsement boundaries;
- evidence-not-approval/payment/guarantee boundaries.

If a proposed demotion/move/duplicate removal touches any of those areas, mark
it as `PRESERVATION RISK` and prove the replacement path before editing.

## Temporary Freeze List

Freeze means do not casually alter during unrelated simplification. It does not
mean permanent immutability.

- recovered My GSN Identity/Profile behaviour;
- TrustSlip existing-code recovery and holder-certificate recovery;
- Dashboard TrustSlip `Unavailable` truthfulness;
- Dashboard Market Wisdom interaction and presentation;
- O1/O2/O3/O4 backend boundaries;
- Public Verify functionality;
- Trust/CCI/Wider semantics;
- membership and governance semantics;
- ProtectedTrade derived outcome truth.

## Simplification Classifications

Use these classifications when auditing visible blocks/actions:

- `KEEP-PRIMARY`: necessary for the surface's main job and primary action.
- `KEEP-STATUS`: compact status/pointer that belongs here but not as full
  functionality.
- `PROGRESSIVE`: legitimate capability that belongs behind details, expansion,
  or a secondary step.
- `CONTEXTUAL`: visible only when a state/action makes it relevant.
- `MOVE-TO-CANONICAL-HOME`: useful here only as a pointer; full work belongs on
  its canonical surface.
- `OPERATOR-ONLY`: belongs in Community Domain, Command Center, Shop Control, or
  another authorised operator/admin surface.
- `DUPLICATE`: same functional home already exists elsewhere.
- `CANDIDATE-RETIREMENT`: no longer justified by the current architecture, but
  not removable without a preservation review.

## Current Repository Qualifications

- My GSN/Profile is CLOSED/FROZEN as of 2026-10-08: My GSN owns `me across GSN` orientation, identity, community portfolio, conditional attention pointers, selected-community shop handoff, trust/evidence handoff, and device/account settings truth. It must not become Dashboard, Community Home, Marketplace, Shop Control, Trust Passport, or TrustSlip.
- `APP_ROUTES.PROFILE` intentionally resolves to the canonical My GSN member home
  (`/app/my-gmfn-and-i`). Explicit guide/help mode remains available at
  `/app/my-gmfn-and-i?tab=guide`.
- Authenticated mobile bottom navigation labels Public Shop as `Shop`, while
  authenticated owner operation remains Shop Control. Treat this as current
  repository truth, not as permission to merge public supply and owner
  operations.
- Community Home is the selected-community member home. It shows identity, Bulletin, real attention, compact handoffs, switching, and collapsed authorised admin entry. My GSN owns cross-GSN/community orientation. Marketplace is the one-community operating nucleus.
- Community Domain and Command Center are allowed to be complex because they are
  operator surfaces. That complexity must not leak into ordinary member flows
  without a state-specific reason.

## Future Package Gate

Before any simplification package changes UI, navigation, labels, or visible
surface composition, it must state:

1. the canonical owner being changed;
2. the one human job and one primary action being protected;
3. which blocks are `KEEP-PRIMARY`, `KEEP-STATUS`, `PROGRESSIVE`,
   `CONTEXTUAL`, `MOVE-TO-CANONICAL-HOME`, `OPERATOR-ONLY`, `DUPLICATE`, or
   `CANDIDATE-RETIREMENT`;
4. whether any preservation risk exists;
5. which existing audit protects the boundary, or why a new audit is needed.
