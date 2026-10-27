# GSN Next-Session Product Plan - 2026-10-27

## Owner intent

Resume from the verified Community Confirmation Inbox cleanup and improve the
parts of GSN that help people understand the product, act without clutter,
build useful commerce activity, and receive timely guidance from GSN.

The owner also plans to provide an approximately 12-minute screen recording of
the live Spotlight rotation. Use it as evidence for a separate timing and
fairness audit before changing rotation policy.

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

Owner decision on 2026-10-27: skip this item. Do not perform this review as
part of the current queue. Continue from completed item 1 directly to item 3.

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

Status: completed locally on 2026-10-27. The existing four-part presentation
now consumes a bounded owner/community-scoped server commerce signal and may
show one approved contextual handoff. It has not been pushed or deployed.

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

### 4. Map revenue per module

Owner direction:
- Make the next development priority a module-by-module revenue model for GSN,
  including Shop, Reel, TrustSlip and Merchant Verification, Community Domain,
  reactions, and other confirmed product modules.
- `Revenue per module` is the working interpretation of the owner's phrase
  `revenue per mile` because the supplied examples are product modules. Keep
  the owner's original phrase in view and correct this interpretation if the
  owner says it was literal.

Required first deliverable before pricing or payment implementation:
- confirm each named capability and its actual route, backend owner, current
  maturity, and existing payment/revenue contract
- identify who receives value, who can realistically pay, the chargeable value
  unit, collection route, direct cost driver, and evidence of willingness to
  pay for each module
- separate platform revenue, community revenue, merchant revenue, pass-through
  money, and third-party costs
- distinguish one-off fees, subscriptions, transaction fees, verification
  fees, promotion/visibility fees, and revenue-share candidates
- mark modules that should remain free because they drive trust, safety,
  adoption, or evidence needed by a paid module
- produce a conservative module economics table and dependency map before
  changing code

Truth boundaries:
- current views, reactions, requests, verifications, or records are not revenue
- do not invent conversion rates, willingness to pay, market size, or unit
  economics where GSN lacks evidence
- do not double-charge the same value through overlapping Shop, Spotlight,
  Community Domain, TrustSlip, or Merchant Verification fees
- do not add payment logic until the payer, entitlement, refund/failure,
  accounting, evidence, and permission contracts are explicit
- treat `Reel` and `reactions` as owner-supplied module names until code and
  documentation confirm their exact product meaning

### 5. Compact the Dashboard Photo Frame affordance

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

### 6. Audit account suspension, closure, and removal capability

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

### 7. Design respectful inactivity reminders from GSN

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

### 8. Measure and correct Spotlight rotation timing and fairness

Owner observation:
- Spotlight rotation has improved materially, but some media still disappear
  so quickly that their message loses meaning.
- Different media variants do not appear to receive the same useful viewing
  time.
- Some items appear more often than others.
- The nominal five-second dwell may need to move to approximately eight or ten
  seconds, and the lower large-queue floor must be reconsidered with it.
- The spoken inventory estimate sounded like roughly 30-40 mixed items. Treat
  that as provisional and confirm the actual eligible inventory from the
  recording, API, and persisted campaign/placement records.

Evidence to collect from the planned 12-minute recording:
- timestamp each visible item start and end
- calculate actual on-screen dwell time, not only the configured timer
- identify image versus video and, where available, the media's natural video
  duration
- record transitions that cut an item off, show a blank/loading state, or
  restart unexpectedly
- count each item's appearances and the gap between repeat appearances
- note consecutive repeats and long periods in which an eligible item does not
  appear
- separate normal member/shop Spotlight from GSN-HOUSE campaigns and any
  timed-schedule behavior
- record whether tab visibility, navigation, loading, failed media, expiry, or
  eligibility changes explain an apparent short appearance

Code and data investigation:
- Confirmed current Public Shop rule:
  `min(5,000 ms, max(2,000 ms, floor(120,000 ms / item count)))`.
  Up to 24 queued items receive five seconds; 30 receive four seconds; 40
  receive three seconds; and queues of 60 or more reach the two-second floor.
  This intentional two-minute-cycle compression is a strong explanation for
  the owner's report that mixed 30-40-item rotations lose meaning.
- Map the rotation cursor/selection algorithm, eligibility filters,
  presentation lease, seen/qualification event, video playback, and expiry
  contracts around that confirmed timing rule.
- compare frontend-observed order with server-issued presentation evidence
- determine whether unequal appearances are expected weighting, eligibility,
  pacing, expiry, failed loading, or an actual fairness defect
- identify every test/spec that currently freezes the five-second rail
- inspect mixed aspect ratios, file types, and video lengths without assuming
  every variant should use one identical playback rule

Important distinction:
- `minimum useful dwell time` and `fair distribution` are separate
  questions. Removing large-queue compression or raising dwell to ten seconds
  may improve readability while leaving an unfair selection algorithm
  untouched.
- Conversely, forcing equal appearance counts may be wrong when campaigns have
  different eligibility, expiry, paid entitlement, community scope, or timed
  schedules.
- A 12-minute recording can prove a visible short-dwell defect, but by itself
  may not prove long-run fairness across a large changing inventory. Pair it
  with persisted serving/qualification evidence where available.

Decision candidates to test, not assume:
- replace the two-minute-cycle compression with a fixed eight-second useful
  minimum
- replace it with a fixed ten-second useful minimum
- retain a count-aware rule only if it never falls below the newly approved
  readable minimum, accepting that a full 30-40-item pass will take longer
- use a media-aware rule that guarantees readable minimum time without
  truncating an eligible short video incorrectly
- correct selection/pacing independently if the appearance-count imbalance is
  not explained by policy or eligibility

Required boundaries:
- do not claim an issued presentation was seen unless the existing
  qualification contract records it
- do not call rotation count verified reach, video completion, sale, or
  engagement
- do not modify paid entitlement, expiry, community exclusions, or
  GSN-HOUSE-only timed schedules while fixing ordinary rotation
- do not add manual next, previous, pause, or fast-forward controls unless the
  owner separately changes that product rule
- update the screen spec, source guards, timing tests, and fairness tests in
  the same milestone if the five-second rule changes

Acceptance:
- no eligible item is displayed for less than the newly approved useful
  minimum because of the ordinary rotation timer
- video handling has an explicit, tested relationship to natural duration
- appearance differences are explainable by a named policy/eligibility rule or
  corrected as a fairness defect
- the rail remains stable under failed media, hidden tabs, reduced motion,
  navigation, and mixed image/video inventory
- Dashboard, Marketplace, Public Shop, Community Home, and Owner Shop Control
  preserve their existing Spotlight boundaries

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
- Spotlight timing and appearance-frequency decisions are based on measured
  recording plus persisted serving evidence, not on visual impression alone.
- Completed milestones are tested and held locally until one deliberate
  deployment point.
