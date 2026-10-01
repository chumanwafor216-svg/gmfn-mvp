# GSN Canonical Product Language - 2026-09-13

## Product-word rule

When a GSN product surface has become a named product, write it as one product word with its internal capital preserved. Do not split it into ordinary descriptive words in user-visible copy unless a legacy backend route, file name, API tag, or migration boundary requires the older spelling.

## Canonical spellings

- `DemandBox` - canonical user-visible spelling for the community demand and request engine. Use capital D and capital B, including inside sentences.
- `TrustSlip` - canonical user-visible spelling for the portable current-evidence trust paper.
- `TrustPassport` - canonical user-visible spelling for the fuller member/community trust story.

## TrustSlip-first external positioning

Effective from 2026-09-21, external-facing GSN material should normally lead with the TrustSlip-first explanation recorded in `docs/GSN_TRUSTSLIP_FIRST_POSITIONING_PROTOCOL_2026-09-21.md`.

Effective from 2026-09-28, commercial, pricing, ecommerce, investor, Steliana,
Chris / RGU, Argo, and external-review material should also follow
`docs/GSN_TRUSTED_COMMUNITY_COMMERCE_POSITIONING_PROTOCOL_2026-09-28.md`.
That protocol locks the stronger frame: GSN is trusted-community commerce and
portable value evidence infrastructure. Community organisation remains the
operating layer, not the default commercial headline.

The preferred hierarchy is:

```text
GSN = trusted-community commerce and community trust infrastructure.
TrustPassport = the fuller accumulated trust record.
TrustSlip = the portable, shareable trust-evidence snapshot and flagship product wedge.
Community Domain = the operating layer that makes trusted commerce and evidence credible.
```

Do not reduce GSN to generic community-management software. GSN still organises communities, but externally that capability should be explained as the operating layer that helps communities preserve useful trust evidence, support trusted-community commerce, and turn verified value into portable opportunity evidence.

## Preferred short explanation

```text
GSN is building community trust infrastructure. Its flagship product, TrustSlip, turns verified community participation, contribution and follow-through into portable evidence that can help people access opportunity, support and safer introductions without starting from zero every time they move or enter a new network.
```

## TrustSlip / TrustPassport boundary

- `TrustPassport` is the fuller accumulated trust story across community contexts. It is not fully public by default.
- `TrustSlip` is the smaller shareable snapshot used for a specific decision, opportunity, introduction, support request, marketplace transaction or verification moment.
- `TrustSlip` should never claim to prove a person's whole character. It presents bounded community evidence with clear limits.
- `GSN` should never claim to decide who is trustworthy. It helps communities preserve, structure and share trust evidence responsibly.

## Opportunity language

Opportunity Engine language should be trust-aware:

```text
Community activity -> TrustPassport -> TrustSlip -> opportunity, support, recognition, verification and safer introductions.
```

Avoid describing the Opportunity Engine as only a listing board. Its distinctive value is that opportunity can be connected to structured community trust evidence.

## Sustainability language

Do not force GSN into Net Zero language unless a support body explicitly advises that route.

Safe wording:

```text
GSN is not primarily an energy-transition product, but it supports sustainable community operations by reducing wasted coordination, repeated verification, lost records and duplicated administrative effort.
```

## Compatibility boundary

Existing internal route names, Python/TypeScript identifiers, database tables, file names, tests, and legacy docs may still contain older forms such as `Demand Box`, `Trust Passport`, or route names like `DemandBoxPage` and `marketplace_requests`. Do not rename those contracts casually. User-visible copy should move toward the canonical spellings during scoped product-language passes.

Historical documents do not all need to be rewritten immediately. Any document used externally from 2026-09-21 onward should be reviewed against the TrustSlip-first positioning protocol before it is sent.

## Implementation boundary

A canonical language pass is separate from feature work. Do not mix broad product-word renaming with backend rule changes, permission changes, or UI redesign unless the owner explicitly requests that combined work.
