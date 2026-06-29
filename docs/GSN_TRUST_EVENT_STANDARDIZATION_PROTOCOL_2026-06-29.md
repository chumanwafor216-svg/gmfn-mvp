# GSN Trust Event Standardization Protocol

## Status

Protocol-level architecture decision adopted on 2026-06-29.

This document is a product and engineering standard for future Trust Event,
Trust Passport, TrustSlip, Community Domain, and later Committee work.

Unabated truth: this protocol is research-aligned, not yet peer-reviewed as the
specific GSN framework. It is grounded in established work on social capital,
institutional governance, organizational citizenship behavior, reputation
systems, and trust formation, but GSN must validate the exact model through
pilots, evidence, and later formal review.

## Core Principle

GSN must standardize the meaning of trust evidence without forcing every
community to behave the same way.

Schools, churches, markets, unions, hospitals, cooperatives, family groups,
committees, associations, and Community Domains must be able to define their
own local activities. Every official Trust Event, however, must map into a
small, stable, universal evidence vocabulary.

The rule is:

```text
Local activity language stays local.
Trust evidence structure stays universal.
```

This protects both things GSN needs:

- local identity and autonomy;
- one portable Trust Passport and TrustSlip evidence model.

## Terminology Decision

GSN now has a sharper product distinction to build toward.

### Committee

`Committee` is the future product language for the lightweight, self-created,
invite-based group layer.

It covers ordinary member-created groups that are not yet institutional,
purchased, verified, or governed as a formal body.

Examples:

- a member-created savings circle;
- a family project group;
- a small informal working group;
- an early local group created by one person;
- a simple invite-only committee without institutional governance.

Current implementation note:

- existing code and routes still use `Community`, `Clan`, and membership
  terminology in many places;
- do not rename backend models, routes, or contracts casually;
- migration from lightweight `Community` language to `Committee` language needs
  a separate schema, route, UX, and compatibility plan.

### Community Domain

`Community Domain` is the organized, institutional, paid or claimed operating
space for real-world bodies.

It covers churches, schools, unions, markets, cooperatives, associations,
town unions, professional bodies, diaspora organizations, parent-teacher
structures, hospitals, branches, departments, chapters, and similar organized
groups.

The Community Domain is the real organized community layer. It may carry domain
ownership, identity, governance, billing, hierarchy, verification, analytics,
and trust infrastructure.

The current workstream remains:

```text
Finish Community Domain first.
Then apply this Trust Event protocol to Community Domain settings.
Then extend the same protocol to the lightweight Committee layer.
```

## Research-Aligned Foundation

The protocol should be described as research-aligned, not as already proven
under the GSN name.

The foundation is:

- social capital: communities create value through relationships, norms,
  reciprocity, and repeated participation;
- institutional governance: durable institutions need boundaries, rules,
  monitoring, local legitimacy, and conflict resolution;
- organizational behavior: participation, support, responsibility,
  contribution, learning, and leadership are meaningful observable behaviors;
- reputation systems: reputation becomes useful when it is based on recorded
  past behavior rather than unverifiable claims;
- trust research: trustworthiness is inferred from repeated evidence, context,
  and provenance.

Engineering implication:

```text
Record evidence first.
Summarize evidence carefully.
Do not invent complex scoring before the evidence ontology is clean.
```

## Three-Layer Trust Event Model

### Layer 1 - Universal Evidence Dimensions

These dimensions are fixed by GSN and should not be casually edited by
Community Domain admins.

Seed dimensions:

| Code | Name | Meaning |
| --- | --- | --- |
| `participation` | Participation | The person showed up or took part in a recognized community activity. |
| `contribution` | Contribution | The person added value, labour, knowledge, money, service, goods, or effort. |
| `responsibility` | Responsibility | The person accepted or carried a duty, role, obligation, or stewardship position. |
| `reliability` | Reliability | The person fulfilled a promise, duty, repayment, attendance pattern, delivery, or commitment. |
| `support` | Support | The person helped, vouched for, mentored, cared for, guaranteed, or stood with others. |
| `leadership` | Leadership | The person coordinated, represented, organized, governed, supervised, or guided others. |
| `learning_development` | Learning and Development | The person completed training, gained skills, passed a milestone, or improved capability. |
| `recognition` | Recognition | The community formally acknowledged, certified, awarded, endorsed, or commended a contribution. |

Important distinction:

- `reliability` is preferred over `commitment` because trust should record
  fulfilled behavior, not only intention;
- `recognition` is an acknowledgement/evidence dimension, not a free claim.

### Layer 2 - Community Domain Activity Catalogue

Each Community Domain can define its own official activity types.

Examples:

| Domain | Activity | Universal mappings |
| --- | --- | --- |
| School | Served as prefect | Leadership, Responsibility, Participation |
| Church | Visited sick member | Support, Contribution, Participation |
| Market | Repaid supplier | Reliability, Responsibility |
| Union | Paid dues | Reliability, Contribution, Participation |
| Hospital | Mentored junior staff | Support, Leadership, Learning and Development |
| Cultural association | Organized New Yam Festival | Leadership, Contribution, Participation, Recognition |

