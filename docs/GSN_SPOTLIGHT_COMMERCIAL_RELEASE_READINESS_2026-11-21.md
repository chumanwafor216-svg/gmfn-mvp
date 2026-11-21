# GSN Spotlight Commercial Release Readiness

**Prepared:** 21 November 2026
**Accepted engineering baseline:** tested revision `f243d2685b7c4732b40d3c8861e81d03ba55e0e6`; final branch candidate `29b06f02bde92652901dad5c4b9df01fcefd8133`
**Scope:** evidence, proposed commercial specifications, controlled-pilot design and bounded integration recommendations only
**Release boundary:** no deployment, payment activation, customer-term publication, merchant contact, public-discovery activation or promotion to `main`

## 1. Executive verdict

Slice 3A is a sound disabled engineering baseline. The scheduling, capacity reservation, opportunity attribution, five-view frequency boundary, shortfall restoration, outstanding-service-obligation records, PostgreSQL booking concurrency and Command Centre reporting should not be rebuilt without a demonstrated defect.

GSN is **not yet ready to sell the service for real cash**. Four gaps remain material:

1. Production serving capacity has not been measured. PostgreSQL proves atomic reservation, not that a community has enough real viewer-triggered opportunities to supply 10/10/10 reliably.
2. The connected legacy cash top-up path currently allocates the same numeric number of credits as the cash amount. That conflicts with the approved Spotlight tariff of two Pipeline Credits per GBP 1.
3. The acquisition-pack catalogue exists, but checkout reports `acquisition_checkout_connected: false`.
4. The persisted advertising-settlement authority remains restricted to GSN house campaigns. Slice 3A classifies settlement readiness but deliberately does not post merchant or sponsor revenue.

Two further release-control gaps matter:

- `GSN_PAYMENT_OPERATIONS_ENABLED` is a broad payment-mutation gate, not a Spotlight-only gate. Enabling it solely for this pilot could activate unrelated payment paths.
- `GSN_PAID_SPOTLIGHT_V1_ENABLED` is not a server-side merchant-cohort allowlist. A controlled pilot needs explicit participant restriction before a globally reachable paid route is enabled.

The correct next step is therefore a **measurement and integration-readiness phase**, followed by a separately approved, tightly gated Scottish merchant pilot. It is not an immediate commercial launch.

## 2. Evidence boundary

### 2.1 Proven by the accepted baseline

- One `paid_spotlight.day` Pipeline Credit books 30 scheduled opportunities split 10 morning, 10 afternoon and 10 evening.
- Capacity can be recorded by community, region, IANA timezone, service date and daypart, then reserved atomically.
- A final presentation lease binds to the currently due opportunity; repeated presentations during one turn cannot consume future turns.
- Candidate consideration, made-available supply, visible presentation, qualifying impression, recognised reach and missed opportunity remain distinct.
- A sixth automatic qualifying view of the same advert to the same recognised viewer on the authoritative day is suppressed.
- Booking reports use exact booking/opportunity attribution and privacy-protected aggregate reach.
- Shortfall reconciliation, idempotent Pipeline Credit restoration and replacement-service obligations are recorded without pretending that a restoration is a cash refund.
- PostgreSQL tests prove final-capacity contention, booking idempotency and remedy idempotency for the tested cases.
- The Command Centre can inspect the schedule and report purchased, reserved, supplied, missed, impression, reach, remedy and funding facts separately.

Primary evidence: `docs/GSN_SPOTLIGHT_SLICE3A_COMPLETION_REPORT_2026-11-21.md`, `gmfn_backend/app/services/spotlight_commercial_service.py`, `gmfn_backend/tests/test_spotlight_slice3_commercial.py` and `gmfn_backend/tests/test_postgres_spotlight_slice3a_concurrency.py`.

### 2.2 Not proven

- Actual community/daypart viewer demand or production headroom.
- Real payment-provider collection, fee rate, failure rate or chargeback rate for this service.
- Real Spotlight compute, storage, moderation, support or reconciliation cost per booking.
- Customer willingness to pay, repeat purchase, enquiries or sales.
- Final customer cancellation, refund, replacement, tax or community-allocation policy.
- Merchant/sponsor settlement posting through the existing accounting authority.
- Safe activation of a named pilot cohort while unrelated payment operations remain disabled.

