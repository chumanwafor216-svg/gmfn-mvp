# GSN Icon Migration

## Purpose

This document turns the GSN Icon Protocol into an implementation plan.

The target style is:

```text
premium skeuomorphic / realistic 3D icons
```

Short working label:

```text
Use premium realistic 3D icons, not flat or outline icons.
```

## Unabated Truth

The frontend now has the first premium 3D icon base pack, but the migration is
not product-wide yet.

Confirmed current state:
- `frontend/src/assets/gsn-icons/` contains the required first 3D `webp` /
  `png` asset pack.
- `frontend/src/lib/gsnIconAssets.ts` wires those assets through a typed
  registry.
- `frontend/src/components/GsnRealisticIcon.tsx` is the primary renderer.
- `frontend/src/components/GsnLegacyIcon.tsx` is a transitional semantic-name
  adapter for pages that still speak in old icon names.
- `frontend/src/components/TrustPaperMarks.tsx` is an outline SVG icon family.
- Direct `TrustPaperIcon` usage outside `TrustPaperMarks.tsx` has been removed,
  but some pages can still have page-local flat glyph helpers or no 3D icon
  language yet.

Therefore:
- `frontend/src/components/TrustPaperMarks.tsx` is a transitional compatibility layer, not the final
  GSN icon system.
- Do not expand `TrustPaperMarks.tsx` as the long-term primary icon solution.
- Do not call a screen compliant with the GSN Icon Protocol merely because an
  outline SVG or emoji was replaced with another outline SVG.

## Asset Home

Use this repo path for the future 3D icon family:

```text
frontend/src/assets/gsn-icons/
```

Use transparent-background `webp` or `png` files for UI icons unless the build
pipeline later proves a better format.

The typed frontend registry lives here:

```text
frontend/src/lib/gsnIconAssets.ts
```

The shared renderer lives here:

```text
frontend/src/components/GsnRealisticIcon.tsx
```

Registry entries without real asset files must keep `assetUrl: null` and
`status: "planned"`. When a real asset is saved under the asset home, wire that
entry through `gsnIconAssets.ts` and mark it `status: "available"`. The shared
renderer returns nothing for missing assets by default, because a placeholder box
is not a compliant 3D icon.

Preferred naming:

```text
icon-trust-shield-3d.webp
icon-community-building-3d.webp
icon-shop-storefront-3d.webp
icon-market-stall-3d.webp
icon-vault-safe-3d.webp
icon-finance-bank-building-3d.webp
icon-finance-wallet-card-3d.webp
icon-repayment-schedule-3d.webp
icon-records-folder-3d.webp
icon-certificate-seal-3d.webp
icon-join-person-plus-3d.webp
icon-spotlight-megaphone-3d.webp
icon-audio-speaker-3d.webp
icon-media-video-3d.webp
hero-community-building-3d.webp
hero-marketplace-storefront-3d.webp
hero-vault-safe-3d.webp
```

## Required Base Pack

Create or source these first:

| Key | Object Meaning | Prompt Seed |
| --- | --- | --- |
| `trust-shield` | shield badge or seal | `premium skeuomorphic 3D icon, shield badge, navy and gold, transparent background` |
| `community-building` | house, hall, or civic building | `3D community building icon, premium civic hall, navy gold white, transparent background` |
| `shop-storefront` | storefront or shopping bag/cart | `real-world storefront icon, high-fidelity marketplace icon, navy gold white, transparent background` |
| `market-stall` | market stall or real trading place | `premium realistic 3D market stall icon, navy white canopy, gold trim, fresh goods, transparent background` |
| `vault-safe` | safe box | `3D safe vault icon, premium banking icon, navy metal and gold accents, transparent background` |
| `finance-bank-building` | bank building or institutional money house | `premium realistic 3D bank building icon, white stone columns, navy doors, gold accents, transparent background` |
| `finance-wallet-card` | wallet or bank card for personal payment details | `premium banking icon, wallet and bank card, realistic 3D, navy gold green, transparent background` |
| `repayment-schedule` | repayment schedule, instalments, or payment plan | `premium realistic 3D repayment calendar icon, payment schedule with coins and check marks, navy gold white, transparent background` |
| `records-folder` | document folder | `realistic object icon, premium document folder with seal, navy gold white, transparent background` |
| `certificate-seal` | certificate, evidence paper, or evidence seal | `premium realistic 3D certificate evidence icon, white paper, navy leather corners, gold seal, transparent background` |
| `join-person-plus` | person-plus entry | `premium realistic 3D icon, member profile and plus badge, navy gold white, transparent background` |
| `spotlight-megaphone` | real loudspeaker or megaphone | `premium skeuomorphic 3D icon, real megaphone spotlight, navy gold white, transparent background` |
| `audio-speaker` | speaker for sound controls | `premium realistic 3D sound speaker icon, white navy and gold, transparent background` |
| `media-video` | video camera or playable media | `premium realistic 3D video camera icon, white navy and gold, transparent background` |
| `identity-card` | GSN identity | `glossy executive app icon, identity card with shield seal, navy gold white, transparent background` |
| `phone-contact` | phone/contact | `realistic object icon, premium phone handset, navy gold white, transparent background` |
| `qr-record` | QR evidence record | `premium 3D UI icon, QR record card with seal, navy gold white, transparent background` |
| `public-globe` | public evidence/share surface | `realistic 3D globe and trust seal icon, navy gold white, transparent background` |

