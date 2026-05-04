# Handoff Notes

## 2026-05-03

- Entry flow overload reduction:
  - `src/pages/WelcomePage.tsx` now presents the general welcome choice as two primary lanes: `Existing member / Sign in` and `New member / Sign up`.
  - The new-member lane still preserves the distinct `Create community` and `Join existing community` paths on the next step.
  - Activation remains available as a secondary link below the two main choices.

- Sign-in copy reduction:
  - `src/pages/LoginPage.tsx` now leads with `Welcome back` plus a short continuation line instead of a long instructional heading.
  - Authentication logic remains unchanged.

- Dashboard overload reduction:
  - `src/pages/DashboardPage.tsx` bumped dashboard UI storage to `gmfn.dashboard.ui.v5` so users receive the new calmer defaults.
  - Spotlight starts minimized by default.
  - Dashboard route/app expansion defaults are closed.
  - Attention Guide no longer auto-opens as a popup; it remains available as the attention pill.

- Verification:
  - `npm run build` passed on 2026-05-03.
  - Local dev server started at `http://127.0.0.1:5173/`.

- Notes:
  - `docs/PROJECT_PROTOCOL.md` and `docs/FREEZE_POLICY.md` were still missing in this frontend workspace when this work was done.
  - The `/app/dashboard` Market Wisdom block was not changed.

## 2026-05-04

- Community Home spotlight repair:
  - `src/pages/CommunityHomePage.tsx` restored the previously hidden `community-home-spotlight-gears` section and bumped its local storage key to `gmfn.communityHome.sections.v5` so Spotlight opens by default.
  - The `Free spotlight` guide path now opens the Community Home free spotlight publisher instead of sending the user away to Shop Control.
  - Community Home now supports free spotlight message, picture upload, short video upload/preparation, publish, and immediate refresh of the selected community spotlight state.
  - Free spotlight publish confirms or creates the selected community shop record before creating the broadcast.
  - The picture/video pickers use explicit button-triggered file inputs; this replaced the label-wrapped hidden input pattern that could fail to open the device file picker.
  - The picker trigger was tightened again so the native file input itself covers the visible pick buttons. This avoids browsers rejecting a programmatic `.click()` on a hidden input.
  - The Community Home picker now uses fully visible native file controls with broad `image/*` and `video/*` accepts after the invisible/native overlay still failed in testing.
  - End-to-end media picker audit found no global CSS blocker. Shop Control spotlight draft pickers were still disabled by identity continuity locks, so those draft pickers now remain selectable while publish/save stays locked. The public shop picture uploader remains locked because it uploads immediately.
  - `src/pages/ShopControlPage.tsx` no longer renders two sections with `id="shop-control-spotlight"`; the old lower publisher block was removed entirely so the active Shop Control spotlight surface is only the portal section with `id="shop-control-spotlight"`.
  - Community Home now shows a draft media preview immediately after picture/video selection.
  - Community Home and Shop Control now optimistically show the just-published spotlight using the uploaded media URLs if the refresh response is late or returns filtered media fields.
  - Community Home free spotlight `Publish free spotlight` now remains available while media is preparing; the click handler shows a preparation message instead of making the action look missing/dead.
  - Community Home and Shop Control spotlight publish buttons are no longer native-disabled for recoverable blocked states. Clicking now surfaces the exact blocker: identity review, missing shop record, empty draft, media still preparing, or an active publish request.
  - Shop Control no longer lets frontend identity continuity block the free spotlight lane. The backend `/marketplace/broadcasts` route does not enforce that identity-risk gate; it enforces active membership, shop ownership, paid entitlement for paid spotlight, and capacity. Paid spotlight and money/private-shop actions remain frontend-locked by identity review.
  - Community Home free spotlight quick actions now open the local `community-home-spotlight-gears` publisher/status section instead of routing into Shop Control by default.
  - Community Home free publisher no longer shows `Open full publisher` or `Paid spotlight` underneath the free publish button.
  - `docs/FREE_SPOTLIGHT_FREEZE.md` records the frozen Free Spotlight route contract and interference rules.
  - Shop Control now moves to the preview step after selecting picture or video even when the media choice is `both`.
  - Dashboard spotlight media candidates now include the raw URL, same-origin URL, configured asset URL, and local backend-port fallback for `/uploads/...` paths.

