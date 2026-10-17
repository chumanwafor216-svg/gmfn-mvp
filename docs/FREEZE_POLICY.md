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
- `frontend/src/pages/CommitmentsPage.tsx` phone two-lane/focused-Shared presentation is reviewed as of 2026-10-15 and caged by `frontend/tools/audit-commitments-surface.mjs`, `frontend/tools/audit-action-surface-contracts.mjs`, and the mobile visual sweep; do not restore the duplicate phone heading, simultaneous lane chooser/workspace stack, raw action controls, or multi-column phone forms without intentional review.
- `frontend/src/pages/DashboardPage.tsx` dashboard Market Wisdom presentation and interaction model only; other dashboard edits still require normal impact review.
- `frontend/src/pages/DashboardPage.tsx` Dashboard button-route and mobile action geometry contracts are caged by `frontend/tools/audit-dashboard-button-inventory.mjs`; do not change Dashboard button targets, action counts, Focus Commitments routing, mobile shell controls, or action geometry without an intentional Dashboard stability audit update.
- `frontend/src/pages/CommunityHomePage.tsx` Community Home CLOSED/FROZEN contract is caged by `frontend/tools/audit-community-home-button-inventory.mjs`, `frontend/tools/audit-community-home-phone-buttons.mjs`, `frontend/tools/audit-community-home-billboard.mjs`, and `frontend/tools/smoke-community-home-domain-list.mjs`; do not change the selected-community identity-first order, truthful billboard facts, Bulletin placement, actionable-only attention, compact Go to handoffs, route-param reconciliation, collapsed authority-gated Admin area, action counts, mobile shell controls, or row/icon geometry without intentional Community Home freeze review and matching audit updates.
  - Approved 2026-10-15 phone exception, corrected by owner on 2026-10-15: the shared authenticated shell is the only phone page header; Bulletin keeps one compact red/amber/green `Now`/`72h`/`Clear` timing strip, while the larger Community Pulse explanation/actions and calendar tile remain desktop-only; one `Open notice` action reveals phone notice detail; and the five destination handoffs are closed behind one `Community actions` disclosure by default.
  - Approved 2026-10-15 detail-preservation exception: up to 10 expired Bulletin items remain behind one closed `Previous announcements` disclosure. Do not expose the history by default or remove its reachability without an intentional Bulletin review.
  - `frontend/tools/smoke-community-home-simple-phone.mjs` is the phone-first browser guard for that exception. The older domain/admin smoke still protects route/admin behavior but retains a stale immediate-Marketplace visibility expectation until its legacy file encoding can be normalised safely.
- `frontend/src/pages/ShopControlPage.tsx` Shop Control action inventory and shared native field stability are caged by `frontend/tools/audit-shop-control-button-inventory.mjs` and included in `frontend/tools/audit-protected-button-freeze.mjs`; do not reduce native field font size below 16px, restore textarea vertical resizing, remove inherited field font, change Shop Control action counts, or alter focused-task shell controls without an intentional Shop Control stability audit update.
- `frontend/src/pages/CommunityDomainDashboardPage.tsx` guided-first command order is reviewed as of 2026-10-15 and caged by `frontend/tools/audit-community-domain-product-contracts.mjs` plus `frontend/tools/audit-community-domain-mobile-visual.mjs`; keep the one current-step primary action before the six progress tiles on phone, and keep deeper stages behind `More setup tools`.
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
  - Approved 2026-10-17 shortcut exception: one authenticated, policy-aware 48px `Add request` plus may sit beside the existing Needs heading and hand off to the existing DemandBox form in `mode=create`, preserving selected-community and origin/back context. It must not create a request, grant relay consent/reach, or enable paid capacity. This exception is caged by `frontend/tools/audit-three-plus-shortcuts.mjs`, the Marketplace audits, and `frontend/tools/smoke-three-plus-shortcuts.mjs`.
