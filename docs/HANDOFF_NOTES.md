# HANDOFF_NOTES.md

## Purpose
This file is the repo's lightweight continuity log.

Use it to recover work after a chat reset, a new session, or a branch handoff.
It is not the product source of truth. When this file and the code disagree,
trust the code, `README.md`, `docs/PROJECT_PROTOCOL.md`, and
`docs/FREEZE_POLICY.md`.

## How to use it
- Read this file after the core project docs and before editing code.
- Keep entries concrete: exact files, exact routes, exact backend endpoints.
- Separate confirmed facts from inference.
- After substantial work, add or refresh the latest checkpoint instead of
  leaving the next session to reconstruct intent from git history alone.

## Recommended checkpoint format
- Date
- Workstream
- Routes/screens affected
- Backend routes/endpoints involved
- Files in play
- Confirmed facts
- Open risks or unknowns
- Next recommended step

## Current checkpoint

### Date
2026-04-19

### Workstream
Dashboard branding pass corrected to the real visual benchmark:
`GSN summary` inside `WelcomePage`.

### Routes/screens affected
- `/app/dashboard`
- `WelcomePage` as design reference only
- supporting brand docs and continuity notes

### Backend routes/endpoints involved
- none

### Files in play
- `AGENTS.md`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/MyGMFNAndIPage.tsx`
- `frontend/src/lib/gmfnCapabilities.ts`
- `frontend/src/lib/marketWisdom.ts`
- `frontend/src/pages/WelcomePage.tsx`
- `docs/BRAND_STANDARD.md`
- `docs/HANDOFF_NOTES.md`

### Confirmed facts
- Product-owner clarification: the intended premium institutional reference is
  the lighter `GSN summary` treatment inside `frontend/src/pages/WelcomePage.tsx`,
  not the whole `MyGMFNAndIPage`.
- `frontend/src/pages/DashboardPage.tsx` was updated route-locally to move
  toward that Welcome summary language without changing dashboard logic,
  routes, or data contracts.
- The dashboard now uses a lighter blue-white page wash instead of a full-screen
  dark blue field, which makes the route calmer and less intimidating for the
  underbanked audience the product is targeting.
- Dashboard helper styles were retuned toward a more institutional visual
  system: cards, inner cards, route tiles, badges, inputs, and buttons now use
  lighter blue-white panels, calmer borders, and blue-led actions rather than
  relying so heavily on dark/gold treatment.
- The dashboard hero still keeps a premium blue outer field, but its top
  orientation panel now uses the Welcome-summary-style lighter information card
  with dark text, restrained blue emphasis, and gold used as a supporting
  accent rather than the dominant reading color.
- Several main dashboard sections now use the softer branded panel treatment,
  including Spotlight, Demand Control, and Operational Focus.
- The live spotlight block on `/app/dashboard` was then structurally tightened
  again so it behaves more like a dashboard module and less like a full-page
  hero. In `frontend/src/pages/DashboardPage.tsx`, the live spotlight now uses
  a desktop side-by-side composition, a shorter media height, and a useful
  right-hand seller/action preview even when the full seller dock is collapsed.
- The collapsed seller identity dock in the dashboard spotlight was then
  trimmed again because it had become too similar to the expanded dock. The
  collapsed state no longer carries teaser copy or extra seller actions, and
  the spotlight-level `Open shop` actions were removed from both the minimized
  strip and the expanded seller dock so the dashboard spotlight stays quieter
  and relies on marketplace/community navigation instead.
- The seller-dock toggle was then moved off the white side panel and onto the
  spotlight media itself as a premium glass/3D `Open` button. When the dock is
  closed, the extra seller-detail panel no longer renders at all, so the live
  spotlight stays visually cleaner and the control now feels attached to the
  media it governs.
- The first overlay placement still read too much like part of the top badge
  cluster, so the `Open` control was then moved again into its own floating
  layer on the spotlight media. It now sits as a dedicated right-side button
  with stronger depth, separate from the badges, so it stays visible on both
  desktop and compact layouts.
- Spotlight wording was then trimmed again for test readiness. The dashboard
  spotlight no longer carries the maker-facing intro sentence about visibility,
  no longer shows placeholder body copy when no extra detail exists, and the
  expanded seller-action panel now keeps only user-useful status and actions
  instead of long explanatory branding text.
- Spotlight controls were then consolidated further to reduce wasted space.
  `Minimize` was moved onto the spotlight media itself as a second floating
  overlay button under `Open`, and the duplicate minimize controls were removed
  from the section header and expanded seller-action panel. The live spotlight
  now keeps its main controls on-screen instead of spending extra layout space
  around the card.
- The floating `Minimize` control was then softened into the same silver visual
  family as the quieter overlay button treatment so it stays visible without
  pulling too much attention away from the spotlight media.
- The old two-panel Demand Control block was then replaced with one compact
  `Demand Box` surface on `/app/dashboard`. The heavier `Current request` and
  `What you can do now` panels were removed. The demand area now starts with one
  summary line showing open demand pressure, then uses small stable chips inside
  the same box for `Open requests`, `Urgent`, `Current request`, or `Create
  demand`. Pressing any one of those chips opens only one demand detail panel
  underneath inside the same block, so the route keeps the live demand signal
  without the extra wording and split-panel clutter.
- The `What Matters Now` notification block was then reorganised so it reads
  more intelligently on the dashboard. The large explainer, big count boxes,
  separate `What matters now` card, and separate `Next step` card were removed.
  The section now behaves as one compact `Notifications` surface. In collapsed
  state it only tells the user how many notifications are waiting and which
  screens they are coming from. The summary strip also keeps active chips inside
  the same box for `Act now`, `Due soon`, `Unread`, and each live source screen
  such as Demand Box, Open Finance, Join Links, Trust Events, General, or
  Spotlight. Pressing any one of those chips opens only that one detail panel
  underneath inside the same notification box. This keeps the dashboard
  notification area as one common screen instead of several tall mini-blocks or
  a separate open/close inbox section.
- The dashboard `Market Wisdom` block was then restored to a fuller multi-line
  reading. The old maker-facing helper sentence and `What Market Wisdom does`
  explain toggle were removed, because they were taking space while hiding the
  real signal.
- A later system-level correction then removed the remaining capability drift
  between `My GSN and I` and Market Wisdom. The shared capability truth now
  lives in `frontend/src/lib/gmfnCapabilities.ts`, and both
  `frontend/src/pages/MyGMFNAndIPage.tsx` and
  `frontend/src/lib/marketWisdom.ts` now read from that same 22-capability
  source instead of keeping separate hardcoded copies.
- The dashboard no longer shows raw labels such as `Capability 21` in the
  Market Wisdom chip row. It now shows a shared `22 core guide` chip and uses
  the actual capability title and explanation inside the `Guide` row, so the
  user sees a real line from the guide instead of a bare numeric reference.
- Market Wisdom now keeps three main rows in the card:
  `Market`, `GSN`, and `Guide`. The live context line still exists, but it was
  demoted into a smaller `Now` pulse strip under those rows so the dashboard
  stops treating a temporary context signal like a fourth permanent headline.
- `frontend/src/pages/MyGMFNAndIPage.tsx` also now uses the shared capability
  count instead of hardcoded `22` strings and falls back to proverb / GMFN
  explanation text when a capability does not yet have bespoke long-form copy.
- The spotlight `Close` state was then tightened because it felt too heavy
  against the quieter overlay controls. On `/app/dashboard`, the close-state
  button now uses a smaller footprint, lighter silver finish, and softer shadow
  so it lands more cleanly beside the `Minimize` control.
- A readability issue in the Market Wisdom section was corrected during the same
  pass so light panels no longer carry washed-out supporting text and pale
  low-contrast badges.
- `docs/BRAND_STANDARD.md` was corrected to reflect the real reference screen:
  `WelcomePage` summary treatment first, `MyGMFNAndIPage` as a secondary
  structure reference.
- Product-owner clarification for future assistants: `GMFN` is the wider
  corporate / owner context, but `GSN` (`Global Support Network`) is the
  default user-facing brand on visible product surfaces. New frontend wording
  and branded UX surfaces should default to `GSN` unless the product owner
  explicitly asks otherwise.
- The dashboard `Market Wisdom` surface was then reshaped again to feel more
  like a live intelligence module and less like a stacked written memo. The
  backend-driven logic was kept intact: the active reading still rotates from
  spotlight, demand, notifications, trust tone, capability context, and the
  shared market-wisdom deck. The UI now presents that logic through a smaller
  rotating attention stage, clickable signal selectors, a live activity badge,
  and a compressed commitment action when capability `22` is active.
- The user-facing line labels in that Market Wisdom module now default to
  `Market`, `GSN`, `Guide`, and `Now`, so the dashboard surface follows the GSN
  branding rule instead of surfacing `GMFN` as the user-facing label there.
- The four Market Wisdom selector lanes were then collapsed by default. The
  user now sees only the active rotating signal unless they press the
  in-screen `Open all` control inside the live Market Wisdom card. Pressing it
  reveals the four selector lanes in place; pressing `Hide all` collapses them
  again. This keeps the intelligence view visible without leaving the four
  lower selectors permanently open.
- The owner then explicitly froze the `/app/dashboard` Market Wisdom
  presentation and interaction model in this state. Future assistants should
  not restyle or restructure it unless the owner asks directly.
- A last wording cleanup then removed the extra small status chips around that
  section, including the temporary top-right live badge and the category / tone
  mini badges such as `Community`, `Calm`, or `Spotlight live`, so the
  intelligence card stays cleaner and less busy for the target audience.
- After that, the owner asked for the underlying Market Wisdom choice itself to
  rotate faster as well, not only the visible four-face signal layer. The
  dashboard now refreshes the selected Market Wisdom reading every 60 seconds
  instead of every 10 minutes, while keeping the frozen presentation and the
  7-second face rotation intact.
- The route-access card inside the dashboard `Operational Focus` section was
  then tightened into a GSN-style executive `Regular Apps` surface. It now
  keeps the four most-used dashboard routes on the face of the card and hides
  the rest under one `Open all` / `Collapse` control inside the same block,
  rather than leaving the full route list visible all the time.
- That route-access logic still remains usage-aware, but its fallback pool was
  expanded so `Money In` and `Money Out` can also surface alongside Community,
  Marketplace, Finance, and the other main dashboard routes before strong
  usage history has been established. This change is route-local to
  `/app/dashboard` and does not change backend contracts or navigation targets.
- A duplicate route-access layer inside `Operational Focus` was then removed
  after review. The overlap was not across the whole dashboard; it was inside
  the left `Priority Routes` block itself, where an extra `Other core routes`
  grid was repeating the same route-access job already handled by the right
  `Regular Apps` surface. The left block now behaves as a true `Next Route`
  surface with one primary route and optional support routes, while the right
  block remains the stable usage-based app launcher.
- That left route surface was then tightened again for user usefulness, not
  just wording. The logic was kept intact, but the visible block now behaves as
  a plain-language `Do This Now` helper for the target audience: simpler badge,
  simpler title, plain route names such as `Trust`, `Demand Box`, or
  `What Matters Now`, a short reason line explaining why the step helps, and a
  quieter `More help` reveal for the support pages around the current next
  move. This keeps it distinct from the right-side `Regular Apps` launcher.
- The `Do This Now` block was then tightened again so it explains the issue on
  the dashboard itself instead of pushing the user into technical reading
  first. It now uses the existing Open Trust / CCI / verification state to show
  two direct layman-language parts inside the block: what is wrong and what to
  do next. The route names shown inside that block were also softened into
  plainer labels such as `Trust Status`, `Identity Check`, `Verification`,
  `Queue`, `Requests`, and `Demand`. The support pages still exist under
  `More help`, but the main explanation now happens before the user opens them.
- That plain-language guidance was then moved out of the page into the shared
  frontend module `frontend/src/lib/dashboardUserGuidance.ts`. The dashboard
  now reads both the `Do This Now` helper copy and the trust-event notification
  copy from that shared module, so the explanation layer is no longer trapped
  in `DashboardPage.tsx`. This is a system-level frontend correction for the
  dashboard guidance lane rather than another page-only wording patch.
- That shared guidance module was then tightened again so the dashboard helper
  does not merely say `open Trust Status` or `open Verification` and send the
  user away to decode the problem. It now also reads the existing trust
  explainer signals (`weakens` and `next`) and uses them to say, on the
  dashboard itself, what is wrong and the first action to take in simple
  language before the user opens the follow-through page.
- The shared guidance module was then tightened one step further to follow the
  owner’s exact pattern for low-literacy / low-time users: `Problem`, `Why it
  matters`, and `Do this`. The dashboard helper now shows those three parts on
  the card itself, and the shared translator also softens some technical words
  from trust/identity guidance into simpler language before the user sees them.
- That same shared guidance module was then tightened again so the `Problem`
  and `Do this` lines try to name the exact issue more directly instead of
  stopping at general trust wording. In
  `frontend/src/lib/dashboardUserGuidance.ts`, the repair helper now checks the
  live trust/CCI explanation text for clearer issue types such as waiting
  requests, delayed replies, notifications/messages, demand/support pressure,
  unfinished follow-through, or identity/verification gaps, and then rewrites
  the dashboard copy in a more direct low-literacy form. The same shared repair
  interpretation also now feeds the dashboard trust-notice surface, so both the
  helper card and the trust notice use the same system-level explanation layer.
- The dashboard notifications surface was then linked more directly to that
  shared helper logic. Inside `frontend/src/pages/DashboardPage.tsx`, the
  Notifications block now carries its own attached `Notification Guide`
  companion card whenever notifications are present. That companion uses the
  same shared `Problem / Why it matters / Do this` copy as the wider `Do This
  Now` block, adds a direct route button to the current next action, and uses a
  subtle pulse when unread or act-now notification pressure is present. This
  keeps the explanation physically closer to the notification surface without
  changing the shared logic source or the backend contracts.
- A separate shared attention-escalation layer was then added in
  `frontend/src/lib/dashboardAttentionEngine.ts`. This new engine tracks the
  active issue signature in local storage, shows the first popup immediately,
  then escalates reminder timing while the same issue remains unresolved: every
  4 hours at first, then every 2 hours after roughly 2 days, then every 1 hour
  after roughly 4 days while the app is open. The wording also changes with the
  escalation stage instead of repeating the same sentence forever.
- That attention engine is now wired into `/app/dashboard` through a fixed
  slide-down `Attention Guide` popup plus a smaller collapsed reminder pill in
  `frontend/src/pages/DashboardPage.tsx`. The popup uses the same shared
  `Problem / Why it matters / Do this` structure, but adds time-based
  escalation, direct route buttons, and a hide-for-now action.
- Overdue focus commitments now feed that same attention engine directly. When
  a commitment is behind, the popup no longer speaks only in general trust
  language; it now says that the commitment is behind schedule, explains that
  delayed follow-through can weaken trust, and sends the user straight to Focus
  Commitments to check in, replan honestly, or complete the overdue target.
- The repo instructions were also updated in `AGENTS.md` so future assistants
  default user-visible explanation layers and layman-language translations to
  shared/system-level frontend logic unless the owner explicitly asks for a
  page-local exception and that exception is recorded.
- `AGENTS.md` now also records a second guidance rule: helper blocks,
  notification surfaces, and decision cards should explain what is wrong, why
  it matters, and the first action to take before sending the user to another
  page to continue.

### Open risks or unknowns
- This is a dashboard-first pass, not a full-app visual migration.
- Other high-visibility pages such as `/app/community`, `/app/marketplace`, and
  `/app/shop-control` still carry their own older route-local styling systems.
- The dashboard still contains a few intentionally premium dark surfaces,
  especially around the profile/trust block and spotlight media frame. If they
  still feel too heavy in review, soften them in a second dashboard-only pass.
- The spotlight is now less vertically heavy, but the exact ideal height may
  still need visual tuning after browser review on the target screen sizes.
- The new issue/action personalization is only as specific as the live
  trust/CCI explanation signals it receives. If the upstream guidance source is
  itself vague in a given case, the dashboard helper will still become plainer
  than before, but it may not always name a perfectly exact real-world cause.
- The new attention popup/escalation layer is browser-session based. It works
  while the dashboard/web app is open, but it is not yet a true background
  phone/browser-notification system with vibration, service-worker delivery, or
  operating-system-level alerts while the app is closed.

### Next recommended step
- Continue the same Welcome-summary-led branding language into
  `/app/community`, then `/app/marketplace`, then `/app/shop-control`.
- Review the updated `/app/dashboard` `Do This Now` helper against real trust
  and identity states. If any live case still reads too much like translated
  system language, improve the shared detectors in
  `frontend/src/lib/dashboardUserGuidance.ts` instead of patching the page.
- Review the new `Attention Guide` popup live on `/app/dashboard` and decide
  whether the next step should be:
  1. a stronger popup/slide-down behavior,
  2. a true browser/service-worker notification layer for closed-app alerts, or
  3. a trust-summary cleanup so `Trust Journey` becomes quieter when the new
     attention engine is already carrying the immediate warning.
- If the dashboard still feels too dark in the trust/profile block after visual
  review, do a second dashboard-only refinement there rather than reopening the
  whole route.
- If the spotlight still feels oversized after live review, reduce only the
  dashboard spotlight media height again rather than changing other spotlight
  surfaces.

## Previous checkpoint

### Date
2026-04-19

### Workstream
Dashboard spotlight visibility fallback and expired-spotlight diagnosis.

### Routes/screens affected
- `/app/dashboard`
- `/app/community`

### Backend routes/endpoints involved
- `GET /marketplace/broadcasts`
- `POST /marketplace/broadcasts`

### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/CommunityHomePage.tsx`
- `frontend/src/lib/api.ts`
- `gmfn_backend/app/api/routes/marketplace.py`
- `gmfn_backend/gmfn.db`

