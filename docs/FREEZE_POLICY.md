# FREEZE_POLICY.md

## Purpose
This file defines which parts of the repo are safe to edit freely and which parts should be treated as frozen or high-risk.

The goal is to let the assistant work autonomously in safe zones without damaging critical areas.

---

## How to interpret freeze levels

### Fully frozen
Do not edit unless the task explicitly requires it and the reason is documented.

### Soft frozen / high risk
Edit only if necessary and only after tracing full impact.

### Open for normal work
Safe for routine implementation, cleanup, parity fixes, and documentation if the task belongs there.

---

## Default fully frozen categories
Unless explicitly required by the task, treat these categories as frozen:

- production environment configuration
- deployment configuration
- secrets handling
- authentication core
- authorization core / permission core
- database schema and migrations
- critical shared contracts used across many routes
- payment / ledger / irreversible transaction logic if present
- any legacy reference implementation that is being used as the benchmark for original phone behavior

---

## Default soft frozen / high-risk categories
These can be edited only with careful impact review:

- shared API clients
- global app shell or root layout
- global navigation
- shared state/store used by multiple domains
- shared hooks used by many screens
- shared UI components that affect many flows
- central validators / shared models
- route guards / middleware
- notification/event pipelines

---

## Default open areas
These are the safest areas for normal work when scoped properly:

- route-specific UI components
- page-level components
- feature-local hooks
- feature-local services
- docs
- tests
- route-specific styling
- parity fixes between desktop and phone when isolated to route-specific code

---

## Explicit frozen paths
Add exact repo-relative paths below when known.

Examples:
- `backend/path/to/critical/module`
- `frontend/path/to/shared/core`
- `shared/path/to/contracts`
- `mobile/path/to/reference/behavior`

