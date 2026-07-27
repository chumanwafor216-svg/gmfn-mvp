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
| Guarantor or Support | Is there enough evidence to stand for or support this person? | Repayment history, missed/complete outcomes, guarantee exposure, people who stood for the person, contribution discipline. | Loans and Support, Repayment, Guarantor Inbox, Finance. | Mature guarantor risk summary; detailed previous guarantee outcome history beyond aggregate pointers. | Loan approval, bank guarantee, automatic repayment, money custody. |
| Employment | Is there enough evidence to continue an employment conversation? | Declared work role or skill, work/service/responsibility/learning/recognition TrustEvents, employer/customer/community witness, Demand/service response history. | Trust Passport, Shop/service profile, Demand Box, Community Confirmation. | Structured skill claim field; completed work record with customer confirmation; role-specific witness question. | Professional licence, right to work, future performance, employer decision. |
| Housing | Is there enough community evidence to continue a housing decision? | Community-living conduct, participation, support, responsiveness, promise-keeping, payment discipline, responsible/reachable witness, issue-avoidance or resolution evidence. | Finance, ROSCA/Money Pool, Loans/Repayment, Community Confirmation. | Housing-specific reference questions; previous landlord/accommodation witness route; public-safe issue-resolution summary. | Credit approval, right to rent, legal tenancy check, guaranteed rent. |
| Trade or Skilled Work | Who has seen this person trade, serve, or complete work? | Declared trade/service category, Shop advert, Demand Box response, quotes, work-response trail, customer/community witness, completion/complaint/resolution outcome. | Shop Gallery, Demand Box, Marketplace, Merchant Verification/TrustSlip. | Customer-confirmed completed-job record; job photos tied to confirmed work; direct ask-community trade question. | Trade licence, insurance, home safety guarantee, future work quality. |
| Supplier | Is there enough evidence to continue a supplier or contractor decision? | Shop/supplier identity, fulfilment/delivery/release/protected trade records, merchant verification, customer/community recognition, correction outcomes. | Marketplace, Merchant Release, Vault, TrustSlip Verify. | Supplier fulfilment TrustEvent standard; mature delivery/correction outcome timeline beyond aggregate protected-trade pointers. | Delivery guarantee, payment release authority, escrow, automatic supplier approval. |
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

For housing decisions, the engine now also exposes public-safe housing conduct/readiness
pointers where existing records support it: community participation, support,
responsibility, responsiveness, repayment follow-through, pool/contribution
activity, housing-specific Community Confirmation requests, aggregate witness
outcomes, and issue-review status. These answer the practical landlord question,
"does GSN have society-equivalent evidence that supports an inference this person
can live with others, keep obligations, and handle or avoid issues?" They do not
prove tenancy behaviour, property care, co-living success, landlord approval,
legal tenancy status, right-to-rent checks, affordability decisions, tenancy
approval, guaranteed rent, or future conduct, and they do not expose landlords,
accommodation providers, addresses, rent amounts, payment references, private
witness notes, or allegations.

For community-standing, referral, guarantor/support, housing, and partnership
decisions, the engine now exposes public-safe guarantee/support outcome pointers
from existing Loan and LoanGuarantor records where they exist. These answer "has
anyone stood for this person, has this person stood for others, and what aggregate
support status is visible?" They do not expose borrower or guarantor identities,
amounts, payment references, private notes, bank guarantees, loan approvals, cash
custody, or future support promises.

For employment, trade, supplier, and partnership decisions, the engine now exposes
public-safe fulfilment/correction outcome pointers from existing Protected Trade
records where they exist. These answer "does GSN have protected-trade status
evidence for release, receipt, completion, dispute, or correction?" They do not
expose trade codes, buyer or seller identities, item details, amounts, payment
references, private notes, escrow, payout approval, delivery guarantees,
product-quality proof, or future performance promises.

For employment, trade, supplier, and partnership decisions, the engine now also
exposes public-safe completed-work/customer-confirmation pointers from existing
service/delivery TrustEvents and Marketplace customer reviews where they exist.
These answer "does GSN have aggregate evidence that work was completed or
reviewed by a customer?" They do not expose customer identities, reviewer
identities, review text, notes, addresses, item details, prices, ratings by
person, private metadata, licences, insurance, home-safety approval, or future
work quality.