Passing simulations and tests must not be presented as evidence of these commercial outcomes.

## 3. Production capacity

### 3.1 Existing telemetry and authority

The existing service already has the correct capacity dimensions and reservation boundary:

- `record_capacity_evidence()` records observed supplied opportunities and a safety factor by community, region, timezone, service date and daypart.
- `capacity_preview()` exposes observed, reservable, reserved and available opportunities.
- Booking atomically rejects uncalibrated, insufficient or changed capacity.
- Opportunity rows retain schedule, availability and expiry.
- Presentation attribution and booking reports distinguish made available, visible, missed, impressions and recognised reach.
- Reach below the existing threshold of five is suppressed from the customer report.

The missing element is not another capacity system. It is a defensible procedure for deriving the values entered into the existing authority.

### 3.2 Measurement procedure

Run the current serving architecture in measurement-only mode before taking paid bookings.

1. Select one candidate community and its authoritative IANA timezone.
2. Observe at least 14 consecutive days and at least 10 comparable active days for each daypart. Keep weekday and weekend evidence distinguishable.
3. For every community/daypart/day record:
   - eligible viewer requests;
   - adverts considered by selection;
   - final presentation leases;
   - distinct scheduled turns genuinely made available;
   - visible presentation acknowledgements;
   - qualifying impressions;
   - privacy-protected recognised unique viewers;
   - missed turns and reason codes;
   - serving/selection errors and latency;
   - simultaneous active campaigns;
   - existing house, sponsor or gifted obligations.
4. Exclude test traffic, operator refresh loops, bots and requests that fail the ordinary serving eligibility rules.
5. Reconcile raw serving records to the booking/opportunity reports. Do not infer supply from candidate consideration or elapsed schedule slots.
6. Have an authorised operator sign the evidence source, date range, exclusions, calculation and safety factor before recording calibrated capacity.
7. After every service day, compare reserved capacity with genuine supply, shortfall and remedy. Recalibrate downward immediately when evidence weakens.

### 3.3 Conservative capacity proposal

This is a recommendation, not observed capacity.

For each comparable community/daypart:

```text
reliable_floor
= conservative lower-tail genuine made-available turns
  from comparable active days

net_floor
= reliable_floor
- existing house, sponsor, gifted and replacement-service obligations

reservable_opportunities
= floor(net_floor * launch_safety_factor)
```

Use the observed tenth percentile where the sample is adequate. For a small sample, use the minimum comparable active day rather than a mean. Unknown or uncalibrated capacity equals zero sellable capacity.

Recommended first-pilot safety factor: **50%**. The service accepts other recorded factors, but using a more generous factor before production evidence would turn optimism into a customer promise.

Recommended first-pilot sales ceiling:

- at most one paid 30-opportunity package per community per service day;
- sell only when morning, afternoon and evening each retain at least 10 reservable opportunities after all prior obligations;
- do not treat the former simulated 300-opportunity value as production capacity;
- increase the ceiling only after at least 10 fulfilled paid/rehearsal service days with no unresolved shortfall and an approved headroom review.

This ceiling is intentionally conservative. It protects the service promise but does not establish the eventual economic capacity of Spotlight.

## 4. Draft commercial terms

### 4.1 Customer-facing service definition

> **One Pipeline Credit costs GBP 0.50.** One Pipeline Credit books one eligible advert for 30 scheduled Spotlight opportunities in one named authorised community on one local service day: 10 in the morning, 10 in the afternoon and 10 in the evening.
>
> A scheduled opportunity means GSN makes the advert eligible for presentation during its scheduled turn. It does not guarantee that a particular person will see it. GSN reports opportunities made available, visible presentations, qualifying impressions and privacy-protected recognised reach separately.
>
> GSN does not guarantee a fixed number of viewers, clicks, enquiries, sales, complete video plays or endorsement. To avoid excessive repetition, GSN will not automatically give the same recognised person a sixth qualifying view of the same advert during the authoritative service day.
>
> Pipeline Credits are service credits. They are not cash, savings, a bank balance, a transferable asset or a right to cash out.

