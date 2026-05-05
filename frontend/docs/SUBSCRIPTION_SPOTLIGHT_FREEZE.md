# Subscription Spotlight Freeze

Date: 2026-05-05

## Frozen Intent

Subscription Spotlight is the paid priority spotlight lane under Shop Control.

It is not Free Spotlight, not Vault, and not the general Shop Control page. The owner must be taken directly to a focused Subscription Spotlight surface where the only job is:

1. choose paid spotlight credits,
2. confirm the exact quote,
3. generate the bank-transfer payment code,
4. wait for reconciliation,
5. publish one paid spotlight from the same focused page.

## Route Ownership

- Focused owner route: `/app/shop-control/subscription-spotlight`
- Shortcut route: `/app/paid-spotlight`
- Source entries: Community Home paid/subscription spotlight entries and Shop Control shortcut buttons

`/app/paid-spotlight` must only route into the focused Subscription Spotlight page. Do not send owners back into the mixed Shop Control spotlight section for the paid lane.

## Frozen Behavior

1. The page is a focused task under Shop Control.
2. The page shows the current owner shop name/signboard context.
3. The user chooses 1 to 6 paid spotlight credits.
4. Pricing mirrors the current simple pilot payment conversation:
   - 1-5 credits cost GBP 1 each.
   - 6 credits cost GBP 5 as the bundle.
5. The visible quote must be explicitly agreed before payment-code generation.
6. The backend computes the amount and rejects mismatched client amounts.
7. Payment starts on the existing bank-transfer rail.
8. The payment instruction must show amount, account details, exact payment code/reference, regional sort-code/bank-code provision, and expiry.
9. Payment goes to the platform/GSN settlement account, not community money.
10. Confirmed paid spotlight entitlements grant paid spotlight credits.
11. Publishing a paid spotlight consumes one unused paid spotlight credit.
12. A paid spotlight cannot silently fall back to Free Spotlight.
13. Media must follow `docs/MEDIA_PREP_PROTOCOL.md`: picture/video accepted, oversized media prepared, and video uses muted motion first plus a reversible `Sound on` / `Sound off` control.
14. Buttons must follow `docs/CONTROL_SURFACE_PROTOCOL.md`: stable tap targets, no mobile hit-area drift, and blocked states explain the next action.

## Do Not Reintroduce

- Do not expose Free Spotlight, Vault, Shop Gallery, or merchant verification controls inside this focused paid lane.
- Do not rely on a frontend-supplied amount as the source of truth.
- Do not let a confirmed paid entitlement be reusable forever.
- Do not replace the quote-agreement step with a vague `Continue`.
- Do not route Community Home paid spotlight back to `/app/shop-control#shop-control-paid-spotlight`.
- Do not switch the paid publisher back to free mode when payment is not confirmed. Show the payment blocker instead.

## Remaining Backend Truth

- The current paid spotlight credit duration still follows the existing feature entitlement cycle logic.
- Bank reconciliation remains the existing expected-payment rail.
- Card payment is not connected for this MVP.
- The current capacity pilot override may still affect active spotlight capacity, but paid publishing now also requires an unused paid spotlight credit.

## Verification

Automated checks run on 2026-05-05:

- `npm run build` passed.
- `python -B -m py_compile ..\gmfn_backend\app\api\routes\payment_instructions.py ..\gmfn_backend\app\services\payment_instruction_service.py ..\gmfn_backend\app\services\expected_payments_service.py ..\gmfn_backend\app\api\routes\marketplace.py` passed.
- `python -m pytest -q ..\gmfn_backend\tests\test_marketplace_public_shop.py ..\gmfn_backend\tests\test_reconciliation_integrity.py --basetemp pytest-tmp-spotlight-subscription` passed outside the sandbox: 8 passed.

Manual check:

1. Open `/app/shop-control/subscription-spotlight`.
2. Select 3 credits and confirm the page says 3 credits equals GBP 3.
3. Change to 6 credits and confirm the previous agreement clears and the page says GBP 5 bundle.
4. Agree to the visible quote.
5. Generate payment code.
6. Confirm bank-transfer details, payment code, amount, expiry, and sort-code/bank-code provision are visible.
7. Before confirmation, confirm publishing explains the payment blocker.
8. After reconciliation confirms payment, add message/picture/video and publish.
9. Confirm video preview/display uses the shared audio toggle.
10. Confirm the next paid publish needs another unused credit.
