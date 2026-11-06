# Shop Voice Release Handoff

Status: release candidate ready for pilot deployment; real-phone microphone and
playback confirmation remains required before calling the release complete.

## Included

- One current exact-owner shop welcome recording.
- One voice recording attached to an exact product or service.
- Shop Update accepts voice, text, or both.
- Demand Box reply attribution includes the sender's GSN ID.

## Boundaries

- Recordings are limited to 60 seconds.
- Public playback requires a deliberate Listen action and shows shop/member plus
  GSN ID attribution.
- Welcome follows active-shop visibility.
- Item voice follows that exact item's visibility and lifecycle.
- Shop Update voice stops publicly after the existing occurred_at-based 24-hour
  window while owner history remains.
- A platform admin or community owner does not inherit shop recording authority.
- Sender deletion immediately revokes playback, retains an attributed tombstone
  and queues the private object for bounded reference-aware cleanup.
- Community Bulletin voice, mandatory transcription, autoplay, payment changes,
  Spotlight publication and product/Diary merging are not included.

## Verification

- Seven focused Shop/Demand voice tests passed.
- Twenty-five adjacent Shop Diary, media cleanup and permanent-delete regression
  tests passed.
- Shop Diary Phase 1 and Phase 2 audits passed.
- Public Shop button inventory passed.
- TypeScript and Vite production build passed with 319 transformed modules.
- The protected mega-audit's Shop-specific guards passed. Unrelated existing
  entry-flow pattern guards and sandboxed browser spawns still fail separately.
- Real phone microphone permission, recording, playback, replacement and sender
  deletion remain post-deploy owner verification and are not claimed as tested
  from the CLI.
