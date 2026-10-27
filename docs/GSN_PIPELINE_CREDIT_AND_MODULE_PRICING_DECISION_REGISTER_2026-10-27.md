# GSN Pipeline Credit And Module Pricing Decision Register - 2026-10-27

Status: owner-approved payment-model direction plus implementation-gap audit. Credit value and module debit amounts remain deliberately unfixed pending regional customer discovery.

## Commercial model

GSN's intended customer model is:

```text
Customer pays GSN
  -> receives non-cashable GSN Pipeline Credits
  -> chooses a chargeable GSN service
  -> that service debits credits under its own service code
  -> GSN reports consumed value by service line
```

The cash value of one Pipeline Credit is not decided. The owner's current working thought is approximately five Pipeline Credits per GBP 1, but this is an example for later testing, not an approved exchange rate. Credits are usage rights, not money, savings, a bank balance, lending or a cash-out product. Transfers between users are not approved.

The top-up and the later debit must not both be counted as two sales. The top-up funds the balance; consumption identifies the service revenue line. Recognition timing, tax, expiry, refunds and unused balances require professional accounting advice.

## Runtime truth: the universal wallet does not exist yet

The repo currently contains two different credit systems:

1. `PipelineCreditAccount` uses decimal amounts to two places, but its code contract says it is an internal provider/API usage-control account, not a customer wallet.
2. `MemberServiceCreditAccount` is an isolated test catalogue for member services. It uses integer units and currently exposes only Spotlight when feature flags permit it.

Neither is the owner-approved universal customer credit rail. Calling today's runtime unified would be false. The implementation must choose one canonical ledger, migrate or retire the duplicate meaning, preserve audit history, and keep the public product boundary non-cashable.

The reuse-first ledger, catalogue, atomic-spend and migration design is mapped in `docs/GSN_CANONICAL_PIPELINE_CREDIT_MIGRATION_MAP_2026-10-27.md`. It is architecture only and does not authorise payment activation.

The canonical ledger must support a configurable credit catalogue by service and region. The denomination, divisibility and debit amounts must be chosen only after the exchange-rate and regional-pricing decisions are made.

## Provisional module register

| Revenue line | Working example, not price | Historical/runtime truth | Decision state |
|---|---:|---|---|
| Paid Spotlight | Example: one credit for one day of normal rotation | Current runtime sells one day-credit at GBP 1, with six credits for GBP 5 | Must use Pipeline Credits; debit remains undecided |
| Paid Repost | Example: five credits for governed reach across five average communities or a defined target region | Current runtime consumes the same one-credit-per-day entitlement as Paid Spotlight | Must use Pipeline Credits under a separate service code; debit and reach bands remain undecided |
| Extra public shop space | No fixed credit amount yet | Six spaces are included, with a maximum of four paid extras; runtime charges GBP 1 per annual extra and an earlier owner discussion used GBP 2 | Must use Pipeline Credits; debit and period remain to be confirmed |
| Community Domain | No fixed credit amount yet | A GBP 10 monthly / GBP 99 annual cash proposal exists in the amendment register; payment creation is currently suspended | Must use Pipeline Credits; regional debit and package remain undecided |
| Private Vault | No fixed credit amount yet | Runtime is GBP 5 per private slot for 30 days, maximum two; later discussion mentioned GBP 5 per year conditionally | Must use Pipeline Credits; debit and duration remain undecided |
| Merchant Verification | No fixed credit amount yet | Annual entitlement and payment rail exist, but the frontend sends GBP 1 while the backend accepts any positive amount. No preserved approved amount was found. | Must use Pipeline Credits; debit must be chosen and server-owned |
| TrustSlip core | Included inside trust/evidence infrastructure; no duplicate charge | Merchant Verification can govern the active public merchant-verification status. Core TrustSlip issue/read has no separate paid entitlement. | Keep within Merchant Verification family unless incremental paid value is defined |
| Extra member capacity | No fixed credit amount yet | Fifteen members are included. Runtime uses annual extra-member entitlement at GBP 1 per place, with six units for GBP 5. | Must use Pipeline Credits; debit needs regional discovery |
| Extra DemandBox capacity | No fixed unit or credit amount yet | DemandBox exists, but no paid extra-capacity entitlement, free allowance or canonical chargeable unit was found. | Define the unit before its Pipeline Credit debit |
| ROSCA yearly service | No fixed credit amount yet | Runtime has a server-owned GBP 60 annual service price | Must use Pipeline Credits; debit and regional policy remain undecided |
| Community Meeting Pack | No fixed credit amount yet | Runtime currently uses GBP 1 per unit and six for GBP 5 | Must use Pipeline Credits after the unit and consumption value are validated |
| Advanced Shop Analytics/AI | Unresolved | Basic Shop Activity is included. No connected paid advanced entitlement or AI-provider cost exists. | Planned product, not forecastable revenue |
| Additional Trade Records | Unresolved | No paid capacity entitlement exists | Define free allowance, record unit, retention cost and entitlement first |
| GSN Shop Reel | Basic/free versus premium export unresolved | The component engines exist in parts; no composed product or paid entitlement exists | Growth product definition approved, commercial boundary open |
| Bulletin reactions | Not a revenue line | Backend reactions are not enabled; other governed response engines exist | Organisation utility only |

