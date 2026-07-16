# Community Domain Actor Identity Audit - 2026-07-15

## Owner trigger

The owner identified a missing product rule using `Pillar of Hope` as the
example:

- registering a Community Domain name protects the name;
- it does not by itself make the organization a shop owner;
- a Community Domain should have a community/domain ID and governed membership
  roster;
- for the current MVP, shops belong to individual GS IDs, not to communities;
- public membership verification must trace to a membership row;
- human confirmation is separate from automatic membership lookup and is used
  for character, role, support, guarantee, witness, or special claims.

## Canonical rule

Name protection, personal identity, community identity, membership proof, and
human confirmation are separate states.

```text
Reserved name
-> protects the name from another claimant

Personal GS ID
-> identifies one person and owns personal surfaces such as the person's shop

Membership row
-> proves that one personal GS ID belongs under a community or Community Domain

Community/domain ID
-> identifies the group, domain, membership roster, governance, verification,
   activity catalogue, and evidence context

Human confirmation
-> records witness, character, role, support, guarantee, or special claims
   beyond automatic membership lookup
```

Short form:

```text
The name protects the label.
The personal GS ID identifies the person.
The community/domain ID identifies the group.
The membership row proves belonging.
Human confirmation proves human assent or witness, not basic membership.
```

## Confirmed implementation facts

### User identity exists

`gmfn_backend/app/db/models.py` defines `users.gmfn_id`, and
`gmfn_backend/app/services/global_identity_service.py` generates human user IDs
as `GMFN-U-...`.

This supports one portable member identity across communities.

### Ordinary community identity exists

`gmfn_backend/app/db/models.py` defines `clans.community_code`.
Several backend routes derive fallback community IDs such as `GMFN-C-000001`.

This supports an ordinary community or marketplace context.

### Community Domain name reservation exists

`gmfn_backend/app/db/models.py` defines `community_domains.domain_name` with a
unique constraint.

`gmfn_backend/app/api/routes/community_domains.py` checks name availability and
creates Community Domain drafts. Draft creation:

- reserves the normalized `domain_name`;
- creates a root `CommunityNode`;
- creates an owner `CommunityDomainMembership`;
- leaves `community_domains.clan_id` nullable unless a later payment
  instruction links it.

The current UI correctly warns that a draft is not active, paid, or verified.

### Community Domain member rows exist

`community_domain_memberships` records user membership under a Community Domain.
The route payloads explicitly say this is institutional membership only and
does not itself create social community membership, payment rights, loan
approval, or legal authority.

This is a good foundation for member verification inside a Community Domain.

### Shop ownership is still human-user based

`marketplace_shops` has a unique constraint on `owner_user_id`.
The marketplace shop endpoints create and update shops for `current_user.id`.

There is no current `community_domain_id` ownership field on shops.

Impact: this matches the corrected MVP rule. A community such as `Homeland`, or
a registered Community Domain such as `Pillar of Hope`, does not itself own a
shop. Its members may own shops through their personal GS IDs.

### Product, Spotlight, and Demand are still `clan_id` plus user based

Marketplace products require:

- a `shop_id`;
- `seller_user_id = current_user.id`;
- active membership in a selected `clan_id`.

Spotlight broadcasts require:

- `author_user_id = current_user.id`;
- optional `shop_id` owned by that user;
- active membership in selected or propagated `clan_id` values.

Free Spotlight quota is counted per `author_user_id` per UTC day.

Demand Box requests require:

- `user_id = current_user.id`;
- active membership in the selected `clan_id`;
- a per-user active request cap.

Impact: the current system supports the MVP commerce rule: individual members
own shops, post products, send Spotlight, and post Demand through active
community membership. A future institutional-shop model would be a separate,
governed product decision, not an automatic right created by name registration.

### Public member verification is ordinary-community first, then domain-scoped

Public member verification first resolves ordinary communities:

```text
community key -> Clan
member key -> User
ClanMembership(clan_id, user_id)
```

It then layers witness evidence from `CommunityMemberVerification`.

For protected Community Domain keys, the same public verification service now
falls back to Community Domain membership proof:

```text
community/domain key -> CommunityDomain
member key -> User
CommunityDomainMembership(community_domain_id, user_id, status = active)
```

Impact: the current public verification route can prove the narrow question of
whether a user is currently an active member of a protected Community Domain.
Removed, deactivated, or inactive domain memberships fail public active-member
verification. This does not prove trust, endorsement, shop ownership, sponsor
impact, delivery proof, legal authority, or full roster visibility.

## Fault found

The current model overuses the linked ordinary community `clan_id` as the bridge
that makes a Community Domain usable in marketplace, member directory,
Spotlight, Demand, and verification surfaces.

That was a reasonable interim bridge, but it is not the final truth.

The deeper fault is that the database has:

- human actor identity: `users.gmfn_id`;
- ordinary community context identity: `clans.community_code`;
- Community Domain name protection: `community_domains.domain_name`;
- Community Domain membership rows: `community_domain_memberships`;
- ordinary community removal through `ClanMembership.left_at`;
- Community Domain member status through `CommunityDomainMembership.status`;

but it does not yet make the corrected governance model obvious across the
product:

- shops belong to people, not communities, for MVP;
- membership lookup should be automatic from membership rows;
- removed/inactive members should fail public active-membership verification;
- human confirmation is for witness/support/role/character claims;
- Community Domains need configurable activity catalogues that create Trust
  Events.

## Corrected product model

### Individual actor

An individual GSN member has:

- one user GS ID;
- one personal shop;
- one personal free Spotlight entitlement per current pilot rule;
- personal Demand Box rights through active memberships;
- membership rows under each community or Community Domain they belong to.

### Community / Community Domain

A community or Community Domain has:

- community/domain ID;
- protected name/domain when registered;
- member roster;
- governance rules;
- add, approve, deactivate, or remove member controls;
- public membership verification;
- activity catalogue;
- Trust Event evidence context;
- admins/delegates who manage the group without becoming the group.

For MVP, the community or Community Domain itself does not own a shop. The
members may own shops through their personal GS IDs.

### MVP final verdict - representative-person model

GSN remains person-first for MVP.

If Felix joins GSN, receives a personal GS ID, and registers `Pillar of Hope`,
then `Pillar of Hope` is a protected name and community/domain context
represented by Felix's personal GS ID.

In this MVP model:

- the protected name prevents another claimant from using `Pillar of Hope`
  inside GSN;
- Felix remains the accountable actor behind that protected name;
- Felix may create or manage a community/domain called `Pillar of Hope`;
- Felix may use his personal shop and public surfaces under the `Pillar of
  Hope` brand;
- members under `Pillar of Hope` can be verified through membership rows;
- Trust Events from Felix's actions remain Felix's personal Trust Events;
- Trust Events from other members remain those members' personal Trust Events;
- `Pillar of Hope` does not independently own Trust Events, shop liability, or
  Spotlight quota in MVP.

This is not full institutional independence. It is a representative-person
model. It is acceptable only if the product language stays honest:

```text
Pillar of Hope is a protected name/community represented by Felix.
Felix is the personal GSN actor on the hot seat.
The question is how Felix and the members behave in their communities.
```

Control of the protected name/community may later change through governance or
evidence review, but Felix's personal Trust Events must not be transferred to
another person. A new representative can take over future operation; the prior
human trust history remains with the human who earned it.

### Optional future institutional shop

The MVP rule must not be read as a permanent denial that institutions can ever
own shops.

Some registered Community Domains may reasonably need official institutional
shops later:

- schools selling uniforms, books, event materials, or official services;
- churches or mosques selling books, programmes, event tickets, or official
  materials;
- NGOs displaying official campaigns, donation-backed goods, or programme
  materials;
- markets or associations listing official stalls, dues, levies, trade fairs,
  or association services;
- hospitals or clinics publishing approved service information or official
  health-programme materials.

If this is implemented, the shop must belong to the Community Domain ID, not to
the founder's personal GS ID.

The permanent rule should be:

```text
The institution owns the institutional shop.
Authorized personal GS IDs operate it.
Operator rights change through governance.
The shop survives founder, trustee, board, or administrator changes.
```

This would create a second shop class:

```text
Personal shop
-> owned by personal GS ID
-> follows the person

Institutional shop
-> owned by activated Community Domain ID
-> operated by authorized admins/operators
-> survives leadership changes
```

The institutional shop should be optional and possibly paid or package-gated.
It should not be opened automatically for every ordinary community or every
reserved name.

### Membership proof

Verification should ask:

```text
Does this personal GS ID belong under this community/domain ID?
```

For a person inside Pillar of Hope:

```text
User GS ID -> CommunityDomainMembership -> Pillar of Hope community/domain ID
```

For a person inside Homeland:

```text
User GS ID -> ClanMembership -> Homeland community ID
```

Name alone must never prove belonging.

### Human confirmation

The system can answer basic membership from the membership row without asking a
person.

Human confirmation is needed for different questions:

- Does this community recognize this member's role?
- Can someone stand for this member's character?
- Can someone support or guarantee this member?
- Did this member contribute, volunteer, lead, attend, repay, or serve?
- Does this special claim need witness or admin approval?

### MVP witness confirmation

Membership verification and behaviour confirmation are two different questions.

Membership verification asks:

```text
Is this person a current member of this community/domain?
```

Behaviour confirmation asks:

```text
How do people who know this person inside the community describe their
participation, reliability, service, or conduct?
```

For MVP, the existing broad confirmation categories are enough. Do not add
numeric grading yet.

The product should support a second step after membership verification:

```text
Request community confirmation / witness response
```

Responders should answer with broad witness categories:

```text
known_here
active_here
good_standing
ask_more_evidence
known_but_caution
cannot_confirm_now
concern
inactive
under_dispute
not_known
```

This avoids boxing a person into false precision. How someone behaves in one
community is not automatically how they will behave in another community.

The result should not remove the verifier's judgement. GSN should show a broad
decision-support summary:

```text
Membership: confirmed active
Responders: 5 eligible, 3 responded
Positive: 2
Caution: 1
Objection: 0
No response: 2
Latest confirmation: current month
```

The verifier still decides what to do with the information.

Responder privacy should be protected by default. Public or outsider-facing
results should show aggregate counts and categories, not private responder
names, unless policy and consent allow deeper disclosure.

Each response can create Trust Events:

- for the subject: confirmation requested, positive/caution/concern outcome,
  behaviour confirmation summary;
- for the responder: confirmation response submitted;
- for the community: confirmation round opened/closed and response-rate
  evidence.

The Trust Event should record the response category, not expose private notes
by default.

This model gives outsiders insight into a society they do not belong to without
making GSN the final judge. GSN packages community evidence; the receiver still
uses human judgement.

Numeric or template-specific behaviour grading may be considered later, but it
is parked for MVP because the broad witness categories already answer the
verification question without overclaiming precision.

### Unknown-to-known verification flow

The full product question is:

```text
How can a person who is unknown in one place use community evidence from places
where they are known, so the receiver has enough insight to decide?
```

The intended flow is:

```text
Person shares TrustSlip / Trust Passport / community credential.
Verifier checks current public record.
GSN confirms membership from the membership row where possible.
Verifier may request live community confirmation.
Eligible community responders answer from inside GSN or through controlled
confirmation links.
GSN returns a decision-support summary, not an automatic judgement.
Trust Events preserve the request, response, and outcome trail.
```

The distinction is:

```text
Membership proof:
The network can answer automatically from records.

Witness / behaviour proof:
People who know the subject in that community answer broad witness categories.
```

Backend truth already supports part of this:

- ordinary public member verification resolves `community key -> Clan`,
  `member key -> User`, and active `ClanMembership`;
- witness strength exists through `CommunityMemberVerification`;
- TrustSlip can include a community confirmation summary;
- controlled confirmation requests have public tokens;
- confirmation requests can be sent with callback/contact context;
- eligible responders answer from a protected response flow;
- responses are classified as positive, caution, or objection;
- confirmation request, response, outcome, expiry, review, and decision actions
  create Trust Events.

For MVP, the backend response categories are enough:

```text
known_here
active_here
good_standing
ask_more_evidence
known_but_caution
cannot_confirm_now
concern
inactive
under_dispute
not_known
```

These categories answer the current verification question without forcing
members to grade a person's whole life or overstate what one community can know.

So the answer is:

```text
Yes, the architecture answers the question at the membership and broad witness
level today.

Do not build numeric behaviour grading now.
```

The product must keep saying:

```text
GSN helps the receiver see community evidence.
GSN does not remove the receiver's judgement.
```

### Beneficiary outcome evidence

For NGOs and support organizations, sponsor-facing impact must not be based on
the organization praising itself.

The strongest proof is beneficiary-side before-and-after evidence:

```text
Before support:
Where was this beneficiary starting from?

Support event:
What help, training, funding, referral, supply, mentoring, or care was received?

After support:
What changed, and what can be measured or witnessed?
```

In the MVP person-first model, the Trust Event subject should be the
beneficiary/member, not the organization as an independent actor.

`Pillar of Hope` should appear as the community/domain context, programme
context, or supporting organization behind the evidence. Felix or another admin
may record or review the evidence, but the useful impact story belongs to the
beneficiary's movement from point A to point B.

Minimum outcome evidence fields:

- beneficiary GS ID;
- community/domain context, such as `Pillar of Hope`;
- programme or activity name;
- baseline state before support;
- support received;
- follow-up state after support;
- measurable indicator where possible;
- beneficiary confirmation;
- admin/evaluator confirmation;
- evidence attachments or references where appropriate;
- date recorded and follow-up due date;
- challenge/correction status.

Useful NGO indicators include:

- school attendance improved;
- training completed;
- job application made;
- business started or restarted;
- income activity resumed;
- medical appointment attended;
- housing/support need resolved or reduced;
- food/support package received;
- volunteer hours completed;
- repayment/support commitment fulfilled;
- beneficiary moved from unverified claim to verified evidence.

The sponsor-facing aggregate should count beneficiary outcomes without exposing
private beneficiary details by default:

```text
12 beneficiaries supported
9 confirmed follow-up outcomes
6 training completions
4 income/activity improvements
2 unresolved or pending follow-ups
0 challenged records unresolved
```

This protects the doctrine:

```text
Organizations may coordinate value.
People experience the change.
Beneficiaries confirm the change.
GSN preserves the evidence trail.
Sponsors see measured outcomes, not self-praise.
```

### Value creation measurement catalogue

Each Community Domain template needs its own activity catalogue because
different communities create different kinds of value.

The system should not ask every organization the same generic question. It
should ask:

```text
What does this type of community exist to improve?
Which activities show that improvement?
Who experienced or witnessed the improvement?
What evidence can be recorded without exposing private details?
```

#### NGO / project network

Core value question:

```text
Did support move beneficiaries from a worse state to a better, evidenced state?
```

Measurable activities:

- beneficiary registered;
- baseline captured;
- need assessed;
- support approved;
- support delivered;
- receipt confirmed by beneficiary;
- follow-up completed;
- outcome improved;
- outcome unchanged;
- outcome worsened;
- outcome challenged;
- volunteer service recorded;
- donor/support item matched to beneficiary need;
- case closed with evidence.

Useful indicators:

- number of beneficiaries registered;
- number with baseline records;
- number who received support;
- percentage with follow-up completed;
- number or percentage with improved outcome;
- unresolved/challenged outcome count;
- average time from need recorded to support delivered;
- repeat-support cases;
- volunteer hours recorded;
- donor item/use traceability.

Examples of outcomes:

- school attendance resumed;
- food insecurity reduced for a period;
- training completed;
- job interview/application completed;
- small business restarted;
- medical appointment attended;
- emergency need resolved;
- beneficiary progressed from undocumented claim to verified evidence.

#### Church / faith community

Core value question:

```text
Is the community creating participation, care, service, responsibility, and
support among members?
```

Measurable activities:

- service attendance recorded;
- volunteer duty completed;
- welfare support delivered;
- member care visit recorded;
- counselling or pastoral support recorded;
- youth/choir/department service completed;
- leadership responsibility held;
- community contribution recorded;
- member testimony/witness recorded;
- follow-up care completed.

Useful indicators:

- attendance consistency;
- volunteer/service hours;
- welfare cases supported;
- care follow-ups completed;
- leadership/service roles fulfilled;
- contribution reliability;
- member support confirmations;
- unresolved pastoral/welfare follow-ups.

#### School / training body

Core value question:

```text
Did the learner move forward in attendance, learning, conduct, responsibility,
or achievement?
```

Measurable activities:

- enrolment confirmed;
- attendance recorded;
- course/module completed;
- assignment/project completed;
- mentoring session attended;
- conduct/responsibility role held;
- certificate/recognition issued;
- parent/PTA contribution recorded;
- improvement follow-up completed.

Useful indicators:

- attendance rate;
- completion rate;
- improvement from baseline assessment;
- punctuality/reliability records;
- mentoring sessions completed;
- leadership/prefect/service duties;
- recognition or awards;
- dropout or unresolved follow-up count.

#### Market / trader association

Core value question:

```text
Is the trader or member reliable in trade, contribution, dispute conduct, and
community participation?
```

Measurable activities:

- trader membership confirmed;
- dues/contribution paid;
- supplier repayment fulfilled;
- product/service delivery confirmed;
- dispute raised;
- dispute resolved;
- meeting attendance recorded;
- leadership/service duty completed;
- trusted trader confirmation recorded.

Useful indicators:

- dues/payment reliability;
- fulfilled trade commitments;
- dispute resolution rate;
- unresolved dispute count;
- meeting attendance;
- supplier/customer confirmations;
- leadership/service participation.

#### Cooperative / savings group

Core value question:

```text
Does the member contribute, repay, support others, and keep cooperative rules?
```

Measurable activities:

- contribution made;
- savings cycle completed;
- loan received;
- repayment made;
- repayment missed;
- guarantor/support role fulfilled;
- welfare support received or given;
- meeting attendance recorded;
- cycle obligation completed.

Useful indicators:

- contribution consistency;
- repayment timeliness;
- completed cycle count;
- missed obligation count;
- guarantor reliability;
- welfare support participation;
- meeting participation.

#### Health body / clinic / support programme

Core value question:

```text
Did the person receive support, attend care, complete follow-up, or improve a
non-sensitive outcome that can be safely evidenced?
```

Measurable activities:

- appointment attended;
- referral completed;
- support item delivered;
- follow-up completed;
- medication/support adherence confirmed where safe and consented;
- health education session attended;
- care plan milestone completed;
- case closed or escalated.

Useful indicators:

- attended appointments;
- completed referrals;
- follow-up completion rate;
- unresolved care follow-ups;
- safe non-clinical support outcomes;
- beneficiary confirmation count.

Private medical details should not be exposed in public summaries by default.

#### Template rule

Every activity catalogue item should map to:

```text
local_activity_name
universal_evidence_dimension
subject_user_id
community_domain_id
baseline_value optional
after_value optional
measurement_unit optional
confirmation_required
confirmed_by
evidence_reference
visibility_level
challenge_status
follow_up_due_at optional
```

This lets the product say:

```text
This NGO supported 40 people.
32 received confirmed support.
24 had completed follow-up.
18 showed improved outcome.
4 were unchanged.
2 were challenged.
```

without pretending that the organization alone proved its own impact.

### Low-burden evidence capture rule

The activity catalogue is not useful unless communities can fill it without
turning pastors, teachers, NGO officers, or market leaders into data clerks.

The capture rule should be:

```text
Use the lowest-burden reliable evidence source available.
Do not require GPS surveillance.
Do not require every member to type reports every day.
Prefer ordinary workflows the community already performs.
```

Evidence capture should support several modes.

#### 1. Event-level summary capture

One authorized person records the event once:

```text
Sunday service held.
Attendance count: 184.
Volunteer teams present: ushering, choir, welfare.
Summary recorded by: church admin.
```

This is useful for institutional/community activity, but it is weaker for
individual proof unless the member is named or confirmed.

#### 2. Named attendance/check-in

Members are recorded by name or GS ID only when the community wants individual
attendance evidence.

Low-burden options:

- QR code at the event;
- admin scans member QR;
- member scans event QR;
- paper list later entered by admin;
- bulk upload from an existing school/church attendance system;
- small group leader

 marks only their group.

This should be optional per community and per activity. It should not be forced
on every church service, school class, or market meeting.

#### 3. Batch import from existing systems

Schools, churches, NGOs, and associations may already keep attendance,
contribution, welfare, training, or case-management records elsewhere.

The system should support:

- CSV upload;
- spreadsheet import;
- API integration later;
- simple copy/paste table import;
- manual review before Trust Events are created.

Imported rows should still carry provenance:

```text
source_system
uploaded_by_user_id
uploaded_at
review_status
row_count
error_count
approved_by_user_id
```

#### 4. Confirmation request

For stronger evidence, the subject or witness confirms the record:

```text
Church admin says Chuma volunteered.
Chuma confirms he served.
Team leader confirms the role.
```

This is useful for:

- volunteer service;
- beneficiary support received;
- training completed;
- welfare support delivered;
- leadership duty fulfilled;
- supplier delivery confirmed;
- dispute resolved.

#### 5. Exception-based recording

Do not record everything. Record what matters.

For many communities, the useful records are exceptions and milestones:

- completed training;
- welfare support delivered;
- missed repayment;
- dispute resolved;
- beneficiary follow-up completed;
- leadership duty completed;
- award/recognition given;
- repeated absence flagged.

This avoids turning normal life into heavy administration.

#### 6. Periodic roll-up

For repeated activity, use weekly or monthly roll-ups instead of daily
micro-records:

```text
Choir attendance: 4 of 5 rehearsals this month.
Volunteer hours: 12 hours this month.
School attendance: 18 of 20 school days.
Savings contribution: 4 of 4 weeks.
```

The roll-up can create one Trust Event with a count, rather than many small
events.

#### 7. Privacy-safe location stance

GPS should not be the default proof of attendance.

Reasons:

- exact location is sensitive;
- churches, schools, welfare cases, and health support may be private;
- GPS can be spoofed;
- it creates surveillance anxiety;
- it is unnecessary where community confirmation or attendance records exist.

If location is ever used, it should be opt-in, coarse, and stored as evidence
context, not as constant tracking.

#### 8. Evidence strength levels

Every captured activity should show how strong the evidence is:

```text
self_reported
admin_recorded
member_confirmed
witness_confirmed
imported_from_existing_system
multi_party_confirmed
challenged
```

This lets a verifier judge the record without pretending all evidence has the
same strength.

#### Minimum implementation target

The first build should not try to automate everything.

Build:

- configurable activity catalogue;
- manual admin record;
- named member selection;
- bulk CSV/spreadsheet import;
- beneficiary/member confirmation request;
- periodic roll-up event;
- challenge/correction status;
- Trust Event creation after approval.

Later build:

- QR event check-in;
- integrations with school/church/NGO systems;
- evaluator workflows;
- richer analytics.

## What should not be done

Do not solve this by hiding shops, blocking Demand Box, pretending that a
registered name is enough, or giving every Community Domain a shop by default.

Blocking shop or Demand visibility is the wrong remedy. Creating automatic
institutional shops in MVP is also the wrong remedy. The real remedy is
identity, membership, governance, and provenance:

- which person owns the shop or action;
- which community/domain context the person belongs to;
- which membership row gives visibility or participation;
- which governance action added, removed, or approved the member;
- which human witness or admin confirmed claims beyond membership;
- which activity catalogue item created each Trust Event.

If institutional shops are later enabled, the product must also record:

- who authorized the shop;
- which package or payment enables it;
- which personal GS IDs can operate it;
- who published each product or Spotlight on behalf of the institution;
- which governance rule handles disputes;
- how operator rights transfer when a founder, director, trustee, or admin
  leaves, dies, is replaced, or loses authority.

## Agreed Community Domain MVP scope

This is the agreed MVP line after the `Pillar of Hope` audit.

