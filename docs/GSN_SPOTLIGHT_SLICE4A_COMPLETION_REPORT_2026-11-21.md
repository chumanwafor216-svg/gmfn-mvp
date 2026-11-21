# GSN Spotlight Slice 4A Completion Report

Date: 2026-11-21
Baseline: `c6af3615301c37b17b72dd55071bd142b3473a70`
Release boundary: disabled candidate only; no deployment, live payment, public-discovery activation, customer notice, outreach or `main` promotion.

## Result

Slice 4A closes the missing PostgreSQL test contract, separates overnight evidence from sellable dayparts, serializes the remaining cash/credit races, makes permission-held cash explicit and preserves unresolved costs as pending policy. It does not create another wallet, scheduler, payment route or revenue ledger.

## PostgreSQL verification contract

The established `postgres-concurrency` GitHub Actions job now runs six existing tests plus six Slice 4A tests against its disposable PostgreSQL 18 service and authority-role setup. The job rejects any result other than exactly 12 passed, 0 skipped, 0 failures and 0 errors.

The six new PostgreSQL cases prove:

1. Slice 4 migration downgrade/upgrade, acquisition-pack uniqueness and version rules.
2. Concurrent confirmation of the same expected payment allocates once; duplicate notification and retry remain idempotent.
3. Simultaneous cash-backed spending has one complete winner and no partial loser records.
4. Refund-versus-spend locking yields one financial outcome without abandoned records.
5. Late confirmed cash after entitlement revocation remains traceable on permission hold and allocates once after a safe authorised retry.
6. Rolled-back settlement leaves no partial row and concurrent reconciliation creates one idempotent settlement.

Exact run URL, workflow run id, job id, tested SHA and counts must be taken from the candidate's completed CI run. Local PostgreSQL skips are not accepted as release evidence.

## Measurement boundary

Measurement version 2 uses four local-time buckets:

- overnight: 00:00-05:00, never sellable capacity evidence;
- morning: 05:00-12:00;
- afternoon: 12:00-18:00;
- evening: 18:00-24:00.

The report now keeps these independent:

- final presentation leases;
- scheduled opportunities;
- genuinely supplied opportunities;
- missed opportunities;
- visible presentations;
- qualifying impressions.

A lease or visible presentation does not fabricate a paid opportunity. Measurement remains read-only and creates no booking, debit, reservation or service obligation.

Verified boundary examples:

- `Europe/London` on 2027-03-28 spans 23 UTC hours and classifies one observation in each of overnight, morning, afternoon and evening.
- `Europe/London` on 2027-10-31 spans 25 UTC hours.
- `Africa/Lagos` on 2027-03-28 spans 24 UTC hours.
- Four leases plus visible/impression events still report zero scheduled and zero genuinely supplied opportunities when no commercial opportunity records exist.

## Payment-gate inventory

`GSN_PAYMENT_OPERATIONS_ENABLED` remains the global emergency stop. Directly or through the named service authorities, it governs these mutating route surfaces:

| Route surface | Global gate effect | Additional authority |
| --- | --- | --- |
| `POST /pipeline-credits/allocate` | blocks admin allocation | admin permission |
| `POST /pipeline-credits/debit` | blocks admin debit | admin permission |
| `POST /pipeline-credits/acquisitions` | blocks expected-payment creation | Spotlight scoped gate plus active merchant/operator pilot entitlement |
| `POST /pipeline-credits/admin/acquisition-refunds` | blocks credit reversal classification | Spotlight scoped gate plus admin permission |
| `POST /pipeline-credits/service-spends` | blocks Pipeline Credit debit | paid Spotlight also requires scoped gate and active entitlement; other connected services retain their own rules |
| `POST /payment-instructions/pool` | blocks new instruction | route permission rules |
| `POST /payment-instructions/vault` | blocks new instruction | route permission rules |
| `POST /payment-instructions/merchant-verify` | blocks new instruction | route permission rules |
| `POST /payment-instructions/spotlight` | blocks legacy Spotlight instruction | existing legacy permissions; not the canonical paid-Spotlight purchase route |
| `POST /payment-instructions/community-package/use` | blocks package consumption | route permission rules |
| `POST /payment-instructions/community-package` | blocks new instruction | route permission rules |
| `POST /payment-instructions/pipeline-credit-topup` | blocks new instruction | route permission rules |
| `POST /member-credits/purchases` and `POST /member-credits/purchases/{order_key}/check-payment` | blocks purchase collection/check application | member-credit runtime and provider rules |
| `POST /advertising-revenue/admin/campaigns/{campaign_id}/payment-instruction` | blocks house-campaign instruction | admin and house-campaign authority |
| `POST /admin/bank/expected-payments/{expected_payment_id}/finance-review` approval path | blocks manual financial application | admin permission |
| Bank ingest/reconcile route families | reconciliation evidence can be recorded, but gated downstream applications cannot allocate/spend while disabled | expected-payment type, reconciliation and application authorities |
| Provider-funded phone, verification, storage and callback operations | blocks configured Pipeline Credit provider debit | provider gate configuration and route/service permissions |