## Screen Priority

Replace icons in this order:

1. Public evidence and entry surfaces:
   - `CoverPage`
   - `WelcomePage`
   - `CommunityVerifyPage`
   - `TrustSlipVerifyPage`
   - `ShopGalleryPage`
2. Core authenticated work surfaces:
   - `DashboardPage` outside the frozen Market Wisdom area
   - `CommunityHomePage` without changing caged action geometry
   - `MarketplacePage`
   - `FinancePage`
   - `TrustScorePage`
   - `IdentityIntegrityPage`
3. Owner and money movement tools:
   - `ShopControlPage`
   - `ShopAssetsPage`
   - `VaultControlPage`
   - `PaymentInstructionsPage`
   - `WithdrawalInstructionsPage`
   - `PayoutDetailsPage`
4. Admin and support tools:
   - admin command-centre pages
   - trust analytics pages
   - system operations pages

## Implementation Rules

- Use `GsnRealisticIcon` as the shared renderer for 3D assets once the first
  asset pack exists.
- Update `gsnIconAssets.ts` when adding real assets; do not reference ad hoc
  image paths directly from route pages.
- Keep each icon inside a stable rounded tile or badge.
- Give every image a fixed width and height so buttons and cards do not shift.
- Use `alt=""` for decorative icons and adjacent text for the accessible name.
- Do not use literal photos inside compact UI icons.
- Do not use flat, outline, faded, cartoon, or emoji-style icons for primary
  UI.
- Do not alter route targets, action counts, stable debug IDs, or protected
  button geometry during icon replacement.
- Run the protected button and tap audits after replacing icons on caged pages.

## Meaning And Presentation Rules

The icon must communicate before the copy is read. Many pilot users may rely on
the object, size, and dignity of the mark more than the surrounding text.

- Prefer white, transparent, or very light neutral tiles with embossed object
  shadows. Avoid heavy colored backing tiles unless the tile is intentionally
  communicating an urgent state.
- Keep the 3D object large inside the tile. A small icon inside a heavy badge
  fails the protocol even if the asset itself is 3D.
- Finance should not be represented only by a small wallet/card. Use a bank
  building, cash drawer, or other institutional money-house icon for the main
  finance domain, because it carries more hope and authority. Keep wallet/card
  icons for personal payout, card, or payment-detail contexts.
- Marketplace should use a shopfront, stall, or real trading-place object for
  the domain. Use carts/baskets only for literal shopping or goods movement.
- Trust, evidence, passport, certificate, and verification papers should look like
  evidence packages: light paper, seal, watermark, fixed fact chips, and clear
  object icons that do not cover the record.
- Do not call a page visually complete until the icon object, not the colored
  tile behind it, is the first thing a low-literacy user can understand.

## Completed Semantic Additions

The first semantic meaning upgrade now exists in the shared icon registry:

- `finance-bank-building` for main Finance, loan, repayment, and money
  institution contexts.
- `market-stall` for Marketplace/domain opportunity contexts where a real
  trading place is stronger than a shopping cart.
- `certificate-seal` for Trust Passport, TrustSlip, public verification, and
  printable evidence packages.
- `repayment-schedule` for borrowing repayment plans, instalments, and
  pay-in-full vs pay-in-parts decisions.
- `audio-speaker` for media sound controls, including video sound on/off.
- `media-video` for video, playable media, and picture/video selector labels.

## Asset Backlog

The current pack is still not complete everywhere.

