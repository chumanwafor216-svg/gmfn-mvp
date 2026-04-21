# Endpoint Audit - 2026-04-21

## Scope

This audit checked backend FastAPI routes, live Render OpenAPI state, and
frontend endpoint usage for the pilot-test flow from entry through community,
marketplace, shop, finance, trust, notifications, and admin support screens.

This document is a testing-control note. It does not redefine product behavior.

## Confirmed Backend State

- Live API health is good:
  - `https://gmfn-api.onrender.com/health` returns healthy.
  - `dev_mode` is false on Render.
- Local backend OpenAPI and live Render OpenAPI now match exactly:
  - local paths: `209`
  - live paths: `209`
  - local-only paths: none
  - live-only paths: none
- Entry routes are now present on live Render:
  - `/entry/phone/start`
  - `/entry/bank-details`
  - `/entry/create`
- Marketplace media routes are mounted and live:
  - `/marketplace/media/ping`
  - `/marketplace/media/image`
  - `/marketplace/media/video`
- The backend is mounted without an `/api` prefix. A direct live request to
  `/api/marketplace/products` returns `404`, while `/marketplace/...` routes are
  the real API paths.

## Immediate Frontend Endpoint Fixes Applied

These were active screens that could call the static frontend host instead of
the configured backend API in production.

- `frontend/src/pages/JoinByInvitePage.tsx`
  - Normalized invite preview fetches through the configured API base.
  - Affects invite preview / invited entry test flow.
- `frontend/src/pages/ShopAssetsPage.tsx`
  - Normalized page-local marketplace fetches through the configured API base.
  - Replaced stale local image upload candidates with the shared
    `/marketplace/media/image` upload helper.
  - Affects shop identity image and product image management.
- `frontend/src/pages/ShopControlPage.tsx`
  - Normalized page-local marketplace/payment fetches through the configured
    API base.
  - Replaced stale local image upload candidates with the shared
    `/marketplace/media/image` upload helper.
  - Changed expected-payment lookup from the stale
    `/bank-reconciliation/expected` shape to the mounted `/bank/expected`.
  - Affects shop control, spotlight, payment instructions, and expected payment
    visibility.
- `frontend/src/pages/LoanSummaryPage.tsx`
  - Normalized local repayment and trust-event fetches through the configured
    API base.
  - Affects loan summary repayment/evidence panels.

## Confirmed Weak Points Remaining

### 1. Vault access is frontend-present but backend-unmounted

The frontend has Vault access flows:

- `getVaultShopAccessView`
- `recordVaultShopAccessOpen`
- `createVaultShopAccessLink`
- `listVaultShopAccessLinks`
- `ShopAccessPage`
- Shop control Vault link display

The backend has `VaultAccessLink` models and `app/services/vault_access_service.py`,
but the live OpenAPI does not expose mounted Vault access endpoints such as:

- `/vault-access/{token}`
- `/vault-access-links`
- `/marketplace/vault-access-links`

Impact: Vault may look present in the UI, but link creation/open tracking is not
fully backed by a mounted API route yet. This should be treated as a product
implementation gap, not a phone-user mistake.

### 2. System diagnostics route file existed but was not mounted

- Frontend calls: `getSystemDiagnostics()` -> `/system/diagnostics`
- Backend file exists: `app/api/routes/system_diagnostics.py`
- Audit-time live route result: `404`
- Correction prepared after audit: `app/api/router.py` now includes the
  admin-protected diagnostics router. Local OpenAPI now includes
  `/system/diagnostics`.

Impact: System Operations silently loses its diagnostics panel and cannot show
runtime/database health from that endpoint until the backend redeploy containing
this correction is live.

### 3. Duplicate backend route registrations exist

The backend currently has duplicate `(method, path)` registrations for:

- `GET /trust/me/evidence-pack/meta`
- `GET /trust/why/{user_id}`
- `GET /admin/trust-events/recent`
- `GET /admin/trust/why/{user_id}`
- `POST /bank/reconcile`
- `GET /bank/expected`

Impact: FastAPI still serves a route, but duplicate operation IDs create OpenAPI
warnings and make endpoint ownership harder to reason about. This should be
cleaned during admin/backend stabilization.

### 4. Several APIRouter files are not included in the central router

Unmounted route files include:

- `admin_disputes`
- `admin_repayment_reversals`
- `admin_repayments`
- `cci`
- `courier_confirm`
- `daily_insight`
- `disputes`
- `exposure_admin`
- `loan_summary`
- `loans_bulk`
- `merchant_release`
- `merchant_verify`
- `merchant_view`
- `repayment_claims`
- `repayments`
- `share`
- `shipment`
- `shipment_events`
- `system_diagnostics`
- `trust_evidence_pack`
- `trust_score`
- `trust_slip_evidence`
- `trust_slips_verify_ui`
- `trust_timeline`

Not every unmounted file is automatically a bug. Some are older, duplicated, or
superseded by mounted routes. The important audit point is that they are not
currently live API endpoints unless mounted in `app/api/router.py`.

### 5. Dormant frontend files still contain old direct `/api` calls

The following references remain but are not currently the main active routes:

- `frontend/src/pages/ApiPage.tsx`
- `frontend/src/pages/GuarantorLeaderboardPage.tsx`
- `frontend/src/components/LoanWorkbenchPage.tsx`

Impact: these should be cleaned or removed only after confirming whether they are
still intentionally reachable. Do not delete them only because they look unused.

## Recommended Next Engineering Order

1. Continue pilot testing with the active endpoint normalization now in place.
2. During admin-domain cleanup, decide whether to mount or retire:
   - admin dispute / repayment routes
   - duplicate trust/admin/bank endpoints
3. Treat Vault access as the next deliberate backend product gap:
   - confirm route contract
   - expose link creation/list/open endpoints
   - wire them to `vault_access_service.py`
   - then retest `ShopAccessPage` and Shop Control Vault links
4. After endpoint cleanup, rerun this audit and update this document with the
   remaining unresolved endpoints.

## Verification Performed

- `npm run build` in `frontend` succeeded after the frontend endpoint fixes.
- Live Render OpenAPI and local OpenAPI were compared and matched exactly.
- Live smoke checks:
  - `/public/config` -> `200`
  - `/marketplace/media/ping` -> `200`
  - `/api/marketplace/products` -> `404`
  - `/system/diagnostics` -> `404`
- Post-audit local verification:
  - `/system/diagnostics` is now present in local OpenAPI after mounting
    `system_diagnostics_router`.
