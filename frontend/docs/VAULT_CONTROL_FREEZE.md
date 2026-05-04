# Vault Control Freeze

## Frozen Intent

Vault is a paid private layer under the owner's main shop, not a second shop.

The public Shop Gallery keeps 12 free public blocks. Vault opens paid private blocks up to the current Vault cap of 6.

The fuller MVP product law is recorded in `docs/VAULT_MVP_STANDARD.md`.

## Route Ownership

- Owner route: `/app/vault-control`
- Visitor route: `/vault/:token`
- Public shop parent route: `/shop/:gmfnId`

`/app/vault-control` must not redirect into the mixed Shop Control section. It owns the focused owner-side Vault workflow.

## Frozen Behavior

1. Vault inherits the main shop signboard/name/image automatically.
2. The Vault hero must clearly identify the surface as `Vault`.
3. A Vault payment request can activate 1 to 6 private slots.
4. Confirmed Vault payment quantity controls how many private blocks appear.
5. `/app/vault-control` must include a fixed inner Vault private block room with all 6 known positions visible. Unpaid positions stay locked and cannot be used; paid positions become usable in place.
6. Each paid private block can hold a picture or short video.
7. Vault products use `visibility_mode = vault_private`.
8. Vault products are not public gallery products.
9. A visitor can only see Vault products through an active owner-created Vault link.
10. Vault video surfaces use the shared muted-preview plus reversible `Sound on` / `Sound off` media rule.
11. Vault must run as a focused task route on mobile. The general bottom rail should not compete with Vault payment, slot, editor, or link buttons.
12. Vault owner controls keep a local product-id-to-slot map so the block the owner selected does not drift just because the backend returns products newest-first.
13. Vault payment starts on the existing bank-transfer rail. Card payment is not connected in this pilot unless a real processor integration is added.
14. The Vault payment surface must show the exact amount, settlement account details, and matching reference after the owner creates the instruction.
15. Slot selection must not be silent. Before a payment code is generated, the page must immediately show the chosen slot count, exact price, the 6-slot bundle option, and the fact that the bank-transfer code/reference is required for reconciliation.
16. Payment code generation must be quote-gated: the owner must explicitly agree to the visible slot count and GBP amount first. Changing the selected slot count clears that agreement, and the frontend must refuse to create a payment code until the currently visible quote is confirmed.
17. After generation, the bank-transfer surface must call the reference a payment code in user-facing copy, show expiry/due information, and explain that the exact code is what connects the transfer to Vault.
18. New Vault access links must target one selected private block/offer. Legacy links without a product/block scope are not the future standard.
19. The primary link controls must live inside the selected Vault block panel: create, copy, open private view, extend, and revoke. A lower Access Link History may exist, but it must not compete as the primary create-link surface.
20. Frontend link creation must keep sending the selected private offer `product_id`; the backend derives and stores the matching `block_id`. Do not replace product-scoped link creation with a general shop/Vault link.
21. Default private link expiry is 72 hours.
22. Vault slot activation duration is 30 days by default.
23. `/app/vault-control` must read backend Vault block status from the shop Vault status contract when available.
24. Saving a private Vault offer must send the selected `vault_slot_number`.
25. New Vault links must carry both the selected product scope and backend block scope.
26. Phone slot activation controls must use stable large tap tiles for slots 1-6. Do not reintroduce a native dropdown for this payment-critical control.
27. Identity continuity review must not hide or rename the Vault payment-code button. The button should remain `Generate payment code`; any identity warning belongs in a separate explanation block. Private sharing/link actions may still be limited by identity review.
28. Vault bank-transfer details must expose regional settlement identifiers instead of silently hiding them. The payment panel must always include a visible `Sort code / bank code` provision, then add region-specific labels such as UK sort code, US routing, IBAN and SWIFT/BIC for Europe, Egypt, MENA and international wires, plus local bank, branch, IFSC or mobile-money identifiers where configured. Missing critical regional identifiers must display as not configured for the pilot rail when that identifier is required by the configured region; irrelevant regional identifiers should not distract the owner.
29. Vault-private product save/update must attach or archive the selected backend block inside the same transaction as the product change. Do not commit the product first and attach the Vault block afterward.

## Do Not Reintroduce

- Do not make Vault owners set a separate shop signboard unless the product owner explicitly asks for a Vault-only banner.
- Do not mix public Shop Gallery blocks and Vault blocks in the same focused editor.
- Do not send `/app/vault-control` back into generic Shop Control as the primary experience.
- Do not show unpaid private blocks as usable blocks.
- Do not drop `video_url` from Vault private products.
- Do not create new shop-scope Vault links that expose every private offer at once.

## Remaining Backend Truth

- The current backend Vault cap is 6 private slots.
- Vault link creation requires at least one active private Vault product and an active Vault entitlement.
- Payment confirmation is still driven by the bank/expected-payment reconciliation process.
- Marketplace products do not carry a permanent `vault_slot_number` field. Permanent cross-device slot order now comes from `vault_blocks.slot_number`, and private products attach to those blocks through `vault_blocks.product_id`.
- Current Vault pricing is GBP 1 per slot for 1-5 slots, and GBP 5 for the 6-slot bundle.
- The backend now has dedicated `vault_orders`, `vault_blocks`, `vault_private_offers`, and `vault_access_logs` tables for the MVP Vault lane.
- Vault payment matching still starts from expected payments and feature entitlements because that is the real bank-transfer reconciliation rail.
- Vault private offer content is still stored as `marketplace_products.visibility_mode = vault_private`, with `vault_private_offers` mirroring the selected block content.
- Legacy Vault links created before product-scoped links may not have `product_id`; treat them as legacy and replace them with block-scoped links.
- Legacy Vault links created before block-scoped links may not have `block_id`; treat them as legacy and replace them with block-scoped links.

## Manual Check

1. Open `/app/vault-control`.
2. Confirm the hero uses the main shop image/name and says Vault.
3. Create a Vault payment request for 1-6 slots.
4. Before generating the instruction, select 3 slots and confirm the page says 3 slots equals GBP 3 and offers the 6-slot GBP 5 bundle.
5. Confirm the visible quote. Changing the slot count must clear the confirmation.
6. Generate the payment code.
7. Confirm the screen shows bank transfer account details, amount, the exact payment code, and expiry/due information.
8. Confirm the inner Vault private block room shows all 6 positions, with unpaid positions locked.
9. After confirmation, confirm the paid slot count becomes usable in the same inner block room.
10. Add a private picture block.
11. Add a private video block.
12. From the selected block panel, create a Vault access link and confirm the block panel shows copy/open/extend/revoke controls for that block.
13. Confirm the lower Access Link History shows existing links without acting as the main create-link surface.
14. Open `/vault/:token` and confirm only private Vault products are shown.
15. For video, confirm muted motion first, then `Sound on`, then `Sound off`.

## Automated Check

- `python -m pytest -q gmfn_backend\tests\test_vault_domain.py gmfn_backend\tests\test_reconciliation_integrity.py gmfn_backend\tests\test_marketplace_public_shop.py --basetemp pytest-tmp-vault-bundle` passed on 2026-05-04.