This wording is a draft and must not be published until the outstanding choices below receive founder, legal and accounting approval.

### 4.2 Recommended launch defaults

| Choice | Recommended default | Status |
| --- | --- | --- |
| Audience scope | One named eligible community per credit and booking. A second community requires a separate booking and credit. | Recommended; founder approval required. |
| Timezone | The selected community/programme IANA timezone is authoritative. | Already implemented; operational approval still required. |
| Morning | 05:00â€“12:00 local time. | Recommended simulation default, not yet a published promise. |
| Afternoon | 12:00â€“18:00 local time. | Recommended simulation default, not yet a published promise. |
| Evening | 18:00â€“00:00 local time. | Recommended simulation default, not yet a published promise. |
| Overnight | No allocation in the basic product. | Recommended and consistent with the current 10/10/10 design. |
| Booking cutoff | Book before 00:00 local time on the previous day; later requests move to the next complete service day. | Recommended. |
| GSN underdelivery | Restore one full Pipeline Credit for an affected basic package, once, with the original shortfall preserved. | Implemented remedy; founder must approve it as the customer promise. |
| Replacement service | Offer the restored credit for a replacement service day before considering cash refund. | Recommended. |
| Replacement target | Complete replacement within 14 calendar days where capacity exists. | Recommended; not implemented as a deadline. |
| Customer cancellation before reservation | No debit and no service obligation. | Recommended. |
| Customer cancellation after reservation but before cutoff | Restore service credit once if capacity can be released cleanly. | Recommended; requires explicit rule and implementation check. |
| Merchant-caused late cancellation or rejected content | No automatic cash refund; preserve statutory rights and allow operator review. | Recommended; legal approval required. |
| Cash refund | Only where legally required or GSN cannot provide approved replacement service; authorised operator and canonical payment record required. | Recommended; authority not yet activated. |

### 4.3 Choices that must remain open

- Whether the basic audience is always one named community or can include a separately priced regional product.
- Final local clock windows and booking cutoff.
- Whether any shortfall restores a whole credit, as currently implemented, or whether a future separately approved product uses proportional service.
- Credit/replacement expiry.
- Customer cancellation timing and charges.
- Cash-refund authority, approval level and funding source.
- Sponsor cancellation and unused sponsor-funded balances.
- Prohibited/restricted advert categories and moderation appeal.
- Whether the current aggregate-reach suppression threshold of five is approved for live customer reports.
- VAT/tax treatment and invoicing wording.

Do not silently decide these through UI copy.

## 5. Financial policy framework

### 5.1 Accounting boundary

- **Cash collected** is not automatically earned revenue.
- **Credits purchased** are not the same as credits spent.
- **Credits spent** are not earned revenue until the authorised service is fulfilled and no related original or restored service obligation remains open.
- Merchant-funded and sponsor-funded activity may become revenue only with independently confirmed cash.
- Gifted, waived and house activity is not customer revenue.
- A restored Pipeline Credit is not a cash refund.
- A replacement campaign is not a cash refund.
- Direct campaign delivery cost is separate from general company overhead.
- A Shop open, contact or message is not a sale.

### 5.2 Per-booking cost and contribution model

For each cash-backed booking or acquisition batch, record:

```text
gross_cash_collected                       G
less tax/VAT collected or payable          T
less provider processing and chargebacks   P
less direct delivery compute/egress         D
less media storage/CDN allocation           S
less moderation labour                      M
less support/reconciliation labour          U
less approved community allocation          C
less expected remedy/replacement cost        L
= direct contribution before overhead
```

Where:

```text
P = provider fixed fee + provider percentage fee + actual disputes/refunds
M = moderation minutes * approved loaded hourly rate / 60
U = support/reconciliation minutes * approved loaded hourly rate / 60
C = approved allocation rate * approved distributable base
L = observed shortfall probability * observed replacement direct cost
```

Company overhead, founder time not attributable to a booking, product development and general administration must be reported separately. They can inform pricing and break-even analysis but must not be disguised as campaign-specific delivery cost.

### 5.3 Observed costs versus assumptions

