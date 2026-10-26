# GSN API memory follow-up ? 2026-10-26

## Outcome

Render confirmed five `gmfn-api` out-of-memory kills against the 512 MiB
Starter limit on 26 October 2026. This was not a harmless email and not a
single isolated restart. A narrow cleanup removes production amplifiers found
in the incident window. The product owner approved the milestone deployment,
and exact commit `80a91c1a` is now live on both frontend and API.

## Confirmed Render evidence

- Render recorded OOM kills at `08:47:17Z`, `08:51:45Z`, `08:53:02Z`,
  `10:55:40Z`, and `10:58:21Z` on 26 October. The service became available at
  `10:00:36Z` and `12:03:46Z` after the two failure clusters.
- The same 512 MiB service had two earlier confirmed OOM kills on 19 October,
  so the underlying headroom problem predates today's activity.
- The old instance reached a sampled value of about 500 MiB at `08:08Z`.
  Render's event timestamps and one-minute samples do not capture every fatal
  allocation, so a particular request cannot honestly be named as the sole
  cause.
- Deploy `dep-dbfno3bl550s739esd40` put commit `45b3cdde` live at `16:15Z`.
  It was triggered through the Render API before this investigation. The new
  instance remained available through the checked window and was using about
  324 MiB of 512 MiB at `18:09Z`. That is stable but still leaves limited
  burst headroom.

## Request-path evidence

- Shop Control refreshed its complete page payload every minute. Each refresh
  could start 11 API reads together, including the full `/trust-slips/me`
  evidence calculation even though Shop Control only displays three TrustSlip
  feature fields.
- The full TrustSlip reads took roughly 8?33 seconds in the inspected windows.
  Request concurrency reached 16 while the container telemetry reached about
  391 MiB.
- Pending-account detection used `passlib 1.7.4` with `bcrypt 5.0.0`. That
  incompatible pair emitted a six-line traceback whenever a pending password
  check ran. One nine-minute window contained 98 of those warnings; a later
  13-minute window contained 283.
- TrustSlip community context checked the same member activation state twice
  in one payload build. Each pending account check uses bcrypt, so duplicate
  checks added real CPU time and allowed more slow requests to overlap.

These are confirmed amplifiers. They strongly explain the slow request pileup
and reduced headroom, but they do not prove that one specific allocation caused
all five OOM kills.

## Cleanup

- Password hashing and verification now use the already-imported `bcrypt`
  package directly. `passlib` is removed from runtime requirements, eliminating
  the incompatible backend initialization and traceback flood without changing
  the bcrypt hash format.
- Pending-applicant password results are cached by password hash in a bounded
  4,096-entry process cache. A password change produces a new cache key, and
  active-account, sentinel, and fail-closed behavior remain unchanged.
- TrustSlip community context computes each member's activation state once per
  payload instead of twice.
- `GET /trust-slips/me/feature-summary` supplies only the current code, public
  verification path, and merchant-verification subscription status required by
  owner control surfaces. It does not build the rich TrustSlip evidence graph
  or issue/reissue a TrustSlip.
- `/app/shop-control` uses that lightweight route and changes the automatic
  full-page background refresh from every minute to every five minutes. Initial
  load, focus/visibility refresh, and explicit post-action refresh remain.

## Verification

- 49 entry/auth and focused TrustSlip tests passed.
- Six focused activation and current/summary/feature route regressions passed.
- Python application compilation passed.
- The 295-module production frontend build passed.
- `git diff --check` passed.

## Deployment evidence and remaining risk

- GitHub Backend Tests run `40376565709` passed for exact commit `80a91c1a`
  before deployment.
- Render frontend deploy `dep-dbfplr799u4c73enjud0` became live at
  `18:26:22Z` and API deploy `dep-dbfpms4s728c73cgti60` became live at
  `18:29:06Z`.
- Coordinated deploy run `40377456001` passed, including the live API identity
  contract audit. Direct public checks returned HTTP 200 for the frontend and
  API `/health`; the API reported `ok: true` and `dev_mode: false`.
- No error or critical API logs appeared between deployment start and the
  first post-live check. The Starter plan remains 512 MiB with one instance;
  no scale or plan change was made.

Do not claim that one successful startup proves the OOM problem is permanently
fixed. Observe the new instance's idle baseline, Shop Control bursts,
`/trust-slips/me` latency, bcrypt warnings, and restart events under normal
pilot use. If memory again exceeds about 470 MiB or any OOM recurs after this
cleanup, the 512 MiB plan is operationally undersized and an instance upgrade
should be considered alongside the next code-level profile.
