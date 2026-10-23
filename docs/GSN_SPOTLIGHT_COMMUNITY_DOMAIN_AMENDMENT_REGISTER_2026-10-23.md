# GSN Spotlight and Community Domain Amendment Register

**Recorded:** 2026-10-23

**Planning period:** Q4 2026

**Status:** Working product and engineering amendment register
**Implementation status:** One bounded backend foundation is implemented locally; no migration, billing activation, staff UI, commit, deployment, or full-programme completion

## 1. Purpose

This register preserves the Spotlight, Community Domain, organisational
publishing, central advertising, playback, repetition, and delivery-capacity
findings established during the October 2026 product review.

It exists so later ideas can be evaluated against one durable record instead
of relying on chat history. It is an amendment backlog and test contract, not a
claim that every proposed rule is already implemented or finally approved.

The implementation objective is to fill verified gaps through the existing
canonical Spotlight system while preserving:

- existing member entitlements until an explicit amendment is approved;
- payment and Pipeline Credit controls;
- campaign, placement, exposure, and evidence integrity;
- qualification-time presentation accounting;
- self-delivery exclusion;
- Community Domain governance and shop visibility boundaries;
- frozen Public Shop, Shop Control, Marketplace, Community Home, and Dashboard
  presentation contracts unless a separately approved exception is recorded.

## 2. Truth labels used in this register

| Label | Meaning |
|---|---|
| **Confirmed current behaviour** | Directly supported by repository code, tests, freeze records, or deployed handoff evidence. |
| **Verified gap** | The required capability is missing, incomplete, ambiguous, or not enforced by the authoritative path. |
| **Owner direction** | Product intent stated by the product owner and preserved for specification. It may still need exact limits and tests. |
| **Trial proposal** | A suggested starting policy that needs measurement and may change. |
| **Open decision** | A material choice that must be settled before implementation. |
| **Rejected interpretation** | A formulation that would be unsafe, misleading, or inconsistent with the intended product. |

When labels conflict, confirmed current behaviour describes the system today.
An owner direction or trial proposal describes a possible amendment, not
existing behaviour.

## 3. Confirmed current Spotlight behaviour

### 3.1 Canonical surface and delivery contract

- The authenticated Public Shop Spotlight rail is the canonical live member
  presentation surface.
- Dashboard does not own a second live Spotlight fetch or rotation engine.
- Shop Control owns the publisher workflow and authoritative owner-facing
  status. Owner inspection is not a qualifying delivery to the owner.
- Public Shop selection and visibility are bounded. The backend selects
  governed opportunities instead of dumping the complete inventory into the
  browser.
- Public Shop can return counted fresh presentations, bounded same-viewer
  replay, and non-counting canonical visibility rows. Replay and visibility
  rows preserve content continuity but do not consume another delivery round
  or create another qualifying exposure.

Repository and freeze references:

- `docs/FREEZE_POLICY.md` Spotlight system-feed and presentation exceptions.
- `docs/HANDOFF_NOTES.md` Spotlight qualification, visibility-continuity, and
  system-feed records.
- `gmfn_backend/app/api/routes/marketplace.py` canonical Public Shop and
  publication routes.

### 3.2 Media and playback

- New Spotlight video is accepted only through the shared authenticated media
  preparation path.
- The server requires at least one second of usable output and physically
  retains no more than the opening ten seconds.
- The currently approved Public Shop dwell is five seconds for the pilot-sized
  queue. Larger queues shorten gradually against the bounded cycle target,
  with a two-second floor.
- A current item receives its own visible dwell; background, hidden-tab,
  off-screen, interaction-paused, and previous-item time do not consume that
  dwell.
- A presentation cannot qualify until its picture or video reports ready.

### 3.3 Qualification and accounting

- A technical qualifying presentation requires the existing continuous
  visibility threshold: at least one second and at least 60% visible while the
  tab and presentation are active and media is ready.
- Fetching creates a bounded reservation. A delivery round is consumed only
  when visible qualification is accepted.