| Cost | Current status | Required evidence |
| --- | --- | --- |
| Payment processing | Unobserved for live Spotlight. Earlier documents cite public provider examples, not GSN transactions. | Signed provider tariff plus actual pilot transaction statement. |
| Delivery compute/egress | Unobserved per Spotlight booking. | Production telemetry and invoice allocation methodology. |
| Storage/CDN | Unobserved per advert/service day. | Stored bytes, transformations, egress and provider invoice. |
| Moderation | Unobserved. | Minutes per advert, rejection/rework rate and approved loaded hourly rate. |
| Support/reconciliation | Unobserved. | Minutes per booking, exception rate and approved loaded hourly rate. |
| Community allocation | No approved Spotlight rate or base. | Founder/accounting policy and recipient eligibility. |
| Remedy cost | Technical remedy exists; economic cost unobserved. | Shortfall rate and replacement delivery cost. |
| Tax/VAT | Unresolved. | Accountant/legal advice for service-credit sales and sponsor funding. |

The GBP 0.50 unit price is commercially fragile if collected as individual 50p card transactions because any fixed processing fee can consume a large share of revenue. Cash acquisition should therefore use approved bundles rather than one payment per credit.

For a target maximum processing share `r`, provider fixed fee `f` and provider percentage `p`, the minimum sensible basket is:

```text
minimum_basket = f / (r - p), where r > p
```

No bundle value should be approved until the actual provider tariff is known.

### 5.4 Outstanding service obligations

- Cash received for unfulfilled service remains deferred/unearned.
- An open restored credit remains a service obligation even when it has been attached to a replacement booking.
- Until accounting policy is approved, the conservative operational exposure is the unfulfilled credit face value, currently GBP 0.50 per credit, plus expected direct replacement cost.
- The current whole-credit remedy means a one-opportunity shortfall can create a full one-credit replacement obligation. That protects the customer but can materially increase remedy cost; it must be measured during the pilot.

## 6. Payment readiness

### 6.1 Existing reusable chain

The current authorities already provide most of the correct control pattern:

1. Create an expected payment with a unique reference.
2. Ingest and deduplicate the bank/provider event.
3. Match deterministically by community/account context, normalised reference, currency and amount.
4. Preserve partial and ambiguous payments without guessing.
5. Require a canonical successful credit before downstream application.
6. Apply the result idempotently to the Pipeline Credit ledger after reconciliation truth commits.

The existing top-up application uses the idempotency key `pipeline-credit-topup:expected-payment:{id}`.

### 6.2 Blocking mismatch

The legacy application currently reads `pipeline_credit_amount` or the expected cash amount and allocates that numeric quantity. The established test confirms GBP 8 produces 8 credits. Spotlight's approved tariff requires GBP 8 to produce 16 credits.

Therefore, the legacy top-up must not be connected unchanged to paid Spotlight.

### 6.3 Minimum remaining integration work

1. Approve and version an acquisition pack whose cash-to-credit quantity matches two credits per GBP 1.
2. Pin acquisition-pack id/version, cash amount, credit quantity, currency, buyer/account and purpose into the expected payment metadata.
3. Reuse canonical bank/provider reconciliation; do not infer cash from a credit allocation.
4. Allocate the exact quoted credit quantity only after full confirmed reconciliation.
5. Link the ledger allocation to the expected payment, canonical bank event and acquisition-pack version.
6. Permit Spotlight spend only from the resulting authoritative balance.
7. Add focused tests for partial payment, duplicate webhook, retry, overpayment, underpayment, currency mismatch, stale pack version, refund/chargeback and no allocation before full confirmation.
8. Keep real collection and spending disabled until a separate release decision.

The broad `GSN_PAYMENT_OPERATIONS_ENABLED` gate should not be enabled merely to launch Spotlight. Add or approve a service-scoped paid-Spotlight payment authority layered over the global safety gate, or prove and explicitly approve every other payment mutation that the global gate would expose.

## 7. Settlement readiness

### 7.1 Existing reusable authority

The advertising revenue service already supports:

- expected-payment and canonical bank-event links;
- payment-confirmed and delivery-finalised states;
- idempotent community earning records;
- payout mandates and externally confirmed manual payout records;
- separation of direct campaign cost from company overhead.

