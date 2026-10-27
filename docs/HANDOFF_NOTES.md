# Active Handoff Notes

This file is the compact current-state handoff required by `README.md` and
`docs/PROJECT_PROTOCOL.md`. The fully repaired historical record through
2026-10-17 is preserved in
[`archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md`](archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md).

Keep this file short. Put large work-package histories in a focused dated file
under `docs/` or `docs/archive/`, then link that file here.

## Next-session product queue - 2026-10-27

- The owner resumed and completed the Community Confirmation Inbox milestone
  below, then explicitly chose to skip the My GSN & I / cover-related review.
  The commerce-intelligence-to-Market-Wisdom milestone is now complete locally.
  The owner clarified that the GSN Growth Partner and `revenue per module`
  ideas are end-of-day strategy work, not the current runtime task. Resume the
  previously agreed implementation queue with the compact Dashboard Photo
  Frame affordance, followed by audit account
  suspension/closure/removal capability, design
  respectful inactivity reminders from GSN to the user, and use a planned
  12-minute Spotlight recording to measure short dwell times and unequal
  appearance frequency before changing rotation policy. Source review already
  confirms the Public Shop intentionally compresses queues above 24 items
  against a two-minute cycle, down to a two-second floor; tomorrow must decide
  whether to replace that owner-rejected readability tradeoff.
- Exact scope, decision questions, safety boundaries, and acceptance checks are
  recorded in
  [`NEXT_SESSION_PLAN_2026-10-27.md`](NEXT_SESSION_PLAN_2026-10-27.md).
- The linked queue file remains a planning record. Completed runtime work is
  recorded in the milestone sections below. Continue locally and deploy only
  when the owner explicitly says `deploy`.

## Community Confirmation one-request decision flow - 2026-10-27

- Completed the owner's next queue item on authenticated
  `/app/community-confirmations`. An ordinary inbox now renders one active
  request card at a time, with a compact `Request x of y` navigator. Previous
  and Next only change the visible request and never record a response.
- Preserved all nine response meanings and made the positive, caution, and
  objection choices equally visible under `What you can confirm`, `Where
  caution is needed`, and `What you cannot support`. Selecting a radio choice
  performs no mutation; only the separate `Record: <selected answer>` action
  calls the existing response endpoint.
- Kept the member identity, community, purpose, request window, aggregate
  count, TrustSlip route, optional private note, and full evidence context.
  Longer evidence and the private note now start in separate closed
  disclosures so the decision appears before operational detail.
- Preserved exact `request_id` notification focus, exact `case_id` reviewer
  focus, reviewer permissions, response payloads, private-note handling,
  public/privacy boundaries, and every backend contract. No backend route,
  schema, permission, response meaning, reviewer authority, or TrustSlip
  behavior changed.
- Verification passed: the 295-module production build; focused Community
  Confirmation boundary, button-stability, and phone-simplicity audits; the
  full protected-button/frozen-surface suite; and the populated, empty,
  notification-focus, reviewer-focus 390x844 browser smoke. The browser also
  proved that navigation and selection do not submit, the explicit record
  action preserves the backend type/reason pair, and the route has no
  horizontal overflow.
- The owner explicitly skipped queue item 2, the My GSN & I / cover-related
  re-audit. Continue next with queue item 3, commerce intelligence into the
  existing frozen Market Wisdom interaction model.
- This milestone is committed locally only. It has not been pushed, promoted
  to `main`, or deployed; publication still requires the owner's explicit
  `deploy` instruction.

## Market Wisdom commerce-signal investigation - 2026-10-27

- Completed the required source map before touching the frozen Dashboard
  Market Wisdom section. The existing owner-only Shop Analytics endpoint
  already combines persisted shop attention, qualified Spotlight attention,
  current community DemandBox context, and protected-trade evidence through
  its Opportunity Engine. Dashboard Market Wisdom currently receives only
  caller-composed context strings and does not query that owner evidence.
- Confirmed the critical truth boundaries: Shop/Spotlight attention is not
  sales or meaningful attention; current open DemandBox count is not matched
  demand; and no shop/permission/read failure is missing data rather than a
  zero reading.
- The smallest proposal is one optional server-owned `commerce_signal` on the
  existing `/market-wisdom/recommendation` response, sourced from a shared
  bounded Shop Analytics projection. It would influence approved-wisdom
  ranking and the existing `Now` reading without adding a fifth signal or
  redesigning the four-signal Market Wisdom model.
- The owner approved one compact contextual handoff action beneath the existing
  reading. Runtime implementation and verification are recorded in the
  completed milestone immediately below.
- Full evidence, proposed response shape, route ownership, duplication risks,
  and implementation files are recorded in
  [`MARKET_WISDOM_COMMERCE_SIGNAL_MAP_2026-10-27.md`](MARKET_WISDOM_COMMERCE_SIGNAL_MAP_2026-10-27.md).
- No runtime source, backend route, schema, permission, Market Wisdom UI,
  push, or deployment changed in this investigation.

## Market Wisdom bounded commerce signal - 2026-10-27

- Implemented an owner-scoped, selected-community-safe commerce projection in
  `gmfn_backend/app/services/market_wisdom_commerce_signal_service.py`.
  It reads active visible products, active serving Spotlight records,
  seven-day persisted shop attention, and current open, non-expired community
  DemandBox requests. It does not duplicate the richer Shop Analytics
  diagnosis engine.
- Extended the existing authenticated
  `GET /market-wisdom/recommendation` response with optional
  `commerce_signal`. Available signal tags influence only approved Market
  Wisdom ranking. No owned shop or a selected-community mismatch stays
  explicitly unavailable with no evidence counts or action route.
- Dashboard keeps exactly four rotating readings: `Market`, `GSN`,
  `Guide`, and `Now`. The bounded signal may shape `Now` and renders the
  owner-approved single compact contextual action only when the server supplies
  a valid `/app/` route. The existing Focus Commitments action remains
  separately conditional on capability 22.
- Truth boundaries remain explicit: views, opens, qualified Spotlight
  impressions, clicks, and contact taps are attention rather than buyers,
  sales, payments, delivery, verification, or trust score; DemandBox rows are
  community request context rather than matches or orders.
- Verification passed: 14 focused backend tests, Market Wisdom contract audit,
  Dashboard button inventory (one intentional new StableButton), the
  295-module production build, and the protected frozen-surface suite.
- Next owner priority is the module economics/revenue map described in
  `NEXT_SESSION_PLAN_2026-10-27.md`. Do not implement pricing from guesses:
  first confirm module ownership, payer, value unit, payment route, cost,
  evidence, and overlap.
- This milestone is local only. It has not been pushed, promoted to `main`, or
  deployed.

## GSN Growth Partner / affiliate terminology to-do - 2026-10-27 08:27

- The owner wants independent people to help bring users and communities into
  GSN and scale the network, and asked whether GSN Independent Entrepreneurs
  can genuinely be called affiliate marketing.
- Working answer: affiliate marketing describes a compensated, attributable
  promotional activity; it is not the name of every entrepreneur. Use
  `GSN Growth Partner` as the provisional umbrella, reserve
  `Affiliate Partner` for disclosed link/code commission tied to a qualifying
  click or paid sale, and keep `Independent Entrepreneur` for someone running
  their own shop or service.
- This distinction also prevents collision with the existing Community Domain
  meaning of an acknowledged parent/affiliate institutional relationship.
- Existing backend foundation:
  `/network-growth/attributions` records consent-bound introduction claims,
  participant acceptance/challenge, verified invite/QR evidence and bounded
  activation milestones. Its explicit current contract has no financial
  effect, commission, residual, payout, employment, territory or advertising
  authority.
- Before implementation, define the qualifying event, payer, reward formula,
  attribution window, duplicate/dispute rule, refunds and reversals, fraud
  controls, tax/KYC/accounting treatment, advertising disclosure, privacy and
  employment-status assessment.
- Keep any first pilot direct and single-tier. Never pay for recruiting other
  recruiters or create a downline. A conservative candidate is a fixed or
  capped first-sale reward after participant confirmation, collected
  non-refunded GSN revenue and a cooling period.
- This is planning only. No role, frontend, entitlement, ledger, payout,
  commission, residual, payment movement or public programme was created.
- Full ordered work is recorded under item 4 in
  `NEXT_SESSION_PLAN_2026-10-27.md`; the revenue-per-module map is now item 5.

## Existing-engines growth flywheel brainstorm - 2026-10-27

- Captured the owner's wider direction without authorising runtime work: GSN
  should reuse and compose its existing engines/buttons into reasons to come,
  activate, return, share and eventually create a measurable audience that
  advertisers may pay to reach.
- The four first-door expectations are buy/find, sell/promote, belong/organise,
  and achieve/prove. Inviting friends, direct referrals and useful phone-media
  preparation can strengthen those journeys but are not guaranteed income,
  buyers or opportunity.
- The future media direction is a small-business promotion assistant: ordinary
  phone photo/video -> simple GSN preparation/template -> shop name, short
  offer and contact/action -> preview -> owner-approved Shop/Spotlight
  publication. First inventory Photo Frame, video/sound preparation, Shop
  Assets, Spotlight, campaign renderer and GSN-HOUSE machinery; do not invent a
  new media engine before proving those tools cannot compose the result.
- Advertiser value is downstream of concentrated permitted audience, repeat
  utility, truthful qualification, brand safety, measurement, action path,
  pricing, billing and reporting. Account count alone does not create a
  credible advertising market.
- Before the day closes, complete the audience/gain/engine map, activation and
  retention events, Growth Partner loop, media journey, advertiser readiness,
  and revenue-per-module map; then revise the business plan and business
  forecast prepared for Steliana with explicit evidence and
  conservative/base/upside assumptions.
- Full capture:
  `GSN_EXISTING_ENGINES_GROWTH_FLYWHEEL_BRAINSTORM_2026-10-27.md`.
- This capture creates no new engine, role, commission, reward, entitlement,
  ad placement, payment, forecast claim, runtime source change, push or deploy.

## Compact Dashboard Photo Frame affordance - 2026-10-27

- Completed locally; not pushed or deployed.
- The visible `/app/dashboard` photo control was the passport `Frame tools`
  trigger. A second `Picture frame` control exists inside an always-hidden
  legacy section, so changing that second control would not have fixed the
  owner's live surface.
- Replaced the visible wide trigger with a compact live picture/initials tile
  plus `Edit photo`: 108px wide on phone, 116px on wider screens, while keeping
  the existing 40px/42px fixed height.
- The accessible name, stable shared button behavior, separate passport/main
  open states, anchored overlay, active file input, and Upload, Change, Remove
  actions remain unchanged.
- Added an optional `triggerContent` slot to
  `frontend/src/components/PictureFrameToolsControl.tsx`; callers without it
  continue to show the original label.
- Updated `SCREEN_SPECS.md`, the static Dashboard phone-button audit, and the
  phone-browser Dashboard frame audit. The browser audit now proves the compact
  trigger's width, height, accessible name, open state, and three visible tool
  actions on a 390px phone viewport.
- Passed:
  - `npm run audit:dashboard-phone-buttons`
  - `npm run audit:dashboard-button-inventory`
  - `npm run audit:tap-stability`
  - `npm run audit:dashboard-passport-hitboxes`
  - `npm run build` (295 modules)
- The frozen Market Wisdom section, profile-image API/data contract,
  permissions, authentication and backend were not changed.

## Account lifecycle capability audit - 2026-10-27

- Completed a read-only frontend/backend audit; no user, membership,
  community, shop, authentication, schema, permission or deletion behavior was
  changed.
- GSN cannot currently suspend, close or delete a platform user account. The
  `User` model has no lifecycle state and `get_current_user` performs no
  lifecycle check.
- Existing operations are subject-specific: platform-admin Community and
  Community Domain lifecycle, ordinary Community soft membership removal, and
  Community Domain membership deactivate/reactivate. None is a global account
  ban.
- Ordinary Community removal preserves the row with `left_at` but records no
  reason, Trust Event or notice. Join approval can reactivate through
  `ensure_membership`; direct admin re-add does not use that helper and risks
  the unique `(clan_id, user_id)` constraint.
- Community Domain member deactivation preserves history, protects owner/final
  admin, logs a zero-delta Trust Event and blocks public active-member proof,
  but stores only whether a note existed—not its text—and creates no notice or
  appeal.
- Shop has no normal pause/close/reactivate lifecycle contract. Pilot cleanup
  can deactivate shop/product records but must not be reused as account
  closure.
- Authenticated Support Desk exists, but it cannot be the only appeal route
  once suspended sessions are rejected.
- Smallest safe proposed implementation: platform-admin user
  suspension/reactivation only, with database lifecycle fields, preview and
  confirmation, authentication/token-issuer enforcement, evidence
  preservation, explicit public-surface rules, notice, and a pre-auth
  appeal/recovery path. Do not implement closure or deletion until retention,
  ownership, public identity and evidence rules are approved.
- Full audit:
  `GSN_ACCOUNT_LIFECYCLE_CAPABILITY_AUDIT_2026-10-27.md`.

## Respectful inactivity reminder design - 2026-10-27

- Completed a design/evidence audit only; no reminder generation, scheduler,
  notification, Web Push, setting, schema or screen behavior changed.
- GSN has no platform-wide user activity timestamp, so it must not tell a
  person that they are inactive. A reminder must name one owned surface, one
  dated/countable observation, why it may matter and one first action.
- Existing Action Inbox, Attention Spine, Web Push, Shop Analytics, follower,
  product/Trust Event and Marketplace Attention records can be reused. No new
  reminder dashboard or engagement score is proposed.
- Companion quiet hours, daily limits and repeat windows are currently stored
  and enforced in the browser. Backend UserSettings and Web Push cannot use
  them for scheduled delivery. Notification rows also lack semantic dedupe,
  snooze, category opt-out and delivery-state fields.
- Shop Control already turns analytics into contextual guidance. Creating a
  second in-app shop nudge would duplicate that work; the real missing
  capability is governed, durable delivery away from that screen.
- Recommended first pilot: enrolled active shop owners with public products,
  verifiable stale seller action and a truthful follower/recent-attention
  reason. Candidate parameters are 14 days without a public seller action, no
  more than one Shop Growth reminder per seven days and one same-reason
  reminder per 14 days, starting with a send-nothing dry run.
- Block general inactivity, Shop Analytics non-visit, buyer-browsing and
  Demand Box relevance reminders until the required evidence exists.
- Web Push remains out of scope until server-owned category consent, timezone,
  quiet hours, caps, digest, dedupe, snooze and opt-out are enforced.
- Full design:
  `GSN_RESPECTFUL_INACTIVITY_REMINDER_DESIGN_2026-10-27.md`.

## Spotlight timing/fairness pre-measurement audit - 2026-10-27

- Completed a source/test audit only. No rotation, dwell, selection,
  qualification, pacing, exposure, eligibility, quota, UI or frozen policy
  behavior changed.
- Corrected an important assumption: the count-aware formula can compress 30
  queued items to four seconds and 40 to three seconds, but canonical v2
  normally sends bounded windows of up to four and refills near the end. The
  timer uses current handset queue length, not total server inventory. A total
  inventory of 30-40 therefore does not by itself prove live compression.
- If the planned recording proves two-to-four-second appearances, investigate
  unexpected queue growth, stale deployed/PWA code, deadline churn,
  refresh/state churn and media readiness before changing constants.
- Existing exposure evidence records accepted one-second qualification, not
  full visible dwell, media playback completion, transitions or tokenless
  visibility/replay appearances. It cannot independently prove readability or
  equal appearance frequency.
- Current videos are prepared to at most ten seconds but normally receive the
  same five-second card dwell as images. Even correctly delivered five-second
  timing can therefore be too short for the message.
- Fairness must be measured only among campaigns eligible for the exact viewer,
  route and interval. Equal raw database counts would ignore self-exclusion,
  route eligibility, expiry, relevance, frequency, pacing and entitlement.
- Baseline `audit:spotlight-presentation-contract` and all 19 focused backend
  presentation tests passed.
- No recording file was attached or found. Next action is to timestamp the
  planned 12-minute physical-phone recording and correlate it with the exact
  build, API windows, campaigns, leases, exposures and pacing state.
- Full measurement template and change gate:
  `GSN_SPOTLIGHT_TIMING_FAIRNESS_PREMEASUREMENT_AUDIT_2026-10-27.md`.

## Shop-first authenticated entry and primary navigation - 2026-10-27

- Implemented the owner's decision that Shop is the authenticated starting
  surface. A normal sign-in with no explicit continuation now opens
  `/app/shop-control`, and bare `/app` resolves to the same owner Shop
  surface.
- Reordered the ordinary phone primary navigation to `Shop -> Community Home
  -> Marketplace -> Dashboard -> Profile`. The Shop tab now opens Shop
  Control and remains visibly active on that route. The five-anchor rail stays
  visible on Shop Control even though its internal work continues to use the
  focused-task model.
- Public Shop remains a separate customer-facing storefront. It was not used as
  the authenticated default because a new member may not yet have a configured
  public shop; Shop Control can truthfully guide both setup and ongoing owner
  work.
- Preserved higher-priority continuation behavior: invite-aware sign-in,
  explicit safe `next` targets, route-state returns, publish recovery,
  session-expiry recovery, and remembered authenticated paths still return to
  their intended task instead of being overwritten by the Shop default.
- Added one shared `DEFAULT_AUTHENTICATED_ROUTE` contract and updated the
  entry, route, surface-ownership, button-inventory, and production-browser
  regression cages. No backend route, payload, permission, schema, Dashboard
  Market Wisdom behavior, Shop Control business action, or Public Shop
  contract changed.
- Verification passed: the 295-module production frontend build; link,
  route-fallthrough, entry/auth, surface-ownership, Dashboard, Marketplace,
  Notifications, and Shop Control audits; the complete protected-button/frozen
  surface suite; and the production-build 390x844 browser audit. The browser
  proved that `/app` opens `/app/shop-control`, Shop is the only active tab,
  all five labels and route targets are in the approved order, and there is no
  horizontal overflow.
- This milestone is local only. It has not been committed, pushed, promoted to
  `main`, or deployed because the current pilot batch policy requires the
  owner's separate publication instruction.

## Community Confirmation Inbox first-surface cleanup - 2026-10-26

- Simplified the authenticated `/app/community-confirmations` first surface
  without changing the responder inbox, response submission, self-service
  relay settings, reviewer assignment/evidence/resolution, SLA scan, policy,
  permissions, payloads, or backend routes.
- Removed the exposed explanation panel and duplicate four-count operations
  framing. Added one `What needs your answer?` summary with Pending,
  Instant, and Relay counts plus one state-aware first action:
  `Review first request`, `Answer this request` for a focused
  notification, or `Refresh inbox` when nothing is waiting.
- Refresh/copy controls, reviewer operations, and relay preferences now start
  inside separate closed disclosures. An ordinary review-case count no longer
  opens reviewer work automatically; an explicit `case_id` notification
  still opens and reveals its protected case. `request_id` focus still shows
  only the requested response card.
- Preserved the complete nine-choice response inventory across positive,
  caution, and objection categories, the private-note boundary, TrustSlip
  route, purpose/evidence guidance, notification handoffs, and backend
  permission enforcement. The first action only reveals existing work and
  performs no response, approval, certification, or review mutation.
- Added the previously missing screen specification, focused source guards,
  and a repeatable populated/empty/request-focus/review-focus 390x844 browser
  smoke. No matching reference mockup exists; the owner-approved compact
  first-surface plan and established institutional tokens are the source of
  truth.
- Verification passed: the 295-module production build, confirmation outcome
  boundary, phone-surface simplicity, Trust actions, button/tap stability,
  global action-ID/raw-action, mobile route coverage, focused 390x844 browser
  smoke, complete protected button/frozen-surface suite, and full mocked
  authenticated mobile visual sweep.
- Remaining truth: this milestone reduces the page entrance and secondary
  operations clutter, but each deliberately opened request is still a detailed
  evidence card with all nine choices, and multiple pending requests still
  render sequentially. A later request-card simplification would need a
  separately approved interaction contract so caution and objection choices
  are not made harder to find.
- This milestone is local only. Do not push, promote to `main`, or deploy
  it until the owner explicitly says `deploy`.

## Command Centre cleanup deployment evidence - 2026-10-26

- Promoted the six verified frontend milestones from Community Ownership
  through System Operations to `main` at application commit `40b6ed53`.
- GitHub Actions run `40416799573` completed successfully for exact head SHA
  `40b6ed536739d032cc0b7dcc84585783dcfe4970`.
- Render frontend deploy `dep-dbftnkbcrg8s73av4f3g` reached `live`; the
  workflow then verified the public frontend marker. An independent no-cache
  request confirmed the live site serves the System Operations `v3` compact
  bundle marker from `assets/SystemOperationsPage-w7YKVA9n.js`.
- Backend deployment was explicitly disabled and the workflow confirmed
  `Backend deploy needed: false`.
- This deployment record supersedes the `local only` notes inside the six
  individual milestone sections below. The 107 unrelated pre-existing
  worktree entries were not staged, committed, pushed, or deployed.

## Command Centre System Operations first-surface cleanup - 2026-10-26

- Simplified the platform-admin-only
  `/app/command-center/system-operations` first surface without changing its
  queue endpoints, request limits, priority order, signal ordering, identity
  photo decisions, correction reason, evidence access, or audit messages.
- Removed three repeated explanation panels, the operator-name/role biography,
  and the extra page-level `/auth/me` request. Replaced them with one
  `What needs attention?` summary: Community, Entry needing help, Immediate
  queue, and Identity cases.
- Added one state-aware first action. Entry support opens locally; unmatched
  bank, pending pool, and expected-payment pressure go to Bank Console;
  near-auto-cancel support goes to Incomplete Support; high identity pressure
  goes to Identity Risk; unhealthy diagnostics go to Command Centre readiness;
  and calm states reveal signals or queue totals.
- Overview, entry support, live signals, operational queues, and next pages
  remain closed. The disclosure-storage key moved to `v3` so returning pilot
  users do not inherit the superseded exposed layout. Sensitive identity-photo
  controls remain inside the deliberately opened entry-support monitor.
- Added the missing screen registry/spec entry, source guards, and a focused
  entry-pressure/calm-state 390x844 browser smoke. No matching reference
  mockup exists; the approved compact Command Centre pattern remains the visual
  source of truth.
- Verification passed: the 295-module production build, Admin/Operations,
  Trust, phone-surface, button-stability, admin-route, institutional-proof,
  visible-language, global action-ID/raw-action and tap-stability audits,
  mobile route coverage, the focused 390x844 browser smoke, the complete
  protected button/frozen-surface suite, and the full mocked 390x844 mobile
  visual sweep.
- Confirmed limitation: these local mocked checks prove UI behavior and
  contract preservation, not that every production queue endpoint is healthy.
  Existing per-endpoint failure fallbacks remain unchanged.
- This continuation is local only. Do not push, promote to `main`, or deploy
  it until the owner explicitly says `deploy`.

## Command Centre Trust Graph safety and first-surface cleanup - 2026-10-26

- Simplified the platform-admin-only `/app/command-center/trust-graph`
  first surface and removed an unsafe frontend integration attempt without
  changing backend graph logic, schemas, permissions, or Trust Event records.
- Confirmed contract defect: active backend
  `GET /admin/trust-graph/{user_id}` builds one named user's relationship
  graph. The page was passing the selected community ID through candidate API
  signatures as though it were `user_id`, which could retrieve an unrelated
  person's graph when numeric IDs overlapped. The frontend normalizer also
  expected a different community-shaped edge/signal payload.
- The page no longer calls the user-specific graph endpoint from community
  context. Until a separately approved community graph endpoint and payload
  contract exist, it honestly shows `Graph feed: Not connected` and uses only
  the existing bounded selected-community Trust Events fallback.
- Replaced two explanation blocks, the operator-name/role greeting, and a
  duplicate five-tile overview with one
  `What does the relationship record show?` summary: Community, Graph feed,
  Evidence signals, and Watch or flagged.
- Added one state-aware read-only action. `Review evidence signals` opens the
  fallback signal list when events exist; `Read structure limits` opens the
  honest missing-data explanation when the fallback is empty. It performs no
  write, approval, recomputation, reconciliation, or Trust Event mutation.
- Structure limits, evidence signals, and next-page destinations start closed.
  The visible boundary says relationship evidence is not proof of wrongdoing,
  a complete network map, a final identity decision, or authority to release
  money, goods, or credit. Zero graph rows are not presented as proof that no
  relationships exist.
- Added the missing screen registry/spec entry, source guards that forbid the
  community-ID-as-user-ID call, and a populated/empty 390x844 browser smoke
  that records any attempted `/admin/trust-graph/8` request and requires the
  count to remain zero. No matching reference mockup exists.
- Verification passed: the 295-module production build, Admin/Operations,
  Trust, phone-surface, button-stability, admin-route, institutional-proof,
  visible-language, global action-ID/raw-action and tap-stability audits,
  mobile route coverage, the focused fallback/empty 390x844 browser smoke, the
  complete protected button/frozen-surface suite, and the full mocked 390x844
  mobile visual sweep.
- This continuation is local only. Do not push, promote to `main`, or deploy
  it until the owner explicitly says `deploy`.

## Command Centre Trust Analytics first-surface cleanup - 2026-10-26

- Simplified the platform-admin-only
  `/app/command-center/trust-analytics` first surface without changing the
  Trust Events endpoint, selected-community scope, 120-record request limit,
  event classification, date ordering, trend comparison, bounded lists, or
  deeper-page destinations.
- Replaced two explanation blocks, the operator-name/role greeting, and a
  duplicate six-tile overview with one `What does the record show?` summary:
  Community, Recorded events, Built or protected, and Weakened or repair.
- Added one state-aware read-only action. `Review recent timeline` opens the
  existing bounded timeline when records exist; `Read the guide` opens the
  reading guidance when no event is visible. The action performs no write,
  approval, recomputation, reconciliation, or Trust Event mutation.
- Signal mix, recent timeline, and reading guidance now start closed. System
  Operations, Exposure, Trust Graph, and Command Centre remain available
  inside the reading guide instead of competing on the first phone surface.
- Added an explicit boundary that the classifications are a reading of
  recorded signals, not proof of wrongdoing, a final identity decision, or
  authority to release money, goods, or credit.
