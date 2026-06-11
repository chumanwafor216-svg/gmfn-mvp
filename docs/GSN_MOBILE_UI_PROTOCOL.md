# GSN Mobile UI Protocol v1

## Goal

Stop oversized blocks, reduce scrolling, and make each mobile page feel fast,
clear, guided, and screenshot-ready.

## Core Rule

One screen equals one decision.

If the user is joining, verifying, paying, withdrawing, sharing, checking
status, or fixing a blocker, the first screen must show only what is needed for
that decision.

Every mobile task page must answer three questions immediately:

- What is this?
- What is the state?
- What do I do next?

## Non-Negotiable Layout Rules

- Do not use giant hero blocks.
- Mobile hero height should normally stay between `96px` and `140px`, or about
  `18%` of the viewport height.
- Do not use one large full-width block for small facts.
- Short facts belong in chips, mini cards, or a two-column stat grid.
- Show no more than four to five major blocks on one page.
- Default state must be compact.
- Collapsed card height should normally stay between `88px` and `110px`.
- Expanded task panels should stay within `70vh`; beyond that, split into
  internal tabs, sections, drawers, or a second explicit screen.
- Only one lane or task may be open at a time.
- Opening one major block must collapse or visually step back the others.
- Critical action must appear without scrolling.

## Mobile Page Structure

For mobile task pages, use this order:

1. Header
2. Page title, status chip, and one-line subtitle
3. Core facts row with two to four chips or mini cards
4. Current task card showing only the active step
5. Action row with one primary CTA and at most two secondary actions
6. Advanced details collapsed by default

Do not mix multiple jobs in the current task card.

## Typography And Density

- Page title: `24px` to `32px`
- Section title: `18px` to `22px`
- Body text: `14px` to `16px`
- Chip text: `13px` to `15px`
- Button height: `48px` to `56px`
- Chip height: `32px` to `36px`
- Icon tile: `40px` to `48px`

Use tighter spacing and clearer grouping before increasing height. Empty
padding is not clarity.

## Copy Limits

Main mobile surfaces must not read like essays.

- Title: maximum two lines
- Subtitle: maximum two lines
- Body summary: maximum two to three lines
- Long explanation belongs under `Info`, `Details`, `Policy`, or an advanced
  drawer.

Use short action words:

- Join
- Verify
- Open
- Copy
- Share
- Refresh
- Pay
- Place
- Continue
- Fix
- Ready
- Pending
- Locked

Avoid repeated explanations, legal-sounding paragraphs on the main surface, and
stacked labels that say the same thing twice.

## Action Layout Rules

- Show no more than three major buttons at once.
- If more than three actions exist, group secondary actions in a drawer or use a
  compact two-column action layout.
- The primary CTA must be visually strongest.
- Admin-only actions must stay behind `Admin` or `Advanced`.
- Buttons must use stable heights and must not resize the page when tapped.

## Screenshot Protocol

A single verification or decision screen should fit in one screenshot whenever
possible.

If a process cannot fit in one screenshot:

- split into `Screen A` and `Screen B`;
- do not let unrelated content spill into the same screenshot;
- make each screen an intentional package.

`Screen A` should contain:

- page title
- current state
- key facts
- next action

`Screen B` should contain:

- deeper details
- audit trail
- secondary notes

Raw URLs, logs, policy text, and internal system language must not appear on the
main screenshot surface unless the user explicitly opens advanced details.

## Identity Evidence Meter Rule

Where a page asks a user to improve identity, trust, create, or join evidence,
use the shared identity evidence meter pattern instead of a silent static
verdict.

- The meter may rise when evidence is recorded.
- The page must still label whether each item is recorded, under review, or
  verified.
- Recorded phone, bank/wallet, passport, driving licence, or photo evidence is
  useful progress, but it is not the same as network/provider/admin
  verification.
- A result or verdict should update near the action that changed it, so the
  user sees that their effort strengthened the record.
- For multi-community identity snapshots, show community role counts such as
  `Member 1` and `Admin 1` when the user belongs to more than one community.

## Information Priority

Show first:

- current status
- identity or record name
- ID
- readiness
- next action
- outcome

Hide by default:

- long policy text
- repeated explanation
- raw URLs
- admin-only controls
- logs
- secondary notes
- internal system language

## Visual Rules

- Institutional, not playful.
- Use premium realistic 3D object icons for meaning, not decoration.
- Do not use flat, outline, faded, cartoon, or emoji-style icons as primary UI
  icons.
- Keep icon objects simple enough to read fast on mobile, inside stable rounded
  containers.
- Prefer light, transparent, white, or near-colorless icon containers so the
  object carries the meaning. Heavy colored shields can make the icon feel
  decorative or hidden, especially for users who rely more on what they see
  than what they read.
- Use hopeful institutional objects for domain meaning: a bank building can
  communicate stronger finance confidence than a small wallet; a real
  shopfront or market stall can communicate marketplace opportunity more
  clearly than a generic cart.
- Use watermarks lightly; they must never fight the content.
- Green means ready.
- Amber means caution or needs refresh.
- Red means blocked or not ready.
- Blue means active or open.
- Decorative graphics stay secondary to function.

## Side-By-Side Fact Rule

If content is a short fact, it should not become one tall full-width card.

This applies to:

- status
- count
- member total
- approvals
- readiness
- ID
- amount
- route state

Use two-column mini cards or compact chips on mobile.

## Long Process Rule

For flows such as Money In, Money Out, Join Request, Verify, Paid Repost,
TrustSlip, and Activation:

- show a step tracker at the top;
- keep only the current step expanded;
- collapse previous and next steps;
- show one primary action;
- keep only one form block open at a time.

## Specific Corrections For Existing GSN Pages

### Join / Link Center

Show only:

- recipient name
- note
- Copy / Email / WhatsApp

Hide raw join links under `Advanced`.
Hide admin refresh unless admin mode is open.

### Verify Community

Show only:

- community name
- community ID
- status
- Copy link / Open

Hide long explanation and background policy by default.

### Public Shop Face

Show:

- status
- Refresh / Copy / Open

Hide `needs refresh` explanation under an info drawer.

### Paid Repost

Keep only:

- block
- target
- duration
- credits
- Pay code
- Place

Put price explanation and billing notes under `Details`.

### Trust Passport

- Keep the lane list compact.
- Each lane row should be short.
- Opening one lane collapses the others.

## Acceptance Test

Codex must not consider mobile UI work done unless all are true:

- The user understands the page in two seconds.
- The user sees the current state in two seconds.
- The user sees the next action without scrolling.
- Short information appears in compact chips or two-column cards.
- No page reads like an essay.
- No oversized block wastes half a screen.
- Screenshot of the main task looks clean and complete.

## Final Implementation Rule

When in doubt: reduce words, reduce height, collapse details, surface the
action, and keep one task open at a time.
