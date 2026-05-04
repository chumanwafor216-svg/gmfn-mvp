# Free Spotlight Freeze

Date: 2026-05-04

## Frozen Line

The Free Spotlight line is:

1. Community Home free spotlight entry opens `community-home-spotlight-gears`.
2. Community Home free publisher prepares optional picture/video and message.
3. Publish confirms or creates the selected community shop record.
4. Publish calls `/marketplace/broadcasts` with:
   - `priority_mode: "free"`
   - `visibility_scope: "direct_communities"`
   - selected `clan_id`
   - confirmed `shop_id`
5. Community Home shows the optimistic live spotlight immediately.
6. Dashboard spotlight remains visible by default and resolves `/uploads/...` media candidates.
7. Spotlight video surfaces show motion muted first, then expose a clear `Sound on` / `Sound off` toggle through the shared media frame.

## Do Not Reintroduce

- Do not send the Community Home free spotlight action to the old Shop Control publisher by default.
- Do not show paid spotlight, full publisher, Vault, or shop setup actions underneath the Community Home free publisher.
- Do not use frontend identity continuity to block the free spotlight lane. The backend broadcast endpoint is the authority for active membership, shop ownership, capacity, and paid entitlement rules.
- Do not add a second Shop Control spotlight publisher underneath the main Shop Control page. The active Shop Control spotlight surface is the portal section with `id="shop-control-spotlight"`.
- Do not native-disable the free spotlight publish button for recoverable states. Let the click explain the blocker.
- Do not bypass the shared stable tap-target guard on publish/cancel/preview controls. Spotlight buttons must not jump or become silent taps while media is preparing.
- Do not remove the shared video audio toggle from Free Spotlight displays. Silent motion preview is allowed; opened/listening state must be explicit and reversible.

## Still Allowed

- Paid spotlight may remain identity-review locked.
- Vault, payment, private-shop, and shop-detail save actions may remain identity-review locked.
- Shop Control may still expose `Open Free Spotlight` as an owner tool, but Community Home free publishing should stay self-contained.

## Verification

Run `npm run build` after touching:

- `src/pages/CommunityHomePage.tsx`
- `src/pages/ShopControlPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/lib/api.ts`

Manual check:

1. Open Community Home.
2. Open Free Spotlight.
3. Pick picture or short video.
4. Confirm draft preview appears.
5. Publish.
6. Confirm live preview appears on Community Home.
7. Open Dashboard and confirm Spotlight is visible.
8. Confirm the publish button remains tappable and explains preparing/blocked states.
9. If the Spotlight uses video, confirm motion previews muted, `Sound on` is visible, and the same button can turn sound off again.