The activity name stays local. The mapping makes it portable.

### Layer 3 - Derived Trust Attributes

Derived attributes must not be typed manually by users.

They should be computed later from approved evidence.

Examples:

- reliability;
- consistency;
- supportiveness;
- leadership strength;
- community engagement;
- contribution history;
- cross-community trust depth;
- trust diversity;
- trust velocity.

MVP must not start with these scores. MVP starts with structured evidence.

## Data Model Standard

Do not store random trust text as the source of truth.

The target architecture is:

```text
Community Domain
  -> Activity Catalogue
  -> Community Activity Type
  -> Universal Evidence Dimension
  -> Trust Event
  -> Trust Passport
  -> TrustSlip
```

### UniversalEvidenceDimension

Recommended fields:

- `id`
- `code`
- `name`
- `description`
- `is_active`
- `created_at`

### CommunityActivityType

Recommended fields:

- `id`
- `community_domain_id`
- `code`
- `name`
- `description`
- `primary_dimension_id`
- `requires_approval`
- `evidence_required`
- `created_by_user_id`
- `created_at`
- `is_active`

Use a join table for multi-dimension mapping:

### CommunityActivityTypeDimension

Recommended fields:

- `activity_type_id`
- `dimension_id`
- `is_primary`

### TrustEvent

Recommended fields for the standardized Trust Event layer:

- `id`
- `subject_user_id`
- `community_domain_id`
- `activity_type_id`
- `dimension_ids`
- `title`
- `description`
- `evidence_status`
- `approval_status`
- `recorded_by_user_id`
- `approved_by_user_id`
- `occurred_at`
- `created_at`
- `provenance`

Allowed approval states:

- `pending`
- `approved`
- `rejected`
- `withdrawn`

Provenance must record:

- who recorded the event;
- who approved it, if approval was required;
- under which Community Domain authority it was approved;
- whether evidence was attached;
- whether the event is member-submitted, admin-recorded, or system-generated.

## Admin Workflow

Community Domain admins should be able to:

1. Open Community Domain settings.
2. Open Trust Event Setup.
3. Create activity types.
4. Map each activity type to one or more universal evidence dimensions.
5. Choose whether evidence is required.
6. Choose whether approval is required.
7. Save the activity type.

Members should not create official activity types unless a Community Domain
policy explicitly grants that permission.

## Member Workflow

A member or admin records a Trust Event:

1. Select Community Domain.
2. Select activity type.
3. Add a short description.
4. Attach evidence if required.
5. Submit.
6. If approval is required, the event becomes pending.
7. Admin approves, rejects, or requests correction through the approved
   governance path.
8. Approved events enter Trust Passport evidence.

## Trust Passport Rule

Trust Passport must not become a loose list of claims.

Every approved Trust Event shown in Trust Passport must carry:

- community source;
- activity type;
- universal evidence dimension;
- date or occurrence period;
- approval status;
- evidence status;
- provenance;
- privacy boundary.

## TrustSlip Rule

TrustSlip should summarize relevant Trust Events by purpose and dimension.

Examples:

For a merchant decision, TrustSlip may show:

- reliability events;
- responsibility events;
- support or guarantee evidence;
- verification and community backing.

For a leadership decision, TrustSlip may show:

- leadership events;
- contribution events;
- recognition events;
- support events.

TrustSlip must remain evidence support for judgement, not an automatic
approval, credit decision, or guarantee.

## MVP Scope

For MVP, build only:

- universal evidence dimension seed table;
- Community Domain activity type creation;
- activity-to-dimension mapping;
- Trust Event submission;
- evidence-required flag;
- approval workflow;
- Trust Passport event display;
- dimension summary counts;
- TrustSlip category filtering.

Do not build in MVP:

- reliability score;
- leadership score;
- community ranking;
- cross-community scoring;
- automatic opportunity approval;
- hidden risk score.

## Coder Rules

1. Do not build separate trust engines for schools, churches, markets, unions,
   hospitals, cooperatives, families, and committees.
2. Build one Trust Event engine.
3. Let each Community Domain define its own activity catalogue.
4. Every official approved event must map to at least one universal evidence
   dimension.
5. Trust Passport displays approved structured evidence.
6. TrustSlip filters evidence by decision context.
7. Do not turn counts into complex scores before the evidence layer is clean.
8. Do not present a Trust Event count as a credit score, guarantee, approval,
   or universal moral judgement.
9. Keep Community Domain as the current build priority until its operating
   engine is complete enough for pilot use.
10. Extend the same ontology to the future Committee layer only after the
    Community Domain path is coherent.

## Frozen Sentence

GSN standardizes trust evidence through universal behavioral dimensions while
allowing every Community Domain to define its own local activity catalogue.
Trust becomes portable because the underlying evidence is structured,
approved, provenance-backed, and mapped into a shared language without erasing
local community identity.

