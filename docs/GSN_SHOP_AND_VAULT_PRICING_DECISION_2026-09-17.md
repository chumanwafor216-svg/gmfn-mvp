# GSN Shop And VAULT Pricing Decision

Date: 2026-09-17
Status: Active pilot decision
Product name: GSN

## Purpose

This note records the clean pricing and capacity decision for public Shop Diaries and VAULT. It separates the approved product rule from the wider costing discussion so the team can implement, review, and explain the decision without depending on a long chat trail or a crowded handoff file.

## Decision Summary

GSN will no longer treat twelve public Shop Diaries as the standard included capacity.

The standard included public shop capacity is now six Shop Diaries. A shop may unlock up to four additional paid public Shop Diary positions. Therefore the normal public shop capacity model is:

| Capacity area | Included | Paid extra | Maximum |
| --- | ---: | ---: | ---: |
| Public Shop Diaries | 6 | Up to 4 | 10 |
| VAULT private link-only blocks | 0 included | Up to 2 | 2 |

VAULT is the private lock-up shop area where the shop owner can expose merchandise only through a private link sent by the shop owner.

## Pilot Pricing Rule

For the UK/Europe/US pilot rail:

| Paid item | Pilot price | Notes |
| --- | ---: | --- |
| Extra public Shop Diary position | Existing Marketplace Capacity rail | Current implementation uses the existing paid-capacity/subscription rail. |
| VAULT private block | GBP 5 per block | Maximum of two VAULT blocks. No six-slot bundle. |

Regional pricing is not fixed by this document. Africa and lower-income community pricing must be decided through the costing framework, sponsor logic, and customer discovery evidence.

## Why This Decision Makes Sense

The previous twelve-standard-shop idea created too much free capacity before GSN had tested real willingness to pay. It also reduced the value of paid capacity because a user or organisation could already display many public shop items without crossing into a paid moment.

Six standard public Shop Diaries gives every user a meaningful shop presence while preserving a clear upgrade path. Four paid extra positions are enough to support growth without turning the first version into an unlimited shop system.

VAULT should stay separate because it creates a different type of value. Public Shop Diaries create visibility. VAULT creates private, controlled, link-only access. That private-control value is easier to justify as paid.

## Implementation Truth

The code now enforces six standard public Shop Diaries, four paid extra public positions, and two paid VAULT private blocks at GBP 5 each on the pilot rail.

The extra public shop pricing still rides the existing Marketplace Capacity/subscription rail. A future pricing UX should make regional pricing, monthly/annual treatment, and sponsor-paid treatment clearer.

## Follow-Up Decisions Still Needed

1. Confirm whether extra public Shop Diary positions should remain GBP 1 each, become GBP 2 each, or vary by region and organisation type.
2. Decide the Africa/regional discount table.
3. Decide whether sponsor-funded communities receive paid capacity directly, credits, or a managed grant allocation.
4. Add a plain self-service pricing explanation in the app once the costing framework settles.