### Confirmed facts
- The dashboard spotlight section only loads `active_only` marketplace
  broadcasts by default.
- Backend logs showed successful dashboard requests to
  `GET /marketplace/broadcasts?clan_id=3&active_only=true&limit=20`.
- Local database inspection showed marketplace broadcast records do exist for
  clan `3`, but the latest stored rows are expired.
- Example confirmed row: broadcast `id 56`, created `2026-04-17`, with
  `expires_at` `2026-04-17 23:59:59`, so it is not returned by the dashboard's
  active-only query on `2026-04-19`.
- The issue was therefore not a missing route or broken serializer. It was that
  the dashboard empty state gave no explanation when the latest spotlight had
  already ended.
- `frontend/src/pages/DashboardPage.tsx` was updated so that when no active
  spotlight exists, it also loads the latest recent spotlight snapshot and shows
  an explanatory expired/not-live card instead of only saying
  `No active spotlight is available yet.`
- A later publish attempt with an image failed before spotlight creation because
  backend route `POST /marketplace/media/image` returned `500 Internal Server Error`.
- Root cause: `gmfn_backend/app/api/routes/marketplace_media.py` referenced
  undefined names `IMAGE_UPLOAD_DIR` and `VIDEO_UPLOAD_DIR` inside the image and
  video upload handlers.
