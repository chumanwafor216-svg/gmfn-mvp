# Active Handoff Notes

This file is the compact current-state handoff required by `README.md` and
`docs/PROJECT_PROTOCOL.md`. The fully repaired historical record through
2026-10-17 is preserved in
[`archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md`](archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md).

Keep this file short. Put large work-package histories in a focused dated file
under `docs/` or `docs/archive/`, then link that file here.

## Current production baseline - 2026-10-18

- Production branch: `main`.
- Current verified frontend and API application commit:
  `52b9da7f98bc1cd1be08c67b4e89028c9e348674`.
- Frontend Render deploy `dep-dbafg3p124ks73efotjg` and API Render deploy
  `dep-dbafhdbncjis73dcq03g` both reached `live` on that exact commit.
  Trigger Render Deploy run `39146577156` completed successfully with
  `deploy_api=true`, verified the public frontend build marker, and passed
  the live API contract check on its first attempt.
- Main-branch Backend Tests run `39146264192` completed successfully before
  deployment.
- Independent post-deploy requests returned HTTP 200 from the frontend,
  `/health`, and `/marketplace/media/ping`; health reported
  `{"ok":true,"dev_mode":false}` and the media router reported active.
- The current frontend adds the focused exact-product management destination
  to the already deployed owner shortcut and permanent-deletion workflow. The
  retained API release includes atomic Vault/linked-Spotlight retirement,
  durable reference-safe media cleanup, bounded expired-Spotlight payload
  compaction, and Alembic migration
  `20261018_spotlight_payload_retention_v1`.

## Media Quality Gate v1 implementation - 2026-10-18

- Status: deployed and independently health-checked on the exact application commit recorded above.
- New product, Vault, Community Notice, and Spotlight videos now share one authenticated backend quality gate. The server inspects the real media, not client duration or file labels; rejects unreadable, sub-720-short-edge, sub-20-fps, extra-wide/tall, empty/too-short, oversized, and failed-transcode video; physically keeps only the opening 10 seconds; and writes a bounded MP4/H.264 output. Existing audio is encoded as AAC with modest loudness normalisation; silent product video remains valid.
- The implementation deliberately does not add AI enhancement, sharpening, invented detail, filters, or a video editor. The member receives preparation guidance and a specific corrective rejection. Measurable technical checks cannot guarantee subjectively good lighting, framing, speech, or selling quality.
- New pasted/external video links, direct local video PUT, and direct R2 video PUT can no longer bypass verification. Existing legacy video remains readable and may survive an unchanged edit; a new or changed video must be uploaded through the verified path. Shop Gallery Tools and Vault Control retain explicit Remove video actions.
- Focused backend verification passed 14 tests, including low-resolution and extreme-aspect rejection, false client-duration resistance, bounded oversize reading, physical trimming of a real 12-second audio/video file, H.264/AAC output inspection, verified-file enforcement, and closure of the legacy direct-upload route. The broader Marketplace, Spotlight lifecycle, Community Notice, and Vault regression run passed 128 tests. The media-quality, Shop Assets, Vault Control, Spotlight controls, and complete protected-button audits passed, and the frontend production build passed with 290 modules. The deployment workflow and independent HTTP checks recorded above passed. A real authenticated production video publish remains the final phone/pilot observation; the health and route checks do not execute a production transcode.

### Large-source preparation continuity correction

- Owner requirement: members must not need to know whether a selected phone video is 15 or 20 seconds, and an otherwise acceptable large source must be reduced by GSN instead of being rejected merely because it is larger than the published clip.
- The earlier gate correctly cut duration and compressed output, but had one real browser-parity gap: the backend applied the 15 MB published-output ceiling to the unprocessed source. A browser without the required local `MediaRecorder` / capture-stream support could therefore fail before the authoritative server could prepare the file.
- Source and output ceilings are now intentionally separate. The authenticated backend accepts a bounded source up to 100 MB, streams it to a temporary file rather than loading it into API memory, verifies the real media, keeps only the opening 10 seconds, and still requires the published MP4 output to be no larger than 15 MB. Partial source files are removed when the bounded limit is crossed.
- Supported phones still prepare a smaller clip locally first to reduce upload time. If that optional phone step is unavailable or fails, sources within the server ceiling fall back to the same verified backend pipeline; this does not restore an unverified publication bypass.
- The measurable quality rules remain unchanged: at least one second, 720-pixel short edge, 20 fps, aspect ratio no greater than 1.85:1, and a playable MP4/WebM/MOV source. No AI enhancement, upscaling, invented detail, or video-editor workflow was added.
- Verification: the focused media suite passed 10 tests, including a real source larger than the former 15 MB ceiling being physically reduced and returned below the published limit; the broader Marketplace/Public Shop/Spotlight/Vault/Community Notice run passed 131 tests; the media-quality audit and production frontend build (290 modules) passed; and the complete protected-button-freeze audit passed. A real phone upload near the new source ceiling remains a production-pilot observation because local tests cannot prove the member's network upload speed or Render request latency.

