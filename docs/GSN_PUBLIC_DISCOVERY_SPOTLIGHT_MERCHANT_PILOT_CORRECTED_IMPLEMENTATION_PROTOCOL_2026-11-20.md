# GSN Public Discovery, Spotlight and Merchant Pilot — Corrected Implementation Protocol
Company: Global Support Network Ltd
Prepared for: Chuma Nwafor and Codex
Date: 20 November 2026
Version: 1.3 — discovery-completion and Command Centre schedule revision
Status: Implementation handoff following the audit; preparation of this document does not activate product changes or the pilot.

Repository adoption note: this file contains only the safe protocol text through its stated definition of done. An unrelated account/session export appended to the supplied source was excluded completely. Version 1.3 uses `3ce16134e1b6a07b040099dbe7faad5bc626f7d3` as the public-discovery candidate baseline. It adds the bounded discovery-completion requirements and Command Centre Campaign Schedule in Section 9.4 without authorising deployment, production activation, real payments, outreach or owner notices.

Corrections governing this version
Use the agreed brainstorming for the intended commercial promise and the completed audit for evidence of existing code. An absence from code does not make an agreed management decision disappear. A recommendation in an audit does not automatically become an adopted price, policy or live setting.
Topic	Corrected instruction
Next task	Use the completed audit and check relevant subsequent changes. Proceed to bounded implementation preparation; do not restart a broad audit.
Spotlight unit	£0.50 buys one Pipeline Credit; one credit buys thirty scheduled opportunities, split 10/10/10. A chance merely to be considered is insufficient.
Frequency	Preserve the founder's five-view threshold. The proposed hard stop applies to the same advert, recognised viewer and authoritative day across bookings; no inherited Demand Box exception may allow a sixth under that policy.
Existing ten-round model	Separate scheduled opportunity supply from qualifying impressions. Replacing constants alone cannot implement the contract.
Domain pricing	Retain £24/month and £40/month as future candidates. The audited no-charge pilot remains the current implementation baseline.
Demand Box	Retain free pilot use and existing operational safeguards. Do not introduce superseded per-response charging.
Remedies	Verify precision and capabilities in the canonical Pipeline Credit service. Do not infer them from the separate integer member-credit test path.
Delivery evidence	Report entitlement, genuinely supplied opportunities, impressions, shortfall and remedy separately and traceably.
Discovery completion	Connect the existing `next_cursor` contract. When the scan limit applies, show partial coverage, minimum counts and truthful zero-result wording, and retain coverage state in search-usefulness evidence.
Command Centre schedule	Within the existing campaign page, show a protocol 1.3 programme board and accessible list that reconcile planning, booking, schedule, delivery and financial treatment without creating another scheduler or purchase route.


This version corrects conflicting language in the audit while preserving its factual implementation findings and its verdict that the proposed paid offer is not ready for launch.
1 Assignment and intended outcome
Connect, clarify and test the useful systems GSN already has. Start from the completed current-revision audit, verify the actual checkout and inspect only relevant changes since the audited code revision. Preserve working behaviour and complete the smallest missing connections needed for public commercial discovery, a coherent Spotlight service, reliable reporting and a bounded Scottish merchant experiment.

The intended sequence is public discovery and organic usefulness → complete Spotlight commercial chain → measured merchant pilot → better-supported financial assumptions. Instrumentation begins before the pilot. Community Domain packaging and Demand Box boundary work proceed alongside this sequence without becoming unnecessary gates for Spotlight.

The engineering outcome is a reviewable release candidate with traceable entitlement, delivery, financial records and focused verification. The commercial outcome is a pilot specification capable of measuring voluntary purchase, repeat choice, customer usefulness and actual delivery cost. Neither outcome establishes five-year commercial success by itself.

GSN's founding purpose remains helping people preserve and carry relevant evidence of their activities, contribution and experience into future opportunities. The product is a community commerce and opportunity network with a portable evidence ledger. Its proposed financial model is promotion-led mixed income. Everyday utility, evidence preservation and revenue are connected functions.

Use the official names GSN, TrustSlip, Demand Box, Pipeline Credits, Spotlight and Community Domain.
2 Scope, authority and preservation
This document records requirements and proposed resolutions. The current task authorises preparing the protocol. It does not itself authorise editing production, enabling payments, contacting merchants or sponsors, sending owner notices, deploying changes or revising the business forecast.

When an implementation task is authorised, complete ordinary engineering work within that task's scope without repeatedly seeking permission for reversible implementation choices. Preserve current live controls. A paid pilot requires an authorised live-payment release as well as satisfactory verification; passing tests or changing a catalogue flag does not provide that authority by itself.

Read the actual checkout's AGENTS.md and all applicable project, freeze and handoff instructions before edits. Record the branch, commit, working-tree state and effective feature/payment controls. Preserve unrelated changes, approved surfaces, stable routes, identity rules, existing balances and historical obligations.

Distinguish four statuses throughout the work:
Status	Meaning
Founder decision	A specified working commercial rule, such as the GBP price and thirty-opportunity package.
Protocol requirement	Behaviour needed for this integration to meet its stated promise.
Proposed default	A concrete recommendation awaiting resolution before the affected live operation.
Empirical question	A result that requires measurement, such as repeat purchasing or sustainable cost.


Do not use this assignment to redesign the entire interface, build a second wallet or scheduler, replace functioning permission authorities, change historical credit values, introduce a new general trust score or expand into multiple countries. Additional mechanisms require a demonstrated gap that cannot reasonably be filled through the existing system.
3 Completed audit baseline and limited revision check
The completed audit is docs/GSN_PUBLIC_DISCOVERY_SPOTLIGHT_MERCHANT_PILOT_CURRENT_REVISION_AUDIT_2026-11-20.md. It identifies cabbfb04048e418a86ef16390c32cfa685dead5c as the audited code revision. Commit a9c9fadd65573da370c4fc5c5ddd8497907f185a contains the audit and handoff-document changes. Keep the audited code revision and the documentation commit distinguishable.