- Added the missing screen registry/spec entry plus focused source guards and
  a populated/empty 390x844 browser smoke. No matching reference mockup exists;
  the approved design tokens and established compact Command Centre pattern
  remain the visual source of truth.
- Verification passed: the 295-module production build, Admin/Operations,
  Trust, phone-surface, button-stability, admin-route, institutional-proof,
  visible-language, global action-ID/raw-action and tap-stability audits,
  mobile route coverage, the focused populated/empty 390x844 browser smoke,
  the complete protected button/frozen-surface suite, and the full mocked
  390x844 mobile visual sweep.
- This continuation is local only. Do not push, promote to `main`, or deploy
  it until the owner explicitly says `deploy`.

## Command Centre Exposure Review first-surface cleanup - 2026-10-26

- Simplified `/app/command-center/exposure` without changing the exposure
  formula, pressure thresholds, combined-queue ordering/limit, API payloads,
  owning-page destinations, or any intervention behavior.
- Replaced two explanation blocks, the operator-name/role greeting, and a
  duplicate six-tile overview with one live `What needs attention?` summary:
  Community, At-risk members, Action queue, and Total exposure.
- Added one state-aware first action. `Review action queue` opens and scrolls
  to the existing bounded queue when records need attention;
  `Review pressure details` opens the existing pressure disclosure when the
  queue is calm. The action performs no write or operational intervention.
- Pressure analysis, the combined queue, and next-page destinations remain
  closed until deliberately opened. The visible authority boundary now states
  that exposure is a risk reading, not settlement, release authority,
  wrongdoing evidence, or proof that money moved.
- Confirmed authority mismatch: the shared frontend Command Centre parent
  admits `adminOrClanAdmin`, but the active backend `/exposure/admin`
  implementation is platform-admin-only. This UX cleanup does not silently
  change that critical contract; rejected callers receive an honest
  unavailable state instead of invented exposure totals. Product direction is
  still required before aligning the route guard or backend authority.
- Added the missing screen registry/spec entry plus focused source and browser
  guards covering both high-pressure queue reveal and calm-state pressure
  fallback at 390x844.
- Verification passed: the 295-module production build, Admin/Operations,
  Trust, phone-surface, button-stability, admin-route, institutional-proof,
  visible-language, global action-ID/raw-action and tap-stability audits, mobile
  route coverage, the focused high-pressure/calm-state 390x844 browser smoke,
  the complete protected button/frozen-surface suite, and the full mocked
  390x844 mobile visual sweep.
- This continuation is local only. Do not push, promote to `main`, or deploy it
  until the owner explicitly says `deploy`.

## Command Centre Revenue Allocation first-surface cleanup - 2026-10-26

- Simplified the admin/community-admin
  `/app/command-center/revenue-allocation` first surface without changing its
  endpoint, route gate, community-membership check, returned-field
  normalisation, copy-paper boundary, or financial calculations.
- Replaced two explanation blocks, duplicate Load/Copy rows, four
  identity/context tiles, and a generic Meaning section with one live
  `What needs review?` summary and one support-ID lookup action.
- The summary now shows only Community, Support ID, State, and the read-only
  boundary. A successful lookup opens the returned allocation split; detailed
  fields and next-page destinations remain closed until deliberately opened.
- Added the previously missing screen registry/spec entry and focused source
  and phone-browser protection for the one-action flow.
- Verification passed: the 295-module production build, Loans and Finance
  action contracts, phone-surface simplicity, button stability, admin route
  guards, Trust actions, institutional proof surfaces, visible GSN language,
  global action IDs and raw-action checks, mobile tap stability, mobile route
  coverage, the focused 390x844 guided-phone smoke, the complete protected
  button/frozen-surface suite, and the full mocked 390x844 mobile visual sweep.
- This continuation is local only. Do not push, promote to `main`, or deploy it
  until the owner explicitly says `deploy`.

## Command Centre Community Ownership guided cleanup - 2026-10-26

- Simplified the platform-admin-only `/app/command-center/community-ownership`
  first surface without changing lookup, preview, execution, evidence
  confirmation, reviewer-note, permission, API, lifecycle, cleanup, steward,
  ownership-transfer or audit-history behavior.
- Replaced the six simultaneously exposed sensitive workflows with one compact
  live case summary and four stable lanes: `Owner repair`, `Steward setup`,
  `Pilot cleanup`, and `Lifecycle close`.
- Owner repair and lifecycle review now separate ordinary `Community` records
  from protected `Community Domain` records before revealing the matching
  workflow. Only one work area is visible at a time; switching lanes preserves
  unfinished local inputs and never submits or mutates them.
- Removed the real pilot organisation, member ID and email defaults from the
  general page. Ordinary visits now require deliberate record entry; existing
  query-parameter handoffs can still open a named support case safely.
- Added focused source guards and a repeatable 390x844 browser smoke covering
  all four lanes, both record scopes, one-visible-task behavior and horizontal
  overflow. Verification passed: the 295-module production build, admin route
  guards, Admin/Operations actions, phone-surface simplicity, button stability,
  global action identities and raw-action checks, mobile tap stability, visible
  GSN language, Trust actions, mobile route coverage, the complete protected
  button/frozen-surface suite, the focused guided-phone smoke, and the full
  mocked 390x844 mobile visual sweep.
- This continuation is local only. Do not push, promote to `main`, or deploy it
  until the owner explicitly says `deploy`.

## Command Centre Identity Risk first-surface cleanup - 2026-10-26

- Simplified the platform-admin-only `/app/command-center/identity-risk`
  first surface without changing identity-risk loading, phone-lineage lookup,
  manual recovery reset, duplicate reconciliation, permissions, payloads,
  query handoff or evidence records.
- Replaced the repeated explanation and large exposed reading guide with one
  `What needs review?` summary showing intervention accounts, monitor
  accounts and total signals. It now states directly that an identity signal
  is a review prompt, not proof of fraud, wrongdoing or duplicate identity.
- Moved the reading guide, phone recovery workflow and duplicate-identity
  reconciliation into stable disclosures. Ordinary visits keep these tools
  closed; a sign-in recovery handoff carrying a phone or GSN ID opens Phone
  recovery review and preserves the prefilled context.
- The identity signal queue remains visible as the page's core evidence area.
  Owner-proof confirmation, reviewer note, stale-phone confirmation,
  activation checks, one-time temporary-password handling, preview-first
  reconciliation and owner-confirmed execution are unchanged.
- Registered and specified the existing screen, and extended Admin/Operations,
  entry/auth, phone-simplicity and button-stability protection around the
  compact layout and recovery handoff.
- Verification passed: Admin/Operations actions, admin route guards,
  entry/auth, Trust actions, institutional evidence surfaces, GSN visible
  language, phone-surface simplicity, button stability, global action IDs and
  raw actions, mobile tap stability, route coverage, the protected Identity
  Risk mobile visual audit, the complete protected-button freeze, the
  295-module production frontend build, and the full mocked 390x844 mobile
  visual sweep.
- Deployment remains intentionally deferred under the owner's milestone rule;
  do not push or deploy this cleanup without explicit approval.

## Command Centre Incomplete Support first-surface cleanup - 2026-10-26

- Simplified the admin-only `/app/command-center/incomplete-loans` first
  surface without changing `GET /admin/loans/incomplete`, admin permission
  checks, selected-community scope, support fields, snapshots, routes or
  business behavior.
- Replaced the repeated explanation, four badges, three large guidance tiles
  and four exposed queue actions with one `What needs attention?` summary.
  It shows incomplete, ending-soon and missing-decision counts, followed by
  one compact coverage-gap and locked-support block.
- Added a direct boundary that locked support coverage is a recorded support
  position, not proof of cash receipt or payment. The queue does not approve
  the whole support request or authorize release.
- Copy queue, Operations, Bank Console and Command Centre remain available
  inside one stable `Queue tools` disclosure. Each support row now presents
  decisions, coverage gap and time remaining as three compact facts while
  preserving amount, requester reference, status, Copy support and Support
  Summary.
- Registered and specified the existing screen, and extended the Admin/
  Operations, Trust, phone-simplicity and button-stability audits to protect
  the compact structure and authority boundary.
- Verification passed: Admin/Operations actions, admin route guards, Trust
  actions, institutional evidence surfaces, GSN visible language,
  phone-surface simplicity, button stability, global action IDs and raw
  actions, mobile tap stability, mobile route coverage, the complete
  protected-button freeze, the 295-module production frontend build, and the
  full mocked 390x844 mobile visual sweep.
- Deployment remains intentionally deferred under the owner's milestone rule;
  do not push or deploy this cleanup without explicit approval.

## Command Centre Trust Events first-surface cleanup - 2026-10-26

- Simplified the admin-only `/app/command-center/trust-events` first surface
  without changing event loading, append-only evidence, routes, permissions,
  snapshot copying or per-event source details.
- Replaced the repeated explanation, five exposed counters, two guidance cards
  and four exposed cross-navigation actions with one `What needs review?`
  summary. It shows total, last-24-hours and negative-delta counts, and states
  that a negative delta is a review signal rather than proof of wrongdoing.
- Analytics, Trust Graph, Identity Risk and Command Centre destinations remain
  available inside one stable `Open deeper analysis` disclosure. Event source
  details remain closed per event until the admin opens them.
- Registered and specified the existing admin route, and added focused audit
  protection against restoring the repeated preamble.
- Verification passed: Admin/Operations actions, admin route guards, Trust
  actions, institutional evidence surfaces, visible GSN language, phone-surface
  simplicity, button stability, global action IDs and raw actions, mobile tap
  stability, the complete protected-button freeze, the 295-module production
  frontend build, and the full mocked 390x844 mobile visual sweep.
- Deployment remains intentionally deferred under the owner's milestone rule;
  do not push or deploy this cleanup without explicit approval.

## Command Centre GSN campaign first-surface cleanup - 2026-10-26

- Simplified the platform-admin-only `/app/command-center/gsn-campaigns`
  first phone surface without changing publishing, preview, schedule, expiry,
  destination, stop, permission, API or payment behaviour.
- Replaced six exposed draft tiles with one compact draft summary. A live
  campaign now keeps its state and expiry visible while its message, delivery
  figures, destination controls and guarded emergency stop sit behind the
  clearly named `Open delivery report and campaign controls` disclosure.
  Refresh status remains immediately available.
- The screen specification and focused campaign audit now protect the compact
  disclosure boundary. Deployment remains intentionally deferred under the
  owner's milestone rule; do not push or deploy this cleanup without explicit
  approval.
- The complete protected-button check exposed an earlier Bank Console smooth
  auto-scroll that could move a tapped control under a phone user's finger.
  It now reveals the requested section with immediate scrolling; the target
  and action are unchanged.
- Verification passed: Admin GSN campaign and admin-route contracts, action-ID
  and raw-action checks, button stability, phone-surface simplicity, mobile
  route coverage, mobile tap stability, the complete protected-button freeze,
  the full 390x844 mocked mobile visual sweep, and the 295-module production
  frontend build.

## Render OOM cleanup deployed and under observation - 2026-10-26

- Render confirmed five `gmfn-api` 512 MiB OOM kills today, not one harmless
  warning. The service also had two confirmed OOM kills on 19 October. The
  current post-`16:15Z` instance was available and near 324 MiB at the end of
  the checked window, which is stable but still leaves limited burst headroom.
- Production logs tied the high-pressure windows to Shop Control's minute-wide
  request fan-out, 8?33 second full TrustSlip reads, duplicate pending-member
  bcrypt checks, and hundreds of `passlib 1.7.4` / `bcrypt 5.0.0` compatibility
  tracebacks. These are proven amplifiers; the exact fatal allocation remains
  unproven because Render sampling missed some short spikes.
- Cleanup uses bcrypt directly, caches pending-account checks by password
  hash, evaluates each TrustSlip community member once, adds the lightweight
  `GET /trust-slips/me/feature-summary` route for owner control surfaces, and
  reduces Shop Control's complete background refresh from one to five minutes.
  Initial load, focus return, explicit action refresh, permissions, TrustSlip
  evidence rules and payment behavior are unchanged.
- Verification passed: 49 entry/auth and focused TrustSlip tests, six focused
  activation/TrustSlip regressions, Python compilation, the 295-module frontend
  production build, and scoped diff checks.
- Full evidence and the controlled rollout threshold are recorded in
  [`GSN_API_MEMORY_FOLLOWUP_2026-10-26.md`](GSN_API_MEMORY_FOLLOWUP_2026-10-26.md).
- Owner approval was received and exact commit `80a91c1a` was promoted to
  `main`. GitHub Backend Tests run `40376565709` passed before release. Render
  frontend deploy `dep-dbfplr799u4c73enjud0` became live at `18:26:22Z`, and
  API deploy `dep-dbfpms4s728c73cgti60` became live at `18:29:06Z`. Coordinated
  deploy run `40377456001`, its live API identity audit, public frontend HTTP
  check, and API `/health` check all passed. No plan or instance-count change
  was made. Continue observing memory and OOM events under normal pilot load;
  the first startup sample is not enough to prove the long-term leak is gone.

## Admin campaign disclosure stability and language-audit alignment - 2026-10-26

- Corrected a real shared-action gap on the platform-admin-only
  `/app/command-center/gsn-campaigns` screen. Emergency stop, other active
  promotions, campaign history, individual history rows, review media and the
  governance boundary now use `StableDisclosureSummary` with unique action
  identities and fixed 44px minimum geometry instead of raw `<summary>`
  controls. Campaign data, permissions, publication, payment, stop and
  destination behavior did not change.
- Corrected two stale visible-language audit expectations left behind when the
  Trust Timeline PDF was moved into its current institutional layout. The audit
  now protects the visible `GSN Trust Timeline` identity and the plain
  `Community consistency signal` label instead of requiring the removed jargon
  `GSN trust infrastructure` and `Cross-Community Integrity` in the old service
  file. PDF generation and output did not change in this follow-up.
- Verification passed: aggregate action-surface and GSN visible-language
  audits, Admin GSN campaign contract, global action-ID audit, complete
  protected-button freeze, the 295-module production frontend build and scoped
  diff checks. Surface ownership and phone-simplicity audits also passed before
  the correction.
- Deployment is intentionally deferred under the owner's milestone release
  rule. This local cleanup must not be pushed to `main` or sent to Render until
  the owner explicitly approves the collected milestone.

## Aggregate link-contract audit alignment - 2026-10-26

- Repaired the three remaining broad link-contract failures after tracing them
  to stale source-pattern expectations rather than broken screens. No runtime
  page, route, user-visible wording, authentication behavior, Marketplace
  payment behavior or frozen Market Wisdom surface changed in this follow-up.
- Community Home is checked through the compact `Manage shop` action and its
  actual Shop Control navigation rather than an obsolete helper sentence.
  Login is checked through its current publish-recovery variable while still
  requiring `/app`-only query return targets and stored-target consumption
  after sign-in. Marketplace promotion is checked through the stable public
  item, target-community and placement control identities instead of the old
  `Paid Repost` and `Target community ID` labels.
- Verification passed: the aggregate link-contract audit, focused entry/auth,
  Community Home and Marketplace action audits, the complete protected-button
  freeze, the 295-module production frontend build and scoped diff checks.
- Deployment is intentionally deferred under the owner's milestone release
  rule. This local cleanup must not be pushed to `main` or sent to Render until
  the owner explicitly approves the collected milestone.

## Aggregate button-stability audit alignment - 2026-10-26

- Repaired the remaining broad button-stability failures after confirming that
  Finance and Public Shop already use the shared stable controls required by
  their focused inventories. No runtime screen, geometry, action, route,
  contact behavior or frozen Market Wisdom surface changed in this follow-up.
- Finance mini-tools are now checked through their stable `debugKey` identities
  rather than visible labels, so ordinary copy changes do not alter action/test
  identity. Public Shop Spotlight contact is checked through the current
  `contact-advertiser` identity because the same control truthfully supports
  WhatsApp when available and a phone-call fallback otherwise.
- Verification passed: the aggregate button-stability audit, Public Shop and
  Finance button inventories, Finance action audit, complete protected-button
  freeze, 295-module production frontend build and scoped diff checks.

## Aggregate Trust audit semantic alignment - 2026-10-26

- Repaired the broad Trust action audit after the repayment and TrustSlip
  cleanup exposed five stale source expectations and one over-broad doctrine
  check. The affected product screens already followed their approved specs;
  no route, page structure, user-visible copy, permission, finance behavior or
  frozen Market Wisdom surface changed in this follow-up.
- Companion polling is now checked with its fresh-notification option;
  DemandBox accepts the approved fulfilled/resolved non-finance closure words;
  Repayment is checked through its plain payment-report, open-support and
  supporter-responsibility boundaries; and Finance is checked for the explicit
  `Finance confirmed` count without requiring an obsolete panel heading.
- Doctrine files may continue to use `proof` inside limitation statements such
  as `not proof of payment`. The audit still rejects certification-like positive
  claims such as `proves active`, `proof state`, `provider-verified proof` and
  `confirmed proof`.
- Verification passed: aggregate Trust actions, focused DemandBox, Loans and
  Finance audits, the complete protected-button freeze, the 295-module
  production frontend build and scoped diff checks.

## Finance payment-status contract cleanup - 2026-10-26

- Corrected Finance to use the status contract already returned by
  `GET /payment-instructions/my/expected`: plain payment label, bank/provider
  guidance, paid amount, remaining amount and `bank_event_id`.
- Removed stale client assumptions about nonexistent `confirmed_at` and
  `matched_bank_event_id` response fields. Part payments now stay in the
  completion workload, show `Part payment confirmed`, and show the amount
  received and amount still left instead of raw values such as
  `partial_payment_applied`.
- Updated the compact Finance status copy from `not received yet` to `needs
  completion`, because a part payment has been received but the expected total
  is not complete. Payment creation, reconciliation, balances, permissions and
  route contracts are unchanged.
- Verification passed: the focused Finance action audit, production frontend
  build and scoped diff check.

## Loan Summary and Repayment payment-record continuity - 2026-10-26

- Corrected `/app/loan-summary/:loanId` so ordinary members load repayment
  expectations through `GET /payment-instructions/my/expected`, while platform
  and community admins retain the broader `GET /bank/expected` view permitted
  by the backend. Previously, the screen always used the admin-only endpoint
  and silently showed no payment record after a normal member received `403`.
- Replaced stale `matched_bank_event_id` and `confirmed_at` assumptions with
  the actual `bank_event_id`, created date, safe payment label, paid/remaining
  amounts and bank/provider guidance returned by the backend. Raw status and
  internal reason text are no longer presented as member guidance.
- The same authorization drift was present on `/app/payment/loans/:loanId`.
  Corrected it so an ordinary borrower keeps the expected-payment status and
  proof panel after reporting a payment; administrators retain their permitted
  broader view. A newly reported payment still reads `Sent for checking` while
  the expanded record preserves the server's underlying reconciliation state.
- Repayment creation, reconciliation, balances, permissions, route contracts
  and the approved phone structure are unchanged.
- Verification passed: focused Loan actions and simple-phone source audits,
  the production frontend build, scoped diff check, and the mocked browser
  smoke at 390x844 and 360x780 with one visible state, one primary action, one
  active task and no horizontal overflow.

## Trust Passport repayment/reversal language continuity - 2026-10-26

- Corrected `/app/trust` Evidence Story so recent trust events no longer expose
  raw backend names such as `repayment.reversed` or
  `loan_fully_repaid_reversed`.
- Added shared frontend trust-event language for confirmed/reported payments,
  full repayment, repayment and supporter reversals, missed/late/overdue
  payments, defaults and identity evidence. Code-like reason/note values are
  translated before display; already-written sentences are preserved.
- Reused the shared translator in the older trust history surface so trust
  event wording does not remain trapped in one page. Scoring, event inclusion,
  lifecycle state, permissions and evidence calculations are unchanged.
- Verification passed: focused Trust Passport Evidence Story audit,
  institutional proof-surface audit, production frontend build and scoped diff
  check. The broad `audit:trust-actions` baseline remains red for unrelated
  Companion, DemandBox and doctrine checks plus stale Finance/Repayment wording
  assertions; those failures were not weakened or hidden in this package.

## TrustSlip repayment-caution continuity - 2026-10-26

- Confirmed that TrustSlip's `last_full_repayment_at` comes from the
  lifecycle-aware trust-score computation, so a reversed repayment is removed
  before the holder summary is built. No duplicate frontend lifecycle rule was
  added.
- Corrected `/app/trust-slip` to translate raw CCI risk flags into plain
  cautions. A historical full repayment no longer makes Finance Discipline or
  Follow-through read `Strong` when the current summary also carries a
  repayment-delay, missing-confirmation or default caution.
- Trust scoring, TrustSlip issuance, verification codes, visibility,
  permissions and public/private evidence boundaries are unchanged.
- Verification passed: Trust Passport/TrustSlip boundary audit, TrustSlip
  evidence-pattern audit, institutional proof-surface audit, production
  frontend build and scoped diff check.
- Final combined package verification passed: 62 backend repayment,
  reconciliation, lifecycle and institutional-PDF tests, plus the focused
  Finance, Loans and Trust Timeline evidence audits.

## Repayment-reversal evidence continuity - 2026-10-26

- The append-only admin reversal route already preserved the original payment
  record, marked its lifecycle as reversed, changed the support record to
  disputed and removed the original full-repayment evidence from clean trust
  scoring.
- Closed the user-facing evidence gap: the live Trust Timeline now keeps the
  zero-delta reversal rows instead of hiding them, and the Trust Timeline PDF
  plus Member Evidence Pack translate repayment, full-repayment and supporter
  outcome reversals into plain language.
- The Member Evidence Pack now includes reversal records alongside the older
  historical repayment entry, so it no longer presents only the earlier full
  repayment after an append-only correction. Payment references, raw event
  names, internal IDs and metadata remain outside the redacted paper.
- Reversal authority, lifecycle states, score calculation, support-record
  status changes and money movement are unchanged.
- Verification passed: all 13 lifecycle/reversal tests, all 39 institutional
  PDF tests, the institutional proof-surface audit, Python compilation and
  diff checks.

## Overdue and missed-payment Finance continuity - 2026-10-26

- Corrected Finance's attention count to prefer the trust engine's normalized
  `missed_payments` and `defaults` aggregates. The page previously looked
  only for raw singular and legacy event names, so genuine repayment pressure
  could be absent from the Finance status and watch list.
- The normalized counts are lifecycle-aware: reversed, disputed or otherwise
  limited evidence is excluded by the trust engine before Finance reads it.
  Raw overdue/default aliases remain only as a fallback for an older response
  shape, avoiding double-counting when canonical fields are present.
- No penalties, event creation, evidence lifecycle, loan status, money
  movement, route contract or frozen Market Wisdom presentation changed.
- Verification passed: all 26 trust/lifecycle tests, the Finance action audit,
  the production frontend build and diff checks.

## Full-repayment Finance continuity - 2026-10-26

- Confirmed that the repayment service already records canonical
  `loan.repaid` evidence and that the trust engine correctly exposes it as
  `computed.counts.full_repayments`.
- Corrected Finance's repayment-history summary to read that canonical
  aggregate first. It previously checked only raw legacy event names, so a
  genuine completed repayment could be absent from the member's Finance
  summary even though the backend had counted it.
- Raw historical names remain a fallback for older response shapes. The
  canonical aggregate is preferred rather than added to those aliases, which
  prevents the same repayment from being counted twice if both shapes appear.
- This changes only the Finance summary reading. It does not create repayment
  evidence, change trust scoring, move money, alter a route contract, or touch
  the frozen Market Wisdom section.
- Verification passed: all 13 canonical trust-event tests, the Finance action
  audit, the production frontend build and diff checks.

## Partial-payment status truth - 2026-10-26

- Corrected the shared status wording for a bank-reconciled part payment. The
  backend instruction service and both payment API serializers now say `Part
  payment confirmed` instead of the incomplete and misleading `Authorised`.
- The shared frontend payment-status translator now recognizes canonical
  `partial` records, so Repayment and Loan Summary no longer fall back to
  `Payment record available` after part of the balance has been matched.
- The technical `authorised_partial` stage, expected-payment status, paid and
  remaining balances, reconciliation behavior, route contracts, permissions
  and frozen screen structures are unchanged. Existing guidance still tells
  the member to complete the remaining payment or provider authentication.
- Regression coverage checks the live reconciliation result, its unchanged
  stage and remaining-balance guidance, the shared frontend translation, and
  all three backend response contracts.
- Verification passed: all 7 reconciliation integrity tests, the loans-action
  audit, Python compilation, the production frontend build and diff checks.

## Pay-in-parts claim continuity - 2026-10-26

- Corrected the borrower `POST /loans/{loan_id}/repayment-claim` gate. It no
  longer treats the first claim as the only claim permitted for the lifetime
  of a support record. A duplicate click remains idempotent while the latest
  report is waiting for finance, but a later `repayment.created` confirmation
  closes that report and permits the next instalment report.
- Closed and defaulted support records now reject new borrower payment reports,
  aligning the claim route with the existing repayment service. The endpoint,
  payload, borrower authorization, event names, payment reference, finance
  confirmation and bank-reconciliation contracts are unchanged. No money is
  moved by this route.
- The finance claim queue now omits a claim once a later `repayment.created`
  event exists for the same borrower and support record. This prevents an old
  instalment report from continuing to look unconfirmed and being actioned a
  second time; a later unresolved instalment becomes the one visible queue row.
- Regression coverage proves one pending claim at a time, a second equal
  instalment after confirmation, preserved paid and remaining balances, and
  rejection after full repayment. The existing frontend already explains that
  finance must confirm a reported payment, so no frozen page structure or copy
  changed.
- Verification passed: all 3 repayment-completion tests, all 7 reconciliation
  integrity tests, Python compilation and the frontend loans-action audit. The
  unresolved lifecycle limitation remains explicit: there is no finance claim
  rejection event, so a rejected report cannot yet be closed independently of
  a confirmed repayment.

## Pay-in-full evidence continuity - 2026-10-26

- Traced the live pay-in-full chain from the repayment screen and payment
  instruction through member report, finance confirmation and automatic bank
  application. The transaction service already records `repayment.created`,
  marks the support record `repaid`, releases supporter responsibility and
  records canonical `loan.repaid` evidence when the remaining balance reaches
  zero.
