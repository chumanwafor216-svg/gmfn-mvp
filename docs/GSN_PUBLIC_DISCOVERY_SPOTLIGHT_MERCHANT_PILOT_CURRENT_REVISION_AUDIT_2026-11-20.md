# GSN Public Discovery, Spotlight and Merchant Pilot Current-Revision Audit

Date: 2026-11-20

Repository: `gmfn_mvp`

Audited revision: `cabbfb04048e418a86ef16390c32cfa685dead5c`

Status: current-revision audit and implementation preparation only

## 1. Authority and safety boundary

This record reconciles the supplied Public Discovery, Spotlight and Merchant Pilot Protocol with the current repository. It does not authorize production code changes, payment activation, merchant or sponsor contact, external promises, forecast revision, deployment, or release.

The supplied attachment contained an unrelated session/account dump after the actual protocol. That material was excluded and is not reproduced here. The exposed session should be revoked by the product owner.

## 2. Executive verdict

GSN should not rebuild these capabilities from zero. The repository already contains substantial foundations for community search, public shop viewing, shop privacy, merchant capabilities, Spotlight serving, delivery evidence, attention analytics, campaign reporting, advertising settlement, Community Domain and Demand Box.

The hard truth is that these foundations do not yet form the proposed paid merchant contract:

- public shop viewing exists, but global public shop and offer discovery does not;
- Spotlight serving and measurement are substantial, but the canonical Pipeline Credit Spotlight service is explicitly unconnected;
- the isolated member-credit Spotlight writer is a test rail, not the canonical paid merchant service;
- current Spotlight pacing defaults to 10 qualifying delivery rounds, not 30 scheduled opportunities;
- current viewer frequency is two presentations, with one Demand Box exception, not five presentations followed by strict suppression of the sixth;
- current merchant-facing analytics do not prove purchased allocation, supplied opportunities, shortfall, cause and remedy as one report;
- payment operations remain disabled by default;
- underdelivery does not yet produce an authoritative restore, make-good or refund outcome;
- the Community Domain package is still a no-charge pilot package, not a live GBP 24/GBP 40 offer;
- Demand Box already has operational limits and no discovered per-reply charge, so old reply charging should not be reintroduced without evidence.

Therefore there is no release candidate for the proposed commercial promise. The correct next move is a narrow connection project that preserves existing authorities and evidence systems.

## 3. Effective controls at the audited revision

| Control | Current state | Consequence |
| --- | --- | --- |
| Payment operations | `GSN_PAYMENT_OPERATIONS_ENABLED` defaults off in `gmfn_backend/app/services/payment_operations_policy.py` | No live payment claim is justified. |
| Pipeline Credit lifecycle | Defaults to research when absent; quote, spend and debit controls remain closed | Commercial behavior must not be inferred from UI copy. |
| Paid Spotlight catalogue item | `paid_spotlight.day` exists but is marked unconnected in `gmfn_backend/app/services/pipeline_credit_commerce_service.py` | Canonical purchase must fail before delivery rather than silently promise service. |
| Member-credit Spotlight writer | Separate feature-flagged test path | Useful for tests and migration evidence, but not a production commercial authority. |
| Shop privacy authority | New authority is feature-flagged; disabled mode preserves legacy visibility | Production enforcement remains unverified until the environment and anonymous behavior are checked. |
| Community discovery | Every active non-system community is searchable under the established universal-search contract | This does not create global shop or offer discovery. |

## 4. Preservation map

### 4.1 Public discovery and publication

