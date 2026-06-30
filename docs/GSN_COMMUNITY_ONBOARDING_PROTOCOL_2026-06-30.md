# GSN Community Domain Engine

## Protocol 4 - Community Onboarding Protocol

**Version:** 1.0
**Status:** Core Onboarding Protocol
**Audience:** Codex Developers, Product Designers, Community Administrators

---

## Related Protocols

Protocol 6, `docs/GSN_TRUST_EVENT_BEHAVIOUR_EVIDENCE_PROTOCOL_2026-06-30.md`,
defines how onboarding events, transfers, leader appointments, recognition, and
verification responses become Trust Events without treating membership as trust.

Protocol 7,
`docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines how post-onboarding verification and endorsements become relationship
evidence in the Trust Graph.

---

## 1. Purpose

This protocol defines how Community Domains onboard organizations containing
anywhere from 20 members to millions of members without placing GSN at the
center of approval.

The objective is:

- minimal friction;
- maximum scalability;
- preservation of existing governance;
- trust without bureaucracy.

The guiding principle is:

> GSN onboards institutions. Institutions onboard people.

---

## 2. The Onboarding Philosophy

Traditional systems ask:

> How do we verify every individual?

GSN asks:

> Who already has legitimate authority to recognize these individuals?

The answer is:

The community itself.

Therefore onboarding follows the Community Governance Tree rather than a central
approval model.

---

## 3. Community Domain Activation

A Community Domain cannot onboard members until it has been activated.

Activation consists of:

```text
Purchase Community Domain
-> GSN verifies the organization
-> Core Executives verified
-> Community Settings completed
-> Governance Tree configured
-> Departments created
-> Leaders delegated
-> Community Ready
```

No member onboarding occurs before this stage.

---

## 4. Governance Before Membership

The governance structure must exist before any member enters the system.

Example:

```text
Onitsha Main Market
-> Chairman
-> Electronics Leader
-> Electrical Leader
-> Phone Leader
-> Medical Leader
-> Clothing Leader
```

Each department then creates:

```text
Electrical
-> Line A
-> Line B
-> Line C
-> Members
```

Every member must have a nearest responsible leader.

---

## 5. Membership Import

Two supported methods exist.

### Method 1 - Bulk Import

Community uploads:

- Phone Number;
- Name;
- Department;
- Line, when applicable;
- Existing Membership Number, when applicable.

The system creates:

- Pending Membership Records.

It does not create active accounts.

### Method 2 - Invitation Code

Department Leader generates:

- Invitation Code.

Example:

```text
ELEC-B-2026
```

Members receive the code through channels such as:

- SMS;
- Printed card;
- WhatsApp;
- Notice Board;
- QR Code containing Invitation Code.

The Invitation Code identifies:

```text
Community
-> Department
-> Line
-> Role, when applicable
```

---

## 6. Phone-Based Claim

The member downloads GSN.

The member enters:

- Phone Number.

Then:

```text
OTP Verification
-> system checks whether this phone has a pending invitation
```

If yes:

- Proceed.

If no:

- Ask for Invitation Code.

If still no match:

- Offer request for membership.

---

## 7. Membership Queue

After successful identification, the member enters:

```text
Electrical
-> Line B
-> Pending Members
```

Only the authorized Line Leader sees this queue.

---

## 8. Delegated Approval

The Line Leader already knows most people personally.

They approve:

```text
Member
-> Membership Active
```

If unsure, escalate upward:

```text
Line Leader
-> Department Leader
-> Executive
-> Community Owner
```

Escalation should be rare.

---

## 9. Membership Confirmation

Approval confirms only:

- Community Membership.

It does not confirm:

- Trust.

Trust begins after:

- Participation;
- Contribution;
- Support;
- Leadership;
- Commitments;
- Trust Events.

---

## 10. Identity Layers

GSN separates three concepts:

```text
Identity
-> Membership
-> Trust
```

Identity confirms:

- This is a real person.

Membership confirms:

- This person belongs to this Community Domain.

Trust confirms:

- This person has demonstrated trustworthy behaviour.

These layers must never be merged.

---

## 11. QR Code Behaviour

QR Codes never identify a person.

QR Codes identify:

- Community;
- Department;
- Line;
- Invitation Campaign.

The person's identity always comes from:

```text
Phone Number
-> OTP
```

This keeps QR Codes reusable and secure.

---

## 12. Community Verification Requests

If a third party requests verification, the request automatically routes to:

- nearest responsible leader.

Response options:

- Confirmed;
- Confirmed with Role;
- Unable to Confirm;
- Rejected;
- Disputed.

Every response automatically creates:

- Trust Event.

---

## 13. Endorsements

Members may additionally endorse people they genuinely know.

Example:

> I know this member.

Endorsements:

- never replace membership approval;
- never replace Trust Events;
- always become additional Trust Events;
- strengthen the Community Trust Graph.

---

## 14. Transfer Between Departments

If a member moves:

```text
Electrical
-> Electronics
```

The system records:

- Transfer Event.

Old Department History remains.

Trust Passport remains.

Only membership location changes.

---

## 15. Leaving a Community

Leaving does not delete history.

Status becomes:

- Inactive.

Trust Events remain.

Verification history remains.

Community history remains.

Future rejoining restores continuity.

---

## 16. Duplicate Prevention

Phone Number acts as the primary claim key.

One phone number cannot claim multiple identities inside the same Community
Domain.

If duplicates occur:

- Flag for Community Administrator review.

---

## 17. Community Memory

The system must preserve:

- Membership history;
- Transfer history;
- Leadership history;
- Verification history;
- Approval history.

Communities must never lose institutional memory because leaders change.

---

## 18. Conflict Resolution

If Bulk Import conflicts with Invitation Code:

- Bulk Import wins.

If Invitation Code conflicts with Department assignment:

- Department Leader decides.

If Membership dispute exists:

- Escalate through Governance Tree.

Never bypass governance.

---

## 19. Constitutional Rules

Coders must never:

- allow GSN to approve ordinary members;
- allow members to join without entering the governance tree;
- treat membership as trust;
- bypass delegated authority.

Coders must always:

- preserve governance;
- preserve audit history;
- preserve community memory;
- preserve the distinction between Identity, Membership, and Trust.

---

## Constitutional Statement

The Community Onboarding Protocol exists to make onboarding simple for members
while allowing organizations of any size to retain complete control over their
own governance.

The platform provides the infrastructure.

The Community Domain provides the authority.

Trust begins only after participation.