- Fix applied: those handlers now write to `_image_upload_dir()` and
  `_video_upload_dir()` respectively.
- Backend process serving `127.0.0.1:8012` was restarted so the media-route fix
  is active in the running app.
- Verified live through the frontend proxy:
  `POST /api/marketplace/media/image` now returns `200 OK` instead of `500`.
- The next failed browser attempt no longer crashed the backend, but still
  stopped before `POST /marketplace/broadcasts`; backend logs showed
  `POST /marketplace/media/image` returning `400 Bad Request`.
- `frontend/src/pages/CommunityHomePage.tsx` was updated so the Spotlight
  panel now validates selected images before upload, only accepts backend-
  supported image types (`JPG`, `PNG`, `WebP`), enforces the same 5MB limit in
  the UI, and shows an inline status/error notice directly beside the publish
  controls instead of relying only on the page-wide notice banner.
- The spotlight image upload limit was then increased from `5 MB` to `10 MB`
  in both backend route `gmfn_backend/app/api/routes/marketplace_media.py` and
  frontend screen `frontend/src/pages/CommunityHomePage.tsx` so heavier local
  photos are less likely to be rejected.
- The backend process on `127.0.0.1:8012` was restarted after the limit change,
  and a live upload check with a `6 MB` test image returned `200 OK` through
  `POST /api/marketplace/media/image`, confirming the higher limit is active.
- The media validator was then tightened for real-world local uploads:
  `gmfn_backend/app/api/routes/marketplace_media.py` now normalizes common image
  MIME aliases such as `image/jpg`, strips MIME parameters, and accepts generic
  `application/octet-stream` uploads when the file extension is still a
  supported image type.
