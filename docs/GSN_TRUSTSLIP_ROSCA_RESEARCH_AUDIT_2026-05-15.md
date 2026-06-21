# GSN TrustSlip / ROSCA Evidence Audit

Date: 15 May 2026
Status: Research-backed audit note for workshop and TrustSlip refinement
Scope: ROSCA/community contribution evidence, TrustSlip decision usefulness, fintech/risk auditor lens

---

## 1. Direct Answer

The current workshop plan is directionally strong, but it is not yet complete enough for a serious TrustSlip decision test.

The strongest claim is correct:

> GSN makes community trust visible, portable, and usable.

The weak point is evidence specificity. A TrustSlip should not only say that someone has a trust score, CCI band, sponsor count, and trust limit. It should help an outsider understand why that person looks reliable, what the evidence is based on, how current it is, what risk remains, and what the TrustSlip does not guarantee.

Devil's advocate:

- If TrustSlip only shows a score and a few summary fields, it can look like a badge.
- If it shows the right community evidence, it becomes a decision aid.
- If it overclaims, it becomes dangerous.
- If it exposes too much private detail, it becomes unacceptable.

The TrustSlip should become a short, consented, verified decision snapshot backed by a fuller Trust Passport.

---

## 2. What Research Says Matters In ROSCA / Community Finance

### 2.1 Repeated contribution and payout behavior are core evidence

ROSCAs are built around members making regular fixed contributions and taking turns receiving the pool. The World Bank Microfinance Handbook describes ROSCAs as self-selected groups where members contribute weekly or monthly and receive the collected funds in turn, with the order decided by lottery, agreement, need, or emergency.

Decision implication for TrustSlip:

- show contribution frequency
- show cycle participation
- show on-time contribution rate
- show missed or late contribution count
- show completed payout/repayment cycle count
- show whether the member has already received a payout and continued contributing afterward

Source:
- World Bank, Microfinance Handbook, Box 3.4 on ROSCAs: https://openknowledge.worldbank.org/bitstream/handle/10986/12383/18771.pdf

### 2.2 Reputation, peer selection, and exclusion are the enforcement engine

A PLOS One experimental ROSCA study found that peer selection through voting increased contribution rates and that reputation-based exclusion can help solve default problems without external enforcement.

Decision implication for TrustSlip:

- show whether the person is in good standing with the community
- show if there are active disputes, freezes, exclusions, or unresolved defaults
- show whether the person has been re-admitted or repaired after a negative event
- show how many current trusted members/sponsors stand behind the person

Source:
- Koike et al., "Reciprocity and exclusion in informal financial institutions", PLOS One, 2018: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0202878

### 2.3 Leadership and governance quality matter

Research on the Jamaican "Partner" ROSCA found that payments to the ROSCA leader significantly enhanced sustainability, and that leader/banker governance helped reduce transaction costs. This matters because the person managing the group and the group's rules affect reliability.

Decision implication for TrustSlip:

- show community governance status
- show whether the community is verified/active
- show community age or number of completed cycles
- show admin/leader verification of the member's standing
- show whether the community has a recorded contribution rule

Source:
- Handa and Kirton, "The economics of rotating savings and credit associations: evidence from the Jamaican Partner", Journal of Development Economics, 1999: https://www.sciencedirect.com/science/article/abs/pii/S0304387899000401

### 2.4 Social collateral is useful, but not magic

Group lending research treats peer monitoring, social ties, and group guarantees as a form of social collateral. A World Development study from Eritrea found that monitoring and social ties of group leaders helped reduce moral hazard. The World Bank also notes that peer pressure and group responsibility can help enforce financial contracts, while still requiring strong repayment discipline and recovery rules.

Decision implication for TrustSlip:

- show sponsor quality, not just sponsor count
- show whether sponsors are verified and in good standing
- show the member's active obligations and overexposure
- show whether the trust limit is supported by available guarantee capacity
- keep the disclaimer: not a bank guarantee, not auto-lending, no auto-debit

Sources:
- Hermes, Lensink, and Mehrteab, "Peer Monitoring, Social Ties and Moral Hazard in Group Lending Programs", World Development, 2005: https://www.sciencedirect.com/science/article/abs/pii/S0305750X04001809
- World Bank, Malawi Rural Financial Markets report, group lending and collateral substitutes: https://documents1.worldbank.org/curated/en/539921680677498750/pdf/Malawi-Rural-Financial-Markets-Strategic-Options-for-Economic-Development.pdf

