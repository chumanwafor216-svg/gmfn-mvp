# GSN Institutional Evidence Surface Inventory

Last updated: 2026-06-27

Canonical path: `docs/INSTITUTIONAL_EVIDENCE_SURFACE_INVENTORY.md`

## Purpose

This is the working list for pages, snapshots, links, PDFs, and copy packages
that may move from one person to another as evidence, verification, payment
instruction, invite, shop access, or official GSN status.

The product-owner direction is not to rewrite the message first. The direction
is to carry the existing useful words onto a GSN headed-paper surface: official
brand mark, light watermark, framed title, holder/community context, generated
time or reference, privacy/currentness note, limitation note, and footer.

Important product-owner clarification: sendable links are not merely technical
URLs. Community verification links, Trust Passport snapshots, community invites,
shop-view invites, vault/private-view invites, and similar link tools are also
GSN branding and marketing surfaces. They must arrive professionally packaged,
with clear GSN authority and context, rather than looking like raw system text
or developer output.

Unabated truth: this inventory is based on current code search. It is broad but
not guaranteed complete. Any new page with `Copy`, `Share`, `Print`, `PDF`,
`Verify`, public link, payment instruction, or snapshot behavior should be added
here before it is called screenshot-ready.

## Reusable Treatment To Build

Create or extend a shared frontend "GSN Snapshot Paper" / "GSN Headed Paper"
surface for copy/screenshot/link pages, separate from ordinary app cards.

Minimum paper anatomy:

- GSN brand mark and light watermark.
- Title such as `GSN Snapshot`, `GSN TrustSlip`, `GSN Payment Instruction`, or
  `GSN Community Confirmation`.
- Holder, community, shop, loan, or route identity block.
- Generated time, reference, token, code, or verification link where available.
- Body content preserving current useful wording.
- Privacy/currentness line.
- Limitation line, for example: not a bank guarantee, not automatic debit, and
  decision remains with the reader where applicable.
- Footer with Global Support Network / GSN public identity.

## Already Closest To Official Paper

These already have strong institutional treatment or backend PDF support and
should be checked visually before rewriting:

| Surface | Route / file | Current source-level status | Next action |
| --- | --- | --- | --- |
| Public TrustSlip verification paper | `/t/:code`, `/trust-slips/verify/:code/page`, `frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx` | Has GSN brand mark, watermark, QR, public/private boundary, code/link, and limitation language. | Visual phone/print review, then adjust only gaps. |
| TrustSlip private evidence area | `/app/trust-slip/verify`, `TrustSlipVerifyPrivateEvidence.tsx` | Printable/private evidence area exists. | Confirm it feels like private headed paper, not a plain panel. |
| TrustSlip page | `/app/trust-slip`, `TrustSlipPage.tsx` | Has copy, verify link, print, limitation, and shared GSN Snapshot builder. | Visual phone/print review, then adjust only gaps. |
| Trust Passport page | `/app/trust`, `TrustScorePage.tsx` | Has copy snapshot, print, TrustSlip verify action, and shared GSN Snapshot builder. | Visual phone/print review, then adjust only gaps. |
| Trust Timeline PDF | `/app/open-trust-reading`, `TrustTimelinePage.tsx`, backend `trust_timeline_pdf_service.py` | Backend PDF shell exists with institutional helper. | Open generated PDF visually; confirm watermark/header/footer. |
| Evidence Pack PDF / ZIP panel | `EvidencePackPanel.tsx`, backend evidence pack services | Backend PDF shell exists; frontend panel still looks like a simple app block. | Upgrade panel and any redacted share copy wording to headed-paper preview language. |

## Priority 1: User Or Visitor Evidence Papers

These are the first pages to convert because another person may directly see,
receive, verify, screenshot, or print them.