Slice 3A adds a correct non-posting readiness classification:

- `merchant_paid` and `sponsor_funded` can become revenue only with confirmed cash, fulfilled service and no open original/restored obligation;
- `gifted`, `waived` and `house` cannot be reported as customer revenue.

### 7.2 Remaining bounded integration

The persisted settlement flow currently calls `_require_house_campaign()`. Do not create another revenue ledger. Extend the existing authority so a settlement can reference an authorised Spotlight commercial booking while preserving the house path.

The minimum change should:

1. Add an explicit, auditable Spotlight commercial booking reference to the existing settlement authority.
2. Link the confirmed expected payment, canonical bank event, acquisition-pack allocation, credit spend and commercial booking.
3. Post revenue only when the booking is fulfilled and all related service obligations are closed.
4. Post refunds, credit restorations and replacement service as distinct events.
5. Retain funding classification so merchant, sponsor, gifted, waived and house activity cannot be blended.
6. Reuse existing community earning and payout controls only after an allocation rate, distributable base and recipient rule are approved.
7. Add idempotency and reversal tests; never count the same cash, revenue, cost, community allocation or liability twice.

The existing house-campaign community-share default must not be treated as an approved merchant-Spotlight promise. It may be used only for shadow sensitivity analysis until founder/accounting approval.

## 8. Controlled merchant pilot

### 8.1 Purpose

The first paid pilot should test operational integrity, willingness to pay, delivery cost and repeat intent. It cannot prove long-term demand, sales uplift or break-even.

### 8.2 Proposed design

| Element | Proposed pilot boundary |
| --- | --- |
| Locality | One active community in Aberdeen, Scotland; authoritative timezone `Europe/London`. |
| Capacity prerequisite | Complete Section 3 measurement and recorded operator approval before any paid booking. |
| Merchants | Up to five verified merchants with an active Shop/product, content rights, truthful offer, support contact and no restricted goods. |
| Cohort security | Server-side pilot entitlement/allowlist; not UI hiding alone. |
| Service volume | Maximum ten paid basic bookings across ten service days; initially no more than one package per day. |
| Merchant limit | Maximum two paid service days per merchant in this pilot. |
| Buyer activation | Existing authenticated community members through one admin-approved community notice and ordinary Spotlight/Marketplace use. No forced refresh, bots, paid external traffic or public-discovery dependency. |
| Gross service value | Ten credits at GBP 0.50 = GBP 5 if every planned booking is paid. |
| Remedy liquidity | Ring-fence GBP 5, equal to 100% of pilot gross, until every service/refund obligation closes. This is held exposure, not automatically an additional cost. |
| External cash-spend ceiling | Proposed maximum GBP 100 for incremental provider, communication or storage charges, only with receipts and prior approval. |
| Labour envelope | Maximum 12 operator/support hours; value at an approved loaded hourly rate rather than treating labour as free. |
| Public discovery | Remains off unless separately approved. The pilot is community-authorised. |

The GBP 5 gross is deliberately small. It is enough to test cash-to-credit-to-service integrity, but it is not enough to validate a sustainable revenue model.

### 8.3 Responsibilities

- **Platform operator:** capacity calibration, cohort permission, payment reconciliation, booking review, daily delivery reconciliation, remedy/refund decision, financial close and incident stop.
- **Community administrator:** confirms community eligibility, approves the ordinary member notice and handles community-level concerns.
- **Merchant:** owns advert truth, rights, current price/availability, lawful content and enquiry response.
- **Finance/accounting reviewer:** approves tax, revenue recognition, liability, refund and community-allocation treatment before real cash activation.
- **Support owner:** maintains one incident channel and records time and resolution for every exception.

### 8.4 Monitoring

Review daily:

- expected cash, canonical bank event and credit allocation;
- quoted, spent and remaining credits;
- reserved, made-available, visible and missed opportunities;
- qualifying impressions and privacy-protected reach;
- frequency suppression;
- open shortfalls, restored credits and replacement obligations;
- moderation, support, processing, storage and delivery cost;
- merchant enquiry/repeat intent, without reporting an enquiry as a sale.