- `gmfn_backend/app/api/routes/marketplace.py` Spotlight placement, quota, and paid/repost separation are caged by `frontend/tools/audit-spotlight-system-feed.mjs` plus backend tests. Do not change the one-shop/all-eligible-communities rule, one-free-Spotlight-per-global-member-per-UTC-day pilot rule, paid rows excluded from free quota, or Network Repost/direct paid separation without intentionally updating that audit and the matching backend tests.
- `frontend/src/pages/DashboardPage.tsx`, `frontend/src/pages/ShopGalleryPage.tsx`, and `frontend/src/pages/shopControl/ShopControlSpotlightWorkflow.tsx` Spotlight ownership is caged by `frontend/tools/audit-spotlight-system-feed.mjs`. Dashboard must not fetch, rotate, synthesize, or render live Spotlight; Public Shop may use the authenticated all-active-communities Marketplace broadcast feed for visitor/member preview; Shop Control must own the rich owner-facing live Spotlight frame, publisher access, and takedown controls.
  - Approved 2026-10-17 Public Shop shortcut exception: the exact authenticated shop owner may see one 48px `Add Spotlight` plus beside Spotlight. It routes to the existing owner workflow with truthful create-versus-manage state, preserved community/origin, and no business write on open. Visitors and non-owners must not see it. Owner inspection remains outside canonical opportunity, qualification, and impression accounting.
  - Approved 2026-10-17 owner-card copy exception: a live owner-inspection card on Public Shop may omit the repeated start/expiry sentence and exposure disclaimer. Authoritative timing, lifecycle status, and management controls remain in Shop Control; delivery eligibility and exposure accounting are unchanged.
- `frontend/src/pages/ShopGalleryPage.tsx` Products & Services owner controls remain frozen except for the approved 2026-10-17 exact-block shortcut: each real product/service card may show one owner-only 48px `Manage {item}` plus. It carries the product and block to the existing Shop Control block manager, resolves the product against the authenticated owner's loaded shop data, focuses existing Edit/Remove controls, preserves origin/back context, and performs no write on open. Visitors and non-owners must not see it.
- `gmfn_backend/app/api/routes/shop_diary.py`, `gmfn_backend/app/schemas/shop_diary.py`, `gmfn_backend/app/db/models.py` `ShopDiaryEntry`, `gmfn_backend/alembic/versions/20261008_add_shop_diary_entries.py`, `frontend/src/pages/ShopAssetsPage.tsx` Shop Diary lane, and `frontend/src/pages/ShopGalleryPage.tsx` Public Shop Diary presentation are Shop Diary CLOSED/FROZEN as of 2026-10-08, with the Public Shop novice-first phone presentation intentionally reviewed and re-frozen on 2026-10-15. They are caged by `gmfn_backend/tests/test_shop_diary_phase2.py`, `frontend/tools/audit-shop-diary-phase1.mjs`, `frontend/tools/audit-shop-diary-phase2.mjs`, `frontend/tools/audit-shop-control-button-inventory.mjs`, `frontend/tools/audit-shop-gallery-button-inventory.mjs`, and `frontend/tools/smoke-shop-diary-phase1-visual.mjs`; do not merge products with diary, weaken same-shop confirmed Trade Evidence validation, add hidden evidence ranking, auto-publish Spotlight from diary, restore automatic ordinary-visit Diary jumping, or change chronological Public Shop presentation without intentional Shop Diary freeze review and matching audit updates.
  - Approved 2026-10-17 Public Shop shortcut exception: the exact authenticated shop owner may see one 48px `Add diary entry` plus beside Shop Diary/Shop Update. It routes to the existing Shop Assets Diary workflow with preserved community/origin and performs no Diary write on open. Visitors and non-owners must not see it. No delegated shop-editor shortcut is approved until a shop-scoped editor authorization contract exists.
  - Approved 2026-10-15 sharing exception: a public/live owner Shop Diary row may create one exact, attributed `Share update` handoff through `SocialTagShareButton`, `/share/shop-update/{entry_id}`, and `?diary_entry_id={entry_id}#shop-diaries`. The owner still reviews and sends; no API auto-posting or delivery claim is permitted; expired/private/inactive/system-insight entries remain unshareable. An exact shared-update visit focuses that update and suppresses unrelated Spotlight/Vault presentation; ordinary shop visits keep their products-first layout. This bridge is caged by `gmfn_backend/tests/test_share_preview.py`, `gmfn_backend/tests/test_shop_diary_phase2.py`, `frontend/tools/audit-share-tag-actions.mjs`, and the existing Shop Diary audits.
