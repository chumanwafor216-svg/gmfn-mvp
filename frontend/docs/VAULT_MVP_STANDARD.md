# Vault MVP Standard

Date: 2026-05-04

## Product Definition

Vault is not a separate shop. Vault is a private paid layer under the owner's existing Shop Gallery shop.

The public shop remains normal. Vault adds paid private blocks that are hidden from public browsing and normal community browsing. A private Vault block is visible only through an owner-created private link.

## Fixed MVP Rules

- Maximum active paid Vault slots: 6.
- Pricing: slots 1-5 cost GBP 1 per slot.
- Pricing: 6 slots in one order cost GBP 5 as the bundle.
- MVP payment method: bank transfer only.
- Card payment may be added later, but the current Vault MVP must not pretend card payment is connected.
- Vault revenue belongs to the platform/GMFN/GSN account, not community money.
- Payment instruction expiry: 7 days.
- Vault activation duration: 30 days by default.
- Private link expiry: 72 hours by default.
- Each active private block holds one private image/video offer.
- Each new private link should open one private block only.
- MVP link rule: one active link per block. Creating a new link for the same block revokes/replaces the previous active link.

## Owner Flow

1. Owner opens `/app/vault-control`.
2. The page shows the main shop hero and clearly labels the private layer as Vault.
3. Owner chooses 1-6 slots.
4. The page immediately shows the selected slot count and exact price.
5. Owner generates a payment code.
6. The payment instruction shows amount, bank details, exact payment code/reference, and expiry.
7. Owner pays by bank transfer using the exact code.
8. Bank reconciliation confirms exact reference plus exact amount.
9. The purchased Vault slots unlock.
10. Owner adds one private image/video offer to each active block.
11. Owner creates a private link for the selected block.
12. Viewer opens only that block through the private link.

## Viewer Flow

- Valid link: show shop identity and only the private block tied to that link.
- Expired, revoked, inactive, or unavailable link: show a branded invalid-link page.
- The viewer must not see sibling Vault blocks, owner controls, payment data, or internal admin data.

## Current Implementation Truth

The current implementation does not yet have dedicated `vault_orders`, `vault_blocks`, or `vault_private_offers` tables.

Current backend equivalents:

- Vault order/payment instruction: `expected_payments.expected_type = vault_subscription`.
- Slot entitlement: `feature_entitlements.feature_code = vault_slot`.
- Private block content: `marketplace_products.visibility_mode = vault_private`.
- Private link: `vault_access_links`.

This is acceptable for the MVP only while the behavior matches the product rule. Do not expose these internal substitutions in user-facing copy.

## Backend Contract Corrections Required

- New Vault links must include `product_id` so the link opens one selected private offer/block.
- Legacy links without `product_id` are legacy shop-scope links and should not be used as the future product rule.
- Payment reconciliation must keep using expected-payment matching rather than a separate payment engine.
- Exact reference plus exact amount can auto-confirm.
- Wrong reference, short amount, duplicate, late, or ambiguous payments require admin review and must not auto-unlock slots.

## Do Not Claim

- Do not claim Vault content cannot be saved. Say private controlled access.
- Do not claim card payment exists until a real processor exists.
- Do not claim block order is permanent across devices until backend slot numbers exist.
- Do not claim a legacy shop-scope Vault link is the final private-block link model.