### 8.5 Stop conditions

Stop immediately for:

- privacy or permission breach;
- duplicate debit, booking, restoration, refund or revenue entry;
- cash/credit mismatch or non-canonical payment allocation;
- booking without calibrated capacity;
- unauthorised or prohibited advert;
- report totals that cannot reconcile to authoritative records.

Pause new sales for:

- any unresolved underdelivery or remedy older than 24 hours;
- two underdelivered bookings during the pilot;
- repeated serving/visibility acknowledgement failure;
- average manual support above 30 minutes per booking;
- measured direct variable cost above 50% of gross cash;
- loss of the named operator, support owner or community approval.

The 24-hour, 30-minute and 50% thresholds are proposed pilot controls, not observed limits.

### 8.6 Pilot success gate

- Every cash receipt, credit allocation, spend, booking, settlement status and service obligation reconciles.
- Every booking is fulfilled or receives a correctly recorded remedy within 24 hours.
- No privacy, permission or financial-integrity incident occurs.
- Actual direct cost and staff time are captured.
- At least two merchants voluntarily request a second booking, as an early commercial signal rather than proof of product-market fit.

## 9. Release checklist

### 9.1 Engineering and data

- [ ] Candidate remains based on `29b06f02bde92652901dad5c4b9df01fcefd8133` plus reviewed bounded integration only.
- [ ] Alembic dry run and production migration plan confirm head `20261121_spotlight_slice3a_integrity` or its reviewed successor.
- [ ] Database backup, restore rehearsal and record export procedure complete.
- [ ] No historical presentation attribution is fabricated for pre-Slice-3A records.
- [ ] Acquisition-pack cash conversion is connected and tested at two credits per GBP 1.
- [ ] Merchant/sponsor settlement posting extends the existing authority and passes idempotency/reversal tests.
- [ ] Server-side pilot cohort entitlement exists.
- [ ] Spotlight-specific payment activation boundary exists or the global payment gate receives explicit whole-system approval.

### 9.2 Capacity and operations

- [ ] Required production telemetry is available and reconciled.
- [ ] Fourteen-day measurement procedure is complete for the pilot community.
- [ ] Signed capacity evidence supports 10/10/10 after existing obligations and 50% launch safety factor.
- [ ] One-package-per-day pilot ceiling is configured operationally.
- [ ] Daypart timezone/DST checks pass for the planned dates.
- [ ] Named operator, support owner, community admin and finance reviewer accept responsibilities.
- [ ] Incident, hold, withdrawal, remedy and refund runbooks are rehearsed.

### 9.3 Commercial and privacy

- [ ] Customer terms receive founder, legal and accounting approval.
- [ ] Audience scope, clock windows, cutoff, cancellation, replacement, expiry and cash-refund choices are resolved.
- [ ] Tax/VAT and invoice treatment are approved.
- [ ] Community allocation rate, base and eligibility are approved or explicitly set to no promised allocation for the pilot.
- [ ] Restricted content and moderation appeal rules are approved.
- [ ] Merchant reports remain aggregate and suppress recognised reach below five.
- [ ] No report exposes viewer identity or claims a sale from a Shop open/contact.
- [ ] Public discovery remains separately gated and off unless separately released.

### 9.4 Payment and accounting controls

- [ ] Provider credentials and webhook verification are configured outside source control.
- [ ] Expected-payment references, partials, duplicates, ambiguity and currency mismatch are rehearsed.
- [ ] Approved acquisition-pack version is pinned to each payment.
- [ ] Commercial control moves through `shadow` before any separately authorised `enforced` activation.
- [ ] Gifted, waived, house, sponsor and merchant funding remain distinct.
- [ ] Cash collected, deferred obligation and earned revenue reports reconcile.
- [ ] Refund authority and bank source are named.
- [ ] Community earning/payout records cannot be created before approved settlement eligibility.

### 9.5 Feature flags and permissions

Keep disabled until the explicit release decision:

- `GSN_PAID_SPOTLIGHT_V1_ENABLED=0`
- `GSN_PAYMENT_OPERATIONS_ENABLED=0`
- `GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED=0`
- `GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED=0`

