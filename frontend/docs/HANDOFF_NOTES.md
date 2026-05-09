# Handoff Notes

## 2026-05-09 Canonical Public Shop Domain Links

- Owner clarified that the shop-owner public shop link should show the complete public shop domain.
- Root truth:
  - `publicFrontendUrl()` intentionally supports current-browser origins for general app links.
  - public shop links sent outside the community need a stricter canonical contract.
- Updated `src/lib/publicLinks.ts`:
  - added `canonicalPublicFrontendUrl()` to build absolute links from the configured public frontend origin, falling back to `https://gmfn-frontend.onrender.com`.
  - added `publicShopDiariesUrl()` for complete canonical public shop URLs that land on `#shop-diaries`.
- Updated shop-link producers:
  - `src/pages/ShopGalleryPage.tsx`
  - `src/pages/MarketplacePage.tsx`
  - `src/pages/MarketplaceWorkspacePage.tsx`
  - `src/pages/ShopAssetsPage.tsx`
  - `src/components/CommunityShopControlPanel.tsx`
- Behavior:
  - copied/shared general public shop links now use the complete canonical public shop domain.
  - generic public shop links still strip community/product filters and land on the 12-block `Shop Diaries` section.
  - product/block-specific links also use the canonical public frontend domain while preserving `product_id` and the product hash.

## 2026-05-09 Public Shop Canonical 12-Block Payload Fix

- Owner screenshot showed the public shop link still landing with `0/12` public blocks under Shop Diaries.
- Root cause follow-up:
  - generic public shop links were still preserving community query values.
  - even without an explicit `clan_id`, the backend public shop endpoint fell back to the shop's home `clan_id` and filtered public products by it.
- Updated frontend:
  - `publicShopDiariesPath()` now strips `clan_id`, `community`, and `community_id` as well as block/product query values for general shop links.
  - block-specific links still carry product targeting separately.
- Updated backend:
  - `/marketplace/public/shop/{gmfn_id}` now filters products/broadcasts by community only when `clan_id` is explicitly supplied.
  - the canonical general public shop face now returns that shop's active `community_visible` public blocks across the shop, matching the owner expectation for the 12-block public shop face.
- Remaining truth:
  - explicitly community-scoped shop URLs can still filter by `clan_id`.
  - private Vault products remain hidden from the public shop face.

## 2026-05-09 Public Shop Link Landing Contract

- Owner clarified the intended public shop-link behavior:
  - a general public shop link is for someone outside the community to view that one shop's public 12-block face.
  - it should land on the actual `Shop Diaries` / 12-block section, not on the upper billboard or private Vault explanation.
  - a block-specific share link may still open one particular block.
- Confirmed logic:
  - backend public shop endpoint returns the shop face plus public `community_visible` products.
  - frontend controls landing position through URL hashes/anchors.
- Updated frontend public-link construction:
  - added `PUBLIC_SHOP_DIARIES_ANCHOR` and `publicShopDiariesPath()` in `src/lib/publicLinks.ts`.
  - generic public shop links now use `#shop-diaries` and strip block-specific query values such as `product_id`, `product`, and `block`.
  - `src/pages/ShopGalleryPage.tsx` gives the 12-block section the `shop-diaries` anchor and allows that anchor to scroll even when there are zero public blocks.
  - generic shop copy/share/request/repost flows now use the 12-block landing link.
  - Marketplace Records & Links public shop face now uses the 12-block landing link.
  - Community Home shop panel and Shop Assets public shop copy links now use the 12-block landing link.
  - Shop Assets product deep links remain product-specific and do not reuse the generic `#shop-diaries` hash.
- Remaining truth:
  - this changes where public shop links land; it does not expose private Vault blocks or change backend visibility rules.
  - if a shop truly has zero public products, the link now still lands at the Shop Diaries section and shows the zero-state there.

## 2026-05-09 Public Shop Block Link Target Fix

- Owner showed a public shop block link landing on the shop page with `0/12` visible blocks instead of opening the shared block.
- Root cause:
  - the previous block share used a URL hash such as `#shop-block-3`, but URL hashes are not sent to the backend.
  - when the share URL also carried community context, the public shop endpoint could filter out the product before the frontend had any block to open.
- Updated frontend:
  - `src/pages/ShopGalleryPage.tsx` now adds `product_id` and `block` query values to block share URLs.
  - the gallery now opens by `product_id` first, then scrolls to the matching public block anchor after products load.
  - `src/lib/api.ts` now sends `product_id` to the public shop endpoint.
- Updated backend:
  - `gmfn_backend/app/api/routes/marketplace.py` public shop endpoint now accepts `product_id`.
  - if that product belongs to the same shop, is active, and is `community_visible`, it is included in the public payload even when the community filter would otherwise exclude it.
- Remaining truth:
  - private Vault products still do not become public through this fix.
  - if the shared product is inactive, belongs to another shop, or is Vault-only, the page should not expose it.

## 2026-05-09 Public Shop Block Double-Tap Restore

- Owner reported public shop blocks no longer pop open to the full block on double click/double tap, and no longer collapse from the block body on a single click/tap.
- Updated `src/pages/ShopGalleryPage.tsx`:
  - public shop block cards now expand when the card body receives a double click/double tap.
  - an expanded block collapses when the card body receives a single click/tap.
  - internal controls are excluded from card-level handling, so `Open`, `Share`, links, inputs, and media buttons keep their own behavior.
  - cursor intent now reflects the state: closed blocks use `zoom-in`, open blocks use `zoom-out`.
- Verification:
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm run audit:tap-stability` passed.
- Remaining truth:
  - this restores the frontend gallery interaction only. It does not change shop data, product ids, backend routes, Vault access, payments, auth, or Marketplace route contracts.

## 2026-05-09 Public Shop Block Share Particularisation

- Owner reported the public shop Share button was generic and did not particularise to the block being shared.
- Updated `src/pages/ShopGalleryPage.tsx`:
  - every public shop product card now has a stable block anchor: `#shop-block-{slotNumber}`.
  - the block share URL now uses that anchor instead of depending on an optional database product id.
  - share title/text now includes the public block number, product title, price text, and shop context.
  - incoming block links open the matching block and scroll to it.
  - old `#product-{id}` links are still recognized and redirected in-page to the matching public block anchor.
- Verification:
  - `npm exec -- eslint src/pages/ShopGalleryPage.tsx` passed.
  - `npm run audit:tap-stability` passed.
- Remaining truth:
  - this particularises public shop block sharing in the frontend. It does not change backend product ids, shop visibility, Vault access, payment, auth, or marketplace route contracts.

## 2026-05-09 Mobile Tap Stability Freeze Guard

- Owner confirmed the previous mobile tap stabilization stopped the app-wide button jumpiness, especially on phone.
- Added a frontend-level guard script:
  - `tools/audit-mobile-tap-stability.mjs`
  - package command: `npm run audit:tap-stability`
- The guard fails if active frontend source reintroduces the patterns that caused or worsened the jumpiness:
  - `translateZ(0)` GPU tap promotion.
  - smooth post-action scroll behavior.
  - `stopImmediatePropagation`.
  - React touch handlers beside pointer/click handling.
  - CSS `:active` hooks.
  - transform `will-change` on tappable source.
  - native `disabled={...}` inside Marketplace Records & Links, because missing-link controls must still capture taps and explain what is missing instead of becoming dead mobile targets.
- Fresh active-source scan before adding the guard found no remaining matches in `frontend/src`.
- Purpose:
  - freeze the successful correction at system level so future Marketplace, Records & Links, Action Inbox, Shop Control, Trust Passport, and shared button work cannot quietly bring the same mobile instability back.
- Remaining truth:
  - this is a source-pattern guard plus build/lint verification, not a substitute for live phone clicks on Render.
  - no backend, auth, payments, schemas, or route contracts were changed by this guard.

## 2026-05-09 Marketplace Records & Links mislanding follow-up

- Owner reported that after the freeze push, Marketplace links/actions were again landing in the wrong place.
- Truth check:
  - the freeze commit itself did not change runtime app code.
  - the likely runtime regression was the earlier line-audit decision to put native `disabled` back on Records & Links buttons.
- Updated `src/pages/MarketplacePage.tsx`:
  - Records & Links outward-link controls now keep `aria-disabled` and disabled visual styling, but no longer use native `disabled` for missing-link states.
  - this lets the button capture the phone tap and show the correct missing-link/admin/clipboard explanation instead of becoming a dead target that can feel like it landed in Shop Control, Trust Passport, Action Inbox, or another nearby route.
- Updated `tools/audit-mobile-tap-stability.mjs` so native `disabled={...}` inside the Marketplace Records & Links section fails the audit.

## 2026-05-09 Marketplace Records & Links Button Stability

