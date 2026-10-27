# GSN Revenue Per Module Truth Map - 2026-10-27

Status: living owner decision record and implementation audit. The 2026-10-27 owner corrections below are provisional commercial decisions, not proof of demand, revenue, margin or renewal. This document does not activate billing or authorise a commission.

## Executive decision

GSN does not yet have proven revenue per module. It has a mixture of live payment and entitlement engines, pilot prices, manual-quote contracts, paused billing, free engagement infrastructure, and planned products.

The correct present-tense statement is:

> GSN has several technically chargeable services, but willingness to pay, conversion, renewal, refunds, support cost and net margin are not yet proven by recorded customer transactions.

No business plan or affiliate reward should treat a module as revenue merely because it has a button, payment instruction, price in code, entitlement, view, reaction, member-to-member sale, or forecast assumption.

## Owner corrections recorded on 2026-10-27

These decisions supersede the earlier interpretation in this file where they conflict:

- Every chargeable GSN service should use one common, non-cashable prepaid system called **GSN Pipeline Credits** rather than require a separate cash payment for each action.
- The credit-to-cash exchange rate is not decided. Approximately five credits per GBP 1 is the owner's current working thought, not an approved rate.
- Paid Spotlight and Paid Repost remain separate revenue lines and delivery methods, but their credit debits are not fixed.
- One credit for a day of normal Spotlight rotation and five credits for Repost reach across five average communities or a target region are examples for later customer discovery, not prices.
- Vault, Merchant Verification, extra shop/member/DemandBox capacity, Community Domain and every other paid feature must consume Pipeline Credits; their debit and duration will be determined later.
- Credit value and feature debits may differ by region, participant type, interest, reach and delivery cost after local customer discovery. Existing cash prices remain runtime facts, not approved future credit prices.
- `GSN Shop Reel` means a future shop-promotion package assembled from the existing Shop, Shop Diary, Spotlight, media-preparation, Campaign Renderer, public-link and Social/WhatsApp Bridge engines. It is not a new general-purpose video feed.
- Bulletin reactions remain an organisation feature, not a revenue product. TrustSlip remains the evidence surface within the Merchant Verification revenue family unless a genuinely additional paid output is later defined.

The prices above express product direction. They are not all live runtime contracts yet.

The detailed price, ledger, regional-pricing and Shop Reel implementation boundary is maintained in `docs/GSN_PIPELINE_CREDIT_AND_MODULE_PRICING_DECISION_REGISTER_2026-10-27.md`.

## Status language

| Status | Meaning |
|---|---|
| Live priced contract | Server calculates the price, creates an expected payment and activates a bounded entitlement after reconciliation. |
| Live rail, price not commercially approved | Payment and entitlement exist, but the amount is manual, client-supplied, contradictory or otherwise not safe as a published price. |
| Backend-ready commercial rail | The accounting/delivery engine exists, but there is no complete ordinary frontend sales workflow or proven buyer demand. |
| Pilot billing paused | Product operation exists, but current policy prevents payment creation. |
| Planned paid product | A value idea or current free surface exists, but no complete paid entitlement contract exists. |
| Included or engagement infrastructure | It may attract or retain people, but it is not a direct revenue line today. |

## Revenue map: currently chargeable services

