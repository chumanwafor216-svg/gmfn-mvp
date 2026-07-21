# GSN Product Evidence Capture Standard

Community Trust Confirmation Pilot

Version 1.1 | 19 July 2026

Internal capture, redaction, captioning, and acceptance rules.

Status: capture standard. This file does not embed the accepted screenshots.
The current local accepted sequence is tracked in
`pilot_evidence_pack/12_product_evidence_capture/accepted_sequence_manifest.md`.
This standard controls how screenshots and evidence images may be captured,
captioned, accepted, rejected, or used for the Product Evidence Pack, founder
brief, sponsor brief, partner brief, or investor brief.

Unabated truth: screenshots are not traction. They prove only that a working
build, prototype, or planning surface can be shown honestly. The accepted local
12-step sequence proves a synthetic product path only. It does not prove
adoption, repeated use, revenue, external pilot validation, recipient trust,
validated safeguards at scale, or product-market fit.

## Purpose

This standard must govern `GSN Product Evidence Pack v2`.

It is not the Product Evidence Pack itself. It is the acceptance standard for
creating one.

The evidence sequence must tell one continuous story:

```text
A person joins GSN
-> exists as a person before managing a community
-> creates or joins a community through a guided path
-> sees daily community work separately from governance
-> records a source activity
-> creates a pending evidence record
-> requests confirmation or witness response
-> receives a confirmation, dispute, partial response, or unable-to-confirm response
-> reviews the resulting Trust Event detail
-> checks privacy, challenge, and currentness
-> selects relevant evidence for a TrustSlip
-> shows what the recipient sees and records access
```

Administrative review may be shown as a separate supporting screenshot where
required. It is not the compulsory final step for every Trust Event, because
GSN must not make every evidence record depend on manual administrator review.

Use the same redacted test account and same redacted community name throughout
the whole sequence.

Default demo identity unless replaced by an approved pilot identity:

```text
Member: Demo Member A
Community: GSN Demo Community A
Activity: Community Support Activity 001
Purpose: Community Trust Confirmation pilot demonstration
```

Do not use a real community name unless GSN owns it or the community has
formally approved it for external demonstration.

Do not mix screenshots from unrelated accounts, unrelated communities, old
drafts, or different visual eras. A messy collection weakens the brief.

## Required Capture Sequence

| # | Screenshot | What it should demonstrate | Required proof boundary |
| --- | --- | --- | --- |
| 1 | Join GSN | A person can begin the entry process clearly. | Does not prove completed onboarding or repeated member use. |
| 2 | Personal GSN account or profile | The person has an account before managing a community. | Does not prove full identity verification unless the provider or review is real. |
| 3 | Create or join community | The user enters a defined community through a guided process. | Does not prove the community is active, paid, verified, or governed unless the screen says so. |
| 4 | Community operating area | Daily community activity is kept separate from governance controls. | Does not prove every operating area is complete or pilot-used. |
| 5 | Source activity | A real participation, contribution, support, delivery, or responsibility event can be identified. | Does not prove the activity has become confirmed evidence yet. |
| 6 | Pending evidence record | The activity is recorded but is not yet presented as confirmed truth. | Does not prove the record is externally validated, dispute-free, or ready for sharing. |
| 7 | Confirmation or witness request | A relevant participant can be invited to confirm, dispute, or add context. | Does not prove all contacts, consent rules, or delivery channels are production-ready. |
| 8 | Confirmation response | The invited person can respond: confirmed, disputed, partly confirmed, or unable to confirm. | Does not prove the workflow has been repeatedly completed by external pilot members. |
| 9 | Trust Event detail | The resulting record shows what happened, who responded, date, community, source, status, and evidence limitations. | Does not prove the evidence is true beyond the recorded confirmation and review state. |
| 10 | Privacy, challenge, and currentness | The affected person can see privacy position, challenge or add context, and see review or expiry/currentness status. | Does not prove every evidence type has a complete expiry or dispute-resolution policy yet. |
| 11 | TrustSlip selection | The user chooses only relevant evidence for one stated purpose. | Does not prove the TrustSlip is accepted by an external decision-maker. |
| 12 | Recipient view and access record | The receiving person or institution sees the limited TrustSlip while the system records access date, purpose, and scope. | Does not prove external recipients trust the evidence in real decisions yet. |

## Supporting Capture: Administrative Review

Capture administrative evidence review only where required by the workflow being
demonstrated.

Administrative review should demonstrate:

- governance can review evidence without turning every feature into a setting;
- review is tied to the evidence record and community authority;
- review records the decision, date, reviewer, and limitation;
- review does not silently delete or rewrite the original evidence.

Required proof boundary:

```text
This does not prove governance is complete, abuse-proof, scalable, or validated
by a live community.
```