- Qualification, exposure creation, and round consumption are protected by
  the canonical lease/accounting path.
- A failed or abandoned unqualified presentation does not create a qualifying
  impression.
- Playback completion is not the same as technical qualification and is not
  proof that the viewer understood the message.

### 3.4 Existing campaign and viewer limits

- The default campaign allowance is ten counted qualifying delivery rounds
  globally across the canonical campaign and all of its placements.
- The ordinary viewer-plus-campaign counted cap is two qualifying impressions.
- A live DemandBox match may provide one additional counted exposure.
- Frequency history is campaign-level for the viewer; another placement or
  community must not create a new viewer allowance.
- Replay and non-counting visibility can produce more visual appearances than
  the counted impression total. There is not yet a durable cap covering every
  actual automatic appearance path.
- Campaign owners are excluded from self-delivery; owner preview/inspection is
  separate and accounting-neutral.

Service references:

- `gmfn_backend/app/services/spotlight_delivery_pacing_service.py`
- `gmfn_backend/app/services/spotlight_frequency_control_service.py`
- `gmfn_backend/app/services/spotlight_presentation_service.py`

### 3.5 Publisher rules and placement behaviour

- The free pilot provides one free Spotlight publication run per member per
  UTC day, not one free run per community placement.
- A valid voluntarily withdrawn free campaign still consumes that daily run.
- Paid/direct publication remains separate from Network Repost and requires
  the corresponding entitlement.
- A partial unique index presently permits only one active Spotlight campaign
  per `owner_user_id`.
- Direct member campaigns currently use a 24-hour authorisation lifetime.
- A free shop/member publication can create one canonical campaign with
  placements across the publisher's active eligible communities where the shop
  is visible. It is not necessarily confined to the community from which the
  workflow was opened.
- Direct paid publication is narrower in the inspected route and targets the
  resolved/origin community.
- Current mixed-community publication policy can fail as an all-or-nothing
  operation when an included community blocks Spotlight, rather than excluding
  only the ineligible destination with an explanation.

Code references:

- `gmfn_backend/app/api/routes/marketplace.py`
- `gmfn_backend/app/db/models.py`, index
  `uq_spotlight_campaigns_one_active_owner`
- `frontend/tools/audit-spotlight-system-feed.mjs`

### 3.6 Community Domain Spotlight configuration

- Community Domain setup includes Spotlight mode information and currently
  emits these setup values:
  - `free_slots: 3`;
  - `paid_after_slots: 5`;
  - `rotation_hours: 24`.
- These values are verified at
  `gmfn_backend/app/api/routes/community_domains.py` near the setup payload.
- The surrounding boundary says these are front-door setup preferences and do
  not activate billing or the final runtime contract.
- No authoritative publication, delivery, or payment enforcement was found
  that turns those three values into functioning Spotlight capacity.
- The Community Domain setup defaults Spotlight mode to `admin_only`.
- The shared Spotlight feature guard currently blocks `off`, but the inspected
  authoritative publisher does not fully enforce the semantic differences
  between `admin_only`, member submission with approval, and direct member
  publishing.

### 3.7 Eligibility and viewing context

- The current Public Shop opportunity endpoint derives eligibility from the
  viewer's active community memberships.
- It does not receive and authoritatively enforce a complete “the member is
  currently inside Community Domain X” presentation context.
- A member belonging to several communities can therefore qualify through the
  union of their eligible memberships.
- An outsider does not receive a direct community placement merely because it
  exists; a valid shared membership or governed affiliation route is needed.
- The same viewer and campaign history remains shared when several community
  routes could make the campaign eligible.

### 3.8 Community scale truth

- Community membership size does not presently determine campaign capacity.
- A church with 3,000 members still gives an ordinary campaign ten counted
  qualifying rounds, not 3,000 deliveries.
- Ten unique recipients would be about 0.33% of a 3,000-member community.
  Repeated counted delivery can make unique reach lower.