| Capability | Verdict | Current evidence | Smallest safe adjustment | Verification gate |
| --- | --- | --- | --- | --- |
| Search existing communities | Present | Universal active-community search is already recorded and deployed separately | Preserve unchanged | Existing corrected-entry tests remain green |
| Search shops inside selected community | Present | Authenticated `GET /marketplace/shops/directory` at `gmfn_backend/app/api/routes/marketplace.py:4911`; selected-community product filters begin at `gmfn_backend/app/api/routes/marketplace.py:4930` | Preserve as the community directory | Membership and community-boundary tests |
| View a known public shop anonymously | Present | Anonymous `GET /marketplace/public/shop/{gmfn_id}` at `gmfn_backend/app/api/routes/marketplace.py:5334`; public privacy decision begins at `gmfn_backend/app/api/routes/marketplace.py:5354` | Preserve as direct-link public viewing | Anonymous privacy matrix and inactive-shop tests |
| Search shops across communities | Absent | No anonymous or cross-community public index was found; the existing directory requires authentication and one community | Add a separate public projection/search endpoint; do not weaken the community directory | Anonymous search, pagination, privacy and tenancy tests |
| Search public offers by need | Absent | Existing directory searches selected-community offers only | Add public offer projection using explicit publication state and existing capability taxonomy | Product/category/coverage query tests |
| Merchant category, service area and availability | Partial | Capability, availability and coverage models exist, but current directory does not use them as a global discovery contract | Reuse these models rather than inventing parallel fields | Projection consistency tests |
| Explicit publish, pause, withdraw and expiry lifecycle | Partial | Shops/products have active and visibility fields, but no complete public-publication lifecycle | Add explicit publication state and timestamps before broad indexing | State-transition and expiry tests |
| Legacy-owner authority for broad indexing | Unverified | Legacy visibility and the feature-flagged privacy authority do not prove informed consent to a new global index | Require owner confirmation before broad indexing when recorded authority is absent | Migration report plus owner-notice evidence |
| Production public privacy enforcement | Unverified | New authority exists, but its flag defaults off and live environment state was not proven in this audit | Verify Render environment and live anonymous responses before release | Environment evidence plus live privacy smoke |

### 4.2 Spotlight and advertiser evidence

| Capability | Verdict | Current evidence | Smallest safe adjustment | Verification gate |
| --- | --- | --- | --- | --- |
| Campaign and placement records | Present | Existing Spotlight campaign, placement and pacing services | Preserve identifiers and histories | Existing Spotlight suites |
| Presentation integrity | Present | Lease/token, elapsed-time, visibility and idempotency protections exist | Reuse; do not replace with client-only counting | Replay, hidden-tab, owner-preview and duplicate-event tests |
| Recognized-viewer evidence | Present | Exposure events and viewer-level frequency records exist | Preserve privacy-safe recognized-user reporting | Viewer-account and privacy tests |
| Owner attention funnel | Present | Marketplace analytics and Shop Control show impressions, viewers, visits, opens and contact actions | Reuse as downstream attention evidence | Existing analytics audits |
| House-campaign report | Present | `_gsn_house_campaign_report` in `gmfn_backend/app/api/routes/marketplace.py:1199` already reports placement, pacing, presentation and audience evidence | Extract reusable report builders | Golden report fixture |
| Canonical Pipeline Credit Spotlight booking | Absent | `paid_spotlight.day` is catalogued but unconnected | Connect one Pipeline Credit spend to one immutable booking/entitlement | Purchase-to-entitlement integration test |
| Thirty scheduled opportunities | Absent | Current default is 10 delivery rounds at `gmfn_backend/app/services/spotlight_delivery_pacing_service.py:19`; a round is consumed by qualifying presentation behavior | Add a scheduled-opportunity ledger separate from impression qualification | 10/10/10 allocation and zero-audience tests |
| Five impressions per viewer | Absent | Current cap is 2 at `gmfn_backend/app/services/spotlight_frequency_control_service.py:20`, with a bounded Demand Box exception | Adopt one authoritative five-presentation policy and suppress the sixth | Cross-device/account and sixth-suppression tests |
| Capacity reservation | Absent | Campaign concurrency exists, but no merchant booking inventory proves 10/10/10 supply | Reserve capacity before accepting spend | Oversell and concurrent-booking tests |
| Late-booking rule | Absent | No canonical merchant booking rule maps late purchases to the next complete service day | Default to next complete day in the chosen timezone | Boundary-time tests |
| Underdelivery remedy | Absent | Adjustment records exist, but Spotlight withdrawal reports do not restore credit/time and no report-to-remedy chain exists | Add an idempotent shortfall decision and remedy record | Failure, retry, duplicate and reconciliation tests |
| Merchant advertiser report | Partial | Strong components exist, but no one report joins entitlement, supply, impression, response, shortfall and remedy | Build report from existing evidence owners | Reconciled report fixture and export test |
| Delivery cost and unit economics | Partial | Advertising settlement supports cost fields for governed house campaigns | Extend evidence model carefully to ordinary merchant service; do not fabricate cost | Cost-source and accounting reconciliation |