Confirm the current checkout and compare the relevant implementation against that baseline. Reuse the completed preservation map. Update only changed, disputed or unverified entries before proposing architecture changes. Each requirement needs an existing owner, status, source evidence, smallest change and verification method.
Baseline finding	Consequence for this work
Community discovery and the selected-community Shop directory exist; known public Shop links can be opened.	Preserve those journeys. They do not establish global public Shop/product search.
Public Shop privacy authority exists, but its production activation and anonymous enforcement were not established by the audit.	Resolve the public-discovery dependency and verify live enforcement before release.
paid_spotlight.day is catalogued but unconnected; a separate member-credit writer is a flagged test path.	Connect the canonical service to a complete contract; do not promote the alternate writer as proof of readiness.
Pacing defaults to ten delivery rounds.	Establish thirty scheduled opportunities separately from qualifying-impression accounting.
The existing viewer cap is two, with a Demand Box extra-one exception.	Implement the selected five-view policy coherently; do not inherit a sixth-view exception.
The inspected viewer-count query groups by viewer and campaign without a daily date filter.	Establish same-advert/viewer/day accounting across bookings rather than merely changing the cap constant.
Capacity and authoritative shortfall-to-remedy integration are missing for the proposed merchant contract.	Complete them before enabling canonical paid purchases.
The audit reports a no-charge Domain pilot and operational Demand Box limits without a discovered reply fee.	Preserve pilot behaviour while separately defining future paid packages.


These are source-audit findings, not a claim that the live deployment or current checkout is identical. A change since the baseline requires a targeted check, not a repetition of every completed audit.
Area	Audit questions
Public access and publication	Which authority decides whether a Shop, product or service is public? What do publish, hide, pause, withdraw and expiry currently mean?
Discovery	Which queries, taxonomy, service-area fields, scopes, public serializers, media routes and caches already exist?
Credits and payment	Which records own reconciliation, funding source, balances, quotes, spending, refunds and the payment-suspension control?
Promotion	Which component owns admission, entitlement, capacity, scheduling, campaign status and content eligibility?
Measurement	What is the current qualifying-impression rule? How are renders, retries, clicks, contact actions, identity coverage and frequency handled?
Settlement	How are earned service, refunds, community allocations, amounts owed and payouts recorded?
Reporting	Which advertiser and authorised internal reporting surfaces can be extended?
Evidence	Which supported activities produce receipts, and how are source, confirmation, corrections and disputes represented?
Domain and Demand Box	Which capabilities and free/paid rules actually exist today? Which older proposals are only documentation?


Classify each item as present, partial, absent or unverified. Cite current files/functions and the inspected revision. A screenshot, comment, catalogue entry or documentation claim is not sufficient proof that a complete operational path works.

Previously inspected entry points, to revalidate rather than assume unchanged, include:
- gmfn_backend/app/api/routes/marketplace.py
- gmfn_backend/app/services/payment_operations_policy.py
- gmfn_backend/app/services/pipeline_credit_commerce_service.py
- gmfn_backend/app/services/advertising_revenue_service.py
- gmfn_backend/app/services/spotlight_delivery_pacing_service.py
- gmfn_backend/app/services/spotlight_frequency_control_service.py
The newer completed audit supersedes the earlier limited source inspection as the implementation baseline. Default-disabled source settings do not establish the actual production environment. A governed house-campaign path may include real advertiser funding; do not assume it is merely unpaid self-promotion.

Expected-payment records, credits, bookings, settlement and community allocations may be necessary layers of one transaction. Retire only paths shown to create conflicting purchase authority or duplicate charging. Preserve historical read, reconciliation and remedy requirements when closing an obsolete new-purchase path.
4 Bounded work packages
Package	Deliverable	Dependency
A — Public discovery	Search eligible public Shops and offers across immediate community boundaries, with owner controls and private-field protection.	Public eligibility and legacy-owner treatment resolved.
B — Spotlight integration	One traceable route from reconciled funding to entitlement, delivery and remedy.	Existing owners mapped; service scope and fulfilment defined.
C — Advertiser report	Aggregate purchased-versus-supplied delivery and measured interaction report.	Authoritative booking, event and remedy records.
D — Commercial evidence	Minimal authorised internal dashboard/export and a metric dictionary.	Reliable event, funding and cost classification.
E — Commercial specifications	Bounded Domain package, Demand Box configuration proposal and Scottish pilot plan.	Actual supported functions and realistic cost inputs.


Extend existing appropriate surfaces. Do not treat a new dashboard as permission to redesign the frozen user Dashboard. Internal financial detail belongs in an authorised operational surface; advertisers receive only their permitted aggregate campaign report.
Implementation slices
Slice 1 — public discovery candidate: map and complete publication semantics; implement the permitted public projection/search through existing authorities; enforce owner controls; prepare the legacy-owner notice/confirmation journey; add organic-usefulness measurement. Return a reviewable non-production candidate with focused checks and a rollback path. Payment, credit and Spotlight-booking behaviour must remain unchanged in this slice.

Slice 2 — complete Spotlight simulation: define the versioned booking and entitlement; reserve 10/10/10 capacity; demonstrate genuine supply separately from impressions; implement the selected daily frequency rule; classify a shortfall and apply the chosen test remedy; compose the report. Exercise reconciled-funding and credit-consumption interfaces using explicitly labelled test data in an isolated environment. Keep actual collection and production spending closed.

Parallel specification work: complete the financial metric definitions, cost capture, Domain candidate sheet and Demand Box baseline clarification. Do not make unresolved future Domain pricing or overnight free inventory an unnecessary prerequisite for the discovery candidate.

Later release: public exposure and live paid service follow their respective gates in Section 16. The catalogue item must not become saleable in a partially connected intermediate state.
5 Public Shop and offer discovery
5.1 Eligibility contract
Public discovery concerns deliberately published, active commercial information. It must not expose every historical Shop or product merely because a database record exists.

For a new deliberate public publication whose explained scope includes broader discovery, search eligibility follows by default, subject to current offer eligibility and owner hide/pause/withdraw controls. Do not require a second unexplained opt-in for that same understood scope. Legacy records with unclear authority are handled separately in Section 5.3.

