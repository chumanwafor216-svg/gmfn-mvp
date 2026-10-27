# GSN Spotlight Timing and Fairness Pre-measurement Audit - 2026-10-27

Status: source and test audit complete; physical-phone measurement pending.
No rotation, dwell, selection, qualification, pacing, exposure, eligibility,
quota, UI or frozen specification behavior was changed.

## Unabated conclusion

The repository proves that Public Shop has a count-aware dwell formula, but it
does **not** prove that a global inventory of 30-40 campaigns currently gives
each item a three-to-four-second dwell.

The formula is:

`min(5,000 ms, max(2,000 ms, floor(120,000 ms / current handset queue size)))`

However, the canonical v2 endpoint returns one bounded window of up to four
eligible campaigns at a time. The phone refills near the end of that queue and
deduplicates campaigns already waiting. The dwell function receives the
current phone queue count, not the server's total eligible inventory count.
Under the intended canonical flow, that queue should normally remain far below
25 items and therefore stay at five seconds.

Consequences:

- the two-minute compression policy exists and is frozen in source/spec/tests;
- the current canonical architecture normally prevents total inventory from
  directly driving that formula;
- the owner's observation of very short appearances may still be completely
  real, but the source alone does not yet identify its cause;
- changing five seconds to eight or ten seconds before measuring would hide
  evidence and could leave the actual churn/fairness defect intact.

No recording file is present in the repository or attached to this task, so
the planned 12-minute device measurement remains required.

## Current client timing contract

`frontend/src/lib/spotlightPresentationPolicy.ts` owns:

- standard dwell: 5,000 ms;
- minimum compressed dwell: 2,000 ms;
- target maximum queue cycle: 120,000 ms;
- qualifying visibility threshold: 1,000 ms;
- minimum visible ratio: 60%;
- interaction pause: 8,000 ms.

The current media preparation contract keeps at most the opening ten seconds
of an uploaded Spotlight video. Public Shop nevertheless rotates the card on
the same queue dwell as an image. At a five-second dwell, a prepared ten-second
video ordinarily shows only its first half before the next item. A three-second
dwell would show still less. Qualification after one visible second does not
mean the message was usefully viewed.

### Timer behavior

The Public Shop timer:

1. waits until the current media is ready or declared unavailable;
2. starts a fresh visible-time budget for the active occurrence;
3. pauses while the document is hidden, the rail is off-screen, the member is
   interacting, or keyboard focus is within the Spotlight;
4. removes the occurrence after its complete dwell instead of wrapping it to
   the front;
5. waits for the next media to preload and skips a next item that becomes
   unavailable;
6. asks for another canonical window as the remaining queue approaches two
   items.

These protections generally lengthen an appearance or prevent a blank
transition. They do not by themselves explain a genuine two-to-three-second
visible card under a small canonical queue.

### Server-deadline behavior

Canonical presentations, replays and non-counting visibility rows have short
server deadlines. Public Shop refuses to start a canonical row when less than
one intended dwell remains before its deadline. That can cause a row to be
skipped without being shown; it should not create a deliberately shortened
showing. The recording must distinguish a short showing from a skipped row or
media transition.

## Current server selection sequence

For a signed-in viewer, the server performs materially different decisions:

1. Candidate building applies current campaign, placement, membership,
   availability, self-delivery and route eligibility.
2. Diversity allocation may reorder a source after sufficient exposure
   history; Demand Box matches have an exemption.
3. Per-viewer frequency control allows two qualifying impressions for a normal
   campaign, with one bounded Demand Box override where applicable.
4. Persistent pacing selects whether one fresh presentation may reserve a
   counted delivery opportunity.
5. The endpoint also returns short-lived, tokenless visibility rows so pacing
   or frequency does not make otherwise eligible live content disappear.
6. Qualified same-viewer replays may fill continuity gaps without counting as
   new delivery or exposure.

