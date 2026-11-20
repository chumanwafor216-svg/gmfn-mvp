# GSN Public Merchant Discovery — Slice 1 Implementation Report

Date: 2026-11-20
Status: candidate implementation; not deployed
Scope: public merchant discovery only

## Candidate outcome

Slice 1 is implemented as a separate, explicit publication authority. Existing
shop products are not made globally searchable by migration, by product
visibility aliases, or by the existence of a direct public shop link.

An offer enters wider public discovery only when all of these are true:

1. the owner created or updated an explicit publication record;
2. its state is `published`;
3. it is not expired;
4. the shop and product remain active;
5. the product is not `vault_private`;
6. the shop privacy authority is enabled and permits the public shop;
7. any relevant capability availability remains current.

The implementation does not change community Marketplace search, direct public
shop links, payments, Pipeline Credits, Spotlight, TrustSlip or private Vault
content.

## Routes

### Anonymous search

`GET /marketplace/public-discovery`

Query fields:

- `q`: shop, offer and capability terms
- `category`: governed taxonomy/category terms
- `area`: general region, country or remote service
- `cursor`: safe offset into the privacy-filtered result set
- `limit`: 1–50

Response shape:

```json
{
  "items": [
    {
      "publication_id": "pd_...",
      "shop_path": "/shop/GMFN-U-...",
      "shop_gsn_id": "GMFN-U-...",
      "shop_name": "Example Shop",
      "shop_description": "Published shop description",
      "offer_id": 123,
      "offer_name": "Example service",
      "offer_description": "Published offer description",
      "price": "25",
      "currency": "GBP",
      "image_url": "https://...",
      "video_url": null,
      "categories": ["Repairs"],
      "capability_terms": ["Repairs phones"],
      "service_areas": ["Scotland, GB"],
      "remote_available": false,
      "availability": "available",
      "contact_available": true,
      "expires_at": null
    }
  ],
  "count": 1,
  "total": 1,
  "next_cursor": null,
  "suggestions": ["Example service", "Example Shop", "Repairs"],
  "scan_limit_reached": false
}
```

Counts, suggestions and pagination are calculated only after publication,
privacy, activity, Vault, expiry and availability exclusions. Responses use
`Cache-Control: private, no-store`.

### Owner preview

`GET /marketplace/public-discovery/owner/preview`

The preview returns:

- feature and privacy-authority readiness;
- authority and notice versions;
- the legacy-product confirmation notice;
- the direct-link boundary;
- every owner product's effective state;
- whether that product is currently eligible to publish.

Legacy products without a publication row are labelled
`legacy_unpublished`. No notice is sent and no visibility is changed by
opening the preview.

### Owner publication action

`PUT /marketplace/public-discovery/owner/products/{product_id}`

Supported states:

- `published`
- `hidden`
- `paused`
- `withdrawn`

Publishing requires explicit confirmation, the current authority and notice
versions, both feature/privacy gates, an eligible active product and public
shop, and a future expiry when expiry is supplied.

Hide, pause, withdrawal and expiry remove the offer from wider search without
disabling the existing direct public shop link.

## Frontend

- Public search: `/discover`
- Owner control: `/app/shop-control/public-discovery`
- Shop Control contains one compact link to the owner control.
- Result links open the existing public shop with the selected product and a
  `public-discovery` source marker.
- Existing shop visit, qualified product-open and contact-tap analytics preserve
  that source as `public_discovery_shop`, `public_discovery_offer` and
  `public_discovery_contact`.

## Defaults and release boundary

Both gates must be enabled:

- `GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED=true`
- `GSN_SHOP_PRIVACY_AUTHORITY_V1_ENABLED=true`

The new discovery gate defaults off. Therefore this candidate does not create
live broad indexing, even if the migration is applied. The public route returns
a fail-closed 503 state while either authority is absent.

No environment value was changed in this work.

## Migration

Migration:
`gmfn_backend/alembic/versions/20261120_public_merchant_discovery.py`

It adds:

1. `marketplace_public_discovery_publications` — one explicit publication
   authority per product;
2. `marketplace_public_discovery_search_events` — privacy-minimised search
   evidence using a hash of normalized search/filter terms, aggregate result
   counts and zero-result/availability flags.

It performs no backfill and updates no existing shop, product, payment,
Pipeline Credit, Spotlight or TrustSlip row.

## Measurement

Implemented:

- searches;
- privacy-filtered result availability;
- zero-result searches;
- aggregate expired/inactive/unavailable exclusions;
- discovery-sourced shop opens;
- discovery-sourced qualified product opens;
- discovery-sourced contact taps.

Not implemented in Slice 1:

- seller response/outcome after contact;
- purchase or transaction attribution;
- external-channel delivery/read evidence.

Those outcomes cannot be claimed from a click and require a later governed
contract.

## Verification

- `python -m pytest tests/test_marketplace_shop_privacy.py tests/test_marketplace_public_discovery.py -q`
  — 11 passed.
- `npm run build` in `frontend` — passed.
- `npm run audit:route-fallthrough` — passed.
- `npm run audit:shop-control-button-inventory` — passed.
- `npm run audit:shop-gallery-button-inventory` — passed.
- Focused coverage proves fail-closed authority gating, anonymous non-member
  search, protected/legacy/Vault/paused/expired exclusions, safe counts and
  suggestions, owner confirmation, hide behavior, direct-shop preservation,
  search evidence and no payment/Spotlight state mutation in the owner response.

## Honest constraints

- The first implementation scans at most 500 currently published authority
  rows before applying the full projection. `scan_limit_reached` exposes that
  operational boundary. A later indexed projection is required before large
  scale.
- General service area deliberately excludes locality-level coverage from the
  public response. Region, country and remote remain available.
- The public page is mounted but remains unavailable until both gates are
  deliberately enabled.
- Legacy-owner outreach, notices and migration campaigns were not authorized
  and were not implemented.
- The broad `audit:link-contracts` remains red on six unrelated existing
  assertions in PWA install, Shop Assets and older Public Shop link/copy focus
  behavior. The new route-fallthrough and both directly affected shop button
  inventories pass.

## Rollback

Immediate behavioral rollback:

1. set `GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED=false`;
2. leave existing direct shop and community Marketplace routes untouched.

Code rollback:

1. remove the `/discover` and owner-control route mounts;
2. remove the public-discovery router include;
3. revert the source-attribution additions in `ShopGalleryPage`.

Database rollback:

1. confirm the feature gate is off;
2. export any pilot publication/search evidence that must be retained;
3. run the Alembic downgrade for
   `20261120_public_merchant_discovery`.

The downgrade drops only the two Slice 1 tables. It does not alter pre-existing
shop, product, payment, Pipeline Credit, Spotlight, TrustSlip or Vault data.