| Surface | Route / file | Why it needs headed paper | Current gap |
| --- | --- | --- | --- |
| Identity & Integrity snapshot | `/app/identity`, `frontend/src/pages/IdentityIntegrityPage.tsx`, `buildIdentityIntegritySnapshot()` | User may copy identity/integrity status to show identity readiness. | Copy output now uses shared GSN headed-paper snapshot text; visual preview can be added later if needed. |
| CCI reading snapshot | `/app/cci-reading`, `CCIReadingPage.tsx`, `buildCciSnapshot()` | Cross-community consistency can be shared as trust evidence. | Copy output now uses shared GSN headed-paper snapshot text; visual preview can be added later if needed. |
| TrustSlip copied snapshot | `/app/trust-slip`, `TrustSlipPage.tsx`, `buildTrustSlipSnapshot()` | Portable trust evidence for merchants/outsiders. | Copy output now uses shared GSN headed-paper snapshot text with limitation language. |
| TrustSlip verify copied snapshot | public and app verify routes, `TrustSlipVerifyPage.tsx`, `buildTrustSlipVerifySnapshot()` | Visitor/verifier may copy the result as current evidence. | Copy output now uses official snapshot heading, generated time, privacy, and limitation fields. |
| Trust Passport copied snapshot | `/app/trust`, `TrustScorePage.tsx`, `buildTrustPassportSnapshot()` | Member may send wider trust passport summary. | Copy output now uses official snapshot heading and paper fields. |
| Community public verification | `/verify/community/:communityKey`, `CommunityVerifyPage.tsx` | Public community confirmation can be shown to outsiders. | Has official GSN authority, screenshot security, watermark, footer, and placeholder-free generated marks; remaining work is visual phone/print review only. |
| Community verification link package | Any copy/share path that sends `/verify/community/:communityKey` | The link itself may be sent to a community, merchant, institution, or outsider for verification and is a GSN branding surface. | Public verifier Copy link and Marketplace community verify sharing now use the branded `GSN Community Verification Link` headed-paper package with community ref, purpose, verify link, public record, relay availability, privacy, and limitation language; remaining work is visual phone review and finding any future emitters. |
| Community confirmation public outcome | `/community-confirmations/public/:token`, `CommunityConfirmationOutcomePage.tsx` | Public result can be copied, printed, and used as evidence. | Has shared GSN authority, screenshot security, watermark, footer, and placeholder-free generated marks; remaining work is final visual phone/print review. |
| Public shop face | `/shop/:gmfnId`, `ShopGalleryPage.tsx` | Public shop link may be sent to visitors. | Source-level handled: direct copy/share uses `GSN Public Shop Invitation`, the first screen carries a GSN brandbar and watermark/signboard treatment, and the verification panel frames shop/community IDs as evidence for judgement rather than approval. Remaining work is final phone text-fit and screenshot review only. |
| Private vault access page | `/vault/:token`, `ShopAccessPage.tsx` | Visitor receives private shop/vault link. | Has GSN restricted-access authority marks, watermark, screenshot security note, and footer; remaining work is visual phone review and deeper copy/package audit if needed. |

## Priority 2: Payment, Withdrawal, And Receipt-Like Papers

These are not repayment evidence by themselves, but they can be copied,
screenshot, or sent for action. They must look official and must not imply bank
guarantee or automatic debit.

| Surface | Route / file | Why it needs headed paper | Current gap |
| --- | --- | --- | --- |
| Payment pool instructions | `/app/payment/pool`, `PaymentInstructionsPage.tsx` | User may send or screenshot bank/payment route details. | Full payment instruction and pay-in details copy actions now use branded GSN Payment Instruction paper; remaining work is visual phone review. |
| Repayment instruction / claim | `/app/payment/loans/:loanId`, `RepaymentPage.tsx` | Borrower may copy/share payment reference and repayment claim context. | Full repayment instruction copy now uses branded GSN Support Repayment Instruction paper with limitation language; remaining work is visual phone review. |
| Loan summary copy | `/app/loan-summary/:loanId`, `LoanSummaryPage.tsx` | Loan status/summary can be copied as evidence. | Source-level handled: Copy summary uses `GSN Support Summary Snapshot`, Copy audit uses `GSN Support Audit Link`, and the page renders `GsnSnapshotPaperCard` for visual paper preview; remaining work is visual phone review. |
| Withdrawal summary and payout account | `/app/withdrawal-instructions`, `WithdrawalInstructionsPage.tsx` | User may copy payout/withdrawal route details. | Community rail, payout account, and withdrawal summary copy actions now use branded GSN payment instruction packages; remaining work is visual phone review. |
| Payout details summary | `/app/payout-details`, `PayoutDetailsPage.tsx` | Payout information may be copied for settlement review. | Visible preview and copy now use branded GSN payout details snapshot paper; remaining work is visual phone review. |
| Payment rails summary | `/app/payment-rails`, `PaymentRailsPage.tsx` | Rail status can be read or copied as finance evidence. | Copy action now uses branded GSN Payment Rails Summary paper with no-payment-approval/no-settlement boundary; remaining work is visual phone review. |
| Subscription Spotlight payment details | `/app/shop-control/subscription-spotlight`, `SubscriptionSpotlightPage.tsx` | Shop owner may copy payment details for paid spotlight. | Copy action now uses branded GSN Subscription Spotlight Payment Instruction paper; remaining work is visual phone review. |
| Vault payment details | `/app/vault-control`, `VaultControlPage.tsx` | Shop owner may copy payment details and private link details. | Payment copies use branded GSN Private Vault Payment Instruction paper and private block copies use GSN Private Vault Invitation paper; remaining work is visual phone review. |

