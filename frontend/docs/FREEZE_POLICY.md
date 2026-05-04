# Freeze Policy

## Meaning of Frozen

A frozen lane is not a promise that no bug can ever exist. It means the current product rule, route contract, and interaction model have been recorded and should not be changed casually.

## Before Marking a Lane Frozen

Run this checklist:

1. Read the active lane protocol and handoff notes.
2. Confirm the route and screen ownership.
3. Remove duplicate or conflicting surfaces.
4. Confirm all primary buttons remain clickable and explain blocked states.
5. Confirm file pickers use the approved native picker pattern.
6. Confirm media display works on the public viewer route.
7. Run `npm run build`.
8. Record remaining risks clearly in the freeze file.

## Button Rule

Frozen lanes must use shared stable tap-target behavior where possible. Buttons should not resize or move when copy changes from ready, saving, preparing, publishing, or blocked states.

For recoverable blocked states, prefer a clickable button that explains the blocker over a dead disabled control.

## Change Rule

After a lane is frozen, do not mix another lane into it unless the product owner explicitly reopens the lane.
