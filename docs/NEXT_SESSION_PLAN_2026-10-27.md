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

Execution-order clarification from the owner on 2026-10-27:
- Items 4 and 5 are captured strategic brainstorms, not the current runtime
  implementation task.
- Resume the previously agreed implementation queue at item 6, the compact
  Dashboard Photo Frame affordance.
- Return to items 4 and 5 during the end-of-day strategy close, then revise the
  business plan and business forecast prepared for Steliana using the completed
  growth and module-economics map.
- The full reuse-first growth-flywheel capture is recorded in
  `GSN_EXISTING_ENGINES_GROWTH_FLYWHEEL_BRAINSTORM_2026-10-27.md`.

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

### 4. Define the GSN Growth Partner acquisition model

Timing: deferred to the end-of-day strategy close; do not implement it while
the current product queue is being resumed.

Owner to-do update received 2026-10-27 at 08:27 Europe/London:
- investigate whether GSN Independent Entrepreneurs can genuinely be described
  as affiliate marketers
- design the truthful route by which independent people can bring users and
  communities into GSN and help the network scale

Working terminology decision:
- Do not call a person `affiliate marketing`. Affiliate marketing is an
  activity/channel; a person doing it may be an affiliate or affiliate
  marketer.
- Use `GSN Growth Partner` as the provisional umbrella name for a person who
  introduces and helps activate suitable users or communities.
- Use `GSN Affiliate Partner` only for the narrower case where a trackable
  link or code can earn a disclosed commission from a qualifying click or paid
  sale.
- Keep `Independent Entrepreneur` for a person operating their own shop,
  services or commercial activity. Owning a GSN shop does not automatically
  make that person a GSN affiliate.
- GSN already uses `affiliate` for a parent-domain acknowledged Community
  Domain relationship. Defaulting the growth programme to `Growth Partner`
  avoids confusing a marketing relationship with an institutional affiliation.

Confirmed existing foundation:
- The consent-bound backend `/network-growth/attributions` spine already
  records who says they introduced an existing GSN member, distinguishes
  claimant statements from verified invite/QR evidence, lets only the
  participant accept or challenge the attribution, and derives bounded
  activation milestones.
- That spine intentionally creates no Independent Entrepreneur role,
  commission, residual, reward, payout, employment, territory or advertising
  authority. It is attribution evidence only.
- The social acquisition protocol already preserves campaign/source parameters
  for the `/pilot/` funnel, but that is not yet a commission or guaranteed
  visitor-tracking system.

Required first commercial design:
- separate three roles: independent seller/entrepreneur, direct referral Growth
  Partner, and paid-sale Affiliate Partner
- define the one-tier qualifying event: never a bare claimed introduction;
  candidates include participant-confirmed entry, verified invite entry,
  paid-module purchase, retained activation, or collected non-refunded revenue
- decide who pays, how much, when entitlement becomes earned, attribution
  window, duplicate resolution, refund/reversal treatment, payout threshold,
  currency, tax evidence, identity/KYC need and accounting owner
- define fraud controls for self-referral, duplicate identities, collusion,
  fake activity and claimant disputes
- define advertising disclosure for compensated promotion and preserve the
  difference between a genuine recommendation and an advertisement
- assess the real working relationship before using `independent` or
  `self-employed`; a label or contract alone cannot decide employment status
- keep the first pilot direct and single-tier; do not pay people for recruiting
  other recruiters and do not create a downline or recruitment-funded reward
  structure
- obtain UK legal/accounting review before money movement or public launch

Suggested first pilot to evaluate, not yet approve:
- one direct Growth Partner introduces one new customer/community through a
  unique link, invite or campaign code
- the participant confirms the relationship
- reward becomes eligible only after a named paid GSN product produces
  collected, non-refunded platform revenue and passes a defined cooling period
- no reward for raw clicks, unverified sign-ups, recruiting another Growth
  Partner, or activity that produces no qualifying value
- fixed or capped first-sale reward before considering recurring commission

Truth boundaries:
- attribution is not causation, reward entitlement or proof of a sale
- a membership, shop, Spotlight campaign, reaction or TrustSlip is not revenue
- commissions and commercial relationships must be disclosed clearly in
  promotional content
- never describe a recruitment chain as entrepreneurship or affiliate marketing
- do not expose participant activation details to the introducer beyond the
  minimum status required for a transparent reward decision

### 5. Map revenue per module

Timing: deferred to the end-of-day strategy close, immediately after the
reuse-first growth-flywheel and Growth Partner map.

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

### 6. Compact the Dashboard Photo Frame affordance

Status: completed locally on 2026-10-27; not pushed or deployed.

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

Implemented result:
- Source inspection proved the visible control is the passport `Frame tools`
  trigger. The other `Picture frame` control is inside a legacy section that
  is currently `display: none`; changing only that hidden control would not
  have changed the owner's live Dashboard.
