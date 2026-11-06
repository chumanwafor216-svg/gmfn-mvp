# DemandBox Protected Voice Pilot Handoff

Date: 2026-11-06

## Scope

- Route: authenticated `/app/demand-box`.
- Existing Marketplace, Dashboard, selected-community, possible-match,
  protected-person, fulfil/cancel, copy/contact, and governed one-hop relay
  ownership remains unchanged.
- The canonical `docs/HANDOFF_NOTES.md` could not be patched because it contains
  invalid legacy non-UTF-8 bytes. This dated record avoids silently re-encoding
  the historical file.

## Implemented

- Community Board demand signals now apply the central DemandBox audience rule,
  so `One person` requests are absent for unrelated members.
- Demand notifications use a privacy-safe display name or GSN reference and do
  not expose requester email.
- Requests and replies accept playable MP3, M4A, AAC, WAV, OGG, or WebM,
  validate declared type against the actual container, cap files at 8 MB and 60
  seconds, and store them below `GMFN_UPLOADS_DIR/.private-demandbox`.
- Direct `/uploads` access to private DemandBox audio is blocked. Authenticated
  playback rechecks request audience or exact reply participants.
- Portrait sharing is default-off on each request and reply. The API returns a
  portrait only after that explicit choice; otherwise the UI uses initials.
- Each non-owner sees only their private exchange with the requester. The owner
  may answer established responders. Request, reply, and repost writes use
  client keys for idempotency.
- Closed/expired owner requests remain under one collapsed history. `Post again`
  creates a new linked row, separately references copied request audio, and
  resets portrait and one-hop relay consent.
- The phone composer starts with six labelled subject pictograms and supports a
  local-language 60-second recording without required transcription. Text
  remains available.
- The exact request/reply voice sender has a two-step permanent-delete action.
  Confirmed deletion revokes playback immediately, records a voice_deleted
  lifecycle event, leaves an attribution tombstone, scrubs the original
  filename, and queues the protected file for bounded reference-aware cleanup.
  Recipients, owners, admins, expiry, and closure do not gain that authority.

## Verification

- Backend: 121 focused DemandBox, privacy, matching, intelligence, inspection,
  and relay tests passed.
- Frontend: production TypeScript/Vite build passed.
- Focused audits: DemandBox front package, expanded search, and Marketplace
  DemandBox ownership passed.
- Phone smoke: passed at `390x844` and `360x780`.
- Sender-deletion lifecycle and durable-cleanup regression tests pass, including
  unauthorised-recipient refusal, confirmation enforcement, idempotency,
  tombstone output, playback revocation, and physical retry-queue removal.
- Protected-button freeze: shared, Marketplace, Dashboard, Community, Shop,
  Notifications, admin, mobile, Trust, and route audits passed. The aggregate
  command then failed only pre-existing entry/invite contract checks in files
  untouched by this batch: `JoinEntryPage.tsx`, `MemberActivationPage.tsx`,
  `gmfn_backend/app/api/routes/clans.py`, and
  `gmfn_backend/tests/test_join_requests.py`.

## Voice Submission Race Repair

- Owner evidence: the supplied phone screenshots and WhatsApp video show the
  broken current state, not an approved target. `Taxi needed` and `House.` open
  a `Listen & reply` area but contain no playable original request recording.
- Production root cause confirmed: both requests have no audio attachment. The
  newer `House.` submission called the text-only marketplace request endpoint
  and never called the protected voice endpoint. Storage, playback permission,
  and protected download were therefore not the cause.
- Request and private-reply forms now receive active recorder state. Post/Send
  remains locked and says `Stop recording first` until Stop finishes, creates
  the `File`, and reports `Voice note ready`. The file reaches the parent form
  before submission unlocks, preventing silent text-only fallback while a
  recording is active.
- Requests with attached audio keep `Listen & reply`; requests without attached
  audio now say `Reply privately` instead of promising unavailable playback.
- Existing request/reply APIs, protected-audio access boundaries, sender-only
  permanent deletion, audience rules, selected-community behavior, and backend
  storage contracts remain unchanged.
- Verification passed: DemandBox front-package audit; phone browser journeys at
  `390x844` and `360x780` proving Record locks Post, Stop finalizes the file,
  and submission uses `/demand-box/requests/voice` without text-only fallback;
  the production frontend build; and all four focused protected-voice and
  private-response backend tests.
- Recovery truth: the missing `Taxi needed` and `House.` recordings were never
  uploaded and cannot be reconstructed. After deployment, a new recording must
  be posted to verify the corrected physical-phone path.

## Android Durationless WebM Compatibility

- Physical-phone retest reached the protected voice endpoint at 13:31 UTC but
  returned `400` with the playable-format message. This proves the submission
  race repair worked and exposed a separate server validation incompatibility.
- Reproduction confirmed that a valid live WebM/Opus recording can decode fully
  while its container header reports `Duration: N/A`; FFmpeg reports the real
  duration only in its final decoded `time=` progress. The former validator
  rejected that valid mobile-browser shape because it required header duration.
- Validation now accepts either trusted header duration or final decoded time,
  while still requiring successful full-file decoding, matching declared and
  detected containers, positive duration, the 60-second limit, and the 8 MB
  size limit. Invalid bytes and MIME/container mismatches remain rejected.
- The browser recorder now asks MediaRecorder for one complete final Blob on
  Stop instead of requesting 250 ms fragments, reducing mobile container
  fragmentation without changing the 60-second timer or user flow.