### 1. Person-first trust foundation

GSN trust remains person-first for MVP.

- A personal GS ID identifies a human member.
- Shops, Spotlight, Demand, Trust Events, repayment, support, confirmation, and
  witness responses remain tied to personal GS IDs.
- A Community Domain does not independently own trust history in MVP.
- A protected name can be represented by a person, but it is not yet an
  institutional actor.

### 2. Protected name

Community Domain registration protects the name.

- Once `Pillar of Hope` is registered, another claimant should not use the same
  protected name inside GSN.
- Name protection does not itself create a shop.
- Name protection does not itself prove membership.
- Name protection does not itself prove institutional impact.
- Name protection does not move Trust Events away from the registered or acting
  human GS ID.

### 3. Community/domain ID

An activated Community Domain should have a visible community/domain ID.

- The ID identifies the group context, not a new human.
- The ID is used for membership lookup, verification, governance, public record,
  and activity context.
- The ID should be shown separately from the registered representative's
  personal GS ID.

### 4. Representative-person model

For MVP, a Community Domain is represented by a personal GS ID.

Example:

```text
Felix registers Pillar of Hope.
Felix is the accountable GSN person behind Pillar of Hope.
Pillar of Hope is a protected name/community context.
Felix's actions create Felix's Trust Events.
Other members' actions create those members' Trust Events.
```

The app must not imply that `Pillar of Hope` has separate institutional trust
unless a future institutional actor model is deliberately built.

### 5. Control change without trust transfer

The protected name/community may later be controlled by another authorized
person through governance or evidence review.

However:

- Felix's personal Trust Events must remain Felix's.
- A new representative's future actions should create the new person's Trust
  Events.
- Do not transfer one person's trust history to another person.
- Do not transfer one person's personal GS ID to another person.

### 6. Membership roster

Community Domains need a governed member roster.

The roster should support:

- add member;
- approve request;
- active member;
- pending member;
- inactive member;
- removed/deactivated member;
- role/title;
- history of who added, approved, removed, or changed the member.

Membership should be preserved as history, not hard-deleted.

### 7. Member removal / deactivation

Admins must be able to remove or deactivate a person who is no longer a member.

When a member is removed:

- the member should no longer pass active-membership verification;
- the removal should be recorded with date, actor, and reason where possible;
- historical Trust Events should remain;
- the former member should not disappear from past evidence;
- public verification should distinguish active member from inactive/removed
  member where safe.

### 8. Automatic membership verification

Membership verification should be automatic where records exist.

The system should answer:

```text
Does this personal GS ID belong to this community/domain now?
```

It should not need to ask humans merely to answer current membership if the
membership row exists.

### 9. Witness / community confirmation

Human confirmation is separate from membership lookup.

It is used when someone wants community witness evidence:

- known here;
- active here;
- good standing;
- ask for more evidence;
- known but caution;
- cannot confirm now;
- concern;
- inactive;
- under dispute;
- not known.

This is enough for MVP. Do not build numeric character grading now.

### 10. Unknown-to-known verification

The core value is helping a person unknown in one place become knowable through
evidence from communities where they are known.

Flow:

```text
Person shares TrustSlip / Trust Passport / community credential.
Verifier checks public record.
GSN confirms membership from records.
Verifier may request live community confirmation.
Eligible responders answer broad witness categories.
GSN returns a decision-support summary.
Receiver makes the final judgement.
```

### 11. Decision support, not automatic judgement

GSN should not say:

```text
This person is good.
Approve this person.
Trust this person absolutely.
```

GSN should say:

```text
Here is the membership record.
Here are broad community witness signals.
Here are Trust Events and evidence context.
Here are caveats, freshness, objections, and gaps.
Use your judgement.
```

### 12. Shops remain personal

For MVP:

- personal shops belong to personal GS IDs;
- Community Domains do not own shops;
- `Pillar of Hope` may be used as a protected brand/community context by the
  representative person;
- if Felix uses his shop under `Pillar of Hope`, the shop/trust responsibility
  is still Felix's.

Institutional shops are parked as future optional work.

### 13. Spotlight, Demand, and marketplace remain personal

For MVP:

- Spotlight quota remains tied to the personal author GS ID;
- Demand Box remains tied to the personal requester GS ID;
- products/listings remain tied to the personal seller GS ID;
- members of the Community Domain may own their own personal shops.

Do not block shops or Demand Box merely because a person belongs to a Community
Domain.

### 14. Activity catalogue

Each Community Domain template should define value-creating activities.

Examples:

- NGO: beneficiary support, baseline, follow-up, support delivered, outcome
  improved/unchanged/challenged;
- church: attendance, service, welfare support, member care, leadership duty;
- school: attendance, course completion, mentoring, conduct, recognition;
- market: dues, supplier repayment, dispute resolution, delivery confirmation;
- cooperative: contribution, repayment, guarantee/support role, welfare
  support.

Activities should map to universal evidence dimensions such as participation,
contribution, responsibility, reliability, support, leadership, learning, and
recognition.


### 15. Low-burden evidence capture

Do not make evidence capture a burden.

Allowed capture modes:

- event summary;
- named member selection;
- QR later where useful;
- admin scan/member scan later where useful;
- paper list entered later;
- CSV/spreadsheet import;
- periodic weekly/monthly roll-up;
- beneficiary/member confirmation;
- witness/admin confirmation;
- exception/milestone recording.

GPS is not the default and should not become surveillance.

### 16. Beneficiary outcome evidence

For NGOs, impact should be shown from the beneficiary side.

The useful question is:

```text
Where was the beneficiary before support?
What support was received?
What changed after support?
Who confirmed it?
Is it current, pending, or challenged?
```

`Pillar of Hope` is the programme/community context. The beneficiary's Trust
Event tells the before-and-after story.

### 17. Sponsor-safe aggregation

Sponsors should see aggregate outcome evidence without private beneficiary
exposure by default.

Example:

```text
12 beneficiaries supported
9 confirmed follow-up outcomes
6 improved outcomes
2 pending follow-ups
1 challenged record
```

Do not present NGO self-praise as impact proof.

### 18. Public/private boundary

Public verification should expose only safe summaries.

Protect by default:

- private notes;
- raw phone numbers;
- private responder names;
- sensitive beneficiary details;
- full internal member lists;
- private dispute records;
- private medical or welfare details.

Expose by default:

- membership status where permitted;
- active/inactive/removed state where safe;
- community/domain public ID;
- broad witness counts/categories;
- evidence freshness;
- caveats and limits.

### 19. Trust Events

Trust Events preserve the evidence trail.

They should record:

- membership actions;
- confirmation requests;
- confirmation responses;
- confirmation outcomes;
- member removal/deactivation;
- activity records;
- beneficiary outcome records;
- support/repayment/marketplace/community actions where already implemented.

Do not delete Trust Events because a person left a community.

### 20. Future institutional actor parked

A future model may later separate an institution from the representative person:

- institutional actor ID;
- institutional shop ownership;
- institutional Trust Events;
- operator authority;
- liability snapshot;
- succession rules.

This is not the MVP line.

## Smallest safe correction path

### Phase 1 - Documentation and audit cage

Record the canonical invariant in project docs and add audit guards so future
work does not treat `domain_name` as full actor authority.

No schema change is required for this phase.

### Phase 2 - Membership governance completion

Make membership status and removal explicit for Community Domains:

- add/apply member;
- approve request;
- deactivate/remove member;
- prevent removing the last owner/admin;
- make public active-membership verification fail or show inactive when a
  member is removed;
- preserve removal as history, not deletion.

### Phase 3 - Community Domain public verification

Expand public verification to support:

- ordinary community membership via `ClanMembership`;
- Community Domain membership via `CommunityDomainMembership`;
- active, inactive/removed, never-member, and pending states;
- clear separation between automatic membership proof and human witness
  confirmation.

### Phase 4 - Activity catalogue and Trust Events

Implement the Community Domain activity catalogue:

- church examples: attendance, tithe/support evidence, volunteer service,
  member care, choir/service duty, leadership role;
- school examples: attendance, prefect role, PTA contribution, mentoring,
  fees/contribution evidence, recognition;
- NGO examples: volunteer hours, outreach participation, donor support, field
  assignment, beneficiary support, project leadership;
- market examples: dues paid, supplier repayment, dispute resolution, verified
  trader attendance, leadership role;
- cooperative examples: contribution, meeting attendance, repayment,
  support/guarantee role, welfare support.

Each local activity should map to stable universal evidence dimensions:

- participation;
- contribution;
- responsibility;
- reliability;
- support;
- leadership;
- learning and development;
- recognition.

Approved activity records should create Trust Events.

For NGO/project templates, include beneficiary outcome activities:

- baseline captured;
- support delivered;
- beneficiary confirmed receipt;
- follow-up completed;
- outcome improved;
- outcome unchanged;
- outcome challenged;
- evaluator/admin confirmed;
- sponsor-safe aggregate updated.

These records should produce beneficiary-owned Trust Events with `Pillar of
Hope` or the relevant domain recorded as the programme/context, not as a
self-certifying impact owner.

### Phase 5 - CCI / Trust Passport consumption

Ensure CCI, Trust Passport, and TrustSlip read the approved Trust Events without
pretending that membership alone proves character.

Membership answers:

```text
Are they a current member?
```

Trust/Event evidence answers:

```text
What have they done, contributed, fulfilled, supported, led, or been recognized for?
```

### Phase 6 - Parked optional institutional shop design

Do not build institutional shops or institutional Trust Event ownership in the
current MVP line.

Only after Community Domain identity, governance, membership removal, public
verification, and activity Trust Events are clear, and only if the owner
explicitly reopens this product decision, design institutional shops as an
optional governed module.

Minimum rules:

- activated Community Domain required;
- protected/paid/eligible package required if pricing is enabled;
- shop ownership belongs to the Community Domain ID;
- operator authority belongs to personal GS IDs approved by governance;
- products and Spotlight show the institution as the shop owner and the acting
  operator in audit/provenance;
- disputes route to the domain governance/dispute protocol;
- leadership changes remove or replace operators without deleting the shop;
- ordinary communities/committees do not receive institutional shops by
  default.

### Phase 7 - UI truth language

Update Community Domain, Marketplace, Shop Control, Spotlight, Demand Box, and
verification screens so users see the difference between:

- name reserved;
- draft created;
- payment instruction generated;
- payment confirmed;
- domain activated;
- community/domain ID issued;
- member roster active;
- member removed/inactive;
- personal shop ready;
- institutional shop optional / not enabled;
- institutional shop enabled;
- institutional shop operator assigned;
- verification available.

## Immediate conclusion

The prior implementation was not simply a UI placement bug. It exposed a deeper
governance and identity gap:

```text
Community Domain name protection exists.
Community Domain membership rows exist.
Ordinary community membership removal exists.
Individual shop ownership exists.
Community Domain manual activity records now exist as v1 Trust Events.
Community Domain public membership verification is present but narrowly scoped.
```

For MVP, `Pillar of Hope` should be treated like a protected community/domain:

- it has a protected name;
- it should have a community/domain ID;
- it has a governed member roster;
- it is represented by the personal GS ID that registered/operates it;
- admins can add, approve, deactivate, or remove members;
- removed members should not pass active-membership verification;
- its members can own personal shops through their personal GS IDs;
- Trust Events remain person-owned, not independently institution-owned;
- the domain itself does not own a shop unless a future institutional-shop
  model is deliberately approved.

The next implementation should focus on Community Domain governance completion
and activity-catalogue Trust Events. Institutional shop ownership should be
parked as a future optional governed module, because it needs pricing, operator
authority, dispute handling, institutional Trust Event ownership, and succession
rules before it is safe.

## Current system comparison - what fits, what is shut off, what is overbuilt

This comparison checks the agreed MVP rule against the current backend/frontend
shape.

### Fits the agreed MVP now

1. **Person-first identity is already the backend truth.**

   `User` carries the personal GSN/GMFN identity. `TrustEvent` requires
   `actor_user_id` and `subject_user_id`, both pointing to users. This matches
   the current decision that trust remains attached to people, not to an
   independent institutional actor.