- The visible trigger now uses a live 26px picture/initials preview plus
  `Edit photo` in a fixed 108px phone slot and 116px wider-screen slot, instead
  of consuming 88%/84% of the passport-card width.
- Its existing accessible name, separate open state, fixed 40px/42px trigger
  height, anchored overlay, file input, and Upload/Change/Remove actions remain
  unchanged.
- `PictureFrameToolsControl` gained only an optional visual trigger-content
  slot. Existing callers still render their original text label by default.
- The frozen Market Wisdom source was not changed.
- Verification passed: Dashboard phone-button audit, Dashboard button
  inventory, mobile tap-stability audit, production build (295 modules), and
  the phone-browser frame audit covering the compact width, accessible name,
  stable height, opening state, and all three tools.

### 7. Audit account suspension, closure, and removal capability

Status: capability audit completed locally on 2026-10-27; no lifecycle code,
schema, permission or deletion behavior changed.

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

Audit result:
- GSN has no platform-user account lifecycle state, endpoint or UI. Current
  authentication cannot enforce a user suspension or closure.
- Existing Community, Community Domain and membership lifecycle actions are
  narrower operations and must not be relabelled as account suspension.
- The smallest safe first implementation is platform-admin user
  suspension/reactivation with preserved evidence, authentication enforcement,
  preview/confirmation, notice, and a pre-auth appeal/recovery route. Closure
  and deletion require a later retention, ownership and evidence policy.
- Full evidence map and proposal:
  `GSN_ACCOUNT_LIFECYCLE_CAPABILITY_AUDIT_2026-10-27.md`.

### 8. Design respectful inactivity reminders from GSN

Status: repository and external-pattern design completed locally on
2026-10-27; no reminder, scheduled job, notification, Web Push, setting,
schema or screen behavior changed.

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

Design result:
- User-facing language should be `useful follow-up reminder`, not a claim that
  the person is inactive. GSN has no platform-wide `last_active_at`.
- GSN already has contextual Shop Analytics guidance. Another on-screen shop
  nudge would duplicate it; the missing capability is governed, durable
  re-engagement outside that screen.
- Existing Action Inbox, Attention Spine, Web Push, shop/follower/attention
  records and Companion interaction ideas can be reused, but Companion
  schedules/limits are currently browser-local and cannot govern a server
  sender.
- First recommended pilot: active shop owners with active public products,
  dated seller-action evidence and a truthful follower/recent-attention reason;
  14-day freshness candidate, at most one Shop Growth reminder per seven days,
  dry-run first, then an enrolled Action Inbox pilot.
- No new reminder Web Push until category consent, timezone, quiet hours,
  frequency, digest, dedupe, snooze and opt-out are server-owned and enforced.
- Block general-member inactivity, analytics-visit claims, buyer-browsing
  re-engagement and Demand Box relevance claims until their evidence contracts
  exist.
- Full capability map and phased proposal:
  `GSN_RESPECTFUL_INACTIVITY_REMINDER_DESIGN_2026-10-27.md`.

### 9. Measure and correct Spotlight rotation timing and fairness

Status: source/test pre-measurement audit completed locally on 2026-10-27;
physical-phone recording and evidence correlation remain pending. No Spotlight
behavior or frozen policy changed.

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
- Confirmed source rule:
  `min(5,000 ms, max(2,000 ms, floor(120,000 ms / item count)))`.
  Up to 24 queued items receive five seconds; 30 receive four seconds; 40
  receive three seconds; and queues of 60 or more reach the two-second floor
  **if that many items are actually present in the handset queue**.
- Important audit correction: the canonical v2 endpoint normally returns a
  bounded window of up to four items and refills near the end. The dwell
  function receives current handset queue length, not total server inventory.
  Therefore 30-40 eligible campaigns do not by themselves prove three-to-four
  second live dwell under the current canonical path. The recording must test
  unexpected queue growth, deadline/refresh/media churn, stale deployed code,
  or a genuine five-second readability problem.
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

Pre-measurement audit result:
- The existing exposure ledger proves accepted one-second qualification, not
  full visible dwell, playback completion, transition gaps or non-counting
  visibility/replay appearances.
- Current ten-second prepared videos ordinarily receive the same five-second
  card dwell as images, so even correct timing can cut the useful message.
- Fairness must use the exact viewer/route eligible denominator; equal raw
  counts across ineligible, self-excluded, expired, paced, frequency-capped or
  differently entitled campaigns would be false.
- Baseline Spotlight contract audit and all 19 focused backend presentation
  tests pass.
- Full measurement template, hypotheses and change gate:
  `GSN_SPOTLIGHT_TIMING_FAIRNESS_PREMEASUREMENT_AUDIT_2026-10-27.md`.

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
