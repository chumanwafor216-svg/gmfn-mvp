# GSN Spotlight Slice 3 implementation report

Date: 2026-11-21  
Authorised baseline: `8b582b614ee6e2843a5dfb375a117f7c74b92459`  
Working branch: `codex/public-shop-audio-fallback`  
Release state: implemented but disabled; not deployed and not promoted to `main`

## Outcome

Slice 3 connects `paid_spotlight.day` to the existing Pipeline Credit commerce, Spotlight presentation, exposure, frequency and Command Centre authorities. It does not create a second wallet, scheduler, impression ledger or payment route.

The workflow is:

1. approved funding and an idempotent Pipeline Credit quote;
2. measured-capacity preview;
3. atomic capacity reservation and booking;
4. canonical Pipeline Credit debit;
5. thirty persisted service obligations allocated 10 morning, 10 afternoon and 10 evening;
6. browser-visible presentation acknowledgement as the supplied-opportunity boundary;
7. the existing timed qualification authority as the qualifying-impression boundary;
8. privacy-protected delivery reporting;
9. automatic end-of-service reconciliation;
10. fulfilled settlement hold or an idempotent Pipeline Credit remedy.

Real collection and spending remain disabled by default. Activation still requires the paid-Spotlight feature flag, enforced Pipeline Credit commercial control and payment-operations authority. No environment was changed.

## Commercial contract

- The active global GBP pricing policy must equal two Pipeline Credits per pound: GBP 0.50 per Pipeline Credit.
- One Pipeline Credit buys one basic package of thirty scheduled opportunities.
- The basic package is fixed at 10 morning, 10 afternoon and 10 evening.
- There is no fixed viewer count and no enquiry or sale guarantee.
- Five qualifying views by the same recognised person for the same advert on the same authoritative service day suppress automatic sixth presentation.
- Extra bookings, overlapping communities and duplicate batches share the advert/day cap; they do not reset it.
- A candidate selection, lease issuance, scheduled turn or missed interval is not a supplied opportunity.

## Capacity and regional scheduling

Capacity is not hard-coded to the Slice 2 simulation value of 300. An authorised operator records measured supplied opportunities by eligible community, region, IANA timezone, local service date and daypart, together with an explicit safety factor and evidence source. Reservations lock the calibrated capacity rows and reject a changed or exhausted window before Pipeline Credit debit.

The service stores local-date-derived UTC boundaries. The focused rehearsal compares `Europe/London` across the DST-ending date with `Africa/Lagos`, proving that browser timezone does not rewrite the operator's selected service timezone.

The remaining capacity truth is operational, not a code constant: production serving telemetry and PostgreSQL concurrency/load evidence must establish safe headroom before any live promise.

## Command Centre

The existing programme board is preserved. Its commercial panel:

- identifies the installed contract and disabled state;
- distinguishes house, merchant-funded, sponsor-funded, gifted and waived funding;
- accepts an existing advert, eligible community, region, IANA timezone and service date;
- previews per-daypart measured capacity and conflicts;
- invalidates the preview when schedule inputs change;
- displays purchased, reserved, supplied, missed and outstanding opportunities separately;
- displays impressions and privacy-thresholded recognised reach separately;
- keeps reversible hold/resume separate from permanent withdrawal;
- provides the existing accessible list and complete commercial audit history.

## Stateful rehearsal evidence

The focused test uses controlled records, clocks and presentation leases; it does not insert desired final delivery totals.

### Fulfilled merchant-funded service

- Funding allocation: 10.00 Pipeline Credits.
- Booking key: `fulfilled-slice3`.
- Canonical debit: 1.00 Pipeline Credit; balance moves from 10.00 to 9.00.
- Obligations: 30 reserved, allocated 10/10/10.
- Supply: 30 distinct visible-presentation acknowledgements consume 30 persisted obligations.
- Measurement: five qualifying impressions are separately recorded.
- Frequency: prior count is five and automatic further presentation is suppressed.
- Reconciliation: 30 supplied, zero missed, status `fulfilled`.
- Fresh-session replay returns the original spend order and booking without a second debit.

### Genuine failure and remedy retry

- Booking key: `shortfall-slice3`.
- Supply: 29 distinct acknowledgements.
- Automatic due-booking reconciliation marks one unsupplied obligation `missed`.
- Booking remains `shortfall` and creates one outstanding one-credit remedy.
- Applying the remedy twice returns the same ledger entry and restores only 1.00 Pipeline Credit.

### Capacity conflict

- Measured capacity is constrained to 10 opportunities per daypart.
- The first booking reserves all three windows.
- A competing campaign spends from a separate request/session context.
- The competing booking is rejected before debit with a capacity conflict/unavailable result.
- This proves atomic conflict handling against committed competition. It is not a substitute for production PostgreSQL simultaneous-load testing.

### Multi-region schedule

- London: `GB-SCT`, `Europe/London`, DST-ending local date.
- Lagos: `NG`, `Africa/Lagos`, the same local date.
- Each measured 20 supplied opportunities per daypart with an 80% safety factor, producing 16 reservable per daypart.
- Their UTC starts differ, and the sponsor-funded Lagos booking retains its own region and timezone.

## Financial and reporting boundaries

The report separates:

- cash collected from Pipeline Credit allocation;
- credits acquired from credits spent;
- merchant-funded from sponsor-funded, gifted, waived and house programmes;
- purchased/reserved/supplied/missed service;
- qualifying impressions from recognised reach;
- delivery cost, overhead, community allocation and outstanding service liability.

An allocation ledger row is not treated as a cash purchase. A Shop open or contact is not treated as a sale. Earned revenue is not recognised merely because delivery is complete.

## Verification

- `python -m pytest tests/test_spotlight_slice3_commercial.py tests/test_pipeline_credit_commerce.py tests/test_spotlight_frequency_control_service.py tests/test_spotlight_presentation_contract.py tests/test_spotlight_slice2_stateful_rehearsal.py -q`: 46 passed.
- `python -m alembic heads` with `GMFN_DEV_MODE=1`: one head, `20261121_spotlight_slice3_commercial`.
- Python compilation: passed.
- `npm run build`: passed, 331 modules.
- `npm run audit:admin-gsn-house-campaign`: passed.
- `node tools/audit-mobile-visual-route-coverage.mjs`: passed, 61 app route keys represented.
- The broad completed audit was not repeated, as instructed.

## Remaining blockers to live service

1. The existing advertising settlement authority is house-campaign-only. It must be deliberately amended or supplemented before merchant delivery may become earned revenue; this candidate does not fake that settlement.
2. Real cash acquisition remains disconnected. Pipeline Credit allocation cannot prove cash collection.
3. Safe live capacity requires production telemetry and PostgreSQL simultaneous-load evidence. The controlled SQLite rehearsal proves workflow invariants, not live throughput.
4. Delivery cost, company overhead and community allocation policies remain unapproved and therefore report as unknown rather than zero.
5. The selected service windows, remedy policy, privacy threshold and operator permissions require final live-service approval.
6. Feature flags, migration, payment operations and public release remain intentionally inactive.

## Rollback

The safest rollback is to leave `GSN_PAID_SPOTLIGHT_V1_ENABLED` unset or false; this prevents quote, reservation, serving and reconciliation activation while preserving all existing production behaviour.

If the candidate must be removed before release, revert its candidate commit. The migration is additive. Downgrade from `20261121_spotlight_slice3_commercial` to `20261120_public_discovery_coverage` only when no Slice 3 records need preservation and after any required export. Do not delete or rewrite existing Spotlight, Pipeline Credit, payment, discovery, privacy or historical campaign records.

