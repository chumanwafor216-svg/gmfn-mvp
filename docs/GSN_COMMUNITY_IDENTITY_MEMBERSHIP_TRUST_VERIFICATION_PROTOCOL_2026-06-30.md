# GSN Community Domain Engine

## Protocol 5 - Identity, Membership, and Trust Verification Protocol

**Version:** 1.0
**Status:** Core Identity Protocol
**Audience:** Codex Developers, Security Architects, Community Administrators

---

## Related Protocols

Protocol 6, `docs/GSN_TRUST_EVENT_BEHAVIOUR_EVIDENCE_PROTOCOL_2026-06-30.md`,
defines the Trust Event evidence layer that must remain separate from Identity,
Membership, Community Verification, Endorsement, and Trust.

Protocol 7,
`docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines the Community Verification and Relationship Evidence rules that build
on this identity-layer separation.

Protocol 14, `docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`,
defines the security rules that keep Identity independent from phone
authentication and prevent Identity, Membership, Endorsements, Community
Verification, and Trust from being merged.

---

## 1. Purpose

This protocol defines how GSN distinguishes between:

- Identity;
- Membership;
- Community Verification;
- Trust;
- Endorsement.

These five concepts must never be confused.

Keeping them separate is essential to preserving the integrity of the Trust
Infrastructure.

---

## 2. Constitutional Principle

GSN does not ask:

> Can we trust this person?

GSN asks five separate questions:

1. Is this a real person?
2. Does this person belong to this Community Domain?
3. Does the Community recognize this person?
4. What evidence exists about this person's behaviour?
5. What level of trust has emerged from that evidence?

Each question has its own evidence.

Each has its own workflow.

---

## 3. Layer One - Identity Verification

### Purpose

To establish that a real individual is claiming the account.

Identity verification does not create trust.

It only prevents impersonation.

### Supported Methods

Primary:

- Phone Number;
- OTP Verification.

Optional, depending on community or country:

- National ID;
- Driver's Licence;
- Passport;
- Student ID;
- Employee ID.

Identity status examples:

- Phone Verified;
- Identity Document Verified;
- Identity Pending.

Identity should be portable across all Community Domains.

A member verifies identity once and reuses it.

---

## 4. Layer Two - Membership Verification

### Purpose

To establish that the person belongs to a particular Community Domain.

Membership is confirmed through:

- Invitation Code;
- Bulk Import;
- Department Approval;
- Line Leader Approval.

Membership belongs to the Community Domain.

Not to GSN.

Examples:

- Onitsha Main Market;
- RCCG Parish;
- University of Nigeria;
- ICA Aberdeen.

A member may belong to multiple Community Domains simultaneously.

---

## 5. Layer Three - Community Verification

### Purpose

Community Verification answers:

> Does this community recognize this member?

Verification requests are always routed through the governance structure.

Never directly to GSN.

Possible responses:

- Confirmed;
- Confirmed with Role;
- Unable to Confirm;
- Disputed;
- Rejected.

Every response automatically creates:

- Trust Event.

This creates an accountable verification history.

---

## 6. Layer Four - Behaviour Verification

Trust is built through observable behaviour.

Examples:

- Participation;
- Contribution;
- Commitment fulfilled;
- Support;
- Leadership;
- Responsibility;
- Learning;
- Recognition.

These become:

- Trust Events.

Trust Events create:

- Trust Passport.

---

## 7. Layer Five - Community Endorsements

Purpose:

- Capture relationship evidence.

Examples:

> I know this member.

> I have worked with this member.

An endorsement is not a substitute for:

- Identity;
- Membership;
- Trust Events.

Instead:

- Endorsements become additional Trust Events.

They strengthen the Trust Graph.

---

## 8. The Verification Pyramid

```text
Identity
-> Membership
-> Community Verification
-> Behaviour Evidence
-> Trust
```

Trust is always the last layer.

Never the first.

---

## 9. Verification Lifecycle

```text
Member joins
-> Phone Verified
-> Membership Approved
-> Trust Events Begin
-> Community Verification Requested
-> Response Recorded
-> Trust Passport Updated
-> TrustSlip Generated
```

The system should preserve every stage.

---

## 10. Community Verification Requests

Example:

```text
Merchant requests: Verify Emeka
-> request routes automatically
-> Line Leader responds
-> response stored
-> Trust Event generated
-> Trust Passport updated
-> Merchant receives response
```

Nothing disappears.

Everything becomes evidence.

---

## 11. Automatic Community Verification

If:

- Member already verified;
- no governance change;
- no membership dispute;
- Community still active.

The system may automatically answer:

> Previously Confirmed.

The automatic response still becomes:

- Trust Event.

This preserves history.

---

## 12. Endorsement Rules

Every endorsement records:

- Endorser;
- Community Domain;
- Department;
- Date;
- Reason, when applicable;
- Relationship Type, when applicable.

Examples:

- Worked Together;
- Known Personally;
- Community Member;
- Leader;
- Mentor;
- Family.

Endorsements remain transparent.

Anonymous endorsements are not permitted.

---

## 13. Trust Graph

Every endorsement creates a relationship.

Example:

```text
Chuma
-> Knows
-> Emeka
-> Knows
-> Ada
```

The graph becomes:

- Community Intelligence.

It is not simply a popularity system.

The graph supports:

- Connection Density;
- Community Bridges;
- Cross-community relationships;
- Trust Propagation.

---

## 14. Misuse Protection

Repeated false endorsements should not automatically reduce trust.

Instead, they should create review signals.

Example:

```text
Five proven false endorsements by the same leader
-> Community notified
-> Review initiated
```

This protects against abuse while avoiding automatic punishment based on a
single mistake.

---

## 15. Identity Changes

If a member changes Phone Number, the identity remains.

The phone is updated after verification.

Membership remains.

Trust Passport remains.

Trust Events remain.

Community History remains.

The phone is an authentication method.

Not the identity itself.

---

## 16. Coders Must Never

Coders must never:

- Treat Identity as Trust;
- Treat Membership as Trust;
- Treat Endorsements as Trust;
- Treat Community Verification as Trust.

Trust emerges only from accumulated evidence.

---

## 17. Coders Must Always

Keep separate records for:

- Identity;
- Membership;
- Community Verification;
- Endorsements;
- Trust Events;
- Trust Passport.

Never merge these tables.

They represent different layers of evidence.

---

## Constitutional Statement

GSN Trust Infrastructure is built upon five independent layers.

Identity confirms who a person is.

Membership confirms where they belong.

Community Verification confirms that the community recognizes them.

Behaviour creates Trust Events.

Trust emerges from accumulated evidence over time.

This separation protects the integrity, portability, and credibility of every
Trust Passport generated within GSN.
