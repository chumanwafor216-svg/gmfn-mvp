# PROJECT_PROTOCOL.md

## 1. Canonical understanding of this project

This repository represents the GMFM / GMFN product.

At the moment, the product name appears in two spellings:
- GMFM
- GMFN

For working purposes, both names refer to the same product unless a future document explicitly separates them.
The assistant must not create architectural differences from the naming mismatch.

This product is a community-centered system built around entry flows, communities, invites, community participation, marketplace activity, borrowing activity, and dashboard views.

The goal of this document is to give the assistant a stable mental model so it can work with less confusion, fewer repetitive questions, and less risk of damaging the codebase.

### 1.1 Mandatory architecture reference
Before doing route-purpose work, navigation restructuring, marketplace/community
ownership changes, or page-responsibility changes, also read:

- `docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md`
- `docs/GUIDED_WORK_SURFACE_PROTOCOL.md`
- `docs/GSN_MOBILE_UI_PROTOCOL.md`
- `docs/GSN_PRODUCTION_POLISH_STANDARD.md`
- `docs/TRUST_DOCUMENT_LANGUAGE_PROTOCOL.md`
- `docs/APP_WIDE_AUDIT_PROTOCOL.md`

For Marketplace page-composition work specifically, also read:

- `docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md`

For innovation-case, investor, policy, TrustSlip, merchant-verification, or
development-finance explanation work, also read:

- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`

For Trust Event, Trust Passport, TrustSlip, Community Domain settings,
governance, delegated authority, onboarding, identity, membership,
verification, Trust Graph, relationship intelligence, behaviour evidence,
Marketplace, trusted commerce, Community Finance, financial evidence, or future
Committee evidence-capture work, also read:

- `docs/GSN_MISSION_PROTOCOL_2026-06-30.md`
- `docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`
- `docs/GSN_DECISION_FRAMEWORK_DESIGN_PHILOSOPHY_PROTOCOL_2026-06-30.md`
- `docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md`
- `docs/GSN_USER_JOURNEY_INTERACTION_PROTOCOL_2026-06-30.md`
- `docs/GSN_SCREEN_BLUEPRINT_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`
- `docs/GSN_COMMUNITY_DOMAIN_ENGINE_PHILOSOPHY_PROTOCOL_2026-06-30.md`
- `docs/GSN_COMMUNITY_SETTINGS_ENGINE_PROTOCOL_2026-06-30.md`
- `docs/GSN_COMMUNITY_GOVERNANCE_DELEGATED_AUTHORITY_PROTOCOL_2026-06-30.md`
- `docs/GSN_COMMUNITY_ONBOARDING_PROTOCOL_2026-06-30.md`
- `docs/GSN_COMMUNITY_IDENTITY_MEMBERSHIP_TRUST_VERIFICATION_PROTOCOL_2026-06-30.md`
- `docs/GSN_TRUST_EVENT_BEHAVIOUR_EVIDENCE_PROTOCOL_2026-06-30.md`
- `docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`
- `docs/GSN_MARKETPLACE_ENGINE_PROTOCOL_2026-06-30.md`
- `docs/GSN_COMMUNITY_FINANCE_ENGINE_PROTOCOL_2026-06-30.md`
- `docs/GSN_ADMINISTRATION_COMMAND_CENTRE_COMMUNITY_INTELLIGENCE_PROTOCOL_2026-06-30.md`
- `docs/GSN_API_DATABASE_SYSTEM_ARCHITECTURE_PROTOCOL_2026-06-30.md`
- `docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md`
- `docs/GSN_EVOLUTION_RESEARCH_FUTURE_EXTENSION_PROTOCOL_2026-06-30.md`
- `docs/GSN_ENGINEERING_CONSTITUTION_CHANGE_CONTROL_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`
- `docs/GSN_FOUNDATIONAL_DATA_MODEL_ENTITY_RELATIONSHIP_CONSTITUTION_PROTOCOL_2026-06-30.md`
- `docs/GSN_ARCHITECTURAL_DECISION_REGISTER_CONFLICT_RESOLUTION_PROTOCOL_2026-06-30.md`
- `docs/GSN_INTEGRATED_COMMUNITY_LIFECYCLE_PROTOCOL_2026-06-30.md`
- `docs/GSN_TRUST_EVENT_STANDARDIZATION_PROTOCOL_2026-06-29.md`

Together, these Community Domain protocols define the **GSN Community Domain
Operating System (CDOS)**. The Handbook explains the philosophy, the protocols
define the engineering rules, and CDOS defines how institutions operate on GSN.
Protocol 23 is numbered later but should be read first as the permanent mission
protocol explaining why GSN exists.
Protocol 20 should be read next as the first-principles engineering
constitution before API documentation or implementation planning.
Protocol 21 should be read immediately after it as the decision compass for
product, engineering, and architecture tradeoffs.
Protocol 22 should be read next as the permanent constitutional invariant list
that defines what future GSN work must never break.
Protocol 24 and Protocol 25 should be read next as the user-journey and screen
implementation constitution for UI work.
Owner implementation directive: maintain the current navigation pages, route
contracts, and authenticated navigation model. The Protocol 25 navigation model
and strict screen-ownership rule are blueprint guidance only unless an absolute
need requires a scoped, documented change.
Do not renumber supplied protocols to force a continuous sequence. Protocol 8
and Protocol 11 have not yet been supplied in this thread. Administration,
Command Centre, and Community Intelligence have been supplied as Protocol 12;
preserve that numbering unless the product owner explicitly renumbers the
master structure.

The canonical system skeleton is the current authoritative skeleton for:

- Community Home
- Marketplace
- Shop Gallery
- Finance
- Trust / CCI / Trust Passport / TrustSlip
- Dashboard
- Admin / oversight

The guided work surface protocol is the current authoritative interaction rule
for large operational pages such as Marketplace, Finance, Trust Passport, Loans
& Support, and Shop Control. These surfaces must guide one major lane at a time
instead of exposing every tool, record, shortcut, and explanation at once.

The GSN Mobile UI Protocol is the current authoritative density and
screenshot-readiness rule for phone layouts. Mobile task pages must show the
current state and next action without scrolling, keep one lane open at a time,
hide long explanation and raw data by default, and use compact chips or
two-column facts for short information.

The GSN Production Polish Standard is the current authoritative quality gate for
phone-ready route polish, 3D icon meaning, button stability, institutional evidence
surfaces, user-facing language, and the conditions that must pass before a
screen or protocol-status item can be called complete.

The GSN Trust Document Language Protocol is the current authoritative visual and
truth standard for public verification records, TrustSlip, Trust Passport,
Merchant Verification, evidence packs, registry records, and official
trust-document surfaces. These records should feel like GSN Trust
Infrastructure documents: registry masthead, gold seal, registry ID,
confidence ribbon, security panel, confirms/does-not-confirm boundary, QR,
fingerprint, and next action.

The App-Wide Audit Protocol is the current authoritative audit regime for
checking each domain from entry through admin: route purpose, user-facing
language, action honesty, empty-state truth, permission visibility, in-page
return navigation, focused task behavior, action response, and regression cages.

If that document conflicts with older provisional architecture notes, the
canonical system skeleton wins until those notes are updated.

For the GSN Mission, original problem, community principle, trust principle,
opportunity principle, prosperity cycle, Community Memory, human relationship
principle, trusted-value infrastructure, global scale, responsibility, and the
long-term vision of Community Trust Infrastructure,
`docs/GSN_MISSION_PROTOCOL_2026-06-30.md` is the permanent foundational mission
protocol. Read it before judging whether future work still serves the reason
GSN exists: helping communities preserve, organise, communicate, and mobilise
the value they already create.

For Community Domain Engine philosophy, Community Settings, Committee vs
Community Domain meaning, delegated institutional authority, and the rule that
Community Domains configure shared GSN engines rather than forking the platform,
`docs/GSN_COMMUNITY_DOMAIN_ENGINE_PHILOSOPHY_PROTOCOL_2026-06-30.md` is the
foundational protocol. If older Community Domain implementation notes conflict
with that protocol, the philosophy protocol wins for Community Domain work until
the older notes are reconciled.

For CDOS first principles, community-created trust, governance ownership,
evidence-before-trust, permanent history, one platform/many Community Domains,
nearest-responsible-leader authority, membership/identity/verification/
endorsement separation from trust, event-first evidence, relationship value,
opportunity following trust, simplicity, engine ownership, and the permanent
Trust Infrastructure founder's rule, `docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`
is the foundational engineering constitution. Read it before API documentation,
implementation planning, feature design, architecture review, or any work that
could imply GSN creates trust rather than preserving evidence produced by
communities.

For Decision Framework, design philosophy, decision priority order,
configuration before customization, human before automation, evidence before
opinion, governance before convenience, one core platform, local knowledge before
central knowledge, trust before scale, Community Memory before fresh starts,
backward compatibility before novelty, opportunity through existing
relationships, and the Founder Test,
`docs/GSN_DECISION_FRAMEWORK_DESIGN_PHILOSOPHY_PROTOCOL_2026-06-30.md` is the
architectural decision protocol. Read it before choosing between implementation
options, automating judgement, bypassing governance for convenience, introducing
scale shortcuts, creating new visibility/commerce propagation, or writing code
when protocol, engine, settings, Trust Event, audit, or Community Memory answers
are unclear.

For Architectural Invariants, non-custodial identity, separation of Identity,
Membership, Trust, and Reputation, generated-only Trust Passport, generated and
temporary TrustSlip, additive history, Community Domain configuration over
platform rewrite, event evidence, existing-governance authority, real governance
paths for every member, nearest-responsible-leader authority, generic core
engines, relationship provenance, community-first platform order, evidence over
assumptions, and the rule that the Trust Graph is not a popularity graph,
`docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md` is the permanent
constitutional invariant protocol. Read it before implementing features that
touch money custody, identity/membership/trust boundaries, Trust Passport,
TrustSlip, evidence deletion, platform forks, governance authority, provenance,
Community Memory, Trust Graph analytics, or anything that could change what GSN
must never become.

For User Journey and Interaction, five user types, canonical journeys, the
three-click rule, progressive complexity, community-first navigation, and trust
visibility, `docs/GSN_USER_JOURNEY_INTERACTION_PROTOCOL_2026-06-30.md` is the
user experience constitution. Read it before designing or implementing user
flows, navigation, role-based UI exposure, onboarding paths, buying/selling
paths, verification journeys, Spotlight journeys, Demand response journeys, or
TrustSlip sharing flows.

For Screen Blueprint and Implementation Order, stable core navigation,
Community, Member, Merchant, Verification, Leader, and Administrative journeys,
screen ownership, UI completion questions, and progressive delivery order,
`docs/GSN_SCREEN_BLUEPRINT_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md` is the
UI implementation blueprint. Read it before building or restructuring screens,
adding page business logic, assigning a page to an engine, changing primary
navigation, or deciding which UI stage should be implemented next.

Implementation directive from the product owner: do not change the current
navigation pages or current navigation model merely to match Protocol 25. Do not
enforce the strict screen-ownership rule merely because the protocol says so.
Treat both as future blueprint guidance unless there is an absolute need, and
record the reason before making a scoped implementation change.

For Community Settings data shape, governance hierarchy, role inheritance,
membership rules, service visibility, dashboard configuration, configuration
wizard order, and the rule that settings configure workflow without modifying
core engines, `docs/GSN_COMMUNITY_SETTINGS_ENGINE_PROTOCOL_2026-06-30.md` is
the core configuration protocol. Read it after the philosophy protocol and
before implementing Community Domain settings, defaults, templates, permissions,
or service toggles.

For Community Domain governance, delegated authority, authority inheritance,
membership approval routing, temporary leadership, verification-request
escalation, endorsement limits, governance audit trail, and community memory,
`docs/GSN_COMMUNITY_GOVERNANCE_DELEGATED_AUTHORITY_PROTOCOL_2026-06-30.md` is
the core governance protocol. Read it before implementing authority trees,
leader appointment, member approval, verification response routing,
endorsements, or governance audit records.

For Community Domain onboarding, activation prerequisites, bulk import,
invitation codes, phone-based claim, membership queues, delegated approval,
QR-code meaning, transfers, leaving, duplicate prevention, and onboarding
conflict resolution, `docs/GSN_COMMUNITY_ONBOARDING_PROTOCOL_2026-06-30.md` is
the core onboarding protocol. Read it before implementing Community Domain
activation gates, member import, invitation claim, join queues, membership
approval, department transfer, leaving, or rejoining behavior.

For Identity, Membership, Community Verification, Behaviour Evidence,
Endorsements, Trust Events, Trust Passport separation, identity portability,
automatic verification, Trust Graph misuse protection, and the rule that trust
emerges only from accumulated evidence,
`docs/GSN_COMMUNITY_IDENTITY_MEMBERSHIP_TRUST_VERIFICATION_PROTOCOL_2026-06-30.md`
is the core identity protocol. Read it before implementing identity records,
membership records, verification responses, endorsements, Trust Graph edges,
Trust Passport writes, or any logic that might accidentally treat identity,
membership, endorsement, or verification as trust.

For Trust Events, Behaviour Evidence, universal behaviour categories, Community
Activities, minimum event records, event provenance, automatic Trust Events,
Trust Passport construction, TrustSlip construction, correction events, and
behaviour-before-scores sequencing,
`docs/GSN_TRUST_EVENT_BEHAVIOUR_EVIDENCE_PROTOCOL_2026-06-30.md` is the core
trust evidence protocol. Read it before implementing Trust Event creation,
Trust Passport generation, TrustSlip filtering, event correction, derived trust
attributes, or any trust-score-adjacent feature.

For Community Verification, verification routing, verification response
metadata, endorsements as relationship evidence, Trust Graph edges, relationship
types, independent-community evidence, automatic verification, verification
history, and Trust Graph intelligence,
`docs/GSN_COMMUNITY_VERIFICATION_TRUST_GRAPH_RELATIONSHIP_INTELLIGENCE_PROTOCOL_2026-06-30.md`
is the core verification and relationship-intelligence protocol. Read it before
implementing verification requests, verification response storage, endorsement
flows, Trust Graph analytics, relationship diversity, or automatic verification.

For Marketplace, Public Shops, Vault, Product Catalogue, categories, merchant
verification, shop search, shop following, merchant profiles, cross-community
commerce, Merchant Release Rail, marketplace analytics, and marketplace Trust
Events, `docs/GSN_MARKETPLACE_ENGINE_PROTOCOL_2026-06-30.md` is the core
marketplace protocol. Read it before implementing shops, product lifecycle,
commercial visibility rules, marketplace filters, merchant profiles, merchant
verification, Marketplace/Vault/Demand/Spotlight integrations, Merchant Release
Rail evidence, or commerce-derived Trust Events.

For Community Finance, rotational savings, contribution groups, emergency
support funds, community welfare, people-backed loans, guarantor-backed loans,
contribution history, repayment history, financial verification, financial Trust
Events, Community Finance dashboards, revenue independence, and non-custodial
audit trails, `docs/GSN_COMMUNITY_FINANCE_ENGINE_PROTOCOL_2026-06-30.md` is the
core Community Finance protocol. Read it before implementing savings groups,
contribution records, welfare workflows, people-backed lending, guarantor
records, repayment events, finance dashboards, Merchant Release Rail finance
integration, or any feature that could imply GSN is a bank, lender, custodian,
or interest-income business.

For Administration, Community Dashboard, Executive Dashboard, Department
Dashboard, Line Leader Dashboard, Community Command Centre, Community Health
Indicators, Community Intelligence, Community Memory, Community Graph, reports,
audit logs, notifications, opportunity analytics, Trust Event monitoring,
administrative APIs, and prepared analytics summaries,
`docs/GSN_ADMINISTRATION_COMMAND_CENTRE_COMMUNITY_INTELLIGENCE_PROTOCOL_2026-06-30.md`
is the core administration protocol. Read it before implementing administrative
dashboards, command-centre analytics, reports, notification routing, audit-log
surfaces, community intelligence, community graphs, admin APIs, or any feature
that could expose data outside governance authority or turn analytics into
surveillance/personal scoring.

For API, database, event architecture, entity relationships, service separation,
Community Settings storage, Trust Graph service boundaries, notification
service boundaries, search indexing, performance, caching, scalability, API
security, integrations, and audit events,
`docs/GSN_API_DATABASE_SYSTEM_ARCHITECTURE_PROTOCOL_2026-06-30.md` is the core
system architecture protocol. Read it before implementing backend schemas,
migrations, API routes, service boundaries, event sourcing, derived views,
caching, authority validation, search indexing, integrations, or any feature
that could expose raw database structures, overwrite history, duplicate
business logic, or hard-code community-specific behaviour.

For Security, Integrity, Trust Protection, identity protection, membership
protection, governance protection, Trust Evidence protection, Community
Verification protection, endorsement protection, Trust Graph protection, fraud
detection, duplicate protection, audit trails, data retention, recovery, privacy,
API security, and Community Integrity,
`docs/GSN_SECURITY_INTEGRITY_TRUST_PROTECTION_PROTOCOL_2026-06-30.md` is the
core security protocol. Read it before implementing authentication-adjacent
flows, authorization, delegated approval safeguards, privilege checks, fraud
review signals, duplicate review, data retention, recovery, privacy controls,
audit history, API security, or any feature that could expose member data beyond
authority, hard-delete Trust Events, bypass governance, merge Identity with
Trust, or allow Community Settings to rewrite core engines.

For Evolution, Research, Future Extension, AI support, predictive trust,
research layers, API ecosystems, data portability, backward compatibility,
innovation governance, community feedback, future global scale, protocol
versioning, and disciplined extension,
`docs/GSN_EVOLUTION_RESEARCH_FUTURE_EXTENSION_PROTOCOL_2026-06-30.md` is the
future architecture protocol. Read it before introducing new technologies,
derived indicators, AI features, research initiatives, integrations, migration
plans, new Community Domain templates, new behaviour categories, or any feature
that could redesign core engines, remove historical evidence, or break existing
Community Domains.

For Engineering Constitution, change control, implementation order, feature
ownership, architecture proposals, evidence-first implementation, configuration
before forking, community ownership boundaries, backward compatibility,
simplicity, human governance, documentation, and research discipline,
`docs/GSN_ENGINEERING_CONSTITUTION_CHANGE_CONTROL_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`
is the engineering constitution. Read it before starting any substantial
feature, modifying core engines, creating a new engine, changing governance,
adding Trust Event-producing behaviour, changing implementation order, or making
an architectural decision that should be documented before production.

For Foundational Data Model, entity relationships, Identity, Structure,
Evidence, Intelligence, Membership, Governance Node, Activity, Trust Event,
Verification, Endorsement, Marketplace, Opportunity, Community Finance, Trust
Graph, generated objects, data ownership, and future expansion ownership,
`docs/GSN_FOUNDATIONAL_DATA_MODEL_ENTITY_RELATIONSHIP_CONSTITUTION_PROTOCOL_2026-06-30.md`
is the core data architecture protocol. Read it before implementing schemas,
migrations, entity relationships, ownership boundaries, generated objects,
Trust Graph structures, or any feature whose owning entity, relationships,
Trust Events, or generated-object impact is unclear.

For Architectural Decision Register, conflict resolution, single source of
truth, feature review, stability-vs-innovation classification, backward
compatibility review, deprecation, documentation, testing, performance review,
security review, research feedback, and release governance,
`docs/GSN_ARCHITECTURAL_DECISION_REGISTER_CONFLICT_RESOLUTION_PROTOCOL_2026-06-30.md`
is the architecture governance protocol. Read it before making major
architecture decisions, resolving protocol conflicts, adding a new engine,
changing constitutional components, deprecating features, or shipping a feature
without protocol references, API docs, data model updates, UI specs, and test
scenarios.

For Integrated Community Lifecycle, Community Establishment, Governance
Deployment, Membership Deployment, Community Activation, Behaviour Capture,
Opportunity Creation, Opportunity Propagation, Verification, Community
Intelligence, Institutional Memory, engine interaction, and the long-term GSN
Flywheel, `docs/GSN_INTEGRATED_COMMUNITY_LIFECYCLE_PROTOCOL_2026-06-30.md` is
the operational lifecycle protocol. Read it before implementing cross-engine
Community Domain flows, lifecycle dashboards, onboarding-to-activation journeys,
behaviour-to-opportunity loops, verification flywheels, institutional memory
surfaces, or any feature that spans multiple CDOS engines.

---

## 2. Primary product objective

The product should support a user through the full lifecycle:

1. entering the system
2. deciding whether to create a community or join an existing one
3. entering the correct route
4. landing in the correct home/dashboard experience
5. participating in the community
6. using marketplace features where relevant
7. using borrowing features where relevant
8. moving across desktop/web and original phone flows without business-logic mismatch

This means the assistant should think in terms of:
- user journey
- route purpose
- permissions
- state transitions
- parity across platforms
- minimal-risk improvements

### 2.1 Real-life institutional language standard

GSN must not sound like a textbook app. It is intended to face real community
life: trust, confusion, fear, hope, money pressure, family pressure, informal
support, local trade, lending, repayment, and the emotional weight of people
standing for one another.

User-facing guidance should therefore explain practical benefit before process.
When copy explains a route, invite, trust record, marketplace action, or finance
action, it should make clear how GSN turns existing community trust into
visible, recordable, portable evidence that can help ordinary people trade,
support, borrow, repay, and move to a stronger economic position. Avoid cold
institutional phrases when plain lived language will carry the truth better.

---

## 3. Current reality and known problem

The backend and frontend are already accessible in this repo.
The assistant already has enough code access to inspect the implementation.

The main issue is not lack of files.
The main issue is lack of a stable shared understanding of:
- what each route is for
- how the domains connect
- which behavior is authoritative
- what is still unfinished
- what must not be touched carelessly

Another known problem is that desktop/web behavior is not fully aligned with the original phone behavior.
The original phone flow should currently be treated as the reference point for product intent unless explicitly documented otherwise.

---

## 4. Core system principles

### 4.0 Pilot pipeline conservation protocol

During the active pilot, deployment must be intentional rather than automatic.
The current pipeline-saving posture is now **batch-first / push-last**:

- Render frontend Auto-Deploy is turned off in the Render dashboard.
- `.github/workflows/render-deploy.yml` must stay manual-only
  (`workflow_dispatch`) and must not regain a `push` trigger unless the product
  owner explicitly approves it.
- `.github/workflows/tests.yml` must keep backend tests path-filtered to
  backend-relevant files and manual dispatch. Frontend/docs-only polish should
  not automatically burn backend CI minutes.
- Local laptop/phone testing is the default validation path for UI/button work:
  run the backend locally on `0.0.0.0:8012`, run Vite locally on
  `0.0.0.0:5173`, and test from the phone on the same Wi-Fi before spending
  Render pipeline minutes.
- Work should be made ready locally first. Prefer local verification and local
  commits/checkpoints over pushing every finished slice.
- Do not push to GitHub and do not trigger Render for routine continuation
  work. Push only once the product owner explicitly says the current batch is
  ready to publish.
- Deploy only when the product owner says the current batch should go live.
- If Render credits/minutes are exhausted or Render is unavailable, continue
  local implementation and verification. Do not spend time trying repeated
  deploys unless the owner explicitly asks for a deploy attempt.

Unabated truth: this saves pipeline minutes but removes automatic deployment as
a safety net. A pushed commit is not necessarily live until a manual Render
deploy is triggered or Render deployment is otherwise confirmed.

### 4.0.1 Render parity / deployment drift checkpoint

During pilot testing, the live Render site is the product owner's public truth.
Local laptop/phone testing proves a correction can work, but it does not prove
the pilot has received it.

Every substantial repair must record one of these states before it is treated as
pilot-visible:

- **Local only**: code is corrected locally and verified, but not committed or
  pushed. Render cannot show this work.
- **Pushed, not deployed**: the correction is in GitHub, but no Render deploy
  evidence has been confirmed.
- **Deploy requested**: a manual Render deploy/GitHub workflow was triggered,
  but the live service has not yet been checked.
- **Render confirmed**: the live Render URL shows the corrected behavior, or a
  workflow/Render API response proves the exact committed build was accepted and
  the owner has no contradictory live screenshot.

Before correcting the same visible issue again, compare the current complaint
against:

1. `docs/HANDOFF_NOTES.md` for local corrections already made.
2. `git status --short` for uncommitted local repairs.
3. the latest relevant commit on the branch intended for Render.
4. the latest `Trigger Render Deploy` GitHub Actions run or Render dashboard
   deploy evidence.
5. the actual live Render screen when the owner is testing production.

If local and Render differ, do not assume the code fix failed. First identify
whether the corrected code was actually committed, pushed, deployed, and served
by Render. Report the drift plainly as deployment drift, not a product bug, until
live Render proves the corrected commit is present and still wrong.

### 4.1 Phone behavior is the functional reference
The original phone implementation is the benchmark for expected user flow and business intent.

Desktop/web should align with:
- route purpose
- user states
- required validations
- permissions
- outcomes after actions
- where the user lands next

Visual layout differences are acceptable.
Logic differences are not acceptable unless intentionally documented.

### 4.2 Backend owns truth
Backend owns:
- permissions
- business rules
- data validation
- membership decisions
- invite validity
- borrowing state integrity
- marketplace state integrity

Frontend owns:
- presenting correct options
- showing the correct state
- directing the user through the intended flow
- not bypassing backend rules

### 4.3 Distinct flows must remain distinct
The system has multiple routes that may look similar but are not interchangeable.

Examples:
- creating a community is not the same as joining an existing one
- creating an invite is not the same as consuming an invite
- personal dashboard is not the same as community/admin dashboard
- marketplace activity is not the same as borrowing activity

The assistant must preserve these distinctions unless explicitly instructed to redesign them.

### 4.4 Avoid architectural drift
Do not introduce new abstractions or naming just to make the code "cleaner" unless that change is necessary and low-risk.
The current first duty is clarity, stability, and parity.

---

## 5. Domain model and expected meaning

### 5.1 User / member
A user is a person entering and interacting with the system.
A user may:
- be new
- be returning
- belong to zero, one, or multiple communities depending on business rules
- have marketplace activity
- have borrowing activity
- have a personal dashboard view

### 5.2 Community
A community is a central organizational or social unit in the product.
A community likely has:
- identity
- members
- invite rules
- membership pathways
- home view
- management/admin controls
- community-specific activity

Community is not a decorative concept.
It is a structural domain that influences access, actions, and navigation.

### 5.2.1 Committee, Community, and Community Domain
The product now separates lightweight self-created groups from organized
Community Domains. These concepts must not be collapsed.

**Committee** is the future product language for the lightweight
social/relationship layer:

- created through ordinary `Create Community` flows;
- invite-based;
- suitable for friends, small groups, informal circles, and early local groups;
- no purchase required by default;
- no institutional governance required by default;
- implemented today through the existing community/clan/community-membership
  spine unless later migrations change the names.

Current implementation note:

- many existing routes, tables, and UI labels still say `Community`, `Clan`, or
  similar historical names;
- do not rename backend models, routes, API contracts, or database tables
  casually;
- a full rename from lightweight `Community` to `Committee` needs a separate
  compatibility and migration plan.

**Community Domain** means the institutional/paid domain layer:

- owned, claimed, or purchased by a real organization or recognized body;
- may carry legal identity, administration, departments, branches, governance,
  domain ownership, billing, renewals, verification, analytics, and trust
  infrastructure;
- suitable for churches, schools, unions, associations, cooperatives, markets,
  town unions, parent-teacher structures, branches, departments, class levels,
  and similar organized bodies;
- should have a separate implementation plan before becoming a database object,
  route family, pricing flow, or dashboard.

Product language rule:

- Directionally, use `Create Committee` for the free/self-created lightweight
  path once the rename is planned and implemented. Until then, existing
  `Create Community` routes may remain as compatibility surfaces.
- Use `Purchase Community Domain` or `Create Community Domain` for the
  institutional path, depending on whether payment is part of the current step.
- Do not call the institutional object a `Community Package`. A package is a
  commercial bundle or allowance. The owned institutional object is the
  `Community Domain`.
- `Verified Community Domain` is a stronger state of a Community Domain after
  the required ownership, governance, affiliation, or verification checks are
  satisfied. Do not present every Community Domain as verified by default.

Unabated truth: coders should eventually treat `Community` and
`CommunityDomain` as different product concepts, with the lightweight side
moving toward `Committee` language. That migration is not authorized merely by
this terminology decision; it needs schema, route, permission, billing, UX,
compatibility, and documentation planning.

### 5.2.2 Trust Event standardization doctrine

GSN must not create separate trust systems for schools, churches, markets,
unions, hospitals, cooperatives, families, and committees.

The standard architecture is:

```text
Community Domain
-> Activity Catalogue
-> Community Activity Type
-> Universal Evidence Dimension
-> Trust Event
-> Trust Passport
-> TrustSlip
```

Every official Trust Event should map local activity language into a small
universal evidence vocabulary:

- participation;
- contribution;
- responsibility;
- reliability;
- support;
- leadership;
- learning and development;
- recognition.

Community Domains may define their own activity catalogues, but the universal
evidence dimensions are controlled by GSN and must not be casually edited by
local admins.

MVP must focus on clean evidence capture, approval, provenance, Trust Passport
display, and category summaries. Do not build complex trust scoring, community
rankings, automatic approvals, or hidden risk scores until the evidence
ontology is stable.

Source of truth:

- `docs/GSN_TRUST_EVENT_STANDARDIZATION_PROTOCOL_2026-06-29.md`

### 5.3 Invite
An invite is a controlled access mechanism.
An invite should not be treated as a generic link without rules.

Invite behavior should usually involve:
- who can create it
- what community it belongs to
- whether it expires
- whether it can be used once or many times
- whether it grants direct entry or starts a join flow
- what happens if the invite is invalid, expired, or already used

### 5.4 Inflow
Inflow means the entry funnel into the system.
This is where a user starts or resumes the journey.

Inflow should answer:
- who is this user
- what state are they in
- are they creating something new or entering something that already exists
- what is the correct next route
- what dashboard or home should they reach next

### 5.5 Marketplace
Marketplace is the exchange layer of the product.
This may include listings, offers, opportunities, or similar transactional/community exchange activity.

Marketplace should have:
- clear ownership of items/listings
- visibility rules
- status rules
- relation to community context where applicable
- consistent display and action states

Marketplace logic should not be casually merged into borrowing logic.

### 5.6 Borrowing
Borrowing is its own domain and must be treated as a lifecycle, not just a button.

Borrowing should support a clear state machine such as:
- draft
- requested
- under review
- approved or declined
- active
- settled / completed / closed

Exact naming may differ in code, but the assistant should think in terms of explicit state transitions and permissions.

### 5.7 Member dashboard
This is the personal dashboard for an individual user/member.
It should reflect the user's own state and activity.

Typical expectations:
- summary of membership or communities
- relevant pending actions
- personal marketplace items or interactions
- personal borrowing items or status
- shortcuts to next-step actions

This view is user-centric.

### 5.8 Community/admin dashboard
This is the management view for a community owner/admin/moderator or equivalent role.

Typical expectations:
- community overview
- member/invite management
- moderation or approvals
- marketplace oversight if applicable
- borrowing oversight if applicable
- operational/community controls

This view is community-centric, not user-centric.

### 5.9 Community home
Community home is the main landing or operating surface after entering a specific community.
It should orient the user immediately.

Community home should make it clear:
- which community the user is in
- what they can do here
- what the major next actions are
- what parts of marketplace / borrowing / announcements / activity belong here

Community home is not the same as onboarding and not the same as the admin dashboard.

---

## 6. Route-by-route expectations

### 6.1 Inflow route
Purpose:
- accept a user into the system
- determine state
- direct to the correct next path

Expected responsibilities:
- identify whether user is new or returning
- identify whether user is creating a community or joining an existing one
- prevent ambiguous routing
- preserve needed state between steps
- send user to the right destination

Should not do:
- hardcode later-stage assumptions
- bypass community or membership checks
- collapse distinct user intents into one generic path

Success condition:
A user exits inflow with a clear route and lands where they are supposed to continue.

### 6.2 Create invite route
Purpose:
- allow an authorized person to generate or manage invites into a community

Expected responsibilities:
- verify permissions
- link the invite to the correct community
- enforce invite rules
- produce a usable invite artifact or invite pathway
- maintain traceability of how the invite is intended to be used

Should not do:
- create a community accidentally
- bypass membership governance
- act as a substitute for every join flow
- ignore whether the user is authorized to create invites

Success condition:
An authorized actor creates a valid invite and the system can consume that invite predictably.

### 6.3 Join existing community route
Purpose:
- allow a user to enter a community that already exists

Expected responsibilities:
- verify how the user is entering
- handle invite-based and non-invite pathways according to business rules
- validate membership conditions
- prevent duplicate or invalid membership states
- route the user to the correct post-join destination

Should not do:
- behave like community creation
- silently create duplicate memberships
- ignore invalid or expired entry conditions

Success condition:
A user joins the correct existing community and lands in the correct next place.

### 6.4 Relationship between create invite and join existing community
These flows are related but distinct.

Create invite:
- starts from an internal authorized actor
- is about generating controlled access

Join existing community:
- starts from the entering user
- is about consuming or using an entry path into an existing community

The assistant must not merge these flows conceptually.
The assistant should inspect where they share code and where they must remain separate.

### 6.5 Community home route
Purpose:
- serve as the main surface after successful community entry

Expected responsibilities:
- orient the user
- reflect their role and permissions
- surface relevant community-level actions
- connect to marketplace and borrowing where relevant
- give a stable "you are here" experience

Should not do:
- duplicate inflow logic
- behave like admin dashboard for all users
- hide role-based differences that matter

Success condition:
A user enters community home and understands the state of the community and what to do next.

### 6.6 Marketplace route/domain
Purpose:
- support exchange activity inside the product

Expected responsibilities:
- present items/opportunities clearly
- respect visibility and permissions
- maintain status integrity
- connect to the right community or personal context where applicable
- keep user actions and item states coherent

Should not do:
- leak borrowing logic into marketplace logic
- expose hidden items improperly
- misclassify ownership or state

Success condition:
Marketplace actions are clear, stateful, and properly scoped.

### 6.7 Borrowing route/domain
Purpose:
- support borrowing lifecycle within product rules

Expected responsibilities:
- show current borrowing status clearly
- enforce state transitions
- preserve who requested, approved, or owns the process
- prevent invalid transitions
- route users to the correct next action

Should not do:
- pretend borrowing is the same as listing/exchange
- allow state jumps without validation
- bury important decisions in UI-only logic

Success condition:
Borrowing works as a controlled lifecycle, not as a loose collection of screens.

### 6.8 Member dashboard
Purpose:
- give an individual user a coherent overview of their own activity

Expected responsibilities:
- summarize the user's current state
- surface pending tasks
- show relevant communities, marketplace interactions, and borrowing interactions
- provide next-step links

Should not do:
- expose admin-only controls
- duplicate community/admin dashboard responsibility

Success condition:
A user can understand their own status and act from one place.

### 6.9 Community/admin dashboard
Purpose:
- provide community-level control and oversight

Expected responsibilities:
- show community status
- manage invites and access
- expose moderation/oversight functions
- surface community-level marketplace and borrowing issues if applicable

Should not do:
- become a generic duplicate of member dashboard
- expose controls to unauthorized roles

Success condition:
A community operator can manage the community effectively from one place.

---

## 7. Classification of main product areas

This is the intended classification model for the assistant to use.

### Area A: Entry and routing
Includes:
- inflow
- sign-up / sign-in / entry checks if present
- create community vs join existing community decision
- invite consumption entry
- first landing decision

Question this area answers:
"How does a user get into the right place?"

### Area B: Community access and participation
Includes:
- community creation
- join existing community
- invites
- community membership
- community home

Question this area answers:
"How does the user become part of the right community and operate inside it?"

### Area C: Community operations
Includes:
- admin/community dashboard
- invite management
- member management
- community-level controls

Question this area answers:
"How is the community managed?"

### Area D: Personal operations
Includes:
- member dashboard
- personal state
- user-specific shortcuts and pending work

Question this area answers:
"What does this user need to see and do right now?"

### Area E: Marketplace
Includes:
- listings, exchange, offers, or marketplace actions

Question this area answers:
"What exchange activity is available and what state is it in?"

### Area F: Borrowing
Includes:
- borrowing request flow
- approval/review flow
- active borrowing state
- settlement/closure state

Question this area answers:
"What borrowing lifecycle state is the user or community in?"

---

## 8. Current stop point / where work appears to have paused

As of this documentation, the project appears to be at a stage where:

1. backend and frontend already exist
2. key routes already exist in some form
3. the assistant has enough code access to inspect both sides
4. the main blocker is incomplete shared context
5. desktop/web behavior does not fully match the original phone flow
6. the boundary between related routes still needs to stay explicit
7. the team needs the assistant to work with fewer clarifying questions and lower risk

The current focus should therefore be:
- understand before changing
- map route ownership
- identify parity gaps
- preserve distinct route purposes
- make safe improvements in the right files

---

## 9. Immediate priorities for the assistant

Priority 1:
Map how inflow currently branches:
- create community
- join existing community
- invite path
- final landing screen

Priority 2:
Map the full path for:
- create invite
- join existing community
- community home
- member dashboard
- community/admin dashboard

Priority 3:
Compare desktop/web behavior to the original phone behavior and identify mismatches in:
- route order
- validation
- permissions
- next destination after success
- missing state handling
- missing UI cues

Priority 4:
Map marketplace and borrowing into the correct surfaces:
- what belongs on community home
- what belongs on member dashboard
- what belongs on admin/community dashboard
- what belongs in dedicated marketplace or borrowing pages

Priority 5:
Make only minimal safe edits in non-frozen areas first.

---

## 10. Damage prevention rules

The assistant must avoid these failure modes:

### 10.1 Route collapse
Do not combine distinct routes because they look similar.
Especially protect:
- create invite
- join existing community
- community home
- member dashboard
- community/admin dashboard

### 10.2 Hidden contract breakage
Do not change payload shapes, shared types, route names, or expected response structure carelessly.

### 10.3 Platform drift
Do not make desktop diverge further from original phone behavior without explicit instruction.

### 10.4 Unauthorized edits to sensitive areas
Do not modify frozen files or critical infrastructure without a clearly justified need.

### 10.5 Shallow understanding
Do not edit after reading only one file.
Trace at least:
- route entry point
- main backend handler or controller
- frontend consumer
- state/store/shared type if present

---

## 11. Assistant execution protocol

For any substantial task, the assistant should do the following:

1. Read this document.
2. Read `docs/FREEZE_POLICY.md`.
3. Identify relevant backend routes, services, controllers, models, and validators.
4. Identify relevant frontend pages, routes, hooks, state, and API consumers.
5. State the current understanding of the flow.
6. State any parity mismatch with the original phone flow.
7. Propose the smallest safe implementation path.
8. Edit only non-frozen files unless there is a clearly necessary exception.
9. Run relevant tests/checks when available.
10. Report exactly what changed.

The assistant should ask fewer questions by exhausting code inspection first.
If uncertainty remains, the assistant should clearly separate:
- confirmed facts from code
- inferred behavior
- assumptions needing confirmation

### 11.1 Active pilot publish and deploy protocol

During the current active pilot pipeline-shortage period, completed verified
fixes should **not** be pushed automatically. The default is to keep building
and verifying locally, then push/deploy once for the full ready batch when the
product owner explicitly says to publish.

The assistant should normally:

1. Stage only files that belong to the completed fix.
2. Commit locally with a concrete message when a stable checkpoint should keep
   the worktree clean.
3. Do not push the working branch unless the owner says this batch is ready to
   publish.
4. When the owner approves publishing, push the verified batch once.
5. If a deploy is approved and Render is available, trigger the manual
   `Trigger Render Deploy` workflow and report the result.
6. If GitHub deploy credentials are missing, use an owner-provided Render deploy
   hook only as a secret/out-of-band trigger and report the returned deploy id.
7. Never store Render deploy hooks, API keys, or other deployment credentials in
   code, docs, tests, or handoff notes.
8. Separate confirmed deployment facts from assumptions. A Git push is not the
   same as a Render deploy unless the workflow, Render auto-deploy, or Render
   API/hook response proves it.

---

## 12. Definition of done

A task is not done merely because code compiles.

A task is done when:
- the route purpose remains clear
- backend and frontend stay aligned
- desktop/web behavior moves closer to the intended phone behavior
- the right dashboard/home receives the right responsibility
- marketplace and borrowing are not misclassified
- no frozen areas were damaged
- the change is explainable in exact files and route terms

---

## 13. Plain-language summary for the assistant

This product is not just a set of screens.
It is a structured system with specific entry paths and responsibilities.

The assistant must understand:
- how users enter
- how users create or join communities
- how invites work
- where community home fits
- what belongs to marketplace
- what belongs to borrowing
- what belongs to the personal dashboard
- what belongs to the community/admin dashboard
- why desktop must not drift away from the original phone behavior

The assistant should optimize for:
clarity, parity, safety, and minimal-risk progress.