### 4.3 Community Domain and Demand Box

| Capability | Verdict | Current evidence | Smallest safe adjustment | Verification gate |
| --- | --- | --- | --- | --- |
| Community Domain pilot package | Present | Current package supports a six-month no-charge pilot with limits including 500 members, 10 admins, 100 shops and 5 GB | Preserve pilot behavior | Existing domain contract tests |
| GBP 24 / GBP 40 paid tiers | Absent | No live saleable tier or payment authority was found | Keep as candidate pricing until service scope, tax, renewal and support are approved | Founder decision plus pricing model |
| Demand Box request limits | Present | Five open requests per 24 hours and default 48-hour expiry are established in `gmfn_backend/app/api/routes/marketplace_requests.py` | Preserve during pilot | Quota and expiry tests |
| Demand Box private response thread | Present | Authenticated response routes begin at `gmfn_backend/app/api/routes/demand_box_interactions.py:254` | Preserve text/voice response behavior | Membership and privacy tests |
| Per-response charging | Absent | No current one-response or two-response charge was found | Do not reintroduce old charging without measured abuse or cost evidence | Pilot evidence review |
| Global public Demand Box | Absent by design | Current Demand Box is community-scoped and protected | Keep separate from public merchant discovery | Tenancy and authorization tests |

## 5. Decisions that can be carried forward

These are working commercial decisions or recommended pilot defaults. They are not claims about current production behavior.

### Settled commercial direction

- GBP 0.50 buys one Pipeline Credit.
- One Pipeline Credit buys 30 scheduled Spotlight opportunities.
- Allocation is 10 morning, 10 afternoon and 10 evening opportunities.
- The purchased unit is a scheduled opportunity, not a guaranteed viewer, click, enquiry or sale.
- There is no five-person target or ceiling.
- A new purchase does not reset a viewer's frequency history.
- GSN must report what was purchased, supplied, seen, acted upon, missed and remedied without converting weak signals into sales claims.

### Recommended pilot defaults requiring explicit adoption

- Scope one credit to one named community.
- Use `Europe/London` for the Scottish pilot.
- Use dayparts 05:00–12:00, 12:00–18:00 and 18:00–00:00.
- Move a late booking to the next complete service day rather than selling a partial hidden day.
- Permit at most five qualifying presentations to the same recognized viewer for the campaign service period and suppress the sixth.
- Defer overnight inventory until evidence justifies it.
- When GSN causes any shortfall during the pilot and fractional restoration is unavailable, restore the whole affected one-credit package. This is deliberately customer-favorable and must be adopted before a paid promise is made.
- Where no recorded informed publication authority exists, require the legacy shop owner to confirm broad public indexing.

## 6. Minimal implementation sequence after authorization

1. Add an explicit public-publication contract for shop and offer records: draft, published, paused, withdrawn and expired, with authority and timestamps.
2. Build a new global public shop/offer projection and search endpoint using existing capability, coverage, availability and privacy authorities. Leave the existing community directory unchanged.
3. Define one immutable Spotlight booking/entitlement record for a named community, date, timezone and 10/10/10 allocation.
4. Connect `paid_spotlight.day` in the canonical Pipeline Credit service to that entitlement. Preserve the isolated member-credit path only for test/history; do not sell new canonical bookings through it.
5. Separate scheduled opportunity supply from qualifying impressions. A scheduled opportunity can be supplied even when no eligible viewer is present, while an impression requires the existing presentation-quality rules.
6. Adopt the five-presentation recognized-viewer policy and strict sixth suppression in one authoritative service.
7. Add capacity reservation, late-booking handling, shortfall classification and an idempotent remedy decision.
8. Build the merchant advertiser report by composing the entitlement, opportunity, presentation, attention, shortfall and remedy evidence owners.
9. Add an internal commercial evidence view/export for revenue, refunds/restorations, processing cost, delivery cost and contribution margin.
10. Run a no-payment internal simulation before requesting any public paid release.

No existing community-search, direct public-shop, privacy, campaign-history, analytics, Demand Box or Community Domain pilot contract should be deleted to achieve this.

## 7. Example advertiser report using test data

### Booking