- Owner reported Marketplace Records & Links buttons still felt jumpy after the previous link audit.
- Follow-up from live phone testing: owner confirmed the jumpiness is worse on phone.
- Later owner report: jumpiness appears to have spread throughout the app, so the fix moved from Marketplace-only to shared frontend tap stability.
- Marketplace page changes:
  - Marketplace success/error notices now render as a fixed bottom toast instead of an in-flow block above the page, preventing copy/share actions from shifting the current scroll position.
  - Removed route-local `onTouchStart` / `onTouchStartCapture` guards from Marketplace button helpers; pointer and mouse guards remain.
  - Section scrolling now uses immediate scroll and skips scrolling when the target section is already comfortably visible, reducing double-step movement after section expansion.
  - Marketplace now cancels pending section-scroll animation frames before scheduling another one, so rapid taps cannot leave an older section scroll queued behind the latest tap.
  - Follow-up audit found one remaining raw section-open animation frame; replaced it with the same cancelable scroll scheduler used elsewhere.
  - Opening a different Marketplace section clears stale `#marketplace-loans-support` / `#marketplace-owned-links` hashes from the URL so old anchors do not reassert on later renders.
  - Manual section toggles now clear known Marketplace hashes too, preventing a stale anchor from staying in the URL after the user collapses or reopens a lane.
  - Section collapse/open controls now use the same pointer guard helper as the Records & Links action buttons.
  - Public shop link buttons are now disabled unless the current member has a shop visible in the selected Marketplace.
  - Join-link refresh now stays admin-only in the UI, matching the backend `/clans/{clan_id}/invite` contract.
  - Follow-up on exact owner callout: the join-link message preview now renders below the action row, so clicking `Refresh Join Link` no longer inserts a large preview above the clicked buttons and pushes them downward.
  - Follow-up on reported copy-link misroutes: link-block copy/email/open controls no longer use native `disabled` when a link is missing. They remain clickable, capture the tap, and show the missing-link explanation instead of allowing a dead control to feel like it fell through to nearby routes such as Shop Control or Trust Passport.
  - Follow-up on copied links opening stale routes: `src/lib/api.ts` `safeCopy` now returns a real success/failure boolean. Marketplace waits for that result before saying a link was copied, so a blocked clipboard write no longer leaves the user unknowingly pasting an old Shop Control / Trust Passport URL.
  - Phone-specific stability pass: Marketplace action buttons no longer use `translateZ(0)`, the Records & Links action grids opt out of scroll anchoring, and the join-link/message areas reserve stable space so refreshing or loading a join link does not inject a new block into the mobile button stack.
- App-wide tap stability changes:
  - Independent line-auditor pass was requested after the owner asked whether any auditor was working with us.
  - The auditor flagged root-level scroll anchoring disablement as too broad. The `html`, `body`, and `#root` `overflow-anchor: none` patch was reverted. Narrow tappable-surface `overflow-anchor: none` remains.
  - `src/styles/gmfnBrand.ts` `brandStableTapTarget()` now opts out of scroll anchoring, disables WebKit selection/callout, uses `transform: none`, and removes the old `backfaceVisibility: hidden` promotion hint.
  - Shared controls in `src/components/EntryControls.tsx`, `src/components/NextActionGuide.tsx`, and `src/components/DomainIntroToggle.tsx` no longer request `translateZ(0)`.
  - Mechanical app-wide rewrite removed remaining `transform: "translateZ(0)"` from frontend page/component source so mobile tap surfaces no longer rely on the global CSS override to cancel GPU-promotion hints.
  - App-wide post-action reveal scrolls called out by the auditor now use instant `behavior: "auto"` instead of smooth scrolling in `src/layout/AppLayout.tsx`, `src/pages/CommunityHomePage.tsx`, `src/pages/ShopControlPage.tsx`, `src/pages/ShopGalleryPage.tsx`, `src/pages/DemandBoxPage.tsx`, and `src/pages/MarketplaceWorkspacePage.tsx`. Mobile bottom nav now skips centering if the active item is already visible.
  - Follow-up after owner reported a positive sign: removed the remaining smooth reveal scrolls in `src/pages/CreateEntryPage.tsx`, `src/pages/FinancePage.tsx`, and `src/pages/TrustScorePage.tsx`.
  - `src/components/SpotlightMediaFrame.tsx` no longer calls `preventDefault()` on pointer down/up for the audio unlock button; click/key handlers own the actual action.
  - Marketplace visually disabled Records & Links buttons are natively disabled again, and `src/pages/ShopControlPage.tsx` spotlight publish also pairs `aria-disabled` with native `disabled`.
  - Marketplace button guards no longer call native `stopImmediatePropagation()`.
- Related support-flow route tightening:
  - `src/pages/LoansPage.tsx`, `src/pages/LoanReadinessPage.tsx`, `src/pages/LoanSuggestionsPage.tsx`, `src/pages/PaymentInstructionsPage.tsx`, and `src/pages/WithdrawalInstructionsPage.tsx` now preserve the selected community when opening `Action Inbox` / notifications from the Marketplace-adjacent money and support lanes.
  - `src/pages/LoanSuggestionsPage.tsx` now reads `community` / `clan_id` from the URL and applies the shared community route helper to its support-route tiles, so it no longer drops Marketplace context while moving between readiness, suggestions, workbench, guarantor inbox, loans, and notifications.
- Verification:
  - `rg -n "onTouchStart|onTouchStartCapture" src/pages/MarketplacePage.tsx src/pages src/components` returned no active matches.
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed.
  - `npm run build` passed outside the sandbox after the known Vite/esbuild spawn limitation.
  - `git diff --check` passed with the existing line-ending normalization warning only.
  - Re-scanned Marketplace section scroll code: no raw first-call `requestAnimationFrame(() => scrollToMarketplaceSection(...))` remains.
  - `npm exec -- eslint src/pages/MarketplacePage.tsx src/pages/LoansPage.tsx src/pages/LoanReadinessPage.tsx src/pages/LoanSuggestionsPage.tsx src/pages/PaymentInstructionsPage.tsx src/pages/WithdrawalInstructionsPage.tsx` passed.
  - `npm exec -- eslint src/lib/api.ts src/pages/MarketplacePage.tsx` passed after the clipboard-truth patch.
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed after the phone-specific stability pass.
  - `npm run build` passed after the phone-specific stability pass.
  - `npm exec -- eslint src` passed after the app-wide tap stability pass.
  - `npm run build` passed after the app-wide tap stability pass.
  - `rg -n 'translateZ\(0\)' src -g '*.tsx' -g '*.ts'` returned no matches after the app-wide rewrite.
  - Follow-up scan `rg -n 'behavior:\s*"smooth"|translateZ\(0\)|stopImmediatePropagation' src -g '*.tsx' -g '*.ts'` returned no matches.
  - `npm exec -- eslint src` and `npm run build` passed again after the final smooth-scroll cleanup.
  - Vite dev server is responding at `http://127.0.0.1:5173/`.
  - Phone-facing Vite dev server is responding at `http://192.168.1.38:5175/`.
- Devil's advocate:
  - This fixes the main source-level mobile tap instability pattern found across the frontend. It does not prove every screen is corrected until the same paths are tapped on a real phone after hot reload/deployment. If jumpiness remains, next audit target is event propagation/nested clickable surfaces rather than transforms/scroll anchoring.

## 2026-05-08 Frontend-to-Backend Wording Truth Pass

- Continued after `f183b93` with another auditor-backed pass from frontend surfaces into backend-exposed messages.
- Scope stayed polish/truth only:
  - no schema changes
  - no business-rule changes
  - no create/join route contract changes
- Cleaned user-visible/frontend wording:
  - Payout Details no longer describes readiness as a `pilot flow`.
  - Community Join Requests no longer labels admin-direct approval as `Pilot` in the visible UI.
  - Shop Control fallback video notice no longer says `today's pilot`.
  - Revenue Panel now uses `Calibration model` / `Calibration note` instead of visible pilot wording.
  - Trust Command Centre section label changed from `Pilot notes` to `Validation notes`.
  - Trust Graph admin no longer calls the not-wired GMFN-ID lookup path; it tells admins to use User ID search for now.
  - settings save fallback no longer exposes `Backend settings save API is not wired`.
  - onboarding verification cards no longer display raw provider keys such as `.stub`.
  - shared PageTopNav/uiKit button defaults were raised modestly for steadier tap targets.
- Cleaned backend-exposed wording:
  - duplicate/create-entry recovery guidance now says `community helper`, not `pilot helper`.
  - auth/CCI fallback reasons now say the reading is `not ready yet`, not `being prepared`.
  - public settlement defaults now use `GSN Settlement Rail` / `GSN Settlement`, not pilot settlement labels.
  - settlement account-number default now returns `To be assigned` instead of a fake zero account number.
  - settlement missing-field fallback now says payment setup is not ready for the region.
  - TrustSlip/evidence/courier/merchant/liquidity messages no longer expose pilot wording in returned payloads or public HTML.
  - evidence metadata now advertises the active `/trust/me/evidence-pack.zip` route instead of dead PDF paths.
  - backend public HTML courier/TrustSlip verification surfaces now use plain ASCII labels instead of emoji-style status text.
- Verification:
  - `npm exec -- eslint src` passed.
  - targeted backend `python -m py_compile` over the edited route/service files passed.
  - targeted scan for the known risky phrases now only reports an internal backend admin docstring, not live UI copy or response text.
  - live-source mojibake scan with `_freeze_points` excluded returned no matches.
- Devil's advocate:
  - this reduces visible/internal-leak wording risk before university verification. It does not rename internal API route/function names that still contain `pilot` for compatibility, and it does not make product-flow decisions such as the create completion destination or ProfilePage routing.

## 2026-05-08 Post-Push Inner-Page Polish Audit

- Continued after commit `3a83c05` was pushed to `origin/feature/vault-shops`.
- Scope stayed presentation-only:
  - no route changes
  - no business-logic changes
  - no page restructuring
- Confirmed:
  - `feature/vault-shops` was published to GitHub and aligned with origin before this follow-up pass.
  - public/protected inner routes are declared in `src/App.tsx`; dev helper pages found on disk are not wired as published router pages.
  - no `onTouchStart`, `onTouchEnd`, or `onTouchMove` button hacks were found in `src/components`, `src/pages`, `src/layout`, or `src/styles`.
  - live-source mojibake scan with `_freeze_points` excluded returned no matches.
