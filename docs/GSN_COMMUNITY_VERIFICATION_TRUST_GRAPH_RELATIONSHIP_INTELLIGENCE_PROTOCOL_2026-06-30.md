# GSN Community Domain Engine

## Protocol 7 - Community Verification, Trust Graph, and Relationship Intelligence Protocol

**Version:** 1.0
**Status:** Core Verification Protocol
**Audience:** Codex Developers, Product Architects, Community Administrators

---

## Related Protocols

Protocol 9, `docs/GSN_MARKETPLACE_ENGINE_PROTOCOL_2026-06-30.md`, defines how
Merchant Verification and trusted commerce use Community Verification,
TrustSlip, Trust Passport, and Trust Graph context without turning commerce
volume into trust.

Protocol 12,
`docs/GSN_ADMINISTRATION_COMMAND_CENTRE_COMMUNITY_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines how Trust Graph analytics and Community Graph views appear in the
Command Centre without becoming popularity, surveillance, or personal scoring.

Protocol 13, `docs/GSN_API_DATABASE_SYSTEM_ARCHITECTURE_PROTOCOL_2026-06-30.md`,
defines Trust Graph as a separate service for relationships, endorsements,
community bridges, and propagation paths rather than a field mixed into Trust
Passport.

Protocol 14, `docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`,
defines endorsement, verification, and Trust Graph protection rules, including
attribution, timestamps, immutable relationship history, no anonymous
endorsements, and review tasks rather than automatic punishment.

---

## 1. Purpose

This protocol defines how GSN performs Community Verification while
simultaneously building the GSN Trust Graph.

Unlike traditional verification systems that simply return Yes or No, GSN
preserves every verification interaction as structured trust evidence.

Every verification response strengthens the knowledge graph of the community.

---

## 2. Constitutional Principle

Community Verification is not the creation of trust.

Community Verification is the communication of what the community already knows.

Every verification response therefore becomes:

- Trust Evidence;
- Community Memory;
- Trust Graph Relationship;
- Future Decision Evidence.

Nothing should disappear after verification.

---

## 3. Verification Philosophy

GSN asks the community one question:

> Does your community recognize this person?

Not:

> Can you guarantee this person?

The community only answers what it genuinely knows.

---

## 4. Verification Request Flow

Example:

Merchant wishes to verify Emeka.

```text
Merchant
-> Verification Request
-> Community Domain
-> Department
-> Nearest Responsible Leader
-> Response
-> Trust Event Created
-> Trust Passport Updated
-> Merchant Receives Result
```

Verification always follows the governance hierarchy.

---

## 5. Automatic Routing

Verification must never be sent randomly.

The system routes automatically using:

```text
Community
-> Department
-> Section
-> Line
-> Responsible Leader
```

Only when unresolved does it escalate upward.

---

## 6. Verification Response Types

GSN supports standard responses.

### Confirmed

Community recognizes this member.

### Confirmed with Role

Community recognizes the member and confirms role.

Examples:

- Trader;
- Teacher;
- Student;
- Elder;
- Pastor;
- Executive.

### Unable to Confirm

No sufficient knowledge.

Not a negative judgement.

Simply insufficient information.

### Disputed

There is conflicting information.

Requires further review.

### Rejected

Community does not recognize this person as claimed.

---

## 7. Every Response Creates a Trust Event

This is a permanent constitutional rule.

```text
Verification Request
-> Community Response
-> Trust Event
-> Trust Passport
-> Trust Graph
-> Audit History
```

Verification history must never disappear.

---

## 8. Verification Metadata

Every verification stores:

- Request ID;
- Requester;
- Member;
- Community Domain;
- Department;
- Line;
- Responder;
- Response Type;
- Date;
- Notes;
- Evidence, when applicable.

Nothing should exist without provenance.

---

## 9. Community Endorsements

Members may voluntarily confirm that they know another member.

Examples:

> I know this member.

> I have worked with this member.

> This person belongs to my line.

This is not Community Verification.

It is Relationship Evidence.

---

## 10. Relationship Types

Suggested relationship categories:

- Personally Known;
- Worked Together;
- Same Department;
- Same Community;
- Mentor;
- Student;
- Family;
- Business Relationship;
- Committee Member;
- Leadership Relationship.

Communities may extend this list.

---

## 11. Trust Graph

Every endorsement creates an edge in the Trust Graph.

Example:

```text
Chuma
-> knows
-> Emeka
-> knows
-> Ada
```

The graph is not social media.

It is a structured graph of accountable community relationships.

---

## 12. Trust Graph Intelligence

The Trust Graph should calculate:

- Number of direct relationships;
- Cross-community relationships;
- Independent endorsements;
- Community bridge members;
- Connection density;
- Community clusters;
- Relationship diversity.

These are analytical outputs.

Not Trust Scores.

---

## 13. Independent Community Principle

Endorsements from five members in one line carry different informational value
from endorsements across five independent Community Domains.

GSN should preserve:

- Source Community;
- Source Department;
- Source Line.

Relationship diversity becomes useful evidence.

---

## 14. Misuse Protection

GSN should never automatically punish an endorser.

Instead, it records patterns.

Example:

```text
Repeated false endorsements
-> Review Signal
-> Community Administrator Review
-> Possible governance action
```

The platform records.

The community governs.

---

## 15. Automatic Verification

Where appropriate, GSN may answer automatically.

Example:

Member verified six months ago.

No governance changes.

No disputes.

Still active.

System response:

```text
Previously Confirmed
-> Trust Event
-> History Updated
```

Automatic responses must still be auditable.

---

## 16. Verification History

Verification should never overwrite history.

Example:

```text
2026
-> Confirmed
-> 2027
-> Transferred
-> 2028
-> Confirmed by New Department
```

The complete history remains visible.

---

## 17. Trust Graph Is Not Popularity

The Trust Graph must never become:

- Likes;
- Followers;
- Popularity;
- Influencers.

Its purpose is:

- Relationship Evidence.

Not attention.

---

## 18. Community Memory

Verification history contributes to Community Memory.

Future leaders should inherit:

- Previous confirmations;
- Previous disputes;
- Previous endorsements;
- Relationship history.

Nothing should be lost when leadership changes.

---

## 19. Coders Must Never

Coders must never:

- treat endorsements as Trust Scores;
- delete verification history;
- allow anonymous endorsements;
- allow unverifiable relationships;
- merge social following with Community Verification.

---

## 20. Coders Must Always

Coders must always:

- preserve provenance;
- preserve timestamps;
- preserve responder authority;
- preserve relationship type;
- preserve Community context;
- preserve complete verification history;
- generate Trust Events automatically.

---

## Constitutional Statement

Community Verification records what communities know.

Endorsements record who knows whom.

Together they create the GSN Trust Graph.

The Trust Graph is not a popularity network.

It is a structured network of accountable community relationships that
strengthens Trust Passport, improves Community Memory, and supports better
trust-based decisions across the entire GSN Trust Infrastructure.
