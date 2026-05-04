# Media Preparation Protocol

## Product Rule

GSN media pickers should not behave like silent file gates.

When a user picks a picture or video, the app should:

1. accept the selected file,
2. prepare a lighter/smaller version when the file is above the current lane limit,
3. upload the prepared file,
4. tell the user what was changed in plain language.

Do not ask normal users to understand file sizes before they can continue.

## Current Frontend Preparation Pattern

- Pictures use `prepareSpotlightImageFile` to resize/compress oversized images before upload.
- Videos use `prepareSpotlightVideoFile` to prepare a short clip that fits the current pilot media limit.
- If a selected video is already under the current upload size limit, keep the original file to preserve audio. Limit public playback in the player instead of re-recording a silent copy.
- Video display surfaces should show safe muted motion first. When audio is available, the shared media frame must provide an explicit `Sound on` / `Sound off` toggle so the user controls listening.
- Shop Gallery video-only blocks use `createShopGalleryCoverFromVideo` to generate the needed cover frame automatically.
- If preparation succeeds, the UI should show an info notice such as: `We prepared a lighter picture automatically...`
- If preparation is impossible in the current browser, the UI must show the reason directly beside the picker or submit button.

## Current Backend Limits

- Marketplace images currently upload through `/marketplace/media/image`.
- Marketplace videos currently upload through `/marketplace/media/video`.
- Public product gallery storage still has an underlying cover field, but the user-facing block must accept either picture or video. When a user chooses only video, the frontend creates the cover frame automatically.

## Lane Rule

Reuse this preparation pattern for Shop Gallery, Free Spotlight, Subscription Spotlight, and Vault media lanes unless a lane has a stricter written product rule.

Failing silently is not allowed.

## Shop Gallery Block Rule

Every public shop gallery block should accept either:

- a picture, or
- a short video.

If the selected video needs a picture cover for an underlying product contract, the frontend should create that cover from a video frame automatically. Do not expose backend field names to the user.