- Polished:
  - `src/pages/VaultControlPage.tsx` now uses plain text for the Vault Control block/payment/link controls instead of emoji-prefixed labels and badges.
  - `/invite-composer-preview` now redirects to `/cover` instead of exposing an unregistered public prototype screen with fake defaults and a dead CTA.
  - public create-entry copy no longer exposes pilot/SMS-provider/intake-monitor wording to users.
  - trust empty states now say `No CCI reading yet` / `No Open Trust reading yet` with a concrete next step instead of `being prepared`.
  - login now says `Sign in to GSN` instead of a generic `Continue`.
  - admin trust-events `Open Identity Risk` now targets the command-center identity-risk route.
  - invite guide/package URLs now use the public `/guide` surface instead of protected or legacy PDF paths.
  - paid spotlight/Vault payment setup fallback copy no longer says `pilot rail`.
  - Trust Slip executive-summary copy no longer exposes `/public/...` implementation instructions.
  - undersized local dashboard/marketplace/entry button helpers were raised modestly for steadier tap targets.
- Verification:
  - `npm exec -- eslint src` passed.
  - `npm run build` passed outside the sandbox after Vite/esbuild needed spawn permission.
  - `git diff --check` passed with line-ending normalization warnings only.
- Devil's advocate:
  - this improves concrete inner-page polish risks after the deployment push. It does not resolve larger product decisions such as whether create completion should route straight to first-circle building or whether the old ProfilePage should be restored as `/app/profile`; those need owner/spec confirmation. Manual verification on the deployed Render URL is still the final proof.

## 2026-05-08 Button and CTA Audit Stabilization

- Ran the requested two-auditor pass:
  - button/tap mechanics audit
  - CTA route truth and incomplete-screen audit
- Corrected button mechanics across the active frontend path:
  - removed redundant `onTouchStart` guards from shared `EntryControls`, `NextActionGuide`, `DomainIntroToggle`, plus active Finance, Trust, Marketplace, Loans, and Notifications helpers.
  - continued the sweep across page-level helpers so `onTouchStart` is no longer present in `src/pages` or `src/components`.
  - increased shared text-button tap target sizes toward the 54px design-system floor.
  - changed Spotlight audio unlock so pointer-down only stops propagation and click owns the actual audio action.
  - fixed Subscription Spotlight decorative overlays so they cannot intercept taps.
  - fixed disabled app navigation links so taps are intercepted instead of falling through.
- Corrected CTA truth:
  - protected app navigation now treats owner shop work as `Shop Control`.
  - public shop face links now use `/shop/:gmfnId`, not protected-looking `/app/shop/:gmfnId`.
  - Cover buttons now say `Open Welcome` and `Read the full guide first`.
  - Dashboard generic `Open` labels were made specific.
  - Community Home create-community now opens `/create`, and the `/app/create-community` aliases redirect there.
  - Community Home no longer carries the hidden free spotlight publisher inside the overview; the visible shortcut now opens `Shop Control` at `#shop-control-spotlight`.
  - Marketplace and Shop Control unused-symbol debt discovered by the audit was cleaned where it touched the shop/spotlight route.
- Verification:
  - `npm run build` passed outside the sandbox.
  - `npm exec -- eslint src` now passes with zero warnings after the continuation cleanup.
  - `git diff --check` passed with line-ending normalization warnings only.
  - Devil's advocate: the audited button/CTA lane and the full frontend lint gate are clean now; line-ending warnings remain repository normalization noise.

## 2026-05-08 Frontend Lint Cleanup Continuation

- Continued after the button/CTA audit to clear the broader frontend lint debt.
- Fixed:
  - disabled `ExplainToggle` hook order without re-enabling explain surfaces.
  - unused legacy confirm-modal types and constant-truthiness logic.
  - type-only imports in Share/TrustGraph components and page wrappers.
  - empty best-effort storage/clipboard catch blocks.
  - stale locals in dashboard attention/theme helpers and backup API stubs.
  - hook dependency warnings by stabilizing loader callbacks in companion, bank, guarantor inbox, liquidity, loans, marketplace, and withdrawal pages.
- Verification:
  - `npm exec -- eslint src` passes with no warnings.
  - `npm run build` passes outside the sandbox.
  - `git diff --check` passes with line-ending normalization warnings only.
- Devil's advocate:
  - this is verification cleanup, not copy/design polish. Existing mojibake text remains in some older components and should be handled separately if the verification team is judging visible copy quality.

## 2026-05-08 Frontend Copy-Encoding Cleanup

- Cleaned the visible broken encoding artifacts called out after the lint pass:
  - `src/components/ShareButtons.tsx` now uses plain labels for copy/share/QR/close actions and toast messages.
  - `src/pages/CommunityHomePage.tsx` now uses stable ASCII stat symbols for Guarantees, Earned, Trade, and Trust.
  - `src/pages/WithdrawalInstructionsPage.tsx` now joins the intelligence-reading fragments with ` | ` instead of a broken replacement marker.
  - old handoff-note references to the broken dash marker were rewritten in plain language.
- Verification:
  - targeted scan for common mojibake/replacement-character sequences returned no matches in `frontend/src`, `frontend/docs`, or `docs`.
  - repo-wide live-source scan with `_freeze_points` excluded returned no broken encoding matches. `_freeze_points` still contains archived historical mojibake and was intentionally left untouched as reference/freeze material.
  - `npm exec -- eslint src` passed.
  - `npm run build` passed outside the sandbox.
  - `python -m pytest -q gmfn_backend\tests --basetemp C:\tmp\pytest-gmfn-clean` passed outside the sandbox after temp-directory permission was needed: 105 passed, 14 sqlite/SQLAlchemy deprecation warnings.
  - `git diff --check` passed with line-ending normalization warnings only.
- Devil's advocate:
  - this is an encoding cleanup and verification pass, not a full editorial tone review of every screen.

## 2026-05-08 University-Readiness Verification Pass

- Continued the cleanup for university/demo readiness after lint, build, and backend tests were green.
- Removed additional presentation blockers:
  - `src/components/RevenuePanel.tsx` now uses clean ASCII fee-flow wording and describes the pilot rate as a calibration estimate, not a placeholder.
  - `src/pages/LockManagementPage.tsx` no longer uses visible `fake` language; it explains the disabled lock-release lane as an intentional backend-authority constraint.
  - `src/pages/ProfilePage.tsx` no longer shows broken icon/dash text or a broken saved marker.
  - `../gmfn_backend/app/services/trust_slip_evidence_pdf_service.py` no longer falls back to a localhost QR URL; it uses the configured public frontend origin or the existing public Render origin.
- Verification:
  - live-source mojibake scan with `_freeze_points` excluded returned no matches.
  - `python -m py_compile gmfn_backend\app\services\trust_slip_evidence_pdf_service.py` passed.
  - `npm exec -- eslint src` passed.
  - `npm run build` passed outside the sandbox.
  - `python -m pytest -q gmfn_backend\tests --basetemp C:\tmp\pytest-gmfn-university` passed outside the sandbox after temp-directory permission was needed: 105 passed, 14 sqlite/SQLAlchemy deprecation warnings.
  - `git diff --check` passed with line-ending normalization warnings only.
  - Removed the upload artifact generated by the backend test suite under `uploads/profile/users`.
- Devil's advocate:
  - engineering gates are green for the university handoff. Manual browser verification is still the final human acceptance step.

## 2026-05-05 Notification Backend Producer Cleanup

- Continued the Notification lane source audit after the frontend resolver cleanup.
- Corrected backend producer truth in `../gmfn_backend/app/services/notification_hooks.py`:
  - guarantor request notices still route to `/app/loans`, but now label the CTA as `Open Loans & Support` instead of `Open Finances`.
  - confirmed pool-deposit notices now route to `/app/finance` with `Open Finance File`, because confirmed deposits belong in the user's Finance File, not the Loans & Support workflow.
- Corrected seeded assistant notification labels in `../gmfn_backend/app/services/notification_service.py`:
  - money-in nudge now says `Open Money In`.
  - support reminder now says `Open Loans & Support`.
- Added backend notification action normalization in `../gmfn_backend/app/services/notification_service.py`:
  - new notifications are stored with cleaned route/label pairs.
  - old stored notification rows are normalized when returned by `/notifications/me`, so stale `View Finances` / `/app/loans` pool-deposit rows reach the frontend as `Open Finance File` / `/app/finance` without silently rewriting the database.
  - old `Deposit to Pool` labels on Money In notices now display as `Open Money In`.
- Added `../gmfn_backend/tests/test_notification_route_truth.py` to lock the bad historic-row cases.
- Tightened the frontend label fallback in `src/pages/NotificationsPage.tsx` and `src/lib/guidance.ts` so `Deposit to Pool` is treated as old generic language and shown as `Open Money In`.
- Re-scanned backend service/route producers for the stale labels `Open Finances`, `View Finances`, and `Deposit to Pool`; no remaining matches were found in the audited backend notification producer paths.
- Verification:
  - `python -B -m py_compile ..\gmfn_backend\app\services\notification_hooks.py ..\gmfn_backend\app\services\notification_service.py` passed.
  - `python -m pytest -q ..\gmfn_backend\tests\test_notification_route_truth.py --basetemp C:\tmp\pytest-notification-route-truth` passed: 3 tests.
  - `npm exec -- eslint src\pages\NotificationsPage.tsx src\lib\guidance.ts` passed.
  - `git diff --check` passed.
- Devil's advocate truth:
  - This cleans future backend-produced notification CTAs and cleans historic rows at API delivery time. It does not rewrite existing database rows; if admin reporting reads the notification table directly, those raw historic values can still appear there until a migration/admin cleanup is run.

## 2026-05-05 Notification Lane Route Audit

- Audited notification producers in `../gmfn_backend/app`:
  - join-review notices use `/app/community/{id}/join-requests?...`
  - activation/rejection notices use `/activate-membership` and `/join-approval/{id}`
  - onboarding trust notices use `/app/trust`
  - marketplace request notices use `/app/demand-box`
  - loan/support hooks use `/app/loans` and `/app/trust`
  - seed assistant notices use `/app/payment/pool`, `/app/loans`, and `/app/trust`
