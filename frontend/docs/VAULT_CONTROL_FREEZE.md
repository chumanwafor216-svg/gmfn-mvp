# Vault Control Freeze

## Frozen Intent

Vault is a paid private layer under the owner's main shop, not a second shop.

The public Shop Gallery keeps 12 free public blocks. Vault opens paid private blocks up to the current Vault cap of 6.

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
5. Each paid private block can hold a picture or short video.
6. Vault products use `visibility_mode = vault_private`.
7. Vault products are not public gallery products.
8. A visitor can only see Vault products through an active owner-created Vault link.
9. Vault video surfaces use the shared muted-preview plus reversible `Sound on` / `Sound off` media rule.
10. Vault must run as a focused task route on mobile. The general bottom rail should not compete with Vault payment, slot, editor, or link buttons.
11. Vault owner controls keep a local product-id-to-slot map so the block the owner selected does not drift just because the backend returns products newest-first.

## Do Not Reintroduce

- Do not make Vault owners set a separate shop signboard unless the product owner explicitly asks for a Vault-only banner.
- Do not mix public Shop Gallery blocks and Vault blocks in the same focused editor.
- Do not send `/app/vault-control` back into generic Shop Control as the primary experience.
- Do not show unpaid private blocks as usable blocks.
- Do not drop `video_url` from Vault private products.

## Remaining Backend Truth

- The current backend Vault cap is 6 private slots.
- Vault link creation requires at least one active private Vault product and an active Vault entitlement.
- Payment confirmation is still driven by the bank/expected-payment reconciliation process.
- Marketplace products do not yet have a backend `vault_slot_number` field. The frontend stabilizes slot display in the current browser with local slot memory, but a permanent cross-device slot order requires a backend field and API contract.

## Manual Check

1. Open `/app/vault-control`.
2. Confirm the hero uses the main shop image/name and says Vault.
3. Create a Vault payment request for 1-6 slots.
4. After confirmation, confirm only the paid slot count appears.
5. Add a private picture block.
6. Add a private video block.
7. Create a Vault access link.
8. Open `/vault/:token` and confirm only private Vault products are shown.
9. For video, confirm muted motion first, then `Sound on`, then `Sound off`.
