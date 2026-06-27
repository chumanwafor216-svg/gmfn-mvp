# GSN Document To System Gap Review

Date: 2026-06-26

Review sources:
- `docs/external_review/GSN_INSTITUTIONAL_MASTER_WITH_EXPLANATIONS (1).pdf`
- `docs/external_review/GSN_Consolidation_Group_1_Communities_as_Trust_Factories.docx`
- `docs/external_review/GSN_Consolidation_Group_11_Trust_Infrastructure_Model.docx`
- Extracted text files in `docs/external_review/`
- Current repo docs, frontend routes, and backend services

## Bottom Line

The uploaded documents are not an exact replica of the current GSN system.

They are a strong institutional mirror of the north-star model: communities create trust, GSN preserves and organizes trust evidence, and trust then supports finance, trade, work, commitment discipline, and opportunity.

The current repo already implements many of the bones of that model. It also contains operational details that the uploaded documents do not fully explain, especially bank rails, expected payments, reconciliation, payout destinations, repayment schedules, pilot/manual money-out handling, and Commitment Builder.

Truth: the documents are broader than the MVP in trade protection, paid/API verification, and automated payout. The MVP already has stronger foundations than the first pass gave it credit for in dispute recording/admin review, distance verification, hiring support through Trust Passport/TrustSlip, community finance/trust readings, and Commitment Builder. The MVP is also deeper than the documents in practical finance plumbing.

## Current Institutional Mirror State

As of this cleanup, the public executive-summary paper now presents **22 things GSN does**, not the old 21-capability mirror. It includes Commitment Builder because the repo already treats it as capability 22.

This closes the outsider-facing institutional-presentation gap around capability count, branding, and system explanation. It does **not** mean every future integration is live. The remaining explicit boundary is paid/API verification and regulated automation: API-paid verification, automatic payout, and full protected trade-release rails must not be claimed as live until the active environment proves them end to end.

The strategic frame for the next ten years is:
- ordinary SaaS can digitize workflow without carrying real trust;
- e-commerce can move goods without proving enough community context;
- community platforms can hold belonging without making demonstrated value portable;
- finance tools can read balances without reading contribution, support, repayment, and commitment behaviour;
- GSN's wedge is to connect these gaps through community trust portability, community capital, Trust Passport, TrustSlip, public verification, trusted commerce, and Commitment Builder.

## Document Model

The consolidation documents describe this stack:

1. Communities
2. Trust Evidence
3. Trust Identity
4. Decision Support
5. Opportunity

The Group 11 flow is:

`Communities -> Trust Events -> Trust Evidence -> Trust Passport -> TrustSlip -> Verification -> Decision -> Opportunity`

That structure is directionally present in the repo through:
- Trust Events
- Trust Passport / Trust score surfaces
- TrustSlip and public verification
- Community verification
- Marketplace, Demand Box, Shop, Spotlight, Vault
- Money In, Money Out, Loans, Guarantors, Repayments

## Capability Mirror

