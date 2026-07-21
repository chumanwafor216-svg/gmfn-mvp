# GSN Endorsement Readiness Audit

Last updated: 2026-07-21

## Purpose

This is the master audit prompt for testing whether GSN is becoming a business
that serious endorsers, investors, customers, partners, and institutions would
want to back.

Use it for major design decisions, new features, business documents, customer
discovery findings, investor materials, commercial strategy, and technical
architecture reviews.

It does not replace:

- `docs/APP_WIDE_AUDIT_PROTOCOL.md` for screen and route polish;
- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md` for the current innovation
  thesis;
- `docs/whitepaper_variants/GSN_INVESTOR_DILIGENCE_QA_AND_PROOF_ROADMAP.md`
  for investor diligence proof planning;
- `docs/whitepaper_variants/GSN_DISCOVERY_EVIDENCE_MEMO_TEMPLATE.md` for
  turning interview notes into evidence.

It sits above them as the judgement standard.

## Mission

Do not review GSN as a friendly builder protecting an idea.

Review GSN as if you are:

- a UK Innovator Founder endorsement panel;
- a venture investor;
- a university commercialisation office;
- a World Bank innovation specialist;
- an enterprise software architect.

Your responsibility is to find every weakness before they do.

Do not protect the idea. Stress-test it.

## Core Question

```text
How do we build a business that endorsers would love to endorse?
```

Every answer must improve the business, not merely defend it.

## Scope

Apply this audit to:

- product features;
- screens and workflows;
- backend APIs and data models;
- frontend journeys and copy;
- trust, governance, finance, marketplace, community, and onboarding logic;
- white papers, founder briefs, investor decks, discovery scripts, and email
  packs;
- customer discovery outcomes;
- pricing, packaging, partnership, and go-to-market decisions;
- operational processes such as support, verification, dispute handling, and
  evidence capture.

When auditing implementation, name the exact route, screen, API, component,
service, model, document, or workflow being judged.

## Response Rules

Never answer generally.

Whenever possible, point to exact:

- screens;
- routes;
- APIs;
- workflows;
- documents;
- business logic;
- customer interactions;
- evidence records;
- unresolved assumptions.

If something is weak, explain:

- why it is weak;
- the likely consequence;
- exactly how to improve it;
- what proof would change the judgement.

Separate:

- confirmed facts from product or code;
- evidence from customer discovery;
- inference;
- ambition;
- unproven claims.

Do not call a thesis proven because a document says it clearly, a screen looks
good, or a local demo path works.

## Evaluation Framework

### 1. Problem

Answer:

- What problem is this solving?
- Is the problem significant?
- Who experiences it?
- How frequently?
- How costly is it?
- Is the pain urgent enough to create action?

Devil's advocate:

- If the problem is weak, say so.
- If the problem is real but not painful enough, say so.
- If the problem is important only to the founder, say so.

Improvement standard:

- The recommendation should make the target user, payer, or institution's real
  problem sharper and more measurable.

### 2. Innovation

Answer:

- What is genuinely new?
- What existing approaches already exist?
- Where does GSN differ?
- Is the innovation technical, commercial, governance, social, or a combination?
- Can the innovation be explained in one sentence?

Devil's advocate:

- If the feature is ordinary software wrapped in ambitious language, say so.
- If the innovation depends on adoption rather than the current product, say so.
- If the claim needs external comparison, name the missing comparison.

Improvement standard:

- The recommendation should make GSN's difference easier to explain, harder to
  dismiss, and more directly tied to user or institutional value.

### 3. Customer Value

Answer:

- Why would somebody actually use this?
- Who benefits first?
- What decision becomes easier?
- What action becomes safer, faster, cheaper, or more trusted?
- Would users voluntarily return?

Devil's advocate:

- If the user benefit is vague, say so.
- If the user must understand too much before value appears, say so.
- If the first-use value is weaker than the long-term story, say so.

Improvement standard:

- The recommendation should create or clarify an immediate reason for a real
  user to come back.

### 4. Commercial Viability

Answer:

- Who pays?
- Why would they pay?
- When would they pay?
- What recurring revenue exists?
- What manual cost is created?
- What assumptions remain unproven?

Devil's advocate:

- If the payer is not the same as the beneficiary, identify the adoption gap.
- If the revenue story depends on scale before value, call that out.
- If the pricing or payment trigger is unclear, say so.

Improvement standard:

- The recommendation should make the first payer, first paid use case, and first
  renewal reason more concrete.

### 5. Scalability

Answer whether this works with:

- one community;
- one hundred communities;
- one thousand communities;
- multiple countries;
- low-connectivity or mobile-first users;
- different legal, governance, and cultural contexts.

Identify:

- what breaks first;
- what becomes too manual;
- what becomes too expensive;
- what creates data, permission, support, or moderation overload.

Devil's advocate:

- If scale depends on founder judgement, manual support, or undocumented policy,
  say so.
- If community differences require configuration rather than custom code, say
  so.

Improvement standard:

- The recommendation should reduce one obvious bottleneck or make one future
  scaling constraint measurable.

### 6. Defensibility

Answer:

- Can competitors copy this?
- What becomes difficult to copy?
- Does network growth increase value?
- Does accumulated trust evidence become an advantage?
- Does governance, data provenance, community adoption, or workflow integration
  create a moat?

Devil's advocate:

- If the defensibility is only "we will build it first", reject that as weak.
- If the strongest moat requires data that has not been collected yet, say so.

Improvement standard:

- The recommendation should strengthen evidence accumulation, trust provenance,
  workflow dependency, or community-level adoption in a way that is hard to
  replicate quickly.

### 7. Trust And Governance

Answer:

- Is governance understandable?
- Are permissions clear?
- Are disputes manageable?
- Is evidence tamper-resistant?
- Are incentives aligned?
- Can users challenge, correct, withdraw, narrow, or expire evidence where the
  product promises that?
- Is the system avoiding social-credit, surveillance, and automatic judgement
  risks?

Devil's advocate:

- If a governance claim is only a design intention, do not call it proven.
- If the product stores sensitive evidence without clear visibility and
  correction rules, treat that as severe.

Improvement standard:

- The recommendation should make authority, consent, evidence provenance,
  challenge, correction, and human judgement clearer.

### 8. Technical Architecture

Review:

- frontend;
- backend;
- APIs;
- data model;
- security;
- scalability;
- maintainability;
- tests and auditors.

Identify:

- duplicated logic;
- dead code;
- hidden risks;
- architectural weaknesses;
- route-contract drift;
- frontend/backend mismatch;
- desktop-versus-phone parity risk;
- frozen or high-risk areas touched.

Devil's advocate:

- If business-critical behaviour exists only in UI copy, say so.
- If a route appears to imply stronger proof than the backend can support, say
  so.
- If a technical shortcut could become expensive after pilots begin, say so.

Improvement standard:

- The recommendation should move important business rules toward clear backend
  ownership, stable route contracts, honest frontend representation, and test
  coverage that guards the decision.

### 9. User Experience

Ask whether a new user can understand within five minutes:

- what GSN is;
- why it exists;
- what to do next;
- what is real now versus future or unconfigured;
- what authority they have;
- what evidence they are being asked to trust.

If not, redesign the journey before adding more features.

Devil's advocate:

- If the first five minutes require founder explanation, the journey is not
  ready.
- If the screen has many important actions but no obvious next step, it fails.

Improvement standard:

- The recommendation should make the first action, next action, and reason for
  return more obvious.

### 10. Customer Discovery

Answer:

- What assumptions have not yet been validated?
- Which interviews should be conducted next?
- Who must be interviewed separately because their incentives differ?
- What exact behaviour, objection, price signal, or adoption signal is missing?
- What evidence would make us change direction?

Devil's advocate:

- Polite interest is not validation.
- A liked demo is not adoption.
- A screenshot reaction is not proof of demand.
- Founder conviction is not customer pull.

Improvement standard:

- The recommendation should produce a better next interview, pilot test, refusal
  test, price test, or evidence memo.

### 11. Evidence For Endorsement

Identify evidence already available for:

- innovation;
- viability;
- scalability;
- founder capability;
- market demand;
- execution;
- safeguards;
- governance;
- responsible data use.

Then identify evidence still missing.

Devil's advocate:

- Local product screenshots prove product-path explanation only.
- White paper language proves articulation only.
- Working code proves execution only where the route actually works and the
  underlying data, permissions, and states are real.

Improvement standard:

- The recommendation should convert one claim into better proof or downgrade an
  overclaim into honest language.

### 12. Risks

List and rank:

- technical risks;
- commercial risks;
- legal risks;
- adoption risks;
- operational risks;
- founder risks.

For each serious risk, state:

- severity;
- consequence;
- earliest warning sign;
- mitigation;
- owner;
- next evidence needed.

Devil's advocate:

- Do not hide existential risks under vague wording.
- Do not bury legal, privacy, or trust-governance risk below ordinary product
  polish.

Improvement standard:

- The recommendation should reduce a severe risk, expose it earlier, or stop
  GSN making claims that the current system cannot safely carry.

### 13. Immediate Priorities

Given limited founder time and money, identify the five highest-impact actions.

Everything else should wait.

For each priority, state:

- exact action;
- owner;
- target route, document, screen, or workflow;
- evidence created;
- what should be deferred;
- why this moves endorsement readiness forward.

Devil's advocate:

- Do not recommend busywork.
- Do not recommend a feature merely because it is interesting.
- Do not recommend investor outreach before the evidence gate is strong enough.

Improvement standard:

- The recommendation should make GSN more fundable, endorsable, sellable,
  testable, or safer to pilot.

## Required Output Format

For each audited item, use this shape:

```text
Audited item:

Confirmed facts:

Current judgement:

Weaknesses:

Consequences:

Recommended improvement:

Evidence needed:

Priority:

Decision:

Does this make GSN more likely to become a business that endorsers would love
to endorse?
```

Use one of these decisions:

- `Proceed`: the item improves endorsement readiness and has a clear next step.
- `Proceed with guardrails`: the item is useful but carries risk that must be
  controlled.
- `Hold`: the item may be useful later but is not one of the highest-impact
  actions now.
- `Reject`: the item does not improve endorsement readiness or creates
  unacceptable risk.

## Ultimate Question

Every audit answer must finish by asking:

```text
Does this make GSN more likely to become a business that endorsers would love to endorse?
```

If the honest answer is no, the recommendation should be rejected.

## Unabated Truth

This audit exists because GSN can fail even if the app becomes visually polished
and technically functional.

The hard question is not "can we build more features?"

The hard question is whether every feature, document, workflow, and pilot step
makes GSN more credible as a real business with a painful problem, a defensible
innovation, a reachable customer, a believable payer, responsible safeguards,
and proof strong enough for serious endorsement.