- Updated `src/pages/NotificationsPage.tsx` and `src/lib/guidance.ts` so notification CTAs no longer accept every absolute `/app/...` path blindly. Known app paths, public entry paths, and explicitly safe dynamic paths are allowed; unknown absolute app paths now fall back to `/app/notifications`.
- Added notification/guidance aliases for the finance doors that are now part of the user-facing finance and loans lanes: Payment Rails, Payout Details, and Guarantor Inbox.
- Corrected misleading notification labels at the frontend guidance layer:
  - `/app/loans` with finance-style backend labels now shows `Open Loans & Support`.
  - `/app/finance` now shows `Open Finance File` for generic finance labels.
  - Money In, Money Out, Demand Box, join review, activation, and join decision notices now get clearer labels when the backend label is generic.
- Added one explicit truth correction: the backend pool-deposit-confirmed hook currently points to `/app/loans` while describing a finance deposit. The notification/guidance layer now routes that notice to `/app/finance` so the user lands in Finance File, where money records belong.
- Devil's advocate truth:
  - This pass cleans the frontend notification/guidance resolver. It does not edit backend notification producers because the backend sits outside the current writable frontend root.
  - Admin paths such as `/app/command-center/*` are still allowed for admin notices; route guards remain responsible for protecting those lanes.
- Verification:
  - `npm exec -- eslint src\pages\NotificationsPage.tsx src\lib\guidance.ts` passed.
  - `git diff --check` passed.
  - `npm run build` passed.

## 2026-05-05 Loans Internal Route Audit

- Audited the internal Loans & Support lane buttons and route doors across:
  - `src/pages/LoansPage.tsx`
  - `src/pages/LoanReadinessPage.tsx`
  - `src/pages/LoanSuggestionsPage.tsx`
  - `src/pages/LoanWorkbenchPage.tsx`
  - `src/pages/LoanSummaryPage.tsx`
  - `src/pages/GuarantorInboxPage.tsx`
  - `src/pages/GuarantorEarningsPage.tsx`
  - `src/pages/PaymentInstructionsPage.tsx`
  - `src/pages/WithdrawalInstructionsPage.tsx`
  - `src/pages/NotificationsPage.tsx`
- Confirmed the visible static Loans lane destinations exist in `src/App.tsx`: Loans, Money In, Money Out, Loan Readiness, Loan Suggestions, Loan Workbench, Loan Summary, Loan Payment Instructions, Guarantor Inbox, Guarantor Earnings, Marketplace, Notifications, Payment Rails, Payout Details, Finance, Community, and the dashboard Focus Commitments anchor.
- Confirmed `/app/marketplace#marketplace-loans-support` has a real Marketplace anchor, so the Support Start Page route is not a ghost endpoint.
- Corrected one role-placement issue:
  - `LoanSummaryPage` and `LoanWorkbenchPage` no longer send ordinary users to the command-centre revenue allocation lane.
  - admin or clan-admin users still route to `/app/command-center/revenue-allocation`.
  - ordinary users now see/open `Finance File`, which is the user-facing money record for the community.
- Devil's advocate truth:
  - `/app/revenue-allocation` was not dead; it redirects to the command-centre route. The problem was role fit, not route existence.
  - `NotificationsPage` can still accept backend-provided absolute action paths. It normalizes many known aliases, but a fully dynamic backend CTA cannot be proven clean by static frontend audit alone. Backend notification producers should be audited before freezing the notification lane.
- Verification:
  - `npm exec -- eslint src\pages\LoanSummaryPage.tsx src\pages\LoanWorkbenchPage.tsx src\pages\LoansPage.tsx` passed with existing hook dependency warnings only.
  - `git diff --check` passed.
  - `npm run build` passed after correcting the revenue-role patch ordering.

## 2026-05-05 Loans & Support First-Surface Remodel

- Owner correction: `/app/loans` must copy the pasted Loans & Support reference frame directly, not translate it into a different surface.
- Updated `src/pages/LoansPage.tsx`:
  - removed the generic explain/next-action guide from the first visible surface so the page no longer opens with a busy instruction engine.
  - rebuilt the top as `Focused Task / Loans & Support` with no extra header subtitle, a dark navy hero, the exact borrower/guarantor support workspace copy, selected-community pill, active support count, pending guarantor request count, and a right-side `Pool position` card.
  - added the reference hero underline and kept the pool card language as `This shows the pool amount currently visible to you in this community.`
  - kept the existing backend truth connected through `listMyLoans`, `getLoanGuarantorInbox`, `getCurrentClan`, `getPoolMe`, and `buildGuidanceSnapshot`.
  - audited all visible Loans buttons against `src/App.tsx`; no ghost frontend endpoint was found for the current nine visible route tiles. The `Start Support Request` hash target also exists on `/app/marketplace`.
  - tightened the data calls so `getPoolMe` and `listMyLoans` receive the selected community id, matching the backend's `X-Clan-Id` source of truth for `/pool/me` and `/loans`.
  - rebuilt the visible structure in the screenshot order: `Support summary`, `Current support focus / How to read this page`, `Live support modules`, `Queues & flows`, and the final yellow note.
  - `Support summary` now uses the reference five blocks only: Active loans, Borrower side, Guarantor side, Pending requests, and Pool.
  - `Live support modules` now uses the reference nine routes only: Start Support Request, Money In, Money Out, Loan Readiness, Loan Suggestions, Incoming Guarantor Requests, Action Inbox, Guarantor Earnings, and Marketplace.
  - the final note now says: `Loans & Support stays community-specific. Finance shows the money picture; Loans & Support handles live workflow and decisions.`
- Truth/devil's advocate:
  - the `Pool position` amount is the pool amount visible from the current frontend API call. It is not a full fund engine by itself.
  - this pass remodels `/app/loans`; the deeper route pages such as readiness, suggestions, workbench, payment pool, and withdrawal instructions still carry their own older surfaces and should be audited separately before freezing the full Loans lane.
- Verification: `npm exec -- eslint src\pages\LoansPage.tsx`, `git diff --check`, and `npm run build` passed.

## 2026-05-05 Finance Overview Translation Remodel

- Owner approved moving `/app/finance` toward the simpler Finance Overview reference frame: a calm top surface for non-technical users, with the existing finance truth preserved underneath.
- Updated `src/pages/FinancePage.tsx`:
  - first visible surface now reads as `Finance overview` with the approved message: `Your community finances. Clear. Secure. Together.`
  - hero metrics now translate existing backend-visible truth into four simple blocks: communities, total visible balance, this-month inflow, and trust score.
  - hero still carries the route truth through compact pills for community, GSN ID, community ID, pool reference, and member role.
  - renamed the main action tiles into clearer user language: `Money In`, `View Reports`, `Payment Rails`, and `View Ledger`.
  - added emoji markers to the hero metrics and action tiles so the finance surface is easier for non-technical users to scan.
  - added a compact `More finance tools` card with doors for `Money Out`, `Payout Details`, `Loan Readiness`, and `Trust Passport`.
  - renamed the first finance cards to `Visible Cash Flow`, `Recent Finance Events`, and `Finance Signals` before the detailed sections.
  - corrected builder-facing finance language so the page now speaks to the user: `selected community unit`, `pool-side event ledger`, `reconciliation`, `proof trail`, and `visible record` were replaced on visible surfaces with user terms like `this community`, `money history`, `payment confirmation`, `clear record`, and `recorded movement`.
  - polished action and detail buttons with clearer labels, rounded pill detail buttons, stronger touch targets, and calmer blue/white finance styling.
  - detailed balances, reconciliation, borrower/support exposure, guarantor earnings, and event ledger sections remain in the file as drill-down surfaces instead of being deleted.
  - expected payments now use the member-facing `/payment-instructions/my/expected` path instead of the admin bank expected-payment endpoint.
  - pool and loan reads now pass the selected community id so the visible finance truth stays scoped to the active community context.
- Devil's advocate truth:
  - `Visible Cash Flow` is currently built from visible pool events only. It is not yet a full bank-statement cashflow engine.
  - `View Ledger` currently opens the visible event ledger area first; a real export route/file workflow is not implemented here.
  - Finance now decongests the surface, but `FinancePage.tsx` remains large. Future work should extract reusable Finance cards before adding more JSX.
- Verification: `npm exec -- eslint src\pages\FinancePage.tsx` passed, and `npm run build` passed.
- Protocol note: the UX docs named in `AGENTS.md` (`docs/DESIGN_SYSTEM.md`, `docs/SCREEN_REGISTRY.md`, `docs/SCREEN_SPECS.md`, `docs/UX_ACCEPTANCE_CHECKLIST.md`) are still missing from this frontend repo, so this pass used the available protocol files, handoff notes, backend/frontend inspection, and the owner's screenshot as the operative UX reference.

## 2026-05-05 Finance File Reference Frame Modelling

- Owner supplied a locked Finance reference frame and asked `/app/finance` to be modelled to that structure.
- Updated `src/pages/FinancePage.tsx`:
  - the first visible surface is now a dark `Finance File` card, not a white wrapper with old generic shells around it.
  - the hero keeps only the proof-trail message plus compact pills for communities, GSN ID, trust band, and trust score.
  - added the reference hierarchy: `Next best actions`, `Finance summary`, positive/attention signals, selected community finance unit, lower finance context cards, and the final Loans & Support note.
  - the selected community unit now shows the four reference fields only: community, community ID, pool ref, and available money. Deeper effective/reserved/pending/payment detail remains behind the `View all` / `Open` drill-downs instead of being dumped on the first surface.
  - fixed the loading-state text contrast so Finance does not show pale text on a white card.
