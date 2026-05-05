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

Public viewer structure:

- shop signboard first
- public trust/contact strip as one three-cell strip on phone and desktop
- `Repost shop`, `Share shop`, and `Copy link` as one stable three-button row
- compact Spotlight advert framed as a community billboard from marketplace shops, with text/action plus a media frame
- compact Private Vault advert with text/actions plus a Vault visual
- `Shop Diaries` 12-block public shelf with product cards whose product media is visually dominant and whose `Open` and `Share` buttons never collapse into vertical letters
- Vault public-facing surfaces should use a vault-door style visual, not a bare `V` badge, so the meaning is private/premium storage rather than an unexplained letter.

Public viewer colour/theming rule:

- `/shop/:gmfnId` must use the global GSN colour system from `src/styles/tokens.css`.
- The public viewer shell must use `theme-public-shop` and public shop classes from `src/styles/public-shop.css`.
- Do not invent random page-local colours for this route. Dark navy is for the public signboard and authority, white cards are for readable shop/product content, gold is for trust/premium highlights, blue is for primary actions, green is only for live/ready/success, and red is only for danger.
- On phone, do not collapse the public trust/contact strip, the `Repost / Share / Copy` row, or the 12-block diaries grid into single-column stacks. The approved reference keeps them compact.

The public viewer should not show owner-side setup controls. Those belong in Shop Control.

## Product Rule

Shop Gallery is one owner/global-identity public shelf, not a separate shelf per community.

When the owner adds a public Shop Gallery product once, that product is visible inside every community where the shop owner is an active member. People outside those communities can view the same public shelf through the shop link. Vault-private products remain excluded from this public shelf and require a Vault link.

Each of the 12 public blocks must accept either:

- one picture, or
- one short video.

The owner should not need to understand file size or backend media fields. If the chosen media is heavier than the current pilot limit, the app should prepare a lighter version when possible and explain what it did.

## Media Rule

- Picture upload and pasted picture URL are supported.
- Video upload and pasted video URL are supported.
- Video-only blocks automatically receive a generated cover frame from the selected video.
- Public video blocks should play as video in the gallery, using the same media-frame behavior as Spotlight.
- Closed gallery cards may autoplay muted for mobile browser safety and must still expose a small explicit `Sound on` action for users who want to listen without opening the product. Opened product videos must also mount muted first, then show controls plus the same explicit `Sound on` action. `Open` is for product information/expanded viewing; it is not the audio toggle. The audio action must stay small enough that it does not cover the useful media area, and it must not fail silently if the browser blocks playback.
- Silent failure is not allowed. Any preparation or upload blocker must appear inside the selected block editor.
- After a picture or video is saved, the selected block must show a persistent success/failure message. Do not rely only on a short toast or a message inside a form that closes.

## Control Rule

- Shop Gallery owner controls and public shop controls must use the shared stable tap-target behavior from `src/styles/gmfnBrand.ts`.
- Primary controls must stay in stable grids/rows and should not resize or jump while copy changes between add, edit, hide, copy, preparing, posting, or updating states.
- On phones, selected-block actions, form actions, posted-item actions, and picture-control actions must be full-width rows. Hide/delete/restore must not share a cramped horizontal cluster.
- Recoverable blockers must be explained by the control surface instead of becoming silent/dead taps.
- Public product-card media controls must own their own taps. `Sound on`, `Sound off`, and native video controls must never trigger `Open` / `Close`.
- Do not make the entire public product card an open/collapse button. Only the visible `Open` / `Close` control may expand or collapse a product card; the audio control must remain independent.

## Separation Rule

This lane is only Shop Gallery.

Do not mix Free Spotlight, Subscription Spotlight, Vault, or unrelated owner tools into the normal Shop Gallery block editor. Those lanes must stay separate and enter through their own focused routes.

## Known Truth

The backend currently orders public products newest-first. It does not yet persist a fixed `slot_number`. The frontend selects the real block where the saved item appears after save. A true permanent block order requires a backend field and API contract.

The backend media upload endpoint stores the uploaded video file as received; it does not add or remove audio tracks. If an under-limit original video is silent after upload, treat the public player/unmute path as the first suspect. Oversized browser-prepared clips can still carry browser-specific audio risk until server-side media preparation exists.
