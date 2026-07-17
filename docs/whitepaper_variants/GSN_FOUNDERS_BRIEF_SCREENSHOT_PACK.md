# GSN Founder's Brief Screenshot Pack

Last updated: 2026-07-18

Status: capture specification. This file does not contain accepted screenshots
yet. It defines the required sequence, captions, protection rules, and review
standard before screenshots can be used in the founder, sponsor, partner, or
investor brief.

Unabated truth: screenshots are not traction. They prove only that a working
build, prototype, or marked planning surface can be shown honestly. They do not
prove adoption, repeated use, revenue, external pilot validation, or product
market fit.

## Pack Purpose

The screenshot pack must tell one continuous story:

```text
A person joins GSN
-> exists as a person before managing a community
-> creates or joins a community through a guided path
-> sees daily community work separately from governance
-> records a bounded Trust Event
-> requests confirmation or witness response
-> reviews evidence detail, privacy, challenge, and currentness
-> selects relevant evidence for a TrustSlip
-> shows admin review without turning every feature into a setting
```

Use the same redacted test account and same redacted community name throughout
the whole sequence.

Default demo identity unless replaced by an approved pilot identity:

```text
Member: Demo Member A
Community: Pillar of Hope Demo
Purpose: Community Trust Confirmation pilot proof
```

Do not mix screenshots from unrelated accounts, unrelated communities, old
drafts, or different visual eras. A messy collection weakens the brief.

## Required Screenshot Sequence

| # | Screenshot | What it should demonstrate | Required proof boundary |
| --- | --- | --- | --- |
| 1 | Join GSN | A person can begin the entry process clearly. | Does not prove completed onboarding or repeated member use. |
| 2 | Personal GSN profile or ID | The person exists before managing a community. | Does not prove full identity verification unless the provider/review is real. |
| 3 | Create or join community | Community entry is guided rather than presented as a settings page. | Does not prove the community is active, paid, verified, or governed unless the screen says so. |
| 4 | Community operating area | The organiser can see daily community work separately from governance. | Does not prove all operating areas are complete or pilot-used. |
| 5 | Trust Event creation | A bounded activity can become an evidence record. | Does not prove the event is externally validated or dispute-free. |
| 6 | Confirmation or witness request | Another relevant person can confirm or respond. | Does not prove all contacts, consent rules, or delivery channels are production-ready. |
| 7 | Evidence detail | The record contains context, date, source, and status. | Does not prove the evidence is true unless confirmation and review state support it. |
| 8 | Privacy and consent | Private evidence does not automatically become public. | Does not prove the full consent-management system is complete. |
| 9 | Challenge or correction | The affected person can dispute or add context. | Does not prove disputes are resolved fairly until the review workflow is tested. |
| 10 | Expiry or relevance status | Old evidence is not treated permanently as fresh evidence. | Does not prove all evidence types have expiry/currentness policies yet. |
| 11 | TrustSlip preview | Only relevant evidence is selected for a specific purpose. | Does not prove the TrustSlip is accepted by an external decision-maker. |
| 12 | Administrative evidence review | Governance exists without turning every feature into a setting. | Does not prove governance is complete, abuse-proof, or validated by a live community. |

## Caption Template

Every screenshot must have a caption using this structure:

```text
PRODUCT STATUS: WORKING BUILD

WHAT THIS SHOWS:

A community member can review a Trust Event, see who confirmed it and check
whether the event is private, shared or contested.

WHAT THIS DOES NOT YET PROVE:

This screen has not yet been validated through repeated use by an external pilot
community.
```

Allowed product status labels:

- `WORKING BUILD`
- `PROTOTYPE`
- `PLANNING ONLY`
- `NOT YET ACCEPTED`

Do not use `WORKING BUILD` unless the route or surface is actually available in
the current build being captured. If the function is mocked, incomplete,
offline, blocked, or not connected to real backend state, mark it clearly as
`PROTOTYPE`, `PLANNING ONLY`, or `NOT YET ACCEPTED`.

## Caption Checklist Per Screenshot

Each caption must answer:

- what product state is being shown;
- what user action or decision the screenshot supports;
- what evidence boundary is visible;
- what is private versus shareable, where relevant;
- what remains unproven;
- whether the screenshot is from a working build, prototype, or planning-only
  surface.

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
  Use descriptive posture language only where the product already does so.

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
  12_founder_brief_screenshot_pack/
    00_index.md
    00_caption_log.md
    00_redaction_log.md
    01_join_gsn.png
    02_personal_gsn_profile_or_id.png
    03_create_or_join_community.png
    04_community_operating_area.png
    05_trust_event_creation.png
    06_confirmation_or_witness_request.png
    07_evidence_detail.png
    08_privacy_and_consent.png
    09_challenge_or_correction.png
    10_expiry_or_relevance_status.png
    11_trustslip_preview.png
    12_administrative_evidence_review.png
    limitations.md
```

Do not commit private screenshot captures unless they are intentionally
redacted, reviewed, and approved for repository use. During active pilot work,
treat `pilot_evidence_pack/` as local working evidence.

## Caption Log Template

Use `00_caption_log.md` with this shape:

```text
# Founder Brief Screenshot Caption Log

Captured by:
Captured date:
Device/viewport:
Build/source:
Demo account:
Demo community:

## 01 - Join GSN

PRODUCT STATUS:

WHAT THIS SHOWS:

WHAT THIS DOES NOT YET PROVE:

Redaction applied:

Reviewer status: Not captured / Captured / Accepted / Rejected
Reviewer note:
```

Repeat for all 12 screenshots.

## Redaction Log Template

Use `00_redaction_log.md` with this shape:

```text
# Founder Brief Screenshot Redaction Log

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
[ ] It belongs to the required 12-step story.
[ ] It uses the same demo member and community context as the rest of the pack.
[ ] It has a caption with PRODUCT STATUS, WHAT THIS SHOWS, and WHAT THIS DOES NOT YET PROVE.
[ ] It contains no real names, emails, phone numbers, private IDs, private evidence, secrets, or technical keys.
[ ] It contains no personal CCI or trust-score numbers.
[ ] It clearly marks prototype or not-yet-working surfaces.
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
- it hides the relevant UI behind overlays;
- it only proves login/session expiry instead of the intended product state;
- it lacks the required caption and limitation.

## Final Pack Boundary

The screenshot pack may support the founder brief only when it tells one clean,
redacted, captioned story.

The pack should make this honest point:

```text
GSN has a visible working/prototype path for community trust evidence.
The next proof is repeated use by a real external pilot community.
```

It must not imply:

```text
GSN has proven adoption, revenue, external validation, or product-market fit.
```
