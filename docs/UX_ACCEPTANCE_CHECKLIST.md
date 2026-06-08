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
- It uses the approved color system.
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

## One-Screen Snapshot Test

Identity, proof, receipt, link, and verification snapshots must be able to fit
one complete record into a 390x844 phone screenshot when the snapshot itself is
the intended information unit.

- The title, required facts, status signals, and primary action should be
  visible without scrolling inside that snapshot.
- Use short labels, compact rows/chips, and SVG pictograms.
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

## Dashboard Test

Dashboard must feel like a command centre, not a dumping ground.

## Community Home Test

Community Home must not expose all owner tools.

## Sign-Up Test

New members must choose:
- Create Community
- Join Request Membership

After completion, they return to Existing Member Sign In.