Map the existing fields and authorities for Shop publication, offer publication, current availability, expiry, withdrawal, owner controls and requester access. A public Shop must not automatically make every attached product, historical record or private field public.

Search should support name, product/service description, category, general service area and remote availability where supported by current data. Reuse the existing taxonomy and search facilities. Establish a straightforward search baseline before adding complex AI matching or a new search service.

Public results must be discoverable without membership of the seller's immediate community. For anonymous visitors and signed-in nonmembers, use an explicit public access scope through the existing permission authority. Do not remove community checks from a private endpoint and thereby turn its full response into a public directory. If the approved public contract does not yet support a particular access mode, identify the smallest required change rather than bypassing authentication broadly.

Public discovery within GSN does not automatically authorise external search-engine indexing, paid distribution into every community, a new international launch or new regional tariffs.

The new public-discovery capability must not run under a flag combination that bypasses its required privacy authority. Return the dependency matrix and a safe disabled response for unsupported combinations. Preserve the established community directory and direct public-Shop behaviour when the new discovery capability is disabled.
5.2 Public fields and owner controls
Return only the permitted commercial projection: for example, published name, description, category, public media, broad service area, remote availability and a permitted Shop/contact action.

Never include private community membership, TrustSlip evidence or testimony, private requests, exact private home location, personal account contact details, owner analytics or administration fields. Do not send private fields to the browser and rely on the interface to hide them. A separately authorised public business-contact field must not be populated automatically from a personal account phone number.

Preserve permitted in-app contact. A buyer deliberately identifying themselves in an enquiry is different from exposing a list of silent viewers.
Owner action	Required contract
Hide from discovery	Explain whether the existing public direct link remains accessible. Search hiding and making a record private must not be confused.
Pause	Define whether the offer, Shop or promotion is temporarily unavailable; enforce the applicable exclusion from search and future delivery.
Withdraw	End the relevant publication and explain effects on direct access and existing bookings. Retain legitimate historical obligations.


Enforce current eligibility on the server. Search indexes, caches, autocomplete, counts, facets, pagination, previews, exports and media/detail routes must not leak newly ineligible or protected information. Define and verify invalidation behaviour. Do not promise to recall copies already downloaded outside GSN.
5.3 Existing owners and broader discovery
For new publication, explain the intended audience, fields made public, cross-community discovery, contact method and owner controls in plain language.

For existing Shops, audit the actual prior publication choice. The recommended migration is:
1. Where recorded authority clearly covers the proposed public discovery, use the appropriate notice and controls.
2. Where only a public direct link is evidenced, or the prior choice is unclear, obtain a deliberate owner publication decision before broader indexing.
3. Record the applicable notice version and owner action through existing audit mechanisms.
A notice alone does not cure missing publication authority. Prepare the notice and migration behaviour for review; this protocol does not authorise sending it or altering live visibility.
5.4 Organic usefulness
Measure relevant-result availability, zero-result searches, Shop/offer opens, permitted contact actions, substantive replies, time to useful contact, stale offers and support cost. Separate absent supply from poor search ranking.

Organic results must remain useful without payment. Label paid placements and apply the appropriate relevance, availability and permission rules. Payment cannot silently become organic suitability or improved TrustSlip standing. Private evidence, sensitive affiliations and private requests must not become advertising profiles.
6 Preserve the agreed Spotlight offer
Item	Working requirement
GBP price	One Pipeline Credit costs £0.50.
Basic package	One credit purchases 30 scheduled opportunities for one eligible advert during its campaign day in the authorised rotation.
Allocation	10 morning, 10 afternoon, 10 evening.
Two credits	£1 purchases 60 opportunities, ordinarily 20 per period.
Audience	As many eligible viewers as the opportunities produce; no fixed five-person target or ceiling.
Repetition threshold	Five qualifying views of the same advert per person during the day.
Enforcement proposal	Suppress a sixth automatic qualifying display to a recognised viewer. Additional bookings do not reset the counter.
Measurement	Every separate qualifying viewing occasion is one impression. Dayparts are not impression units.
Outcome	The purchased scheduling entitlement does not guarantee attention, enquiries or sales.


The founder's example must remain intact: views at 07:00, 08:00, 10:00, 14:00 and 17:00 mean one viewer and five impressions. It does not establish a mandatory one-hour spacing rule. Repeated telemetry from a continuous display must not create several impressions.

The detailed Spotlight Rotation and Impression Protocol remains the supporting specification for frequency, audience accounting and scheduling. Do not restore the superseded five-person audience target, minimum-three-views requirement or fifteen-impression target.

This is the new GBP service tariff. It is not permission to revalue old credits, convert historical liabilities, set foreign exchange rates or change other products' prices. The displayed price, applicable tax presentation and any funding minimum must be explicit before an actual purchase. Do not invent tax status or rates.
7 Resolve the remaining service choices concretely
These proposed defaults make review possible; they are not silently adopted live settings. Complete unaffected audit and implementation work while isolating genuine decision-dependent changes.
Decision	Recommended pilot position	Where resolution is needed
Audience scope per credit	One named authorised community rotation per basic allocation. Broader organic discovery remains separate. Any multi-community product must state whether thirty is total or per community and show its price.	Before paid booking.
Campaign clock	One service date and Europe/London timezone for the Scottish pilot. Later regions need their declared audience timezone.	Before booking and frequency enforcement.
Dayparts	05:00–12:00, 12:00–18:00 and 18:00–00:00, with adjacent non-overlapping boundaries.	Before scheduling.
Late bookings	Start on the next complete service day initially. Do not sell a full day after a promised period has elapsed.	Before booking.
Five-view enforcement	Adopt strict suppression of the sixth automatic qualifying display, using the existing identity and delivery authorities. State measurement coverage for guests.	Before paid serving.
Underdelivery	Track missed units by period and cause and verify canonical ledger precision. Recommended pilot fallback, if proportional restoration is unavailable: restore the affected one-credit package once for a GSN-caused shortfall. Refund/replacement terms still require an explicit quoted policy.	Before a paid offer is published.
Overnight free promotion	Retain 00:00–05:00 as a separate founder proposal. It can be deferred while the daytime paid chain is proved. Never count it as fulfilment of missed daytime obligations.	Only before activating this new free allocation.
Existing owners	Use documented prior authority where sufficient; otherwise require deliberate public publication before wider discovery.	Before affected records enter public discovery.
Community Domain	Preserve the audited no-charge pilot. Future bounded tiers retain £24/month and £40/month as candidate prices; annual alternatives and obligations are separate questions.	Before selling that Domain package, not before testing Spotlight.
Demand Box limits	Preserve free pilot use and the existing operational baseline. Clarify quota semantics and cost before proposing any change. Do not revive old one-response/two-response charges.	Before changing those limits or charges.