- `frontend/src/pages/CommunityHomePage.tsx` now mirrors that loosened image
  recognition by accepting common MIME aliases and valid `.jpg`, `.jpeg`,
  `.png`, and `.webp` extensions even when the browser reports a generic file
  type.
- After restart, live checks through `/api/marketplace/media/image` succeeded
  for both `image/jpg` and `application/octet-stream` `.jpg` uploads.
- Spotlight rendering was then upgraded so images no longer rely on hard
  `cover` cropping in Community Home and Dashboard. A new frontend component,
  `frontend/src/components/SpotlightMediaFrame.tsx`, now shows the full image
  inside a bounded frame with a softened backdrop, so portrait and uneven local
  photos stay visible without forcing awkward scrolling or random cut-offs.
- Community Home spotlight publishing now accepts either an image or a short
  video, with preview support for both. The spotlight form in
  `frontend/src/pages/CommunityHomePage.tsx` now exposes a separate short-video
  input, uses a smarter media preview, and sends optional `video_url` when a
  spotlight video is uploaded.
- Dashboard spotlight display in
  `frontend/src/pages/DashboardPage.tsx` now uses the same smarter media frame
  and can autoplay a published spotlight video in the live spotlight hero while
  still falling back to an image when needed.
- Backend spotlight broadcasts were extended with `video_url` support in
  `gmfn_backend/app/api/routes/marketplace.py` and
  `gmfn_backend/app/db/models.py`. A local SQLite schema update added
  `marketplace_broadcasts.video_url`, and helper script
  `gmfn_backend/add_broadcast_video_url.py` was added for repeatable local setup.
- Marketplace video upload size was increased to `10 MB`, and a live upload
  check through `POST /api/marketplace/media/video` succeeded with a `9 MB`
  test `.mp4` file after restart.
- To reduce user friction further, Community Home now auto-prepares oversized
  spotlight media before upload. New frontend helper
  `frontend/src/lib/spotlightMediaPrep.ts` can:
  - compress oversized photos into a lighter `.jpg` automatically
  - create a shorter spotlight-ready video clip automatically when the selected
    file is too heavy or too long for the spotlight lane
- `frontend/src/pages/CommunityHomePage.tsx` now uses that helper so users do
  not need to know file sizes in advance. The screen shows when media is being
  prepared and explains when the app has created a lighter picture or kept the
  opening seconds of a spotlight-ready video automatically.
- The spotlight media model was then aligned across the remaining older
  spotlight surfaces. `frontend/src/pages/ShopControlPage.tsx` now supports the
  same `image_url + video_url` publish shape as Community Home, including short
  video upload, optional image fallback, automatic media preparation, and live
  preview through `frontend/src/components/SpotlightMediaFrame.tsx`.
- Read-only spotlight consumers were also aligned to the same media shape:
  `frontend/src/components/CommunityMarketplaceSpotlight.tsx` and
  `frontend/src/pages/ShopGalleryPage.tsx` now read and display spotlight
  `video_url` as well as `image_url`, instead of remaining image-only.
- The mini spotlight card on `frontend/src/pages/ShopGalleryPage.tsx` then got
  its own sizing correction. Its media lane had been limited to about `108px`
  tall, which made some images look overly compressed compared with the
  dashboard spotlight. The card now gives the media a taller frame and a wider
  desktop column so the same spotlight asset remains legible on the shop
  gallery screen even though the surface is still smaller than the dashboard.
- The mini spotlight card was then tightened again so the media itself occupies
  most of the teaser frame. `frontend/src/components/SpotlightMediaFrame.tsx`
  now accepts route-level content padding overrides, and the mini spotlight in
  `frontend/src/pages/ShopGalleryPage.tsx` uses a denser thumbnail-style fill
  with smaller inner padding. This keeps the shop gallery spotlight visually
  fuller than before while leaving the dashboard spotlight on the more
  full-picture presentation.
- The mini spotlight card was then rebalanced again so more of the fixed card
  goes to the image itself instead of the info stack below it. The media lane
  in `frontend/src/pages/ShopGalleryPage.tsx` was increased again, while the
  lower badges, trust/date line, and action buttons were compressed into a
  tighter layout so the card can devote more of its surface to the picture
  without enlarging the overall block.
- The mini spotlight card was then tightened one more time around the same
  principle: keep the overall card size stable, but move more of that fixed
  surface into the media lane. The community/video chips were moved onto the
  image as overlays, the title/detail and trust/date rows were flattened into a
  more compact layout, and the action buttons were reduced slightly so the
  picture can expand further inside the same block instead of growing the block
  itself.
- The mini spotlight action buttons were then redesigned again to stop
  competing with the card layout. The old bottom button row was removed from
  `frontend/src/pages/ShopGalleryPage.tsx`, those actions now appear as much
  smaller silver overlay buttons on the spotlight media itself, and the freed
  space was handed back to the image lane so the picture can grow inside the
  same card footprint.
- The text band under the mini spotlight was then flattened again to remove
  leftover white space. Instead of keeping the title/detail and trust/date as
  stacked blocks, `frontend/src/pages/ShopGalleryPage.tsx` now uses a more
  linear single-row info ribbon with ellipsis handling, and the saved height
  was handed back to the media lane so the spotlight image can expand a bit
  more inside the same outer card.
- The mini spotlight footer was then refined again so the spotlight tag can
  sit with the date on the same side instead of competing with the shop title.
  `frontend/src/pages/ShopGalleryPage.tsx` now splits `Tag: ...` out of the
  spotlight message, places that tag beside the timestamp in the right-side
  meta cluster, keeps the shop name as the dominant lower label, and gives the
  media lane a little more of the fixed card height.
- The mini spotlight action logic was then tightened so the overlay buttons
  follow the currently displayed spotlight item exactly. On
  `frontend/src/pages/ShopGalleryPage.tsx`, `Shop` now links only to the active
  spotlight owner's public shop route and `Community` only to that active
  spotlight's linked community route. Those buttons no longer fall back to a
  generic marketplace page when the current spotlight item does not expose that
  specific target.
- The dashboard fix is route-local and built successfully with
  `npm run build` in `frontend/`.

### Open risks or unknowns
- The dashboard now explains expired spotlight state, but it does not change the
  underlying publishing rules or expiry choices.
- If the running backend process does not auto-reload route changes, the server
  may need a restart before the fixed media upload handlers take effect.
- If spotlight publishing still feels too short-lived in practice, the next
  review should inspect the default expiry experience in
  `frontend/src/pages/CommunityHomePage.tsx`.
- If the browser still appears unresponsive after this UI validation change,
  capture the exact inline Spotlight notice text shown in Community Home and
  compare it against the corresponding backend log entry.
- The supported image formats are still limited to `JPG`, `PNG`, and `WebP`.
  This checkpoint only raised the size limit; it did not broaden format
  support.
- This change makes validation more forgiving, but it still does not add
  browser-safe support for `HEIC/HEIF`; that would require a separate format
  strategy rather than only validator changes.
