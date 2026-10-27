# GSN Respectful Inactivity Reminder Design - 2026-10-27

Status: product and repository design only. No reminder generation, scheduled
job, notification, Web Push, preference, schema or screen behavior was changed.

## Unabated conclusion

GSN should not tell a person that they have been "inactive." The repository
does not have a platform-wide `last_active_at`, and absence from one module does
not mean absence from GSN or failure by the member.

The truthful product is a **useful follow-up reminder** tied to one owned GSN
surface and one verifiable record, for example:

> Your public shop has not had a fresh offer update since 13 October. Four
> followers can receive your next update. Review your shop.

That wording says what is quiet, why it may matter, and the first action. It
does not claim lost sales, demand, reach, income or wrongdoing.

GSN already has most of the delivery machinery. It does not yet have the
server-owned eligibility, preference and suppression contract needed to send
these reminders responsibly. This should therefore be a small coordinator over
existing engines, not a new engagement engine or a new reminder dashboard.

## Confirmed existing capability

| Capability | Repository truth | Reuse decision |
|---|---|---|
| Action Inbox | `notifications` stores a user, kind, title, message, action and read state | Reuse as the canonical in-app destination |
| Attention Spine | Summarises unread Notifications, bulletins and meetings; it does not create a second inbox | Reuse for summary only; do not create a competing queue |
| Web Push | Registered-device delivery exists for an allowlist of notification kinds | Reuse later, only after server-owned consent and cadence are real |
| Companion | Has light/active/off, quiet hours, repeat windows and daily limits | Reuse the language and interaction intent, not its current local-only enforcement |
| Shop analytics | Server records shop visits, product opens, contact taps and Spotlight exposure; Shop Control already converts them into measured guidance | Reuse these facts; do not duplicate the Shop Analytics advice card |
| Shop followers | Durable follower records and follower-update notification paths exist | Reuse as evidence of a repeat audience, never as evidence of buyers |
| Product freshness | Product creation time exists; product updates/removal/restoration/reposts are recorded as Trust Events | Reuse to calculate a seller-owned last-change time |
| Spotlight history | Campaign creation, activation, end and expiry records exist | Reuse only after current eligibility, active campaign and entitlement rules are checked |
| Demand Box | Open requests are server-owned and community-scoped | Do not call every open request relevant to a shop; matching proof is not yet sufficient |

## Gaps that make immediate outbound reminders unsafe

### No platform-wide inactivity fact

`User` has no `last_active_at` or equivalent login/activity record. GSN can
truthfully say that a shop offer, product, campaign or other specific record has
not changed. It cannot truthfully say "you have not used GSN."

### Companion controls are not server controls

The visible Companion settings include quiet hours, daily limits, repeat
windows and System notifications. In the live frontend API layer,
`getMySettings()` and `updateMySettings()` read and write local browser storage.
The backend `UserSettings` contract contains only the smaller settings set and
does not contain the Companion schedule/limit fields.

Therefore a scheduled server sender cannot currently know the member's quiet
hours, daily limit, reminder mode or timezone. The server Web Push dispatcher
checks an allowed-kind list and active subscriptions, but does not check the
local Companion preferences.

### Notifications lack reminder lifecycle state

The Notification row supports unread/read only. It has no durable:

- semantic deduplication key;
- subject/module reference;
- eligible-at or expires-at value;
- last-sent state;
- snoozed-until value;
- category opt-out;
- dismissed-as-not-useful feedback;
- delivery-attempt audit.

Marking a notification read is not the same as asking GSN to stop or snooze a
type of reminder.

### No general scheduler is mounted

The backend contains maintenance scripts intended for cron/worker execution,
but no general application scheduler was found. A person who is genuinely away
cannot be brought back by code that runs only when they open the Action Inbox.
Generating a reminder on inbox fetch would help an already-active person and
would not solve re-engagement.

### Some proposed signals are not measurable yet

- Product rows have `created_at` but no product `updated_at`; update time must
  be derived from the existing Trust Event trail.
- GSN records shopper attention, but not a durable owner event proving when the
  owner last reviewed Shop Analytics. It must not say the owner has not checked
  analytics.
- The current open-demand count for a shop community is not proof that each
  request matches that shop's offer.