- The system does not guarantee that any named member, every member, or a
  defined percentage of the community sees the campaign.
- There is no enforced community-wide limit corresponding to the setup values
  of three free slots and paid after five. Conditional on individual rules,
  many different members may each publish their own active campaign.

### 3.9 Central administration and commercial lifecycle

- GSN has a reusable canonical Spotlight engine and placements.
- A bounded backend foundation now lets a platform administrator preview
  eligible/excluded community destinations and publish one 24-hour GSN house
  campaign into selected active free communities by default while respecting
  explicit Community Domain exclusions. It preserves the
  canonical campaign, placement, content-version, eligibility, presentation,
  and TrustEvent paths.
- It still does not have a complete authorised GSN Command Centre operation
  for scheduling, funding, central-specific capacity, withdrawal, management,
  reporting, or staff-facing operation end to end.
- Community Domain subscription and advertiser-payment lifecycles are not yet
  complete enough to sell the proposed GBP 10 monthly / GBP 99 annual control
  or central advertising products as operational facts.
- Existing free-pilot and suspended payment states do not establish a
  permanent free commercial plan.

## 4. Verified gaps to amend

### G1. No authoritative active-community presentation boundary

GSN cannot yet reliably guarantee that a central advertisement permitted by
Community B will be withheld while a multi-community member is actively inside
Church A, which has declined central advertisements.

### G2. No explicit validated general/mixed context

A legitimate mixed GSN view is not the same as a request that lacks context.
The future contract needs explicit contexts such as domain, branch, ordinary
community, and general/mixed. Missing, invalid, or forged context must fail
closed for context-sensitive central advertising.

### G3. Community Domain mode semantics are incomplete

`off`, `admin_only`, member-submits/admin-approves, and direct-member-publish
must be enforced by the backend, not merely displayed or stored.

### G4. Shop discoverability and Spotlight promotion are not specified as
separate entitlements

An eligible shop should be findable according to its visibility rules. That
must not silently create a free promotional campaign. If ordinary shops are
recommended without an active Spotlight, that is a separate shop-discovery
feature with its own label, ranking, evidence, and limits.

### G5. No protected internal Community Domain allocation

There is no complete policy ensuring that active internal campaigns receive a
protected share of genuine presentation opportunities while a member is
inside the relevant Community Domain.

### G6. Ten global rounds cannot provide domain-scale or network-scale reach

Campaign capacity, personal frequency, and inventory allocation are currently
too closely coupled for the proposed Community Domain and central advertising
products. They need separate policies while retaining the canonical
qualification event and ledger.

### G7. Actual automatic repetition is not fully capped

Counted frequency does not cover every replay or visibility path. The same
campaign must not appear twenty times merely because only two presentations
qualified for counting.

### G8. No organisational publisher identity and quota

The church or institution needs to publish as the Community Domain while the
administrator remains the accountable actor. The existing one-active-campaign
per user constraint cannot represent three concurrent organisational campaigns
through one administrator account.

### G9. Organisational slot configuration is ambiguous and unenforced

`free_slots: 3` plus `paid_after_slots: 5` does not explain publications four
and five and is not an active commercial rule.

### G10. No complete branch-aware targeting

Branch only, selected branches, country/region, and whole-domain scopes need
verified hierarchy, permissions, and geographic/timezone data. Whole-domain
targeting must not grant access to branch-private shops or material.

### G11. Central advertising content classification remains incomplete

The bounded foundation now records gsn_house source/content provenance and
house commercial mode separately from member Spotlight. It still cannot fully
distinguish or govern Community Domain organisational campaigns,
cross-community member campaigns, external commercial campaigns, and
mandatory service or safety notices.

### G12. No paid-control / free-ad-supported subscription contract

Subscription status and central-advertising choice are not separately and
operationally represented. Renewal failure and plan transition are not defined.

### G13. No complete central campaign scheduler or capacity product

