# GSN API memory investigation — 2026-10-23

## Deployment decision

Do not push or deploy this cleanup patch until it has been reviewed. The two
19 October out-of-memory incidents are confirmed, and several risks have been
reduced locally, but the exact allocation responsible for either fatal spike
was not captured by Render's 30-second metrics. A successful CI run does not
prove the production memory problem is closed.

## Confirmed production evidence

- Render killed `gmfn-api` for exceeding the Starter instance's 512 MiB limit
  at `2026-10-19T12:46:44Z` (instance `4fxdw`) and
  `2026-10-19T14:52:53Z` (instance `qhjll`). These are the only
  `server_failed` or `server_restarted` events returned for 19–23 October.
- The first affected deployment was revision `7a0f374`, whose application tree
  included `c93c295` (`Harden Spotlight media and attention truth`). The second
  affected instance ran `4a1ecef` (`Accept usable social videos`).
- The second failure was the old, draining `qhjll` instance about two minutes
  after its replacement became live. It was not a newly started replacement
  process, which weakens a startup-only explanation.
- Revision `c7761bb8` (`Bound Spotlight video processing memory`) was deployed
  later on 19 October. It limits FFmpeg decoder, filter, and encoder threads to
  one. No later OOM event was returned through 23 October.
- `gmfn-api` runs one Uvicorn process. There is no Gunicorn or explicit
  multi-worker multiplier in the Render start command.
- Render's sampled memory did not record the fatal allocations. Instance
  `4fxdw` was sampled around 312–316 MiB, and `qhjll` around 333–336 MiB,
  before the kills. A short native or child-process spike can cross 512 MiB
  between samples.
- Long-lived replacement instances still warmed to a high baseline:
  `6plg4` rose from about 265 MiB to 378 MiB (with a sampled peak near
  474 MiB), `f4m5m` from 276 MiB to 383 MiB, and `94zwb` from 270 MiB to
  380 MiB. This proves reduced headroom, not by itself a Python leak; allocator
  arenas and native-library high-water marks can remain resident.
- Current revision `b70bed95` started near 267 MiB and reached about 306 MiB
  after a burst of 114 successful requests in a five-minute bucket. The
  available observation window was short.
- The first incident followed a visible request burst (up to 49 successful
  responses in one 30-second bucket), but there was no video request in the
  inspected incident window. A video request completed about 36 minutes before
  the second incident. Traffic and video processing remain correlations, not
  proof of either exact kill.

## Spotlight retention and reconciliation

- The checked-in Blueprint enabled Spotlight retention and disabled
  reconciliation. The production service's actual environment values are not
  exposed by the available Render read API.
- No `[GSN retention]` application log was found on 19 October or on the
  current deployment. Production has 342 campaigns, 342 content versions,
  1,134 placements, and zero campaigns with `payload_compacted_at` set. This
  is strong evidence that retention is not actually running in production.
- There were no reconciliation loop logs. That is consistent with the
  Blueprint's disabled value, but silence alone cannot prove the live value.
- Therefore Spotlight retention did not cause the two observed OOM incidents.
  It remains a future risk if a Blueprint sync unexpectedly enables the
  existing backlog, so the review patch aligns `render.yaml` to disabled until
  a controlled first production batch is approved.
- The retention campaign selector was already bounded, but each selected
  campaign loaded all of its placements and content versions. Current
  production averages are small (roughly 3.3 placements and one version per
  campaign), so this is not supported as an incident cause. The patch reduces
  the default campaign/retry batch from 100 to 25 and delays the first run by
  five minutes when retention is eventually enabled.
- Media deletion was algorithmically expensive: every queued media candidate
  rescanned 12 reference columns. The patch scans each reference column once
  for the whole bounded batch and preserves canonical-reference protection.

## Other runtime findings

- Three process-global rate-limit maps retained expired identity keys forever.
  These are genuine long-lived retention defects. The patch periodically
  removes only expired keys and adds locking to the shared limiter. It does
  not evict active history or weaken an active rate limit.
- A proposed hard cap was rejected because evicting active keys under churn
  could let traffic bypass rate limiting. Memory can therefore still grow with
  the number of unique active identities inside one live window; that is the
  deliberate security-preserving trade-off in this minimal patch.
- The application imports the complete router tree at startup. Local Windows
  measurement reached about 155 MiB after route imports without tracemalloc;
  Render starts around 249–276 MiB. Startup/import overhead consumes meaningful
  headroom but does not explain a later transient fatal spike by itself.
- All packages in `requirements.txt` have a verified runtime or deployment
  reference. Test-only packages are already separated. No dependency was
  removed without proof.
- Database sessions inspected in request and background paths close in
  `finally` blocks. Production showed six idle connections, consistent with a
  small SQLAlchemy pool plus the inspection query; no session leak was proven.
- Current data volumes are small (for example 13 shops, 33 products, 27 market
  requests, 543 notifications). Some marketplace list and notification helper
  paths still perform broad `.all()` queries and N+1 checks. These are future
  scale risks, but rewriting them without endpoint-specific evidence would
  broaden this incident patch unnecessarily.
- The database had no pending media-deletion tasks during inspection and
  `pg_stat_statements` was not installed, so historical expensive-query timing
  could not be reconstructed.

## Ranked causes

1. **Short native/child-process or request-workload spike with little memory
   headroom — medium/high confidence.** Render missed the fatal value between
   samples, and long-lived instances operated around 380 MiB on a 512 MiB
   limit. Pre-fix FFmpeg could create many native threads; the later one-thread
   fix directly addressed that known risk. It cannot explain the first event
   on its own because no nearby video request was found.
