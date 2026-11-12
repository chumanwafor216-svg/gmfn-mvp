# Vault Control Freeze

## Frozen Intent

Vault is a paid private layer under the owner's main shop, not a second shop.

The public Shop Gallery keeps 6 standard public Shop Diary blocks. Up to 4 extra public blocks can be paid capacity. Vault opens paid private blocks up to the current Vault cap of 2.

The fuller MVP product law is recorded in `docs/VAULT_MVP_STANDARD.md`.

## Freeze Status

Frozen on 2026-05-04 after the final owner review pass. Payment behavior was explicitly amended by the product owner on 2026-11-12 to use the customer-service Pipeline Credit rail.

The frozen owner structure is: Vault hero, Pipeline-Credit quote-gated slot activation, fixed two-position private block room, selected-block offer editor, selected-block private link controls, and compact collapsible supporting panels.

Future work may add real payment providers, stronger admin reporting, or production settlement configuration, but must not casually merge Vault back into Shop Gallery, Free Spotlight, Subscription Spotlight, or generic Shop Control.

## Route Ownership

- Owner route: `/app/vault-control`
- Visitor route: `/vault/:token`
- Public shop parent route: `/shop/:gmfnId`

`/app/vault-control` must not redirect into the mixed Shop Control section. It owns the focused owner-side Vault workflow.

## Frozen Behavior

1. Vault inherits the main shop signboard/name/image automatically.
2. The Vault hero must clearly identify the surface as `Vault`.
3. A Vault Pipeline Credit spend can activate 1 to 2 available private slots.
4. Completed Vault service-spend quantity controls how many private blocks become active.
5. `/app/vault-control` must include a fixed inner Vault private block room with both known positions visible. Inactive positions stay locked and cannot be used; activated positions become usable in place.
6. Each paid private block can hold a picture or short video.
7. Vault products use `visibility_mode = vault_private`.
8. Vault products are not public gallery products.
9. A visitor can only see Vault products through an active owner-created Vault link.
10. Vault video surfaces use the shared muted-preview plus reversible `Sound on` / `Sound off` media rule.
11. Vault must run as a focused task route on mobile. The general bottom rail should not compete with Vault payment, slot, editor, or link buttons.
12. Vault owner controls keep a local product-id-to-slot map so the block the owner selected does not drift just because the backend returns products newest-first.
13. New Vault activation must use the purpose-scoped customer-service Pipeline Credit account. It must not create a direct Vault bank-transfer or card charge.
14. The Vault activation surface must request an immutable server quote and show the exact Pipeline Credit debit, current balance, resulting balance, service-price version, and expiry before spending.
15. Slot selection must not be silent. The page must immediately show the chosen slot count and active operator-configured credit cost. No GBP amount or fixed credit amount may be hardcoded into Vault Control.
16. Spending must be explicitly agreement-gated. Changing the selected slot count clears the quote and agreement. The server must check sufficient balance and atomically debit credits plus create the Vault order, blocks, and entitlement.
17. A price change affects only future quotes. An accepted historical quote keeps its service version and exact debit until it expires or is spent.
18. New Vault access links must target one selected private block/offer. Legacy links without a product/block scope are not the future standard.
19. The primary link controls must live inside the selected Vault block panel: create, copy, open private view, extend, and revoke. Do not reintroduce a lower owner-facing Access Link History surface; old/legacy link records belong in backend/admin audit, not in the normal owner workflow.
20. Frontend link creation must keep sending the selected private offer `product_id`; the backend derives and stores the matching `block_id`. Do not replace product-scoped link creation with a general shop/Vault link.
21. Default private link expiry is 72 hours.
22. Vault slot activation duration is 30 days by default.
23. `/app/vault-control` must read backend Vault block status from the shop Vault status contract when available.
24. Saving a private Vault offer must send the selected `vault_slot_number`.
25. New Vault links must carry both the selected product scope and backend block scope.
26. Existing private product rows must not prove paid Vault capacity. When backend Vault status is available, its active block state is authoritative even when it reports zero active slots. Confirmed Vault payment history is fallback evidence only while backend status is unavailable.
27. Backend `vault_blocks.slot_number` is the fixed owner-room placement. Frontend must not slide slot 2 into slot 1 just because slot 1 is empty, and duplicate backend slot claims must not overwrite an earlier block.
28. Visitor Vault access must show only the returned `product_id` or `block_id` scope. A legacy unscoped response with multiple private products is not a normal private-block view.
29. Phone slot activation controls must use stable large tap tiles for slots 1-2. Do not reintroduce a native dropdown for this payment-critical control.
30. Identity continuity review must not hide the Vault quote or spend action. Any identity warning belongs in a separate explanation block. Private sharing/link actions may still be limited by identity review.
31. Historical bank-paid Vault instructions may remain readable and reconcilable, but no new direct Vault bank instruction may be created. Bank or provider payment belongs only to a separately governed Pipeline Credit acquisition flow.
32. Vault-private product save/update must attach or archive the selected backend block inside the same transaction as the product change. Do not commit the product first and attach the Vault block afterward.
33. The Vault owner page may use collapsible panels to reduce exposed page length, but collapsing must not delete or merge the payment instruction, fixed block room, selected-block editor, or block-scoped link controls.
34. `GET /marketplace/vault-access/:token` is a metadata/status check and must never return private products.
35. `POST /marketplace/vault-access/:token/open` must lock and consume one allowed view before returning the scoped private product. Exhausted and unknown statuses fail closed.