## Product State and Proof State

Every screenshot must separate product existence from proof maturity.

Allowed product state labels:

- `WORKING BUILD`
- `PROTOTYPE`
- `PLANNING ONLY`
- `NOT YET ACCEPTED`

Allowed proof state labels:

- `NOT TESTED`
- `INTERNALLY TESTED`
- `EXTERNAL PILOT PENDING`
- `EXTERNALLY PILOTED`
- `VALIDATED`

Do not use `WORKING BUILD` unless the route or surface is actually available in
the current build being captured. If the function is mocked, incomplete,
offline, blocked, or not connected to real backend state, mark it clearly as
`PROTOTYPE`, `PLANNING ONLY`, or `NOT YET ACCEPTED`.

Do not use `VALIDATED` unless repeated external pilot use has been recorded and
reviewed. A working screen is not product validation.

## Caption Template

Every screenshot must have a caption using this structure:

```text
SCREEN NUMBER AND TITLE:

PRODUCT STATE:
WORKING BUILD / PROTOTYPE / PLANNING ONLY / NOT YET ACCEPTED

PROOF STATE:
NOT TESTED / INTERNALLY TESTED / EXTERNAL PILOT PENDING /
EXTERNALLY PILOTED / VALIDATED

USER ACTION:

WHAT THIS SHOWS:

EVIDENCE STATUS:
PENDING / CONFIRMED / PARTLY CONFIRMED / CONTESTED /
UNRESOLVED / EXPIRED / NOT APPLICABLE

PRIVACY POSITION:

WHAT THIS DOES NOT YET PROVE:

DEMO OR REAL DATA:
DEMO / SYNTHETIC / APPROVED PILOT DATA

BUILD VERSION OR COMMIT:

CAPTURE DATE:

REDACTION APPLIED:

REVIEWER DECISION:
NOT CAPTURED / CAPTURED / ACCEPTED / REJECTED

REVIEWER NOTE:
```

Example:

```text
SCREEN NUMBER AND TITLE:
09 - Trust Event Detail

PRODUCT STATE:
WORKING BUILD

PROOF STATE:
INTERNALLY TESTED - EXTERNAL PILOT PENDING

USER ACTION:
A community member opens the evidence record after a confirmation response.

WHAT THIS SHOWS:
A community member can review the source activity, confirmation status,
community context, date, privacy rule, and limitation attached to a Trust Event.

EVIDENCE STATUS:
PARTLY CONFIRMED

PRIVACY POSITION:
Private by default. Only selected evidence may be shared through a TrustSlip.

WHAT THIS DOES NOT YET PROVE:
The workflow has not yet been completed repeatedly by members of an independent
external pilot community.

DEMO OR REAL DATA:
SYNTHETIC

BUILD VERSION OR COMMIT:
[commit hash]

CAPTURE DATE:
[date]

REDACTION APPLIED:
No real names, private IDs, or personal score values are visible.

REVIEWER DECISION:
CAPTURED

REVIEWER NOTE:
Pending final redaction review.
```

## Caption Checklist Per Screenshot

Each caption must answer:

- what product state is being shown;
- what proof state has actually been reached;
- what user action or decision the screenshot supports;
- what evidence boundary is visible;
- what is private versus shareable, where relevant;
- what remains unproven;
- whether the screenshot is from a working build, prototype, or planning-only
  surface;
- whether the data is demo, synthetic, or approved pilot data.

Avoid captions that sound like marketing claims. The caption should make the
reader trust the proof because it names the limitation.

## Screenshot Protection Rules

Before using screenshots:

- remove or blur real names;
- remove email addresses and telephone numbers;
- remove personal identifiers;
- remove private evidence belonging to real people;
- remove internal system secrets or technical keys;
- remove test language that may confuse an external reader;
- remove all personal CCI or trust-score numbers;
- clearly mark prototype screens where the function is not fully working;
- use the same test account and community name throughout the sequence.

Additional protection:

- Do not show full bank details or payment account numbers unless the account is
  a deliberately approved public/demo pay-in account.
- Do not show full GSN/GMFN IDs for real people.
- Do not show private confirmation notes unless they are synthetic/demo notes.
- Do not show raw backend IDs, tokens, API keys, storage keys, session data, or
  browser devtools output.
- Do not expose location, private contacts, private votes, or sensitive
  beneficiary/support details.
- Do not show numerical CCI/trust-score values on human-facing screenshots.
- Use event-level and evidence-status language only.

Allowed event-level and evidence-status language:

- `Confirmed`
- `Pending`
- `Partly confirmed`
- `Contested`
- `Review required`
- `Unresolved`
- `Expired`
- `Purpose relevance not assessed`

Avoid person-level descriptions such as:

- `High trust`
- `Low trust`
- `Strong posture`
- `Weak posture`
- `Trust band`
- `Trust limit`

Even without visible numbers, those phrases can become disguised human scoring.

## Capture Quality Rules

- Prefer phone screenshots at `390x844` or the closest real device size.
- Capture one clear state per screenshot.
- The first viewport should show the main point without requiring the reviewer
  to decode the whole app.
- No screenshot should depend on long explanatory text to make sense.
- Use real UI navigation where possible; do not paste disconnected mockups into
  the pack.
- If a route is protected and the screenshot only shows login/session expiry,
  reject it for this pack.
- If a modal, browser toolbar, notification, keyboard, or overlay hides the
  product evidence, recapture.
- If the screenshot contains confusing placeholder copy, either fix the copy
  first or mark the screenshot `NOT YET ACCEPTED`.

## Pack Folder Shape

Use this local folder shape when captures begin:

```text
pilot_evidence_pack/
  12_product_evidence_capture/
    00_index.md
    00_caption_log.md
    00_redaction_log.md
    01_join_gsn.png
    02_personal_gsn_account.png
    03_create_or_join_community.png
    04_community_operating_area.png
    05_source_activity.png
    06_pending_evidence_record.png
    07_confirmation_request.png
    08_confirmation_response.png
    09_trust_event_detail.png
    10_privacy_challenge_currentness.png
    11_trustslip_selection.png
    12_recipient_view_and_access_record.png
    admin_review_where_required.png
    limitations.md
```

Do not commit private screenshot captures unless they are intentionally
redacted, reviewed, and approved for repository use. During active pilot work,
treat `pilot_evidence_pack/` as local working evidence.

## Caption Log Template

Use `00_caption_log.md` with this shape:

```text
# Product Evidence Capture Caption Log

Captured by:
Captured date:
Device/viewport:
Build/source:
Demo account:
Demo community:

## 01 - Join GSN

SCREEN NUMBER AND TITLE:

PRODUCT STATE:

PROOF STATE:

USER ACTION:

WHAT THIS SHOWS:

EVIDENCE STATUS:

PRIVACY POSITION:

WHAT THIS DOES NOT YET PROVE:

DEMO OR REAL DATA:

BUILD VERSION OR COMMIT:

CAPTURE DATE:

REDACTION APPLIED:

REVIEWER DECISION:

REVIEWER NOTE:
```

Repeat for all 12 screenshots and any supporting administrative-review capture.

## Redaction Log Template

Use `00_redaction_log.md` with this shape:

```text
# Product Evidence Capture Redaction Log

Screenshot:
Original capture location:
Redacted output location:
Data removed or blurred:
Reason:
Reviewer:
Reviewer decision: Accepted / Rejected
```

## Acceptance Checklist

Before a screenshot is accepted:

```text
[ ] It belongs to the required 12-step story or the documented administrative-review support capture.
[ ] It uses the same demo member and community context as the rest of the pack.
[ ] It has a caption with PRODUCT STATE, PROOF STATE, USER ACTION, WHAT THIS SHOWS, EVIDENCE STATUS, PRIVACY POSITION, and WHAT THIS DOES NOT YET PROVE.
[ ] It contains no real names, emails, phone numbers, private IDs, private evidence, secrets, or technical keys.
[ ] It contains no personal CCI or trust-score numbers.
[ ] It uses event-level and evidence-status language instead of person-level trust labels.
[ ] It clearly marks prototype, planning-only, or not-yet-accepted surfaces.
[ ] It does not show confusing test language.
[ ] It is readable on phone.
[ ] It shows one clear product state.
[ ] It has a reviewer decision.
```

## Rejection Rules

Reject a screenshot if:

- it exposes private or identifying data;
- it mixes a different account or community into the story;
- it shows an outdated UI that contradicts the current founder brief;
- it makes an unproven claim look proven;
- it displays numerical human trust/CCI scoring;
- it uses disguised person-level scoring language;
- it hides the relevant UI behind overlays;
- it only proves login/session expiry instead of the intended product state;
- it lacks the required caption and limitation.

## Final Capture Boundary

The evidence images may support the founder brief only when they tell one
clean, redacted, captioned story.

As of 2026-07-19, the local ignored evidence pack contains an accepted 12-step
sequence for one synthetic demo path. Step 06 requires its crop-limitation
caption note to travel with the screenshot. The accepted sequence may be used
only with the manifest and local external packet send-ready checklist; it is not
a substitute for real pilot evidence.

The pack should make this honest point:

```text
GSN has a visible product path for recording, confirming, challenging, and
selectively sharing community trust evidence.

The next proof is repeated use within a real external pilot community.
```

It must not imply:

```text
GSN has proven adoption, revenue, external validation, recipient trust,
validated safeguards at scale, or product-market fit.
```
