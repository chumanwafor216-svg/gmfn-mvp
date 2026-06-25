# GSN Present-Style Mobile Benchmark

Date recorded: 2026-06-25

## Why This Exists

The product owner identified that the PRESENT mobile shell feels materially
easier in hand than the current GSN shell: the bottom navigation feels like one
clear touch layer, the screen does not fight the user, and the first visible
surface reads more like a finished phone product than an operational dashboard.

This file records the transferable lesson for GSN before implementation begins.
It is not permission to copy PRESENT's product model, data claims, relationship
language, or screen content. It is a benchmark for mobile interaction quality,
navigation calm, and first-screen clarity.

## The Core Lesson

The strongest improvement is not only anti-jump button code. GSN already has
strong tap-stability guards.

The deeper PRESENT lesson is product structure:

- the bottom rail acts as a small set of stable mental anchors;
- secondary tools open inside the current flow instead of crowding the bottom
  navigation;
- the first phone viewport shows one current state and one next action;
- pages do not expose every tool, route, warning, and explanation at once;
- shell chrome is compact enough that the product content owns the screen;
- button stability supports the experience, but mental simplicity creates the
  feeling of ease.

## GSN Target

GSN should move toward five calm authenticated anchors:

- Dashboard
- Community
- Marketplace
- Shop
- Profile

This does not mean deleting Finance, Loans, Trust, Identity, Admin, Shop
Control, Vault, or Notifications. Those are real product domains and tools.
It means they should be reached as contextual in-flow tasks, page tools, compact
rows, drawers, or focused-task routes unless the product owner intentionally
promotes one into the main rail.

## What To Preserve

GSN is not PRESENT. GSN must preserve:

- GSN / Global Support Network branding on user-facing surfaces;
- community-first structure;
- marketplace, finance, trust, borrowing, and shop ownership boundaries;
- backend-owned permission and business rules;
- no bottom navigation before authentication;
- Dashboard Market Wisdom frozen presentation;
- existing route contracts unless a change is explicitly approved;
- action traceability, stable debug ids, and mobile tap guard behavior.

## What To Change First

Start with structure, not decoration:

1. Audit the authenticated mobile shell and bottom rail.
2. Identify which current bottom items are primary anchors and which are deeper
   tasks.
3. Keep the current caged tap-stability system intact.
4. Pick one non-frozen or least-risk route to make Present-style:
   one primary action, one current state, secondary actions grouped.
5. Run route-local audits plus the protected button freeze before and after.
6. Only change global bottom navigation after the route-local pattern proves
   itself and the matching audit updates are ready.

## Freeze Position

We do not need to unfreeze everything to begin.

Safe starting work:

- documentation;
- route-local visual simplification;
- route-local lane grouping;
- route-local button-shell cleanup;
- audits that measure the current structure.

High-risk work requiring intentional audit/freeze updates:

- changing `frontend/src/layout/AppLayout.tsx` bottom rail item count;
- changing protected Dashboard, Community Home, Shop Control, Notifications, or
  entry/auth action counts;
- changing mobile shell controls;
- changing shared tap-guard behavior;
- changing route contracts or backend state rules.

## Acceptance Standard

A GSN page is moving toward this benchmark when:

- the user can tell where they are in two seconds;
- the first phone viewport shows current state and next action;
- no more than one dominant action competes for attention;
- secondary actions are grouped, collapsed, or placed in a focused task area;
- bottom navigation feels like stable orientation, not a list of every product
  subsystem;
- buttons and fields do not move, resize, fall through, or fight the user's tap;
- every blocked action explains what is wrong, why it matters, and the first
  thing to do.

## Devil's-Advocate Truth

If GSN only changes colors, icons, or button shapes, it will still feel heavier
than PRESENT.

If GSN only changes the bottom rail without reducing page density, it may look
simpler while still feeling difficult.

If GSN hides real finance, trust, shop, or support responsibilities too deeply,
it will become pretty but less useful.

The correct path is staged: prove the calmer structure route by route, protect
the existing tap-stability cages, then simplify global navigation intentionally.
