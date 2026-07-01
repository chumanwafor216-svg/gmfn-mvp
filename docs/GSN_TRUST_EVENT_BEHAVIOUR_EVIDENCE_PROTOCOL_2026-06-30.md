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

The GSN-owned behaviour vocabulary may expand by protocol when new universal
behaviour patterns are identified.

Community Domains may not create private behaviour categories that fragment the
platform.

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

#### Community Activity Type Framework

Community Domains may define configurable Community Activity Types that reflect
their real-world social, professional, cultural, religious, educational,
charitable, cooperative, financial, commercial, welfare, governance, and
public-good life.

The purpose is not to create sector-specific GSN engines.

The purpose is to let every society name the activities through which it creates
value while keeping evidence portable across GSN.

Examples:

- A charity may define health outreach, volunteer shift, donation distribution,
  awareness campaign, training session, and beneficiary support.
- A church may define choir service, welfare visit, youth mentoring, community
  cleanup, and department leadership.
- A cooperative may define contribution meeting, member training, harvest
  support, dispute mediation, and guarantee support.
- A trade association may define apprenticeship support, professional referral,
  workshop attendance, standards compliance, and member endorsement.
- An alumni group may define scholarship support, mentorship session, career
  talk, fundraiser, and student support.

Different communities may use different names.

Every Community Activity Type must map to one or more GSN-owned universal
behaviour categories.

This mapping allows local meaning to become portable Trust Event evidence
without turning GSN into many disconnected vertical products.

Community Activity Type records must define:

- activity type name;
- Community Domain;
- applicable roles;
- mapped universal behaviour category or categories;
- evidence level required;
- privacy scope;
- approval or verification workflow;
- whether the activity can contribute to Trust Passport;
- whether the activity can appear in Community Verification responses;
- whether the activity can appear in reports or aggregate impact statistics.

Evidence levels may include:

- self-reported;
- coordinator-recorded;
- attendance-confirmed;
- peer-confirmed;
- leader-approved;
- partner-confirmed;
- system-recorded;
- externally-audited.

Privacy scopes may include:

- public;
- community-visible;
- role-restricted;
- private;
- aggregate-only;
- sensitive-protected.

GSN must distinguish recorded activity from verified activity and audited
activity.

GSN must not present activity as verified unless the required evidence level has
been met.

Sensitive activity types involving health, children, welfare, safeguarding,
financial hardship, immigration, domestic issues, vulnerable-person support, or
other protected circumstances must default to aggregate-only or
sensitive-protected visibility.

Such activity may contribute to reports, Trust Passport, or Community
Verification only through the visibility rules attached to its evidence level and
privacy scope.

#### Community Session Evidence

GSN must not create a separate Attendance Engine.

Attendance is not trust.

Attendance is weak behavioural evidence of presence.

The canonical object is a Community Session.

A Community Session is a time-bound container under a Community Activity Type.

Examples include:

- health walk;
- lecture;
- worship service;
- volunteer outreach;
- market association meeting;
- town hall;
- training;
- seminar;
- election meeting;
- welfare distribution;
- medical outreach;
- online meeting;
- hybrid conference.

Community Sessions may be:

- physical;
- online;
- hybrid;
- offline-first.

A Community Session may generate multiple evidence records for the same member.

These evidence records must not be treated as equal.

GSN must distinguish:

- Presence: the member was there;
- Participation: the member took part;
- Contribution: the member added value;
- Responsibility: the member carried duty or leadership.

Presence Evidence is the weakest form of session evidence.

Presence Evidence may support trust only when it is attached to:

- a real Community Session;
- a Community Domain;
- an activity type;
- a session time window;
- a capture method;
- a recorder or system source;
- an evidence strength;
- a privacy scope.

Presence Evidence capture methods may include:

- QR check-in;
- rotating QR check-in;
- short session code;
- Bluetooth or other local proximity signal;
- coordinator check-in;
- member self-claim plus administrator confirmation;
- member self-claim plus trusted member attestation;
- offline capture with later sync;
- online attendance signal;
- partner or venue confirmation.

The protocol must not depend on one capture method.

QR, Bluetooth, online joins, offline records, and human attestation are all
Presence Evidence Methods.

Different methods create different evidence strength.

Indicative strength:

- QR only: weak;
- QR plus active time window: moderate;
- rotating QR plus time window: moderate;
- local proximity plus active session window: stronger;
- administrator confirmation: stronger;
- two trusted member attestations: stronger;
- offline capture before sync: provisional;
- offline capture after sync and coordinator approval: moderate or stronger;
- partner-confirmed attendance: stronger;
- externally audited session record: audited.

GSN must preserve the method and strength.

GSN must not present weak presence as equivalent to contribution,
responsibility, leadership, impact, or audited evidence.

Attendance should become Trust Passport evidence only when the Community
Activity Type and Community Session settings allow it.

Repeated Presence Evidence must be capped or weighted conservatively so a member
cannot manufacture high trust by merely checking into many sessions.

Sensitive sessions involving worship, health, welfare, safeguarding, children,
immigration, political activity, hardship support, vulnerable-person support, or
other protected circumstances must default to aggregate-only or
sensitive-protected visibility unless the community has explicit lawful consent
and protocol-compliant settings.

Session evidence may appear in community reports as aggregate capacity evidence.

Examples:

- active attendance;
- participation volume;
- volunteer capacity;
- leadership capacity;
- outreach delivery history;
- partnership activity;
- beneficiary reach, where lawful and privacy-safe.

GSN does not advise government, employers, funders, or outside institutions about
a person or community.

GSN preserves canonical evidence generated by communities so that communities
and members can prove what actually happened, subject to consent, privacy, and
verification rules.

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
- Evidence Level;
- Privacy Scope;
- Report Eligibility;
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