No new free daytime promotional-fill policy is introduced by this protocol. If overnight free placement is later included, its relationship with the daily frequency counter must be explicit.

The request to correct this protocol does not silently adopt all proposed defaults. Unresolved sale terms may be represented by explicit test-policy parameters while unaffected implementation proceeds; no such parameter becomes a live customer promise by accident.
8 Connect the complete Spotlight commercial chain
The logical stages are:
1. Reconcile an authorised payment through the existing authority.
2. Fund the correct account once, preserving paid, sponsored, gifted or waived status.
3. Produce a versioned quote with advert, scope, service date, timezone, price and entitlement.
4. Verify and reserve capacity in every promised period.
5. Establish one booking and consume or commit credits through the authoritative service.
6. Schedule and supply genuine opportunities under current eligibility and frequency controls.
7. Record qualifying display and interaction events without duplication.
8. Reconcile delivery, missed obligations and any remedy.
9. Produce the aggregate report and reconcile financial/community obligations.
These are logical stages, not an instruction to create nine services or tables. The implementation may use existing atomic or compensating mechanisms; it must satisfy the invariants below.
Required invariants
- Duplicate payment notifications, retries or reconnections cannot award credits or charge twice.
- Concurrent purchases cannot both buy the final available capacity.
- A failed booking cannot leave an unexplained debit or abandoned capacity reservation.
- Booking, funding, quote, delivery and remedy remain traceable through stable existing identifiers.
- A purchased but unused credit is not counted again as a new cash sale when used.
- Sponsor payment and the resulting merchant usage are not counted as two sales.
- Restoration keeps the original funding character and does not turn gifted usage into cash-paid evidence.
- Owner withdrawal or content ineligibility stops prohibited future serving and invokes the applicable contractual treatment.
- Closing a duplicate purchase route does not erase old balances, bookings, refunds or community amounts owed.
Keep the payment-suspension authority effective across relevant backend entry points, including manual alternatives. Hiding a button is insufficient. Preserve the existing treatment of historical obligations; do not use suspension as a reason to lose or ignore them.

A 50p service unit does not require a separate 50p payment-processing transaction. Cost the actual funding flow and its allocation across services. Any proposed minimum top-up must be visible and separately resolved; do not silently turn a 50p offer into a compulsory larger purchase.
9 Scheduling, genuine delivery and remedies
9.1 Reuse the actual scheduling architecture
Determine whether Spotlight uses a shared community schedule, per-viewer queues or a hybrid. Map the thirty-opportunity contract onto that architecture. Do not create thirty nominal schedule rows and call them delivered.

Corrected fulfilment definition: an opportunity is supplied only when the entitled advert is genuinely made available in the authorised rotation and promised period under the defined service rules. Being reserved, evaluated, considered, shortlisted or eligible to compete does not by itself establish supply. The advertiser purchases thirty genuine scheduled turns, not thirty occasions on which a selection algorithm can consider and discard the advert.

For a shared schedule, one genuine opportunity requires the authorised media and serving path to be available during its recorded turn. It may produce zero or many qualifying views. If the actual system advances only when a viewer is present, explain the corresponding evidence of supply; an idle clock period is not proof an advert played.

At ten seconds per sequential placement, the arithmetic is:
Basic paid allocations	Time to give every allocation ten turns in one period
100	2 hours 46 minutes 40 seconds
200	5 hours 33 minutes 20 seconds
300	8 hours 20 minutes


Ten seconds is a planning baseline pending confirmation of supported formats. These figures are not approved saleable limits and do not automatically describe parallel viewer queues. Count allocations, not just advertisers; one advertiser buying twice consumes two basic allocations. Reserve operational headroom and preserve promised media treatment.

Equivalent entitlements with equivalent eligibility should receive equivalent scheduling treatment. Additional purchases add declared opportunities; they do not justify unexplained domination of the feed. Preserve non-consecutive presentation where eligible alternatives exist. Do not override viewer controls to manufacture campaign fulfilment.
9.2 Frequency and event integrity
Use the existing stable identity for recognised users across sessions and permitted community appearances. Retain one authoritative daily boundary for the same advert. Device-clock changes, new bookings, another batch or a minor duplicate creative must not restart the count.

The audited implementation's viewer-and-campaign count lacks a daily filter. Changing its constant from two to five leaves the wrong counting boundary. Map the existing advert/offer identity to an authoritative recognised-viewer and service-day boundary shared across bookings. Do not substitute a campaign-lifetime limit or give each new booking its own five-view allowance.

Under the proposed strict five-view policy, the existing Demand Box extra-one override must not allow a sixth automatic Spotlight impression. Preserve normal Demand Box request/response functionality and permitted matching; adjust only the relevant promotion-frequency interaction. Verify the rule at the authoritative eligibility/delivery boundary, including concurrent and in-flight presentations.

Audit the existing advert/offer identity before defining deduplication. Do not combine every genuinely different product from one merchant into a single blanket cap. Account for simultaneous delivery reservations so concurrent sessions cannot independently exceed the proposed limit.

Reuse and document the existing qualifying-impression rule. Prefetch, hidden content, failed media and repeated telemetry must not inflate measured views. Actual rendering, qualifying impression and deliberate Shop browsing remain distinct.