| Capability | Current system status | Repo evidence | Gap |
| --- | --- | --- | --- |
| Communities as Trust Factories | Strongly aligned | Community Home, Marketplace, Trust Events, TrustSlip, Community verification docs and routes | Needs ongoing copy discipline so finance/trade pages still read as trust infrastructure, not isolated tools. |
| Trust Events / Evidence | Implemented | `gmfn_backend/app/services/trust_events_services.py`, trust event routes, evidence pack services | Some evidence packs are still more technical than user-facing. |
| Trust Passport / TrustSlip | Implemented | `/app/trust`, `/app/trust-slip`, public verify routes, trust slip backend services | Needs continued audit of public/private evidence boundaries. |
| Community Verification | Implemented/partial | public community verification routes and community confirmation pages | Verifier quality and dispute consequence logic is still not a full institutional-grade trust court. |
| Release Before Payment | Partial | capability copy exists in `frontend/src/lib/gmfnCapabilities.ts`; Trusted Trade references exist | Not a full trade transaction workflow yet. No complete escrow, release command, merchant release guarantee, or dispute lifecycle. |
| Trusted Buying and Selling | Partial | Marketplace, Shop, TrustSlip, Demand Box, Vault | Still mostly trust presentation and marketplace presence, not a complete protected buying/selling lane. |
| Cross-Community Trade | Partial | Marketplace routes, portable shop identity, public shop routes | Cross-community trade exists more as visibility and identity than full transaction settlement. |
| Fraud Reduction Before Action | Partial | TrustSlip, verification, trust policy, dispute service, append-only dispute routes, admin dispute review | Pilot can use support email plus backend/admin review. Later work is a mature fraud case UI and deterministic escalation workflow. |
| Spotlight Visibility | Implemented | Shop Control, Spotlight routes, paid/free spotlight notes | Payment activation and ranking logic should remain audited. |
| Reputation-Based Visibility | Partial | capability layer and trust-informed surfaces | Ranking/visibility rules are not yet fully institutionalized across all marketplace surfaces. |
| Marketplace Presence Across Communities | Implemented/partial | One global shop/public shop/gallery/vault routes | Needs consistent routing and selected-community context in every launcher. |
| People-Backed Loans | Backend strong, frontend partial | loan routes, guarantor services, loan readiness/suggestions/workbench, repayment schedule | UI still needs one clean guided borrower flow: amount, duration, repayment cadence, fee, guarantors, request, expiry, outcome. |
| Supporting Others | Implemented/partial | guarantor inbox, guarantor earnings, loan guarantor services | Guarantor selection/earning/locked-money story needs simpler user-facing flow. |
| Emergency Support | Partial | loans/support infrastructure can support urgent cases | No dedicated emergency support product lane yet. |
| Diaspora Trust Bridge | Pilot-ready presentation layer | portability, Trust Passport, TrustSlip, community verification, public verification | Present the existing trust evidence as the way trust travels across distance. Dedicated diaspora transfer/support can come later. |
| Trust Savings (ROSCA Support) | Partial | ROSCA notes, expected payment hooks, contribution tracking | Needs clearer marketplace-local ROSCA product surface and lifecycle. |
| Contribution Tracking | Implemented/partial | expected payments, pool events, bank reconciliation service | UI should show simple contribution history and status without backend jargon. |
| Continuity Across Distance | Partial | portable identity, TrustSlip, shop/community routes | Mostly a consequence of other systems, not a distinct flow. |
| Portable Trust Identity | Implemented | Trust Passport, TrustSlip, public verification | Continue to keep GSN ID and community context visible on action screens. |
| Reputation Mobility | Partial | trust score, TrustSlip, marketplace/shop portability | Needs clearer rules for what reputation can do in decisions. |
| One Global Shop | Implemented/partial | public shop, shop control, gallery, vault | Needs continued phone stability and less owner-tool clutter. |
| Service Economy Participation | Pilot-ready presentation layer | shop/service categories, Demand Box, marketplace requests, TrustSlip | Present TrustSlip/Trust Passport as evidence for work and service decisions. Dedicated service-work lifecycle can come later. |
| Trust-Based Hiring | Pilot-ready presentation layer | Trust Passport, TrustSlip, Demand Box, public verification | Existing trust evidence can support hiring judgement. Dedicated hiring/employer workflow can come later. |
| Demand Box | Implemented/partial | `/app/demand-box`, marketplace request backend | Good base exists; still needs simpler focus and stronger connection to trusted trade. |
| Community Economic Power | Pilot-ready with current readings | dashboard, finance, community summaries, trust command centre, pool/contribution/support readings | Current summaries can carry pilot. Deeper tailored analytics and exportable institutional reports can come later. |
| Commitment Builder | Institutional mirror aligned | `frontend/src/lib/gmfnCapabilities.ts` capability 22, Commitment Builder notes, and `frontend/tools/generate-static-gsn-pdfs.py` public executive summary generator | Dedicated goal/commitment workflows can deepen over time, but the outsider-facing 22-capability institutional mirror now includes it. |

## Finance Line Truth

### Money In / Pool