For employment, trade, supplier, and partnership decisions, the engine now also
exposes public-safe Demand Box request-outcome pointers from existing
MarketplaceRequest rows where they exist. These answer the limited question
"has this holder posted real demands inside active communities, and how did
those demands end?" They do not expose request titles, descriptions, areas,
phone numbers, requester or responder identities, quotes, prices, private notes,
Demand Box codes, or proof that the holder responded to someone else's demand,
was hired, completed the work, or will perform well.

Across Decision Packs, the engine now also exposes public-safe aggregate community
witness outcome pointers where matching Community Confirmation requests and
outcomes already exist. These pointers answer "has anyone already asked the
community this kind of question, and did aggregate witness responses arrive?"
They do not expose responder identities, private notes, requester labels, licences,
guarantees, approvals, or final decisions.

Across Decision Packs, the engine now also exposes public-safe issue-resolution
pointers from existing Community Confirmation decision/review records where they
exist. These answer "does GSN have any review-status evidence showing issues were
reported, settled, unresolved, or closed?" They do not expose allegations,
private notes, legal findings, defamatory detail, or final suitability decisions.

## Architecture Gaps To Build Next

- Structured profile declarations: skill, trade, occupation, service type, landlord/tenant references, supplier category, volunteer role, support role. Work/service packs now partially read existing Shop, Marketplace listing, and protected-trade seller records as declared claim pointers. Still missing: dedicated structured claim records, self-declared role categories, custom validation, and Demand Box responder/quote/job-completion links.
- Purpose-specific community confirmation: prompt routing is wired, and Decision Packs now read existing matching Community Confirmation request/outcome aggregates as witness outcome pointers. Still missing: custom per-person phrasing, richer structured witness answers by role/category, witness-to-record linkage for completed work or housing references, and category-specific confirmation summaries.
- Completed work records: protected-trade release/receipt records can now appear as seller-side declared work pointers, protected-trade fulfilment/correction status is partially wired as aggregate outcome pointers, service/delivery TrustEvents plus Marketplace reviews can now appear as aggregate completed-work/customer-confirmation pointers, and holder-owned Demand Box request outcomes can now appear as aggregate request-outcome pointers. Still missing: dedicated customer-confirmed completed-job records connected to Demand Box responses, quotes, Shop services, completion media, complaint detail, structured customer signoff, and mature resolution timelines.
- Payment-discipline summaries: loan/support lifecycle, repayment, guarantor-response, pool/contribution record pointers, and housing conduct/readiness pointers are now partially wired into housing, guarantor/support, and partnership packs. Still missing: mature payment-discipline summaries, lateness/consistency interpretation, actual landlord/accommodation reference records as optional corroboration, structured housing conduct witness answers, and public-safe issue-resolution context without acting like a credit score.
- Issue-resolution summaries: Community Confirmation decision/review record pointers are now partially wired as aggregate issue-resolution status. Still missing: mature issue-resolution summaries by category, safe dispute timelines, resolution evidence packs, and review-to-Trust Passport weighting rules.
- Guarantee exposure and outcome: Loan/LoanGuarantor record pointers are now partially wired as aggregate support-outcome status. Still missing: mature guarantor risk summaries, safe guarantee-outcome timelines, support exposure weighting rules, and category-specific explanation of what happened without turning GSN into a bank or guarantor.
- Backend parity: backend Decision Pack definitions now carry the same evidence/source/gap/boundary matrix, controlled purpose-specific community confirmation prompts, public-safe declared work/service claim pointers for relevant packs, public-safe financial/support record pointers for relevant packs, aggregate housing conduct/readiness pointers, aggregate guarantee/support outcome pointers, aggregate protected-trade fulfilment/correction outcome pointers, aggregate completed-work/customer-confirmation pointers, aggregate Demand Box request-outcome pointers, aggregate community witness outcome pointers, and aggregate issue-resolution pointers. The remaining work is deeper data capture: dedicated structured claims, dedicated customer-confirmed completed jobs, Demand Box responder/quote/job-completion links, landlord/accommodation reference records as optional corroboration, mature issue-resolution summaries, mature guarantee outcome summaries, mature supplier fulfilment timelines, and richer witness-answer workflows.

## Product Boundary

GSN should make trust evidence visible, not pretend to be the final authority. A Decision Pack is strong when it connects a recipient to records and people who can confirm the matter. It is weak when it only shows a badge, title, score, or uploaded self-description without witness or outcome evidence.