- Spotlight video support required a schema extension on the local SQLite DB.
  Any other environment using an older `marketplace_broadcasts` table will need
  the same `video_url` column added before the new spotlight code can run there.
- Auto video preparation is frontend/browser-dependent. It currently relies on
  browser support for `MediaRecorder` plus `captureStream()`. Where those APIs
  are unavailable, the app can still explain the problem clearly but may not be
  able to auto-create the shortened clip.
- Shop Control now shares the same spotlight media behavior, but it still uses
  its own route-local validation copy rather than a single shared validator
  module. If future spotlight rules change again, check both
  `frontend/src/pages/CommunityHomePage.tsx` and
  `frontend/src/pages/ShopControlPage.tsx` together.
- The current handoff file now contains both invite-flow and spotlight-flow
  context; if it grows too large, split older entries into an archive section.

### Next recommended step
- Re-test the dashboard spotlight route in the browser after publishing a fresh
  spotlight from Community Home.
- Re-test the compact spotlight composer in `/app/shop-control`, plus the
  community spotlight reader in `CommunityMarketplaceSpotlight` and the mini
  spotlight on `/shop/:gmfnId`, to confirm video-backed spotlights behave the
  same way as image-backed ones across those older surfaces.
- Re-test image-backed spotlight publish specifically, since that path was
  first blocked by the media upload crash and then by frontend/backend file
  validation mismatch.
- If the newly published spotlight still does not appear live, compare the new
  `POST /marketplace/broadcasts` row and its `expires_at` value against the
  dashboard's active-only fetch immediately after publish.

## Auth follow-up

### Date
2026-04-19

### Workstream
Backend login `500` trace and runtime-safe auth fix.

### Routes/screens affected
- `/login`
- `/api/auth/login`

### Backend routes/endpoints involved
- `POST /auth/login`

### Files in play
- `gmfn_backend/app/core/security.py`
- `gmfn_backend/app/api/routes/auth.py`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/LoginPage.tsx`

### Confirmed facts
- The reported login failure was real: `POST /auth/login` could return `500`
  in the current local runtime.
- The root cause was not the login page itself. It was password verification in
  `gmfn_backend/app/core/security.py`, where Passlib's bcrypt backend could
  crash during verification on the current Python/bcrypt runtime with:
  `ValueError: password cannot be longer than 72 bytes...`.
- The failure happened even with a normal short password (`pass1234`), so this
  was a runtime compatibility problem rather than user input length alone.
- A minimal backend fix was added in `gmfn_backend/app/core/security.py`:
  password hash/verify now try Passlib first, then fall back to direct
  `bcrypt.hashpw()` / `bcrypt.checkpw()` if the Passlib bcrypt backend fails.
- Verified after the fix with the local account `admin@test.com`:
  direct backend login at `http://127.0.0.1:8012/auth/login` returned `200`,
  and the frontend proxy path `http://127.0.0.1:5174/api/auth/login` also
  returned `200`.
- The local backend had to be relaunched with dev env values so it could boot
  against `gmfn_backend/gmfn.db`:
  `GMFN_DEV_MODE=1` and
  `GMFN_SECRET_KEY=gmfn-dev-secret-please-change-later`.

### Open risks or unknowns
- The runtime still emits Passlib bcrypt warnings (`error reading bcrypt
  version`) on startup. Login now works, but the environment still has a
  passlib/bcrypt compatibility mismatch worth cleaning up later.
- Passwords longer than bcrypt's 72-byte limit are still a separate product
  concern. This fix stops the crash and falls back safely, but it does not add
  a user-facing password-length policy yet.

### Next recommended step
- Keep the auth fix in `gmfn_backend/app/core/security.py` as the system-level
  protection for the current runtime.
- If auth work continues, decide whether to add an explicit frontend/backend
  password max-length rule so overly long passwords fail clearly instead of
  relying on bcrypt behavior.

## Dashboard cleanup follow-up

### Date
2026-04-19

### Workstream
Dashboard attention-guide cleanup after popup rollout.

### Routes/screens affected
- `/app/dashboard`

### Backend routes/endpoints involved
- none

### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Confirmed facts
- After the attention escalation popup was introduced, the permanently attached
  `Notification Guide` card inside the Notifications block became redundant and
  too heavy for the dashboard surface.
- That attached guide card has now been removed from
  `frontend/src/pages/DashboardPage.tsx`.
- The dashboard now keeps only the popup `Attention Guide` plus the small fixed
  collapsed reminder pill/button when the popup is hidden.
- The Notifications block still shows the notification summary and the
  notification-source panels, but it no longer carries a second permanent
  explanation surface under it.

### Open risks or unknowns
- The owner may still want the collapsed reminder pill/button restyled later,
  but the clutter reduction rule is now clear: no permanently attached
  notification guide card.

### Next recommended step
- Keep the dashboard attention behavior as popup-plus-pill unless the owner
  explicitly asks for a different reminder surface.

## Dashboard layout follow-up

### Date
2026-04-19

### Workstream
Dashboard row cleanup after Market Wisdom.

### Routes/screens affected
- `/app/dashboard`

### Backend routes/endpoints involved
- none

### Files in play
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

### Confirmed facts
- The owner confirmed that the left helper card still sitting beside
  `Regular Apps` after Market Wisdom was adding duplication and clutter.
- The `Do This Now` / `priority-routes` dashboard surface has now been removed
  from that row in `frontend/src/pages/DashboardPage.tsx`.
- `Regular Apps` now stands on its own in that area instead of being paired
  with the left helper block.
- The shared next-route / attention logic still remains in code for the popup
  reminder and attention engine; only the permanent dashboard surface was
  removed.
- The outer `Operational Focus` section now speaks more quietly about regular
  apps and commitments instead of surfacing the removed helper card.

### Open risks or unknowns
- `routesExpanded` still exists in the stored dashboard UI state for backwards
  compatibility, but it no longer drives a visible surface after this cleanup.

### Next recommended step
- Keep `Regular Apps` as the only surface in that row unless the owner asks for
  a new dedicated companion there.

### 2026-04-19 addendum

#### Workstream
System-level `Regular Apps` tracking for the dashboard.

#### Routes/screens affected
- `/app/dashboard`
- shared `/app/*` shell through `AppLayout`

#### Backend routes/endpoints involved
- none

#### Files in play
- `frontend/src/layout/AppLayout.tsx`
- `frontend/src/lib/dashboardAppUsage.ts`
- `frontend/src/pages/DashboardPage.tsx`
- `docs/HANDOFF_NOTES.md`

#### Confirmed facts
- `Regular Apps` was previously learning mostly from dashboard-local clicks in
  `frontend/src/pages/DashboardPage.tsx`, not from wider app usage.
- System-level frontend tracking now lives in
  `frontend/src/lib/dashboardAppUsage.ts`.
- `frontend/src/layout/AppLayout.tsx` now records actual route visits for the
  tracked `/app/*` screens, so usage is collected from normal app movement
  rather than only dashboard buttons.