## Spotlight, Repost and central advertising quote structure

Paid Spotlight and Paid Repost are separate revenue lines even though both draw from the same balance. The minimum future ledger distinction is:

- `paid_spotlight_appearance`;
- `paid_repost_appearance`;
- `central_advertising_appearance`.

The configurable pricing structure is:

```text
Paid Spotlight credits
  = catalogued base debit
  x governed appearance or day units
  x approved time factor
  x approved region factor

Paid Repost credits
  = catalogued repost base debit
  x governed reach/destination factor
  x approved time/region factors

Central advertising credits
  = promotion count
  x eligible destinations
  x scheduled appearance opportunities
  x approved time/region factors
```

The current GSN-HOUSE quotation engine already calculates promotion count x eligible destinations x days or scheduled opportunities, but it labels the result quotation-only, has no financial effect, and explicitly leaves peak-time surcharge undecided. It measures addressable active accounts, not guaranteed viewers or sales.

Reach must never be sold as guaranteed viewing. A paid unit buys a governed eligible presentation opportunity subject to policy, pacing, availability and qualification—not a guaranteed person, click, contact or sale.

## Regional pricing boundary

The base planning currency and the credit-to-cash exchange rate are not frozen. Customer discovery should determine locally acceptable top-up value and service debits for each region, participant type and use case. Credits must remain non-cashable and account-scoped if regional rates differ, otherwise people could arbitrage conflicting regional values.

Before regional pricing goes live, GSN must choose one safe policy:

- account-scoped, non-transferable regional credit rates;
- one global credit value with explicit regional service discounts or sponsor grants; or
- region-specific service debits while the top-up exchange rate remains constant.

The current decision does not choose among those three.

## GSN Shop Reel: reuse-first scope

`GSN Shop Reel` is a promotional package, not a social feed. Its job is to turn existing seller material into an attractive, owner-approved asset that can travel through WhatsApp, LinkedIn, Facebook and other phone share targets while linking back to the interactive GSN Shop.

Reuse these existing engines first:

- Shop/Public Shop identity, items, contact actions and stable public URLs;
- Shop Diary and exact-update public links;
- Spotlight media/message and governed promotion handoff;
- verified image/video preparation, ten-second video cap and existing sound editor;
- Campaign Renderer concepts for branded scenes, poster, thumbnail, captions and manifest;
- `SocialTagShareButton`, native share and WhatsApp Bridge;
- GSN Natural/Clear Finish where its frozen policy permits it.

The smallest useful first output is a reviewed short shop-promotion video or animated card containing the shop name, selected item(s), short offer, contact/action, `Presented through GSN`, and a link back to the exact GSN Shop or item.

Do not build automatic posting, a music-rights library, a creator marketplace, a new feed, or another Shop data model. The owner must review the output before sharing. Sound must be supplied/recorded by the owner or come from a later rights-cleared source.

## Decisions still required

1. After regional customer discovery, choose the credit-to-cash top-up rate; approximately five credits per GBP 1 is only the current working thought.
2. Define the debit, duration and renewal unit for Vault, Merchant Verification, extra shop space, extra members, Community Domain, ROSCA and Meeting Pack.
3. Define what one extra DemandBox unit actually buys before assigning credits.
4. Define region, participant, interest, reach and time bands for Spotlight, Repost and central advertising.
5. Decide whether credit balances are region/account-scoped or use one global value with regional service discounts.
6. Decide whether Shop Reel has a free basic export and paid premium export, or remains entirely an acquisition feature during the pilot.

## Evidence rule

Every provisional amount remains a hypothesis until GSN records real payment, use, delivery cost, refund/support burden and renewal behavior. A button, quote, expected-payment row or credit top-up is not willingness-to-pay evidence.
