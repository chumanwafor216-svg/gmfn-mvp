# GSN Community Domain Operating System (CDOS)

## Protocol 16 - Engineering Constitution, Change Control, and Implementation Order

**Version:** 1.0
**Status:** Constitutional Protocol
**Audience:** Founders, Codex Developers, Technical Leads, Product Managers

---

## Related Protocols

Protocol 23, `docs/GSN_MISSION_PROTOCOL_2026-06-30.md`, defines the mission
that engineering change control and implementation order must ultimately serve.

Protocol 20, `docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`, defines the
first-principles test every engineering change must satisfy before entering the
implementation order below.

Protocol 21, `docs/GSN_DECISION_FRAMEWORK_DESIGN_PHILOSOPHY_PROTOCOL_2026-06-30.md`,
defines the decision priority order and tradeoff rules developers should apply
before choosing an implementation path.

Protocol 22, `docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md`,
defines the permanent invariants that engineering change control must not
weaken, bypass, or reinterpret as implementation details.

Protocol 17,
`docs/GSN_FOUNDATIONAL_DATA_MODEL_ENTITY_RELATIONSHIP_CONSTITUTION_PROTOCOL_2026-06-30.md`,
defines the entity ownership and relationship questions every substantial
feature must answer before implementation.

Protocol 18,
`docs/GSN_ARCHITECTURAL_DECISION_REGISTER_CONFLICT_RESOLUTION_PROTOCOL_2026-06-30.md`,
defines the ADR, feature-review, conflict-resolution, deprecation, testing,
performance, security, and release-governance rules that operationalize this
engineering constitution.

Protocol 19, `docs/GSN_INTEGRATED_COMMUNITY_LIFECYCLE_PROTOCOL_2026-06-30.md`,
defines the cross-engine lifecycle order that substantial CDOS implementation
work must preserve.

Protocol 24,
`docs/GSN_USER_JOURNEY_INTERACTION_PROTOCOL_2026-06-30.md`, defines the
journey-level user experience that implementation work should preserve.

Protocol 25,
`docs/GSN_SCREEN_BLUEPRINT_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`,
defines the UI implementation order and screen-ownership rules that engineering
change control should respect.

---

## 1. Purpose

This protocol governs how GSN itself is developed.

It is not about a single feature.

It defines the engineering discipline that protects GSN from gradually becoming
inconsistent as more features are added.

Every developer working on GSN must understand this protocol before implementing
new functionality.

---

## 2. Constitutional Principle

Protect the architecture before adding functionality.

A feature that weakens the architecture should not be implemented until it can
fit within the constitutional principles of GSN.

---

## 3. The Core Rule

The following are considered constitutional components.

They should be treated as stable:

- Community Domain;
- Committee;
- Community Settings;
- Governance Tree;
- Trust Events;
- Universal Behaviour Categories;
- Trust Passport;
- TrustSlip;
- Community Verification;
- Trust Graph;
- Opportunity Engine;
- Marketplace Engine;
- Community Finance Engine;
- Knowledge Engine;
- Infrastructure Engine.

These components evolve carefully.

They are not rewritten casually.

---

## 4. Every New Feature Must Pass Five Questions

Before development begins, every proposal must answer:

### Question 1

Which existing engine owns this feature?

If no engine owns it, the proposal requires architectural review.

### Question 2

Can this be solved through Community Settings?

If yes, configure it.

Do not build another engine.

### Question 3

Does this create new Trust Events?

If yes, define the following before writing code:

- Event source;
- Event structure;
- Trust Passport impact;
- TrustSlip impact.

### Question 4

Does it affect Community Governance?

If yes, define the following before implementation:

- authority;
- permissions;
- delegation;
- audit trail.

### Question 5

Does it preserve Community Memory?

If not, redesign it.

Nothing important should disappear from GSN.

---

## 5. Order of Implementation

Codex should implement in this order.

### Phase One - Foundation

- Identity;
- Community Domain;
- Community Settings;
- Governance;
- Membership.

### Phase Two - Trust Layer

- Universal Behaviour Categories;
- Community Activities;
- Trust Events;
- Trust Passport;
- TrustSlip.

### Phase Three - Verification Layer

- Community Verification;
- Merchant Verification;
- Endorsements;
- Trust Graph.

### Phase Four - Opportunity Layer

- Spotlight;
- Demand Box;
- Merchant Release Rail;
- Shop Following;
- Trusted Distribution.

### Phase Five - Commerce

- Marketplace;
- Shops;
- Vault;
- Merchant Profile.

### Phase Six - Community Finance

- Savings;
- Guarantees;
- People-backed Loans;
- Contribution Tracking.

### Phase Seven - Community Intelligence

- Command Centre;
- Analytics;
- Community Health;
- Reports.

---

## 6. Rule of Modification

No developer should modify a core engine directly.

Instead:

1. Identify the engine.
2. Determine whether Community Settings can solve it.
3. If not, prepare an Architecture Proposal.
4. Review before implementation.

---

## 7. Rule of Evidence

Every important action should answer:

> Does this become a Trust Event?

If yes:

1. Implement the Trust Event first.
2. Then implement the feature.

Evidence comes before presentation.

---

## 8. Rule of Configuration

If two organisations behave differently:

Do not fork the code.

Configure the behaviour.

Examples:

```text
School
-> Community Settings

Church
-> Community Settings

Market
-> Community Settings
```

Same engine.

Different configuration.

---

## 9. Rule of Community Ownership

Communities own:

- Governance;
- Membership;
- Departments;
- Local Activities;
- Local Administration.

GSN owns:

- Infrastructure;
- Engines;
- Trust Architecture;
- Security;
- Data Integrity.

Responsibilities must remain separate.

---

## 10. Rule of Backward Compatibility

Every update must preserve:

- Trust Events;
- Trust Passport;
- Trust Graph;
- Community Memory;
- Audit History.

Migration is acceptable.

Data loss is not.

---

## 11. Rule of Simplicity

Whenever two designs solve the same problem, choose the design that:

- uses existing engines;
- introduces fewer concepts;
- requires fewer user actions;
- preserves more evidence.

---

## 12. Rule of Human Governance

Technology should never replace legitimate community leadership.

Technology supports:

- recording;
- organising;
- communicating;
- analysing.

Human leaders remain responsible for judgement.

---

## 13. Rule of Documentation

Every significant architectural decision must include:

- reason;
- protocol reference;
- implementation notes;
- future extension notes.

No undocumented architectural changes should enter production.

---

## 14. Rule of Research

Where behaviour, trust, or governance models are uncertain:

- prototype;
- pilot;
- evaluate;
- refine.

Research informs architecture.

Architecture should not rely on untested assumptions when evidence can be
gathered.

---

## 15. Final Constitutional Statement

The GSN Community Domain Operating System is designed to remain stable while
supporting continuous innovation.

The platform grows by:

- adding evidence;
- extending configuration;
- strengthening governance;
- improving intelligence.

rather than by replacing its foundations.

Every contributor to GSN is therefore responsible not only for writing code, but
for protecting the integrity of the Trust Infrastructure upon which the entire
platform depends.