| Commercial unit | Payer | Chargeable value | Current price mechanism | Payment and delivery contract | Main delivery cost | Willingness-to-pay evidence | Current verdict |
|---|---|---|---|---|---|---|---|
| Paid Spotlight | Shop owner | Governed direct paid visibility for one shop item | Current runtime: GBP 1 per day-credit; each full 6-credit bundle costs GBP 5. Owner example only: one Pipeline Credit for one day of normal rotation. | Current server-priced expected payment grants and consumes `spotlight_priority`; configurable Pipeline Credit consumption is not implemented | Payment handling, media storage/bandwidth, moderation, delivery measurement, support and disputes | No recorded paid-customer or renewal evidence was found | Separate revenue line; future credit debit is undecided |
| Paid Repost | Shop owner | Governed placement of a shop item outside its normal/direct community reach | Current runtime uses the ordinary Spotlight day-credit price. Owner example only: five credits for governed reach across five average communities or a defined target region. | Current runtime consumes `spotlight_priority`; a separate configurable Repost service code is not implemented | Payment handling, destination governance, media delivery, moderation, measurement, support and disputes | No recorded paid-customer or renewal evidence was found | Separate revenue line and delivery method; future credit debit and reach bands are undecided |
| Private Vault | Shop owner | One private link-only offer space for 30 days | GBP 5 per slot; maximum 2 active slots | Server-priced expected payment creates a Vault order; confirmed payment activates the selected blocks and link controls | Private media storage, access-link security, bandwidth, expiry, support and disputes | No recorded paid-customer or renewal evidence was found | Live priced pilot contract |
| Extra public shop space | Shop owner | Capacity above 6 included public items, up to 4 extra items | Current runtime charges GBP 1 per annual unit; a previous owner discussion used GBP 2. No future Pipeline Credit debit is fixed. | Current expected payment grants annual `extra_shop_block` entitlement; Public Shop capacity reads that entitlement. Pipeline Credit purchase is not implemented. | Storage, bandwidth, moderation, support and payment handling | No recorded paid-customer or renewal evidence was found | Must use Pipeline Credits; debit and period await customer discovery |
| Extra community member capacity | Community owner/admin | Additional active member places above the selected package | GBP 1 per unit and GBP 5 per full six-unit bundle | Expected payment grants annual `community_member_capacity` entitlement | Database/storage, traffic, moderation, admin/support and privacy workload | No recorded paid-customer or renewal evidence was found | Live package rail; packaging and buyer value still need validation |
| ROSCA yearly service | Community owner/admin | Access to deterministic ROSCA cycle records and contribution tracking for one year | GBP 60 for one annual service unit | Expected payment grants annual `rosca_cycle` entitlement; member contributions remain member/community money, not GSN revenue | Support, reconciliation records, dispute burden, security and compliance boundaries | No recorded paid-customer or renewal evidence was found | Live priced contract; must not count member contributions as GSN revenue |
| Community Meeting Pack | Community owner/admin | Reminder evidence, WhatsApp share text, member notifications and later summary records | GBP 1 per unit and GBP 5 per full six-unit bundle | Expected payment grants annual `community_meeting_pack` units | Notification delivery, storage, support and any future messaging/AI provider cost | No recorded paid-customer or renewal evidence was found | Live package rail; value unit and consumption behavior need field proof |

### Distinct revenue lines without double-counting the credit purchase

Paid Spotlight and Paid Repost are separate products because the payer buys different delivery value. Their consumed credits must post to separate service/revenue codes.

The common Pipeline Credit top-up is only the funding event. Do not count both the top-up and the later module debit as two sales. Commercial reporting should retain the unconsumed balance as outstanding prepaid value and attribute consumed value to the service actually used, subject to professional accounting advice on timing, tax, expiry and refunds.

The present runtime does not satisfy this policy: both modes consume the same integer `spotlight_priority` credit at the same price. A 1.5-credit Repost cannot be represented accurately in that integer ledger.

Free Spotlight is acquisition/retention inventory. It is not revenue. A shop owner's sale after visibility is merchant revenue unless a separate GSN fee was collected.

## Revenue map: live engine, unsafe or incomplete commercial contract

| Module | Payer | Current technical truth | Commercial defect | Verdict |
|---|---|---|---|---|
| Merchant verification | Shop owner/vendor | Expected payment, annual `merchant_verify` entitlement, reconciliation and TrustSlip public-status gating exist | The frontend submits GBP 1, while the backend accepts any positive client-supplied amount. The server has no canonical pricing function. GBP 1 is therefore a mutable implementation value, not an approved or protected price. | Live payment rail; price not safe to forecast or publish as validated |
| Central advertiser campaign | External advertiser represented by a GSN payer account | Mounted backend supports settlement draft, advertiser expected payment, reconciled receipt, delivery finalisation, deductions and community earnings. Default configured community share is 5% of distributable net. | The house-campaign publisher labels its commercial equivalence as quotation-only and performs no charge. No complete ordinary frontend settlement workflow or customer price card was found. Gross price remains a manual campaign quote. | Backend-ready commercial rail, not proven self-service revenue |
| Pipeline Credit top-up | Member or community account owner | A confirmed payment can create a top-up instruction, but the current `PipelineCreditAccount` is documented as an internal provider/API usage meter. A separate integer-only Member Service Credit account exists for test Spotlight purchasing. | Neither ledger is yet the universal customer prepaid-credit contract described by the owner. Credit is also a funding rail, not a chargeable outcome by itself; unconsumed value must not be casually booked as module revenue. | Product direction approved; one-ledger customer implementation and accounting policy remain incomplete |

### Merchant verification and TrustSlip boundary

TrustSlip is a core evidence product. It is issued and read through existing identity, community and evidence contracts. No separate TrustSlip purchase price or paid-generation entitlement was found.

Merchant verification currently changes the merchant-facing public status from a public record to active external merchant verification. GSN must not charge twice for the same evidence under both `TrustSlip` and `merchant verification`. A future paid TrustSlip report, external ID check or assisted review would need its own named payer, incremental value, cost and entitlement.

Payment must never be presented as proof that the merchant, identity, goods, licence, work quality or future behaviour is verified. It pays for the governed verification service and its bounded public status, not a favourable finding.

## Revenue map: paused or planned products

