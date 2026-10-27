# GSN Canonical Pipeline Credit Migration Map - 2026-10-27

Status: repository-backed architecture and migration decision map. No price, exchange rate, payment route, entitlement, schema, balance or runtime behavior is changed by this document.

## Settled owner direction

Every chargeable GSN service must ultimately be funded from one customer-facing, non-cashable GSN Pipeline Credit balance. The credit-to-cash acquisition rate, each service debit and every regional adjustment remain undecided pending customer discovery.

The current examples of approximately five credits per GBP 1, one credit for a normal Spotlight day and five credits for Repost reach across five communities or a target region are hypotheses, not active prices.

## Unabated runtime truth

GSN does not currently have one universal customer Pipeline Credit wallet. It has two different credit systems and a separate entitlement engine:

| Existing engine | Confirmed purpose and scope | Useful parts | Why it is not the finished universal rail |
|---|---|---|---|
| `PipelineCreditAccount` and `PipelineCreditLedgerEntry` | Decimal internal provider/API usage control. Accounts can belong to a user, community, sponsor or platform. | Two-decimal entries, scoped accounts, idempotency keys, workflow/provider/reference fields, bank-confirmed top-up path and read-only community status. | Its explicit contract says it is not a customer wallet. Admin controls allocations/debits, normal users have no general service-spend contract, and its current balance calculation is not yet the concurrency-safe customer purchase boundary. |
| `MemberServiceCreditAccount` and member-credit purchase models | Isolated test customer catalogue and integer member balance. | Versioned packs/services, quote snapshots, purchase orders, payment provenance, Stripe link, optimistic account versioning, per-service permission and idempotent Spotlight spend. | Member-only, integer-only, test-gated, supports only `spotlight.single_day`, and cannot fund community, sponsor or platform-owned services. |
| `FeatureEntitlement` and usage events | Time- or quantity-bounded rights such as Spotlight priority, extra shop space, member capacity, ROSCA, Meeting Pack, Merchant Verification and Community Domain. | Grant/extend, expiry, remaining quantity, consumption and existing product enforcement. | It records delivered rights, not a shared prepaid balance or regional service price. |
| Expected-payment and bank-application services | Creates payment references and applies reconciled cash to either direct feature subscriptions or Pipeline Credit top-ups. | Server-side payment evidence, reconciliation, idempotent application and Trust Event records. | Direct feature payments and credit top-ups currently coexist. Leaving both purchase paths open after migration would create conflicting prices and double-purchase risk. |

Calling either existing balance the universal wallet today would be false.

## Reuse-first target architecture

The recommended target reuses the existing decimal Pipeline Credit account and ledger as the canonical balance, while importing the safer catalogue, quote, purchase-provenance and spend-order patterns from the member-credit engine.

```text
Reconciled customer payment
  -> immutable regional top-up quote
  -> customer-service Pipeline Credit account allocation
  -> immutable service quote
  -> idempotent service spend order
  -> atomic credit debit plus entitlement/delivery
  -> module-attributed consumption report

Actual provider/API delivery cost
  -> separate internal provider-cost account debit
```

The two debits in that diagram are not two customer charges. The first is the customer's service consumption. The second is GSN's internal delivery-cost record from a different, segregated account.

### Account segregation

The current `pipeline_credit_accounts` table can be reused only if account purpose becomes explicit. Customer-service value must never share an account key or balance with internal provider/API budget.

Minimum future account identities:

- `customer_service:user:<user_id>`;
- `customer_service:community:<clan_id>`;
- `customer_service:sponsor:<sponsor_ref>`;
- `provider_operations:platform` and any deliberately scoped internal provider accounts.

The implementation should add an explicit account-purpose contract and create new purpose-prefixed account keys. Existing accounts and entries remain provider-operation history unless evidence proves otherwise. Do not relabel or transfer their balances automatically.

### Customer wallet ownership

- A personal service is debited from a user customer-service account.
- A community service is debited from the selected community customer-service account under community-admin authority.
- A sponsor may fund a segregated sponsor account with explicit permitted beneficiaries or transfer policy controlled by GSN; sponsorship must not become free user-to-user transfer.
- Credits remain non-cashable and non-transferable between ordinary users.
- Every debit records the acting user separately from the account owner.

### Catalogue separation

Top-up acquisition and service consumption require separate versioned catalogues.

Top-up pack snapshot:

- pack code and version;
- pricing region and currency;
- customer account purpose/type;
- cash amount in minor units;
- Pipeline Credit amount;
- tax/fee treatment and terms version;
- effective start/end and status.

Service debit snapshot:

- stable service code and version;
- eligible account type and payer authority;
- pricing region;
- chargeable unit, duration and quantity limits;
- reach/destination/time band where applicable;
- Pipeline Credit debit;
- delivery/entitlement effect;
- refund/reversal policy;
- effective start/end and status.

