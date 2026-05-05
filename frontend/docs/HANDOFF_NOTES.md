# Handoff Notes

## 2026-05-05 Vault Institutional Tightening Pass

- Owner direction: polish the pages worked on yesterday to a stronger institutional standard, but read the repo law first and avoid inventing new UX.
- Truth: the UX docs named in `AGENTS.md` (`docs/DESIGN_SYSTEM.md`, `docs/SCREEN_REGISTRY.md`, `docs/SCREEN_SPECS.md`, `docs/UX_ACCEPTANCE_CHECKLIST.md`) are still not present in this frontend repo. This pass used the available protocol/freeze docs and the approved Vault screenshot structure.
- Updated `src/pages/VaultControlPage.tsx` without changing the frozen Vault workflow:
  - tightened the page rhythm and reduced excessive paper-like spacing.
  - strengthened the navy/gold institutional surface treatment while keeping text readable.
  - made the right-side Vault visual inherit the shop image when present, with a protected signboard overlay instead of a culturally ambiguous lock/key symbol.
  - converted pricing and bundle explanation into clearer controlled decision cards.
  - strengthened selected/active/locked block borders so the six Vault positions read as a deliberate private room, not loose paper buttons.
  - removed a hidden leftover block legend from the owner page markup.
- Updated `src/pages/CommunityHomePage.tsx`:
  - tightened the `Private Vault` owner-action row with a stronger dark/gold treatment, clearer one-link-at-a-time copy, and a neutral `VAULT` mark.
- Frozen behavior remains unchanged: `/app/vault-control`, quote-gated payment code generation, bank-transfer instruction, fixed six-position block room, selected-block private offer editor, block-scoped links, and shared video audio behavior remain the same.

## 2026-05-05 Community Home Vault Entry Polish

- Owner direction: polish the Vault entry inside Community Home without reopening the frozen `/app/vault-control` workflow.
- Updated `src/pages/CommunityHomePage.tsx`:
  - Community Home Vault copy now matches the frozen product truth: Vault is a private paid block layer under the owner shop, not a separate community shop.
  - The owner-action row now labels the entry as `Private Vault`, uses a dark/gold treatment, and routes directly to `/app/vault-control`.
  - Removed the lock/key symbol from that Community Home entry and replaced it with a neutral `V` marker to avoid culturally ambiguous lock imagery.
- Truth: the named UX docs in `AGENTS.md` (`docs/DESIGN_SYSTEM.md`, `docs/SCREEN_REGISTRY.md`, `docs/SCREEN_SPECS.md`, `docs/UX_ACCEPTANCE_CHECKLIST.md`) are not present in this frontend repo, so this polish used the available Vault/control freeze docs plus the existing Community Home structure.

## 2026-05-05 Vault Visual Quality Reassessment

- Owner feedback: the Vault page still looked too much like text on paper, the background felt faint, and some dark-hero text/pills lacked enough contrast.
- Updated `src/pages/VaultControlPage.tsx` without changing the frozen Vault business flow:
  - added a stronger institutional page wash, raised light panels, and darker blue/gold hero treatment.
  - replaced hero badges with dark-safe Vault pills so text remains readable on the deep navy background.
  - strengthened the private Vault visual frame, hero title contrast, and supporting text contrast.
  - upgraded activation, payment, block-room, link, editor, and reminder sections from plain white blocks to raised institutional panels.
- Frozen behavior remains unchanged: `/app/vault-control`, quote-gated payment, bank-transfer instruction, six fixed private positions, selected-block offer editor, and block-scoped link controls remain the same.

## 2026-05-04 Entry Recovery Trap Repair

