# GSN Community Domain Engine

## Protocol 2 - Community Settings Engine

**Version:** 1.0
**Status:** Core Configuration Protocol
**Audience:** Codex Developers, Architects, Product Designers

---

## Related Protocols

Protocol 3,
`docs/GSN_COMMUNITY_GOVERNANCE_DELEGATED_AUTHORITY_PROTOCOL_2026-06-30.md`,
defines the governance and delegated-authority rules that Community Settings
must preserve when configuring roles, permissions, departments, membership
approval, verification routing, and maximum unit size.

Protocol 4, `docs/GSN_COMMUNITY_ONBOARDING_PROTOCOL_2026-06-30.md`, defines
the activation, import, invitation, queue, approval, transfer, leaving, and
conflict-resolution rules that Community Settings must support.

Protocol 5,
`docs/GSN_COMMUNITY_IDENTITY_MEMBERSHIP_TRUST_VERIFICATION_PROTOCOL_2026-06-30.md`,
defines the evidence-layer separation that settings must not collapse.

Protocol 6, `docs/GSN_TRUST_EVENT_BEHAVIOUR_EVIDENCE_PROTOCOL_2026-06-30.md`,
defines the Trust Event and Behaviour Evidence rules that Community Settings
must preserve when configuring activity catalogues and evidence requirements.

Protocol 7,
`docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines the verification-routing, endorsement, and Trust Graph constraints that
Community Settings must preserve.

Protocol 9, `docs/GSN_MARKETPLACE_ENGINE_PROTOCOL_2026-06-30.md`, defines the
Marketplace, Shop, Vault, merchant-verification, and commercial-visibility rules
that Community Settings may configure without altering the Marketplace Engine.

Protocol 10, `docs/GSN_COMMUNITY_FINANCE_ENGINE_PROTOCOL_2026-06-30.md`,
defines the Community Finance visibility, contribution, repayment, guarantor,
welfare, and dashboard rules that Community Settings may configure without
turning GSN into a bank, lender, or custodian.

Protocol 12,
`docs/GSN_ADMINISTRATION_COMMAND_CENTRE_COMMUNITY_INTELLIGENCE_PROTOCOL_2026-06-30.md`,
defines the dashboard, notification, reporting, audit-log, and intelligence
rules that Community Settings must respect without exposing data outside
authority.

Protocol 13, `docs/GSN_API_DATABASE_SYSTEM_ARCHITECTURE_PROTOCOL_2026-06-30.md`,
defines how Community Settings are stored separately from core engine logic and
read as configuration rather than hard-coded community-specific behaviour.

Protocol 14, `docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`,
defines the security rule that Community Settings configure behaviour but must
not modify core engine logic, Trust Passport logic, TrustSlip logic,
Marketplace Engine, or Opportunity Engine.

---

## 1. Purpose

Community Settings is the configuration layer of the Community Domain Engine.

It is the only place where a Community Domain customizes its operation.

The purpose of Community Settings is not to change GSN.

Its purpose is to configure how a Community Domain uses the existing GSN
infrastructure.

This is a permanent architectural principle.

---

## 2. Core Principle

GSN has one infrastructure.

Community Domains have many configurations.

Therefore:

```text
GSN Core Engines
-> Community Settings
-> Configured Community Domain
-> Member Experience
```

Core engines must remain unchanged.

---

## 3. What Community Settings Controls

Community Settings controls:

- Community Identity;
- Governance;
- Departments;
- Permissions;
- Visibility;
- Membership Rules;
- Verification Rules;
- Community Workflow.

Community Settings must never modify:

- Trust Passport;
- TrustSlip;
- Marketplace Engine;
- Spotlight Engine;
- Demand Box;
- Merchant Release Rail;
- Vault;
- Community Finance Engine.

These remain global GSN engines.

Community Settings must be understood as behavior policy, not feature
ownership. It controls how the Community Domain uses global GSN capabilities;
it does not create, fork, or remove those capabilities.

### 3.1 Governance UI Rule

Community Settings must feel like a settings surface, not a daily work surface.

The owner should spend most of their time in operational features and only
return to Governance when they deliberately want to change policy.

Governance rows should follow one of two patterns:

```text
Setting Name
ON / OFF
Edit >
```

or:

```text
Setting Name
View >
Edit >
```

Use `ON`, `OFF`, `VIEW`, and `EDIT` as the mental model. Avoid exposing long
paragraphs, raw policy structures, or many equal buttons on the first surface.

Every governance setting may have collapsed help:

```text
Setting Name
ON
Info
Edit >
```

Opening `Info` should explain the setting briefly, then close. The page must
not leave all explanations open at once.

Good governance rows include:

- Allow member announcements;
- Require admin approval;
- Public community profile;
- Allow public verification;
- Allow reposts;
- Allow external witnesses;
- Automatic archive;
- Privacy mode;
- Evidence retention;
- Membership approval;
- Moderator permissions;
- Operating units;
- Role permissions.

The settings page should not present Announcements, Spotlight, Demand Box,
Marketplace, Shop Diary, or Reports as daily work buttons. Those belong in the
operating area. Governance only defines their rules.

### 3.2 One-Question Settings Pages

When a setting requires deeper editing, the edit page should ask one question
or one tightly related group of questions.

Example:

```text
Announcements

