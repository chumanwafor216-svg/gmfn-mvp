# GSN Community Domain Operating System (CDOS)

## Protocol 24 - User Journey and Interaction Protocol

**Version:** 1.0
**Status:** User Experience Constitution
**Audience:** Codex Developers, UI/UX Designers, Frontend Developers

---

## Related Protocols

Protocol 23, `docs/GSN_MISSION_PROTOCOL_2026-06-30.md`, defines the mission the
user experience must serve: helping communities preserve, organise,
communicate, and mobilise the value they already create.

Protocol 20, `docs/GSN_FIRST_PRINCIPLES_PROTOCOL_2026-06-30.md`, defines the
first principles every journey must preserve.

Protocol 22, `docs/GSN_ARCHITECTURAL_INVARIANTS_PROTOCOL_2026-06-30.md`,
defines the invariants user journeys must not break, especially community-first
navigation, evidence, provenance, and the separation of membership from trust.

Protocol 25,
`docs/GSN_SCREEN_BLUEPRINT_IMPLEMENTATION_ORDER_PROTOCOL_2026-06-30.md`,
translates these journeys into screen ownership and implementation order.

---

## 1. Purpose

This protocol defines how users interact with GSN.

It does not describe pages.

It describes journeys.

The same engines should support many different journeys.

---

## 2. Constitutional Principle

Users should never feel that they are learning software.

They should feel that they are interacting with their own community.

Technology remains invisible.

Community remains visible.

---

## 3. The Five User Types

Every screen should recognise one of five users.

### Visitor

Not yet a member.

Can explore.

Can search.

Can receive invitation.

Cannot participate.

---

### Member

Belongs to one or more Community Domains.

Can participate.

Can generate Trust Events.

Can own Shops.

Can create Spotlights.

---

### Leader

Has delegated authority.

Can:

- Approve;
- Verify;
- Broadcast;
- Manage.

Cannot rewrite the platform.

---

### Community Administrator

Configures Community Settings.

Creates Departments.

Assigns Leaders.

Views Community Intelligence.

Does not modify Trust Passport.

---

### Platform Administrator

Maintains GSN infrastructure.

Cannot interfere with Community Governance except for platform security, legal
compliance, or operational support.

---

## 4. Primary User Journeys

Journey One:

Join Community.

Journey Two:

Create Committee.

Journey Three:

Purchase Community Domain.

Journey Four:

Buy.

Journey Five:

Sell.

Journey Six:

Verify.

Journey Seven:

Request Verification.

Journey Eight:

Publish Spotlight.

Journey Nine:

Respond to Demand.

Journey Ten:

Generate TrustSlip.

These become the canonical journeys.

---

## 5. Three-Click Rule

Important actions should normally require no more than three primary
interactions.

Example:

```text
Join Community
-> Phone
-> OTP
-> Invitation Code
-> Done
```

Complexity belongs behind the interface.

Not in front of it.

---

## 6. Progressive Complexity

New members should see:

Simple interface.

As responsibilities increase:

Additional capabilities appear.

Members should never be overwhelmed by administrator functions.

---

## 7. Community First Navigation

The application should naturally orient users around their communities.

Not around isolated features.

Example:

```text
My Communities
-> My Trust
-> My Shop
-> Opportunities
-> Marketplace
-> Finance
```

The community remains the organising principle.

---

## 8. Trust Visibility

Every member should easily understand:

- Who verified me?
- Which Community Domains recognise me?
- Which Trust Events have I accumulated?
- Which TrustSlip can I share?

Trust should never feel hidden.

---

## 9. Constitutional Statement

The user experience of GSN should always reinforce one idea:

**People belong to communities before they use software.**

Every interaction should strengthen that relationship rather than replacing it.
