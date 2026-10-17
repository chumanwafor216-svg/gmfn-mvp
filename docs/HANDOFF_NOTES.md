# Active Handoff Notes

This file is the compact current-state handoff required by `README.md` and
`docs/PROJECT_PROTOCOL.md`. The fully repaired historical record through
2026-10-17 is preserved in
[`archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md`](archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md).

Keep this file short. Put large work-package histories in a focused dated file
under `docs/` or `docs/archive/`, then link that file here.

## Current production baseline - 2026-10-17

- Production branch: `main`.
- Current verified commit: `bf4801d5188bae46f7186fb29c1302da42167108`
  (`Repair and archive handoff history`).
- Frontend Render deploy `dep-db9q0mqog99s738u41g0` reached `live` on that
  exact commit. GitHub Actions run `39048981792` completed successfully.
- The public frontend and API health endpoint both returned HTTP 200 after the
  deployment; API health reported `{"ok":true,"dev_mode":false}`.
- The latest change was frontend/docs/audit-only. The workflow correctly
  skipped the API deployment.

## Active product truth

### Spotlight

- The owner-to-community Public Shop connection is repaired and deployed.
  Ordinary owner entry keeps the exact owner inspection item first, then merges
  eligible canonical Spotlight presentations from other members in the
  viewer's communities. Explicit Owner Preview remains pinned to the owner's
  own item.
- Candidate policy still excludes self-delivery, inactive or legacy-unlinked
  placements, held or expired campaigns, exhausted or not-due campaigns, and
  frequency-capped campaigns. A raw database count is therefore not the number
  of presentations a viewer is entitled to receive.
- Spotlight behavior is owner-approved and frozen unless the owner explicitly
  asks to change it.

### Public Shop

- The duplicate screen-level product `+` control was removed. Product cards
  retain their own add/replace control.
- Product controls and Spotlight presentation share the current deployed
  Public Shop surface. Preserve exact product-block links and owner-preview
  separation.

### DemandBox

- Governed `Expand search` is deployed. It appears only on the requester's
  own community-visible open request after a successful local supply check
  finds zero plausible matches.
- Expansion reuses explicit one-hop relay consent, origin outbound policy,
  target inbound policy, legitimate bridge checks, and plausible target-supply
  checks. Candidate communities and providers remain hidden until an
  authorised bridge accepts.
- The current feature is not a public, nearby, radius-based, paid, recommended,
  guaranteed, or network-wide search.
- A future 10/20-mile paid search remains unimplemented because location and
  provider consent, pricing, payment, refund, and discovery contracts have not
  been approved.

### Trust and evidence surfaces

- Loan Suggestions copied snapshots say `Suggested supporters visible`.
- Trust Evidence Pack exports already use the DB-aware safe event serializer.
  Behavioral tests confirm omission of raw loan, community, guarantor, actor,
  subject, phone, tracking, payment, metadata, and other private identifiers.
- The institutional proof audit was corrected to recognize that real serializer
  path; backend runtime behavior did not change.
- Market Wisdom on `/app/dashboard` remains frozen.

## Latest verification

- Frontend production build passed with 290 modules.
- `audit:proof-surfaces`, `audit:trust-actions`,
  `audit:demand-box-front-package`, and
  `audit:demand-box-expand-search` passed.
- Focused Trust Evidence Pack and institutional surface tests: 39 passed.
- Focused opportunity-relay backend tests: 25 passed.
- Current broad phone-surface, loan-action, tap-stability, and visual-route
  coverage audits pass.
- `audit:button-stability` now recognizes the approved current action
  contracts for Community Home, entry, My GSN, Notifications, Finance,
  Companion settings, Public Shop, Shop Control, and TrustSlip Verify.

## Button-stability aggregate reconciliation - 2026-10-17

- The broad aggregate had twelve stale expectations left behind by approved
  phone simplification, disclosure, action-ID, Public Shop product-rail, and
  Shop Control component-extraction changes.
- Every affected focused contract passed before the aggregate was changed.
  Only `frontend/tools/audit-button-stability.mjs` was reconciled; no page,
  component, route, permission, state transition, or visible product behavior
  changed.
- The aggregate now protects the current stable primitives, disclosure
  controls, CTA resolution, clamped geometry, product open/share/repost rail,
  and TrustSlip evidence controls without demanding removed UI.

## Documentation maintenance - 2026-10-17

- Recovered 56 historical lines that had expanded through 13-15 repeated
  UTF-8/Windows-1252 misconversions.
- The full history fell from 54,664,765 bytes (52.13 MiB) to about 10 MB before
  archival. No historical section was deliberately deleted.
- The active handoff is now this compact index, following the repository's
  existing handoff-size rule.