2. **Community Domain name protection exists.**

   `CommunityDomain.domain_name` is unique. That correctly protects the name
   label, such as `Pillar of Hope`, from being claimed again inside GSN.

3. **Community Domain membership exists.**

   `CommunityDomainMembership` records `community_domain_id`, `user_id`, `role`,
   and `status`. This is the correct table for the governed member roster.

4. **Member removal/deactivation is mostly possible in the model.**

   Community Domain membership already has statuses such as `active`,
   `inactive`, `suspended`, and `archived`. The member upsert route can set
   status. This supports the rule that removed members should no longer pass
   active membership verification.

5. **Shops are already personal, which matches the final MVP verdict.**

   `MarketplaceShop` is unique by `owner_user_id`. `MarketplaceProduct` uses
   `seller_user_id`. Marketplace broadcast/Spotlight activity is also
   user-authored. There is no current Community Domain shop owner field. This is
   correct for the current MVP.

6. **Broad witness confirmation already exists.**

   The backend already uses the broad categories the owner approved for MVP:
   `known_here`, `active_here`, `good_standing`, `ask_more_evidence`,
   `known_but_caution`, `cannot_confirm_now`, `concern`, `inactive`,
   `under_dispute`, and `not_known`.

7. **Public ordinary community verification exists.**

   `/verify/community/{community_key}` and
   `/verify/community/{community_key}/member/{member_key}` already verify an
   ordinary `Clan` and active `ClanMembership`. The public verification concept
   is real.

8. **Confirmation requests and responses are already Trust Event backed.**

   The confirmation service already records request, response, outcome, review,
   expiry, and decision events. This matches the principle that meaningful
   verification actions create traceable Trust Events.

9. **Community Domain governance scaffolding exists.**

   Community Domain action reviews, policies, reviewer queues, evidence rows,
   access requests, setup evidence, setup editors, nodes, node members, and
   readiness maps are already present.

10. **Activity planning language already exists.**

    Community Domain templates already carry activity lanes, and the activity
    map/evidence map surfaces clearly say they are planning/readiness views.
    This is useful groundwork for the future activity catalogue.

### Present, shut off, or missing for the agreed MVP

1. **Community Domain public member verification is present but narrow.**

   The public verification route still proves ordinary `ClanMembership` for
   ordinary communities, and now also proves active `CommunityDomainMembership`
   when a protected Community Domain key is used. This is membership proof only:
   it must not be treated as trust, endorsement, shop ownership, sponsor impact,
   delivery proof, legal authority, or full roster visibility.

2. **Community Domain public proof has a domain-key path, but the permanent
   public ID language still needs product polish.**

   Ordinary communities have `clans.community_code`. Community Domains have
   `id`, `domain_name`, optional `clan_id`, and protected name state. The public
   proof flow can now resolve protected Community Domain keys without depending
   on a linked `Clan`, but the product still needs cleaner public-facing
   language for which code/ID should be printed, shared, and searched.

3. **Member removal/reactivation v1 exists, but the user-facing governance
   language still needs simplification.**

   The backend can deactivate members without hard deletion, preserve history,
   emit status-change Trust Events, block public active-member proof after
   deactivation, and expose compact roster controls. The remaining product gap
   is making this feel like a plain governed removal/reactivation path rather
   than a collection of status machinery.

4. **Representative-person language is not yet visible enough.**

   The code has `owner_user_id`, but the UI/product wording still needs to say
   plainly: the protected Community Domain is represented by this personal GSN
   ID for MVP. Trust Events belong to the person, not the domain itself.

5. **Control change does not yet have a clean public rule.**

   There is owner/admin/reviewer machinery, but the exact product rule for
   changing the accountable representative without transferring personal Trust
   Events still needs a simple, auditable flow.

6. **Community Domain membership is separate from ordinary social community
   membership, and this can still confuse the product.**

   The backend correctly separates `CommunityDomainMembership` from
   `ClanMembership`, and public verification now has a protected Community
   Domain fallback. Marketplace and some compatibility surfaces still lean on
   the linked ordinary community. The UI must explain when a person is a member
   of a domain versus a member of an ordinary marketplace/community.

7. **Activity catalogue records v1 exist, but capture is still manual.**

   The activity map remains read-only planning, but admins can now record manual
   activity Trust Events such as attendance, volunteer service, support
   delivered, contribution, leadership duty, welfare support, training
   completion, and project participation. This does not yet add QR check-in,
   batch import, participant confirmation, challenge handling, or automated
   attendance capture.

8. **Beneficiary outcome evidence v1 exists, but it is not independent proof by
   default.**

   Admins can now record beneficiary outcome Trust Events with baseline, support
   delivered, follow-up state, outcome state, beneficiary confirmation,
   evaluator/admin confirmation, challenge status, evidence strength, and
   visibility. This does not automatically prove unrecorded outcomes, and an
   admin-recorded claim is still weaker than beneficiary-confirmed,
   independently reviewed evidence.

9. **Low-burden capture is not yet implemented.**

   There is a meeting pack that can record a meeting summary and attendance
   count, but there is no general capture system for named attendance, admin
   batch entry, CSV import, member confirmation, milestone records, or periodic
   roll-ups.

10. **Sponsor-safe aggregation v2 exists, but public/submission proof is still
    not complete.**

    The current system can aggregate recorded activities, beneficiary outcomes,
    challenge state, delivery-prepared records, manual delivery receipts,
    contact/consent attestations, and blocked provider-send checks without
    exposing private beneficiary details by default. It still does not create a
    public sponsor portal, certify unrecorded impact, send reports externally,
    or turn manual/admin-recorded evidence into independent beneficiary proof.

### Overbuilt or too heavy for the immediate MVP

1. **The Community Domain dashboard has many readiness maps before the core
   activity and impact evidence gaps are closed.**

   These maps are useful, but they can give the feeling that the institution is
   more operational than it really is. The member verification route is now
   present; the remaining risk is over-reading readiness maps as actual
   activity records, sponsor impact evidence, provider delivery, or
   institution-owned trust.

2. **Action-review governance is powerful but may be too heavy for simple
   member removal.**

   For serious governance it is good. For a small NGO/church/association, the
   first MVP needs a plain remove/deactivate member action that still records
   history.

3. **Activity maps are well-caged, but they can look like implemented activity
   tracking.**

   The backend correctly says they do not create activities. The UI must keep
   that boundary clear so users do not think attendance/outcomes are already
   being captured.

4. **Institutional actor/shop ownership should remain parked.**

   The current schema does not build institutional shops, and that is good for
   this MVP decision. Building it now would require actor ID, shop owner rules,
   operator authority, pricing, liability, disputes, succession, and Trust Event
   ownership.

5. **Numeric scoring/questionnaires should remain parked.**

   The existing broad witness categories are enough. A 1-to-5 behaviour score
   would create false precision and may box people unfairly.

6. **GPS or automatic surveillance should not be added.**

   The current code does not default to GPS-based attendance. That is good.
   Low-burden evidence should start with existing community workflows, not
   location tracking.

### Minimum correction order from here

1. **Make the Community Domain member roster operationally clear.**

   List members, add/request/approve member, deactivate/remove member, preserve
   history, and prevent accidental owner/admin lockout.

2. **Add Community Domain public membership verification.**

   Support `CommunityDomainMembership` by domain key/name/ID and member GS ID.
   Return active, inactive/removed, pending, or not found without exposing the
   full private roster.

3. **Connect witness confirmation to the Community Domain context.**

   Keep automatic membership proof separate from human witness response.

4. **Clarify frontend wording.**

   Say: name protected, represented by personal GSN ID, members verified by
   roster, shops remain personal, activity evidence not yet recorded unless
   explicitly captured.

5. **Build the activity catalogue only after the verification trail is clean.**

   Start with manual admin record, named member/beneficiary subject, evidence
   strength, challenge status, and Trust Event creation. Add CSV/import/roll-up
   after the basic ledger works.

6. **Build NGO beneficiary outcomes as the first high-value activity template.**

   This answers the sponsor question directly: baseline, support, follow-up,
   improvement/challenge, confirmation, and aggregate impact.

### Director / sponsor period summary

The owner raised one more important governance use case: a Community Domain
administrator should be able to produce a canonical summary of what happened in
a defined period, so directors, trustees, sponsors, or funders can review the
domain without relying only on the organization's self-praise.

This is partly possible from the current system, but not complete.

#### What can be summarized from current records

The current system can already summarize:

- Community Domain members and member status counts;
- nodes, branches, departments, lines, or operating units;
- governance action reviews by status and action type;
- review decisions, comments, evidence metadata, and applied status changes;
- setup evidence and authority evidence metadata;
- meeting reminders and meeting summaries where the meeting pack was used;
- meeting `attendance_count` and named `attendee_user_ids` where recorded;
- ordinary Trust Events connected to the linked `clan_id`;
- broad community confirmation responses and outcomes where requested.

This means an admin can already produce a limited operational summary:

```text
During this period, these governance actions were requested, approved,
applied, evidenced, commented on, or challenged. These meetings were recorded.
These summaries and attendance counts were captured where meeting records
exist.
```

#### What cannot be honestly summarized without source records

The system can now produce period and sponsor-safe summaries from recorded
facts, including manual activity records and beneficiary outcome records. It
still cannot produce a full sponsor/director impact report for `Pillar of Hope`
or similar domains unless the underlying activities, outcomes, confirmations,
and corrections were recorded first.

It cannot automatically say:

- how many beneficiaries received support;
- which beneficiaries moved from point A to point B;
- which support activities were delivered;
- which outcomes improved, stayed unchanged, worsened, or were challenged;
- how many volunteer hours were performed;
- how many attendance records were captured by named member;
- which activity records were beneficiary-confirmed or member-confirmed;
- which sponsor-safe aggregate is ready for public/submission use beyond the
  admin-gated sponsor-safe pack.

The reason is simple: readiness maps and governance reviews are not the same as
a real activity/outcome ledger.

#### Minimum feature added, remaining lift

The **Community Domain Period Summary** feature now exists as a read-only,
admin-gated summary over recorded facts.

Inputs:

- `community_domain_id`;
- period start date;
- period end date;
- optional node/branch/department filter;
- optional visibility mode: admin-only, director-safe, sponsor-safe,
  public-safe.

The generated summary should include:

- membership snapshot: active, inactive, suspended, archived;
- member movement: added, reactivated, removed/deactivated during the period;
- governance summary: requested, approved, rejected, applied, cancelled,
  needing changes;
- evidence summary: evidence records added, challenged, accepted, pending;
- meeting/event summary: reminders, summaries, attendance counts, named
  attendance where present;
- activity summary: only real activity records that were actually recorded;
- beneficiary outcome summary: baseline/support/follow-up/outcome counts only
  when beneficiary outcome records exist;
- confirmation summary: witness requests, positive/caution/objection/no
  response counts;
- challenge summary: disputed records, unresolved challenges, corrected
  records;
- source links: every number must trace back to source records.

The summary should not invent facts. If a field has no recorded source, it
should say:

```text
Not recorded in GSN for this period.
```

#### Director / sponsor verification loop

Directors or sponsors should be able to verify the summary by asking selected
participants or members to confirm:

- did this activity happen?
- were you present?
- did you receive the support?
- is this outcome correct?
- do you challenge this record?

Those responses should become Trust Events or confirmation records, with
privacy controlled by the summary visibility mode.

#### Canonical anti-manipulation rule

A period summary is only as strong as the records behind it.

The summary should carry evidence strength labels:

- system-recorded;
- admin-recorded;
- member-confirmed;
- beneficiary-confirmed;
- witness-confirmed;
- imported;
- multi-party-confirmed;
- challenged;
- corrected;
- not independently confirmed.

This makes the report useful without pretending it is impossible to manipulate.
The anti-manipulation strength comes from source records, member/beneficiary
confirmation, challenge rights, and traceable correction history.

### Bridge plan for the remaining gap

The remaining gap is small in concept but important in product truth:

