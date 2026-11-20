# GSN Spotlight Rotation and Impression Protocol Audit

Date: 20 November 2026
Audit revision: d4ab1773545a0d123858f26eb09d8572dd1c5e3a
Source protocol: GSN Spotlight Rotation and Impression Protocol, version 1.0
Status: source-level audit and decision record only

## 1. Executive verdict

The protocol proposes a clear paid Spotlight product:

- one Pipeline Credit costs GBP 0.50;
- one credit buys 30 scheduled Spotlight opportunities for one eligible advert on one campaign day;
- allocation is 10 morning, 10 afternoon and 10 evening;
- GSN sells scheduled availability, not guaranteed people, views, clicks or sales;
- a recognized viewer should automatically see the same advert no more than five qualifying times per authoritative day;
- payment must remain suspended until allocation, frequency, reporting, remedy and accounting controls are complete.

The current repository does not implement that commercial contract.

It has strong reusable foundations: authenticated viewer identity, campaign and placement records, content versions, community eligibility, bounded presentation leases, visibility qualification, idempotency, transactional impression accounting, campaign pacing, exposure evidence and a narrow timed-opportunity model for GSN-HOUSE campaigns.

The central conflict is structural. Ordinary member Spotlight currently consumes a campaign delivery round only when one viewer completes a qualifying presentation. The proposed protocol sells scheduled opportunities that exist independently of whether any viewer appears and may potentially produce several impressions when several eligible viewers are present. Those are different products and accounting models.

The honest decision is:

1. Preserve the payment suspension.
2. Do not relabel current delivery rounds as the new 30-opportunity product.
3. Settle opportunity and community-scope definitions before schema or payment work.
4. Reuse current qualification, identity, eligibility and evidence controls behind a new opportunity ledger.
5. Test the new model in shadow mode before promising paid delivery.

## 2. Security and source boundary

Only the protocol content was used. Unrelated webpage and session material appended after the protocol was excluded. The product owner was warned that the supplied attachment appeared to include sensitive session information. No credential or token is reproduced here.

## 3. Current Spotlight architecture

### 3.1 Serving model

The canonical Public Shop Spotlight endpoint requires an authenticated user. It selects eligible campaigns for that stable user account, not an anonymous browser fingerprint.

The current flow is request-driven:

1. An authenticated viewer opens Public Shop Spotlight.
2. GSN evaluates campaign, placement, membership, community, lifecycle, pacing and frequency eligibility.
3. GSN issues one bounded presentation lease.
4. Issuance reserves access but does not consume a delivery round.
5. The browser must keep the advert at least 60 percent visible for at least one continuous second while the document is visible.
6. The server revalidates the lease and eligibility.
7. Round consumption, qualifying-impression evidence and lease completion are committed together.
8. A retry is idempotent and cannot create a second impression.
9. Tokenless replay and visibility continuity do not consume another round or create another impression.

This is a sound qualified-view contract. It is not a scheduled-inventory contract.

### 3.2 Current pacing

Ordinary campaigns default to:

- 10 maximum delivery rounds;
- one requested delivery slot at a time;
- a default 60-minute pacing interval;
- campaign-level persistent consumed-round state;
- no morning, afternoon or evening entitlement split.

A delivery round is campaign-level, not per community and not per viewer queue. It is consumed only after qualification.

The lease service also permits only one live issued reservation for the same campaign content version at a time. That prevents independent concurrent presentation of the same advert to several viewers during one shared slot.

### 3.3 Current timed-opportunity model

GSN-HOUSE campaigns have a narrow timed exception that can store:

- an absolute start and end;
- an anchored interval;
- a timezone label;
- requested, due, qualified and unfilled-due counts.

This is useful prior art, but it is not the proposed member-paid product. It is platform-admin only, has no payment effect, and reports unfilled due slots by subtracting qualified presentations from due slots. That does not distinguish zero audience from technical failure, cancellation or an opportunity genuinely made available with no impression.

### 3.4 Current frequency control

Current automatic frequency control is:

- two qualifying impressions per viewer per campaign over the recorded campaign lifetime;
- one additional DemandBox-relevant override, allowing a third;
- keyed by campaign ID;
- not restricted to a calendar or service day;
- reset in practice by creating a different campaign ID.

This does not implement five per recognized viewer per day. A repurchase or duplicate campaign can create a new campaign ID and a new counter.

### 3.5 Current media timing

Current Public Shop presentation is media-aware:

- image dwell: five seconds;
- video dwell: reported duration clamped to eight to ten seconds;
- missing video duration: ten seconds;
- reduced-motion dwell: 30 seconds;
- qualification: one second at 60 percent visibility in an active document.

