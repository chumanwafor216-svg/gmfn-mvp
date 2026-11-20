# GSN Financial Engine Decision and Implementation Audit

**Date:** 20 November 2026  
**Status:** Founder decision framework; market proof and production activation remain gated

## Decision

GSN should be defined as:

> **A trust-aware commerce and opportunity network whose social infrastructure preserves portable evidence of real activity, and whose primary scalable commercial engine is paid promotion, opportunity distribution, and corporate advertising.**

This is a qualified **yes** to a promotion-led financial engine. It is not a decision to turn GSN into a generic advertising feed, and it is not evidence that advertising revenue is already proven.

The commercial structure should be:

1. **Free utility and organic discovery** create useful participation and market liquidity.
2. **Paid merchant promotion** sells additional, clearly labelled distribution, not ordinary access.
3. **Corporate and institutional campaigns** buy governed access to relevant public opportunity contexts.
4. **Community, verification, workflow, and programme services** stabilise revenue while audience and advertising demand develop.
5. **Later analytics and integrations** become paid products only after data quality, permission, usefulness, and repeat value are demonstrated.

TrustSlip is not the advertisement. TrustSlip is the portable evidence receipt or case file produced from real activity. Promotion may create an opportunity; evidence records what actually happened. These functions must remain separate.

The refined TrustSlip model does not create a new payer by itself. A merchant
buying Spotlight pays for promotion. An organisation buying Community Domain
pays for defined workflow or service. A sponsor pays for programme delivery.
TrustSlip may improve continuity, reporting, retrieval, transparency, or
retention within those services, but the same payment must not be relabelled or
counted again as TrustSlip revenue.

For product explanation, TrustSlip now has four public layers: activity,
structured evidence receipt, purpose-specific presentation, and recipient
decision. Automatic capture means supported events can create precisely labelled
receipts; it does not mean automatic verification or automatic conversion of a
contact into a completed sale.

## What this does not mean

- Private community activity does not become targeting inventory.
- TrustSlip evidence, testimony, affiliations, and sensitive needs are not sold to advertisers.
- Merchants do not pay merely to remain organically searchable.
- Paid placement is never presented as trust, verification, endorsement, or guaranteed sales.
- Corporate advertising is not GSN's only revenue source.
- Advertising does not enter the base forecast before buyer and repeat-purchase evidence exists.

Calling GSN an **advertising-only company** would be strategically weak. Advertising requires repeat audience, dependable inventory, advertiser demand, measurable outcomes, and sales operations. GSN does not yet have proof of all five. The defensible description is **promotion-led trusted commerce and opportunity infrastructure**.

## Why the direction fits

GSN already combines Shops, products and services, Spotlight, DemandBox, opportunity intent, campaign pacing, exposure records, attention and contact signals, protected outcomes, community allocation, payment concepts, and TrustSlip evidence.

The intended loop is:

> **Need or offer -> discovery -> labelled promotion -> contact -> activity -> outcome evidence -> better future matching.**

GSN's claim should not be that it knows everything about a person. It should be that it connects permitted public needs and offers, measures whether useful action followed, and preserves evidence without turning private trust data into advertising inventory.

## Code truth: what already exists

### Promotion and campaign infrastructure

The repository already contains:

- Spotlight campaigns with intent, geography, expiry, source, commercial mode, and distribution scope;
- pacing state, delivery rounds, eligibility timing, exhaustion, and frequency controls;
- Marketplace broadcasts and public campaign presentation;
- governed GSN house campaigns for central advertising;
- qualifying-impression exposure records;
- campaign settlement records;
- community advertising earnings allocated from qualifying paid impressions;
- payout mandates, statements, payout preparation, and external-payment recording.

This is a real technical foundation, not merely a presentation concept.

### Measurement

GSN already records or computes Shop visits, product opens, Spotlight impressions, Spotlight-to-Shop clicks, contact taps, attributed share paths, protected outcomes, and qualifying campaign impressions.

The code correctly warns that views and taps are not sales, payment evidence, verification, or a trust score. That boundary must remain.

### Discovery

An unauthenticated public Shop route exists when the Shop owner or GSN identity is already known. This supports direct links and external sharing.

However, the searchable Shop directory is authenticated and restricted to the selected community. It is not a universal public search index across all Shops and products. **Direct public presentation exists; global public discovery does not.**

### Commercial rails

The repository contains several partially overlapping rails:

- Spotlight expected-payment and bank-transfer flow;
- member-credit Spotlight activation;
- Pipeline Credit catalogue, quote, spend, and ledger;
- advertising settlement and community revenue sharing.

They are not one finished production system. Paid Spotlight in the Pipeline Credit catalogue is not connected, the member-credit writer is feature-gated and requires a test-active service, and payment operations default to suspended for the free pilot.

## Readiness verdict

### We can decide now

- **Social/institutional engine:** evidence, continuity, coordination, and TrustSlip.
- **Economic engine:** discovery, matching, paid promotion, and corporate opportunity distribution.
- **Revenue stabilisers:** Community Domain, verification, workflow, programme delivery, and later analytics/integrations.

There is enough code to implement a bounded paid-promotion pilot without rebuilding GSN from zero.

### We cannot honestly claim now

- advertising is a proven primary revenue source;
- the audience is large or active enough to sustain advertiser demand;
- merchants or corporate advertisers will repeatedly pay;
- views reliably become serious contacts, completed activity, margin, or retention;
- the existing GBP pricing is economically correct;
- community advertising payouts operate at scale;
- universal public product discovery is live;
- the five-year forecast may include material advertising revenue.

The disciplined forecast remains correct to hold advertising at GBP 0 in the base case until buyer, delivery, pricing, cost, accounting, privacy, and repeat-purchase gates are passed.

## What must be added

### 1. Canonical public discovery

- Separate **public discoverability** from **community visibility** in the data contract.
- Index active public Shops, products, and services across permitted public scope.
- Support text, category, broad location, availability, and remote-service search.
- Rank organic relevance separately from paid promotion.
- Let owners hide or pause public discovery.
- Never expose private membership, private requests, TrustSlip testimony, exact private location, or restricted contact data.
- Explain why a result appeared and provide abuse reporting.

The founder's desired default may be **publicly discoverable unless the owner switches discovery off**, but this must be an explicit privacy and product contract, not an accidental interpretation of `community_visible`.

### 2. One paid-promotion rail

Expected-payment Spotlight, member credits, and Pipeline Credits must not remain competing user-facing commercial systems. Select one canonical rail and define:

- purchased unit and delivery promise;
- eligible inventory;
- duration or qualifying-impression allowance;
- pacing and frequency;
- under-delivery and refunds;
- expiry, renewal, correction, and withdrawal;
- ledger, settlement, tax, and accounting ownership.

A day alone is a weak unit because time can pass without useful delivery. Pilot both:

1. fixed-duration rotation with minimum eligible delivery; and
2. a qualifying-impression package with an expiry ceiling.

### 3. Governed advertiser workflow

Add advertiser identity and authority, objective, destination, creative, permitted context selection, budget, capacity estimate, policy review, payment, approval, live status, correction/stop, delivery report, invoice, and refund history. Sensitive sectors remain manually reviewed.

### 4. Inventory admission

Before accepting money, calculate eligible audience/context, available positions, existing commitments, pacing/frequency limits, geography, timing, expected qualifying delivery, and reserved organic capacity. Reject, resize, reschedule, or refund campaigns GSN cannot deliver.

### 5. Advertiser-grade reporting

Report eligible opportunities, qualifying impressions, permitted unique reach, frequency, clicks, contact intent, attributed serious contacts, voluntarily linked protected outcomes, unit costs, under-delivery, refunds, and renewal. Never claim a sale from a click or infer trust from attention.

### 6. Commercial operating evidence

Record sales effort, acquisition cost, moderation/support cost, payment and refund cost, infrastructure cost, buyer segment, first purchase, renewal, churn, community-share liability, and actual payout completion. Without these, break-even modelling is storytelling rather than finance.

## What should be removed or prevented

- Multiple competing paid-Spotlight purchase explanations.
- Unconnected catalogue services presented as ready to buy.
- The assumption that `community_visible` means globally public.
- Charging for ordinary organic search visibility.
- Prices unrelated to delivery cost or buyer value.
- Promotion that looks like verification or endorsement.
- Private TrustSlip, private DemandBox, or affiliation data used as ad attributes.
- Forecast revenue based on issued credits, free placements, views, or intended prices.
- Paid campaigns accepted without capacity and refund rules.
- Community allocations described as cash paid before an external transfer is recorded.

## Financial architecture

### Layer A: Free participation

Account/community participation, one useful Shop, organic public discovery for public offers, direct Shop sharing, permitted DemandBox activity, and ordinary TrustSlip evidence capture. Free utility must not be crippled to force payment.

