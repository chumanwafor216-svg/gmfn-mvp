# GSN Pipeline Credit Regional Affordability And Enforcement Architecture - 2026-11-12

Status: owner-directed architecture and research conclusion. It is deliberately not enforced during customer discovery. No regional conversion, acquisition pack, or provisional service debit in this document is an active customer price.

## Executive decision

GSN will use one customer-facing, non-cashable Pipeline Credit balance with two deliberately separate catalogues:

1. a country-local acquisition catalogue that determines what a customer pays to obtain a fixed number of Pipeline Credits; and
2. a global service catalogue that determines how many Pipeline Credits a GSN service consumes.

The same service version should normally consume the same number of credits everywhere. Regional affordability changes the local cash price of acquiring credits, not the service's credit debit. This keeps the user explanation simple and prevents one service from appearing more valuable in one country than another.

GBP is the planning anchor for internal comparison. It is not the denomination of the customer ledger. Pipeline Credits remain service-use units and must not be described as GBP, money, savings, a bank balance, a cash-out product, or transferable stored value.

Regional pricing must remain in `research`, `draft`, or `shadow` mode until customer discovery and the activation gates in this document are satisfied. An operator may prepare and preview versions without creating a spendable customer quote. Live enforcement requires a reviewed `Enforce and lock` action that creates a new immutable version with an effective time. Historical quotes, spends, rights, and balances are never repriced.

## Owner direction consolidated

The following direction is now settled for architecture:

- all new chargeable GSN service actions ultimately consume Pipeline Credits;
- approximately five credits for a Region A GBP 1 acquisition is a working discovery anchor, not an active rate;
- customers in different countries may pay different local-currency amounts to acquire the same five-credit pack;
- neutral pricing regions or country profiles replace first-, second-, or third-world language;
- customer discovery determines the amount people will actually pay before enforcement;
- the Command Centre owns country assignment, acquisition packs, service debits, state, version, effective time, and enforcement;
- user surfaces remain simple even when pricing governance is sophisticated internally;
- ordinary users cannot submit or override their pricing region, conversion, service amount, or debit;
- credits remain account-scoped and non-transferable between ordinary users to prevent regional arbitrage;
- sponsor support is a separate governed allocation, not a user-to-user transfer.

The owner's initial affordability thought may be retained as a shadow hypothesis:

| Research band | Initial relative acquisition hypothesis | Meaning |
|---|---:|---|
| A | 100% of the GBP anchor | Higher-income or otherwise locally affordable markets |
| B | 50% of the GBP anchor | Emerging or materially lower-affordability markets |
| C | 25% of the GBP anchor | Lowest-affordability or explicitly subsidised access markets |

These percentages are not automatic prices. World Bank evidence uses four income groups, countries within one group differ materially, and individual ability to pay differs inside every country. The data model must therefore support country-specific factors and prices rather than hardcoding three permanent world tiers.

## Repository truth already established

The repository already contains important parts of the target architecture:

- purpose-scoped `customer_service` and `provider_operations` Pipeline Credit accounts;
- a decimal customer balance with optimistic versioning;
- versioned pricing policies and service-price versions;
- immutable 15-minute service quotes;
- idempotent spend orders and ledger entries;
- an atomic debit-and-delivery implementation for `vault.slot`;
- a registered but unconnected catalogue for Paid Spotlight, Paid Repost, extra public shop space, Merchant Verification, member capacity, Community Domain, ROSCA, and Meeting Pack;
- a platform-admin Command Centre pricing route;
- a global payment-operations environment gate;
- a Dashboard balance status and a secondary collapsed Profile/My GSN credit area;
- older direct-payment entitlements and a separate Member Service Credit engine that still require deliberate migration or retirement.

The canonical migration map, module decision register, revenue truth map, forecasting rules, and pilot costing note already require non-cashable credits, service attribution, immutable history, regional discovery, provider/customer segregation, and no double counting of top-up and consumption.

## Contradictions and implementation gaps before enforcement

