# GSN Community Domain Operating System (CDOS)

## Protocol 17 - Foundational Data Model and Entity Relationship Constitution

**Version:** 1.0
**Status:** Core Data Architecture Protocol
**Audience:** Codex Developers, Database Architects, Backend Engineers, System Designers

---

## 1. Purpose

This protocol defines the permanent data architecture of GSN.

Unlike ordinary database documentation, this protocol defines the constitutional
relationships between the major entities of the GSN Trust Infrastructure.

The objective is to ensure that future developers can extend GSN without
breaking its architecture.

---

## 2. Constitutional Principle

GSN is not built around tables.

GSN is built around relationships.

Everything inside GSN should answer one of four questions:

- Who?
- Where?
- What happened?
- What changed?

Every entity exists to answer one or more of these questions.

---

## 3. The Four Pillars

Every object belongs to one of four pillars.

### Identity

Represents:

- People;
- Organisations;
- Communities;
- Shops.

Never duplicated.

### Structure

Represents:

- Community Domains;
- Departments;
- Sections;
- Lines;
- Governance Nodes;
- Permissions.

This defines where things belong.

### Evidence

Represents:

- Trust Events;
- Verification Events;
- Endorsements;
- Merchant Events;
- Community Activities.

Everything observable belongs here.

### Intelligence

Represents:

- Trust Passport;
- TrustSlip;
- Community Health;
- Analytics;
- Trust Graph;
- Reports.

These are generated.

They are not manually entered.

---

## 4. Primary Entity Relationships

```text
Identity
-> Membership
-> Community Domain
-> Governance Node
-> Community Activity
-> Trust Event
-> Trust Passport
-> TrustSlip
```

Every important feature should fit naturally into this chain.

---

## 5. Identity Relationships

One Identity may belong to:

- many Community Domains;
- many Committees;
- one or more Shops;
- many Trust Events;
- many Endorsements.

Identity is global.

Membership is local.

---

## 6. Community Domain Relationships

Every Community Domain owns:

- Community Settings;
- Governance Tree;
- Departments;
- Membership;
- Community Activities;
- Community Reports.

Community Domains never own:

- Trust Passport;
- Identity;
- Core Engines.

---

## 7. Governance Relationships

Every Governance Node contains:

- Parent Node;
- Child Nodes;
- Leader;
- Members;
- Permissions.

Governance always forms a tree.

Cycles are prohibited.

---

## 8. Membership Relationships

Membership connects:

```text
Identity
-> Community Domain
-> Governance Node
-> Role
-> Status
```

Membership may change.

Identity never changes.

---

## 9. Activity Relationships

Community Activities belong to:

- Community Domain.

Each Activity maps to one or more:

- Universal Behaviour Categories.

Activities create:

- Trust Events.

---

## 10. Trust Event Relationships

Every Trust Event links to:

- Identity;
- Community Domain;
- Governance Node;
- Community Activity;
- Behaviour Category;
- Recorder;
- Approver;
- Verification Status;
- Evidence.

No Trust Event should exist without context.

---

## 11. Verification Relationships

Verification connects:

```text
Requester
-> Member
-> Community Domain
-> Responder
-> Response
-> Trust Event
-> Trust Passport
```

Verification never exists independently.

---

## 12. Endorsement Relationships

Endorsements connect:

```text
Endorser
-> Member
-> Relationship Type
-> Community Domain
-> Trust Graph
```

Endorsements strengthen relationship intelligence.

They do not replace Trust Events.

---

## 13. Marketplace Relationships

```text
Identity
-> Shop
-> Products
-> Spotlight
-> Merchant Release
-> Trust Events
```

Marketplace remains integrated with Trust.

---

## 14. Opportunity Relationships

```text
Identity
-> Opportunity
-> Spotlight
-> Followers
-> Reposts
-> Community Reach
-> Completion
-> Trust Event
```

Opportunity remains evidence-aware.

---

## 15. Community Finance Relationships

```text
Identity
-> Contribution
-> Guarantee
-> Repayment
-> Financial Trust Event
-> Trust Passport
```

Financial history strengthens behavioural evidence.

---

## 16. Trust Graph Relationships

Trust Graph stores:

```text
Identity
-> Identity
-> Community
-> Relationship
-> Verification
-> Endorsement
-> Interaction
```

The graph records relationships.

It does not calculate trust.

---

## 17. Generated Objects

These are never manually edited:

- Trust Passport;
- TrustSlip;
- Community Health;
- Community Intelligence;
- Analytics;
- Trust Graph Metrics.

They are always regenerated from evidence.

---

## 18. Data Ownership Rules

Identity owns:

- Profile;
- Shops;
- Trust Passport.

Community Domain owns:

- Membership;
- Governance;
- Activities;
- Settings.

GSN owns:

- Engines;
- Infrastructure;
- Event Processing;
- Security.

Responsibilities remain separate.

---

## 19. Future Expansion Rule

Any future feature must identify:

1. Which entity owns it.
2. Which relationships it creates.
3. Which Trust Events it generates.
4. Which generated objects it affects.

If these cannot be answered clearly, the feature requires architectural review.

---

## 20. Constitutional Statement

The GSN data model is relationship-first, event-driven, and evidence-based.

Communities provide structure.

Members generate evidence.

Trust Events preserve behaviour.

Trust Passport organises evidence.

TrustSlip communicates evidence.

The Trust Graph connects relationships.

Every future capability of GSN must fit naturally within this constitutional
data model rather than introducing isolated or disconnected structures.
