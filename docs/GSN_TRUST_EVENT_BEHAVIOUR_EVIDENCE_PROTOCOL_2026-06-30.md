# GSN Community Domain Engine

## Protocol 6 - Trust Event and Behaviour Evidence Protocol

**Version:** 1.0
**Status:** Core Trust Protocol
**Audience:** Codex Developers, Product Architects, Community Administrators

---

## Related Protocols

Protocol 9, `docs/GSN_MARKETPLACE_ENGINE_PROTOCOL_2026-06-30.md`, defines the
commercial interactions, Merchant Verification, Merchant Release Rail records,
and Marketplace completions that may generate Trust Events while preserving
Marketplace as a universal engine.

Protocol 10, `docs/GSN_COMMUNITY_FINANCE_ENGINE_PROTOCOL_2026-06-30.md`,
defines the financial contribution, welfare, guarantee, repayment, and
verification events that may generate Trust Events without becoming a banking
ledger.

Protocol 12,
`docs/GSN_ADMINISTRATION_COMMAND_CENTRE_COMMUNITY_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines how Trust Event monitoring appears in administrative dashboards while
keeping operational analytics separate from behavioural evidence and scores.

Protocol 13, `docs/GSN_API_DATABASE_SYSTEM_ARCHITECTURE_PROTOCOL_2026-06-30.md`,
defines the event-sourcing and database rules that prevent Trust Events,
generated Trust Passport views, and dynamic TrustSlip views from being
overwritten or stored as mutable derived state.

Protocol 14, `docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`,
defines the Trust Evidence protection rules that prevent silent edits,
hard-deletes, and direct Trust Passport edits.

---

## 1. Purpose

This protocol defines how GSN captures, preserves, and communicates trust.

Trust is never entered manually.

Trust is never assigned by an administrator.

Trust emerges from accumulated evidence of behaviour observed within Community
Domains.

This protocol defines that evidence model.

---

## 2. Constitutional Principle

GSN does not record Trust.

GSN records Behavioural Evidence.

Communities observe behaviour.

GSN preserves that evidence.

Trust Passport organizes the evidence.

TrustSlip communicates the relevant evidence.

Trust emerges from repeated evidence over time.

---

## 3. The Trust Evidence Pyramid

```text
Human Behaviour
-> Community Activity
-> Trust Event
-> Trust Passport
-> TrustSlip
-> Decision
```

Trust Events are therefore not opinions.

They are structured records of observable behaviour.

---

## 4. Three-Layer Evidence Model

### Layer 1 - Universal Behaviour Categories

Every Community Domain maps its activities to these universal categories.

Initial categories:

- Participation;
- Contribution;
- Responsibility;
- Commitment;
- Support;
- Leadership;
- Learning and Development;
- Recognition.

These categories belong to GSN.

Community Domains cannot modify them.

### Layer 2 - Community Activities

Every Community Domain creates its own activity catalogue.

School examples:

- Attended Class;
- Served as Prefect;
- Completed Assignment;
- Mentored Student.

Church examples:

- Choir Service;
- Welfare Visit;
- Evangelism;
- Department Leadership.

Market examples:

- Completed Delivery;
- Repaid Supplier;
- Resolved Dispute;
- Guaranteed Member.

The activities differ.

The behaviour categories remain universal.

### Layer 3 - Trust Events

Whenever an approved activity occurs:

```text
Approved Activity
-> Trust Event
```

One Trust Event is created.

Trust Events are the permanent evidence layer.

---

## 5. Minimum Trust Event Record

Every Trust Event must contain:

- Event ID;
- Member ID;
- Community Domain;
- Department;
- Line, when applicable;
- Community Activity;
- Universal Behaviour Category;
- Date;
- Recorder;
- Approver;
- Verification Status;
- Evidence Status;
- Source.

Optional fields:

- Photo;
- Document;
- External Link;
- Notes.

Nothing should be stored without provenance.

---

## 6. Event Sources

Trust Events may originate from:

- Community Activities;
- Community Verification Responses;
- Merchant Verification;
- Merchant Release Rail;
- Repayment Confirmation;
- Spotlight Participation;
- Demand Completion;
- Leadership Appointment;
- Community Endorsement;
- Community Recognition.

Everything becomes evidence.

---

## 7. Community Verification

Every Community Verification response automatically creates:

- Trust Event.

Examples:

```text
Confirmed
-> Trust Event
```

```text
Rejected
-> Trust Event
```

```text
Unable to Confirm
-> Trust Event
```

```text
Disputed
-> Trust Event
```

Verification history becomes part of Trust Passport.

---

## 8. Community Endorsements

Endorsements become Trust Events.

Example:

> I know this member.

The Trust Event stores:

- Endorser;
- Community;
- Relationship;
- Timestamp;
- Context.

Endorsements never replace behaviour.

They supplement it.

---

## 9. Merchant Events

Merchant activity also creates Trust Events.

Examples:

- Delivery confirmed;
- Goods received;
- Merchant Release Rail completed;
- Credit honoured;
- Credit default resolved.

The objective is to preserve behavioural history rather than simply transaction
history.

---

## 10. Automatic Trust Events

Certain actions should automatically generate Trust Events.

Examples:

```text
Member joins Community Domain
-> Membership Confirmed
-> Trust Event
```

```text
Leader appointed
-> Trust Event
```

```text
Transfer between departments
-> Trust Event
```

```text
Community Recognition
-> Trust Event
```

The system should minimise manual entry.

---

## 11. Trust Passport Construction

Trust Passport is generated automatically.

It should never be manually edited.

Trust Passport consists entirely of accumulated Trust Events.

No administrator should modify Trust Passport directly.

Corrections occur by adding correcting Trust Events, not by deleting history.

---

## 12. TrustSlip Construction

TrustSlip is generated dynamically.

Different TrustSlips may emphasise different categories.

Merchant TrustSlip shows:

- Commitment;
- Responsibility;
- Merchant Verification;
- Repayment Events.

Employer TrustSlip shows:

- Participation;
- Leadership;
- Contribution;
- Recognition.

The Trust Passport remains the source of truth.

TrustSlip is a filtered view.

---

## 13. Behaviour Before Scores

GSN should not initially calculate complex trust scores.

MVP should prioritise:

- evidence capture;
- evidence quality;
- evidence provenance.

Scores may be introduced later.

Evidence cannot.

---

## 14. Future Derived Attributes

These should be computed later.

Examples:

- Reliability;
- Consistency;
- Leadership Strength;
- Community Participation;
- Supportiveness;
- Cross-community Activity;
- Trust Diversity;
- Trust Velocity.

Derived attributes are calculated.

Never manually entered.

---

## 15. Event Integrity Rules

Trust Events should never be silently deleted.

If an event is incorrect:

- Create Correction Event.

Original remains.

History remains.

This preserves auditability.

---

## 16. Community Memory

Trust Events belong to:

- the member;
- the Community Domain;
- the history.

Even if:

- leaders change;
- departments change;
- governance changes.

Trust history remains.

Communities never lose institutional memory.

---

## 17. Coders Must Never

Coders must never:

- allow manual editing of Trust Passport;
- allow deletion of Trust Events without an audit trail;
- allow community-specific Trust Categories;
- merge endorsements with Trust;
- merge identity with trust.

---

## 18. Coders Must Always

Coders must always:

- preserve provenance;
- preserve timestamps;
- preserve community context;
- preserve evidence chain;
- generate Trust Passport automatically;
- generate TrustSlip dynamically.

---

## Constitutional Statement

Trust is not stored inside GSN.

Behavioural evidence is.

Communities observe behaviour.

GSN records behavioural evidence as Trust Events.

Trust Passport preserves the complete evidence history.

TrustSlip communicates the evidence relevant to a specific decision.

Every future trust capability developed within GSN must be built upon this
evidence-first architecture.
