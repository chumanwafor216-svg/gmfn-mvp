# GSN Next-Session Product Plan - 2026-10-27

## Owner intent

Resume from the verified Community Confirmation Inbox cleanup and improve the
parts of GSN that help people understand the product, act without clutter,
build useful commerce activity, and receive timely guidance from GSN.

`GSM` in the spoken request is recorded as the current user-facing product
brand, `GSN`, under the repository branding rule.

No item below is permission to deploy. Work remains local until the owner
explicitly says `deploy`.

## Ordered work queue

### 1. Continue Community Confirmation Inbox cleanup

Current truth:
- The first surface is now compact and verified.
- A deliberately opened request is still a long evidence card.
- All nine honest response choices are visible, and multiple pending requests
  still render sequentially.

Next investigation:
- Find the smallest way to make one request feel like one decision at a time.
- Keep positive, caution, and objection choices equally discoverable.
- Preserve `request_id` and `case_id` notification focus, private-note
  privacy, TrustSlip navigation, response payloads, and reviewer permissions.

Do not:
- remove or disguise caution and objection choices
- auto-submit a response
- change backend response meaning or review authority

### 2. Re-audit the busy My GSN & I and cover/about surfaces

The owner's description may refer to both the My GSN & I authenticated page
and the cover-page About GSN & I material. Confirm the exact routes and phone
screens from code and current screenshots before editing.

Goals:
- reduce exposed text, repeated identity information, and competing actions
- keep one obvious next action
- group secondary information behind compact disclosures
- preserve the approved entry flow and keep pre-auth screens free of bottom
  navigation
- use the existing screen specs and reference mockups; do not invent a new
  information architecture

Acceptance question:
- Can a first-time phone user explain what GSN is and what to do next without
  scrolling through a long explanation?

### 3. Connect commerce intelligence to Market Wisdom

Owner direction:
- Shop Analytics should help a seller understand what is and is not working.
- Spotlight activity and performance should contribute useful evidence.
- Demand Box activity should contribute evidence of what people are asking
  for.
- Those commerce readings should become one input to Market Wisdom so GSN
  helps people attract users and retain them through useful commercial
  activity.

Required investigation before implementation:
- map the current Shop Analytics, Spotlight analytics, Demand Box, and Market
  Wisdom backend/frontend sources
- identify which metrics are real, persisted, member-scoped, community-scoped,
  or merely presentation counters
- identify existing freshness windows and whether zero means no activity or
  missing data
- decide the smallest server-owned commerce signal that Market Wisdom can
  consume without creating a second analytics engine
- define what action Market Wisdom may recommend and the owning destination
  for that action

Frozen-area instruction:
- Market Wisdom's current Dashboard presentation and interaction model is
  frozen. The owner has explicitly authorized examination of a commerce-signal
  connection, but this does not authorize an unrelated visual redesign.
- Prefer adding truthful input to the existing Market Wisdom engine and
  routing the user to the owning Shop Analytics, Spotlight, Demand Box, or Shop
  screen.

Truth and safety boundaries:
- views are not sales
- Spotlight issuance is not proof of handset receipt or meaningful attention
- product presence is not demand
- Demand Box interest is not a completed order
- no private member/shop data should leak across communities
- recommendations must explain the observed signal, why it matters, and the
  first useful action

Candidate outcome to validate, not assume:
- a bounded `commerce health` or `market activity` input made from real
  persisted signals, with stale/missing-data handling and one clear route to
  the owning analytics/action screen

### 4. Compact the Dashboard Photo Frame affordance

Owner direction:
- The current Photo Frame button occupies too much Dashboard space.
- Replace only that large affordance with a small, intelligent visual sign
  that people can tap.
- Do not change the Photo Frame feature, its behavior, or its data contract.

Required checks:
- locate the exact Dashboard component and all phone/desktop states
- confirm the affordance remains recognizable and accessible
- retain the same action target, permissions, busy state, and tap stability
- do not alter the frozen Market Wisdom section while making this isolated
  Dashboard change

Acceptance:
- the control is materially smaller
- it remains easy to discover and tap on a phone
- it performs exactly the same action as before
- it does not create horizontal overflow or a competing Dashboard card

### 5. Audit account suspension, closure, and removal capability

First determine what already exists in frontend routes, backend services,
models, permissions, and audit records. Treat these as different operations:

- `suspend`: temporarily prevent use while preserving records
- `close`: owner/admin lifecycle decision with an explicit reason and
  documented consequences
- `remove/delete`: potentially destructive action requiring a separate
  retention, legal, evidence, and recovery decision

Questions that must be answered before coding:
- Is the subject a member account, community membership, shop, community, or
  platform user?
- Who has authority: the user, community admin, or platform admin?
- What happens to TrustSlip, transactions, support history, Spotlight,
  products, evidence, and audit records?
- Is reactivation allowed, and by whom?
- What notice and appeal/recovery path is required?

Do not:
- create a broad delete button
- hard-delete financial, trust, moderation, or audit evidence
- silently treat membership removal as platform-account deletion
- reuse community suspension logic for a different subject without proving the
  contract matches

Expected first deliverable:
- a confirmed capability map and smallest safe gap proposal before any
  destructive implementation

### 6. Design respectful inactivity reminders from GSN

Owner intent:
GSN should have a useful one-to-one relationship with a member and notice when
their meaningful activity has gone quiet, similar to a platform reminding a
creator that they have not posted recently.

Potential signals to investigate:
- no new or updated shop product for a defined period
- no recent Spotlight use where the member/shop is eligible
- unresolved Demand Box opportunities relevant to the user's shop/community
- no visit to Shop Analytics after meaningful commerce activity
- other existing server-owned engagement records that clearly represent a
  useful action

Required product decisions:
- what counts as meaningful activity for each user type
- minimum inactivity window and maximum reminder frequency
- whether the reminder is in-app only or also uses an already-authorized
  external channel
- dismissal, snooze, and opt-out behavior
- quiet hours and duplicate suppression
- the exact owning screen for the first action

Guidance contract:
- say what appears inactive
- explain why it may matter
- give one first action
- never shame the user or claim that inactivity caused lost sales
- do not invent sales, reach, demand, or missed-opportunity figures
- do not create fake notifications or cross-community discovery

Implementation preference:
- use the existing notification/Attention Spine infrastructure when its
  contracts fit
- keep reminder generation server-owned, deduplicated, rate-limited,
  auditable, and scoped to the signed-in user
- route the user to the existing owning screen rather than creating a new
  reminder dashboard

## Session workflow

For each item:
1. Inspect specs, reference mockups, frontend route, backend route, data
   authority, phone behavior, and frozen-file impact.
2. Separate confirmed facts from product decisions.
3. Propose the smallest reversible change when a decision is not already
   locked.
4. Implement and verify one milestone locally.
5. Update handoff notes and make a scoped local commit.
6. Do not push or deploy until the owner explicitly says `deploy`.

## Definition of tomorrow's success

- The busy-surface targets are precisely identified before visual changes.
- Commerce-to-Market-Wisdom work uses real persisted signals and does not
  overclaim sales, demand, reach, or delivery.
- The Photo Frame change is a compact affordance replacement only.
- Account lifecycle work starts with a truthful authority/retention map, not a
  destructive button.
- Inactivity reminders are helpful, bounded, user-specific, and non-spammy.
- Completed milestones are tested and held locally until one deliberate
  deployment point.
