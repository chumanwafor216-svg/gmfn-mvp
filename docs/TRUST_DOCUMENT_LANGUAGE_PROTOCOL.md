# GSN Trust Document Language Protocol

Last updated: 2026-07-01

## Purpose

GSN public and shareable trust records must look and read like official digital
trust infrastructure, not ordinary app pages.

The visual message is:

```text
This information can be relied upon within its stated limits.
```

This protocol applies to:

- Community Verification
- Community Member Credential
- Community Confirmation Outcome
- TrustSlip
- TrustSlip Verify
- Merchant Verification / Merchant Release evidence
- Trust Passport and Trust Passport exports
- evidence packs, trust timelines, demand papers, loan evidence papers, and
  future public registry records

## Identity

The GSN document style is a hybrid of:

- national land registry;
- company registry;
- digital passport;
- institutional development report;
- government digital certificate.

It must not look like:

- a social feed;
- a shopping marketplace;
- a chat app;
- a generic banking dashboard;
- an unbranded PDF;
- a decorative certificate with unsupported claims.

The product name for this visual system is:

```text
GSN Trust Document Language
```

## Standard Record Sequence

Every official/public trust record should follow this sequence unless the route
has a documented reason to adapt it:

1. GSN registry masthead
2. gold seal / trust mark
3. record title and status
4. registry ID or verification code
5. confidence ribbon
6. digital security panel
7. what this confirms
8. what this does not confirm
9. evidence or history summary
10. QR verification
11. digital fingerprint or reference hash
12. next action
13. registry notice / limitation footer

The user should understand the document's authority and boundary before reading
long evidence details.

## Confidence Ribbon

Every institutional record should carry a compact confidence ribbon near the
top. It reassures the reader quickly, but it must never overclaim.

Allowed confidence states include:

- `Registry Status: Active`
- `Record Integrity: Verified`
- `Last Registry Update: Live`
- `Evidence Chain: Complete`
- `Verification Path: Available`
- `Registry Status: Historical`
- `Record Integrity: Limited`
- `Evidence Chain: Scoped`
- `Verification Path: Unavailable`

Green/verified language may appear only when backed by actual route state or an
honest frontend reading of returned data.

If the page is cached, unknown, incomplete, expired, inactive, or missing
required evidence, the ribbon must say so. Do not display green badges for
placeholder, guessed, or decorative states.

## Digital Trust Certificate Signals

GSN should have a recognizable digital trust certificate presence. A reader
should feel the record is official before studying the full text.

Use these signals where truthful and available:

- security hologram or seal;
- registry watermark;
- cryptographic or deterministic reference fingerprint;
- evidence chain status;
- community seal;
- QR verification;
- live registry indicator;
- timestamp or generated time;
- Trust Infrastructure badge.

These signals are visual confidence aids, not substitutes for evidence. If a
fingerprint is not cryptographic, call it a reference fingerprint or record
fingerprint, not a cryptographic hash.

## Document-Specific Grammar

### Community Verification

1. gold seal
2. registry ID
3. confidence ribbon
4. security panel
5. community summary
6. what this confirms
7. what this does not confirm
8. scoped confirmation next action
9. QR and record fingerprint

Community Verification confirms the community anchor only. It does not verify
individual members, shops, departments, lines, transactions, or Trust Passport
standing.

### TrustSlip

1. gold seal
2. trust summary
3. confidence ribbon
4. evidence summary
5. security features
6. QR
7. digital fingerprint
8. verification path

TrustSlip is a portable public trust document. It must not expose the private
Trust Passport.

### Merchant Verification

1. gold seal
2. merchant status
3. confidence ribbon
4. community recognition
5. verification history
6. security panel
7. what this confirms / does not confirm

Merchant Verification is evidence and recognition, not escrow, payout approval,
delivery guarantee, or release authority unless the specific signed merchant
rail says so.

### Trust Passport

1. passport-style cover
2. identity and trust standing
3. confidence ribbon
4. behaviour summary
5. community history
6. evidence timeline
7. verification timeline
8. repair or next-step guidance

Trust Passport is the fuller personal/private record. Public surfaces may link
to it for the holder, but must not expose private passport contents to public
readers.

## Visual Rules

- Use deep navy, white/off-white, controlled green, and gold.
- Use a GSN registry masthead or authority strip.
- Use seal, watermark, QR, fingerprint, and security-panel motifs.
- Keep paragraphs short and sectioned.
- Prefer facts, ribbons, and panels over long exposed prose.
- Use calm institutional spacing and strong hierarchy.
- Keep mobile first: the first phone viewport must show status, registry ID,
  confidence ribbon, and the primary next action or limitation.

## Truth Rules

The design language is only powerful if it is accountable.

- Do not call a record `verified` unless verification state exists.
- Do not call an update `live` when it is cached or unknown.
- Do not call a reference `cryptographic` unless it is generated as a real
  cryptographic hash.
- Do not imply legal identity, government registration, bank approval, payment
  movement, escrow, delivery, membership, or endorsement unless the specific
  route and backend data prove it.
- Every document must say what it confirms and what it does not confirm.
- Every public document must protect private members, private contacts, admin
  notes, disputes, and non-public trust history by default.

## Implementation Rules

- Build shared components for repeated document primitives instead of copying
  style blocks into every page.
- Reuse the existing GSN paper marks and institutional surfaces where possible.
- Add or update route-local audits whenever a trust document's visual contract
  changes.
- Public verification screens must not show authenticated bottom navigation.
- For each implementation pass, update `docs/HANDOFF_NOTES.md` with:
  - document route touched;
  - which parts of the Trust Document Language were implemented;
  - what remains unimplemented;
  - exact audits/build run.

## Current Implementation Order

1. Community Verification as the canonical registry-record example.
2. TrustSlip Verify as the portable public trust-document example.
3. Merchant Verification / Merchant Release as the commercial evidence example.
4. Trust Passport as the passport-style private trust record.
5. Evidence packs, PDFs, and future registry records.

Do not attempt to restyle every public document in one broad pass. Preserve route
contracts, privacy boundaries, and evidence truth first.