## Deployed Public Shop product management and retention handoff - 2026-10-18

- Status: committed, pushed to the working branch and `main`, and deployed on
  the exact verified application commit recorded above.
- The owner explicitly superseded the 2026-10-17 single-plus Public Shop
  product-card rule. The existing card `+` / `×` remains the open/close
  control. When that exact product card is open, the exact signed-in shop owner
  now receives a separate 48px `+` after Close, Share, and Repost.
- The new inner `+` performs no product write and never opens or plays the
  media. It passes the exact product ID, numbered block, selected community,
  source, and return context to the existing Shop Gallery Tools lane.
- Visitors and signed-in non-owners never receive the inner management
  control. Closed owner cards do not show it, so the public media remains
  unobstructed.
- The owner destination selects and focuses the exact block, explains the
  immediate choice, and presents `Change media or details` and
  `Delete permanently` first. Change reveals and focuses the existing media
  editor; its controls now say `Add/Change picture` and
  `Add/Change video` according to actual media state.
- `Delete permanently` in Shop Gallery Tools and Vault Control requires exact
  current-shop-owner authority and confirmation. It permanently removes the
  product row and reposts, scrubs the attached Vault offer payload (media,
  caption, and owner note), revokes active Vault access links, withdraws and
  compacts any linked live Spotlight, explicitly detaches surviving evidence
  references, preserves minimal archived/link/exposure evidence, and clears
  stale frontend seed/cache state. There is no restore path; the owner must
  upload the item again if needed. Former sellers/admins do not inherit this
  irreversible owner authority, and the legacy `/archive` endpoint refuses
  instead of deleting.
- Managed media cleanup compares canonical object identity rather than raw URL
  strings, confines local/R2 targets to the marketplace namespace, and uses a
  durable bounded retry queue committed with the payload deletion. Shared,
  external, and unsafe paths are retained; failed storage calls remain queued.
  Completed task rows are removed so the retry queue stays lean.
- Expired Spotlight maintenance now uses a bounded compactor that removes
  delivery payload and unreferenced managed media without destroying campaign
  identity, fingerprints, version chronology, or exposure evidence.
- A new `payload_compacted_at` marker and migration make Spotlight compaction
  explicit and idempotent.
- Minimal audit and exposure evidence is preserved after payload compaction;
  expiry alone does not authorize deletion of trust or commercial history.
- The API runs bounded maintenance at startup and hourly, enabled by two
  nonsecret Render Blueprint environment variables and without a new service.
  It retries pending media cleanup first, compacts expired Spotlight payload,
  and logs production work/failures.
- Current verification: 25 focused backend product-deletion, canonical-media,
  R2, Spotlight-retention, and Vault tests passed; the broad Marketplace Public
  Shop and controlled-lifecycle run passed 78 tests; frontend TypeScript/Vite
  production build passed with 290 modules; the focused Shop Assets, Vault
  Control, three-plus, and action-response audits passed; and the complete
  protected-button freeze audit passed, including its browser visual stages.
  `render.yaml` parsed successfully and Alembic reports one head:
  `20261018_spotlight_payload_retention_v1`.
- Earlier plus-handoff verification: before the permanent-deletion and
  retention changes, the TypeScript/Vite production build (290 modules),
  focused audits, browser smokes, and 390x844 workflow smoke passed for the
  owner-only management handoff.

## Deployed exact-product Shop Gallery simplification - 2026-10-18

- Status: committed as `fae5be9577e3573b388d22bbb8464777147a1ccb`,
  pushed to the working branch and `main`, and deployed through frontend
  Render deploy `dep-dbaepg1124ks73ef6rcg`. Workflow run `39142897929`
  succeeded and an independent public request returned HTTP 200.
- The Public Shop inner product-management `+` still carries the exact product,
  block, community, and return context into Shop Gallery Tools.
- That route is now a focused task. It opens the requested block and shows
  Change media or details and Delete permanently first, while hiding the
  generic six-block chooser, quick Add, Copy, and Repost controls. Ordinary
  Shop Gallery Tools entry retains all of those capabilities.
- Choosing Change opens the existing editor with `Save changes` and
  `Close form`. The focused editor omits the unrelated Copy shop link action.
- Permanent deletion on the selected product is no longer visually disabled by
  the separate Shop Diary feature switch; backend exact-owner authorization and
  permanent-deletion safeguards remain unchanged.
- Verification: Shop Assets slot audit passed; three-plus shortcut audit
  passed; the TypeScript/Vite production build passed with 290 modules; and the
  real 390x844 browser smoke passed the exact-product selection, enabled
  Change/Delete choices, focused editor, no-overflow, owner/visitor boundary,
  return-context, and no-business-write checks. The complete protected-button
  freeze audit also passed, including Shop Control action inventory and mobile
  visual checks.

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
- The remaining backend policy risk is that ten abandoned issuances can
  consume all global delivery rounds without an impression. The candidate
  cutoff, pacing-conflict fallback, replay TTL, and ignored-limit defects
  listed here were repaired by the following deployment.