Who can post?
Admin only
Moderators
Members

Expires after
1 day
3 days
Never

Done
```

Do not mix billing, verification, trust, policy, visibility, and feature work on
one settings page. Split, collapse, or guide instead.

---

## 4. Community Profile

Every Community Domain begins with:

- Community Name;
- Community Type;
- Country;
- State / Region;
- Town;
- Description;
- Logo;
- Banner;
- Official Contacts;
- Website, when applicable;
- Community Domain Name;
- Verification Status;
- Subscription Status.

---

## 5. Community Type

Community Type determines only the default configuration.

Community Type may seed default roles, governance examples, activity catalogue
templates, evidence requirements, privacy defaults, and report views.

Community Type must not create a separate GSN engine.

Community Domains may adapt, rename, disable, or extend their own Community
Activity Types through Community Settings, provided every activity remains
mapped to GSN-owned universal behaviour categories and evidence rules.

Examples include:

- School;
- University;
- Church;
- Market;
- Cooperative;
- Hospital;
- Union;
- Association;
- NGO;
- Government Body;
- Family;
- Committee;
- Custom.

Changing Community Type should never modify existing member data.

---

## 6. Governance Configuration

Every Community Domain must define its organizational structure before
onboarding begins.

Example:

```text
Market
-> Executive
-> Sections
-> Lines
-> Members
```

Example:

```text
Church
-> National
-> Province
-> Zone
-> Parish
-> Department
-> Members
```

Example:

```text
School
-> Principal
-> Faculty
-> Department
-> Class
-> Students
```

Community Settings stores this hierarchy.

---

## 7. Role Configuration

Each level receives permissions.

Examples include:

- Community Owner;
- Executive;
- Department Leader;
- Section Leader;
- Line Leader;
- Member;
- Guest.

Each role inherits permissions only from its parent.

Permission inheritance must always flow downward.

---

## 8. Membership Configuration

Community Settings defines:

- Invitation Required;
- Phone Verification Required;
- Department Approval Required;
- Bulk Import Allowed;
- Maximum Members Per Unit;
- Waiting List Behaviour;
- Transfer Rules;
- Leaving Community Rules;
- Rejoining Rules.

---

## 9. Spotlight Configuration

The Spotlight Engine remains unchanged.

Community Settings decides:

- who may publish Spotlights;
- who approves Spotlights;
- visibility:
  - Community Only;
  - Department Only;
  - Public GSN;
  - Followers;
  - Trusted Distribution;
- maximum Spotlight frequency.

Spotlight pricing remains controlled by GSN.

---

## 10. Marketplace Configuration

The Marketplace Engine remains unchanged.

Community Settings controls:

- Enable Marketplace;
- Enable Shops;
- Enable Vault;
- Allow Internal Trading;
- Allow Public Trading;
- Merchant Verification Required;
- Merchant Release Rail Enabled;
- Community-specific rules.

---

## 11. Opportunity Configuration

Community Settings defines:

- Demand Box enabled;
- Repost enabled;
- Follow Shop enabled;
- Trusted Distribution enabled;
- Community announcements;
- Department announcements;
- Emergency broadcasts.

---

## 12. Community Finance Configuration

Community Settings may enable:

- Savings;
- Rotational Savings;
- People-backed Loans;
- Contribution Tracking;
- Donation and Offering QR Instructions;
- Emergency Support;
- Guarantee Requests.

The community decides which services are visible.

The engine remains unchanged.

When Donation and Offering QR Instructions are enabled, Community Settings must
let the domain choose whether QR instructions are:

- disabled;
- standing only for recurring collections;
- event-specific only;
- both standing and event-specific;
- public, member-only, department-only, or admin-only;
- published immediately by authorized finance roles or held for approval.

Settings may label the activity locally as offering, donation, tithe, levy,
support appeal, welfare collection, project support, registration fee, or a
similar community term, but the engine remains the same non-custodial Community
Finance capability.

---

## 13. Trust Event Configuration

Community Settings allows:

- Community Activity Catalogue;
- Activity Definitions;
- Activity Mapping;
- Approval Workflow;
- Evidence Requirements.

Community Settings does not create new Trust Categories.

It only creates new Community Activities.

Each configured Community Activity Type must define:

- mapped universal behaviour category or categories;
- evidence level required;
- privacy scope;
- approval or verification workflow;
- Trust Passport eligibility;
- Community Verification eligibility;
- report or aggregate impact eligibility.

Community Activity Types may represent charitable, religious, cultural,
educational, professional, cooperative, commercial, welfare, governance, or
public-good work.

Activity names may be local.

Evidence rules remain universal.

Sensitive activity types must default to aggregate-only or restricted
visibility.

### Community Session Configuration

Community Settings may enable Community Sessions under configured Community
Activity Types.

Community Sessions are not a separate engine.

Community Sessions configure how a community records time-bound evidence from
meetings, training, worship, outreach, lectures, seminars, conferences, market
meetings, elections, welfare activity, medical outreach, online gatherings, and
hybrid gatherings.

Community Settings may configure:

- whether session evidence is enabled;
- allowed session modes: physical, online, hybrid, offline-first;
- allowed Presence Evidence Methods;
- whether QR check-in is allowed;
- whether rotating QR or short-code check-in is required;
- whether local proximity, such as Bluetooth, may strengthen evidence;
- whether member self-claim is allowed;
- whether administrator confirmation is required;
- whether trusted member attestation is allowed;
- whether offline capture and later sync are allowed;
- whether online attendance signals are accepted;
- whether partner or venue confirmation is accepted;
- evidence strength mapping for each capture method;
- Trust Passport eligibility;
- Community Verification eligibility;
- report or aggregate capacity eligibility;
- maximum weight or caps for repeated Presence Evidence;
- privacy defaults for sensitive sessions.

Attendance tracking must be optional.

Presence Evidence must be optional per Community Activity Type and per
Community Session.

A community may disable attendance-like records entirely while still using
Community Activities, Trust Events, Marketplace, Spotlight, Demand, Vault, or
Community Finance.

Community Settings must distinguish:

- Presence: the member was there;
- Participation: the member took part;
- Contribution: the member added value;
- Responsibility: the member carried duty or leadership.

These evidence levels must not be collapsed into one attendance score.

For light phones and low-connectivity environments, Community Settings must
support low-bandwidth modes such as short code, offline capture, later sync,
administrator confirmation, and member attestation.

Settings must not require always-on GPS, always-on Bluetooth, biometric capture,
or background tracking.

Any stronger proximity, biometric, location, or partner-confirmed method must be
explicitly enabled, lawful in the relevant community context, and attached to a
privacy scope.

---

## 14. Verification Configuration

Community decides:

- who approves membership;
- who responds to Community Verification requests;
- approval chain;
- automatic re-verification rules;
- escalation rules.

Every verification response becomes a Trust Event.

---

## 15. Notification Configuration

Community decides:

- SMS;
- Push Notification;
- Email;
- Community Broadcast;
- Department Broadcast;
- Emergency Broadcast;
- Reminder Rules.

---

## 16. Maximum Unit Size

Community Settings allows:

- Maximum Members Per Node.

Example maximum sizes:

- 50;
- 100;
- 150;
- 250;
- 500.

When maximum size is reached, the system recommends:

- Create New Unit.

This preserves human-scale governance.

---

## 17. Community Dashboard Configuration

Community chooses:

- Visible Statistics;
- Leader Dashboard;
- Department Dashboard;
- Reports;
- Analytics;
- Member Directory;
- Community Health Indicators;
- Trust Reports.

---

## 18. Community Configuration Wizard

When a Community Domain is purchased, the administrator completes:

```text
Community Identity
-> Community Type
-> Governance
-> Departments
-> Roles
-> Permissions
-> Marketplace Rules
-> Spotlight Rules
-> Verification Rules
-> Membership Rules
-> Activity Catalogue
-> Evidence and Privacy Rules
-> Finish
```

Only after completion may onboarding begin.

---

## 19. Architectural Rules

Community Settings configures.

Community Settings never rewrites.

Community Settings enables.

Community Settings never duplicates.

Community Settings restricts.

Community Settings never replaces.

Every future feature added to GSN must first ask:

> Should this be configured through Community Settings?

If the answer is yes, the feature belongs in Community Settings rather than as a
separate system.

---

## Constitutional Statement

Community Settings is the configuration layer of the Community Domain Engine.

It exists to allow every Community Domain to preserve its own governance,
workflow, and operating style while sharing one common GSN Trust Infrastructure.

One platform.

Many communities.

Infinite configurations.

Zero fragmentation of the core engines.
## 8.1 Public Message QR Instructions

Community Settings must allow the domain owner/admin to decide whether public
message QR links are available for short official notices such as sermon topics,
message of the day, programme themes, public preaching notes, public workshop
notes, or reading prompts.

This setting belongs with Announcement Board / official communications, not
Payments and Contributions. Turning Announcement Board off must stop new public
message QR publication and should prevent old public message QR links from
serving active public messages.

Public message QR must remain public-safe. It must not expose member lists,
private pastoral notes, comments, reactions, attendance proof, payment proof,
offering details, or safeguarding/counselling information.

## 8.2 Live Attendance QR Instructions

Community Settings may expose live attendance QR for church services, religious programmes, NGO meetings, workshops, schools, associations, and any Community Domain that needs scan-to-mark-present participation evidence.

The owner/admin opens an attendance window with a programme label, method, and time limit. Members scan the QR from a phone or projected screen and must use their signed-in GSN identity before a check-in is written. The standard method is QR. Bluetooth proximity may exist only as an explicit optional presence record when supported by the browser; it must not silently scan nearby people or inflate attendance evidence.

Live attendance QR is Presence Evidence only. It must not become a trust score, location tracker, payment proof, contribution proof, spiritual judgement, or manual attendance sheet. Duplicate scans by the same member in the same open window must not increase the count.

## 8.3 Meeting Response QR Instructions

Community Settings must treat meeting/service response QR as part of the Demand Box / response-intake family, not as a separate church-only engine. If Demand Box is turned off for a Community Domain, new response QR creation must be blocked and old public response QR links must stop accepting responses.

The response QR may be used after ordinary meetings, church services, religious programmes, workshops, announcements, and Demand Box follow-up. Members can submit a controlled response type such as question, comment, need/request, private follow-up, suggestion, concern, testimony/benefit, meeting feedback, or other.

Response QR must require signed-in GSN identity before writing a response. It must not become an anonymous public comment wall, spam channel, emergency support line, accusation board, or substitute for pastoral counselling or safeguarding procedures. Public QR reads must not expose the responder list, member IDs, phone numbers, or private follow-up notes.

WhatsApp may carry the response link or record a preferred follow-up channel, but GSN remains the official response record. Do not claim GSN sent a WhatsApp message unless a provider-backed sender is actually connected and recorded.

## 8.4 Church Summary Report Instructions

Community Settings may expose a Church Summary report option for church or
religious-body Community Domains. This report belongs with governance/reporting
controls, not public QR publishing and not finance collection settings.

The report may summarize recorded official messages, public message QR counts,
programme attendance records, live attendance QR windows/check-ins, response QR windows, response totals, questions, needs/requests, private follow-up counts, pastoral
follow-up counts, department/service records, and contribution-memory records
across a selected month, year, or period.

Turning off Announcement Board stops public message QR access, but historical
admin reports may still count already-recorded notices for authorized church
leadership unless the domain is suspended or policy explicitly blocks report
access. Turning off private records or activity recording should prevent new
programme workflow records from being captured, but it should not rewrite past
history.

Church Summary reports must not judge doctrine, rank preaching quality, expose
private pastoral notes, expose member lists, prove final attendance beyond
recorded Presence Evidence, prove payment, or certify unrecorded activity.

## 8.5 Sermon Attachment Storage Limit Instructions

Current public message QR supports short public-safe text only. A future sermon
attachment QR must have a hard upload cap before release. The recommended
default is 10 MB per attachment for PDF/DOCX/TXT/image summary files. Large
audio or video sermons should use external links or a separately governed media
storage product.

GSN must not silently cache sermon files into durable phone storage. Members may
open/download an attachment and later delete it from their device; the app must
avoid offline auto-save unless the member explicitly chooses it.
