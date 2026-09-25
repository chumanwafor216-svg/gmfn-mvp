# GSN Community Domain Engine

## Protocol 3 - Governance and Delegated Authority Protocol

**Version:** 1.0
**Status:** Core Governance Protocol
**Audience:** Codex Developers, System Architects, Community Administrators

---

## Related Protocols

Protocol 4, `docs/GSN_COMMUNITY_ONBOARDING_PROTOCOL_2026-06-30.md`, defines
how delegated authority is applied during Community Domain activation, member
import, invitation claims, membership queues, approval, transfer, leaving, and
conflict resolution.

Protocol 5,
`docs/GSN_COMMUNITY_IDENTITY_MEMBERSHIP_TRUST_VERIFICATION_PROTOCOL_2026-06-30.md`,
defines the identity, membership, verification, endorsement, Trust Event, and
Trust Passport boundaries that delegated authority must preserve.

Protocol 6, `docs/GSN_TRUST_EVENT_BEHAVIOUR_EVIDENCE_PROTOCOL_2026-06-30.md`,
defines how delegated governance actions become Trust Events without becoming
manual trust assignments.

Protocol 7,
`docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines how Community Verification follows governance authority and becomes
Trust Graph relationship evidence.

Protocol 12,
`docs/GSN_ADMINISTRATION_COMMAND_CENTRE_COMMUNITY_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines how administrative dashboards, notifications, reports, and audit logs
must follow governance authority boundaries.

Protocol 14, `docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`,
defines the security rules that prevent circular authority, self-promotion,
unauthorised delegation, privilege escalation, and anonymous approvals.

---

## 1. Purpose

This protocol defines how authority is created, delegated, inherited, and
exercised inside every GSN Community Domain.

The objective is to allow organizations containing hundreds, thousands, or even
millions of members to operate without GSN becoming the bottleneck.

GSN never governs communities.

Communities govern themselves.

GSN digitizes that governance.

---

## 2. Constitutional Principle

The Community Domain owns governance.

GSN owns the infrastructure.

Authority always follows the organization's existing structure.

Trust always grows from observable behaviour.

---

## 3. The Delegated Governance Principle

Large organizations already know how to manage people.

GSN must never replace this.

Instead, GSN mirrors it.

Example:

```text
GSN
-> Community Domain
-> Community Executive
-> Departments
-> Sections
-> Lines
-> Members
```

Authority flows downward.

Accountability flows upward.

---

## 4. Community Verification

GSN verifies only:

- Community Identity;
- Community Domain;
- Initial Community Executives.

Example:

```text
Onitsha Main Market
-> 23 Executives
-> Verified
```

Once verified, GSN assumes the organization can govern itself.

---

## 5. Governance Tree

Every Community Domain builds its own governance tree.

Example:

```text
Chairman
-> Market Leaders
-> Line Chairmen
-> Members
```

Another example:

```text
Principal
-> Faculty
-> Department
-> Class
-> Students
```

Another example:

```text
Pastor
-> Departments
-> Units
-> Members
```

The hierarchy is configurable.

The principle is fixed.

---

## 6. Authority Levels

Recommended hierarchy:

### Level 1 - Community Owner

Highest authority.

Normally:

- Chairman;
- Principal;
- Pastor;
- President.

### Level 2 - Community Executives

Manage organization-wide activities.

Cannot approve outside the Community Domain.

### Level 3 - Department Leaders

Responsible for departments.

May appoint Line Leaders.

Approve department membership.

Approve department Trust Events.

### Level 4 - Line Leaders

Responsible for a manageable number of members.

Approve membership.

Approve local Trust Events.

Respond to verification requests.

Know members personally.

### Level 5 - Members

Cannot approve others.

Generate Trust Events.

Receive verification.

Participate.

---

## 7. Delegation Rules

Authority may only be delegated downward.

Example:

```text
Chairman
-> Market Leader
-> Line Chairman
```

Valid.

Example:

```text
Line Chairman
-> Chairman
```

Invalid.

The system must prevent upward delegation.

---

## 8. Principle of Human Scale

No leader should manage more members than they can realistically know.

Community Settings therefore define:

- Maximum Members Per Unit.

Example maximum sizes:

- 100;
- 150;
- 200;
- 250;
- 500.

When maximum size is exceeded, GSN recommends:

- Create New Line;
- Assign New Leader.

This preserves meaningful governance.

---

## 9. Membership Approval

Approval follows governance.

GSN never approves members.

Leaders approve members they already know.

Example:

```text
Trader joins
-> automatically routed to Electrical Market
-> Line B
-> Pending
-> Line B Chairman approves
-> Done
```

---

## 10. Membership Is Not Trust

Approval only confirms:

- Membership.

It does not create:

- Trust.

Trust begins after:

- Participation;
- Contribution;
- Commitment;
- Support;
- Leadership;
- Trust Events.

---

## 11. Leadership Replacement

If a leader changes, the Community Domain updates leadership.

Members remain.

Departments remain.