- Corrected the Member Evidence Pack allowlist so the current
  `repayment.claimed`, `repayment.created`, `repayment.auto_applied` and
  `loan.repaid` records are no longer silently omitted. The paper translates
  them to plain GSN wording and continues to hide payment references, support
  record IDs, internal member IDs and raw machine event names.
- Added an end-to-end regression from `create_repayment` through the generated
  Member Evidence PDF, plus layout and proof-audit coverage for the complete
  current repayment vocabulary. No payment movement, permissions, route
  contracts or frozen frontend structure changed.
- Verification passed: the repayment-completion regression, all 38
  institutional PDF tests, Python compilation and the institutional
  proof-surface audit. A real service-built pay-in-full fixture produced one
  page with both plain-language repayment entries, no private reference or raw
  event code, and no non-watermark text outside the page. The PNG rendered,
  but direct image viewing was blocked by the Windows split-root sandbox; do
  not treat this run as a manual visual sign-off.

## Member Evidence Pack PDF decision-first package - 2026-10-26

- Completed the final locked institutional-document stage in
  `build_user_evidence_pack_pdf`, presented as the GSN Member Evidence Pack.
  The paper now leads with one plain answer, member reference, trust score,
  evidence band and recent-activity count before a single Decision Boundary,
  compact evidence context, recent evidence table and record security.
- Removed repeated contact-redaction rows, the empty breakdown heading and raw
  event-code presentation. The recognized event types have ordinary-language
  labels; any unrecognised type is shown as `Other recorded
  activity`. Private contacts, internal member IDs, support record numbers and
  event metadata remain outside the redacted paper. The empty state explains
  that no matching activity in the 30-day window is not a claim that the member
  has no older history.
- The member lookup, stored-score/fallback calculation, trust band, 30-day
  window, newest-first order, 50-row limit and service signature are unchanged.
  The allowlist now includes the active repayment lifecycle events. The
  ordinary empty fixture stays on one page; an
  18-entry fixture continues cleanly across two pages under repeat-headed
  institutional tables.
- Unabated route truth: repository search found no production API route or
  application caller for this generator. It is currently used only by the PDF
  smoke utility and institutional tests. This work does not invent an endpoint
  or claim that members can download the paper in production.
- Verification passed: all 38 institutional PDF tests, the institutional
  proof-surface audit, Python compilation/import, one-page extraction/privacy
  checks and two-page continuation/privacy checks. Every rendered page was
  visually inspected with no clipping, overlap, isolated security page or raw
  machine event. Deployment is pending; this backend-affecting package has not
  been committed, pushed or claimed live.

## Support Evidence Pack PDF decision-first package - 2026-10-26

- Continued the locked institutional-document order into authenticated
  `GET /analytics/loans/{loan_id}/evidence-pack.pdf`, presented to users as the
  GSN Support Evidence Pack. The redacted paper now leads with the recorded
  support status, requested amount, support gap and supporter progress, then
  explains what the paper confirms, what it does not confirm and the first
  live record check to make before relying on it.
- Replaced the long key/value dump with compact fact, boundary, trust,
  supporter, repayment, timeline and record-security blocks. An ordinary
  empty support record stays on one page. A populated fixture with six
  supporters, six repayments and ten linked events produces an intentional
  two-page paper with repeat-headed tables and the institutional shell on
  every page.
- Private contacts, internal member IDs and event metadata remain outside the
  redacted share copy. Unknown machine event codes are now shown as `Other
  recorded activity`; metadata is represented only as redacted. The route,
  authorization gates, filename, query limits, support calculations, status,
  trust computation, redaction default and database contracts are unchanged.
- Verification passed: all 37 institutional PDF tests, the institutional
  proof-surface audit, one-page smoke extraction/privacy checks, and populated
  two-page continuation/privacy checks. Every rendered page was visually
  inspected with no clipping, overlap, isolated security page or exposed raw
  machine event. Deployment is pending; this backend-affecting package has not
  been committed, pushed or claimed live.

## Community Evidence Pack PDF decision-first package - 2026-10-26

- Continued the locked institutional-document order into community-admin
  `GET /analytics/clans/{clan_id}/evidence-pack.pdf`. The redacted share paper
  now leads with one plain invite-entry answer, four quick facts and a compact
  Decision Boundary before recent entry rows, recorded activity categories and
  record security. An ordinary one-entry snapshot stays on one page; longer
  entry tables continue under the same institutional shell without orphaning
  the activity or security headings.
- Removed the misleading repeated `private member contact redacted` rows from
  the share copy. Redacted tables now omit contact columns entirely, mask
  invite references and generalize unknown internal event codes to `Other
  recorded activity`. Private contacts, internal member IDs, raw event names
  and event metadata remain out of the share paper. The empty state explains
  that no invite-led entry or activity category is recorded in the snapshot.
- The community-admin authorization gate, route, filename, analytics queries,
  event calculations, complete-record service option and database contracts
  are unchanged. The reference fingerprint is labelled as a lookup aid rather
  than a digital signature, and the financial limitation remains in the shared
  footer.
- Verification passed: all 36 institutional PDF tests, the institutional
  proof-surface audit, Python compilation, one-page deterministic smoke text
  and privacy checks, and a two-page ten-entry continuation check. The normal
  page and both continuation pages were visually inspected with no clipping,
  overlap or orphan heading. Deployment is pending; this backend-affecting
  package has not been committed, pushed or claimed live.

## Trust Timeline PDF decision-first package - 2026-10-26

- Continued the locked production-polish order into authenticated
  `GET /trust/me/timeline.pdf`, its `/trust/me/trust-timeline.pdf` alias and
  the Timeline paper embedded in the portable evidence pack. The document is
  now decision-first: page one gives one plain answer, four quick facts, use
  guidance, the Decision Boundary and compact evidence context; page two and
  any continuation pages present the newest activity first in a repeat-headed
  chronology table.
- Internal event codes are translated into ordinary-language activity names.
  Private contacts, payment references, support IDs, raw metadata and raw user
  IDs remain out of the paper, while record provenance and a non-signature
  reference fingerprint remain visible. A meaningful empty state explains
  that no recent rows does not mean older history is absent. Auth, aliases,
  filenames, response headers, event calculations, schemas and the existing
  evidence-pack contract are unchanged.
- Removed an avoidable route cost: downloading the Timeline PDF no longer
  builds an entire evidence-pack ZIP just to obtain optional metadata. Both
  the route and PDF adapter now fall back to the limited trust breakdown when
  a member has no issuable community TrustSlip, instead of failing the PDF
  request with the TrustSlip `ValueError`.
- Verification passed: all 36 institutional PDF tests, the institutional
  proof-surface audit, the Trust Timeline privacy-boundary audit, Python
  compile/import checks, the authenticated Trust Timeline browser smoke and an
  integrated two-page PDF smoke render. Both rendered pages were visually
  inspected with no clipping or overflow. Deployment is pending; this
  backend-affecting package has not been committed, pushed or claimed live.

## TrustSlip evidence PDF decision-first package - 2026-10-26

- Continued the locked production-polish order into the institutional document
  shell for `GET /trust-slips/me/evidence.pdf` and the TrustSlip copy embedded
  in the portable trust evidence pack. The output is now an intentional
  two-page paper: page one gives one status answer, four quick facts, a live
  check panel and a compact Decision Boundary; page two groups record details,
  trust evidence, support/repayment context and current cautions.
- Corrected two source-of-truth failures. The authenticated route and evidence
  pack now supply the full current TrustSlip payload when one can be formed,
  while retaining the previous safe score-summary fallback for a member
  without an issuable community context. QR generation now uses an explicit TrustSlip verification
  URL or the real quoted `/t/:code` path; when no public code exists, the PDF
  shows an honest verification-unavailable warning instead of linking to the
  nonexistent `/trust-slips/ping` route. Auth, filenames, public routes,
  evidence calculations, database schemas and privacy boundaries are
  unchanged.
- The paper continues to redact internal member, support and reconciliation
  identifiers. A reference fingerprint is labelled as a lookup aid rather than
  a digital signature, and the financial limitation remains visible in the
  shared footer. Both rendered pages were visually inspected after a first
  render exposed and corrected an accidental third-page overflow.
- Verification passed: the full 35-test institutional PDF suite, the
  institutional proof-surface audit, Python import/compile checks and the
  two-page smoke render. Deployment is pending; this backend-affecting package
  has not yet been committed, pushed or claimed live.

## Repayment plain-language package - 2026-10-26

- Continued the locked production-polish order into
  `/app/payment/loans/:loanId`. The approved full-payment-first phone process
  was already in place, so no card, task, action, disclosure, route or payment
  behavior was added. The visible steps now say `Get the payment details`,
  `Send the selected amount`, `I have paid`, `Sent for checking` and `Wait for
  payment confirmation` instead of requiring members to decode instruction,
  declaration, reconciliation or exposure terms.
- The money boundary remains explicit in direct language: GSN records the
  payment details and the member's report, does not hold or mark money received,
  and keeps the support open with supporters still responsible until finance
  confirms the payment. Loan Summary and Repayment now use one shared status
  translator so raw support/payment codes are not exposed. Payment instruction,
  repayment-claim and proof APIs, calculations, permissions, stable action IDs,
  part-payment behavior and the report-only meaning of `I have paid` are
  unchanged.
- Verification passed: the 294-module production build; focused Repayment and
  Loan action audits; mocked browser smoke at 390x844 and 360x780; and the full
  protected-button freeze, including its visual subtests. The broad
  button-stability audit now has no Repayment finding and remains blocked only
  by the unrelated existing Finance and Public Shop expectations.
- Deployment truth: this package and the Loan Summary package below were
  committed together as `2f7dddbe`, pushed to the working branch and promoted
  unchanged to `main`. GitHub Actions run `40331782929` deployed the
  frontend-only commit as Render deploy `dep-dbfldu2jnfac73cqjuug`, which
  reached `live`. The workflow verified the public frontend build marker at
  `https://gmfn-frontend.onrender.com`; backend deploy resolved to `false`.

## Loan Summary plain-language package - 2026-10-26

- Continued the locked production-polish order into
  `/app/loan-summary/:loanId`. The approved phone structure was already in
  place, so no card, action, disclosure, lane or route was added. The first
  card now translates raw backend states into member readings and gives one
  short next step.
- Phone-only deeper labels now name the task directly: support record, more
  support tasks, copy record link, payment record, continue support, check
  readiness, money breakdown/record, make repayment and all support requests.
  Shared/copied support snapshots use the same plain status reading. Individual
  supporter decisions, repayment and audit evidence, backend/API contracts,
  calculations, permissions and the non-lender/non-money-movement boundary are
  unchanged.
- Verification passed: the 293-module production build, focused Loan actions
  and Loan Summary/Repayment audits, mocked browser smoke at 390x844 and
  360x780, and the complete protected-button freeze. The first 360x780 run
  caught a 15px first-card height regression; shortening the repayment step to
  `Continue repayment.` restored the locked height with no overflow. The
  separate aggregate button-stability audit remains blocked by unrelated
  existing Finance and Public Shop expectations outside this package.
- Deployment truth: deployed with the Repayment package in frontend commit
  `2f7dddbe` as recorded above.

## Public TrustSlip Verify plain-language package - 2026-10-26

- Continued the approved simplification into public `/t/:code`,
  `/t/s/:shareToken`, `/verify/trust-slip` and their existing aliases. The
  already-compliant structure is unchanged; the first read now says `Public
  TrustSlip`, `Check this TrustSlip`, `What this record says`, `Why this
  answer`, `What to do next` and `Limits of this check` instead of exposing
  Decision Pack, Decision First, audit and decision-boundary terminology.
- Deeper evidence labels now explain the purpose, evidence, source/date, next
  check and limits directly. An additive shared-disclosure `debugId` override
  preserves the existing `full-evidence-and-record-details` and
  `audit-details` action identities while the visible titles change. Direct
  code opening, code entry, evidence derivation, backend/API contracts,
  routes, permissions and the public/private evidence boundary are unchanged.
- Verification passed: the 293-module production build; focused
  first-viewport, verify-boundary, evidence-order and institutional
  proof-surface audits; the complete public-state browser smoke; the signed-in
  private-evidence boundary smoke; and the full protected-button freeze. The
  separate repository-wide trust-action audit remains blocked by unrelated
  pre-existing CompanionLayer, DemandBox and doctrine-copy changes outside
  this package. Physical-phone review and a live public code remain
  outstanding.
- Deployment truth: this package and the Trust Passport package below were
  committed together as `fecc26b9`, pushed to the working branch and promoted
  unchanged to `main`. GitHub Actions run `40328579296` deployed the
  frontend-only commit as Render deploy `dep-dbfl3h0u01pc73blv8og`, which
  reached `live`. The workflow verified the public frontend build marker;
  `/verify/trust-slip` also returned HTTP 200. Backend deploy resolved to
  `false`.

## Trust Passport plain-language package - 2026-10-26

- Continued the approved app-wide simplification into `/app/trust`. The
  Trust Passport structure was already compliant, so this package does not add
  or remove cards, lanes, disclosures, actions or routes. It translates the
  first read from technical labels to `Your trust evidence`, `Overall
  evidence`, `Main community`, `Communities included` and `Next step`.
- The same plain-language distinction now carries into copied Trust Passport
  snapshots: `Overall trust evidence`, `Main community evidence` and `Across
  communities`. The parser still accepts the retired `Aggregate Passport
  reading` label so previously copied text remains readable. Internal
  aggregate/primary-anchor keys, scores, evidence derivation, community IDs,
  permissions, privacy boundaries, APIs and the separate TrustSlip product are
  unchanged.
- Verification passed: the 293-module production build, nine focused Trust
  Passport/share audits, the authenticated app-tab first-paint audit, the full
  Trust Passport/TrustSlip phone-width boundary smoke and the complete
  protected-button freeze. The broad smoke contained stale expectations for
  existing mobile and replacement-code behavior; those assertions were aligned
  with the visible mobile copy and now verify exact replacement writes without
  changing TrustSlip runtime behavior. Physical-phone review and live signed-in
  evidence remain outstanding.
- Deployment truth: deployed with the public TrustSlip package in frontend
  commit `fecc26b9` as recorded above.

## Finance and Trade records deployment - 2026-10-26

- The Finance wording and Trade records phone packages were committed as
  `b5b5b441`, pushed to the working branch and promoted unchanged to `main`.
- GitHub Actions run `40320771684` deployed the frontend-only commit through
  Render. Render deploy `dep-dbfk7fpsrm7s73f9q0dg` reached `live`, and the
  workflow confirmed `https://gmfn-frontend.onrender.com` was serving the
  deployed frontend build. The backend-deploy check correctly resolved to
  `false`.

## Finance task wording - 2026-10-26

- Continued the app-wide plain-language work into `/app/finance`. Its compact
  phone structure was already compliant; the remaining defect was technical
  member-facing wording such as `Banking Rails`, `Records / Events`,
  `Signals / Readiness` and `Pipeline Credits`.
- The Finance chooser now uses direct task names: `Money in`, `Money out`,
  `Payment setup`, `Money history`, `Payment status`, `Support money`,
  `Support readiness` and `Service credits`. The hero, snapshot, signal and
  summary headings were simplified without adding another section or action.
- Canonical lane ownership, routes, calculations, payment/support truth,
  permissions, APIs and GSN's non-bank/non-wallet boundary are unchanged.
  Stable Finance action IDs are now explicit, so future copy corrections do
  not silently change automation or deep-link contracts. No backend or frozen
  Dashboard Market Wisdom code changed.
- The 293-module production build, ten focused Finance audits and mocked phone
  flows at 390x844 and 360x780 passed. Both phone sizes retained one primary
  action, one task disclosure, one active lane and no horizontal overflow.
  Physical-phone review and live money operations remain outstanding. This
  package was deployed in frontend commit `b5b5b441` as recorded above.

## Trade records phone progression - 2026-10-26

- Continued the owner-requested Shop Control simplification into the existing
  Marketplace Protected Trade task. The `Trade records` launcher supplied a
  hash but no trusted source, and Marketplace had no matching focused opener,
  so the shortcut could arrive without opening or landing on the requested
  work.
- Shop Control now adds `source=shop-control`; Marketplace accepts that trusted
  source (and its existing DemandBox trade handoff), focuses Trade records and
  completes the landing when the lazy section mounts. A naked hash remains
  blocked. On phone, `Trade records` leads with one state-aware `What to do
  next` and keeps the current record's three truthful outcome choices in the
  first viewport. Creation/refresh, history, event update, private evidence
  paper and event trail remain under `Records, updates & evidence`; desktop
  keeps the complete workbench open.
- Protected Trade parties, terms, evidence/events, derived outcome truth,
  privacy, permissions, APIs, evidence paper and GSN's non-custodial boundary
  are unchanged. No backend or frozen Dashboard Market Wisdom code changed.
- The 293-module production build, relevant Marketplace/Shop Control audits,
  complete protected-button freeze and mocked 390x844 Marketplace boundary
  smoke passed. The smoke recorded the last outcome button at 839px inside the
  844px viewport, with the deeper disclosure closed and no Trade-surface
  horizontal overflow. Physical-phone review and live Protected Trade writes
  remain outstanding. This package was deployed in frontend commit
  `b5b5b441` as recorded above.

## Owner-shop simplification deployment - 2026-10-26

- The preceding owner-shop phone packages through `Promote in another
  community` were committed as `d5112561`, pushed to the working branch and
  `main`, and accepted by GitHub Actions run `40315356839` as Render deploy
  `dep-dbfjjrvb9u1s73d6ldv0`.
- The same commit was rebuilt by run `40316172484`; Render deploy
  `dep-dbfjm06c6qcc739vgn2g` reached `live`. The batch was frontend-only. The
  Trade records package above started afterward and is not included in that
  deployment.

## Promote in another community phone progression - 2026-10-26

- Continued the owner-requested shop simplification into the existing
  Marketplace paid Network Repost task. Investigation found a real launcher
  defect: both Shop Control surfaces generated the paid-placement hash without
  the source context that Marketplace intentionally requires, so the shortcut
  could land in Marketplace without opening the requested tool.
- Both launchers now add an explicit Shop Control source. The naked-hash guard
  remains intact. On phone, the focused lane says Promote in another
  community, gives one state-aware What to do next, uses Shop item,
  Community ID and How long, and shows only the payment or publish controls
  relevant to the current state. The final action is Publish promotion.
  Desktop keeps the complete operational control set.
- The generic public-link explanation and unrelated Free Spotlight,
  Subscription Spotlight and Trade Evidence shortcuts no longer lengthen the
  focused phone task. They remain unchanged on desktop and on their own routes.
  Product identity, target suggestions, payment code/proof review, credit
  confirmation, duration pricing, placement permissions, backend routes and
  direct paid-Spotlight separation are unchanged.
- The 293-module production build and the Marketplace action, inventory,
  records/links, button-line, front-package, helper-lane, lazy-boundary and
  touch-blocker audits passed after implementation. The records/links audit was
  intentionally updated from the retired Paid Repost/technical copy to the
  approved owner wording. The 390x844 browser smoke proved the explicit Shop
  Control source opens the focused task, no premature payment/publish control
  appears before a destination, and confirmed credit plus a destination exposes
  Publish promotion inside the first viewport with no competing payment action
  or promotion-surface overflow. The complete protected-button freeze also
  passed across Marketplace, Shop Control, Dashboard, Market Wisdom, Community
  Home, Action Inbox, entry/auth, shared tap guards and global action hygiene.
  This package was deployed in frontend commit `d5112561` as recorded above.

## Paid promotion phone progression - 2026-10-26

- Continued the owner-requested shop simplification into
  `/app/shop-control/subscription-spotlight`. The phone surface now says
  `Paid promotion`, gives one state-aware `What to do next`, leads with only
  the relevant plan/payment/publisher/live stage, and keeps the complete other
  stages reachable behind closed disclosures. Desktop retains the complete
  workbench.
- The composer now asks what the owner is promoting, puts the picture/video
  requirement first, keeps optional video controls closed on phone, and exposes
  one clear action. Automatically finished video first uses `Prepare video
  preview`; after that required preview is ready, the same action becomes
  `Publish paid promotion`.
- No payment, pricing, credit, permission, Community Domain, identity,
  one-live-run, media-integrity, authoritative-persistence, serving, pacing or
  exposure contract changed. This package was deployed in frontend commit
  `d5112561` as recorded above.
- Verification passed: TypeScript, the 293-module production build,
  `audit:spotlight-controls`, payment-instruction phone rows, media quality,
  action-response, proof-surface and route-fallthrough audits, plus the complete
  protected-button freeze. The 390x844 Playwright smoke covers activation,
  open-payment, ready-to-publish and live states, keeps only one stage open,
  finds no horizontal overflow or business write, and now fails if the real
  `Publish paid promotion` button ends below the first 844px viewport.
- Unrelated repository-wide debt remains unchanged: the standalone Community
  Domain product-contract audit still reports the existing marketplace backend
  and Shop Assets patterns, and standalone button-stability still reports the
  unchanged Shop Gallery pattern. The Paid promotion-focused assertions pass.

## Private offers phone guidance - 2026-10-26

- Continued the owner-requested shop simplification into `/app/vault-control`.
  The route always led with a large `Vault Control` banner and the activation/
  payment purchase surface, including for an owner who had already paid and
  only needed to add an offer or manage its private link.
- The phone task now uses the member-facing name `Private offers`, a compact
  shop identity, and one authoritative `What to do next` reading. No paid
  space leads to `Activate a private space`; paid but empty space leads to
  `Add your private offer`; a saved offer leads to `Create the private link`
  or `Share or manage your private link` when an active link exists.
- Only that next panel starts open and it is ordered directly after the phone
  identity card. Activation, payment, offer-space, private-link and short
  process-reminder panels all remain reachable. The complete desktop
  workbench remains available.
- Corrected a truthful-state defect discovered by the new guard: the shared
  `isUsableVaultLink` helper treated a missing link as active because its
  status fallback was `active`. A null link now remains absent, so the owner
  sees `Create the private link` rather than false share/manage guidance.
- Quote agreement remains distinct from payment confirmation. GBP 5 pricing,
  the two-space maximum, payment code/proof flow, private product media,
  permanent deletion, exact-offer links, copy/share/open/extend/revoke,
  identity/domain gates, action inventory, API calls and backend contracts are
  unchanged.
- TypeScript, the 37-family Vault Control inventory, the action-response audit,
  and the mocked 390x844 empty/paid-empty/offer-ready browser states passed.
  All three screenshots were visually reviewed, had no horizontal overflow,
  placed the relevant task in the first viewport, and emitted no business
  write on navigation. The 293-module production build and complete protected-
  button freeze suite also passed. Physical-phone review and live payment/
  offer/link operations remain outstanding.
- Separate repository truth: the standalone Community Domain product-contract
  audit still reports existing Marketplace-backend and Shop Assets patterns;
  its Vault-specific assertion passes after being aligned with the existing
  sound-rights save guard. The standalone button-stability audit reports the
  unchanged Public Shop pattern, while trust-actions reports Companion,
  DemandBox and earlier doctrine-copy findings. These broader failures were
  not repaired or hidden inside this focused package.
- Deployment truth: this correction and the preceding More selling space,
  Shop items, Shop update and Shop picture packages were deployed in frontend
  commit `d5112561` as recorded above.

## More selling space phone first-view simplification - 2026-10-26

- Continued the owner-requested simplification into
  `/app/shop-control#shop-control-community-packages`. The direct task
  previously rendered the complete paid-tools layer, including Vault,
  verification and Subscription Spotlight before the requested capacity card,
  then exposed the full ROSCA and meeting operating forms on the first phone
  surface.
- The exact hash is now a focused task. It shows only `More shop & community
  space`, the unchanged price boundary, the four existing purchase choices,
  any current payment reference/proof control, and two compact disclosures.
  `What you already have` and `Use purchased services` stay closed on phone
  and open on desktop.
- The ROSCA cycle/payout and complete meeting/reminder/interest/attendance/
  summary controls remain reachable inside `Use purchased services`.
  Unrelated Vault, visitor-verification and paid-Spotlight cards are absent
  only from this focused hash and remain unchanged on their own paid-tools
  surfaces.
- Prices, package codes, bank-transfer references, proof upload, confirmation,
  entitlements, ROSCA records, meeting records, attendance Presence Evidence,
  permissions, action inventory, API calls and backend contracts are
  unchanged.
- TypeScript, the Shop Control inventory, and the mocked 390x844 browser flow
  passed. The browser proved that purchase choices appear before the closed
  operating forms, both operating lanes remain reachable, there is no
  horizontal overflow, and navigation creates no business write. The
  293-module production build and complete protected-button freeze suite also
  passed. Physical-phone review and a live package purchase remain
  outstanding.
- Deployment truth: this correction and the preceding Shop items, Shop update
  and Shop picture packages were deployed in frontend commit `d5112561` as
  recorded above.

## Shop picture focused-task correction - 2026-10-26

- Continued the owner-requested simplification from Shop items into its
  `Change shop picture` handoff. Investigation found a real route defect:
  the action opened `#shop-control-details`, whose current approved form has
  no picture control.
- The action now opens the focused existing picture editor at
  `/app/shop-control#shop-assets-picture`. Phone shows only the current
  preview, `Choose a picture`, the existing file field, and one primary
  `Save picture` action. The pasted public-image URL remains available
  behind closed `Use a picture link instead (optional)`; reset and remove
  actions remain reachable.
- The focused task returns to Shop items and does not expose Shop items, Shop
  Update, Vault, or the full Pictures & Products workbench beside the picture
  task. The standalone `/app/shop-assets` workbench remains unchanged.
- Existing shop-image save/remove behavior, stored name/contact/description
  fields, upload handling, policy gates, routes outside the new hash, action
  inventory, permissions, API calls and backend contracts are unchanged.
- Shop Assets, Shop Control, shortcut, and both Shop Diary audits plus
  TypeScript and the mocked 390x844 Shop items -> picture -> return -> update
  browser flow passed. The flow confirmed navigation made no business write.
  The 293-module production build and complete protected-button freeze suite
  also passed. Physical-phone review and a live picture save remain
  outstanding.
- Deployment truth: this correction, Shop items, and Shop update were deployed
  in frontend commit `d5112561` as recorded above.

## Shop update phone first-view simplification - 2026-10-26