```text
Community Domains already have protected names, member rows, governance
records, readiness maps, narrow public member proof, manual activity records,
beneficiary outcome records, and admin-gated sponsor-safe summaries. They still
need low-burden capture, configurable domain-specific activity templates,
deeper participant/beneficiary confirmation, public/submission proof, and
provider-backed delivery before sponsor-grade reporting is complete.
```

#### Safe outreach claims now

GSN can safely tell a prospective Community Domain such as `Pillar of Hope`
that the platform is designed to help them:

- protect their community/domain name inside GSN;
- onboard the accountable representative and members through GSN IDs;
- keep a governed membership roster;
- add, approve, deactivate, or remove members;
- verify whether someone is a current member;
- request broad witness/community confirmation;
- keep members' personal shops and Trust Events tied to personal GSN IDs;
- record governance decisions, setup evidence, comments, approvals, and
  applied changes;
- record meeting summaries and attendance counts where the meeting pack is
  used;
- record manual activity and beneficiary outcome Trust Events;
- prepare director/sponsor summaries from recorded facts;
- prepare a copy-ready sponsor-safe pack without exposing private beneficiary
  detail by default;
- keep private records private while sharing public-safe proof;
- build toward beneficiary outcome reporting for sponsors.

These are accurate because they either exist now or are directly aligned with
the agreed MVP bridge.

#### Claims that must be marked as coming next

GSN should not yet promise that every Community Domain can automatically
produce full sponsor impact reports. That depends on complete structured
records and confirmation depth, not merely dashboard readiness maps.

These should be described as next-stage build items:

- low-burden capture for routine activity records;
- configurable domain-specific activity catalogue templates;
- named attendance/import/roll-up capture;
- public/submission-ready sponsor proof and sponsor access control;
- deeper participant/beneficiary confirmation loop;
- challenge/correction trail for impact records.

#### Minimum implementation bridge

To make the outreach promise true end-to-end, build in this order:

1. **Community Domain member proof - implemented 2026-07-15**

   Add public verification that checks whether a member GSN ID is active,
   inactive/removed, pending, or absent in a protected Community Domain.

   Implementation note:

   - existing public routes now resolve protected Community Domain keys when no
     ordinary `Clan` matches;
   - `/verify/community/{community_key}` can return a protected Community
     Domain public record;
   - `/verify/community/{community_key}/member/{member_key}` can confirm an
     active `CommunityDomainMembership`;
   - inactive, suspended, archived, pending, or absent members do not pass
     public active-member proof;
   - ordinary `ClanMembership` verification still takes priority and remains
     backward compatible.

2. **Member removal clarity - implemented 2026-07-15**

   Give admins a simple action to deactivate/remove a member, preserve the
   history, and make active-member verification fail immediately after removal.

   Implementation note:

   - `PATCH /community-domains/{community_domain_id}/members/{user_id}/status`
     updates a domain member status;
   - `DELETE /community-domains/{community_domain_id}/members/{user_id}`
     deactivates the member by setting status to `inactive`;
   - removal is not hard deletion;
   - the recorded Community Domain owner cannot be removed through this route;
   - status changes create `community_domain_member_status_changed` Trust
     Events;
   - public active-member proof fails after deactivation.
   - frontend API helpers and the Community Domain dashboard Members lane now
     expose a compact admin roster control for deactivation/reactivation.

3. **Director/sponsor period summary v1 - implemented 2026-07-15**

   Generate a period report from current facts: members, status movement,
   governance reviews, evidence metadata, meeting summaries, attendance counts,
   and confirmation outcomes.

   Implementation note:

   - `GET /community-domains/{community_domain_id}/period-summary` now returns
     an admin-only read-only period report;
   - the default period is the last 30 days unless `period_start` and
     `period_end` are supplied;
   - the report summarizes current member status counts, member additions,
     status-change Trust Events, governance action reviews, action-review
     evidence metadata, linked-community confirmation records, linked-clan Trust
     Events, and Community Domain Trust Events with matching
     `community_domain_id` metadata;
   - optional node filters narrow node-scoped governance/evidence sections only;
   - `admin_only`, `director_safe`, `sponsor_safe`, and `public_safe` visibility
     modes are accepted, but the endpoint remains admin-gated in this slice;
   - when a Community Domain is not linked to an ordinary community, confirmation
     summary is marked not available for that domain context;
   - activity catalogue and beneficiary outcome sections return recorded
     summaries when Trust Events exist, and explicitly return `Not recorded in
     GSN for this period` when the underlying records do not exist;
   - the Community Domain dashboard Governance lane now shows a compact
     Director period summary card for owners/admins.

4. **Activity catalogue v1 - implemented 2026-07-15**

   Let admins record simple activities against a member/beneficiary:
   attendance, volunteer service, support delivered, follow-up completed,
   contribution, leadership duty, welfare support, training completion, or
   project participation.

   Implementation note:

   - `GET /community-domains/{community_domain_id}/activity-catalogue` now
     returns the standard activity catalogue types;
   - `POST /community-domains/{community_domain_id}/activities` lets a domain
     owner/admin record one manual activity against an existing GSN user;
   - `GET /community-domains/{community_domain_id}/activities` lists recent
     admin-visible activity records;
   - each activity is stored as a person-first Trust Event with
     `event_type = community_domain.activity_recorded`;
   - the Trust Event metadata includes Community Domain id/name, optional node,
     activity type/label, evidence dimension, quantity/unit, evidence strength,
     visibility, note/reference, baseline/after text, follow-up due date, and
     membership status snapshot;
   - the period summary now counts these activity records by type, evidence
     strength, visibility, and subject count;
   - the Community Domain dashboard Governance lane now includes a compact
     Activity catalogue quick-add card and recent activity list for
     owners/admins.

   Boundary:

   - this is manual admin recording only;
   - this does not yet import attendance sheets, run QR check-in, batch upload,
     request participant/beneficiary confirmation, resolve challenges, or prove
     final beneficiary outcomes.

5. **Beneficiary outcome v1 - implemented 2026-07-15**

   For NGO/project templates, add baseline, support delivered, follow-up state,
   outcome state, beneficiary confirmation, evaluator/admin confirmation, and
   challenge status.

   Implementation note:

   - `POST /community-domains/{community_domain_id}/beneficiary-outcomes` lets
     a domain owner/admin record baseline-to-after evidence against an existing
     GSN user;
   - `GET /community-domains/{community_domain_id}/beneficiary-outcomes` lists
     recent admin-visible beneficiary outcome records;
   - each outcome is stored as a person-first Trust Event with
     `event_type = community_domain.beneficiary_outcome_recorded`;
   - the Trust Event metadata includes Community Domain id/name, optional node,
     programme/case label, outcome indicator, baseline value, after value,
     support received, follow-up state, outcome state, beneficiary confirmation,
     admin/evaluator confirmation, challenge status, evidence strength,
     visibility, note/reference, and membership status snapshot;
   - the period summary now counts beneficiary outcome records by outcome state,
     follow-up state, beneficiary confirmation, admin confirmation, evidence
     strength, visibility, challenge status, and subject count;
   - the Community Domain dashboard Governance lane now includes a compact
     Beneficiary outcomes quick-add card and recent outcome list for
     owners/admins.

   Boundary:

   - this is still manual admin recording;
   - `admin_recorded` means the organization recorded the claim, not that the
     beneficiary has confirmed it;
   - sponsor-safe aggregation, beneficiary confirmation links, correction
     reviews, and copy-ready export packs now exist as bounded later slices in
     this audit, but this v1 outcome record alone is not public disclosure,
     independent proof, provider-backed delivery, legal dispute resolution, or
     certified sponsor submission.

6. **Sponsor-safe summary v2 - implemented 2026-07-15**

   Aggregate the activity/outcome records without exposing private beneficiary
   details by default.

   Implementation note:

   - `GET /community-domains/{community_domain_id}/sponsor-summary` now returns
     an admin-gated, sponsor-safe aggregate report for a period;
   - the report summarizes active member count, activity records, beneficiary
     outcome records, outcome states, follow-up states, beneficiary
     confirmation states, admin confirmation states, evidence strength,
     visibility, challenge status, top indicators, and top programmes;
   - private beneficiary details are omitted by default, including subject user
     ids, actor user ids, beneficiary names, private notes, baseline text,
     after-value text, evidence references, and source record ids;
   - the Community Domain dashboard Governance lane now includes a compact
     Sponsor-safe summary card for owners/admins.

   Boundary:

   - this is not a public sponsor page;
   - it does not expose beneficiary names or private case notes;
   - it does not prove unrecorded impact;
   - it does not turn admin-recorded claims into beneficiary-confirmed proof;
   - copy-ready export packs, beneficiary confirmation links, and correction
     reviews now exist as bounded later slices in this audit; public sponsor
     portal sharing, sponsor access control, certified download/PDF generation,
     direct sponsor delivery, and legal-grade dispute resolution remain future
     work.

7. **Beneficiary confirmation / challenge links v1 - implemented 2026-07-15**

   Let an owner/admin generate a private confirmation link for one beneficiary
   outcome, so the beneficiary, guardian, witness, member, or reviewer can
   confirm, partly confirm, challenge, or say they cannot confirm.

   Implementation note:

   - `POST /community-domains/{community_domain_id}/beneficiary-outcomes/{outcome_event_id}/confirmation-links`
     creates a private bearer confirmation link for one outcome;
   - the raw token is returned once and only a token hash is stored in Trust
     Event metadata;
   - `GET /community-domains/public/beneficiary-outcome-confirmations/{public_token}`
     opens the private confirmation view from the backend;
   - `POST /community-domains/public/beneficiary-outcome-confirmations/{public_token}/responses`
     records the responder answer as a separate Trust Event;
   - supported response types are `confirm`, `partly_confirm`, `challenge`,
     and `cannot_confirm`;
   - each response is stored as
     `event_type = community_domain.beneficiary_outcome_confirmation_response`;
   - the Sponsor-safe summary now counts confirmation response records,
     response types, confirmation states, and response challenge statuses;
   - the Community Domain dashboard recent-outcome rows now include a compact
     `Create confirmation link` action for owners/admins.

   Boundary:

   - this is bearer-link confirmation, not full account-authenticated
     beneficiary login;
   - the link is not sent by WhatsApp/SMS/email automatically;
   - the public endpoint now has a React page, but it is still a private
     bearer-link page rather than a full account, notification, or dispute
     portal;
   - responses do not edit or delete the original admin outcome record;
   - duplicate responses on the same token are blocked;
   - correction review now exists as a bounded additive Trust Event lane below;
   - formal dispute resolution, link revocation, multi-admin correction
     approval, and public sponsor publishing remain future work.

8. **Public beneficiary confirmation page v1 - implemented 2026-07-15**

   Give the bearer-link confirmation flow a calm user-facing page so a
   beneficiary, guardian, witness, member, or reviewer can answer without
   touching raw JSON.

   Implementation note:

   - the frontend route
     `/community-domains/public/beneficiary-outcome-confirmations/:token`
     opens `BeneficiaryOutcomeConfirmationPage`;
   - the page calls
     `GET /community-domains/public/beneficiary-outcome-confirmations/{public_token}`
     without requiring an authenticated GSN session;
   - the page shows the organization, outcome indicator, programme, baseline,
     after-value, recorded support, link status, and responder type;
   - the responder can choose `confirm`, `partly_confirm`, `challenge`, or
     `cannot_confirm`;
   - optional responder name, note, and correction note are supported;
   - the response is posted to
     `POST /community-domains/public/beneficiary-outcome-confirmations/{public_token}/responses`
     and becomes a separate Trust Event;
   - if the backend says the token has already responded, the page shows an
     already-answered state instead of encouraging a second answer;
   - the Community Domain product-contract audit now cages the route, screen
     registry entry, unauthenticated API helpers, four response options, and
     visible boundary copy.

   Boundary:

   - this is not a public sponsor impact page;
   - it does not authenticate the responder as a full GSN account;
   - it does not send WhatsApp, SMS, or email messages automatically;
   - it does not adjudicate disputes or approve corrections;
   - it does not delete or rewrite the original admin-recorded outcome;
   - it records an answer so directors, sponsors, and admins can distinguish
     admin-recorded claims from confirmed, partially confirmed, challenged, or
     unconfirmed evidence.