- Tester complaint: a user could begin Create Community, leave before finishing/activation, then later be blocked by saved details while sign-in still said the account was not active.
- Backend truth: pending phone verification sessions should remain resumable; they are not the problem. The problem was pending `users` identities returning generic duplicate/sign-in failures instead of an activation route.
- Updated `gmfn_backend/app/api/routes/auth.py`:
  - `/auth/login` now detects an approved but activation-pending identity and returns structured detail with `code = account_activation_pending`, `gmfn_id`, `activation_path`, and clear next-action copy.
  - Normal wrong-password/unknown-user failures still return the generic invalid credentials response.
- Updated `gmfn_backend/app/api/routes/entry.py`:
  - duplicate phone/email checks now distinguish active duplicates from activation-pending duplicates.
  - pending approved duplicates return `code = entry_activation_pending` and an activation path instead of sending the user back into a dead restart loop.
  - pending identities without approval return `entry_pending_admin_review` so the pilot helper can review intake instead of telling the user to sign in.
- Updated `src/pages/LoginPage.tsx`:
  - sign-in now understands the structured pending-activation response and shows an `Activate membership` action instead of only the generic red error.
- Updated `src/pages/CreateEntryPage.tsx`:
  - create-community duplicate/pending responses now route to the activation page when the backend says the identity is activation-pending.
- Added regression coverage in `gmfn_backend/tests/test_entry_create.py` for pending login and blocked restart after a create-community account exists but before activation.
- Verification: `python -m py_compile app\api\routes\entry.py app\api\routes\auth.py` passed; `python -m pytest -q tests\test_entry_create.py --basetemp C:\tmp\pytest-entry-recovery-2` passed: 14 passed; frontend eslint for Login/Create/Vault/API passed; `npm run build` passed.
- Remaining truth: this code fix prevents the trap for future pending identities and gives a recovery path when the backend can identify the pending user. Any already-stuck production tester may still need a pilot helper to check their exact email/phone in the live database if their partial record is inconsistent or missing approval.

## 2026-05-04 Vault Pre-Freeze Cleanup

- Owner direction: before freezing Vault, remove old/global link surfaces and any wording that makes owners decode old history instead of working on the selected block.
- Updated `src/pages/VaultControlPage.tsx`:
  - reshaped the Vault hero to match the owner screenshot structure: one dark signboard card, `VAULT CONTROL` label, large uppercase shop name, short Vault explanation, status pills, and the large `Private Vault` frame inside the same card.
  - replaced the old padlock fallback with a vault-door visual in the `Private Vault` frame. The shop name remains the signboard identity; the visual now communicates a private Vault without culturally ambiguous lock/key symbolism.
  - added stable collapsible panels for payment details, private block management, block link controls, and the 3-step reminder so the page can stay shorter without deleting the approved Vault workflow.
  - removed the lower `Access link history` user-facing section, including legacy shop-scope link copy, so link actions no longer appear in two places.
  - kept create/copy/open/extend/revoke controls inside the selected private block panel only.
  - tightened Vault block copy to direct owner guidance: paid blocks accept one private picture/video, locked blocks open after payment, and each private link opens one selected block only.
  - copy/open/extend/revoke link buttons now stay tappable for recoverable missing-link states and explain the blocker instead of becoming dead disabled controls.
  - removed global hero counts for total private offers and total links so owners do not work from old global link/offer totals.
  - stopped product rows from proving paid Vault capacity; normal capacity now comes from backend Vault status or confirmed Vault payment only.
  - active backend `vault_blocks.slot_number` now places products into the matching fixed slot and ignores duplicate slot claims instead of overwriting a block.
- Updated `src/lib/api.ts`:
  - Vault private access views now dedupe returned products and filter to the returned `product_id` or `block_id` when present.
  - A legacy unscoped access response that returns multiple private products is treated as invalid instead of being normalized into a multi-offer Vault view.
- Verification: `npm exec -- eslint src/pages/VaultControlPage.tsx src/lib/api.ts` passed, `npm run build` passed, and `git diff --check` passed on 2026-05-04 after the final freeze wording.
- Truth: legacy links may still exist in backend data for compatibility, but the owner Vault page no longer promotes them as a normal workflow. New owner action should replace them from the selected block.
- Freeze status: frozen on 2026-05-04. Do not reopen `/app/vault-control`, `/vault/:token`, Vault payment-code generation, block-scoped link controls, or Vault private media behavior unless the product owner explicitly reopens the Vault lane.