- Verification: `npm exec -- eslint src/pages/FinancePage.tsx`, `git diff --check`, and `npm run build` passed.
- Truth/devil's advocate: the old detailed finance tables still exist as hidden drill-down sections. That preserves route truth and avoids deleting backend-connected evidence, but this file is now large. Future Finance work should extract reusable cards instead of adding more inline JSX.
- Protocol truth: `docs/DESIGN_SYSTEM.md`, `docs/SCREEN_REGISTRY.md`, `docs/SCREEN_SPECS.md`, and `docs/UX_ACCEPTANCE_CHECKLIST.md` are still missing from this frontend repo, so this pass used the available protocol files and the owner's screenshot as the operative UX reference.

## 2026-05-05 Finance Page Phone Tightening

- Owner supplied phone screenshots showing `/app/finance` still had the old generic `How Finance Helps You` and `What do you want to do next?` shells exposed before the real finance record. They looked unfinished because each collapsed to a single vague `Open` button.
- Updated `src/pages/FinancePage.tsx`:
  - removed the generic explainer and generic next-action guide from the first visible Finance surface.
  - made the main surface read as `Finance File`, using the existing finance truth rather than a separate invented page.
  - added a compact `Next best actions` card with direct doors to Trust Passport, readiness, payment review, and Loans & Support.
  - bumped local section storage from `gmfn.finance.sections.v1` to `gmfn.finance.sections.v2` so old expanded phone state does not reopen previous clutter by default.
  - collapsed deeper finance tables by default and made helper/empty-state text readable on the light institutional background.
  - replaced the selected-community finance unit's wide phone-clipping table with compact cards for community, pool ref, available/effective money, reserved money, pending in/out, and expected payments.
- Verification: `npm exec -- eslint src/pages/FinancePage.tsx`, `git diff --check`, and `npm run build` passed.
- Truth: the UX docs named in `AGENTS.md` (`docs/DESIGN_SYSTEM.md`, `docs/SCREEN_REGISTRY.md`, `docs/SCREEN_SPECS.md`, `docs/UX_ACCEPTANCE_CHECKLIST.md`) are still missing from this frontend repo, so this pass used the available project protocol, freeze policy, handoff notes, and the owner's screenshots as the available reference.

## 2026-05-05 Shop Diaries Full-Media Card Trial

- Owner direction: product pictures in the public Shop Gallery were too small and visually demoted. Try full-picture product blocks where product information and `Open` / `Share` actions sit on the image.
- Updated `src/pages/ShopGalleryPage.tsx` only inside the public `Shop Diaries` card rendering:
  - each product card is now a full-media card instead of image-left/text-right.
  - product name, buyer cue, price, `Open`, and `Share` sit on a protected dark gradient at the bottom of the media.
  - video cards still use the shared `SpotlightMediaFrame` so muted motion and opened audio behavior remain available.
- Follow-up phone correction:
  - closed two-column cards now use smaller stable action pills so the buttons do not crowd across neighbouring cards.
  - tapping a product card expands it across the Shop Diaries shelf for a larger picture/video view; tapping again collapses it.
  - expanded cards give the product text and `Open` / `Share` controls more room while preserving the same public route and media logic.
- Second phone correction:
  - increased the real gap between the two phone columns so neighbouring cards no longer visually overlap at the center seam.
  - added stricter `box-sizing` and card isolation so each product card owns its own media, overlay, and button area.
  - changed the closed-card action row to a bounded internal grid; `Open` and `Share` can shrink inside the card but cannot spill sideways.
- Third phone correction:
  - removed `contain` from the interactive product card after checking `CONTROL_SURFACE_PROTOCOL.md`; it can cause phone hit-test drift on buttons.
  - changed the public Spotlight wording from a shop-specific frame to a community billboard frame: shops in the marketplace can highlight items there.
  - made the shared `SpotlightMediaFrame` accept a caller-provided `audioUnlockStyle`, then used a smaller `Sound on` pill in the public billboard and opened product video cards so the audio control does not block the video.
- Fourth media correction:
  - changed opened 12-block Shop Diaries videos to mount muted first, then rely on the explicit `Sound on` action to unmute and play. This matches the media protocol and avoids mobile browsers treating the opened video as an untrusted unmuted autoplay attempt.
  - strengthened the shared audio button so it stops pointer/mouse events before the parent card can swallow them, toggles on pointer-up with click fallback, and shows `Tap play, then Sound on` instead of failing silently if the browser blocks playback.
- Fifth media correction:
  - 12-block Shop Diaries videos now expose the `Sound on` action on the closed public card as well as the opened card. `Open` remains only the expand/product-information action; listening is handled by the separate video audio control.
- Sixth tap-ownership correction:
  - the shared media frame now marks its audio button and video element as media controls, and the public product card ignores taps coming from those controls. This prevents `Sound on` or native video controls from bubbling into the parent card and collapsing the product block.
- Seventh interaction correction:
  - removed the whole-card open/collapse behavior from Shop Diaries cards. Only the visible `Open` / `Close` button can expand or collapse a block now; `Sound on` owns only audio. This removes the last competing parent tap surface on phone.
- Final polish correction:
  - the shared video `Sound on` control now toggles on the earliest pointer tap instead of waiting for a later click, so mobile browsers receive the unmute/play request inside the user gesture.
  - the public Vault strip/ad no longer uses a plain `V` mark. It now uses a vault-door style visual so the buyer sees a private Vault, not an unexplained letter.
- Devil's advocate note: this gives products more visual importance, but readability depends on the bottom gradient. If phone testing shows text fighting with busy images, strengthen the gradient before changing the layout again.

## 2026-05-05 Marketplace Colour System Application

- Owner direction: apply the same fixed GSN colour discipline to Marketplace; no page-local random colour invention.
- Updated `src/pages/MarketplacePage.tsx` so the Marketplace route now mounts inside `gsn-page theme-marketplace`.
- Central Marketplace visual helpers now draw from shared token/theme values for shell background, profile surfaces, cards, OS hero, operating tiles, rows, and action buttons.
- Product truth remains unchanged: Marketplace is selected-community scoped and should show selected-community **Trust**, not cross-community CCI.
- Devil's advocate truth: this is a controlled theming pass, not a full deletion of every historical inline colour inside the large Marketplace file. The main visible page system now follows the global theme; future lane edits should keep reducing any remaining hardcoded colour islands instead of adding new ones.

## 2026-05-05 GSN Colour System Standard

- Owner direction: stop random colours page-by-page. Use one global GSN colour language, with controlled domain themes so pages can have different moods without becoming visually unrelated.
- Added `src/styles/tokens.css`:
  - core GSN navy, blue, gold, white/off-white, surface, border, text, success, danger, and warning tokens.
  - domain theme classes: `theme-app`, `theme-entry`, `theme-community`, `theme-shop-control`, `theme-public-shop`, `theme-vault`, and `theme-marketplace`.
  - shared classes for page shells, heroes, cards, buttons, pills, inputs, and grids.
- Added `src/styles/public-shop.css` for the outsider-facing Shop Gallery structure:
  - public shop shell, signboard, meta pills, three-cell status strip, three-button action row, Spotlight advert, Private Vault advert, and Shop Diaries grid/card classes.
  - Important correction: the owner's approved phone reference keeps the public status strip, Repost/Share/Copy row, and Shop Diaries as compact rows/grids on mobile, so this stylesheet does not collapse those surfaces into one-column stacks.
- Added `src/theme/gsnTheme.js` for JS consumers that need the same approved token values.
- Wired the public Shop Gallery route `/shop/:gmfnId` to `public-shop-shell theme-public-shop` and the new public-shop structural classes while preserving the already-working public media/audio logic.
- Rule for future work: do not invent hardcoded random colours inside components. New screens should use a page theme class plus shared button/card/pill/form styles unless there is an explicitly recorded exception.

## 2026-05-05 Shop Gallery Public Viewer Phone Tightening

- Owner feedback: the first public Shop Gallery remodel had the right lane order but did not yet match the approved phone reference. On phone, the trust strip stacked vertically, `Repost / Share / Copy` became full-width rows, Spotlight and Vault were too tall, and `Open / Share` inside product cards collapsed into letter-by-letter buttons.
- Updated `src/pages/ShopGalleryPage.tsx`:
  - the public trust/contact strip now stays as one three-cell white strip on phone.
  - `Repost shop`, `Share shop`, and `Copy link` now stay in one stable three-button row.
  - Spotlight and Private Vault are compact horizontal adverts with text/actions on one side and a media/visual frame on the other.
  - `Shop Diaries` header keeps the `12/12` counter beside the heading area instead of dropping into a loose line.
  - product cards keep `Open` and `Share` as stable horizontal pill buttons on phone, preventing the vertical-letter button failure seen in testing.
  - follow-up correction after phone screenshot: reduced signboard depth, tightened the trust strip, shortened mobile Vault action copy so it no longer clips, and compressed product cards so the public shelf wastes less vertical space.
  - second follow-up correction after comparing with the approved image again: product cards now use a 40/60 image-to-copy split instead of a near half-and-half split, the trust strip uses icon-left/text-right cells like the reference, and the Spotlight/Vault media panels have more room so the page no longer feels cramped.
- Verification: `npm exec -- eslint src/pages/ShopGalleryPage.tsx`, `npm run build`, and `git diff --check` passed.

## 2026-05-05 Shop Gallery Public Viewer Remodel

- Owner supplied a new approved public Shop Gallery reference: one clean shop signboard, a short trust/contact strip, three public share actions, one Spotlight advert, one Private Vault advert, and compact `Shop Diaries` product blocks.
- Updated `src/pages/ShopGalleryPage.tsx` public route `/shop/:gmfnId` to follow that structure:
  - deep navy/gold shop signboard with shop name, description, GSN id, and selected community/marketplace context.
  - public strip now names public blocks, Vault-by-link, and owner contact without dumping owner tools into the buyer view.
  - action row exposes `Repost shop`, `Share shop`, and `Copy link`.
  - Spotlight and Private Vault are now compact adverts above the public shelf, not mixed management controls.
  - `Shop Diaries` renders the public shelf as compact browse/share cards while preserving the shared video/audio behavior when a product is opened.