For guests or limited-measurement traffic, state what can be recognised and controlled. Do not invent cross-device unique people, fingerprint viewers or promise perfect person-level frequency where identity is unknown. Keep such traffic and its limitations distinguishable in reports.
9.3 Remedy specification
Distinguish reserved, genuinely supplied, missed through GSN failure, advertiser-paused/withdrawn, rejected creative, rendered and impression-qualified states using existing records where possible.

A supplied opportunity with no audience is different from a missed opportunity caused by GSN. Missing morning turns cannot silently become fulfilled evening or overnight turns. Preserve the outstanding obligation until a defined remedy resolves it.

Before publishing the paid offer, return exact terms covering:
- Credit restoration, an agreed replacement service and cash-refund availability/process.
- Calculation and rounding of partial remedies at a 50p package price.
- Existing whole-credit or fractional-credit precision.
- Advertiser-caused interruptions, content rejection and cancellation.
- Paid, sponsored, gifted and waived allocations.
- Related community obligations already accrued or settled.
If proportional restoration cannot be represented, propose an explicit supported pilot policy, such as restoring the affected whole package, rather than silently rounding away the entitlement or inventing a new credit system. This example is a proposal, not an approved refund rule. Do not automatically treat credit restoration as resolving every possible cash-refund obligation.

Check precision, funding-source treatment and supported adjustment operations in the canonical Pipeline Credit implementation itself. The separate member-credit test writer's integer balance is not evidence that the canonical ledger has the same limitation. For a whole-package pilot remedy, specify whether one or several basic allocations are affected; several missed turns in one basic package must not trigger repeated one-credit awards. Retries must restore once, with a trace to the original obligation.

9.4 Command Centre Campaign Schedule
Extend the existing Command Centre campaign page rather than creating a second scheduler or purchase route. The schedule is an operator planning and reconciliation surface over the existing campaign, permission, pacing, lifecycle, Pipeline Credit and reporting authorities.

The programme board and its accessible list view must show:
- the selected advert and selected media;
- the authorised community audience, without inventing a fixed-person target or ceiling;
- region, authoritative timezone, service date and daypart windows;
- expiry, purchased allocation and per-daypart allocation;
- capacity reservation, conflicts and unresolved scope choices;
- funding classification and quote treatment;
- supplied opportunities, qualifying impressions, recognised reach, shortfall and remedy;
- selection-system considerations separately, never as supplied opportunities.

Support individual and batch planning with a preview of each programme's outcome. Selecting several media items or communities must not multiply one booking's entitlement. A scope that is not supported by the current versioned test parameter must produce an explicit conflict rather than hidden multiplication.

Keep existing house campaigns, merchant purchases and sponsor-funded programmes visibly distinct. Preserve paid, sponsored, gifted, waived and house funding classifications through any simulated remedy. A sponsor payment and the resulting merchant use must not become two sales.

Keep reversible pause distinct from permanent stop. Reversible pause must use the existing correction-hold lifecycle authority. Permanent stop must use the existing withdrawn authority and preserve its historical evidence. Do not create a competing lifecycle.

For the bounded Slice 2 implementation, the board may use explicit, labelled simulation parameters for audience scope, capacity, timezone, clock windows, late booking and remedy. The simulation must default off, remain platform-admin only, and make clear that it does not collect payment, debit Pipeline Credits, persist a live booking, activate a live campaign, change live capacity or create a customer promise.

Return at least one fulfilled booking, one shortfall with its corresponding remedy, and one safely resumed interrupted batch without duplicate bookings. The booking, schedule, delivery record and financial treatment must reconcile in the same inspectable chain.
10 Advertiser delivery report
For each booking and service day, show:
Report field	Required meaning
Service details	Advert, booking, authorised scope, date, timezone and applicable offer version.
Purchased opportunities	Entitlement by morning, afternoon and evening.
Supplied opportunities	Genuinely supplied turns by the same periods.
Missed delivery	Outstanding units, reason category and remedy state.
Qualifying impressions	Valid display events under the published rule.
Recognised unique reach	Deduplicated recognised viewers within the stated coverage.
Frequency	Exact one-to-five counts for the same measured cohort, subject to appropriate aggregate privacy controls.
Contacts	Permitted contact taps or enquiry events, accurately labelled.
Adjustments	Restored credits, agreed replacement service or refunds, with traceable status.
Limitations	Unknown identity coverage, unavailable outcomes and measurement gaps.


Do not reveal individual viewers, private affiliations, private requests or TrustSlip evidence through the page, API, export or narrow repeated filters. Use a defined aggregation/suppression policy appropriate to advertising; do not automatically copy a TrustSlip witness threshold into this different context.

Maintain an internal diagnostic count for over-five events. Do not hide an enforcement defect by clamping the displayed count. The zero-view population is reportable only when a reliable deduplicated eligible denominator exists. Membership totals across overlapping communities do not establish that denominator.

Enquiry initiation is not a completed conversation; a conversation is not a sale. Show reported and corroborated outcomes separately when legitimately available. Attribution does not by itself prove that promotion caused the outcome. The report must not imply GSN collected a buyer's payment when it did not.
Required synthetic report example
Use the audit's example as a deterministic test case, clearly labelled as synthetic and unpaid:
Field	Test case
Purchased entitlement	30 opportunities: 10 morning, 10 afternoon, 10 evening.
Supplied entitlement	29 opportunities: 10 morning, 9 afternoon, 10 evening.
Shortfall	One GSN-caused afternoon opportunity.
Qualifying impressions	18.
Recognised unique viewers	12.
Frequency	Eight viewers once, three twice, one four times: 8 + 6 + 4 = 18 impressions.
Sales	No supplied sales evidence; do not infer a commercial outcome.
Remedy	Apply the explicitly selected test policy. If testing whole-package restoration, restore one test credit once and retain original funding classification.


