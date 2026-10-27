# GSN Spotlight Timing and Fairness Measurement Correction - 2026-10-27

Status: owner-approved policy correction implemented; automated verification
and post-deployment physical-phone validation are required before the runtime
result is called proven on a real handset.

## Unabated conclusion

The supplied recording proves that one universal five-second policy is not a
sufficient video contract. It does not prove that the deployed carousel
rotated campaigns below five seconds, because several apparent two-to-three
second visual changes are scene cuts inside one continuing video.

The recording also shows identical static artwork remaining visually unchanged
for about fifteen seconds. The recording alone cannot determine whether that
was one stalled campaign, multiple presentation types for one campaign, or
distinct campaigns sharing one creative. Media URLs are therefore not campaign
identities and must not be used to discard a legitimate campaign.

## Recording evidence and limits

- File reviewed: `SVID_20261026_133304_1.mp4`.
- Measured duration: 603.45 seconds.
- Recorded interval: approximately 13:33-13:43 on 26 October 2026.
- The recording followed the recent queue/fairness deployment. Another
  deployment began while recording, but an already-open single-page app would
  normally retain its loaded JavaScript bundle.
- Half-second frame inspection can identify visible creative changes but cannot
  equate every scene change with a carousel rotation.
- No campaign-ID overlay existed in that build, so identical creative could not
  be attributed honestly to a campaign or presentation type.

These limits destroy two tempting but unsupported claims: the recording does
not prove sub-five-second campaign dwell, and it does not prove one campaign
was repeated merely because the pixels looked the same.

## Owner-approved replacement contract

Public Shop Spotlight now uses effective-media timing:

| Effective medium | Visible dwell after readiness |
|---|---:|
| Image | 5,000 ms |
| Video shorter than 8 seconds | 8,000 ms; existing loop fills the minimum |
| Video from 8 through 10 seconds | Reported duration |
| Video longer than 10 seconds | 10,000 ms |
| Video with missing/non-finite duration | 10,000 ms |
| Failed video with a loaded cover | Governed image; 5,000 ms |

The former queue-size compression, two-minute cycle target and two-second floor
are removed. The one-second, 60%-visible active-tab threshold remains an
accounting qualification rule; it is not the user-facing dwell.

## Readiness and pause boundary

The dwell clock starts only after the effective medium is ready.

- A loaded poster cannot start a pending video's clock.
- Video readiness requires current playable media data; reported duration is
  stored with that media key.
- If video fails, its cover must load before the occurrence becomes an image.
- Preload time, hidden-tab time, off-screen time, keyboard-focus time and the
  existing contact/interaction pause do not consume dwell.
- Reduced Motion may prevent motion playback but does not change the campaign's
  governed video dwell.
- The active occurrence remains until the next effective medium is ready; an
  intentional blank transition is forbidden.

Duration/readiness state is keyed by the complete media occurrence key so a
previous clip's duration cannot leak into the next campaign.

## Server window and lifetime correction

- Each canonical visibility response contains at most two distinct campaign
  IDs.
- The handset refills when one queued occurrence remains.
- Fresh counted presentation tokens remain valid for 30 seconds. They are
  placed first and normally qualify after the separate one-second threshold.
- Tokenless replay and visibility rows may remain valid for at most 45 seconds,
  providing enough lifetime for a queued ten-second video.
- The client starts an occurrence only when the complete calculated dwell fits
  before that row's current server deadline.
- Adjacent governed windows continue to advance without pulling a consumed
  campaign ahead of unseen campaigns in the same sequence.

Eligibility, self-delivery exclusion, exact route/community checks, lifecycle,
availability, content version, pacing, frequency caps, cursor ordering and
fresh/replay/visibility accounting boundaries are unchanged.

## Response compatibility

Older clients continue to receive `passive_rotation_ms: 5000`. The policy now
also reports:

- `image_rotation_ms: 5000`;
- `video_min_rotation_ms: 8000`;
- `video_max_rotation_ms: 10000`;
- `max_items_per_window: 2`;
- `max_stale_display_seconds: 45` in the serving contract.

The fresh counted token remains 30 seconds; the 45-second value applies to
non-counting replay/visibility validity.

## Diagnostic boundary

The Public Shop rail exposes non-user-visible attributes for:

- campaign ID;
- presentation type (`fresh`, `replay`, `visibility`, owner preview or legacy);
- effective media kind;
- selected dwell in milliseconds after readiness.

These attributes support physical-phone/browser correlation. They do not add
an exposure event, change accounting, reveal exact location or create public
campaign telemetry.

## Automated acceptance cage

The focused policy test covers image, 3-second, 7-second, 9-second, 10-second,
12-second, missing-duration and non-finite-duration cases. The phone-browser
smoke covers delayed video readiness, failed-video image fallback, real
5/8/9/10-second transitions, looping media, next-media preload and existing
qualification/accounting boundaries. Backend tests cover two-item windows,
cursor advancement, shared creative across distinct campaign IDs, 45-second
validity and response-policy compatibility.

Dashboard Market Wisdom is outside this change and must remain untouched.

## Post-deployment physical-phone gate

Record one uninterrupted ten-minute signed-in Public Shop session after the
same verified commit is deployed. Correlate the new diagnostic campaign ID and
presentation type with the observation timeline.

Accept only when:

- images receive five seconds after readiness;
- videos receive eight to ten seconds after readiness;
- loading, hidden, off-screen and interaction-paused time do not consume dwell;
- no unexplained blank transition occurs;
- a later queued ten-second video completes before its deadline;
- adjacent windows reach unseen eligible campaigns before repeating consumed
  ones; and
- any approximately fifteen-second identical artwork is attributable to
  distinct governed campaign IDs/presentation occurrences rather than an
  unexplained queue repeat.

Automated checks can prove source and synthetic-browser contracts. They cannot
replace this physical-phone feel and deployed-bundle verification.
