# Dormant Route Classification - 2026-04-21

## Purpose

Pilot testing has started, so unmounted backend route files should not be
mounted casually. This note classifies dormant `APIRouter` files by risk and by
whether an active frontend screen appears to need them.

This is a safety/control document only. It does not change backend behavior.

## Safety Rule

Do not mount a dormant route file just because it exists.

Before mounting, confirm:

- the route has a current frontend caller or a product-owner-approved test path
- the route does not duplicate a mounted route owner
- auth and admin checks are correct
- no schema, payment, ledger, trust-event, or Vault visibility rule changes are
  hidden inside the route

## Confirmed Corrected Before This Pass

`system_diagnostics.py` is no longer dormant in local code. It was mounted in
`gmfn_backend/app/api/router.py` and local OpenAPI now includes
`/system/diagnostics`.

Expected status:

- local: corrected
- live Render: corrected only after the backend deploy containing that commit

## Category A - Already Covered Or Likely Superseded

These files expose routes that appear to be covered by mounted route owners or
older duplicate surfaces. They should stay unmounted unless a specific missing
behavior is proven.

- `health.py`
  - dormant route: `GET /health`
  - covered by the main app health route
- `public.py`
  - dormant route: `GET /public/config`
  - covered by mounted public config route
- `loan_summary.py`
  - dormant route: `GET /loans/{loan_id}/summary`
  - covered by mounted loans route
- `repayments.py`
  - dormant routes:
    - `POST /loans/{loan_id}/repayments`
    - `GET /loans/{loan_id}/repayments`
  - covered by mounted loans route
- `trust_evidence_pack.py`
  - dormant routes:
    - `GET /trust/me/evidence-pack/meta`
    - `GET /trust/me/evidence-pack.zip`
  - covered by mounted evidence/trust pack route
- `exposure_admin.py`
  - dormant routes:
    - `GET /exposure/admin`
    - `GET /exposure/admin/cci-scores`
  - covered by mounted exposure route
- `trust_score.py`
  - dormant routes:
    - `GET /trust/score/explained-clan`
    - `GET /trust/score/explained-clan/{user_id}`
  - likely older/specialized naming beside mounted trust score explanations

Safe action now:

- leave unmounted
- do not delete yet
- revisit only during duplicate route ownership cleanup

## Corrected After Classification

### `trust_timeline.py`

Status: corrected locally after this classification.

Mounted routes:

- `GET /trust/me/timeline`
- `GET /trust/timeline/{user_id}`

Frontend alignment:

- `frontend/src/pages/TrustTimelinePage.tsx` now sends timeline JSON and PDF
  downloads through the configured backend API base instead of same-origin
  frontend-host fetches.

Verification:

- local OpenAPI includes `/trust/me/timeline`
- local OpenAPI includes `/trust/timeline/{user_id}`
- local OpenAPI still includes `/trust/me/timeline.pdf`
- frontend build passes

Remaining caution:

- the admin timeline route must keep its admin guard
- the route becomes live only after the backend deploy containing this change

## Category B - Active Frontend Gap Candidate

These are not safe to ignore forever because a current frontend screen or shared
frontend helper references the behavior.

### `merchant_verify.py`

Dormant routes:

- `GET /trust-slips/me/merchant-link`
- `GET /trust-slips/me/merchant-view`
- `GET /trust-slips/verify/{token}`

Frontend evidence:

- `frontend/src/lib/merchantChannel.ts` calls
  `/trust-slips/me/merchant-link`

Recommended next safe step:

- inspect whether `merchantChannel.ts` is reachable from active pages
- decide whether this belongs inside the mounted TrustSlip router instead of
  mounting a second verification owner

Risk:

- medium, because merchant-facing verification is public/trust-sensitive and
  overlaps with existing TrustSlip verification routes

## Category C - Real Product Work, But Not Safe To Mount Blindly

These routes sound important, but they touch sensitive product areas. They
should be mounted only after business rules are confirmed.

### Repayment and admin repayment routes

- `admin_repayments.py`
- `admin_repayment_reversals.py`
- `repayment_claims.py`

Why cautious:

- repayments affect finance evidence and trust evidence
- reversals can undo already-recorded financial meaning
- admin permissions must be exact

Safe next step:

- compare them with mounted repayment/expected-payment routes
- define one repayment evidence owner before mounting anything

### Dispute routes

- `disputes.py`
- `admin_disputes.py`

Why cautious:

- disputes can change how finance behavior is interpreted
- admin resolution may affect trust story

Safe next step:

- define dispute lifecycle and trust-event meaning before mounting

### Shipment, courier, and delivery routes

- `shipment.py`
- `shipment_events.py`
- `courier_confirm.py`

Why cautious:

- courier links may be public/no-login links
- shipment events may become trust timeline evidence
- release/delivery wording must avoid implying GMFN/GSN guarantees delivery

Safe next step:

- decide whether shipment belongs to TrustSlip release flow, marketplace trade
  flow, or a separate courier pilot

### Merchant release and merchant view routes

- `merchant_release.py`
- `merchant_view.py`

Why cautious:

- merchant release is close to credit release before payment
- merchant view may expose trust/identity information externally

Safe next step:

- fold into the TrustSlip/merchant verification design instead of adding
  competing route owners

### Loans bulk guarantor routes

- `loans_bulk.py`

Why cautious:

- bulk approve/decline can change guarantor obligations quickly
- needs strong permission and user-confirmation rules

Safe next step:

- leave dormant until guarantor/admin flow is reviewed

## Category D - Utility Or Future Surfaces

These may be useful, but no active production need was proven in this pass.

- `daily_insight.py`
  - route: `GET /public/daily-insight`
  - likely public content/insight surface
- `share.py`
  - route: `GET /share/loans/{loan_id}/audit-links`
  - useful for evidence sharing, but must align with TrustSlip evidence rules
- `trust_slip_evidence.py`
  - route: `GET /trust-slips/me/evidence.pdf`
  - may overlap with current trust evidence pack/PDF flow
- `trust_slips_verify_ui.py`
  - route: `GET /trust-slips/verify/{token}`
  - overlaps with existing TrustSlip verify routes
- `cci.py`
  - routes:
    - `GET /trust-events/score`
    - `GET /trust-events/score/users/{user_id}`
  - likely older trust scoring surface

Safe action now:

- leave unmounted
- do not delete
- revisit only when the related page or admin test path is active

## Recommended Safe Order From Here

1. Inspect `merchantChannel.ts` reachability before touching merchant verify
   routes.
2. Leave repayment, dispute, shipment, courier, merchant release, and bulk
   guarantor routes dormant until the business rules are deliberately reviewed.
3. During admin cleanup, retire or archive true duplicates only after confirming
   no frontend imports, service imports, tests, or documentation still depend on
   them.