Also exercise a genuinely supplied opportunity with no viewers, and an advert merely considered but not supplied. The former can satisfy an availability-based entitlement under its defined contract; the latter cannot. The test must trace actual authoritative records rather than hard-code the desired report totals.
11 Commercial evidence dashboard and metric dictionary
Create the smallest useful addition to an existing authorised reporting surface. Every metric needs its source, definition, denominator, observation window, funding classification and limitations. Reconcile displayed totals to authoritative records.
Metric	Definition or required distinction
Recruited merchants	People/businesses recruited into the named cohort; not automatically active suppliers.
Eligible merchants	Distinct merchants with current offers eligible for the relevant context.
Active merchants	A predeclared participation/responsiveness definition and time window beyond registration.
Paying merchants	Distinct merchants making genuinely paid-funded promotion choices; identify sponsor-funded use and fully refunded/cancelled activity separately.
Paid conversion	Payers divided by the declared eligible cohort offered the paid proposition; show recruited-to-payer conversion separately.
Repeat paid choice	A later independent voluntary paid booking decision; exclude retries, restoration and several bookings generated by one instruction.
Repeat cash purchase	A later actual credit top-up or other cash purchase; separate from spending an existing paid balance.
Repurchase rate	Repeat purchasers divided by first purchasers with enough follow-up for the stated window. Show sample size and incomplete observations.
Merchant retention	Return to the declared merchant activity; separate from paid repurchase.
Contacts/useful contacts	Recorded taps/enquiries and separately defined substantive responses or outcomes, with source status.
Cost per active merchant	Defined attributable costs divided by the corresponding active-merchant denominator.
Acquisition cost	Recruitment/sales costs divided by acquired customers under the declared definition.
Delivery and support	Media/infrastructure, reconciliation, onboarding, troubleshooting, moderation and reporting effort.
Community obligations	Amounts owed, amounts paid and outstanding balances separately.


A merchant can top up once and make several later voluntary bookings. That can show repeated service choice, but it is one cash-funding event. A single instruction to buy ten packages is not ten independent repeat-purchase decisions. The same merchant can receive sponsorship and later buy independently; classify each event correctly.

Record founder and staff effort, including exceptional concierge help. Unknown cost must remain unknown rather than silently becoming zero. Avoid collecting unnecessary personal data merely to fill a dashboard.
12 Separate contribution, operating result and cash
The phrase “contribution after operating costs” is too ambiguous for the dashboard. Use three views with a documented, consistent accounting basis:
1. Direct-service contribution: earned service revenue on the confirmed tax/refund basis, less applicable direct delivery, processing, reconciliation, support and community obligations not already netted from that revenue.
2. Company operating result: combined service contribution less the remaining shared operating structure and free-participation costs.
3. Cash and obligations: actual money received and paid, unused credits/service rights, outstanding delivery/remedies, receivables where applicable, and community amounts owed.
Do not deduct refunds or community allocations twice. Do not call the campaign settlement pool company profit. Do not count credit funding and consumption twice. Merchant turnover facilitated by GSN is not GSN revenue.

Show actual founder cash remuneration separately from a replacement-cost sensitivity. Do not deduct the same labour twice. Use the actual confirmed tax/VAT and gross-versus-net treatment; this protocol sets no tax rate or registration assumption.

Cost receipt capture/retention separately from TrustSlip preparation and manual verification. Set budgets from realistic volumes and service contribution. No invented universal pence-per-receipt threshold is introduced.
13 TrustSlip, accessible participation and bounded packages
13.1 Evidence and free participation
Retain activity → evidence receipt → purpose-specific TrustSlip → recipient decision. Ordinary supported activity capture must be available without a charge merely for recording that activity. Identify any existing contrary rule as an audit gap; do not assume that historical TrustSlip preparation or verification prices apply to ordinary capture. Preserve basic inspection, correction/challenge access and useful ordinary participation within the established scope.

Automatic capture does not automatically verify a reported event. Preserve sources, dates, observed/reported/imported/confirmed status, relevant limitations and linked corrections/disputes. Link multiple stage receipts to their underlying activity. Missing history remains neutral.

A purchase/delivery receipt can document promotion. It cannot improve unrelated claims about honesty or product quality. Private viewing activity must not automatically become a portable personal dossier. Do not preserve every conversation by default or use private TrustSlip evidence for advertising.

Ordinary capture does not imply unlimited media storage or free bespoke investigation. Identifiable additional verification, preparation, integration or institutional reporting may later be a paid service when its benefit and cost are established. Introduce no standalone TrustSlip subscription in this programme.

Keep basic identity/profile participation, ordinary Shop browsing and sharing, and the agreed useful basic Shop accessible. Identify which commercial income or explicit pilot budget funds free participation. Adjust explanatory wording on appropriate existing surfaces without a broad visual redesign.
13.2 Community Domain package deliverable
The completed audit reports a six-month no-charge pilot with limits including 500 members, 10 administrators, 100 Shops and 5 GB. Preserve the actual current pilot contract, subject to verifying any changes since the audited revision. Do not reset its duration, extend it automatically or start charging merely because future candidate prices exist.

Clarify what the audited 100-Shop limit counts before using it in expansion forecasts: organisation-owned Shops, member-linked Shops or another defined unit. The earlier assumption that 30% of 500 members might sell produces 150 potential sellers; establish whether that assumption and the limit concern the same population. This clarification need not block a 20–30-merchant test.

Produce one complete proposed service sheet grounded in actual supported functions, with explicit tier differences where necessary:
- Named organisational space, included administration and administrator roles.
- Member-count definition and tier boundaries.
- Included governance and meeting functions, each mapped to current capability.
- Records covered, storage, retention and retrieval/export arrangements.
- Continuing service and reporting obligations.
- Support channel, scope and service commitment.
- Renewal, cancellation and post-cancellation access.
- Any setup work and whether separately charged.
- Explicit sponsored member allowance, if offered; no implied unlimited Spotlight.
- Cost estimate, assumptions, package version and outstanding commercial choices.
Keep £24/month up to 500 members and £40/month for 501–1,000 as candidate prices. Do not publish them as final checkout prices, import inconsistent annual incentives, promise unrestricted storage or imply a bespoke standalone app. Resolve the continuing workload before selling that package. The Domain work need not block an otherwise ready merchant Spotlight test.