The client gives each returned occurrence one queue slot. It still sorts rows
by rotation weight and activation time before moving the fresh presentation to
the front, but it no longer repeats a paid row multiple times inside the same
handset queue. Rotation weight can affect order; it does not currently create
multiple phone occurrences in one bounded pass.

## Why `fairness` cannot mean equal raw counts

Equal appearance counts across every database campaign would be wrong because
campaigns may differ in:

- viewer/community eligibility;
- self-delivery exclusion;
- current lifecycle and placement validity;
- opportunity relevance and Demand Box match;
- content availability and media readiness;
- per-viewer frequency history;
- pacing state and remaining counted rounds;
- paid/free entitlement and authorised expiry;
- timed schedule, correction hold, withdrawal or replacement state.

The defensible measurement denominator is:

> campaigns eligible for this exact viewer, route and observation interval,
> with ready media and an unexpired placement when their window was requested.

Even then, counted qualifying impressions and visible appearances are not the
same thing. Tokenless visibility and replay rows are intentionally visible but
accounting-neutral.

## Evidence the database has—and does not have

### Available

- presentation lease issuance and expiry;
- accepted one-second qualifying impressions;
- viewer/campaign/content version;
- placement and allocation route;
- relevance flags;
- campaign pacing and delivery-round state;
- exposure event times;
- current lifecycle/expiry and media references.

### Missing for this diagnosis

- actual visible start and end time for every occurrence;
- full-dwell completion;
- media-ready and media-unavailable transition times;
- preload wait and gap duration;
- client queue length used for each dwell;
- queue window/cursor attached to each visible occurrence;
- reason a displayed item advanced or was skipped;
- video playback position when the card advanced;
- non-counting visibility/replay appearance log;
- tab/viewport/pause timeline;
- deployed frontend revision recorded with the observation.

Therefore the existing exposure ledger can prove accepted qualification, not
readable dwell or equal appearance frequency.

## What the 12-minute recording must capture

Record one uninterrupted signed-in Public Shop session on the affected phone.
Keep the Spotlight rail visible unless testing a deliberate pause. Capture the
screen clock or a separate timer and record:

| Field | Purpose |
|---|---|
| Deployed commit/build marker | Separates current code from a stale PWA bundle |
| Viewer identity and selected community, recorded privately | Defines eligibility context without publishing it |
| Visible item/campaign label | Counts appearances without relying on position |
| Appearance start and end timestamp | Calculates actual dwell |
| Image or video | Separates media-type behavior |
| Video playback start/end position | Shows whether a meaningful clip was cut off |
| Blank/loading/unavailable transition | Measures transition failure |
| Interaction, focus, scroll or tab change | Explains legitimate pauses |
| Repeat number and previous-seen gap | Measures recurrence |
| GSN-HOUSE, ordinary shop, paid/free and timed state | Separates governed classes |
| Contact/action tap | Explains the intentional eight-second interaction pause |

After the recording, join visible labels to the API and persisted campaign,
placement, lease, exposure and pacing records for the same interval.

## Calculations

For each valid visible occurrence:

- `dwell_ms = end timestamp - start timestamp`;
- mark `short` below the intended dwell minus a small recording tolerance;
- mark `gap` when no valid current item is visible;
- mark `cut_video` when rotation occurs before the prepared clip's useful end;
- mark `repeat` if the campaign appeared previously in the session;
- calculate gaps between appearances per campaign;
- calculate eligible campaigns never shown during the observation;
- separate counted fresh presentations, tokenless visibility and replays.

Report at minimum:

- median and 10th-percentile dwell by image/video and campaign class;
- shortest five valid dwells with explanation;
- total blank/loading time;
- appearance count distribution for the eligible denominator;
- unseen eligible campaigns;
- consecutive repeats;
- longest repeat gap;
- server windows requested and response campaign order;
- qualification acceptance/rejection alongside—not instead of—visible dwell.

## Hypotheses to prove or destroy

