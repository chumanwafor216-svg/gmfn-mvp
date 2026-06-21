# App-Wide Audit Protocol

Last updated: 2026-06-12

## Purpose

This protocol defines the repeatable audit regime for checking GSN from the
first entry screen through every major domain. It turns page review into a
standard basket of questions instead of a one-off visual opinion.

Use this protocol before declaring a screen, route, lane, or domain polished.
It works with:

- `docs/PROJECT_PROTOCOL.md`
- `docs/UX_ACCEPTANCE_CHECKLIST.md`
- `docs/GSN_MOBILE_UI_PROTOCOL.md`
- `docs/GSN_PRODUCTION_POLISH_STANDARD.md`
- `docs/GUIDED_WORK_SURFACE_PROTOCOL.md`
- `docs/FREEZE_POLICY.md`

## Core Rule

Every page must answer one simple question:

```text
What should this user do here now?
```

If the page cannot answer that quickly, the page fails the audit even if the
code compiles and every button technically works.

## Audit Order

Audit the app domain by domain. Do not try to repair the whole app in one pass.

1. Entry and inflow: Cover to just before Dashboard.
2. Dashboard.
3. Community Home.
4. Marketplace.
5. Shop / Public Shop / Shop Control.
6. Finance.
7. Trust Passport / TrustSlip / verification.
8. Loans, repayment, support, and remaining operational routes.
9. Admin and oversight routes.

For each domain:

1. Map the routes and screens.
2. Identify the user type for each screen.
3. Run source auditors where they exist.
4. Patch the smallest visible and logical faults.
5. Run the route-local button-shell pass before calling the work testable.
6. Run the protected freeze band.
7. Ask for phone review only when the source checks and button shell are clean.
8. Add or tighten an audit guard before moving to the next domain.

This is a cage, not a permanent freeze. The goal is to protect progress while
still allowing deliberate improvement.

## Testable-First Button Protocol

No page, lane, or job is considered nearly finished if the product owner cannot
physically test it on a phone because buttons, fields, panels, or the viewport
jump around.

At the end of every meaningful UI slice, and before asking for owner phone
review, perform a button-shell pass on the affected route:

- every visible action uses the approved stable button/link/disclosure primitive
  or a route-local stable wrapper with a debug id;
- every visible action has fixed height, fixed hit area, no text wrap collapse,
  and no transition-driven movement;
- every native input/select/textarea has field-only tap metadata and does not
  register as an action root;
- parent surfaces around buttons and fields have stable box sizing, overflow
  control, and do not resize merely because a user taps, focuses, types,
  loads, disables, or succeeds;
- opening one job replaces or hides unrelated deep jobs instead of stacking all
  work surfaces into one long moving page;
- disabled or blocked states remain tappable where needed so the app explains
  what is missing instead of silently preventing review;
- the affected route has a route-local audit or an updated existing audit that
  cages the button count, debug ids, field count, and layout contract.

If the owner reports that a page is too jumpy to test, the next slice should be
button-shell stabilization for that page before adding new features. Do not
claim the feature is done merely because build, lint, and source audits pass.

## The Standard Audit Basket

Use these checks on every page or lane.

### 1. Route Purpose

Record:

- who the page is for;
- the page's one main job;
- the primary action;
- the secondary action;
- the next destination after success;
- the blocked, empty, loading, and pending states.

A page with three competing purposes must be split, collapsed, or guided.

### 2. User-Facing Language

All normal user copy must speak to the user, not to the builder.

Avoid exposed words such as:

- endpoint;
- payload;
- internal;
- test;
- MVP;
- module;
- configuration;
- protocol, unless the user is reading a real policy/evidence surface;
- settlement route, unless it is explained in plain language.

Prefer plain action language:

- Start here.
- Join your community.
- Add your payout account.
- Your community owner still needs to approve this.
- This is not ready yet.
- Try this first.

If the sentence sounds like it was written for the maker, it fails.

### 3. Action Honesty

A button must not promise more than it can do.

- `Send` must actually send or clearly open the user's own share app.
- `Verify` must show what is being verified.
- `Continue` must lead to a meaningful next step.
- `Copy` must copy useful real content, not placeholder data.
- Disabled actions must explain what is missing.
- Unready features must say they are unready instead of pretending.

### 4. Empty-State Truth

Empty, unfinished, or unconfigured data must look empty, unfinished, or
unconfigured.

Do not let placeholders look like official completed data.

Search for:

- default labels shown as real records;
- fake counts;
- fake `ready`, `valid`, or `complete` statuses;
- placeholder names such as `To be assigned`;
- copy/share actions that export placeholder data;
- active buttons when required data is missing.

### 5. Button Surface Count

On phone, visible action surfaces must stay calm.

- One primary action should be obvious.
- No more than three major buttons should be visible at once.
- Repeated actions should be grouped.
- If one button can open a chooser, do not expose three competing buttons.
- WhatsApp may stay separate only where it is the main real-life user action.

### 6. Tap Stability

Buttons must feel physically stable.

Check:

- fixed height;
- no text squeezing or one-letter stacks;
- no layout shift after tap, loading, disabled, or success state;
- no oversized icon pushing labels;
- no tiny tap target for a main action;
- no row that becomes wider than the phone screen.

### 7. Pre-Auth / Post-Auth Boundary

Before authentication or member entry is complete:

- no bottom navigation;
- no owner/admin tools;
- no internal dashboards;
- no protected user data;
- no heavy finance or trust workbench surface;
- no route that accidentally sends a user into Dashboard early.

The entry path must stay simple: arrive, understand, sign in, create, or join.