Correct the audit service sheet's “billing period must be decided” wording: these retained candidate amounts are monthly. A future annual offer, discount or incentive requires a separate coherent proposal. Actual package costs and ongoing obligations remain unresolved; the absence of implemented billing does not erase the monthly basis already specified in the brainstorming.
13.3 Demand Box boundary deliverable
Keep Demand Box community-scoped and free of per-response charging during the pilot. The audit reports a five-open-requests-per-24-hours rule and a default 48-hour expiry. Preserve the current code's actual safeguards; clarify whether the quota counts simultaneously open requests, creations within a rolling window or a combination before publishing precise customer wording. Do not describe this implementation baseline as a settled permanent post-pilot commercial limit.

Map current free use, operational/abuse limits and any actual billing rules. Preserve a simple route for expressing needs and ordinary permitted responses. Do not implement old one-response or two-response charging proposals merely because they appear in historical notes.

Return one coherent proposed pilot configuration, its cost and the evidence needed to revisit it. Potential funding through promotion, organisations, identifiable added work or the wider business can be investigated separately. “Enhanced response” is not an approved paid product and must not become a disguised personal reply or silent organic-ranking advantage.

Do not introduce new reply charges or remove existing operational safeguards through assumption. Any changed quota needs an explicit versioned decision; unanswered pricing questions do not justify making the normal journey unusable.
14 Bounded Scottish merchant pilot
Cohort and operating plan
Prepare a pilot in one geographical/community concentration using current, responsive merchants and relevant local buyers. 20–30 merchants is a proposed recruitment target, not twenty to thirty guaranteed payers or a statistical validation threshold.

The plan must name the locality, category focus, community access route, participating offers, buyer-activation method, responsible people, budget, support capacity, review dates and funding source. Recruiting sellers alone does not establish useful buyer attention.

Use a proposed 60–90-day observation horizon if it fits the actual launch and budget, with early operational reviews. State that this is a planning proposal. Report repeat behaviour only for cohorts with sufficient elapsed follow-up. Do not silently count free pilot use as a 50p sale.
Pilot stages
Stage	Required result
Organic baseline	Current relevant offers, usable public search, buyer activity, merchant response and failure reasons are observable.
Service readiness	Scope, timezone, capacity, genuine delivery, terms, remedies, report and costs are defined and verified.
Authorised paid trial	Eligible merchants can voluntarily buy the stated offer through the complete permitted chain.
Repeat observation	Subsequent independent choices, service usefulness, support effort and contribution are measured.
Review	Continue, revise or pause the relevant route using the evidence and agreed budget thresholds.


Before launch, management must choose thresholds appropriate to the actual spending decision: maximum pilot budget/support effort, minimum service reliability, acceptable unresolved remedies and the evidence required before expanding acquisition. Do not invent a universal repurchase percentage or margin benchmark. Two buyers and one repeat may be an early learning checkpoint, not permission to extrapolate dependable five-year revenue.
Separate sponsor proposition
Prepare one bounded organisational proposition specifying the buyer's benefit, cohort, services, promotion allowance, report, costs and funding responsibilities. Any later approach to an organisation requires the user's outreach instruction. Supportive relationships with RGU, One Tech Hub or other bodies do not establish a buyer or contract.

Track sponsor-funded and independently paid activity separately. One sponsor payment remains one sale even when it funds onboarding, promotion and reporting. Sponsor reporting does not grant access to private participant histories or silent viewer identities.
15 Focused verification and acceptance
Use meaningful checks for the actual permissions, money, scheduling and measurement risks. Existing repository-required gates apply. Avoid broad optional test expansion once the relevant risks and required gates are adequately covered.
ID	Check	Passing behaviour
D1	Public access	Eligible offers are discoverable by the intended public audience, including nonmembers, with only approved public fields.
D2	Protected data	Private/draft/expired/withdrawn offers and private fields do not leak through results, details, counts, facets, autocomplete, previews, exports or media.
D3	Owner changes	Hide/pause/withdrawal is enforced server-side and in caches; paid serving cannot override it.
D4	Legacy owners	Records without sufficient publication authority are not silently indexed more broadly.
D5	Search usefulness	Name, category, product/service and general area queries find eligible inventory; absent supply is distinguishable from ranking failure.
D6	Privacy dependencies	Unsupported discovery/privacy-flag combinations cannot expose a public projection without its required access authority.
D7	Discovery rollback	Disabling new discovery preserves the established community directory and direct public-Shop behaviour; Slice 1 changes no payment, balance or Spotlight-booking behaviour.
P1	Funding integrity	Duplicate notifications and retries create one authorised credit award or debit.
P2	Capacity race	Concurrent requests cannot oversell the last allocation; failure leaves no unexplained debit/hold.
P3	Entitlement	One/two credits produce 10/10/10 or 20/20/20 promised opportunities. No five-person serving ceiling exists.
P4	Frequency	The founder's five viewing times produce five valid impressions; under the proposed enforcement a later automatic selection is suppressed, including a Demand Box matched promotion that previously qualified for an extra presentation.
P5	Counter continuity	Repeat purchases, overlapping communities, minor duplication and concurrent sessions share the same-advert/viewer/day count. The daily boundary is explicit; neither a new booking nor a device-clock change resets it.
P6	Event integrity	Preloads, failures and repeated telemetry do not become fabricated impressions or repeated fulfilment.
P7	Fair allocation	Equal eligible entitlement receives the agreed treatment; additional purchases add declared opportunities.
P8	Fulfilment truth	Outage, missing media, genuine no-audience availability and advertiser interruption remain distinguishable. Mere consideration, reservation or a generated scheduler row cannot be recorded as supplied delivery.
P9	Remedies	Missed entitlement, restoration, replacement/refund and related financial/community records reconcile without duplicates.
P10	Suspension/history	Suspended new-payment paths remain blocked; historical obligations and balances retain their meaning.
P11	Canonical remedy precision	The remedy uses verified canonical credit capabilities, retains original funding classification and executes once per owed adjustment. No capability is inferred solely from the alternate test writer.
R1	Advertiser privacy	No silent-viewer identities or protected evidence appear through reports, exports or narrow-query combinations.
R2	Report consistency	Purchased, supplied, missing, measured and remedied totals derive from matching records; unknowns and over-limit anomalies remain visible.
R3	Synthetic reconciliation	The 30-purchased/29-supplied example reconciles to one shortfall, 18 impressions and 12 recognised viewers, with any test remedy visible and no fabricated sales.
M1	Commercial cohorts	Paid, sponsored, gifted, waived, refunded and repeated activity are classified without false conversion or repeat claims.
M2	Financial waterfall	Revenue, obligations, direct contribution, shared costs and cash reconcile without duplicated revenue or deductions.
E1	Evidence integrity	Supported activity labels and linked corrections remain accurate; promotion cannot buy favourable unrelated evidence.
F1	Accessible participation	Useful organic participation remains available; no superseded Demand Box reply gate is introduced, and ordinary supported activity capture is not charged merely for recording it.


