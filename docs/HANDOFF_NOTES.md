# Active Handoff Notes

This file is the compact current-state handoff required by `README.md` and
`docs/PROJECT_PROTOCOL.md`. The fully repaired historical record through
2026-10-17 is preserved in
[`archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md`](archive/HANDOFF_NOTES_ARCHIVE_THROUGH_2026-10-17.md).

Keep this file short. Put large work-package histories in a focused dated file
under `docs/` or `docs/archive/`, then link that file here.

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
- Local verification passed: 21 focused backend media tests, the production
  frontend build, the media-quality audit, and the capability-mirror audit.
  This note records local implementation only until the exact commit is pushed
  and both Render services are independently confirmed live.
