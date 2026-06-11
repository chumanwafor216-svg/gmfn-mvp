# GSN Production Polish Standard

Last updated: 2026-06-11

## Purpose

This document defines the quality bar for moving GSN from "clear and usable" to
"premium, trusted, and phone-ready."

The product owner benchmark is not only whether a screen works. The benchmark is
whether the screen can sit beside high-trust mobile products such as WhatsApp,
Telegram, TikTok, and modern banking apps without feeling unfinished, heavy,
or locally improvised.

This standard should be applied before broad visual or UX polish work, before
declaring a page screenshot-ready, and before changing protocol-status items
from `partial` to `complete`.

## External Design Signals

Use these references as direction, not as a mandate to copy another product:

- Apple Human Interface Guidelines:
  `https://developer.apple.com/design/human-interface-guidelines`
- Apple 2025 software design direction:
  `https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/`
- Material Design 3:
  `https://m3.material.io/`

The key lessons for GSN are:

- Content must remain the focus. Controls should support the task, not compete
  with it.
- Controls, navigation, cards, and icons need hierarchy and grouping, so users
  instantly know what to touch next.
- Visual richness must improve meaning. Effects, shadows, glass, gradients, and
  3D objects are only acceptable when they make the screen clearer, more trusted,
  or more human.
- A phone screen must feel native, calm, and responsive. It should never feel
  like a report squeezed into a phone.
- Familiarity matters. GSN can look premium and distinctive, but common actions
  must remain obvious.

## GSN Product Standard

### 1. First Viewport Rule

On phone, the first viewport must answer four questions without forcing the user
to study the page:

1. Where am I?
2. What is my current state?
3. What is the next best action?
4. What risk or warning matters now?

If a first viewport cannot answer these, the screen is not production-polished.

### 2. One Primary Action

Every task screen should make one primary action visually dominant.

Secondary actions may exist, but they should be grouped, muted, collapsed, or
placed after the main state. Avoid exposing many equally loud buttons at once.

### 3. Lane Discipline

Large operational pages must guide one lane at a time:

- Marketplace should not expose every shop, trust, finance, support, and admin
  tool at once.
- Finance should separate money-in, money-out, repayment, revenue, and evidence
  lanes.
- Trust Passport should separate identity, finance discipline, records/events,
  documents/TrustSlip, and repair guidance.
- Shop Control should separate public shop, private vault, assets, spotlight,
  and owner controls.

If a page has more than three major content groups, secondary groups should be
collapsed or presented as compact route rows.

### 4. Touch And Button Stability

Phone actions must feel stable and deliberate:

- Major action rows should generally be at least `52px` high.
- Compact icon-only controls may be smaller only when they are familiar,
  visually separated, and not the main action.
- Buttons must not resize during loading, hover, active, or disabled states.
- Loading states should keep the same button footprint and label rhythm.
- Native clickable elements should be avoided for user-facing actions unless a
  shared stable primitive cannot reasonably be used.

### 5. Type And Copy

Text must be short, direct, and human.

GSN should not sound like a database, a legal form, or an engineering console.
Good copy explains:

- what is happening;
- why it matters;
- what to do first;
- what GSN will and will not do.

Avoid:

- long exposed paragraphs on phone;
- backend words such as `raw`, `payload`, `endpoint`, `MVP`, `test`, or
  `internal` in normal user-facing surfaces;
- vague words like "partial" without a visible reason and next step;
- labels that force the user to understand system architecture before acting.

### 6. Icon Meaning

Icons must communicate meaning before the user reads the text.

Use the GSN 3D icon family for primary meaning:

- finance institution, bank, loan, repayment: use institutional money or
  repayment-plan objects, not weak wallet-only imagery;
- marketplace and shop: use market, storefront, stall, trade, or opportunity
  objects;
- proof, TrustSlip, certificate, evidence: use seal, document, folder, QR, or
  official-paper objects;
- sound: use speaker/loudspeaker;
- video/media: use video/playable-media object;
- spotlight/publicity: use megaphone.

Default icon tiles should be white or near-white with restrained borders and
soft shadows. Heavy colored icon backgrounds are reserved for rare warning,
status, or hero moments and must still preserve readability.

### 7. Visual Rhythm

The product should feel calm and premium:

- use fewer but stronger sections;
- keep spacing consistent within a page;
- avoid giant empty blocks unless they carry a true hero or document purpose;
- avoid nested cards inside cards;
- keep cards compact and readable;
- do not let screenshots look like scattered independent components;
- do not let decoration fight content.

### 8. Motion And Feedback

Motion should make the app feel alive, not unstable:

- use subtle transitions for open/close, state changes, and media controls;
- avoid layout shifts, jumpy buttons, or moving targets;
- show immediate feedback after taps;
- keep long-running actions visibly in progress;
- avoid animation that hides the next action or delays the user.

### 9. Institutional Proof Surfaces

Any user-facing proof surface that can be shared, printed, downloaded, or used
as evidence must look like an official GSN paper, not a plain app panel.

This includes:

- TrustSlip public verification;
- Trust Passport exports;
- Trust timeline PDFs;
- evidence packs;
- loan evidence packs;
- identity/profile integrity evidence;
- community confirmation outcomes when used as proof.

Required document treatment:

- GSN identity mark or watermark;
- clear title and document purpose;
- holder/community identity block;
- issue/generated time;
- verification reference or QR where applicable;
- validity/currentness statement;
- privacy and limitation statement;
- restrained official border/frame;
- consistent footer.

### 10. Readiness Truth

Protocol-status and pilot-readiness labels must tell the truth.

A status may say `partial`, but then the user/admin must be able to see:

- what is complete;
- what is not complete;
- why it matters;
- the next route or action to finish it.

Do not mark a domain `complete` because the UI looks better. Mark it complete
only after route logic, backend behavior, frontend presentation, evidence, and
tests/audits agree.

## Route Completion Gates

A route is production-polished only when all gates pass:

1. First phone viewport shows state and next action.
2. One primary action is obvious.
3. Secondary content is compact or collapsed.
4. Buttons are stable and touch-safe.
5. Icons use the GSN 3D meaning system.
6. User-facing language is simple and direct.
7. Loading, empty, error, blocked, and success states are clear.
8. No visible backend/test/internal wording leaks.
9. The route passes its relevant audits/build.
10. Phone-width screenshot review finds no major overlap, clipping, cramped
    text, or oversized dead blocks.

## Current Application Order

Apply this standard in this order:

1. Core phone-production polish:
   Dashboard, Community Home, Marketplace, Shop Control, Finance, Trust
   Passport, TrustSlip Verify, Loan Summary, Repayment.
2. Institutional document shell:
   TrustSlip PDF, Trust Timeline PDF, Evidence Pack PDF, Loan Evidence Pack PDF,
   User Evidence Pack PDF.
3. Borrowing and repayment end-to-end proof:
   pay-in-full, pay-in-parts, partial payment, full repayment, overdue/missed,
   reversal, Finance, Loan Summary, Trust Passport, TrustSlip.
4. Protocol-status truth:
   replace stale hard-coded `partial` labels with either dynamic checks or
   honest partial reasons and next steps.

## Unabated Truth

This standard will raise quality only if it is used as a gate. It is not enough
to add 3D icons, watermarks, shadows, or nicer wording. A screen is not finished
until it feels obvious, stable, trustworthy, and alive on a real phone.
