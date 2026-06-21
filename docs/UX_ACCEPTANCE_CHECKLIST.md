# UX Acceptance Checklist

A screen is acceptable only if:

- It has one obvious primary action.
- It does not expose too many sections at once.
- It follows the Focused Action Protocol: when one action is active, unrelated
  sections step back until the choice or result is complete.
- Switching tasks replaces the old active task surface; old task surfaces do
  not remain stacked into a long page above or below the new task.
- It follows the Action Response Protocol: every meaningful action succeeds
  visibly, routes visibly, or explains why it cannot continue.
- It follows `docs/APP_WIDE_AUDIT_PROTOCOL.md`: each page has a clear route
  purpose, honest actions, truthful empty states, correct permission visibility,
  in-page return navigation for deep tasks, and a regression cage for the
  contract being polished.
- On mobile, it follows `docs/GSN_MOBILE_UI_PROTOCOL.md`: one screen shows one
  decision, the current state, and the next action without scrolling whenever
  possible.
- For production polish, it follows
  `docs/GSN_PRODUCTION_POLISH_STANDARD.md`: the first viewport, icon meaning,
  button stability, user-facing language, screenshot readiness, and evidence
  surface treatment must pass before the route is called complete.
- It uses the approved color system.
- Meaningful icons follow the GSN Icon Protocol: premium realistic 3D object
  icons, not flat, outline, faded, cartoon, or emoji-style primary icons.
- It uses consistent rounded cards.
- It uses enough spacing.
- It avoids long paragraphs.
- It has no bottom nav before login.
- It has clear empty states if data is missing.
- It uses approved screen names.
- It matches the reference mockup.
- It does not invent new product language.
- It does not expose private user data.
- It does not add unrelated features.

## Busy Page Test

If the screen feels like a long scroll of unrelated blocks, it fails.

## Mobile Two-Second Test

A mobile task page fails if a non-technical user cannot see these within two
seconds:

- what the page is;
- the current state;
- the next action.

The first mobile screen must not spend half the viewport on decoration, raw
links, policy text, logs, admin controls, or repeated explanation.

## Production Polish Gate

A route fails production polish if it is merely clear but still feels oversized,
heavy, improvised, unstable, or unfinished beside high-trust mobile products.

- The first phone viewport must show location, state, next action, and any
  important warning.
- The main action must be visually obvious, with secondary actions quieter.
- 3D icons must use the approved meaning system and light/near-white tiles by
  default.
- Buttons and action rows must keep stable dimensions across loading, disabled,
  hover, and active states.
- Text must be short, direct, and user-facing; backend or protocol words must
  not leak into ordinary user surfaces.
- Shared/exportable evidence screens must look like official GSN documents with
  watermark or brand mark, title, identity block, generated time, verification
  reference, limitation statement, and footer.

## Mobile Density Test

- Hero blocks should normally stay between `96px` and `140px`.
- Collapsed task cards should normally stay between `88px` and `110px`.
- Expanded task panels should stay within `70vh` before splitting into tabs,
  drawers, or Screen A / Screen B packages.
- Short facts must use chips or two-column mini cards.
- No more than three major buttons should be visible at once.
- Long explanation, raw URLs, admin-only actions, and audit trails should be
  collapsed by default.

## One-Screen Snapshot Test

Identity, evidence, receipt, link, and verification snapshots must be able to fit
one complete record into a 390x844 phone screenshot when the snapshot itself is
the intended information unit.

- The title, required facts, status signals, and primary action should be
  visible without scrolling inside that snapshot.
- Use short labels, compact rows/chips, and premium realistic 3D object icons.
- Verification photos and official marks must not cover each other; the person,
  ID, or evidence item being shown must remain visible.
- The snapshot must include the next completion or verification action when it
  shows an incomplete status.
- Completion actions must open a real task route, form, chooser, or explicit
  pending-route response. They must not send a user to explanation-only copy
  while implying the check can be completed there.
- A screenshot/PDF/export should start and end on the snapshot package, not
  depend on neighboring page sections for context.
- Do not use tall decorative cards, large repeated dividers, or explanatory
  paragraphs inside the snapshot.
- Text must stay readable and must not split into one-letter stacks.

## Guided Work Surface Test

Marketplace, Finance, Trust Passport, Loans & Support, Shop Control, and other
large operational pages must pass the guided-work-surface test:

- The first screen shows context and no more than three to five major lanes.
- One lane becomes the main visible work area after the user opens it.
- Unrelated lanes leave the active work area while the active lane is being
  handled.
- Deep records, manuals, route tools, and secondary choices are not all exposed
  at once.
- Every lane button routes, reveals, or explains in place.
- The user can return to the lane chooser without losing the page context.

If a large work surface asks a non-technical user to decode many equal choices
at once, it fails even if every individual button technically works.

## In-Page Navigation Test

When a user opens a lane, form, detail, record, chooser, or deep task, the page
must provide an obvious way to step back, close the task, or return to the lane
chooser without restarting the whole domain.

Browser back alone is not enough for guided task surfaces.

## Action Response Test

Every meaningful action must speak back to the user. A save, copy, share,
submit, transfer, request, or completion must show a visible success,
destination, or blocker response and lead the user to the next safe step.

## Dashboard Test

Dashboard must feel like a command centre, not a dumping ground.

## Community Home Test

Community Home must not expose all owner tools.

## Sign-Up Test

New members must choose:
- Create Community
- Join Request Membership

After completion, they return to Existing Member Sign In.
