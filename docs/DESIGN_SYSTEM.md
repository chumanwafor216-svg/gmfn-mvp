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

## Focused Action Protocol

When a user starts an action, the screen must reduce to that action.

- Make the current primary action obvious.
- Open the action controls only after the user taps the action.
- Hide or collapse unrelated sections while the action is active.
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