Report the tested revision, environment, actual results and untested limitations. Passing a simulated payment or synthetic delivery proves the tested behaviour, not actual customer demand or production readiness in every configuration.
16 Release and pilot gates
Gate A — completed-audit baseline: the current revision is identified, relevant changes since the audited code are checked, and the existing preservation map is updated only where necessary. Owners, gaps, dependencies and unresolved service choices are explicit; another broad audit is not the default deliverable.

Gate B — reviewable candidate: the bounded integration is implemented within the authorised task, with current defaults preserved, required tests passed, representative reports and a rollback plan. Show the concrete result before requesting any necessary release decision.

Gate C — public-discovery release: publication authority, owner communication/migration and access checks are resolved for the actual records exposed. Do not equate a search feature flag with owner authorisation.

Gate D — paid-pilot release: the complete chain, offer terms, capacity, remedy, report and cost capture are ready; live collection/payment activation is explicitly within the approved release scope. Verify the actual released revision and configuration.

Gate E — commercial review: review evidence before extending acquisition, inventory or geography. A technically successful release does not authorise unbounded spending or an international rollout.

Rollback must stop inappropriate new publication, selling or serving while preserving auditable records and outstanding customer/community obligations. Do not delete ledger history to make a failed release appear clean.

Continue a bounded test when delivery is reliable, customers understand the service, genuine purchasing occurs and measured costs show a plausible improvement path. Revise the relevant offer when interest exists but usefulness, repetition, support or economics are weak. Pause paid delivery if entitlements, money, privacy controls or truthful reporting cannot be maintained. Delay scaling when apparent success depends on hidden subsidies, one sponsor, missing costs or exceptional uncosted founder effort.
17 Codex return format
Return a concise executive summary and the following evidence:
1. Actual repository revision, task scope and effective flags.
2. Updated preservation map: requirement, current owner, present/partial/absent/unverified status, evidence and smallest change, identifying what changed since the completed audit.
3. Decisions resolved from existing instructions, proposed defaults and genuinely outstanding choices, with their affected gate.
4. Exact implementation changes, routes/contracts affected and why each was necessary.
5. Meaningful verification results tied to the candidate revision, plus remaining limitations.
6. Example advertiser report and internal metric dictionary using clearly labelled test data.
7. Trace of one purchase, one failed delivery and one remedy through authoritative records, without exposing personal data or secrets.
8. Candidate Domain service sheet and Demand Box boundary recommendation.
9. Pilot cohort/budget/review plan and separately defined sponsor proposition.
10. Release status, rollback approach and the next concrete decision, if any.
Do not report “complete” merely because an interface exists or tests pass while the funding-to-delivery connection remains unverified. Do not claim a production deployment, real payment, customer outcome or professional approval that did not occur.

Keep handoff documents limited to the work and its safe supporting evidence. Exclude session/account dumps, credential values, raw browser authentication state and unrelated production personal data. If encountered, report only the affected location and information category, and handle containment separately. Do not append the unsafe source material to this protocol or its outputs.
18 Forecast handoff and deferred work
The pilot review should provide observed inputs and uncertainty ranges for a future authorised forecast revision. Separate observations, contractual commitments, management assumptions and research opportunities. A conditional five-year case may model future promotion with explicit assumptions; retain a conservative funding view where launch is delayed or income remains weak.

Do not automatically update the existing workbook or claim a reliable break-even year. Name the break-even measure, include consolidated company costs, distinguish actual founder remuneration from replacement-cost sensitivity, and keep institutional data income outside survival assumptions until a specific lawful paid service is established.

Defer complex AI matching before the search baseline is measured, participant/TrustSlip data sales, an unproven standalone TrustSlip subscription, broad international rollout, unlimited Domain promises and claims of superiority to established platforms. Companion should act within specific current authority, require a new decision when that scope is exceeded, and avoid fabricated claims, duplicate actions and repeated obstruction. This integration does not require rebuilding Companion.
19 Source and precedence record
This protocol consolidates:
- The founder's latest Codex summary supplied with the request to prepare this protocol, 20 November 2026.
- The founder's explicit Spotlight price, thirty-opportunity, frequency and viewing-time clarifications in this conversation.
- GSN Brainstorming Summary and Reconciled Working Decision Record, version 1.1.
- GSN Spotlight Rotation and Impression Protocol, version 1.0.
- Completed current-revision audit at documentation commit a9c9fadd, which identifies code revision cabbfb04048e418a86ef16390c32cfa685dead5c as its baseline.
- Pacing service at the audited code revision and frequency-control service at the same revision.
The latest explicit founder correction takes precedence over an older summary. This version supersedes conflicting commercial language in master protocol version 1.0 and the audit, including merely “being considered” as supply and monthly-versus-annual uncertainty about the £24/£40 candidate amounts. It does not overwrite the audit's actual code findings. Proposed defaults remain proposals until resolved for their affected operation. Current project instructions and real access/payment controls must be inspected; a prose specification does not bypass them. Report a genuine conflict and the smallest concrete resolution rather than silently choosing a different commercial promise.

Definition of done: a preserved and connected discovery/promotion system, an honest service contract, traceable delivery and money, useful privacy-respecting reports, and a bounded pilot capable of producing customer and cost evidence. A coherent protocol is the starting point; the implementation and commercial results must be demonstrated separately.
