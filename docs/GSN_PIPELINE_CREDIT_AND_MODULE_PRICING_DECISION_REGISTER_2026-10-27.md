# GSN Pipeline Credit And Module Pricing Decision Register - 2026-10-27

Status: provisional owner decisions plus implementation-gap audit. These amounts structure customer discovery. They do not prove willingness to pay, renewal, revenue, margin or regional affordability.

## Commercial model

GSN's intended customer model is:

```text
Customer pays GSN
  -> receives non-cashable GSN Pipeline Credits
  -> chooses a chargeable GSN service
  -> that service debits credits under its own service code
  -> GSN reports consumed value by service line
```

One Pipeline Credit currently has the planning value of GBP 1. Credits are usage rights, not money, savings, a bank balance, lending or a cash-out product. Transfers between users are not approved.

The top-up and the later debit must not both be counted as two sales. The top-up funds the balance; consumption identifies the service revenue line. Recognition timing, tax, expiry, refunds and unused balances require professional accounting advice.

## Runtime truth: the universal wallet does not exist yet

The repo currently contains two different credit systems:

1. `PipelineCreditAccount` uses decimal amounts to two places, but its code contract says it is an internal provider/API usage-control account, not a customer wallet.
2. `MemberServiceCreditAccount` is an isolated test catalogue for member services. It uses integer units and currently exposes only Spotlight when feature flags permit it.

Neither is the owner-approved universal customer credit rail. Calling today's runtime unified would be false. The implementation must choose one canonical ledger, migrate or retire the duplicate meaning, preserve audit history, and keep the public product boundary non-cashable.

Decimal credits are required if Paid Repost is exactly 50% above a one-credit Spotlight unit. The integer member-service ledger cannot represent a 1.5-credit debit.

## Provisional module register

| Revenue line | Provisional customer price/unit | Historical/runtime truth | Decision state |
|---|---:|---|---|
| Paid Spotlight | Base future unit: 1 credit per governed appearance before approved time/region factors | Current runtime sells one day-credit at GBP 1, with six credits for GBP 5 | Future appearance model recorded; migration not implemented |
| Paid Repost | 1.5 times the equivalent Paid Spotlight unit, then adjusted for selected reach/destinations and any approved time/region factors | Current runtime consumes the same one-credit-per-day entitlement as Paid Spotlight; no 50% rule was found in the searchable record | Owner decision recorded; separate pricing/service code not implemented |
| Extra public shop space | 2 credits per additional space for one year | Six spaces included, maximum four paid extras; runtime still charges GBP 1 per annual extra | Owner amount recorded; runtime not migrated |
| Community Domain | 10 credits monthly or 99 credits annually | This GBP 10/GBP 99 proposal exists in the Community Domain amendment register; payment creation is currently suspended | Owner amount reconfirmed; billing remains paused |
| Private Vault | Unresolved | Runtime is GBP 5 per private slot for 30 days, maximum two. The owner's latest wording mentioned GBP 5 per year conditionally. These differ by a factor of about twelve. | Owner must confirm duration before migration |
| Merchant Verification | Unresolved | Annual entitlement and payment rail exist, but the frontend sends GBP 1 while the backend accepts any positive amount. No preserved approved amount was found. | Price must be chosen and made server-owned |
| TrustSlip core | Included inside trust/evidence infrastructure; no duplicate charge | Merchant Verification can govern the active public merchant-verification status. Core TrustSlip issue/read has no separate paid entitlement. | Keep within Merchant Verification family unless incremental paid value is defined |
| Extra member capacity | Credit-funded; exact price unresolved | Fifteen members are included. Runtime uses annual extra-member entitlement at GBP 1 per place, with six units for GBP 5. | Funding method decided; price needs owner confirmation |
| Extra DemandBox capacity | Credit-funded; unit and price unresolved | DemandBox exists, but no paid extra-capacity entitlement, free allowance or canonical chargeable unit was found. | Define unit before price |
| ROSCA yearly service | 60 credits per annual service if the GBP1-per-credit anchor is retained | Runtime has a server-owned GBP 60 annual service price | Straight conversion candidate, still unproven commercially |
| Community Meeting Pack | Credit-funded; exact future debit unresolved | Runtime currently uses GBP 1 per unit and six for GBP 5 | Convert only after the unit and consumption value are validated |
| Advanced Shop Analytics/AI | Unresolved | Basic Shop Activity is included. No connected paid advanced entitlement or AI-provider cost exists. | Planned product, not forecastable revenue |
| Additional Trade Records | Unresolved | No paid capacity entitlement exists | Define free allowance, record unit, retention cost and entitlement first |
| GSN Shop Reel | Basic/free versus premium export unresolved | The component engines exist in parts; no composed product or paid entitlement exists | Growth product definition approved, commercial boundary open |
| Bulletin reactions | Not a revenue line | Backend reactions are not enabled; other governed response engines exist | Organisation utility only |

## Spotlight, Repost and central advertising quote structure

Paid Spotlight and Paid Repost are separate revenue lines even though both draw from the same balance. The minimum future ledger distinction is:

- `paid_spotlight_appearance`;
- `paid_repost_appearance`;
- `central_advertising_appearance`.

The provisional pricing structure is:

```text
Paid Spotlight credits
  = governed appearance units
  x approved time factor
  x approved region factor

Paid Repost credits
  = equivalent Paid Spotlight credits
  x 1.50 repost premium
  x governed reach/destination factor

Central advertising credits
  = promotion count
  x eligible destinations
  x scheduled appearance opportunities
  x approved time/region factors
```

The current GSN-HOUSE quotation engine already calculates promotion count x eligible destinations x days or scheduled opportunities, but it labels the result quotation-only, has no financial effect, and explicitly leaves peak-time surcharge undecided. It measures addressable active accounts, not guaranteed viewers or sales.

Reach must never be sold as guaranteed viewing. A paid unit buys a governed eligible presentation opportunity subject to policy, pacing, availability and qualification—not a guaranteed person, click, contact or sale.

## Regional pricing boundary

GBP remains the base planning currency. Regional cash equivalents can reflect purchasing power and local delivery cost, but a transferable credit cannot secretly have different cash values in different regions without creating arbitrage and accounting problems.

Before regional pricing goes live, GSN must choose one safe policy:

- account-scoped, non-transferable regional credits; or
- one global credit acquisition value with explicit service discounts/sponsor grants; or
- region-specific service quotes while the underlying credit value remains constant.

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

1. Is Vault 5 credits per slot for 30 days, or 5 credits per slot for one year?
2. What is the annual Merchant Verification credit price? The repo does not preserve a trustworthy prior answer.
3. Should extra member capacity keep the current one-credit-per-member-year and six-for-five bundle, or use a new price?
4. What exactly is one extra DemandBox unit: an additional simultaneously active request, longer duration, wider reach, or something else?
5. What time, regional and reach multipliers apply to Spotlight, Repost and central advertising?
6. Will Shop Reel have a free basic export and a paid premium export, or remain entirely an acquisition feature during the pilot?

## Evidence rule

Every provisional amount remains a hypothesis until GSN records real payment, use, delivery cost, refund/support burden and renewal behavior. A button, quote, expected-payment row or credit top-up is not willingness-to-pay evidence.