- Backend/global shelf rule remains unchanged: one public product follows the owner into all communities where the owner belongs; Vault-private products remain excluded from the public shelf.
- Verification: `npm run build` passed after the remodel.

## 2026-05-05 Shop Gallery Global Shelf Rule

- Owner decision: a product uploaded once into Shop Gallery must appear automatically across all communities where the shop owner is an active member.
- Backend truth before this change: the shop was canonical by owner, but product reads were still partly origin-community/repost scoped.
- Backend update:
  - `gmfn_backend/app/api/routes/marketplace.py` now treats `community_visible` products as the owner's global public shelf for read paths.
  - `/marketplace/products?clan_id=...` returns public products from shops whose owners belong to the selected community, even when the product was originally created from another owner community.
  - `/marketplace/shops/by-gmfn/{gmfn_id}?clan_id=...` returns the owner's public shelf once the shop is visible in the selected community.
  - `/marketplace/public/shop/{gmfn_id}` no longer narrows public products by `clan_id`; the link opens the same public shelf while still using `clan_id` only for community context and spotlight filtering.
  - `vault_private` products remain excluded from normal Shop Gallery and ordinary marketplace distribution.
- Test coverage added in `gmfn_backend/tests/test_marketplace_public_shop.py` for the cross-community public shelf and Vault exclusion rule.
- Product wording: Shop Gallery = public to the owner's communities and shareable outside by public shop link. Vault = private by block-scoped Vault link.

## 2026-05-05 Marketplace Trust Scope Correction

- Owner correction: Marketplace belongs to one selected community, so it must show **Trust** for that community, not cross-community CCI.
- Follow-up audit correction: the simplified Marketplace surface must not hide real operating lanes behind vague labels. The old page still contained Money In, Money Out, bank rail, withdrawal rail, finance, loan readiness, loan suggestions, loan workbench, members, links, demand, and support logic; the remodel now names the missing money and loan doors on the first surface.
- Backend truth: `/trust/score/explained-clan` is the correct Marketplace trust endpoint because it is scoped by `X-Clan-Id`. `/trust/score/explained` is not the right source for Marketplace because it is not the selected-community reading.
- Frontend update:
  - `src/lib/api.ts` now exposes `getClanTrustScoreExplained`.
  - `src/pages/MarketplacePage.tsx` loads the clan-scoped trust explanation for the active community and uses it in the Marketplace hero and trust block.
  - Marketplace no longer displays CCI wording or the old `Group CCI` detail row. The expanded panel now shows the current user's Trust inside the selected marketplace, trust event count, positive trust, negative trust, Marketplace ID, and Finance.
  - The visible Marketplace rows now include Dues & Contributions, Money In / Money Out, Banking Rails, Loan Process, Member Ledger, Demand Box, and Records & Links.
  - Banking Rails opens `/app/payment-rails`; Money In / Money Out opens the local money detail lane; Loan Process opens the support/loan lane where readiness, suggestions, workbench, and full loans remain available.
  - Polish/tightening pass: the repeated Dues row was removed because the top Dues & Contributions tile already owns that lane. The remaining operating rows now sit under an `Operating lanes` label, use a tighter two-column desktop grid, and keep the direct doors for Money In / Money Out, Banking Rails, Loan Process, Member Ledger, Demand Box, and Records & Links.
  - The old detailed money, links, members, and support cards now render only after their lane is opened from the simplified Marketplace surface.
  - Marketplace section storage was bumped to `gmfn.marketplace.sections.v4.*` so old expanded browser state does not reopen the previous clutter by default.
  - Trusted Trade now opens the selected-community members/shops lane instead of routing directly to the owner's personal shop page.
  - Recoverable blocked link actions in the expanded links lane stay clickable and explain the missing link instead of becoming dead disabled controls.
  - `getPoolMe` and `listMyLoans` are called with the active community id so the Marketplace page does not rely on stale selected-clan storage for those clan-scoped backend routes.
- Product rule: Community Home / Trust Passport / global identity may use CCI. Marketplace must use selected-community Trust only.

## 2026-05-05 Subscription Spotlight Focused Lane

- Owner direction: complete Subscription Spotlight like Vault, but keep it as a focused subpage under Shop Control rather than a general page outside the shop lane.
- New focused owner route: `/app/shop-control/subscription-spotlight`.
- Shortcut route `/app/paid-spotlight` now routes into the focused Subscription Spotlight page instead of the old mixed Shop Control hash section.
- Community Home paid/subscription spotlight entries and the community shop panel now route directly into the focused Subscription Spotlight page.
- Added `src/pages/SubscriptionSpotlightPage.tsx`:
  - shop-context hero,
  - 1-6 paid spotlight credit selector,
  - live payment preview,
  - explicit `Agree: X credits = GBP Y` quote gate,
  - bank-transfer instruction card with regional sort-code/bank-code provision,
  - payment status refresh/copy controls,
  - paid-only media publisher using the shared Spotlight media preparation and audio toggle pattern.
- Backend standardization:
  - `payment_instruction_service.create_spotlight_subscription_instruction` now computes Subscription Spotlight pricing server-side instead of trusting the frontend amount.
  - `payment_instructions.SpotlightInstructionIn` accepts 1-6 credits and does not require the frontend to send an amount.
  - `/payment-instructions/my` now exposes `spotlight_config`.
  - paid marketplace broadcast creation now consumes one `spotlight_priority` feature credit, so a confirmed entitlement is not reusable forever.
  - `/marketplace/shops/{shop_id}/spotlight-status` exposes backend remaining paid credits so the frontend does not guess from old confirmed payments after a credit has been consumed.
- Added `docs/SUBSCRIPTION_SPOTLIGHT_FREEZE.md` to record the lane rule and prevent future assistants from dumping the user into mixed Shop Control.
- Verification:
  - `npm run build` passed.
  - Backend py_compile passed for payment instruction, expected payment, and marketplace route changes.
  - `python -m pytest -q ..\gmfn_backend\tests\test_marketplace_public_shop.py ..\gmfn_backend\tests\test_reconciliation_integrity.py --basetemp pytest-tmp-spotlight-subscription` passed outside the sandbox: 8 passed.
- Truth: the UX docs named in `AGENTS.md` are still missing from this repo, so this implementation used available protocol/freeze docs plus the Vault pattern as the approved structure.

## 2026-05-05 Next Lane: Subscription Spotlight

- Owner instruction: after finishing a lane, commit and push so Render can pick up the deployed frontend/backend state when the remote allows it.
- Truth: the previous network push attempt was blocked by the execution safety reviewer, so future assistants must attempt the push when explicitly asked, but must report honestly if the environment blocks it.
- Frozen lane status:
  - Free Spotlight is treated as done/frozen under `docs/FREE_SPOTLIGHT_FREEZE.md`.
  - Vault is treated as done/frozen under `docs/VAULT_CONTROL_FREEZE.md` and `docs/VAULT_MVP_STANDARD.md`.