- Dashboard spotlight repair:
  - `src/pages/DashboardPage.tsx` bumped dashboard UI storage to `gmfn.dashboard.ui.v6`.
  - Spotlight is visible by default again so newly published free spotlights are not buried by the previous minimized default.
  - The frozen Market Wisdom section was not changed.

- Shared API:
  - `src/lib/api.ts` now allows `createMarketplaceBroadcast` callers to pass `priority_mode` and `visibility_scope`.

- Shop Control reduction:
  - `src/pages/ShopControlPage.tsx` now uses a first-layer `Shop map` copied from the older owner-shop control idea in `src/components/CommunityShopControlPanel.tsx`.
  - The route `/app/shop-control` no longer renders public shop face, shop details, paid tools, summary, and Vault all open at the same time.
  - The default lane is `Shop face`; choosing `Shop details`, `Paid tools`, `Vault`, or `Summary` swaps the active lane underneath the map.
  - Existing deep links/query sections are preserved: `section=picture-gallery`, `section=vault`, `section=summary`, `section=spotlight`, and `section=paid-spotlight` still resolve to the intended area or spotlight portal.
  - The summary hero no longer repeats the public-shop/trust-slip action row. It leaves the next-best move card and sends the owner to the layer map for deeper work.
  - Follow-up reduction: Shop Control now defaults to a compact overview lane, not the raw `Picture control` editor. The first visible lower layer shows compact cards for Public Shop Face, Products, Spotlight, and Vault, plus the next-best move. The raw picture upload/paste controls remain available only through the picture-tools lane.
  - Latest Shop Control mockup pass: `/app/shop-control` now uses `Focused Task / Shop Control`, a dark owner hero with four stats, a four-tile Shop Map, compact overview cards, a dark Next Best Move block, and a bottom `Picture control` block so the uploader is available without becoming the first exposed surface.
  - Repetition audit: the Shop Map now only chooses lanes and no longer repeats readiness/status counters. The visible Next Best Move block no longer repeats the same CTA buttons already present in the cards or bottom Picture control. The old hidden duplicate Next Best Move block was removed from the code.
  - Lane separation pass: the normal `/app/shop-control` surface is now shop setup only. Spotlight and Vault were removed from the hero stats, Shop Map, overview cards, and Next Best Move copy. Direct Spotlight portal/deep-link behavior remains available as a separate focused flow, but Shop Control no longer advertises or mixes those lanes on its default surface.
  - Shop identity correction: the Shop Control hero no longer shows selected community, GSN ID, public item count, or public link status. The shop is treated as universal to the owner/global identity, not as belonging to one selected community. The normal Shop Control page also no longer shows the lane chooser; users should enter specific lanes directly.
  - Added route aliases for focused owner lanes: `/app/shop-gallery-control`, `/app/vault-control`, `/app/free-spotlight`, and `/app/paid-spotlight`. Shop Gallery now resolves to the existing Pictures & Products editor; Vault and Spotlight aliases still use the focused Shop Control targets.
  - Shop Control hero shortcut pass: the dark owner shop block now includes compact shortcut buttons for Dashboard, Marketplace, Shop gallery, Free spotlight, Subscription spotlight, and Vault. Shop gallery, Free/Subscription spotlight, and Vault use the focused lane aliases.
  - Shop Control media repair: the bottom overview media block and focused Shop Gallery lane now use the same visible native file-control pattern as Free Spotlight. Shop picture selection prepares and previews the image first, then `Save picture` uploads and saves it to the shop `image_url`. Shop video selection prepares and previews a short video, then `Upload video` creates a reusable media URL for Products, Free Spotlight, Subscription Spotlight, or Vault. The backend shop record still persists only `image_url`, so the UI states that truth instead of pretending shop-face video is stored on the shop record.
  - Shop Gallery duplication audit: `/app/shop-gallery-control` now opens the existing `/app/shop-assets` Pictures & Products editor instead of a new gallery mode or the generic Shop Control hash lane. `src/pages/ShopAssetsPage.tsx` remains the single active editor for shop picture, public products, private Vault offers, and posted-item amendments. Product video upload/pasted video URL saves as `video_url`, previews before save, and shows in the posted-item editor list. The frontend blocks adding a 13th live public gallery block; each active public block can be picture-led or video-led.
  - Follow-up cleanup: `src/pages/ShopControlPage.tsx` no longer keeps the old Shop Gallery/Media Control layer, native shop media picker helpers, or unused shop-media state/handlers. Shop Control keeps only the Shop Gallery shortcut, and all gallery create/edit/remove media work now happens in `ShopAssetsPage.tsx`.
  - Shop Control in-page correction: the existing `ShopAssetsPage` Pictures & Products editor can now be mounted in embedded mode. `/app/shop-control` renders that single editor directly underneath the owner shop hero at `#shop-control-gallery-tools`, so shop picture, contact details, public products, product video, removal/replacement, and Vault offers are controlled on the Shop Control page without copying the editor code or sending the user to a separate page. `/app/shop-gallery-control` now redirects to `/app/shop-control#shop-control-gallery-tools`.
  - Shop Control page duplication audit: embedded `ShopAssetsPage` no longer renders its own `Owner workbench` hero or `Simple order` guidance inside `/app/shop-control`. The standalone `/app/shop-assets` route keeps those sections. Embedded mode now starts with the real controls open and does not write the standalone collapse-state local storage, so old browser state cannot hide the Shop Control controls after the hero.
  - Shop Control gallery UX correction: embedded `ShopAssetsPage` no longer exposes the full posted-items wall on `/app/shop-control`. It now shows a numbered `Public gallery block control` with 12 slots, a single selected-block preview, and add/edit/hide/copy actions for only the selected block. The product form appears only after choosing `Add item to block #n` or `Edit block #n`; embedded mode keeps the destination fixed to the public gallery so Vault is not mixed into this lane. The standalone `/app/shop-assets` route still keeps the full posted item list and destination selector.
  - Shop gallery save/display repair: after posting or editing a public product from embedded Shop Control, `ShopAssetsPage` now reloads products and selects the actual block where the saved item appears. This is necessary because the backend does not persist a requested block number; marketplace products are returned newest-first. `ShopGalleryPage` no longer hides public products just because media is still preparing or a media URL is temporarily unusable. The public item card remains visible and shows a preparing/placeholder state instead of making the upload look lost.
  - Shop gallery media preparation correction: embedded Shop Control now reuses the existing Spotlight media-prep protocol for product pictures/videos instead of rejecting files only because they exceed the current backend limits. Large pictures are prepared through `prepareSpotlightImageFile`; videos are prepared through `prepareSpotlightVideoFile`, trimmed to the pilot clip length when needed, and uploaded with the prepared duration. The form shows the preparation/explanation message inside the selected block editor.
  - `docs/MEDIA_PREP_PROTOCOL.md` now records the media law: accept the user's chosen media first, prepare a compliant version when possible, explain what changed, and never fail silently.
  - Shop gallery video-only block repair: `ShopAssetsPage` now creates a JPEG cover from the selected video automatically when a public gallery block has no picture. The user-facing flow now treats a block as accepting either picture or short video; backend `image_url` requirements are absorbed by the frontend instead of exposed to the user.
  - Shop gallery video playback repair: saved product media is remembered locally after upload so the owner/browser does not lose the freshly uploaded `video_url` if the reload response filters it. `ShopGalleryPage` now falls back to that cache and renders product videos through `SpotlightMediaFrame`, autoplaying/muting/looping closed cards like the Spotlight lane and showing controls when the product card is opened.
  - Shop gallery freeze cleanup: video cover extraction moved out of `ShopAssetsPage` into shared `src/lib/shopGalleryMediaProtocol.ts`. Embedded Shop Gallery form copy no longer mentions Vault, and the public gallery helper now describes only public picture/video blocks. `docs/SHOP_GALLERY_FREEZE.md` records the frozen lane rules and the remaining backend truth about non-persistent slot ordering.
  - Shop gallery phone-audio repair: public product videos now autoplay muted only while the card is closed. When a product is opened, the video shows controls and gets an explicit `Sound on` tap target that unmutes, sets volume, and plays inside the user gesture so phone audio can come through.
  - Protocol/control-surface cleanup: `docs/PROJECT_PROTOCOL.md`, `docs/FREEZE_POLICY.md`, and `docs/CONTROL_SURFACE_PROTOCOL.md` were added so future assistants have explicit law to read before lane work. Shop Gallery/Assets now use the shared `gmfnBrand` tap-target guard instead of page-local copies, selected-block action groups use stable grids, and Free/Shop Control Spotlight publish buttons now include the shared tap guard.

  - Community Home passport metrics:
  - `src/pages/CommunityHomePage.tsx` now loads `getMyGuarantorEarnings(100)` alongside the pool, TrustSlip, and marketplace summaries.
  - The Community Home `Your GSN Trust Passport` grid now promotes community count into its own block and adds money position, guarantor record count, and guarantor-earned value.
  - Money position uses explicit net-position fields when available, otherwise it computes visible pool balance minus visible owing fields. If no owing is returned, it truthfully shows the visible record as positive.
  - Guarantor-earned value is summed from the visible guarantor earnings rows; if the endpoint has no rows, the block shows no earning record yet rather than inventing a number.
  - The mobile metric tiles were tightened slightly so the extra blocks do not use the oversized old card spacing.
  - Community Home quick-action button repair: the `What do you want to do next?` action strip no longer forces five buttons into one phone row. Mobile now uses two-column stable action tiles with normal labels, icon-over-label layout, and the fifth action spans the row so the visible button and tap area line up.
  - Media audio preservation correction: `prepareSpotlightVideoFile` now keeps the original file whenever it is already under the upload size limit, even if the clip is longer than the pilot display window, so audio is not stripped by browser re-recording. Oversized videos still use the preparation path, now with the source video unmuted before capture.
  - Shop Gallery phone button repair: shared tap targets no longer use transform/contain compositing hacks, and `ShopAssetsPage` now forces owner-critical action groups into full-width rows on compact screens. This covers selected-block edit/hide/copy, item post/close/copy-link, picture control save/reset/remove, public-shop open/copy, and standalone posted-item edit/delete/restore/copy actions.
  - Community Home header/button repair: the duplicated in-page Community Home top header no longer renders under the authenticated mobile app header. The remaining app header now uses `☰ Menu` and `🛠 Tools`, has wider phone columns, and AppLayout drawer/action links no longer use translateZ tap-layer hacks. Community Home owner action rows now sit above surrounding surfaces with a stronger isolated tap layer so `Owner Shop Control` owns the full visible row.
  - System tap-target repair: `src/index.css` no longer applies `transform: translateZ(0)` to every button. It now hard-resets transforms/containment on anchors, buttons, role-buttons, summaries, and submit/button inputs so older page-local tap-layer hacks cannot keep causing mobile hit-area drift.
  - Shop Gallery upload/audio feedback repair: `src/pages/ShopAssetsPage.tsx` now leaves a persistent selected-block success/failure message after save instead of closing the form and relying on a short toast. `src/pages/ShopGalleryPage.tsx` remounts product videos when a card opens so the opened player does not inherit the closed muted preview state, and its open detail copy points users to the top `Sound on` control. `src/components/SpotlightMediaFrame.tsx` moved `Sound on` above native video controls and only marks audio unlocked after `play()` succeeds.
  - Free Spotlight video audio standardization: `src/components/SpotlightMediaFrame.tsx` now shows a reversible `Sound on` / `Sound off` toggle even when the surface starts as a muted motion preview. Free Spotlight display surfaces in Community Home, Dashboard, Community Marketplace Spotlight, Shop Control preview, and the public shop mini spotlight now pass the shared audio toggle for videos.
  - Vault private video display correction: backend Vault access already returns product `video_url`, and `src/lib/api.ts` now preserves it in `VaultShopAccessProduct`. `src/pages/ShopAccessPage.tsx` now renders private Vault product media through the shared `SpotlightMediaFrame`, so private video offers show muted motion first and expose the same reversible `Sound on` / `Sound off` control.
  - Vault Control focus pass: `/app/vault-control` is now a real focused owner route in `src/pages/VaultControlPage.tsx`, not a redirect into mixed Shop Control. It inherits the main shop signboard, labels the private layer as Vault, lets owners request 1-6 paid Vault slots, shows only confirmed paid private blocks, saves picture/video private offers as `vault_private`, and creates/extends/revokes Vault access links. Community Home and the old community shop panel now route Vault actions directly to `/app/vault-control`. Backend payment instruction validation now accepts Vault quantities 1 through 6 instead of only 1 or 6. `docs/VAULT_CONTROL_FREEZE.md` records the lane rules.
  - Vault Control button audit/focus repair: `src/layout/AppLayout.tsx` now treats `/app/vault-control` as a focused task route, so mobile Vault work no longer keeps the general bottom rail active around payment and slot controls. `src/pages/VaultControlPage.tsx` now keeps a local product-id-to-slot map so a private offer stays attached to the block the owner selected instead of drifting with newest-first backend ordering. The Vault save button no longer looks disabled while media preparation is still clickable/explainable. `docs/VAULT_CONTROL_FREEZE.md` records the remaining backend truth: a permanent cross-device Vault slot order still needs a backend `vault_slot_number` contract.
  - Vault payment rail repair: The existing real rail is bank transfer through payment instructions and expected-payment reconciliation; card payment is not integrated. `src/pages/VaultControlPage.tsx` now shows the Vault bank-transfer instruction after creation: amount, settlement account, exact reference, copy details, and check status. The Vault page-local API wrapper now strips a duplicate `/api` prefix when the configured API base is already `/api`, preventing `/api/api/...` requests. Backend Vault pricing in `app/services/payment_instruction_service.py` and `app/services/expected_payments_service.py` now supports 1-5 slots at GBP 1 per slot and the 6-slot GBP 5 bundle.
  - Vault payment conversation repair: `/app/vault-control` now answers immediately after slot selection. The payment preview shows chosen slot count, exact GBP total, the 6-slot GBP 5 bundle option, and explains that the owner must generate/use the exact payment code for bank reconciliation. After generation, the bank-transfer panel labels the reference as `Payment code`, shows expiry/due information, and explains that the code is what opens Vault slots after bank confirmation.
  - Vault MVP standardization pass: `docs/VAULT_MVP_STANDARD.md` records Vault as a private paid layer under the existing shop, not a separate shop. New Vault access links now carry a selected product/block scope (`product_id`) through backend route/service/model, frontend API, and `/app/vault-control`, so newly created links open the selected private block instead of every private Vault offer. Legacy links without `product_id` are explicitly documented as legacy shop-scope links. Vault link default expiry is now 72 hours on both frontend and backend, and Vault payment-created entitlements now use the 30-day/monthly cycle instead of the previous annual default.

