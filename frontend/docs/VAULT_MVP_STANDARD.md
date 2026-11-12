# Vault MVP Standard

Date: 2026-05-04; payment amendment approved 2026-11-12

## Product Definition

Vault is not a separate shop. Vault is a private paid layer under the owner's existing Shop Gallery shop.

The public shop remains normal. Vault adds paid private blocks that are hidden from public browsing and normal community browsing. A private Vault block is visible only through an owner-created private link.

## Fixed MVP Rules

- Maximum active paid Vault slots: 2.
- Pricing is vacant until a GSN operator creates an active version in Command Centre. No user screen owns or hardcodes the amount.
- No Vault bundle is active under the current pilot rule.
- New Vault activation consumes customer-service Pipeline Credits only.
- Bank/card/provider payment may acquire Pipeline Credits through a separately governed acquisition flow, but must not directly purchase Vault.
- Vault revenue belongs to the platform/GMFN/GSN account, not community money.
- Immutable service quote expiry: 15 minutes.
- Vault activation duration comes from the active `vault.slot` service-price version; the initial catalogue default is 30 days until the operator changes it.
- Private link expiry: 72 hours by default.
- Each active private block holds one private image/video offer.
- Each new private link should open one private block only.
- MVP link rule: one active link per block. Creating a new link for the same block revokes/replaces the previous active link.

## Owner Flow

1. Owner opens `/app/vault-control`.
2. The page shows the main shop hero and clearly labels the private layer as Vault.
3. Owner chooses 1-2 slots.
4. The page shows the active operator-configured preview and requests an immutable server quote.
5. The quote shows exact Pipeline Credit debit, current balance, resulting balance, service version, and expiry.
6. Owner explicitly agrees to that exact quote.
7. GSN checks the purpose-scoped customer balance and atomically debits credits, creates the completed Vault order, activates the selected available blocks, and grants the entitlement.
8. Insufficient balance leaves all delivery state unchanged.
9. Successful activation opens the Add Product editor for the first newly active block.
10. Owner adds one private image/video offer to each active block.
11. Owner creates a private link for the selected block.
12. Viewer opens only that block through the private link.

## Viewer Flow

- Valid link: show shop identity and only the private block tied to that link.
- Expired, revoked, inactive, or unavailable link: show a branded invalid-link page.
- The viewer must not see sibling Vault blocks, owner controls, payment data, or internal admin data.

## Current Implementation Truth

The implementation now has dedicated Vault domain tables for the MVP lane:

- `vault_orders` records the Vault payment/order instruction.
- `vault_blocks` records the fixed 1-2 private block positions for one shop.
- `vault_private_offers` mirrors the private product content attached to a block.
- `vault_access_logs` records Vault link open/status attempts.

The MVP keeps compatibility with older payment and product records:

- Historical bank-paid Vault reconciliation may still read `expected_payments.expected_type = vault_subscription`; the direct creation route is retired for new purchases.
- New Vault orders use `payment_method = pipeline_credit`, `currency = PC`, and a service-versioned pricing rule.
- Active payment rights still grant/extend `feature_entitlements.feature_code = vault_slot`.
- Private offer content is still saved as `marketplace_products.visibility_mode = vault_private`.
- New private links are saved in `vault_access_links` with both `product_id` and `block_id`.
- Legacy links without `product_id` or `block_id` remain legacy shop-scope links and should be replaced.

Do not expose these internal table names in user-facing copy.

## Implemented Backend Contract

- New Vault links must include `product_id` and `block_id` so the link opens one selected private offer/block.
- Legacy links without `product_id` or `block_id` are legacy shop-scope links and should not be used as the future product rule.
- Owner Vault Control must read backend `vault_blocks` status instead of relying on browser-only slot memory.
- Saving a private offer must send the selected `vault_slot_number` so the backend attaches it to the intended active block.
- New activation must use an immutable quote and idempotent spend order.
- Customer-service accounts must remain segregated from provider-operation accounts.
- Debit, Vault order, block activation, and entitlement grant must commit together or roll back together.
- Historical expected-payment reconciliation remains available only for existing records.

## Do Not Claim

- Do not claim Vault content cannot be saved. Say private controlled access.
- Do not claim card payment exists until a real processor exists.
- Do not claim every paid GSN module is migrated. Vault is the first connected customer Pipeline Credit delivery lane.
- Do not claim customer Pipeline Credit acquisition is connected merely because the service-spend balance exists.
- Do not claim old browser-local slot memory is the source of truth. Backend `vault_blocks.slot_number` is now the cross-device block position.
- Do not claim a legacy shop-scope Vault link is the final private-block link model.
