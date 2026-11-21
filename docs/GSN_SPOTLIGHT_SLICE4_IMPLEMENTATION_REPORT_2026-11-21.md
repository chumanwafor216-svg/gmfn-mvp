# GSN Spotlight Slice 4 Implementation Report

**Prepared:** 21 November 2026
**Baseline:** 8047ac5884eb1e30683bc3c345f9bfecfc04203c
**Status:** bounded working-branch candidate; disabled by default; not deployed
**Release boundary:** no production payment activation, real collection, public-discovery activation, customer terms, merchant outreach, owner notice or promotion to main

## 1. Verdict

Slice 4 closes the requested technical connection from versioned acquisition packs to canonical bank reconciliation, Pipeline Credit allocation, paid Spotlight spending and the existing advertising-settlement authority.

It does not make paid Spotlight commercially ready. Production capacity is still unmeasured. A disposable PostgreSQL URL was not configured in this environment, so the new migration has SQLite round-trip evidence but not PostgreSQL execution evidence. Tax, direct-cost, community-allocation, cash-refund-disbursement and final customer-remedy policies remain unresolved.

The global and Spotlight-specific payment gates both default to disabled. No environment value was changed.

## 2. Implemented controls

### 2.1 Cash to Pipeline Credit conversion

- Versioned acquisition packs are now the authoritative paid acquisition input.
- Enforced packs must preserve GBP 1 = 2 Pipeline Credits.
- The GBP 1 pack allocates 2 credits and the GBP 8 pack allocates 16 credits.
- Credits are allocated only after the existing expected-payment and bank-event reconciliation authority confirms the full matching payment.
- Partial payments remain unapplied until the expected payment is fully confirmed.
- Duplicate application is idempotent.
- Overpayment retains the approved pack quantity and leaves excess cash in the existing bank-credit authority.
- Currency mismatch does not allocate credits.
- Stale pack versions cannot create a new acquisition instruction.
- Historical balances and the legacy pipeline_credit_topup behavior are not rewritten or retroactively converted.
- Acquisition applications connect the cash-backed portion of a credit spend to its Spotlight booking without introducing another wallet.

### 2.2 Refund classification

- An authorised operator can reverse only unspent credits from a reconciled acquisition.
- The record distinguishes reversed credits from the corresponding cash amount.
- The status recorded_not_disbursed truthfully states that GSN has classified the refund but has not executed a bank/provider payout.
- Retry keys are idempotent; reusing a key for different refund details is rejected.
- Restored service credits remain separate from cash refunds and replacement bookings.

### 2.3 Settlement

The existing AdvertisingCampaignSettlement authority now supports two scopes:

- house_campaign for the existing house-advertising path;
- spotlight_booking for cash-backed merchant or sponsor bookings.

For merchant and sponsor bookings:

- cash received is derived from reconciled acquisition applications;
- one booking records only the cash backing applied to that booking;
- cash remains deferred while delivery or a related restored-service obligation is open;
- revenue becomes earned only after eligible delivery is closed and no original or replacement obligation remains;
- gifted, waived and house classifications do not become cash-earned customer revenue through this path;
- community allocation, delivery cost and processing cost remain zero until approved evidence or policy exists, rather than being invented.

The existing house-campaign settlement and community-share path remains separate and its focused tests continue to pass.

### 2.4 Pilot entitlement

A server-side pilot entitlement now protects:

- acquisition instruction creation;
- payment reconciliation application;
- service quote validation;
- Pipeline Credit spending;
- booking reservation.

Entitlements can be community-scoped or global and have merchant or operator roles. PostgreSQL-safe partial unique indexes prevent duplicate global or scoped grants. Missing users or communities are rejected.

### 2.5 Payment activation

Paid Spotlight requires both:

- GSN_PAYMENT_OPERATIONS_ENABLED;
- GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED.

The Spotlight-specific switch defaults off. Turning it on cannot by itself enable unrelated financial operations because the existing global safety authority must also be on. Conversely, the global switch alone cannot enable Spotlight collection or spending.

GSN_PAID_SPOTLIGHT_V1_ENABLED remains the commercial service gate. These controls must not be activated as part of this candidate.

## 3. Measurement-only telemetry

The admin measurement endpoint reads existing serving records and creates no quote, spend, booking, credit debit or paid-service obligation.

For one community, local service date and IANA timezone it reports:

- final viewer-triggered presentation leases;
- recognised viewers with final presentations;
- visible presentation acknowledgements;
- qualifying impressions;
- interrupted or unqualified presentations;
- the same observations split by morning, afternoon and evening;
- active promotional campaigns;
- active paid bookings and paid opportunities still open.

The report explicitly states that:

- candidate consideration is not a supplied turn;
- elapsed time is not a supplied turn;
- repeated viewer presentations are not separate scheduled turns;
- observed final presentations are evidence of audience/serving activity, not automatically sellable capacity or fulfilled paid opportunities.

### 3.1 Capacity evidence procedure