- Continued the owner-requested correction into
  `/app/shop-control#shop-assets-diary`. The focused route previously led
  with internal `Shop Diary` wording, repeated an add-update heading and
  exposed the optional activity/date/item/evidence form before the owner could
  write the message.
- The phone first view now says `Shop update`, explains in one line that this
  is a short public-shop message, and immediately asks `What should visitors
  know?`. The text box and existing `Publish update` action remain direct.
  Optional metadata is behind `More details (optional)`; `Recent updates`
  stays closed on phone and open on desktop.
- This is a presentation and wording correction only. The one-text-update
  model, 24-hour public window, activity/date/item fields, confirmed Trade
  Evidence boundary, sharing, history, Spotlight review handoff, product/Diary
  separation, permissions, API calls and backend contracts are unchanged.
- Focused Shop Diary Phase 1/2, Shop Assets, Shop Control and shortcut audits,
  TypeScript, the mocked 390x844 focused-task browser flow, the rebuilt
  293-module production bundle, all 17 compiled visual scenarios at
  360/390/430px, and the complete protected-button freeze suite passed.
  Physical-phone review and live publishing remain outstanding.
- Deployment truth: this continuation and the Shop items package below were
  deployed in frontend commit `d5112561` as recorded above.

## Shop items phone first-view simplification - 2026-10-26

- Continued the owner-requested correction into
  `/app/shop-control#shop-control-gallery-tools`. The route previously showed
  a separate Shop Gallery explanation and three secondary shortcuts before
  the actual item task.
- Phone now leads with `Shop items`, the truthful filled-space count and one
  `+ Add item` action. The existing numbered `Your shop items` shelf remains
  closed until requested.
- Shop picture, Shop Update and extra selling space remain reachable after the
  item task behind one phone-closed `Other shop tasks` disclosure; desktop
  keeps it open. All six standard spaces and the existing add, edit, permanent
  delete, copy, repost, exact-product, media and Diary behavior are preserved.
- Static Shop Control, Shop Assets and shortcut audits, TypeScript, and the
  mocked 390x844 add/save/public-link/Diary browser workflow passed. Physical
  phone review and live product writes remain outstanding.
- Deployment truth: this continuation was deployed in frontend commit
  `d5112561` as recorded above.

## Shop simplification deployment - 2026-10-26

- Free Spotlight, Shop Control overview, Shop Details and Shop Activity were
  committed as `84fe4b68`, pushed to the working branch and `main`, and
  deployed through GitHub Actions run `40299673176`.
- The exact frontend commit reached Render `live`, and the workflow's public
  URL build-marker check passed. The batch changed no backend files, so the
  workflow correctly skipped the API deploy.

## Shop Activity phone first-view simplification - 2026-10-26

- Continued the owner-requested plain-language correction into
  `/app/shop-control#shop-control-counts`. The old phone first view repeated
  one diagnosis through a second hero, four status cards, a meaning block, a
  three-step plan, an evidence strip and a disclaimer before giving the owner
  an action.
- The phone first view now shows one `What your activity suggests` reading,
  three truthful last-seven-day figures (`Visitors`, `Item opens`, and
  `Contact taps`), one state-derived `Your next step`, and an explicit warning
  that GSN activity does not prove a sale or payment.
- The complete picture-led Shop Health report, all six analytics panels and
  all seven Opportunity Engine panels remain available behind the closed `See
  activity details` disclosure on phone. The same disclosure remains open by
  default on desktop.
- The next-step control is the same existing tracked action moved earlier on
  the surface; no action root was added or removed. Analytics data,
  calculations, state diagnosis, routes, tracking, permissions and backend
  behavior did not change. The frozen Dashboard Market Wisdom area was not
  edited.
- Verification passed the Shop Control action inventory, Spotlight controls,
  Spotlight system-feed contract, the 390x844 browser audit (including the
  collapsed first view and every preserved analytics/opportunity panel), the
  293-module production build, TypeScript, and the complete protected-button
  suite.
- Known unrelated audit state: `audit-link-contracts` still has the existing
  Community Home `Manage shop` and Login publish-return expectation failures;
  neither route was changed by this package.
- Test limitation: verification used a mocked 390x844 browser rather than the
  owner's physical phone or live analytics data.

## Shop Details phone simplification - 2026-10-26

- Continued the owner-requested novice-language work into
  `/app/shop-control#shop-control-details`, the first task reached by a member
  whose shop is not set up.
- The form now says `Set up your shop` for a new owner and `Change what
  customers see` for an existing owner. Shop name, WhatsApp number and the
  optional description are first; Telegram remains stored and editable but is
  closed behind `More contact options (optional)`.
- A new owner now sees one `Save shop` action and a short explanation of what
  comes next. `Manage shop items` appears only after the shop exists. Existing
  owners use `Save changes`. Save success now says `Shop details saved` instead
  of exposing billboard/system implementation language.
- Corrected the overview guidance at the same time: this form manages name,
  contact and description, not the separate shop-picture task.
- The four stored fields, shop create/update request, community-review result,
  routes, permissions, action inventory, native-field inventory and backend
  behavior did not change.
- Verification passed the Shop Control inventory, Spotlight controls, the
  390x844 Shop Details/overview/analytics browser audit, the 293-module
  production build, the complete protected-button suite and scoped `git diff
  --check`.
- Known unrelated audit state: `audit-link-contracts` still fails its existing
  Community Home `Manage shop` and Login publish-return expectations. The
  updated Shop Details save assertion passed before those later failures; this
  package did not change either unrelated page.

## Shop Control first-view simplification - 2026-10-26

- Trigger: after the Free Spotlight correction, the owner asked to continue
  simplifying wording and surfaces for members who should not need to
  understand internal GSN terminology.
- The `/app/shop-control` overview now shows the shop name and one truthful,
  state-aware `Your next step`. It no longer repeats the same state through
  three hero badges, a duplicate action heading, and five tall phone cards.
- The five required first-level routes remain, but on phone they are compact
  action rows named `Your public shop`, `Shop items`, `Shop activity`, `Shop
  promotion`, and `Shop update`. Private offers, paid promotion,
  cross-community promotion, extra space, and trade records remain reachable
  behind the closed `More shop tools` disclosure.
- Corrected an existing false status: the public-product count was also being
  shown as the Shop Diary status even though this page does not load a Diary
  count. Shop Update now truthfully invites the owner to `Write a short
  message` instead of inventing a count.
- Routes, permissions, action count/order, backend calls, Spotlight lifecycle,
  paid tools, focused product/Diary tasks, media behavior and frozen Market
  Wisdom were not changed.
- Verification passed the Shop Control action inventory, Spotlight controls,
  the 390x844 Shop Control overview/analytics browser visual audit, the
  293-module production frontend build, the complete protected-button freeze
  suite, and scoped `git diff --check`.

## Free Spotlight phone publish-path correction - 2026-10-26

- Trigger: the owner supplied a phone recording of `/app/shop-control` where
  the Free Spotlight composer became unnecessarily long after optional sound
  and Natural Finish controls opened, while the only bottom action was a
  disabled `Preview` button and no publish-labelled action was visible.
- Corrected the caged workflow with an explicit owner-approved exception:
  - the compact header now uses a two-column phone layout;
  - the first surface now says `Promote your shop`, `What are you selling?`,
    `Add a picture or short video`, and `How should customers contact you?`;
  - `Check and publish` appears immediately after the required message/media
    composer and remains sticky on phone;
  - recoverable media and sound-rights blockers now explain the first fix on
    tap instead of silently disabling the action;
  - sound and automatic Natural Finish are inside one closed `Video options`
    disclosure. The separate prepare-finish decision and persistent internal
    shop-record-ready message are removed;
  - enabled Natural Finish is prepared from `Check and publish`, then the user
    enters the required review where `Publish now` is the only write action;
  - optional sound and finish guidance is shorter. No media gate, permission,
    quota, payment, serving, pacing or final-review rule changed.
- Regression coverage: `audit:spotlight-controls` now cages the visible action
  and automatic Natural Finish handoff. `audit:spotlight-controls`,
  `audit:shop-control-button-inventory`, the full
  `audit:protected-button-freeze` suite, and `npm --prefix frontend run build`
  all passed. `git diff --check` passed for the scoped implementation files.

## Pre-React phone shortcut startup recovery - 2026-10-25

- Trigger: an older Android home-screen icon opened a white body between the
  navy system bars, while the current Chrome-badged shortcut and ordinary
  Chrome page still opened correctly.
- Confirmed cause boundary: production and the current built bundle were
  healthy, but the existing installed-shell freshness check begins only after
  React loads. It therefore could not help when a legacy shortcut failed while
  loading the entry JavaScript itself.
- Implemented and published in application revision `bd14b6d2`:
  - `frontend/index.html` now watches startup before React. A standalone phone
    shell gets one bounded automatic recovery attempt; a second failure or an
    ordinary browser failure shows a plain `GSN could not start` card with one
    `Refresh GSN` action and an old-icon remove/re-add fallback.
  - recovery deletes only cache names beginning `gsn-pwa-shell-`, requests a
    service-worker update and reloads with a cache-busting query. It does not
    clear local storage, sign-in storage, drafts or server records, and it does
    not unregister the service worker.
  - `frontend/public/sw.js` advances the shell cache from v19 to v20, caches
    only successful asset responses, and refreshes the `/cover` fallback after
    every successful online navigation.
  - `frontend/src/lib/pwaInstall.ts` now registers `/sw.js` with
    `updateViaCache: "none"` so update checks bypass the browser HTTP cache.
  - focused static and Playwright guards were added through
    `audit:pwa-boot-recovery` and `smoke:pwa-boot-recovery`.
- Verification passed: focused recovery audit, production build, recovery
  browser smoke (healthy boot plus deliberately blocked standalone JavaScript,
  one automatic retry, manual refresh and local-storage retention), icon
  protocol, entry/auth contract and
  the full protected-button freeze suite. `git diff --check` passed for the
  scoped files.
- Existing unrelated verification gap: `audit:link-contracts` still reports
  current Community Home `Manage shop` and Login publish-return expectations.
  Neither page was changed by this repair; the PWA assertions in that audit did
  pass before those two later checks failed.
- Deployment evidence: owner-authorised frontend-only workflow
  `40227579138` completed successfully for exact SHA
  `bd14b6d2118255733f36a88bf1e58bbdfbc3fbc5`. Render deploy
  `dep-dbf5p1jphbkc73a7kv5g` reached `live`; the workflow's public-build check
  passed. Independent requests returned HTTP 200 for the live index, v20
  service worker and every index asset, and confirmed both the recovery marker
  and `GSN could not start` copy in production. The API was intentionally not
  deployed because this batch contains no backend change.
- Unabated truth: an already-open legacy shell cannot execute recovery code it
  has never downloaded. The v20 worker and network-first navigation improve
  the next-open recovery path, but the specific physical phone must still be
  tested. A very old icon that never accepts the new shell may still need to be
  removed and added again. Current Android policy intentionally uses a browser
  shortcut (`display: browser`), so this work does not promise a new no-Chrome
  standalone icon.

## Advertising share, network attribution and Clear Finish deployment - 2026-10-25

- The owner-approved batch containing consent-bound network-growth attribution,
  advertising community-share accounting, and automatic verified-media `GSN
  Clear Finish` was pushed to `codex/spotlight-rotation-continuity` and `main`.
  Final application revision `02e9b4c3` is live on both Render services.
- The first API attempt for application revision `158cd9a4` built successfully
  but failed transactionally during pre-deploy migration. Production PostgreSQL
  rejected the legacy-bootstrap `canonical` Boolean column's integer default:
  `column "canonical" is of type boolean but default expression is of type
  integer`. The existing API remained live and the transactional migration did
  not partially apply.
- Corrective revision `02e9b4c3` changes only that migration default from
  `sa.text("0")` to portable `sa.false()`. SQLAlchemy PostgreSQL compilation now
  emits `DEFAULT false`; SQLite emits `DEFAULT 0`. All 38 focused advertising
  and media tests passed, and the isolated Alembic blank -> head -> previous ->
  head cycle ended at `20261025_ad_share`.
- Successful deployment evidence: GitHub workflow `40224932275` completed every
  step for exact SHA `02e9b4c3c174e00cb830e3ff02a0c920f409fa44`.
  Frontend deploy `dep-dbf59cta647c73eo46i0` and API deploy
  `dep-dbf5a329lscs738s25a0` both reached `live`; the workflow's public frontend
  marker and live API identity-contract audits passed. Independent checks
  returned frontend HTTP 200 and API health `{"ok":true,"dev_mode":false}`;
  immediate post-rollout API error-level logs were empty.
- No payment settings or real financial activity were changed. Advertising
  payment instruction remains fail-closed until the explicit settlement and
  banking configuration is supplied. Community payouts remain prepared/manual
  records rather than automatic bank transfers. Physical Android/iPhone media
  upload comparison remains the next live-user quality check.

## Network growth attribution spine v1 - 2026-10-25

- Implemented an additive, consent-bound backend foundation for recording who
  says they introduced an existing GSN member and through which source. The
  authenticated API is rooted at `/network-growth/attributions`: a claimant can
  submit a claim, each member can read claims involving them, and only the
  named participant can accept or challenge an incoming claim.
- The canonical record separates participant and claimant, records source kind,
  optional community/invite context, evidence status, participant kind, state,
  acceptance time and challenge evidence. Exact Community Invite/QR claims are
  marked `verified_invite_record` only when existing invite ownership and the
  participant's membership row prove the link; every other source remains a
  `claimant_statement` until the participant accepts it.
- Multiple unconfirmed statements may be shown to the participant so the first
  unsupported claimant cannot lock the record. A partial unique database index
  permits only one accepted attribution per participant. Accepting one claim
  atomically supersedes competing pending statements; a participant may later
  challenge the accepted claim. Identical resubmissions are idempotent by a
  stored SHA-256 claim fingerprint, and each claimant is capped at 20 pending
  claims.
- The participant-only response derives four factual milestones from existing
  records: community membership, shop creation, non-house Spotlight activation,
  and protected-trade participation. Claimants do not receive those later
  activity details. The API explicitly says the milestones do not prove reward
  eligibility, payment, sale, or causal credit.
- Hard boundary: this slice creates no Independent Entrepreneur role,
  onboarding approval, trial clock, NGN 12,000 reward, commission, residual,
  payout, territory, employment, advertising authority, payment movement, or
  pricing change. It does not yet provide an ordinary-member frontend screen;
  the canonical My GSN surface is frozen and no approved placement was defined,
  so `mine`, `accept`, and `challenge` are API capabilities only in this slice.
- Changed backend files: `app/db/models.py`, migration
  `20261025_network_growth_attribution.py`, schema/route/service files named
  `network_growth.py` / `network_growth_service.py`, API router registration,
  and `tests/test_network_growth_attribution.py`.
- Verification: migration graph has one head (`20261025_network_growth`), its
  blank -> head -> previous -> head round trip passed, Python compilation
  passed, and all 6 focused attribution tests passed. Status is local commit
  `3681e00d`; it is not pushed, deployed, or live-phone verified.

## GSN campaign batch preview, expiry and network recovery - 2026-10-25

- A 16:45 physical-phone retest exposed a separate first-video rejection: the
  server reported 0.0 frames per second, called the video choppy, and retained
  0 of 10 items. Source inspection confirmed that the lightweight metadata
  reader's unknown/zero frame rate was incorrectly treated as a measured low
  frame rate before FFmpeg could prepare the phone video.
- Unknown source frame rate now follows the same bounded trust boundary as
  unreliable source duration: FFmpeg may prepare it, but the normalised MP4
  must still report and pass the 15-fps floor before acceptance. A genuinely
  measured 10-fps source remains rejected. Verification passed all 17 focused
  media-quality tests, all 18 GSN-house campaign tests, the media-quality
  source audit, and scoped diff checks. Application commit 2a9061dc passed the
  full GitHub backend workflow and was pushed unchanged to the pilot branch and
  main. Backend-enabled deployment workflow 40214270425 succeeded; Render API
  deploy dep-dbf3c7dg1s2s73eb2ecg reached live from the exact commit, public API
  health returned HTTP 200 in production mode, and post-rollout API error-level
  logs were empty. A retry of the same physical-phone batch remains pending.

- Follow-up expiry correction: the former 24-hour frontend `max` and matching API rejection were an actual fixed ceiling, not merely a default. The reviewed expiry is now any explicit future timestamp; 24 hours remains only the initial value and the legacy fallback when a trusted caller omits expiry. Normal-rotation quotation-only accounting now rounds the selected start-to-expiry span up to chargeable days, so a 90-day, two-promotion, one-community preview reports 90 days and 180 repost-equivalent credits. The screen states that expiry does not prove payment, payer authority, or settlement.
- Expiry verification passed: all 18 GSN-house backend tests, the focused four-test expiry/timed-schedule slice, the Admin GSN campaign source audit, targeted frontend lint, the 292-module production build, and the complete protected-button freeze audit. The first protected-audit attempt encountered a temporary local port-5173 collision; its clean rerun passed every protected gate.
- Expiry deployment status: application commit `8228b47f` was pushed unchanged to `codex/spotlight-rotation-continuity` and `main`. Frontend-and-API workflow `40211094249` completed successfully. Render frontend deploy `dep-dbf2o1jsp5es73cfuukg` and API deploy `dep-dbf2oo7b9u1s73bdsssg` both reached `live` from that exact commit. The public campaign chunk returned HTTP 200 with the multi-month/admin-selected contract and without the former 24-hour-maximum wording; API health returned HTTP 200 with production mode, and post-deploy API error-level logs were empty.
- Post-deploy phone evidence corrected the remaining recovery claim: the reported batch reached the live API, and GSN returned HTTP 200 for the preview, one image and eight sequential video preparations. The tenth item never reached the API. The client formerly discarded its nine confirmed results and falsely reduced the whole event to `could not reach the server`.
- The Command Centre now retains each confirmed review upload in the open phone session. A later media interruption reports the exact retained count and changes the action to `Continue final check`, which reuses confirmed media and resumes at the first unfinished item. Changing the draft still invokes the existing reference-safe discard path; no publication occurs during review.
- Follow-up verification passed: the focused Admin GSN campaign audit, the complete protected-button freeze audit and a 292-module production build. Physical-phone proof still requires one interrupted-or-complete batch retest after this follow-up revision is deployed.
- Status: the initial image-upload and preview repair is live as `1904ac0b`. The retained-upload resume follow-up was committed as `43c193ce`, pushed unchanged to `codex/spotlight-rotation-continuity` and `main`, and deployed by successful frontend-only workflow `40209878144`. Render frontend deploy `dep-dbf2grsegpmc73btqqf0` reached `live` from the exact commit. The public campaign-page chunk independently contained the retained-count and `Continue final check` recovery behavior, contained the corrected interrupted-connection wording, and did not contain the former false `GSN could not reach the server` wording.
- `/app/command-center/gsn-campaigns` no longer fixes the prepared-media preview to the first file. Each successfully prepared file becomes the visible preview, and the admin can reopen any queued item with its explicit `Preview` control.
- The pre-publication action is now truthfully labelled `Open final check`. It uploads review media but publishes nothing; the existing read-only review, approval checkbox and separate Publish action remain the publication boundary.
- The operations board schedules a server refresh at the nearest active campaign expiry, so an expired advert leaves active inventory and returns only in the collapsed campaign history. Public Shop already filtered and replenished expired canonical presentations; its rotation, dwell, pacing and accounting were not changed.
- Raw browser `Failed to fetch` text is replaced on the GSN publisher, Marketplace shop preparation and Public Shop reconnect paths. Ambiguous publication failures tell the operator to refresh status before retrying; existing idempotency keys remain the duplicate-publication safeguard. Shop reconnect guidance tells the member to look for the existing shop before attempting another creation.
- Read-only Render evidence then separated two complaints. The live API accepted video uploads but returned HTTP 500 for six observed `POST /marketplace/media/image` requests. Source inspection found a video-finish response block accidentally placed in the image route, where it referenced undefined `selected_finish` after writing the file. The block now belongs to the video response; verified image uploads again return normally.
- Verification passed: Admin GSN campaign audit, Marketplace front-package audit, Spotlight presentation-contract audit, the complete protected-button freeze audit, scoped diff checks, two successful 292-module production builds, all 9 marketplace-media boundary tests and all 15 media-quality tests.
- Remaining truth: the image-upload failure is evidenced and repaired locally, but the member's separate shop-creation failure did not appear as a `POST /marketplace/shops` in the inspected live window. The physical-phone/browser cause therefore remains unproven; recovery copy is safer, but a retest after deployment is still required. Failed pre-fix uploads may have left unreferenced image files because the crash happened after disk write; no destructive cleanup was attempted. Git publishing remains in owner-controlled batch mode.

## GSN-HOUSE timed campaign opportunities - 2026-10-25

- Status: implemented and verified locally on `codex/spotlight-rotation-continuity`; not pushed or deployed at the time of this note.
- The existing Command Centre GSN publisher now offers an optional `Specific window and interval` mode. Normal rotation remains the default and its current Spotlight behavior is unchanged.
- Timed campaigns persist an absolute start/end window and anchored interval in the existing campaign pacing record. No new serving engine or database migration was added. A late qualifying presentation closes elapsed schedule slots and keeps the next opportunity anchored to the original start instead of drifting the whole schedule.
- The operations board reports requested, due, qualified and unfilled-due slots. One slot means one network-wide eligible qualifying-presentation opportunity; it does not guarantee clock-time playback, every-community delivery, handset receipt, reach, completion or sale.
- Preview quotes `promotion count x eligible destinations x scheduled opportunities` with the existing paid-repost function. The extra peak-time surcharge remains explicitly policy-undecided and unquoted. No repost, credit, payment, payer or beneficiary record is created.
- The first UI time bases are Nigeria (`Africa/Lagos`, UTC+1) and the admin device's local time. The timed window must finish before the reviewed campaign expiry; interval bounds are 5-1,440 minutes and the existing 24-hour campaign maximum remains.
- Verification passed: Python compilation; 72 focused GSN/pacing/presentation tests plus the separately rerun temp-directory media-safety case; four new timed-schedule/window tests; TypeScript; the 292-module production frontend build; the Admin GSN campaign audit; and the complete protected-button freeze audit. The first combined run had one Windows pytest temporary-directory permission error, then the exact case passed with approved normal temp access.
- Remaining truth: this is locally verified source behavior only. It is not pushed or deployed. It cannot create playback when no eligible member has Spotlight open. Regional/global targeting and a monetary peak-time surcharge remain unimplemented because authoritative location and approved price policy are still absent.

## GSN campaign board + Natural Finish - 2026-10-25

- The existing Spotlight serving engine was deliberately not changed: rotation, dwell, pacing, replay, qualification, ordinary frequency limits, GSN-HOUSE delivery rounds, audio continuity, placement eligibility, quota and credit consumption remain as before.
- `/app/command-center/gsn-campaigns` now requests one group-level read-only calculation using `promotion count x eligible destinations x one chargeable day`. It reports the existing paid-repost credit/GBP equivalence as a quotation with `financial_effect: none`; it does not create repost, payment, payer, shop or beneficiary records.
- The campaign board now reports the distinct union of active member accounts across currently eligible communities. `Connected now` is explicitly `not_recorded`; addressable accounts are not represented as views. Campaign history also receives current addressable-account and quotation fields.
- The authenticated marketplace video upload route now accepts an optional `gsn_natural` finish for only the current seller's shop (platform admin remains the existing override). It supports five or ten seconds, conservative enhancement, a shop-derived lower third, `Presented through GSN`, 1.6 Mbps video/96 kbps audio targets, and a hard 4 MB output ceiling. Ordinary upload defaults are unchanged.
- Shop Control Free Spotlight and Subscription Spotlight now expose the optional finish, upload it separately for a real server preview, and block publication until the seller reviews that result or turns the option off.
- Verification passed: Python compile, 31 focused backend Spotlight/media tests, the new real-FFmpeg five-second finish test, Admin GSN campaign audit, scoped diff check, TypeScript and 292-module production build. Initial pytest/build attempts were blocked by the restricted Windows token; the same focused commands passed with approved temporary-process access.
- Remaining truth: server-side compression reduces stored/delivered bytes but does not reduce the seller's first upload data. Browser preparation still trims supported clips locally; broader imported-video upload compression would require a later bounded on-device codec decision. A finished preview abandoned before publication can remain as an unreferenced managed file because seller-owned reference-safe discard/retention is not yet connected; this is explicit cleanup debt, not silently claimed as complete.
- This batch is locally implemented and verified but not deployed. Render auto-deploy and Git publishing remain frozen in owner-controlled batch mode.

## Spotlight iPhone sound continuity - 2026-10-25

- The intended Public Shop contract is now explicit: one viewer tap turns
  sound on for subsequent Spotlight videos, and one later tap turns it off for
  subsequent videos. The preference remains local to that open Public Shop
  session; it does not change another member's phone or bypass the phone's
  silent-volume settings.
- The existing parent-owned sound preference was not the whole iPhone fix.
  Rotation previously replaced the active video with a separately preloaded
  video element. Chromium accepted that path, but mobile Safari can associate
  the sound-authorising gesture with the original media element and stop or
  re-mute the replacement.
- Public Shop now retains one active `SpotlightMediaFrame` and its underlying
  video element while changing sources, including while an image-only advert
  appears between two videos. The hidden next-media preload remains separate
  and muted, and is no longer promoted as the active element.
- The focused phone-browser smoke now proves a video -> image -> video
  sequence: the video source really changes, the sound-authorised active
  element survives the image, and its `muted`/`volume` state remains audible
  and reversible.
- Verification passed locally: the 14-scenario Public Shop/Spotlight
  real-browser smoke, Spotlight presentation and system-feed audits, Public
  Shop button inventory, targeted ESLint (two pre-existing hook-dependency
  warnings and no errors), the complete protected-button freeze audit, the
  292-module production build, and scoped diff checks.
- Unabated truth: the automated smoke is Chromium-based and proves the DOM and
  sound-state contract, not physical iPhone audio output. Chika's iPhone must
  reload the deployed bundle and complete one sound-on/rotation/sound-off
  observation before the Apple-phone complaint can be called live-verified.

## GSN selected-destination withdrawal and activation evidence - 2026-10-25

- The first bounded infrastructure slice from the independent-entrepreneur and
  central-advertising gap review is implemented locally without introducing
  unresolved prices, rewards, commissions, residuals, payment movement, or a
  new database entity.