1. `frontend/src/pages/FinancePage.tsx` previously said one Pipeline Credit means GBP 1. That live contradiction was corrected in this work and is now protected by the Finance audit.
2. The untracked September costing note contains the historical one-credit-equals-GBP-one example. It remains historical evidence, not current policy; tracked canonical sources supersede it.
3. Command Centre now has global commercial status, global service credit cost, and country-local acquisition-pack controls; no price or pack is seeded or activated.
4. Vault now uses the commercial control. Research blocks quotes/debits, shadow and pilot previews are non-spendable, enforced is the only spendable mode, and suspended blocks new decisions.
5. Service quotes ignore client region and use the global service cost. The acquisition-pack catalogue remains separate from the service catalogue.
6. Global service pricing and country-local acquisition packs are now separate, with immutable commercial-status and acquisition-pack lifecycle versions.
7. The research/draft/shadow/pilot/enforced/suspended/retired commercial lifecycle and immutable control versions now exist; named-cohort pilot enforcement and effective scheduling remain outstanding.
8. The service-spend path now has an independent global payment-operations guard. Payment suspension still blocks a spend even when commercial control is otherwise available.
9. Customer top-up remains disconnected from the canonical `customer_service` acquisition path, and the older Member Service Credit engine still coexists with the customer-service Pipeline Credit balance.
10. Acquisition-pack configuration exists, but server-resolved billing-country assignment, country evidence and change review, acquisition orders/checkout, and tax snapshots do not.
11. `Apply status` and one-click `Suspend` exist in Command Centre, but the full reviewed effective-time `Enforce and lock` workflow remains outstanding.
12. Regional acquisition and ordinary-user charging therefore remain dormant: no operator value is seeded or activated, and shadow/pilot previews cannot be agreed or spent.

Regional pricing must not be enforced while these contradictions remain.

## External benchmark conclusions

### OpenAI

Official OpenAI material demonstrates several relevant patterns:

- prepaid credits are bought before use and the balance decreases as eligible services are consumed;
- the balance is visible in the account or workspace;
- service credits are not currency, legal tender, a bank account, or a general wallet and are ordinarily non-transferable;
- purchased and promotional credits are distinguishable;
- automatic recharge, where available, uses a threshold, target balance, and optional monthly cap;
- credit availability, purchase amounts, payment methods, and feature support may vary by account, plan, and region;
- local subscription prices may differ from a direct conversion of a US price;
- ChatGPT Go is positioned as a lower-cost plan, with localized pricing in some markets and explicit learning from early use and feedback;
- API credit purchases remain USD-only, proving that one company may use different billing models for different products.

OpenAI does not publish a formula that maps countries to localized prices. GSN must not claim that OpenAI uses World Bank income tiers or the GSN factors proposed here.

Sources:

- [OpenAI prepaid API billing](https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing)
- [OpenAI service credit terms](https://openai.com/policies/service-credit-terms/)
- [OpenAI credits for flexible ChatGPT usage](https://help.openai.com/en/articles/12642688-using-credits-for-flexible-usage-in-chatgpt-personal-plans)
- [OpenAI multi-currency billing](https://help.openai.com/en/articles/10421635-multicurrency-billing)
- [Introducing ChatGPT Go](https://openai.com/index/introducing-chatgpt-go/)

### Telecommunications

Official Vodafone UK and MTN Nigeria material demonstrates a reusable prepaid pattern:

- a cash/airtime balance is separate from a purchased service bundle;
- the customer chooses a bundle with a defined allowance, validity, and local-currency price;
- renewal occurs only when explicitly enabled and sufficient balance exists;
- one-off purchase remains available without automatic renewal;
- the customer can inspect balance, validity, and usage;
- low-balance or high-usage reminders are sent before exhaustion;
- insufficient balance stops or changes service rather than silently creating debt;
- catalogues are market-local and use local psychological price points, validity periods, and bundle sizes rather than a visible global FX formula;
- small sachet bundles provide low entry points without redefining the underlying service unit.

GSN should copy the separation, visibility, explicit renewal, local catalogue, and sufficiency controls. It should not copy telecom user-to-user airtime transfer because regional Pipeline Credit transfer would create arbitrage and accounting risk.

Sources:

- [Vodafone UK Pay as you go](https://www.vodafone.co.uk/mobile/pay-as-you-go-plans/how-payg-works)
- [MTN Nigeria data bundles](https://www.mtn.ng/helppersonal/data-bundles/)
- [MTN Nigeria sachet bundles](https://www.mtn.ng/helppersonal/sachet-bundles/)
- [MTN Nigeria data-plan catalogue](https://www.mtn.ng/data-plans-overview/)

### Public affordability metrics

The public basis for GSN's internal affordability recommendation should be:

- World Bank income classification, which groups economies by GNI per capita using the Atlas method;
- World Bank or other authoritative PPP evidence as a secondary purchasing-power signal, not as the only price;
- ITU affordability, which expresses service price as a percentage of monthly GNI per capita and uses two per cent as the universal meaningful-connectivity affordability target for entry-level broadband;
- GSMA affordability analysis, which compares device or data cost with income;
- GSN's own observed willingness to pay, actual payment, usage, renewal, support burden, and direct delivery cost.

The ITU two-per-cent target is a connectivity benchmark, not a ready-made GSN price. It is useful for testing whether a proposed digital-service entry price is obviously disproportionate, but customer discovery and cost floors still govern the final decision.

Sources:

- [World Bank country and lending groups](https://datahelpdesk.worldbank.org/knowledgebase/articles/906519-world-bank-country)
- [World Bank classification methodology](https://datahelpdesk.worldbank.org/knowledgebase/articles/378834-how-does-the-world-bank-classify-countries)
- [ITU affordability background](https://www.itu.int/en/mediacentre/backgrounders/Pages/affordability.aspx)
- [ITU affordability of ICT services](https://www.itu.int/dms_pub/itu-d/opb/ind/D-IND-ICT_PRICES.01-2025-PDF-E.pdf)
- [GSMA mobile internet affordability methodology](https://www.gsma.com/solutions-and-impact/connectivity-for-good/external-affairs/wp-content/uploads/2022/11/The-State-of-Mobile-Internet-Connectivity-Report-2023.pdf)

## Canonical pricing model

### Global service debit

Each chargeable service receives one stable service code and one global credit debit per version unless a documented delivery-cost exception requires a regional service version.

Examples remain hypotheses:

- `paid_spotlight.day`: one governed day or later approved appearance unit;
- `paid_repost.reach`: one defined reach/destination band;
- `vault.slot`: one private block for the configured duration;
- `shop.extra_space`: one extra public space for the configured duration.

The service catalogue records credit cost, quantity bounds, duration, delivery effect, refund/reversal rule, connection status, and immutable version. It does not contain a customer-selected region.

### Country-local acquisition pack

A separate acquisition-pack version records:

- country code and pricing-region code;
- billing currency;
- pack code and credit quantity;
- local cash amount in minor units;
- tax and processor-fee treatment;
- customer account purpose and eligible owner types;
- effective start and end;
- research evidence snapshot;
- status and enforcement version;
- immutable terms version.

A standard five-credit pack may be used as the smallest comparison unit in research. Larger packs may reduce payment-fee friction, but no pack should be activated until payment costs and customer behavior are measured.

### Recommendation, not automatic publication

The Command Centre may calculate an internal recommendation:

```text
candidate local price
  = GBP planning anchor
  x current FX reference
  x affordability factor
  x discovery adjustment
  x channel/tax adjustment
```

The operator then checks:

```text
recommended local price
  = max(candidate local price, direct cost and risk floor)
```

The system must not automatically publish a price from this formula. FX volatility, taxes, payment fees, support burden, sanctions/payment availability, competitive conditions, and customer evidence require operator review.

Minimum evidence fields:

- source country and currency;
- World Bank income group and source year;
- monthly GNI-per-capita reference;
- available PPP reference;
- ITU/GSMA affordability reference where available;
- FX source and observation time;
- payment-channel fixed and percentage fees;
- tax assumptions;
- direct service-delivery and support-cost floor;
- number of qualified discovery observations;
- offered-price range;
- accepted-price range;
- actual reconciled payments;
- usage, repeat purchase, cancellation, refund, dispute, and support evidence;
- operator rationale and reviewer identity.

## Pricing-region assignment

Pricing region is an account billing attribute, not a free purchase-screen choice.

The server resolves it from an approved country profile and account evidence such as:

- declared billing country;
- verified payment-method country where available;
- organisation registration or operating country for organisation accounts;
- manual review evidence for genuine relocation or correction.

Rules:

- the client never submits the authoritative pricing region for a spendable quote;
- country changes affect future acquisition quotes only;
- historical acquisitions, balances, quotes, and spends retain their original evidence;
- repeated changes, payment-country mismatch, VPN/geolocation signals, or suspicious patterns may require review, but IP location alone must not determine entitlement;
- a user may request correction but cannot instantly switch to a cheaper region;
- credits remain non-transferable between ordinary users;
- sponsor-funded access uses an explicit sponsor account or grant with named beneficiaries and terms.

## Enforcement lifecycle

Every country acquisition profile and service version follows:

1. `research` - evidence only; no customer quote;
2. `draft` - operator values saved; no customer quote;
3. `shadow` - server can calculate internal non-spendable quotes for discovery and QA;
4. `pilot` - limited named cohort, limits, dates, and rollback controls;
5. `enforced` - eligible ordinary accounts can receive spendable quotes;
6. `suspended` - no new acquisition or spend; history and existing rights remain visible;
7. `retired` - immutable historical version only.

The default is `research` or `draft`.

`Enforce and lock` must be simple on the surface but cannot be a blind single click internally. The operator flow is:

1. `Review enforcement` shows country, currency, pack, service debit, connected delivery, dates, evidence, affected cohort, refund rule, tax status, and rollback plan.
2. A second privileged confirmation creates a new immutable enforcement version and effective timestamp.
3. The prior enforced version retires only when the new version becomes effective.
4. Suspending creates a new decision event; it does not delete history or revoke already delivered rights.

No live debit is allowed unless all applicable gates pass:

- global payment operations enabled;
- Pipeline Credit commercial enforcement enabled;
- canonical customer-service acquisition connected;
- account pricing country/region server-resolved;
- acquisition pack enforced for that account and currency;
- service version enforced globally;
- atomic delivery handler connected and healthy;
- customer terms accepted;
- quote unexpired and sufficient balance confirmed;
- idempotency, ledger, reversal, and audit controls active.

## Customer-discovery mode

During discovery, GSN may use shadow offers without charging or debiting:

1. identify the buyer and payment authority;
2. identify the exact service and unit;
3. show a proposed local-currency price or credit cost clearly labelled as research;
4. record accept, reject, too high, too low, uncertain, or needs sponsor;
5. never treat stated interest as payment evidence;
6. record actual reconciled payment only in an approved controlled pilot;
7. measure activation, use, delivery cost, support time, refund/dispute, repeat purchase, and renewal;
8. revise the draft version without rewriting prior observations.

Minimum evidence before ordinary enforcement:

- approved customer terms and non-cashable boundary;
- at least one connected atomic service with tested reversal;
- named buyers with payment authority;
- actual reconciled pilot payments, not only interviews;
- delivered and used service value;
- direct cost and support measurement;
- at least one repeat purchase or renewal signal;
- more than one independent payer before treating the price as repeatable;
- documented accounting, tax, refund, expiry, and dispute treatment;
- security review of country assignment and regional arbitrage controls.

## Simple member experience

The member should see only what is needed for the current decision.

Balance surfaces:

- Dashboard Identity Passport: compact balance at a glance;
- Profile/My GSN: one secondary collapsed account row with balance, acquisition/activity access, and no operator controls;
- paid action: exact cost, current balance, resulting balance, and one confirmation;
- insufficient balance: exact shortfall and one `Add credits` action when acquisition is enforced.

Paid action surface:

```text
Costs 10 Pipeline Credits
You have 18
8 will remain

[Confirm]
```

Internal pricing region, GNI, PPP, World Bank class, FX, version, provider gates, and enforcement machinery remain hidden from ordinary users. The receipt or activity record may show local currency paid, credits acquired, service credits consumed, date, and reference.

Automatic reload should remain off until separately approved. If later introduced, it must be opt-in with a threshold, target, monthly cash cap, clear renewal notice, and immediate off control.

GSN should reject insufficient balance rather than permit a negative customer balance.

## Command Centre surface

Keep the operator surface progressive and compact:

1. `Pricing status` - Research, Shadow, Pilot, Enforced, or Suspended;
2. `Country pricing` - select country, currency, evidence, and five-credit pack;
3. `Service prices` - global credit debit, unit, duration, delivery connection;
4. `Discovery evidence` - compact counts and latest reviewed observations;
5. `Review enforcement` - one selected country/service package at a time;
6. `Enforce and lock` or `Suspend` - privileged, versioned decision.

Do not show every country, service, historical version, and enforcement form at once. History remains behind one disclosure.

## Provisional price boundary

Existing examples are retained only for discovery and regression context:

- five Pipeline Credits for GBP 1 in Region A is a working acquisition hypothesis;
- one credit for a normal Spotlight day is a working service hypothesis;
- five credits for one defined Repost reach band is a working service hypothesis;
- extra public shop space has conflicting historical GBP 1 and GBP 2 annual examples;
- a proposed GBP 1 monthly shop amount would equal 60 credits per year at five credits per GBP 1 and is not equivalent to GBP 2 annually;
- Vault has conflicting historical monthly and annual discussions and therefore remains operator-configured.

No provisional amount should become active merely because it appears in documentation or a form. Extra shop space, Spotlight, Repost, and other unconnected services may have draft or shadow versions only until their delivery and discovery gates pass.

## Decisions deliberately left open

- exact country prices and pack sizes;
- final affordability factors or number of internal pricing bands;
- exact service debits, duration, renewal, and quantity rules;
- purchased-credit expiry and inactivity treatment;
- refund, reversal, chargeback, and closure treatment;
- promotional-credit expiry and spending priority;
- taxes and revenue-recognition treatment;
- whether any future auto-reload is appropriate;
- sponsor grant rules and beneficiary limits;
- country-change evidence and review service level;
- minimum sample size for regional rollout beyond the evidence gates above.

These are configuration and policy decisions, not reasons to rebuild the ledger or quote architecture.

## Required implementation sequence

1. Keep misleading one-credit-equals-GBP-one copy absent from live surfaces and treat historical examples as superseded - live Finance correction completed.
2. Keep the new service-spend endpoint behind the global payment-suspension guard - completed.
3. Remove authoritative client control of `region_code`; client region is now ignored, but server country assignment remains outstanding.
4. Separate global service debit versions from country-local acquisition-pack versions - completed.
5. Add research/draft/shadow/pilot/enforced/suspended/retired lifecycle and immutable enforcement decisions - partially completed with immutable global control and acquisition versions; named-cohort enforcement and effective scheduling remain outstanding.
6. Add country profile, evidence snapshot, region-change review, and acquisition quote/order models - partially completed with pack versions; evidence, assignment, and acquisition-order work remains outstanding.
7. Route reconciled customer top-ups into canonical `customer_service` accounts.
8. Migrate or retire the Member Service Credit customer balance using proven purchase provenance only.
9. Add Command Centre country pricing, shadow preview, review, enforce-and-lock, suspend, and history surfaces - partially completed; status, service, pack, and suspend UI exists, while formal review, effective time, and history disclosure remain outstanding.
10. Keep ordinary user flows simple and connect one service at a time.
11. Run a named-cohort pilot before any regional ordinary-user enforcement.

## Final truth boundary

The repository now has a safe dormant Pipeline Credit control plane with global service-cost/status control, immutable commercial and acquisition versions, mode-aware Vault behavior, and an independent payment-operations guard. It defaults to `research`: no price or pack is seeded or activated. Regional acquisition is not operational or enforced because server-resolved billing-country assignment, evidence/change review, pack checkout/acquisition orders, tax/refund/expiry policy, named-cohort pilot enforcement, the full reviewed effective-time workflow, canonical customer top-up, and legacy wallet retirement remain incomplete.
