# GSN Community Domain Operating System (CDOS)

## Protocol 25 - Screen Blueprint and Implementation Order

**Version:** 1.0
**Status:** UI/Implementation Blueprint
**Audience:** Codex Developers, Frontend Developers, UI Designers

---

## Current Implementation Directive

The product owner has directed that the current navigation pages, route
contracts, and authenticated navigation model should be maintained.

The Core Navigation model in this protocol is a future blueprint and should not
be used to replace the current navigation by default.

The strict Screen Ownership rule is also blueprint guidance for future cleanup,
not a command to restructure existing screens.

Only apply navigation-model or screen-ownership changes when there is an
absolute need. Any such change must be scoped, documented, and reconciled with
the current freeze policy and route contracts before implementation.

---

## Related Protocols

Protocol 24,
`docs/GSN_USER_JOURNEY_INTERACTION_PROTOCOL_2026-06-30.md`, defines the user
journeys this screen blueprint implements.

Protocol 21,
`docs/GSN_DECISION_FRAMEWORK_DESIGN_PHILOSOPHY_PROTOCOL_2026-06-30.md`, defines
the decision framework for UI tradeoffs, especially governance before
convenience, simplicity before complexity, and trust before scale.

Protocol 22, `docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md`,
defines the invariants screen implementation must not break.

Protocol 19, `docs/GSN_INTEGRATED_COMMUNITY_LIFECYCLE_PROTOCOL_2026-06-30.md`,
defines the cross-engine lifecycle this screen order must support.

---

## 1. Purpose

This protocol defines the implementation order of the GSN user interface.

Developers should never build isolated pages.

They should build complete user journeys.

Every screen belongs to an engine.

Every engine belongs to one journey.

---

## 2. Constitutional Principle

Pages do not define GSN.

Journeys define GSN.

Every screen should move the user from one meaningful state to another.

---

## 3. Core Navigation

The first navigation should remain stable.

```text
Home
-> Communities
-> Trust
-> Marketplace
-> Opportunities
-> Finance
-> Notifications
-> Profile
```

Everything else expands from these.

---

## 4. Community Journey

```text
Community Domain
-> Community Dashboard
-> Departments
-> Lines
-> Members
-> Community Intelligence
```

This becomes one continuous workflow.

---

## 5. Member Journey

```text
Phone
-> OTP
-> Invitation Code
-> Membership
-> Participation
-> Trust Events
-> Trust Passport
-> TrustSlip
```

This is the canonical member lifecycle.

---

## 6. Merchant Journey

```text
Create Shop
-> Publish Product
-> Spotlight
-> Demand Match
-> Merchant Release Rail
-> Completion
-> Trust Event
-> Merchant History
```

---

## 7. Verification Journey

```text
Request Verification
-> Nearest Leader
-> Response
-> Trust Event
-> Trust Passport Update
-> TrustSlip Refresh
```

---

## 8. Community Leader Journey

```text
Dashboard
-> Pending Members
-> Verification Requests
-> Community Activities
-> Reports
-> Command Centre
```

---

## 9. Administrative Journey

```text
Community Settings
-> Governance
-> Departments
-> Permissions
-> Notifications
-> Community Intelligence
```

---

## 10. Screen Ownership

Every screen belongs to exactly one engine.

Example:

- Community Dashboard -> Community Engine;
- Trust Passport -> Trust Engine;
- Spotlight -> Opportunity Engine;
- Marketplace -> Marketplace Engine;
- Savings -> Community Finance Engine;
- Command Centre -> Infrastructure Engine.

Never let one screen contain business logic from multiple engines.

---

## 11. UI Rules

Every page must answer:

- What is the user's goal?
- Which engine owns this page?
- Which protocol governs this page?
- Which Trust Events can be generated?
- Which permissions are required?

If these questions cannot be answered, the page is incomplete.

---

## 12. Progressive Delivery

Implementation order:

1. Community Engine
2. Identity
3. Membership
4. Governance
5. Trust Events
6. Trust Passport
7. TrustSlip
8. Verification
9. Marketplace
10. Opportunity
11. Finance
12. Command Centre

Each completed stage must be fully usable before moving to the next.

---

## 13. Constitutional Statement

The GSN interface should never feel like disconnected pages.

It should feel like one continuous journey through a Community Domain, where
every action contributes to Trust Infrastructure, Community Memory, and
Opportunity.

The interface is therefore a visible expression of the constitutional
architecture defined in the preceding protocols.
