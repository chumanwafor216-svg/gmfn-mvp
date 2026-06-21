# FRONTEND_ENDPOINT_EXPOSURE_AUDIT.md

## Purpose
This document records the current frontend exposure status for the approved GMFN flows.

It is a close-out note for the current stabilization phase.

The goal is to confirm:
- which important backend capabilities are actually surfaced in frontend routes,
- which user journeys are now visibly wired,
- and which remaining gaps are still known but non-blocking.

---

## Scope checked

The audit focused on the current approved product lanes:
- community and invite flows
- trust and verification
- marketplace, shop, Vault, and Spotlight
- money and finance
- loans and support
- command center and admin routes

This audit was based on the current repo code, not memory.

---

## 1. Community / invite / join

Confirmed frontend exposure:
- invite preview is exposed through `getInvitePreview(...)`
  - used by `frontend/src/pages/InviteLandingPage.tsx`
- join request submission is exposed through `submitJoinRequest(...)`
  - used by `frontend/src/pages/JoinEntryPage.tsx`
- membership activation is exposed through:
  - `activateMembership(...)`
    - used by `frontend/src/pages/ActivateMembershipPage.tsx`
  - `activateApprovedMember(...)`
    - used by `frontend/src/pages/MemberActivationPage.tsx`
- join request review and approval are exposed through:
  - `getCommunityJoinRequests(...)`
  - `voteOnJoinRequest(...)`
  - used by `frontend/src/pages/CommunityJoinRequestsPage.tsx`

Confirmed route surfaces:
- `/welcome`
- `/create`
- `/join`
- `/join-request/pending`
- `/join-approval/:requestId`
- `/activate-membership`
- `/app/community/:clanId/join-requests`

---

## 2. Trust / identity / verification

Confirmed frontend exposure:
- TrustSlip surface is exposed in `frontend/src/pages/TrustSlipPage.tsx`
- Trust Passport surface is exposed in `frontend/src/pages/TrustScorePage.tsx`
- public TrustSlip verification is exposed in `frontend/src/pages/TrustSlipVerifyPage.tsx`
- identity/CCI surface is exposed in `frontend/src/pages/IdentityIntegrityPage.tsx`

Confirmed visible capabilities:
- verification code display
- QR display
- public verify link display
- issue/expiry visibility
- print-ready trust surfaces
- merchant verification status visibility

Current merchant-verification boundary:
- active TrustSlip verification is surfaced through mounted TrustSlip routes
  such as `/trust-slips/verify/{code}` and `/trust-slips/verify/{code}/page`.
- `frontend/src/lib/merchantChannel.ts` exists but is not currently imported by
  active pages.
- the dormant backend `merchant_verify.py` route file should not be mounted
  automatically because its public `/trust-slips/verify/{token}` path overlaps
  the mounted TrustSlip verification path shape.

Confirmed route surfaces:
- `/app/trust-slip`
- `/app/trust`
- trust/public verify route
- `/app/identity`

Known remaining note:
- the executive-summary PDF reference still points to a legacy-style public asset path.
- the active public file itself is not currently present in the normal public folder.
- this is an asset/publication gap, not a route-wiring gap.

---

## 3. Marketplace / shops / Vault / Spotlight

Confirmed frontend exposure:
- shop control is exposed in `frontend/src/pages/ShopControlPage.tsx`
- shop assets are exposed in `frontend/src/pages/ShopAssetsPage.tsx`
- public shop gallery is exposed in `frontend/src/pages/ShopGalleryPage.tsx`
- Vault access view is exposed in `frontend/src/pages/ShopAccessPage.tsx`
- marketplace community work surface is exposed in `frontend/src/pages/MarketplacePage.tsx`

Confirmed visible capabilities:
- public community-visible shop products
- separate Vault discoverability layer
- Vault access by token/view route
- spotlight/broadcast management
- merchant verify payment request flow
- Vault payment request flow
- spotlight payment request flow

Confirmed route surfaces:
- `/app/marketplace`
- `/app/shop-control`
- `/app/shop-assets`
- `/shop/:gmfnId`
- `/vault/:token`

Confirmed backend-facing frontend calls currently surfaced:
- `getVaultShopAccessView(...)`
- `/api/payment-instructions/vault`
- `/api/payment-instructions/merchant-verify`
- `/api/payment-instructions/spotlight`
- marketplace broadcast/shop APIs used inside the shop and marketplace pages

---

## 4. Money / finance

Confirmed frontend exposure:
- expected payment and reconciliation truth is exposed through `listExpectedPayments(...)`
  - used by:
    - `frontend/src/pages/FinancePage.tsx`
    - `frontend/src/pages/RepaymentPage.tsx`
    - `frontend/src/pages/LoanSummaryPage.tsx`
    - `frontend/src/pages/BankConsolePage.tsx`