- A platform administrator can now stop future delivery of one destination in
  a live multi-community GSN-HOUSE campaign through
  `POST /marketplace/admin/gsn-house-campaigns/{campaign_id}/destinations/{clan_id}/stop`.
  The request requires an explicit reason and confirmation, invalidates only
  issued presentation leases for that placement, preserves the campaign and
  history, and leaves the other permitted destinations serving. The last
  serving destination must use the existing whole-campaign stop action.
- Publication now records one activation audit snapshot containing the
  requested destinations, eligible destinations, exclusions and reason codes,
  institutional publisher, acting administrator, authorised expiry, and a
  hashed publication key. Each destination publication audit also records its
  authorised expiry.
- Campaign operations reporting now distinguishes current policy permission
  from actual delivery eligibility, identifies withdrawn destinations and
  their withdrawal evidence, and reports the approved 10,000-round GSN-HOUSE
  pilot ceiling even before a pacing row is materialised.
- The registered `/app/command-center/gsn-campaigns` screen now exposes that
  backend authority inside each live campaign's collapsed Destinations area.
  Staff see visible community names/codes, policy and delivery status, expiry,
  and any prior withdrawal reason. One serving-community selector opens one
  focused reason-and-confirmation task; the final serving destination directs
  staff to the existing whole-campaign emergency stop.
- Verification passed locally: Python compilation, `git diff --check`, all 16
  focused GSN-house tests, 81 adjacent Spotlight presentation, pacing,
  eligibility, and delivery tests (97 tests total), the admin GSN-house audit,
  the Spotlight system-feed audit, targeted frontend ESLint, the complete
  protected-button freeze audit, and the 292-module production build.
- Unabated truth: the backend and staff workflow are verified locally but are
  not deployed or live-phone proven. Paid campaign orders, scheduling, reach
  commitments, entrepreneur economics, seller-payment automation, and
  unresolved policy values remain outside this slice. Git publication remains
  in owner-controlled batch mode.

## GSN advert-group expiry control - 2026-10-25

- Before this change, each GSN-HOUSE campaign already received a server-set
  24-hour expiry, but the platform admin could not choose or review one exact
  expiry shared by a multi-media advert group.
- The GSN Spotlight publisher now requires one future expiry date/time before
  review, locks its UTC timestamp into the review, sends it unchanged for every
  sequential media publication, and shows it in review, summary, and history.
- The backend persists the timestamp on the canonical campaign and all
  placements, rejects past or over-24-hour pilot values, and treats a changed
  expiry on the same idempotency key as a conflicting request. Older trusted
  callers still receive the authoritative 24-hour default, so no legacy GSN
  house publication becomes unbounded.
- Verification passed locally: 15 focused backend tests, focused campaign and
  Spotlight audits, targeted ESLint, Python compilation, the complete
  protected-button freeze audit, the 292-module production build, and
  `git diff --check`.
- Unabated truth: this change is verified locally but is not deployed. Git
  publishing remains in owner-controlled batch mode until the owner explicitly
  releases the current batch.

## Spotlight weighted-starvation and stable-window repair - 2026-10-24

- The owner's follow-up report disproved the prior completion claim. The exact
  3:1 client weighting was real, and transient fresh/replay exclusions also
  shifted the server cursor, allowing repeated campaigns while others starved.
- Canonical Public Shop now uses one client occurrence per campaign, campaign
  deduplication, the normal reduced-motion dwell, and route-state clearing.
  The server first creates a fixed four-campaign stable window, then limits
  fresh selection to that window; replays appear only in their natural window
  position, with fallback use only when no stable visibility window exists.
- Owner inspection and independent per-viewer sequences remain unchanged:
  owners may inspect their own shop, while each viewer still receives an
  independently seeded sequence based on their eligible community portfolio.
- Local checks passed: 19 presentation tests, 21 Public Shop Spotlight tests,
  the 32-campaign real-endpoint regression with no repeats and zero accounting,
  both Spotlight audits, targeted ESLint, the protected freeze audit, the
  292-module production build, and the phone smoke.
- Unabated truth: production and physical-iPhone proof remain pending until
  this exact revision is deployed and verified on the live services.

## Spotlight 30-plus phone rotation and transition repair - 2026-10-24

- The owner's 5:09 iPhone recording and report of more than 30 live media
  disproved the completeness of the 2026-10-23 fair-rotation claim below.
  Repeated campaigns, unseen campaigns, two-to-three-second appearances,
  long final-item holds, and navy gaps were real implementation defects rather
  than a recording-background illusion.
- Four causes were repaired on the Public Shop route only: the final queue row
  could not advance until its 30-second server expiry; repeated requests inside
  one server time bucket could receive the same visibility window; a general
  30-second page refresh could replace the queue during a dwell; and the next
  image/video was not mounted until the previous media had disappeared.
- The endpoint now accepts an optional ordered visibility-window cursor while
  preserving the old time-bucket fallback for older clients. Public Shop keeps
  its active queue during unrelated page refreshes, appends unseen refill rows
  behind already-waiting campaigns, starts refill before the final row, and
  consumes every occurrence after one complete visible dwell.
- Public Shop now double-buffers the next media with video preload, holds the
  current media until the next one is ready, bounds a hung preload at eight
  seconds, skips unavailable next media, and explicitly starts a preloaded
  video when it is promoted. Visibility and replay rows remain tokenless and
  accounting-neutral. Dashboard and frozen Market Wisdom were not changed.
- Changed implementation and regression files:
  frontend/src/pages/ShopGalleryPage.tsx,
  frontend/src/components/SpotlightMediaFrame.tsx, frontend/src/lib/api.ts,
  gmfn_backend/app/api/routes/marketplace.py,
  gmfn_backend/app/services/spotlight_presentation_service.py,
  gmfn_backend/tests/test_spotlight_presentation_contract.py, and the two
  Spotlight audit/smoke tools.
- Local verification passed: 18 focused backend presentation tests, the
  Spotlight contract audit, the 14-scenario 390x844 phone-browser smoke
  including ordered windows 0,1,2,3, targeted ESLint with zero errors, the
  complete protected-button freeze audit, and the 292-module production build.
- Unabated remaining truth: this is not yet production proof. The exact live
  30-plus inventory and the owner's physical iPhone still need a post-deploy
  five-minute recording. The owner explicitly released the batch freeze and
  authorised deployment on 2026-10-24. Publication must use the same verified
  commit for the working branch, main, frontend, and API; a trigger alone is
  not evidence that either Render service became live.

## Tomorrow: independent GSN entrepreneurs and remaining Spotlight work - 2026-10-24

- The independent GSN partner/worker/entrepreneur model was not touched by the
  2026-10-23 GSN-house campaign work. It remains a separate product and
  engineering work package; no role authority, employment relationship,
  commission, earnings, territory, referral attribution, payout, or campaign
  publishing right should be inferred from the current system.
- Tomorrow's first task is to define the role vocabulary, identity and
  onboarding, permissions, advertiser/community approval boundaries, referral
  evidence, commercial rules, privacy, audit, suspension, dashboard, and the
  smallest controlled pilot before coding.
- The same next-work record preserves every remaining Spotlight gap found in
  this workstream: regional and branch targeting, viewer-local peak/off-peak
  scheduling, validated active context, paid/free advertising control,
  organisational publishing, advertiser billing/refunds, content classes,
  actual-appearance and playback telemetry, multi-community attribution,
  personal fatigue controls, pagination and scale/load evidence, CDN proof,
  and real multi-user phone validation.
- Durable checklist:
  [`GSN_SPOTLIGHT_AND_PARTNER_NEXT_WORK_2026-10-24.md`](GSN_SPOTLIGHT_AND_PARTNER_NEXT_WORK_2026-10-24.md).

## Spotlight 19-item fair-rotation repair - 2026-10-23

- Owner phone testing with 19 active GSN-house promotions exposed real queue
  starvation: up to four recent qualified replays could occupy a five-item
  response, the bounded visibility window independently reshuffled on each
  30-second bucket, and the browser circularly reused early rows while their
  leases remained current. That combination allowed repeated early media,
  short near-expiry flashes, and unseen later promotions.
- The server now advances deterministic adjacent visibility windows, reserves
  recent qualified replays only as fallbacks, and lets other eligible live
  campaigns fill the bounded phone response first. The single-campaign replay
  contract remains intact and all replay/visibility rows remain accounting
  neutral.
- Public Shop now treats each bounded queue as one pass: an occurrence is
  removed after its complete visible dwell instead of wrapping immediately to
  the start. A row with less than one standard readable dwell remaining is
  skipped; reduced-motion presentation still respects the authoritative server
  deadline. The handset remains bounded and never downloads the full inventory.
- Verification passed locally: 18 focused presentation-contract tests, a
  broader 70-test scheduler/frequency/GSN-house collection, the Spotlight
  contract audit, targeted ESLint, Python compilation, the 292-module
  production build, the complete protected-button freeze audit, and the
  14-scenario real phone-browser Spotlight smoke.
- Application commit `9c62cd0b` is on the working branch and `main`. GitHub
  Backend Tests run `40023993824` passed. Trigger Render Deploy run
  `40024026521` passed: frontend deploy `dep-dbdsnn2qqsrs73d7d1cg` and API
  deploy `dep-dbdsoscs728c738d6lig` both reached `live`, and the public frontend
  plus live API contract checks passed.

## GSN house advertiser contact route - 2026-10-23

- The platform-admin GSN Spotlight publisher now requires one advertiser phone
  number in international format for each reviewed batch. The number is
  normalized once, copied to every independent placement in that batch, and
  retained in campaign review, history, and operations reporting.
- Public Spotlight delivery now exposes one source-aware contact action. An
  ordinary shop promotion keeps its existing WhatsApp action; an official
  GSN-HOUSE promotion with the new structured contact opens the phone dialler as
  `Call advertiser`. This does not manufacture a shop, trust relationship, or
  GSN endorsement, and the frozen Dashboard Market Wisdom area is untouched.
- A nullable `marketplace_broadcasts.advertiser_contact_phone` column preserves
  readability of older rows. New GSN-house publications reject missing or
  local-only numbers; historic campaigns without a stored number remain visible
  but correctly have no invented contact route.
- Verification passed: 13 focused backend campaign tests, the Admin GSN House
  campaign audit, Shop Gallery button inventory audit, Spotlight presentation
  audit, the complete protected-button freeze audit, Alembic single-head check,
  and the 292-module production frontend build. Application commit `fff24b16`
  was pushed to `codex/spotlight-rotation-continuity` and `main`. Backend CI run
  `40019365300` passed. Trigger Render Deploy run `40019411473` deployed the
  exact application commit: frontend deploy `dep-dbds6m40a7sc7394jh4g` and API
  deploy `dep-dbds7trl550s7387gv80` both reached `live`; the public frontend
  marker and live API contract checks passed.

## GSN house batch-media queue and review recovery - 2026-10-23

- Follow-up status: application commit `4319f369` was pushed to
  `codex/spotlight-rotation-continuity` and `main`. Frontend-only workflow
  `40013827897` completed successfully on exact commit `4319f369`; Render
  deploy `dep-dbdrieose3cs73f3fil0` reached `live`, the public marker check
  passed, and an independent production-asset check found both the new
  `Review and publish` label and clarified 2,000-character guidance.
- Owner phone review found that a nine-item queue pushed the primary review
  action below the first-media preview and the full prepared list. The follow-up
  correction moves `Review and publish` immediately below the file picker and
  preparation status, before any media preview/list. The first tap remains a
  non-publishing final check; the explicit confirmation and final publish action
  remain mandatory. The bare `0/2000` message counter was replaced with plain
  guidance that one short sentence is enough and 2,000 characters is only the
  maximum allowance.
- Status: application commit `dc969997` was pushed to
  `codex/spotlight-rotation-continuity` and `main`, then deployed to the
  Render frontend on 2026-10-23.
- The existing platform-admin GSN Spotlight publisher now accepts one to ten
  pictures and/or short videos in one phone file choice. It prepares files
  sequentially, shows the accepted queue and progress, and lets the operator
  remove an item before review. The queue is browser-session memory until
  review, so the page truthfully tells the operator to keep it open.
- One shared official message and one selected destination set apply to the
  batch. Read-only review uploads each prepared item sequentially to managed
  GSN storage but publishes nothing. Every reviewed media item receives its own
  publication idempotency key and becomes one independent 24-hour GSN-HOUSE
  campaign when the batch is confirmed.
- Final publication is sequential and progress-visible. If a later item fails,
  already-published campaigns remain recorded, the draft locks against unsafe
  edits, and retry resumes from the next item without duplicating successful
  campaigns. Discard cleans every wholly unpublished uploaded item through the
  existing reference-safe backend route; referenced media is never deleted.
- The formerly silent disabled `Review campaign` action is now tappable before
  readiness and the same action area lists the exact missing destination,
  message, media, or preparation step.
- This is an operator-efficiency repair, not the global-audience architecture.
  The current pilot still stores explicit placements for at most 100 selected
  communities. Millions of destinations must later use a persisted
  global/country/region/free-tier audience rule evaluated during delivery,
  rather than creating millions of per-community attachments.
- Verification passed: targeted ESLint, the Admin GSN campaign contract audit,
  the complete protected-button freeze audit including phone visual checks,
  the 292-module production frontend build, and all 12 focused backend
  GSN-house campaign tests. The first two backend attempts reached 11 passing
  tests before Windows denied pytest temporary-directory access; the approved
  workspace-safe rerun completed all 12.
- Trigger Render Deploy workflow `40010973522` completed successfully on exact
  commit `dc969997`, including the public frontend marker check. Exact
  frontend deploy `dep-dbdr88c7hfos73dkao4g` reached `live`; an independent
  request to the public frontend returned HTTP 200. No API deployment was
  needed because this slice changed only the existing frontend orchestration,
  screen contract, audit, and handoff documentation.

## GSN house Spotlight multi-promotion pilot inventory - 2026-10-23

- Status: implemented, committed as application commit `6f452b7f`, pushed to
  `codex/spotlight-rotation-continuity` and `main`, and deployed to both Render
  services on 2026-10-23. The destination-discovery/default-eligibility
  correction is application commit `2244a72e`, also pushed to both branches
  and deployed to both Render services on 2026-10-23.
- The owner approved a simpler first-stage behaviour: automatic Spotlight
  movement only, with no new viewer next/previous, pause, or fast-forward
  controls. The shared community pilot rail now moves every five seconds while
  retaining its 30-second server refresh, so presentation changes do not create
  one API request every five seconds.
- The reserved GSN-HOUSE system publisher may now own overlapping active house
  promotions. The database partial unique index still enforces one active
  campaign for ordinary member/shop publishers. A new Alembic migration applies
  that narrow exception without changing member entitlements.
- The Command Centre may hold up to 100 active GSN promotions during this pilot,
  display the full active inventory, and target up to 100 selected active
  communities per promotion. Active free communities are eligible by default;
  they do not need a Community Domain record. A linked Community Domain may
  block delivery through inactive lifecycle, Spotlight-off policy, or an
  explicit central-advertising exclusion. The tested requested case is 60
  simultaneous active promotions. Name/code search remains operator-facing;
  clan ids remain internal transport keys.
- The authenticated Community Marketplace rail requests five active broadcasts
  at a time and advances a bounded offset on each 30-second refresh, wrapping to
  the beginning after the eligible inventory is exhausted. The 60-promotion
  regression proves consecutive five-item batches are disjoint; the handset
  does not load the full inventory at once.
- New GSN house promotions use a bounded 10,000 global delivery-round pilot
  safety ceiling instead of the member default of 10. This is operational
  campaign capacity, not a per-person impression count. Raising it requires a
  measured capacity gate; an effectively unlimited counter was explicitly
  rejected as unsafe. Existing GSN-only ten-round rows move to the same bounded
  ceiling when next evaluated without losing their consumed-round history.
- Operator language now separates issued presentation leases (`Issued by
  GSN`) from server-accepted qualifying visibility (`Seen`) and distinct
  viewer accounts (`People who saw it`). The screen no longer presents the
  technical round counter as though it were an impression count. Issuance is
  not claimed as proof that a handset received the response.
- Default free-community advertising, Community Domain exclusion and
  delivery-time revalidation, platform-admin-only access, 24-hour expiry,
  idempotency, reference-safe media cleanup, non-endorsement, and audited
  emergency stop remain intact.
- Verification passed: all 12 GSN inventory/publisher tests in one complete
  run; 40 combined GSN, pacing, and
  presentation tests in the non-media run; an explicit 60-active-promotion
  regression; the bounded-inventory rejection test; a clean fresh-database
  Alembic upgrade to `20261023_parallel_gsn_house`; all three relevant frontend
  audits; and the 292-module production frontend build.
- GitHub Backend Tests run `40002436058` passed on the exact application
  commit. Trigger Render Deploy run `40002968467` then completed successfully,
  including its public frontend marker and live API identity-contract checks.
  Exact frontend deploy `dep-dbdqckebv0ns73bobnr0` and exact API deploy
  `dep-dbdqdvrrjlhs7381mnqg` both reached `live`; the API pre-deploy migration
  completed before traffic moved. Independent read-only requests returned HTTP
  200 from the frontend and an `ok = true` response from `/health`. The authenticated
  broadcast route correctly rejected the unauthenticated diagnostic request,
  so that request is not evidence of populated member inventory.
- The correction for active communities without a Community Domain passed all
  12 focused GSN-house tests, 45 related Spotlight eligibility/presentation
  tests, the frontend admin audit, Python compilation, and the 292-module
  frontend production build. Independent GitHub Backend Tests run
  `40006633161` passed on exact commit `2244a72e`. Trigger Render Deploy run
  `40007197230` completed successfully on that commit, including its public
  frontend marker and live API identity-contract checks. Exact frontend deploy
  `dep-dbdqr18k84hc73ea9vng` and exact API deploy
  `dep-dbdqrofb9u1s73b7e2r0` reached `live`; independent requests returned HTTP
  200 from the frontend and `{ok:true,dev_mode:false}` from `/health`.
  Production data already identifies `Homeland isa` as active community code
  `GMFN-C-000008` with no Community Domain row, which now makes it eligible by
  default. The authenticated catalogue response still requires confirmation
  from a signed-in platform-admin session; do not describe the public health
  checks alone as proof of that private response.
- Still not implemented in this slice: country/region audience targeting,
  viewer-local peak/off-peak scheduling, configurable 60/40 allocation,
  independent CDN proof, pagination beyond the 100-item pilot, or 100/1,000
  concurrent-viewer load results. Do not claim those capabilities yet.

## GSN house Spotlight controlled publisher - 2026-10-23

- Status: implementation and local verification are complete and this section
  ships with the fix. Exact commit, workflow, and deploy identifiers belong in
  the deployment report for the publishing session.
- Added platform-admin-only preview and publish routes for one 24-hour
  GSN-authored house campaign:
  GET /marketplace/admin/gsn-house-campaigns,
  GET /marketplace/admin/gsn-house-campaigns/destinations,
  POST /marketplace/admin/gsn-house-campaigns/preview and
  POST /marketplace/admin/gsn-house-campaigns.
- Added platform-admin-only operational routes:
  POST /marketplace/admin/gsn-house-campaigns/{campaign_id}/stop and
  POST /marketplace/admin/gsn-house-campaigns/media/discard.
- The destination catalogue lets staff find all communities by visible name or
  code and returns the current eligibility/reason, including active free
  communities with no Community Domain row, so the staff screen does not
  require typing hidden community IDs.
- Registered and implemented the platform-admin-only screen
  /app/command-center/gsn-campaigns. Its Command Centre card is hidden from
  community admins and the route remains inside the inner platform-admin
  guard. The screen uses the official GSN-HOUSE publisher hero, named
  destination search, eligible/blocked rows, one message, one prepared picture
  or verified short video, read-only review, explicit non-endorsement
  confirmation, final publish, current status, compact campaign history,
  truthful recorded-delivery metrics, an audited emergency stop, and a
  compact result/governance boundary.
- Media upload can occur while review is prepared but cannot publish by
  itself. A reviewed draft receives one idempotency identity that is reused on
  retry. Editing the message, destination set, or media invalidates the
  review and confirmation. Discarded unpublished reviews call a reference-safe
  cleanup route: only managed unreferenced media can be deleted, while media
  referenced by a surviving record is retained.
- Destination selection now follows the owner-confirmed advertising model. An
  active free community is eligible by default and does not need a Community
  Domain row. A linked Community Domain blocks delivery when its lifecycle is
  inactive, its Spotlight feature is off, or its active
  domain.central_advertising policy explicitly contains
  allow_gsn_house_campaigns: false. Preview and publish return every eligible
  and excluded destination with a reason. Canonical delivery eligibility
  re-checks exclusion state, so a later exclusion stops future delivery in
  that destination without deleting campaign or audit history.
- GSN house publication reuses the canonical Spotlight campaign, placement,
  content-version, eligibility, presentation, and evidence machinery. A
  reserved non-login GSN-HOUSE system publisher keeps the institutional
  publisher separate from the accountable platform-admin actor.
- Public payloads identify the content class and campaign provenance, label
  the publisher Global Support Network, expose no member shop/contact/detail
  action, carry no member trust signal or community endorsement, and consume
  no member free/paid advertising entitlement.
- Operational reporting exposes placement counts, current destination-policy
  decisions, canonical delivery rounds, issued presentation leases,
  qualifying-impression events, and distinct qualified viewer accounts. The
  API and screen explicitly do not relabel these as playback, completion,
  sales, or verified-human reach.
- Emergency stop permanently withdraws the canonical campaign and all of its
  placements, invalidates pending presentation leases, records one deduplicated
  TrustEvent with the signed-in admin as actor and GSN-HOUSE as subject, and
  preserves campaign/report history. Retrying stop is idempotent.
- This remains a controlled immediate-publish path, not the complete
  central-advertising product. There is still no scheduler, advertiser
  billing/refund product, regional audience targeting, playback/completion
  analytics, or independent GSN market. The multi-promotion inventory and
  GSN-specific bounded capacity amendment are recorded in the newer handoff
  section above.
- Verification passed: 8 focused GSN-house tests, including one canonical
  campaign across two opted-in communities and two members; 286 surrounding Spotlight
  eligibility, presentation, and Community Domain tests; all 72 Marketplace
  Public Shop tests; Python compilation; Spotlight controls, system-feed, and
  presentation audits; the 292-module production frontend build; targeted
  ESLint; the focused GSN-house frontend contract audit; admin route-guard,
  raw-action, and mobile route-coverage audits; and the complete
  protected-button freeze audit.
- Deployment was authorised after the verified implementation. The publishing
  session must stage only the files named by this work package, promote the
  same commit to main, verify Render acceptance, and run safe live checks.

## Q4 Spotlight and Community Domain amendment register - 2026-10-23

- The product owner asked that the complete Spotlight, Community Domain,
  organisational publishing, central advertising, playback, repetition, and
  campaign-capacity findings be preserved before assessing further ideas.
- The durable working register is
  [`GSN_SPOTLIGHT_COMMUNITY_DOMAIN_AMENDMENT_REGISTER_2026-10-23.md`](GSN_SPOTLIGHT_COMMUNITY_DOMAIN_AMENDMENT_REGISTER_2026-10-23.md).
- It separates confirmed current behaviour, verified gaps, owner directions,
  trial proposals, open decisions, rejected interpretations, staged work, and
  later acceptance scenarios. It specifically preserves existing member
  entitlements, qualification accounting, payment controls, evidence integrity,
  Community Domain visibility, and frozen Spotlight surfaces until an explicit
  amendment is approved and tested.
- The register began as documentation only. The bounded GSN house backend
  foundation above now implements part of its selected-community Stage 7
  workflow without changing schema, billing, member entitlement, delivery
  accounting, frozen frontend surfaces, or deployment state.

## Foreground session and Spotlight sound continuity repair - 2026-10-22

- Status: owner approved production deployment on 2026-10-22 after the complete
  local verification below. This handoff section ships with the application fix;
  exact commit, workflow, and deploy identifiers belong in the deployment report.
- Authenticated `/app/*` routes now perform a fresh `/auth/me` check when the
  app regains focus, returns to the visible foreground, or comes back online.
  A 401/403 performs the shared full logout cleanup and routes to sign-in
  instead of leaving a stale authenticated shell.
- Public Shop `/shop/:gmfnId` now applies the same stale-session outcome when
  its protected community/Spotlight reads return 401: clear the local session,
  open forced sign-in, and preserve the Public Shop return location. Ordinary
  transient/network errors still keep the last valid Spotlight and use the
  existing bounded retry behavior.
- Login now distinguishes an ordinary expired background session from an
  interrupted Spotlight publish. Ordinary resume says the previous sign-in
  expired while GSN was closed; publish recovery keeps its media-reselection
  warning and return target.
- Public Shop owns the Spotlight sound preference above each rotating media
  frame. After one successful Sound on tap, later video items request sound
  automatically until the user taps Sound off. The per-item media key remains
  intact so repeated media URLs still re-report readiness and preserve frozen
  qualification/accounting behavior.
- Browser truth: a fresh page/app process still starts muted because phone
  browsers require an explicit user gesture before audible autoplay. If a
  browser rejects audible playback for a new item, GSN remains muted and shows
  the sound action instead of falsely claiming that audio is playing.
- Verification passed: production frontend build; focused ESLint with zero
  errors (two pre-existing `SpotlightMediaFrame` dependency warnings); entry
  auth, Spotlight controls, Spotlight presentation, Public Shop button,
  startup-root, and route-fallthrough audits; and the full 14-scenario mocked
  phone Spotlight suite. The new phone cases prove expired Public Shop sessions
  are fully cleared/redirected and Sound on survives a two-video rotation until
  manually turned off.

## Active app-feed freshness repair - 2026-10-21

- The owner correctly reported that new posts could remain invisible until a
  manual refresh, sign-out/sign-in, or a long wait. Source inspection confirmed
  inconsistent behavior: some live surfaces polled, several loaded only once,
  and some repeated reads could still receive a 15-second startup cache.
- Community Home notices and Marketplace notices now refresh every 15 seconds
  while visible. Marketplace demand signals, public shops/products, and
  DemandBox rows refresh every 30 seconds. All refresh immediately when the app
  regains focus or returns from the phone background.