Spotlight isolation is deliberately two-key:

- global off + Spotlight on: Spotlight remains blocked and unrelated payment operations remain globally stopped;
- global on + Spotlight off: unrelated authorised operations may run, but paid Spotlight acquisition/spend remains blocked;
- both on: paid Spotlight still requires an active merchant/operator pilot entitlement at acquisition, confirmed-payment application, quote, spend and booking boundaries;
- revoked entitlement: new paid action is blocked; already received cash remains confirmed and visible on permission hold.

Important limitation: the global switch is intentionally broad. Enabling it is not a Spotlight-only action. The scoped Spotlight switch cannot enable unrelated operations, but an operator must still assess the state of globally governed routes before changing the global emergency stop.

## Cash, acquisition and refund integrity

- Expected payments are row-locked before concurrent reconciliation updates.
- Confirmed cash received after entitlement revocation is retained as confirmed bank evidence and `payment_received_permission_hold`; it is not discarded or converted into credit.
- Permission-hold reason, expected payment and bank event remain traceable.
- Safe retry after entitlement restoration allocates exactly once through the existing idempotency key.
- Cash-backed spend locks acquisition rows before the Pipeline Credit account, matching the refund path and avoiding reverse lock order.
- A refund record remains `recorded_not_disbursed`; it classifies a credit reversal and does not claim that a bank disbursement occurred.
- Partial and multiple events continue to reconcile against the canonical expected payment; only full authoritative confirmation can trigger allocation.

## Financial classification

The existing settlement row now stores separate policy statuses for:

- processing fee;
- direct delivery cost;
- community allocation.

New merchant/sponsor Spotlight settlement uses `pending_policy`. Its API/report amount is `null`, not an approved zero. Existing house-campaign rows are migrated to `recorded` so historical house settlement behaviour is preserved. Stored numeric zero remains only a schema-compatible placeholder and is never presented as an approved cost when policy is pending.

Unresolved founder/accounting choices remain:

1. Approved processing-cost recognition method and source evidence.
2. Approved direct-delivery-cost method and allocation basis.
3. Community allocation rate, trigger and beneficiary authority.
4. Cash-refund approval, execution and bank-disbursement evidence.
5. Customer remedy hierarchy when replacement service is possible.

## Verification

- Full backend repository gate: `1861 passed, 36 skipped` in 480.53 seconds. The skips are local infrastructure-dependent tests, including PostgreSQL; they are not accepted for the PostgreSQL CI gate.
- Focused Slice 4/payment/migration regression before final broad gate: 40 passed, 6 local PostgreSQL skips.
- Alembic graph: one head, `20261121_spotlight_slice4a_completion`.
- The first two sandboxed broad attempts were invalid because Windows denied pytest access to its own temp tree. The same command passed outside the restricted token; this is recorded rather than hidden.

## Rollback

1. Keep both `GSN_PAYMENT_OPERATIONS_ENABLED` and `GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED` disabled.
2. Stop application instances using this candidate before schema rollback.
3. Run `python -m alembic downgrade 20261121_spotlight_slice4_payments` using the migration authority.
4. Revert the candidate commit.
5. Restart on baseline `c6af3615301c37b17b72dd55071bd142b3473a70`.

The downgrade removes only the three new policy-status columns. It does not delete acquisition, booking, payment, settlement, historical campaign or delivery records. A database backup and migration dry run remain required before any production rollback.