Ten seconds is not the current universal slot duration. It can be a conservative planning quantum, but must not be sold as an existing playback promise.

### 3.6 Current commercial rails

Three overlapping rails exist:

1. Legacy Subscription Spotlight treats one credit as one day and prices one to five credits at GBP 1 each, with six for GBP 5.
2. Member-credit Spotlight can activate a single-day campaign, but its writer is gated and its paid funding path obeys payment suspension.
3. Pipeline Credit commerce catalogues paid_spotlight.day as an unconnected service.

None implements GBP 0.50 = 30 opportunities. Legacy GBP 1-per-day directly conflicts with the proposed price and quantity.

Payment operations correctly default to suspended for the free pilot. That protection must remain.

## 4. Requirement audit

| Protocol requirement | Status | Current evidence and gap |
| --- | --- | --- |
| One credit costs GBP 0.50 | Absent/conflict | Legacy Spotlight is GBP 1 per day or six for GBP 5. Pipeline paid Spotlight is unconnected. |
| One credit buys 30 scheduled opportunities | Absent/conflict | Ordinary campaigns default to 10 qualified delivery rounds; no paid opportunity entitlement exists. |
| 10 morning, 10 afternoon, 10 evening | Absent | No daypart entitlement or period-fulfillment records exist. |
| No five-person audience target or minimum three views | Conceptually compatible | Current code does not promise either, but no paid report states this contract. |
| Opportunity distinct from impression | Partial | GSN-HOUSE has due slots and qualified counts; ordinary Spotlight consumes its round only on a qualifying impression. |
| Zero-view opportunity can be supplied honestly | Absent | No authoritative availability record proves that a paid slot was open and healthy when no viewer appeared. |
| Five qualifying impressions per recognized viewer per day | Absent/conflict | Current limit is two per campaign lifetime plus one DemandBox override. |
| Repeat purchase does not reset cap | Absent | Campaign ID is the frequency key; a new campaign starts a new counter. |
| Same advert resists edit/reupload bypass | Partial foundation | Content fingerprints and product IDs exist, but frequency lacks stable offer identity and fingerprints change with edits. |
| Different products remain separately promotable | Partial foundation | Product IDs exist, but no offer-identity merge/split policy exists. |
| Stable identity across sessions and devices | Present for signed-in viewers | Viewer user ID is authoritative; the endpoint is authenticated. |
| Honest guest limitation without fingerprinting | Present by exclusion, incomplete in copy | Anonymous canonical Spotlight is unsupported; no invasive fingerprinting was found. |
| Advertiser cannot see viewer identities | Present | Current owner reporting exposes aggregates, not viewer lists. |
| Morning, afternoon and evening standard windows | Absent | Timed support can hold windows, but no standard daypart policy exists. |
| One authoritative daily timezone boundary | Absent | No advert service-day boundary or anti-reset rule exists. |
| Device timezone cannot reset frequency | Absent | No daily frequency boundary exists. |
| Overnight free allocation | Undecided and absent | Must remain outside the paid promise until approved. |
| Capacity admission before sale | Absent | No daypart inventory reservation or oversell guard exists. |
| Concurrent and overlapping-community behavior | Partial/unfit | Routing exists, but one campaign-version lease globally blocks concurrency and community inventory is undefined. |
| Idempotent qualification | Present | Viewer, idempotency and lease controls prevent duplicate accounting. |
| Active-tab and visibility qualification | Present | One second, 60 percent visible, document visible, server revalidation. |
| Owner/self-delivery exclusion | Present | Owner is excluded and owner preview cannot qualify. |
| Fair candidate allocation | Partial | Frequency ordering, diversity and pacing exist; no paid daypart fairness or booking priority exists. |
| Missed-opportunity reason codes | Absent for paid service | Selection reasons exist, but no durable paid opportunity lifecycle records them. |
| Underdelivery remedy/refund/restoration | Partial foundation, operationally absent | Settlement can record refunds; no Spotlight entitlement remedy is connected. |
| Promised and supplied opportunities by period | Absent | GSN-HOUSE reports aggregate due slots, not paid daypart fulfillment. |
| Impressions and unique recognized reach | Partial | Campaign reports count qualifying events and distinct viewer accounts. |
| Frequency buckets one through five | Absent | No daily advertiser frequency report exists. |
| Over-five diagnostic | Absent | No five-view rule or diagnostic exists. |
| Identity coverage caveat | Absent in advertiser product | Reporting must explain recognized signed-in coverage. |
| Paid activation remains off | Present | Global payment operations are suspended by default. |