- Absence of Spotlight use is not proof of missed value and may reflect limits,
  eligibility, expiry, payment choice or no suitable public item.

## What to borrow from established products

The useful pattern is user control and relevance, not pressure:

- Apple describes notifications as timely, high-value information, advises
  against repeated notices for the same thing, requires realistic urgency and
  says promotional notifications need explicit agreement.
- YouTube's scheduled digest combines push notifications into one chosen-time
  delivery and is off by default.
- LinkedIn exposes controls by notification category and channel/frequency, and
  offers "Show less like this" on individual notifications.

GSN adaptation:

1. In-app is the baseline channel.
2. Off-app Shop Growth reminders are a separate opt-in, not implied by generic
   browser permission.
3. The person can choose immediate or digest delivery, snooze the subject, show
   fewer reminders like it, or turn the category off.
4. A low-priority growth reminder never masquerades as urgent, breaks quiet
   hours or competes with financial, security, approval or safeguarding work.
5. Repeated observations about one quiet subject collapse into one current
   reminder.

Official references:

- Apple Human Interface Guidelines, Notifications:
  https://developer.apple.com/design/human-interface-guidelines/notifications
- Apple Human Interface Guidelines, Managing notifications:
  https://developer.apple.com/design/human-interface-guidelines/managing-notifications
- YouTube Help, Scheduled digest:
  https://support.google.com/youtube/answer/9012820
- LinkedIn Help, Manage notifications:
  https://www.linkedin.com/help/linkedin/answer/a590736

## Signal-by-signal decision

| Candidate | Can GSN prove it now? | First-release decision | Reason |
|---|---|---|---|
| Public shop offer has not changed | Yes, from product creation plus product/shop Trust Events | Eligible for a controlled shop-owner pilot | It is owned, specific and routes to an existing screen |
| Followers have no fresh shop signal | Yes, if follower count is combined with last public seller action | Eligible evidence, described only as followers who can receive an update | Followers are not buyers and must not be described as sales |
| Recent shop attention followed by no seller update | Yes, from Marketplace Attention Events plus seller-action history | Eligible after a minimum evidence threshold is approved | It explains why a review may be useful without promising conversion |
| No Shop Analytics visit | No | Block | Owner analytics-view events are not persisted |
| No recent Spotlight use | Partly | In-page suggestion only at first | Absence may reflect eligibility, entitlement or deliberate choice |
| Relevant unresolved Demand Box opportunity | Not reliably | Block outbound reminder | Community-wide open count is not a shop-specific match |
| General member inactivity | No | Block | No platform-wide activity timestamp and no single meaningful action for all member types |
| Buyer inactivity after browsing | Technically inferable in places, but intrusive | Block | Browsing alone is not consent to re-engagement |
| Community owner has a real pending approval/meeting action | Yes | Keep in the existing event/action notification lanes | This is pending work, not inactivity |

## Recommended first pilot

### Audience

Only the owner of an active shop with at least one active public product.

Do not include ordinary members, buyers, followers, inactive shops, suspended
subjects, pilot-cleanup subjects, GSN-HOUSE campaigns, or users without an
owned shop.

### Candidate rule

A shop may become a reminder candidate when all of these are true:

1. the shop and at least one public product remain active;
2. the last verified public seller action is older than the approved freshness
   window;
3. there is a truthful reason to review the shop, such as at least one follower
   or a minimum approved recent-attention signal;
4. no active reminder already represents the same shop and reason;
5. the reminder is not snoozed or disabled;
6. the member has not reached the server-owned category and daily caps;
7. no newer seller action resolved the observation before delivery.

The initial freshness window should be tested at **14 days**, not treated as a
universal truth. The pilot should use at most **one Shop Growth reminder per
member in seven days** and at most **one reminder for the same semantic reason
in 14 days**. These are conservative test parameters, not claimed conversion
optima.

### First action

Route to the existing owner Shop Control / Shop Analytics context. Do not make
a reminder dashboard. The destination should recalculate current facts and
offer the already-existing suitable actions: edit a product, post a shop
update, review Spotlight eligibility, or leave the shop unchanged.

### Copy contract

Every reminder must contain:

- **What:** the exact owned surface and dated observation;
- **Why:** a measured reason it may be worth reviewing;
- **First step:** one route and one action;
- **Boundary:** no sales, income or reach claim beyond the recorded evidence.

Example with follower evidence:

> Your public shop has not had a fresh offer update since 13 October. Four
> followers can receive your next shop update. Review your shop.

Example with attention evidence:

> Your shop recorded three visitor signals this week, while its public offers
> have not changed since 13 October. Review the offers before deciding whether
> to update anything.

Forbidden copy includes:

- "You are inactive";
- "You are losing customers";
- "You missed £X in sales";
- "People want your product" when only views exist;
- "Post now" without explaining the evidence;
- fabricated urgency, reach, demand, ranking or earnings.

## Reuse-first implementation shape

This is the smallest safe architecture if implementation is later approved:

1. A server reminder-candidate service reads existing Shop, Product, Trust
   Event, follower, attention and Spotlight records. It creates no score.
2. A narrow durable reminder-state record stores one row per
   `user + reminder type + subject`, including last eligibility, last delivery,
   snooze, disabled state, resolution and a semantic dedupe key.
3. A dry-run scan reports eligible/suppressed counts and reasons without
   creating notifications.
4. An approved scheduled maintenance job calls the same service; no app-local
   timer is treated as the source of truth.
5. The existing notification service creates one Action Inbox row pointing to
   the owning Shop screen.
6. The Attention Spine reads that row. The reminder must be classified as a
   gentle condition, not urgent work and not an inflated red/yellow pulse.
7. A newer seller action automatically resolves/retires the current reminder.
8. Dismiss, snooze and "show fewer like this" update durable server state.
9. Web Push remains off for this category until explicit server-side consent,
   timezone, quiet hours, frequency and digest settings are implemented and
   enforced at dispatch time.

This adds the minimum control state required for safe reuse. It does not add a
new feed, scoring system, content generator, cross-community discovery engine
or notification centre.

## Delivery phases

### Phase 0 - evidence replay

Run candidate logic in dry-run mode over pilot data. Inspect false positives,
stale records, missing update events and whether each proposed action still
exists. Send nothing.

### Phase 1 - Action Inbox pilot

Create a low-priority in-app reminder for explicitly enrolled pilot shop
owners. Validate copy, routing, deduplication, resolution, snooze and opt-out.
Do not create it merely because the member opens Shop Analytics; that would
duplicate the guidance already on that screen.

### Phase 2 - digest

After server preferences exist, allow one optional Shop Growth digest at a
member-chosen local time. Combine multiple eligible observations into one
delivery with one primary action.

### Phase 3 - opted-in Web Push

Only after dispatch enforces category consent, timezone, quiet hours, caps and
dedupe may the new reminder kind be considered for the Web Push allowlist.

No email, SMS, WhatsApp or other external channel should be inferred from a
phone number or existing contact field. Each requires its own permission and
delivery contract.

## Required acceptance tests

- a non-owner never receives an owner-shop reminder;
- inactive/private/Vault-only products do not make a public-shop reminder
  eligible;
- a product or shop update resolves a queued stale observation;
- one subject/reason cannot create duplicate unread reminders;
- read, dismiss, snooze and category opt-out remain distinct states;
- quiet hours use the member's stored timezone and cross-midnight windows;
- category and global daily caps are enforced on the server;
- financial/security/approval work outranks the gentle reminder;
- Web Push is not attempted without explicit category consent and an active
  subscription;
- all copy is derived from dated/countable records and makes no sales claim;
- no cross-community Demand Box data is introduced;
- Action Inbox and Attention Spine link to the existing Shop owner screen;
- current Shop Analytics guidance is not duplicated;
- the frozen Dashboard Market Wisdom presentation is untouched.

## Decisions still required before code

The product owner must approve:

1. whether the first pilot is Shop owners only;
2. the 14-day candidate window and seven-day category cap;
3. the minimum follower/attention evidence required;
4. Action Inbox-only pilot versus immediately building server preferences and
   an opted-in digest;
5. the exact labels for dismiss, snooze and category opt-out;
6. whether reminder eligibility itself is retained as an auditable operational
   record and for how long.

Until those decisions and the server preference contract exist, GSN should
continue using its existing contextual Shop Analytics guidance and should not
send new inactivity Web Push messages.