2. **Allocator/native high-water accumulation plus ordinary traffic warming —
   medium confidence.** Multiple instances rose roughly 100 MiB from startup
   and then stayed high. This could be retained Python objects, native caches,
   allocator arenas, or a combination. Existing metrics cannot separate them.
3. **Unbounded expired rate-limit identities — confirmed defect, low/medium
   incident confidence.** Synthetic tests prove large retained maps, but the
   inspected pilot request volume is too low to claim this alone caused either
   512 MiB kill.
4. **Traffic/deploy overlap — medium confidence for contribution.** The first
   event followed a request burst; the second killed an old draining instance
   during a rollout. Neither relationship proves the allocating code path.
5. **Spotlight/media cleanup batch — low incident confidence, confirmed future
   efficiency risk.** The loop appears disabled and the complete backlog
   remains, so it did not cause the incidents. Its repeated reference scans
   were nevertheless wasteful and are fixed locally.
6. **Startup imports alone — low confidence as the fatal cause.** They explain
   a large baseline and reduced headroom, not the timing of the two kills.

## Local patch and functional impact

- `app/core/runtime_memory.py`: adds dependency-free Linux `/proc` and cgroup
  process/container/child memory snapshots, plus request concurrency tracking.
- `app/main.py`: emits privacy-safe route-template telemetry at a bounded
  interval and for slow requests; logs actual startup loop settings; logs
  retention duration and row counts; delays and reduces retention batches.
- `marketplace_media_quality_service.py`: when telemetry is enabled, monitors
  direct-child RSS during FFmpeg while retaining the same timeout and one-thread
  encoding contract. Logs no filenames, media URLs, command arguments, users,
  IPs, or secrets.
- Rate-limit services remove expired map entries. Active-window semantics are
  unchanged.
- Media cleanup resolves the reference set once per task batch. It continues
  to canonicalize managed targets, retain referenced media, reject unmanaged
  paths, and retry failed deletions.
- `render.yaml` keeps retention disabled pending explicit backlog approval,
  sets a five-minute startup delay and 25-row batch for future enablement, and
  enables 60-second runtime memory samples after deployment.

## Before/after and focused tests

| Check | Before | After |
|---|---:|---:|
| 50 unreferenced media tasks: SQL statements | 651 | 14 |
| 50 unreferenced media tasks: duration | 0.607 s | 0.147 s |
| Shared rate limiter after 50,000 keys expire | 50,001 keys / 40.9 MiB retained Python heap | 1 key / 1.8 MiB |
| Merchant limiter after 50,000 keys expire | 50,001 keys / 44.3 MiB | 1 key / 2.5 MiB |
| Invite limiter after 50,000 keys expire | 50,001 keys / 11.3 MiB | 1 key / 2.5 MiB |

Additional patched measurements:

- 25 campaigns, 100 placements, 50 content versions, and 50 media candidates:
  1.186 seconds, 8.66 MiB peak traced Python heap, 340 SQL statements.
- 2,000 sequential health requests: traced heap stabilized from 1.05 MiB warm
  to 1.09 MiB current (19.67 MiB transient peak).
- A further 500 requests at concurrency 20 ended at 1.33 MiB current with no
  increase in the 19.67 MiB transient peak.
- 26 focused retention, cleanup, rate-limit, upload, and real FFmpeg tests
  passed. One additional real FFmpeg run with telemetry enabled passed and
  emitted a child-memory event. Windows cannot expose Linux `/proc` RSS, so the
  meaningful child RSS value must be validated on Render after deployment.
- A further 88 community-confirmation, merchant-verification, and TrustSlip
  boundary tests passed for the routes that use the cleaned-up limiters.
- Python compilation and scoped diff checks passed.

These are synthetic Windows development measurements and are useful for
relative comparison. They are not substitutes for production container RSS.

## Controlled rollout and rollback

1. Review and commit only the scoped backend, tests, Blueprint, report, and
   handoff files. Do not include the unrelated dirty worktree files.
2. Keep production Spotlight retention disabled for the first instrumented
   deployment. Deploy one exact reviewed commit only after owner approval.
3. Observe at least one normal pilot day: startup RSS, idle health-check
   baseline, request concurrency, slow-request RSS, FFmpeg child peak, and any
   restart event. Do not load-test production.
4. If stable, explicitly approve a first retention batch of 25 and verify its
   duration, row counts, memory, and retained audit evidence before enabling an
   hourly loop or processing more of the 342-campaign backlog.
5. Rollback is a code/config revert to the preceding known commit and retention
   remains disabled. The patch has no schema migration. Rate-limit maps are
   process-local and repopulate naturally after a restart. No production media
   or data should be manually deleted as part of rollback.

## Decisions requiring owner approval

- Approval to commit/push/deploy this review patch. No push or deploy has been
  performed during this investigation.
- Approval to run the first production retention batch, because it will remove
  expired delivery payload and managed media only after reference checks while
  preserving campaign/version fingerprints, exposure evidence, and audit rows.
- A hosting upgrade is **not yet justified as the first response**. Reconsider
  if post-patch telemetry shows a sustained idle baseline above about 400 MiB,
  repeat peaks above about 470 MiB, or another OOM under bounded normal work.
  At that point 512 MiB would be demonstrably insufficient after reasonable
  optimization.