- That shared usage module now writes to
  `gmfn.dashboard.app-usage.v2`, which intentionally replaces the older
  dashboard-local storage version so stale click history does not distort the
  new ranking.
- The shared tracker also includes a short immediate-duplicate guard so React
  development double-effects do not inflate counts on the same route.
- On `/app/dashboard`, the `Regular Apps` face now shows only the true top four
  regularly used apps when real usage history exists.
- If there is not enough real usage history yet, the dashboard still falls back
  to a small safe starter set so the block does not appear empty.
- `Loans & Support` is now part of the same usage/fallback model instead of
  being left out of the regular-app ranking lane.
- Dashboard buttons no longer increment usage locally before navigation; the
  count now comes from arriving on the destination route through the shared app
  shell.
- The `Regular Apps` surface was then visually tightened again for the target
  audience. The extra helper sentence, count badges, and `Open all` / hidden
  routes layer were removed. The block now shows only the `Regular Apps` title
  and the four surface buttons in one compact row, while keeping the same
  system-level usage logic behind it.
- The `Regular Apps` buttons were then compressed again so they no longer read
  like oversized route tiles. On desktop they now behave as smaller direct app
  pills in one straight line, while compact layouts can still wrap cleanly.
- The wider `Operational Focus` header was also cleaned up again so it no
  longer shows maker-facing helper text, and the visible `No review scheduled`
  wording was removed from the dashboard face. Focus review text now appears
  only when there is a real next review to show.
- The dashboard structure was then split one step further: `Regular Apps` now
  lives in its own separate page-level block instead of sharing the old
  `Operational Focus` wrapper with `Focus Commitments`. This keeps the four-app
  row visually independent from the commitment area and reduces congestion on
  the dashboard face.
- The top face of `Focus Commitments` was then compressed with the same rule:
  remove builder-style wording, reduce empty space, and keep the business
  signal. The large headline and helper paragraph were removed, the next-review
  reading moved into a compact header badge when present, and the `On track`,
  `Watch`, and `Behind` counts now sit in one compact summary line instead of
  three tall stat cards.
- That focus-summary lane was then tightened again so the three readings stay
  on one shared row with smaller inline counts, and the empty-state starter
  actions (`Start savings target`, `Start business target`, `Start repayment
  target`) now also sit on one straight row instead of wrapping into extra
  height.
- `Focus Commitments` was then split into its own independent page-level block
  instead of sharing the same outer dashboard wrapper with `Trust Journey`.
  The empty-state copy there was also shortened again so the block stays
  tighter while keeping the same commitment business meaning.

#### Open risks or unknowns
- The usage model is frontend-local storage for now. It is system-level within
  the web app, but it is not yet a backend-synced cross-device history.
- The current tracker covers the main `/app/*` routes that matter for the
  dashboard. If a new route should influence `Regular Apps`, add it in
  `frontend/src/lib/dashboardAppUsage.ts` instead of patching the dashboard
  page directly.

#### Next recommended step
- Live-test the dashboard by opening several different `/app/*` routes in a
  normal session, then return to `/app/dashboard` and confirm the top four on
  the `Regular Apps` face match actual usage order.
- If the owner wants usage to survive across devices or accounts, the next
  escalation is a backend-backed usage history instead of more local-page work.

## Previous checkpoint

### Date
2026-04-19

### Workstream
GSN-branded invite composer and invite-entry continuity.

### Routes/screens affected
- `/invite-composer-preview`
- `/app/clans`
- `/join`
- `/invite/:code`
- `/get-invite/:code`

### Backend routes/endpoints involved
- `POST /clans/{clan_id}/invite`
- `GET /clans/{clan_id}/invite-link`
- `GET /invites/preview/{code}`
- `POST /clans/join-requests`

### Files in play
- `frontend/src/pages/InviteComposerPreviewPage.tsx`
- `frontend/src/pages/ClansPage.tsx`
- `frontend/src/pages/JoinEntryPage.tsx`
- `frontend/src/pages/InviteLandingPage.tsx`
- `frontend/src/App.tsx`
- `frontend/src/lib/api.ts`
- `gmfn_backend/app/api/routes/clans.py`
- `gmfn_backend/app/api/routes/invites.py`

### Confirmed facts
- `frontend/src/pages/InviteComposerPreviewPage.tsx` is a temporary standalone
  branded preview page added in commit `884bd6b` (`Add temporary branded invite
  composer preview`).
- The standalone preview is routed only at `/invite-composer-preview`.
- The live create-invite flow currently lives inside
  `frontend/src/pages/ClansPage.tsx` on authenticated route `/app/clans`.
- The live invite form in `ClansPage` opens as a modal, collects sender,
  receiver, and note, then creates an invite package.
- Frontend create-invite uses `createClanInvite()` in
  `frontend/src/lib/api.ts`, which calls `POST /clans/{clan_id}/invite`.
- Backend create-invite is enforced through
  `gmfn_backend/app/api/routes/clans.py`, where invite creation is tied to the
  clan/community route and admin membership checks.
- Invite consumption remains a distinct flow from invite creation.
- Public invite preview is exposed through `GET /invites/preview/{code}` in
  `gmfn_backend/app/api/routes/invites.py`.
- Join submission reads invite-derived params in
  `frontend/src/pages/JoinEntryPage.tsx` and submits through
  `POST /clans/join-requests`.
- In the current router, `/invite/:code` and `/get-invite/:code` redirect into
  the invite entry path through `/cover` query params.
- `frontend/src/pages/InviteLandingPage.tsx` exists, but it does not appear to
  be the active public route in the current `frontend/src/App.tsx`.
- At the time of this checkpoint, local uncommitted work existed in:
  `frontend/src/pages/ActivateMembershipPage.tsx`,
  `frontend/src/pages/ClansPage.tsx`,
  `frontend/src/pages/InviteComposerPreviewPage.tsx`, and
  `frontend/src/pages/MarketplacePage.tsx`.

### Open risks or unknowns
- The standalone preview and the live modal can drift visually if one is
  polished without updating the other.
- `InviteLandingPage.tsx` may represent an older or alternate invite-entry
  surface; confirm whether it should be restored, retired, or kept as a backup.
- Desktop/web parity against the original phone invite flow still needs a
  deliberate check before broader invite changes.

### Next recommended step
- Continue invite-product work from `frontend/src/pages/ClansPage.tsx`, because
  that is the live create-invite flow.
- Treat `frontend/src/pages/InviteComposerPreviewPage.tsx` as a visual reference
  or sandbox unless it is explicitly promoted into the real route flow.
- If invite-entry behavior changes next, trace the full path across
  `frontend/src/App.tsx`, `frontend/src/pages/JoinEntryPage.tsx`,
  `frontend/src/lib/api.ts`, `gmfn_backend/app/api/routes/clans.py`, and
  `gmfn_backend/app/api/routes/invites.py` before editing.

## 2026-04-19 Dashboard trust journey compression

- Route affected: `/app/dashboard`
- File changed: `frontend/src/pages/DashboardPage.tsx`
- Verification: `npm run build` passed in `frontend`