## 5. Definition that must be settled first

The protocol uses scheduled opportunity as the sold unit, but two materially different interpretations remain.

### Model A: one opportunity can serve several concurrent viewers

For ten seconds, the advert is eligible in one shared community lane. Every eligible active viewer may receive a separate presentation, subject to the five-per-day cap. The opportunity can produce zero, one or several impressions.

Benefits:

- matches the statement that 30 opportunities are not necessarily capped at 30 impressions;
- makes audience size valuable without promising reach;
- resembles shared advertising inventory.

Costs and risks:

- the global one-lease-per-campaign-version rule must change;
- opportunity fulfillment must be separate from viewer leases;
- concurrency, fairness and overlapping-community rules become mandatory;
- one high-concurrency slot can create more impressions than another;
- cost per impression is variable and cannot be promised.

### Model B: one opportunity is one viewer presentation chance

Each opportunity can produce at most one qualifying impression. Thirty opportunities therefore means at most 30 qualifying impressions.

Benefits:

- close to current delivery-round architecture;
- simpler capacity, accounting and idempotency;
- easier to test and explain internally.

Costs and risks:

- conflicts with the statement that 30 opportunities need not mean a maximum of 30 impressions;
- behaves more like impression inventory than shared scheduled rotation;
- can make the product weak in an active community.

### Audit recommendation

Adopt Model A as the intended destination only if management confirms it explicitly. It best matches the protocol, but it is not a small extension of current code.

Under Model A:

- Entitlement: purchased right to 30 opportunity slots on one service day.
- Opportunity slot: one deterministic interval when one advert is eligible in one specified community lane.
- Supplied opportunity: the slot opened on time, eligibility was available and serving was healthy, whether or not a viewer appeared.
- Audience-empty supplied opportunity: supplied successfully, zero eligible viewers requested the surface, zero impressions.
- Impression: one separate recognized viewer presentation meeting existing visibility qualification.
- Platform-missed opportunity: the slot did not become available because of GSN capacity, scheduler, serving or policy error.
- Advertiser-invalid opportunity: the advert became ineligible through expiry, withdrawal, invalid content or advertiser action.
- Cancelled opportunity: cancelled under approved policy.

This keeps the promise honest: GSN can supply an opportunity without pretending a person viewed it.

## 6. Community-scope ambiguity

Authorized community rotation does not yet state whether GBP 0.50 buys:

- 30 opportunities in one community;
- 30 opportunities spread across every authorized community; or
- 30 opportunities in each authorized community.

These have radically different inventory and revenue consequences.

Recommendation for the first paid pilot:

- one credit = one advert + one community + one local service day + 30 opportunities;
- a multi-community campaign creates one separately priced order line per community;
- each order line has its own timezone, capacity reservation, fulfillment report and remedy;
- overlapping members count as separate impressions only on separate qualifying presentation occasions;
- one viewing event must never be duplicated merely because the viewer belongs to two communities.

This is less generous than an all-communities interpretation, but it is auditable, prevents hidden overselling and gives GBP 0.50 a defensible denominator. If one credit should cover multiple communities, the maximum scope and capacity formula must be stated first.

## 7. Frequency identity recommendation

Do not use campaign ID or a fuzzy device identity for the five-per-day rule.

Create a stable advert or offer identity:

- product promotion: shop ID plus source product ID mapped to one immutable offer identity;
- edits to price, wording, image or video retain that identity;
- buying more credits or creating a new campaign retains that identity;
- a genuinely different product receives a different identity;
- non-product campaigns receive an explicit immutable identity at creation;
- split or merge corrections require an auditable operator action, not an advertiser-controlled reset.

The daily key should be:

recognized viewer user ID + offer identity ID + authoritative service date.

Do not use IP addresses, device fingerprints or probabilistic cross-device matching. Logged-out activity must be excluded from recognized reach/frequency or reported separately as unrecognized, never silently merged.

## 8. Time and daypart recommendations

### 8.1 Authoritative clock

Recommended rule:

- each order line stores an IANA timezone identifier from the purchased community;
- its service date and daypart boundaries are derived once and persisted in UTC;
- the viewer device timezone never changes that boundary;
- daylight-saving transitions use timezone rules, not a fixed user offset;
- multi-community campaigns use separate order lines because communities can have different local days.

### 8.2 Late booking

Recommended first-pilot rule:

- sell a complete 10/10/10 package only before the community 05:00 service-day start;
- later purchases begin on the next service day;
- do not compress missed morning opportunities into later periods;
- design a flexible same-day product only after demand evidence exists.

