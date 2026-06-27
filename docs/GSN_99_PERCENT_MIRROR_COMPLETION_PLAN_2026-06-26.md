# GSN 99 Percent Mirror Completion Plan

Date: 2026-06-26

Purpose: map the institutional GSN documents to the current repo and identify the shortest safe path to make the app match the document as closely as possible for pilot.

## Position

We can get the product very close to the institutional document at pilot level.

We should not claim 100 percent live parity until these are real, tested, and operational:
- paid/API verification integrations;
- automatic bank payout;
- protected trade release-before-payment;
- mature fraud/dispute case handling beyond the current append-only/admin-review foundations;
- deeper aggregate community economic analytics beyond the current community, finance, trust, and pool readings.

For pilot, those can be represented truthfully as:
- engine present / suspended;
- manual admin reconciliation;
- trust evidence before action;
- guided user flow that records enough evidence for later automation.

## Completion Buckets

### Bucket A - Can Complete With Existing Engines

These should be treated as immediate implementation work, not new product invention.

1. Money In / Pool
   - Keep one direct lane:
     - amount;
     - currency;
     - purpose;
     - generated reference;
     - pay this account;
     - proof/reconciliation fallback.
   - Use existing expected payment and bank reconciliation logic.
   - User copy must avoid backend words like "expected payment", "rail context", or "not declared".

2. Money Out / Normal Withdrawal
   - Separate from Support & Loans.
   - If requested amount is within available balance:
     - generate withdrawal code/reference;
     - show payout destination;
     - tell the user this is queued for payout/reconciliation during pilot;
     - later connect the same code to automatic payout.
   - Do not ask for purpose when it is the user's own available money unless policy requires it.

3. Support-Backed Withdrawal
   - If requested amount is above available balance:
     - tell the user it needs support;
     - route directly into the selected marketplace Support Requests lane;
     - preserve amount, community, currency, and support gap in handoff state.

4. Support & Loans Guided Flow
   - Use the existing backend fields:
     - amount;
     - duration;
     - repayment cadence;
     - service fee;
     - guarantors required;
     - guarantor suggestions;
     - repayment schedule;
     - commitment trust event;
     - stale support expiry.
   - Present only the guided borrower lane first.
   - Hide readiness, suggestions, workbench, inbox, and earnings as deeper tools.

5. Trust Identity Layer
   - Keep GSN ID, community name, and community ID visible on finance/support action screens.
   - Use TrustSlip / Trust Passport / community verification as the evidence layer.

6. Contribution Tracking / ROSCA
   - Keep contribution evidence tied to marketplace/community pool.
   - Use expected payments and pool events for real status.
   - Keep ROSCA as marketplace/community-local, not global-only.

7. Commitment Builder
   - Keep Commitment Builder in the institutional mirror because the repo and regenerated public executive-summary paper now treat it as capability 22.
   - Link repayment plans and personal money commitments into commitment evidence without pretending every personal goal is verified payment evidence.

8. Diaspora, Hiring, And Distance Verification Presentation
   - Treat Trust Passport, TrustSlip, public verification, translation/portable evidence, and community verification as the already-built engine for distance trust.
   - Present this clearly:
     - "Use TrustSlip when someone far away needs to verify you."
     - "Use Trust Passport when an employer, merchant, association, or support network needs the fuller trust story."
   - Do not create a separate diaspora or hiring engine before pilot unless a later product decision requires a dedicated lane.

9. Community Economic Reading
   - Use the current community, trust, finance, pool, contribution, support, and marketplace readings as the pilot-level community economic picture.
   - Later, as the network grows, deepen this into tailored reports for specific groups.

10. Dispute / Customer Help Contact
   - The repo already has dispute foundations, including append-only dispute routes and admin dispute review services.
   - For pilot, add a simple user-facing support contact:
     - "Need help or want to raise a dispute? Email GSN support."
   - The real support email must be configured before exposing it publicly.

### Bucket B - Pilot-Suspended But Must Be Framed Correctly

These can be made product-complete for pilot if the UI tells the truth.

0. Paid/API verification
   - Treat as planned integration work, not live product capability.
   - Pilot behavior:
     - use existing TrustSlip, public verification, community verification, and evidence-pack checks;
     - do not imply a paid external verification provider has confirmed the record unless a real provider response exists.
   - Later behavior:
     - connect paid provider checks only behind explicit consent, pricing, provider status, and auditable result storage.

