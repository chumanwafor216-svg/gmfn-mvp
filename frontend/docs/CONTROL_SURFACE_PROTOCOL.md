# Control Surface Protocol

## Product Rule

Buttons must feel still, tappable, and honest on phones.

The user should not have to chase a moving button, tap a dead button, or guess why a control did nothing.

## System Pattern

Use the shared tap target helpers in `src/styles/gmfnBrand.ts` for reusable controls:

- `brandStableTapTarget`
- `actionTapGuardProps`
- `brandActionButton`

Lane-specific colors are allowed, but the mechanical button behavior should stay shared.

## Stability Rules

- Give primary action buttons a stable `minHeight`.
- Use `boxSizing: "border-box"`.
- Keep buttons inside stable grids or rows.
- Allow text wrapping without changing the whole surrounding layout unexpectedly.
- Do not force five or more action buttons into one phone row. Use two-column tiles, horizontal scroll, or full-width rows so the visible button and tap area stay aligned.
- If a two-column phone tile has an icon and label, stack the icon above the label unless the label has enough horizontal room. Do not squeeze long labels beside icons.
- Put destructive or owner-critical phone actions such as `Hide`, `Delete`, `Restore`, `Post`, and `Save` on full-width rows. Do not leave them in tight wrapped clusters on mobile.
- Do not use hover/tap transforms that move buttons on mobile.
- Do not use transform/contain hacks on shared tap targets. They can create browser hit-test drift on some phones.
- Global CSS must keep interactive controls untransformed: `a`, `button`, `[role="button"]`, `summary`, and submit/button inputs should not use `translateZ(0)`, `scale`, or layout `contain` for tap stability.
- Do not render two competing mobile headers for one screen. If AppLayout owns the authenticated top bar, the page should not repeat the same Menu/Tools/title row underneath it.
- Do not swap a button for unrelated content during `preparing`, `saving`, `publishing`, or `blocked` states.
- If a button is blocked by a recoverable condition, keep it clickable and explain the blocker.

## Media Controls

Closed autoplay media can stay muted for mobile browser safety.

Opened media that should have sound must show an explicit audio action, such as `Sound on`, that unmutes and plays inside the user tap. After sound is active, the same surface must let the user turn sound off again without hunting through native video controls.

## Freeze Check

Before freezing Shop Gallery, Free Spotlight, Subscription Spotlight, or Vault, audit every primary button and picker against this protocol.