Current explicit frozen paths:
- `frontend/src/pages/DashboardPage.tsx` dashboard Market Wisdom presentation and interaction model only; other dashboard edits still require normal impact review.
- `frontend/src/pages/DashboardPage.tsx` Dashboard button-route and mobile action geometry contracts are caged by `frontend/tools/audit-dashboard-button-inventory.mjs`; do not change Dashboard button targets, action counts, Focus Commitments routing, mobile shell controls, or action geometry without an intentional Dashboard stability audit update.
- `frontend/src/pages/CommunityHomePage.tsx` Community Home CLOSED/FROZEN contract is caged by `frontend/tools/audit-community-home-button-inventory.mjs`, `frontend/tools/audit-community-home-phone-buttons.mjs`, and `frontend/tools/smoke-community-home-domain-list.mjs`; do not change the selected-community identity-first order, Bulletin placement, actionable-only attention, compact Go to handoffs, route-param reconciliation, collapsed authority-gated Admin area, action counts, mobile shell controls, or row/icon geometry without intentional Community Home freeze review and matching audit updates.
- `frontend/src/pages/ShopControlPage.tsx` Shop Control action inventory and shared native field stability are caged by `frontend/tools/audit-shop-control-button-inventory.mjs` and included in `frontend/tools/audit-protected-button-freeze.mjs`; do not reduce native field font size below 16px, restore textarea vertical resizing, remove inherited field font, change Shop Control action counts, or alter focused-task shell controls without an intentional Shop Control stability audit update.
- `frontend/src/pages/CommunityJoinRequestsPage.tsx` Join Requests mobile layout and action geometry are caged by `frontend/tools/audit-community-join-requests-layout.mjs`; do not restore horizontal stats rows, two-column phone request facts, decorative-icon phone columns, or clipped route/action buttons without an intentional Join Requests layout audit update.
- `frontend/src/pages/NotificationsPage.tsx` Action Inbox button inventory and phone Dashboard escape geometry are caged by `frontend/tools/audit-notifications-button-inventory.mjs`; do not change urgent CTA geometry, bucket row geometry, Dashboard escape route, mobile shell controls, or notification action counts without an intentional Action Inbox stability audit update.
- `frontend/src/pages/CoverPage.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/CreateEntryPage.tsx`, `frontend/src/pages/JoinEntryPage.tsx`, `frontend/src/pages/JoinRequestPendingPage.tsx`, `frontend/src/pages/JoinApprovalPage.tsx`, `frontend/src/pages/MemberActivationPage.tsx`, and `frontend/src/pages/MyGMFNAndIPage.tsx` member-entry action traceability and entry/auth route recovery are caged by `frontend/tools/audit-entry-auth-contracts.mjs` and `frontend/tools/audit-member-entry-actions.mjs`; do not reintroduce raw action controls, remove stable debug ids, or route signed-in users back to Cover/Welcome without an intentional entry stability audit update.
- `frontend/src/lib/mobileTapGuard.ts` mobile tap routing contract is caged by `frontend/tools/audit-mobile-tap-stability.mjs`; do not relax wrong-root suppression, orphan-click suppression, or original-action replay without a real phone regression reason.
- `frontend/tools/audit-protected-button-freeze.mjs` defines the current protected button freeze band. Run `npm --prefix frontend run audit:protected-button-freeze` before and after Marketplace button work to confirm Dashboard, Community Home, Action Inbox, entry/auth, shared tap guard, and global stable-action hygiene were not disturbed.
- `docs/BUTTON_STABILITY_FREEZE.md` records the protected freeze band and the lane-by-lane Marketplace stabilization protocol; update it if the protected freeze band intentionally changes.
- `.github/workflows/render-deploy.yml` is frozen in manual-only mode during the active pilot to conserve Render pipeline minutes. Do not restore a `push` trigger or automatic deploy behavior unless the product owner explicitly approves it.
- `.github/workflows/tests.yml` is frozen with backend-relevant path filters plus manual dispatch during the active pilot. Do not remove the path filters or make frontend/docs-only pushes run backend tests automatically unless the product owner explicitly approves it.
- Render dashboard frontend Auto-Deploy is an external frozen operational setting and should remain off during the active pilot unless the product owner explicitly approves turning it back on.
- Git publishing is also frozen into batch mode during the current pipeline-shortage period: do not push routine continuation work after every local fix. Build, verify, and optionally commit locally; push only once the product owner explicitly says the current batch is ready to publish.
- `frontend/src/pages/MarketplacePage.tsx` Marketplace CLOSED/FROZEN contract is caged by `frontend/tools/audit-marketplace-front-package.mjs`, `frontend/tools/audit-marketplace-button-inventory.mjs`, `frontend/tools/audit-marketplace-button-lines.mjs`, `frontend/tools/audit-marketplace-demand-box-lane.mjs`, and the Marketplace lane audits. Do not change needs-first order, relevant-provider semantics, neutral Shops & Services discovery, DemandBox/Public Shop/Trade Evidence handoffs, or hidden-ranking boundaries without intentional Marketplace freeze review and matching audit updates.
- `gmfn_backend/app/api/routes/marketplace.py` Spotlight placement, quota, and paid/repost separation are caged by `frontend/tools/audit-spotlight-system-feed.mjs` plus backend tests. Do not change the one-shop/all-eligible-communities rule, one-free-Spotlight-per-global-member-per-UTC-day pilot rule, paid rows excluded from free quota, or Network Repost/direct paid separation without intentionally updating that audit and the matching backend tests.
- `frontend/src/pages/DashboardPage.tsx`, `frontend/src/pages/ShopGalleryPage.tsx`, and `frontend/src/pages/shopControl/ShopControlSpotlightWorkflow.tsx` Spotlight ownership is caged by `frontend/tools/audit-spotlight-system-feed.mjs`. Dashboard must not fetch, rotate, synthesize, or render live Spotlight; Public Shop may use the authenticated all-active-communities Marketplace broadcast feed for visitor/member preview; Shop Control must own the rich owner-facing live Spotlight frame, publisher access, and takedown controls.
- `gmfn_backend/app/api/routes/shop_diary.py`, `gmfn_backend/app/schemas/shop_diary.py`, `gmfn_backend/app/db/models.py` `ShopDiaryEntry`, `gmfn_backend/alembic/versions/20261008_add_shop_diary_entries.py`, `frontend/src/pages/ShopAssetsPage.tsx` Shop Diary lane, and `frontend/src/pages/ShopGalleryPage.tsx` Public Shop Diary presentation are Shop Diary CLOSED/FROZEN as of 2026-10-08. They are caged by `gmfn_backend/tests/test_shop_diary_phase2.py`, `frontend/tools/audit-shop-diary-phase1.mjs`, `frontend/tools/audit-shop-diary-phase2.mjs`, `frontend/tools/audit-shop-control-button-inventory.mjs`, `frontend/tools/audit-shop-gallery-button-inventory.mjs`, and `frontend/tools/smoke-shop-diary-phase1-visual.mjs`; do not merge products with diary, weaken same-shop confirmed Trade Evidence validation, add hidden evidence ranking, auto-publish Spotlight from diary, or change chronological Public Shop presentation without intentional Shop Diary freeze review and matching audit updates.
- `frontend/src/pages/MyGMFNAndIPage.tsx`, `frontend/src/lib/appRoutes.ts` My GSN/Profile route target, `frontend/src/layout/AppLayout.tsx` Profile/Guide navigation split, and the deprecated-unmounted `frontend/src/pages/ProfilePage.tsx` boundary are My GSN CLOSED/FROZEN as of 2026-10-08. They are caged by `frontend/tools/audit-capability-mirror.mjs`, `frontend/tools/audit-surface-ownership-contract.mjs`, `frontend/tools/audit-member-entry-actions.mjs`, `frontend/tools/audit-app-tab-first-paint.mjs`; do not restore Profile to Dashboard, revive the old standalone ProfilePage, make My GSN an operational Dashboard/Marketplace/Shop Control duplicate, or render empty attention blocks without intentional My GSN freeze review and matching audit updates.
- [ADD EXACT PATHS HERE]
- [ADD EXACT PATHS HERE]

---

## Explicit open paths
Add exact repo-relative paths below when known.

Current explicit open paths:
- [ADD EXACT PATHS HERE]
- [ADD EXACT PATHS HERE]
- [ADD EXACT PATHS HERE]

---

## Editing rule
If a task touches a frozen or high-risk area, the assistant must:
1. identify why that area is involved
2. explain the exact impact
3. prefer the smallest possible change
4. avoid unrelated refactors

---

## Practical instruction to the assistant
When possible, solve the task in route-local code instead of shared infrastructure.
Only escalate into frozen or high-risk files when the task genuinely cannot be solved safely elsewhere.