- `frontend/src/pages/MyGMFNAndIPage.tsx`, `frontend/src/lib/appRoutes.ts` My GSN/Profile route target, `frontend/src/layout/AppLayout.tsx` Profile/Guide navigation split, and the deprecated-unmounted `frontend/src/pages/ProfilePage.tsx` boundary are My GSN CLOSED/FROZEN as of 2026-10-08, with the novice-first phone presentation intentionally reviewed and re-frozen on 2026-10-15. They are caged by `frontend/tools/audit-capability-mirror.mjs`, `frontend/tools/audit-surface-ownership-contract.mjs`, `frontend/tools/audit-member-entry-actions.mjs`, `frontend/tools/audit-app-tab-first-paint.mjs`; do not restore Profile to Dashboard, revive the old standalone ProfilePage, make My GSN an operational Dashboard/Marketplace/Shop Control duplicate, expose Shop/Trust/Settings/Help as separate default-phone blocks, or render empty attention blocks without intentional My GSN freeze review and matching audit updates.
  - Approved 2026-10-15 compact-identity exception: the default phone identity grid shows only GSN ID and Phone. Handle and its copy utility remain available under the existing closed `More` -> `Account` lane, while desktop remains unchanged. This placement is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 compact-fact exception: the two default phone identity fact cards are text-first, capped to two value lines, and omit their repeated decorative fact icons. Desktop keeps the richer icon treatment. The phone geometry is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 text-first identity-heading exception: the default phone member-home omits the decorative identity-card badge from the `My identity` heading. Desktop retains the richer badge and the explicit Identity Guide remains unchanged. This phone-only boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 one-community exception: the default phone member-home omits the redundant portfolio toggle when exactly one community is available. Two or more communities retain one `Switch community (N)` control and the full portfolio list; desktop remains unchanged. This count-aware boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 compact-community exception: the one-community default phone member-home omits the repeated active-count heading and the selected card's second decorative community icon. Multi-community phone states retain their portfolio count and switch control; desktop retains the fuller count and icon treatment. This count-aware presentation is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 flat single-community exception: when exactly one selected community is available, the default phone member-home places its name, role, and stable ID directly in the `My communities` section without a nested bordered card or duplicate `Selected community` label. Multi-community phone states and desktop retain the selected-card treatment. The section-level community icon remains for wayfinding. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 settings-boundary exception: the default phone member-home does not render the full device-preferences/account-name editor below its closed `More` row. The editor remains unchanged on the explicit `?tab=settings` surface reached through `More` -> `Settings`, and desktop remains unchanged. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 compact-settings exception: the explicit phone `?tab=settings` surface omits the duplicate `Current reading` summary because the display-name field, two selects, two checkboxes, and Save/Reset actions already expose the editable state. Desktop retains the summary. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 compact-companion exception: the explicit phone Settings surface presents Companion Mode as one closed row with the current mode and one `Open` action. The existing controls remain mounted and available after expansion; desktop remains expanded. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 concise-settings-copy exception: the explicit phone Settings surface starts directly with `Profile display name`, uses one short display-name explanation, omits redundant control explanations, and shortens the two checkbox labels without changing their inputs or behavior. Desktop retains the fuller introduction and guidance. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 plain-companion exception: expanded phone Companion Mode starts with its first control, omits the duplicate introduction and passive sound-permission chip, and uses plain-language phone labels and helpers without changing any setting, action, permission request, persistence behavior, or desktop guidance. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 guided-companion exception: expanded phone Companion Mode keeps `Reminder level` visible and groups secondary controls behind mutually exclusive `Sound & notifications` and `Timing & limits` summary rows. The summaries reflect current values, all original controls and feedback remain available, and desktop stays fully expanded. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 duplicate-heading exception: the authenticated phone shell is the single `My GSN` page heading, so the compact default member-home starts directly with identity. Desktop and the explicit Identity Guide branch retain the route heading. This boundary is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-15 flat-frame exception: the default phone member-home removes the redundant outer white panel treatment, uses 12px navy-frame padding, and reserves no top gap for the omitted route heading. Desktop and the explicit Identity Guide keep the full framed presentation. This geometry is caged by `frontend/tools/audit-surface-ownership-contract.mjs` and `frontend/tools/audit-app-tab-first-paint.mjs`.
  - Approved 2026-10-16 personal-credit exception: the canonical member home may add one closed in-place `My Pipeline Credits` disclosure for the authenticated member's personal service-credit balance, server-catalogued purchase/status interaction, and server-persisted future-use permissions. It must not add a page/navigation item, expose community/provider-cost balances, hardcode catalogue terms, imply paid availability during suspension, gate free actions, or duplicate an operational service workflow. This exception is caged by `frontend/tools/audit-my-pipeline-credits.mjs` plus the existing My GSN audits.
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