Existing dates and pacing primitives do not amount to a Command Centre that
can sell and enforce destination, timezone, peak/off-peak, lifetime, delivery,
frequency, funding, hold, replacement, withdrawal, and reporting commitments.

### G14. No deterministic multi-community delivery attribution contract

When one campaign and viewer are eligible through several communities, one
presentation must be recorded once, attributed to one authoritative placement
allocation, and counted once in campaign-global and viewer-frequency records.

### G15. Permission withdrawal and partial exclusion need complete behaviour

An activation snapshot should preserve the authorised destination history, but
current permission must control future delivery. Withdrawal by one destination
must not terminate the campaign in other permitted destinations.

### G16. Large-inventory fairness cannot be promised within short expiry

If 3,000 active campaigns compete for 60 actual internal opportunities per
viewer per day, one pass would take 50 days. A 24-hour campaign must not be
silently extended to manufacture a fairness claim.

## 5. Owner directions preserved for specification

These directions are saved as product intent. They are not recorded as current
behaviour.

### D1. Community Domain internal economic visibility

- Every eligible active shop should remain discoverable by authorised members
  according to its shop and branch visibility rules.
- Active internal member campaigns should receive fair internal presentation
  opportunities during their authorised lifetime.
- Community Domain internal inventory should not have to compete only against
  the entire wider GSN network.
- Other memberships, interests, DemandBox relevance, and permitted central
  material may supplement the community experience under explicit policy.

### D2. Member and organisation rights remain separate

- An individual member's Spotlight entitlement remains the member's own.
- The Community Domain organisation receives a separate organisational
  publishing allowance.
- Organisational use must not consume its members' personal allowances.
- Member publications must not consume the organisation's included quota.

### D3. Proposed organisational offer

- The first three Community Domain organisational Spotlight activations in the
  defined local day are intended to be included.
- The fourth and subsequent organisational activations are intended to require
  payment or another entitlement.
- This intended rule supersedes neither code nor billing until concurrency,
  timezone, activation, correction, replacement, and charging details are
  approved.

### D4. Paid community control and free/ad-supported service

- A paid Community Domain at the stated proposal of GBP 10 monthly or GBP 99
  annually receives control over whether central GSN commercial advertising is
  permitted inside its domain context.
- Payment does not have to mean automatic ad-free operation; an authorised
  administrator may still permit relevant central advertising.
- A free/ad-supported plan may require controlled central-advertising
  permission as a condition of service.
- “Ad-supported” never means unlimited repetition. Personal fatigue, content,
  safety, timing, and governance controls continue to apply.
- Subscription status and advertising choice must be separate records.
- Renewal failure must not silently and immediately become permission to
  advertise. Notice, grace, and an explicit plan transition are required.

### D5. Community and mixed views must coexist

- Inside a Community Domain, that domain's rules and protected internal
  allocation govern the presentation.
- Inside another community, that community's rules govern it.
- An explicitly validated general/mixed view may combine material from several
  memberships under its own documented policy.
- Membership elsewhere must not override the policy of the active domain.

### D6. Branch and regional reach

- An authorised organisational publisher should be able to select one branch,
  selected branches, a verified region, or the whole Community Domain.
- Central GSN administrators should ultimately be able to select explicitly
  permitting communities or verified regions.
- Regional timing must use destination timezones, not a continent-level clock.

### D7. Immutable institutional identity

- A Community Domain must use its existing suitable immutable system ID as its
  canonical identity.
- A telephone number may be verified contact or recovery information but must
  not become the permanent Community Domain primary key.
- An organisational shop may be related to the domain, but the domain must not
  cease to exist merely because that shop changes or closes.

## 6. Trial proposals preserved, not finalised

### T1. First-presentation playback protection

- Keep the current one-to-ten-second accepted prepared media range.
- When GSN automatically presents a campaign for the first eligible time,
  provide at least six seconds of card availability.
- Allow any longer prepared video to finish, up to ten seconds, while the
  viewer remains present.