- Changing when the ten global rounds are consumed is a frozen policy decision
  and requires product-owner approval. That policy was deliberately not
  changed in this reliability release.

## Deployed Spotlight candidate and pacing hardening - 2026-10-18

- Canonical Public Shop selection now sends the full eligible campaign set to
  diversity, frequency, and pacing rather than cutting it to 50 candidates
  first. A regression with 51 distinct owners proves a due campaign after the
  old boundary remains selectable.
- Bounded candidate-discovery calls now honor their limit and exclude expired
  campaign, placement, and opportunity rows before applying that bound. The
  canonical path is explicitly unbounded so it cannot hide a due campaign
  behind the generic discovery limit.
- A delivery-round conflict or compare-and-swap loss for the first selected
  campaign now rolls back that attempt inside a nested transaction and tries
  the next planned candidate. A failure-injection regression proves the first
  campaign is not consumed and the second can receive the sole lease.
- Presentation replay time-to-live and the route's advertised maximum stale
  time are now the same 30-second constant.
- Verification: 222 backend tests passed across presentation, exposure,
  frequency, diversity, candidate, eligibility, pacing, delivery, transaction
  safeguard, and Public Shop contracts. The TypeScript/Vite production build
  passed (290 modules), all three focused Spotlight/Public Shop audits passed,
  the eight-scenario real-browser Spotlight smoke passed, and the full
  protected-button freeze audit passed.
- The ten-round issuance-consumption policy was not changed. Ten abandoned
  issued leases can still consume all global delivery rounds without a
  qualified impression; changing that frozen policy still requires explicit
  product-owner approval.

## Production viewer audit and expired-renewal hardening - 2026-10-18

- A read-only Render/PostgreSQL audit used only campaign, placement,
  membership, pacing, lease, and exposure identifiers. No names, phone
  numbers, emails, Spotlight messages, credentials, or secrets were queried.
- The original owner campaign `319` expired at `2026-10-18T00:17:45Z`
  exactly as shown by the UI. Campaign `321` expired at
  `2026-10-18T08:13:17Z`. Runtime selection excludes both by their
  authoritative deadlines even though their persisted lifecycle labels had
  not yet been lazily changed from `active`/`serving`.
- At `2026-10-18T13:36:06Z`, viewer `13` had a capped but replay-eligible
  route to campaign `322`, plus a live, due, non-capped route to campaign
  `323`. Campaign `323` belongs to viewer `3`, is placed in communities
  `2`, `4`, and `8`, and remains authorized until
  `2026-10-19T08:12:17Z`.
- Viewer `3` had no non-self live campaign route at that time. This is
  expected: campaign `323` is their own campaign, and owners see their own
  Spotlight through authenticated owner inspection rather than delivery
  rotation.
- The production ledger contained zero new Spotlight leases or exposures
  between the prior API deployment at `2026-10-18T10:05:49Z` and the audit
  at `2026-10-18T13:34:45Z`. Therefore the deployed account-specific
  rotation correction was not yet exercised by a real account, and a real
  owner/visitor opening remains required evidence.
- The owner subsequently uploaded campaign `324` at
  `2026-10-18T13:44:30Z`. It is active across six direct-community
  placements and is authorized until `2026-10-19T13:44:30Z`; prior owner
  campaign `319` is now persistently labelled `expired`. The owner also
  reported that live rotation appeared correct and will continue monitoring.
- Production independently proves that viewer `13` received a governed
  campaign-`323` presentation lease at `2026-10-18T13:39:23Z`, closing
  the former blank-selection gap. That lease remained `issued`, with no
  qualifying exposure recorded, so selection/rotation continuity is proven
  but qualification completion for that observation is not yet proven.
- A post-observation API health review found no Spotlight, database,
  integrity-constraint, timeout, or HTTP 5xx errors. The sampled error-level
  entries were the known trapped bcrypt-version warning, not Spotlight
  request failures.
- A separate latent expiry defect was confirmed in the disabled-by-default
  member-credit writer: it ignored an expired campaign still labelled
  `active` but did not retire it before inserting the renewal, allowing the
  one-active-owner database constraint to reject a valid renewal. The service
  now retires expired active rows inside the same savepoint as the replacement
  activation; funding or activation failure rolls the cleanup back as well.
- Verification: the focused member-credit integration suite passed `7`
  tests; the broad Spotlight/Public Shop/member-credit suite passed `229`
  tests; Python compilation and scoped diff checks passed. The ten-round
  policy, frontend UX, auth, permissions, pricing, schema, and environment
  configuration were not changed.

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

- Production still has the 2026-10-17 single-plus product-card contract. The
  verified local continuation keeps that open/close `+` and adds one separate
  owner-only inner media-management `+` only after a card opens.
- Product controls and Spotlight presentation share the Public Shop surface.
  Preserve exact product-block links, visitor/owner separation, and Spotlight
  owner-preview separation.

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
- Focused Spotlight, Public Shop, and member-credit backend verification
  passes: 229 tests,
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
