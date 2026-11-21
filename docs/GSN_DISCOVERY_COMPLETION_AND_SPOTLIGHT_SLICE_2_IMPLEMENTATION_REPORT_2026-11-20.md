# GSN Discovery Completion and Spotlight Slice 2 Implementation Report

Date: 2026-11-20

Candidate baseline: `ec9eae347a35d04db1d366dc7d371d1d9c424867`

Candidate revision: the working-branch commit containing this report

Scope: discovery completion plus feature-gated Spotlight protocol 1.3 simulation

## Candidate verdict

The bounded candidate is connected and reviewable without activating a live paid service.

- Public discovery now consumes its existing cursor contract and distinguishes complete from partial search coverage.
- The existing Command Centre campaign page now has a protocol 1.3 programme board and accessible list view when the isolated simulation flag is enabled.
- The reference board remains a clearly labelled deterministic contract demonstration. A separate test-only rehearsal now joins canonical Pipeline Credit, pacing, exposure and reporting services into inspectable stateful records.
- No real payment is collected, no production Pipeline Credit is debited, no live booking is persisted, no live campaign is activated, and no live capacity is changed. The rehearsal mutates only isolated test-database records.
- Existing publication authority, privacy exclusions, owner controls, direct Shop behavior, GSN-HOUSE live operations, and permanent-stop controls remain authoritative.

## 1. Discovery completion

### Cursor connection

`GET /marketplace/public-discovery` already returned `next_cursor`. The public discovery page now uses it through `Show more results`, keeps the active filters, appends without duplicate products, and stops only when the backend returns no next cursor.

### Truthful coverage

The backend now scans one row beyond the operational limit before declaring `scan_limit_reached`. This prevents a full final page of exactly 500 eligible publication rows from being falsely labelled partial.

The response now includes:

- `coverage_complete`;
- `total_is_complete`;
- `scan_limit_reached`;
- `scanned_publication_count`;
- `evaluated_publication_count`;
- `scan_limit`;
- `next_cursor`.

When coverage is incomplete, the interface reports counts as `at least` the returned total and says that older matching offers may exist. A zero-result partial scan says that no match was found among the most recently checked public offers; it does not claim that no matching offer exists anywhere.

`scanned_publication_count` is the raw authority-row scan count, including the one-row sentinel used to prove that the limit was reached. `evaluated_publication_count` is the number of rows actually evaluated for the returned search. Search evidence records both counts plus `coverage_complete`, `coverage_known` and `scan_limit_reached`, so incomplete scans can be separated when analysing search usefulness and zero-result rates.

The migration inspects whether search evidence already exists. Pre-existing evidence is marked `coverage_known = false` and `coverage_complete = false` because its historical scan extent cannot be reconstructed honestly. A clean install and new measured records retain `coverage_known = true`.

### Preserved boundaries

- Discovery remains fail-closed behind its existing public-discovery and Shop-privacy authorities.
- Only explicitly published, privacy-safe, active and available offers are projected.
- Owner hide, pause and withdrawal remain effective.
- Exact locality, community membership, private contacts, TrustSlip evidence, Vault data and administration data remain excluded.
- Direct public Shop links and authenticated community Marketplace behavior are unchanged.

## 2. Spotlight Slice 2 simulation

Feature flag: `GSN_SPOTLIGHT_SLICE2_SIMULATION_V1_ENABLED`

Default: off

Protocol version: `1.3`

Parameter version: `spotlight-slice2-sim-v1`

The feature-gated admin endpoints are:

- `GET /marketplace/admin/gsn-house-campaigns/programme-board`;
- `POST /marketplace/admin/gsn-house-campaigns/programme-board/preview`.

Both are platform-admin only. They return simulation records and perform no live persistence or ledger mutation.

### Settled simulated contract

- GBP 0.50 equals one Pipeline Credit.
- One credit purchases 30 genuine scheduled opportunities for one eligible advert.
- Allocation is 10 morning, 10 afternoon and 10 evening.
- There is no five-person audience target or ceiling.
- The same recognised viewer may receive at most five qualifying automatic presentations of the same advert during the authoritative service day.
- A sixth automatic presentation is suppressed.
- Another booking, overlapping community, media selection, or duplicate batch does not reset or multiply the entitlement or frequency count.
- Selection-system consideration is reported separately and never counted as supplied opportunity.

### Explicit versioned test parameters

These settings support engineering simulation and are not live customer promises:

- region `GB-SCT`;
- timezone `Europe/London`;
- morning `05:00-12:00`;
- afternoon `12:00-18:00`;
- evening `18:00-00:00`;
- late booking starts on the next complete service day;
- one named community rotation per basic one-credit allocation;
- simulated capacity of 300 basic allocations per community and daypart;
- one whole-credit package restored once for a GSN-caused shortfall when proportional restoration is unavailable.

### Authority reuse

The candidate references rather than replaces the existing authorities:

- canonical `paid_spotlight.day` Pipeline Credit catalogue and quote/spend boundary;
- advertising settlement and payment-reconciliation authority;
- Spotlight campaign identity and funding/source classifications;
- destination eligibility and owner controls;
- Spotlight pacing and lifecycle states;
- qualifying-impression reporting event.

The canonical paid Spotlight service remains disconnected. The simulation does not pretend otherwise.

## 3. Command Centre campaign schedule

The existing `/app/command-center/gsn-campaigns` page now exposes, when enabled:

- selected advert and media;
- authorised community audience;
- funding classification: house, paid merchant, sponsor-funded, gifted or waived;
- region, timezone and service date;
- dayparts, expiry and allocation;
- capacity reservation and conflicts;
- quote and explicit zero live debit;
- actual supplied opportunities, impressions and recognised reach;
- considered-but-not-supplied count;
- shortfall and simulated remedy;
- reversible pause authority and permanent-stop authority;
- accessible schedule list mirroring the board cards;
- interrupted-batch recovery proof;
- remaining decisions required before live service.

The operator may preview an individual programme or a batch. Selecting several media items or communities does not multiply one programme's purchased entitlement. A programme that exceeds the current one-community-per-credit test scope receives a visible planning conflict instead of hidden multiplication.

### Operational-theatre refinement

The safely extracted version 1.2 operational-theatre detail was reconciled into protocol 1.3 without copying the unrelated account/session export that followed it. The isolated board now adds:

- operator-selected service date, region and authoritative IANA timezone for draft preview;
- day and week views plus the existing accessible list;
- separate programme-type, funding and lifecycle filters;
- a programme tray and selected-programme inspector;
- an explicit overnight row with zero allocation and `no_active_allocation_policy`;
- an explicit rule that browser/device timezone does not rewrite a programme booking;
- an explicit rule that unknown capacity is not unlimited capacity;
- a rejected audience-scope change proof showing unchanged entitlement, quote, live capacity, booking and credits;
- truthful wording that correction hold is not a general pause/resume promise.

The day/week controls remain inspect-and-preview controls. They do not rearrange or persist live campaigns. Drag-and-drop was not added because it is optional in the corrected protocol and would add risk without proving a required contract.

## 4. Review scenarios

### Fulfilled simulated booking

The paid merchant reference booking purchases 30 opportunities and supplies all 30: 10 morning, 10 afternoon and 10 evening. It records 18 qualifying impressions and 12 recognised people. Forty-seven selection considerations remain separate and do not increase supplied opportunities.

Accounting equation: `30 supplied + 0 missed = 30 purchased`.

### Shortfall and remedy

The sponsor-funded reference booking purchases 30 and supplies 29: 10 morning, 9 afternoon and 10 evening. It records one GSN-caused missed opportunity, 18 qualifying impressions and 12 recognised people.

The simulation applies one idempotent whole-package credit restoration, preserves the `sponsored` funding classification, and records no cash refund or live ledger mutation. This is a remedy test, not an approved live promise.

Accounting equation: `29 supplied + 1 missed = 30 purchased`.

### Safely recovered interrupted batch

The recovery proof starts a three-item batch, interrupts after one successful item, then resumes using the item keys. The completed item is treated as an idempotent replay; the two remaining items receive bookings. The final record has three unique bookings and zero duplicates.

### Frequency continuity proof

Six same-day attempts are modelled for one recognised viewer and one advert while booking IDs and community IDs change. Five qualify and the sixth is suppressed. The count is keyed by viewer, advert and authoritative service day, not by booking or community.

## 5. Verification

Focused verification performed for this candidate:

- `python -m pytest -q --basetemp <writable-isolated-temp> tests/test_marketplace_public_discovery.py tests/test_spotlight_slice2_simulation.py tests/test_gsn_house_spotlight.py tests/test_spotlight_frequency_control_service.py tests/test_spotlight_presentation_contract.py` - `64 passed`;
- `npm run audit:admin-gsn-house-campaign` - passed;
- `python -m alembic heads` with local development mode - one head: `20261120_public_discovery_coverage`;
- `python -m py_compile` for the changed backend, migration and focused test files - passed;
- `npm run build` in `frontend` - passed, 331 modules transformed;
- scoped diff and secret-pattern checks - required before candidate commit.

The first sandboxed pytest attempt could not create the existing house-campaign test's temporary directory. The identical focused suite passed after the test was rerun with a writable isolated temporary root. The first sandboxed Vite attempt similarly hit `spawn EPERM`; the unchanged build passed outside that process restriction. These were runner restrictions, not application assertion failures.

The completed Slice 1 discovery audit was not repeated. Its documented broad `audit:link-contracts` baseline remains red on six unrelated pre-existing assertions in PWA install, Shop Assets, and older Public Shop link/copy/focus behavior. This candidate does not modify those surfaces and does not claim to fix them.

### Completion-pass verification