1. **Unexpected client queue growth:** the live handset has more than 24
   queued rows, activating the compression formula despite bounded-window
   design.
2. **Stale/deployed-code mismatch:** the phone is running a prior service
   worker bundle or a revision that predates the bounded queue repairs.
3. **Deadline churn:** rows arrive too near their 30-second deadline and are
   skipped or replaced in a way that looks like short display.
4. **Refresh/state churn:** a canonical refill or unrelated page refresh
   replaces the active object/timer before intended completion.
5. **Media readiness failure:** preload timeout or unavailable media causes
   rapid skipping or visible gaps.
6. **Presentation-type confusion:** counted fresh rows, non-counting visibility
   and replays are being read as one equal-delivery stream.
7. **Real selection unfairness:** deterministic windows or client
   deduplication repeat campaigns before all continuously eligible campaigns
   have appeared.
8. **Perceived rather than timed insufficiency:** five seconds is being
   delivered correctly but is too short for the actual text or ten-second
   video message.

The last hypothesis is still a valid product defect. It is simply different
from a timer or fairness defect.

## Decision candidates after measurement

### If delivered dwell is shorter than policy

Repair the cause first. Do not mask it by increasing a constant. Preserve
viewport pause, media readiness, bounded windows, self-exclusion,
qualification and accounting.

### If five seconds is delivered but unreadable

Replace the readability policy explicitly. The leading candidate to test is a
fixed eight-second minimum useful dwell for every image and prepared video,
with no two-minute compression. A ten-second video-aware rule may better match
the prepared clip, but it makes a 40-item pass about 6 minutes 40 seconds and
must be evaluated against discovery latency.

Illustrative pass time, ignoring pauses/preload:

| Eligible items | 5 seconds | 8 seconds | 10 seconds |
|---:|---:|---:|---:|
| 24 | 2:00 | 3:12 | 4:00 |
| 30 | 2:30 | 4:00 | 5:00 |
| 40 | 3:20 | 5:20 | 6:40 |

These longer passes are not automatically unfair. They trade repeat speed for
message comprehension. Fair server window advancement matters more than
forcing every campaign into an arbitrary two-minute loop.

### If appearances are unequal after eligibility is controlled

Repair cursor/window/dedupe ordering separately from dwell. Do not promise
equal delivery across different entitlements or eligibility. Add diagnostic
appearance telemetry only if its privacy, retention and accounting-neutral
status are explicit.

### If only video messages are cut off

Test media-aware dwell capped by the prepared clip duration while keeping image
dwell fixed. Do not rely on browser-reported natural duration until the saved
prepared asset and fallback behavior are verified. Qualification must remain a
separate one-second accounting threshold unless the commercial contract is
deliberately changed.

## Frozen files and change gate

The current five-second / two-minute / two-second rule is frozen in:

- `docs/FREEZE_POLICY.md`;
- `docs/SCREEN_SPECS.md`;
- `frontend/src/lib/spotlightPresentationPolicy.ts`;
- `frontend/tools/audit-spotlight-presentation-contract.mjs`;
- the Public Shop phone smoke's readable-dwell assertions;
- handoff records describing the approved 2026-10-17 rule.

Any timing correction must be an explicit owner-approved exception and update
the specification, policy module, regression audit and phone smoke together.
It must not modify the frozen Dashboard Market Wisdom presentation.

## Baseline verification

Before this audit was recorded:

- `npm run audit:spotlight-presentation-contract` passed;
- all 19 tests in
  `gmfn_backend/tests/test_spotlight_presentation_contract.py` passed.

Those checks prove the current contract remains internally consistent. They do
not prove physical-phone readability or long-run fairness.

## Next action

Obtain the 12-minute recording and the exact observation time/build marker.
Then complete the timestamp table, correlate it with server records, classify
the finding as timing, transition, deployment, eligibility, or fairness, and
only then approve the smallest correction.
