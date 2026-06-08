# GSN Design System

## Visual Mood

Premium trust infrastructure.

The app should feel like:
- secure banking
- civic trust
- community command centre
- calm verified network

It should not feel like:
- a social media feed
- a noisy marketplace
- a government form
- a cheap dashboard
- a dating app
- a crowded admin panel

## Colors

Primary navy:

```text
#061827
#08233A
#0B2D4A
```

Gold accent:

```text
#D6AA45
#F2C766
```

White card:

```text
#FFFFFF
#F7FAFF
```

Soft blue card:

```text
#EAF3FF
#F1F7FF
```

Text dark:

```text
#07172C
```

Muted text:

```text
#617085
```

Success green:

```text
#2E9B62
```

Warning red:

```text
#C83A3A
```

## Spacing

Use generous spacing.

- screen padding: 20-24
- card padding: 18-24
- section gap: 16-24
- button height: 54-64

## Cards

Cards should use:
- border radius: 22-32
- soft shadow
- thin border
- large internal spacing

## Buttons

Primary button:
- dark navy or gold
- large rounded shape
- one clear label
- labels must keep whole words intact; do not split words into stacked letter
  fragments to force text into a small button

Secondary button:
- white or transparent
- bordered
- less visual weight

## Typography

Page title:
- large
- bold
- calm

Section title:
- clear
- bold

Body:
- short
- never use long paragraphs when a card can explain it

## UX Law

One screen should never feel like seven screens stacked together.

Collapse, group, or move deeper content to its own page.

For phone layouts, `docs/GSN_MOBILE_UI_PROTOCOL.md` is the density and
screenshot-readiness source of truth. Mobile task pages must show one decision,
one current state, and one next action before exposing deeper details.

## Mobile Density Protocol

- Mobile hero blocks should normally stay between `96px` and `140px`, or about
  `18%` of the viewport height.
- Collapsed mobile cards should normally stay between `88px` and `110px`.
- Expanded task panels should stay within `70vh`; longer processes must split
  into internal tabs, drawers, or explicit Screen A / Screen B packages.
- Button height should normally stay between `48px` and `56px`.
- Chip height should normally stay between `32px` and `36px`.
- Icon tiles should normally stay between `40px` and `48px`.
- Short facts such as status, count, readiness, ID, amount, route state, and
  approvals belong in compact chips or two-column mini cards, not one tall
  full-width block.
- No more than three major buttons should be visible at once. Additional
  actions belong in a drawer, advanced area, or compact two-column action row.
- Raw URLs, logs, repeated explanation, policy text, and admin-only controls
  stay hidden until the user opens advanced details.

## One-Screen Snapshot Protocol

Some surfaces are meant to communicate one complete record in one screenshot,
not to behave like a scroll document.

Use this protocol for compact identity, proof, receipt, link, and verification
snapshots:

- target a 390x844 phone viewport first
- fit the snapshot card from title to primary action without internal scrolling
- keep one title, one short subtitle, the minimum facts, status chips, and one
  primary action
- remove decorative height, oversized badges, repeated dividers, and explanatory
  paragraphs
- use compact SVG pictograms instead of emoji-style marks
- keep verification photos, IDs, seals, and names unobstructed; badges may sit
  beside or dock on an edge, but must not cover the evidence being shown
- keep long IDs readable with whole-word wrapping only; do not split labels into
  one-letter fragments
- if all facts cannot fit, shorten labels before hiding data
- keep the snapshot as its own portable package boundary: screenshot, PDF, or
  shared proof should not need unrelated page content above or below to feel
  complete
- if a status says something is incomplete, include a clear route or action to
  continue that completion work from the snapshot package
- if the record cannot fit as one package, split it into explicit `Page 1`,
  `Page 2` packages instead of letting one card bleed into the next section
- deeper explanation belongs below the snapshot or behind a lane/action

## Focused Action Protocol

When a user starts an action, the screen must reduce to that action.

- Make the current primary action obvious.
- Open the action controls only after the user taps the action.
- Hide or collapse unrelated sections while the action is active.
- When the user switches tasks, the new task replaces the old active task
  surface. Do not keep old task surfaces stacked above or below the new one.
- After the user chooses an option or receives the action result, close the
  temporary action surface and reveal the next relevant section.
- Do not expose every possible block at once just because it belongs to the
  workflow.

## Action Response Protocol

Every meaningful user action must answer.

- If the action succeeds, show a clear success response or move the user to the
  promised next screen.
- If the action cannot continue, explain what is missing, why it matters, and
  the first thing to do next.
- The response should appear in the same visible action area whenever possible.
- Do not write an error or success message into a hidden panel.
- Do not let a button quietly do nothing.
- Do not call an action complete until the user can see the result, the blocker,
  or the next safe step.