Implemented:
- The system has payment instructions, expected payments, pool events, and bank reconciliation hooks.
- `bank_application_service.py` can auto-apply confirmed expected payments for pool contributions and repayments.
- Marketplace/community context is present in finance surfaces.

Partial/manual:
- Actual bank transfer still happens outside GSN.
- Reconciliation is partly automated through expected-payment matching, but pilot usage still depends on clear references and manual confirmation paths.
- The document does not fully describe this operational detail.

Main gap:
- The user-facing flow must stay simple: amount, currency, purpose, generated reference, pay this account, upload/send proof if automatic bank match is not live.

### Money Out / Withdrawal

Implemented:
- There is a withdrawal route, payout/destination detail handling, and settlement rail UI.
- The page can decide when a requested amount needs support based on available balance.

Partial/manual:
- There is no full automatic payout release into the user's payout destination yet.
- For pilot, payout should be framed as code/reference plus admin reconciliation/manual payout.
- User copy must not imply that GSN itself is holding funds or automatically paying out if that is not live.

Main gap:
- Normal withdrawal and support-backed withdrawal must be separated clearly:
  - Normal withdrawal: within available balance, generate withdrawal reference/code, send for manual payout/reconciliation during pilot.
  - Support-backed withdrawal: above available balance, route into Loans & Support.

### Support & Loans

Implemented:
- Backend loan creation already has amount, duration, repayment cadence, service fee, net disbursed, guarantor pool, platform revenue, guarantors required, pool-used calculation, commitment trust event, guarantor suggestions, guarantor requests, approvals, repayment schedule, repayment expected payments, and stale support expiry.

Partial/manual:
- The frontend has several related pages: Loans, Loan Readiness, Loan Suggestions, Loan Workbench, Guarantor Inbox, Guarantor Earnings.
- These are not yet fully harmonized into one simple borrower journey.
- Support/loan pages still risk showing too many internal tools as first-class pages.

Main gap:
- The borrower path should lead the user through one clean lane:
  1. Amount needed
  2. Duration
  3. Repayment cadence
  4. Purpose
  5. Service fee and repayment total
  6. Guarantor requirement
  7. Choose or request guarantors
  8. Approval window and expiry
  9. Manual pilot payout code now, automatic payout later

## Biggest Disparities

1. The documents say GSN supports release-before-payment, but the app is not yet a complete protected trade/payment-release system.
2. Fraud/dispute should not be marked as absent: backend dispute foundations exist. The pilot gap is a simple user-facing contact and clearer admin-resolution presentation.
3. The loan/support backend is stronger than the current visible borrower journey.
4. Money Out still needs a clean pilot/manual payout frame and a later automatic payout bridge.
5. The documents understate operational finance plumbing already in the repo.
6. The old uploaded institutional PDF stopped at 21, but the repo and regenerated public executive summary now include Commitment Builder as capability 22.
7. Diaspora, hiring, service economy, and community economic power can be pilot-mirrored through Trust Passport, TrustSlip, public verification, shop/services, Demand Box, current community finance/trust summaries, and commitment discipline. Dedicated vertical flows can come later.
8. Paid/API verification, automatic payout, and full protected trade-release rails remain integration boundaries and must not be presented as live until proven in the deployed environment.

## Safest Next Priorities

1. Finish Money Out as a normal-withdrawal lane, not a hidden loan lane.
2. Finish Support & Loans as the support-backed lane when withdrawal exceeds available balance.
3. Hide readiness, suggestions, workbench, inbox, and earnings behind the guided flow unless the user asks for deeper tools.
4. Keep Money In direct and simple, with exact generated reference and account details.
5. Continue deepening Commitment Builder as a lived workflow, because the institutional mirror now names it but the execution-discipline product lane can still mature.
6. Add a real configured GSN support email for help/dispute contact.
7. Create a live capability matrix test/audit so documentation, routes, public PDFs, and user-facing labels cannot drift apart again.
8. Keep paid/API verification as the only deliberate not-yet-live book gap until the owner approves and verifies the integration.
