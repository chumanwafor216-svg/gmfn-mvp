# Shop Gallery Freeze

Freeze date: 2026-05-04

## Frozen Scope

The Shop Gallery lane is the public 12-block shop shelf inside Shop Control.

Primary owner route:

- `/app/shop-control#shop-control-gallery-tools`

Alias route:

- `/app/shop-gallery-control`

Public viewer route:

- `/shop/:gmfnId`

## Product Rule

Each of the 12 public blocks must accept either:

- one picture, or
- one short video.

The owner should not need to understand file size or backend media fields. If the chosen media is heavier than the current pilot limit, the app should prepare a lighter version when possible and explain what it did.

## Media Rule

- Picture upload and pasted picture URL are supported.
- Video upload and pasted video URL are supported.
- Video-only blocks automatically receive a generated cover frame from the selected video.
- Public video blocks should play as video in the gallery, using the same media-frame behavior as Spotlight.
- Closed gallery cards may autoplay muted for mobile browser safety. Opened product videos must show controls plus an explicit `Sound on` action that unmutes and plays inside the user's tap.
- Silent failure is not allowed. Any preparation or upload blocker must appear inside the selected block editor.
- After a picture or video is saved, the selected block must show a persistent success/failure message. Do not rely only on a short toast or a message inside a form that closes.

## Control Rule

- Shop Gallery owner controls and public shop controls must use the shared stable tap-target behavior from `src/styles/gmfnBrand.ts`.
- Primary controls must stay in stable grids/rows and should not resize or jump while copy changes between add, edit, hide, copy, preparing, posting, or updating states.
- On phones, selected-block actions, form actions, posted-item actions, and picture-control actions must be full-width rows. Hide/delete/restore must not share a cramped horizontal cluster.
- Recoverable blockers must be explained by the control surface instead of becoming silent/dead taps.

## Separation Rule

This lane is only Shop Gallery.

Do not mix Free Spotlight, Subscription Spotlight, Vault, or unrelated owner tools into the normal Shop Gallery block editor. Those lanes must stay separate and enter through their own focused routes.

## Known Truth

The backend currently orders public products newest-first. It does not yet persist a fixed `slot_number`. The frontend selects the real block where the saved item appears after save. A true permanent block order requires a backend field and API contract.

The backend media upload endpoint stores the uploaded video file as received; it does not add or remove audio tracks. If an under-limit original video is silent after upload, treat the public player/unmute path as the first suspect. Oversized browser-prepared clips can still carry browser-specific audio risk until server-side media preparation exists.
