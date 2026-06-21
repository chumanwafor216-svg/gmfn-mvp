# GSN Community Public Face Spec

Date: 2026-06-19

Status: MVP product contract, docs-first.

Purpose:

Define how GSN should present a community as a trusted institution without
overclaiming legal authority, exposing private records, or turning community
trust into a public score.

This spec exists because the trust-infrastructure reframe is not complete until
the community itself has a clear public evidence surface.

## 1. Core Position

The Community Public Face is the public institutional evidence page for a
community, market, church, cooperative, club, union, society, or affiliate
group.

It should answer five questions for an outsider:

1. What community record am I looking at?
2. What Community ID or protected domain anchors it in GSN?
3. What public evidence exists today?
4. What is hidden by design?
5. What safe next action can I take?

The page must not pretend to be a government registry, court record, bank
guarantee, credit approval, or universal reputation score.

## 2. Anchor Rule

Names are not the trust anchor.

The anchor is the GSN Community ID, protected Community ID Domain, or
parent-domain acknowledged affiliate record.

Any person can type a similar market, church, or association name. GSN should
therefore treat the public name as display text, not as the source of trust.

The public page should make the anchor visible:

- Community ID
- protected domain status, when applicable
- parent-domain acknowledgement status, when applicable
- public evidence currentness
- clear limitation statement

## 3. Public Variant

The public outsider view should be safe for people who do not belong to the
community.

It may show:

- community display name
- Community ID or public community key
- public status label
- protected domain status, if present
- parent-domain acknowledged affiliate status, if present
- broad location label, where safe
- community type, after taxonomy is approved
- public description, after owner/custodian approval
- public services, after owner/custodian approval
- evidence currentness
- public next action
- privacy boundary

It must not show:

- full member list
- raw phone numbers
- private disputes
- private finance records
- private witness details
- exact sensitive location
- internal leadership conflict
- member-level financial rollups
- public risk ranking
- automatic lending meaning

## 4. Member Variant

The signed-in member view may show more personal context, but only for the
member's own relationship with the community.

It may show:

- my membership claim
- my protected member credential, if issued
- my witness evidence status
- my renewal/currentness state
- my pending requests
- my safe next action
- my TrustSlip or Trust Passport connection

It should not expose other members' private evidence unless the user has the
right role and the route is explicitly an admin/custodian route.

## 5. Admin Or Custodian Variant

The admin/custodian view should help the community manage public trust without
becoming a single-person gatekeeping machine.

It may show:

- protected domain configuration
- custodian roles
- pending affiliate requests
- pending member credential requests
- recorded CAC or external-registration references
- public description and service controls
- renewal and dispute queues
- evidence package preview
- audit trail summary

It must preserve the doctrine:

- CAC or external registration is recorded context, not GSN verification by
  itself.
- parent-domain acknowledgement is not blanket legal certification.
- internal group records are local belonging evidence, not automatic protected
  domain credentials.
- member witness evidence supports trust reading, but does not sell or issue
  protected credentials.

## 6. MVP Current Data First

The first implementation pass should use data that already exists.

Use current or near-current surfaces:

- `/verify/community/:communityKey`
- `CommunityVerifyPage`
- public community verification payload
- Community ID
- public status label
- affiliate acknowledgement record
- Trust mobility note
- reader decision guidance
- next evidence guidance
- privacy limitation copy

Do not add new database fields before the page contract is proven with current
data and pilot conversations.

## 7. Future Fields, Only After Review

These fields are useful, but they need privacy, taxonomy, ownership, and appeal
review before becoming public product fields:

- community type
- public description
- public services
- years active
- response health
- public policy
- controlled contact channel
- safe public statistics
- renewal health
- community operating evidence summary

These fields must be descriptive and evidence-based. They must not become a
public community ranking system.

## 8. Community Trust Summary Contract

The Community Public Face may carry a community trust summary, but it must be
scoped.

Allowed summary inputs:

- Community ID or protected domain state
- parent-domain acknowledgement state
- public evidence currentness
- membership credential availability
- witness-evidence availability
- operating-evidence availability
- privacy boundary
- dispute or suspended state, when public display is necessary and fair

Forbidden summary meanings:

- this community is better than another community
- members are safe to lend to automatically
- goods or money can move without judgment
- GSN guarantees repayment
- CAC number equals verified community trust
- a public name equals protected identity

The correct public reading is:

GSN can show what public evidence exists, what it means, what it does not mean,
and what the reader should check next.

## 9. Status Labels

Use simple labels that do not overclaim:

- Observed public record
- Claimed community record
- Protected Community ID Domain
- Parent-domain acknowledged affiliate
- Protected member credential available
- Evidence needs renewal
- Under review
- Disputed
- Suspended

Avoid labels such as:

- officially approved by GSN
- legally verified by GSN
- guaranteed trusted
- safe to trade
- safe to lend
- risk-free

## 10. Public Layout Order

The public page should show the trust anchor before the story.

Recommended order:

1. Community identity and Community ID
2. Protected domain or affiliate acknowledgement state
3. Public trust summary
4. What this evidence means
5. What is hidden by design
6. Safe next action
7. Optional public services or controlled contact

This keeps the page from becoming a marketing page or a raw data dump.

## 11. Abuse And Harm Controls

The Community Public Face must protect against:

- impostor communities using similar names
- one person capturing a market or association identity
- fake affiliate groups claiming parent-domain standing
- public exposure of private members
- public punishment without appeal
- CAC records being mistaken for community trust
- outsiders treating public evidence as a financial guarantee

Minimum controls:

- Community ID/domain anchor
- parent-domain acknowledgement where relevant
- currentness window
- limitation language
- dispute/under-review state
- private details hidden by design
- admin audit trail
- no public ranking

## 12. MVP Acceptance Checklist

Before calling the Community Public Face complete, confirm:

- the page leads with Community ID or protected domain anchor
- public name is not treated as the trust anchor
- CAC/external registration is recorded context only
- affiliate standing says parent-domain acknowledged, not official/legal
- member evidence is scoped and private by default
- the public summary says what evidence exists and what remains unchecked
- no public score or ranking is introduced
- no private member list or raw phone number is exposed
- the next action is clear
- the page connects back to TrustSlip, Trust Passport, Marketplace, Support, or
  Public Shop only where the evidence supports it

## 13. Unabated Truth

The Community Public Face is not finished because a spec exists.

This spec only defines the safe target. The product still needs a careful
implementation pass, visual QA, backend payload review, and pilot testing before
GSN can claim that communities are fully presented as trusted institutions.

The immediate value is discipline:

GSN should make community trust visible, portable, and usable without pretending
that public evidence is the same thing as legal authority, private knowledge, or
financial guarantee.