## Priority 3: Invite, Link, Shop, And Marketplace Packages

These are link packages that move between people. They should look intentional,
not like raw copied URLs.

| Surface | Route / file | Why it needs headed paper | Current gap |
| --- | --- | --- | --- |
| Join/invite package | `/app/build-first-circle`, `BuildFirstCirclePage.tsx` | User copies/shares invite bundle by WhatsApp, share sheet, Facebook, or link. | Copy/share text and visible previews now use the branded `GSN Community Invite` paper package through `GsnSnapshotPaperCard`; remaining work is visual phone text-fit review. |
| Community invite link package | Join links from `/join`, `/join/:code`, `/join/community/:clanId`, Build First Circle, and Marketplace link tools | A community invite is a branded doorway into GSN, not a raw URL. | Build First Circle, legacy Clans, and Marketplace Link Center copy/share paths now use branded GSN Community Invite paper; remaining work is visual review across each invite entry surface. |
| Legacy clans invite package | `ClansPage.tsx` | Contains copy link/full package and fallback PDF references. | Full package copy now uses the shared `GSN Community Invite` headed-paper format while preserving guide and fallback PDF references; remaining work is visual review if the legacy page remains in pilot use. |
| Marketplace join/public shop link center | `/app/marketplace`, `MarketplacePage.tsx` | Links are copied for join/shop/community package routes. | Community verify, join invite, and public shop copy/share paths now use branded GSN headed-paper packages; remaining work is visual phone review of the Link Center panels. |
| Demand Box summary | `/app/demand-box`, `DemandBoxPage.tsx` | Demand/offer requests may be sent or screenshotted. | Copy actions now produce a compact `GSN Demand Request Paper` with visible requester/community context and release-authority limitation; remaining work is visual phone review of the cards. |
| Shop owner public link copies | `/app/shop-control`, `ShopControlPage.tsx`, `CommunityShopControlPanel.tsx` | Owner can copy shop/control links. | Community Home shop-control public-link copy uses the branded `GSN Public Shop Invitation`; Shop Control private Vault viewing links use the branded private Vault package. Remaining work is visual phone review of owner panels. |
| Shop assets public link copies | `/app/shop-assets`, `ShopAssetsPage.tsx` | Owner copies public shop/product links. | Public shop, block, and item copy actions use the branded `GSN Public Shop Invitation` package; remaining work is visual phone review of the copy panels. |
| Public shop invite/link package | `/shop/:gmfnId`, `/shop-gallery/:gmfnId`, `/open-shop/:gmfnId`, owner copy actions in Shop Control / Shop Assets / Marketplace | The public shop link is a marketing and trust identity package for the shop. | Public Shop direct copy, Shop Assets copy actions, Community Home shop-control copy, and Marketplace public shop copy now use branded GSN shop invitation packages; remaining work is visual phone review and final text-fit inspection. |
| Vault/private block link copies | `/app/vault-control`, `VaultControlPage.tsx` | Private block links move to selected visitors. | Owner Vault private block copies now use branded GSN Private Vault Invitation paper; remaining work is visual phone review. |
| Vault invite/private-view package | `/vault/:token`, `/shop-access/:token`, `/vault-shop-access/:token`, and owner vault copy actions | Vault access is permissioned; the invitation must explain what the visitor can view and what remains restricted. | Owner Vault link copies use `GSN Private Vault Invitation`; visitor access page has restricted-access authority marks, watermark, screenshot security note, and footer. Remaining work is visual phone review and any token-policy wording refinement. |

## Priority 4: Guarantor, Loan, And Support Evidence

These are sensitive but often become evidence. Treat private details carefully.

| Surface | Route / file | Why it needs headed paper | Current gap |
| --- | --- | --- | --- |
| Loan readiness | `/app/loan-readiness`, `LoanReadinessPage.tsx` | Readiness result may be screenshotted before application. | Copy action now produces a `GSN Support Readiness Snapshot` with member/community context, readiness factors, support gap context where visible, and a decision-support-only boundary. Remaining work is visual phone review. |
| Loan suggestions | `/app/loan-suggestions`, `LoanSuggestionsPage.tsx` | Suggested support/guarantor fit may be shared internally. | Copy action now produces a `GSN Supporter Fit Snapshot` with visible fit reading, current support-request context, capped visible candidate lines, and a decision-support-only boundary. Remaining work is visual phone review. |
| Loan workbench | `/app/loan-workbench`, `LoanWorkbenchPage.tsx` | Borrowing work state may become loan evidence. | Copy action now produces a `GSN Support Workbench Snapshot` with support-item figures, capped supporter-fit/request rows, and a no-approval/no-settlement/no-release boundary. Remaining work is visual phone review. |
| Guarantor inbox | `/app/guarantor-inbox`, `GuarantorInboxPage.tsx` | Guarantor decisions become evidence. | Queue summary now uses `GSN Support Queue Snapshot` for visible paper preview and copy. Remaining work is visual phone review and deeper decision-card export audit. |
| Guarantor earnings summary | `/app/guarantor-earnings`, `GuarantorEarningsPage.tsx` | User can copy summary. | Summary now uses `GSN Supporter Value Snapshot` for visible paper preview and copy, with payout-truth wording in the detail lines. Remaining work is visual phone review. |
| Backend loan evidence PDF | `loan_evidence_pack_pdf_service.py` | Loan evidence pack is formal evidence. | Open generated PDF and visually confirm official shell. |