- Verification:
  - `npm run build` passed on 2026-05-04 after the spotlight publisher repair.
  - `npm run build` passed again on 2026-05-04 after the file-picker trigger repair.
  - `npm run build` passed again on 2026-05-04 after switching the picker to direct native input taps.
  - `npm run build` passed again on 2026-05-04 after exposing fully native visible file inputs.
  - `npm run build` passed again on 2026-05-04 after the audit-driven Shop Control picker and duplicate-id fixes.
  - `npm run build` passed again on 2026-05-04 after the draft/live spotlight preview fixes.
  - `npm run build` passed again on 2026-05-04 after the Community Home publish-button availability fix.
  - `npm run build` passed again on 2026-05-04 after converting spotlight publish buttons from dead disabled buttons into clickable buttons with blocker feedback.
  - `npm run build` passed again on 2026-05-04 after removing the frontend identity-review block from the free spotlight lane only.
  - `npm run build` passed again on 2026-05-04 after the Free Spotlight cleanup/freeze pass.
  - `npm run build` passed again on 2026-05-04 after the Shop Control layer-map reduction.
  - `npm run build` passed again on 2026-05-04 after adding the Community Home passport metric blocks.
  - `npm run build` passed again on 2026-05-04 after moving Shop Control's raw Picture Control editor behind the compact overview lane.
  - `npm run build` passed again on 2026-05-04 after matching the Shop Control mockup structure and adding bottom Picture control.
  - `npm run build` passed again on 2026-05-04 after the Shop Control repetition audit.
  - `npm run build` passed again on 2026-05-04 after separating Shop Control from Spotlight/Vault on the default surface.
  - `npm run build` passed again on 2026-05-04 after removing misleading Shop Control hero metrics and adding focused lane route aliases.
  - `npm run build` passed again on 2026-05-04 after adding the Shop Control hero shortcut buttons and auditing their route targets.
  - `npm run build` passed again on 2026-05-04 after correcting the hero shortcuts from Works/Vote to Vault.
  - `npm run build` passed again on 2026-05-04 after adding Shop gallery to the Shop Control hero shortcuts.
  - `npm run build` passed again on 2026-05-04 after replacing the old Shop Control image-only picker with native picture/video media controls and preview/upload flows.
  - `npm run build` passed again on 2026-05-04 after removing the duplicated Shop Control gallery/media layer and leaving Shop Assets as the single gallery editor.
  - `npm run build` passed again on 2026-05-04 after embedding the existing Pictures & Products editor directly inside Shop Control.
  - `npm run build` passed again on 2026-05-04 after the embedded Shop Control duplication audit.
  - `npm run build` passed again on 2026-05-04 after changing embedded Shop Control to the numbered 12-block gallery controller.
  - `npm run build` passed again on 2026-05-04 after hiding the Vault destination selector from the embedded Shop Control gallery form.
  - `npm run build` passed again on 2026-05-04 after the Shop Gallery phone button stability repair.
  - `npm run build` passed again on 2026-05-04 after the Community Home duplicate-header and owner-row tap repair.
  - `npm run build` passed again on 2026-05-04 after the global interactive-control transform reset.
  - `npm run build` passed again on 2026-05-04 after the Shop Gallery upload/audio feedback repair.
  - `npm run build` passed again on 2026-05-04 after the Free Spotlight reversible video-audio toggle pass.
  - `npm run build` passed again on 2026-05-04 after the Vault private video display correction.
  - `npm run build` passed again on 2026-05-04 after the focused Vault Control owner route.
  - `npm run build` passed again on 2026-05-04 after the Vault Control mobile focus/button and local slot-memory repair.
  - `npm run build` passed again on 2026-05-04 after the Vault bank-transfer instruction repair.
  - `npm run build` passed again on 2026-05-04 after the Vault payment conversation/slot-quote repair.
  - `npm run build` passed again on 2026-05-04 after the Vault MVP standardization/product-scoped link pass.
  - `python -m py_compile ..\gmfn_backend\app\api\routes\payment_instructions.py` passed on 2026-05-04 after allowing Vault slot quantities 1 through 6.
  - `python -m py_compile ..\gmfn_backend\app\api\routes\payment_instructions.py ..\gmfn_backend\app\services\payment_instruction_service.py ..\gmfn_backend\app\services\expected_payments_service.py` passed on 2026-05-04 after the Vault pricing repair.
  - `python -m py_compile ..\gmfn_backend\app\db\models.py ..\gmfn_backend\app\api\routes\payment_instructions.py ..\gmfn_backend\app\api\routes\vault_access.py ..\gmfn_backend\app\services\vault_access_service.py ..\gmfn_backend\app\services\payment_instruction_service.py ..\gmfn_backend\app\services\expected_payments_service.py ..\gmfn_backend\alembic\versions\20260504_add_vault_access_link_product_id.py` passed on 2026-05-04 after product-scoped Vault links and 30-day/72-hour defaults.

- Remaining risk:
  - Frontend build confirms the upload/publish code compiles. Actual picture/video display still depends on the backend process using the same `GMFN_UPLOADS_DIR` for upload saving and `/uploads` static serving.
