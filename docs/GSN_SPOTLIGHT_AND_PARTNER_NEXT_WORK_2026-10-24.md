# GSN Spotlight and Independent Partner Next Work

Date recorded: 2026-10-23
Planned working date: 2026-10-24
Status: product and engineering work still to be specified

## Purpose

This record preserves the next work after the deployed GSN-house campaign,
advertiser-contact, batch-media, and fair-rotation repairs. It does not describe
unfinished ideas as current product behaviour.

The independent GSN partner/worker/entrepreneur system has not been designed or
implemented in the work completed on 2026-10-23. A GSN-house publisher,
Community Domain administrator, ordinary member, external advertiser, and
independent GSN entrepreneur are not automatically the same role.

## Tomorrow's first work package: independent GSN entrepreneurs

Before coding, define the operating contract for people who independently help
GSN find customers, onboard communities, support campaigns, or operate local
market activity.

The specification must settle:

1. the approved public name for the role: partner, worker, entrepreneur,
   marketer, local operator, or distinct role types;
2. whether the person acts independently, for a Community Domain, or directly
   for GSN in each workflow;
3. onboarding, identity verification, training, approval, territory, renewal,
   suspension, and exit;
4. the exact actions each role may perform and which actions always require a
   platform administrator, advertiser, or Community Domain approval;
5. referral/customer attribution, duplicate-claim handling, and the evidence
   that proves who introduced or supported a customer;
6. commission, fee, revenue-share, payment timing, refund, chargeback, tax, and
   payout rules before any earnings are promised;
7. whether a partner may prepare a campaign draft, and how final advertiser
   consent, contact details, funding, destinations, and publication approval
   are recorded without bypassing governance;
8. privacy boundaries: the minimum customer, campaign, community, member, and
   analytics data the role may see;
9. audit history, complaints, conflicts of interest, fraud controls, brand-use
   rules, and emergency suspension;
10. the partner dashboard, status, campaign/referral history, earnings evidence,
    and support route required for a small controlled pilot.

No employment status, guaranteed earnings, commission percentage, territorial
exclusivity, or publishing authority should be invented before these decisions
are approved. The smallest safe pilot should keep final campaign activation and
money movement behind existing accountable controls.

## Other confirmed remaining Spotlight work

### 1. Audience, geography, and timing

- Add persisted global, country, region, selected-community, branch, and
  explicit general/mixed audience rules instead of millions of placements.
- Establish a verified source of country, region, branch, and timezone data.
- Add destination-local peak and off-peak delivery windows inside an absolute
  campaign lifetime.
- Decide the proposed peak/off-peak allocation. A 60/40 example is not yet an
  approved or implemented rule.
- Ensure regional timing never resets campaign lifetime or personal frequency.

### 2. Context, governance, and exclusions

- Validate whether the viewer is inside a Community Domain, branch, ordinary
  community, or explicit general/mixed GSN context.
- Enforce paid-domain advertising choices and free/ad-supported plan rules in
  that active context.
- Complete backend enforcement of Community Domain Spotlight modes and
  content-class permissions.
- Preserve authorised destination history while making current permission
  control future delivery.
- Allow one destination to withdraw without ending delivery in every other
  permitted destination.

### 3. Advertiser and campaign commercial lifecycle

- Distinguish GSN-house, external commercial, Community Domain organisational,
  cross-community member, and mandatory service/safety content.
- Build scheduled start/end, funding identity, capacity, hold, correction,
  replacement, withdrawal, partial destination removal, and reporting.
- Define advertiser price, billing, payment failure, refund, and evidence rules
  before selling the service.
- Keep advertiser contact and campaign provenance available without implying
  endorsement, trust, purchase, or guaranteed reach.

### 4. Community Domain organisational publishing

- Create a domain-owned publisher identity with the administrator recorded as
  the accountable actor.
- Keep organisational allowances separate from every member's personal
  Spotlight entitlement.
- Decide included daily activations, paid activations, concurrency, timezone,
  midnight overlap, correction, replacement, withdrawal, and provider-failure
  treatment.
- Add branch, selected-branch, country/region, and whole-domain scopes without
  exposing branch-private material.
- Define protected internal campaign allocation while keeping ordinary shop
  discovery separate from paid or included Spotlight promotion.

### 5. Appearance, fatigue, attribution, and reporting

- Add an authoritative actual-automatic-appearance record; qualifying
  impressions and automatic appearances must remain different facts.
- Decide and enforce personal repetition caps and cooldown across every
  placement, replay, community, and content version.
- Record genuine playback progress/completion separately from visibility and
  never describe it as comprehension, interest, sale, or verified-human reach.
- Attribute a multi-community presentation once to one authoritative placement
  and update campaign and viewer frequency once.
- Provide reconciled reports for issued leases, qualifying impressions, actual
  appearances, unique viewers, completion, exclusions, and placement.
- Add viewer-level telemetry if GSN needs proof that a particular device
  rendered every scheduled card. The current fair-window regression is not that
  production ledger.

### 6. Capacity and infrastructure

- Replace the current 100-active-campaign and 100-selected-community pilot
  limits only after measured database, queue, query, storage, and delivery
  evidence.
- Add pagination and server-side filtering for inventories beyond the pilot
  limit.
- Prove 100 and 1,000 concurrent-viewer behaviour and then test larger measured
  stages before promising global capacity.
- Verify managed-object storage and CDN delivery independently, including
  retry, expiry, cleanup, and provider-failure behaviour.
- Keep the handset batch bounded; scaling storage does not mean downloading the
  full campaign inventory to each phone.
- Measure memory and query pressure with thousands of active campaigns and use
  queue/background-worker infrastructure where synchronous delivery is no
  longer safe.

### 7. Real-world acceptance

- Repeat phone testing with multiple signed-in viewers, communities, domains,
  regions, timezones, and permission combinations.
- Confirm the deployed 19-item fair rotation with a real eligible inventory,
  while recording why any uploaded item is excluded.
- Test permission withdrawal, partial exclusion, expired media, failed media,
  mixed membership, and advertiser contact actions on actual phones.
- Do not promise that every campaign will be seen within 24 hours when the
  eligible inventory is larger than the genuine opportunities available.

## Baseline already completed

Do not reopen these as missing unless a real regression is found:

- one-to-ten prepared media queue and explicit review/publish path;
- active free-community eligibility and Community Domain exclusion;
- advertiser international contact captured and exposed as a call action;
- bounded five-item handset response;
- deterministic adjacent fair windows and one-pass phone queue;
- up to 100 active GSN-house pilot promotions and 10,000 bounded delivery
  rounds;
- emergency stop, audit history, reference-safe cleanup, deployment, and live
  contract verification.

## Recommended order for tomorrow

1. Approve the independent-role vocabulary and role/authority matrix.
2. Choose the smallest partner pilot and its prohibited actions.
3. Decide referral attribution and commercial/payout truth before designing an
   earnings screen.
4. Map the required backend subject, actor, permissions, audit, and frontend
   route without changing unrelated member or Community Domain contracts.
5. Approve acceptance scenarios and any freeze exceptions.
6. Only then implement the smallest reversible slice and test it with a real
   independent user account.