### What changed

- `Trust Journey` was compressed into a tighter user-facing block instead of a
  large repeated trust report.
- The exact `Helping` and `Needs care` wording is now driven by shared
  frontend logic in `frontend/src/lib/dashboardUserGuidance.ts`, not only by
  page-local wording inside `DashboardPage.tsx`.
- `Trust Journey` and the popup `Attention Guide` now share one trust-attention
  interpreter in `frontend/src/lib/dashboardUserGuidance.ts` through
  `buildDashboardTrustAttentionCore(...)`.
- The posture wording was simplified into more direct language:
  - `Finish your trust record first`
  - `Fix this trust issue now`
  - `Trust is starting to slip`
  - `Trust is working well`
  - `Trust is steady`
- The old large stat-card row and separate `Built / Protected / Weakened /
  Repair` badge row were removed from the default face.
- The visible face now uses:
  - one compact header
  - one row of small trust status pills (`Trust`, `CCI`, `Slip`, `Focus`)
  - three smaller panels: `Helping`, `Needs care`, and `Do this now`
- Expanded trust detail still exists, but it is now lighter:
  - `What is helping`
  - `What needs care`
  - one smaller lower strip for commitment/count summary and the secondary route
- The shared trust-journey explainer now tries to name the exact user-visible
  issue more directly:
  - behind focus commitments
  - waiting join requests
  - unread or act-now notifications
  - missing TrustSlip
  - broader trust/CCI warning text only when the above are not the main issue
- The shared trust-journey explainer also now says more plainly how that issue
  affects trust, CCI, and the user-visible trust record.
- The dashboard popup still keeps its own timing/escalation engine in
  `frontend/src/lib/dashboardAttentionEngine.ts`, but its visible
  `Problem / Why it matters / Do this` text now reads from the same shared
  trust-attention interpreter that feeds `Trust Journey`.
- `Trust Journey` now becomes quieter whenever the popup attention engine is
  active:
  - it keeps the broader trust summary
  - it hides the duplicate `Do this now` panel
  - it shows a smaller note that the urgent next step is already being handled
    by `Attention Guide`
- Expanded `Trust Journey` now includes a shared layman-language explainer block
  that brings these together in one place:
  - `Trust`
  - `CCI`
  - `TrustSlip`
  - `Focus`
  - `Trust Passport`
- That explainer is driven from shared frontend logic in
  `frontend/src/lib/dashboardUserGuidance.ts` so it stays system-level instead
  of becoming page-only wording.
- The explainer now also gives one plain summary of how those parts connect in
  the current live case, for example:
  - missed focus target affecting trust/CCI/TrustSlip
  - waiting request affecting trust and wider identity
  - unread notifications affecting trust and response habit
- That same connected summary is now visible on the main face too:
  - inside `Attention Guide` as `How it connects`
  - inside the visible `Trust Journey` face as `How they connect`
- The intention is that users should not have to expand the block before they
  can see how `Focus`, `Trust`, `CCI`, and `TrustSlip` are linked in the
  current live case.
- The connected summary is system-level frontend logic, not page-only static
  wording:
  - a stable base sentence explains the role of `Focus`, `Trust`, `CCI`, and
    `TrustSlip`
  - a live case sentence is then generated from the current active issue
    (`behind focus`, `waiting request`, `unread reply`, `missing TrustSlip`,
    `CCI/Trust warning`, etc.)
- Shared plain-language translation in
  `frontend/src/lib/dashboardUserGuidance.ts` was also tightened to avoid
  awkward phrases like `clear to people participation`; use simpler phrases
  like `activity people can see` instead.
- `Attention Guide` now has a third action-row button, `Trust Journey`, beside
  the existing route buttons.
- That button closes the popup, marks the attention item as acted for the
  current cycle, and now routes straight to `/app/trust#trust-journey`.
- The full `Trust Journey` block no longer remains on `/app/dashboard`.
- The fuller `Trust Journey` explainer now lives inside
  `frontend/src/pages/TrustScorePage.tsx` on `/app/trust`, where it keeps the
  same main trust-attention teaching model:
  - `Trust`
  - `CCI`
  - `TrustSlip`
  - `Focus`
  - `How they connect`
- Trust Passport now opens that moved block automatically when the route hash is
  `#trust-journey`.
- The Trust Passport copy still reads from shared trust-attention wording in
  `frontend/src/lib/dashboardUserGuidance.ts`, while the route-local block now
  uses current Trust Passport readings plus stored focus-commitment signals.
- `/app/dashboard` `Attention Guide` now has an institutional polish pass in
  `frontend/src/pages/DashboardPage.tsx`:
  - branded executive popup shell using the dashboard blue system
  - stronger hero/header hierarchy
  - cleaner `Problem / Why it matters / Do this now` card layout
  - more polished action-row buttons
  - quieter but more branded collapsed reminder pill
- The popup was then tightened further:
  - narrower shell
  - denser spacing
  - slimmer reminder pill
  - more compact action dock
  - calmer, less airy header/body balance
- This pass changed presentation only; the attention timing, trust-attention
  logic, routes, and button targets were not changed.
- The dashboard spotlight was then tightened again with mobile phones in mind.
  This was kept route-local inside `frontend/src/pages/DashboardPage.tsx` so
  other spotlight readers were not affected.
  - the spotlight media block on `/app/dashboard` now uses a shorter fixed
    presentation height
  - mobile was reduced more aggressively than desktop
  - overlay spacing, title size, and body rhythm were tightened to match the
    shorter frame
  - the full-image `contain` behavior was kept, so this pass normalizes height
    without reintroducing hard crop behavior
- The dashboard spotlight was then shortened one step further after live review
  so it lands closer to a compact mobile hero instead of a tall banner.
  - mobile height was reduced again
  - desktop height was reduced again
  - overlay insets and text rhythm were tightened again to fit the smaller
    frame cleanly
- The dashboard spotlight was then reduced one more step to behave more like a
  dashboard module than a hero.
  - mobile height was reduced again
  - overlay action buttons were shrunk on compact screens
  - the created-at chip was removed from the default mobile face
  - the long spotlight body text was removed from the default mobile face
  - the spotlight title now clamps instead of expanding freely
- A dashboard-wide button tightening pass was then applied in
  `frontend/src/pages/DashboardPage.tsx`.
  - primary, secondary, and subtle dashboard buttons were reduced in default
    height, padding, radius, and font size
  - route-local button styles now force safer wrapping instead of spilling or
    pushing layouts awkwardly
  - the busiest button rows were converted from loose flex-wrap layouts into
    tighter grid-based action rows where needed
  - this was applied to the `Attention Guide`, expired spotlight actions,
    focus composer helper buttons, focus composer save/cancel actions, focus
    item action rows, and empty focus-commitment starter actions
  - `Regular Apps` buttons were also tightened so the dashboard face feels less
    bulky