- Dashboard, Notifications, the companion alert layer, DemandBox, and Spotlight
  refreshes can now explicitly bypass the startup cache. A successful Spotlight
  publish also invalidates its local broadcast cache immediately.
- This is bounded near-real-time polling, not a false claim of WhatsApp-style
  instant server push. The repository has browser-push support, but true
  sub-second in-app state synchronization would still require a production
  WebSocket or Server-Sent Events channel and its operating infrastructure.
- Background refresh updates data without repeatedly showing full-page loading
  states. Polling runs only on mounted live surfaces and visible documents to
  avoid reloading the whole application or generating needless hidden-tab load.
- Scope is data freshness only. Navigation, route contracts, and frozen Market
  Wisdom presentation were not changed.

## Dashboard completed-request Attention Guide repair - 2026-10-21

- Production evidence for user `13` showed no open DemandBox request: all
  matching requests were expired or cancelled. Join request notification `523`
  for request `20` had also been marked read at 10:38 UTC after the decision.
- Root cause: the dashboard treated the historical `approval_request`
  notification as an actionable item merely because its copy contained
  “approve”, then mapped every generic act-now notification to the `demand`
  operating class. That produced the false “request still needs your answer” /
  “Open Demand” guide after the join request had been handled.
- The live pending-join-request collection is now the approval source of truth;
  historical approval notifications no longer keep the Attention Guide active.
  Generic act-now notifications also no longer masquerade as DemandBox work.
- Dashboard open-demand state now refreshes on focus, visibility return, and
  every 15 seconds, matching the existing join-request and notification refresh
  discipline so a closed, fulfilled, cancelled, or expired demand is removed
  without requiring a full reload.
- Scope is limited to dashboard attention classification and refresh behavior.
  The frozen Market Wisdom presentation was not changed.

## Spotlight visible-rotation reliability repair - 2026-10-19

- Status: application commit `573da206` was pushed unchanged to
  `codex/spotlight-rotation-continuity` and `main`. GitHub Render workflow
  `39293129304` completed successfully for that exact commit. Frontend deploy
  `dep-dbb52b2gjjms73d2akt0` reached `live`, then the workflow's second
  exact-commit request superseded it with current live deploy
  `dep-dbb52bc768vs73auuqa0`. API deploy `dep-dbb538qfngtc739utnpg` remains
  `live`. The workflow verified the public frontend build and live API
  contracts; an independent check returned HTTP 200 from the frontend and
  `{"ok":true,"dev_mode":false}` from `/health`.
- Immediate post-deploy monitoring found one live API instance, no error-level
  logs, and no HTTP 5xx after rollout. Memory settled near 279 MB of 512 MiB
  and CPU was low. This is a clean short observation window, not proof against
  a later phone-specific or traffic-dependent failure.
- Production evidence before the fix showed campaign `329` active and serving
  with valid media and a 2026-10-20 16:27:35 UTC authorization deadline, but
  still at zero of ten rounds. Viewer `13` had an issued presentation lease
  at 16:27:37 UTC that expired unqualified with no exposure. The viewer was
  eligible and correctly mapped on the owner's Public Shop route.
- Root cause was three-part: Public Shop requested a 30-second canonical lease
  during page load while the Spotlight rail was still below the viewport; the
  queue-wide interval could give a newly inserted item only the remainder of
  the previous item's dwell; and one expired unqualified lease permanently
  excluded that viewer from the campaign version.
- Public Shop now activates canonical selection only after the Spotlight rail
  is genuinely visible, keeps live Spotlight expanded on phone, and gives each
  media-settled active item its own complete visible dwell. Hidden, off-screen,
  focused, and interaction-paused time does not consume that dwell. Cached
  image/video readiness is reported reliably, and double-normalized Spotlight
  rows retain their WhatsApp field.
- The backend now allows exactly one same-viewer recovery after an expired
  unqualified lease. A second abandonment still blocks that viewer/campaign
  version. Neither attempt spends a round; qualification accounting remains
  unchanged.
- Verification passed: all 14 backend presentation-contract tests, seven
  transaction safeguards, the Spotlight presentation and Public Shop button
  audits, the complete protected-button freeze audit, the production frontend
  build, and all 11 mocked phone-browser Spotlight scenarios. Five
  PostgreSQL-only concurrency cases were collected but skipped because no
  external PostgreSQL test URL was present. The phone suite proves no
  canonical request occurs off-screen, visible ready media qualifies, every
  replay item keeps readable dwell, media failure remains uncounted, rejected
  qualification retries, and expired contact is removed.
- Frozen boundaries unchanged: ten global rounds, five-second pilot dwell,
  community eligibility, frequency caps, self-delivery exclusion, paid/free
  separation, and Shop Diary separation.

## Spotlight false short-duration rejection repair - 2026-10-19

- Status: application commit `d4a97502` was pushed unchanged to
  `codex/spotlight-rotation-continuity` and `main`. Direct Render API deploy
  `dep-dbb3sj0473hc73chpk2g` reached `live` from exact commit
  `d4a97502d872a3590bf5e81c67252ed340e71272` at 16:02:05 UTC. The live
  `/health` response was `{"ok":true,"dev_mode":false}`. Initial
  post-deploy memory was about 264 MB of 512 MiB with one live instance.
- The owner screenshot showed a clearly playable multi-second preview alongside
  `The video must be at least 1 second long.` Production logs independently
  confirmed `POST /marketplace/media/video` returned HTTP 400 at 15:52:24 UTC
  and no publication request followed. This was not a connection failure and
  not evidence that the member failed to press Publish.
- Root cause: lightweight source-container inspection can report zero or a
  sub-second duration for an otherwise decodable phone/social-media video.
  The API previously treated that single source metadata value as final and
  rejected the upload before FFmpeg could produce the standard GSN MP4.
- Source duration validation is now deferred only inside the normalisation
  path. Width, height, frame rate, aspect ratio, file ceiling, decoding, and
  processing checks remain active before/during preparation. The generated
  MP4 is then inspected normally and must still meet the unchanged one-second
  minimum; a genuinely 0.4-second output remains rejected.
- Verification passed: 14 focused media-quality tests, including unreliable
  source-duration recovery and genuine sub-second rejection; all 72
  Marketplace Public Shop tests; Python compilation; and scoped diff checks.
- The controlled real-phone retry succeeded. Production recorded video upload,
  publication, authoritative status refresh, and MP4 range playback as HTTP
  200/206 at 16:09 UTC. Campaigns `327` and `328` were then active and
  serving with six and three video-backed placements respectively; both had
  already recorded one qualified showing out of ten and had exact 24-hour
  authorization deadlines.
- Post-success monitoring showed one stable instance, no restart/OOM event and
  no HTTP 5xx after rollout. Memory rose during the two phone video workflows
  and then held flat near 326 MB, about 61% of the 512 MiB limit. The only
  error-level log family was the pre-existing trapped bcrypt version warning,
  not a Spotlight or media-processing failure. Continued observation remains
  appropriate because this short stable window is not proof against a slow
  leak. GitHub Backend Tests run `39281965910` was still queued at the prior
  handoff; direct Render deployment was used because API auto-deploy is
  disabled.

## Spotlight API memory containment - 2026-10-19

- Status: application commit `c7761bb8` was pushed to
  `codex/spotlight-rotation-continuity` and `main`. Render API deploy
  `dep-dbb3k4ks728c73a9jodg` first reached `live` from that exact commit at
  15:43:59 UTC. A second exact-commit deploy,
  `dep-dbb3kd93brkc73ba59d0`, had already been accepted and superseded it at
  15:47:14 UTC. The final live `/health` contract returned
  `{"ok":true,"dev_mode":false}`; Render recorded `server_available` and
  successful `deploy_ended` events with no new failure or OOM event. The API
  briefly closed a health connection only while the second instance was
  actively replacing the first.
- The owner-provided Render email was a real infrastructure failure, not merely
  confusing browser copy. Render recorded two `gmfn-api` out-of-memory kills
  against its 512 MiB limit at 12:46:44 UTC and 14:52:53 UTC. The second
  occurred immediately after an API rollout; the first had no completed
  request log, so it may have died during an in-flight request.
- The evidence does not prove that the reported video alone caused both kills.
  The one completed production video upload at 14:16:12 UTC returned 200 and
  the three following publish attempts returned the already-repaired 400 quota
  response. Nevertheless, FFmpeg previously sized decoder, filter, and x264
  thread pools from available CPUs while the Python API commonly sat around
  300-340 MB, leaving unsafe transient headroom on a 512 MiB service.
- Video inspection, audio probing, filtering, and H.264 encoding are now
  explicitly limited to one FFmpeg worker thread. This contains transient
  memory without lowering the approved hard-quality floor, forcing 720p,
  removing audio, changing the 10-second public clip, or changing the
  1280-pixel output cap.
- Production data inspection found no partial new Spotlight campaign from the
  failed attempts. Campaign 326 remains the historical withdrawn media-less
  row; no later campaign exists for that owner.
- Verification passed: all 12 media-quality/backend tests, including real
  `576x1296` normalization and the new decoder/filter/encoder thread-cap
  regression; all 72 Marketplace Public Shop tests; Python compilation; and
  scoped whitespace checks. After the final rollout settled, the new instance
  used about 260 MB of its 512 MiB limit, reported one live instance, and had
  no error-level logs.
- Residual truth: this is evidence-based containment, not proof that the whole
  API can never exceed 512 MiB. A single authenticated phone retry is still
  required. If OOM recurs with the thread cap, stop retries and either isolate
  video preparation into a worker or approve a larger instance after profiling;
  do not keep blaming the browser or silently raise media-quality rejection.
- GitHub Backend Tests run `39278746231` and Trigger Render Deploy run
  `39279689499` were still queued without runners at handoff time. The direct
  Render deploy was used because API auto-deploy is disabled and returned the
  exact deploy id above.

## Spotlight same-file phone-picker recovery - 2026-10-19

- Status: application commit `0a9de704` was pushed to
  `codex/spotlight-rotation-continuity` and `main`. GitHub Render workflow
  `39277028352` passed and verified the public frontend. Render frontend deploy
  `dep-dbb3af1124ks73eteik0` reached `live` from that exact commit.
- Fresh production evidence after the earlier quota repair showed no image,
  video, or publish request reaching the API from the reported retry. The
  current failure was therefore in the phone browser before upload rather than
  another API rejection.
- Root cause: mobile file inputs can suppress the change event when the same
  file is chosen again. That leaves the prior media error visible and never
  starts preparation. Some phone pickers can also return a selected video
  through the picture input or a selected picture through the video input.
- Both Spotlight picker actions now clear their native input before opening so
  the same file always triggers selection again. Shop Control also identifies
  the selected file from its supported extension and browser media type and
  routes it to the correct picture or video preparation path instead of showing
  a misleading format error from the wrong path.
- Server inspection remains authoritative. This repair changes phone selection
  and recovery only; it does not bypass decoding, video normalization, the
  practical hard-quality floor, the ten-second output limit, or media-backed
  publication requirements.
- Verification passed: Spotlight controls audit, media-quality audit, Shop
  Control inventory, full protected-button freeze, scoped whitespace check,
  and the 291-module production frontend build. Focused lint still reports four
  pre-existing unused destructured properties in the extracted Spotlight
  component; the repair did not widen into that unrelated cleanup.
- Unabated truth: automated checks prove the retry and routing contracts in
  source and the exact commit is live, but the affected physical phone must
  still choose the same video once more to prove its browser-specific behavior.

## Usable social-video quality correction - 2026-10-19

- Status: committed as `4a1ecef6`, pushed to the working branch and `main`,
  and deployed to both Render services from that exact commit.
- Real-device evidence from My family my pride showed that the shared media
  gate rejected a clear `576x1296` downloaded portrait solely because its
  short edge was below the former 720-pixel rule. That same file would then
  have failed the former 1.85:1 shape rule.
- Owner-approved behavior now treats 720p as guidance rather than a hard
  requirement. The authoritative hard-rejection floor is a 360-pixel short
  edge, 15 fps, and maximum 2.4:1 aspect ratio. This accepts the reported
  `576x1296` social portrait while still rejecting genuinely tiny, very
  choppy, extremely narrow/wide, unreadable, or unprocessable media.
- Server preparation remains mandatory and unchanged in purpose: inspect the
  real file, retain only the opening 10 seconds, cap the long edge without
  upscaling, re-encode to web-safe MP4/H.264, bound the result to 15 MB, and
  modestly normalise existing audio. It improves compatibility and consistency
  but does not recreate missing image detail or claim AI enhancement.
- Verification passed: all 11 focused FFmpeg/backend media-quality tests,
  including generated `576x1296` acceptance and normalization; media-quality
  audit; Spotlight controls audit; full protected-button freeze audit;
  production frontend build; focused lint; Python compilation; and scoped
  whitespace checks.
- GitHub Backend Tests run `39264309841` passed for `4a1ecef6`. Trigger Render
  Deploy run `39264321311` then confirmed frontend deploy
  `dep-dbb22m72d8hs73e7uk80` and API deploy `dep-dbb2403rjlhs73b4rshg` live,
  verified the public frontend build marker, and passed the live API identity
  contract checks.
- Unabated truth: the generated regression matches the reported dimensions and
  processing path, but the exact Sweetlove source file is not in the workspace.
  Retrying that file on the phone remains the final acceptance test after
  deployment.

## Spotlight video stale-iPhone recovery - 2026-10-19

- Status: deployed from application commit `10a900c6` on
  `codex/spotlight-rotation-continuity` and `main`. GitHub workflow
  `39255800176` completed successfully. Render reports frontend deploy
  `dep-dbb16dlttamc738s52dg` and API deploy
  `dep-dbb17nrncjis73aphbog` as live.
- Root cause: the affected installed iPhone shortcut was still running an old
  frontend bundle that allowed a Spotlight draft to reach Publish with no ready
  media. The current frontend correctly requires ready picture/video media, and
  the current backend correctly rejected the stale client's blank publish.
- `frontend/src/lib/pwaInstall.ts` now checks the deployed shell signature on
  installed iOS shortcuts and offers one explicit update/reload prompt instead
  of silently excluding iOS. It preserves the anti-reload-loop protections,
  does not reload without acceptance, and postpones prompting while a file is
  selected, an action is busy, or the page is hidden.
- The Marketplace Spotlight missing-media error now tells stale clients to
  close and reopen GSN, choose Add video, and wait for Video ready. Static
  frontend and backend regression assertions cover both recovery paths.
- Verification passed: frontend production build, focused PWA lint and syntax
  checks, Spotlight controls audit, media-quality audit, two focused backend
  tests, Python compilation, and scoped whitespace checking. The broad link
  audit remains blocked by an unrelated pre-existing Community Home expectation;
  the Web Push readiness audit remains blocked by unrelated existing manifest
  display-mode changes.
- Post-deploy verification passed: the exact frontend and API Render deploys
  reached `live`, the public frontend check passed, the live API contract audit
  passed, the main-branch backend test workflow passed, and the public main
  bundle contains the new iPhone update-prompt marker.
- Unabated truth: an already-running stale iPhone bundle cannot receive this
  new prompt until it is closed and reopened once. Automated checks do not
  prove Safari/iOS lifecycle behavior on the affected physical phone, so a
  real-device upload remains the final post-deploy acceptance test.

## Verified local live phone-verification foundation - 2026-10-19

- Status: implemented, verified, and committed locally in the OTP work commit;
  not pushed, deployed, or live-provider activated. Production remains deliberately
  `registration-only` with the phone-provider kill switch off until real
  Twilio Verify credentials, a Verify Service, funded Pipeline Credits, and a
  controlled-number test exist.
- One shared fail-closed service now owns public-entry and signed-in phone
  delivery. Twilio Verify is the first adapter. Every start/resend reserves an
  abuse-limited attempt, debits the `phone.sms_or_verify.delivery` Pipeline
  Credit gate, then calls the provider. GSN reports delivery only after a
  provider receipt and records ownership only after provider status
  `approved` with `valid=true`.
- New preview codes are HMAC-digested rather than stored in plaintext; live
  codes are never generated or stored locally. Preview and live checks share a
  five-attempt default. Live sends default to a 60-second cooldown, three sends
  per session, and five sends per phone/window. Provider responses are reduced
  to non-secret receipt/status fields.
- Signed-in start no longer overwrites `User.phone_e164` or leaves an old
  `phone_verified_at` attached to a new unconfirmed number. Candidate sessions
  bind to `owner_user_id`; the user phone changes only after confirmation.
  A start event is now `identity.phone_verification_started`, so TrustSlip and
  Identity Integrity do not present an unconfirmed candidate as recorded phone
  evidence.
- Public and signed-in resend routes and UI are present. Preview mode no longer
  auto-confirms itself. Live UI distinguishes provider-receipted delivery from
  ownership approval and exposes a rate-limited resend.
- Migration head is
  `20261019_phone_verification_provider_audit_v1`. The architectural and
  activation decision is recorded in
  `docs/GSN_PHONE_VERIFICATION_PROVIDER_DECISION_2026-10-19.md`.
- Verification: 82 focused backend tests passed after the final fail-closed
  tightening. The full backend run produced 1,503 passes, 16 skips, and 16
  Windows-temp setup errors with no assertion failures; the 16 blocked tests
  then passed under an escalated writable base temp, giving 1,519 unique
  backend passes and 16 skips. The 290-module frontend production build,
  entry/auth audit, member-entry audit, and complete protected-button freeze
  passed. `render.yaml` parsed successfully and Alembic reports the new single
  head.
- Render Blueprint guidance affected the rollout: secrets are represented only
  as `sync: false` keys, and the deployment guide warns that existing Render
  services must set them in the Dashboard because later Blueprint syncs ignore
  new `sync: false` prompts. The current Render documentation fetch returned
  no readable content in this environment, so the local bundled Render guidance
  and YAML parsing were used; Render CLI validation was unavailable.
- Follow-up route-boundary hardening now carries service cooldowns into a
  standard HTTP `Retry-After` header while preserving the structured
  `retry_after_seconds` response detail. Public and signed-in start, confirm,
  and resend boundaries all use the shared error-header mapping.
- Mocked-provider HTTP tests now prove the public and signed-in live-provider
  paths require a provider receipt, expose no preview code, and attach a
  signed-in phone only after provider confirmation. Separate ownership tests
  prove a signed-in member receives `403` before any provider confirm/resend
  call can run against another user's session. This remains local evidence;
  it does not prove real Twilio delivery.
- Verification for this follow-up passed 83 relevant backend tests across the
  phone service, new route suite, public entry, signed-in identity, and input
  boundary files. The isolated service/route pair passed 9 tests; Python
  compilation and scoped diff checks also passed.
- Activation-preflight review then found and closed a reporting gap: the admin
  API-readiness diagnostic could say phone delivery was `live_ready` while the
  global payment-operations switch was off, even though the mandatory Pipeline
  Credit debit would block every provider call. Phone readiness now also
  requires `GSN_PAYMENT_OPERATIONS_ENABLED=1` and otherwise reports
  `blocked_payment_operations_disabled`. This is diagnostic truth only; the
  switch remains off and no provider or payment operation was activated.
- Phone `live_ready` also now requires the configured Pipeline Credit account
  to exist, the configured cost to be a valid positive monetary amount, and
  the ledger balance to cover at least one attempt—not merely non-empty account
  and cost environment variables. Missing accounts, invalid costs, and
  insufficient balances retain an exact spend-gate status instead of being
  mislabeled ready.
- The combined phone, public-entry, signed-in identity, diagnostics, and
  Pipeline Credit regression band passed 115 tests after these preflight
  corrections.
- Product-owner decision: keep OTP attached to the shared Pipeline Credit
  boundary and do not introduce a phone-specific spend bypass. Live OTP should
  remain inactive until Pipeline Credit operations are formally activated and
  funded; `registration-only` is the intended state in the meantime.

## Verified local My GSN/Profile clarity and resilience batch - 2026-10-18

- Status: the implementation was committed as `45a8f383` (`Simplify My GSN
  and guard Profile loading`) and the complete wording batch was released from
  exact app commit `bab697155e74c355a8fef901b8b3901cf8695105` through Render
  deploy `dep-dbajl0c9v7es738pbt7g`. GitHub Actions run `39168144033`
  completed successfully and verified the public frontend asset graph.
- This resolves the Profile first-paint failure recorded in the Community Home
  batch below. The failure was a real blank-page crash, not a slow route:
  `/app/profile` redirected correctly, but the collapsed `My Pipeline Credits`
  section assumed every successful catalogue response contained `packs` and
  read the first item from an absent array.
- The Pipeline Credit component now validates balance, catalogue, and purchase
  payloads before using them. Incomplete or malformed responses produce safe
  unavailable/empty states while the rest of My GSN remains usable. Purchasing
  and spending remain paused for the free pilot; no provider, payment, route,
  permission, catalogue-authority, or activation rule changed.
- My GSN and its lower guide now replace internal ownership, handoff,
  orientation, footprint, source-page, queue, and protected-page wording with
  direct member instructions. Examples include `Open Notifications to see and
  act on every item`, `Use Shop Control to change products`, `Create or join a
  community to see it here`, and `Sign in to open your account`. The frozen
  phone structure, selected-community continuation, More disclosure, Settings,
  Companion controls, and all routes/actions remain unchanged.
- The app-tab first-paint audit now reports page URL, body text/HTML, and React
  page errors on future failures. This diagnostic change does not affect app
  runtime behavior.
- Verification passed the Pipeline Credit, surface-ownership,
  capability-mirror, and member-entry audits; the complete protected-button
  freeze suite; the 290-module production build; and the full real-browser
  app-tab first-paint suite. Profile rendered its first phone surface in
  1.791 seconds in that run, My GSN rendered in 1.333 seconds, the compatibility
  redirect settled on `/app/my-gmfn-and-i`, Settings/Companion states passed,
  and no horizontal overflow was found.

## Verified local Community Home novice wording batch - 2026-10-18

- Status: originally committed as `46bf3b8d` (`Simplify Community Home member
  wording`) and deployed as part of exact frontend app commit `bab69715`.
- `/app/community` and `/app/community/:clanId` retain the frozen
  selected-community identity hero, immediate Bulletin, actionable attention,
  five Community actions, conditional switcher, personalised Invite, and
  authority-gated Admin area. No route, action, permission, data call, count,
  disclosure, or mobile geometry changed.
- The no-community state now says `No communities yet` and explains directly
  that the member has not created or joined one. Its recovery actions now read
  `Create community`, `Set up Community Domain`, `Invite your first
  people`, and `Back to Dashboard`. The optional create/join/First Circle
  guide no longer exposes internal `lane`, `verification/work evidence`,
  or repeated-registration language.
- The selected-community hero now labels the signed-in position as `Your
  role`. Desktop destination explanations describe what the member will find
  in Marketplace, Manage shop, Finance, Support, and Trust. Attention and
  authorised administration use direct announcement language such as `Please
  confirm you saw this`, `Send announcement for review`, and
  `Announcements waiting for review`.
- Matching frozen specs, wording contracts, billboard expectations,
  first-paint text, and self-service inventory wording were updated. The older
  domain/admin browser smoke was corrected to open `Community actions`
  before Marketplace, and its switcher fixture now truthfully provides two
  ordinary communities. It also covers the rendered novice no-community
  surface and horizontal containment.
- Verification passed all three Community Home focused audits, the complete
  protected-button freeze suite, the 290-module production build,
  `smoke:community-home-simple-phone`, and the expanded
  `smoke:community-home-domain-list`. The latter covers route reconciliation,
  Marketplace handoff, ordinary-community switching, Community Domain admin
  gating, the novice empty state, and 390x844 containment.
- Remaining truth: the broader `audit:app-tab-first-paint` is not fully
  green. After its stale Marketplace phone-capitalisation expectation was
  corrected, it advanced to Profile and repeatedly timed out waiting for
  `[data-my-gsn-member-home="true"]`. No Profile application code changed in
  this batch, but that separate Profile audit failure has not yet been
  diagnosed. The generated empty-state screenshot exists locally; the image
  viewer itself was blocked by the Windows split-root sandbox, so visual
  inspection was not claimed.
- Phone OTP and Pipeline Credit were not changed or activated.

## Verified local Marketplace novice-first wording batch - 2026-10-18

- Status: originally committed as `31f7e847` (`Simplify Marketplace member
  wording`) and deployed as part of exact frontend app commit `bab69715`.
- `/app/marketplace` keeps the frozen selected-community, needs-first structure
  and the same actions, data, permissions, and routes. Its front wording now
  explains open requests, shops that may be able to help, possible matches,
  shops for other requests, and the member's recorded money in that community
  instead of exposing request-lifecycle, provider-connection, shop-face, local
  net-position, or scoped terminology.
- The no-community state now leads with `Choose a community to use Marketplace`
  and one primary `Choose community` action. Secondary choices now say `More
  things you can do`, `Links to share`, `Promote a shop`, and `Record a trade`.
  The task finder gives ordinary examples and uses `Show me where`.
- `May be able to help` remains deliberately neutral: it is still the existing
  DemandBox possible-match response in backend order, not GSN approval,
  recommendation, ranking, guarantee, or promised availability. Neutral Shops
  & Services discovery and Public Shop handoff are unchanged.
- Verification passed the 290-module production build, every Marketplace audit,
  and the complete protected-button freeze audit. The 390x844 Marketplace hero
  browser smoke passed selected-community/domain scope, revised phone wording,
  retired-wording absence, horizontal containment, and stat containment. The
  Marketplace lane-boundary browser smoke also completed successfully across
  marketing, trade, members, support chooser, and support-loan scenarios.
- Three stale audit assumptions were corrected while proving the batch: the
  line audit now distinguishes 93 native stable controls from the separate
  `Add request` workflow-plus control counted by the 94-action inventory; the
  money-lane audit now protects the current Needs/Add-request front instead of
  a removed `ask-for-something` control; and the broad action audit now expects
  the current `Shop Update` label and products-first visual contract. No app
  control was removed to make an audit pass.

## Verified local Public Shop wording batch - 2026-10-18

- Status: originally committed as `8bdbdd2f` (`Simplify Public Shop customer
  wording`) and deployed as part of exact frontend app commit `bab69715`.
- The Public Shop now presents product counts, focused products, and shared
  products as `shop item` / `shop items` instead of exposing the internal word
  `block`. Internal route parameters, anchors, product-slot contracts, and API
  data remain unchanged.
