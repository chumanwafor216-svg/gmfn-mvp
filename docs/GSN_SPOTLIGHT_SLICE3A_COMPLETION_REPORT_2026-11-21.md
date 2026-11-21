# GSN Spotlight Slice 3A completion report

Date: 2026-11-21  
Authorised baseline: `58506d0c60d27f773a1dd70099ab1bfaa309e9a4`  
Verified implementation revision: `f243d2685b7c4732b40d3c8861e81d03ba55e0e6`  
Working branch: `codex/public-shop-audio-fallback`  
Release state: production-capable path remains disabled; not deployed and not promoted to `main`

## Outcome

Slice 3A closes the delivery-attribution, restored-credit obligation, settlement-readiness and PostgreSQL concurrency gaps in the existing `paid_spotlight.day` service. It preserves the Slice 3 commercial contract, the existing Pipeline Credit authority, the existing Spotlight selection/presentation architecture and the existing Command Centre theatre.

No second scheduler, wallet, impression ledger, settlement route or purchase route was added. Real collection and spending remain disabled.

## Exact implementation changes

### Scheduled-opportunity integrity

- Each commercial opportunity now records when its scheduled turn was actually made available and when that turn expires.
- Final presentation-lease issuance binds to only the currently due opportunity for the authorised campaign, community, service day, daypart and booking window.
- Repeated presentations during the same scheduled turn reuse that opportunity. They do not consume future opportunities.
- Overlapping bookings are considered independently and deterministically without resetting the same-advert/day frequency cap.
- Candidate consideration without a final lease does not count as availability, supply or an impression.
- A browser-visible acknowledgement is recorded separately from the opportunity being made available.
- A timed qualifying impression is recorded separately from both availability and visibility.
- At reconciliation, unmade scheduled opportunities become missed obligations and produce a traceable shortfall.

The existing architecture is viewer-triggered. Therefore an interval in which no eligible viewer causes a final lease is not called supplied; it remains a missed scheduled obligation. A turn that reaches final lease issuance but never becomes visibly acknowledged remains `made_available` with zero visible presentations and zero qualifying impressions. This is the truthful distinction supported by the current serving architecture.

### Booking-specific attribution

- Added immutable commercial presentation attribution linking each presentation to one booking, one opportunity, one campaign, one community and one recognised viewer.
- Booking reports count only impressions linked to that booking's authorised delivery.
- Recognised reach is deduplicated inside the booking/reporting scope and remains privacy-thresholded.
- Historical rows are not rewritten. Where exact Slice 3A attribution does not exist, the report can use only the older opportunity presentation identifier; it does not infer attribution from campaign totals.

### Restored-credit service obligations

- Applying a Pipeline Credit restoration now creates a durable outstanding service-credit obligation.
- A replacement booking applies restored obligations FIFO and records the exact amount attached to the replacement.
- Fulfilled replacement service closes the application and the original obligation.
- A permanently withdrawn replacement releases the application back to the outstanding obligation.
- The original shortfall, restored Pipeline Credit, replacement campaign and cash refund remain distinct records and statuses.
- Reports separately expose unbooked restored credits and restored credits attached to active replacement service, preventing the same liability from disappearing or being counted twice.

### Settlement readiness

The existing advertising revenue service now has a non-posting Spotlight settlement-readiness classification. It does not activate accounting entries or payments.

- `merchant_paid` and `sponsor_funded` are revenue-capable only when cash is independently confirmed, service is fulfilled and no original or restored service obligation remains open.
- `gifted`, `waived` and `house` activity are explicitly not customer revenue.
- A Pipeline Credit restoration is not a cash refund.
- A replacement campaign is not a cash refund.
- Company overhead is not treated as campaign-specific direct delivery cost.
- Direct delivery cost and community allocation remain unresolved unless approved evidence or policy values are supplied; missing values are not silently converted to zero.

## Reconciled record traces

### Current-turn and overlapping-booking trace

- Two bookings for the same campaign each reserve 30 opportunities.
- Seven presentations occur during the first scheduled turn.
- The first booking receives six exact attributions and the second receives one.
- Only one opportunity per booking becomes available; 58 future opportunities remain reserved.
- Booking one reports six qualifying impressions and five recognised unique viewers.
- Booking two reports one qualifying impression; reach remains hidden below the privacy threshold.
- No future turn is consumed by the additional presentations.

### Actual serving and fifth/sixth-view boundary

- Five real selection -> final lease -> supply acknowledgement -> qualification cycles use the existing serving services.
- All five presentations bind to one current scheduled opportunity.
- The report records one made-available opportunity, five visible presentations and five qualifying impressions.
- The fifth qualifying presentation is accepted.
- The sixth automatic selection is suppressed for the same recognised viewer, advert and authoritative day.
- Commercial serving does not consume the unrelated legacy ten-round delivery counter.

### Shortfall, restoration and replacement trace

- Original booking reserves 30 opportunities and genuinely supplies 29.
- Reconciliation records one missed obligation and one outstanding one-credit remedy.
- Applying the remedy restores one Pipeline Credit once and creates one outstanding service-credit obligation.
- A replacement booking changes the obligation from `outstanding` to `rebooked`; the liability remains visible as active replacement service.
- Supplying all 30 replacement opportunities and reconciling changes both application and obligation to `fulfilled`.
- The final report shows zero unbooked restored credits, zero restored credits in active replacement and no open service obligation.

### PostgreSQL simultaneous-booking trace

