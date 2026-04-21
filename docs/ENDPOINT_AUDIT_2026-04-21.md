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
- The original audit found local backend OpenAPI and live Render OpenAPI
  matched at `209` paths.
- Subsequent safe corrections added diagnostics, Trust Timeline, and Vault
  access locally. Latest local OpenAPI path count after the Vault correction is
  `217`.
- Live Render should be rechecked after the backend redeploy containing these
  corrections.
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

### 1. Vault access was frontend-present but backend-unmounted

The frontend has Vault access flows:

- `getVaultShopAccessView`
- `recordVaultShopAccessOpen`
- `createVaultShopAccessLink`
- `listVaultShopAccessLinks`
- `ShopAccessPage`
- Shop control Vault link display

The backend has `VaultAccessLink` models and `app/services/vault_access_service.py`,
and the latest local code now mounts:

- `POST /marketplace/shops/{shop_id}/vault-access-links`
- `GET /marketplace/shops/{shop_id}/vault-access-links`
- `POST /marketplace/vault-access-links/{link_id}/revoke`
- `POST /marketplace/vault-access-links/{link_id}/extend`
- `GET /marketplace/vault-access/{token}`
- `POST /marketplace/vault-access/{token}/open`

Correction status: corrected locally and pending live Render redeploy. Shop
Control now uses the shared Vault access helpers instead of the stale
`/api/vault-access/links` path.

Impact before deploy: live Vault link creation/open tracking can still fail
until Render runs the new backend code and migration.

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

Unmounted route files included at audit time:

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
- `trust_evidence_pack`
- `trust_score`
- `trust_slip_evidence`
- `trust_slips_verify_ui`

Not every unmounted file is automatically a bug. Some are older, duplicated, or
superseded by mounted routes. The important audit point is that they are not
currently live API endpoints unless mounted in `app/api/router.py`.

Post-audit classification:

- `system_diagnostics` has now been mounted locally and is no longer dormant in
  current code.
- `docs/DORMANT_ROUTE_CLASSIFICATION_2026-04-21.md` records the safer
  classification for the remaining dormant files.
- `trust_timeline.py` has now been mounted locally and the active Trust Timeline
  frontend now routes JSON/PDF requests through the configured backend API base.
- `merchant_verify.py` was inspected after classification. It should remain
  dormant for now because `frontend/src/lib/merchantChannel.ts` is not imported
  by active pages, active TrustSlip verification is already mounted through
  `trust_slips.py`, and `merchant_verify.py` defines a conflicting
  `GET /trust-slips/verify/{token}` route shape that overlaps
  `GET /trust-slips/verify/{code}`.

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
3. After the Vault backend deploy, retest `ShopAccessPage` and Shop Control
   Vault links end to end:
   - add at least one Vault private product
   - create a private viewing link
   - open `/vault/:token`
   - confirm open tracking increments once through the `/open` call
   - extend and revoke the link
4. After admin endpoint cleanup, rerun this audit and update this document with the
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
  - `/trust/me/timeline` and `/trust/timeline/{user_id}` are now present in
    local OpenAPI after mounting `trust_timeline_router`.
- Vault access follow-up:
  - local OpenAPI now includes all six planned Vault access operations under
    `/marketplace`.
  - `python -m alembic upgrade head` passed locally after adding the
    idempotent `vault_access_links` migration.
  - `npm run build` passed after wiring Shop Control to the shared Vault API
    helpers.
- Merchant verification follow-up:
  - no merchant verification routes were mounted during this pass.
  - active TrustSlip verification remains owned by mounted `trust_slips.py`.
  - `merchant_verify.py` should be redesigned or merged before activation.