| Field | Test value |
| --- | --- |
| Booking | `SP-PILOT-001` |
| Merchant | Test merchant A |
| Community | Aberdeen pilot community |
| Service date | 2026-12-01 |
| Timezone | Europe/London |
| Price | 1 Pipeline Credit / GBP 0.50 |
| Purchased allocation | 10 morning / 10 afternoon / 10 evening |

### Delivery

| Metric | Test value | Meaning |
| --- | ---: | --- |
| Scheduled opportunities purchased | 30 | Contracted supply unit |
| Opportunities supplied | 29 | 10 morning, 9 afternoon, 10 evening |
| Opportunities missed | 1 | GSN-caused afternoon interruption |
| Qualifying impressions | 18 | Passed server presentation rules |
| Recognized unique viewers | 12 | Account-level count; no inferred guests |
| Viewer frequency | 8 saw once; 3 saw twice; 1 saw four times | Totals 18 impressions; no viewer exceeded five |
| Shop opens | 4 | Attention event, not a sale |
| Contact actions | 3 | Contact intent, not confirmed conversation |
| Recorded enquiries | 1 | Merchant-recorded enquiry |
| Verified sales | 0 | No evidence supplied |

### Shortfall and remedy

- Cause: one GSN-controlled afternoon opportunity was not supplied.
- Evidence: booking allocation, scheduler record and incident record reconcile to a one-opportunity shortfall.
- Proposed pilot remedy: restore one Pipeline Credit because fractional restoration is not yet supported.
- Status: proposed remedy policy, not current production behavior.

## 8. Metric dictionary

| Metric | Definition | Must not be described as |
| --- | --- | --- |
| Scheduled opportunity | One reserved chance for the campaign to be considered in the named community and daypart | A viewer or impression |
| Opportunity supplied | Scheduler made the reserved opportunity available under the service rules | Proof somebody saw it |
| Qualifying impression | Existing server rules confirmed eligible, visible presentation | A click, enquiry or sale |
| Recognized unique viewer | Distinct authenticated viewer account with qualifying evidence | Total human reach |
| Frequency | Qualifying impressions for one recognized viewer within the authoritative service period | New people reached |
| Shop open | Viewer opened the shop destination | Enquiry or purchase |
| Contact action | Viewer tapped an available contact method | Completed conversation |
| Enquiry | Merchant or governed workflow recorded a genuine enquiry | Sale |
| Verified sale | Transaction outcome supported by the adopted evidence standard | Inferred conversion |
| Shortfall | Purchased scheduled opportunity not supplied under the service rules | Low audience demand |
| Remedy | Recorded restore, make-good or refund outcome linked to a shortfall | Informal goodwill promise |

Unknown guests, guessed cross-device identities and unsupported sales must be omitted rather than estimated into the advertiser report.

## 9. Current negative purchase-to-remedy trace

The requested end-to-end positive trace cannot honestly be produced at this revision:

1. A canonical request to buy `paid_spotlight.day` reaches the Pipeline Credit catalogue.
2. The service is marked unconnected, so validation stops the transaction before canonical delivery.
3. No canonical merchant booking, 30-opportunity entitlement or 10/10/10 capacity reservation is created.
4. No canonical payment or Pipeline Credit debit should occur.
5. Consequently there is no authoritative canonical delivery failure, shortfall or remedy record to trace.

The feature-flagged member-credit test writer can create Spotlight records and debit a separate integer credit account, but it currently inherits a 10-round pacing model, a two-presentation viewer cap and no connected shortfall remedy. Promoting that path as if it satisfied the settled offer would create a false contract.

## 10. Community Domain candidate service sheet

This is a decision sheet, not an enabled offer.

| Item | Current pilot | Candidate entry tier | Candidate growth tier |
| --- | --- | --- | --- |
| Price | No charge | GBP 24 candidate | GBP 40 candidate |
| Billing period | Six-month pilot | Must be decided | Must be decided |
| Member capacity | Up to 500 | Up to 500 proposed | 501–1,000 proposed |
| Admins | 10 | Preserve or decide | Decide |
| Shops | 100 | Preserve or decide | Decide |
| Storage | 5 GB | Preserve or cost | Cost before promise |
| Support | Pilot support | Define response boundary | Define response boundary |
| Payment | Suspended | Not authorized | Not authorized |

Before sale, GSN must decide whether prices are monthly or annual, VAT treatment, renewal, overage, suspension, cancellation, support workload and whether Spotlight credits are included. The current repository does not answer those commercial questions.

