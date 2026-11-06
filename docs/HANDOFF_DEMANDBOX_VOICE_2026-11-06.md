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
