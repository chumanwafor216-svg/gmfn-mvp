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
- Emergency Support;
- Guarantee Requests.

The community decides which services are visible.

The engine remains unchanged.

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