- pool pay-in is exposed in `frontend/src/pages/PaymentInstructionsPage.tsx`
- money out is exposed in `frontend/src/pages/WithdrawalInstructionsPage.tsx`
- payment rails are exposed in `frontend/src/pages/PaymentRailsPage.tsx`
- payout destination/details are exposed in `frontend/src/pages/PayoutDetailsPage.tsx`

Confirmed route surfaces:
- `/app/finance`
- `/app/payment/pool`
- `/app/withdrawal-instructions`
- `/app/payment-rails`
- payout details route

Confirmed visible capabilities:
- expected payment status
- confirmation/match state
- repayment reference visibility
- money in / money out guidance
- finance event sections and route handoff surfaces

---

## 5. Loans / support / guarantor

Confirmed frontend exposure:
- readiness is exposed in `frontend/src/pages/LoanReadinessPage.tsx`
- suggestions are exposed in `frontend/src/pages/LoanSuggestionsPage.tsx`
- workbench is exposed in `frontend/src/pages/LoanWorkbenchPage.tsx`
- summary is exposed in `frontend/src/pages/LoanSummaryPage.tsx`
- repayment is exposed in `frontend/src/pages/RepaymentPage.tsx`
- guarantor inbox/earnings are exposed in:
  - `frontend/src/pages/GuarantorInboxPage.tsx`
  - `frontend/src/pages/GuarantorEarningsPage.tsx`

Confirmed backend-facing frontend calls currently surfaced:
- `createLoanInstruction(...)`
- loan summary / expected payment / support-path APIs already used by the route pages

Confirmed route surfaces:
- `/app/loans`
- `/app/loan-readiness`
- `/app/loan-suggestions`
- `/app/loan-workbench`
- `/app/loan-summary/:loanId`
- `/app/payment/loans/:loanId`
- `/app/guarantor-inbox`
- `/app/guarantor-earnings`

---

## 6. Admin / command center

Confirmed frontend exposure:
- admin command center is exposed in `frontend/src/pages/TrustCommandCentrePage.tsx`
- trust analytics is exposed in `frontend/src/pages/TrustAnalyticsPage.tsx`
- trust graph is exposed in `frontend/src/pages/AdminTrustGraphPage.tsx`
- exposure admin is exposed in `frontend/src/pages/ExposureAdminPage.tsx`
- system operations is exposed in `frontend/src/pages/SystemOperationsPage.tsx`

Confirmed route surfaces:
- `/app/command-center`
- `/app/command-center/trust-analytics`
- `/app/command-center/trust-graph`
- `/app/command-center/exposure`
- `/app/command-center/system-operations`

Current note:
- these surfaces are present and route-linked.
- role-gating behavior should still be treated as backend-owned truth and verified in live runtime, not assumed from page presence alone.

---

## 7. Navigation status

Current status:
- the major user-facing route buttons were normalized to origin-preserving navigation
- the most important plain-link route tiles were converted to `OriginLink`
- the known shared mismatch between `originPath` and `from` was fixed in `PageTopNav`

What remains intentionally:
- direct state-transition navigations such as:
  - `navigate(-1)`
  - `replace: true`
  - welcome/cover route branching
- these are deliberate flow transitions, not leftover internal route buttons

---

## 8. Collapse discipline status

Confirmed strong collapse/open discipline exists on the main oversized surfaces:
- community home
- marketplace
- finance
- trust slip
- trust passport
- major dashboard blocks

Known smaller note:
- not every page in the app needs collapse behavior.
- route-sized pages with limited content were intentionally left simple.

---

## 9. Known remaining gaps

These are the main known remaining gaps after the current finish pass:

1. Public asset naming/publication gap
- guide/executive-summary PDF naming still contains legacy `GSN` asset references in some places
- current live public PDF asset is not present in the normal public path for the executive-summary reference

2. Live runtime QA still matters
- code audit and typecheck are complete
- final browser click-through and seeded-data state QA should still happen before production use

3. Admin visibility should be verified in live runtime
- command-center pages are wired
- final role-gating confirmation should still be validated against real auth/permission state

---

## 10. Close-out summary

This phase is now in strong completion state for:
- route clarity
- origin-aware navigation
- marketplace/shop/Vault separation
- commercial unlock visibility
- trust and verification document quality
- finance and repayment evidence visibility
- collapse/open discipline on the major oversized surfaces

The biggest remaining item is not route wiring.
It is final runtime QA plus publication cleanup for legacy-named PDF assets.