This is less instant but prevents allocation and refund disputes.

### 8.3 Ten-second duration

Treat ten seconds as a capacity-planning quantum, not an existing playback guarantee. Current image dwell is five seconds and video dwell is eight to ten seconds.

Before paid launch, management must either:

- standardize a paid lane to a real ten-second availability window; or
- sell opportunity units without quoting duration and calculate internal capacity from governed media dwell.

The first option is easier to audit, but changes frozen presentation behavior and requires an explicit approved exception and tests.

### 8.4 Overnight

Keep 00:00-05:00 outside the paid entitlement in the first pilot. It may be reserved for GSN-HOUSE, make-good, testing or future free rotation, but must not be sold as a benefit until allocation and reporting are approved.

## 9. Capacity arithmetic

If one community has one strictly sequential ten-second shared lane:

- morning 05:00-12:00 contains 2,520 theoretical slots;
- afternoon 12:00-18:00 contains 2,160;
- evening 18:00-00:00 contains 2,160;
- all paid periods contain 6,840;
- one campaign consumes 10 slots in each period, or 30 daily;
- afternoon and evening are the bottleneck;
- theoretical maximum is 216 complete 10/10/10 campaigns per community per day;
- at GBP 0.50 each, theoretical gross is GBP 108 per community per fully sold day;
- annual theoretical gross at continuous 100 percent sell-through is GBP 39,420 per community before VAT, refunds, payment fees, infrastructure, moderation, support, community share and unsold inventory.

This is not a forecast. It is an upper-bound illustration based on assumptions that are neither implemented nor validated.

Operational headroom reduces safe saleable capacity. The scheduler must reserve room for failures, house messages, clock drift and make-good obligations. A pilot should not sell the theoretical maximum.

Under Model A, slot capacity remains 216 campaigns per community per day, but impressions are audience-driven and variable. The current one-live-lease restriction would need replacement by one opportunity plus separate per-viewer leases.

## 10. Financial and legal cautions

GBP 0.50 is a management hypothesis, not validated willingness to pay.

At this price:

- payment processing can consume a large share if credits are bought singly;
- refunds and support can make a small purchase uneconomic;
- VAT treatment matters materially;
- community revenue share reduces platform contribution;
- buyers may mistake 30 opportunities for 30 people unless copy is exact;
- credit packs or a prepaid service-credit balance are more viable than isolated 50p transfers.

Pipeline Credit must remain a non-cashable service right, not a customer-funds wallet. Purchase price, credit quantity, tax receipt, service spend and restored-credit remedy must be separate accounting events.

Management must decide whether GBP 0.50 is VAT-inclusive or exclusive in each market and obtain accounting/legal confirmation. Code must not guess.

## 11. Underdelivery and remedy recommendation

Recommended first-pilot policy:

- supplied with zero audience: no refund, because the opportunity was genuinely available;
- platform-missed: restore one equivalent opportunity in the same daypart on the next available service day;
- if same-daypart restoration cannot complete within a stated window, restore proportional Pipeline Credit;
- advertiser-invalid or advertiser-cancelled: apply the disclosed cancellation rule;
- policy-blocked after purchase through a GSN error: restore the affected entitlement;
- earned or promotional credits restore as credits, never cash;
- purchased-credit cash refunds use the original payment method and applicable law only after finance approval.

Every remedy must reference original order-line and opportunity IDs. A manual balance edit is not fulfillment evidence.

## 12. Reporting contract

Per advert, community, service date and daypart, report:

- promised opportunities;
- supplied opportunities;
- audience-empty supplied opportunities;
- platform-missed opportunities;
- advertiser-invalid or cancelled opportunities;
- restored or refunded opportunities;
- qualifying impressions;
- unique recognized viewer accounts;
- recognized frequency buckets one, two, three, four and five;
- over-five diagnostic count, expected to be zero;
- clicks or contact actions as separate outcomes;
- a note that impressions are not sales, trust, endorsement or verified purchase;
- a note that recognized reach/frequency excludes anonymous or unrecognized people.

Advertisers must not receive viewer names, GSN IDs, phone numbers, community membership details or event-level identity data.

## 13. Preservation map

Preserve and reuse:

- authenticated user ID as recognized viewer identity;
- campaign, placement and content-version lifecycle controls;
- exact-owner self-delivery exclusion;
- community and placement revalidation;
- 30-second presentation-token boundary;
- one-second, 60-percent-visible, active-document qualification;
- transactional round/impression/lease completion pattern;
- idempotency and retry safeguards;
- tokenless replay and visibility continuity as non-counting presentation;
- exposure evidence and aggregate unique-viewer reporting;
- payment suspension;
- non-cashable Pipeline Credit boundary;
- GSN-HOUSE timed scheduling as design reference, not the paid ledger.

Do not preserve as the new paid contract:

- 10 total qualified rounds;
- two lifetime campaign impressions plus one DemandBox override;
- campaign ID as frequency identity;
- global one-live-lease behavior if Model A is adopted;
- legacy GBP 1-per-day pricing;
- due minus qualified as the sole definition of underdelivery;
- unconnected paid_spotlight.day semantics.

## 14. Smallest safe implementation sequence

No step authorizes payment activation or deployment.

1. Approve Model A or B, one-community scope, timezone, late booking, duration, remedy, overnight use and VAT display.
2. Add immutable offer identity without changing current frequency behavior.
3. Add order-line, service-date, daypart-entitlement and opportunity-slot records with lifecycle reasons.
4. Build deterministic capacity allocation that rejects oversold dayparts before credit spend.
5. Run the allocator in shadow mode with free internal campaigns and record supplied, audience-empty and platform-missed slots.
6. Add the five-per-viewer, per-offer, per-service-day cap in shadow reporting and compare it with current control.
7. If Model A is approved, separate shared opportunity state from per-viewer leases and prove concurrency.
8. Add aggregate advertiser reporting and privacy tests.
9. Add automated make-good and credit-restoration reconciliation.
10. Connect one canonical Pipeline Credit service while payment remains suspended.
11. Run a no-money pilot and reconcile every promise, slot, impression and remedy.
12. Obtain legal, tax, accounting and customer-copy approval.
13. Only then consider a separate controlled paid-release decision.

## 15. Required acceptance tests

Future implementation must prove:

- one credit creates exactly 10/10/10 entitlements for the correct local date;
- two and three credits produce 60 and 90 slots without collision or compression;
- late booking cannot create retroactive morning fulfillment;
- capacity reserves atomically and concurrent purchases cannot oversell;
- a supplied zero-audience slot records no impression and no platform failure;
- a platform-missed slot produces exactly one remedy path;
- one viewer qualifies no more than five times for the same offer and service day;
- repurchase, campaign ID, wording edit or media edit does not reset that cap;
- a genuinely different product remains separately eligible;
- device timezone, login cycle and second device do not reset a recognized cap;
- anonymous activity is not falsely merged into recognized reach;
- overlapping community membership does not duplicate one event;
- concurrent viewers follow the approved Model A or B contract;
- hidden-tab, below-threshold, expired-token, owner-preview and off-screen events do not qualify;
- retries remain idempotent under process and database concurrency;
- replay and visibility continuity remain non-counting;
- frequency buckets reconcile to unique reach and impressions;
- over-five diagnostics remain zero under concurrency;
- advertiser reports contain no viewer identity;
- purchased, restored, promotional and spent credits remain distinguishable;
- payment suspension prevents charges, purchase awards and paid deductions until lifted.

## 16. Unresolved decisions and consequences

| Decision | Recommendation | Consequence if unresolved |
| --- | --- | --- |
| Opportunity concurrency | Approve Model A explicitly | Engineering cannot know whether 30 means at most 30 impressions. |
| Community scope | One credit per advert, community and day | Inventory and revenue cannot be reconciled. |
| Daily clock | Stored community IANA timezone and UTC boundaries | Frequency can reset inconsistently. |
| Late booking | Next complete service day | 10/10/10 cannot be guaranteed honestly. |
| Ten-second rule | Planning quantum until paid-lane approval | Capacity claims can contradict actual dwell. |
| Remedy | Make-good first, proportional credit restoration second | Underdelivery becomes a manual dispute. |
| Overnight | Exclude from paid launch | Free allocation can confuse paid inventory. |
| VAT/currency | Finance/legal approval before display | Price and margin may be misstated. |
| Multi-community price | Separate order lines | One cheap purchase can consume undefined inventory. |

## 17. Final decision statement

GSN has enough technical foundation to prototype this without rebuilding Spotlight. It does not yet have the commercial ledger, opportunity scheduler, stable advert identity, daily frequency rule, capacity admission, daypart fulfillment, remedy automation or reporting required to sell the promise safely.

Accept the protocol as a working product specification, subject to the unresolved decisions. Do not represent it as implemented, deployable or financially proven.

No product behavior, API, schema, price, permission, production data, payment state or deployment changed through this audit.