| Module | Intended payer and value | Current truth | What must exist before forecasting revenue |
|---|---|---|---|
| Community Domain | Organisation, institution, sponsor or agreed third party pays for the governed organisational space and package | Reservation, lifecycle, feature policy, manual-quote and dormant subscription activation contracts exist. A GBP 10 monthly / GBP 99 annual cash proposal is preserved, but no future Pipeline Credit debit is fixed. Current policy suspends pilot payment instructions and returns no price. | Credit-funded server price, package scope, payer, regional conversion, renewal, sponsor rule, grace/transition rule, support limit, activation boundary, recorded acceptance and actual collected payments |
| Additional Trade Records | Shop owner or organisation pays for additional protected evidence capacity | Current Trade Records remain available; no paid additional-record entitlement or price is connected | Capacity unit, retention/storage cost, free allowance, entitlement, price and buyer test |
| Advanced Shop Analytics and AI | Shop owner, Community Domain or sponsor pays for deeper decision support beyond current Shop Activity and Market Wisdom teaser | Opportunity/analytics concept exists, but no paid price, entitlement or connected AI provider exists | Named output, data boundary, provider and human-review cost, usage cap, entitlement, price and willingness-to-pay test |
| External verification credits | Member, organisation, vendor or sponsor pays for third-party ID/document checks | Costing model describes it; no external verification provider is connected | Provider, exact cost, consent, compliance, failure/refund rule, credit debit and payer commitment |
| Managed onboarding/support | Organisation, sponsor or institution pays for human setup and support | Founder labour is a real current cost, but no canonical service catalogue, scope or payment entitlement was found | Deliverables, hours, exclusions, price, change control and acceptance evidence |
| Sponsor-backed pilot/package | Sponsor or institution funds a named community outcome | Planning model exists; no collected sponsor package is proven | Sponsor agreement, beneficiary, deliverables, reporting, safeguarding/data scope, payment and renewal evidence |

## Modules that must not be called revenue today

| Module or label | Repository truth | Correct business treatment |
|---|---|---|
| Public Shop | Six public item spaces are included; shop sales are not GSN sales | Acquisition, merchant utility and retention. Revenue comes only from a separately collected add-on such as extra capacity, Vault or visibility. |
| GSN Shop Reel | The intended product is now defined, but no canonical route/model/service exists. Existing Shop/Public Shop, Shop Diary, Spotlight, media preparation, Campaign Renderer, public share cards/links and Social/WhatsApp Bridge provide reusable parts. | Treat it as a planned acquisition/promotion compositor, not a standalone social feed. Do not forecast Reel revenue until basic versus paid export value, render cost, entitlement and buyer evidence are defined. |
| Reactions | Bulletin interface language exists, but backend notice payloads return `reactions_enabled: false` | Engagement idea only; no charge, entitlement or direct revenue. Acknowledgement, availability and choice polls are distinct governed response engines. |
| Shop Update / Shop Diary | Live 24-hour text update and optional handoff into the existing Spotlight publisher | Free retention/communication feature. Only the separately confirmed paid Spotlight action can create platform revenue. |
| Bulletin, polls and acknowledgements | Community coordination and response statistics | Included Community Domain utility. Do not charge separately while presenting them as included domain basics. |
| DemandBox | Community demand context and matching opportunity | Acquisition/retention and market intelligence input. An open request is not a buyer, order, sale or revenue. |
| TrustSlip core | Evidence and public/limited reading surface | Trust infrastructure. Do not count issue, view or QR scan as revenue. |
| Share/WhatsApp Bridge | User-controlled external sharing through existing links | Acquisition/distribution channel, not paid delivery and not proof of reach or conversion. |
| Shop Activity/basic analytics | Existing visits, opens, shares, contacts and cautious guidance | Included feedback loop. Do not relabel current basic signals as the future paid Advanced Analytics product. |

## Cost truth by product family

No module has decision-grade unit economics until these costs are measured from real delivery.

| Product family | Direct and variable costs to capture |
|---|---|
| Visibility and advertising | Media preparation, storage, bandwidth, moderation, campaign review, failed delivery, measurement, refunds/chargebacks, payment fees, support and community revenue share |
| Shop capacity and Vault | Storage, bandwidth, private-link security, deletion/expiry handling, moderation, support, payment fees and disputes |
| Trust and verification | Human review, evidence correction, external provider checks, privacy/security, appeals, support, document generation and public verification traffic |
| Community Domain and member capacity | Hosting, database/storage, traffic, admin support, onboarding, safeguarding/privacy, notification load, account recovery and organisation-specific support |
| Meetings, reports and AI | Messaging provider cost, model/API usage, storage, retries, human review, correction and support |
| Managed service and sponsor work | Founder/helper time, travel, training, data clean-up, reporting, governance, legal/data-protection work and change requests |