## Priority 5: Admin/Internal Snapshots

These are not visitor-facing first, but copied summaries can leave the admin
context during support or pilot review. They should not expose private data by
default.

| Surface | Route / file | Why it matters | Current gap |
| --- | --- | --- | --- |
| Community confirmation inbox summaries | `/app/community-confirmations`, `CommunityConfirmationInboxPage.tsx` | Admin copies review summaries. | Queue and review-case copies now use bounded internal GSN review papers with private-contact/responder-note redaction language; remaining work is admin workflow visual review. |
| Community confirmation policy summary | `/app/community-confirmations/policy`, `CommunityConfirmationPolicyPage.tsx` | Policy may be copied for explanation. | Needs official policy-summary paper if shared. |
| Admin incomplete loan snapshots | `AdminIncompleteLoansPage.tsx` | Admin can copy queue and loan snapshots. | Should be internal GSN review paper, not raw text. |
| Admin trust event snapshots | `AdminTrustEventsPage.tsx` | Admin can copy event snapshots. | Should be internal GSN audit paper with privacy rules. |
| Bank console summaries/settings | `BankConsolePage.tsx` | Admin can copy summaries/config. | Must not become public evidence without redaction. |
| Revenue allocation summary | `RevenueAllocationPage.tsx` | Admin can copy allocation summary. | Needs internal official summary if shared. |

## Backend PDF Surfaces To Visually Open

The backend already has a shared institutional PDF helper. The next truth check
is visual: generate/open sample PDFs and confirm they look like official GSN
headed papers, not just source-level compliant files.

| Backend service | Expected paper |
| --- | --- |
| `gmfn_backend/app/services/evidence_pack_pdf_service.py` | GSN Evidence Pack |
| `gmfn_backend/app/services/loan_evidence_pack_pdf_service.py` | GSN Loan Evidence Pack |
| `gmfn_backend/app/services/user_evidence_pack_pdf_service.py` | GSN User Evidence Pack |
| `gmfn_backend/app/services/trust_slip_evidence_pdf_service.py` | GSN TrustSlip Evidence Snapshot |
| `gmfn_backend/app/services/trust_timeline_pdf_service.py` | GSN Trust Timeline |
| `gmfn_backend/app/services/reports_service.py` | GSN reports such as loan trust or exposure reports |

## Proposed Implementation Order

1. Build one shared frontend headed-paper/snapshot wrapper.
2. Convert `trustDocumentSnapshots.ts` output first, because it powers Identity,
   CCI, TrustSlip, TrustSlip Verify, and Trust Passport copy snapshots.
3. Apply the same wrapper to visible public verification surfaces:
   TrustSlip Verify, Community Verify, Community Confirmation Outcome.
4. Apply a branded link-package variant to Community Verify links, Trust
   Passport snapshot links, community invites, shop-view invites, and
   vault/private-view invites so copied links arrive as GSN-branded invitations,
   not raw URLs.
5. Apply payment/receipt variant to Payment Instructions, Repayment,
   Withdrawal, Payout, Subscription Spotlight, and Vault payment details.
6. Apply the remaining link/invite variant to Build First Circle, Marketplace
   link center, Shop Control, Shop Assets, Vault links, and Public Shop link
   copy.
7. Add an audit that searches for copy/share/print/PDF/snapshot actions and
   requires an institutional surface or an explicit documented exception.

## Definition Of Done For Each Surface

- The shared or route-local paper includes GSN mark/watermark/title/footer.
- The existing useful words are preserved unless product owner asks for copy
  changes.
- The paper states generated time or currentness where available.
- The paper states reference/code/link/token where available.
- Private data is not exposed in public/visitor mode.
- It fits a 390x844 phone screenshot when the paper itself is the information
  unit, or it is split into explicit Page 1 / Page 2 packages.
- Buttons remain stable and no raw URL dominates the main screenshot.
- The relevant audit/build passes locally.