Trust Events remain.

Trust Passport remains.

Nothing is lost.

Leadership changes.

Community memory remains.

---

## 12. Temporary Authority

Community Domains may appoint:

- Acting Leader;
- Assistant Leader;
- Deputy.

Authority expires automatically.

This must be configurable.

---

## 13. Community Verification Requests

When verification requests arrive, they are routed automatically.

Example:

```text
Member belongs to Electrical
-> Line B
-> Verification request
-> Line B Chairman
-> Department Leader, only if unresolved
-> Executive, only if unresolved
```

This prevents unnecessary escalation.

---

## 14. Verification Responses

Every response becomes a Trust Event.

Examples:

```text
Verification Request
-> Confirmed
-> Trust Event
```

```text
Verification Request
-> Rejected
-> Trust Event
```

```text
Verification Request
-> Unable to Confirm
-> Trust Event
```

```text
Verification Request
-> Disputed
-> Trust Event
```

Nothing disappears.

Everything becomes evidence.

---

## 15. Endorsements

Members may endorse people they genuinely know.

Example:

> I know this member.

Endorsements are:

- recorded;
- timestamped;
- attributed to the endorser;
- linked to the Community Domain.

An endorsement never replaces governance approval.

It becomes an additional Trust Event.

Repeated false endorsements become evidence about the endorser.

---

## 16. Governance Audit Trail

Every governance action must be logged.

Examples include:

- Member approved;
- Member transferred;
- Member suspended;
- Leader appointed;
- Leader removed;
- Verification responded;
- Department created;
- Offering or donation QR instruction created, changed, approved, published, or
  retired.

No governance action should occur without an audit record.

---

## 16.1 Financial Collection Authority

Where a Community Domain uses standing or event-specific donation, offering,
levy, or collection QR instructions, authority must follow the same delegated
governance tree as every other institutional action.

For a church or religious body, the Community Owner or authorized executive may
delegate collection-administration rights to trusted roles such as finance
committee, treasurer, parish/branch administrator, welfare leader, or event
coordinator.

Collection authority must define:

- who may add or change the receiving account reference;
- who may create a standing offering QR code;
- who may create event-specific or campaign-specific donation QR codes;
- who approves publication before members see the QR code;
- who may retire, replace, or correct a QR instruction;
- what evidence is required when a collection is confirmed.

GSN must not allow an ordinary member, unauthorised department leader, or
platform administrator to replace a church's offering QR instruction outside
that church's governance policy.

---

## 17. Community Memory

Community Domains must preserve:

- Governance history;
- Leadership history;
- Verification history;
- Department history;
- Trust history.

Communities should never lose institutional memory simply because leaders
change.

---

## 18. Design Rules

Coders must never:

- create central approval by GSN;
- allow unlimited authority;
- allow one leader to approve the whole organization;
- allow authority outside the governance tree.

Coders must always:

- inherit authority;
- preserve audit history;
- preserve community memory;
- keep governance human-scaled.

---

## Constitutional Statement

GSN does not centralize authority.

It distributes authority according to the existing governance of each Community
Domain.

The closer a leader is to the member, the stronger their authority to verify
membership, approve participation, respond to verification requests, and
preserve trust.

This principle allows GSN to scale from ten members to ten million members
without changing the underlying architecture.

## Public message QR governance

A church, religious body, school, union, NGO, or other Community Domain may use
public QR links for short public-safe messages such as sermon topics, message of
the day, programme themes, meeting prompts, workshop notes, or public reading
instructions.

The delegated authority record should say who may create, approve, publish,
replace, or retire public message QR links. Message QR authority is separate
from offering/donation QR authority. A person trusted to publish a sermon-topic
QR is not automatically trusted to create a collection/payment QR, and a finance
admin is not automatically a pastoral or communications authority.

A public message QR is an announcement surface only. It must not expose private
member records, pastoral counselling notes, safeguarding details, raw attendance
lists, bank details, payment confirmation, or public comment threads.

## Live attendance QR governance

A church, religious body, NGO, school, union, or association may delegate authority to open live attendance QR windows for services, programmes, fellowships, meetings, classes, or workshops.

The delegated authority record should say who may open the attendance window, how long the QR remains valid, whether Bluetooth proximity is allowed as an explicit optional record, and who may review the resulting check-in counts. Members must scan and check in with their own signed-in GSN identity; public QR pages must not collect raw phone numbers or expose member lists.

Live attendance QR is Presence Evidence only. It must not be treated as payment proof, contribution proof, trust scoring, surveillance, spiritual judgement, or a complete attendance audit where members did not scan.

## Meeting/service response QR governance

A church, religious body, NGO, school, union, association, or other Community Domain may delegate authority to open meeting/service response QR windows after services, meetings, programmes, workshops, announcements, or Demand Box follow-up.

The delegated authority record should say who may open or close the response QR, what response categories are allowed, who may review responses, who may handle private follow-up requests, and how long the QR remains active. Allowed response categories should stay controlled, such as question, comment, need/request, private follow-up, suggestion, concern, testimony/benefit, meeting feedback, or other.