- Owner Spotlight states now use direct wording including `All showings used`,
  `Needs correction`, `No Spotlight saved`, and `Not showing`. Delivery-counter,
  presentation, placement, and cache terminology was removed from member-facing
  explanations. Spotlight timing, qualification, rotation, accounting,
  permissions, and expiry behavior did not change.
- Verification passed the 290-module production build, the Public Shop button
  inventory, broad link contracts, Spotlight presentation and system-feed
  audits, both Shop Diary audits, three-plus shortcuts, institutional proof
  surfaces, and the complete protected-button freeze audit. The 17-scenario
  real-browser phone smoke passed at 360, 390, and 430 pixels. Automated body
  checks confirmed the retired wording is absent in the relevant empty,
  focused-product, and live-Spotlight cases. This is local synthetic coverage,
  not an authenticated production write or a deployment claim.

## Deferred operational activation priorities after wording - 2026-10-18

- **Phone OTP is provider-capable but not live-provider activated.** The
  repository now contains a Twilio Verify adapter, Pipeline Credit spend gate,
  audit fields, rate limits, resend routes, and fail-closed UI. Production stays
  `registration-only` and the provider kill switch stays off until credentials,
  credits, account approval, country coverage, and a controlled handset test
  are proven. Local mocked-provider tests do not prove real SMS delivery.
- **Pipeline Credit purchasing and spending are not operationally activated.**
  The repository contains substantial ledger, catalogue, spend-gate,
  diagnostics, Stripe purchase, and expected bank-payment/top-up foundations,
  but the member surface explicitly keeps purchases and spending paused for
  the free pilot. Provider readiness and cost controls must pass before any
  paid operation is opened.
- The product owner's sequence is preserved: finish the wording/presentation
  cleanup first; then complete live phone OTP delivery and the GSN Pipeline
  Credit channel as separate, tested activation work. Existing community/bank
  transfer remains the current payment method. Do not invent another transfer
  engine or activate bank/provider verification as part of this wording batch.

## Current production baseline - 2026-10-18

- Production branch: `main`.
- Current verified frontend application commit:
  `bab697155e74c355a8fef901b8b3901cf8695105`.
- Frontend Render deploy `dep-dbajl0c9v7es738pbt7g` reached `live` on that
  exact commit. Trigger Render Deploy run `39168144033` completed successfully
  with `deploy_api=false` and verified the public frontend asset graph.
- Current verified API application commit remains
  `f25ed01b271480b1e8927c36c4bd17b018ab4afe`; API Render deploy
  `dep-dbahcvrncjis73djcrb0` remains the live API release because this
  frontend-only batch changed no backend files.
- Main-branch Backend Tests run `39156093134` completed successfully before
  deployment.
- Independent post-deploy requests returned HTTP 200 from the frontend index,
  `/app/profile`, and `/app/my-gmfn-and-i`. The deployed My GSN asset contains
  `See your identity, communities, shop, trust, and account in one place`,
  `Use Shop Control to change products`, and `Create or join a community to
  see it here`, proving the new member wording is being served publicly. The
  prior API release checks returned HTTP 200 from `/health` and
  `/marketplace/media/ping`; health reported
  `{"ok":true,"dev_mode":false}` and the media router reported active. The
  live frontend bundle contained the product-media visibility marker, and the
  live API rejected an unqualified `product_open` request with HTTP 422.
- The current frontend release adds the plain-language Shop owner presentation
  on top of focused exact-product management, ordinary Gallery/Diary task
  separation, visible phone result continuity, and an exact-product Public Shop
  continuation after successful saves. The API
  retains the prior qualification-time Spotlight delivery accounting,
  product-media attention, permanent-deletion, retention, and media-quality
  contracts.

## Deployed Shop Gallery plain-language cleanup - 2026-10-18

- Status: committed as `c3b8e1462fc516c0f3e42993e6954fd84809b1e4`,
  pushed unchanged to the working branch and `main`, deployed as frontend
  release `dep-dbaiir72d8hs73dtrsag`, and independently verified from the
  public frontend.
- The ordinary `/app/shop-control` Shop Gallery owner task now leads with
  `What do you want to change?` and three direct shortcuts: `Change shop
  picture`, `Write shop update`, and `Add more selling space`. The long
  billboard/block/capacity explanation was removed from this first decision
  surface.
- The Products & Services task now presents the existing numbered-slot system
  as `Your shop items` and `shop spaces`. Owners see `Add item`, `Shop item`,
  `Available`, `Ready to use`, and `Post item` instead of `block control`,
  `numbered blocks`, `Empty block`, and `Post product`. Full-capacity,
  missing-media, save, and delete results use the same plain language.
- The standalone `/app/shop-assets` Pictures & Products workbench now leads
  with `Manage your shop`, `At a glance`, and `Start here`. Its editor says
  `Add shop or Vault item`, saved content is grouped under `Your saved items`,
  and copy confirmations say `Shop link and message copied` rather than
  referring to a technical package.
- The existing paid-capacity destination is now presented as `More shop &
  community space`. It leads with `Choose what you need`, explains the
  bank-transfer confirmation in one short paragraph, shows the unchanged GBP
  1 / GBP 60 pricing plainly, and labels its choices as one more shop space,
  one more member place, ROSCA for one year, and meeting support. `ROSCA
  engine` and `Meeting pack engine` became `Run a ROSCA cycle` and `Plan a
  community meeting`; their routes and actions are unchanged.
- The exact-product task now says `This is the shop item you opened` and
  `Manage this shop item`. Exact product/block IDs are still carried in the
  route and backend contract, but the owner no longer has to interpret the
  internal word `block`.
- The six-slot data model, selected-slot persistence, routes, API calls,
  Marketplace Shops policy, exact-product Change/Delete flow, permanent
  deletion semantics, Shop Diary separation, Spotlight behavior, and frozen
  Market Wisdom area did not change. `block` remains an internal contract term
  and is still allowed in technical audits/docs.
- Verification passed the 290-module production build, Shop Assets slot audit,
  Shop Control button inventory, three-plus shortcut audit, institutional
  evidence-surface audit, and the complete protected-button freeze audit. The
  expanded 390x844 local phone flow passed and completed mocked Add/Save,
  exact-item return, focused Save/Delete, Diary separation, standalone
  Pictures & Products language, and the deeper paid-space language with no
  navigation business write. It writes three visual checkpoints:
  `shop-gallery-plain-language-390x844.png`,
  `shop-assets-plain-language-390x844.png`, and
  `shop-community-space-plain-language-390x844.png` under
  `frontend/screenshots/`. This is synthetic local interaction coverage, not
  an authenticated production write. Deployment was separately verified by
  Render and by the public route/asset checks recorded above.
- The broad `audit:link-contracts` command now passes after the stale Public
  Shop install-prompt and automatic Shop Update jump assertions were corrected
  in the audit-only follow-up recorded below.

## Public Shop visitor-link audit correction - 2026-10-18

- Status: test-contract correction committed as
  `551bd334f4f5d56e69ec6789c2a117ec35a90eda`. It changes no application bundle,
  backend route, data, permission, or runtime behavior and therefore requires
  no Render application deployment.
- Investigation proved that the three previously reported broad-link failures
  were stale audit expectations, not three live `ShopGalleryPage.tsx` defects.
  One demanded a Public Shop install prompt even though the current phone spec
  and frozen visual smoke require that unrelated prompt to stay off the visitor
  surface. Two demanded automatic root-link movement to Shop Update even though
  the current screen contract requires ordinary visits to keep shop identity
  and Products & Services first.
- `audit-link-contracts.mjs` now protects the current contract: no Public Shop
  install component, no root-link Shop Update jump, and automatic reveal only
  for explicit hash, product, block, or exact shared-update targets.
- The Shop Diary real-browser smoke still pointed its owner scenarios at the
  now-products-only Gallery Tools route. Those scenarios now use the dedicated
  `#shop-assets-diary` owner task while retaining the separate visitor deep-link
  scenarios.
- Verification passed the broad link-contract audit, both frozen Shop Diary
  audits, Public Shop button inventory, the complete protected-button freeze
  audit, and the 290-module production build. The 17-scenario phone smoke passed
  at 360/390/430 widths. Its ordinary 430px visitor case kept Products &
  Services before the closed `More from this shop` row, placed Shop Update
  farther down, and rendered no install prompt. The exact shared-update case
  alone opened and focused Shop Update; the live-Spotlight case opened the
  secondary row without using a Shop Update root jump.

## Deployed Shop Gallery task separation - 2026-10-18

- Status: committed, pushed to the working branch and `main`, deployed on
  frontend application commit `069606562baea9e345035e2d730e66281f367bb3`,
  and independently verified from the public frontend.
- Ordinary `Shop Gallery Tools` now presents one owner task at a time. Its
  default embedded surface shows Products & Services only. `Write diary
  update` opens Shop Diary only, and Shop billboard continues to use the
  separate Shop Details task. The standalone Pictures & Products route keeps
  its complete multi-section workbench.
- A real cross-feature defect was corrected: product Add/Edit/Save had been
  gated by Shop Diary policy. Product management now obeys Marketplace Shops
  policy only; a community may disable Shop Diary without disabling product
  management.
- A second ordinary-phone defect was corrected: a save, delete, or blocked
  quick-add could refresh the compact numbered-block disclosure closed and
  hide the result. The affected block now remains open, its local outcome
  stays visible, and focus returns to that result.
- Successful ordinary public-product saves now offer one
  `View product in public shop` action addressed to the exact saved product
  and block. Failed saves, deletes, and pending-review submissions do not
  receive that live-product continuation.
- Local verification passed the 290-module production build, Shop Assets slot
  audit, three-plus shortcut audit, both frozen Shop Diary audits, and Shop
  Control button inventory. The 390x844 mocked phone smoke proved Products
  and Diary never appear together in the embedded route, Shop Diary OFF still
  leaves `+ Add product` enabled, Diary publishing stays disabled, task
  navigation performs no business write, and an ordinary mocked product save
  reopens and focuses the visible block result before exposing the exact saved
  product Public Shop URL.
- No backend route, permission, schema, deletion rule, Marketplace behavior,
  Spotlight logic, or frozen Market Wisdom presentation changed. The
  authenticated save/delete browser coverage uses a synthetic local API; the
  public post-deploy check verifies the production code, not a live
  authenticated production write.

## Deployed exact-product usability cleanup - 2026-10-18

- Status: committed, pushed, deployed in frontend application commit
  `069606562baea9e345035e2d730e66281f367bb3`, and independently verified
  from the public frontend asset.
- The owner-only Public Shop product-management `+` still opens the existing
  Shop Gallery Tools workflow, but its focused route no longer places the
  generic Shop Gallery introduction, Shop billboard, Diary, or Marketplace
  capacity shortcuts ahead of the requested product.
- The desktop task header is labelled `Manage product`; the compact phone
  route goes directly to `Manage this public block`. Its visible Public Shop
  return resolves to the exact product/block. Successful saves expose
  `View updated product` beside the block result. Permanent-deletion success
  and failure now remain visible beside the affected block; success offers
  `Back to public shop`, while the emptied block keeps its existing re-upload
  action.
- Exact-product permissions, deletion semantics, media rules, backend routes,
  Marketplace behavior, and frozen Market Wisdom presentation did not change.
- Verification passed the Shop Assets slot audit, three-plus shortcut audit,
  Shop Control button inventory, 290-module production frontend build, and the
  complete protected-button freeze audit. The 390x844 phone smoke passed the
  owner/visitor boundary, exact return, no-overflow and no-write-on-open
  checks, then completed mocked Save and permanent Delete requests and
  verified both local outcome/return actions. This is strong local coverage,
  but not a live authenticated production save/delete.

## Spotlight qualification accounting and product-media attention - 2026-10-18

- Status: committed, pushed to the working branch and `main`, deployed on the exact application commit recorded above, and independently verified against the public frontend and API.
- Canonical Spotlight fetch now creates a bounded 30-second reservation without incrementing `consumed_delivery_rounds`. Only one current reservation per campaign version may exist globally. Accepted visible qualification consumes the round, records the canonical exposure, and marks the lease qualified in one transaction.
- An expired unqualified reservation consumes no round. The abandoning viewer cannot repeatedly reacquire that campaign version, while another eligible viewer may receive a later reservation. Qualified retries remain idempotent; replay, owner preview, replacement, withdrawal, expiry, and commit failure remain accounting-neutral.
- Public Shop product cards no longer record `product_open` merely because the card expanded. The media must remain at least 60% visible in an active tab for one continuous second. The analytics endpoint rejects product-open writes without that evidence and retains daily dedupe. Product media receives no Spotlight-style round allowance; this remains weak attention evidence, not buyer or sale proof.
- Verification: the broad Spotlight and targeted Marketplace attention suite passed 213 tests; the complete Public Shop backend suite passed 70 tests; and the focused pacing/presentation/concurrency collection passed 55 tests with five destructive PostgreSQL-only cases correctly skipped because no disposable database was configured. Python compilation, the Spotlight presentation contract audit, the 290-module production frontend build, the complete protected-button-freeze audit, and the nine-scenario 390x844 phone-browser Spotlight/Product-media smoke passed. The smoke proved no `product_open` write during the first 350 ms after expansion and exactly one write after the continuous one-second visible dwell. A custom caller can still forge generic product-attention fields because product attention is deliberately weak analytics rather than a paid canonical delivery ledger; Spotlight remains protected by its signed lease and server elapsed-time checks.

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
- Deployment: application commit `8f836f9a927e51279796c60c18ac6e4fc56c42ff` was pushed unchanged to the pilot branch and `main`. Backend Tests run `39148571993` passed; Trigger Render Deploy run `39148862403` completed successfully; frontend deploy `dep-dbafu7654i7c738r48og` and API deploy `dep-dbafvgrncjis73deb83g` both reached `live`. Independent post-deploy requests returned HTTP 200 from the frontend, `/health`, and `/marketplace/media/ping`.

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

## Deployed Spotlight media, delivery, and Attention truth repair - 2026-10-19

- Runtime release commit `c93c295c2e12b0ef73ca3dd23304b46fb7d186cb`
  was pushed to `codex/spotlight-rotation-continuity`, promoted unchanged to
  `main`, and deployed to both Render services. Follow-up commit
  `cba38c572fdfe33fe184d1176dc0bfb3e6255979` only aligns the older opportunity-
  metadata test fixtures with the approved media-required contract.
- Production evidence showed that campaign `326` was created without an upload
  request or usable media, consumed one qualified round, and was later
  withdrawn. Current active campaigns `324` and `325` had media at audit time;
  the old media-less row was not rewritten or deleted.
- New direct free/paid Spotlight and correction replacement now require a
  ready image or verified video before any quota, campaign, entitlement, or
  paid-credit mutation. Managed image uploads are decoded and checked against
  their extension before persistence. Invalid/inactive shops or communities,
  unsupported direct scopes, and conflicting paid repost campaigns fail before
  mutation.
- Owner publishers retain their draft until the authoritative Spotlight status
  endpoint confirms the saved item, serving state, and media. Shop Control now
  reads that authoritative status instead of inferring current state from the
  latest twenty broadcasts. Media-preparation errors remain inline, and a
  successful retry clears stale publish failure text.
- Public Shop no longer treats an auth/network failure as an authoritative
  empty Spotlight feed. It retains only a still-current canonical item, shows a
  retry explanation, and retries. A presentation is qualified and counted only
  after the shared media frame reports that the image or video rendered; blank
  or terminally failed media remains uncounted. Stale or inactive reservation
  candidates are skipped so another valid candidate can be selected.
- The reported red Trust warning was a separate semantic defect. Starter Open
  Trust `D` with zero adverse evidence and thin-network CCI `D/E` are now
  neutral. Broadcast-created, product-created, and demand-posted notices are
  informational; generic unread volume and elapsed time alone cannot claim
  repeated evidence harm. Genuine approval, missed-focus, default, volatility,
  or adverse-evidence work remains actionable. Frozen Dashboard Market Wisdom
  presentation was not changed.
- Frozen delivery economics remain unchanged: ten global qualifying showings,
  two per viewer, the existing spacing window, self-delivery exclusion, and the
  current paid/free ordering are preserved.
- Verification: the backend Spotlight agent suite passed 156 relevant tests;
  an independent combined root run passed 109 focused backend tests (104 in the
  sandbox plus five temporary-directory tests outside it); focused Trust tests
  passed 6; Python compilation passed; Dashboard semantic/audit checks passed;
  Spotlight control, presentation, system-feed, and media-quality audits passed;
  the ten-scenario real-browser Spotlight smoke passed; and the frontend
  production build passed with 291 modules. GitHub's corrected full backend
  workflow passed `1538` tests with `16` skipped.
- GitHub Actions `Trigger Render Deploy` run `39247129815` completed
  successfully. Exact frontend deploy `dep-dbb06fgjgiss739pcfvg` and exact API
  deploy `dep-dbb07r67bikc73b84c5g` reached `live`; the public frontend marker
  and live API identity/public-verification contracts passed. The earlier
  backend workflow failure was only eight stale text-only test fixtures; no
  production code was relaxed, and the one-file correction rerun passed.
- Residual truth: remote HTTP image URLs are not fetched server-side because an
  unrestricted fetch would introduce SSRF risk; legacy product media inherited
  by Network Repost is not newly backfilled; mixed-community policy remains
  all-or-nothing; old media-less database history remains historical; and an
  authenticated owner/visitor production-phone replay is still required to
  prove the repaired Spotlight behavior against real member traffic.

## Live Spotlight visibility and invalid-slot repair - 2026-10-19

- Production inspection separated the two reported cases. Shop 5 / ?My family
  my pride Marketplace? had campaign 326, created at 09:40 UTC without saved
  image or video, withdrawn at 10:40 UTC, and then incorrectly counted against
  the owner?s later valid retry. Shop 4?s campaign 324 did contain video and
  received two qualifying impressions from other members, but its authorized
  24-hour window ended at 13:44 UTC; it was therefore no longer displayable.
- At 14:27 UTC there were no eligible placement rows in community 4 (?My family
  my pride?). The only globally eligible campaign was the ?Shoes? Spotlight in
  communities 6 and 8. This matched the report that one other media item was
  visible. Owners remain deliberately excluded from their own public delivery
  allocation; owner confirmation must use the authoritative Shop Control
  inspection/preview while another member account tests public delivery.
- Free daily quota counting now counts distinct publication/campaign runs
  rather than per-community placement rows and ignores legacy rows that contain
  neither an image nor a video. Current publish writes already reject such
  media-less rows. A valid Spotlight that is voluntarily withdrawn still
  consumes the daily free slot; the no-restoration policy was not weakened.
- The inaccurate error copy now says that the free Spotlight ?has already been
  used,? rather than claiming a withdrawn/expired Spotlight ?is already
  active.?
- Verification passed: all 72 Marketplace Public Shop tests, both Spotlight
  quota/system-feed audits, and the 291-module frontend production build.
  GitHub Backend Tests run 39271075963 passed on exact commit
  d0a4f8dcff561950c64e7a7488b36f6ea699c961.
- Render workflow 39271973173 explicitly deployed the API. Frontend deploy
  dep-dbb2qj9124ks73estocg and API deploy dep-dbb2rf4s728c73a7b2jg are live on
  exact commit d0a4f8dc; the post-restart API health check returned HTTP 200
  with dev_mode false.
- The historical campaign 326 row was not rewritten or deleted. After this
  deployment, that owner may select the verified video again and publish; the
  invalid media-less row no longer blocks today?s free run.

## Spotlight expired-session truth repair - 2026-10-19

- Production logs proved that the reported “could not connect this spotlight
  to your shop” incident was not a media, community-link, or broadcast-write
  failure. The affected phone received 401 Unauthorized twice from
  POST /marketplace/shops; no later broadcast publication request occurred.
  Other authenticated Spotlight/shop requests continued returning 200.
- Shop Control had already captured the real authentication error, but the
  publish caller overwrote it with a false generic shop-linkage message. The
  same overwrite could also turn a legitimate submitted_for_review result
  into an error.
- The forward repair preserves the exact shop-preparation result. A 401 now
  explains that sign-in expired, records the existing Spotlight recovery
  target, clears only the stale access token, and opens the forced sign-in
  flow. Sign-in explains that the phone media must be selected again because a
  browser cannot retain a local file across reauthentication.
- No backend authentication, shop/community contract, campaign schema,
  delivery economics, or frozen Dashboard Market Wisdom surface changed.
  Rolling back the visibility repair remains unsafe because it would restore
  off-screen presentation lease consumption without correcting expired
  sessions.
- Verification passed: audit:spotlight-controls,
  audit:spotlight-presentation-contract, targeted ESLint for the three
  changed frontend files, and the 291-module frontend production build.
- Release commit 21cd7ffc5a2c1cb663519f6557196b7fb41d1d9f was pushed to
  codex/spotlight-rotation-continuity and promoted unchanged to main. GitHub
  Render workflow 39297920335 completed successfully. Exact frontend deploy
  dep-dbb5i5d3t7ss73fef8dg reached live, and final frontend sign-in plus API
  health requests both returned HTTP 200.
- Residual truth: the separate complaint that Family Pride did not see another
  member's already-published Spotlight is not proven solved by this session
  repair. Production showed eligible campaigns and successful public
  opportunity requests, but the authenticated response payload was not
  captured. That replay/delivery path still requires a distinct eligible
  member phone test and request/qualification evidence.

## System-level Spotlight visibility continuity - 2026-10-19

- Status: implemented and verified locally on
  `codex/spotlight-rotation-continuity`; not pushed or deployed at the time of
  this note.
- Production read-only evidence identified the remaining system defect. A
  viewer could have active, route-eligible campaigns in shared communities yet
  receive an empty or incomplete rail because persistent pacing and that
  viewer's counted frequency cap were also being used as visibility filters.
  This explained the asymmetric report where one member could see Family Pride
  while Family Pride could not see the other member, and why some campaigns
  flashed once and then disappeared.
- The canonical Public Shop endpoint now separates counted delivery from live
  visibility. Fresh signed presentations and qualified same-viewer replays
  retain their existing accounting rules. Any remaining bounded response slots
  may contain short-lived, tokenless canonical visibility rows for otherwise
  eligible active campaigns. Those rows revalidate community route and active
  membership, self-exclusion, availability, lifecycle, placement, and content
  version, and they create no round, lease, exposure, or Marketplace attention
  event.
- Visibility discovery is deliberately memory-bounded: it scans no more than
  64 campaign identifiers at a time and rotates both the scan window and the
  bounded result window. This avoids turning continuity into another Render
  memory-pressure path while preventing a larger inventory from being
  permanently hidden.
- Public Shop no longer converts a canonical API/contract failure into a
  successful empty result. It preserves the last still-current row, shows an
  honest refresh explanation, and makes only three scheduled retries after the
  failed request. A genuine successful empty response retains the ordinary
  30-second empty cooldown.
- Frozen economics are unchanged: ten global counted qualifying showings, two
  counted showings per viewer, persistent spacing, self-delivery exclusion,
  lifecycle/media checks, paid/free ordering, and Public-Shop-only live
  presentation remain intact. The new visibility rows do not restore legacy
  fallback or permit cross-silo discovery.
- Verification passed: 238 distinct backend tests across presentation,
  pacing, frequency, candidate, eligibility, diversity, exposure, delivery,
  transaction, lifecycle, and Public Shop contracts; the focused 17-test
  presentation suite after the bounded-scan review; Python compilation; the
  291-module production frontend build; targeted ESLint; Spotlight controls,
  quota, system-feed, and presentation audits; the complete protected-button
  freeze audit; and the 12-scenario real-browser phone smoke. The added 503
  scenario proved four failed refresh requests leave the last valid Spotlight
  visible, stop retrying at the bound, and keep qualification/impression counts
  at exactly one.
- Remaining production truth: local and synthetic verification cannot prove
  the real Family Pride handset result. After deployment, test two distinct
  eligible member accounts in both directions and confirm the live endpoint
  returns all currently eligible campaign ids as fresh, replay, or non-counting
  visibility rows before declaring the pilot incident closed.

## Join Requests timeout repair - 2026-10-21

- A phone screenshot at 10:55 BST showed the authenticated Join Requests page
  aborting with the shared 30-second server-timeout message and all summary
  counts left at zero. Render logs confirmed that production accepted
  GET /clans/8/join-requests at 09:52:29 UTC but never logged its completion.
- Read-only production evidence isolated the multiplier: community 8 had 11
  historical join requests, 11 active memberships, and 7 pending-account
  memberships. Six of those pending accounts used the legacy hashed temporary
  password marker. List serialization recomputed reviewer eligibility for
  every request, repeatedly running the deliberately expensive legacy hash
  check. Community 13 showed the same smaller pattern and took 8-11 seconds.
- The backend now computes active membership count and reviewer eligibility
  once per community response and fetches all join-request votes in one query.
  Per-request admission mode, thresholds, counts, eligible reviewers, QR
  guardrails, permissions, and response shape remain unchanged. The frozen
  Join Requests phone layout and all frontend code were untouched.
- The reported community now performs about 7 expensive eligibility checks
  instead of about 77. A regression test requires the list endpoint to call
  reviewer enumeration once even when multiple requests are returned.
- Verification passed: all 80 join-request backend tests, Python compilation,
  scoped diff checks, and GitHub Backend Tests run 39582089963 on exact commit
  ed46fb8da04e0b3f4c26f697373c68f270489f12.
- Commit ed46fb8da04e0b3f4c26f697373c68f270489f12 was pushed to
  codex/spotlight-rotation-continuity and promoted unchanged to main. Corrected
  Render workflow run 39582356642 was dispatched with deploy_api=true and
  completed successfully. Exact API deploy dep-dbc8vcrrjlhs73b7nbcg reached
  live, and the public health check returned HTTP 200 with dev_mode false.
- Remaining production truth: the exact live code and health are verified, but
  no production credential was used to replay the private clan 8 endpoint.
  The affected member should tap Refresh once on Join Requests. Confirm the
  request card and non-zero summary appear, then inspect the new production
  request completion time before calling the handset incident fully closed.

## Join Requests current admin-authority alignment - 2026-10-21