### 2.5 Digital evidence can bridge informal trust and formal decisions

CGAP argues that savings groups contain rich data that is often trapped in paper ledgers, and that digitized group transaction data can help low-income people demonstrate creditworthiness. The World Bank also frames credit information sharing and alternative data as ways to reduce information asymmetry, but only with quality data, privacy, consumer safeguards, and dispute/correction rights.

Decision implication for TrustSlip:

- show evidence freshness and source
- show snapshot issue time and expiry
- show evidence pack ID or checksum
- show user consent and visibility level
- show correction/appeal path for wrong data
- avoid using sensitive demographic traits as scoring inputs

Sources:
- CGAP, "Can Digital Linkages Revitalize a Tried and True Savings Model?": https://www.cgap.org/blog/can-digital-linkages-revitalize-tried-and-true-savings-model
- World Bank, "How can alternative data help MSMEs access credit?": https://blogs.worldbank.org/en/psd/how-can-alternative-data-help-micro-small-and-medium-enterprises-msmes-access-credit-0
- World Bank, "Credit reporting systems: The hidden engine of economic growth": https://blogs.worldbank.org/en/psd/credit-reporting-systems-hidden-engine-economic-growth
- World Bank, "When digital payments unlock access to credit": https://blogs.worldbank.org/en/allaboutfinance/when-digital-payments-unlock-access-credit--new-evidence-from

---

## 3. What Current GSN TrustSlip Already Carries

Confirmed from current backend/frontend code:

- holder GMFN ID
- display name
- community name
- TrustSlip code
- status, active/verified state, current flag
- issued/created time and expiry
- trust limit and currency
- CCI score and band
- trust band/level
- sponsor count
- active clan/community count
- unique counterparties
- risk flags
- last release date
- last full repayment date and days since last full repayment
- phone verification signal
- merchant visibility level: minimal, standard, detailed
- merchant summary
- sponsor rows in standard/detailed view
- internal contacts in detailed view
- evidence summary with capacity context and readiness context
- merchant verification active/inactive state
- public verify URL, QR, print, copy snapshot
- no bank guarantee / no auto-debit disclaimer
- snapshot version and checksum at backend level

This is a solid skeleton. It is stronger than a basic badge.

But it still needs sharper decision evidence.

---

## 4. What Is Missing Or Under-Expressed

### 4.1 Contribution discipline

Missing or under-expressed:

- number of expected contributions
- number completed
- on-time contribution percentage
- missed contribution count
- late contribution count
- current arrears amount, if any
- current cycle position
- completed cycle count

Why it matters:

ROSCA reliability is not proven by membership alone. It is proven by repeated contribution and follow-through.

### 4.2 Payout-after-receipt behavior

Missing or under-expressed:

- whether the member has already received a pool/payout/support
- whether they continued contributing after receiving support
- repayment completion count
- average days late after receiving support
- unresolved post-payout obligations

Why it matters:

The highest-risk ROSCA moment is after someone has received value and still needs to keep paying. This is the strongest behavioral evidence.

### 4.3 Community governance quality

Missing or under-expressed:

- community active member count
- community age
- number of completed cycles
- rule type: fixed contribution, rotating payout, need-based, bidding, support pool, shop credit
- admin/leader verification
- dispute/discipline process present or absent

Why it matters:

A trust score from a weak or inactive group should not carry the same confidence as a score from a stable, governed community.

### 4.4 Sponsor quality

Current TrustSlip has sponsor count and some sponsor rows, but decision value needs more context.

Add or expose carefully:

- sponsor roles: founder, admin, member, guarantor, previous counterparty
- sponsor standing: verified/in good standing
- sponsor relationship type
- sponsor confidence/weight, if explainable
- whether sponsors are overexposed

Why it matters:

Three weak sponsors do not equal three strong sponsors.

### 4.5 Negative evidence and repair path

Missing or under-expressed:

- active disputes
- frozen/revoked history
- unresolved missed promise
- repayment repair completed
- appeal/correction path

Why it matters:

Trust evidence must show enough risk to be believable. A TrustSlip that only shows positive signals will be suspected as marketing.

### 4.6 Evidence freshness and audit trail

Backend has snapshot data, but the user-facing decision surface should expose it more clearly.

Add:

- snapshot issued at
- last evidence update
- evidence pack ID
- checksum or verification reference
- expiry reason
- public verification checked at

Why it matters:

An outsider needs to know whether the evidence is current or stale.

