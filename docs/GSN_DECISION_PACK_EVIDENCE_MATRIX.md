# GSN Decision Pack Evidence Matrix

Date: 2026-07-27

## Owner Question

GSN should replicate how society already verifies people. A landlord, employer, customer, guarantor, community leader, supplier, or support provider does not need a generic trust label. They need an answer to a real decision question:

- What has this person declared about themselves?
- Where has GSN recorded matching behaviour?
- Who in the community can confirm it?
- What is still missing before I rely on it?
- What must GSN refuse to claim?

Example: if Emeka says he was a plumber in Nigeria and is now in the UK, GSN should not merely show a Trust Passport title. It should show the trade/service claim, where the claim came from, whether Shop, Marketplace, Demand Box, quotes, service responses, completed work, TrustEvents, or community witnesses support it, and what still needs live confirmation.

## Verdict

The direction is correct, but a generic Trust Passport is not enough by itself.

The first GSN evidence engine must be a purpose-routed Decision Pack engine. Each pack asks a specific social question and maps that question to existing GSN evidence surfaces plus missing structural links. The frontend and backend catalogues should remain aligned so public TrustSlip Verify and signed-in TrustSlip preparation tell the same evidence story. The TrustSlip should remain public-safe: it can reduce uncertainty, point to evidence, and request confirmation, but it must not certify professional status, guarantee future behaviour, expose private Trust Passport data, or make the decision for the recipient.

## Decision Pack Categories

| Decision Pack | Real-world question | Expected evidence | Current GSN sources | Missing structural links | What GSN must not claim |
| --- | --- | --- | --- | --- | --- |
| Community Standing | How is this person known where people actually know them? | Active membership, role, sponsor/witness, participation, contribution, responsibility, support, leadership, recognition, live confirmation route. | Community Home, Marketplace community context, Community Confirmation, TrustEvents. | Structured purpose-specific witness questions; issue-resolution summary tied to the member. | Moral character, government identity, future behaviour. |
| Referral | Can I refer this person without damaging my credibility? | Known relationship route, inviter/sponsor path, witness currentness, relevant activity categories, visible cautions. | Invite/join records, Community Confirmation, TrustSlip. | Referral outcome record; referrer confidence statement tied to purpose. | Automatic suitability, guarantee by referrer, removal of recipient responsibility. |
| Guarantor or Support | Is there enough evidence to stand for or support this person? | Repayment history, missed/complete outcomes, guarantee exposure, people who stood for the person, contribution discipline. | Loans and Support, Repayment, Guarantor Inbox, Finance. | Guarantor risk summary; previous guarantee outcome surfaced as decision evidence. | Loan approval, bank guarantee, automatic repayment, money custody. |
| Employment | Is there enough evidence to continue an employment conversation? | Declared work role or skill, work/service/responsibility/learning/recognition TrustEvents, employer/customer/community witness, Demand/service response history. | Trust Passport, Shop/service profile, Demand Box, Community Confirmation. | Structured skill claim field; completed work record with customer confirmation; role-specific witness question. | Professional licence, right to work, future performance, employer decision. |
| Housing | Is there enough community evidence to continue a housing decision? | Recurring payment discipline, ROSCA/contribution completion, repayment follow-through, responsible/reachable witness, issue-resolution evidence. | Finance, ROSCA/Money Pool, Loans/Repayment, Community Confirmation. | Housing-specific reference questions; previous landlord/accommodation witness route; public-safe issue-resolution summary. | Credit approval, right to rent, legal tenancy check, guaranteed rent. |
| Trade or Skilled Work | Who has seen this person trade, serve, or complete work? | Declared trade/service category, Shop advert, Demand Box response, quotes, work-response trail, customer/community witness, completion/complaint/resolution outcome. | Shop Gallery, Demand Box, Marketplace, Merchant Verification/TrustSlip. | Customer-confirmed completed-job record; job photos tied to confirmed work; direct ask-community trade question. | Trade licence, insurance, home safety guarantee, future work quality. |
| Supplier | Is there enough evidence to continue a supplier or contractor decision? | Shop/supplier identity, fulfilment/delivery/release/protected trade records, merchant verification, customer/community recognition, correction outcomes. | Marketplace, Merchant Release, Vault, TrustSlip Verify. | Supplier fulfilment TrustEvent standard; delivery/correction outcome joined to Trust Passport. | Delivery guarantee, payment release authority, escrow, automatic supplier approval. |
| Volunteer | Is there enough evidence to accept this person into a volunteer role? | Participation, contribution, responsibility, leadership, sponsor currentness, sensitive-role confirmation where needed. | TrustEvents, Community Confirmation, Community Domain outcomes. | Safeguarding-specific confirmation questions; volunteer outcome records connected to TrustEvents. | Background check, safeguarding clearance, legal eligibility, future conduct. |
| Business Partnership | Is there enough evidence to continue a partnership discussion? | Shop/marketplace/merchant recognition, finance discipline, repayment/support follow-through, supplier/trade outcomes, dispute resolution, domain witness. | Shop/Marketplace, Finance, Trust Passport, Community Confirmation. | Partnership outcome/correction records; shared commercial risk checklist tied to evidence categories. | Company due diligence, legal authority, investment advice, guaranteed profit. |
| Community Membership | Is there enough evidence to admit or connect this person to a community? | Entry route, invite/join/sponsor/domain approval, recorded vs verified identity evidence, existing roles, witness strength, contribution readiness. | Join/Invite, Identity Integrity, Community Home, Community Confirmation. | Admission-purpose confirmation questions; join outcome linked back into Trust Passport. | Citizenship, legal immigration status, automatic admission, universal community endorsement. |