### Layer B: Merchant promotion

Paid Spotlight, expanded campaign reach, promoted repost/distribution, measurable extra Shop capacity, and later genuine merchant-verification services. Payment buys distribution or service, never trust.

### Layer C: Corporate opportunity distribution

Labelled central campaigns, contextual campaigns against public offer/need categories, sponsored opportunity programmes, authorised regional/community-context delivery, reporting, and community revenue share. This is the strongest candidate for the primary scalable revenue engine.

### Layer D: Enterprise and institutional services

Community Domain, programme administration, verification workflow, reporting, integration, evidence review/export, implementation, and support. This stabilises GSN while advertising demand develops.

### Layer E: Later intelligence

Merchant analytics, opportunity reports, campaign optimisation, APIs, and lawful aggregated market insight. This remains gated.

## Implementation sequence

### Phase 1: Organic discovery

1. Approve the public-discovery privacy contract.
2. Separate public and community visibility.
3. Build global public Shop/product search.
4. Add owner hide/pause controls.
5. Add result explanation and abuse reporting.
6. Measure searches, opens, contacts, and outcomes.

### Phase 2: Merchant promotion pilot

1. Select one payment/credit rail.
2. Define delivery and refund rules.
3. Connect paid Spotlight delivery.
4. Keep payment gated to a named pilot cohort.
5. Produce merchant reports from existing signals.
6. Test willingness to pay, contact quality, and repeat purchase.

### Phase 3: Corporate campaign pilot

1. Use the existing GSN house campaign and settlement infrastructure.
2. Add advertiser intake and approval.
3. Add inventory admission before payment.
4. Run bounded campaigns with named buyers and objectives.
5. Finalise only from qualifying evidence.
6. Record community liabilities and external payouts correctly.

### Phase 4: Optimisation

Compare merchant promotion, corporate campaigns, and enterprise services; retire weak units; improve permitted matching; automate only repeatable operations; and add forecast revenue only after proof gates pass.

## Financial proof gates

Advertising enters the base forecast only after:

1. two independent paying buyers;
2. one genuine repeat purchase or renewal;
3. written delivery and refund rules;
4. measured inventory and qualifying delivery;
5. observed click/contact/outcome paths without overstating causation;
6. campaign-specific delivery and support costs;
7. functioning settlement and accounting;
8. no material privacy breach;
9. evidence that paid promotion does not destroy organic usefulness;
10. credible gross margin and cash collection.

## Core metrics

### Utility

Active Shops, searchable offers, searches with useful results, result-to-Shop opens, contact intent, completed outcomes, and repeat buyers/sellers.

### Promotion

Eligible inventory, fill rate, qualifying impressions, permitted reach/frequency, click/contact rates, cost per serious contact, under-delivery/refunds, and renewal.

### Evidence

Activities with preserved evidence, resolved/disputed outcomes, purpose-specific TrustSlips, recipient review, corrections/challenges, and evidence reuse.

### Finance

Cash collected, recognised revenue, delivery/support cost, community liability, refunds/chargebacks, gross margin by line, acquisition cost, payback, renewal, and churn.

## Devil's-advocate risks

1. **No audience, no advertising business.** Campaign code cannot create repeat attention.
2. **Discovery can become noise.** Universal indexing without quality and moderation may reduce usefulness.
3. **Monetisation can damage trust.** Payment must never resemble endorsement.
4. **Corporate buyers can distort priorities.** Member utility and privacy remain protected.
5. **Manual bank transfers do not scale cheaply.** Reconciliation may consume margin.
6. **A day is not necessarily value.** Duration can pass without delivery.
7. **Revenue sharing creates liabilities and governance work.**
8. **More data is not automatically better matching.**
9. **Advertising is cyclical.** Enterprise services are necessary stabilisers.
10. **Architecture is not market proof.** Five-year numbers remain fragile until pilots produce evidence.

## Final founder position

> **GSN's primary scalable economic engine should be promotion and advertising tied to useful discovery, matching, and measurable opportunity. GSN's social and institutional foundation should remain evidence, continuity, and TrustSlip. Corporate promotion should subsidise broad ordinary participation where possible, while enterprise/community services stabilise revenue.**

The product is implementable from the existing codebase, but it is not ready to be declared a finished advertising machine. The next move is not a broad rebuild. It is a disciplined sequence: public discovery contract, one canonical paid-promotion rail, bounded merchant and corporate pilots, measured outcomes, and only then a defended five-year financial model.