## 2026-05-04 Vault Block-Scoped Link Controls

- Owner product direction: Vault links should sit inside the exact Vault block they open, not float as a general Vault link.
- Auditor check: backend link creation already requires `product_id` and derives/stores `block_id`, so the frontend should keep product-scoped creation instead of inventing a new general link path.
- Updated `src/pages/VaultControlPage.tsx`:
  - selected block panel now includes `Private link for this block`.
  - link status, offer id, block tag, created/expiry details, copy, open, extend, revoke, and create/fresh-link actions now live inside the selected block.
  - create-link action still sends the selected private offer `product_id`; backend derives the block scope.
  - At this stage, lower `Access links` became `Access link history`; this was later removed from the owner surface in the 2026-05-04 Vault Pre-Freeze Cleanup above.
- Updated `docs/VAULT_CONTROL_FREEZE.md` to freeze block-panel link controls as the primary owner experience.

## 2026-05-04 Vault Inner Block Room

- Owner product direction: Vault should have a fixed inner page/room inside `/app/vault-control`, like Shop Gallery blocks, but private and closed.
- Updated `src/pages/VaultControlPage.tsx`:
  - `Private Vault blocks` was temporarily named `Vault private block room`; it was later renamed back to the cleaner `Private Vault blocks` label in the 2026-05-04 Vault Pre-Freeze Cleanup above.
  - all 6 Vault positions are always visible in that room.
  - unpaid positions show as locked and explain that payment must confirm first.
  - paid positions stay in the same place and become usable for add/edit/hide private picture/video offers.
  - the section has stable anchor `#vault-private-block-room`.
- Updated `docs/VAULT_CONTROL_FREEZE.md` so future assistants do not remove the fixed inner room or return to hiding unpaid Vault positions.

## 2026-05-04 Vault Sort Code Provision

- Owner feedback: after the regional cleanup, the Vault payment instruction still did not show a visible provision for sort code.
- Updated `src/pages/VaultControlPage.tsx` so the payment detail card always includes `Sort code / bank code`.
- The field resolves from configured settlement values in this order: `sort_code`, `bank_code`, `branch_code`, `ifsc_code`, then `mobile_money_number`.
- If none of those real values exist, it shows the pilot rail's not-configured message instead of disappearing or inventing a fake code.
- Updated `docs/VAULT_CONTROL_FREEZE.md` to make this a frozen rule.

## 2026-05-04 Vault Quote Confirmation

- Owner feedback: the Vault slot selector showed a price preview, but the system still felt too quiet. A user could choose 3, 5, or 6 slots without a clear agreement moment before the payment code was generated.
- Updated `src/pages/VaultControlPage.tsx`:
  - slot selection now clears any prior quote confirmation.
  - the payment preview now shows an explicit `Agree: X slots = GBP Y` confirmation step.
  - `Generate payment code` refuses to call the backend until the currently visible slot/amount quote is confirmed.
  - the backend request still sends only `quantity_total`; backend pricing remains the source of truth for the amount.
  - the bank-transfer detail list now shows regional identifiers according to the configured settlement profile, so irrelevant missing sort-code/routing/IBAN fields do not distract owners. Required-but-missing identifiers still show as not configured.
- Updated `docs/VAULT_CONTROL_FREEZE.md` and `docs/VAULT_MVP_STANDARD.md` so future assistants preserve the quote-gated payment rule.
- Truth: no real sort code was invented here. The real sort code must come from the backend settlement config/environment; the UI will show it when configured.

## 2026-05-04 Vault Payment Regional Identifiers