- A four-second video should play once and leave its finished card visible for
  the remaining two seconds; it should not loop merely to fill the interval.
- Reaching a frequency cap during the current playback blocks a future
  automatic appearance and does not cut off the current eligible message.

### T2. Repetition protection

| Situation | Proposed stop for future automatic appearances |
|---|---|
| Ordinary campaign | 2 qualifying impressions or 3 actual automatic appearances, whichever comes first |
| Live DemandBox exception | 3 qualifying impressions or 4 actual automatic appearances, whichever comes first |

- A cooldown is required so exposures do not cluster.
- Four hours is only a candidate trial value, not an established optimum.
- Content edits and placement/community changes must not reset campaign-level
  personal frequency.
- A deliberate user replay may be tracked separately from automatic display.
- Generic declared interest may affect selection but does not currently earn
  the DemandBox third qualifying exposure.

### T3. Protected internal share

- A protected internal share is directionally supported.
- “100 daily opportunities / 60 internal” is an illustration, not a promised
  traffic volume.
- Any percentage applies only to genuine opportunities that actually occur in
  the verified Community Domain context.
- Unused internal capacity can be filled only from content sources that the
  community permits.
- Unseen eligible internal campaigns should normally receive priority before
  spaced repeats when the goal is broad internal variety.

## 7. Content and entitlement model to specify

| Capability | Entitled subject | Required meaning |
|---|---|---|
| Shop discoverability | Eligible active shop | Searchable/openable under its visibility rules; no automatic Spotlight is implied |
| Shop recommendation | Eligible ordinary shop | Separately labelled discovery feature, if approved; not a purchased Spotlight |
| Member Spotlight | Individual member/shop | Time-limited promotion under the member's free or paid entitlement |
| Internal distribution protection | Community Domain | Reserved share of genuine opportunities for eligible active internal campaigns |
| Organisational Spotlight | Community Domain | Institution-authored campaign under a domain-level quota |
| GSN house campaign | GSN | Central informational or promotional campaign under explicit policy and allowance |
| External commercial campaign | Advertiser/GSN | Paid central campaign through destinations that permit it |
| Mandatory service notice | GSN/platform operations | Essential legal, security, safety, or operational notice; not disguised commercial advertising |
| Personal frequency protection | Viewer plus campaign | Cross-community repetition history that cannot be reset by another placement |
| Community advertising control | Community Domain | Content-class permissions enforced in the active context |

## 8. Required presentation-context contract

| Context | Required future behaviour |
|---|---|
| Community Domain | Enforce that domain's content permissions and internal allocation |
| Branch | Enforce branch and parent-domain rules without exposing branch-private material |
| Ordinary community | Enforce that community's Spotlight policy |
| Explicit general/mixed GSN view | Combine eligible memberships under a documented mixed-view policy |
| Missing, invalid, or forged context | Withhold context-sensitive central advertising until the context is established |

The backend must validate context. A client-supplied ID alone cannot authorise
advertising or cross-community access.

## 9. Required multi-community accounting rule

When a canonical campaign and one viewer are eligible through more than one
community:

1. keep one canonical campaign identity;
2. keep distinct placement/allocation records for eligible destinations;
3. choose one authoritative delivery route for the presentation;
4. record one qualifying event, never one per matching membership;
5. attribute the event to the selected placement and capacity allocation;
6. update campaign-global analytics once;
7. update viewer-plus-campaign frequency once;
8. preserve the same personal history when the member changes context.

## 10. Organisational publishing rules still to settle

The proposed three-included-per-day offer requires decisions on:

- Community Domain timezone;
- whether a quota is consumed on submission, approval, activation, first
  qualification, or another event;
- maximum simultaneous active organisational campaigns;
- overlap across midnight;
- correction and replacement treatment;
- withdrawal and refund treatment;
- whether a provider failure restores an allowance;
- paid campaign concurrency;
- delegated administrators sharing the same domain-level quota.

