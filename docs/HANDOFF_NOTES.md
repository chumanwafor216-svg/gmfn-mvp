# Active Handoff Notes

This file is the compact current-state handoff required by `README.md` and
`docs/PROJECT_PROTOCOL.md`. The fully repaired historical record through
2026-10-17 is preserved in
[`archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md`](archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md).

Keep this file short. Put large work-package histories in a focused dated file
under `docs/` or `docs/archive/`, then link that file here.

## Current production baseline - 2026-10-18

- Production branch: `main`.
- Current verified application commit: `ba7428f2acad871946df010d87485258c509024e`.
- Frontend Render deploy `dep-dba950u54i7c738m87d0` and API Render deploy
  `dep-dba96bijnfac73eraco0` reached `live` on that exact commit. Trigger
  Render Deploy run `39115818114` completed successfully with the explicit
  `deploy_api=true` input.
- Independent post-deploy requests returned HTTP 200 from the Public Shop
  frontend and API OpenAPI document; the live API still exposes the Spotlight
  qualification route. The workflow also passed its frontend build-marker and
  live API identity/public verification checks.
- This release adds Spotlight qualification atomicity and per-viewer locking,
  plus frontend rotation, expiry, retry, and stale-refresh hardening. Both
  frontend and API therefore required deployment.

## Deployed Spotlight repair - 2026-10-18

- Production evidence confirmed that campaign `319` for shop `4` activated at
  `2026-10-17T00:17:45Z` and expired exactly 24 hours later at
  `2026-10-18T00:17:45Z` (`01:17:45` BST). The owner's approximately `08:56`
  BST screenshot was therefore correctly expired; it was not an early-expiry
  defect.
- The asymmetric rotation was real but was not a separate or broken shop
  channel. Viewer `13` had already reached two qualifying impressions on live
  campaigns `321` and `322`, while viewer `3` had not; campaign/community
  placement and self-delivery rules also made their eligible pools different.
  Repeated production opportunity requests returned HTTP 200, proving the
  phone refresh loop was running.
- Root defect: fresh selection suppressed viewer-capped campaigns while replay
  suppressed the same campaigns whenever global pacing said they were due.
  The endpoint could therefore return an empty rail for the more active viewer.
- Local repair permits a short tokenless due replay only when no fresh item was
  selected and the exact campaign was suppressed by that viewer's normal cap
  or exhausted DemandBox override. Lifecycle, exact route/membership, content
  version, availability, and prior qualified exposure are still revalidated.
  It creates no delivery round, presentation lease, exposure, or impression.
- Public Shop phone repair puts live Spotlight WhatsApp on a contained second
  action row, hides it without a live contact, prevents touch-retained focus
  from pausing rotation indefinitely, and prevents an expired owner status from
  reusing the shop hero as apparently live campaign media.
- Verification: 98 focused backend tests passed; TypeScript/Vite production
  build passed (290 modules); Spotlight presentation, system-feed, and Public
  Shop button audits passed; enhanced real-browser Spotlight smoke passed at
  390x844, including WhatsApp containment, expired-state honesty, touch-focus
  recovery, replay rotation, and no double counting; the full protected-button
  freeze audit also passed.
- The product owner explicitly authorized deployment. Commit
  `f02c0c51b563d468316622d50f953142b5f035ed` was pushed to
  `codex/spotlight-rotation-continuity`, promoted unchanged to `main`, and
  deployed to both Render services.

## Deployed Spotlight reliability hardening - 2026-10-18

- Exposure recording and lease qualification now commit atomically. A
  failure-injection regression proves a failed commit leaves no exposure and
  leaves the lease issued rather than falsely qualified.
- Qualification locks both the presentation lease and a stable viewer row
  before rechecking eligibility, serializing simultaneous cap decisions for
  the same viewer on PostgreSQL.
- Public Shop now prioritizes the API-selected fresh lease without interrupting
  the current five-second dwell, deduplicates presentations, removes canonical
  rows at their server expiry, and requests replenishment.
- Hidden tabs retain authoritative governed state rather than falling through
  to legacy broadcasts. Refresh generations prevent older overlapping
  responses from overwriting newer state.
