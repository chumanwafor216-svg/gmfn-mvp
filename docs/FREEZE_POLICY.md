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
- `frontend/src/pages/CommunityHomePage.tsx` Community Home button-route and mobile action geometry contracts are caged by `frontend/tools/audit-community-home-button-inventory.mjs` and `frontend/tools/audit-community-home-phone-buttons.mjs`; do not change compact tool rows, ROSCA Marketplace routing, action counts, mobile shell controls, or row/icon geometry without an intentional Community Home stability audit update.
- `frontend/src/pages/CommunityJoinRequestsPage.tsx` Join Requests mobile layout and action geometry are caged by `frontend/tools/audit-community-join-requests-layout.mjs`; do not restore horizontal stats rows, two-column phone request facts, decorative-icon phone columns, or clipped route/action buttons without an intentional Join Requests layout audit update.
- `frontend/src/lib/mobileTapGuard.ts` mobile tap routing contract is caged by `frontend/tools/audit-mobile-tap-stability.mjs`; do not relax wrong-root suppression, orphan-click suppression, or original-action replay without a real phone regression reason.
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
