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

For production polish, `docs/GSN_PRODUCTION_POLISH_STANDARD.md` is the quality
gate. Use it before calling a route screenshot-ready, before widening the 3D
icon sweep to another page, before treating an evidence/PDF surface as official, and
before changing protocol-status items from `partial` to `complete`.

## Mobile Density Protocol

- Mobile hero blocks should normally stay between `96px` and `140px`, or about
  `18%` of the viewport height.
- Collapsed mobile cards should normally stay between `88px` and `110px`.
- Expanded task panels should stay within `70vh`; longer processes must split
  into internal tabs, drawers, or explicit Screen A / Screen B packages.
- Button height should normally stay between `48px` and `56px`.
- Chip height should normally stay between `32px` and `36px`.

## GSN Icon Protocol

Use one icon style across the product: premium skeuomorphic / realistic 3D
icons.

Best short label:

```text
Use premium realistic 3D icons, not flat or outline icons.
```

Useful names for the style:
- skeuomorphic / realistic 3D icons
- photoreal object icons
- premium 3D UI icons
- real-object app icons
- high-fidelity icons

Avoid:
- flat icons
- outline icons
- line icons
- cartoon icons
- faded glyph icons
- emoji as primary UI icons

Rules:
- Every main icon must look like a real object, place, or tool.
- Do not use flat, outline, faded, cartoon, or emoji-style icons for primary UI.
- Use realistic 3D icons with depth, light, shadow, and clear material feel.
- Icons must stay simple enough to read fast on mobile.
- Use the same angle and family across screens: front view or soft 3/4 view.
- Use premium colors that fit GSN: navy, gold, white, controlled green.
- Prefer transparent, white, or very light neutral icon tiles. Avoid trapping
  the 3D object inside heavy navy, red, green, or gold shields unless the
  background itself is carrying a critical status.
- Make the object large enough to be understood before the text is read. The
  tile may be stable and compact, but the object should feel embossed,
  raised, and materially present.
- Put icons inside clean rounded containers, not floating randomly.
- Choose the object for the hope and meaning it carries, not only for category
  accuracy. For example, `Finance` should lean toward a bank building, cash
  drawer, or institutional money house when the page is about economic dignity
  and future access; a wallet/card can be used for personal payment details,
  but it should not be the only symbol for the whole finance domain.
- `Marketplace` should lean toward a shopfront, stall, or real trading place;
  a cart/basket belongs only where the action is literally shopping or moving
  goods.
- Use real-object meaning:
  - spotlight = real loudspeaker or megaphone for announcement/publicity
  - sound controls = real speaker/loudspeaker for audio on/off
  - video/media = video camera or playable media object, not a megaphone
  - community home = premium house, hall, or civic building
  - shop / marketplace = shopfront, market stall, or real trading place
  - vault = safe box
  - finance = bank building, cash drawer, or institutional money house
  - wallet/card = personal payout, payment-detail, or card context
  - repayment = calendar or payment plan with money/check evidence
  - trust = shield badge or seal
  - evidence/certificate = sealed paper, certificate packet, or evidence package
  - records = document folder
  - join = person-plus
- For hero areas, use larger realistic object illustrations.
- For buttons and compact cards, use simplified 3D icons, not full photographs.

Prompt words:
- `premium skeuomorphic 3D icon`
- `realistic object icon`
- `high-fidelity marketplace icon`
- `glossy executive app icon`
- `real-world storefront icon`
- `premium banking icon`
- `3D safe vault icon`
- `3D community building icon`

Final rule:
- Photos can be used in banners or hero cards.
- Icons inside the UI must be realistic 3D object icons, not literal photos and
  not flat symbols.
- Important task and fact icons should sit inside stable tiles or badges with
  strong navy, gold, green, or neutral contrast.
- Icons must not cover photos, identity evidence, or record text.
- Icon tiles must not cause button labels or card text to split into one-letter
  stacks.
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

Use this protocol for compact identity, evidence, receipt, link, and verification
snapshots:

- target a 390x844 phone viewport first
- fit the snapshot card from title to primary action without internal scrolling
- keep one title, one short subtitle, the minimum facts, status chips, and one
  primary action
- remove decorative height, oversized badges, repeated dividers, and explanatory
  paragraphs
- use compact premium realistic 3D icons instead of emoji-style marks
- keep verification photos, IDs, seals, and names unobstructed; badges may sit
  beside or dock on an edge, but must not cover the evidence being shown
- keep long IDs readable with whole-word wrapping only; do not split labels into
  one-letter fragments
- if all facts cannot fit, shorten labels before hiding data
- keep the snapshot as its own portable package boundary: screenshot, PDF, or
  shared evidence should not need unrelated page content above or below to feel
  complete
- if a status says something is incomplete, include a clear route or action to
  continue that completion work from the snapshot package
- a completion route must lead to the task that can actually complete or start
  the missing evidence; do not route a `complete` button to an explanation-only
  page unless the button clearly says it is opening guidance
- if the record cannot fit as one package, split it into explicit `Page 1`,
  `Page 2` packages instead of letting one card bleed into the next section
- deeper explanation belongs below the snapshot or behind a lane/action

## Institutional Identity Evidence Protocol

Identity, Trust Passport, TrustSlip, create, and join surfaces must distinguish
between evidence that is `recorded`, `under review`, and `verified`.

- `Recorded` means the user or system has captured a phone, bank/wallet,
  passport, driving licence, photo, or official-ID detail against the person's
  GSN identity.
- `Under review` means evidence exists, but the system still needs human,
  provider, community, or institutional confirmation.
- `Verified` means a phone code, active community membership, provider result,
  admin review, or other accepted verification route has confirmed the
  evidence.
- Recorded evidence may increase an identity-readiness meter immediately, but
  it must not be described as provider-verified evidence.
- Verdict, Trust Passport, TrustSlip, and CCI copy must update when evidence is
  recorded, but must keep the confidence distinction clear for institutional
  readers.
- A user's identity is one GSN identity across many communities. Identity
  snapshots should show active community footprint, community IDs, and role
  counts where space allows.
- Role copy should be reader-friendly: show `Member`, `Admin`, or equivalent
  counts rather than forcing a reader to decode raw internal role values.
- For IMF/World-Bank/institution-grade usage, never hide the difference between
  captured data and confirmed evidence just to make the record look stronger.

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