- Owner phone feedback: the Vault payment panel showed account name/account number but no sort code, routing, IBAN/SWIFT, or local regional identifiers.
- Updated `src/pages/VaultControlPage.tsx`:
  - after `Generate payment code`, the bank-transfer panel now exposes UK sort code, US routing, IBAN, SWIFT/BIC, Africa bank/mobile code, Asia local code, branch name, country, region profile, payment networks, amount, payment code, and expiry.
  - missing critical pilot identifiers show as not configured instead of disappearing from the UI.
  - payment preview/help copy now tells owners to use the identifier their bank/region requires.
- Updated `src/lib/communityMoney.ts` so the shared settlement normalizer preserves the same international fields for other money-instruction surfaces.
- Updated `frontend/docs/VAULT_CONTROL_FREEZE.md` to lock this behavior.
- Caveat: this does not connect new banking processors. It makes the settlement contract and UI ready to show real regional details once the correct environment values are configured.

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
  - Vault backend domain finish-up: the uncommitted backend Vault work was carried forward into a coherent dedicated MVP domain. `vault_orders`, `vault_blocks`, `vault_private_offers`, and `vault_access_logs` now exist in the ORM/migration path; payment instruction creation creates a Vault order; exact bank reconciliation activates backend Vault blocks; private product save/update attaches to the selected active Vault block; inactive/private-product removal archives the block offer and revokes active links. `/marketplace/shops/{shop_id}/vault-status` now exposes backend block/order/link status for the owner page.
  - Vault Control cross-device slot repair: `src/pages/VaultControlPage.tsx` now reads backend Vault status through `getVaultShopStatus`, renders active paid blocks from backend `vault_blocks`, sends `vault_slot_number` when saving a private offer, and labels links from backend `block_id`/product scope instead of relying only on browser-local product-slot memory.
  - Vault link scope hardening: new Vault links now require a selected active private product/block, store both `product_id` and `block_id`, revoke the previous active link for that block/product, and log Vault access attempts through `vault_access_logs`. Legacy shop-scope links are still readable but are no longer created by the normal owner flow.
  - Vault documentation correction: `docs/VAULT_MVP_STANDARD.md` and `docs/VAULT_CONTROL_FREEZE.md` now record backend blocks/orders as the implementation truth instead of saying permanent block order still needs a backend contract.
  - Vault phone slot-control repair: `/app/vault-control` no longer uses a native dropdown for `Slots to activate`. The payment slot selector is now six large stable tap tiles, and the `Generate payment code` button is taller/full-width so the visible phone tap target matches the real click area.
  - Vault payment-code visibility repair: identity continuity review no longer hides or renames the payment-code button. The button stays `Generate payment code` and remains usable for the bank-transfer rail; identity review is explained separately and may still limit private access-link sharing.

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
  - `python -m py_compile ..\gmfn_backend\app\db\models.py ..\gmfn_backend\app\services\vault_domain_service.py ..\gmfn_backend\app\services\vault_access_service.py ..\gmfn_backend\app\api\routes\vault_access.py ..\gmfn_backend\app\api\routes\marketplace.py ..\gmfn_backend\app\services\payment_instruction_service.py ..\gmfn_backend\app\services\expected_payments_service.py ..\gmfn_backend\app\services\bank_application_service.py ..\gmfn_backend\alembic\versions\20260504_add_vault_domain_tables.py` passed on 2026-05-04 after the Vault backend domain finish-up.
  - `npm exec -- eslint src/pages/VaultControlPage.tsx src/lib/api.ts` passed on 2026-05-04 after the Vault status/frontend contract pass.
  - `npm run build` passed again on 2026-05-04 after the Vault backend-status owner page pass.
  - `python -m pytest -q gmfn_backend\tests\test_reconciliation_integrity.py` passed on 2026-05-04 after the cross-metadata `VaultOrder.expected_payment_id` fix.
  - `python -m pytest -q gmfn_backend\tests\test_reconciliation_integrity.py gmfn_backend\tests\test_marketplace_public_shop.py` initially exposed a real cross-metadata ORM issue: `VaultOrder.expected_payment_id` could not be a core-model `ForeignKey` to the bank metadata table in core-only test setup. The ORM model now keeps that as an indexed integer.
  - `python -m pytest -q gmfn_backend\tests\test_reconciliation_integrity.py gmfn_backend\tests\test_marketplace_public_shop.py` then had 5 tests pass and 2 fail only because pytest could not create temp directories inside the sandbox.
  - `python -m pytest -q gmfn_backend\tests\test_marketplace_public_shop.py --basetemp pytest-tmp-vault` passed outside the sandbox on 2026-05-04 after temp-directory permission was granted.
  - `gmfn_backend/tests/test_vault_domain.py` was added for the backend Vault owner-status and one-block access-link contracts.
  - `python -m pytest -q gmfn_backend\tests\test_vault_domain.py --basetemp pytest-tmp-vault-domain` passed on 2026-05-04.
  - `python -m pytest -q gmfn_backend\tests\test_vault_domain.py gmfn_backend\tests\test_reconciliation_integrity.py gmfn_backend\tests\test_marketplace_public_shop.py --basetemp pytest-tmp-vault-bundle` passed outside the sandbox on 2026-05-04 after temp-directory permission was granted: 9 passed.
  - `python -m pytest -q gmfn_backend\tests --basetemp pytest-tmp-backend-full` passed outside the sandbox on 2026-05-04 after temp-directory permission was granted: 96 passed.
  - `npm run build` passed again on 2026-05-04 after the focused Vault test/docs follow-up.
  - `npm exec -- eslint src/pages/VaultControlPage.tsx` passed on 2026-05-04 after the Vault phone slot-control repair.
  - `npm run build` passed again on 2026-05-04 after the Vault phone slot-control repair.
  - `npm exec -- eslint src/pages/VaultControlPage.tsx` passed on 2026-05-04 after the Vault payment-code visibility repair.
  - `npm run build` passed again on 2026-05-04 after the Vault payment-code visibility repair.
  - Local dev SQLite DB was backed up to `gmfn_backend/gmfn.db.backup_before_vault_domain_20260504_163112`, then upgraded with Alembic using `GMFN_DEV_MODE=1`; current revision is `20260504_add_vault_domain_tables (head)`.
  - Dev DB schema check confirmed `vault_orders`, `vault_blocks`, `vault_private_offers`, `vault_access_logs`, and `vault_access_links.product_id` / `vault_access_links.block_id`.
  - Backend health responded at `http://127.0.0.1:8012/health`.
  - Frontend Vite responded at `http://127.0.0.1:5173/`, and `http://127.0.0.1:5173/api/health` successfully reached the backend through the Vite proxy.
  - Faraday/Planck line audit found and fixed a real pre-freeze risk in `gmfn_backend/app/api/routes/marketplace.py`: Vault product update now saves the product, selected block attachment/archive, and trust event in one transaction, so a failed block attach cannot leave an orphan private product.
  - The unused `ensure_vault_subscription_expected_payment` helper was removed from `gmfn_backend/app/services/expected_payments_service.py` because it could create a Vault expected payment without a matching Vault order. The only active Vault payment-instruction path now goes through `payment_instruction_service.create_vault_subscription_instruction`.
  - `python -m pytest -q ..\gmfn_backend\tests --basetemp C:\tmp\pytest-backend-vault-full-2` passed outside the sandbox after the final transaction cleanup: 96 passed.
  - `npm run build` passed again after the final transaction cleanup.

- Remaining risk:
  - Frontend build confirms the upload/publish code compiles. Actual picture/video display still depends on the backend process using the same `GMFN_UPLOADS_DIR` for upload saving and `/uploads` static serving.
  - Dedicated Vault migration has been exercised against the local dev SQLite database only; production/staging still needs the normal deployment migration path.