A quote must snapshot the selected versions and values. Later catalogue edits must not rewrite a previously accepted purchase or spend.

## Minimum service-code register

These codes preserve separate revenue attribution without fixing any debit:

| Product family | Future service code | Chargeable unit still requiring approval | Delivery connection |
|---|---|---|---|
| Paid Spotlight | `paid_spotlight.day` | Governed direct-community visibility day or later approved appearance unit | Spotlight campaign plus direct placements; legacy `spotlight_priority` entitlement during transition |
| Paid Repost | `paid_repost.reach` | Approved destination/reach band and duration | Separate Repost placement contract; must not post as ordinary Spotlight revenue |
| Central advertising | `central_advertising.campaign` | Promotion x eligible destinations x scheduled opportunities | Existing advertiser settlement and governed delivery machinery |
| Private Vault | `vault.slot` | Slot and approved duration | Existing Vault order, slot activation and private-link controls |
| Extra public shop space | `shop.extra_space` | Additional public space and approved duration | Existing `extra_shop_block` entitlement |
| Merchant Verification | `merchant_verification.period` | Verification period and included review scope | Existing `merchant_verify` entitlement and TrustSlip status gate |
| Community member capacity | `community.member_capacity` | Additional active member place and duration | Existing `community_member_capacity` entitlement |
| Community Domain | `community_domain.period` | Approved organisation package and duration | Existing Domain subscription/lifecycle contract; billing stays suspended |
| ROSCA service | `community.rosca_service` | Annual or later approved operating period | Existing `rosca_cycle` entitlement |
| Meeting support | `community.meeting_pack` | Defined meeting-support unit | Existing `community_meeting_pack` entitlement |
| Extra DemandBox capacity | `demandbox.extra_capacity` | Not defined yet | Must remain inactive until capacity, duration and free allowance are defined |
| Additional Trade Records | `trade_records.extra_capacity` | Not defined yet | Must remain inactive until record count, retention and free allowance are defined |
| Advanced Shop Analytics/AI | `shop.analytics_advanced` | Not defined yet | Must remain inactive until output, provider cost and usage cap exist |
| GSN Shop Reel premium | `shop_reel.premium_export` | Not decided whether a paid tier exists | Must remain inactive until the reuse-first compositor and incremental paid value are proven |

TrustSlip core, Bulletin responses/reactions, basic Shop Activity, ordinary Public Shop, Shop Diary and Social/WhatsApp Bridge remain included infrastructure unless the owner later defines genuinely additional paid value. They must not receive service codes merely to manufacture revenue lines.

## Atomic spend contract

Every service purchase must follow one server-owned transaction boundary:

1. Resolve the authenticated actor and the exact customer-service account they may spend from.
2. Resolve one active service-catalogue version using account region, account type and the requested governed unit.
3. Create or retrieve an idempotent spend order with a request fingerprint and immutable quote snapshot.
4. Lock the account or use a proven optimistic version check before calculating the balance.
5. Reject insufficient balance before creating delivery state.
6. Debit credits and grant the entitlement or create the delivery record in the same database transaction where possible.
7. Mark the spend complete only after the durable product result exists.
8. If external delivery cannot be atomic, reserve first and create an idempotent reversal when delivery definitively fails. Do not silently lose or duplicate credits.
9. Record service code, catalogue version, region, chargeable unit, entitlement/delivery reference, actor, account owner and correlation/idempotency key.

The current decimal Pipeline Credit service calculates balance from the last ledger row but does not lock the account during a general debit. It must receive a concurrency-safe account version/lock before customer spending is activated.

## Migration rules

1. **Do not convert internal provider balances.** Existing `PipelineCreditAccount` rows are provider-operation budgets unless their provenance proves a different purpose.
2. **Do not convert synthetic/test member credits into live value.** Test catalogue balances and synthetic payments remain isolated.
3. **Migrate only proven customer value.** A real member-credit balance may move only when it can be reconciled to verified, non-refunded purchase allocations. The migration writes paired old-ledger retirement and new-ledger allocation references.
4. **Preserve current entitlements.** Vault, Spotlight, shop capacity, member capacity, Merchant Verification, ROSCA, Meeting Pack and Domain rights purchased through the old direct-cash path remain valid until their existing expiry or consumption. Migration must not debit credits for them again.
5. **Stop parallel sales deliberately.** Once a module accepts Pipeline Credits, its old direct feature-payment creation route becomes read-only/retired for new purchases. Historical payment and entitlement reads remain available.
6. **Keep billing suspended where policy is suspended.** Community Domain and the general free-pilot payment gate remain closed until the owner separately authorises activation.
7. **Never infer willingness to pay from migration.** Moving an existing balance or honouring an entitlement is not a new sale, renewal or customer-discovery result.

## Regional policy requiring owner approval

Recommended starting architecture, not yet an owner decision:

- bind every customer-service account to one pricing region;
- keep credits non-cashable and non-transferable;
- use region-specific top-up packs and region-specific service catalogue rows;
- snapshot region and catalogue version on every quote and spend;
- allow region changes only through a governed review that affects future quotes, not historical entries;
- use explicit sponsor grants instead of hidden cross-region balance transfers.

This is safer than allowing freely transferable credits acquired at different regional cash rates. Transferable region-priced credits create arbitrage, resale, refund and accounting problems before GSN has evidence that the added complexity creates customer value.

## Implementation sequence after commercial approval

### Phase 0 - keep the pilot safe now

- Keep payment operations and inactive catalogues behind their current gates.
- Correct misleading documentation and UI amounts, but do not activate spending.
- Preserve direct-entitlement history and both ledger histories.

### Phase 1 - catalogue and quote foundation

- Add account-purpose and pricing-region contracts.
- Generalise the existing versioned pack/service catalogue patterns for user, community and sponsor accounts.
- Add stable service codes and quote-only APIs with no debit side effect.
- Add owner/admin catalogue management outside ordinary member UI.

### Phase 2 - canonical balance acquisition

- Route reconciled bank top-ups into purpose-scoped customer-service Pipeline Credit accounts.
- Adapt the existing member purchase/Stripe provenance flow to allocate the same canonical account rather than a second balance.
- Keep synthetic/test collections permanently distinguishable.

### Phase 3 - one low-risk spend pilot

- Activate one server-priced, versioned service only after the owner approves its unit, debit, region and refund contract.
- Paid Spotlight is technically closest, but it must keep direct Spotlight and Repost as different service codes.
- Measure reconciled payment, consumption, reversals, delivery cost, support time and repeat purchase.

### Phase 4 - entitlement-backed modules

- Migrate Vault, extra shop capacity, Merchant Verification, member capacity, ROSCA and Meeting Pack one at a time.
- Retire each module's direct-cash creation route only when its credit-funded replacement and rollback tests pass.
- Keep Domain, DemandBox extras, Advanced Analytics/AI, Trade Record extras and Shop Reel inactive until their product units are approved.

### Phase 5 - reporting and regional expansion

- Report top-up cash separately from consumed service value so it is not counted twice.
- Report unconsumed balance, expiry, reversals/refunds and service-attributed consumption.
- Expand regions only after local acquisition, use, delivery cost, support burden and renewal evidence exists.

## Acceptance gates before any live customer debit

- one canonical customer-service balance per approved owner scope;
- provider-operation balances provably segregated;
- server-owned catalogue version and price/debit;
- immutable quote snapshot;
- concurrency-safe debit;
- idempotent payment application and spend;
- atomic entitlement/delivery or tested reservation/reversal;
- old direct-payment route disabled for that module;
- historical entitlements honoured without a second charge;
- regional and sponsor authority enforced;
- cash-out and ordinary user transfer absent;
- refund, expiry, tax and accounting review recorded;
- frontend shows credits as service usage rights, not cash or savings;
- real pilot measurement plan approved.

## Decisions still required from customer discovery

- credit-to-cash acquisition rate by region;
- whether credit denomination requires fractions or whole units;
- debit, chargeable unit, duration and renewal rule for every service;
- regional account policy and region-change rule;
- sponsor funding and beneficiary boundary;
- expiry, refund, unused-balance and closure treatment;
- first service to activate and its measurable pilot success/failure thresholds.

## Source-of-truth files inspected

- `gmfn_backend/app/db/pipeline_credit_models.py`
- `gmfn_backend/app/services/pipeline_credit_service.py`
- `gmfn_backend/app/services/pipeline_credit_spend_gate.py`
- `gmfn_backend/app/api/routes/pipeline_credits.py`
- `gmfn_backend/app/db/member_credit_models.py`
- `gmfn_backend/app/services/member_credit_catalogue_service.py`
- `gmfn_backend/app/services/member_credit_purchase_service.py`
- `gmfn_backend/app/services/member_credit_service.py`
- `gmfn_backend/app/services/member_credit_spotlight_service.py`
- `gmfn_backend/app/services/member_credit_permissions.py`
- `gmfn_backend/app/api/routes/member_credits.py`
- `gmfn_backend/app/services/payment_instruction_service.py`
- `gmfn_backend/app/services/expected_payments_service.py`
- `gmfn_backend/app/services/bank_application_service.py`
- `gmfn_backend/app/services/feature_entitlements_service.py`
- `gmfn_backend/app/api/routes/payment_instructions.py`
- `frontend/src/components/MyPipelineCreditsSection.tsx`
- `frontend/src/pages/FinancePage.tsx`

## Final truth boundary

This map identifies how GSN can reuse its existing engines without maintaining two customer balances or confusing customer credits with internal provider cost. It does not approve a schema migration, activate payment operations, set a price, prove demand or authorise deployment.