- Next lane: Subscription Spotlight / Paid Spotlight.
- Owner intent for Subscription Spotlight:
  - The user should not be dumped into Shop Control or a mixed tools page.
  - Community Home or the relevant owner home entry should route directly into the focused Subscription Spotlight page.
  - The payment conversation should follow the Vault pattern: choose package, show exact amount, confirm the visible quote, generate a payment code, show bank-transfer details, reconcile payment, then open the paid spotlight capacity.
  - Media should follow the system media law from `docs/MEDIA_PREP_PROTOCOL.md`: accept picture/video, prepare oversized media, explain what changed, and use the shared muted motion plus `Sound on` / `Sound off` behavior.
  - The lane must stay separate from Free Spotlight, Vault, and normal Shop Gallery.

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
  - Subscription Spotlight focused lane: `/app/shop-control/subscription-spotlight` is now the only paid spotlight owner workflow. It owns the 1-6 credit selector, quote agreement, bank-transfer payment code, backend credit status, and paid publisher. `/app/paid-spotlight`, Community Home, and Shop Control shortcut entries route there.
  - Subscription Spotlight line-audit repair: the old mixed Shop Control paid spotlight hash now redirects to `/app/shop-control/subscription-spotlight`, the old Shop Control `Pay spotlight` action was removed, and the mixed Free Spotlight composer no longer lets paid publishing fall back into the free lane.
  - Subscription Spotlight backend truth: `/marketplace/shops/{shop_id}/spotlight-status` exposes remaining paid credits and active paid spotlight count from backend entitlements/broadcasts. Paid publish consumes one credit and refuses a second active paid spotlight for the same shop even while the general spotlight capacity pilot override remains enabled.
  - Subscription Spotlight payment history: owners now read their own expected payments through `/payment-instructions/my/expected`, so pending bank-transfer instructions can survive a page refresh without using the admin-only `/bank/expected` endpoint. Spotlight payment amount mismatches now return HTTP 400 instead of an uncaught backend error.
  - `docs/SUBSCRIPTION_SPOTLIGHT_FREEZE.md` records the frozen paid spotlight lane rules and the auditor-found stale-path repairs.
  - Focused paid-lane emoji pass: `/app/vault-control` and `/app/shop-control/subscription-spotlight` now use small explanatory emojis on payment, block, link, media, preview, and publish labels. The pass was intentionally limited to guidance points and did not change backend logic, route ownership, or button mechanics.
  - Marketplace simplification pass: `/app/marketplace` now opens with a screenshot-inspired GSN Marketplace surface instead of a long exposed control layout. The first visible surface is a dark institutional identity card, four clear blocks for Dues & Contributions, Support Requests, Trusted Trade, and Trust Score, then simple row routes for Dues Calendar, Support Cases, Member Ledger, Demand Box, and Records & Links. Existing money, members, links, demand, and support routes remain underneath and are opened from the guided blocks.
  - Entry registration abandonment repair: backend `/entry/phone/start` and `/entry/create` now release identity details from abandoned half-created pending users before blocking a fresh registration attempt. The release is deliberately narrow: it only applies to pending users with no active membership, no join request, and no created community. Real pending join requests and real activation-pending memberships remain protected and still route to review/activation. This addresses the tester trap where a stopped or failed registration reserved phone/email details but could not sign in or restart.
  - Trust Passport remodel: `/app/trust` now opens with the approved Trust Passport structure: dark institutional hero, current trust posture, TrustSlip/CCI verification facts, trust summary, explanation cards, trust-surface route cards, and institutional evidence. It reuses the existing backend truth already loaded by `TrustScorePage` rather than inventing new trust values. A dedicated `theme-trust` was added to the shared tokens so Trust pages stay inside the GSN colour system. The old exposed Trust surface was removed from the page file rather than left as an unreachable duplicate.
  - Trust Passport line audit: `/app/trust` was checked against the previous TrustScore evidence surface. The remodel now carries the old recompute lines that were missing from the first pass: borrower/guarantor repayment deltas, precision, ordering, computed band, computed score, computed score int, last event used, event count used, and event-type counts. Stale Trust Journey/old collapse helper code left behind from the previous surface was removed so the page has fewer hidden button paths and no duplicate unreachable guidance layer.

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
  - `npm run build` passed on 2026-05-05 after the Subscription Spotlight focused lane and line-audit repairs.
  - `python -B -m py_compile ..\gmfn_backend\app\api\routes\payment_instructions.py ..\gmfn_backend\app\api\routes\marketplace.py` passed on 2026-05-05 after the Subscription Spotlight backend audit repairs.
  - `python -m pytest -q ..\gmfn_backend\tests\test_marketplace_public_shop.py ..\gmfn_backend\tests\test_reconciliation_integrity.py --basetemp pytest-tmp-spotlight-subscription` passed outside the sandbox on 2026-05-05: 9 passed.
  - `npm run build` passed on 2026-05-05 after the focused paid-lane emoji pass.
  - `npm run build` passed on 2026-05-05 after the Marketplace screenshot-form simplification pass.
  - Local dev SQLite DB was backed up to `gmfn_backend/gmfn.db.backup_before_vault_domain_20260504_163112`, then upgraded with Alembic using `GMFN_DEV_MODE=1`; current revision is `20260504_add_vault_domain_tables (head)`.
  - Dev DB schema check confirmed `vault_orders`, `vault_blocks`, `vault_private_offers`, `vault_access_logs`, and `vault_access_links.product_id` / `vault_access_links.block_id`.
  - Backend health responded at `http://127.0.0.1:8012/health`.
  - Frontend Vite responded at `http://127.0.0.1:5173/`, and `http://127.0.0.1:5173/api/health` successfully reached the backend through the Vite proxy.
  - Faraday/Planck line audit found and fixed a real pre-freeze risk in `gmfn_backend/app/api/routes/marketplace.py`: Vault product update now saves the product, selected block attachment/archive, and trust event in one transaction, so a failed block attach cannot leave an orphan private product.
  - The unused `ensure_vault_subscription_expected_payment` helper was removed from `gmfn_backend/app/services/expected_payments_service.py` because it could create a Vault expected payment without a matching Vault order. The only active Vault payment-instruction path now goes through `payment_instruction_service.create_vault_subscription_instruction`.
  - `python -m pytest -q ..\gmfn_backend\tests --basetemp C:\tmp\pytest-backend-vault-full-2` passed outside the sandbox after the final transaction cleanup: 96 passed.
  - `npm run build` passed again after the final transaction cleanup.
  - `python -m pytest ..\gmfn_backend\tests\test_entry_create.py` passed on 2026-05-05 after the entry registration abandonment repair: 17 passed.
  - `python -m pytest ..\gmfn_backend\tests\test_join_requests.py` passed on 2026-05-05 after confirming pending join requests remain protected: 28 passed.
  - `npm run build` passed on 2026-05-05 after the Trust Passport remodel.
  - `git diff --check -- src/pages/TrustScorePage.tsx src/styles/tokens.css` passed on 2026-05-05 after the Trust Passport remodel.
  - `npm exec -- eslint src\pages\TrustScorePage.tsx` passed on 2026-05-05 after the Trust Passport line audit cleanup.
  - `npm run build` passed on 2026-05-05 after the Trust Passport line audit cleanup.

- Remaining risk:
  - Frontend build confirms the upload/publish code compiles. Actual picture/video display still depends on the backend process using the same `GMFN_UPLOADS_DIR` for upload saving and `/uploads` static serving.
  - Dedicated Vault migration has been exercised against the local dev SQLite database only; production/staging still needs the normal deployment migration path.

### University readiness hardening follow-up (2026-05-08)

- Owner request continued: make one more readiness push before university verification, focusing on unfinished visible surfaces and risky temporary backend defaults.
- Updated `../gmfn_backend/app/api/routes/entry.py`:
  - entry-phone OTP preview is no longer the silent default.
  - preview now requires `GMFN_DEV_MODE=1` or `GMFN_ENTRY_PHONE_DELIVERY=preview|pilot|manual`.
  - production default returns `delivery_mode: pending-sms` and no `otp_preview`.
- Updated `../gmfn_backend/tests/test_entry_create.py`:
  - added a regression test for the no-preview production default.
- Updated `../gmfn_backend/app/api/routes/marketplace.py`:
  - removed the hardcoded always-on expired spotlight capacity override.
  - override is now opt-in via `GMFN_SPOTLIGHT_CAPACITY_OVERRIDE=1` and still date-limited by the old 2026-04-24 expiry.
- Updated `src/App.tsx`:
  - routed `/profile` and `/app/profile` to the current polished `My GMFN and I` surface.
  - redirected legacy `/app/clans` to `/app/community`.
- Updated `src/pages/TrustCommandCentrePage.tsx`:
  - changed visible "pilot" wording in the validation area to readiness/verification language.
  - internal API names and backend readiness contracts were not renamed.
- Verification:
  - `npm exec -- eslint src` passed.
  - `npm run build` passed outside the sandbox after the sandbox blocked Vite/esbuild with `spawn EPERM`.
  - `python -m pytest gmfn_backend\tests\test_entry_create.py` passed: 18 passed.
  - `python -m pytest gmfn_backend\tests\test_marketplace_requests.py gmfn_backend\tests\test_marketplace_public_shop.py` passed outside the sandbox: 10 passed.
  - `python -m pytest gmfn_backend\tests` passed outside the sandbox: 106 passed, 14 warnings.
- Remaining risk:
  - If Render does not have real SMS delivery configured, the create-entry phone verification flow now needs live SMS delivery or an explicit preview/manual env setting before university testers use self-service signup.
  - True 100% readiness still requires a live Render-domain walkthrough.

### University readiness audit follow-up (2026-05-08)

- Owner request continued: another push after the hardening commit, using frontend/backend auditors plus local sweep.
- Frontend/admin polish:
  - `src/pages/SystemOperationsPage.tsx` now uses `entry support` / `applicant` language instead of visible pilot/tester wording.
  - `src/pages/TrustCommandCentrePage.tsx` now normalizes readiness status labels so backend `pilot_near_ready` cannot display as visible `pilot near ready`.
  - `src/pages/AppearancePage.tsx` no longer says `pilot workflow`, and settings shortcuts now route to authenticated `/app/...` pages.
  - `src/pages/MyGMFNAndIPage.tsx` no longer says account sync is being prepared after local settings save.
  - `src/pages/TrustGraphAdminPage.tsx` and the stale duplicate component copy now use protected/admin wording instead of visible `internal` copy.
  - the active TrustGraph GMFN ID control now opens the current member TrustGraph instead of showing a dead `not connected yet` message.
  - `src/lib/api.ts` fallback messages no longer expose `endpoint not enabled yet` wording.
- Backend/deployment readiness:
  - removed the stray `txt` dependency from `../gmfn_backend/requirements.txt`.
  - removed startup DDL for `users.profile_image_url`; Alembic migration `20260427_add_user_profile_image_url` owns it.
  - disabled the reconciliation loop by default and set Render `GMFN_ENABLE_RECONCILIATION_LOOP=0`.
  - `/public/config` now reports payment support from configured readiness instead of hardcoding all rails as supported.
- Verification:
  - `npm exec -- eslint src` passed.
  - `npm run build` passed outside the sandbox.
  - `python -m py_compile gmfn_backend\app\main.py gmfn_backend\app\api\routes\public_config.py` passed.
  - `python -m pytest gmfn_backend\tests` passed outside the sandbox: 106 passed, 14 warnings.
- Remaining risk:
  - Render still needs real SMS delivery or a conscious manual/preview verification env setting before university testers use self-service create-entry.
  - Payment surfaces may now correctly show setup-not-ready until real settlement envs are configured.
  - R2 is still only documented/planned; active uploads currently use Render persistent disk through `GMFN_UPLOADS_DIR`.

### Controlled OTP and Marketplace link clarity (2026-05-08)

- Owner decision: use OTP immediately for the university pilot without waiting for paid SMS delivery.
- Updated `../render.yaml`:
  - set `GMFN_ENTRY_PHONE_DELIVERY=preview` for the API service while keeping `GMFN_DEV_MODE=0`.
  - this lets controlled testers complete OTP verification with a preview/manual code path.
  - this is not production SMS delivery; live public SMS still needs a provider and the preview/manual mode should be removed.