Current infrastructure notes identify Render compute, Postgres and upload storage as live cost exposure. Payment checkout, automated SMS/WhatsApp, transactional email, external identity verification and AI are not safely assumed to be live paid providers. Their future costs must not be hidden inside an unlimited low subscription.

## Evidence required before revenue forecasting

For every paid product, record monthly:

1. payment instructions created;
2. unique payers;
3. gross amount actually reconciled, not merely requested;
4. activated entitlements and units consumed;
5. refunds, chargebacks, reversals and expired unused value;
6. payment-processing and campaign-specific delivery cost;
7. media/API/storage cost attributable to the product;
8. support and review minutes;
9. renewal, repeat purchase and cancellation;
10. delivery outcome without claiming that attention proves a sale.

The minimum module equation is:

```text
Collected platform revenue
- tax
- refunds and chargebacks
- payment fees
- module-specific delivery cost
- attributable support/review labour
= contribution before shared overhead
```

Views, members, posts, reactions, TrustSlips, payment instructions and merchant sales do not belong on the first line.

## Recommended order of commercial testing

1. Fix merchant verification so the server owns an approved price or blocks payment while pricing is undecided.
2. Test one existing low-risk paid product with real buyers. Paid visibility credits are the cleanest candidate because price, payment, entitlement and consumption already connect.
3. Test Vault separately because its value and 30-day delivery unit differ from visibility.
4. Test Paid Spotlight and Paid Repost as separate service lines funded from the common credit balance. Do not count both the top-up and credit consumption as separate revenue.
5. Keep Community Domain payment suspended until its Pipeline Credit package and regional debit are implemented safely and a real organisation or sponsor accepts it.
6. Connect the existing central-advertising settlement rail to a governed admin workflow only after GSN has permitted audience, brand-safety, delivery and pricing evidence.
7. Prototype GSN Shop Reel by composing the existing Shop, media, renderer and share engines. Do not create a new feed or paid entitlement until the output and incremental value are tested.
8. Select any Growth Partner reward only from collected, non-refunded contribution margin of one approved product. Do not reward raw traffic, registration or member-to-member sales.

## Deferred decisions after customer discovery

The payment method is settled: every chargeable service uses Pipeline Credits. These amounts remain deliberately open:

- the top-up exchange rate, with approximately five credits per GBP 1 retained only as a working thought;
- each service debit, duration, renewal and refund rule;
- regional, participant, interest, reach and time adjustments;
- the exact paid DemandBox unit and free allowance;
- the first paid-value test and central-advertising pilot package;
- Community Domain billing until the credit package is safe and one named buyer, sponsor or budget-holder accepts it.

## Source-of-truth files inspected

- `gmfn_backend/app/services/payment_instruction_service.py`
- `gmfn_backend/app/services/expected_payments_service.py`
- `gmfn_backend/app/services/feature_entitlements_service.py`
- `gmfn_backend/app/services/vault_domain_service.py`
- `gmfn_backend/app/services/advertising_revenue_service.py`
- `gmfn_backend/app/services/bank_application_service.py`
- `gmfn_backend/app/api/routes/payment_instructions.py`
- `gmfn_backend/app/api/routes/marketplace.py`
- `gmfn_backend/app/api/routes/trust_slips.py`
- `gmfn_backend/app/api/routes/community_domains.py`
- `gmfn_backend/app/api/routes/community_notices.py`
- `frontend/src/pages/ShopControlPage.tsx`
- `frontend/src/pages/VaultControlPage.tsx`
- `frontend/src/pages/SubscriptionSpotlightPage.tsx`
- `frontend/src/pages/MarketplacePage.tsx`
- `docs/GSN_SHOP_AND_VAULT_PRICING_DECISION_2026-09-17.md`
- `docs/GSN_PRICING_AND_COSTING_OPEN_QUESTIONS_2026-09-17.md`
- `docs/GSN_COSTING_ARCHITECTURE_AND_PRICING_THEORY_2026-09-17.md`
- `docs/GSN_SCENARIO_BASED_COSTING_FRAMEWORK_2026-09-17.md`
- `docs/GSN_PIPELINE_CREDIT_COSTING_AND_PILOT_PRICING_NOTE_2026-09-16.md`
- `docs/GSN_API_SERVICE_INVENTORY_AND_COST_RESEARCH_2026-09-16.md`
- `docs/GSN_ADVANCED_ANALYTICS_OPPORTUNITY_ENGINE_BRIEF_2026-09-13.md`
- `docs/SCREEN_SPECS.md`
- `docs/FREEZE_POLICY.md`

## Final truth boundary

This map proves technical readiness and commercial gaps. It does not prove demand, conversion, revenue, gross margin, retention, break-even or valuation. Those require actual reconciled payments and measured delivery costs.