Before release, verify rather than assume:

- Platform-admin-only capacity calibration, lifecycle, reconciliation and remedy authority.
- Merchant campaign ownership for merchant-funded quotes.
- Platform-admin authority for sponsor, gifted, waived and house funding.
- Pilot-cohort entitlement for every customer-facing paid action.
- A service-scoped payment activation gate in addition to the global emergency gate.
- Command Centre access and audit history for authorised operators only.

### 9.6 Rollback

1. Set the paid-Spotlight and service-scoped payment flags off.
2. Set Pipeline Credit commercial control to `suspended` with a decision note.
3. Block new quotes, spends and bookings while preserving reports and obligations.
4. Keep payment reconciliation available to resolve cash already received; do not discard unmatched or partial events.
5. Honour or explicitly resolve existing bookings, refunds and restored-service obligations.
6. Preserve historical records and audit events; do not delete bookings, impressions or financial entries.
7. Revert application commits only after data compatibility review.
8. Downgrade additive migrations only if no dependent production records exist and after an approved export/restore checkpoint.

## 10. Concise decision register

### 10.1 Agreed founder decisions

- GBP 0.50 equals one Pipeline Credit.
- One credit purchases 30 scheduled opportunities.
- Allocation is 10 morning, 10 afternoon and 10 evening.
- The purchased unit is a scheduled opportunity, not an impression or guaranteed viewer.
- There is no fixed viewer, enquiry or sales guarantee.
- The same recognised viewer does not receive an automatic sixth qualifying view of the same advert during the authoritative day.
- Additional credits, overlapping communities and duplicate batches do not reset that frequency count.
- Merchant, sponsor, gifted, waived and house funding must remain distinguishable.
- Cash collection, credit purchase, credit spend, delivery and earned revenue must remain distinguishable.
- Real payments, deployment, public-discovery activation, outreach and `main` promotion remain outside this package.

### 10.2 Recommended launch defaults

- One named authorised community per credit and service day.
- `Europe/London` for the proposed Aberdeen pilot.
- Morning 05:00â€“12:00, afternoon 12:00â€“18:00, evening 18:00â€“00:00; no overnight basic allocation.
- Previous-local-midnight booking cutoff.
- Whole-credit restoration once for any affected basic package, replacement service first, cash refund only by approved exception or law.
- At least 14 days of measurement, 50% launch safety factor and one paid package per community/day initially.
- One Aberdeen community, five merchants, ten bookings, GBP 5 gross target, GBP 5 remedy reserve, GBP 100 external-spend cap and 12 operator/support hours.
- Production acquisition through approved cash bundles rather than individual 50p card charges.

### 10.3 Operational measurements still needed

- Genuine made-available turns by community/daypart and comparable day type.
- Visible presentation and qualifying-impression conversion from supplied opportunities.
- Recognised reach at privacy-safe aggregation.
- Missed-turn and shortfall rate by reason.
- Concurrent campaign/headroom behaviour under production traffic.
- Provider processing, failure, refund and chargeback cost.
- Compute, egress, storage/CDN, moderation, support and reconciliation cost.
- Whole-credit remedy frequency and replacement cost.
- Merchant willingness to pay, repeat-booking intent and buyer response.

### 10.4 Genuine blockers requiring approval or bounded integration

1. Approve final audience scope, clock windows, cutoff, cancellation, remedy, expiry and cash-refund terms.
2. Approve tax/VAT, revenue recognition, direct-cost and community-allocation policy.
3. Connect versioned acquisition packs to canonical payment reconciliation at two credits per GBP 1.
4. Extend the existing settlement authority from house-only campaigns to authorised merchant/sponsor Spotlight bookings.
5. Add a service-scoped payment activation boundary; do not rely solely on the broad global payment gate.
6. Add a server-side pilot-cohort entitlement/allowlist.
7. Produce and approve real production capacity evidence.
8. Name the operator, support owner, community administrator, finance reviewer and refund approver.

## 11. Explicit release decision required

No current evidence supports activating real sales. A future go/no-go decision should occur only after the blockers in Section 10.4 are closed and the checklist evidence is attached to the exact candidate revision and configuration proposed for release.