A safe starting proposal is three included activations per local day and no
more than three included organisational campaigns active concurrently. This is
not yet an approved rule.

Organisational campaigns should be owned by the Community Domain subject. The
administrator is the actor recorded in the audit trail, not the economic owner
of the institution's campaign.

## 11. Central Command Centre minimum complete workflow

A central publishing channel is complete only when an authorised GSN
administrator can:

1. create one canonical campaign;
2. classify it as GSN house, external commercial, or another approved class;
3. record publisher and funding identity;
4. upload and approve prepared media;
5. select one or several communities, branches, or verified regions;
6. preview eligible and excluded destinations with reasons;
7. set an absolute start and end;
8. set destination-local delivery windows inside that lifetime;
9. set the campaign capacity and personal frequency policy;
10. activate the canonical campaign and placements transactionally;
11. present it through the existing canonical Public Shop system;
12. report unique reach, qualifying impressions, actual automatic appearances,
    playback completion, placement attribution, and exclusions;
13. hold, replace, withdraw, or partially remove destinations without erasing
    historical evidence.

An activation API alone is not a finished publishing channel.

## 12. Campaign lifetime distinctions

- Current member/direct campaigns retain their existing 24-hour behaviour
  until a separately approved amendment changes it.
- A daily included organisational campaign may use a 24-hour maximum if that
  becomes the approved quota rule.
- Central and external paid campaigns need explicit scheduled start and end
  times based on the contracted product; they should not be forced into an
  unconditional 24-hour lifetime.
- Regional windows operate inside the campaign's absolute lifetime. Moving
  between timezones must not restart campaign lifetime or viewer frequency.
- Expired campaigns must not be silently extended to manufacture fair reach.
  Their underlying shops remain discoverable if still active and eligible.

## 13. Open product decisions

1. What exact Community Domain plan funds protected internal distribution?
2. What protected internal percentage should be trialled, and on which
   surfaces?
3. What is the exact cooldown for ordinary and DemandBox exposures?
4. What campaign-capacity units apply to member, organisational, GSN house,
   and external commercial campaigns?
5. Does the fourth organisational campaign require direct payment, Pipeline
   Credit, a subscription add-on, or another entitlement?
6. What are the organisational concurrency and midnight-overlap rules?
7. Which content classes can a paid community permit or decline separately?
8. Which central content, if any, is mandatory for security/legal operations?
9. What is the plan-transition process after non-payment and grace expiry?
10. What verified source supplies branch geography and timezone?
11. How are regional and branch-level privacy restrictions represented?
12. What ranking/fairness method operates inside the protected internal share?
13. What separates a shop recommendation from a paid/free Spotlight in the
    member-facing presentation and evidence?
14. What central campaign capacity can GSN finance and truthfully sell?
15. What reports are visible to advertisers, Community Domain leaders, and GSN
    administrators without exposing personal behaviour improperly?

## 14. Rejected or unsafe interpretations

- Do not promise that every member automatically watches every internal shop
  or campaign. Guarantee discoverability and define fair opportunities instead.
- Do not turn every discoverable shop into a free Spotlight.
- Do not treat a technical qualifying impression as proof of comprehension,
  interest, purchase, endorsement, or trust.
- Do not interpret “ad-supported” as unlimited advertising.
- Do not use a phone number as the Community Domain primary identity.
- Do not let another membership override the active Community Domain's policy.
- Do not treat a missing context as an intentional mixed view.
- Do not reset frequency when a campaign moves community, branch, region, or
  time window.
- Do not cut off the current eligible video merely because its qualification
  reaches the cap.
- Do not extend an expired campaign silently to meet a reach target.
- Do not make an administrator's personal account the permanent organisational
  publisher identity.
- Do not create a second Spotlight engine, exposure ledger, or payment engine
  when the canonical machinery can be extended safely.

## 15. Staged amendment plan

### Stage 0: approve the specification and freeze exceptions

- Resolve the open decisions above.
- Identify the exact frozen contracts that need intentional amendment.
- Approve acceptance scenarios before changing code.

