# Backend, Admin, and Vault Completion Program - 2026-04-21

## Purpose

Pilot testing has started. The frontend surfaces are close enough that the next
work should be controlled, backend-led, and admin-aware. This program separates
safe corrections from deeper business-rule work so the team can finish the
system without damaging working flows.

## Current Safe Correction

### System diagnostics

Status: corrected locally.

- Existing admin-only route file: `gmfn_backend/app/api/routes/system_diagnostics.py`
- Router now mounted in: `gmfn_backend/app/api/router.py`
- Local OpenAPI now includes: `/system/diagnostics`

Expected result after backend redeploy:

- System Operations can receive the diagnostics payload instead of silently
  falling back to `null`.
- No public user flow changes.
- No auth, schema, payment, ledger, or environment changes.

## Phase 1 - Confirm Pilot-Critical Active Routes

Goal: make sure testers can move through the real pilot path without endpoint
misfires.

Routes/screens:

- Cover / Welcome / Create Entry
- Invite preview and invited entry
- Login
- Dashboard
- Community Home
- Marketplace
- Shop Gallery
- Shop Assets
- Shop Control
- Finance
- Trust Passport / TrustSlip
- Notifications
- Loan summary / repayment evidence

Definition of done:

- No active screen fetches the static frontend host for backend data.
- Live Render API and local OpenAPI match, except intentional deploy timing.
- Tester failures are recorded as route-specific facts, not general guesses.

## Phase 2 - Vault Access Backend Contract

Status: corrected locally, pending successful live Render redeploy and phone
testing. The first live Vault deploy attempt failed during pre-deploy, so the
Vault migration was made defensive for the next deploy.

Goal: turn Vault from a frontend/service idea into a mounted backend product
flow.

Why it must be deliberate:

- Vault controls private stock visibility.
- Vault links may expose restricted products.
- Views/open tracking can become trust evidence later.
- Permission rules must be clear before links are shared outside the app.

Suggested backend contract:

- `POST /marketplace/shops/{shop_id}/vault-access-links`
  - create a Vault link for a shop owner/admin
- `GET /marketplace/shops/{shop_id}/vault-access-links`
  - list Vault links for the owner/admin
- `POST /marketplace/vault-access-links/{link_id}/revoke`
  - revoke a link
- `POST /marketplace/vault-access-links/{link_id}/extend`
  - extend a link expiry
- `GET /marketplace/vault-access/{token}`
  - public/private token view for permitted Vault products
- `POST /marketplace/vault-access/{token}/open`
  - record a link open/view event

Files to inspect before implementation:

- `gmfn_backend/app/services/vault_access_service.py`
- `gmfn_backend/app/db/models.py` around `VaultAccessLink`
- `frontend/src/lib/api.ts` Vault access helpers
- `frontend/src/pages/ShopAccessPage.tsx`
- `frontend/src/pages/ShopControlPage.tsx`

Definition of done:

- Vault endpoints appear in OpenAPI. Corrected locally: latest local path count
  is `217`, including all six planned Vault operations.
- Shop Control can create/list/revoke/extend Vault links. Corrected locally
  through shared frontend Vault API helpers.
- Shop Access can open a token and record an open. Corrected locally: `GET`
  resolves the view without incrementing and `POST /open` records the open.
- Private products remain hidden unless a valid Vault token permits viewing.
- No trust event is created until the team explicitly approves that behavior.

Implemented files:

- `gmfn_backend/app/api/routes/vault_access.py`
- `gmfn_backend/app/api/router.py`
- `gmfn_backend/alembic/versions/20260421_add_vault_access_links.py`
- `frontend/src/pages/ShopControlPage.tsx`

Migration safety note:

- `20260421_add_vault_access_links.py` is idempotent.
- It uses PostgreSQL-safe boolean defaults.
- It creates `vault_access_links` even if Render pre-deploy has not yet created
  `marketplace_shops`, then adds the shop foreign key only when the referenced
  table is present.

Remaining Phase 2 check:

- Deploy to Render and confirm live OpenAPI exposes the six Vault operations.
- Phone-test Shop Control link creation/copy/open/extend/revoke.
- Open `/vault/:token` and confirm a valid link shows only Vault-private
  products for that shop.

## Phase 3 - Admin Backend Cleanup

Goal: make admin oversight reliable before broader external testing.

Safe classification note:

- `docs/DORMANT_ROUTE_CLASSIFICATION_2026-04-21.md` now separates dormant
  route files into:
  - likely duplicate/superseded files
  - active frontend gap candidates
  - sensitive product routes that should not be mounted blindly
  - utility/future surfaces
- The first code candidate identified by that classification,
  `trust_timeline.py`, has now been mounted locally because
  `frontend/src/pages/TrustTimelinePage.tsx` actively calls
  `/trust/me/timeline`.
- The Trust Timeline frontend now sends its JSON/PDF requests through the
  configured backend API base instead of same-origin static-site fetches.
- `merchant_verify.py` was inspected and should remain dormant for now:
  - its frontend helper is not imported by active pages
  - active TrustSlip verification is already mounted through `trust_slips.py`
  - its public `GET /trust-slips/verify/{token}` route conflicts in shape with
    mounted `GET /trust-slips/verify/{code}`
  - it writes merchant verification TrustEvents, so it needs explicit product
    approval before activation
- Repayment, dispute, courier/shipment, merchant release, and bulk guarantor
  routes should stay deliberate product work, not automatic router mounts.

Known cleanup targets:

- Duplicate route registrations:
  - `GET /trust/me/evidence-pack/meta`
  - `GET /trust/why/{user_id}`
  - `GET /admin/trust-events/recent`
  - `GET /admin/trust/why/{user_id}`
- Unmounted admin/backend route files that must be classified:
  - mount if still needed
  - retire if superseded
  - document if deliberately dormant
  - current classification is recorded in
    `docs/DORMANT_ROUTE_CLASSIFICATION_2026-04-21.md`

Bank-route cleanup status:

- The legacy `bank_reconciliation.py` router has been unmounted locally.
- Canonical bank operations now remain under `app/api/routes/bank.py`.
- Local duplicate-route inspection no longer reports `GET /bank/expected` or
  `POST /bank/reconcile`.

Admin-domain screens to verify:

- System Operations
- Admin trust events
- Admin trust graph
- Admin identity risk
- Admin incomplete loans
- Bank console / reconciliation
- Exposure admin
- Community join requests

Definition of done:

- Admin routes have one clear owner each.
- Admin screens do not rely on dead endpoints.
- OpenAPI warnings from duplicate operation IDs are reduced or removed.
- Any intentionally dormant route file is documented.

## Phase 4 - Freeze Before Wider Testing

Goal: stop drifting once the critical backend/admin work is complete.

Freeze criteria:

- Frontend build passes.
- Backend imports and OpenAPI generation pass.
- Render backend deploy succeeds.
- Render frontend deploy succeeds.
- Pilot test flow doc is current.
- Endpoint audit doc is updated.
- Handoff notes name the exact remaining risks.

After freeze:

- Only bug fixes from tester evidence.
- No broad UI redesign.
- No schema/auth/payment/ledger changes unless explicitly approved.
- Vault trust-event creation remains off unless approved as a separate product
  rule.