- `python -m pytest tests/test_marketplace_public_discovery.py tests/test_spotlight_slice2_simulation.py tests/test_spotlight_slice2_stateful_rehearsal.py -q` - `14 passed`;
- `python -m pytest --basetemp .pytest-slice2-elevated tests/test_public_discovery_coverage_migration.py -q` - `1 passed`;
- `npm run audit:admin-gsn-house-campaign` - passed;
- `npm run audit:action-response-protocol` - passed;
- `npm run audit:trust-actions` - passed;
- `npm run build` in `frontend` - passed, 331 modules transformed;
- `python -m alembic heads` - one head: `20261120_public_discovery_coverage`;
- focused `py_compile` and `git diff --check` - passed.

The full protected-button gate now passes every changed Command Centre control, including global raw-action enforcement. It remains red only because the earlier Slice 1 route `/app/shop-control/public-discovery` is still absent from the broad mobile visual route-coverage manifest. The run also logs the already documented unrelated duplicate React-key warning. Neither baseline item was introduced by this completion pass.

## 5.1 Stateful rehearsal record trace

The isolated rehearsal derives its totals from canonical service records rather than inserting final report totals:

1. A canonical customer Pipeline Credit account receives 10 test credits.
2. Two idempotent booking debits record one paid and one sponsored rehearsal booking, leaving 8 credits.
3. The fulfilled campaign consumes 30 canonical pacing rounds from controlled clock inputs and reports 10/10/10 supplied opportunities.
4. Five qualifying impressions are written through the exposure ledger. The fifth remains eligible and the sixth is suppressed by the explicit five-view same-advert boundary.
5. The shortfall campaign attempts 30 opportunities. The controlled provider refuses one afternoon opportunity, producing 29 supplied and one missed from workflow records.
6. Before remedy, the report says `outstanding`. One canonical credit restoration then changes the report to `applied`; retrying the same remedy returns the same ledger entry and does not allocate a second credit.
7. A two-credit reservation against an evening daypart already holding 299 of 300 units is rejected. No morning or afternoon staging survives the rejected programme, proving atomic capacity retention.
8. An interrupted three-item batch commits its first item. A fresh database session replays that key and books the remaining two; the replay reuses the first ledger entry and the final batch has three unique entries.
9. The final canonical test balance is 6 credits: `10 - 2 bookings + 1 remedy - 3 unique batch bookings = 6`.

## 5.2 Actual operator scheduling walkthrough

The Command Centre draft/preview path now follows the operator's validated inputs rather than the earlier fixed tomorrow/Scotland/London example:

1. The operator completes the existing read-only campaign review and selects the validated media items.
2. The operator selects the authorised community audience, service date, IANA timezone, region and funding classification.
3. The preview payload carries the review draft reference, selected media idempotency keys, review expiry and explicit morning/afternoon/evening permitted windows.
4. The backend validates one complete service day, expiry, audience scope and capacity, then returns per-item 10/10/10 allocation and one preview fingerprint.
5. The programme tray, board, inspector and accessible list render that returned schedule, including expiry, permitted windows, capacity and actual simulated delivery.
6. If selected media, audience, credits, funding, date, timezone, region, windows or expiry changes, the client invalidates the old preview and requires a new validated preview. A stale preview cannot be treated as the current operator plan.

The original hard-coded reference programmes remain available only as labelled contract demonstrations. They are not represented as persisted operator bookings.

## 6. Remaining live-service decisions

1. Approve the one-community-per-credit audience term or replace it with a priced multi-community term.
2. Approve the first live region, timezone and exact morning/afternoon/evening windows.
3. Approve cash-refund, replacement-service and whole-credit restoration terms.
4. Connect canonical `paid_spotlight.day` quote spending to one atomic booking and capacity reservation.
5. Replace the current live campaign-lifetime `2 + 1 Demand Box override` frequency rule with the same-advert, recognised-viewer, service-day rule before paid serving.
6. Approve live capacity, headroom and oversubscription handling. The simulated 300-allocation value is not saleable capacity.
7. Define aggregate privacy suppression for reach and frequency reporting.
8. Approve accounting, VAT, sponsor-funded and gifted-credit treatment before collection.
9. Define the operational evidence that proves a scheduled opportunity was genuinely supplied when no qualifying impression occurs.
10. Decide whether a genuine general pause/resume lifecycle is needed. The existing correction-hold authority is not represented as that customer promise.
11. Change the live absolute-window pacing rule before a paid promise: the existing scheduler may advance past a missed slot, while the commercial contract requires a genuine supplied opportunity or an explicit shortfall. The rehearsal deliberately records provider refusal as missed rather than consumed.
12. Add `/app/shop-control/public-discovery` to the broad mobile visual route-coverage fixture before claiming the entire protected suite is green.

## 7. Release boundary

This candidate does not include deployment, production feature activation, real payments, outreach, legacy-owner notices, or customer commitments. Enabling the simulation flag exposes only the admin simulation endpoints and board; it does not connect live paid Spotlight.
