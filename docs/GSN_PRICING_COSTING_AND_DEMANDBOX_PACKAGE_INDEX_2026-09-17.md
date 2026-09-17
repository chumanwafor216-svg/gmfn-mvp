# GSN Pricing, Costing, VAULT, And DemandBox Package Index

Date: 2026-09-17
Status: Documentation package index
Product name: GSN

## Purpose

This index groups the clean documentation files created after the shop/VAULT pricing decision and the DemandBox trail discussion. The aim is to keep strategic product reasoning out of the large handoff file and make each document easier to review, send, or update.

## Package Files

| File | Purpose |
| --- | --- |
| `GSN_SHOP_AND_VAULT_PRICING_DECISION_2026-09-17.md` | Official decision note for six standard public Shop Diaries, up to four paid extra public positions, and two paid VAULT private blocks. |
| `GSN_PRICING_AND_COSTING_OPEN_QUESTIONS_2026-09-17.md` | Open pricing questions covering regions, sponsors, verification, member-size scaling, and organisation type. |
| `GSN_CUSTOMER_DISCOVERY_TO_COSTING_RULES_2026-09-17.md` | Draft rule for turning customer discovery answers into a pricing quote. |
| `GSN_DEMANDBOX_TRAIL_AND_COMMAND_CENTRE_REPORTING_REQUIREMENT_2026-09-17.md` | Current DemandBox truth and the missing event trail needed for monthly/yearly reporting. |

## Related Code Decision Already Published

The matching implementation was committed and pushed separately as:

`ec97d059 Implement shop and vault capacity pricing`

That code change enforces:

- six standard public Shop Diaries
- up to four paid extra public Shop Diaries
- two VAULT private link-only blocks
- GBP 5 per VAULT block on the UK/Europe/US pilot rail

## Related Architecture Correction

`CANONICAL_SYSTEM_SKELETON_2026-04-19.md` has been corrected so the current pilot model is two paid VAULT private link-only blocks.

## What This Package Does Not Yet Do

This package does not create the future DemandBox event table or Command Centre reporting endpoint. It records the requirement and the current implementation truth so the next code task can be safely scoped.

This package also does not finalize Africa/regional pricing. It preserves the question so pricing can be set through customer discovery, sponsor logic, and affordability evidence.