## 11. Demand Box recommendation

Keep Demand Box community-scoped and free of per-reply charging during the merchant pilot. Preserve the current five-open-requests-per-24-hours limit and 48-hour expiry. Measure request completion, response quality, abuse, moderation effort, support burden and merchant value before adding any charge.

Demand Box should not be merged with global public shop discovery. Public discovery answers “who may offer this?”; Demand Box is a protected community request and response workflow.

## 12. Concentrated Scottish merchant pilot

### Cohort and duration

- One concentrated Scottish geography, with Aberdeen as the working location.
- 20–30 participating merchants.
- 60–90 days.
- No claim that this cohort has already been recruited.

### Stages

1. Baseline: observe existing discovery, shop-open and contact behavior without paid Spotlight.
2. Readiness: confirm publication authority, listing quality, service area, category and merchant support readiness.
3. Internal simulation: run 30-opportunity bookings with no payment and reconcile every report.
4. Authorized paid trial: only after payment, capacity, reporting and remedy gates pass.
5. Repeat observation: measure voluntary repeat purchase, not founder persuasion alone.

### Primary evidence

- percentage of merchants discoverable with complete public records;
- relevant search-to-shop-open rate;
- contact and enquiry rate without treating them as sales;
- purchased versus supplied opportunities and shortfall rate;
- recognized reach and frequency distribution;
- merchant report comprehension and dispute rate;
- remedy rate and remedy completion time;
- support minutes and delivery cost per booking;
- voluntary repeat-purchase rate;
- merchant retention and listing freshness.

### Stop conditions

- privacy authority cannot be proven;
- reports cannot reconcile booking, supply and presentation evidence;
- capacity can be oversold;
- failures cannot be remedied idempotently;
- support or delivery cost exceeds plausible contribution;
- merchants do not understand the distinction between opportunity, impression, enquiry and sale;
- paid repeat behavior is absent after a fair test.

## 13. Sponsor proposition boundary

A sponsor may fund merchant readiness, listing assistance, pilot credits, measurement and independent evaluation. GSN should not promise sales, unrestricted reach, public endorsement or favorable findings. Sponsor funds and merchant advertising spend must remain separately identifiable.

A credible sponsor pack should state:

- the defined cohort and geography;
- the exact support being funded;
- the settled opportunity contract;
- reporting and privacy boundaries;
- evidence that will be shared and what will remain private;
- stop conditions and remedy policy;
- no guaranteed commercial outcome;
- no live sponsor has been secured unless documented separately.

## 14. Release, rollback and next decision

### Release status

Not releasable as a paid public merchant offer. No code, payment state, production environment, external message or deployment changed through this audit.

### Rollback design for future work

- New global discovery must be separately flaggable from the existing community directory and direct public-shop route.
- Existing community discovery must remain available if global shop discovery is disabled.
- Spotlight booking should stop accepting new spend without deleting campaign, entitlement, delivery or remedy histories.
- The member-credit test rail should remain distinguishable from canonical Pipeline Credit commerce.
- Publication withdrawal must remove records from the public projection without erasing audit history.

### Next founder decisions

1. Adopt or reject the recommended timezone, dayparts, late-booking rule and whole-credit pilot remedy.
2. Confirm whether one Pipeline Credit is always scoped to one named community.
3. Confirm the publication-authority treatment for legacy shops.
4. Authorize or defer the narrow implementation sequence in section 6.
5. Keep GBP 24/GBP 40 as candidates or commission a costed Community Domain pricing decision.

## 15. Truth boundary

Confirmed by code: community search, community shop directory, anonymous direct public-shop viewing, privacy authority code, capability taxonomy, Spotlight presentation evidence, current 10-round pacing, current two-plus-bounded-exception frequency, unconnected canonical paid Spotlight, disabled-by-default payment operations, no-charge Domain pilot and Demand Box operational limits.

Inferred from those facts: the existing foundations can support the proposed model with focused additions rather than replacement.

Not yet proven: production privacy-flag state, live public indexing authority, 30-opportunity capacity, paid delivery economics, merchant willingness to pay, advertiser report comprehension, remedy behavior, repeat purchase, Community Domain paid-tier viability, sponsor demand or five-year break-even.