## Do Not Reintroduce

- Do not make Vault owners set a separate shop signboard unless the product owner explicitly asks for a Vault-only banner.
- Do not mix public Shop Gallery blocks and Vault blocks in the same focused editor.
- Do not send `/app/vault-control` back into generic Shop Control as the primary experience.
- Do not show unpaid private blocks as usable blocks.
- Do not restore direct Vault bank/card payment or a hardcoded GBP/credit amount.
- Do not drop `video_url` from Vault private products.
- Do not create new shop-scope Vault links that expose every private offer at once.
- Do not bring back the old global/legacy access-link history block on the owner Vault page.

## Remaining Backend Truth

- The current backend Vault cap is 6 private slots.
- Vault link creation requires at least one active private Vault product and an active Vault entitlement.
- New activation is driven by an immutable `vault.slot` Pipeline Credit quote and atomic service spend. Historical bank-paid orders remain readable and reconcilable.
- Marketplace products do not carry a permanent `vault_slot_number` field. Permanent cross-device slot order now comes from `vault_blocks.slot_number`, and private products attach to those blocks through `vault_blocks.product_id`.
- Vault price and duration are operator-versioned and vacant until configured in `/app/command-center/pipeline-credit-pricing`; there is no frozen GBP or Pipeline Credit amount.
- The backend now has dedicated `vault_orders`, `vault_blocks`, `vault_private_offers`, and `vault_access_logs` tables for the MVP Vault lane.
- New Vault spends create `pipeline_credit` Vault orders and grant the configured-duration entitlement in the same database transaction as the credit debit.
- Vault private offer content is still stored as `marketplace_products.visibility_mode = vault_private`, with `vault_private_offers` mirroring the selected block content.
- Legacy Vault links created before product-scoped links may not have `product_id`; treat them as legacy and replace them with block-scoped links.
- Legacy Vault links created before block-scoped links may not have `block_id`; treat them as legacy and replace them with block-scoped links.

## Manual Check

1. Open `/app/vault-control`.
2. Confirm the hero uses the main shop image/name and says Vault.
3. In Command Centre, leave `vault.slot` vacant and confirm Vault refuses to create a quote without inventing a price.
4. Configure either a fixed credit cost or a GBP reference amount under an active conversion; return to Vault and choose 1-2 available blocks.
5. Request the exact server quote and confirm it shows exact debit, current balance, resulting balance, service version, and expiry.
6. Change the slot count and confirm the prior quote/agreement clears.
7. Agree to the quote and spend. With insufficient balance, confirm no debit, order, entitlement, or block activation occurs.
8. With sufficient balance, confirm debit, order, entitlement, and selected block activation succeed together.
9. Confirm the inner Vault private block room shows both positions, with inactive positions locked, then opens the Add Product editor for the first newly active block.
10. Add a private picture block.
11. Add a private video block.
12. From the selected block panel, create a Vault access link and confirm the block panel shows copy/open/extend/revoke controls for that block.
13. Confirm there is no lower global Access Link History competing with the selected block.
14. Open `/vault/:token` and confirm only private Vault products are shown.
15. For video, confirm muted motion first, then `Sound on`, then `Sound off`.

## Automated Check

- The original Vault suite passed on 2026-05-04.
- `python -m pytest -q tests/test_pipeline_credit_commerce.py` passed on 2026-11-12 with blank pricing, versioning, immutable quotes, atomic debit/unlock, insufficient balance, and direct-route retirement coverage.