- Updated `src/pages/MarketplacePage.tsx`:
  - clarified the outbound link lanes:
    - `Join this community` is for someone requesting access to the selected marketplace/community.
    - `Start a new community` is for a founder creating their own community and does not join them to the selected community.
  - made the secure join target larger and easier to tap.
  - disabled copy/open/send actions until the matching link exists.
  - changed message labels to `Message to send` and cleaned masked link labels so broken separator characters do not show.
- Updated `../docs/DEPLOYMENT_RENDER.md`:
  - recorded the OTP preview truth and the reconciliation-loop deployment default.
- Verification:
  - `git diff --check` passed.
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed.
  - `npm run build` passed outside the sandbox after the sandbox blocked Vite/esbuild with `spawn EPERM`.
- Remaining risk:
  - OTP preview is controlled-pilot behavior, not production SMS.
  - A deployed Render-domain walkthrough is still needed to prove the Blueprint env changed on the live service.

### Marketplace outward-link button audit (2026-05-08)

- Owner request continued: Marketplace link buttons still felt uneven, and university contacts may need email/copy links instead of phone-number/WhatsApp sharing.
- Updated `src/pages/MarketplacePage.tsx` route-locally:
  - changed the Marketplace outward-link action rows from flex wrapping to a stable responsive grid so buttons fall into consistent rows on desktop and mobile.
  - added explicit `Copy Join Link` and `Copy Create Link` buttons instead of requiring users to copy a WhatsApp-style message.
  - added `Email Link` actions for join, create, public marketplace, and public shop links using the user's local email client.
  - kept WhatsApp available, but no longer made it the only obvious send route.
  - added real `disabled` attributes to public marketplace/shop buttons when their links are missing, instead of only styling them as disabled.
  - kept all changes inside the Marketplace page; no backend, route contract, OTP, payment, auth, or schema logic changed.
- Verification:
  - `git diff --check` passed.
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed.
  - `npm run build` passed outside the sandbox after the sandbox blocked Vite/esbuild with `spawn EPERM`.
- Remaining risk:
  - Email buttons open `mailto:` through the user's installed/default mail client; if no mail client is configured, users should use the copy-link buttons.

### Marketplace link buttons hash guard (2026-05-08)

- Owner reported a live Marketplace fault: trying to copy the join link was falling back into the Loans and Support area.
- Updated `src/pages/MarketplacePage.tsx` route-locally:
  - Marketplace button click handling now calls `preventDefault()` as well as `stopPropagation()`.
  - outward-link actions now pin the active hash/section to `#marketplace-owned-links` before copy, email, open, create/refresh, or WhatsApp send work starts.
  - this prevents a stale `#marketplace-loans-support` route hash from reasserting itself while the user is working in the Marketplace link lane.
  - no backend, OTP, payment, auth, schema, or link-generation logic changed.
- Verification:
  - `git diff --check` passed.
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed.
  - `npm run build` passed outside the sandbox after the sandbox blocked Vite/esbuild with `spawn EPERM`.
- Remaining risk:
  - Superseded by the later Marketplace join-link polish below: the route-local guard remains useful, but copy/share actions must not rewrite the page hash because that can feel like a bounce.

### System-level outward-link button audit (2026-05-08)

- Owner clarified the Marketplace fix must not remain the only audited area; Vault, Spotlight, shop links, invite links, and shared button helpers needed a broader pass before university verification.
- Confirmed shared-helper truth:
  - `stopActionTap` / `actionTapGuardProps` are shared by real internal links through `OriginLink`.
  - Do not globally add `preventDefault()` there, because that can break navigation across the app.
  - Route-local hash pinning is safer for pages with section hashes and copy/open link actions.
- Updated high-risk outward-link surfaces:
  - `src/pages/ShopControlPage.tsx`
    - Vault copy/open actions now pin the page hash to `#shop-control-vault` before copying or opening private Vault links.
    - copy operations now use shared `safeCopy`.
  - `src/pages/VaultControlPage.tsx`
    - private block link copy/open buttons are disabled until a link exists.
    - Vault payment references, transfer details, and private block links now use shared `safeCopy`.
  - `src/pages/ShopAssetsPage.tsx`
    - shop/product copy actions now use shared `safeCopy`.
  - `src/pages/SubscriptionSpotlightPage.tsx`
    - paid Spotlight payment reference/details now use shared `safeCopy`.
  - `src/pages/ClansPage.tsx`
    - invite-package copy actions now use shared `safeCopy`.
    - WhatsApp invite share now opens with `noopener,noreferrer`.
  - `src/pages/CommunityJoinRequestsPage.tsx`
    - activation-message/link copy actions now use shared `safeCopy`.
    - activation copy buttons are disabled until the matching message/link exists.
    - external activation link opens with `noopener noreferrer`.
  - `src/components/CommunityShopControlPanel.tsx`
    - Copy Public Shop Link is now truly disabled until a public shop link exists.
- Remaining risk:
  - This pass hardens the known high-risk link/copy surfaces; it is not a visual redesign and does not change route contracts, backend logic, OTP, payments, auth, or schemas.
  - A deployed browser walkthrough is still needed for Marketplace links, Shop Control Vault links, Vault Control block links, Shop Assets product links, Subscription Spotlight payment copy, and Clans invite package copy/share.

### Shared copy helper consolidation (2026-05-08)

- Follow-up audit continued after the outward-link pass.
- Updated page/component copy handlers to use the shared `safeCopy` path instead of local raw clipboard calls:
  - `src/pages/PaymentInstructionsPage.tsx`
  - `src/pages/WithdrawalInstructionsPage.tsx`
  - `src/pages/LoanWorkbenchPage.tsx`
  - `src/pages/TrustScorePage.tsx`
  - `src/pages/TrustSlipPage.tsx`
  - `src/pages/TrustTimelinePage.tsx`
  - `src/pages/AdminIncompleteLoansPage.tsx`
  - `src/pages/AdminTrustEventsPage.tsx`
  - `src/components/PaymentInstructionsPanel.tsx`
  - `src/components/ShareActions.tsx`
  - `src/lib/copy.ts`
- Remaining raw clipboard/browser-copy calls are now limited to central fallback helpers (`src/lib/api.ts`, `src/lib/share.ts`) plus an old backup file that is not part of active UI imports.

### Deep active-tree cleanup follow-up (2026-05-08)

- Owner asked for a base-level front/back cleanup before the university pilot so stale artifacts do not create audit noise or pilot impediments.
- Removed stale active-source artifacts that were not imported anywhere:
  - `src/lib/api.BACKUP.before-cleanup.ts`
  - `src/pages/confirmPending_.code-search`
  - `../gmfn_backend/app/schemas/clans.py`
- Removed the stray `txt` package from `../gmfn_backend/requirements-dev.txt`.
- Consolidated `src/lib/share.ts` copy behavior onto the shared `safeCopy` fallback.
- Confirmed after cleanup:
  - no active references to the deleted frontend artifacts.
  - no active references to `app.schemas.clans`.
  - direct browser copy fallback is now centralized in `src/lib/api.ts`; share buttons call the share helper, which now delegates to `safeCopy`.
- Verification:
  - `git diff --check` passed.
  - `npm exec -- eslint src` passed.
  - `python -m compileall app` passed.
  - `npm run build` passed outside the sandbox after sandbox Vite/esbuild hit `spawn EPERM`.
  - `python -m pytest tests --basetemp .pytest_tmp` passed outside the sandbox: 106 passed, 14 warnings.
- Note:
  - The first backend test run inside the sandbox hit Windows temp-directory permission errors, not test assertions. The outside-sandbox rerun with explicit `--basetemp` passed.

### Marketplace join-link button polish (2026-05-08)

- Owner reported that Marketplace "Copy Join Link" still felt wrong: duplicated open/share controls in the join-link lane, and clicking copy could appear to bounce into another Marketplace block such as Demand or Loans/Support.
- Updated `src/pages/MarketplacePage.tsx` only.
- Behavior:
  - "Copy Join Link" is now the first/primary action in the "Join this community" card.
  - removed the duplicate full-width "Open secure join page" anchor and the extra "Open Join Link" button from that same lane.
  - kept separate secondary actions for refreshing the join link, copying the invite message, emailing the join link, and WhatsApp sharing.
  - copy/email/WhatsApp/open helpers no longer rewrite the page hash to `#marketplace-owned-links`; this avoids the visible jump/bounce while the user is already inside the owned-links section.
  - Marketplace action buttons now use stronger pointer/mouse/touch capture guards and higher local z-index so taps are less likely to leak into neighboring route rows or section launchers.
- Verification:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed.
  - `git diff --check` passed.
  - `npm run build` passed outside the sandbox after the known Vite/esbuild sandbox `spawn EPERM`.
- Remaining risk:
  - A live browser walkthrough should still click the exact owner-reported path: open Marketplace, expand Marketplace and entry links, refresh/create the community join link if needed, then click `Copy Join Link`, `Copy Invite Message`, `Email Join Link`, and `WhatsApp` to confirm none of them jumps into Demand, Loans/Support, or another route.

### Marketplace owned-link duplicate follow-up (2026-05-08)

- Continued the Marketplace-owned link audit after the join-link lane was committed.
- Updated `src/pages/MarketplacePage.tsx` only.
- Behavior:
  - removed the repeated `Open Public Shop Face` button from the "Private and controlled outward links" card because the "Public shop face" card directly above already owns shop copy/email/open actions.
  - widened Marketplace-owned action grid columns from 148px to 168px so link buttons have more stable room for labels like `Email Join Link` and `Copy Marketplace Link`.
- Verification:
  - `npm exec -- eslint src/pages/MarketplacePage.tsx` passed.
  - `git diff --check` passed.
  - `npm run build` passed outside the sandbox after the known Vite/esbuild sandbox `spawn EPERM`.
- Remaining risk:
  - No automated browser runner exists in the current frontend package. A real deployed click-through is still needed for the owner-reported Marketplace path.
