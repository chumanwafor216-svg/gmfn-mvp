# GSN Pricing And Costing Open Questions

Date: 2026-09-17
Status: Working costing questions
Product name: GSN

## Purpose

This document holds the unresolved pricing and costing questions that should not be buried inside deployment notes. These are business-design questions, not all immediate code tasks.

## Open Questions

| Area | Current direction | Decision still needed |
| --- | --- | --- |
| Extra public Shop Diaries | Six standard, up to four paid extra | Confirm GBP 1 vs GBP 2 per extra public position and whether pricing varies by region. |
| VAULT | Up to two private link-only blocks at GBP 5 each on UK/Europe/US pilot rail | Decide whether lower-income regions receive a lower VAULT price or sponsor-paid VAULT credits. |
| Community Domain subscription | Pricing should depend on size, feature use, and ability to pay | Define bands for small, medium, large, faith, school, university, NGO, and commercial communities. |
| Verification | Should use credits/pipeline logic where individuals or organisations pay for verification events | Define verification credit price, bundle size, expiry, and who pays in each scenario. |
| Sponsor-paid communities | GSN should bridge poor but valuable communities to donors, charities, grants, and NGOs | Define sponsor due diligence, sponsor benefits, reporting duties, and sponsored feature limits. |
| Annual vs monthly payment | Longer commitment should reduce risk and may justify discount | Define annual discount and minimum contract logic. |
| Third-party payment | Sponsors, charities, donors, or umbrella organisations may pay for communities | Define admin fee, reporting requirement, and who controls the account. |
| Member-size scaling | Larger active membership creates more usage, support, and value | Define member bands and when price changes as a community grows. |
| Free access | Some communities may be too weak to pay but strategically valuable | Define when free is allowed, what GSN receives in return, and when sponsors should be sought. |

## Devil-Truth Checks

1. If the price is too high, African schools, weak community groups, and informal organisations may continue using free tools even if those tools are inefficient.
2. If the price is too low, GSN may attract usage without enough revenue to support hosting, onboarding, complaints, verification, and future staff.
3. If everything is bundled, users may not understand why they pay. If everything is itemised, the product may feel confusing. The final model needs a simple public price and a deeper internal costing engine.
4. Faith organisations must not all be treated the same. In some regions they operate like commercial ventures; in other regions they may need charity-style treatment.
5. Sponsor-paid access is powerful, but it requires evidence and accountability. GSN should not become a vague free-distribution platform.

## Recommended Pricing Architecture

GSN should use a layered model:

1. Base Community Domain subscription.
2. Member-size adjustment.
3. Feature consumption adjustment.
4. Paid extras such as extra Shop Diaries, VAULT, verification credits, and advanced tools.
5. Payment-mode adjustment for monthly, annual, long-term contract, or sponsor-paid account.
6. Regional and organisation-type adjustment.

The user-facing result should remain simple. The internal costing engine can be detailed, but the customer should see a clear quote and a plain explanation of why that quote fits their situation.

## Next Work

Create a formal costing table that maps customer discovery answers to pricing outcomes. That table should become the basis for both assisted onboarding and future self-service pricing.
