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

For Marketplace page-composition work specifically, also read:

- `docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md`

For innovation-case, investor, policy, TrustSlip, merchant-verification, or
development-finance explanation work, also read:

- `docs/INNOVATION_POLICY_LOGIC_2026-04-20.md`

The canonical system skeleton is the current authoritative skeleton for:

- Community Home
- Marketplace
- Shop Gallery
- Finance
- Trust / CCI / Trust Passport / TrustSlip
- Dashboard
- Admin / oversight

If that document conflicts with older provisional architecture notes, the
canonical system skeleton wins until those notes are updated.

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

During active pilot testing, completed verified fixes must be published unless
the product owner explicitly says not to publish yet.

The assistant should:

1. Stage only files that belong to the completed fix.
2. Commit the fix with a concrete message.
3. Push the working branch.
4. Promote the same verified commit to `main`, because `main` is the Render
   deployment branch.
5. Verify the `Trigger Render Deploy` GitHub Actions run after the `main` push.
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