1. Keep all paid-acquisition and paid-spend flags disabled.
2. Select one community, region and authoritative IANA timezone.
3. Record at least 14 consecutive days and at least 10 comparable active days.
4. Export the measurement report separately for each local date.
5. Exclude test traffic, operator refresh loops, bots and failed eligibility checks.
6. Reconcile final presentations, visible acknowledgements, qualifying impressions and failures to the underlying lease/exposure records.
7. Deduct house, sponsor, gifted, waived and replacement-service obligations.
8. Use the lower-tail genuine opportunity evidence, not averages alone.
9. Apply the previously recommended 50% launch safety factor.
10. Keep sellable capacity at zero until an authorised operator signs the evidence and records calibrated capacity through the existing authority.
11. Reconcile every rehearsal day and reduce capacity immediately after unexplained failure or shortfall.

This candidate does not claim observed capacity.

## 4. Reconciled example trace

The focused Slice 4 test proves this chain:

1. An approved merchant selects the versioned GBP 8 pack.
2. A canonical expected payment is created for GBP 8.
3. Two partial GBP 4 bank events do not allocate after the first event.
4. Confirmation after the second event allocates exactly 16 Pipeline Credits once.
5. A one-credit paid Spotlight booking consumes one cash-backed credit.
6. The booking settlement records GBP 0.50 received and deferred.
7. After all 30 opportunities are fulfilled, GBP 0.50 becomes earned.
8. A later restored-service obligation moves the same GBP 0.50 back to deferred and records one outstanding service credit; it does not create duplicate revenue.
9. A separate unspent-credit refund is recorded as classified but not bank-disbursed.
10. Repeating the same refund request returns the same record; conflicting details under the same key are rejected.

## 5. Remaining policy decisions

Founder/accounting/legal approval is still required for:

- treatment of a payment already instructed if the pilot entitlement is revoked before bank confirmation;
- underpayment expiry and customer communication;
- overpayment return versus application of the existing bank-credit balance;
- actual refund approval, payout authority, provider execution and confirmation;
- VAT/tax and invoice treatment of Pipeline Credit acquisition;
- approved processing, moderation, storage, support and direct-delivery cost methods;
- community allocation rate, base, eligibility and timing;
- sponsor purchaser/beneficiary rules and unused sponsor balances;
- customer cancellation, replacement-service deadline and credit expiry;
- final audience scope, daypart clock windows and booking cutoff;
- production capacity ceiling and recalibration authority.

None of these should be inferred from a zero value in the current disabled records.

## 6. Release checklist

Before any paid pilot decision:

- Run the Slice 4 migration and focused concurrency tests against an explicitly disposable PostgreSQL database.
- Confirm one Alembic head and rehearse upgrade and downgrade from the production predecessor.
- Measure production serving activity using the procedure above.
- Approve conservative capacity for each community/date/daypart.
- Configure only approved GBP 1 and GBP 8 acquisition-pack versions.
- Create named merchant/operator pilot entitlements with expiry.
- Approve customer terms, tax treatment, cancellation, underdelivery, replacement and cash-refund rules.
- Approve direct-cost and community-allocation policy.
- Confirm payment destination, reconciliation feed, overpayment handling and operator exception queue.
- Confirm privacy-protected reach reporting and retention.
- Verify all three gates remain off until the explicit release window.
- Verify operator permissions, audit access and support ownership.
- Run the focused backend suite, complete repository suite and PostgreSQL rehearsal on the exact release revision.
- Obtain a separate founder release decision.

## 7. Rollback

Before activation, rollback is simple: keep the feature and payment gates disabled and revert the candidate.

After any real record exists, do not use the schema downgrade as the operational rollback. The downgrade intentionally removes Slice 4 acquisition, application, refund, entitlement and merchant/sponsor settlement records so that the predecessor schema can be restored. A live rollback must instead:

1. disable the Spotlight-specific payment gate;
2. disable paid Spotlight service entry;
3. stop new acquisition instructions, quotes and spends;
4. preserve all financial and obligation records;
5. reconcile in-flight expected payments and bookings;
6. deploy a compatible code rollback;
7. perform schema rollback only after an approved export, accounting reconciliation and retention decision.

## 8. Verification status

Confirmed locally:

- the 36-test focused cash/payment/permission/settlement/telemetry and adjacent regression suite;
- existing Slice 3/3A commercial regressions through reconciled cash backing;
- legacy Pipeline Credit top-up tests;
- existing house advertising-settlement tests;
- general Pipeline Credit commerce tests;
- SQLite migration upgrade, partial uniqueness and downgrade;
- the corrected single Alembic-head contract;
- Python compilation and application import;
- the complete backend repository suite: 1,857 passed and 30 skipped.

Not confirmed in this environment:

- PostgreSQL execution of the new migration and simultaneous acquisition/refund races;
- production payment-provider behavior;
- production capacity or cost.

These are genuine release blockers, not cosmetic follow-up.