Response QR belongs to the Demand Box / response-intake family. If Demand Box is turned off for the Community Domain, GSN must block new response QR creation and must stop old public response QR links from accepting responses.

Members must use their signed-in GSN identity before a response is recorded. Public QR pages must not expose responder lists, member IDs, phone numbers, private follow-up notes, or public accusation/comment threads. WhatsApp may carry the link or record a preferred follow-up channel, but GSN remains the official response record unless a provider-backed sender is separately connected and recorded.

---

## Church summary report governance

A church or religious-body Community Domain may allow a pastor, secretary,
communications lead, or delegated admin to prepare a Church Summary report for a
month, year, or selected period.

The authority to prepare this report is separate from the authority to publish a
public message QR and separate from the authority to create offering/donation QR
instructions. Church Summary reports are leadership review records built from
already-recorded notices, church workflow records, live QR attendance check-ins, and meeting/service response records.

The report may help leadership see recurring message themes, programme cadence,
pastoral follow-up coverage, response questions and needs, private follow-up signals, department handover records, and contribution
memory. It must not claim GSN has judged doctrine, measured spiritual growth,
proved final attendance beyond recorded Presence Evidence, reconciled offerings, or certified anything not recorded in
GSN.

---

## 2026-09-25 Addendum - Owner-Locked Governance Handover

This addendum supersedes any product interpretation that treats delegated setup
or delegated operation as the source of governance authority.

### Final Product Rule

The recorded Community Domain owner is responsible for the governance
architecture before handover. The owner must complete the governance package,
choose what is on and off, choose what delegated operators may do, and lock that
package before handing the operational account or day-to-day work to another
person.

Delegation is not the beginning of governance. Delegation is the last portal
after governance has been chosen.

### Owner Responsibility

GSN must allow an owner to delegate broad operational powers when that is the
owner's real organisational decision. GSN must not hard-code a moral objection
that prevents a school proprietor, CEO, pastor, chairman, or association leader
from delegating membership approval, notices, billing administration,
collections administration, marketplace operation, or other day-to-day work.

GSN's responsibility is to preserve integrity:

- the owner must be the person who chooses the governance and delegation scope;
- the locked governance package must record what was chosen;
- later changes must be attributable;
- locked governance must not be silently edited;
- GSN must keep evidence of who requested, approved, applied, and changed what.

### Delegation Package

Every Community Domain governance package must include a delegation package.
The delegation package records which powers are available to the operator or
handler after handover.

The delegation package is owner-configured. It may include powers such as:

- member approval or admission control;
- official notices and announcements;
- marketplace/shop operation;
- billing administration;
- collection or payment-instruction administration;
- school, church, association, market, or charity workflow operation;
- record keeping and report preparation;
- governance edit request initiation.

Some actions may still require platform-side or owner-side verification because
of legal, financial, fraud, or identity risk, but they must be represented as
clear governance states rather than hidden assumptions.

### Default State

The product may provide sensible defaults for services and delegation powers,
but the owner must see and confirm the final governance package before lock.
Examples:

- Spotlight may default on;
- DemandBox may default on;
- ROSCA may default off;
- voting may default off;
- high-risk delegation powers may default off or require explicit owner choice.

Defaults are guidance, not hidden governance.

### Lock Confirmation

The owner lock should be tied to the signed-in owner's GSN identity. A lock
confirmation may require the owner to enter or confirm their GSN ID and phone
number, but this is not an OTP system and must not be represented as a password
bypass.

The lock means the governance package is sealed as an auditable version. Later
authorised changes create a new version or an explicit unlock/edit record; they
do not silently mutate the old package.

### Handover

After governance is locked, the owner may hand over operation to a handler. The
handover should use the handler/operator's GSN ID and phone number as the
resolution pair. GSN should verify that the ID and phone belong to the same GSN
account before linking the handler.

The handler is not the author of the locked governance package unless the owner
explicitly reassigns ownership through a separate controlled ownership-transfer
process.

### Later Governance Edits

If a locked governance package needs amendment, the normal path is:

1. the handler or authorised person clicks request edit;
2. GSN creates an Action Review for governance unlock or governance amendment;
3. the recorded owner receives an in-app notification;
4. the owner approves or rejects from the owner's own signed-in GSN account;
5. if approved, GSN opens the edit path or creates the new package version;
6. GSN records what changed and who requested, approved, and applied it.

This is the approved bridge between owner and handler. Do not create a duplicate
password, cloned-account, or fake OTP engine for this purpose.

### Organisation Account Integrity

A Community Domain may be operated on a shared organisational device or desktop
session when that reflects real institutional practice. This must not become an
untraceable clone of another personal account. The system must preserve the
recorded owner, the locked governance package, the operator/handover record, and
an edit history showing what changed.

The owner remains responsible for the powers they deliberately delegated, but
GSN must still keep sufficient logs and package versions to show what happened.