GitHub Actions run `44850607912`, job `136680814165`, used PostgreSQL and the repository's protected migration/authority-role setup.

- Two buyers simultaneously attempt to reserve the final 10/10/10 capacity.
- Exactly one booking succeeds.
- The winner has one completed spend, three allocations and 30 opportunities.
- The losing request has no completed or pending spend, no abandoned reservation and no debit.
- Two simultaneous retries of one quote return one order, one booking and one debit.
- Two simultaneous remedy retries return one restoration ledger entry and one restored-service obligation.
- Result: `6 passed, 1 warning in 5.44s` across the three established corrected-entry concurrency contracts and the three new Spotlight Slice 3A contracts.

## Command Centre scheduling walkthrough

The existing Command Centre programme board and accessible list are preserved. An authorised operator can inspect the validated advert/community selection and its region, IANA timezone, local service date, expiry and fixed basic allocation.

For a basic booking the review surface shows:

1. the selected advert and eligible community;
2. region and authoritative IANA timezone;
3. service date, expiry and authorised dayparts;
4. 30 purchased and reserved opportunities split 10 morning, 10 afternoon and 10 evening;
5. made-available, visible, missed and outstanding opportunity counts separately;
6. qualifying impressions and privacy-protected recognised reach separately;
7. original shortfall and restored-credit replacement obligations separately;
8. funding classification, cash-collection status and earned-revenue readiness separately;
9. reversible hold separate from permanent withdrawal;
10. audit history without changing the theatre layout.

A failed turn stays missed after reconciliation. Its original shortfall remains visible; a restored credit remains an outstanding service obligation until replacement service is fulfilled or otherwise resolved by an approved remedy policy.

## Files changed from the authorised baseline

- `.github/workflows/tests.yml`
- `frontend/src/lib/api.ts`
- `frontend/src/pages/AdminGsnHouseCampaignPage.tsx`
- `frontend/tools/audit-admin-gsn-house-campaign.mjs`
- `gmfn_backend/alembic/versions/20261121_spotlight_slice3a_integrity.py`
- `gmfn_backend/app/db/spotlight_commercial_models.py`
- `gmfn_backend/app/services/advertising_revenue_service.py`
- `gmfn_backend/app/services/spotlight_commercial_service.py`
- `gmfn_backend/app/services/spotlight_pacing_state_service.py`
- `gmfn_backend/app/services/spotlight_presentation_service.py`
- `gmfn_backend/tests/test_postgres_spotlight_slice3a_concurrency.py`
- `gmfn_backend/tests/test_commerce_taxonomy_migration.py`
- `gmfn_backend/tests/test_spotlight_slice2_simulation.py`
- `gmfn_backend/tests/test_spotlight_slice3_commercial.py`
- `gmfn_backend/tools/run_spotlight_slice3a_postgres_proof.ps1`

## Verification

- `python -m pytest -q tests/test_spotlight_slice3_commercial.py tests/test_spotlight_presentation_contract.py tests/test_spotlight_transaction_safeguards.py`: 36 passed.
- Actual serving-path contract: five accepted qualifying views, sixth suppressed, one current turn consumed, exact booking attribution passed.
- Local PostgreSQL test collection without opt-in database: three tests collected and safely skipped.
- GitHub PostgreSQL run `44850607912`, job `136680814165`: 6 passed, none skipped; the explicit six-test gate passed.
- Affected broad-contract checks for the current Alembic head and connected-but-disabled canonical service: 10 passed locally.
- GitHub Actions full repository job `136680814498`: 1,850 passed, 30 skipped and 2 warnings.
- `python -m alembic heads` with `GMFN_DEV_MODE=1`: one head, `20261121_spotlight_slice3a_integrity`.
- `npm.cmd run audit:admin-gsn-house-campaign`: passed.
- `npm.cmd run build`: passed.
- `git diff --check`: passed.
- The separate broad product audit was not restarted. The repository's mandatory automated full test job ran once for the final code candidate and passed.

## Remaining blockers and policy decisions

1. Real cash collection and production Pipeline Credit spending remain disabled and unproven.
2. Production capacity/headroom still requires real serving telemetry and load evidence; PostgreSQL proves atomic reservation, not future audience volume.
3. Direct delivery cost policy and evidence are not approved.
4. Community allocation policy and rate are not approved for this service.
5. Cash-refund authority and customer-facing remedy choice are not activated; the implemented remedy remains Pipeline Credit restoration/replacement-service accounting.
6. Live customer terms, final clock windows, privacy threshold, operator roles and settlement posting require separate approval.
7. Pre-Slice-3A historical records do not have exact presentation-attribution rows. They remain preserved and are not fabricated through backfill.
8. A completed booking is not earned revenue without independently confirmed cash and closed service obligations. This implementation deliberately refuses to infer cash from Pipeline Credit allocation.

## Safe rollback

The safest operational rollback is to leave `GSN_PAID_SPOTLIGHT_V1_ENABLED` and payment operations disabled. That prevents commercial quote, booking, serving and remedy activation while preserving current production behaviour.

To remove the candidate before release, revert the Slice 3A implementation commits on the working branch. The migration is additive. Downgrade from `20261121_spotlight_slice3a_integrity` to `20261121_spotlight_slice3_commercial` only if no Slice 3A attribution or restored-obligation records require preservation and after any required export. Do not delete or rewrite existing Spotlight, Pipeline Credit, payment, discovery, privacy or historical campaign records.

No deployment, payment activation, public-discovery activation, owner notice, outreach or `main` promotion is part of this candidate.
