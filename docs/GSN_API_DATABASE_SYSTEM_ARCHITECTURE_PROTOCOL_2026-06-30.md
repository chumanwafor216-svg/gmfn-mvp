# GSN Community Domain Engine

## Protocol 13 - API, Database, and System Architecture Protocol

**Version:** 1.0
**Status:** Core System Architecture Protocol
**Audience:** Codex Developers, Backend Engineers, Database Architects, API Designers

---

## Related Protocols

Protocol 14, `docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`,
defines the security and integrity constraints that every API, service,
database entity, event, cache, integration, and audit record must preserve.

Protocol 15, `docs/GSN_EVOLUTION_RESEARCH_FUTURE_EXTENSION_PROTOCOL_2026-06-30.md`,
defines the backward-compatibility, migration, API ecosystem, and integration
rules that future backend architecture must preserve.

Protocol 16,
`docs/GSN_ENGINEERING_CONSTITUTION_CHANGE_CONTROL_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`,
defines the change-control and implementation-order discipline for modifying
backend services, APIs, events, and core engines.

Protocol 17,
`docs/GSN_FOUNDATIONAL_DATA_MODEL_ENTITY_RELATIONSHIP_CONSTITUTION_PROTOCOL_2026-06-30.md`,
defines the constitutional entity relationships and data ownership rules that
backend schemas, migrations, generated objects, and service boundaries must
preserve.

Protocol 18,
`docs/GSN_ARCHITECTURAL_DECISION_REGISTER_CONFLICT_RESOLUTION_PROTOCOL_2026-06-30.md`,
defines how architectural decisions, conflicts, deprecations, testing, security,
and performance reviews must be documented before major backend changes.

---

## 1. Purpose

This protocol defines the architectural rules governing the backend of GSN.

Its objective is to ensure that GSN remains scalable, maintainable, and
extensible for decades without requiring redesign of its core engines.

This protocol defines:

- database philosophy;
- API philosophy;
- event architecture;
- entity relationships;
- scalability rules;
- integration rules.

---

## 2. Constitutional Principle

Everything in GSN is an Event.

People change.

Leaders change.

Communities change.

Departments change.

Trust changes.

Nothing should overwrite history.

Everything should become an event.

Examples:

```text
Member Joined
-> Member Transferred
-> Member Verified
-> Trust Event Recorded
-> Leader Appointed
-> Spotlight Published
-> Merchant Release Completed
```

History is never rewritten.

History grows.

---

## 3. Core Entity Model

The backend should revolve around stable entities.

### Identity

Represents the human being.

Never duplicated.

Portable across all Community Domains.

### Community Domain

Institutional operating space.

Contains:

- Governance;
- Community Settings;
- Departments;
- Membership.

### Committee

Simple social community.

Independent of Community Domains.

### Membership

Connects:

```text
Identity
-> Community Domain
```

One person may have many memberships.

### Governance Node

Represents every point in the organisational tree.

Examples:

- Executive;
- Department;
- Section;
- Line;
- Unit;
- Class.

Every node has:

- Leader;
- Permissions;
- Members.

### Trust Event

Atomic evidence record.

Never deleted.

Never rewritten.

### Trust Passport

Generated.

Never edited.

### TrustSlip

Generated dynamically.

Never stored permanently.

### Shop

Commercial identity.

Belongs to:

- Identity.

Not Community Domain.

### Opportunity

Represents:

- Spotlight;
- Demand;
- Merchant Release;
- Announcements;
- other opportunity objects.

---

## 4. Database Philosophy

Never store derived information.

Store only:

- Facts.

Examples:

Store:

- Trust Events.

Do not store:

- Trust Score.

Store:

- Membership.

Do not store:

- Community Reputation.

Derived information should always be recalculated.

---

## 5. Event Sourcing

Every important action becomes an event.

Examples:

- Joined Community;
- Left Community;
- Membership Approved;
- Verification Confirmed;
- Trust Event Created;
- Spotlight Published;
- Merchant Verified;
- Merchant Release Completed;
- Community Endorsement;
- Department Created;
- Leadership Changed.

History remains complete.

---

## 6. API Philosophy

The API should expose business capabilities.

Not database tables.

Examples:

```text
POST /community-domain/create
POST /community/join
POST /community/verify
POST /trust-events/create
POST /merchant/release
GET /trust-passport
GET /trust-slip
```

Use business language.

Not implementation language.

---

## 7. Service Separation

Each engine becomes an independent service.

```text
Community Service
-> Trust Service
-> Marketplace Service
-> Opportunity Service
-> Finance Service
-> Analytics Service
-> Notification Service
```

Independent.

Loosely coupled.

---

## 8. Community Settings

Community Settings should be stored separately.

Core engines should read:

- Configuration.

They should never contain:

- Community-specific code.

Wrong:

```text
if community == school ...
```

Correct:

```text
read Community Settings
```

The engine remains generic.

---

## 9. Trust Graph

Trust Graph should be a separate service.

Not mixed into Trust Passport.

Its responsibility:

- Relationships;
- Connections;
- Endorsements;
- Community bridges;
- Propagation paths.

---

## 10. Notification Service

Notifications must be event-driven.

Examples:

```text
Trust Event Created
-> Notification
```

```text
Community Verification
-> Notification
```

```text
Spotlight
-> Notification
```

Never tightly couple notifications with business logic.

---

## 11. Search

Search should index:

- Communities;
- Members;
- Shops;
- Products;
- Trust Events;
- Spotlights;
- Demand;
- Verification.

Search must never become the source of truth.

The database remains the source.

---

## 12. Performance Rules

Large calculations should never occur synchronously.

Examples:

- Trust Graph;
- Community Analytics;
- Community Health.

Run asynchronously.

User interactions remain fast.

---

## 13. Caching

Cache:

- Trust Passport summaries;
- Community statistics;
- Marketplace search;
- Community hierarchy.

Never cache:

- Permissions;
- Verification status;
- Pending approvals.

Those must remain live.

---

## 14. Scalability

The architecture must support:

```text
10 Communities
-> 100 Communities
-> 10,000 Communities
-> Millions of Members
```

Scaling should occur horizontally.

No Community Domain should require special code.

---

## 15. API Security

Every request must know:

- Identity;
- Community;
- Role;
- Permission;
- Authority Node.

Every endpoint must validate authority.

Not simply authentication.

---

## 16. Integration

Future integrations may include:

- Government;
- Banks;
- Schools;
- Payment Providers;
- Identity Providers;
- Analytics.

These should connect through APIs.

Never through database access.

---

## 17. Audit

Every service writes:

- Audit Events.

Never delete.

Never overwrite.

Audit becomes permanent history.

---

## 18. Coders Must Never

Coders must never:

- hard-code Community behaviour;
- overwrite Trust Events;
- duplicate business logic;
- bypass Community Settings;
- expose raw database structures through APIs.

---

## 19. Coders Must Always

Coders must always:

- preserve event history;
- preserve provenance;
- separate services;
- separate configuration from logic;
- design APIs around business capabilities;
- prepare for horizontal scaling.

---

## Constitutional Statement

The GSN backend is an event-driven Trust Infrastructure.

Communities configure the system through Community Settings.

Core engines remain stable.

Business behaviour is exposed through services.

History is preserved through events.

Trust emerges from evidence.

Everything else is derived.

This protocol ensures that GSN remains scalable, maintainable, and extensible
regardless of the number of Community Domains or members connected to the
platform.