### Stage 1: observability and targeted contract tests

- Trace every automatic presentation, replay, and deliberate replay path.
- Add failing tests for context leakage, mode enforcement, double attribution,
  permission withdrawal, playback completion, and actual appearance caps.
- Preserve existing accounting while proving the gaps.

### Stage 2: context, origin, and permission foundation

- Add backend-validated domain, branch, community, and mixed contexts.
- Add explicit campaign/content origin classes.
- Enforce Community Domain feature modes and content-class permissions.
- Recheck permission at delivery time while preserving activation history.

### Stage 3: internal discoverability and distribution

- Prove every eligible shop remains discoverable under visibility rules.
- Keep ordinary shop recommendation separate from Spotlight.
- Add protected internal allocation for active eligible campaigns.
- Add deterministic placement/capacity attribution.

### Stage 4: playback and fatigue protection

- Protect the complete eligible first presentation under the approved rule.
- Record playback progress/completion separately.
- Add actual automatic-appearance counting and cooldown.
- Preserve counted qualification and DemandBox-specific exception semantics.

### Stage 5: campaign-capacity policies

- Replace the one-size ten-round allowance only for explicitly approved
  campaign classes.
- Preserve ordinary member entitlement until its amended policy is approved.
- Keep personal frequency independent from campaign capacity.

### Stage 6: Community Domain organisational publishing

- Add domain-owned publisher subject and actor audit.
- Enforce domain-level daily and concurrency quota.
- Add branch, selected-branch, and whole-domain targets.
- Preserve member entitlements separately.

### Stage 7: selected-community GSN Command Centre workflow

- Deliver one complete creation-to-reporting path for one or several selected
  permitting communities.
- Do not call the feature complete until public presentation, permission,
  management, withdrawal, and reporting are verified.
- Partial implementation on 2026-10-23: platform-admin preview and immediate
  publish now create one canonical GSN house campaign and selected active
  placements, with destination reasons, idempotency, institutional publisher
  identity, actor/subject audit separation, and delivery-time advertising-
  exclusion revalidation. Active free communities are allowed by default;
  Community Domain lifecycle, Spotlight-off policy, or an explicit central-
  advertising exclusion blocks delivery. An admin-only named destination catalogue now supplies the
  selection data without requiring hidden IDs. The registered
  /app/command-center/gsn-campaigns screen now completes the controlled
  named-destination, media preparation, read-only review, explicit
  confirmation, immediate publish, and result path. The same screen now shows
  current status and compact history, canonical delivery-round and qualified-
  presentation counts, current destination-policy decisions, and an audited
  idempotent emergency stop that invalidates pending leases without erasing
  history. Discarded unpublished reviews use reference-safe managed-media
  cleanup. Scheduling, playback/completion analytics, central capacity,
  advertiser billing/refunds, regional targeting, and the independent GSN
  market remain.

### Stage 8: subscription and advertiser payment

- Complete paid-control and free/ad-supported lifecycle.
- Complete campaign funding, spend, payment failure, refund, and evidence
  rules before selling the services.

### Stage 9: regional and wider-network expansion

- Expand only after selected-community behaviour is proven.
- Require verified geography/timezone, bounded fan-out, performance evidence,
  and permission-withdrawal tests.

## 16. Acceptance scenarios for later implementation and pilot testing

### Community and commercial boundaries

- A paid Church A that declines central advertising receives no central or
  external commercial campaign while the member is inside Church A, even if
  another membership permits it.
- The same member can receive an eligible central campaign inside Community B
  or in the explicit mixed view, without Church A supplying permission.
- A free/ad-supported domain receives only governed, frequency-controlled
  central advertising under its accepted plan.
- Missing or forged context does not open a central advertising route.

### Shops and internal campaigns

- All eligible active Church A shops are reachable through discovery according
  to their visibility rules.