### 8. Permission Visibility

Every action must have an owner.

Classify visible actions by who may use them:

- visitor;
- new member;
- pending member;
- existing member;
- shop owner;
- community owner;
- admin.

Owner tools must not appear to visitors. Visitor contact actions may remain
visible when the product purpose requires them.

### 9. Data Source Truth

For every important visible value, know where it came from:

- backend;
- local storage;
- URL or search params;
- frontend computed state;
- mock/sample data;
- fallback placeholder.

Fallback placeholders must not trigger readiness, completion, official evidence,
or share/export behavior unless the UI clearly labels them as placeholders.

### 10. Mobile Density

Classify each phone surface:

- `Clear`: one purpose, readable, one next action.
- `Busy`: usable but too many visible choices.
- `Crowded`: needs grouping, collapse, or a chooser.
- `Misleading`: looks filled or official when it is not.
- `Weak`: too faint, soft, or low hierarchy.
- `Jumpy`: controls move, resize, or fight the user.

Do not call a page production-polished while it is busy, crowded, misleading,
weak, or jumpy.

### 11. Icon Meaning

Icons must help non-technical users understand faster.

Check:

- does the icon match the action;
- is it too decorative;
- does the same icon mean different things elsewhere;
- is a better GSN 3D icon available;
- does the icon still read clearly on a phone.

### 12. One-Step Recovery

When something is wrong, the page must tell the user:

- what is wrong;
- why it matters;
- what to do first.

Do not make a user open another page just to decode the problem.

### 13. Repetition And Naming

Look for the same idea under too many names.

Examples to audit carefully:

- Money Out / Withdrawal / Payout;
- Money In / Payment / Contribution;
- TrustSlip / Trust Detail / Verify;
- Shop / Public Shop / Marketplace;
- Rail / Bank / Settlement;
- Share / Copy / Invite / Send.

Some domain terms are necessary, but repeated names must not make the journey
feel more complex than it is.

### 14. End-To-End Path

Each screen group must pass at least:

- the happy path;
- the blocked path;
- the empty path;
- the pending path when applicable;
- the return/back path.

The user must not dead-end unless the page explains the exact blocker and first
safe next step.

### 15. Navigation And Return Path

When a user goes inside a page, lane, form, record, or task, there must be a
clear way to step back without restarting the whole domain.

Check for:

- visible back or close controls inside deep panels;
- return to lane chooser;
- return to previous step in multi-step flows;
- preserved context after closing a detail;
- no requirement to return to the original page just to move one step back.

Browser back may exist, but it is not enough for guided work surfaces. The app
must provide an in-page way to back out of the current task when the journey has
multiple internal steps.

### 16. Focused Task Behavior

When a particular task starts, other heavy tasks must step back until the active
task is concluded, paused, or closed.

The app should behave deterministically:

- one active task at a time;
- old task panels close or collapse;
- new task panel owns the current decision;
- competing sections do not stay stacked above or below;
- the current step, state, and next action stay visible.

This is the app-wide version of the Guided Work Surface rule.

### 17. Action Response And Journey Continuation

Every meaningful action must speak back to the user.

After a successful action, the app should show one of:

- saved;
- copied;
- sent/opened in the user's chosen app;
- submitted;
- completed;
- transferred;
- request received;
- ready for the next step.

After a blocked action, the app should show:

- what blocked it;
- what is missing;
- the first safe next action.

After completion, the user should be led along the journey. Do not leave them
wondering whether the tap worked or what should happen next.

### 18. Cage And Regression Guard

Each domain polish pass should leave a guard behind.

Useful guards include:

- route exists;
- primary action exists;
- stable debug ids remain;
- forbidden pre-auth nav is absent;
- owner-only actions are not visitor-facing;
- placeholders are not treated as real records;
- no raw/internal wording leaks into normal user surfaces;
- active-task replacement rules still hold;
- action response surfaces still exist.

Do not add noisy guards that break on harmless wording changes. Guard the
contracts that matter.

## App-Wide Line Auditor Targets

When adding static auditors, prefer small, practical scripts that check one
contract each.

Recommended recurring auditors:

- Entry polish auditor:
  - pre-dashboard pages exist;
  - no bottom nav before auth;
  - create and join paths stay distinct;
  - entry pages have stable actions and return paths.
- Copy and density auditor:
  - normal user surfaces do not expose banned builder words;
  - long copy is not on the first mobile surface;
  - obvious repeated labels are flagged.
- Navigation auditor:
  - deep task panels expose close/back/return controls;
  - large work surfaces can return to the lane chooser.
- Action response auditor:
  - major submit/copy/share/save actions produce visible success or blocker
    feedback.
- Placeholder truth auditor:
  - fallback values do not trigger ready/complete/export behavior.
- Permission visibility auditor:
  - owner/admin actions are not visible on visitor/member-only surfaces.

## Definition Of Done For A Domain Audit

A domain audit is done only when:

- the route map is understood;
- each screen has one clear job;
- actions are honest and stable;
- empty states tell the truth;
- internal language is removed from normal user surfaces;
- in-page return/back behavior is available for deep tasks;
- successful and blocked actions speak back to the user;
- one active task owns the page at a time;
- owner/admin/visitor visibility is respected;
- relevant auditors pass;
- protected freeze audits pass;
- the product owner has a clean phone-review path for the remaining human feel.

## Unabated Truth

This protocol will not replace real phone review. It is a cage for the faults a
script or source audit can catch, and a checklist for the faults a human eye
must judge. The phone review still decides whether a page feels calm, compact,
premium, and obvious.
