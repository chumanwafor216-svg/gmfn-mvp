# GSN Book Alignment Map

Date: 2026-07-05

Status: Draft working map

## Purpose

This document maps the institutional book doctrine into the current GSN product.
It is the Phase 1 artifact from `docs/GSN_BOOK_COMPLETION_PROTOCOL_DRAFT.md`.

The goal is not to add more doctrine to the interface. The goal is to keep GSN
honest while turning the book's central chain into clearer product operation:

```text
Community -> Behaviour -> Evidence -> Trust Event -> Trust Passport ->
TrustSlip -> Decision -> Opportunity -> Prosperity
```

Use this map before changing UI copy, adding evidence surfaces, renaming routes,
or presenting long-term institutional ideas as current product capability.

## Status Labels

| Status | Meaning |
| --- | --- |
| Live | Built, routed, and usable in current product behavior. |
| Pilot | Built or partly built, but still being tested, narrow, or fragile. |
| Prepared | The product structure exists, but the full behavior is not activated. |
| Roadmap | Approved direction, not yet implemented as a reliable feature. |
| Institutional Future | Requires external adoption, governance maturity, scale, partners, or legal/product proof. |

## Confirmed Source Anchors

Architecture and product doctrine:

- `docs/GSN_BOOK_COMPLETION_PROTOCOL_DRAFT.md`
- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/GSN_MISSION_PROTOCOL_2026-06-30.md`
- `docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`
- `docs/GSN_TRUST_EVENT_STANDARDIZATION_PROTOCOL_2026-06-29.md`
- `docs/SCREEN_REGISTRY.md`
- `docs/SCREEN_SPECS.md`

Frontend route anchors:

- `frontend/src/App.tsx`
- `frontend/src/lib/appRoutes.ts`

Backend anchors:

- `gmfn_backend/app/db/models.py`
- `gmfn_backend/app/api/routes/trust_events.py`
- `gmfn_backend/app/api/routes/trust_slips.py`
- `gmfn_backend/app/api/routes/trust_score.py`
- `gmfn_backend/app/api/routes/community_domains.py`
- `gmfn_backend/app/api/routes/community_confirmations.py`
- `gmfn_backend/app/api/routes/marketplace.py`
- `gmfn_backend/app/api/routes/loans.py`
- `gmfn_backend/app/api/routes/pool.py`
- `gmfn_backend/app/api/routes/vault.py`
- `gmfn_backend/app/api/routes/vault_access.py`
- `gmfn_backend/app/api/routes/reports.py`

Unabated truth: this map is document-level alignment only. It does not prove a
route is complete, beautiful, fast, or pilot-ready. Each route still needs its
own audit before UI or backend claims are upgraded.

## Book Concept Alignment

| Book Concept | Existing GSN Product Equivalent | Route or File Anchor | Status | Gap | Next Action |
| --- | --- | --- | --- | --- | --- |
| Community | Community Home for member-owned community index; Community Domain for institutional operating space | `/app/community`, `/app/community-domain`, `frontend/src/pages/CommunityHomePage.tsx`, `frontend/src/pages/CommunityDomainDashboardPage.tsx`, `gmfn_backend/app/api/routes/community_domains.py` | Pilot | Lightweight Community/Clan language and institutional Community Domain language still coexist. The future Committee rename is documented but not authorized as a migration. | Keep route contracts stable. Add future rename only after schema, UX, and compatibility plan. |
| Behaviour | Member actions, shop actions, finance actions, confirmation responses, focus commitments, membership actions | `frontend/src/pages/DashboardPage.tsx`, `frontend/src/pages/MarketplacePage.tsx`, `frontend/src/pages/ShopControlPage.tsx`, `gmfn_backend/app/services/trust_events_services.py` | Pilot | Not every meaningful action becomes a clean standardized evidence event yet. | Audit high-value behaviours and classify which should become Trust Events, governance events, commerce events, or finance records. |
| Evidence | Trust Events, evidence packs, public verification papers, community confirmation records, TrustSlip snapshots, vault access | `/app/trust-timeline`, `/trust-slips/verify/:code`, `/verify/community/:communityKey`, `gmfn_backend/app/api/routes/evidence_pack.py`, `gmfn_backend/app/api/routes/evidence_verify.py` | Pilot | Evidence exists in several surfaces, but display contracts and maturity labels are not fully unified. | Define a shared evidence display contract before more screens invent local evidence wording. |
| Trust Event | Append-only `TrustEvent` table and route/service layer | `gmfn_backend/app/db/models.py`, `gmfn_backend/app/api/routes/trust_events.py`, `frontend/src/pages/TrustTimelinePage.tsx`, `frontend/src/pages/AdminTrustEventsPage.tsx` | Live / Pilot | The append-only record is live, but the universal evidence dimension plus Community Domain activity catalogue ontology is not fully implemented. | Treat current Trust Events as live record infrastructure and the universal-dimension model as prepared protocol until implemented and tested. |
| Universal Evidence Dimensions | Standard vocabulary for participation, contribution, responsibility, reliability, support, leadership, learning/development, recognition | `docs/GSN_TRUST_EVENT_STANDARDIZATION_PROTOCOL_2026-06-29.md` | Prepared | Protocol exists; no confirmed live seed-table/catalogue implementation was verified in this pass. | Create a separate implementation plan for seed data, migration/backfill strategy, and UI display before claiming this is live. |
| Trust Passport | Member's portable trust/evidence command surface, currently represented by Trust Score / My GSN Identity / Trust Timeline | `/app/trust`, `/app/my-gmfn-and-i`, `/app/trust-timeline`, `frontend/src/pages/TrustScorePage.tsx`, `frontend/src/pages/MyGMFNAndIPage.tsx`, `frontend/src/pages/TrustTimelinePage.tsx` | Pilot | The concept is present, but the full Passport is still split across several screens and can read as profile/guide/trust score instead of one living evidence instrument. | Do a Trust Passport screen-purpose audit before redesign. Consolidate meaning without merging route responsibilities blindly. |
| TrustSlip | Shareable, current, scoped evidence snapshot with public verification | `/app/trust-slip`, `/t/:code`, `/trust-slips/verify/:code`, `frontend/src/pages/TrustSlipPage.tsx`, `frontend/src/pages/TrustSlipVerifyPage.tsx`, `gmfn_backend/app/api/routes/trust_slips.py` | Live / Pilot | TrustSlip issuance, verify, share, and evidence papers exist. Decision-specific filtering by purpose is still not complete across all use cases. | Keep public boundary language. Add decision-purpose classification gradually, starting with merchant verification and community confirmation. |
| Decision | Reader blocks, quick answers, warnings, action inbox, confirmation outcome readings | `frontend/src/components/TrustSlipReaderBlock.tsx`, `frontend/src/pages/trustSlipVerify/trustSlipVerifyViewModel.ts`, `frontend/src/pages/CommunityConfirmationOutcomePage.tsx`, `frontend/src/pages/NotificationsPage.tsx` | Pilot | Decision support exists, but not every evidence surface starts with the same "what can/cannot be concluded" structure. | Define a compact decision-reading pattern for public and signed-in evidence pages. |
| Opportunity | Marketplace, shops, Demand Box, support/borrowing, merchant release, verification confidence | `/app/marketplace`, `/shop/:gmfnId`, `/app/demand-box`, `/app/loans`, `/merchant-release/:token`, `frontend/src/pages/MarketplacePage.tsx`, `frontend/src/pages/ShopGalleryPage.tsx`, `frontend/src/pages/LoansPage.tsx` | Pilot | Opportunity is visible, but not every opportunity is explicitly tied back to evidence and current verification state. | Upgrade opportunity cards lane by lane so each asks: what evidence supports this action? |
| Prosperity | Safer trade, support access, shop growth, community finance, confidence, reduced reset when moving between communities | `frontend/src/pages/FinancePage.tsx`, `frontend/src/pages/MarketplacePage.tsx`, `frontend/src/pages/ShopControlPage.tsx`, `gmfn_backend/app/api/routes/pool.py`, `gmfn_backend/app/api/routes/loans.py` | Prepared / Pilot | Prosperity is a product outcome, not a guaranteed feature. The app must not promise money, loans, success, or automatic opportunity. | Keep prosperity language outcome-based and cautious. Measure pilot proof before stronger claims. |
| Community Memory | Community Record, public community verification, membership evidence, action reviews, Trust Timeline | `/verify/community/:communityKey`, `/verify/community/:communityKey/member/:memberKey`, `/app/trust-timeline`, `frontend/src/pages/CommunityVerifyPage.tsx`, `frontend/src/pages/CommunityMemberVerifyPage.tsx`, `gmfn_backend/app/api/routes/community_confirmations.py` | Pilot | Pieces exist, but Community Record is not yet a unified, curated memory surface. | Define Community Record as the visible form of Community Memory and map which records belong there. |
| Behavioural Capital | Demonstrated trust value from repeated evidence | Trust/CCI/TrustSlip/finance readiness surfaces, `frontend/src/pages/CCIReadingPage.tsx`, `frontend/src/pages/TrustScorePage.tsx`, `frontend/src/pages/FinancePage.tsx` | Prepared | Concept is powerful but risky. It is not a financial asset, credit score, guarantee, or investment instrument. | Use behind readiness and confidence language only. Do not financialize without legal, operational, and pilot proof. |
| Community Intelligence | Privacy-safe aggregated insight and admin oversight | `/app/command-center`, `/app/command-center/trust-analytics`, `/app/command-center/trust-graph`, `frontend/src/pages/TrustCommandCentrePage.tsx`, `frontend/src/pages/TrustAnalyticsPage.tsx`, `frontend/src/pages/AdminTrustGraphPage.tsx` | Prepared / Pilot | Admin analytics exist, but broad Community Intelligence claims require aggregation discipline and anti-surveillance guardrails. | Keep admin surfaces governance-scoped. Mark cross-community intelligence as pilot until data and privacy proof mature. |
| Governance | Community Domain action reviews, membership placement, delegated authority, confirmation policy | `/app/community-domain`, `/app/community-confirmations/policy`, `gmfn_backend/app/api/routes/community_domains.py`, `frontend/src/pages/CommunityConfirmationPolicyPage.tsx` | Pilot | Community Domain governance engine is extensive but still pilot-hardening. Lightweight community governance remains separate. | Continue validator, permission, and copy hardening before making stronger institutional claims. |
| Identity | Global member identity, GSN ID, profile/name continuity, public member credential | `/app/identity`, `/app/dashboard`, `/verify/community/:communityKey/member/:memberKey`, `frontend/src/pages/IdentityIntegrityPage.tsx`, `frontend/src/pages/DashboardPage.tsx`, `frontend/src/pages/CommunityMemberVerifyPage.tsx` | Pilot | Identity, membership, verification, endorsement, and trust must remain separate. Some surfaces still need audits to avoid implying identity equals trust. | Keep identity evidence separate from trust readings. Audit public credential copy after major changes. |
| Membership | Community membership, join requests, activation, member credential | `/join`, `/pending-approval`, `/activate-membership`, `/app/community/:clanId/join-requests`, `frontend/src/pages/JoinEntryPage.tsx`, `frontend/src/pages/MemberActivationPage.tsx`, `frontend/src/pages/CommunityJoinRequestsPage.tsx` | Live / Pilot | Membership flows exist, but lightweight community membership and institutional domain membership have different governance meanings. | Do not merge create invite, join existing community, and Community Domain membership flows. |
| Marketplace | One selected community in operation, not a generic listing board | `/app/marketplace`, `frontend/src/pages/MarketplacePage.tsx`, `gmfn_backend/app/api/routes/marketplace.py` | Pilot | Marketplace front desk and lanes exist, but every lane still needs evidence-first reading discipline. | Continue lane-by-lane stabilization under protected button/audit cages. |
| Shop / Public Shop | One global member shop exposed through community-governed contexts | `/app/shop-control`, `/shop/:gmfnId`, `frontend/src/pages/ShopControlPage.tsx`, `frontend/src/pages/ShopGalleryPage.tsx`, `gmfn_backend/app/api/routes/marketplace.py` | Pilot | Public shop has stronger evidence framing now, but shop credibility still depends on current community, TrustSlip, and verification context. | Keep shop evidence scoped. Do not call community context verified unless backend status proves it. |
| Vault / Private Evidence | Protected shop/private access and controlled release | `/app/vault-control`, `/vault/:token`, `frontend/src/pages/VaultControlPage.tsx`, `frontend/src/pages/ShopAccessPage.tsx`, `gmfn_backend/app/api/routes/vault.py`, `gmfn_backend/app/api/routes/vault_access.py` | Pilot | Private evidence boundary exists, but it should not be treated as public evidence by default. | Map vault records into the evidence visibility contract before expanding public claims. |
| Finance / Borrowing | Community finance, support, loans, pool, repayment, exposure | `/app/finance`, `/app/loans`, `/app/payment/pool`, `/app/withdrawal-instructions`, `frontend/src/pages/FinancePage.tsx`, `frontend/src/pages/LoansPage.tsx`, `gmfn_backend/app/api/routes/loans.py`, `gmfn_backend/app/api/routes/payment_instructions.py` | Pilot | Finance has many live lanes, but GSN must remain non-custodial and must not imply bank/lender authority. | Keep finance pages action-specific and evidence-led. Separate readiness from approval. |
| Public Verification | TrustSlip, community record, member credential, confirmation outcome, merchant release | `/t/:code`, `/verify/community/:communityKey`, `/verify/community/:communityKey/member/:memberKey`, `/community-confirmations/outcome/:token`, `/merchant-release/:token`, frontend public verification pages | Pilot | Public papers are strong, but each must keep the confirms/does-not-confirm boundary obvious. | Reuse the public decision-reading pattern and avoid exposing private data for convenience. |
| Institutional Network Scale | Multi-domain, multi-community trust infrastructure across countries and institutions | Protocol docs, Community Domain engine, admin command center | Institutional Future | The architecture aims here, but live adoption/proof is not yet global-scale infrastructure. | Speak as roadmap/institutional future unless pilot evidence supports stronger wording. |

## Screen Purpose Alignment

| Screen / Route | Book-Aligned Question | Status | Alignment Risk | Next Audit |
| --- | --- | --- | --- | --- |
| `/cover` and `/welcome` | What is GSN and why should I trust the entry? | Live | Can become too explanatory if book doctrine is poured into entry. | Keep entry short, emotional, and action-led. |
| `/app/dashboard` | What matters now in my trust life? | Live / Frozen sections | Dashboard can become a content dump or accidental command center. | Respect Dashboard freeze cages; route deeper work outward. |
| `/app/community` | Which communities carry my identity, shop, finance, and trust context? | Pilot | Community Home can accidentally become the operational nucleus. | Keep one identity block, compact community list, and route to Marketplace for work. |
| `/app/marketplace` | What can I do inside this selected community, and what evidence supports it? | Pilot | Marketplace can read as generic commerce or overloaded finance/trust dump. | Continue lane-by-lane evidence-front-desk audit. |
| `/app/shop-control` | How do I manage my one global shop and outward evidence safely? | Pilot | Shop control can expose too many tools or make visibility claims too casually. | Keep one active owner task at a time. |
| `/shop/:gmfnId` | What public evidence supports this seller before trade? | Pilot | Public shop can imply broad verification from context alone. | Keep seller identity, community context, and unverified claims separate. |
| `/app/trust` | What has been preserved about my demonstrated trust? | Pilot | Trust Passport concept is split and can still feel like a score/profile. | Plan a Passport consolidation audit before redesign. |
| `/app/trust-slip` | What evidence can I safely share for this decision? | Live / Pilot | TrustSlip can become a generic share link instead of a decision paper. | Add decision-purpose filters carefully. |
| `/t/:code` and `/trust-slips/verify/:code` | What should a receiver conclude and not conclude from this TrustSlip? | Live / Pilot | Public readers may still over-read the TrustSlip as approval. | Keep quick answer and limitation blocks prominent. |
| `/app/trust-timeline` | What events are behind my trust reading? | Pilot | Timeline can become a raw activity list. | Group by evidence dimension once the ontology is live. |
| `/app/identity` | Which identity evidence is present, missing, or needs repair? | Pilot | Identity can be confused with trust or verification. | Preserve identity/membership/trust separation. |
| `/app/community-confirmations/policy` | Who may confirm what, and what privacy boundary protects the people involved? | Pilot | Policy screens can expose admin workload or imply stronger evidence than exists. | Keep confirmation policy scoped and privacy-forward. |
| Public community/member verification routes | What community or membership record is shown, and what does it not prove? | Pilot | Public records can sound like legal or transaction approval. | Standardize public reading language. |
| `/app/community-domain` | How does an institution operate its domain, governance, members, and evidence? | Pilot | The breadth of Community Domain can become dense or overstate activation. | Use maturity labels and keep one lane open at a time. |
| `/app/command-center` | What should authorized administrators review or investigate? | Prepared / Pilot | Admin intelligence can drift toward surveillance or unsupported cross-community claims. | Keep access scoped, aggregate carefully, and avoid hidden scoring claims. |

## Immediate Gap Register

| Gap | Why It Matters | Suggested Next Step |
| --- | --- | --- |
| Trust Passport is conceptually bigger than the current `/app/trust` page. | The book's Passport is the portable evidence instrument, not just a trust score or profile. | Create a Trust Passport screen-purpose audit before changing UI. |
| Universal Evidence Dimensions are protocol-ready but not verified as live infrastructure. | Overclaiming this would make the product look more standardized than it is. | Write an implementation map for dimensions, activity catalogues, Trust Event migration/backfill, and display. |
| Community Record / Community Memory is not one clear product surface yet. | The book depends on institutional memory, not scattered event lists. | Define which public and private records belong to Community Record. |
| Decision-specific TrustSlips are not complete across all use cases. | A generic TrustSlip is less useful than a seller, membership, borrowing, release, or confirmation-specific paper. | Start with merchant verification and community confirmation because those routes already have public decision surfaces. |
| Behavioural Capital needs strict guardrails. | It can easily sound like money, credit, or guaranteed value. | Keep it as internal readiness/confidence language until legal and pilot proof exist. |
| Community Intelligence is not yet proven at institutional scale. | Admin analytics must not become surveillance or unsupported scoring. | Use pilot labels and governance-scoped access until aggregation proof is stronger. |

## Implementation Order From This Map

1. Finish the map review with owner feedback.
2. Create a Trust Passport purpose audit for `/app/trust`, `/app/my-gmfn-and-i`,
   `/app/trust-timeline`, `/app/identity`, and `/app/trust-slip`.
3. Define the shared evidence display contract.
4. Define Community Record as the visible form of Community Memory.
5. Implement universal evidence dimension infrastructure only after the data
   model and migration/backfill plan are explicit.
6. Upgrade TrustSlip by decision context, one route at a time.
7. Upgrade Marketplace and Public Shop evidence framing lane by lane.

## Devil's Advocate

GSN is close enough to the book that the main risk is not missing doctrine.
The main risk is overexplaining, overclaiming, or giving every screen the weight
of a manifesto.

The product should become simpler as it becomes more book-aligned:

- fewer exposed blocks;
- clearer evidence boundaries;
- stronger decision readings;
- honest maturity labels;
- less generic promise language;
- more proof before opportunity.

Do not make users read the book inside the app. Make the app behave like the
book is already disciplined infrastructure underneath it.