- The top dashboard trust header was then cleaned again in
  `frontend/src/pages/DashboardPage.tsx`.
  - the pale back control was replaced with a blue route-local back button
  - the `Navigator` badge was removed
  - the extra explanatory sentence under `Trust is the first currency.` was
    removed
  - `GSN` was centered directly under the trust heading
- The explanatory sentence under `Trust is the first currency.` was then
  restored by owner request, while keeping the blue back control, removed
  `Navigator` badge, and centered `GSN`.
- The full top dashboard trust surface was then harmonized in
  `frontend/src/pages/DashboardPage.tsx` so the first section reads as one
  institutional composition instead of stacked unrelated cards.
  - the outer hero shell, inner glass shell, and top trust header were re-tuned
    to share a closer visual language
  - the profile picture lane now sits inside a matching blended panel
  - the trust and verification lane now uses the same more mature shell
    treatment
  - picture actions in that top block were also tightened into a cleaner
    three-column row
- The dashboard spotlight seller-detail close action was then corrected in
  `frontend/src/pages/DashboardPage.tsx`.
  - the risky top overlay `Close` state was removed from the spotlight media
  - the media now keeps only `Open` when closed, plus `Minimize`
  - `Close` now lives at the lower-right of the seller-detail/actions area
  - explicit event blocking was added to the spotlight open/close handlers so
    the close action does not fall through into marketplace navigation
- The dashboard spotlight was then tightened again in
  `frontend/src/pages/DashboardPage.tsx`.
  - spotlight height was reduced again by a stronger step on both mobile and
    desktop so the block behaves less like a hero
  - spotlight radius, top inset, bottom inset, title size, and body font size
    were reduced with it
  - the spotlight `Open`, `Minimize`, and seller-detail `Close` buttons were
    all compressed again so they stop dominating the surface
- The dashboard spotlight interaction routing was then tightened again in
  `frontend/src/pages/DashboardPage.tsx`.
  - spotlight action buttons now use explicit event-consuming handlers instead
    of relying on raw inline clicks
  - `Previous`, `Next`, `Open spotlight`, media-surface `Open`, `Minimize`,
    seller-detail `Open marketplace`, and seller-detail `Close` now all block
    pointer/click fall-through before acting
  - spotlight controls keep a tighter visual look but now use safer mobile
    touch targets so they stop misfiring into nearby routes
- The dashboard spotlight interaction guard was then strengthened in
  `frontend/src/pages/DashboardPage.tsx`.
  - spotlight open/minimize/close/previous/next actions now arm a short
    route-local dashboard interaction shield
  - the transparent fixed shield briefly absorbs leftover taps while the
    spotlight layout changes, so a disappearing spotlight button cannot hand
    the same tap to Community Home, Marketplace, Trust Passport, or another
    control underneath it
- A shared mobile shell route guard was then added in
  `frontend/src/layout/AppLayout.tsx` after tracing the more fundamental cause
  of the wrong-route jumps.
  - the app shell uses fixed mobile navigation and fixed mobile page-action
    surfaces above route content
  - when a page-level tap causes fast layout change, those shell routes can
    catch the tail of the same mobile tap
  - `AppLayout` now arms a short shared route guard when the user starts a main
    content interaction
  - while that guard is active, the fixed mobile bottom nav and fixed mobile
    page-actions panel temporarily stop accepting pointer events
  - this is the shared app-level stability fix intended to reduce wrong-route
    jumps across dashboard interactions, not just inside one button cluster
- The dashboard `Demand Box` block was then cleaned up again in
  `frontend/src/pages/DashboardPage.tsx`.
  - the header now says `Demand Box` once instead of repeating the name in
    multiple badges
  - the top-right header badges were reduced to the essential count only
  - the summary wording was shortened so it no longer repeats `Demand Box`
  - the demand chip logic now avoids showing the same single urgent request as
    `open requests`, `current request`, and `urgent` all at once
- The dashboard `Demand Box` surface was then polished visually in
  `frontend/src/pages/DashboardPage.tsx`.
  - the block now uses a stronger branded shell instead of a flatter white card
  - a top accent bar, denser lead panel, and calmer institutional blue surface
    were added
  - the chip row now uses a tighter grid instead of loose paper-like wrapping
  - the selected detail panel and inner demand cards now use softer tinted
    surfaces instead of plain white blocks
  - spacing and borders were reduced so the module feels more mature and less
    like stacked paper
- The dashboard `Demand Box` CTA and shared mobile shell bottom clearance were
  then tightened before freeze.
  - the demand detail CTA on `/app/dashboard` now uses an explicit route-local
    button with `navigateWithOrigin` instead of the lower-lying `OriginLink`
    surface
  - the CTA now consumes pointer interaction directly before routing
  - `frontend/src/layout/AppLayout.tsx` now gives mobile main content more
    bottom clearance above the fixed bottom nav, so low-on-screen page CTAs do
    not sit too close to the shell routes
- The dashboard then got a stricter route-button stability pass in
  `frontend/src/pages/DashboardPage.tsx`.
  - the remaining dashboard `OriginLink` surfaces were removed from the route
    and replaced with explicit route-local `<button>` navigation using
    `navigateWithOrigin`
  - this now covers the dashboard back control, notification CTAs, trust/CCI
    action buttons, TrustSlip actions, the focus-builder shortcut, and the
    expired-spotlight CTAs
  - the route now uses one local `openDashboardRoute()` helper instead of a
    mixed pattern of `OriginLink`, raw `navigateWithOrigin`, and implicit link
    surfaces
  - the dashboard pointer contract was also corrected:
    - `pointerdown` handlers now stop propagation without cancelling the event
    - `click` handlers do the actual prevent-default/route action work
  - this matters because the earlier pattern was cancelling too early on some
    dashboard controls, which is a likely contributor to touch instability
  - regular-app buttons and TrustSlip/merchant-verify buttons were also brought
    into the safer pointer pattern so the dashboard uses a more consistent
    interaction layer before freeze
- The dashboard then got a matching layout-toggle stability pass in
  `frontend/src/pages/DashboardPage.tsx`.
  - the attention reminder pill, attention action row, trust expand/collapse,
    profile picture options toggle, notification chips, demand chips, and focus
    commitment composer/touch controls now also use the safer pointer pattern
  - layout-changing controls now use the route-local interaction shield more
    deliberately when opening or collapsing UI
  - this means the stability pass is no longer limited to route buttons only;
    fast-open / fast-collapse controls on the dashboard now also resist the
    same tap fall-through problem that was shaking the screen before freeze
- The dashboard then got a final leftover-button audit before freeze.
  - remaining dashboard utility controls were checked against the same
    stability rule
  - `Hide for now`, avatar upload/change/remove, Market Wisdom open/select
    controls, and the notification-group header toggle were brought into the
    same safer pointer pattern
  - after this pass, the dashboard no longer has a mixed population of old
    touch handlers and new touch handlers on the main user-facing controls

### Intent

- Keep the trust meaning and next action.
- Reduce duplication with other dashboard trust/notification guidance.
- Remove empty space and reduce technical trust-report styling.
- Make the block speak more directly to the user.