- Canonical qualification remains retryable until the server accepts it;
  attention is recorded only after acceptance. Weighted rotation no longer
  creates consecutive identical items or a duplicate cycle boundary.
- Verification: 219 focused backend tests passed; TypeScript/Vite production
  build passed (290 modules); Spotlight presentation, system-feed, Public Shop
  button, and full protected-button freeze audits passed; the 390x844 browser
  smoke passed eight scenarios including fresh-over-replay priority, rejected
  qualification retry, exact expiry removal, WhatsApp removal, replay
  continuity, and no double counting.
- Backend inventory risks remain: ten abandoned issuances can consume all
  global delivery rounds without an impression; truncating to 50 candidates
  before pacing can hide a due campaign; a pacing CAS loss does not try the
  next candidate; replay staleness is 60 seconds while the route promises 30;
  and candidate discovery ignores its limit.
- Changing when the ten global rounds are consumed is a frozen policy decision
  and requires product-owner approval. That policy was deliberately not
  changed in this reliability release.

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
- The deployed correction fixes the
  remaining continuity gap: qualified, still-live campaigns may return as
  short-lived, revalidated, tokenless replays after fresh delivery rounds are
  exhausted. Replay still creates no delivery round, presentation lease,
  qualifying exposure, or owner-facing impression.
- The current reliability release keeps fresh governed leases ahead of replay,
  retries rejected qualification before recording attention, expires contact
  actions on the server deadline, and prevents weighted repeats from making
  the rail appear frozen.
- Public Shop timing is now count-aware: up to 24 unique queued items retain a
  five-second dwell; larger queues shorten gradually against a two-minute cycle
  target with a two-second floor. The backend still selects one fresh relevant
  opportunity at a time and returns at most four replays, rather than dumping
  a large raw inventory into the browser.
- Spotlight behavior remains owner-approved and frozen outside these explicit
  2026-10-17 continuity/timing corrections.

### Public Shop

- The duplicate screen-level product `+` control was removed. Product cards
  retain their own add/replace control.
- Product controls and Spotlight presentation share the current deployed
  Public Shop surface. Preserve exact product-block links and owner-preview
  separation.

### DemandBox

- The deployed owner-approved simplicity batch gives phone members
  two front-door choices (`Post a need`, `Ask a question`), three exposed
  queue filters (`All`, `For you`, `Yours`), one `More filters` disclosure,
  one `More options` form disclosure, and one-open-at-a-time request cards.
- No DemandBox capability was deliberately removed. All seven direct queue
  routes, private One person targeting, supply matches, copy/contact,
  fulfil/cancel, paging, and one-hop expanded search remain reachable.
- Relay policy administration is hidden from ordinary members and remains
  collapsed for authorised owners/admins under `Community search settings`.
- This batch changes only the DemandBox frontend, its focused audits/smoke,
  and documentation. Marketplace, backend routes, permissions, data models,
  Dashboard, Spotlight, and Market Wisdom are untouched.
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

- The deployed DemandBox simplicity batch passed the full TypeScript project
  check and a direct Vite production bundle (290 modules).
- The deployed Spotlight reliability release passes the TypeScript/Vite
  production build (290 modules), audit:spotlight-presentation-contract,
  audit:spotlight-system-feed, audit:shop-gallery-button-inventory, the full
  audit:protected-button-freeze, and the eight-scenario real-browser
  smoke:spotlight-owner-visibility.
- Focused Spotlight and Public Shop backend verification passes: 219 tests,
  including atomic rollback, presentation, exposure, frequency, diversity,
  eligibility, pacing, transaction-safeguard, and Public Shop contracts.
- `smoke:demand-box-simple-phone` passes at 390x844 and 360x780, including
  compact first surface, filters, one-open request cards, essential form,
  optional controls, private-person reveal, and horizontal overflow checks.
- `audit:demand-box-front-package`, `audit:demand-box-expand-search`,
  `audit:marketplace-demand-box-lane`, targeted ESLint, and the broad
  `audit:button-stability` pass for this local batch.
- `audit:protected-button-freeze` passes in full for this deployed repair.
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
