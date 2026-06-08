# Guided Work Surface Protocol

## Purpose

GSN is built for people who may be underbanked, unbanked, busy, cautious, or not
technical. Large work surfaces must guide people through one clear lane at a
time. They must not expose every possible tool and ask the user to decode the
system.

This protocol applies especially to:

- Marketplace
- Finance
- Trust Passport
- TrustSlip when it becomes a decision workspace
- Loans & Support
- Shop Control
- any future page that contains multiple operational domains

## Core Rule

A large work surface must behave like a guided desk:

```text
You are here.
This is the current context.
Choose one major lane.
Open that lane.
Finish, pause, or back out.
Then choose another lane.
```

It must not behave like:

```text
Here are all possible tools, records, shortcuts, explanations, and deep actions
at once. Good luck.
```

## Front Door Rule

The first visible screen of a large work surface should show:

1. the current identity/context;
2. one plain explanation of what this place is for;
3. three to five major lanes at most;
4. one obvious next action or lane recommendation when the system can infer it.

Secondary tools may exist, but they must be collapsed, grouped, or opened only
after a clear lane choice.

## One-Lane Rule

When a user opens one lane:

- the opened lane becomes the main visible work area;
- unrelated lanes step back by leaving the active work area, not by stacking
  above or below the newly opened lane;
- buttons inside that lane must route, reveal, or explain in place;
- the page must not keep competing deep sections visually fighting the active
  lane;
- the user must always have a clear way to return to the lane chooser.

## Active Task Replacement Rule

When a user starts or switches to a task, the new task should replace the old
active task surface.

The page must not grow into a continuous long list of previously opened tasks.
Old task surfaces should close, hide, or return to a compact lane chooser state
until the user intentionally reopens them.

The active task area must carry the conversation with the user:

- what is happening now;
- whether the last action succeeded or failed;
- why it matters;
- what to do next;
- what not to do next when a step would be unsafe, incomplete, or premature.

A task is not complete just because a button was tapped. It is complete only
when the system has either routed the user to the promised next place, saved the
work, shown a clear success state, or explained the blocker and the first safe
next step.

## Responsibility Rule

Do not move a core responsibility away from its rightful domain just to make a
page shorter. Instead, reduce what is exposed at once.

Examples:

- Marketplace still owns one selected community's Money Pool, ROSCA, Support
  Request, Trusted Trade, Demand, and marketplace-owned links.
- Finance still owns the member's cumulative money story across communities.
- Trust Passport still owns the member's fuller trust/evidence story.
- Dashboard still reflects and launches; it does not become the workshop.
- Community Home still indexes communities and cross-community owner context; it
  does not become the full operating workspace for one marketplace.

## Marketplace Application

Marketplace is the operating desk for one selected community.

Its first repair sequence should protect these major lanes first:

1. Money Pool
2. ROSCA
3. Support Request
4. Trusted Trade

ROSCA must not assume every community member belongs to every ROSCA cycle. A
single community may have multiple ROSCA cycles at the same time. Each cycle
must be identifiable and member-scoped:

- cycle name;
- contribution amount;
- currency;
- duration/frequency such as daily, weekly, monthly, yearly, or custom days;
- selected cycle members from the current community membership;
- saved/copyable cycle record.

A member may belong to more than one ROSCA cycle inside the same community. Any
cycle alert, reminder, or action should target the selected members of that
cycle, not the whole community by default.

Trust can remain visible as a compact status signal, but it should not compete
with the four main work lanes unless the user explicitly opens the trust detail.

Inside Marketplace, stabilize one lane at a time:

1. map the outside launcher;
2. map the target section/hash/open state;
3. map every inner button and field;
4. replace weak symbolic marks with stable real-life pictograms for that lane;
5. add or tighten a lane-specific audit;
6. run the protected freeze band;
7. run Marketplace audits;
8. phone-test the lane before moving to the next one.

## Finance Application

Finance must not expose every record and money route as equal first-screen
choices.

Finance should guide through major lanes such as:

- Money Summary
- Money In
- Money Out
- Banking Rails
- Records / Events
- Signals / Readiness

Only one finance lane should be expanded as the active work area. Cumulative
summary belongs at the front. Deep records and route tools belong behind lane
choices.

## Trust Passport Application

Trust Passport must not expose the whole evidence universe at once.

Trust Passport should guide through major lanes such as:

- Current Trust Standing
- Evidence Story
- Community Confirmation
- Finance Discipline
- Documents / TrustSlip
- Repair or Next Step

Only one trust lane should be expanded as the active work area. The user should
first understand what GSN says about their trust story, then open supporting
evidence only when needed.

## Audit Requirement

Before changing a large work surface, create or update a responsibility map that
answers:

- What must this page own?
- What should this page only summarize?
- What should this page only link to?
- What should be hidden until a lane opens?
- Which lane is being changed in this pass?
- Which protected pages must not be disturbed?

For Marketplace work, always run:

```bash
npm --prefix frontend run audit:protected-button-freeze
npm --prefix frontend run audit:marketplace-button-inventory
npm --prefix frontend run audit:marketplace-button-lines
npm --prefix frontend run audit:marketplace-actions
```

For Money Pool lane work, also run:

```bash
npm --prefix frontend run audit:marketplace-money-pool-lane
```

For ROSCA lane work, also run:

```bash
npm --prefix frontend run audit:marketplace-rosca-lane
```

For Support Requests lane work, also run:

```bash
npm --prefix frontend run audit:marketplace-support-lane
```

For Trusted Trade lane work, also run:

```bash
npm --prefix frontend run audit:marketplace-trusted-trade-lane
```

For Records & Links lane work, also run:

```bash
npm --prefix frontend run audit:marketplace-records-links-lane
```

For More / Community Tools lane work, also run:

```bash
npm --prefix frontend run audit:marketplace-more-tools-lane
```

For Marketplace compact Trust pill work, also run:

```bash
npm --prefix frontend run audit:marketplace-trust-pill
```

For Demand Box placement inside Marketplace work, also run:

```bash
npm --prefix frontend run audit:marketplace-demand-box-lane
```

For Marketplace front package closeout before asking the product owner to
phone-check or switch to another page, also run:

```bash
npm --prefix frontend run audit:marketplace-front-package
```

For Finance and Trust Passport work, add or tighten equivalent lane-level audits
before doing broad visual or interaction changes.

For Trust Passport front package work, also run:

```bash
npm --prefix frontend run audit:trust-passport-front-package
npm --prefix frontend run audit:trust-passport-button-inventory
```

For Trust Passport lane map work, also run:

```bash
npm --prefix frontend run audit:trust-passport-lane-map
```

For Trust Passport Evidence Story lane work, also run:

```bash
npm --prefix frontend run audit:trust-passport-evidence-story-lane
```

For Trust Passport Repair or Next Step lane work, also run:

```bash
npm --prefix frontend run audit:trust-passport-repair-lane
```

For Finance front package work, also run:

```bash
npm --prefix frontend run audit:finance-front-package
npm --prefix frontend run audit:finance-lane-map
```

For Finance Money Summary lane work, also run:

```bash
npm --prefix frontend run audit:finance-money-summary-lane
```

For Finance Money In / Money Out lane work, also run:

```bash
npm --prefix frontend run audit:finance-money-movement-lanes
```

For Finance Banking Rails lane work, also run:

```bash
npm --prefix frontend run audit:finance-banking-rails-lane
```

For Finance Signals / Readiness lane work, also run:

```bash
npm --prefix frontend run audit:finance-signals-readiness-lane
```

For Finance Records / Events lane work, also run:

```bash
npm --prefix frontend run audit:finance-records-events-lane
```

For Finance secondary route tool work, also run:

```bash
npm --prefix frontend run audit:finance-secondary-route-tools
```

## Current Truth

This protocol is a product safety rule. It does not claim current Marketplace,
Finance, or Trust Passport screens already satisfy it. It records the direction:
make big pages simpler by guiding one lane at a time, not by dumping all choices
onto users.