9. **Beneficiary correction review lane v1 - implemented 2026-07-15**

   Give a Community Domain owner/admin a governed way to respond when a
   beneficiary, guardian, witness, member, or reviewer challenges or partly
   confirms an outcome.

   Implementation note:

   - new Trust Event type:
     `community_domain.beneficiary_outcome_correction_reviewed`;
   - admin decision options are intentionally bounded:
     `uphold_original`, `mark_corrected`, `withdraw_original`,
     `needs_follow_up`, and `no_action`;
   - `GET /community-domains/{community_domain_id}/beneficiary-outcomes/correction-reviews`
     lists correction-review Trust Events for admins;
   - `POST /community-domains/{community_domain_id}/beneficiary-outcomes/{outcome_event_id}/correction-reviews`
     records the admin review decision;
   - the backend validates that a referenced confirmation response belongs to
     the same Community Domain and outcome;
   - beneficiary outcome listing now includes the latest confirmation response,
     confirmation response count, latest correction review, and correction
     review count;
   - Period Summary and Sponsor-safe Summary now count correction reviews,
     reviewed/resolved challenges, and unresolved challenges;
   - the Community Domain dashboard Governance lane now shows challenged recent
     outcome rows with a compact `Review challenge` control.

   Boundary:

   - the original admin-recorded outcome is not rewritten;
   - the beneficiary/witness response is not deleted;
   - the correction review is a third additive Trust Event;
   - this is not a legal dispute tribunal, not external arbitration, and not a
     beneficiary account workflow;
   - the v1 review can record a decision and optional corrected values, but it
     does not yet create a full threaded case file, notify every stakeholder, or
     require multi-admin approval.

10. **Beneficiary confirmation manual delivery pack v1 - implemented 2026-07-15**

   When an owner/admin creates a private beneficiary confirmation link, GSN now
   prepares a copy-ready delivery pack instead of leaving the admin with only a
   raw URL.

   Implementation note:

   - new Trust Event type:
     `community_domain.beneficiary_outcome_confirmation_delivery_prepared`;
   - confirmation-link creation now returns a `delivery_pack` with:
     `message_text`, `whatsapp_url`, `sms_url`, `email_subject`,
     `email_body`, and `email_url`;
   - the delivery pack status is `prepared_not_sent`;
   - the raw public token is returned only in the API response, while the Trust
     Event stores token hash/prefix and a route template instead of storing the
     raw bearer link;
   - the Community Domain dashboard now copies the prepared message with the
     absolute link when the browser allows clipboard access;
   - the visible dashboard message says GSN did not send WhatsApp, SMS, or
     email.

   Boundary:

   - this is not automatic WhatsApp/SMS/email sending;
   - it does not prove the recipient received, opened, or answered the link;
   - it does not store the raw bearer token in Trust Event metadata;
   - it does not create in-app notifications for the beneficiary yet;
   - manual delivery receipts and consent-basis capture now exist as bounded
     later slices in this audit;
   - real provider delivery rails, retry logic, beneficiary/sponsor
     notification, webhook receipts, and full consent-management rules remain
     future work.

11. **Beneficiary outcome admin notifications v1 - implemented 2026-07-15**

   When a beneficiary outcome receives a challenged or uncertain public
   response, or when an admin records a correction-review decision, GSN now
   creates in-app admin notifications so the evidence does not sit quietly in
   the Trust Event trail.

   Implementation note:

   - new in-app notification kinds:
     `community_domain.beneficiary_outcome_response_recorded` and
     `community_domain.beneficiary_outcome_correction_reviewed`;
   - public response types `partly_confirm`, `challenge`, and
     `cannot_confirm` notify active Community Domain owner/admin/domain_admin
     recipients;
   - correction-review decisions notify the other active admins while excluding
     the admin who just recorded the decision;
   - notification actions point to
     `/app/community-domain/{id}?lane=governance`;
   - raw beneficiary confirmation bearer links are not placed in notification
     action URLs;
   - responder privacy is preserved in the Community Domain Trust Event trail.

   Boundary:

   - this is not WhatsApp, SMS, or email delivery;
   - it does not prove that an admin opened or acted on the notification;
   - web push is only best-effort through the existing notification service and
     depends on existing subscriptions;
   - it does not notify beneficiaries or sponsors directly;
   - it is not a full workflow queue, SLA timer, escalation engine, or delivery
     receipt system.

12. **Beneficiary confirmation manual delivery receipt v1 - implemented 2026-07-15**

   After GSN prepares a beneficiary confirmation delivery pack, a Community
   Domain owner/admin can now record that the prepared message was manually
   shared through an external channel.

   Implementation note:

   - new Trust Event type:
     `community_domain.beneficiary_outcome_confirmation_delivery_recorded`;
   - admin-only route:
     `POST /community-domains/{community_domain_id}/beneficiary-outcomes/{outcome_event_id}/confirmation-deliveries/{delivery_event_id}/receipts`;
   - the receipt must be attached to a prepared delivery Trust Event for the
     same Community Domain and beneficiary outcome;
   - allowed channels are `copy_link`, `whatsapp`, `sms`, `email`, and `other`;
   - allowed statuses are `manual_sent`, `manual_failed`,
     `received_reported`, and `opened_reported`;
   - beneficiary outcome listing now exposes latest delivery preparation and
     latest delivery receipt records for admin review;
   - the Community Domain dashboard can record a compact selected
     channel/status/consent-basis manual-share receipt from the recent outcome
     row;
   - the receipt Trust Event stores token hash/prefix and route template only,
     not the raw bearer token.

   Boundary:

   - this does not send WhatsApp, SMS, or email from GSN;
   - this does not prove the recipient received or opened the message;
   - this is an admin-stated delivery record, not a provider delivery receipt;
   - it does not retry failed delivery;
   - the dashboard now supports bounded manual channel/status/consent-basis
     selection, but this is still admin-recorded evidence, not a provider send
     or verified provider receipt;
   - it does not notify beneficiaries or sponsors directly.

13. **Beneficiary confirmation delivery channel/status selection v1 - implemented 2026-07-15**

   The manual delivery receipt rail is no longer limited to a hardcoded
   WhatsApp share action. Admins can now choose the external channel and the
   manual delivery status they are recording.

   Implementation note:

   - beneficiary outcome listing now returns allowed `delivery_channels` and
     `delivery_statuses` from the backend contract;
   - the dashboard exposes bounded channel options: `whatsapp`, `sms`,
     `email`, `copy_link`, and `other`;
   - the dashboard exposes bounded status options: `manual_sent`,
     `manual_failed`, `received_reported`, and `opened_reported`;
   - each recent outcome row can hold a small delivery receipt draft with
     channel, status, and optional note;
   - recording the receipt still writes the existing additive Trust Event:
     `community_domain.beneficiary_outcome_confirmation_delivery_recorded`;
   - the visible confirmation message repeats that GSN did not send WhatsApp,
     SMS, or email.

   Boundary:

   - this is still not provider-backed sending;
   - this is still not a provider delivery receipt;
   - `received_reported` and `opened_reported` mean somebody reported those
     facts to the admin, not that GSN independently verified them;
   - this does not add retry queues, consent management, webhook ingestion, or
     sponsor/beneficiary notification rails.

14. **Beneficiary confirmation manual delivery consent basis v1 - implemented 2026-07-15**

   Manual delivery receipts now record the authority/consent basis the admin
   relied on when sharing a beneficiary confirmation request outside GSN.

   Implementation note:

   - backend receipt payload now accepts bounded `consent_basis` values;
   - allowed consent bases are `beneficiary_consented`,
     `guardian_or_authorized_contact`, `existing_relationship`,
     `operational_notice`, and `not_recorded`;
   - beneficiary outcome listing now returns `delivery_consent_bases` alongside
     delivery channels and statuses;
   - receipt Trust Events store the selected `consent_basis`;
   - the dashboard manual receipt draft now includes a consent-basis selector;
   - existing delivery receipt display shows the stored consent basis when
     present;
   - the frontend API helper sends `consent_basis` to the backend.

   Boundary:

   - this does not verify consent independently;
   - this does not make the external contact lawful by itself;
   - `not_recorded` is allowed for honesty, but it is a weak audit posture;
   - this does not add provider sending, provider webhooks, retry queues,
     contact preference storage, or a full consent-management module.

15. **Beneficiary confirmation delivery evidence summary v1 - implemented 2026-07-15**

   Manual beneficiary confirmation delivery evidence now appears in the
   director period summary and the sponsor-safe summary, not only inside each
   beneficiary outcome row.

   Implementation note:

   - period summary now counts prepared confirmation delivery packs;
   - period summary now counts manual delivery receipts;
   - period summary groups manual receipts by `delivery_status`, `channel`,
     and `consent_basis`;
   - sponsor-safe summary now exposes aggregate delivery-prepared and
     delivery-receipt counts;
   - sponsor-safe summary groups manual delivery receipts by status, channel,
     and consent basis without exposing beneficiary private detail;
   - dashboard Governance summaries now show delivery-pack and manual-receipt
     counts;
   - dashboard text explicitly says GSN did not send WhatsApp, SMS, or email.

   Boundary:

   - this is aggregate evidence from existing Trust Events only;
   - this does not prove a beneficiary received or opened a message;
   - this does not create provider-backed sending or delivery webhooks;
   - this does not expose private beneficiary identity to sponsors;
   - this does not turn manual admin delivery records into independent proof.

16. **Sponsor-safe export pack v1 - implemented 2026-07-15**

   Sponsor-safe summary now includes copy-ready report text that an admin can
   review and share manually with a director, trustee, sponsor, or funder.

   Implementation note:

   - sponsor summary now returns `sponsor_export_pack`;
   - the pack status is `prepared_not_sent`;
   - the pack includes title, period label, copy text, email subject/body,
     `mailto_url`, fact lines, omitted private fields, and a boundary;
   - dashboard Governance summary now exposes a `Copy sponsor pack` action;
   - copied text includes recorded activity, outcome, challenge, delivery, and
     confirmation-signal counts;
   - copied text omits beneficiary names, user IDs, private notes, baseline
     text, after-value text, evidence references, and source record IDs.

   Boundary:

   - GSN prepares the pack but does not send, publish, or certify it;
   - the pack is only as strong as the records already captured in GSN;
   - `confirmation signals` may include more than one signal for the same
     outcome where both admin confirmation and beneficiary/witness response
     exist, so it must not be sold as a unique-beneficiary count;
   - this is not a public sponsor portal, PDF generator, email provider, or
     proof of unrecorded impact.

17. **Beneficiary confirmation provider delivery readiness v1 - implemented 2026-07-15**

   Beneficiary confirmation delivery now exposes a read-only readiness object
   that says manual delivery exists but provider-backed sending does not.

   Implementation note:

   - confirmation delivery packs now include `provider_delivery_readiness`;
   - sponsor-safe summary now includes `external_delivery_readiness`;
   - delivery-prepared Trust Events store provider-readiness status fields;
   - dashboard Sponsor-safe summary now shows provider delivery readiness and
     missing components;
   - readiness status is `manual_only_provider_not_connected`;
   - provider send engine, delivery webhook, retry queue, and contact
     preference storage are all marked `not_connected_in_this_slice`;
   - consent enforcement is marked `manual_receipt_consent_basis_only`.

   Boundary:

   - this does not send WhatsApp, SMS, or email;
   - this does not create provider jobs, webhooks, retry queues, or contact
     preference storage;
   - this does not independently verify consent or receipt;
   - it exists to stop the system from overclaiming delivery while showing
     exactly what must be built before provider-backed sending can be trusted.

