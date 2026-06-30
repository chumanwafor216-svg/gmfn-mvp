# GSN Community Domain Operating System (CDOS)

## Protocol 18 - Architectural Decision Register and Conflict Resolution Protocol

**Version:** 1.0
**Status:** Governance and Architecture Protocol
**Audience:** Founders, Codex Developers, Product Architects, Technical Leads

---

## Related Protocols

Protocol 23, `docs/GSN_MISSION_PROTOCOL_2026-06-30.md`, defines the mission
ADRs and conflict resolution should measure future architecture against.

Protocol 20, `docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`, defines the
first-principles standard ADRs should use when judging whether a proposal
strengthens the Trust Infrastructure or fragments it.

Protocol 21, `docs/GSN_DECISION_FRAMEWORK_DESIGN_PHILOSOPHY_PROTOCOL_2026-06-30.md`,
defines the decision compass ADRs should use when multiple implementation
options are possible.

Protocol 22, `docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md`,
defines the permanent invariants ADRs and conflict resolution must protect
before approving architecture changes.

Protocol 19, `docs/GSN_INTEGRATED_COMMUNITY_LIFECYCLE_PROTOCOL_2026-06-30.md`,
defines the cross-engine lifecycle blueprint that ADRs, release governance, and
conflict resolution must preserve when changes touch multiple CDOS engines.

Protocol 24,
`docs/GSN_USER_JOURNEY_INTERACTION_PROTOCOL_2026-06-30.md`, defines the
journey-level UX constitution ADRs should consider when UI decisions affect
user flow.

Protocol 25,
`docs/GSN_SCREEN_BLUEPRINT_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`,
defines the screen blueprint and implementation order ADRs should consider when
screen ownership, navigation, or staged UI delivery changes.

---

## 1. Purpose

This protocol establishes how architectural decisions are made, reviewed,
documented, and changed within GSN.

The objective is to prevent feature creep, contradictory implementations, and
inconsistent engineering decisions.

Every major architectural decision should be recorded permanently.

---

## 2. Constitutional Principle

Architecture has priority over features.

A useful feature that weakens the architecture should not be implemented until
it can be integrated without violating the constitutional principles of GSN.

---

## 3. Single Source of Truth

For every architectural topic there must be one authoritative protocol.

Examples:

- Community Governance -> Protocol 3;
- Community Onboarding -> Protocol 4;
- Trust Events -> Protocol 6;
- Verification -> Protocol 7.

Developers must never create competing versions of the same rule.

---

## 4. Architectural Decision Register

Every major decision must have an ADR entry.

Each entry should contain:

- Decision ID;
- Title;
- Date;
- Reason;
- Alternatives considered;
- Final decision;
- Impacted protocols;
- Compatibility notes;
- Author;
- Reviewer.

Example:

```text
ADR-001

Decision:
Community Domains configure GSN through Community Settings rather than creating
separate versions of the platform.

Reason:
Preserves one universal infrastructure.
```

---

## 5. Feature Review Checklist

Before implementing any feature, Codex must answer:

1. Which engine owns this feature?
2. Which protocol governs it?
3. Does it generate Trust Events?
4. Does it affect Community Settings?
5. Does it affect Governance?
6. Does it affect Identity?
7. Does it affect Trust Passport?
8. Does it affect the Trust Graph?

If any answer is unclear, implementation pauses until reviewed.

---

## 6. Conflict Resolution Order

When two ideas conflict, resolve them in this order:

### Rule 1

Protect the constitutional protocols.

### Rule 2

Protect the Trust Infrastructure.

### Rule 3

Protect Community Governance.

### Rule 4

Protect Community Memory.

### Rule 5

Protect simplicity.

Never choose complexity when the same outcome can be achieved through
configuration.

---

## 7. Stability vs Innovation

Every proposal should be classified as one of the following:

### Type A - Configuration

Solved through Community Settings.

Preferred.

### Type B - Extension

Adds capability to an existing engine.

Acceptable.

### Type C - New Engine

Requires a completely new engine.

Rare.

Must undergo architectural review.

### Type D - Core Change

Changes a constitutional component.

Requires founder approval and full compatibility review.

---

## 8. Backward Compatibility Review

Every significant change must answer:

- Will existing Community Domains continue to work?
- Will Trust Passports remain valid?
- Will historical Trust Events remain readable?
- Will existing APIs continue to function?

If not, a migration strategy is mandatory.

---

## 9. Deprecation Policy

Features should not disappear immediately.

Stages:

1. Active.
2. Deprecated.
3. Migration Available.
4. Archived.

Historical data remains accessible.

---

## 10. Documentation Rule

No feature enters production without:

- protocol reference;
- API documentation;
- data model update;
- UI specification;
- test scenarios.

Documentation is part of the feature.

---

## 11. Testing Principles

Every engine should have tests for:

- happy path;
- permission checks;
- governance boundaries;
- audit logging;
- Trust Event generation;
- rollback and recovery.

No engine should rely solely on manual testing.

---

## 12. Performance Review

Every new feature must state:

- expected database impact;
- API impact;
- caching impact;
- scalability impact;
- asynchronous processing requirements.

---

## 13. Security Review

Every proposal must identify:

- new permissions;
- new attack surfaces;
- privacy implications;
- audit implications;
- fraud risks.

Security review occurs before implementation.

---

## 14. Research Feedback Loop

Customer discovery and pilot deployments may reveal new requirements.

These should produce:

```text
Observation
-> Research Note
-> Architecture Review
-> Protocol Update, if justified
```

The platform evolves through evidence, not assumptions.

---

## 15. Release Governance

Major releases should be grouped by protocol rather than by isolated features.

Example:

```text
Release 1: Community Domain Foundation
Release 2: Trust Evidence Layer
Release 3: Marketplace and Opportunity
```

This keeps the platform coherent.

---

## 16. Coders Must Never

Coders must never:

- bypass constitutional protocols;
- introduce undocumented architectural changes;
- duplicate existing functionality in another engine;
- resolve conflicts by adding parallel systems.

---

## 17. Coders Must Always

Coders must always:

- consult the relevant protocol first;
- document architectural decisions;
- prefer configuration over customization;
- preserve compatibility;
- protect Community Memory and Trust Evidence.

---

## Constitutional Statement

The GSN Community Domain Operating System is governed by architecture before
implementation.

These protocols form the constitutional framework of the platform.

Future innovation is encouraged, but every innovation must strengthen, not
fragment, the Trust Infrastructure.

A disciplined architecture today creates a platform that can evolve for decades
without losing coherence, evidence integrity, or community trust.