- Add smaller action-specific 3D assets only where a real page proves the
  current semantic set is misleading.
- Capture phone screenshots for Community Home, Marketplace, Finance,
  Borrowing, TrustSlip, Trust Passport, and public verification after each
  batch of route-level replacements.

## Done Criteria Per Screen

A screen is icon-migration complete only when:

- primary UI icons render from the realistic 3D asset family;
- no emoji or outline SVG icon is used as a primary icon;
- icon containers are stable on mobile and desktop;
- button labels still fit without one-letter wrapping;
- screenshots prove icons are visible, non-overlapping, and not blurry;
- relevant route/button/freeze audits still pass.

## Do Not Claim Yet

Do not claim product-wide GSN Icon Protocol compliance until the required base
pack exists and the priority screen list above has been migrated and verified.

## Current Asset Status

- Required base-pack transparent `webp` assets are saved under
  `frontend/src/assets/gsn-icons/` and wired through
  `frontend/src/lib/gsnIconAssets.ts`.
- Available keys:
  - `trust-shield`
  - `community-building`
  - `shop-storefront`
  - `vault-safe`
  - `finance-wallet-card`
  - `records-folder`
  - `join-person-plus`
  - `spotlight-megaphone`
  - `audio-speaker`
  - `media-video`
  - `identity-card`
  - `phone-contact`
  - `qr-record`
  - `public-globe`
- Migrated route surfaces so far:
  - `CoverPage`
  - `WelcomePage`
  - `CommunityVerifyPage`
  - `TrustSlipVerifyPage`
  - `TrustSlipVerifyPublicPaper`
  - `TrustSlipVerifyBoundary`
  - `TrustSlipVerifyResultCard`
  - `TrustSlipVerifyPrivateEvidence`
  - `ShopGalleryPage`
  - `TrustScorePage`
  - `MyGMFNAndIPage`
  - `TrustSlipPage`
  - `CCIReadingPage`
  - `CommunityConfirmationOutcomePage`
  - `CommunityConfirmationInboxPage`
  - `CommunityConfirmationPolicyPage`
  - `IdentityIntegrityPage`
  - `PaymentInstructionsPage`
  - `WithdrawalInstructionsPage`
  - `PayoutDetailsPage`
  - `RepaymentPage`
  - `PaymentRailsPage`
  - `RevenueAllocationPage`
  - `AdminTrustEventsPage`
  - `AdminTrustGraphPage`
  - `TrustAnalyticsPage`
  - `TrustCommandCentrePage`
  - `TrustTimelinePage`
  - `AdminIdentityRiskPage`
  - `ShopAssetsPage`
  - `ShopControlPage`
  - `VaultControlPage`
  - `SubscriptionSpotlightPage`
  - `LoansPage`
  - `LoanWorkbenchPage`
  - `LoanSummaryPage`
  - `AdminIncompleteLoansPage`
  - `BankConsolePage`
  - `AppearancePage`
  - `BorrowerPreflightPage`
  - `ApiPage`
  - `ExposurePage`
  - `ExposureAdminPage`
  - `LockManagementPage`
  - `SeedDemoPage`
  - `SystemOperationsPage`
  - `CommunityHomePage`
  - `CreateEntryPage`
  - `FinancePage`
  - `MarketplacePage`
  - `TrustPage`
  - `CommunityJoinRequestsPage`
  - `JoinRequestPendingPage`
  - `ActivateMembershipPage`
  - `MemberActivationPage`
  - `JoinApprovalPage`
  - `LoginPage`
  - `ShopAccessPage`
  - `RegisterPage`
  - `JoinEntryPage`
  - `ProfilePage`
  - `OpenTrustPage`
  - `NotificationsPage`
  - `LoanReadinessPage`
  - `LoanSuggestionsPage`
  - `GuarantorEarningsPage`
  - `GuarantorInboxPage`
  - `GuarantorLeaderboardPage`
  - `TrustLeaderboardPage`
  - `LoanDecisionPage`
  - `DemandBoxPage`
  - `BuildFirstCirclePage`
- Migrated shared components so far:
  - `EvidencePackPanel`
  - `GMFNConfirmModal`
  - `TrustSlipVerifyBoundary`
  - `TrustSlipVerifyResultCard`
  - `TrustSlipVerifyPrivateEvidence`
- Remaining direct legacy icon references are inside
  `frontend/src/components/TrustPaperMarks.tsx` itself.
- Product-wide visual certification still needs staged screenshot checks before
  full compliance can be claimed.
