# Shop Gallery Authenticated QA Runbook - 2026-07-12

## Purpose

Use this runbook to close the remaining Shop Gallery proof gap after the
2026-07-12 production deploy.

Already proved:
- public shop read path returns 12 visible blocks with no duplicate numbered
  public blocks;
- legacy unnumbered public rows can resolve to a visible display block;
- unauthenticated `/app/shop-assets` redirects to sign-in without browser
  errors.

Not yet proved:
- a real signed-in owner can replace one public Shop Diary block in production
  and immediately see the old item disappear from the owner tools and public
  shop.

## Safety Rules

- Do not write passwords into chat, docs, screenshots, commits, or support
  messages.
- Use an owner/test account that is allowed to mutate the live shop.
- Pick one low-risk block whose content can be replaced for the test.
- Take before/after screenshots of the visible block grid.
- Use a temporary image/video that is safe to leave live briefly.
- If the test touches a real customer-facing block, restore or replace it before
  calling the QA complete.

## Target Surfaces

- Frontend: `https://gmfn-frontend.onrender.com/app/shop-assets`
- Public shop: `https://gmfn-frontend.onrender.com/shop/GMFN-U-63655DE6`
- Public API read check:
  `https://gmfn-api.onrender.com/marketplace/public/shop/GMFN-U-63655DE6?product_limit=300`

Replace `GMFN-U-63655DE6` with the signed-in shop owner's live GSN/GMFN ID if
testing another account.

## Before Test

Record:
- tester name;
- date/time;
- account identifier used, not password;
- selected block number;
- current block title;
- current block media visible in the grid;
- current public API product id for that block, if available.

Expected current public API shape:
- `ok: true`;
- exactly `12` products;
- numbered blocks `1` through `12`;
- no duplicate numbered block groups;
- each visible block has `public_block_number` or `display_block_number`.

## Test A - Replace One Existing Visible Block

1. Open `https://gmfn-frontend.onrender.com/app/shop-assets`.
2. Sign in as the permitted shop owner.
3. Confirm the page lands on Shop Assets or Shop Gallery Tools.
4. Select the chosen numbered public block.
5. Press the block edit action.
6. Change the title and media to a clearly temporary QA item.
7. Save/post the block.
8. Wait for the success response.
9. Return to the 12-block grid.

Pass:
- the selected numbered block shows the new title/media;
- the old title/media is no longer visible anywhere in the 12 public blocks;
- the live block count remains `12 / 12`;
- no duplicate copy of the old item remains in another numbered block;
- no raw error, blank screen, or stale success message appears.

Fail:
- the new item appears but the old item still remains visible;
- the block count grows beyond 12 visible public blocks;
- the old item moves to another block without an intentional repost;
- the owner page and public shop disagree after refresh.

## Test B - Public Shop Read-After-Write

After Test A, open the public shop in a fresh/private browser:

`https://gmfn-frontend.onrender.com/shop/GMFN-U-63655DE6`

Pass:
- the chosen block shows the replacement item;
- the old item is not visible as a public block;
- public visitor view does not expose owner controls.

Then read the public API endpoint:

`https://gmfn-api.onrender.com/marketplace/public/shop/GMFN-U-63655DE6?product_limit=300`

Command helper:

```powershell
npm --prefix frontend run check:public-shop-blocks -- --gmfn-id GMFN-U-63655DE6 --block 6 --expect-title "NEW TITLE HERE" --absent-title "OLD TITLE HERE"
```

Pass:
- `products.length` is `12`;
- the selected block appears once;
- duplicate numbered block groups are empty;
- the replacement product has the chosen `public_block_number` or
  `display_block_number`;
- the old replaced product is absent from the public product list or inactive.

## Test C - Refresh And Return

1. Refresh the owner Shop Assets page.
2. Navigate away to Shop Control.
3. Reopen Shop Gallery Tools / Shop Assets.

Pass:
- the selected block still shows the replacement item;
- the old item does not reappear;
- the block count remains stable.

## Optional Cleanup

If a temporary QA item was used:

1. Edit the same numbered block again.
2. Restore the intended title/media.
3. Repeat the public read-after-write checks.

Cleanup pass:
- restored item is visible in the same numbered block;
- temporary QA item is gone from public blocks;
- product count is still 12;
- duplicate numbered block groups are still empty.

## Evidence To Capture

- Screenshot before edit: owner 12-block grid.
- Screenshot after edit: owner 12-block grid.
- Screenshot after public refresh: public shop block.
- Public API summary:
  - product count;
  - selected block item id/title;
  - duplicate block groups;
  - any old item still visible.
- Any error message exactly as displayed.

## Current Residual Truth

As of the 2026-07-12 production deploy QA:
- the public read path is production-QA'd;
- the unauthenticated protected-route shell is production-QA'd;
- authenticated live owner edit/upload is still the open proof item;
- `frontend/src/pages/ShopControlPage.tsx` summary still uses a raw public
  product count because the file is frozen, while the embedded Shop Assets lane
  uses the fixed visible-slot count.