- A shop without an active Spotlight is not silently inserted as a Spotlight.
- An active internal member campaign can compete inside the protected internal
  share during its authorised lifetime.
- Expiry removes promotion but not the underlying eligible shop.
- Branch-private material remains private during whole-domain targeting.

### Frequency and playback

- The first eligible presentation keeps the approved card/video time while the
  viewer remains present.
- A cap reached during playback prevents the next automatic appearance and
  does not interrupt the current message.
- Ordinary and DemandBox caps apply across all community placements.
- Replay/visibility cannot evade the actual automatic-appearance cap.
- A content edit does not renew the viewer's campaign frequency allowance.

### Accounting

- One presentation eligible through two memberships creates one qualifying
  event and one placement attribution.
- Owner preview consumes no member delivery round.
- Background fetch, callbacks, retries, and failed media consume no actual
  appearance or qualifying impression.
- Playback completion is recorded only when the media genuinely completes
  while eligible and visible.

### Organisational publishing

- The Community Domain, not the administrator personally, owns the campaign
  entitlement.
- All delegated administrators share one domain-level quota.
- Included, paid, replacement, withdrawal, failure, concurrency, and timezone
  rules produce deterministic results around midnight.
- Member campaigns never consume organisational quota and vice versa.

### Central publishing

- An authorised GSN administrator can preview eligible and excluded
  destinations before activation.
- Activation creates one canonical campaign and only permitted placements.
- A destination withdrawing permission stops future delivery there without
  stopping other permitted placements or rewriting history.
- Scheduled regional windows do not reset lifetime or viewer frequency.
- Reports reconcile unique reach, qualifying impressions, actual appearances,
  completion, campaign capacity, and placement attribution.

## 17. Risks to carry into implementation

- Cross-community privacy or advertising leakage from an untrusted context.
- Double counting when one viewer qualifies through multiple memberships.
- Destroying existing member entitlements while introducing organisational or
  central entitlements.
- Breaking frozen Public Shop qualification and accounting reliability.
- Queue starvation or unfairness with large internal inventory.
- Memory/query pressure from thousands of active campaigns.
- Artificial reach claims produced by non-counting visibility rows.
- Ambiguous plan transitions creating advertising without informed permission.
- Timezone and midnight quota gaming.
- Administrators evading domain quota through multiple personal accounts.
- Shop visibility escalation caused by whole-domain or regional targeting.
- Unsustainable central delivery commitments without measured cost and traffic.
- Treating analytics as proof of attention, comprehension, sale, or trust.

## 18. Definition of complete for this amendment programme

The programme is not complete merely because a campaign creation endpoint
exists. Completion requires:

- approved product decisions and freeze exceptions;
- backend-enforced context and permissions;
- preserved canonical evidence and accounting;
- internal shop discoverability without accidental free promotion;
- tested internal campaign allocation;
- tested playback and actual repetition controls;
- domain-owned organisational publishing;
- complete selected-community central workflow;
- operational subscription/payment controls before sale;
- real multi-member, multi-community phone tests;
- reconciliation of delivery, appearance, completion, reach, and capacity
  reports;
- no regression to member publishing, Shop Control, Public Shop, Marketplace,
  Community Home, Dashboard, Trust evidence, or payment safeguards.

## 19. Immediate status

- Findings: saved.
- Code: bounded GSN house Spotlight publish, operations, reporting, withdrawal,
  and review-media-cleanup path implemented locally.
- Database/migrations: unchanged.
- Billing: unchanged and not activated.
- Frontend: new platform-admin-only Command Centre screen registered and
  implemented. Existing frozen member Spotlight and Dashboard Market Wisdom
  surfaces remain unchanged.
- Independent GSN market: not implemented in this slice.
- Commit/deployment: authorised after local verification; exact commit and
  deploy evidence belongs in the publishing-session report.
- Next use of this register: compare each new product idea against the current
  behaviour, gaps, decisions, risks, and acceptance scenarios before deciding
  whether GSN already accommodates it or needs a bounded amendment.