### 4.7 Decision-use guidance

TrustSlip should not decide for the viewer. It should guide the viewer.

Add:

- "Use for small support / merchant confidence / first check only"
- "Do not use for regulated lending, employment guarantee, immigration, medical, legal, or identity-only decisions"
- "Proceed / caution / ask for more evidence" style reading, based on evidence completeness and risk flags

Why it matters:

This reduces overclaiming and helps the workshop stay honest.

---

## 5. Recommended TrustSlip Decision Sections

For the public or merchant-facing TrustSlip, use seven sections.

### 1. Validity

- valid/current/expired/revoked/frozen
- checked at
- expires at
- merchant verification active/inactive
- visibility level

### 2. Holder Identity

- GSN/GMFN ID
- holder display name
- phone verified yes/no
- community context
- holder email masked, if permitted

### 3. Trust Reading

- trust band
- CCI score/band
- trust limit and currency
- plain-language explanation of what the limit means
- "not a bank guarantee" and "no auto-debit"

### 4. Contribution And Promise History

- expected contributions
- completed contributions
- on-time contribution rate
- missed/late count
- completed cycles
- last completed contribution date

### 5. Support / Repayment / Release History

- support received count
- support repaid count
- last full repayment
- days since last full repayment
- active obligations
- last merchant release, if any

### 6. Community And Sponsor Evidence

- community active member count
- community completed cycles
- verified sponsor count
- sponsor standing summary
- unique counterparties
- governance/admin verified yes/no

### 7. Risk And Limits

- risk flags
- overexposure ratio or risk level
- active disputes
- correction/appeal path
- "ask for more evidence if amount/use case exceeds this TrustSlip"

---

## 6. What To Add To The Workshop Plan

Add a new section after "What Must Be Proven":

### Evidence Questions The Workshop Must Test

The workshop must test whether participants believe the TrustSlip evidence, not only whether they like the idea.

Ask:

- What evidence would you need before trusting Amara in Aberdeen?
- Would contribution history matter more than sponsor count?
- Would you trust a TrustSlip if it showed no missed contributions but only one community?
- Would you trust it if it had many sponsors but no repayment history?
- What negative information should be shown to make the TrustSlip believable?
- What should remain private and only be visible in the full Trust Passport?
- What decision would you be comfortable making from this TrustSlip: small shop credit, society membership, emergency support, employment reference, loan referral, none?
- At what amount or risk level would you ask for more evidence?

Add a second auditor role:

### Community Finance / ROSCA Auditor

This person should challenge:

- Does the evidence reflect how contribution groups really build trust?
- Are payment cycles, contribution discipline, payout order, and post-payout behavior visible enough?
- Does the TrustSlip respect community governance and local social enforcement?
- Does it avoid turning community trust into a fake credit score?

---

## 7. What To Remove Or Reframe

Remove or avoid:

- any suggestion that TrustSlip guarantees payment
- any suggestion that a merchant, employer, lender, or society must accept the TrustSlip
- any claim that GSN can prove creditworthiness from community membership alone
- demographic scoring based on gender, marital status, education, income, religion, ethnicity, nationality, or society membership

Reframe:

- "trust limit" should be explained as a community-backed reference limit, not a lending approval
- "sponsor count" should become "verified sponsor signals"
- "CCI score" should be paired with plain-language evidence, because scores alone are not persuasive
- "merchant verification" should be described as a confidence check, not a release instruction

---

## 8. Minimum Completeness Standard For TrustSlip

A TrustSlip is complete enough for the RGU pilot if a viewer can answer:

1. Is this TrustSlip valid right now?
2. Who does it belong to?
3. Which community evidence supports it?
4. What repeated behavior created the trust reading?
5. What amount or use case is it meant to support?
6. What risks or limits remain?
7. When was the evidence last updated?
8. What should I do if I need stronger evidence?

If the viewer cannot answer these, the TrustSlip is not yet complete.

---

## 9. Current Verdict

Current TrustSlip direction: good.

Current TrustSlip completeness: not enough for a serious external decision unless contribution discipline, post-payout behavior, community governance, sponsor quality, negative evidence, and freshness/audit references are made clearer.

Recommended next move:

1. Update the workshop plan with the evidence questions and the ROSCA auditor role.
2. Create a TrustSlip decision checklist from this audit.
3. Compare the app's `/app/trust-slip` and public verification page against the seven-section decision structure.
4. Only then decide which fields need code changes.