18. **Blocked provider-send guard v1 - implemented 2026-07-15**

   A provider-send attempt endpoint now exists for beneficiary confirmation
   deliveries, but it fails closed while WhatsApp/SMS/email providers are not
   connected.

   Implementation note:

   - admin-only route:
     `POST /community-domains/{community_domain_id}/beneficiary-outcomes/{outcome_event_id}/confirmation-deliveries/{delivery_event_id}/provider-send-attempts`;
   - the route validates the Community Domain, beneficiary outcome, and
     prepared delivery Trust Event before answering;
   - if the delivery record is missing, it returns the same not-found boundary
     as manual receipt recording;
   - if the delivery record belongs to a different domain or outcome, it
     returns a mismatch boundary;
   - while providers are not connected, it returns `409` with
     `provider_delivery_not_connected`;
   - the response includes the same `provider_delivery_readiness` object used
     by delivery packs and sponsor summaries;
   - `send_attempt_created` is `false`;
   - `external_channels_sent_by_gsn` is `false`.

   Boundary:

   - this does not send WhatsApp, SMS, or email;
   - this does not create a provider job;
   - this does not create a Trust Event;
   - this does not prove delivery, receipt, consent, or provider readiness;
   - it is a truth guard that prevents future UI/API work from accidentally
     claiming provider delivery before the provider infrastructure exists.

19. **Provider-send readiness dashboard bridge v1 - implemented 2026-07-15**

   The Community Domain dashboard now exposes the fail-closed provider-send
   guard as an admin-visible readiness check.

   Implementation note:

   - frontend API helper:
     `attemptCommunityDomainOutcomeConfirmationProviderSend`;
   - dashboard beneficiary outcome rows now show `Check provider send` beside
     manual delivery receipt controls when a prepared delivery exists;
   - the button calls the fail-closed backend provider-send attempt route;
   - when the backend returns `provider_delivery_not_connected`, the dashboard
     tells the admin that WhatsApp/SMS/email providers are not connected;
   - the dashboard message says GSN created no provider job, no Trust Event,
     and no external send;
   - the product-contract audit now cages the frontend API helper, dashboard
     handler, blocked-send wording, and stable button id.

   Boundary:

   - this is not provider delivery;
   - this does not send WhatsApp, SMS, or email;
   - this does not create a provider job or Trust Event;
   - it only makes the existing backend truth visible to admins at the exact
     place they would expect a delivery action.

20. **Provider delivery setup contract v1 - implemented 2026-07-15**

   Provider delivery readiness now includes a concrete setup contract that
   explains what must exist before GSN may honestly lift the provider-send
   block.

   Implementation note:

   - `provider_delivery_readiness` now includes
     `provider_setup_contract`;
   - the contract status is `not_configured`;
   - required channel contracts are listed for WhatsApp, SMS, and email using
     provider-neutral language;
   - each channel remains `not_connected_in_this_slice` and `configured =
     false`;
   - required operational controls include contact preference storage, consent
     enforcement, retry policy, webhook signature verification, provider
     message id capture, delivery receipt Trust Event mapping, and failed
     delivery review;
   - send lift conditions define what must be true before provider sending can
     move from blocked to ready;
   - dashboard Sponsor-safe summary now shows the setup contract status, lift
     conditions, and truth gate;
   - product-contract audit cages the backend contract, backend tests, and
     dashboard display.

   Boundary:

   - this still does not send WhatsApp, SMS, or email;
   - this does not select a vendor, store credentials, create env vars, or add
     a provider SDK;
   - this does not create schema or migrations;
   - it turns the vague future gap into an explicit engineering contract for
     the next provider-backed implementation.

21. **Provider contact and consent gate v1 - implemented 2026-07-15**

   Provider delivery readiness now includes an explicit contact-preference and
   consent gate.

   Implementation note:

   - `provider_delivery_readiness` now includes
     `contact_consent_contract`;
   - the contract status is `not_connected`;
   - contact preference storage remains `not_connected_in_this_slice`;
   - consent basis storage remains `manual_receipt_consent_basis_only`;
   - provider-send blocker is
     `missing_contact_preference_and_consent_gate`;
   - required contact fields include preferred channel, destination reference,
     destination verification time, contact owner type, and contact scope;
   - required consent fields include consent basis, recorded time, recorded by,
     consent scope, and withdrawal time;
   - the minimum send rule says provider delivery must not be attempted unless
     the selected channel has a verified destination and an active consent or
     legal-authority basis for the beneficiary confirmation purpose;
   - dashboard Provider delivery readiness now shows `Contact and consent
     gate`;
   - product-contract audit cages the backend contract, backend tests, and
     dashboard display.

   Boundary:

   - this still does not store beneficiary phone numbers, email addresses,
     provider destination references, or consent records;
   - this still does not send WhatsApp, SMS, or email;
   - this does not add schema, migrations, provider SDKs, webhooks, or
     credentials;
   - it makes the missing contact/consent dependency visible so provider-send
     cannot be honestly marked ready without it.

22. **Beneficiary contact/consent attestation v1 - implemented 2026-07-15**

   Community Domain admins can now record an additive Trust Event saying a
   contact and consent basis exists for a beneficiary outcome confirmation.

   Implementation note:

   - new Trust Event type:
     `community_domain.beneficiary_outcome_contact_consent_recorded`;
   - new admin route:
     `POST /community-domains/{community_domain_id}/beneficiary-outcomes/{outcome_event_id}/contact-consent-records`;
   - the route validates the Community Domain, admin authority, and selected
     beneficiary outcome before writing the event;
   - accepted channels are bounded to WhatsApp, SMS, and email;
   - destination reference status is bounded to known options such as
     `admin_verified_off_platform`, `beneficiary_provided`, and
     `not_recorded`;
   - consent basis reuses the existing bounded delivery consent vocabulary;
   - beneficiary outcome listing now shows contact/consent record counts and
     the latest contact/consent record;
   - period summaries and sponsor-safe summaries now count contact/consent
     attestations by channel, reference status, and consent basis;
   - sponsor export text now includes the number of contact/consent
     attestations recorded;
   - the Community Domain dashboard now lets admins record the attestation
     without entering raw phone numbers or email addresses.

   Boundary:

   - this does not store the raw destination;
   - this does not send WhatsApp, SMS, or email;
   - this does not make provider sending ready;
   - this is admin-stated evidence only, useful for governance and sponsor
     review, but weaker than a verified provider delivery receipt or direct
     beneficiary response.

23. **Beneficiary contact/consent withdrawal v1 - implemented 2026-07-15**

   Contact/consent evidence can now be reversed by a separate additive Trust
   Event instead of being silently edited or deleted.

   Implementation note:

   - new Trust Event type:
     `community_domain.beneficiary_outcome_contact_consent_withdrawn`;
   - new admin route:
     `POST /community-domains/{community_domain_id}/beneficiary-outcomes/{outcome_event_id}/contact-consent-records/{contact_consent_event_id}/withdrawals`;
   - the route validates the Community Domain, beneficiary outcome, and
     original contact/consent attestation before recording the withdrawal;
   - withdrawal reasons are bounded, including beneficiary withdrawal,
     guardian withdrawal, wrong recipient, contact no longer valid, consent
     expired, replacement attestation, and admin error;
   - the original contact/consent record remains in the audit trail;
   - beneficiary outcome listing now shows withdrawal count and latest
     withdrawal record;
   - period summaries and sponsor-safe summaries now count withdrawals by
     reason;
   - sponsor export text now includes contact/consent withdrawal counts;
   - the dashboard lets admins record a consent withdrawal only after a
     contact/consent attestation exists.

   Boundary:

   - this does not delete the original attestation;
   - this does not send WhatsApp, SMS, or email;
   - this does not unlock provider sending;
   - after withdrawal, a valid replacement attestation is required before
     provider sending can ever be treated as ready.

24. **Withdrawn consent delivery guard v1 - implemented 2026-07-15**

   Manual beneficiary confirmation delivery receipts are now blocked when the
   latest contact/consent trail is withdrawn and no replacement attestation has
   been recorded.

   Implementation note:

   - backend now computes a contact/consent status for each beneficiary
     outcome:
     `not_recorded`, `active_attestation`, or
     `withdrawn_requires_replacement`;
   - the beneficiary outcome list returns `contact_consent_status`;
   - manual delivery receipt recording now checks that status before writing a
     receipt Trust Event;
   - if the latest status is `withdrawn_requires_replacement`, the receipt
     route returns `409` with
     `beneficiary_outcome_contact_consent_withdrawn`;
   - the failed receipt attempt creates no delivery receipt Trust Event and
     sends no external message;
   - if an admin records a later replacement contact/consent attestation, the
     manual receipt path can proceed again;
   - the dashboard now hides the manual receipt action while consent is
     withdrawn and tells the admin to record a replacement attestation first.

   Boundary:

   - this does not require full contact-preference storage;
   - this does not make provider delivery ready;
   - this does not make GSN a sender;
   - it only prevents a known-invalid contact/consent trail from being used to
     justify later manual delivery evidence.

25. **Active contact/consent required for manual delivery v1 - implemented 2026-07-15**

   Manual beneficiary confirmation delivery receipts now require an active
   contact/consent attestation before the receipt Trust Event can be recorded.

   Implementation note:

   - `not_recorded` contact/consent status now sets
     `manual_delivery_allowed = false`;
   - `withdrawn_requires_replacement` remains blocked until a later active
     attestation exists;
   - the receipt route now returns a separate `409` code,
     `beneficiary_outcome_contact_consent_not_recorded`, when no
     contact/consent attestation exists;
   - the withdrawn-consent block still returns
     `beneficiary_outcome_contact_consent_withdrawn`;
   - both blocked paths create no manual delivery receipt Trust Event and send
     no WhatsApp, SMS, or email;
   - the dashboard tells admins that manual receipt evidence is blocked until
     active contact/consent exists.

   Boundary:

   - this still does not store raw phone numbers or email addresses;
   - this still does not make GSN a provider sender;
   - this is a minimum evidence discipline rule: no active contact/consent
     attestation, no manual delivery receipt.

26. **Provider readiness carries active contact/consent status v1 - implemented 2026-07-15**

   Provider-send readiness now carries the selected beneficiary outcome's
   latest contact/consent status wherever that specific outcome is available.

   Implementation note:

   - provider readiness still reports WhatsApp/SMS/email providers as not
     connected;
   - provider readiness now includes `active_contact_consent_status` and
     `active_contact_consent_satisfied`;
   - delivery packs created for a beneficiary outcome show whether contact/
     consent is `not_recorded`, `active_attestation`, or
     `withdrawn_requires_replacement`;
   - blocked provider-send checks recompute the latest contact/consent status
     before returning the `409` response;
   - the dashboard now shows that provider sending is blocked both by provider
     infrastructure and by missing/withdrawn active contact/consent where
     applicable.

   Boundary:

   - this does not connect provider sending;
   - this does not store raw phone numbers, email addresses, or provider
     destination values;
   - this does not make an admin attestation equal to a provider-verified
     delivery receipt;
   - it only prevents readiness language from hiding the contact/consent state
     that would matter before any future provider send.

27. **Current readiness separated from prepared delivery metadata v1 - implemented 2026-07-15**

   Beneficiary outcome listings now separate the delivery status that was true
   when a delivery pack was prepared from the current provider-readiness status
   after later contact/consent changes.

   Implementation note:

   - delivery-preparation payloads now expose the contact/consent status stored
     at preparation time;
   - the beneficiary outcome listing also returns
     `current_provider_delivery_readiness`, recalculated from the latest
     contact/consent status;
   - the dashboard shows both values: the prepared delivery record's historical
     contact/consent status and the current provider-readiness contact/consent
     status;
   - tests prove the prepared delivery can remain `not_recorded` while current
     readiness becomes `active_attestation` after replacement contact/consent.

   Boundary:

   - this does not rewrite old Trust Events;
   - this does not claim provider delivery is ready;
   - this does not send or verify WhatsApp, SMS, or email;
   - it prevents admins and sponsors from mistaking historical preparation
     metadata for the latest delivery-readiness truth.