## Required Engine Behaviour

A Decision Pack should always show four layers:

1. Decision question: the exact thing the recipient is trying to decide.
2. Evidence expected: the types of evidence that would normally help answer that question.
3. GSN sources: the existing app surfaces where that evidence may be present.
4. Gaps and boundaries: what is not yet structurally captured and what GSN refuses to certify.

For work, employment, supplier, trade, and partnership decisions, the engine now
also exposes a public-safe declaration layer where existing records support it:
active Shop service face, active Marketplace listings, and protected-trade seller
records. This answers the first part of the Emeka plumber question: "what has
this person declared or presented on GSN?" It still does not answer the stronger
question, "has a customer or community witness confirmed this skill and outcome?"
until witness, completed-work, and complaint/resolution records exist.

For housing, guarantor/support, and partnership decisions, the engine now exposes
public-safe connected record pointers where existing finance/support records
support it: loan/support lifecycle counts, repayment record counts, guarantor
response counts, and pool/contribution event counts. These pointers answer
"does GSN have any financial/support behaviour records to review?" They do not
answer legal tenancy, creditworthiness, bank approval, rent guarantee, or future
repayment questions.

Across Decision Packs, the engine now also exposes public-safe aggregate community
witness outcome pointers where matching Community Confirmation requests and
outcomes already exist. These pointers answer "has anyone already asked the
community this kind of question, and did aggregate witness responses arrive?"
They do not expose responder identities, private notes, requester labels, licences,
guarantees, approvals, or final decisions.

## Architecture Gaps To Build Next

- Structured profile declarations: skill, trade, occupation, service type, landlord/tenant references, supplier category, volunteer role, support role. Work/service packs now partially read existing Shop, Marketplace listing, and protected-trade seller records as declared claim pointers. Still missing: dedicated structured claim records, self-declared role categories, custom validation, and demand-response completion links.
- Purpose-specific community confirmation: prompt routing is wired, and Decision Packs now read existing matching Community Confirmation request/outcome aggregates as witness outcome pointers. Still missing: custom per-person phrasing, richer structured witness answers by role/category, witness-to-record linkage for completed work or housing references, and category-specific confirmation summaries.
- Completed work records: protected-trade release/receipt records can now appear as seller-side declared work pointers. Still missing: customer-confirmed completed-job records connected to Demand Box, quotes, Shop services, completion media, complaints, and resolution outcomes.
- Payment-discipline summaries: loan/support lifecycle, repayment, guarantor-response, and pool/contribution record pointers are now partially wired into housing, guarantor/support, and partnership packs. Still missing: mature payment-discipline summaries, lateness/consistency interpretation, landlord-specific references, and public-safe issue-resolution context without acting like a credit score.
- Issue-resolution summaries: show whether issues were resolved or remain unresolved without exposing private disputes or defamatory detail.
- Guarantee exposure and outcome: show where people stood for a person and what happened, without turning GSN into a bank or guarantor.
- Backend parity: backend Decision Pack definitions now carry the same evidence/source/gap/boundary matrix, controlled purpose-specific community confirmation prompts, public-safe declared work/service claim pointers for relevant packs, public-safe financial/support record pointers for relevant packs, and aggregate community witness outcome pointers. The remaining work is deeper data capture: dedicated structured claims, customer-confirmed completed jobs, landlord references, issue-resolution summaries, guarantee outcomes, supplier fulfilment outcomes, and richer witness-answer workflows.

## Product Boundary

GSN should make trust evidence visible, not pretend to be the final authority. A Decision Pack is strong when it connects a recipient to records and people who can confirm the matter. It is weak when it only shows a badge, title, score, or uploaded self-description without witness or outcome evidence.