1. Automatic payout
   - Treat as engine/future automation.
   - Pilot behavior:
     - generate code;
     - record request;
     - admin reconciles;
     - admin/manual bank transfer happens outside GSN;
     - trust event records outcome.
   - Do not tell users money is automatically sent until a payout provider is live.

2. Bank API reconciliation
   - Money In and repayments already have expected payment application logic.
   - Pilot fallback must remain clear:
     - use exact reference;
     - upload/send proof;
     - admin reconciles if automatic matching is not available.

3. Guarantor approval to payout trigger
   - Treat guarantor approvals as evidence/authorization.
   - Pilot behavior:
     - enough approvals generate or unlock payout instruction/code;
     - admin uses it to manually release.
   - Later behavior:
     - approvals trigger automatic payout.

### Bucket C - Larger Build, Not 99 Percent Without More Work

These are deeper versions of current capabilities. They do not block a 99 percent pilot mirror if the app presents the current truth clearly.

1. Release Before Payment
   - Current app has trust evidence and marketplace surfaces.
   - Missing:
     - trade agreement record;
     - release decision;
     - buyer/seller acceptance;
     - dispute window;
     - release/reject/hold outcome;
     - trust consequences.

2. Evidence-Backed Buying and Selling
   - Current app has shop, marketplace, TrustSlip, Demand Box, Vault.
   - Missing:
     - complete transaction lane;
     - protected trade status;
     - handoff between request, offer, evidence, release, and dispute.

3. Fraud Reduction Before Action
   - Current app has TrustSlip, verification, trust policy, append-only dispute routes, and admin dispute review services.
   - Pilot completion:
     - expose a clear support/dispute email contact;
     - record serious cases through the existing admin/backend review path.
   - Later maturity:
     - deterministic fraud case workflow;
     - dedicated investigator/admin action UI;
     - user-facing consequence/status;
     - fraud evidence packs.

4. Diaspora Trust Bridge
   - Current app supports the core engine through portable identity, Trust Passport, TrustSlip, public verification, and community verification.
   - Pilot completion:
     - present those surfaces as the way trust travels across distance.
   - Later maturity:
     - dedicated cross-border support/remittance story;
     - diaspora sponsor/support relationship;
     - country/currency-specific compliance framing.

5. Trust-Based Hiring / Service Economy
   - Current app can support it through Trust Passport, TrustSlip, shop/services, Demand Box, and public verification.
   - Pilot completion:
     - present TrustSlip and Trust Passport as evidence that can help another person judge reliability before hiring or working with the member.
   - Later maturity:
     - employer/job/request workflow;
     - service proof;
     - hiring trust evidence pack.

6. Community Economic Power
   - Current app has community, trust, finance, pool, contribution, marketplace, and support summaries.
   - Pilot completion:
     - use those existing readings as the community economic picture.
   - Later maturity:
     - more official aggregate backend endpoints;
     - tailored community-level economic reports;
     - exportable institutional report.

## Recommended Execution Order

1. Lock Money In language and reference/account detail flow.
2. Finish Money Out as normal withdrawal with code/manual payout pilot behavior.
3. Finish Support & Loans guided borrower lane.
4. Connect support-backed withdrawal directly into that lane with preserved context.
5. Hide deeper loan tools behind "More support tools" or details.
6. Add a real configured GSN support email to help/dispute surfaces.
7. Deepen Commitment Builder into the relevant guided flows while keeping the institutional mirror at 22 capabilities.
8. Keep the capability mirror audit checking that the 22 capabilities are represented in routes/docs/copy/public papers.
9. Then start larger protected trade / release-before-payment work.

## Truth To Use In Partner Or Tester Language

GSN already has the trust evidence, community, contribution, finance, loan, guarantor, repayment, shop, marketplace, Demand Box, and identity foundations.

For pilot, bank movement is controlled by references, proof, and admin reconciliation. Automatic bank payout and protected trade release are planned integrations, not something we should claim as fully live until tested end to end.

For pilot disputes, users should have a direct GSN support email and GSN can handle the case from the backend/admin side. A chat bot can come later.