28. **Manual receipt contact/consent provenance v1 - implemented 2026-07-15**

   Manual beneficiary delivery receipts now record the active contact/consent
   attestation that allowed the receipt to be created.

   Implementation note:

   - receipt creation still checks that the latest contact/consent status is
     `active_attestation`;
   - the receipt Trust Event now stores the active contact/consent status,
     satisfaction flag, contact/consent event id, contact channel, reference
     status, and consent basis;
   - tests prove a receipt created after a replacement attestation points to
     the replacement contact/consent event, not the withdrawn original;
   - the dashboard now shows that a manual receipt is backed by a specific
     contact/consent record.

   Boundary:

   - this does not store raw beneficiary phone numbers or email addresses;
   - this does not mean GSN sent the message;
   - this does not prove the beneficiary received or opened the link;
   - it makes the admin-stated manual receipt traceable to the consent/contact
     evidence that allowed it.

29. **Manual receipt correction v1 - implemented 2026-07-15**

   Manual beneficiary delivery receipts can now be corrected without deleting
   or rewriting the original receipt Trust Event.

   Implementation note:

   - correction uses a separate Trust Event:
     `community_domain.beneficiary_outcome_confirmation_delivery_receipt_corrected`;
   - the correction points to the original delivery receipt event and preserves
     the prior delivery status, channel, and consent basis;
   - beneficiary outcome listings expose the latest delivery receipt correction
     and correction count;
   - period summaries, sponsor summaries, and sponsor export copy now count
     manual delivery receipt corrections;
   - the dashboard lets an admin record a receipt correction and shows when the
     latest receipt has a correction attached.

   Boundary:

   - this does not erase the original manual receipt;
   - this does not prove whether the beneficiary received or opened the
     external message;
   - this does not connect WhatsApp, SMS, email, provider APIs, webhooks, or
     retry queues;
   - it prevents a wrong admin-stated receipt from remaining invisible in
     director or sponsor reporting.

30. **Current uncorrected manual receipt reporting v1 - implemented 2026-07-15**

   Director and sponsor summaries now separate manual receipt audit totals from
   manual receipts that remain current and uncorrected.

   Implementation note:

   - all manual delivery receipt Trust Events still count as recorded audit
     rows;
   - receipts with correction status `corrected`, `superseded`, or
     `under_review` are excluded from the current uncorrected receipt total;
   - `no_action` correction notes do not invalidate the receipt;
   - period summaries and sponsor summaries now expose current uncorrected
     receipt totals and current receipt breakdowns;
   - sponsor export copy now includes both manual receipts recorded and current
     uncorrected manual receipts;
   - the dashboard shows current receipts and receipt corrections separately
     from all manual receipt audit rows.

   Boundary:

   - this is not provider verification;
   - this still does not prove message delivery, receipt, or opening;
   - it only prevents corrected manual receipt evidence from looking like clean
     current delivery evidence in director or sponsor reporting.

31. **Out-of-period receipt correction awareness v1 - implemented 2026-07-15**

   Current uncorrected manual receipt counts now respect receipt corrections
   even when the correction event falls outside the selected reporting period.

   Implementation note:

   - period-bound correction counts still only count correction events inside
     the selected period;
   - current uncorrected receipt counts now look up the current correction state
     for the receipt rows being reported;
   - this means a July manual receipt corrected in August can still remain in
     July's audit total while no longer appearing as a current uncorrected
     receipt;
   - tests move a correction event outside the report period and prove the
     current uncorrected count remains zero.

   Boundary:

   - this does not change the historical period event count;
   - this does not rewrite old evidence;
   - it prevents stale period reports from presenting a later-corrected receipt
     as clean current delivery evidence.

32. **Blocked provider-send readiness check audit v1 - implemented 2026-07-15**

   When an admin presses the provider-send check before WhatsApp/SMS/email
   providers are connected, GSN now records a blocked readiness-check Trust
   Event instead of silently failing with no audit trace.

   Implementation note:

   - the route still returns `409 provider_delivery_not_connected`;
   - GSN still creates no provider job and sends no WhatsApp, SMS, or email;
   - the Trust Event is
     `community_domain.beneficiary_outcome_provider_send_blocked`;
   - the event records the delivery event id, readiness status, contact/consent
     status, provider setup status, and the fact that no external channel was
     sent by GSN;
   - period summaries and sponsor summaries count blocked provider-send
     readiness checks;
   - sponsor export copy includes the count as a governance/readiness fact.

   Boundary:

   - this is not a send attempt;
   - this is not provider delivery;
   - this is not a provider delivery receipt;
   - it only proves that an admin attempted to use the provider-send path and
     GSN refused safely because the provider stack is not connected.

33. **Per-outcome blocked provider-send visibility v1 - implemented 2026-07-15**

   Beneficiary outcome listing now exposes the blocked provider-send readiness
   check on the specific outcome where it happened.

   Implementation note:

   - each admin-visible beneficiary outcome row now includes
     `provider_send_blocked_check_count`;
   - each row also includes `latest_provider_send_blocked_check` when one
     exists;
   - the dashboard reloads recent beneficiary outcome rows after a blocked
     provider-send check;
   - the dashboard shows the latest blocked provider check beside the delivery
     trail for that outcome.

   Boundary:

   - this still does not send WhatsApp, SMS, or email;
   - this still does not create a provider job or provider delivery receipt;
   - it only prevents a blocked provider check from becoming hidden inside
     aggregate reports when the admin is looking at the affected outcome.

34. **Blocked provider-send duplicate inflation guard v1 - implemented 2026-07-15**

   Repeated provider-send checks under the same blocked readiness state now
   reuse the same blocked-check Trust Event instead of inflating evidence
   counts.

   Implementation note:

   - the blocked provider-send route now uses a Trust Event `dedupe_key`;
   - the dedupe key includes the Community Domain id, outcome event id,
     delivery event id, provider readiness status, provider engine status,
     active contact/consent status, active contact/consent event id, and latest
     contact/consent withdrawal event id;
   - pressing the same blocked provider-send check repeatedly under the same
     readiness state returns the same blocked-check event id;
   - if readiness state changes later, a new blocked-check event can still be
     recorded because it represents a different condition.

   Boundary:

   - this still does not send WhatsApp, SMS, or email;
   - this still does not create a provider job;
   - it only prevents button-click repetition from making director/sponsor
     reports look more active than the underlying reality.

35. **Blocked provider-send reuse label v1 - implemented 2026-07-15**

   Repeated blocked provider-send checks now explicitly say whether the blocked
   readiness-check Trust Event was newly created or reused.

   Implementation note:

   - the fail-closed provider-send route now returns `blocked_check_created`;
   - the route also returns `blocked_check_reused`;
   - the first blocked check under a readiness state returns created `true` and
     reused `false`;
   - repeated identical checks return created `false` and reused `true`;
   - the dashboard message now says when the existing blocked readiness-check
     Trust Event was reused.

   Boundary:

   - this does not change provider readiness;
   - this does not send WhatsApp, SMS, or email;
   - it only stops the admin-facing message from implying a fresh evidence
     record was created when the backend reused an existing blocked-check event.

36. **Blocked provider-send dedupe contact/consent evidence key v1 - implemented 2026-07-15**

   Blocked provider-send dedupe now follows the actual contact/consent evidence,
   not only the status label.

   Implementation note:

   - the blocked provider-send route extracts the latest contact/consent record
     id and latest withdrawal event id from the outcome contact/consent status;
   - those evidence ids are included in the blocked-check `dedupe_key`;
   - the blocked-check Trust Event metadata stores
     `active_contact_consent_event_id` and
     `latest_contact_consent_withdrawal_event_id`;
   - the blocked-check API response and per-outcome listing expose those ids;
   - repeated clicks under the same evidence state still reuse the same
     blocked-check Trust Event;
   - if the consent evidence changes, a new blocked-check record can be
     recorded, even if the broad provider status is still blocked.

   Why this matters:

   - a withdrawn-consent blocked check and an active-replacement-consent blocked
     check are not the same factual condition;
   - directors and sponsors can see that GSN still did not send externally, but
     the readiness context changed;
   - this keeps the count from being inflated by repeated clicks while avoiding
     the opposite lie of hiding changed evidence under an old reused event.

   Boundary:

   - this still does not send WhatsApp, SMS, or email;
   - this still does not create a provider job, retry queue, webhook, or
     provider delivery receipt;
   - it only makes the fail-closed evidence trail more exact.

37. **Provider delivery lift plan v1 - implemented 2026-07-16**

   Community Domains now have a standalone read-only provider delivery lift
   plan:

   ```text
   GET /community-domains/{community_domain_id}/provider-delivery-lift-plan
   ```

   What it does:

   - shows that provider delivery remains `blocked_manual_only`;
   - exposes the provider send engine, webhook, retry queue, contact preference,
     and consent enforcement statuses;
   - lists planned provider channels: WhatsApp, SMS, and email;
   - lists the missing components that must exist before GSN can honestly send
     externally;
   - gives admins aggregate counts for outcomes, prepared delivery packs,
     manual receipts, contact/consent records, withdrawals, and blocked
     provider-send checks;
   - hides admin-only aggregate counts from ordinary members;
   - rejects outsiders who are not active Community Domain members.

   Why this matters:

   - the admin can now see the future provider-delivery pathway without opening
     a specific beneficiary outcome first;
   - members can read the truth boundary without seeing private beneficiary
     evidence;
   - the system has a stable API surface for future frontend panels or provider
     setup work.

   Boundary:

   - this does not create provider jobs;
   - this does not send WhatsApp, SMS, or email;
   - this does not store raw destinations or provider credentials;
   - this does not create webhooks, retry queues, or verified provider receipts;
   - this does not expose private beneficiary records, move money, issue
     TrustSlips, or write Trust Passport entries.

38. **Provider destination readiness v1 - implemented 2026-07-16**

   Community Domains now have a standalone read-only provider destination
   readiness projection:

   ```text
   GET /community-domains/{community_domain_id}/provider-destination-readiness
   ```

   What it does:

   - shows that provider destination handling is still manual-attestation-only;
   - projects the destination storage, encryption, masking, provider binding,
     contact preference, and consent enforcement blockers;
   - gives admins aggregate counts for contact/consent records, withdrawals,
     active manual attestations, replacement-needed cases, channels, destination
     reference statuses, consent bases, and consent scopes;
   - hides admin-only aggregate counts and route hints from ordinary members;
   - rejects outsiders who are not active Community Domain members;
   - includes a storage contract for what must exist before GSN can honestly
     store or use WhatsApp/SMS/email destinations.

   Why this matters:

   - the system can now distinguish "we have an admin-stated contact/consent
     attestation" from "GSN has a provider-ready destination";
   - admins can see whether destination and consent evidence exists without
     exposing raw phone numbers, email addresses, or provider destination ids;
   - future provider work has a truth gate before anyone can claim GSN is ready
     to send externally.

   Boundary:

   - this does not create destination rows;
   - this does not store raw phone numbers or email addresses;
   - this does not expose private contact values;
   - this does not store provider contact ids or provider tokens;
   - this does not create provider jobs, webhooks, retry queues, send attempts,
     or verified provider receipts;
   - this does not send WhatsApp, SMS, or email;
   - this does not expose private beneficiary records, move money, issue
     TrustSlips, or write Trust Passport entries.

#### Outreach positioning

The outreach language should be:

```text
GSN helps your organization preserve the trust and value your community is
already creating, verify membership, record important activities, and prepare
evidence-based summaries for directors and sponsors.
```

It should not be:

```text
GSN automatically proves all impact without your organization recording the
underlying activities.
```

### Short verdict

The system is not fundamentally wrong, and the most important membership proof
route is now present.

The current backend already agrees with the final MVP on personal shops,
person-owned Trust Events, protected domain names, broad witness categories, and
domain membership rows. The public route can now answer the simple membership
question through `CommunityDomainMembership` when a protected Community Domain
key is used:

```text
Is this GSN ID currently a member of this protected Community Domain?
```

The remaining risk is different: do not let that membership proof silently
become trust, endorsement, shop ownership, sponsor impact proof, delivery proof,
or legal authority. Those still require their own scoped records and evidence.