- Production read-only evidence confirmed a real rule/action contradiction for
  clan 8 request 20. The request was created at 09:51 UTC from invite 173,
  whose snapshot was community_vote with voting_admin_override=false. The
  community setting was changed to community_vote with
  voting_admin_override=true at 10:16 UTC, then the handset sent POST
  /clans/8/join-requests/20/vote. That ordinary vote correctly left the request
  pending at one of four; no /admin-approve request reached the API.
- The page had mixed the current community setting with the request snapshot:
  it advertised the admin option globally while its first Approve button still
  recorded an ordinary vote. The backend admin endpoint also rejected the
  newly enabled current authority for an already-pending request.
- The backend now preserves the invite snapshot as audit history while also
  resolving current admin authority for pending requests. List items expose
  admin_approval_available, admin_approval_basis, and the viewer-specific
  reviewer_can_admin_approve flag. Admin approval records whether authority
  came from the request, its invite snapshot, the legacy rule, or the current
  community setting.
- The frozen Join Requests page now uses each request's effective authority.
  Its progress copy says an authorised admin can approve immediately without
  waiting for the remaining votes, and the primary button says Approve now as
  admin and calls /admin-approve. The duplicate fourth admin button was
  removed, leaving the existing compact three-action layout.
- Policy documentation now states the deliberate governance rule: current
  admin authority may finish an already-pending request without rewriting the
  original invite snapshot. A regression test covers request creation with the
  override off, enabling it afterward, per-item capability output, and
  immediate admin approval.
- Verification passed: all 81 join-request backend tests, the 291-module
  production frontend build, the frozen Community Join Requests layout audit,
  and scoped diff checks.
- Remaining production truth: request 20 is still pending and no production
  data was mutated during diagnosis. After this fix is deployed, the admin
  must refresh Join Requests and tap Approve now as admin. Only the resulting
  approved response and activation handoff will close the reported incident.

## Demand notification meaning and exact-request repair - 2026-10-22

- A pilot phone screenshot showed the Dashboard Attention Guide saying `A
  request still needs your answer` and `delay can change how people read your
  follow-through`, then opening the general DemandBox queue. The visible item
  was a community request such as `Dairy juice`; it was not Shop Diary work.
- Root cause was semantic, not visual. `demand_new` was broadcast to every
  eligible community member and treated as personal actionable work. A second
  synthetic Dashboard rule also promoted any high-urgency community demand to
  a personal Attention Guide obligation. Neither condition proved that the
  member had been asked or had promised to answer.
- General `demand_new` and requester-side `demand_posted` notices are now
  informational. Community-wide urgent demand remains visible as DemandBox
  context but cannot auto-open the personal Attention Guide. Only
  `demand_tagged` may become personal demand attention.
- New DemandBox notification links carry the exact `demand_id`. The existing
  DemandBox direct-link contract opens that one request card. Dashboard also
  recovers an exact request for historic tagged notices by matching the saved
  request title when the old URL lacks an id.
- A tagged popup now names the exact request when available, says that the
  member is not committed until they choose to answer, and labels the action
  `Open exact request`. Opening it marks the originating notification read;
  read, closed, missing, or expired tagged requests no longer count as live
  attention work.
- Shop Diary and the frozen Dashboard Market Wisdom presentation were not
  changed. DemandBox remains the request-lifecycle owner; Shop Diary remains
  the separate shop-owned activity-history surface.
- Verification passed: 22 focused Marketplace Request/Attention Spine tests,
  11 Notification Route/Web Push tests, Python compilation, targeted ESLint,
  Dashboard attention semantics, Dashboard action audit, DemandBox front
  package audit, Notifications inventory audit, the complete protected-button
  freeze audit, the 291-module frontend production build, and the DemandBox
  real-browser phone smoke at 390x844 and 360x780.
- One stale Notifications audit initially rejected the already-approved fresh
  bounded call `getMyNotifications(20, false, { fresh: true })`. Its assertion
  was reconciled to require that exact fresh 20-row contract; no Notifications
  page behavior changed.
- Remaining production truth: synthetic/local verification cannot prove the
  affected handset has refreshed its cached frontend or that the exact live
  Dairy-juice request is still open. After deployment, reload Dashboard: a
  general community request must not open Attention Guide; a newly tagged test
  request must show its title, open only its card, and stay retired afterward.

## API memory investigation and local containment patch - 2026-10-23

- Render confirmed two 512 MiB OOM kills on 19 October at 12:46:44 and
  14:52:53 UTC. The second killed an old draining instance during a rollout;
  sampled memory did not capture either fatal transient. No later OOM event was
  returned through 23 October after the one-thread FFmpeg containment commit.
- Long-lived instances still rose from about 265-276 MiB after startup to
  roughly 378-383 MiB. That proves limited headroom, but current metrics cannot
  distinguish a Python leak from native caches or allocator high-water memory.
- Retention did not cause the incidents: no retention log was found and all 342
  campaigns remain uncompacted. The live env value cannot be read directly, so
  the local Blueprint is now fail-safe disabled pending explicit approval for
  the first 25-campaign production batch.
- Local review patch removes expired keys from three unbounded rate-limit maps,
  scans 12 media-reference columns once per bounded deletion batch, delays
  future retention startup by five minutes, defaults retention/retry work to
  25 rows, and adds privacy-safe process/container/child RSS plus concurrency
  and background duration/row-count telemetry.
- Fifty media cleanup tasks improved from 651 SQL statements / 0.607 seconds to
  14 statements / 0.147 seconds. After 50,000 keys expired, the three retained
  maps fell from 50,001 entries each to one; current traced heaps were 1.8,
  2.5, and 2.5 MiB instead of 40.9, 44.3, and 11.3 MiB.
- A realistic local batch of 25 campaigns, 100 placements, 50 content versions,
  and 50 media candidates completed in 1.186 seconds with an 8.66 MiB traced
  Python-heap peak. Repeated health requests stabilized after 2,000 sequential
  and another 500 at concurrency 20.
- Verification passed: 26 focused cleanup, retention, rate-limit, upload, and
  real FFmpeg tests; 88 affected-route limiter tests; one additional real
  FFmpeg test with instrumentation enabled; Python compilation; and scoped diff
  checks. The first sandboxed
  video runs produced only pytest temporary-directory permission errors and
  were rerun successfully with an approved local temp path.
- Full evidence, ranked causes, exact file impact, rollback, and decision gates
  are in `docs/GSN_API_MEMORY_INVESTIGATION_2026-10-23.md`.
- Owner approved the controlled rollout. Commit
  `ac3844190d0ce403e0b72770bcf8aa023a24c274` was pushed to the working branch
  and `main`, Backend Tests passed, and `gmfn-api` Render deploy
  `dep-dbdouipsrm7s73cfq480` became live at 16:49:48 UTC. `/health` returned
  HTTP 200 and the protected GSN publisher API returned 401 without a token.
- Live startup telemetry reported 232.5 MiB process RSS / 256.0 MiB container
  memory against 512 MiB, Spotlight retention disabled, batch size 25, and no
  child processes. It also exposed production reconciliation as enabled even
  though `render.yaml` says `0`; the first run processed zero communities in
  485 ms. Disabling reconciliation and running the first Spotlight retention
  batch both still require separate owner approval.

## Compact Bank Console and executable next action - 2026-10-26

- `/app/command-center/bank-console` now opens with one deep-navy `What needs
  attention now` card, the selected community, four concise record counts, one
  evidence-led primary action, and one Refresh action.
- Manual intake, recent/unmatched/credit record lists, and expected-payment
  proof material now start closed behind `Record a missing bank event`, `Review
  bank records`, and `Expected payments and proof`. The previous exposed
  explanation blocks, duplicate statistic grid, and Today/Tomorrow cards were
  removed.
- The primary action now prioritises eligible submitted Community Domain proof,
  then unmatched bank events. `Review proof` reveals the existing protected
  proof controls. `Match records` is now a real button that calls the existing
  reconciliation handler instead of linking back to the same Bank Console
  route. Community selection and calm-state Loan Support handoffs keep their
  existing shared routes.
- No bank API payload, matching algorithm, expected-payment permission,
  Community Domain proof scope, stale-context guard, copied evidence paper,
  auth rule, or backend behavior changed. Reconciliation remains matching and
  review evidence, not settlement or proof that money moved.
- The compact Command Centre money row also restores the previously omitted
  `Support committed` figure; its trust audit now checks the compact wording.
- Verification passed: production frontend build, finance-action audit,
  trust-action audit, institutional evidence-surface audit, button-stability
  audit, admin route-guard audit, global action-debug-id audit, global
  raw-action audit, phone-surface simplicity audit, and mobile visual route
  coverage audit.
- A focused 390x844 Chromium check confirmed no horizontal overflow, the
  primary action in the first viewport, all three detail areas closed by
  default, proof review revealing only the expected-payment area, and preserved
  approve/reject actions. A second check confirmed `Match records` is a button,
  calls `/bank/reconcile` once, and does not navigate away.
- The broad Community Domain product-contract audit completed but remains red
  on two unrelated pre-existing policy assertions in backend Marketplace shop
  writes and Shop Assets policy guidance. It reported no Bank Console
  contract failure; those unrelated files were not changed in this batch.
- This batch is local only. It has not been pushed or deployed, as instructed.

## Compact Trust Command Centre - 2026-10-26

- `/app/command-center` now opens with the existing operator identity, one
  always-visible `What needs attention now` recommendation, its single primary
  action, and three compact live rows for system/readiness, trust/identity, and
  money/support.
- Every existing authorised Command Centre route remains available inside one
  closed `See all command tools` disclosure. Readiness worksheet/check/evidence
  material remains inside `Readiness and validation`; deeper summaries,
  operator work-path guidance, member/admin layer guidance, and the public GSN
  site action remain inside `More operator details`.
- The exposed command-rule card, duplicate `Where next` route list, and separate
  work-path/layer sections were removed. No API call, recommendation priority,
  route destination, authentication rule, role guard, backend behavior, or
  Dashboard Market Wisdom surface changed.
- The revised three-disclosure layout uses local UI state key
  `gmfn.commandCenter.sections.v3`, so existing browsers receive the new closed
  defaults instead of inheriting stale open state from the longer layout.
- Verification passed: production frontend build, admin/operations action
  audit, admin route-guard audit, button-stability audit, global action-debug-id
  audit, global raw-action audit, phone-surface simplicity audit, and mobile
  visual route-coverage audit. A focused 390x844 Chromium check confirmed no
  horizontal overflow, the required recommendation/tools/readiness/details
  order, three live signal rows, all three disclosures closed by default, the
  primary recommendation action inside the first viewport, and 11 authorised
  tool links after opening the tool disclosure.
- This batch is committed locally only. It has not been pushed or deployed, as
  instructed.

## Compact Cover About GSN & I guide - 2026-10-26

- The public `/guide` destination opened by Cover's `About GSN & I` action is
  now a compact pre-auth introduction: one Back control, a short outcome-led
  hero, three cards (`Buy and sell`, `Grow your shop`, and
  `Keep community trust visible`), one closed full-capability disclosure, and
  one bottom Continue action.
- The former featured-capability carousel, Previous/Next controls, technical
  category/tone chips, duplicate top Continue action, and conditional Collapse
  action were removed. The existing return-route state, stable Back/full-list/
  Continue action identities, iPhone home-screen guidance, and all 12 shared
  capabilities remain intact.
- No backend, authentication, route, shared capability registry, or signed-in
  My GSN behavior changed. The Cover button and its `/guide` route remain
  unchanged, and the public guide still has no bottom navigation.
- Verification passed: production frontend build, capability-mirror audit,
  entry/auth audit, entry-flow polish audit, entry copy/response audit, GSN
  visible-language audit, phone-surface simplicity audit, mobile visual route
  coverage audit, protected button sub-audits, button-stability audit, global
  action-debug-id audit, and raw-action audit.
- A 390x844 local Chromium check confirmed three outcome cards, a closed
  disclosure on first load, 12 cards after opening it, and no bottom nav. The
  full protected-button umbrella audit did not finish in the Windows sandbox:
  its three unrelated Vite visual harnesses first hit `spawn EPERM`, then the
  escalated rerun exceeded the 120-second command limit. Their surrounding
  contract checks passed, and the production build completed successfully.
- This batch is local only. It has not been pushed or deployed, as instructed.

## Commerce-first public guide and shared video sound editor - 2026-10-25

- The public `/guide` surface now leads with `Buy. Sell. Grow through trusted
  communities.` and presents buy/sell, promotion/discovery, and community
  organisation in that order. The complete governance, identity, finance,
  support, and continuity capability set remains available behind the same
  focused capability controls; no capability was deleted.
- One reusable `VideoSoundEditor` now serves Command Centre house campaigns,
  Community Notice video attachments, Shop items, Shop Control Spotlight,
  Subscription Spotlight, and Vault block videos. It supports a selected audio
  file or a microphone recording capped at ten seconds, audio preview,
  mix/replace choice, remove/reset, and explicit rights confirmation.
- No music catalogue was added. Popular/commercial music remains outside scope
  until licensing and rights management exist.
- The existing authenticated `/marketplace/media/video` route now accepts a
  bounded sound file only with `mix` or `replace` and a positive rights
  confirmation. FFmpeg performs the audio operation, loudness normalises the
  result, and rejects the operation unless the prepared MP4 is confirmed to
  contain audio. Existing video preparation and Natural Finish remain the
  single processing path.
- Verification passed: 21 focused backend media tests, the production
  frontend build, the media-quality audit, and the capability-mirror audit.
- Application commit `d6f11bcd32434c68f9805cb470efe08829225a2b`
  was pushed to the working branch and `main`. GitHub Actions run
  `40217206202` completed successfully for that exact revision. Render
  frontend deploy `dep-dbf3rrjsp5es73cgsm7g` and API deploy
  `dep-dbf3si8n74is73bevfm0` are live at the same revision. The public API
  health check returned HTTP 200, the live route bundles contained the new
  commerce and sound controls, and the post-start API error log was empty.

## Community advertising share and Clear Finish foundation - 2026-10-25

- GSN house advertising now has a separate accounting lifecycle rather than
  reusing the loan revenue-allocation model: campaign settlement draft,
  expected advertiser payment, reconciled receipt, finalized Spotlight
  delivery evidence, per-community earnings, beneficiary mandate, payout
  preparation, and externally completed payout recording.
- The default community pool is 500 basis points (5%) of distributable net
  advertising revenue. Distributable net deducts only tax, refunds,
  chargebacks, payment-processing fees, and campaign-specific delivery costs;
  general salaries, rent, and unrelated GSN overhead are explicitly excluded.
  The pool is split once across eligible paid communities in proportion to
  qualifying impressions, with exact integer-cent largest-remainder rounding.
- Paid-community eligibility is checked at each impression timestamp against
  the existing active `community_domain` entitlement. A later payment does not
  retroactively make earlier impressions eligible. Free communities retain
  delivery evidence but receive no allocation from this paid-community pool.
- Founder, operator, advertiser payer, and payout beneficiary remain separate
  authorities. A community owner/admin appoints a beneficiary; the beneficiary
  must accept using their own saved payout destination. This grants payout
  authority only and never grants ownership, operation, payer, or advertising-
  consent rights.
- Earnings accrue even when no beneficiary is ready. Payout preparation is
  blocked until the destination belongs to the accepted beneficiary, has
  phone-verified non-placeholder bank details, and uses the same currency as
  the earnings. Preparation snapshots the destination and creates an
  instruction only. GSN does not claim provider execution or bank-account
  ownership verification; a platform admin may record a payout as paid only
  after an external transfer and real transaction reference exist.
- Advertiser payment uses the existing expected-payment and bank-reconciliation
  spine. Advertising settlement confirmation additionally requires a fully
  paid expected balance and the matching canonical incoming bank event.
- The current activation knobs are
  `GSN_ADVERTISING_COMMUNITY_SHARE_BPS` (defaults to `500`),
  `GSN_ADVERTISING_SETTLEMENT_CLAN_ID`, the existing country settlement-bank
  configuration, and the existing `GSN_PAYMENT_OPERATIONS_ENABLED` safety
  gate. No real payment or payout was initiated in this work.
- Remaining truth: the complete accounting/admin API is connected, but there
  is no automatic payout-provider execution and no new revenue-share UI yet.
  Operations can use the authenticated API after the settlement community ID
  and bank configuration are approved. Currency conversion, tax/legal policy,
  payout thresholds, reversal recovery, and a provider-verified payout rail
  remain later controlled work; they are not disguised as a missing number.
- All current product-screen image uploads now use the authenticated image
  route. The dormant/legacy direct R2 presign remains explicitly outside the
  verified contract until a post-upload inspection worker exists. `GSN Clear
  Finish` corrects orientation, never upscales, caps images at 1920px/4 MB,
  preserves transparency, strips metadata, and applies only conservative
  non-generative tonal/colour/sharpness preparation.
- Every verified video now also receives conservative Clear Finish before its
  bounded MP4 is published. The existing optional branded `GSN Natural
  Finish`, sound editor, duration, size, Spotlight serving, rotation, pacing,
  expiry, payment, and entitlement behavior remain unchanged.
- Verification passed: 83 focused accounting/bank/payment/Spotlight/media
  integration tests, a final 38-test real-media/accounting regression run, the
  media-quality contract audit, Python compilation, the 293-module frontend
  production build, scoped diff checks, and a fresh Alembic upgrade -> previous
  revision -> head rehearsal ending at `20261025_ad_share`.
- This batch is local only. It has not been pushed or deployed because the
  repository freeze still requires an explicit owner batch-ready instruction.

## Active-session continuity and startup read cleanup - 2026-10-26

- A local browser trace confirmed why users can experience GSN as turning off
  during a deployment: the service worker used `skipWaiting()` and
  `clients.claim()`, while `pwaInstall.ts` responded to `controllerchange` by
  immediately reloading every active non-iPhone page. The same module also
  automatically reloaded an installed non-iPhone shell when it detected a new
  asset signature.
- Both automatic reload paths are removed. An open browser session now keeps
  running its current shell while the new worker activates in the background;
  the network-first navigation strategy serves the current shell on the next
  full navigation or reopen. The existing explicit iPhone `Update now?`
  confirmation remains unchanged, including its busy/file-selection guards.
- Dashboard startup no longer forces fresh reads on its first render. The
  15-second active polling, focus, and visibility refresh paths still request
  fresh server data, while the initial render shares the existing 15-second
  startup cache. Companion notification polling now applies its interval guard
  to focus/visibility bursts as well as timer polling.
- TrustSlip and unread-notification-count reads now use the shared startup
  cache. A successful notification `mark read` invalidates both the notice-list
  and unread-count caches, and explicit badge refreshes after user actions still
  bypass the cache. Changing the access token invalidates every authenticated
  startup-section cache and resets badge throttling, so a rapid account switch
  cannot reuse another account's cached response. Dashboard uses the same
  20-item notice query as guidance so those consumers coalesce.
- Measured warm Dashboard requests changed from five Marketplace reads, ten
  notification reads, two TrustSlip reads, and four unread-count reads to three
  intentional Marketplace query shapes, three total notification reads, one
  TrustSlip read, and one unread-count read. Each remaining exact request ran
  once. The Marketplace ceiling is now three because the July audit predates
  the September feature that separately includes the member's own DemandBox
  rows; the audit documents all three query shapes rather than calling them a
  duplicate.
- The Community Home first-paint audit now checks the selected community name,
  which is the approved phone identity, instead of requiring the hidden
  desktop-only `Community Home` label. Selector and required-text waits now run
  concurrently under one unchanged deadline instead of accidentally adding two
  separate seven-second waits.
- Verification passed: link contracts, PWA boot recovery, active-feed
  freshness, the complete protected-button/frozen-surface audit suite, scoped
  diff checks, and the 295-module production build.
- Remaining truth: the standalone cold-Vite timing audits are not green.
  Community Home rendered its usable identity at about 8.3 seconds against a
  7-second cold-development ceiling while its deliberately delayed domain read
  remained non-blocking. The latest Dashboard startup run met every request
  ceiling but measured 6.77 seconds for shell, 7.57 seconds for Dashboard, and
  11.52 seconds for the simulated 6.5-second auth retry against 6.5, 7.5, and
  9-second limits. These results vary materially because Vite cold-compiles
  large route modules; the thresholds were not relaxed to manufacture a pass.
  The Web Push readiness guard now protects that same intentional browser
  display contract instead of incorrectly requiring standalone mode. The
  notice-board phone-notification, link-contract, Web Push readiness, and PWA
  boot-recovery audits pass together.
- This batch is local only. It has not been pushed, promoted to `main`, sent to
  Render, or deployed because the owner explicitly requested milestone-based
  releases while pilot users are active.

## Production-build startup evidence - 2026-10-26

- The existing startup and app-tab first-paint audits used Vite's development
  server. Their cold runs therefore included on-demand TypeScript/JSX
  transformation and were not a reliable measurement of the files served to
  pilot users by Render. The development checks and their thresholds remain
  unchanged because they still protect request counts and non-blocking route
  behavior.
- Both audits now accept `--production-build`, backed by Vite preview of the
  already-built `dist` directory. Named package scripts make the production
  checks repeatable: `audit:startup-timing:production` and
  `audit:app-tab-first-paint:production`. They fail clearly if no production
  build exists and retain the same API mocks, artificial delays, selectors,
  and time ceilings as their development counterparts.
- The production startup audit passed: Dashboard shell 1.264 seconds,
  Dashboard content 1.371 seconds, and the deliberately slow 6.5-second auth
  retry 7.061 seconds. Every exact startup request still ran once and all
  request ceilings passed.
- The production first-paint audit passed all six authenticated surfaces while
  selected secondary calls were delayed by 21 seconds: Community Home 1.265
  seconds, Marketplace 1.225 seconds, Profile 1.756 seconds, My GSN 1.086
  seconds, Trust Passport 1.173 seconds, and TrustSlip Setup 1.140 seconds.
  Both settled My GSN/Profile navigation checks also passed.
- Conclusion: the remaining cold-Vite failures are development-tooling cost,
  not evidence of a production route bottleneck. No runtime component, route
  preload order, or frozen Market Wisdom behavior was changed to chase that
  false signal.
- This follow-up remains local only. Nothing was pushed, promoted, sent to
  Render, or deployed.

## Laptop GSN-ID sign-in lookalike recovery - 2026-10-26

- Pilot screenshots showed a generated member GSN ID copied on a laptop with
  `O` in place of `0` and `I` in place of `1`. The existing sign-in lookup was
  case- and prefix-tolerant but required every suffix character to match, so
  that visually plausible transcription could not find the active account.
- Generated member IDs use an eight-character hexadecimal suffix. The login
  identity lookup now tries all existing exact email, GSN-ID, and phone
  candidates first. Only when none exists, and only for a recognized member-ID
  prefix with exactly eight suffix characters, it may correct impossible
  generated-suffix lookalikes `O` to `0` and `I`/`L` to `1`.
- Exact lookup remains authoritative. A real legacy ID containing those letters
  wins before any generated-ID fallback, and the password for a different
  canonical-looking account cannot be used through that exact legacy ID. The
  password is never corrected or relaxed.
- The fallback is confined to sign-in. Email, phone, arbitrary/long legacy
  IDs, activation, and password-recovery claims keep their existing behavior.
- Sign-in's empty-field instruction now correctly asks for phone, email, or
  GSN ID rather than email alone. The failed-login message is shorter and gives
  one direct first step plus the activation path for a genuine first sign-in.
- Verification passed: both focused lookalike/exact-precedence tests, all 45
  backend entry/authentication tests, the frontend entry-copy audit, and the
  frontend entry/auth contract audit, the 295-module production build, and the
  complete protected-button/frozen-surface audit suite.
- This sign-in fix remains local only. Nothing was pushed, promoted, sent to
  Render, or deployed.

## Community ID mistaken for sign-in password - 2026-10-26

- A second review of the same laptop screenshot showed the member's Community
  ID in the password field. The earlier GSN-ID character correction was valid
  but was not, by itself, a complete explanation of that failed attempt.
- `/login` now recognizes `GMFN-C-...` and `GSN-C-...` values before making an
  authentication request. In the identity field it explains that a Community
  ID is not a member identity. In the password field it explains that a
  Community ID is not a password, clears the mistaken value, and points a
  member without a password to Help -> Activate membership.
- No new panel, button, or always-visible helper was added to the already busy
  entry surface. Valid phone, email, member GSN ID, and password submissions
  keep the existing path. The API and password rules are unchanged.
- A repeatable production-build browser check is available as
  `smoke:login-community-id-guard`. It fills both screenshot-shaped mistakes,
  checks the exact human correction, confirms the password field is cleared,
  and proves that neither mistake reaches `/auth/login`.
- Verification passed: entry-copy, entry/auth, and button-stability audits;
  the 295-module production build; the production-browser login guard smoke;
  and the complete protected-button/frozen-surface audit suite.
- This follow-up remains local only. Nothing was pushed, promoted, sent to
  Render, or deployed.

## Audit contract cleanup milestone deployment - 2026-10-26

- Four audit-contract cleanup commits were promoted from
  `codex/spotlight-rotation-continuity` to `main`, ending at application commit
  `0bea2a0d0b857a5bf11e61bf1b727a1076790fc3`. They align Marketplace trust
  guidance, Web Push manifest expectations, Companion notification caching,
  Identity Integrity, and TrustSlip boundary guards with the already-approved
  runtime behavior. No application runtime source, backend route, schema, or
  user-facing surface changed in this milestone.
- Verification passed before publication: Marketplace trust guidance, Web
  Push readiness, notice-board phone notifications, PWA boot recovery, Trust
  actions, active-feed freshness, Identity Integrity front package, Trust
  Passport / TrustSlip boundary, startup-root boundary, and the complete
  protected-button/frozen-surface suite.
- GitHub Actions `Trigger Render Deploy` run `40384861953` checked out the exact
  application commit, accepted the frontend deploy hook, and monitored Render
  deploy `dep-dbfqcvnavr4c73fl5c10` to `live`. The workflow then confirmed the
  deployed asset marker at `https://gmfn-frontend.onrender.com`.
- An independent no-cache request to `/cover?deploy_check=0bea2a0d` returned
  HTTP 200 and the GSN HTML title. The workflow correctly reported
  `Backend deploy needed: false`; `gmfn-api` was not redeployed.
- This handoff evidence is published separately with `[skip render]` so
  recording the completed deployment does not trigger another pilot-facing
  restart.
